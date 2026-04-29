import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Circle,
  Loader2,
  Pause,
  Play,
  Plus,
  ShieldAlert,
  Sparkles,
  Square,
  Volume2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { meetingSteps } from "@/data/meeting-steps";
import { chapters } from "@/data/chapters";
import { useSpeech } from "@/hooks/useSpeech";
import { useChapterEdits } from "@/hooks/useChapterOverrides";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useChapterApprovals } from "@/hooks/useChapterApprovals";
import { toast } from "sonner";

interface MeetingGuide {
  opening_prayer: string;
  reading_intro: string;
  commentary_points: { title: string; text: string }[];
  reflection_questions: string[];
  vibrations_focus: string;
  closing_prayer: string;
}

const Reuniao = () => {
  const { user } = useAuth();
  const { isApproved, loading: approvalsLoading } = useChapterApprovals();
  const [current, setCurrent] = useState(0);
  const [done, setDone] = useState<Set<string>>(new Set());
  const [chapterIdx, setChapterIdx] = useState(0);
  const tts = useSpeech();
  const [guide, setGuide] = useState<MeetingGuide | null>(null);
  const [generating, setGenerating] = useState(false);
  const [autoTried, setAutoTried] = useState(false);
  const [finishOpen, setFinishOpen] = useState(false);
  const [participants, setParticipants] = useState<string[]>([]);
  const [participantInput, setParticipantInput] = useState("");
  const [notes, setNotes] = useState("");
  const [meetingTitle, setMeetingTitle] = useState("");

  const baseChapter = chapters[chapterIdx];
  const { chapter: editedChapter } = useChapterEdits(baseChapter.slug);
  const chapter = editedChapter ?? baseChapter;
  const approved = isApproved(baseChapter.slug);

  const progress = (done.size / meetingSteps.length) * 100;
  const step = meetingSteps[current];

  // Reset cached guide when chapter changes; load from DB if exists.
  useEffect(() => {
    setGuide(null);
    setAutoTried(false);
    if (!user) return;
    supabase
      .from("meeting_guides")
      .select("guide")
      .eq("user_id", user.id)
      .eq("chapter_slug", baseChapter.slug)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.guide) setGuide(data.guide as unknown as MeetingGuide);
      });
  }, [baseChapter.slug, user]);

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
        {
          user_id: user.id,
          chapter_slug: chapter.slug,
          completed: true,
          last_read_at: new Date().toISOString(),
        },
        { onConflict: "user_id,chapter_slug" },
      );
      toast.success("Reunião registrada com gratidão.");
    } else {
      toast.success("Reunião concluída! Crie uma conta para salvar seu progresso.");
    }
  };

  const generateGuide = async () => {
    if (!approved) {
      toast.error("Aprove o capítulo na revisão antes de gerar o roteiro.");
      return;
    }
    setGenerating(true);
    try {
      // Build a concise excerpt: first 3 numbered items, paraphrasable seed.
      const items = chapter.nodes.filter(
        (n): n is Extract<typeof chapter.nodes[number], { type: "item" }> => n.type === "item",
      );
      const excerpt = items
        .slice(0, 3)
        .map((it) => `${it.n}. ${it.paragraphs[0]?.slice(0, 400) ?? ""}`)
        .join("\n");

      const { data, error } = await supabase.functions.invoke("gerar-roteiro", {
        body: {
          chapterSlug: chapter.slug,
          chapterTitle: chapter.title,
          chapterSummary: chapter.summary,
          excerpt,
        },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      const generated = (data as any)?.guide as MeetingGuide;
      setGuide(generated);
      if (user) {
        await supabase.from("meeting_guides").upsert(
          [{
            user_id: user.id,
            chapter_slug: chapter.slug,
            guide: generated as any,
            model: (data as any).model ?? null,
          }],
          { onConflict: "user_id,chapter_slug" },
        );
      }
      toast.success("Roteiro gerado.");
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message ?? "Falha ao gerar roteiro.");
    } finally {
      setGenerating(false);
    }
  };

  // Decide what text to speak / show in each step.
  const stepContent = (() => {
    switch (step.id) {
      case "prece-inicial":
        return guide?.opening_prayer ?? null;
      case "leitura":
        return null; // handled below with full chapter
      case "comentarios":
        return guide
          ? [
              ...guide.commentary_points.map((p) => `• ${p.title}: ${p.text}`),
              "",
              "Perguntas para reflexão:",
              ...guide.reflection_questions.map((q) => `— ${q}`),
            ].join("\n")
          : null;
      case "vibracoes":
        return guide?.vibrations_focus ?? null;
      case "prece-final":
        return guide?.closing_prayer ?? null;
      default:
        return null;
    }
  })();

  const speakStep = () => {
    if (!approved) return;
    if (step.id === "leitura") {
      const text = `${chapter.title}. ${guide?.reading_intro ?? ""} ${chapter.paragraphs.join(" ")}`;
      tts.speak(text);
      return;
    }
    if (stepContent) tts.speak(stepContent);
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

      {/* Chapter selector + IA guide controls */}
      <Card className="p-4 md:p-5 mb-6 bg-card/90 border-border/50 shadow-soft">
        <div className="flex flex-wrap items-center gap-3">
          <BookOpen className="h-5 w-5 text-primary shrink-0" />
          <div className="flex-1 min-w-[200px]">
            <label className="text-xs text-muted-foreground block mb-1">Capítulo desta reunião</label>
            <select
              value={chapterIdx}
              onChange={(e) => {
                tts.stop();
                setChapterIdx(Number(e.target.value));
              }}
              className="w-full text-sm bg-background border border-border rounded-md px-3 py-2"
            >
              {chapters.map((c, i) => (
                <option key={c.slug} value={i}>
                  {c.roman ? `${c.roman} — ${c.title}` : c.title}
                </option>
              ))}
            </select>
          </div>
          {!approvalsLoading && (
            approved ? (
              <Badge variant="outline" className="border-accent/40 text-accent gap-1">
                <CheckCircle2 className="h-3 w-3" /> Aprovado
              </Badge>
            ) : (
              <Badge variant="outline" className="border-amber-500/40 text-amber-700 dark:text-amber-400 gap-1">
                <ShieldAlert className="h-3 w-3" /> Em revisão
              </Badge>
            )
          )}
        </div>

        {!approved && user && !approvalsLoading && (
          <div className="mt-3 text-sm text-muted-foreground border-t border-border/50 pt-3">
            Este capítulo ainda não foi revisado.{" "}
            <Link to="/revisao" className="text-primary font-medium hover:underline">
              Abrir revisão →
            </Link>
          </div>
        )}

        <div className="mt-3 flex flex-wrap gap-2 items-center border-t border-border/50 pt-3">
          <Button
            onClick={generateGuide}
            disabled={generating || !approved}
            variant={guide ? "outline" : "hero"}
            size="sm"
          >
            {generating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Gerando...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" /> {guide ? "Gerar novamente" : "Gerar roteiro com IA"}
              </>
            )}
          </Button>
          {guide && (
            <span className="text-xs text-muted-foreground">
              Roteiro com prece, comentários e vibrações pronto.
            </span>
          )}
        </div>
      </Card>

      <div className="mb-6">
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
                    : "bg-card/60 border-border/50 hover:bg-secondary",
                )}
              >
                {isDone ? (
                  <CheckCircle2 className="h-5 w-5 text-accent shrink-0 mt-0.5" />
                ) : (
                  <Circle
                    className={cn(
                      "h-5 w-5 shrink-0 mt-0.5",
                      isCurrent ? "text-primary" : "text-muted-foreground",
                    )}
                  />
                )}
                <div className="min-w-0">
                  <p
                    className={cn(
                      "text-sm font-medium leading-tight",
                      isCurrent ? "text-primary" : "text-foreground",
                    )}
                  >
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

          {/* AI-generated content for the step */}
          {(stepContent || step.id === "leitura") && (
            <div className="rounded-lg bg-accent-soft/50 border border-accent/20 p-5 mb-6">
              <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                <div className="flex items-center gap-2 text-primary">
                  <Sparkles className="h-4 w-4" />
                  <span className="text-sm font-medium">
                    {step.id === "leitura" ? "Leitura do dia" : "Sugestão para este momento"}
                  </span>
                </div>
                <div className="flex gap-2">
                  {!tts.speaking && (
                    <Button
                      size="sm"
                      variant="gold"
                      onClick={speakStep}
                      disabled={!tts.supported || !approved || (step.id !== "leitura" && !stepContent)}
                    >
                      <Volume2 className="h-4 w-4" /> Ouvir
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
                      <Square className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>

              {step.id === "leitura" ? (
                <>
                  <p className="font-serif text-xl text-primary mb-1">{chapter.title}</p>
                  {chapter.subtitle && (
                    <p className="text-xs text-muted-foreground mb-3">{chapter.subtitle}</p>
                  )}
                  {guide?.reading_intro && (
                    <p className="text-sm text-foreground italic mb-3">{guide.reading_intro}</p>
                  )}
                  <p className="text-sm text-muted-foreground italic mb-4">{chapter.summary}</p>
                  <Button asChild size="sm" variant="link" className="px-0">
                    <Link to={`/biblioteca/${chapter.slug}`}>Ler texto completo →</Link>
                  </Button>
                  {approved && (
                    <div className="reading-prose text-base max-h-64 overflow-y-auto pr-2 border-t border-border/50 pt-4 mt-4">
                      {chapter.paragraphs.slice(0, 2).map((p, i) => (
                        <p key={i}>{p}</p>
                      ))}
                    </div>
                  )}
                </>
              ) : step.id === "comentarios" && guide ? (
                <div className="space-y-3">
                  {guide.commentary_points.map((p, i) => (
                    <div key={i} className="border-l-2 border-accent pl-3">
                      <p className="font-medium text-primary text-sm">{p.title}</p>
                      <p className="text-sm text-foreground mt-0.5">{p.text}</p>
                    </div>
                  ))}
                  {guide.reflection_questions.length > 0 && (
                    <div className="pt-3 border-t border-border/30">
                      <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2">
                        Perguntas para reflexão
                      </p>
                      <ul className="space-y-1">
                        {guide.reflection_questions.map((q, i) => (
                          <li key={i} className="text-sm text-foreground">
                            — {q}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ) : (
                stepContent && (
                  <p className="text-foreground leading-relaxed whitespace-pre-line">{stepContent}</p>
                )
              )}

              {!stepContent && step.id !== "leitura" && (
                <p className="text-sm text-muted-foreground italic">
                  Gere o roteiro acima para ver sugestões personalizadas para este passo.
                </p>
              )}

              {!tts.supported && (
                <p className="text-xs text-muted-foreground mt-3">Seu navegador não suporta leitura por voz.</p>
              )}
              {!approved && (
                <p className="text-xs text-amber-700 dark:text-amber-400 mt-3 flex items-center gap-1">
                  <ShieldAlert className="h-3 w-3" /> Áudio liberado após aprovar o capítulo na revisão.
                </p>
              )}
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
