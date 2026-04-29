import { useEffect, useMemo, useState } from "react";
import { Link, useParams, Navigate } from "react-router-dom";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  ArrowLeft,
  CalendarClock,
  CheckCircle2,
  Clock,
  Headphones,
  Loader2,
  RotateCcw,
  Users,
  XCircle,
  AlertCircle,
  ShieldAlert,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { chapterBySlug } from "@/data/chapters";
import { voiceById } from "@/data/voices";
import { toast } from "sonner";

interface Meeting {
  id: string;
  held_at: string;
  chapter_slug: string | null;
  title: string | null;
  participants: number | null;
  participants_list: string[] | null;
  notes: string | null;
}

interface AudioLogRow {
  id: string;
  chapter_slug: string;
  voice_id: string | null;
  audio_status: string;
  job_id: string | null;
  characters: number | null;
  duration_ms: number | null;
  created_at: string;
}

interface JobRow {
  id: string;
  status: string;
  error_message: string | null;
  voice_id: string;
  voice_label: string | null;
  characters: number;
  created_at: string;
}

const DAYS = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

const MeetingDetail = () => {
  const { id } = useParams();
  const { user, loading: authLoading } = useAuth();
  const { isAdminMaster } = useUserRole();
  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [logs, setLogs] = useState<AudioLogRow[]>([]);
  const [jobs, setJobs] = useState<Record<string, JobRow>>({});
  const [schedules, setSchedules] = useState<{ day_of_week: number; time_of_day: string; title: string; source: "personal" | "group" }[]>([]);
  const [loading, setLoading] = useState(true);
  const [reprocessing, setReprocessing] = useState<string | null>(null);

  const load = async () => {
    if (!user || !id) return;
    setLoading(true);
    const { data: m } = await supabase
      .from("meeting_history")
      .select("id, held_at, chapter_slug, title, participants, participants_list, notes")
      .eq("id", id)
      .maybeSingle();
    if (!m) {
      setMeeting(null);
      setLoading(false);
      return;
    }
    setMeeting(m as Meeting);

    // Audio logs deste capítulo (próximos da reunião)
    const { data: lg } = await supabase
      .from("meeting_audio_log")
      .select("id, chapter_slug, voice_id, audio_status, job_id, characters, duration_ms, created_at")
      .eq("meeting_id", id);
    const logRows = (lg ?? []) as AudioLogRow[];
    setLogs(logRows);

    // Carrega jobs vinculados
    const jobIds = logRows.map((l) => l.job_id).filter(Boolean) as string[];
    if (jobIds.length) {
      const { data: js } = await supabase
        .from("audio_generation_jobs")
        .select("id, status, error_message, voice_id, voice_label, characters, created_at")
        .in("id", jobIds);
      const map: Record<string, JobRow> = {};
      (js ?? []).forEach((j: any) => (map[j.id] = j));
      setJobs(map);
    }

    // Agendas: pessoais + grupos do usuário
    const [{ data: ps }, { data: members }] = await Promise.all([
      supabase
        .from("schedules")
        .select("day_of_week, time_of_day, title")
        .eq("user_id", user.id)
        .eq("is_active", true),
      supabase.from("tenant_members").select("tenant_id").eq("user_id", user.id),
    ]);
    const scheds: typeof schedules = (ps ?? []).map((s: any) => ({
      day_of_week: s.day_of_week,
      time_of_day: s.time_of_day,
      title: s.title,
      source: "personal" as const,
    }));
    const tenantIds = (members ?? []).map((m: any) => m.tenant_id);
    if (tenantIds.length) {
      const { data: ts } = await supabase
        .from("tenant_schedules")
        .select("day_of_week, time_of_day, title")
        .in("tenant_id", tenantIds)
        .eq("is_active", true);
      (ts ?? []).forEach((s: any) =>
        scheds.push({
          day_of_week: s.day_of_week,
          time_of_day: s.time_of_day,
          title: s.title,
          source: "group" as const,
        }),
      );
    }
    scheds.sort((a, b) => a.day_of_week - b.day_of_week || a.time_of_day.localeCompare(b.time_of_day));
    setSchedules(scheds);
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, id]);

  const reprocess = async (chapterSlug: string, voiceId: string) => {
    if (!isAdminMaster) {
      toast.error("Apenas o admin master pode reprocessar áudios.");
      return;
    }
    setReprocessing(`${chapterSlug}:${voiceId}`);
    try {
      const ch = chapterBySlug(chapterSlug);
      if (!ch) throw new Error("Capítulo não encontrado");
      const text = `${ch.title}. ${ch.paragraphs.join(" ")}`;
      const { data, error } = await supabase.functions.invoke("tts-chapter", {
        body: { slug: ch.slug, text, voiceId, force: true },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success("Áudio reprocessado com sucesso!");
      load();
    } catch (e) {
      toast.error(`Falha: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setReprocessing(null);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="container py-12 text-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary inline" />
      </div>
    );
  }
  if (!user) return <Navigate to="/auth" replace />;
  if (!meeting) {
    return (
      <div className="container py-12 max-w-xl text-center">
        <p className="text-muted-foreground">Reunião não encontrada.</p>
        <Button asChild variant="link"><Link to="/historico">Voltar ao histórico</Link></Button>
      </div>
    );
  }

  const chapter = meeting.chapter_slug ? chapterBySlug(meeting.chapter_slug) : null;
  const totals = logs.reduce(
    (acc, l) => {
      acc.chars += l.characters ?? 0;
      acc.dur += l.duration_ms ?? 0;
      if (l.audio_status === "played") acc.played++;
      else if (l.audio_status === "failed") acc.failed++;
      else if (l.audio_status === "pending") acc.pending++;
      return acc;
    },
    { played: 0, failed: 0, pending: 0, chars: 0, dur: 0 },
  );

  return (
    <div className="container py-8 md:py-12 max-w-4xl">
      <Link to="/historico" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary mb-4">
        <ArrowLeft className="h-4 w-4" /> Histórico
      </Link>

      <Card className="p-6 mb-4 bg-card/90 border-border/50 shadow-soft">
        <p className="text-xs uppercase tracking-wider text-accent font-semibold">
          {format(new Date(meeting.held_at), "EEEE, d 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR })}
        </p>
        <h1 className="font-serif text-3xl md:text-4xl font-semibold text-primary mt-1">
          {meeting.title || chapter?.title || "Reunião"}
        </h1>
        {chapter && meeting.title && (
          <p className="text-sm text-muted-foreground mt-1">{chapter.roman} — {chapter.title}</p>
        )}
        {meeting.notes && (
          <p className="text-sm text-foreground mt-4 whitespace-pre-line border-l-2 border-accent/40 pl-3 italic">
            {meeting.notes}
          </p>
        )}
      </Card>

      <div className="grid md:grid-cols-2 gap-4 mb-4">
        {/* Agenda semanal */}
        <Card className="p-5 bg-card/90 border-border/50">
          <h2 className="font-serif text-xl text-primary flex items-center gap-2 mb-3">
            <CalendarClock className="h-5 w-5" /> Agenda semanal
          </h2>
          {schedules.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum horário configurado.</p>
          ) : (
            <div className="space-y-2">
              {schedules.map((s, i) => (
                <div key={i} className="flex items-center gap-3 p-2 rounded-md bg-secondary/40 border border-border/40">
                  <Clock className="h-4 w-4 text-primary shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-primary">{DAYS[s.day_of_week]}</p>
                    <p className="text-xs text-muted-foreground">{s.time_of_day.slice(0, 5)} — {s.title}</p>
                  </div>
                  <Badge variant="outline" className="text-[10px]">{s.source === "group" ? "grupo" : "pessoal"}</Badge>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Participantes */}
        <Card className="p-5 bg-card/90 border-border/50">
          <h2 className="font-serif text-xl text-primary flex items-center gap-2 mb-3">
            <Users className="h-5 w-5" /> Participantes
          </h2>
          {(meeting.participants_list?.length ?? 0) === 0 ? (
            <p className="text-sm text-muted-foreground">
              {meeting.participants ?? 1} participante(s) — sem nomes registrados.
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {meeting.participants_list!.map((p) => (
                <Badge key={p} variant="outline" className="border-accent/40">{p}</Badge>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Status de áudio */}
      <Card className="p-5 bg-card/90 border-border/50">
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <h2 className="font-serif text-xl text-primary flex items-center gap-2">
            <Headphones className="h-5 w-5" /> Status de áudio
          </h2>
          <div className="flex gap-2 flex-wrap">
            <Badge variant="outline" className="border-emerald-500/40 text-emerald-700 dark:text-emerald-400 gap-1">
              <CheckCircle2 className="h-3 w-3" /> {totals.played} tocados
            </Badge>
            <Badge variant="outline" className="border-amber-500/40 text-amber-700 dark:text-amber-400 gap-1">
              <AlertCircle className="h-3 w-3" /> {totals.pending} pendentes
            </Badge>
            <Badge variant="outline" className="border-destructive/40 text-destructive gap-1">
              <XCircle className="h-3 w-3" /> {totals.failed} falhas
            </Badge>
          </div>
        </div>

        {logs.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">
            Nenhum áudio registrado nesta reunião.
          </p>
        ) : (
          <div className="space-y-2">
            {logs.map((l) => {
              const job = l.job_id ? jobs[l.job_id] : null;
              const ch = chapterBySlug(l.chapter_slug);
              const voice = l.voice_id ? voiceById(l.voice_id) : null;
              const key = `${l.chapter_slug}:${l.voice_id}`;
              const isReproc = reprocessing === key;
              return (
                <div key={l.id} className="flex items-start gap-3 p-3 rounded-md bg-secondary/40 border border-border/40">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-primary">
                      {ch?.roman ? `${ch.roman} — ` : ""}{ch?.title ?? l.chapter_slug}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Voz: {voice?.name ?? l.voice_id ?? "—"} • {l.characters ?? 0} caracteres
                      {l.duration_ms ? ` • ${(l.duration_ms / 1000).toFixed(1)}s` : ""}
                    </p>
                    {job?.error_message && (
                      <p className="text-xs text-destructive mt-1 truncate">{job.error_message}</p>
                    )}
                  </div>
                  <Badge
                    variant="outline"
                    className={
                      l.audio_status === "played"
                        ? "border-emerald-500/40 text-emerald-700 dark:text-emerald-400"
                        : l.audio_status === "failed"
                        ? "border-destructive/40 text-destructive"
                        : "border-amber-500/40 text-amber-700 dark:text-amber-400"
                    }
                  >
                    {l.audio_status}
                  </Badge>
                  {(l.audio_status === "failed" || l.audio_status === "pending") && l.voice_id && (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={!isAdminMaster || isReproc}
                      onClick={() => reprocess(l.chapter_slug, l.voice_id!)}
                      title={!isAdminMaster ? "Somente admin master" : "Reprocessar"}
                    >
                      {isReproc ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <RotateCcw className="h-4 w-4" />
                      )}
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {!isAdminMaster && (
          <p className="text-xs text-muted-foreground mt-3 flex items-center gap-1">
            <ShieldAlert className="h-3 w-3" /> Somente o admin master pode reprocessar áudios (beta).
          </p>
        )}
      </Card>
    </div>
  );
};

export default MeetingDetail;
