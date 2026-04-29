import { Link } from "react-router-dom";
import { BookOpen, ChevronRight, Search, ShieldCheck, ShieldAlert } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { chapters } from "@/data/chapters";
import { useChapterApprovals } from "@/hooks/useChapterApprovals";
import { useAuth } from "@/hooks/useAuth";
import { useMemo, useState } from "react";

const Biblioteca = () => {
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return chapters;
    return chapters.filter(
      (c) =>
        c.title.toLowerCase().includes(term) ||
        c.summary.toLowerCase().includes(term) ||
        (c.subtitle ?? "").toLowerCase().includes(term)
    );
  }, [q]);

  return (
    <div className="container py-8 md:py-12 max-w-4xl">
      <div className="mb-8">
        <Link to="/" className="text-sm text-muted-foreground hover:text-primary transition-smooth">← Início</Link>
        <h1 className="font-serif text-4xl md:text-5xl font-semibold text-primary mt-2">
          O Evangelho Segundo o Espiritismo
        </h1>
        <p className="text-muted-foreground mt-1">
          Allan Kardec — 28 capítulos para leitura sequencial guiada.
        </p>

        <div className="relative mt-6 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Buscar capítulo..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        {filtered.map((c) => (
          <Link key={c.slug} to={`/biblioteca/${c.slug}`}>
            <Card className="p-5 h-full transition-smooth hover:shadow-elegant hover:-translate-y-0.5 cursor-pointer group bg-card/80 border-border/50">
              <div className="flex items-start gap-3">
                <div className="h-10 w-10 rounded-lg bg-accent-soft flex items-center justify-center shrink-0 group-hover:bg-accent transition-smooth">
                  {c.roman ? (
                    <span className="font-serif text-sm font-semibold text-primary">{c.roman}</span>
                  ) : (
                    <BookOpen className="h-5 w-5 text-primary" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  {c.subtitle && (
                    <p className="text-xs text-accent font-medium uppercase tracking-wider mb-1">{c.subtitle}</p>
                  )}
                  <h3 className="font-serif text-xl font-semibold text-primary leading-tight mb-2">
                    {c.title}
                  </h3>
                  <p className="text-sm text-muted-foreground line-clamp-2">{c.summary}</p>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-smooth shrink-0" />
              </div>
            </Card>
          </Link>
        ))}
      </div>

      {filtered.length === 0 && (
        <p className="text-center text-muted-foreground mt-12">
          Nenhum capítulo encontrado para "{q}".
        </p>
      )}
    </div>
  );
};

export default Biblioteca;
