import { useEffect, useMemo, useState } from "react";
import { Navigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ShieldCheck, Users, Building2, Mic2, BookOpen, Loader2, Plus, Ban, CheckCircle2, Trash2, Activity, AlertTriangle, Calculator, BarChart3, PlayCircle, History, RotateCcw, CalendarCheck, Pencil } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole, AppRole } from "@/hooks/useUserRole";
import { useVoiceLibrary } from "@/hooks/useVoiceLibrary";
import { supabase } from "@/integrations/supabase/client";
import { GenerationsPanel } from "@/components/admin/GenerationsPanel";
import { StuckJobsPanel } from "@/components/admin/StuckJobsPanel";
import { CreditPlanningPanel } from "@/components/admin/CreditPlanningPanel";
import { VoiceProgressPanel } from "@/components/admin/VoiceProgressPanel";
import { BatchGenerationPanel } from "@/components/admin/BatchGenerationPanel";
import { TenantVoiceHistoryPanel } from "@/components/admin/TenantVoiceHistoryPanel";
import { RetryFailedPanel } from "@/components/admin/RetryFailedPanel";
import { MeetingsReportPanel } from "@/components/admin/MeetingsReportPanel";
import { UserEditDialog } from "@/components/admin/UserEditDialog";
import { toast } from "sonner";

interface UserRow {
  id: string;
  email: string | null;
  full_name: string | null;
  phone: string | null;
  created_at: string;
  roles: AppRole[];
  blocked: boolean;
}

interface TenantRow {
  id: string;
  name: string;
  slug: string;
  owner_id: string;
  created_at: string;
  member_count?: number;
}

