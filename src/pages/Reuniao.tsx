import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, BookOpen, CheckCircle2, Circle, Pause, Play, Square, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { meetingSteps } from "@/data/meeting-steps";
import { chapters } from "@/data/chapters";
import { useSpeech } from "@/hooks/useSpeech";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

const Reuniao = () => {
  const { user } = useAuth();
  const [current, setCurrent] = useState(0);
  const [done, setDone] = useState<Set<string>>(new Set());
  const [chapterIdx, setChapterIdx] = useState(0);
  const tts = useSpeech();

  const progress = (done.size / meetingSteps.length) * 100;
  const step = meetingSteps[current];
  const chapter = chapters[chapterIdx];
  const isReadingStep = step.id === "leitura";

  const markDone = (id: string) => setDone((s) => new Set(s).add(id));

  const next = () => {
    markDone(step.id);
    if (current < meetingSteps.length - 1) setCurrent(current + 1);
    tts.stop();
  };

  const finish = async () => {
    markDone(step.id);
    tts.stop();
    if (user) {
      await supabase.from("meeting_history").insert({
        user_id: user.id,
        chapter_slug: chapter.slug,
      });
      await supabase.from("reading_progress").upsert(
        { user_id: user.id, chapter_slug: chapter.slug, completed: true, last_read_at: new Date().toISOString() },
        { onConflict: "user_id,chapter_slug" }
      );
      toast.success("Reunião registrada com gratidão.");
    } else {
      toast.success("Reunião concluída! Crie uma conta para salvar seu progresso.");
    }
  };

  const readChapter = () => {
    const text = `${chapter.title}. ${chapter.paragraphs.join(" ")}`;
    tts.speak(text);
  };

  return (
    <div className="container py-8 md:py-12 max-w-4xl">
      <div className="mb-8">
        <Link to="/" className="text-sm text-muted-foreground hover:text-primary transition-smooth">
          ← Início
        </Link>
        <h1 className="font-serif text-4xl md:text-5xl font-semibold text-primary mt-2">Roteiro guiado</h1>
        <p className="text-muted-foreground mt-1">Caminhe no seu tempo. Cada passo é um momento de paz.</p>
      </div>

      <div className="mb-8">
        <div className="flex items-center justify-between text-sm mb-2">
          <span className="text-muted-foreground">
            Passo {current + 1} de {meetingSteps.length}
          </span>
          <span className="text-primary font-medium">{Math.round(progress)}%</span>
        </div>
        <Progress value={progress} className="h-2" />
      </div>

      <div className="grid md:grid-cols-[260px_1fr] gap-6">
        {/* Stepper */}
        <div className="space-y-2">
          {meetingSteps.map((s, i) => {
            const isCurrent = i === current;
            const isDone = done.has(s.id);
            return (
              <button
                key={s.id}
                onClick={() => setCurrent(i)}
                className={cn(
                  "w-full text-left px-4 py-3 rounded-lg transition-smooth flex items-start gap-3 border",
                  isCurrent
                    ? "bg-primary/10 border-primary/30 shadow-soft"
                    : "bg-card/60 border-border/50 hover:bg-secondary"
                )}
              >
                {isDone ? (
                  <CheckCircle2 className="h-5 w-5 text-accent shrink-0 mt-0.5" />
                ) : (
                  <Circle className={cn("h-5 w-5 shrink-0 mt-0.5", isCurrent ? "text-primary" : "text-muted-foreground")} />
                )}
                <div className="min-w-0">
                  <p className={cn("text-sm font-medium leading-tight", isCurrent ? "text-primary" : "text-foreground")}>
                    {s.title}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">{s.duration}</p>
                </div>
              </button>
            );
          })}
        </div>

        {/* Step detail */}
        <Card className="p-6 md:p-8 shadow-soft border-border/50 bg-card/90">
          <div className="text-xs uppercase tracking-wider text-accent font-semibold mb-2">
            {step.duration}
          </div>
          <h2 className="font-serif text-3xl md:text-4xl font-semibold text-primary mb-3">{step.title}</h2>
          <p className="text-muted-foreground mb-6 leading-relaxed">{step.guidance}</p>

          {isReadingStep && (
            <div className="rounded-lg bg-accent-soft/50 border border-accent/20 p-5 mb-6">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2 text-primary">
                  <BookOpen className="h-4 w-4" />
                  <span className="text-sm font-medium">Leitura do dia</span>
                </div>
                <select
                  value={chapterIdx}
                  onChange={(e) => { tts.stop(); setChapterIdx(Number(e.target.value)); }}
                  className="text-sm bg-background border border-border rounded-md px-2 py-1"
                >
                  {chapters.map((c, i) => (
                    <option key={c.slug} value={i}>{c.title}</option>
                  ))}
                </select>
              </div>
              <p className="font-serif text-xl text-primary mb-1">{chapter.title}</p>
              {chapter.subtitle && <p className="text-xs text-muted-foreground mb-3">{chapter.subtitle}</p>}
              <p className="text-sm text-muted-foreground italic mb-4">{chapter.summary}</p>

              <div className="flex flex-wrap gap-2 mb-4">
                {!tts.speaking && (
                  <Button size="sm" variant="gold" onClick={readChapter} disabled={!tts.supported}>
                    <Volume2 className="h-4 w-4" /> Ouvir leitura
                  </Button>
                )}
                {tts.speaking && !tts.paused && (
                  <Button size="sm" variant="outline" onClick={tts.pause}>
                    <Pause className="h-4 w-4" /> Pausar
                  </Button>
                )}
                {tts.paused && (
                  <Button size="sm" variant="gold" onClick={tts.resume}>
                    <Play className="h-4 w-4" /> Retomar
                  </Button>
                )}
                {tts.speaking && (
                  <Button size="sm" variant="ghost" onClick={tts.stop}>
                    <Square className="h-4 w-4" /> Parar
                  </Button>
                )}
                <Button asChild size="sm" variant="link">
                  <Link to={`/biblioteca/${chapter.slug}`}>Ler texto completo →</Link>
                </Button>
              </div>
              {!tts.supported && (
                <p className="text-xs text-muted-foreground">Seu navegador não suporta leitura por voz.</p>
              )}

              <div className="reading-prose text-base max-h-64 overflow-y-auto pr-2 border-t border-border/50 pt-4">
                {chapter.paragraphs.slice(0, 2).map((p, i) => (
                  <p key={i}>{p}</p>
                ))}
              </div>
            </div>
          )}

          <div className="flex flex-wrap gap-3 pt-4 border-t border-border/50">
            {current < meetingSteps.length - 1 ? (
              <Button onClick={next} variant="hero" size="lg">
                Próximo passo <ArrowRight className="h-4 w-4" />
              </Button>
            ) : (
              <Button onClick={finish} variant="hero" size="lg">
                <CheckCircle2 className="h-4 w-4" /> Concluir reunião
              </Button>
            )}
            {current > 0 && (
              <Button onClick={() => setCurrent(current - 1)} variant="ghost" size="lg">
                Anterior
              </Button>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Reuniao;
