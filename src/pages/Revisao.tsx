import { useEffect, useMemo, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { AlertTriangle, CheckCircle2, ChevronDown, ChevronRight, Loader2, ShieldCheck, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { auditAllChapters, type ChapterAudit } from "@/lib/chapter-audit";
import { chapterBySlug, chapters as ALL_CHAPTERS } from "@/data/chapters";
import { VOICES, DEFAULT_VOICE_ID, voiceById } from "@/data/voices";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ensureNotificationPermission, notifyDesktop } from "@/lib/notifications";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const Revisao = () => {
  const { user, loading: authLoading } = useAuth();
  const { isAdminMaster, loading: roleLoading } = useUserRole();
  if (authLoading || roleLoading) {
    return <div className="container py-12 text-center"><Loader2 className="h-5 w-5 animate-spin inline" /></div>;
  }
  if (!user) return <Navigate to="/auth" replace />;
  if (!isAdminMaster) return <Navigate to="/" replace />;
  return <RevisaoInner />;
};

const RevisaoInner = () => {
  const { user } = useAuth();
  const { isAdminMaster } = useUserRole();
  const audits = useMemo(() => auditAllChapters(), []);
  const [approvals, setApprovals] = useState<Record<string, boolean>>({});
  const [open, setOpen] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [audioCache, setAudioCache] = useState<Map<string, Set<string>>>(new Map());
  const [batchVoiceId, setBatchVoiceId] = useState<string>(DEFAULT_VOICE_ID);
  const [batch, setBatch] = useState<{ running: boolean; done: number; total: number; current: string | null }>({
    running: false,
    done: 0,
    total: 0,
    current: null,
  });

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    supabase
      .from("chapter_approvals")
      .select("chapter_slug, approved")
      .eq("user_id", user.id)
      .then(({ data, error }) => {
        if (error) {
          toast.error("Não foi possível carregar aprovações.");
        } else {
          const map: Record<string, boolean> = {};
          for (const row of data ?? []) map[row.chapter_slug] = !!row.approved;
          setApprovals(map);
        }
        setLoading(false);
      });
  }, [user]);

  // Carrega lista de capítulos com áudio já gerado, agrupados por voz.
  useEffect(() => {
    supabase
      .from("audio_cache")
      .select("chapter_slug, voice_id")
      .then(({ data }) => {
        if (!data) return;
        const map = new Map<string, Set<string>>();
        for (const row of data) {
          const set = map.get(row.chapter_slug) ?? new Set<string>();
          set.add(row.voice_id);
          map.set(row.chapter_slug, set);
        }
        setAudioCache(map);
      });
  }, [batch.done]);

  const hasAudioForVoice = (slug: string, voiceId: string) =>
    audioCache.get(slug)?.has(voiceId) ?? false;

  const generateAudio = async (
    slug: string,
    voiceId: string = batchVoiceId,
    force = false,
    batchId?: string,
  ) => {
    const ch = chapterBySlug(slug);
    if (!ch) return false;
    const text = `${ch.title}. ${ch.paragraphs.join(" ")}`;
    const voiceLabel = voiceById(voiceId)?.name;
    const { data, error } = await supabase.functions.invoke("tts-chapter", {
      body: { slug, text, voiceId, voiceLabel, force, batchId },
    });
    if (error || data?.error) {
      toast.error(`Falha em ${ch.title}: ${data?.error ?? error?.message ?? "erro"}`);
      return false;
    }
    setAudioCache((prev) => {
      const next = new Map(prev);
      const set = new Set(next.get(slug) ?? []);
      set.add(voiceId);
      next.set(slug, set);
      return next;
    });
    return true;
  };

  const generateAll = async () => {
    const pending = ALL_CHAPTERS.filter((c) => !hasAudioForVoice(c.slug, batchVoiceId));
    if (pending.length === 0) {
      toast.success("Todos os capítulos já têm áudio gerado nesta voz!");
      return;
    }
    await ensureNotificationPermission();
    const voiceName = voiceById(batchVoiceId)?.name ?? "voz padrão";
    const batchId = (typeof crypto !== "undefined" && "randomUUID" in crypto) ? crypto.randomUUID() : `${Date.now()}`;
    setBatch({ running: true, done: 0, total: pending.length, current: null });
    // Notifica início do lote
    supabase.functions.invoke("notify-batch", {
      body: {
        kind: "batch_started",
        title: "Geração em lote iniciada",
        body: `${pending.length} capítulo(s) na voz ${voiceName}.`,
        data: { batchId, voiceId: batchVoiceId, total: pending.length },
      },
    }).catch(() => {});

    let okCount = 0;
    let failCount = 0;
    for (let i = 0; i < pending.length; i++) {
      const ch = pending[i];
      setBatch((b) => ({ ...b, current: ch.title, done: i }));
      const ok = await generateAudio(ch.slug, batchVoiceId, false, batchId);
      if (ok) okCount++;
      else failCount++;
    }
    setBatch({ running: false, done: pending.length, total: pending.length, current: null });
    const summary = failCount > 0
      ? `${okCount} ok · ${failCount} falharam (voz ${voiceName})`
      : `${okCount} capítulos gerados na voz ${voiceName}`;
    toast.success("Pré-geração concluída!", { description: summary });
    notifyDesktop("Pré-geração de áudio concluída", summary);
    supabase.functions.invoke("notify-batch", {
      body: {
        kind: failCount > 0 ? "batch_failed" : "batch_finished",
        title: failCount > 0 ? "Geração em lote terminou com falhas" : "Geração em lote concluída",
        body: summary,
        data: { batchId, voiceId: batchVoiceId, ok: okCount, failed: failCount },
      },
    }).catch(() => {});
  };

  const toggleApproval = async (slug: string, approved: boolean) => {
    if (!user) return;
    setApprovals((prev) => ({ ...prev, [slug]: approved }));
    const { error } = await supabase
      .from("chapter_approvals")
      .upsert(
        { user_id: user.id, chapter_slug: slug, approved },
        { onConflict: "user_id,chapter_slug" },
      );
    if (error) {
      toast.error("Falha ao salvar aprovação.");
      setApprovals((prev) => ({ ...prev, [slug]: !approved }));
    } else {
      toast.success(approved ? "Capítulo aprovado." : "Aprovação removida.");
    }
  };

  const approvedCount = Object.values(approvals).filter(Boolean).length;
  const totalIssues = audits.reduce((s, a) => s + a.issues.length, 0);

  return (
    <div className="container py-8 md:py-12 max-w-4xl">
      <div className="mb-8">
        <Link to="/" className="text-sm text-muted-foreground hover:text-primary transition-smooth">
          ← Início
        </Link>
        <h1 className="font-serif text-4xl md:text-5xl font-semibold text-primary mt-2 flex items-center gap-3">
          <ShieldCheck className="h-8 w-8 text-accent" /> Revisão do conteúdo
        </h1>
        <p className="text-muted-foreground mt-2 max-w-2xl">
          Revise cada capítulo extraído do PDF antes de liberá-lo para uso e leitura por áudio.
          Capítulos não aprovados ficam marcados como "Em revisão" na biblioteca.
        </p>

        <div className="mt-6 grid sm:grid-cols-3 gap-3">
          <Card className="p-4 bg-card/80 border-border/50">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Capítulos</p>
            <p className="font-serif text-3xl text-primary mt-1">{audits.length}</p>
          </Card>
          <Card className="p-4 bg-card/80 border-border/50">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Aprovados</p>
            <p className="font-serif text-3xl text-accent mt-1">
              {approvedCount}/{audits.length}
            </p>
          </Card>
          <Card className="p-4 bg-card/80 border-border/50">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Inconsistências</p>
            <p className="font-serif text-3xl text-primary mt-1">{totalIssues}</p>
          </Card>
        </div>
      </div>

      {!user && (
        <Card className="p-5 mb-6 border-accent/40 bg-accent-soft/30">
          <p className="text-sm">
            <Link to="/auth" className="text-primary font-medium hover:underline">
              Entre na sua conta
            </Link>{" "}
            para salvar suas aprovações.
          </p>
        </Card>
      )}

      {/* Painel de pré-geração de áudio - somente admin master */}
      {isAdminMaster ? (
        <Card className="p-5 mb-6 bg-card/80 border-border/50">
          <div className="flex items-start gap-3 flex-wrap">
            <Sparkles className="h-5 w-5 text-accent mt-0.5" />
            <div className="flex-1 min-w-[200px]">
              <p className="font-serif text-lg text-primary">Áudio em alta qualidade</p>
              <p className="text-xs text-muted-foreground">
                {(() => {
                  const ready = ALL_CHAPTERS.filter((c) => hasAudioForVoice(c.slug, batchVoiceId)).length;
                  const voiceName = voiceById(batchVoiceId)?.name ?? "voz padrão";
                  return `${ready} de ${ALL_CHAPTERS.length} capítulos prontos na voz ${voiceName}. Você será avisado por notificação quando o lote terminar (mesmo se a aba estiver em segundo plano).`;
                })()}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Select value={batchVoiceId} onValueChange={setBatchVoiceId} disabled={batch.running}>
                <SelectTrigger className="h-9 text-xs w-[200px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {VOICES.map((v) => (
                    <SelectItem key={v.id} value={v.id} className="text-xs">
                      <span className="font-medium">{v.name}</span>{" "}
                      <span className="text-muted-foreground">— {v.description}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {(() => {
                const ready = ALL_CHAPTERS.filter((c) => hasAudioForVoice(c.slug, batchVoiceId)).length;
                const remaining = ALL_CHAPTERS.length - ready;
                return (
                  <Button
                    variant="hero"
                    size="sm"
                    onClick={generateAll}
                    disabled={batch.running || remaining === 0}
                  >
                    {batch.running ? (
                      <><Loader2 className="h-4 w-4 animate-spin" /> Gerando…</>
                    ) : remaining === 0 ? (
                      <><CheckCircle2 className="h-4 w-4" /> Tudo pronto</>
                    ) : (
                      <><Sparkles className="h-4 w-4" /> Pré-gerar {remaining} restantes</>
                    )}
                  </Button>
                );
              })()}
            </div>
          </div>
          {batch.running && (
            <div className="mt-4 space-y-2">
              <Progress value={(batch.done / batch.total) * 100} />
              <p className="text-xs text-muted-foreground">
                {batch.done}/{batch.total} — gerando: {batch.current ?? "…"}
              </p>
              <p className="text-[11px] text-muted-foreground">
                Pode demorar alguns minutos. Pode deixar a aba em segundo plano — você receberá notificação ao terminar.
              </p>
            </div>
          )}
        </Card>
      ) : user ? (
        <Card className="p-4 mb-6 bg-secondary/40 border-border/50">
          <p className="text-xs text-muted-foreground">
            🎙️ A geração de áudios é exclusiva do administrador master (controle de custos de IA). Você pode ouvir todos os áudios já gerados disponíveis no sistema.
          </p>
        </Card>
      ) : null}

      <div className="space-y-3">
        {audits.map((a) => (
          <AuditRow
            key={a.slug}
            audit={a}
            approved={!!approvals[a.slug]}
            disabled={!user || loading}
            isOpen={open === a.slug}
            availableVoices={audioCache.get(a.slug) ?? new Set()}
            canGenerate={isAdminMaster}
            onToggleOpen={() => setOpen(open === a.slug ? null : a.slug)}
            onApprove={(v) => toggleApproval(a.slug, v)}
            onGenerateAudio={(voiceId, force) => generateAudio(a.slug, voiceId, force)}
          />
        ))}
      </div>
    </div>
  );
};

