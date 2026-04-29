import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Bookmark, BookmarkCheck, Check, MessageSquare, Pause, Play, Square, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { chapterBySlug, chapters } from "@/data/chapters";
import { useSpeech } from "@/hooks/useSpeech";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useItemProgress } from "@/hooks/useItemProgress";
import { cn } from "@/lib/utils";

const Leitor = () => {
  const { slug } = useParams();
  const { user } = useAuth();
  const tts = useSpeech();
  const chapter = slug ? chapterBySlug(slug) : null;
  const { rows, toggleRead, toggleBookmark, setNote } = useItemProgress(chapter?.slug);
  const [draftNote, setDraftNote] = useState<Record<number, string>>({});

  useEffect(() => {
    return () => tts.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  useEffect(() => {
    if (!user || !chapter) return;
    supabase.from("reading_progress").upsert(
      { user_id: user.id, chapter_slug: chapter.slug, last_read_at: new Date().toISOString() },
      { onConflict: "user_id,chapter_slug" }
    );
  }, [user, chapter]);

  if (!chapter) {
    return (
      <div className="container py-12 text-center">
        <p className="text-muted-foreground">Capítulo não encontrado.</p>
        <Button asChild variant="link"><Link to="/biblioteca">Voltar à biblioteca</Link></Button>
      </div>
    );
  }

  const idx = chapters.findIndex((c) => c.slug === chapter.slug);
  const prev = chapters[idx - 1];
  const next = chapters[idx + 1];

  const read = () => {
    const text = `${chapter.title}. ${chapter.paragraphs.join(" ")}`;
    tts.speak(text);
  };

  // resumo de progresso
  const totalItems = chapter.nodes.filter((n) => n.type === "item").length;
  const readCount = Object.values(rows).filter((r) => r.read).length;

  return (
    <div className="container py-8 md:py-12 max-w-3xl">
      <Link to="/biblioteca" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary transition-smooth mb-4">
        <ArrowLeft className="h-4 w-4" /> Biblioteca
      </Link>

      <article>
        {chapter.subtitle && (
          <p className="text-xs text-accent font-medium uppercase tracking-wider mb-2">{chapter.subtitle}</p>
        )}
        <h1 className="font-serif text-4xl md:text-6xl font-semibold text-primary leading-[1.1] mb-4">
          {chapter.title}
        </h1>
        <p className="text-lg text-muted-foreground italic mb-8">{chapter.summary}</p>

        <Card className="p-3 mb-8 flex flex-wrap gap-2 items-center bg-card/80 border-border/50 shadow-soft sticky top-20 z-30">
          {!tts.speaking ? (
            <Button onClick={read} variant="gold" size="sm" disabled={!tts.supported}>
              <Volume2 className="h-4 w-4" /> Ouvir capítulo
            </Button>
          ) : !tts.paused ? (
            <Button onClick={tts.pause} variant="outline" size="sm">
              <Pause className="h-4 w-4" /> Pausar
            </Button>
          ) : (
            <Button onClick={tts.resume} variant="gold" size="sm">
              <Play className="h-4 w-4" /> Retomar
            </Button>
          )}
          {tts.speaking && (
            <Button onClick={tts.stop} variant="ghost" size="sm">
              <Square className="h-4 w-4" /> Parar
            </Button>
          )}
          {user && totalItems > 0 && (
            <span className="text-xs text-muted-foreground ml-auto">
              {readCount} / {totalItems} itens lidos
            </span>
          )}
          {!tts.supported && <span className="text-xs text-muted-foreground ml-2">Áudio indisponível neste navegador.</span>}
        </Card>

        <div className="reading-prose">
          {chapter.nodes.map((node, i) => {
            if (node.type === "heading") {
              return (
                <h2
                  key={i}
                  className="font-serif text-2xl md:text-3xl text-primary mt-8 mb-3 not-prose"
                >
                  {node.text}
                </h2>
              );
            }
            if (node.type === "item") {
              const prog = rows[node.n];
              const isRead = prog?.read ?? false;
              const isBook = prog?.bookmarked ?? false;
              const note = draftNote[node.n] ?? prog?.note ?? "";
              return (
                <div
                  key={i}
                  id={`item-${node.n}`}
                  className={cn(
                    "my-5 -mx-3 px-3 py-2 rounded-md transition-smooth",
                    isRead && "bg-emerald-500/5 border-l-2 border-emerald-500/40",
                    isBook && !isRead && "bg-amber-500/5 border-l-2 border-amber-500/40",
                  )}
                >
                  {/* Toolbar do item */}
                  {user && (
                    <div className="flex items-center gap-1 mb-1 not-prose">
                      <span className="text-xs font-semibold text-primary mr-2">Item {node.n}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleRead(node.n)}
                        className={cn("h-7 px-2 text-xs", isRead && "text-emerald-600 dark:text-emerald-400")}
                        title="Marcar como lido"
                      >
                        <Check className="h-3.5 w-3.5" />
                        {isRead ? "Lido" : "Marcar lido"}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleBookmark(node.n)}
                        className={cn("h-7 px-2 text-xs", isBook && "text-amber-600 dark:text-amber-400")}
                        title="Favoritar item"
                      >
                        {isBook ? <BookmarkCheck className="h-3.5 w-3.5" /> : <Bookmark className="h-3.5 w-3.5" />}
                        {isBook ? "Favorito" : "Favoritar"}
                      </Button>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className={cn(
                              "h-7 px-2 text-xs",
                              prog?.note && "text-primary",
                            )}
                            title="Nota pessoal"
                          >
                            <MessageSquare className="h-3.5 w-3.5" />
                            {prog?.note ? "Nota" : "Anotar"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-80">
                          <p className="text-xs text-muted-foreground mb-2">
                            Nota pessoal — Item {node.n}
                          </p>
                          <Textarea
                            rows={5}
                            placeholder="Escreva sua reflexão sobre este item..."
                            value={note}
                            onChange={(e) =>
                              setDraftNote((d) => ({ ...d, [node.n]: e.target.value }))
                            }
                          />
                          <div className="flex justify-end mt-2">
                            <Button
                              size="sm"
                              variant="hero"
                              onClick={() => setNote(node.n, draftNote[node.n] ?? note)}
                            >
                              Salvar
                            </Button>
                          </div>
                        </PopoverContent>
                      </Popover>
                    </div>
                  )}

                  {node.paragraphs.map((p, j) => (
                    <p key={j}>
                      {j === 0 && !user && (
                        <span className="font-semibold text-primary mr-1">{node.n}.</span>
                      )}
                      {p}
                    </p>
                  ))}
                </div>
              );
            }
            return <p key={i}>{node.text}</p>;
          })}
        </div>
      </article>

      <div className="mt-12 pt-6 border-t border-border/50 flex justify-between gap-4">
        {prev ? (
          <Button asChild variant="outline">
            <Link to={`/biblioteca/${prev.slug}`}><ArrowLeft className="h-4 w-4" /> {prev.title}</Link>
          </Button>
        ) : <span />}
        {next && (
          <Button asChild variant="hero">
            <Link to={`/biblioteca/${next.slug}`}>{next.title} →</Link>
          </Button>
        )}
      </div>
    </div>
  );
};

export default Leitor;
