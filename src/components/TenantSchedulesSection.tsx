import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Building2, Clock, Plus, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

const DAYS = [
  { v: 0, l: "Domingo" }, { v: 1, l: "Segunda" }, { v: 2, l: "Terça" },
  { v: 3, l: "Quarta" }, { v: 4, l: "Quinta" }, { v: 5, l: "Sexta" }, { v: 6, l: "Sábado" },
];

interface Tenant { id: string; name: string; owner_id: string; }
interface TSchedule { id: string; tenant_id: string; day_of_week: number; time_of_day: string; is_active: boolean; title: string; }

export const TenantSchedulesSection = () => {
  const { user } = useAuth();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [adminOf, setAdminOf] = useState<Set<string>>(new Set());
  const [schedules, setSchedules] = useState<TSchedule[]>([]);
  const [activeTenant, setActiveTenant] = useState<string>("");
  const [day, setDay] = useState("3");
  const [time, setTime] = useState("20:00");

  const load = async () => {
    if (!user) return;
    const { data: members } = await supabase.from("tenant_members").select("tenant_id, role").eq("user_id", user.id);
    const ids = (members ?? []).map((m: any) => m.tenant_id);
    if (ids.length === 0) { setTenants([]); setSchedules([]); return; }
    const { data: ts } = await supabase.from("tenants").select("id, name, owner_id").in("id", ids);
    const myTenants = (ts ?? []) as Tenant[];
    setTenants(myTenants);
    const adminSet = new Set<string>();
    (members ?? []).forEach((m: any) => { if (m.role === "tenant_admin") adminSet.add(m.tenant_id); });
    myTenants.forEach((t) => { if (t.owner_id === user.id) adminSet.add(t.id); });
    setAdminOf(adminSet);
    if (!activeTenant && myTenants[0]) setActiveTenant(myTenants[0].id);

    const { data: ss } = await supabase.from("tenant_schedules").select("*").in("tenant_id", ids).order("day_of_week");
    setSchedules((ss ?? []) as TSchedule[]);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [user]);

  if (!user || tenants.length === 0) return null;
  const canEdit = activeTenant && adminOf.has(activeTenant);
  const filtered = schedules.filter((s) => s.tenant_id === activeTenant);

  const add = async () => {
    if (!canEdit) return;
    const { error } = await supabase.from("tenant_schedules").insert({
      tenant_id: activeTenant, day_of_week: Number(day), time_of_day: time + ":00",
      is_active: true, created_by: user.id,
    });
    if (error) return toast.error(error.message);
    toast.success("Agendamento do grupo adicionado!");
    load();
  };
  const toggle = async (id: string, active: boolean) => {
    await supabase.from("tenant_schedules").update({ is_active: active }).eq("id", id);
    setSchedules((s) => s.map((x) => x.id === id ? { ...x, is_active: active } : x));
  };
  const remove = async (id: string) => {
    await supabase.from("tenant_schedules").delete().eq("id", id);
    setSchedules((s) => s.filter((x) => x.id !== id));
  };

  return (
    <Card className="p-6 shadow-soft border-border/50 bg-card/90">
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <h2 className="font-serif text-2xl font-semibold text-primary flex items-center gap-2">
          <Building2 className="h-5 w-5" /> Agenda dos meus grupos
        </h2>
        <Select value={activeTenant} onValueChange={setActiveTenant}>
          <SelectTrigger className="w-56 h-9"><SelectValue /></SelectTrigger>
          <SelectContent>{tenants.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <p className="text-xs text-muted-foreground mb-4">
        Lembretes destes horários são enviados a todos os membros do grupo, junto com sua agenda pessoal.
      </p>

      {canEdit && (
        <div className="grid sm:grid-cols-[1fr_140px_auto] gap-3 items-end mb-4">
          <div>
            <Label>Dia</Label>
            <Select value={day} onValueChange={setDay}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{DAYS.map((d) => <SelectItem key={d.v} value={String(d.v)}>{d.l}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label>Horário</Label><Input type="time" value={time} onChange={(e) => setTime(e.target.value)} /></div>
          <Button variant="hero" onClick={add}><Plus className="h-4 w-4" /> Adicionar</Button>
        </div>
      )}

      {filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhum horário deste grupo ainda.{!canEdit && " (Apenas admin do grupo pode adicionar)"}</p>
      ) : (
        <div className="space-y-2">
          {filtered.map((s) => (
            <div key={s.id} className="flex items-center gap-3 p-3 rounded-lg bg-secondary/50 border border-border/50">
              <div className="h-9 w-9 rounded-full bg-accent-soft flex items-center justify-center"><Clock className="h-4 w-4 text-primary" /></div>
              <div className="flex-1">
                <p className="font-medium text-primary text-sm">{DAYS.find((d) => d.v === s.day_of_week)?.l}</p>
                <p className="text-xs text-muted-foreground">{s.time_of_day.slice(0, 5)}</p>
              </div>
              <Badge variant="outline" className="text-[10px]">grupo</Badge>
              {canEdit && (
                <>
                  <Switch checked={s.is_active} onCheckedChange={(v) => toggle(s.id, v)} />
                  <Button variant="ghost" size="icon" onClick={() => remove(s.id)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </Card>
  );
};
