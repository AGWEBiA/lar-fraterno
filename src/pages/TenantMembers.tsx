import { useEffect, useState } from "react";
import { Navigate, useParams, Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Building2, Copy, Loader2, Mic2, Plus, Trash2, UserCog, Users } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useVoiceLibrary } from "@/hooks/useVoiceLibrary";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

type Role = "tenant_admin" | "moderator" | "user";

interface Member {
  id: string;
  user_id: string;
  role: Role;
  joined_at: string;
  email?: string | null;
  full_name?: string | null;
}
interface Invite {
  id: string; code: string; role: Role; uses: number; max_uses: number | null; is_active: boolean; created_at: string;
}
interface VoiceSelectionLog {
  id: string; voice_id: string; voice_label: string | null; selected_by: string; selected_at: string;
  selector_email?: string | null;
}

const TenantMembers = () => {
  const { id: tenantId } = useParams();
  const { user } = useAuth();
  const [tenant, setTenant] = useState<any>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [loading, setLoading] = useState(true);
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [newRole, setNewRole] = useState<Role>("user");

  // voices
  const { voices } = useVoiceLibrary({ activeOnly: true });
  const [activeVoice, setActiveVoice] = useState<string | null>(null);
  const [voiceLog, setVoiceLog] = useState<VoiceSelectionLog[]>([]);

  const load = async () => {
    if (!tenantId || !user) return;
    setLoading(true);
    const [{ data: t }, { data: ms }, { data: invs }, { data: av }, { data: log }] = await Promise.all([
      supabase.from("tenants").select("*").eq("id", tenantId).maybeSingle(),
      supabase.from("tenant_members").select("*").eq("tenant_id", tenantId),
      supabase.from("tenant_invites").select("*").eq("tenant_id", tenantId).order("created_at", { ascending: false }),
      supabase.from("tenant_active_voice").select("*").eq("tenant_id", tenantId).maybeSingle(),
      supabase.from("tenant_voice_selections").select("*").eq("tenant_id", tenantId).order("selected_at", { ascending: false }).limit(20),
    ]);
    setTenant(t);
    // permission: owner OR admin in tenant_members
    const isOwner = t?.owner_id === user.id;
    const isAdminMember = (ms ?? []).some((m: any) => m.user_id === user.id && (m.role === "tenant_admin"));
    // also allow admin_master globally
    const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", user.id);
    const isMaster = (roles ?? []).some((r: any) => r.role === "admin_master");
    setAllowed(isOwner || isAdminMember || isMaster);

    // hydrate names/emails
    const ids = (ms ?? []).map((m: any) => m.user_id);
    const { data: profs } = ids.length
      ? await supabase.from("profiles").select("id, email, full_name").in("id", ids)
      : { data: [] as any[] };
    const profMap = new Map((profs ?? []).map((p: any) => [p.id, p]));
    setMembers((ms ?? []).map((m: any) => ({
      ...m,
      email: profMap.get(m.user_id)?.email ?? null,
      full_name: profMap.get(m.user_id)?.full_name ?? null,
    })));
    setInvites((invs ?? []) as Invite[]);
    setActiveVoice(av?.voice_id ?? null);

    const selIds = Array.from(new Set((log ?? []).map((l: any) => l.selected_by)));
    const { data: selProfs } = selIds.length
      ? await supabase.from("profiles").select("id, email").in("id", selIds)
      : { data: [] as any[] };
    const selMap = new Map((selProfs ?? []).map((p: any) => [p.id, p.email]));
    setVoiceLog((log ?? []).map((l: any) => ({ ...l, selector_email: selMap.get(l.selected_by) ?? null })));

    setLoading(false);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [tenantId, user]);

  if (!user) return <Navigate to="/auth" replace />;
  if (loading || allowed === null) return <div className="container py-12 text-center"><Loader2 className="h-5 w-5 animate-spin inline" /></div>;
  if (!allowed) return <Navigate to="/grupos" replace />;
  if (!tenant) return <Navigate to="/grupos" replace />;

  const updateRole = async (memberId: string, role: Role) => {
    const { error } = await supabase.from("tenant_members").update({ role }).eq("id", memberId);
    if (error) return toast.error(error.message);
    toast.success("Papel atualizado");
    load();
  };
  const removeMember = async (memberId: string) => {
    if (!confirm("Remover membro do grupo?")) return;
    await supabase.from("tenant_members").delete().eq("id", memberId);
    toast.success("Membro removido");
    load();
  };
  const createInvite = async () => {
    const { data: code } = await supabase.rpc("generate_invite_code");
    if (!code) return toast.error("Erro ao gerar código");
    const { error } = await supabase.from("tenant_invites").insert({
      tenant_id: tenantId, code, role: newRole, created_by: user.id,
    });
    if (error) return toast.error(error.message);
    toast.success("Convite criado");
    load();
  };
  const revokeInvite = async (id: string) => {
    await supabase.from("tenant_invites").update({ is_active: false }).eq("id", id);
    toast.success("Convite revogado");
    load();
  };
  const copy = (s: string) => { navigator.clipboard.writeText(s); toast.success("Copiado!"); };

  const setVoice = async (voiceId: string) => {
    const v = voices.find((x) => x.voice_id === voiceId);
    const { error } = await supabase.from("tenant_active_voice").upsert({
      tenant_id: tenantId!, voice_id: voiceId, selected_by: user.id, selected_at: new Date().toISOString(),
    });
    if (error) return toast.error(error.message);
    await supabase.from("tenant_voice_selections").insert({
      tenant_id: tenantId!, voice_id: voiceId, voice_label: v?.label ?? null, selected_by: user.id,
    });
    toast.success(`Voz do grupo: ${v?.label ?? voiceId}`);
    load();
  };

  return (
    <div className="container py-8 md:py-12 max-w-4xl">
      <Link to="/grupos" className="text-sm text-muted-foreground hover:text-primary inline-flex items-center gap-1 mb-3">
        <ArrowLeft className="h-3 w-3" /> Meus grupos
      </Link>
      <div className="flex items-center gap-3 mb-6">
        <div className="h-10 w-10 rounded-full bg-gradient-gold flex items-center justify-center">
          <Building2 className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="font-serif text-3xl md:text-4xl font-semibold text-primary">{tenant.name}</h1>
          <p className="text-sm text-muted-foreground">{tenant.description || "Gerencie membros, convites e voz do grupo"}</p>
        </div>
      </div>

      <Tabs defaultValue="members">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="members"><Users className="h-4 w-4 mr-2" />Membros</TabsTrigger>
          <TabsTrigger value="invites"><UserCog className="h-4 w-4 mr-2" />Convites</TabsTrigger>
          <TabsTrigger value="voice"><Mic2 className="h-4 w-4 mr-2" />Voz do grupo</TabsTrigger>
        </TabsList>

        <TabsContent value="members" className="mt-4">
          <Card className="p-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Membro</TableHead>
                  <TableHead>Papel</TableHead>
                  <TableHead>Entrou</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {members.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell>
                      <div className="font-medium">{m.full_name || "—"}</div>
                      <div className="text-xs text-muted-foreground">{m.email}</div>
                    </TableCell>
                    <TableCell>
                      <Select value={m.role} onValueChange={(v) => updateRole(m.id, v as Role)} disabled={m.user_id === tenant.owner_id}>
                        <SelectTrigger className="w-36 h-8 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="tenant_admin">tenant_admin</SelectItem>
                          <SelectItem value="moderator">moderator</SelectItem>
                          <SelectItem value="user">user</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(m.joined_at), { addSuffix: true, locale: ptBR })}
                    </TableCell>
                    <TableCell className="text-right">
                      {m.user_id !== tenant.owner_id && (
                        <Button size="sm" variant="ghost" onClick={() => removeMember(m.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                      {m.user_id === tenant.owner_id && <Badge variant="secondary">Dono</Badge>}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        <TabsContent value="invites" className="mt-4 space-y-3">
          <Card className="p-4">
            <div className="flex items-end gap-3 flex-wrap">
              <div>
                <Label className="text-xs">Papel ao entrar</Label>
                <Select value={newRole} onValueChange={(v) => setNewRole(v as Role)}>
                  <SelectTrigger className="w-40 h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="tenant_admin">tenant_admin</SelectItem>
                    <SelectItem value="moderator">moderator</SelectItem>
                    <SelectItem value="user">user</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button variant="hero" onClick={createInvite}><Plus className="h-4 w-4 mr-1" />Gerar código de convite</Button>
            </div>
          </Card>
          <Card className="p-4">
            {invites.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">Sem convites criados ainda.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Código</TableHead>
                    <TableHead>Papel</TableHead>
                    <TableHead>Usos</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invites.map((i) => (
                    <TableRow key={i.id}>
                      <TableCell><code className="font-mono">{i.code}</code></TableCell>
                      <TableCell><Badge variant="outline">{i.role}</Badge></TableCell>
                      <TableCell>{i.uses}{i.max_uses ? ` / ${i.max_uses}` : ""}</TableCell>
                      <TableCell>{i.is_active ? <Badge variant="secondary">Ativo</Badge> : <Badge variant="outline">Revogado</Badge>}</TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" variant="ghost" onClick={() => copy(i.code)}><Copy className="h-4 w-4" /></Button>
                        {i.is_active && <Button size="sm" variant="ghost" onClick={() => revokeInvite(i.id)}><Trash2 className="h-4 w-4" /></Button>}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="voice" className="mt-4 space-y-3">
          <Card className="p-4">
            <Label className="text-xs mb-2 block">Voz ativa do grupo (apenas vozes já geradas)</Label>
            <Select value={activeVoice ?? ""} onValueChange={setVoice}>
              <SelectTrigger><SelectValue placeholder="Selecione uma voz já gerada..." /></SelectTrigger>
              <SelectContent>
                {voices.map((v) => (
                  <SelectItem key={v.voice_id} value={v.voice_id}>
                    {v.label}{v.description ? ` — ${v.description}` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground mt-2">
              ℹ️ Apenas o admin master gera novos áudios. Aqui você seleciona qual voz já disponível o grupo usará.
            </p>
          </Card>

          <Card className="p-4">
            <h3 className="font-medium mb-3 text-sm">Histórico de seleções</h3>
            {voiceLog.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhuma seleção registrada ainda.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Voz</TableHead>
                    <TableHead>Selecionada por</TableHead>
                    <TableHead>Quando</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {voiceLog.map((l) => (
                    <TableRow key={l.id}>
                      <TableCell>{l.voice_label || l.voice_id}</TableCell>
                      <TableCell className="text-xs">{l.selector_email ?? l.selected_by.slice(0, 8)}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(l.selected_at), { addSuffix: true, locale: ptBR })}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default TenantMembers;
