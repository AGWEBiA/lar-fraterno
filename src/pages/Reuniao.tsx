import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Circle,
  Dices,
  Download,
  ListChecks,
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { meetingSteps } from "@/data/meeting-steps";
import { chapters } from "@/data/chapters";
import { buildGuide } from "@/data/meeting-guide-template";
import { isLongChapter, suggestSessions } from "@/data/session-planner";
import { useSpeech } from "@/hooks/useSpeech";
import { useChapterEdits } from "@/hooks/useChapterOverrides";
import { useSessionPlan } from "@/hooks/useSessionPlan";
import { useItemProgress } from "@/hooks/useItemProgress";
import { ItemSelector } from "@/components/ItemSelector";
import { exportRoteiroPdf } from "@/lib/exportRoteiroPdf";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useChapterApprovals } from "@/hooks/useChapterApprovals";
import { toast } from "sonner";

type ReadingMethod = "sequential" | "random";

const Reuniao = () => {
  const { user } = useAuth();
  const { isApproved, loading: approvalsLoading } = useChapterApprovals();
  const [current, setCurrent] = useState(0);
  const [done, setDone] = useState<Set<string>>(new Set());
  const [chapterIdx, setChapterIdx] = useState(0);
  const tts = useSpeech();
  const [finishOpen, setFinishOpen] = useState(false);
  const [participants, setParticipants] = useState<string[]>([]);
  const [participantInput, setParticipantInput] = useState("");
  const [notes, setNotes] = useState("");
  const [meetingTitle, setMeetingTitle] = useState("");

  const [method, setMethod] = useState<ReadingMethod>("sequential");
  const [selectedItems, setSelectedItems] = useState<number[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);

  const baseChapter = chapters[chapterIdx];
  const { chapter: editedChapter } = useChapterEdits(baseChapter.slug);
  const chapter = editedChapter ?? baseChapter;
  const approved = isApproved(baseChapter.slug);
  const longChapter = isLongChapter(baseChapter.slug);

  const { rows: itemProgress, toggleRead } = useItemProgress(baseChapter.slug);
  const { rows: planRows, create: createSession } = useSessionPlan(baseChapter.slug);

  // ---- Lista de itens disponíveis no capítulo
  const allItems = useMemo(
    () =>
      chapter.nodes.filter(
        (n): n is Extract<typeof chapter.nodes[number], { type: "item" }> => n.type === "item",
      ),
    [chapter],
  );

  const usedInOtherSessions = useMemo(
    () => Array.from(new Set(planRows.flatMap((r) => r.item_numbers))),
    [planRows],
  );
  const readItems = useMemo(
    () => Object.values(itemProgress).filter((r) => r.read).map((r) => r.item_number),
    [itemProgress],
  );

  // ---- Seleção inicial: respeita método
  useEffect(() => {
    if (allItems.length === 0) {
      setSelectedItems([]);
      return;
    }
    if (method === "random") {
      const candidates = allItems.map((i) => i.n).filter((n) => !usedInOtherSessions.includes(n));
      const pool = candidates.length ? candidates : allItems.map((i) => i.n);
      setSelectedItems([pool[Math.floor(Math.random() * pool.length)]]);
      return;
    }
    // Sequencial: pega o primeiro item ainda não estudado em outras sessões;
    // se o capítulo é longo, pega o primeiro bloco sugerido.
    const unseen = allItems.map((i) => i.n).filter((n) => !usedInOtherSessions.includes(n));
    if (longChapter) {
      const suggestions = suggestSessions(chapter);
      const next =
        suggestions.find((s) => s.itemNumbers.some((n) => unseen.includes(n))) ?? suggestions[0];
      setSelectedItems(next?.itemNumbers ?? [unseen[0] ?? allItems[0].n]);
    } else {
      setSelectedItems([unseen[0] ?? allItems[0].n]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chapterIdx, method, allItems.length]);

  const drawRandom = () => {
    if (!allItems.length) return;
    const pool = allItems.map((i) => i.n);
    const pick = pool[Math.floor(Math.random() * pool.length)];
    setSelectedItems([pick]);
    toast.success(`Item ${pick} sorteado.`);
  };

  // ---- Roteiro
  const guide = useMemo(
    () => buildGuide({ title: chapter.title, summary: chapter.summary }),
    [chapter.title, chapter.summary],
  );

  const selectedItemNodes = useMemo(
    () => allItems.filter((i) => selectedItems.includes(i.n)),
    [allItems, selectedItems],
  );

  const progress = (done.size / meetingSteps.length) * 100;
  const step = meetingSteps[current];
  const markDone = (id: string) => setDone((s) => new Set(s).add(id));

  const next = () => {
    markDone(step.id);
    if (current < meetingSteps.length - 1) setCurrent(current + 1);
    tts.stop();
  };

  const finish = () => {
    markDone(step.id);
    tts.stop();
    setMeetingTitle(chapter.title);
    setFinishOpen(true);
  };

  const addParticipant = () => {
    const v = participantInput.trim();
    if (!v || participants.includes(v)) return;
    setParticipants([...participants, v]);
    setParticipantInput("");
  };

  const saveMeeting = async () => {
    if (!user) {
      toast.success("Reunião concluída! Crie uma conta para salvar seu progresso.");
      setFinishOpen(false);
      return;
    }
    await supabase.from("meeting_history").insert({
      user_id: user.id,
      chapter_slug: baseChapter.slug,
      title: meetingTitle || chapter.title,
      participants_list: participants,
      participants: participants.length || 1,
      notes,
      held_at: new Date().toISOString(),
    });
    await supabase.from("reading_progress").upsert(
      {
        user_id: user.id,
        chapter_slug: baseChapter.slug,
        completed: true,
        last_read_at: new Date().toISOString(),
      },
      { onConflict: "user_id,chapter_slug" },
    );
    // Marca itens lidos
    for (const n of selectedItems) {
      if (!itemProgress[n]?.read) await toggleRead(n);
    }
    // Registra a sessão no plano
    await createSession({
      chapter_slug: baseChapter.slug,
      session_index: (planRows[planRows.length - 1]?.session_index ?? 0) + 1,
      item_numbers: selectedItems,
      reading_method: method,
    });

    toast.success("Reunião salva no histórico.");
    setFinishOpen(false);
    setNotes("");
    setParticipants([]);
    setParticipantInput("");
  };

  const exportPdf = () => {
    exportRoteiroPdf({
      chapter,
      guide,
      selectedItems,
      participants,
    });
    toast.success("PDF gerado!");
  };

  // ---- Conteúdo dinâmico do passo
  const stepContent = (() => {
    switch (step.id) {
      case "prece-inicial":
        return guide.opening_prayer;
      case "leitura":
        return null;
      case "comentarios":
        return [
          ...guide.commentary_points.map((p) => `• ${p.title}: ${p.text}`),
          "",
          "Perguntas para reflexão:",
          ...guide.reflection_questions.map((q) => `— ${q}`),
        ].join("\n");
      case "vibracoes":
        return guide.vibrations_focus;
      case "prece-final":
        return guide.closing_prayer;
      default:
        return null;
    }
  })();

  const speakStep = () => {
    if (!approved) return;
    if (step.id === "leitura") {
      const itemsText = selectedItemNodes
        .map((i) => `Item ${i.n}. ${i.paragraphs.join(" ")}`)
        .join(" ");
      const text = `${chapter.title}. ${guide.reading_intro} ${itemsText || chapter.paragraphs.join(" ")}`;
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
        <h1 className="font-serif text-4xl md:text-5xl font-semibold text-primary mt-2">
          Roteiro guiado
        </h1>
        <p className="text-muted-foreground mt-1">
          Caminhe no seu tempo. Cada passo é um momento de paz.
        </p>
      </div>

      {/* Capítulo + método de leitura */}
      <Card className="p-4 md:p-5 mb-4 bg-card/90 border-border/50 shadow-soft">
        <div className="flex flex-wrap items-center gap-3 mb-3">
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
          {!approvalsLoading &&
            (approved ? (
              <Badge variant="outline" className="border-accent/40 text-accent gap-1">
                <CheckCircle2 className="h-3 w-3" /> Aprovado
              </Badge>
            ) : (
              <Badge variant="outline" className="border-amber-500/40 text-amber-700 dark:text-amber-400 gap-1">
                <ShieldAlert className="h-3 w-3" /> Em revisão
              </Badge>
            ))}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Tabs value={method} onValueChange={(v) => setMethod(v as ReadingMethod)}>
            <TabsList>
              <TabsTrigger value="sequential" className="gap-1">
                <ListChecks className="h-4 w-4" /> Sequencial
              </TabsTrigger>
              <TabsTrigger value="random" className="gap-1">
                <Dices className="h-4 w-4" /> Aleatório
              </TabsTrigger>
            </TabsList>
          </Tabs>
          {method === "random" && (
            <Button size="sm" variant="outline" onClick={drawRandom}>
              <Dices className="h-4 w-4" /> Sortear novamente
            </Button>
          )}
          <Button size="sm" variant="outline" onClick={() => setPickerOpen(true)}>
            <ListChecks className="h-4 w-4" /> Escolher itens ({selectedItems.length})
          </Button>
          <Button size="sm" variant="ghost" onClick={exportPdf}>
            <Download className="h-4 w-4" /> Exportar PDF
          </Button>
        </div>

        {longChapter && (
          <div className="mt-3 text-xs bg-amber-500/10 border border-amber-500/30 text-amber-800 dark:text-amber-300 rounded-md px-3 py-2">
            ✦ Capítulo longo — sugestão de divisão automática em {suggestSessions(chapter).length} sessões.
            A seleção atual já segue essa divisão; ajuste se quiser.
          </div>
        )}

        {!approved && user && !approvalsLoading && (
          <div className="mt-3 text-sm text-muted-foreground border-t border-border/50 pt-3">
            Este capítulo ainda não foi revisado.{" "}
            <Link to="/revisao" className="text-primary font-medium hover:underline">
              Abrir revisão →
            </Link>
          </div>
        )}
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
          <h2 className="font-serif text-3xl md:text-4xl font-semibold text-primary mb-3">
            {step.title}
          </h2>
          <p className="text-muted-foreground mb-6 leading-relaxed">{step.guidance}</p>

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

                  {selectedItemNodes.length === 0 ? (
                    <p className="text-sm text-muted-foreground italic">
                      Nenhum item selecionado. Clique em "Escolher itens" acima.
                    </p>
                  ) : (
                    <div className="reading-prose text-base max-h-80 overflow-y-auto pr-2 border-t border-border/50 pt-4 mt-2 space-y-4">
                      {selectedItemNodes.map((item) => (
                        <div key={item.n}>
                          <p className="font-semibold text-primary mb-1">
                            Item {item.n}
                            {itemProgress[item.n]?.read && (
                              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 ml-2">
                                ✓ lido
                              </span>
                            )}
                          </p>
                          {item.paragraphs.map((p, j) => (
                            <p key={j}>{p}</p>
                          ))}
                        </div>
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

              {!tts.supported && (
                <p className="text-xs text-muted-foreground mt-3">
                  Seu navegador não suporta leitura por voz.
                </p>
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

      {/* Picker dialog */}
      <Dialog open={pickerOpen} onOpenChange={setPickerOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="font-serif text-2xl text-primary">
              Selecionar itens da reunião
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground -mt-2">
            Escolha quais itens serão lidos e comentados nesta reunião. Itens já estudados em outras sessões aparecem destacados.
          </p>
          <ItemSelector
            chapter={chapter}
            selected={selectedItems}
            onChange={setSelectedItems}
            alreadyUsed={usedInOtherSessions}
            alreadyRead={readItems}
          />
          <DialogFooter>
            <Button variant="hero" onClick={() => setPickerOpen(false)}>
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Finish dialog */}
      <Dialog open={finishOpen} onOpenChange={setFinishOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-serif text-2xl text-primary">Registrar esta reunião</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Título (opcional)</Label>
              <Input value={meetingTitle} onChange={(e) => setMeetingTitle(e.target.value)} />
            </div>
            <div>
              <Label>Participantes</Label>
              <div className="flex gap-2 mt-1">
                <Input
                  placeholder="Nome do participante"
                  value={participantInput}
                  onChange={(e) => setParticipantInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addParticipant();
                    }
                  }}
                />
                <Button type="button" variant="outline" onClick={addParticipant}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              {participants.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {participants.map((p) => (
                    <Badge key={p} variant="outline" className="border-accent/40 gap-1 pr-1">
                      {p}
                      <button
                        type="button"
                        onClick={() => setParticipants(participants.filter((x) => x !== p))}
                        className="hover:bg-destructive/10 rounded-full p-0.5"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>
            <div>
              <Label>Notas pessoais</Label>
              <Textarea
                rows={4}
                placeholder="O que tocou a família, pedidos, reflexões..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Os itens lidos serão marcados como concluídos no seu progresso.
            </p>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setFinishOpen(false)}>
              Pular
            </Button>
            <Button variant="hero" onClick={saveMeeting}>
              <CheckCircle2 className="h-4 w-4" /> Salvar no histórico
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Reuniao;