interface RowProps {
  audit: ChapterAudit;
  approved: boolean;
  disabled: boolean;
  isOpen: boolean;
  availableVoices: Set<string>;
  canGenerate: boolean;
  onToggleOpen: () => void;
  onApprove: (v: boolean) => void;
  onGenerateAudio: (voiceId: string, force?: boolean) => Promise<boolean> | void;
}

const AuditRow = ({ audit, approved, disabled, isOpen, availableVoices, canGenerate, onToggleOpen, onApprove, onGenerateAudio }: RowProps) => {
  const chapter = chapterBySlug(audit.slug);
  const [generatingAudio, setGeneratingAudio] = useState(false);
  const [rowVoiceId, setRowVoiceId] = useState<string>(DEFAULT_VOICE_ID);
  const hasAudio = availableVoices.size > 0;
  const hasAudioForRowVoice = availableVoices.has(rowVoiceId);

  const handleGenerate = async (force = false) => {
    setGeneratingAudio(true);
    await ensureNotificationPermission();
    await onGenerateAudio(rowVoiceId, force);
    const voiceName = voiceById(rowVoiceId)?.name ?? "voz padrão";
    const label = force ? "Áudio HQ regerado" : "Áudio HQ pronto";
    toast.success(`${label}: ${audit.title}`, { description: `Voz ${voiceName}` });
    notifyDesktop(label, `${audit.title} — voz ${voiceName}`);
    setGeneratingAudio(false);
  };

  return (
    <Card
      className={cn(
        "border-border/50 overflow-hidden transition-smooth",
        approved ? "bg-accent-soft/20 border-accent/30" : "bg-card/80",
      )}
    >
      <button
        onClick={onToggleOpen}
        className="w-full flex items-center gap-3 p-4 text-left hover:bg-secondary/40 transition-smooth"
      >
        {isOpen ? (
          <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
        ) : (
          <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-serif text-lg font-semibold text-primary">{audit.title}</span>
            {audit.hasIssues ? (
              audit.allAcknowledged ? (
                <Badge variant="outline" className="border-muted-foreground/30 text-muted-foreground">
                  <AlertTriangle className="h-3 w-3 mr-1" /> Lacuna do PDF
                </Badge>
              ) : (
                <Badge variant="outline" className="border-amber-500/40 text-amber-700 dark:text-amber-400">
                  <AlertTriangle className="h-3 w-3 mr-1" /> {audit.issues.length} alerta
                  {audit.issues.length > 1 ? "s" : ""}
                </Badge>
              )
            ) : (
              <Badge variant="outline" className="border-accent/40 text-accent">
                <CheckCircle2 className="h-3 w-3 mr-1" /> Sem alertas
              </Badge>
            )}
            {approved && (
              <Badge className="bg-accent text-accent-foreground">
                <CheckCircle2 className="h-3 w-3 mr-1" /> Aprovado
              </Badge>
            )}
            {hasAudio && (
              <Badge variant="outline" className="border-accent/40 text-accent">
                <Sparkles className="h-3 w-3 mr-1" /> Áudio HQ
                {availableVoices.size > 1 && ` · ${availableVoices.size} vozes`}
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {audit.itemCount} itens (#1 a #{audit.expectedMax})
          </p>
        </div>
      </button>

      {isOpen && (
        <div className="border-t border-border/50 p-4 space-y-4">
          {audit.issues.length > 0 ? (
            <div>
              <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2">
                Possíveis problemas
              </p>
              <ul className="space-y-1 text-sm">
                {audit.issues.map((issue, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span
                      className={cn(
                        "inline-block px-2 py-0.5 rounded text-[10px] font-semibold uppercase shrink-0 mt-0.5",
                        issue.type === "missing" && "bg-amber-500/20 text-amber-700 dark:text-amber-400",
                        issue.type === "duplicate" && "bg-blue-500/20 text-blue-700 dark:text-blue-400",
                        issue.type === "out_of_order" && "bg-purple-500/20 text-purple-700 dark:text-purple-400",
                      )}
                    >
                      {issue.type === "missing"
                        ? "faltando"
                        : issue.type === "duplicate"
                          ? "duplicado"
                          : "fora de ordem"}
                    </span>
                    <span>{issue.detail}</span>
                  </li>
                ))}
              </ul>
              <p className="text-xs text-muted-foreground mt-3">
                Dica: confira no PDF original os itens marcados. Estas inconsistências geralmente
                indicam que o parser uniu dois itens em um, ou capturou um número que aparece dentro
                do texto.
              </p>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Numeração contínua e sem duplicatas. Faça uma leitura rápida do conteúdo antes de
              aprovar.
            </p>
          )}

          <div className="flex flex-wrap gap-2 pt-2 border-t border-border/30">
            <Button asChild variant="gold" size="sm">
              <Link to={`/revisao/${audit.slug}`}>Editar texto e numeração</Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link to={`/biblioteca/${audit.slug}`}>Abrir capítulo</Link>
            </Button>
            {approved ? (
              <Button
                variant="ghost"
                size="sm"
                disabled={disabled}
                onClick={() => onApprove(false)}
              >
                Remover aprovação
              </Button>
            ) : (
              <Button variant="gold" size="sm" disabled={disabled} onClick={() => onApprove(true)}>
                <CheckCircle2 className="h-4 w-4" /> Aprovar para uso
              </Button>
            )}
            <div className="flex items-center gap-2">
              <Select value={rowVoiceId} onValueChange={setRowVoiceId} disabled={generatingAudio}>
                <SelectTrigger className="h-9 text-xs w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {VOICES.map((v) => (
                    <SelectItem key={v.id} value={v.id} className="text-xs">
                      <span className="font-medium">{v.name}</span>{" "}
                      {availableVoices.has(v.id) && (
                        <span className="text-accent">✓</span>
                      )}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {canGenerate ? (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={generatingAudio || hasAudioForRowVoice}
                    onClick={() => handleGenerate(false)}
                    title={hasAudioForRowVoice ? "Já existe áudio gerado nesta voz" : "Gerar áudio nesta voz"}
                  >
                    {generatingAudio ? (
                      <><Loader2 className="h-4 w-4 animate-spin" /> Gerando…</>
                    ) : hasAudioForRowVoice ? (
                      <><CheckCircle2 className="h-4 w-4" /> Pronto</>
                    ) : (
                      <><Sparkles className="h-4 w-4" /> Gerar áudio HQ</>
                    )}
                  </Button>
                  {hasAudioForRowVoice && (
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={generatingAudio}
                      onClick={() => handleGenerate(true)}
                      title="Regerar áudio (substitui o cache atual)"
                    >
                      {generatingAudio ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <><Sparkles className="h-4 w-4" /> Regerar</>
                      )}
                    </Button>
                  )}
                </>
              ) : (
                <Badge variant={hasAudioForRowVoice ? "secondary" : "outline"} className="h-9 px-3 self-center">
                  {hasAudioForRowVoice ? "✓ Áudio disponível" : "Aguardando geração"}
                </Badge>
              )}
            </div>
            {chapter && (
              <span className="text-xs text-muted-foreground self-center ml-auto">
                {chapter.paragraphs.length} parágrafos · ~
                {Math.round(
                  chapter.paragraphs.reduce((s, p) => s + p.length, 0) / 1000,
                )}
                k caracteres
              </span>
            )}
          </div>
        </div>
      )}
    </Card>
  );
};

export default Revisao;
