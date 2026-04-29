import { useMemo } from "react";
import { CheckCircle2, Circle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Chapter } from "@/data/chapters";

interface Props {
  chapter: Chapter;
  selected: number[];
  onChange: (next: number[]) => void;
  /** itens já estudados em outras sessões — exibidos com destaque “já lido” */
  alreadyUsed?: number[];
  /** itens previamente lidos (item_progress.read) */
  alreadyRead?: number[];
}

export const ItemSelector = ({ chapter, selected, onChange, alreadyUsed = [], alreadyRead = [] }: Props) => {
  const items = useMemo(
    () =>
      chapter.nodes
        .filter((n): n is Extract<typeof chapter.nodes[number], { type: "item" }> => n.type === "item")
        .map((i) => ({ n: i.n, preview: i.paragraphs[0]?.slice(0, 90) ?? "" })),
    [chapter],
  );

  const used = new Set(alreadyUsed);
  const read = new Set(alreadyRead);
  const sel = new Set(selected);

  const toggle = (n: number) => {
    if (sel.has(n)) onChange(selected.filter((x) => x !== n));
    else onChange([...selected, n].sort((a, b) => a - b));
  };

  const selectAll = () => onChange(items.map((i) => i.n));
  const clear = () => onChange([]);
  const selectUnseen = () => onChange(items.filter((i) => !used.has(i.n)).map((i) => i.n));

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" size="sm" variant="outline" onClick={selectUnseen}>
          Apenas inéditos
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={selectAll}>
          Todos
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={clear}>
          Limpar
        </Button>
        <Badge variant="outline" className="ml-auto">
          {selected.length} de {items.length} selecionados
        </Badge>
      </div>
      <div className="grid sm:grid-cols-2 gap-2 max-h-80 overflow-y-auto pr-1 border border-border/50 rounded-lg p-2 bg-secondary/20">
        {items.map((i) => {
          const isSel = sel.has(i.n);
          const isUsed = used.has(i.n);
          const isRead = read.has(i.n);
          return (
            <button
              key={i.n}
              type="button"
              onClick={() => toggle(i.n)}
              className={cn(
                "text-left flex items-start gap-2 p-2 rounded-md border transition-smooth",
                isSel
                  ? "bg-primary/10 border-primary/40"
                  : "bg-card/60 border-border/50 hover:bg-secondary",
              )}
            >
              {isSel ? (
                <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
              ) : (
                <Circle className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
              )}
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-medium text-primary">Item {i.n}</span>
                  {isUsed && (
                    <span className="text-[10px] uppercase tracking-wide text-amber-600 dark:text-amber-400">
                      em outra sessão
                    </span>
                  )}
                  {isRead && !isUsed && (
                    <span className="text-[10px] uppercase tracking-wide text-emerald-600 dark:text-emerald-400">
                      lido
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground line-clamp-2">{i.preview}</p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
