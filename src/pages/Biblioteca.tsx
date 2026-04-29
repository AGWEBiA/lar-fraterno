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
  const { user } = useAuth();
  const { isApproved, approved, loading: loadingApprovals } = useChapterApprovals();

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

  const showReviewBanner = user && !loadingApprovals && approved.size < chapters.length;

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

        {showReviewBanner && (
          <Card className="mt-4 p-4 bg-accent-soft/30 border-accent/30 flex items-start gap-3">
            <ShieldCheck className="h-5 w-5 text-accent shrink-0 mt-0.5" />
            <div className="flex-1 text-sm">
              <p className="text-foreground">
                <strong>{approved.size}</strong> de {chapters.length} capítulos aprovados.
                Os demais aparecem com a marcação "Em revisão".
              </p>
              <Link to="/revisao" className="text-primary font-medium hover:underline">
                Abrir revisão →
              </Link>
            </div>
          </Card>
        )}

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
        {filtered.map((c) => {
          const ok = isApproved(c.slug);
          return (
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
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      {c.subtitle && (
                        <p className="text-xs text-accent font-medium uppercase tracking-wider">{c.subtitle}</p>
                      )}
                      {user && !loadingApprovals && (
                        ok ? (
                          <Badge variant="outline" className="text-[10px] border-accent/40 text-accent gap-1 py-0">
                            <ShieldCheck className="h-3 w-3" /> Aprovado
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-[10px] border-amber-500/40 text-amber-700 dark:text-amber-400 gap-1 py-0">
                            <ShieldAlert className="h-3 w-3" /> Em revisão
                          </Badge>
                        )
                      )}
                    </div>
                    <h3 className="font-serif text-xl font-semibold text-primary leading-tight mb-2">
                      {c.title}
                    </h3>
                    <p className="text-sm text-muted-foreground line-clamp-2">{c.summary}</p>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-smooth shrink-0" />
                </div>
              </Card>
            </Link>
          );
        })}
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
