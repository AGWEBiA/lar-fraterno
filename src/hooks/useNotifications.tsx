import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface AppNotification {
  id: string;
  kind: string;
  title: string;
  body: string | null;
  data: any;
  read: boolean;
  created_at: string;
}

export const useNotifications = () => {
  const { user } = useAuth();
  const [items, setItems] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    if (!user) { setItems([]); setLoading(false); return; }
    setLoading(true);
    const { data } = await supabase
      .from("app_notifications")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50);
    setItems((data ?? []) as AppNotification[]);
    setLoading(false);
  }, [user]);

  useEffect(() => { reload(); }, [reload]);

  // realtime
  useEffect(() => {
    if (!user) return;
    const ch = supabase
      .channel(`notif-${user.id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "app_notifications", filter: `user_id=eq.${user.id}` },
        (payload) => setItems((prev) => [payload.new as AppNotification, ...prev]))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user]);

  const markAllRead = async () => {
    if (!user) return;
    const unread = items.filter((i) => !i.read).map((i) => i.id);
    if (!unread.length) return;
    await supabase.from("app_notifications").update({ read: true }).in("id", unread);
    setItems((prev) => prev.map((i) => unread.includes(i.id) ? { ...i, read: true } : i));
  };

  const unreadCount = items.filter((i) => !i.read).length;
  return { items, loading, unreadCount, reload, markAllRead };
};
