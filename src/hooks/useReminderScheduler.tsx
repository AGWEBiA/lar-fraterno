import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface Schedule {
  id: string;
  title: string;
  day_of_week: number;
  time_of_day: string; // "HH:MM:SS"
  is_active: boolean;
}
interface Prefs {
  push_enabled: boolean;
  email_enabled: boolean;
  whatsapp_enabled: boolean;
  minutes_before: number;
  push_before: boolean;
  push_start: boolean;
  push_end: boolean;
}

interface PlannedReminder {
  scheduleId: string;
  stage: "before" | "start" | "end";
  fireAt: number; // ms epoch
  title: string;
  body: string;
}

const STORAGE_KEY = "fired-reminders-v1";
const SESSION_DURATION_MIN = 30;
const MAX_HORIZON_MS = 8 * 24 * 60 * 60 * 1000; // 8 days

const dayLabels = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];

/** Compute the next occurrence of a weekly schedule from `from`. */
const nextOccurrence = (dayOfWeek: number, time: string, from: Date): Date => {
  const [h, m] = time.split(":").map(Number);
  const d = new Date(from);
  d.setSeconds(0, 0);
  const delta = (dayOfWeek - d.getDay() + 7) % 7;
  d.setDate(d.getDate() + delta);
  d.setHours(h, m, 0, 0);
  if (d.getTime() <= from.getTime()) d.setDate(d.getDate() + 7);
  return d;
};

const buildPlanned = (schedules: Schedule[], prefs: Prefs): PlannedReminder[] => {
  const now = new Date();
  const out: PlannedReminder[] = [];
  for (const s of schedules) {
    if (!s.is_active) continue;
    const start = nextOccurrence(s.day_of_week, s.time_of_day, now);
    if (start.getTime() - now.getTime() > MAX_HORIZON_MS) continue;

    const before = new Date(start.getTime() - prefs.minutes_before * 60_000);
    const end = new Date(start.getTime() + SESSION_DURATION_MIN * 60_000);

    if (prefs.push_before && before.getTime() > now.getTime()) {
      out.push({
        scheduleId: s.id,
        stage: "before",
        fireAt: before.getTime(),
        title: "Evangelho no Lar começa em breve",
        body: `Em ${prefs.minutes_before} minutos é hora do Evangelho no Lar (${dayLabels[s.day_of_week]}).`,
      });
    }
    if (prefs.push_start && start.getTime() > now.getTime()) {
      out.push({
        scheduleId: s.id,
        stage: "start",
        fireAt: start.getTime(),
        title: "Está na hora ✨",
        body: "Vamos começar o Evangelho no Lar com serenidade.",
      });
    }
    if (prefs.push_end && end.getTime() > now.getTime()) {
      out.push({
        scheduleId: s.id,
        stage: "end",
        fireAt: end.getTime(),
        title: "Reunião encerrada",
        body: "Que a paz desta reunião permaneça em seu lar.",
      });
    }
  }
  return out;
};

const reminderKey = (r: PlannedReminder) => `${r.scheduleId}|${r.stage}|${r.fireAt}`;

const loadFired = (): Set<string> => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw) as string[];
    return new Set(arr);
  } catch {
    return new Set();
  }
};
const saveFired = (s: Set<string>) => {
  // Keep only future-relevant ones (<= 60 days old)
  const cutoff = Date.now() - 60 * 24 * 60 * 60 * 1000;
  const kept = [...s].filter((k) => {
    const t = Number(k.split("|")[2]);
    return Number.isFinite(t) && t > cutoff;
  });
  localStorage.setItem(STORAGE_KEY, JSON.stringify(kept));
};

const fire = (r: PlannedReminder) => {
  if (!("Notification" in window)) return;
  if (Notification.permission !== "granted") return;
  try {
    new Notification(r.title, { body: r.body, icon: "/favicon.ico", tag: reminderKey(r) });
  } catch (e) {
    console.warn("Notification failed:", e);
  }
};

