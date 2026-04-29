import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertTriangle, Loader2, RefreshCw, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

interface StuckJob {
  id: string;
  chapter_slug: string;
  voice_id: string;
  voice_label: string | null;
  characters: number;
  created_at: string;
  status: string;
  error_message: string | null;
}

const STUCK_THRESHOLD_MIN = 5;

export const StuckJobsPanel = () => {
  const [jobs, setJobs] = useState<StuckJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const cutoff = new Date(Date.now() - STUCK_THRESHOLD_MIN * 60_000).toISOString();
    const { data } = await supabase
      .from("audio_generation_jobs")
      .select("*")
      .eq("status", "running")
      .lt("created_at", cutoff)
      .order("created_at", { ascending: false });
    setJobs((data ?? []) as StuckJob[]);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const close = async (id: string, reason: string) => {
    setBusyId(id);
    const { error } = await supabase.rpc("admin_close_stuck_job", { _job_id: id, _reason: reason });
    setBusyId(null);
    if (error) return toast.error(error.message);
    toast.success("Job encerrado e auditado");
    load();
  };

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="font-medium flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-amber-500" />Jobs travados</h3>
          <p className="text-xs text-muted-foreground">Status <code>running</code> há mais de {STUCK_THRESHOLD_MIN} min — provavelmente falharam por quota/timeout.</p>
        </div>
        <Button size="sm" variant="ghost" onClick={load}><RefreshCw className="h-4 w-4" /></Button>
      </div>

      {loading ? (
        <div className="py-8 text-center"><Loader2 className="h-5 w-5 animate-spin inline" /></div>
      ) : jobs.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">Nenhum job travado. ✅</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Capítulo</TableHead>
              <TableHead>Voz</TableHead>
              <TableHead>Chars</TableHead>
              <TableHead>Há quanto tempo</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {jobs.map((j) => (
              <TableRow key={j.id}>
                <TableCell className="font-mono text-xs">{j.chapter_slug}</TableCell>
                <TableCell className="text-xs">{j.voice_label || j.voice_id.slice(0, 10)}</TableCell>
                <TableCell className="text-xs">{j.characters.toLocaleString("pt-BR")}</TableCell>
                <TableCell className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(j.created_at), { addSuffix: true, locale: ptBR })}</TableCell>
                <TableCell className="text-right">
                  <Button size="sm" variant="destructive" disabled={busyId === j.id}
                    onClick={() => close(j.id, "Encerrado manualmente — provável quota_exceeded")}>
                    <X className="h-4 w-4 mr-1" />Encerrar com auditoria
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </Card>
  );
};
