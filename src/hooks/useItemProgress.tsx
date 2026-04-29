import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface ItemProgressRow {
  item_number: number;
  read: boolean;
  bookmarked: boolean;
  note: string | null;
  read_at: string | null;
}

/** Loads & mutates per-item read/bookmark/note state for one chapter. */
export const useItemProgress = (chapterSlug: string | undefined) => {
  const { user } = useAuth();
  const [rows, setRows] = useState<Record<number, ItemProgressRow>>({});
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    if (!user || !chapterSlug) {
      setRows({});
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data } = await supabase
      .from("item_progress")
      .select("item_number, read, bookmarked, note, read_at")
      .eq("user_id", user.id)
      .eq("chapter_slug", chapterSlug);
    const map: Record<number, ItemProgressRow> = {};
    for (const r of (data ?? []) as ItemProgressRow[]) map[r.item_number] = r;
    setRows(map);
    setLoading(false);
  }, [user, chapterSlug]);

  useEffect(() => {
    reload();
  }, [reload]);

  const upsert = useCallback(
    async (item_number: number, patch: Partial<ItemProgressRow>) => {
      if (!user || !chapterSlug) return;
      const current = rows[item_number] ?? { item_number, read: false, bookmarked: false, note: null, read_at: null };
      const next: ItemProgressRow = { ...current, ...patch };
      setRows((prev) => ({ ...prev, [item_number]: next }));
      await supabase.from("item_progress").upsert(
        {
          user_id: user.id,
          chapter_slug: chapterSlug,
          item_number,
          read: next.read,
          bookmarked: next.bookmarked,
          note: next.note,
          read_at: next.read ? next.read_at ?? new Date().toISOString() : null,
        },
        { onConflict: "user_id,chapter_slug,item_number" },
      );
    },
    [user, chapterSlug, rows],
  );

  const toggleRead = (item_number: number) =>
    upsert(item_number, {
      read: !(rows[item_number]?.read ?? false),
      read_at: !rows[item_number]?.read ? new Date().toISOString() : null,
    });

  const toggleBookmark = (item_number: number) =>
    upsert(item_number, { bookmarked: !(rows[item_number]?.bookmarked ?? false) });

  const setNote = (item_number: number, note: string) => upsert(item_number, { note });

  return { rows, loading, reload, toggleRead, toggleBookmark, setNote };
};
