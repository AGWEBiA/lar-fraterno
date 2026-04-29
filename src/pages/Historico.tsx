import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { History, NotebookPen, Plus, Trash2, Users, X, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { chapters, chapterBySlug } from "@/data/chapters";
import { toast } from "sonner";

interface HistoryRow {
  id: string;
  held_at: string;
  chapter_slug: string | null;
  participants: number | null;
  participants_list: string[] | null;
  notes: string | null;
  title: string | null;
}

const Historico = () => {
  const { user } = useAuth();
  const [rows, setRows] = useState<HistoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<HistoryRow | null>(null);
  const [showForm, setShowForm] = useState(false);

  const load = async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from("meeting_history")
      .select("id, held_at, chapter_slug, participants, participants_list, notes, title")
      .eq("user_id", user.id)
      .order("held_at", { ascending: false });
    if (error) toast.error("Não foi possível carregar o histórico.");
    setRows((data as HistoryRow[]) ?? []);
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const remove = async (id: string) => {
    if (!confirm("Excluir esta reunião do histórico?")) return;
    await supabase.from("meeting_history").delete().eq("id", id);
    setRows((r) => r.filter((x) => x.id !== id));
    toast.success("Registro removido.");
  };

  const startNew = () => {
    setEditing({
      id: "",
      held_at: new Date().toISOString().slice(0, 16),
      chapter_slug: chapters[0].slug,
      participants: 1,
      participants_list: [],
      notes: "",
      title: "",
    });
    setShowForm(true);
  };

  const startEdit = (r: HistoryRow) => {
    setEditing({
      ...r,
      held_at: new Date(r.held_at).toISOString().slice(0, 16),
    });
    setShowForm(true);
  };

  const save = async () => {
    if (!user || !editing) return;
    const payload = {
      user_id: user.id,
      held_at: new Date(editing.held_at).toISOString(),
      chapter_slug: editing.chapter_slug,
      participants:
        editing.participants_list?.length || editing.participants || 1,
      participants_list: editing.participants_list ?? [],
      notes: editing.notes ?? "",
      title: editing.title ?? "",
    };
    if (editing.id) {
      const { error } = await supabase
        .from("meeting_history")
        .update(payload)
        .eq("id", editing.id);
      if (error) return toast.error(error.message);
      toast.success("Reunião atualizada.");
    } else {
      const { error } = await supabase.from("meeting_history").insert(payload);
      if (error) return toast.error(error.message);
      toast.success("Reunião registrada.");
    }
    setShowForm(false);
    setEditing(null);
    load();
  };

  if (loading) {
    return <div className="container py-12 text-center text-muted-foreground">Carregando...</div>;
  }

  return (
    <div className="container py-8 md:py-12 max-w-3xl">
      <div className="mb-8">
        <Link to="/" className="text-sm text-muted-foreground hover:text-primary transition-smooth">
          ← Início
        </Link>
        <div className="flex items-start justify-between gap-4 mt-2 flex-wrap">
          <div>
            <h1 className="font-serif text-4xl md:text-5xl font-semibold text-primary flex items-center gap-3">
              <History className="h-8 w-8 text-accent" /> Histórico
            </h1>
            <p className="text-muted-foreground mt-1">
              Registro das suas reuniões com participantes e notas.
            </p>
          </div>
          {!showForm && (
            <Button variant="hero" onClick={startNew}>
              <Plus className="h-4 w-4" /> Registrar reunião
            </Button>
          )}
        </div>
      </div>

      {showForm && editing && (
        <Card className="p-6 mb-6 shadow-soft border-border/50 bg-card/95">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-serif text-2xl text-primary">
              {editing.id ? "Editar reunião" : "Nova reunião"}
            </h2>
            <Button variant="ghost" size="icon" onClick={() => setShowForm(false)} aria-label="Fechar">
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <Label>Data e hora</Label>
                <Input
                  type="datetime-local"
                  value={editing.held_at}
                  onChange={(e) => setEditing({ ...editing, held_at: e.target.value })}
                />
              </div>
              <div>
                <Label>Capítulo estudado</Label>
                <Select
                  value={editing.chapter_slug ?? ""}
                  onValueChange={(v) => setEditing({ ...editing, chapter_slug: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Escolha o capítulo" />
                  </SelectTrigger>
                  <SelectContent className="max-h-72">
                    {chapters.map((c) => (
                      <SelectItem key={c.slug} value={c.slug}>
                        {c.roman} — {c.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label>Título / tema (opcional)</Label>
              <Input
                placeholder="Ex.: Reunião com a família dos avós"
                value={editing.title ?? ""}
                onChange={(e) => setEditing({ ...editing, title: e.target.value })}
              />
            </div>

            <ParticipantsEditor
              value={editing.participants_list ?? []}
              onChange={(list) =>
                setEditing({
                  ...editing,
                  participants_list: list,
                  participants: list.length || 1,
                })
              }
            />

            <div>
              <Label>Notas pessoais</Label>
              <Textarea
                rows={5}
                placeholder="Trechos que tocaram, reflexões da família, pedidos para próxima reunião..."
                value={editing.notes ?? ""}
                onChange={(e) => setEditing({ ...editing, notes: e.target.value })}
              />
            </div>

            <div className="flex gap-2 pt-2 border-t border-border/30">
              <Button variant="hero" onClick={save}>
                Salvar reunião
              </Button>
              <Button variant="ghost" onClick={() => setShowForm(false)}>
                Cancelar
              </Button>
            </div>
          </div>
        </Card>
      )}

      {rows.length === 0 && !showForm ? (
        <Card className="p-8 text-center bg-card/80 border-border/50">
          <History className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <p className="font-serif text-xl text-primary">Nenhuma reunião registrada ainda.</p>
          <p className="text-sm text-muted-foreground mt-1">
            Toda reunião concluída no roteiro guiado é salva aqui automaticamente — você também pode
            registrar manualmente.
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {rows.map((r) => {
            const ch = r.chapter_slug ? chapterBySlug(r.chapter_slug) : undefined;
            return (
              <Card key={r.id} className="p-5 bg-card/90 border-border/50 shadow-soft">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs uppercase tracking-wider text-accent font-semibold">
                      {format(new Date(r.held_at), "EEEE, d 'de' MMMM 'de' yyyy 'às' HH:mm", {
                        locale: ptBR,
                      })}
                    </p>
                    <h3 className="font-serif text-xl text-primary mt-1">
                      {r.title || (ch ? ch.title : "Reunião")}
                    </h3>
                    {ch && r.title && (
                      <p className="text-xs text-muted-foreground">{ch.roman} — {ch.title}</p>
                    )}
                    <div className="flex flex-wrap gap-2 mt-2">
                      {(r.participants_list?.length ?? 0) > 0 ? (
                        r.participants_list!.map((name) => (
                          <Badge key={name} variant="outline" className="border-accent/40">
                            {name}
                          </Badge>
                        ))
                      ) : (
                        <Badge variant="outline" className="border-border/50 text-muted-foreground gap-1">
                          <Users className="h-3 w-3" /> {r.participants ?? 1}{" "}
                          {(r.participants ?? 1) === 1 ? "participante" : "participantes"}
                        </Badge>
                      )}
                    </div>
                    {r.notes && (
                      <p className="text-sm text-foreground mt-3 whitespace-pre-line border-l-2 border-accent/40 pl-3 italic">
                        {r.notes}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-col gap-1 shrink-0">
                    <Button asChild size="sm" variant="outline">
                      <Link to={`/historico/${r.id}`}>
                        <ExternalLink className="h-4 w-4" /> Detalhes
                      </Link>
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => startEdit(r)}>
                      <NotebookPen className="h-4 w-4" /> Editar
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => remove(r.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

const ParticipantsEditor = ({
  value,
  onChange,
}: {
  value: string[];
  onChange: (v: string[]) => void;
}) => {
  const [name, setName] = useState("");
  const add = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    if (value.includes(trimmed)) return;
    onChange([...value, trimmed]);
    setName("");
  };
  return (
    <div>
      <Label>Participantes</Label>
      <div className="flex gap-2 mt-1">
        <Input
          placeholder="Nome do participante"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add();
            }
          }}
        />
        <Button variant="outline" onClick={add} type="button">
          <Plus className="h-4 w-4" />
        </Button>
      </div>
      {value.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-2">
          {value.map((n) => (
            <Badge key={n} variant="outline" className="border-accent/40 gap-1 pr-1">
              {n}
              <button
                type="button"
                onClick={() => onChange(value.filter((v) => v !== n))}
                className="hover:bg-destructive/10 rounded-full p-0.5"
                aria-label={`Remover ${n}`}
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
};

export default Historico;
