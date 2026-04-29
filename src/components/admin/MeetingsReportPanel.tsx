import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { chapters } from "@/data/chapters";

interface MeetingRow {
  id: string;
  held_at: string;
  chapter_slug: string | null;
  title: string | null;
  user_id: string;
  user_name?: string;
}
interface CacheRow { chapter_slug: string; characters: number; }
interface JobRow { chapter_slug: string; status: string; characters: number; duration_ms: number | null; }

const fmt = (n: number) => n.toLocaleString("pt-BR");
const fmtMs = (ms: number | null) => {
  if (!ms) return "—";
  const s = Math.round(ms / 100) / 10;
  return s < 60 ? `${s}s` : `${Math.floor(s / 60)}m ${Math.round(s % 60)}s`;
};

export const MeetingsReportPanel = () => {
  const [meetings, setMeetings] = useState<MeetingRow[]>([]);
  const [cache, setCache] = useState<CacheRow[]>([]);
  const [jobs, setJobs] = useState<JobRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [m, c, j] = await Promise.all([
        supabase.from("meeting_history").select("id, held_at, chapter_slug, title, user_id").order("held_at", { ascending: false }).limit(100),
        supabase.from("audio_cache").select("chapter_slug, characters"),
        supabase.from("audio_generation_jobs").select("chapter_slug, status, characters, duration_ms"),
      ]);
      const userIds = Array.from(new Set((m.data ?? []).map((r: any) => r.user_id)));
      const pf = userIds.length
        ? await supabase.from("profiles").select("id, full_name, email").in("id", userIds)
        : { data: [] as any[] };
      const pfMap = new Map((pf.data ?? []).map((p: any) => [p.id, p.full_name || p.email || p.id.slice(0, 8)]));
      setMeetings(((m.data ?? []) as any[]).map(r => ({ ...r, user_name: pfMap.get(r.user_id) })));
      setCache((c.data ?? []) as CacheRow[]);
      setJobs((j.data ?? []) as JobRow[]);
      setLoading(false);
    })();
  }, []);

  const cachedSlugs = useMemo(() => new Set(cache.map(c => c.chapter_slug)), [cache]);

  const totals = useMemo(() => {
    const totalChars = jobs.reduce((a, j) => a + (j.characters || 0), 0);
    const totalMs = jobs.reduce((a, j) => a + (j.duration_ms || 0), 0);
    const success = jobs.filter(j => j.status === "success").length;
    const failed = jobs.filter(j => j.status === "failed").length;
    const running = jobs.filter(j => j.status === "running").length;
    return { totalChars, totalMs, success, failed, running };
  }, [jobs]);

  if (loading) return <div className="py-8 text-center"><Loader2 className="h-5 w-5 animate-spin inline" /></div>;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Card className="p-3"><p className="text-xs text-muted-foreground">Reuniões</p><p className="text-2xl font-serif text-primary">{meetings.length}</p></Card>
        <Card className="p-3"><p className="text-xs text-muted-foreground">Áudios OK</p><p className="text-2xl font-serif text-accent">{totals.success}</p></Card>
        <Card className="p-3"><p className="text-xs text-muted-foreground">Falhas</p><p className="text-2xl font-serif text-destructive">{totals.failed}</p></Card>
        <Card className="p-3"><p className="text-xs text-muted-foreground">Em progresso</p><p className="text-2xl font-serif">{totals.running}</p></Card>
        <Card className="p-3"><p className="text-xs text-muted-foreground">Créditos consumidos</p><p className="text-2xl font-serif text-primary">{fmt(totals.totalChars)}</p></Card>
      </div>

      <Card className="p-4">
        <h3 className="font-medium mb-3">Reuniões realizadas</h3>
        {meetings.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4">Nenhuma reunião registrada ainda.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Quando</TableHead>
                <TableHead>Quem</TableHead>
                <TableHead>Capítulo</TableHead>
                <TableHead>Áudio</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {meetings.map(m => {
                const ch = m.chapter_slug ? chapters.find(c => c.slug === m.chapter_slug) : null;
                const cachedFor = m.chapter_slug && cachedSlugs.has(m.chapter_slug);
                const failed = m.chapter_slug && jobs.some(j => j.chapter_slug === m.chapter_slug && j.status === "failed");
                const running = m.chapter_slug && jobs.some(j => j.chapter_slug === m.chapter_slug && j.status === "running");
                let status: { label: string; variant: "default" | "secondary" | "destructive" | "outline" } =
                  { label: "sem capítulo", variant: "outline" };
                if (cachedFor) status = { label: "✓ disponível", variant: "default" };
                else if (running) status = { label: "↻ em progresso", variant: "secondary" };
                else if (failed) status = { label: "✕ falhou", variant: "destructive" };
                else if (m.chapter_slug) status = { label: "— sem áudio", variant: "outline" };
                return (
                  <TableRow key={m.id}>
                    <TableCell className="text-xs">{new Date(m.held_at).toLocaleString("pt-BR")}</TableCell>
                    <TableCell className="text-xs">{m.user_name}</TableCell>
                    <TableCell className="text-xs">{ch?.title || m.title || "—"}</TableCell>
                    <TableCell><Badge variant={status.variant}>{status.label}</Badge></TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </Card>

      <Card className="p-4 bg-secondary/40 text-xs text-muted-foreground">
        ⏱️ Tempo total acumulado nas gerações: <strong>{fmtMs(totals.totalMs)}</strong> ·
        💸 Créditos ElevenLabs (sucessos + falhas parciais): <strong>{fmt(totals.totalChars)}</strong>
      </Card>
    </div>
  );
};
