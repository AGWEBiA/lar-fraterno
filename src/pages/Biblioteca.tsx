import { Link } from "react-router-dom";
import { BookOpen, ChevronRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { chapters } from "@/data/chapters";

const Biblioteca = () => {
  return (
    <div className="container py-8 md:py-12 max-w-4xl">
      <div className="mb-8">
        <Link to="/" className="text-sm text-muted-foreground hover:text-primary transition-smooth">← Início</Link>
        <h1 className="font-serif text-4xl md:text-5xl font-semibold text-primary mt-2">Evangelho Segundo o Espiritismo</h1>
        <p className="text-muted-foreground mt-1">Capítulos selecionados — Allan Kardec</p>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        {chapters.map((c) => (
          <Link key={c.slug} to={`/biblioteca/${c.slug}`}>
            <Card className="p-5 h-full transition-smooth hover:shadow-elegant hover:-translate-y-0.5 cursor-pointer group bg-card/80 border-border/50">
              <div className="flex items-start gap-3">
                <div className="h-10 w-10 rounded-lg bg-accent-soft flex items-center justify-center shrink-0 group-hover:bg-accent transition-smooth">
                  <BookOpen className="h-5 w-5 text-primary" />
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
    </div>
  );
};

export default Biblioteca;