const Admin = () => {
  const { user, loading: authLoading } = useAuth();
  const { isAdminMaster, loading: roleLoading } = useUserRole();

  if (authLoading || roleLoading) {
    return (
      <div className="container py-12 flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }
  if (!user) return <Navigate to="/auth" replace />;
  if (!isAdminMaster) {
    return (
      <div className="container py-12 max-w-xl">
        <Card className="p-6 text-center">
          <ShieldCheck className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
          <h1 className="font-serif text-2xl text-primary mb-1">Acesso restrito</h1>
          <p className="text-muted-foreground">Esta área é exclusiva do administrador master.</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="container py-8 md:py-12 max-w-6xl">
      <div className="flex items-center gap-3 mb-6">
        <div className="h-10 w-10 rounded-full bg-gradient-gold flex items-center justify-center">
          <ShieldCheck className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="font-serif text-3xl md:text-4xl font-semibold text-primary">Painel do Administrador</h1>
          <p className="text-muted-foreground text-sm">Gestão global do sistema</p>
        </div>
      </div>

      <Tabs defaultValue="users">
        <TabsList className="flex w-full flex-wrap h-auto gap-1">
          <TabsTrigger value="users"><Users className="h-4 w-4 mr-1" />Usuários</TabsTrigger>
          <TabsTrigger value="tenants"><Building2 className="h-4 w-4 mr-1" />Grupos</TabsTrigger>
          <TabsTrigger value="voices"><Mic2 className="h-4 w-4 mr-1" />Vozes</TabsTrigger>
          <TabsTrigger value="generations"><Activity className="h-4 w-4 mr-1" />Gerações</TabsTrigger>
          <TabsTrigger value="stuck"><AlertTriangle className="h-4 w-4 mr-1" />Travados</TabsTrigger>
          <TabsTrigger value="batch"><PlayCircle className="h-4 w-4 mr-1" />Lote</TabsTrigger>
          <TabsTrigger value="retry"><RotateCcw className="h-4 w-4 mr-1" />Reprocessar</TabsTrigger>
          <TabsTrigger value="progress"><BarChart3 className="h-4 w-4 mr-1" />Progresso</TabsTrigger>
          <TabsTrigger value="planning"><Calculator className="h-4 w-4 mr-1" />Planejamento</TabsTrigger>
          <TabsTrigger value="voice-history"><History className="h-4 w-4 mr-1" />Hist. vozes</TabsTrigger>
          <TabsTrigger value="meetings"><CalendarCheck className="h-4 w-4 mr-1" />Reuniões</TabsTrigger>
          <TabsTrigger value="content"><BookOpen className="h-4 w-4 mr-1" />Conteúdo</TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="mt-4"><UsersPanel /></TabsContent>
        <TabsContent value="tenants" className="mt-4"><TenantsPanel /></TabsContent>
        <TabsContent value="voices" className="mt-4"><VoicesPanel /></TabsContent>
        <TabsContent value="generations" className="mt-4"><GenerationsPanel /></TabsContent>
        <TabsContent value="stuck" className="mt-4"><StuckJobsPanel /></TabsContent>
        <TabsContent value="batch" className="mt-4"><BatchGenerationPanel /></TabsContent>
        <TabsContent value="retry" className="mt-4"><RetryFailedPanel /></TabsContent>
        <TabsContent value="progress" className="mt-4"><VoiceProgressPanel /></TabsContent>
        <TabsContent value="planning" className="mt-4"><CreditPlanningPanel /></TabsContent>
        <TabsContent value="voice-history" className="mt-4"><TenantVoiceHistoryPanel /></TabsContent>
        <TabsContent value="meetings" className="mt-4"><MeetingsReportPanel /></TabsContent>
        <TabsContent value="content" className="mt-4"><ContentPanel /></TabsContent>
      </Tabs>
    </div>
  );
};

// =========================================================
// USERS
// =========================================================
const UsersPanel = () => {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");
  const [editing, setEditing] = useState<UserRow | null>(null);

  const load = async () => {
    setLoading(true);
    const [{ data: profs }, { data: roles }, { data: status }] = await Promise.all([
      supabase.from("profiles").select("id, email, full_name, phone, created_at"),
      supabase.from("user_roles").select("user_id, role"),
      supabase.from("user_status").select("user_id, blocked"),
    ]);
    const rolesByUser = new Map<string, AppRole[]>();
    (roles ?? []).forEach((r: any) => {
      const arr = rolesByUser.get(r.user_id) ?? [];
      arr.push(r.role);
      rolesByUser.set(r.user_id, arr);
    });
    const blockedSet = new Set((status ?? []).filter((s: any) => s.blocked).map((s: any) => s.user_id));
    setUsers(
      (profs ?? []).map((p: any) => ({
        id: p.id,
        email: p.email,
        full_name: p.full_name,
        phone: p.phone,
        created_at: p.created_at,
        roles: rolesByUser.get(p.id) ?? [],
        blocked: blockedSet.has(p.id),
      })),
    );
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    const f = filter.toLowerCase().trim();
    if (!f) return users;
    return users.filter(
      (u) => (u.email ?? "").toLowerCase().includes(f) || (u.full_name ?? "").toLowerCase().includes(f),
    );
  }, [users, filter]);

  const toggleRole = async (userId: string, role: AppRole, has: boolean) => {
    if (has) {
      await supabase.from("user_roles").delete().eq("user_id", userId).eq("role", role).is("tenant_id", null);
    } else {
      await supabase.from("user_roles").insert({ user_id: userId, role });
    }
    toast.success("Papel atualizado");
    load();
  };

  const toggleBlock = async (userId: string, blocked: boolean) => {
    await supabase.from("user_status").upsert({
      user_id: userId,
      blocked: !blocked,
      blocked_at: !blocked ? new Date().toISOString() : null,
    });
    toast.success(!blocked ? "Usuário bloqueado" : "Usuário desbloqueado");
    load();
  };

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-4 gap-3">
        <Input placeholder="Buscar por nome ou e-mail..." value={filter} onChange={(e) => setFilter(e.target.value)} className="max-w-sm" />
        <Badge variant="secondary">{users.length} usuários</Badge>
      </div>
      {loading ? (
        <div className="py-12 text-center text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin inline" /></div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Usuário</TableHead>
              <TableHead>Papéis</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((u) => (
              <TableRow key={u.id}>
                <TableCell>
                  <div className="font-medium">{u.full_name || "—"}</div>
                  <div className="text-xs text-muted-foreground">{u.email}</div>
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {(["admin_master", "tenant_admin", "moderator", "user"] as AppRole[]).map((r) => {
                      const has = u.roles.includes(r);
                      return (
                        <Button
                          key={r}
                          size="sm"
                          variant={has ? "default" : "outline"}
                          className="h-6 px-2 text-[10px]"
                          onClick={() => toggleRole(u.id, r, has)}
                        >
                          {r}
                        </Button>
                      );
                    })}
                  </div>
                </TableCell>
                <TableCell>
                  {u.blocked ? <Badge variant="destructive">Bloqueado</Badge> : <Badge variant="secondary">Ativo</Badge>}
                </TableCell>
                <TableCell className="text-right">
                  <Button size="sm" variant={u.blocked ? "outline" : "destructive"} onClick={() => toggleBlock(u.id, u.blocked)}>
                    {u.blocked ? <CheckCircle2 className="h-4 w-4" /> : <Ban className="h-4 w-4" />}
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

// =========================================================
// TENANTS
// =========================================================
const TenantsPanel = () => {
  const [tenants, setTenants] = useState<TenantRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from("tenants").select("*").order("created_at", { ascending: false });
    const { data: members } = await supabase.from("tenant_members").select("tenant_id");
    const counts = new Map<string, number>();
    (members ?? []).forEach((m: any) => counts.set(m.tenant_id, (counts.get(m.tenant_id) ?? 0) + 1));
    setTenants((data ?? []).map((t: any) => ({ ...t, member_count: counts.get(t.id) ?? 0 })));
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const remove = async (id: string) => {
    if (!confirm("Excluir este grupo? Os membros perderão o vínculo.")) return;
    await supabase.from("tenants").delete().eq("id", id);
    toast.success("Grupo excluído");
    load();
  };

  return (
    <Card className="p-4">
      {loading ? (
        <div className="py-12 text-center"><Loader2 className="h-5 w-5 animate-spin inline" /></div>
      ) : tenants.length === 0 ? (
        <p className="py-12 text-center text-muted-foreground">Nenhum grupo criado ainda.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Slug</TableHead>
              <TableHead>Membros</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tenants.map((t) => (
              <TableRow key={t.id}>
                <TableCell className="font-medium">{t.name}</TableCell>
                <TableCell className="text-xs text-muted-foreground">{t.slug}</TableCell>
                <TableCell>{t.member_count}</TableCell>
                <TableCell className="text-right">
                  <Button size="sm" variant="ghost" onClick={() => remove(t.id)}>
                    <Trash2 className="h-4 w-4" />
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

// =========================================================
// VOICES
// =========================================================
const VoicesPanel = () => {
  const { voices, reload, loading } = useVoiceLibrary();
  const [voiceId, setVoiceId] = useState("");
  const [label, setLabel] = useState("");
  const [description, setDescription] = useState("");

  const add = async () => {
    if (!voiceId.trim() || !label.trim()) return toast.error("Voice ID e nome são obrigatórios");
    const { error } = await supabase.from("voice_library").insert({
      voice_id: voiceId.trim(),
      label: label.trim(),
      description: description.trim() || null,
      is_active: true,
    });
    if (error) return toast.error(error.message);
    toast.success("Voz adicionada");
    setVoiceId(""); setLabel(""); setDescription("");
    reload();
  };

  const toggle = async (id: string, active: boolean) => {
    await supabase.from("voice_library").update({ is_active: !active }).eq("id", id);
    reload();
  };

  const remove = async (id: string) => {
    if (!confirm("Remover esta voz do catálogo?")) return;
    await supabase.from("voice_library").delete().eq("id", id);
    reload();
  };

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <h3 className="font-medium mb-3">Adicionar nova voz</h3>
        <div className="grid md:grid-cols-3 gap-3">
          <div>
            <Label className="text-xs">Voice ID (ElevenLabs)</Label>
            <Input value={voiceId} onChange={(e) => setVoiceId(e.target.value)} placeholder="ex.: EXAVITQu4vr4xnSDxMaL" />
          </div>
          <div>
            <Label className="text-xs">Nome</Label>
            <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="ex.: Sarah" />
          </div>
          <div>
            <Label className="text-xs">Descrição</Label>
            <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="opcional" />
          </div>
        </div>
        <Button onClick={add} variant="hero" className="mt-3"><Plus className="h-4 w-4 mr-1" />Adicionar voz</Button>
      </Card>

      <Card className="p-4">
        {loading ? (
          <div className="py-8 text-center"><Loader2 className="h-5 w-5 animate-spin inline" /></div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Voice ID</TableHead>
                <TableHead>Ativa</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {voices.map((v) => (
                <TableRow key={v.id}>
                  <TableCell>
                    <div className="font-medium">{v.label}</div>
                    {v.description && <div className="text-xs text-muted-foreground">{v.description}</div>}
                  </TableCell>
                  <TableCell className="text-xs font-mono">{v.voice_id}</TableCell>
                  <TableCell><Switch checked={v.is_active} onCheckedChange={() => toggle(v.id, v.is_active)} /></TableCell>
                  <TableCell className="text-right">
                    <Button size="sm" variant="ghost" onClick={() => remove(v.id)}><Trash2 className="h-4 w-4" /></Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      <Card className="p-4 bg-secondary/40">
        <p className="text-xs text-muted-foreground">
          ℹ️ Apenas o admin master pode <strong>gerar</strong> novos áudios (alto consumo de IA). Demais usuários, moderadores e admins de grupo
          podem apenas <strong>selecionar</strong> vozes que já foram geradas e estão salvas no sistema.
        </p>
      </Card>
    </div>
  );
};

// =========================================================
// CONTENT (placeholder leve com link à Revisão)
// =========================================================
const ContentPanel = () => (
  <Card className="p-6">
    <h3 className="font-medium mb-2">Gestão de conteúdo</h3>
    <p className="text-sm text-muted-foreground mb-4">
      Use a tela de <strong>Revisão</strong> para auditar capítulos e gerar áudios. Correções de conteúdo aplicadas
      ficam disponíveis para todos os tenants.
    </p>
    <Button asChild variant="hero"><a href="/revisao">Abrir Revisão</a></Button>
  </Card>
);

export default Admin;
