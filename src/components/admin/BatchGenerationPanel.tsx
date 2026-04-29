import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Loader2, PlayCircle, RefreshCcw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useVoiceLibrary } from "@/hooks/useVoiceLibrary";
import { chapters } from "@/data/chapters";
import { toast } from "sonner";

interface RunRow { id: string; voice_label: string | null; voice_id: string; total_characters: number; succeeded: number; failed: number; status: string; started_at: string; finished_at: string | null; chapter_slugs: string[]; }

const fmt = (n: number) => n.toLocaleString("pt-BR");
const chapterChars = (slug: string) => {
  const ch = chapters.find(c => c.slug === slug);
  if (!ch) return 0;
  return ch.title.length + 2 + ch.paragraphs.join(" ").length;
};

export const BatchGenerationPanel = () => {
  const { voices } = useVoiceLibrary({ activeOnly: true });
  const [voiceId, setVoiceId] = useState("");
  const [maxChars, setMaxChars] = useState(20000);
  const [cachedSlugs, setCachedSlugs] = useState<Set<string>>(new Set());
  const [runs, setRuns] = useState<RunRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState<string | null>(null);

  const reload = async () => {
    const [c, r] = await Promise.all([
      supabase.from("audio_cache").select("chapter_slug, voice_id"),
      supabase.from("audio_batch_runs").select("*").order("started_at", { ascending: false }).limit(20),
    ]);
    setCachedSlugs(new Set((c.data ?? []).filter((row: any) => row.voice_id === voiceId).map((row: any) => row.chapter_slug)));
    setRuns((r.data ?? []) as RunRow[]);
  };
  useEffect(() => { if (voiceId) reload(); }, [voiceId]);
  useEffect(() => { if (!voiceId && voices[0]) setVoiceId(voices[0].voice_id); }, [voices, voiceId]);

  const nextBatch = useMemo(() => {
    return chapters
      .filter(c => !cachedSlugs.has(c.slug))
      .filter(c => chapterChars(c.slug) <= maxChars)
      .slice(0, 3);
  }, [cachedSlugs, maxChars]);

  const runBatch = async () => {
    if (!voiceId || nextBatch.length === 0) return;
    setLoading(true);
    setProgress(`Processando ${nextBatch.length} capítulo(s)...`);
    const voiceLabel = voices.find(v => v.voice_id === voiceId)?.label;
    try {
      const { data, error } = await supabase.functions.invoke("tts-batch", {
        body: {
          voiceId, voiceLabel,
          maxCharsPerChapter: maxChars,
          chapters: nextBatch.map(c => ({
            slug: c.slug,
            text: `${c.title}. ${c.paragraphs.join(" ")}`,
            characters: chapterChars(c.slug),
          })),
        },
      });
      if (error) throw error;
      const totalChars = nextBatch.reduce((a, c) => a + chapterChars(c.slug), 0);
      toast.success(`Lote concluído: ${data.succeeded} ok, ${data.failed} falhas (${fmt(totalChars)} chars)`);
      await reload();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
      setProgress(null);
    }
  };

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <h3 className="font-medium mb-3 flex items-center gap-2"><PlayCircle className="h-4 w-4" />Gerar próximo lote</h3>
        <div className="grid md:grid-cols-3 gap-3">
          <div>
            <Label className="text-xs">Voz</Label>
            <select className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
              value={voiceId} onChange={(e) => setVoiceId(e.target.value)}>
              {voices.map(v => <option key={v.voice_id} value={v.voice_id}>{v.label}</option>)}
            </select>
          </div>
          <div>
            <Label className="text-xs">Máx caracteres por capítulo</Label>
            <Input type="number" value={maxChars} onChange={(e) => setMaxChars(parseInt(e.target.value) || 0)} />
          </div>
          <div className="flex items-end">
            <Button onClick={runBatch} disabled={loading || nextBatch.length === 0} variant="hero" className="w-full">
              {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <PlayCircle className="h-4 w-4 mr-2" />}
              Processar {nextBatch.length} capítulo(s)
            </Button>
          </div>
        </div>

        {progress && <p className="text-xs text-blue-500 mt-2">{progress}</p>}

        <div className="mt-4">
          <p className="text-xs text-muted-foreground mb-2">Próximos no lote (≤ {fmt(maxChars)} chars cada, máx 3 por rodada):</p>
          {nextBatch.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum capítulo elegível com os filtros atuais.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {nextBatch.map(c => (
                <Badge key={c.slug} variant="outline">{c.slug} · {fmt(chapterChars(c.slug))}</Badge>
              ))}
              <Badge>Total: {fmt(nextBatch.reduce((a, c) => a + chapterChars(c.slug), 0))}</Badge>
            </div>
          )}
        </div>
      </Card>

      <Card className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-medium">Histórico de rodadas</h3>
          <Button size="sm" variant="ghost" onClick={reload}><RefreshCcw className="h-4 w-4" /></Button>
        </div>
        {runs.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4">Nenhuma rodada de lote ainda.</p>
        ) : (
          <div className="space-y-2">
            {runs.map(r => (
              <div key={r.id} className="flex items-center justify-between border rounded-md p-2 text-xs">
                <div>
                  <div className="font-medium">{r.voice_label || r.voice_id.slice(0, 10)} · {r.chapter_slugs.length} caps</div>
                  <div className="text-muted-foreground">{new Date(r.started_at).toLocaleString("pt-BR")} — {fmt(r.total_characters)} chars</div>
                </div>
                <div className="flex gap-2 items-center">
                  <Badge variant={r.failed === 0 ? "default" : r.succeeded === 0 ? "destructive" : "secondary"}>
                    {r.succeeded}✓ / {r.failed}✕
                  </Badge>
                  <Badge variant="outline">{r.status}</Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
};
