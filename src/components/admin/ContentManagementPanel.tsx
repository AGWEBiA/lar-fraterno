import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, FileText, Volume2, AlertTriangle, CheckCircle2, ExternalLink, Eye } from "lucide-react";
import { Link } from "react-router-dom";
import { chapters } from "@/data/chapters";
import { auditChapter } from "@/lib/chapter-audit";
import { supabase } from "@/integrations/supabase/client";
import { voiceById } from "@/data/voices";

interface CacheRow {
  chapter_slug: string;
  voice_id: string;
  characters: number;
  public_url: string;
  created_at: string;
}

export const ContentManagementPanel = () => {
  const [filter, setFilter] = useState("");
  const [cache, setCache] = useState<CacheRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [previewSlug, setPreviewSlug] = useState<string | null>(null);

  useEffect(() => {
    supabase
      .from("audio_cache")
      .select("chapter_slug, voice_id, characters, public_url, created_at")
      .then(({ data }) => {
        setCache((data ?? []) as CacheRow[]);
        setLoading(false);
      });
  }, []);

  const cacheBySlug = useMemo(() => {
    const m = new Map<string, CacheRow[]>();
    cache.forEach((c) => {
      const arr = m.get(c.chapter_slug) ?? [];
      arr.push(c);
      m.set(c.chapter_slug, arr);
    });
    return m;
  }, [cache]);

  const rows = useMemo(() => {
    const f = filter.toLowerCase().trim();
    const list = chapters.map((c) => {
      const audit = auditChapter(c);
      const audios = cacheBySlug.get(c.slug) ?? [];
      const text = c.paragraphs.join(" ");
      return {
        chapter: c,
        audit,
        audios,
        characters: text.length,
      };
    });
    if (!f) return list;
    return list.filter(
      (r) =>
        r.chapter.slug.includes(f) ||
        r.chapter.title.toLowerCase().includes(f) ||
        r.chapter.roman.toLowerCase().includes(f),
    );
  }, [filter, cacheBySlug]);

  const totals = useMemo(
    () => ({
      chapters: chapters.length,
      characters: rows.reduce((s, r) => s + r.characters, 0),
      audios: cache.length,
      withIssues: rows.filter((r) => r.audit.hasIssues && !r.audit.allAcknowledged).length,
    }),
    [rows, cache.length],
  );

  const preview = previewSlug ? chapters.find((c) => c.slug === previewSlug) : null;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="p-3">
          <p className="text-[10px] uppercase text-muted-foreground">Capítulos</p>
          <p className="text-2xl font-semibold text-primary">{totals.chapters}</p>
        </Card>
        <Card className="p-3">
          <p className="text-[10px] uppercase text-muted-foreground">Caracteres totais</p>
          <p className="text-2xl font-semibold text-primary">{totals.characters.toLocaleString("pt-BR")}</p>
        </Card>
        <Card className="p-3">
          <p className="text-[10px] uppercase text-muted-foreground">Áudios em cache</p>
          <p className="text-2xl font-semibold text-primary">{totals.audios}</p>
        </Card>
        <Card className="p-3">
          <p className="text-[10px] uppercase text-muted-foreground">Com pendências</p>
          <p className="text-2xl font-semibold text-amber-600 dark:text-amber-400">{totals.withIssues}</p>
        </Card>
      </div>

      <Card className="p-4">
        <div className="flex items-center justify-between mb-3 gap-3 flex-wrap">
          <Input
            placeholder="Buscar por slug, título ou número romano..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="max-w-sm"
          />
          <Badge variant="secondary">{rows.length} de {chapters.length} capítulos</Badge>
        </div>

        {loading ? (
          <div className="py-12 text-center"><Loader2 className="h-5 w-5 animate-spin inline" /></div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>#</TableHead>
                <TableHead>Slug / Título</TableHead>
                <TableHead className="text-right">Caracteres</TableHead>
                <TableHead>Itens</TableHead>
                <TableHead>Áudios</TableHead>
                <TableHead>Validação</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map(({ chapter, audit, audios, characters }) => (
                <TableRow key={chapter.slug}>
                  <TableCell className="text-xs">{chapter.number}</TableCell>
                  <TableCell>
                    <div className="font-medium text-primary text-sm">{chapter.roman} — {chapter.title}</div>
                    <div className="text-[10px] text-muted-foreground font-mono">{chapter.slug}</div>
                  </TableCell>
                  <TableCell className="text-right text-xs">{characters.toLocaleString("pt-BR")}</TableCell>
                  <TableCell className="text-xs">{audit.itemCount}/{audit.expectedMax}</TableCell>
                  <TableCell>
                    {audios.length === 0 ? (
                      <Badge variant="outline" className="text-muted-foreground">—</Badge>
                    ) : (
                      <div className="flex gap-1 flex-wrap">
                        {audios.map((a) => (
                          <Badge
                            key={a.voice_id}
                            variant="outline"
                            className="border-emerald-500/40 text-emerald-700 dark:text-emerald-400 gap-1 text-[10px]"
                            title={`${a.characters.toLocaleString("pt-BR")} chars`}
                          >
                            <Volume2 className="h-3 w-3" />
                            {voiceById(a.voice_id)?.name ?? a.voice_id.slice(0, 6)}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    {!audit.hasIssues ? (
                      <Badge variant="outline" className="border-emerald-500/40 text-emerald-700 dark:text-emerald-400 gap-1">
                        <CheckCircle2 className="h-3 w-3" /> ok
                      </Badge>
                    ) : audit.allAcknowledged ? (
                      <Badge variant="outline" className="border-muted text-muted-foreground gap-1">
                        lacunas reconhecidas
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="border-amber-500/40 text-amber-700 dark:text-amber-400 gap-1">
                        <AlertTriangle className="h-3 w-3" /> {audit.issues.length}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex gap-1 justify-end">
                      <Button size="sm" variant="ghost" onClick={() => setPreviewSlug(chapter.slug)} title="Pré-visualizar texto/áudio">
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button asChild size="sm" variant="ghost" title="Abrir revisão">
                        <Link to={`/revisao/${chapter.slug}`}>
                          <FileText className="h-4 w-4" />
                        </Link>
                      </Button>
                      <Button asChild size="sm" variant="ghost" title="Abrir leitor">
                        <Link to={`/biblioteca/${chapter.slug}`}>
                          <ExternalLink className="h-4 w-4" />
                        </Link>
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        <p className="text-xs text-muted-foreground mt-3">
          Para editar texto, vá em <strong>Revisão</strong>. Slugs e ordem dos capítulos vêm do arquivo
          <code className="mx-1">evangelho-full.json</code> e são fixos por design (correspondem à edição original).
        </p>
      </Card>

      {/* Preview dialog */}
      <Dialog open={!!preview} onOpenChange={(v) => !v && setPreviewSlug(null)}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          {preview && (
            <>
              <DialogHeader>
                <DialogTitle className="font-serif text-2xl text-primary">
                  {preview.roman} — {preview.title}
                </DialogTitle>
              </DialogHeader>
              <Tabs defaultValue="text">
                <TabsList>
                  <TabsTrigger value="text">Texto</TabsTrigger>
                  <TabsTrigger value="audios">
                    Áudios ({(cacheBySlug.get(preview.slug) ?? []).length})
                  </TabsTrigger>
                  <TabsTrigger value="meta">Metadados</TabsTrigger>
                </TabsList>

                <TabsContent value="text" className="mt-3">
                  <div className="prose prose-sm max-h-96 overflow-y-auto pr-2 reading-prose">
                    {preview.summary && (
                      <p className="text-sm italic text-muted-foreground border-l-2 border-accent/40 pl-3 mb-4">
                        {preview.summary}
                      </p>
                    )}
                    {preview.paragraphs.slice(0, 30).map((p, i) => (
                      <p key={i} className="text-sm">{p}</p>
                    ))}
                    {preview.paragraphs.length > 30 && (
                      <p className="text-xs text-muted-foreground italic">
                        … +{preview.paragraphs.length - 30} parágrafos. Abra a Revisão para ver tudo.
                      </p>
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="audios" className="mt-3">
                  {(cacheBySlug.get(preview.slug) ?? []).length === 0 ? (
                    <p className="text-sm text-muted-foreground py-6 text-center">
                      Nenhum áudio gerado ainda para este capítulo.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {(cacheBySlug.get(preview.slug) ?? []).map((a) => (
                        <div key={a.voice_id} className="flex items-center gap-3 p-2 border border-border/50 rounded-md">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium">{voiceById(a.voice_id)?.name ?? a.voice_id}</p>
                            <p className="text-[10px] text-muted-foreground font-mono">{a.voice_id} • {a.characters.toLocaleString("pt-BR")} chars</p>
                          </div>
                          <audio controls src={a.public_url} preload="none" className="h-8" />
                        </div>
                      ))}
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="meta" className="mt-3 text-sm space-y-2">
                  <div><span className="text-muted-foreground">Slug:</span> <code className="font-mono">{preview.slug}</code></div>
                  <div><span className="text-muted-foreground">Número:</span> {preview.number}</div>
                  <div><span className="text-muted-foreground">Romano:</span> {preview.roman}</div>
                  <div><span className="text-muted-foreground">Itens:</span> {preview.nodes.filter((n) => n.type === "item").length}</div>
                  <div><span className="text-muted-foreground">Parágrafos:</span> {preview.paragraphs.length}</div>
                  <div><span className="text-muted-foreground">Caracteres (TTS):</span> {preview.paragraphs.join(" ").length.toLocaleString("pt-BR")}</div>
                </TabsContent>
              </Tabs>
              <DialogFooter>
                <Button asChild variant="outline">
                  <Link to={`/revisao/${preview.slug}`}>Abrir revisão</Link>
                </Button>
                <Button asChild variant="hero">
                  <Link to={`/biblioteca/${preview.slug}`}>Abrir leitor</Link>
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
