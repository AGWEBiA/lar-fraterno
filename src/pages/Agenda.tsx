import { useEffect, useState } from "react";
import { Bell, Calendar as CalendarIcon, Clock, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

const DAYS = [
  { v: 0, l: "Domingo" }, { v: 1, l: "Segunda" }, { v: 2, l: "Terça" },
  { v: 3, l: "Quarta" }, { v: 4, l: "Quinta" }, { v: 5, l: "Sexta" }, { v: 6, l: "Sábado" },
];

interface Schedule {
  id: string; title: string; day_of_week: number; time_of_day: string; is_active: boolean;
}
interface Prefs {
  push_enabled: boolean; email_enabled: boolean; whatsapp_enabled: boolean; minutes_before: number;
}

const Agenda = () => {
  const { user } = useAuth();
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [prefs, setPrefs] = useState<Prefs>({ push_enabled: true, email_enabled: true, whatsapp_enabled: false, minutes_before: 15 });
  const [phone, setPhone] = useState("");
  const [day, setDay] = useState("3");
  const [time, setTime] = useState("20:00");
  const [loading, setLoading] = useState(true);

  const load = async () => {
    if (!user) return;
    const [s, p, pr] = await Promise.all([
      supabase.from("schedules").select("*").eq("user_id", user.id).order("day_of_week"),
      supabase.from("notification_preferences").select("*").eq("user_id", user.id).maybeSingle(),
      supabase.from("profiles").select("phone").eq("id", user.id).maybeSingle(),
    ]);
    setSchedules((s.data as Schedule[]) ?? []);
    if (p.data) setPrefs(p.data as Prefs);
    if (pr.data?.phone) setPhone(pr.data.phone);
    setLoading(false);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [user]);

  const addSchedule = async () => {
    if (!user) return;
    const { error } = await supabase.from("schedules").insert({
      user_id: user.id, day_of_week: Number(day), time_of_day: time + ":00", is_active: true,
    });
    if (error) return toast.error(error.message);
    toast.success("Agendamento adicionado!");
    load();
  };

  const toggleSchedule = async (id: string, active: boolean) => {
    await supabase.from("schedules").update({ is_active: active }).eq("id", id);
    setSchedules((s) => s.map((x) => x.id === id ? { ...x, is_active: active } : x));
  };

  const removeSchedule = async (id: string) => {
    await supabase.from("schedules").delete().eq("id", id);
    setSchedules((s) => s.filter((x) => x.id !== id));
    toast.success("Agendamento removido.");
  };

  const savePrefs = async (next: Prefs) => {
    if (!user) return;
    setPrefs(next);
    await supabase.from("notification_preferences").upsert({ user_id: user.id, ...next });
  };

  const requestPush = async () => {
    if (!("Notification" in window)) return toast.error("Seu navegador não suporta notificações.");
    const perm = await Notification.requestPermission();
    if (perm === "granted") {
      toast.success("Notificações ativadas!");
      new Notification("Evangelho no Lar", { body: "Você receberá lembretes nas datas agendadas.", icon: "/favicon.ico" });
    } else {
      toast.error("Permissão negada.");
    }
  };

  const savePhone = async () => {
    if (!user) return;
    await supabase.from("profiles").update({ phone }).eq("id", user.id);
    toast.success("Telefone salvo!");
  };

  if (loading) return <div className="container py-12 text-center text-muted-foreground">Carregando...</div>;

  return (
    <div className="container py-8 md:py-12 max-w-3xl space-y-8">
      <div>
        <h1 className="font-serif text-4xl md:text-5xl font-semibold text-primary">Agenda</h1>
        <p className="text-muted-foreground mt-1">Defina dias fixos e seja avisado com serenidade.</p>
      </div>

      {/* Add */}
      <Card className="p-6 shadow-soft border-border/50 bg-card/90">
        <h2 className="font-serif text-2xl font-semibold text-primary mb-4 flex items-center gap-2">
          <CalendarIcon className="h-5 w-5" /> Novo agendamento semanal
        </h2>
        <div className="grid sm:grid-cols-[1fr_140px_auto] gap-3 items-end">
          <div>
            <Label>Dia da semana</Label>
            <Select value={day} onValueChange={setDay}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {DAYS.map((d) => <SelectItem key={d.v} value={String(d.v)}>{d.l}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Horário</Label>
            <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
          </div>
          <Button variant="hero" onClick={addSchedule}><Plus className="h-4 w-4" /> Adicionar</Button>
        </div>
      </Card>

      {/* List */}
      <Card className="p-6 shadow-soft border-border/50 bg-card/90">
        <h2 className="font-serif text-2xl font-semibold text-primary mb-4">Seus dias</h2>
        {schedules.length === 0 ? (
          <p className="text-muted-foreground text-sm">Nenhum agendamento ainda. Adicione o primeiro acima.</p>
        ) : (
          <div className="space-y-2">
            {schedules.map((s) => (
              <div key={s.id} className="flex items-center gap-3 p-3 rounded-lg bg-secondary/50 border border-border/50">
                <div className="h-10 w-10 rounded-full bg-accent-soft flex items-center justify-center">
                  <Clock className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-primary">{DAYS.find((d) => d.v === s.day_of_week)?.l}</p>
                  <p className="text-sm text-muted-foreground">{s.time_of_day.slice(0, 5)}</p>
                </div>
                <Switch checked={s.is_active} onCheckedChange={(v) => toggleSchedule(s.id, v)} />
                <Button variant="ghost" size="icon" onClick={() => removeSchedule(s.id)} aria-label="Remover">
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Notifications */}
      <Card className="p-6 shadow-soft border-border/50 bg-card/90">
        <h2 className="font-serif text-2xl font-semibold text-primary mb-4 flex items-center gap-2">
          <Bell className="h-5 w-5" /> Como deseja ser avisado?
        </h2>

        <div className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="font-medium">Notificação no navegador</p>
              <p className="text-sm text-muted-foreground">Lembrete instantâneo no celular ou desktop.</p>
            </div>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" onClick={requestPush}>Ativar</Button>
              <Switch checked={prefs.push_enabled} onCheckedChange={(v) => savePrefs({ ...prefs, push_enabled: v })} />
            </div>
          </div>

          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="font-medium">E-mail</p>
              <p className="text-sm text-muted-foreground">Receba o lembrete na sua caixa de entrada.</p>
            </div>
            <Switch checked={prefs.email_enabled} onCheckedChange={(v) => savePrefs({ ...prefs, email_enabled: v })} />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="font-medium">WhatsApp</p>
                <p className="text-sm text-muted-foreground">Mensagem direta no seu WhatsApp.</p>
              </div>
              <Switch checked={prefs.whatsapp_enabled} onCheckedChange={(v) => savePrefs({ ...prefs, whatsapp_enabled: v })} />
            </div>
            {prefs.whatsapp_enabled && (
              <div className="flex gap-2">
                <Input placeholder="+55 11 90000-0000" value={phone} onChange={(e) => setPhone(e.target.value)} />
                <Button variant="outline" onClick={savePhone}>Salvar</Button>
              </div>
            )}
          </div>

          <div>
            <Label>Antecedência do lembrete</Label>
            <Select value={String(prefs.minutes_before)} onValueChange={(v) => savePrefs({ ...prefs, minutes_before: Number(v) })}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="5">5 minutos antes</SelectItem>
                <SelectItem value="15">15 minutos antes</SelectItem>
                <SelectItem value="30">30 minutos antes</SelectItem>
                <SelectItem value="60">1 hora antes</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <p className="text-xs text-muted-foreground mt-6 pt-4 border-t border-border/50">
          O envio de e-mail e WhatsApp será ativado nas próximas etapas — assim que configurarmos seu domínio de e-mail e a integração com Twilio.
        </p>
      </Card>
    </div>
  );
};

export default Agenda;
