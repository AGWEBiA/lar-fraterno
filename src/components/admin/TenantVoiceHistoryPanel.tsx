import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Loader2 } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

interface SelectionRow {
  id: string;
  tenant_id: string;
  voice_id: string;
  voice_label: string | null;
  selected_by: string;
  selected_at: string;
  tenant_name?: string;
  selector_name?: string;
}

export const TenantVoiceHistoryPanel = () => {
  const [rows, setRows] = useState<SelectionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");

  useEffect(() => {
    (async () => {
      const { data: sels } = await supabase
        .from("tenant_voice_selections")
        .select("*")
        .order("selected_at", { ascending: false })
        .limit(200);
      const tenantIds = Array.from(new Set((sels ?? []).map((s: any) => s.tenant_id)));
      const userIds = Array.from(new Set((sels ?? []).map((s: any) => s.selected_by)));
      const [tn, pf] = await Promise.all([
        tenantIds.length ? supabase.from("tenants").select("id, name").in("id", tenantIds) : Promise.resolve({ data: [] as any[] }),
        userIds.length ? supabase.from("profiles").select("id, full_name, email").in("id", userIds) : Promise.resolve({ data: [] as any[] }),
      ]);
      const tnMap = new Map((tn.data ?? []).map((t: any) => [t.id, t.name]));
      const pfMap = new Map((pf.data ?? []).map((p: any) => [p.id, p.full_name || p.email || p.id.slice(0, 8)]));
      setRows((sels ?? []).map((s: any) => ({
        ...s,
        tenant_name: tnMap.get(s.tenant_id) ?? s.tenant_id.slice(0, 8),
        selector_name: pfMap.get(s.selected_by) ?? s.selected_by.slice(0, 8),
      })));
      setLoading(false);
    })();
  }, []);

  const filtered = useMemo(() => {
    const f = filter.toLowerCase().trim();
    if (!f) return rows;
    return rows.filter(r => (r.tenant_name + " " + (r.voice_label ?? "") + " " + r.voice_id + " " + (r.selector_name ?? "")).toLowerCase().includes(f));
  }, [rows, filter]);

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-medium">Histórico de seleção de vozes por grupo</h3>
        <Input placeholder="Filtrar..." value={filter} onChange={(e) => setFilter(e.target.value)} className="max-w-xs" />
      </div>
      {loading ? (
        <div className="py-8 text-center"><Loader2 className="h-5 w-5 animate-spin inline" /></div>
      ) : filtered.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">Nenhuma seleção registrada.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Grupo</TableHead>
              <TableHead>Voz</TableHead>
              <TableHead>Quem selecionou</TableHead>
              <TableHead>Quando</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map(r => (
              <TableRow key={r.id}>
                <TableCell className="font-medium">{r.tenant_name}</TableCell>
                <TableCell><div>{r.voice_label || "—"}</div><div className="text-xs font-mono text-muted-foreground">{r.voice_id.slice(0, 14)}</div></TableCell>
                <TableCell className="text-sm">{r.selector_name}</TableCell>
                <TableCell className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(r.selected_at), { addSuffix: true, locale: ptBR })}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
      <p className="text-xs text-muted-foreground mt-3">
        ℹ️ Como a aplicação serve <strong>1 áudio por capítulo + voz</strong>, todos os capítulos do grupo passam a usar a voz selecionada
        a partir do momento mostrado acima. Não há regeneração de áudio — apenas troca de qual MP3 cacheado é tocado.
      </p>
    </Card>
  );
};
