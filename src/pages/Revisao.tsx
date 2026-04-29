import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { AlertTriangle, CheckCircle2, ChevronDown, ChevronRight, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { auditAllChapters, type ChapterAudit } from "@/lib/chapter-audit";
import { chapterBySlug } from "@/data/chapters";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const Revisao = () => {
  const { user } = useAuth();
  const audits = useMemo(() => auditAllChapters(), []);
  const [approvals, setApprovals] = useState<Record<string, boolean>>({});
  const [open, setOpen] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    supabase
      .from("chapter_approvals")
      .select("chapter_slug, approved")
      .eq("user_id", user.id)
      .then(({ data, error }) => {
        if (error) {
          toast.error("Não foi possível carregar aprovações.");
        } else {
          const map: Record<string, boolean> = {};
          for (const row of data ?? []) map[row.chapter_slug] = !!row.approved;
          setApprovals(map);
        }
        setLoading(false);
      });
  }, [user]);

  const toggleApproval = async (slug: string, approved: boolean) => {
    if (!user) return;
    setApprovals((prev) => ({ ...prev, [slug]: approved }));
    const { error } = await supabase
      .from("chapter_approvals")
      .upsert(
        { user_id: user.id, chapter_slug: slug, approved },
        { onConflict: "user_id,chapter_slug" },
      );
    if (error) {
      toast.error("Falha ao salvar aprovação.");
      setApprovals((prev) => ({ ...prev, [slug]: !approved }));
    } else {
      toast.success(approved ? "Capítulo aprovado." : "Aprovação removida.");
    }
  };

  const approvedCount = Object.values(approvals).filter(Boolean).length;
  const totalIssues = audits.reduce((s, a) => s + a.issues.length, 0);

  return (
    <div className="container py-8 md:py-12 max-w-4xl">
      <div className="mb-8">
        <Link to="/" className="text-sm text-muted-foreground hover:text-primary transition-smooth">
          ← Início
        </Link>
        <h1 className="font-serif text-4xl md:text-5xl font-semibold text-primary mt-2 flex items-center gap-3">
          <ShieldCheck className="h-8 w-8 text-accent" /> Revisão do conteúdo
        </h1>
        <p className="text-muted-foreground mt-2 max-w-2xl">
          Revise cada capítulo extraído do PDF antes de liberá-lo para uso e leitura por áudio.
          Capítulos não aprovados ficam marcados como "Em revisão" na biblioteca.
        </p>

        <div className="mt-6 grid sm:grid-cols-3 gap-3">
          <Card className="p-4 bg-card/80 border-border/50">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Capítulos</p>
            <p className="font-serif text-3xl text-primary mt-1">{audits.length}</p>
          </Card>
          <Card className="p-4 bg-card/80 border-border/50">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Aprovados</p>
            <p className="font-serif text-3xl text-accent mt-1">
              {approvedCount}/{audits.length}
            </p>
          </Card>
          <Card className="p-4 bg-card/80 border-border/50">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Inconsistências</p>
            <p className="font-serif text-3xl text-primary mt-1">{totalIssues}</p>
          </Card>
        </div>
      </div>

      {!user && (
        <Card className="p-5 mb-6 border-accent/40 bg-accent-soft/30">
          <p className="text-sm">
            <Link to="/auth" className="text-primary font-medium hover:underline">
              Entre na sua conta
            </Link>{" "}
            para salvar suas aprovações.
          </p>
        </Card>
      )}

      <div className="space-y-3">
        {audits.map((a) => (
          <AuditRow
            key={a.slug}
            audit={a}
            approved={!!approvals[a.slug]}
            disabled={!user || loading}
            isOpen={open === a.slug}
            onToggleOpen={() => setOpen(open === a.slug ? null : a.slug)}
            onApprove={(v) => toggleApproval(a.slug, v)}
          />
        ))}
      </div>
    </div>
  );
};

interface RowProps {
  audit: ChapterAudit;
  approved: boolean;
  disabled: boolean;
  isOpen: boolean;
  onToggleOpen: () => void;
  onApprove: (v: boolean) => void;
}

