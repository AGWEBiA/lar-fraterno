import { useEffect, useState } from "react";
import { Bell, Calendar as CalendarIcon, CalendarRange, Clock, ListChecks, Plus, Sparkles, Trash2, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useSessionPlan, type SessionPlanRow } from "@/hooks/useSessionPlan";
import { chapters } from "@/data/chapters";
import { isLongChapter, suggestSessions } from "@/data/session-planner";
import { TenantSchedulesSection } from "@/components/TenantSchedulesSection";
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
  push_before: boolean; push_start: boolean; push_end: boolean;
  email_before: boolean; email_start: boolean; email_end: boolean;
  whatsapp_before: boolean; whatsapp_start: boolean; whatsapp_end: boolean;
  schedule_mode: "manual" | "automatic";
  reading_method: "sequential" | "random";
}

const DEFAULT_PREFS: Prefs = {
  push_enabled: true, email_enabled: true, whatsapp_enabled: false, minutes_before: 15,
  push_before: true, push_start: true, push_end: false,
  email_before: true, email_start: false, email_end: false,
  whatsapp_before: true, whatsapp_start: false, whatsapp_end: false,
  schedule_mode: "manual",
  reading_method: "sequential",
};

/** Próxima ocorrência do dia/horário a partir de "from". */
const nextOccurrence = (from: Date, dayOfWeek: number, time: string) => {
  const [hh, mm] = time.split(":").map(Number);
  const d = new Date(from);
  d.setHours(hh, mm, 0, 0);
  const diff = (dayOfWeek - d.getDay() + 7) % 7;
  d.setDate(d.getDate() + (diff === 0 && d <= from ? 7 : diff));
  return d;
};

