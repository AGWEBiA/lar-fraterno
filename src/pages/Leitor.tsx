import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Pause, Play, Square, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { chapterBySlug, chapters } from "@/data/chapters";
import { useSpeech } from "@/hooks/useSpeech";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

const Leitor = () => {
  const { slug } = useParams();
  const { user } = useAuth();
  const tts = useSpeech();
  const chapter = slug ? chapterBySlug(slug) : null;

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
              return (
                <div key={i} className="my-5">
                  {node.paragraphs.map((p, j) => (
                    <p key={j}>
                      {j === 0 && (
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
