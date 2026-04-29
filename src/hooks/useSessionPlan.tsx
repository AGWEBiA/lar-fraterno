import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface SessionPlanRow {
  id: string;
  chapter_slug: string;
  session_index: number;
  item_numbers: number[];
  scheduled_for: string | null;
  completed: boolean;
  completed_at: string | null;
  reading_method: string;
}

export const useSessionPlan = (chapterSlug?: string) => {
  const { user } = useAuth();
  const [rows, setRows] = useState<SessionPlanRow[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    if (!user) {
      setRows([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    let q = supabase
      .from("session_plan")
      .select("id, chapter_slug, session_index, item_numbers, scheduled_for, completed, completed_at, reading_method")
      .eq("user_id", user.id)
      .order("chapter_slug")
      .order("session_index");
    if (chapterSlug) q = q.eq("chapter_slug", chapterSlug);
    const { data } = await q;
    setRows((data as SessionPlanRow[]) ?? []);
    setLoading(false);
  }, [user, chapterSlug]);

  useEffect(() => {
    reload();
  }, [reload]);

  const create = async (input: {
    chapter_slug: string;
    session_index: number;
    item_numbers: number[];
    scheduled_for?: string | null;
    reading_method?: string;
  }) => {
    if (!user) return;
    await supabase.from("session_plan").insert({ user_id: user.id, ...input });
    await reload();
  };

  const update = async (id: string, patch: Partial<SessionPlanRow>) => {
    await supabase.from("session_plan").update(patch).eq("id", id);
    await reload();
  };

  const remove = async (id: string) => {
    await supabase.from("session_plan").delete().eq("id", id);
    await reload();
  };

  return { rows, loading, reload, create, update, remove };
};