/**
 * Background scheduler that polls every 30s and fires browser notifications
 * for the "before / start / end" stages of each active schedule, respecting prefs.
 */
export const useReminderScheduler = () => {
  const { user } = useAuth();
  const intervalRef = useRef<number | null>(null);
  const planRef = useRef<PlannedReminder[]>([]);
  const firedRef = useRef<Set<string>>(loadFired());

  useEffect(() => {
    if (!user) {
      if (intervalRef.current) window.clearInterval(intervalRef.current);
      planRef.current = [];
      return;
    }

    let cancelled = false;

    const refreshPlan = async () => {
      const [s, p, sp] = await Promise.all([
        supabase.from("schedules").select("*").eq("user_id", user.id),
        supabase
          .from("notification_preferences")
          .select("*")
          .eq("user_id", user.id)
          .maybeSingle(),
        supabase
          .from("session_plan")
          .select("id, chapter_slug, session_index, scheduled_for, completed")
          .eq("user_id", user.id)
          .eq("completed", false)
          .not("scheduled_for", "is", null),
      ]);
      if (cancelled) return;
      const prefs: Prefs =
        (p.data as Prefs) ?? {
          push_enabled: true,
          email_enabled: false,
          whatsapp_enabled: false,
          minutes_before: 15,
          push_before: true,
          push_start: true,
          push_end: false,
        };
      if (!prefs.push_enabled) {
        planRef.current = [];
        return;
      }
      const fromSchedules = buildPlanned((s.data as Schedule[]) ?? [], prefs);

      const now = Date.now();
      const fromSessions: PlannedReminder[] = [];
      for (const row of (sp.data as Array<{
        id: string;
        chapter_slug: string;
        session_index: number;
        scheduled_for: string;
      }>) ?? []) {
        const start = new Date(row.scheduled_for).getTime();
        if (start - now > MAX_HORIZON_MS) continue;
        const before = start - prefs.minutes_before * 60_000;
        const end = start + SESSION_DURATION_MIN * 60_000;
        const title = `Reunião — ${row.chapter_slug.replace("capitulo-", "Cap. ")}`;
        if (prefs.push_before && before > now)
          fromSessions.push({
            scheduleId: `sess-${row.id}`,
            stage: "before",
            fireAt: before,
            title: "Sua reunião começa em breve",
            body: `${title} (sessão ${row.session_index}) em ${prefs.minutes_before} min.`,
          });
        if (prefs.push_start && start > now)
          fromSessions.push({
            scheduleId: `sess-${row.id}`,
            stage: "start",
            fireAt: start,
            title: "Está na hora ✨",
            body: `${title} — sessão ${row.session_index}.`,
          });
        if (prefs.push_end && end > now)
          fromSessions.push({
            scheduleId: `sess-${row.id}`,
            stage: "end",
            fireAt: end,
            title: "Reunião encerrada",
            body: "Que a paz desta reunião permaneça em seu lar.",
          });
      }

      // Dedup: se sessão coincide com schedule recorrente no mesmo horário, mantém só uma.
      const seen = new Set<string>();
      const merged = [...fromSchedules, ...fromSessions].filter((r) => {
        const k = `${r.stage}|${r.fireAt}`;
        if (seen.has(k)) return false;
        seen.add(k);
        return true;
      });
      planRef.current = merged;
    };

    refreshPlan();
    const refreshTimer = window.setInterval(refreshPlan, 5 * 60_000); // every 5 min

    const tick = () => {
      const now = Date.now();
      for (const r of planRef.current) {
        const key = reminderKey(r);
        if (firedRef.current.has(key)) continue;
        if (r.fireAt <= now && now - r.fireAt < 5 * 60_000) {
          fire(r);
          firedRef.current.add(key);
          saveFired(firedRef.current);
        }
      }
    };
    tick();
    intervalRef.current = window.setInterval(tick, 30_000);

    return () => {
      cancelled = true;
      if (intervalRef.current) window.clearInterval(intervalRef.current);
      window.clearInterval(refreshTimer);
    };
  }, [user]);
};
