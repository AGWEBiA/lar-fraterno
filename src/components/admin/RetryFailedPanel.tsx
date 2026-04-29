import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, RotateCcw } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { useVoiceLibrary } from "@/hooks/useVoiceLibrary";
import { chapters } from "@/data/chapters";
import { VOICES } from "@/data/voices";
import { toast } from "sonner";

interface CacheRow { chapter_slug: string; voice_id: string; }
interface JobRow { id: string; chapter_slug: string; voice_id: string; status: string; created_at: string; }

const fmt = (n: number) => n.toLocaleString("pt-BR");

export const RetryFailedPanel = () => {
  const { voices } = useVoiceLibrary({ activeOnly: true });
  const [cache, setCache] = useState<CacheRow[]>([]);
  const [failedJobs, setFailedJobs] = useState<JobRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  const reload = async () => {
    setLoading(true);
    const [c, j] = await Promise.all([
      supabase.from("audio_cache").select("chapter_slug, voice_id"),
      supabase.from("audio_generation_jobs").select("id, chapter_slug, voice_id, status, created_at").eq("status", "failed").order("created_at", { ascending: false }),
    ]);
    setCache((c.data ?? []) as CacheRow[]);
    setFailedJobs((j.data ?? []) as JobRow[]);
    setLoading(false);
  };
  useEffect(() => { reload(); }, []);

  // capítulos faltando QUALQUER voz no cache (≥1 voz) + os que têm jobs failed
  const items = useMemo(() => {
    const missing: { slug: string; chars: number; reason: string; suggestedVoice?: string }[] = [];
    for (const ch of chapters) {
      const chars = ch.title.length + 2 + ch.paragraphs.join(" ").length;
      const cachedFor = cache.filter(c => c.chapter_slug === ch.slug);
      const failed = failedJobs.filter(f => f.chapter_slug === ch.slug);
      if (cachedFor.length === 0 && failed.length > 0) {
        // sugere a voz com menor histórico de falhas no sistema
        const failsByVoice = new Map<string, number>();
        failedJobs.forEach(f => failsByVoice.set(f.voice_id, (failsByVoice.get(f.voice_id) ?? 0) + 1));
        const sorted = voices.slice().sort((a, b) => (failsByVoice.get(a.voice_id) ?? 0) - (failsByVoice.get(b.voice_id) ?? 0));
        missing.push({
          slug: ch.slug, chars,
          reason: `${failed.length} falha(s) anterior(es)`,
          suggestedVoice: sorted[0]?.voice_id,
        });
      }
    }
    return missing;
  }, [cache, failedJobs, voices]);

  const retry = async (slug: string, voiceId: string) => {
    const ch = chapters.find(c => c.slug === slug);
    if (!ch) return;
    setBusy(slug);
    const voiceLabel = voices.find(v => v.voice_id === voiceId)?.label || VOICES.find(v => v.id === voiceId)?.name;
    try {
      const { data, error } = await supabase.functions.invoke("tts-chapter", {
        body: {
          slug, text: `${ch.title}. ${ch.paragraphs.join(" ")}`,
          voiceId, voiceLabel, force: false,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success(`✓ ${slug} regenerado com ${voiceLabel || voiceId.slice(0, 8)}`);
      reload();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  };

  if (loading) return <div className="py-8 text-center"><Loader2 className="h-5 w-5 animate-spin inline" /></div>;

  return (
    <Card className="p-4">
      <h3 className="font-medium mb-3 flex items-center gap-2"><RotateCcw className="h-4 w-4" />Reprocessar capítulos que falharam</h3>
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground py-4">Nenhum capítulo com falha pendente. ✅</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Capítulo</TableHead>
              <TableHead>Caracteres</TableHead>
              <TableHead>Motivo</TableHead>
              <TableHead>Voz sugerida</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map(it => {
              const known = voices.find(v => v.voice_id === it.suggestedVoice);
              return (
                <TableRow key={it.slug}>
                  <TableCell className="font-mono text-xs">{it.slug}</TableCell>
                  <TableCell className="text-xs">{fmt(it.chars)}</TableCell>
                  <TableCell><Badge variant="outline" className="text-xs">{it.reason}</Badge></TableCell>
                  <TableCell className="text-xs">{known?.label || "—"}</TableCell>
                  <TableCell className="text-right">
                    <Button size="sm" disabled={!it.suggestedVoice || busy === it.slug}
                      onClick={() => it.suggestedVoice && retry(it.slug, it.suggestedVoice)}>
                      {busy === it.slug ? <Loader2 className="h-4 w-4 animate-spin" /> : <><RotateCcw className="h-4 w-4 mr-1" />Reprocessar</>}
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}
      <p className="text-xs text-muted-foreground mt-3">
        ℹ️ A voz sugerida é a com menor histórico de falhas. Para capítulos &gt; 25k chars, o <code>tts-chapter</code> divide em sub-lotes
        automaticamente (concorrência 2) — chunks já enviados antes de quota_exceeded contam para o uso da ElevenLabs.
      </p>
    </Card>
  );
};