const Agenda = () => {
  const { user } = useAuth();
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [prefs, setPrefs] = useState<Prefs>(DEFAULT_PREFS);
  const [phone, setPhone] = useState("");
  const [day, setDay] = useState("3");
  const [time, setTime] = useState("20:00");
  const [loading, setLoading] = useState(true);
  const { rows: planRows, create: createPlan, remove: removePlan, reload: reloadPlan } = useSessionPlan();

  const load = async () => {
    if (!user) return;
    const [s, p, pr] = await Promise.all([
      supabase.from("schedules").select("*").eq("user_id", user.id).order("day_of_week"),
      supabase.from("notification_preferences").select("*").eq("user_id", user.id).maybeSingle(),
      supabase.from("profiles").select("phone").eq("id", user.id).maybeSingle(),
    ]);
    setSchedules((s.data as Schedule[]) ?? []);
    if (p.data) setPrefs({ ...DEFAULT_PREFS, ...(p.data as Partial<Prefs>) });
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

  /** Gera todas as sessões dos 28 capítulos, agendadas semanalmente
   *  no primeiro `schedules` ativo do usuário. Capítulos longos viram várias sessões. */
  const generateAutoPlan = async () => {
    if (!user) return;
    const active = schedules.find((s) => s.is_active) ?? schedules[0];
    if (!active) {
      toast.error("Adicione primeiro um dia/horário semanal.");
      return;
    }
    if (planRows.length > 0) {
      const ok = window.confirm(
        "Já existe um plano. Isso vai apagar o plano atual e gerar um novo. Continuar?",
      );
      if (!ok) return;
      await supabase.from("session_plan").delete().eq("user_id", user.id);
    }

    let cursor = nextOccurrence(new Date(), active.day_of_week, active.time_of_day.slice(0, 5));
    const inserts: Array<{
      user_id: string;
      chapter_slug: string;
      session_index: number;
      item_numbers: number[];
      scheduled_for: string;
      reading_method: string;
    }> = [];

    for (const ch of chapters) {
      const sessions = isLongChapter(ch.slug)
        ? suggestSessions(ch)
        : [{ index: 1, itemNumbers: ch.nodes.filter((n) => n.type === "item").map((n: any) => n.n) }];
      for (const sess of sessions) {
        inserts.push({
          user_id: user.id,
          chapter_slug: ch.slug,
          session_index: sess.index,
          item_numbers: sess.itemNumbers,
          scheduled_for: cursor.toISOString(),
          reading_method: prefs.reading_method,
        });
        cursor = new Date(cursor);
        cursor.setDate(cursor.getDate() + 7);
      }
    }
    await supabase.from("session_plan").insert(inserts);
    await reloadPlan();
    toast.success(`${inserts.length} sessões agendadas!`);
  };

  const clearPlan = async () => {
    if (!user) return;
    if (!window.confirm("Apagar todo o plano de sessões?")) return;
    await supabase.from("session_plan").delete().eq("user_id", user.id);
    await reloadPlan();
    toast.success("Plano removido.");
  };

  const chapterTitle = (slug: string) => {
    const c = chapters.find((x) => x.slug === slug);
    return c ? `${c.roman} — ${c.title}` : slug;
  };
  const upcoming = planRows
    .filter((r) => !r.completed)
    .sort(
      (a, b) =>
        new Date(a.scheduled_for ?? 0).getTime() - new Date(b.scheduled_for ?? 0).getTime(),
    )
    .slice(0, 8);

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

      <TenantSchedulesSection />

      {/* Plano de sessões */}
      <Card className="p-6 shadow-soft border-border/50 bg-card/90">
        <div className="flex items-start justify-between flex-wrap gap-3 mb-4">
          <div>
            <h2 className="font-serif text-2xl font-semibold text-primary flex items-center gap-2">
              <CalendarRange className="h-5 w-5" /> Plano de sessões
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              Como organizar a sequência das reuniões pelos 28 capítulos.
            </p>
          </div>
          <Tabs
            value={prefs.schedule_mode}
            onValueChange={(v) => savePrefs({ ...prefs, schedule_mode: v as "manual" | "automatic" })}
          >
            <TabsList>
              <TabsTrigger value="manual">Manual</TabsTrigger>
              <TabsTrigger value="automatic">Automático</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        <div className="grid sm:grid-cols-2 gap-3 mb-4">
          <div>
            <Label>Método de leitura</Label>
            <Select
              value={prefs.reading_method}
              onValueChange={(v) =>
                savePrefs({ ...prefs, reading_method: v as "sequential" | "random" })
              }
            >
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="sequential">Sequencial — capítulo após capítulo</SelectItem>
                <SelectItem value="random">Aleatório — abrir o livro ao acaso</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {prefs.schedule_mode === "automatic" ? (
          <div className="rounded-lg border border-border/50 bg-secondary/30 p-4 mb-3">
            <div className="flex items-start gap-2">
              <Sparkles className="h-4 w-4 text-primary mt-0.5" />
              <div className="text-sm text-foreground">
                Vamos agendar uma reunião por semana, no seu primeiro dia ativo,
                avançando capítulo por capítulo. Caps. V, XIII, XVI e XXVIII serão divididos em sessões menores.
              </div>
            </div>
            <div className="flex flex-wrap gap-2 mt-3">
              <Button variant="hero" size="sm" onClick={generateAutoPlan}>
                <Wand2 className="h-4 w-4" /> Gerar plano completo
              </Button>
              {planRows.length > 0 && (
                <Button variant="ghost" size="sm" onClick={clearPlan}>
                  <Trash2 className="h-4 w-4" /> Limpar plano
                </Button>
              )}
            </div>
          </div>
        ) : (
          <div className="rounded-lg border border-border/50 bg-secondary/30 p-4 mb-3 text-sm text-muted-foreground">
            <ListChecks className="inline h-4 w-4 mr-1 text-primary" />
            Modo manual: você escolhe na tela de Reunião quais itens entram em cada encontro.
            As sessões concluídas ficam registradas aqui.
          </div>
        )}

        {upcoming.length > 0 && (
          <div className="mt-4">
            <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2">
              Próximas sessões
            </p>
            <div className="space-y-1.5">
              {upcoming.map((r) => (
                <div
                  key={r.id}
                  className="flex items-center gap-3 p-2 rounded-md bg-card/60 border border-border/40 text-sm"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-primary truncate">{chapterTitle(r.chapter_slug)}</p>
                    <p className="text-xs text-muted-foreground">
                      Sessão {r.session_index} · {r.item_numbers.length} item(ns)
                      {r.scheduled_for &&
                        ` · ${new Date(r.scheduled_for).toLocaleDateString("pt-BR", {
                          day: "2-digit",
                          month: "short",
                          weekday: "short",
                        })}`}
                    </p>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {r.reading_method === "random" ? "Aleatório" : "Sequencial"}
                  </Badge>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removePlan(r.id)}
                    aria-label="Remover sessão"
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>
            {planRows.filter((r) => !r.completed).length > upcoming.length && (
              <p className="text-xs text-muted-foreground mt-2">
                + {planRows.filter((r) => !r.completed).length - upcoming.length} sessões adicionais
              </p>
            )}
          </div>
        )}
      </Card>

      {/* Notifications */}
      <Card className="p-6 shadow-soft border-border/50 bg-card/90">
        <h2 className="font-serif text-2xl font-semibold text-primary mb-2 flex items-center gap-2">
          <Bell className="h-5 w-5" /> Lembretes em etapas
        </h2>
        <p className="text-sm text-muted-foreground mb-4">
          Escolha quais avisos receber em cada momento da reunião e por qual canal.
        </p>

        <div className="mb-4">
          <Button size="sm" variant="outline" onClick={requestPush}>
            Ativar notificações do navegador
          </Button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm border border-border/50 rounded-lg">
            <thead className="bg-secondary/50">
              <tr>
                <th className="text-left p-3 font-medium">Canal</th>
                <th className="p-3 font-medium">Antes ({prefs.minutes_before} min)</th>
                <th className="p-3 font-medium">Início</th>
                <th className="p-3 font-medium">Fim</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-t border-border/50">
                <td className="p-3">
                  <p className="font-medium">Navegador</p>
                  <p className="text-xs text-muted-foreground">Ativo agora</p>
                </td>
                {(["before", "start", "end"] as const).map((stage) => {
                  const key = `push_${stage}` as const;
                  return (
                    <td key={stage} className="p-3 text-center">
                      <Switch
                        checked={prefs[key]}
                        onCheckedChange={(v) => savePrefs({ ...prefs, [key]: v })}
                      />
                    </td>
                  );
                })}
              </tr>
              <tr className="border-t border-border/50 opacity-60">
                <td className="p-3">
                  <p className="font-medium">E-mail</p>
                  <p className="text-xs text-muted-foreground">Em breve</p>
                </td>
                {(["before", "start", "end"] as const).map((stage) => {
                  const key = `email_${stage}` as const;
                  return (
                    <td key={stage} className="p-3 text-center">
                      <Switch
                        checked={prefs[key]}
                        onCheckedChange={(v) => savePrefs({ ...prefs, [key]: v })}
                      />
                    </td>
                  );
                })}
              </tr>
              <tr className="border-t border-border/50 opacity-60">
                <td className="p-3">
                  <p className="font-medium">WhatsApp</p>
                  <p className="text-xs text-muted-foreground">Em breve</p>
                </td>
                {(["before", "start", "end"] as const).map((stage) => {
                  const key = `whatsapp_${stage}` as const;
                  return (
                    <td key={stage} className="p-3 text-center">
                      <Switch
                        checked={prefs[key]}
                        onCheckedChange={(v) => savePrefs({ ...prefs, [key]: v })}
                      />
                    </td>
                  );
                })}
              </tr>
            </tbody>
          </table>
        </div>

        <div className="grid sm:grid-cols-2 gap-3 mt-4">
          <div>
            <Label>Antecedência do lembrete "antes"</Label>
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
          {prefs.whatsapp_before || prefs.whatsapp_start || prefs.whatsapp_end ? (
            <div>
              <Label>Telefone para WhatsApp</Label>
              <div className="flex gap-2 mt-1">
                <Input placeholder="+55 11 90000-0000" value={phone} onChange={(e) => setPhone(e.target.value)} />
                <Button variant="outline" onClick={savePhone}>Salvar</Button>
              </div>
            </div>
          ) : null}
        </div>

        <p className="text-xs text-muted-foreground mt-6 pt-4 border-t border-border/50">
          O envio de e-mail e WhatsApp será ativado nas próximas etapas — após configurarmos seu domínio de e-mail e a integração com Twilio. As notificações do navegador já funcionam.
        </p>
      </Card>
    </div>
  );
};

export default Agenda;
