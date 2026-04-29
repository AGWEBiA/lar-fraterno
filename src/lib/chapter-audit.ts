import { chapters, type Chapter, type ChapterNode } from "@/data/chapters";

export interface ChapterIssue {
  type: "missing" | "duplicate" | "out_of_order";
  itemNumber?: number;
  detail: string;
}

export interface ChapterAudit {
  slug: string;
  title: string;
  itemCount: number;
  expectedMax: number;
  issues: ChapterIssue[];
  hasIssues: boolean;
}

export const auditChapter = (chapter: Chapter): ChapterAudit => {
  const items = chapter.nodes.filter(
    (n): n is Extract<ChapterNode, { type: "item" }> => n.type === "item",
  );
  const numbers = items.map((i) => i.n);
  const expectedMax = numbers.length ? Math.max(...numbers) : 0;
  const issues: ChapterIssue[] = [];

  const seen = new Map<number, number>();
  for (const n of numbers) seen.set(n, (seen.get(n) ?? 0) + 1);

  for (let i = 1; i <= expectedMax; i++) {
    if (!seen.has(i)) {
      issues.push({ type: "missing", itemNumber: i, detail: `Item ${i} não encontrado` });
    } else if ((seen.get(i) ?? 0) > 1) {
      issues.push({
        type: "duplicate",
        itemNumber: i,
        detail: `Item ${i} aparece ${seen.get(i)} vezes`,
      });
    }
  }

  // out-of-order: any item whose number is lower than the previous one
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

  return {
    slug: chapter.slug,
    title: chapter.title,
    itemCount: items.length,
    expectedMax,
    issues,
    hasIssues: issues.length > 0,
  };
};

export const auditAllChapters = (): ChapterAudit[] => chapters.map(auditChapter);
