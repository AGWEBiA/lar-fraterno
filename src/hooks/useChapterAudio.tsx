// Gera/recupera o áudio HQ (ElevenLabs) de um capítulo com cache no Storage.
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Chapter } from "@/data/chapters";

export const useChapterAudio = (chapter: Chapter | null | undefined) => {
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cached, setCached] = useState<boolean>(false);

  // checa cache existente
  useEffect(() => {
    setUrl(null);
    setError(null);
    setCached(false);
    if (!chapter) return;
    supabase
      .from("audio_cache")
      .select("public_url")
      .eq("chapter_slug", chapter.slug)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.public_url) {
          setUrl(data.public_url);
          setCached(true);
        }
      });
  }, [chapter?.slug]);

  const generate = useCallback(async () => {
    if (!chapter) return;
    setLoading(true);
    setError(null);
    try {
      const text = `${chapter.title}. ${chapter.paragraphs.join(" ")}`;
      const { data, error: fnErr } = await supabase.functions.invoke("tts-chapter", {
        body: { slug: chapter.slug, text },
      });
      if (fnErr) throw fnErr;
      if (data?.error) throw new Error(data.error);
      setUrl(data.url);
      setCached(!!data.cached);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [chapter]);

  return { url, loading, error, cached, generate };
};
