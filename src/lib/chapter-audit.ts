import { chapters, type Chapter, type ChapterNode } from "@/data/chapters";

export interface ChapterIssue {
  type: "missing" | "duplicate" | "out_of_order";
  itemNumber?: number;
  detail: string;
  /** Lacunas reconhecidas do PDF de origem — não indicam erro de parsing. */
  acknowledged?: boolean;
}

export interface ChapterAudit {
  slug: string;
  title: string;
  itemCount: number;
  expectedMax: number;
  issues: ChapterIssue[];
  hasIssues: boolean;
  /** True quando todas as issues são lacunas já reconhecidas. */
  allAcknowledged: boolean;
}

/**
 * Itens reconhecidamente ausentes no PDF original (não correspondem a
 * problema de parsing nem podem ser resolvidos por correção automática).
 */
const ACKNOWLEDGED_MISSING: Record<string, number[]> = {
  "capitulo-28": [7, 13, 14, 32, 33, 55, 56, 66],
};

export const auditChapter = (chapter: Chapter): ChapterAudit => {
  const items = chapter.nodes.filter(
    (n): n is Extract<ChapterNode, { type: "item" }> => n.type === "item",
  );
  const numbers = items.map((i) => i.n);
  const expectedMax = numbers.length ? Math.max(...numbers) : 0;
  const issues: ChapterIssue[] = [];
  const ack = new Set(ACKNOWLEDGED_MISSING[chapter.slug] ?? []);

  const seen = new Map<number, number>();
  for (const n of numbers) seen.set(n, (seen.get(n) ?? 0) + 1);

  for (let i = 1; i <= expectedMax; i++) {
    if (!seen.has(i)) {
      issues.push({
        type: "missing",
        itemNumber: i,
        detail: ack.has(i)
          ? `Item ${i} ausente no PDF original (lacuna conhecida)`
          : `Item ${i} não encontrado`,
        acknowledged: ack.has(i),
      });
    } else if ((seen.get(i) ?? 0) > 1) {
      issues.push({
        type: "duplicate",
        itemNumber: i,
        detail: `Item ${i} aparece ${seen.get(i)} vezes`,
      });
    }
  }

  let prev = 0;
  for (const n of numbers) {
    if (n < prev) {
      issues.push({
        type: "out_of_order",
        itemNumber: n,
        detail: `Item ${n} aparece após item ${prev}`,
      });
    }
    prev = Math.max(prev, n);
  }

  const allAcknowledged = issues.length > 0 && issues.every((i) => i.acknowledged);

  return {
    slug: chapter.slug,
    title: chapter.title,
    itemCount: items.length,
    expectedMax,
    issues,
    hasIssues: issues.length > 0,
    allAcknowledged,
  };
};

export const auditAllChapters = (): ChapterAudit[] => chapters.map(auditChapter);
