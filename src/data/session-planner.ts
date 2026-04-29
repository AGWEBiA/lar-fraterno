// Sugere a divisão automática de capítulos longos em sessões.
// Regra: sessões com ~2-4 itens (procurando equilíbrio em parágrafos),
// limitando-se a no máximo MAX_PARAGRAPHS por sessão.
import type { Chapter, ChapterNode } from "./chapters";

export interface SessionSuggestion {
  index: number;       // 1..N
  itemNumbers: number[];
  paragraphs: number;  // total de parágrafos somados
  label: string;
}

const MAX_PARAGRAPHS_PER_SESSION = 18;
const MIN_ITEMS_PER_SESSION = 1;

const itemsOf = (nodes: ChapterNode[]) =>
  nodes.filter((n): n is Extract<ChapterNode, { type: "item" }> => n.type === "item");

/** Capítulos considerados longos e que ganham sugestão de divisão. */
export const LONG_CHAPTERS = new Set([
  "capitulo-5",
  "capitulo-13",
  "capitulo-16",
  "capitulo-28",
]);

export const isLongChapter = (slug: string) => LONG_CHAPTERS.has(slug);

export const suggestSessions = (chapter: Chapter): SessionSuggestion[] => {
  const items = itemsOf(chapter.nodes);
  if (items.length === 0) return [];

  const sessions: SessionSuggestion[] = [];
  let bucket: number[] = [];
  let bucketParas = 0;
  let idx = 1;

  const flush = () => {
    if (bucket.length === 0) return;
    sessions.push({
      index: idx++,
      itemNumbers: [...bucket],
      paragraphs: bucketParas,
      label:
        bucket.length === 1
          ? `Sessão ${idx - 1} — Item ${bucket[0]}`
          : `Sessão ${idx - 1} — Itens ${bucket[0]}–${bucket[bucket.length - 1]}`,
    });
    bucket = [];
    bucketParas = 0;
  };

  for (const it of items) {
    const paras = it.paragraphs.length;
    if (
      bucket.length >= MIN_ITEMS_PER_SESSION &&
      bucketParas + paras > MAX_PARAGRAPHS_PER_SESSION
    ) {
      flush();
    }
    bucket.push(it.n);
    bucketParas += paras;
  }
  flush();
  return sessions;
};

/** Itens disponíveis para uma nova sessão = todos os itens do capítulo
 *  menos os que já estão em sessões existentes do mesmo capítulo. */
export const remainingItemsForChapter = (
  chapter: Chapter,
  usedItemNumbers: number[],
): number[] => {
  const used = new Set(usedItemNumbers);
  return itemsOf(chapter.nodes)
    .map((i) => i.n)
    .filter((n) => !used.has(n));
};
