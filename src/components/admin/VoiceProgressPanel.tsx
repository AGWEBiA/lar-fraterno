import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { chapters } from "@/data/chapters";
import { VOICES } from "@/data/voices";

interface CacheRow { chapter_slug: string; voice_id: string; characters: number; }
interface JobRow { chapter_slug: string; voice_id: string; voice_label: string | null; status: string; characters: number; }

const fmt = (n: number) => n.toLocaleString("pt-BR");

export const VoiceProgressPanel = () => {
  const [cache, setCache] = useState<CacheRow[]>([]);
  const [jobs, setJobs] = useState<JobRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      supabase.from("audio_cache").select("chapter_slug, voice_id, characters"),
      supabase.from("audio_generation_jobs").select("chapter_slug, voice_id, voice_label, status, characters"),
    ]).then(([c, j]) => {
      setCache((c.data ?? []) as CacheRow[]);
      setJobs((j.data ?? []) as JobRow[]);
      setLoading(false);
    });
  }, []);

  const totalChars = useMemo(() =>
    chapters.reduce((a, c) => a + (c.title.length + 2 + c.paragraphs.join(" ").length), 0)
  , []);

  // agrupa por voz (todas as vozes que aparecem em cache OU jobs)
  const voiceStats = useMemo(() => {
    const ids = new Set<string>([...cache.map(c => c.voice_id), ...jobs.map(j => j.voice_id)]);
    return Array.from(ids).map((vid) => {
      const cachedRows = cache.filter(c => c.voice_id === vid);
      const cachedSlugs = new Set(cachedRows.map(c => c.chapter_slug));
      const cachedChars = cachedRows.reduce((a, r) => a + r.characters, 0);
      const failed = jobs.filter(j => j.voice_id === vid && j.status === "failed");
      const running = jobs.filter(j => j.voice_id === vid && j.status === "running");
      const pendingSlugs = chapters.filter(c => !cachedSlugs.has(c.slug));
      const pendingChars = pendingSlugs.reduce((a, c) => a + (c.title.length + 2 + c.paragraphs.join(" ").length), 0);
      const known = VOICES.find(v => v.id === vid);
      return {
        voiceId: vid,
        label: known?.name ?? jobs.find(j => j.voice_id === vid)?.voice_label ?? vid.slice(0, 10),
        cachedChars, cachedCount: cachedRows.length,
        pendingChars, pendingCount: pendingSlugs.length,
        failedCount: failed.length, runningCount: running.length,
        progress: Math.round((cachedChars / totalChars) * 100),
      };
    }).sort((a, b) => b.cachedChars - a.cachedChars);
  }, [cache, jobs, totalChars]);

  // matriz capítulo x voz
  const matrix = useMemo(() => {
    const voices = voiceStats.map(v => v.voiceId);
    return chapters.map(ch => {
      const chars = ch.title.length + 2 + ch.paragraphs.join(" ").length;
      const cells = voices.map(vid => {
        const has = cache.find(c => c.chapter_slug === ch.slug && c.voice_id === vid);
        const j = jobs.find(j => j.chapter_slug === ch.slug && j.voice_id === vid);
        if (has) return { kind: "ok" as const };
        if (j?.status === "failed") return { kind: "failed" as const };
        if (j?.status === "running") return { kind: "running" as const };
        return { kind: "missing" as const };
      });
      return { ch, chars, cells };
    });
  }, [cache, jobs, voiceStats]);

  if (loading) return <div className="py-8 text-center"><Loader2 className="h-5 w-5 animate-spin inline" /></div>;

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <h3 className="font-medium mb-3">Progresso por voz</h3>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Voz</TableHead>
              <TableHead>Cache</TableHead>
              <TableHead>Pendentes</TableHead>
              <TableHead>Falhas</TableHead>
              <TableHead>Em andamento</TableHead>
              <TableHead>Progresso</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {voiceStats.map(v => (
              <TableRow key={v.voiceId}>
                <TableCell><div className="font-medium">{v.label}</div><div className="text-xs font-mono text-muted-foreground">{v.voiceId.slice(0, 14)}</div></TableCell>
                <TableCell className="text-xs">{v.cachedCount} caps · {fmt(v.cachedChars)} chars</TableCell>
                <TableCell className="text-xs">{v.pendingCount} caps · {fmt(v.pendingChars)} chars</TableCell>
                <TableCell>{v.failedCount > 0 ? <Badge variant="destructive">{v.failedCount}</Badge> : <span className="text-xs text-muted-foreground">—</span>}</TableCell>
                <TableCell>{v.runningCount > 0 ? <Badge>{v.runningCount}</Badge> : <span className="text-xs text-muted-foreground">—</span>}</TableCell>
                <TableCell>
                  <div className="w-32 h-2 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-gold" style={{ width: `${v.progress}%` }} />
                  </div>
                  <p className="text-[10px] mt-1">{v.progress}%</p>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <Card className="p-4">
        <h3 className="font-medium mb-3">Matriz capítulo × voz</h3>
        <div className="overflow-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b">
                <th className="text-left p-2">Cap</th>
                <th className="text-right p-2">Chars</th>
                {voiceStats.map(v => <th key={v.voiceId} className="p-2 text-center">{v.label}</th>)}
              </tr>
            </thead>
            <tbody>
              {matrix.map(({ ch, chars, cells }) => (
                <tr key={ch.slug} className="border-b hover:bg-muted/50">
                  <td className="p-2 font-mono">{ch.slug}</td>
                  <td className="p-2 text-right">{fmt(chars)}</td>
                  {cells.map((c, i) => (
                    <td key={i} className="p-2 text-center">
                      {c.kind === "ok" && <span className="text-emerald-500">●</span>}
                      {c.kind === "failed" && <span className="text-destructive">✕</span>}
                      {c.kind === "running" && <span className="text-blue-500">↻</span>}
                      {c.kind === "missing" && <span className="text-muted-foreground/40">—</span>}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-muted-foreground mt-2">● cache · ↻ em andamento · ✕ falhou · — pendente</p>
      </Card>
    </div>
  );
};
