import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { chapterBySlug, type Chapter, type ChapterNode } from "@/data/chapters";

export interface OverrideRow {
  id: string;
  node_index: number;
  override_type: string | null;
  item_number: number | null;
  heading_text: string | null;
  paragraphs: string[] | null;
  paragraph_text: string | null;
}
export interface InsertRow {
  id: string;
  after_node_index: number;
  position: number;
  node_type: string;
  item_number: number | null;
  heading_text: string | null;
  paragraphs: string[] | null;
  paragraph_text: string | null;
}
export interface RemovalRow {
  id: string;
  node_index: number;
}

/**
 * Apply user overrides/inserts/removals on top of the original parsed chapter
 * to produce the final node list used for reading and audio.
 */
export const applyEdits = (
  original: ChapterNode[],
  overrides: OverrideRow[],
  inserts: InsertRow[],
  removals: RemovalRow[],
): ChapterNode[] => {
  const removed = new Set(removals.map((r) => r.node_index));
  const overrideMap = new Map(overrides.map((o) => [o.node_index, o]));
  const insertsAfter = new Map<number, InsertRow[]>();
  for (const ins of inserts) {
    const arr = insertsAfter.get(ins.after_node_index) ?? [];
    arr.push(ins);
    insertsAfter.set(ins.after_node_index, arr);
  }
  for (const arr of insertsAfter.values()) arr.sort((a, b) => a.position - b.position);

  const toNodeFromInsert = (ins: InsertRow): ChapterNode => {
    if (ins.node_type === "item") {
      return { type: "item", n: ins.item_number ?? 0, paragraphs: ins.paragraphs ?? [] };
    }
    if (ins.node_type === "heading") {
      return { type: "heading", text: ins.heading_text ?? "" };
    }
    return { type: "paragraph", text: ins.paragraph_text ?? "" };
  };

  const applyOverride = (node: ChapterNode, ov: OverrideRow): ChapterNode => {
    if (node.type === "item") {
      return {
        type: "item",
        n: ov.item_number ?? node.n,
        paragraphs: ov.paragraphs && ov.paragraphs.length ? ov.paragraphs : node.paragraphs,
      };
    }
    if (node.type === "heading") {
      return { type: "heading", text: ov.heading_text ?? node.text };
    }
    return { type: "paragraph", text: ov.paragraph_text ?? node.text };
  };

  const result: ChapterNode[] = [];
  // Inserts before everything (after_node_index = -1)
  for (const ins of insertsAfter.get(-1) ?? []) result.push(toNodeFromInsert(ins));
  original.forEach((node, idx) => {
    if (removed.has(idx)) return;
    const ov = overrideMap.get(idx);
    result.push(ov ? applyOverride(node, ov) : node);
    for (const ins of insertsAfter.get(idx) ?? []) result.push(toNodeFromInsert(ins));
  });
  return result;
};

export interface EditedChapter extends Chapter {
  editedNodes: ChapterNode[];
  editedParagraphs: string[];
}

const buildEdited = (chapter: Chapter, nodes: ChapterNode[]): EditedChapter => {
  const paragraphs: string[] = [];
  for (const n of nodes) {
    if (n.type === "item") {
      for (const p of n.paragraphs) paragraphs.push(`${n.n}. ${p}`);
    } else {
      paragraphs.push(n.text);
    }
  }
  return { ...chapter, editedNodes: nodes, editedParagraphs: paragraphs };
};

/** Loads edits for a single chapter and returns the edited version + mutation helpers. */
export const useChapterEdits = (slug: string) => {
  const { user } = useAuth();
  const [overrides, setOverrides] = useState<OverrideRow[]>([]);
  const [inserts, setInserts] = useState<InsertRow[]>([]);
  const [removals, setRemovals] = useState<RemovalRow[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    if (!user) {
      setOverrides([]);
      setInserts([]);
      setRemovals([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const [ov, ins, rm] = await Promise.all([
      supabase
        .from("chapter_item_overrides")
        .select("id, node_index, override_type, item_number, heading_text, paragraphs, paragraph_text")
        .eq("user_id", user.id)
        .eq("chapter_slug", slug),
      supabase
        .from("chapter_node_inserts")
        .select("id, after_node_index, position, node_type, item_number, heading_text, paragraphs, paragraph_text")
        .eq("user_id", user.id)
        .eq("chapter_slug", slug),
      supabase
        .from("chapter_node_removals")
        .select("id, node_index")
        .eq("user_id", user.id)
        .eq("chapter_slug", slug),
    ]);
    setOverrides((ov.data as OverrideRow[]) ?? []);
    setInserts((ins.data as InsertRow[]) ?? []);
    setRemovals((rm.data as RemovalRow[]) ?? []);
    setLoading(false);
  }, [user, slug]);

  useEffect(() => {
    reload();
  }, [reload]);

  const chapter = chapterBySlug(slug);
  const edited = chapter
    ? buildEdited(chapter, applyEdits(chapter.nodes, overrides, inserts, removals))
    : null;

  return {
    chapter: edited,
    rawOverrides: overrides,
    rawInserts: inserts,
    rawRemovals: removals,
    loading,
    reload,
  };
};
