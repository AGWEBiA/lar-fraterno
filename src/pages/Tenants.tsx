import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Building2, Plus, Loader2, Copy, LogIn, Users } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Tenant {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  owner_id: string;
}

interface Invite {
  id: string;
  code: string;
  role: string;
  uses: number;
  max_uses: number | null;
  is_active: boolean;
  tenant_id: string;
}

const slugify = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

const Tenants = () => {
  const { user, loading: authLoading } = useAuth();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [invites, setInvites] = useState<Record<string, Invite[]>>({});
  const [loading, setLoading] = useState(true);

  // create form
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  // join form
  const [joinCode, setJoinCode] = useState("");

  const load = async () => {
    if (!user) return;
    setLoading(true);
    const { data: members } = await supabase.from("tenant_members").select("tenant_id").eq("user_id", user.id);
    const ids = (members ?? []).map((m: any) => m.tenant_id);
    if (ids.length === 0) {
      setTenants([]);
      setInvites({});
      setLoading(false);
      return;
    }
    const { data: ts } = await supabase.from("tenants").select("*").in("id", ids);
    setTenants((ts ?? []) as Tenant[]);

    // invites for tenants the user owns / admins
    const { data: invs } = await supabase.from("tenant_invites").select("*").in("tenant_id", ids);
    const byTenant: Record<string, Invite[]> = {};
    (invs ?? []).forEach((i: any) => {
      byTenant[i.tenant_id] = byTenant[i.tenant_id] ?? [];
      byTenant[i.tenant_id].push(i);
    });
    setInvites(byTenant);
    setLoading(false);
  };

  useEffect(() => {
    if (user) load();
  }, [user]);

  if (authLoading) return <div className="container py-12 text-center"><Loader2 className="h-5 w-5 animate-spin inline" /></div>;
  if (!user) return <Navigate to="/auth" replace />;

  const create = async () => {
    if (!name.trim()) return toast.error("Informe um nome");
    const slug = `${slugify(name)}-${Math.random().toString(36).slice(2, 6)}`;
    const { error } = await supabase.from("tenants").insert({
      name: name.trim(),
      slug,
      description: description.trim() || null,
      owner_id: user.id,
    });
    if (error) return toast.error(error.message);
    toast.success("Grupo criado!");
    setName(""); setDescription("");
    load();
  };

  const join = async () => {
    if (!joinCode.trim()) return toast.error("Informe um código");
    const { error } = await supabase.rpc("accept_tenant_invite", { _code: joinCode.trim() });
    if (error) return toast.error(error.message.replace(/^.*: /, ""));
    toast.success("Bem-vindo ao grupo!");
    setJoinCode("");
    load();
  };

  const createInvite = async (tenantId: string) => {
    const { data: code } = await supabase.rpc("generate_invite_code");
    if (!code) return toast.error("Erro ao gerar código");
    const { error } = await supabase.from("tenant_invites").insert({
      tenant_id: tenantId,
      code,
      role: "user",
      created_by: user.id,
    });
    if (error) return toast.error(error.message);
    toast.success("Convite criado");
    load();
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success("Código copiado!");
  };

  return (
    <div className="container py-8 md:py-12 max-w-4xl">
      <div className="flex items-center gap-3 mb-6">
        <div className="h-10 w-10 rounded-full bg-gradient-gold flex items-center justify-center">
          <Building2 className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="font-serif text-3xl md:text-4xl font-semibold text-primary">Meus grupos</h1>
          <p className="text-sm text-muted-foreground">Crie um lar/grupo de estudo ou entre em um existente</p>
        </div>
      </div>

      <Tabs defaultValue="mine">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="mine">Meus grupos</TabsTrigger>
          <TabsTrigger value="create">Criar</TabsTrigger>
          <TabsTrigger value="join">Entrar</TabsTrigger>
        </TabsList>

        <TabsContent value="mine" className="mt-4 space-y-3">
          {loading ? (
            <div className="py-12 text-center"><Loader2 className="h-5 w-5 animate-spin inline" /></div>
          ) : tenants.length === 0 ? (
            <Card className="p-8 text-center text-muted-foreground">
              Você ainda não participa de nenhum grupo.
            </Card>
          ) : (
            tenants.map((t) => (
              <Card key={t.id} className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-medium">{t.name}</h3>
                    {t.description && <p className="text-sm text-muted-foreground">{t.description}</p>}
                    {t.owner_id === user.id && <Badge variant="secondary" className="mt-2">Dono</Badge>}
                  </div>
                  {t.owner_id === user.id && (
                    <Button size="sm" variant="outline" onClick={() => createInvite(t.id)}>
                      <Plus className="h-4 w-4 mr-1" />Novo convite
                    </Button>
                  )}
                </div>
                {invites[t.id] && invites[t.id].length > 0 && (
                  <div className="mt-3 pt-3 border-t border-border/50 space-y-1">
                    <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1"><Users className="h-3 w-3" />Códigos de convite ativos:</p>
                    {invites[t.id].filter((i) => i.is_active).map((i) => (
                      <div key={i.id} className="flex items-center gap-2">
                        <code className="text-sm bg-secondary px-2 py-1 rounded font-mono">{i.code}</code>
                        <Button size="sm" variant="ghost" onClick={() => copyCode(i.code)}>
                          <Copy className="h-3 w-3" />
                        </Button>
                        <span className="text-xs text-muted-foreground">{i.uses} uso(s)</span>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="create" className="mt-4">
          <Card className="p-4 space-y-3">
            <div>
              <Label>Nome do grupo</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex.: Lar da Família Silva" />
            </div>
            <div>
              <Label>Descrição (opcional)</Label>
              <Input value={description} onChange={(e) => setDescription(e.target.value)} />
            </div>
            <Button onClick={create} variant="hero"><Plus className="h-4 w-4 mr-1" />Criar grupo</Button>
          </Card>
        </TabsContent>

        <TabsContent value="join" className="mt-4">
          <Card className="p-4 space-y-3">
            <div>
              <Label>Código de convite</Label>
              <Input value={joinCode} onChange={(e) => setJoinCode(e.target.value.toUpperCase())} placeholder="EX.: A1B2C3D4" maxLength={12} />
            </div>
            <Button onClick={join} variant="hero"><LogIn className="h-4 w-4 mr-1" />Entrar no grupo</Button>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Tenants;
