import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Job {
  id: string;
  user_id: string;
  chapter_slug: string;
  voice_id: string;
  voice_label: string | null;
  status: "pending" | "running" | "success" | "failed" | "cached";
  characters: number;
  duration_ms: number | null;
  error_message: string | null;
  forced: boolean;
  batch_id: string | null;
  created_at: string;
  finished_at: string | null;
}

const fmtMs = (ms: number | null) => {
  if (!ms) return "—";
  if (ms < 1000) return `${ms} ms`;
  const s = Math.round(ms / 100) / 10;
  return s < 60 ? `${s}s` : `${Math.floor(s / 60)}m ${Math.round(s % 60)}s`;
};

const statusBadge = (s: Job["status"]) => {
  switch (s) {
    case "success": return <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30">success</Badge>;
    case "failed": return <Badge variant="destructive">failed</Badge>;
    case "running": return <Badge className="bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/30">running</Badge>;
    default: return <Badge variant="outline">{s}</Badge>;
  }
};

export const GenerationsPanel = () => {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("audio_generation_jobs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(500);
    setJobs((data ?? []) as Job[]);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    const f = filter.toLowerCase().trim();
    return jobs.filter((j) => {
      if (statusFilter !== "all" && j.status !== statusFilter) return false;
      if (!f) return true;
      return (
        j.chapter_slug.toLowerCase().includes(f) ||
        (j.voice_label ?? "").toLowerCase().includes(f) ||
        j.voice_id.toLowerCase().includes(f) ||
        (j.batch_id ?? "").toLowerCase().includes(f)
      );
    });
  }, [jobs, filter, statusFilter]);

  const totals = useMemo(() => {
    return jobs.reduce((acc, j) => {
      acc.total++;
      if (j.status === "success") acc.success++;
      if (j.status === "failed") acc.failed++;
      acc.chars += j.characters || 0;
      return acc;
    }, { total: 0, success: 0, failed: 0, chars: 0 });
  }, [jobs]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="p-3"><p className="text-xs text-muted-foreground">Total</p><p className="text-2xl font-serif text-primary">{totals.total}</p></Card>
        <Card className="p-3"><p className="text-xs text-muted-foreground">Sucesso</p><p className="text-2xl font-serif text-accent">{totals.success}</p></Card>
        <Card className="p-3"><p className="text-xs text-muted-foreground">Falhas</p><p className="text-2xl font-serif text-destructive">{totals.failed}</p></Card>
        <Card className="p-3"><p className="text-xs text-muted-foreground">Caracteres (créd. ElevenLabs)</p><p className="text-2xl font-serif text-primary">{totals.chars.toLocaleString("pt-BR")}</p></Card>
      </div>

      <Card className="p-4">
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          <Input placeholder="Buscar capítulo, voz, batch..." value={filter} onChange={(e) => setFilter(e.target.value)} className="max-w-sm" />
          <select className="h-9 rounded-md border border-input bg-background px-2 text-sm" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="all">Todos status</option>
            <option value="success">success</option>
            <option value="failed">failed</option>
            <option value="running">running</option>
          </select>
          <Button size="sm" variant="ghost" onClick={load}><RefreshCw className="h-4 w-4" /></Button>
        </div>
        {loading ? (
          <div className="py-8 text-center"><Loader2 className="h-5 w-5 animate-spin inline" /></div>
        ) : (
          <div className="overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Capítulo</TableHead>
                  <TableHead>Voz</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Chars</TableHead>
                  <TableHead>Duração</TableHead>
                  <TableHead>Lote</TableHead>
                  <TableHead>Quando</TableHead>
                  <TableHead>Erro</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((j) => (
                  <TableRow key={j.id}>
                    <TableCell className="font-mono text-xs">{j.chapter_slug}{j.forced && <Badge variant="outline" className="ml-1 text-[9px]">force</Badge>}</TableCell>
                    <TableCell className="text-xs">{j.voice_label || j.voice_id.slice(0, 8)}</TableCell>
                    <TableCell>{statusBadge(j.status)}</TableCell>
                    <TableCell className="text-xs">{j.characters.toLocaleString("pt-BR")}</TableCell>
                    <TableCell className="text-xs">{fmtMs(j.duration_ms)}</TableCell>
                    <TableCell className="text-xs font-mono">{j.batch_id ? j.batch_id.slice(0, 8) : "—"}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(j.created_at), { addSuffix: true, locale: ptBR })}</TableCell>
                    <TableCell className="text-xs text-destructive max-w-xs truncate" title={j.error_message ?? ""}>{j.error_message ?? "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>
    </div>
  );
};
