import { useMemo, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Plus, Save, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { useChapterEdits } from "@/hooks/useChapterOverrides";
import { chapterBySlug } from "@/data/chapters";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type NodeType = "item" | "heading" | "paragraph";

const RevisaoCapitulo = () => {
  const { slug = "" } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const original = chapterBySlug(slug);
  const { chapter, rawOverrides, rawInserts, rawRemovals, loading, reload } = useChapterEdits(slug);

  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  const [insertAfter, setInsertAfter] = useState<number | null>(null);
  const [draftType, setDraftType] = useState<NodeType>("item");
  const [draftNumber, setDraftNumber] = useState<string>("");
  const [draftHeading, setDraftHeading] = useState("");
  const [draftText, setDraftText] = useState("");

  const overrideMap = useMemo(
    () => new Map(rawOverrides.map((o) => [o.node_index, o])),
    [rawOverrides],
  );
  const insertsByAfter = useMemo(() => {
    const m = new Map<number, typeof rawInserts>();
    for (const ins of rawInserts) {
      const arr = m.get(ins.after_node_index) ?? [];
      arr.push(ins);
      m.set(ins.after_node_index, arr);
    }
    for (const arr of m.values()) arr.sort((a, b) => a.position - b.position);
    return m;
  }, [rawInserts]);
  const removed = useMemo(() => new Set(rawRemovals.map((r) => r.node_index)), [rawRemovals]);

  if (!original || !chapter) {
    return (
      <div className="container py-12 text-center">
        <p className="text-muted-foreground">Capítulo não encontrado.</p>
        <Button asChild variant="link"><Link to="/revisao">Voltar</Link></Button>
      </div>
    );
  }
  if (!user) {
    return (
      <div className="container py-12 text-center">
        <p className="text-muted-foreground">Entre na sua conta para editar.</p>
        <Button asChild variant="hero" className="mt-4"><Link to="/auth">Entrar</Link></Button>
      </div>
    );
  }

  const startEdit = (idx: number) => {
    const node = original.nodes[idx];
    const ov = overrideMap.get(idx);
    setEditingIdx(idx);
    setInsertAfter(null);
    if (node.type === "item") {
      setDraftType("item");
      setDraftNumber(String(ov?.item_number ?? node.n));
      setDraftText((ov?.paragraphs ?? node.paragraphs).join("\n\n"));
      setDraftHeading("");
    } else if (node.type === "heading") {
      setDraftType("heading");
      setDraftHeading(ov?.heading_text ?? node.text);
      setDraftNumber("");
      setDraftText("");
    } else {
      setDraftType("paragraph");
      setDraftText(ov?.paragraph_text ?? node.text);
      setDraftNumber("");
      setDraftHeading("");
    }
  };

  const startInsert = (afterIdx: number) => {
    setInsertAfter(afterIdx);
    setEditingIdx(null);
    setDraftType("item");
    setDraftNumber("");
    setDraftHeading("");
    setDraftText("");
  };

  const closeDraft = () => {
    setEditingIdx(null);
    setInsertAfter(null);
  };

  const saveOverride = async () => {
    if (editingIdx === null) return;
    const node = original.nodes[editingIdx];
    const payload: any = {
      user_id: user.id,
      chapter_slug: slug,
      node_index: editingIdx,
      override_type: node.type,
    };
    if (node.type === "item") {
      payload.item_number = Number(draftNumber) || node.n;
      payload.paragraphs = draftText.split(/\n{2,}/).map((s) => s.trim()).filter(Boolean);
    } else if (node.type === "heading") {
      payload.heading_text = draftHeading.trim();
    } else {
      payload.paragraph_text = draftText.trim();
    }
    const { error } = await supabase
      .from("chapter_item_overrides")
      .upsert(payload, { onConflict: "user_id,chapter_slug,node_index" });
    if (error) return toast.error(error.message);
    toast.success("Edição salva.");
    closeDraft();
    reload();
  };

  const removeOverride = async (idx: number) => {
    await supabase
      .from("chapter_item_overrides")
      .delete()
      .eq("user_id", user.id)
      .eq("chapter_slug", slug)
      .eq("node_index", idx);
    toast.success("Edição revertida.");
    reload();
  };

  const removeNode = async (idx: number) => {
    if (!confirm("Remover este item do capítulo? Você poderá restaurar depois.")) return;
    await supabase
      .from("chapter_node_removals")
      .upsert(
        { user_id: user.id, chapter_slug: slug, node_index: idx },
        { onConflict: "user_id,chapter_slug,node_index" },
      );
    toast.success("Item removido.");
    reload();
  };

  const restoreNode = async (idx: number) => {
    await supabase
      .from("chapter_node_removals")
      .delete()
      .eq("user_id", user.id)
      .eq("chapter_slug", slug)
      .eq("node_index", idx);
    reload();
  };

  const saveInsert = async () => {
    if (insertAfter === null) return;
    const existing = insertsByAfter.get(insertAfter) ?? [];
    const position = existing.length;
    const payload: any = {
      user_id: user.id,
      chapter_slug: slug,
      after_node_index: insertAfter,
      position,
      node_type: draftType,
    };
    if (draftType === "item") {
      payload.item_number = Number(draftNumber) || null;
      payload.paragraphs = draftText.split(/\n{2,}/).map((s) => s.trim()).filter(Boolean);
    } else if (draftType === "heading") {
      payload.heading_text = draftHeading.trim();
    } else {
      payload.paragraph_text = draftText.trim();
    }
    const { error } = await supabase.from("chapter_node_inserts").insert(payload);
    if (error) return toast.error(error.message);
    toast.success("Inserido.");
    closeDraft();
    reload();
  };

  const removeInsert = async (id: string) => {
    await supabase.from("chapter_node_inserts").delete().eq("id", id);
    reload();
  };

  const renderDraft = () => (
    <Card className="p-4 bg-accent-soft/40 border-accent/40 my-2">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs uppercase tracking-wider text-accent font-semibold">
          {editingIdx !== null ? "Editar item" : "Inserir novo item"}
        </p>
        <Button size="icon" variant="ghost" onClick={closeDraft}>
          <X className="h-4 w-4" />
        </Button>
      </div>
      {insertAfter !== null && (
        <div className="mb-3">
          <Label>Tipo</Label>
          <Select value={draftType} onValueChange={(v) => setDraftType(v as NodeType)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="item">Item numerado</SelectItem>
              <SelectItem value="heading">Subtítulo</SelectItem>
              <SelectItem value="paragraph">Parágrafo livre</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}
      {draftType === "item" && (
        <div className="grid sm:grid-cols-[100px_1fr] gap-3 mb-3">
          <div>
            <Label>Número</Label>
            <Input value={draftNumber} onChange={(e) => setDraftNumber(e.target.value)} />
          </div>
          <div>
            <Label>Texto (separe parágrafos com linha em branco)</Label>
            <Textarea
              rows={6}
              value={draftText}
              onChange={(e) => setDraftText(e.target.value)}
            />
          </div>
        </div>
      )}
      {draftType === "heading" && (
        <div className="mb-3">
          <Label>Título</Label>
          <Input value={draftHeading} onChange={(e) => setDraftHeading(e.target.value)} />
        </div>
      )}
      {draftType === "paragraph" && (
        <div className="mb-3">
          <Label>Texto</Label>
          <Textarea rows={4} value={draftText} onChange={(e) => setDraftText(e.target.value)} />
        </div>
      )}
      <div className="flex gap-2">
        <Button size="sm" variant="hero" onClick={editingIdx !== null ? saveOverride : saveInsert}>
          <Save className="h-4 w-4" /> Salvar
        </Button>
        <Button size="sm" variant="ghost" onClick={closeDraft}>
          Cancelar
        </Button>
      </div>
    </Card>
  );

  return (
    <div className="container py-8 md:py-12 max-w-4xl">
      <div className="mb-6">
        <Button asChild variant="ghost" size="sm">
          <Link to="/revisao"><ArrowLeft className="h-4 w-4" /> Voltar à revisão</Link>
        </Button>
        <h1 className="font-serif text-3xl md:text-4xl font-semibold text-primary mt-3">
          {original.roman} — {original.title}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Edite, divida ou remova itens. Mudanças são salvas por usuário e usadas na leitura e no áudio.
        </p>
      </div>

      {loading ? (
        <p className="text-muted-foreground text-center py-8">Carregando...</p>
      ) : (
        <div className="space-y-1">
          {/* Insert before everything */}
          {insertAfter === -1 ? (
            renderDraft()
          ) : (
            <div className="flex justify-center my-2">
              <Button variant="ghost" size="sm" onClick={() => startInsert(-1)}>
                <Plus className="h-3 w-3" /> Inserir no início
              </Button>
            </div>
          )}

          {(insertsByAfter.get(-1) ?? []).map((ins) => (
            <InsertedRow key={ins.id} ins={ins} onRemove={() => removeInsert(ins.id)} />
          ))}

          {original.nodes.map((node, idx) => {
            const ov = overrideMap.get(idx);
            const isRemoved = removed.has(idx);
            const isEditing = editingIdx === idx;

            return (
              <div key={idx}>
                {isEditing ? (
                  renderDraft()
                ) : (
                  <Card
                    className={`p-4 border-border/50 transition-smooth ${
                      isRemoved ? "opacity-50 bg-muted/30" : "bg-card/80"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <Badge variant="outline" className="text-[10px]">
                            #{idx} · {node.type}
                          </Badge>
                          {ov && (
                            <Badge className="bg-amber-500/20 text-amber-700 dark:text-amber-400 border-amber-500/40 text-[10px]">
                              editado
                            </Badge>
                          )}
                          {isRemoved && (
                            <Badge className="bg-destructive/20 text-destructive border-destructive/40 text-[10px]">
                              removido
                            </Badge>
                          )}
                        </div>
                        {node.type === "item" && (
                          <div>
                            <p className="font-serif text-primary font-semibold text-sm">
                              {ov?.item_number ?? node.n}.
                            </p>
                            {(ov?.paragraphs ?? node.paragraphs).map((p, i) => (
                              <p key={i} className="text-sm text-foreground mt-1">{p}</p>
                            ))}
                          </div>
                        )}
                        {node.type === "heading" && (
                          <p className="font-serif text-lg text-primary font-semibold">
                            {ov?.heading_text ?? node.text}
                          </p>
                        )}
                        {node.type === "paragraph" && (
                          <p className="text-sm text-foreground italic">
                            {ov?.paragraph_text ?? node.text}
                          </p>
                        )}
                      </div>
                      <div className="flex flex-col gap-1 shrink-0">
                        {isRemoved ? (
                          <Button size="sm" variant="ghost" onClick={() => restoreNode(idx)}>
                            Restaurar
                          </Button>
                        ) : (
                          <>
                            <Button size="sm" variant="ghost" onClick={() => startEdit(idx)}>
                              Editar
                            </Button>
                            {ov && (
                              <Button size="sm" variant="ghost" onClick={() => removeOverride(idx)}>
                                Reverter
                              </Button>
                            )}
                            <Button size="sm" variant="ghost" onClick={() => removeNode(idx)}>
                              <Trash2 className="h-3 w-3 text-destructive" />
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  </Card>
                )}

                {(insertsByAfter.get(idx) ?? []).map((ins) => (
                  <InsertedRow key={ins.id} ins={ins} onRemove={() => removeInsert(ins.id)} />
                ))}

                {insertAfter === idx ? (
                  renderDraft()
                ) : (
                  <div className="flex justify-center my-1">
                    <Button variant="ghost" size="sm" onClick={() => startInsert(idx)}>
                      <Plus className="h-3 w-3" /> Inserir abaixo
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <div className="mt-8 pt-6 border-t border-border/50 flex flex-wrap gap-2">
        <Button variant="outline" onClick={() => navigate(`/biblioteca/${slug}`)}>
          Visualizar resultado final
        </Button>
        <Button variant="ghost" onClick={() => navigate("/revisao")}>
          Concluir
        </Button>
      </div>
    </div>
  );
};

const InsertedRow = ({
  ins,
  onRemove,
}: {
  ins: {
    id: string;
    node_type: string;
    item_number: number | null;
    heading_text: string | null;
    paragraphs: string[] | null;
    paragraph_text: string | null;
  };
  onRemove: () => void;
}) => (
  <Card className="p-4 my-1 border-accent/40 bg-accent-soft/20">
    <div className="flex items-start justify-between gap-3">
      <div className="flex-1 min-w-0">
        <Badge className="bg-accent/20 text-accent border-accent/40 text-[10px] mb-2">
          inserido · {ins.node_type}
        </Badge>
        {ins.node_type === "item" && (
          <div>
            <p className="font-serif text-primary font-semibold text-sm">{ins.item_number ?? "?"}.</p>
            {(ins.paragraphs ?? []).map((p, i) => (
              <p key={i} className="text-sm text-foreground mt-1">{p}</p>
            ))}
          </div>
        )}
        {ins.node_type === "heading" && (
          <p className="font-serif text-lg text-primary font-semibold">{ins.heading_text}</p>
        )}
        {ins.node_type === "paragraph" && (
          <p className="text-sm text-foreground italic">{ins.paragraph_text}</p>
        )}
      </div>
      <Button size="sm" variant="ghost" onClick={onRemove}>
        <Trash2 className="h-3 w-3 text-destructive" />
      </Button>
    </div>
  </Card>
);

export default RevisaoCapitulo;