const AuditRow = ({ audit, approved, disabled, isOpen, onToggleOpen, onApprove }: RowProps) => {
  const chapter = chapterBySlug(audit.slug);

  return (
    <Card
      className={cn(
        "border-border/50 overflow-hidden transition-smooth",
        approved ? "bg-accent-soft/20 border-accent/30" : "bg-card/80",
      )}
    >
      <button
        onClick={onToggleOpen}
        className="w-full flex items-center gap-3 p-4 text-left hover:bg-secondary/40 transition-smooth"
      >
        {isOpen ? (
          <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
        ) : (
          <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-serif text-lg font-semibold text-primary">{audit.title}</span>
            {audit.hasIssues ? (
              <Badge variant="outline" className="border-amber-500/40 text-amber-700 dark:text-amber-400">
                <AlertTriangle className="h-3 w-3 mr-1" /> {audit.issues.length} alerta
                {audit.issues.length > 1 ? "s" : ""}
              </Badge>
            ) : (
              <Badge variant="outline" className="border-accent/40 text-accent">
                <CheckCircle2 className="h-3 w-3 mr-1" /> Sem alertas
              </Badge>
            )}
            {approved && (
              <Badge className="bg-accent text-accent-foreground">
                <CheckCircle2 className="h-3 w-3 mr-1" /> Aprovado
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {audit.itemCount} itens (#1 a #{audit.expectedMax})
          </p>
        </div>
      </button>

      {isOpen && (
        <div className="border-t border-border/50 p-4 space-y-4">
          {audit.issues.length > 0 ? (
            <div>
              <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2">
                Possíveis problemas
              </p>
              <ul className="space-y-1 text-sm">
                {audit.issues.map((issue, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span
                      className={cn(
                        "inline-block px-2 py-0.5 rounded text-[10px] font-semibold uppercase shrink-0 mt-0.5",
                        issue.type === "missing" && "bg-amber-500/20 text-amber-700 dark:text-amber-400",
                        issue.type === "duplicate" && "bg-blue-500/20 text-blue-700 dark:text-blue-400",
                        issue.type === "out_of_order" && "bg-purple-500/20 text-purple-700 dark:text-purple-400",
                      )}
                    >
                      {issue.type === "missing"
                        ? "faltando"
                        : issue.type === "duplicate"
                          ? "duplicado"
                          : "fora de ordem"}
                    </span>
                    <span>{issue.detail}</span>
                  </li>
                ))}
              </ul>
              <p className="text-xs text-muted-foreground mt-3">
                Dica: confira no PDF original os itens marcados. Estas inconsistências geralmente
                indicam que o parser uniu dois itens em um, ou capturou um número que aparece dentro
                do texto.
              </p>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Numeração contínua e sem duplicatas. Faça uma leitura rápida do conteúdo antes de
              aprovar.
            </p>
          )}

          <div className="flex flex-wrap gap-2 pt-2 border-t border-border/30">
            <Button asChild variant="gold" size="sm">
              <Link to={`/revisao/${audit.slug}`}>Editar texto e numeração</Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link to={`/biblioteca/${audit.slug}`}>Abrir capítulo</Link>
            </Button>
            {approved ? (
              <Button
                variant="ghost"
                size="sm"
                disabled={disabled}
                onClick={() => onApprove(false)}
              >
                Remover aprovação
              </Button>
            ) : (
              <Button variant="gold" size="sm" disabled={disabled} onClick={() => onApprove(true)}>
                <CheckCircle2 className="h-4 w-4" /> Aprovar para uso
              </Button>
            )}
            {chapter && (
              <span className="text-xs text-muted-foreground self-center ml-auto">
                {chapter.paragraphs.length} parágrafos · ~
                {Math.round(
                  chapter.paragraphs.reduce((s, p) => s + p.length, 0) / 1000,
                )}
                k caracteres
              </span>
            )}
          </div>
        </div>
      )}
    </Card>
  );
};

export default Revisao;
