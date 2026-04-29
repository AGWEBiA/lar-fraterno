import { useEffect, useState, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Loader2, Calculator } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { chapters } from "@/data/chapters";

const fmt = (n: number) => n.toLocaleString("pt-BR");

export const CreditPlanningPanel = () => {
  const [margin, setMargin] = useState(20);
  const [quota, setQuota] = useState(100000);
  const [planLabel, setPlanLabel] = useState("Creator $22");
  const [voicesPlanned, setVoicesPlanned] = useState(1);
  const [loading, setLoading] = useState(true);
  const [cachedChars, setCachedChars] = useState(0);
  const [cachedSlugs, setCachedSlugs] = useState<Set<string>>(new Set());

  useEffect(() => {
    Promise.all([
      supabase.from("admin_settings").select("value").eq("key", "credit_planning").maybeSingle(),
      supabase.from("audio_cache").select("chapter_slug, characters"),
    ]).then(([s, c]) => {
      const v = (s.data?.value ?? {}) as Record<string, unknown>;
      if (typeof v.safety_margin_pct === "number") setMargin(v.safety_margin_pct);
      if (typeof v.monthly_quota === "number") setQuota(v.monthly_quota);
      if (typeof v.plan_label === "string") setPlanLabel(v.plan_label);
      const rows = c.data ?? [];
      setCachedChars(rows.reduce((a, r: any) => a + (r.characters || 0), 0));
      setCachedSlugs(new Set(rows.map((r: any) => r.chapter_slug)));
      setLoading(false);
    });
  }, []);

  const totals = useMemo(() => {
    const totalChars = chapters.reduce((a, c) => a + (c.title.length + 2 + c.paragraphs.join(" ").length), 0);
    const remainingChars = chapters
      .filter((c) => !cachedSlugs.has(c.slug))
      .reduce((a, c) => a + (c.title.length + 2 + c.paragraphs.join(" ").length), 0);
    const withMargin = Math.ceil(remainingChars * (1 + margin / 100));
    const allVoices = Math.ceil(totalChars * voicesPlanned * (1 + margin / 100));
    const monthsToFinish = quota > 0 ? Math.ceil(withMargin / quota) : Infinity;
    const monthsAllVoices = quota > 0 ? Math.ceil(allVoices / quota) : Infinity;
    return { totalChars, remainingChars, withMargin, allVoices, monthsToFinish, monthsAllVoices };
  }, [cachedSlugs, margin, quota, voicesPlanned]);

  const save = async () => {
    const { error } = await supabase.from("admin_settings").upsert({
      key: "credit_planning",
      value: { safety_margin_pct: margin, monthly_quota: quota, plan_label: planLabel },
      updated_at: new Date().toISOString(),
    });
    if (error) return toast.error(error.message);
    toast.success("Configuração salva");
  };

  if (loading) return <div className="py-8 text-center"><Loader2 className="h-5 w-5 animate-spin inline" /></div>;

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <h3 className="font-medium mb-3 flex items-center gap-2"><Calculator className="h-4 w-4" />Planejamento de créditos</h3>
        <div className="grid md:grid-cols-3 gap-4">
          <div>
            <Label className="text-xs">Margem de segurança: <strong>{margin}%</strong></Label>
            <Slider value={[margin]} min={0} max={50} step={5} onValueChange={(v) => setMargin(v[0])} className="mt-2" />
          </div>
          <div>
            <Label className="text-xs">Quota mensal (créditos)</Label>
            <Input type="number" value={quota} onChange={(e) => setQuota(parseInt(e.target.value) || 0)} />
          </div>
          <div>
            <Label className="text-xs">Plano</Label>
            <Input value={planLabel} onChange={(e) => setPlanLabel(e.target.value)} placeholder="Creator $22" />
          </div>
          <div>
            <Label className="text-xs">Vozes planejadas (catálogo total)</Label>
            <Input type="number" min={1} max={10} value={voicesPlanned}
              onChange={(e) => setVoicesPlanned(Math.max(1, parseInt(e.target.value) || 1))} />
          </div>
        </div>
        <Button onClick={save} variant="hero" className="mt-3">Salvar configuração</Button>
      </Card>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="p-3"><p className="text-xs text-muted-foreground">Total conteúdo (1 voz)</p><p className="text-2xl font-serif text-primary">{fmt(totals.totalChars)}</p></Card>
        <Card className="p-3"><p className="text-xs text-muted-foreground">Já em cache</p><p className="text-2xl font-serif text-accent">{fmt(cachedChars)}</p></Card>
        <Card className="p-3"><p className="text-xs text-muted-foreground">Faltam (com {margin}% margem)</p><p className="text-2xl font-serif text-primary">{fmt(totals.withMargin)}</p></Card>
        <Card className="p-3">
          <p className="text-xs text-muted-foreground">Meses p/ terminar 1 voz</p>
          <p className="text-2xl font-serif text-primary">{Number.isFinite(totals.monthsToFinish) ? totals.monthsToFinish : "∞"}</p>
          <p className="text-[10px] text-muted-foreground">no plano {planLabel}</p>
        </Card>
      </div>

      <Card className="p-4 bg-secondary/40">
        <p className="text-sm">
          🎯 Cobertura para <strong>{voicesPlanned} voz(es)</strong> completa(s):{" "}
          <strong>{fmt(totals.allVoices)}</strong> créditos →{" "}
          <strong>{Number.isFinite(totals.monthsAllVoices) ? totals.monthsAllVoices : "∞"} mês(es)</strong> de assinatura {planLabel}.
        </p>
      </Card>
    </div>
  );
};
