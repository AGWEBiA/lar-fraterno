// Gera/recupera o áudio HQ (ElevenLabs) de um capítulo com cache no Storage.
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Chapter } from "@/data/chapters";
import { DEFAULT_VOICE_ID, voiceById } from "@/data/voices";
import { notifyDesktop } from "@/lib/notifications";

export const useChapterAudio = (
  chapter: Chapter | null | undefined,
  voiceId: string = DEFAULT_VOICE_ID,
) => {
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cached, setCached] = useState<boolean>(false);

  // checa cache existente para o par (slug, voiceId)
  useEffect(() => {
    setUrl(null);
    setError(null);
    setCached(false);
    if (!chapter) return;
    supabase
      .from("audio_cache")
      .select("public_url")
      .eq("chapter_slug", chapter.slug)
      .eq("voice_id", voiceId)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.public_url) {
          setUrl(data.public_url);
          setCached(true);
        }
      });
  }, [chapter?.slug, voiceId]);

  const generate = useCallback(
    async (opts?: { force?: boolean }) => {
      if (!chapter) return;
      setLoading(true);
      setError(null);
      try {
        const text = `${chapter.title}. ${chapter.paragraphs.join(" ")}`;
        const { data, error: fnErr } = await supabase.functions.invoke("tts-chapter", {
          body: { slug: chapter.slug, text, voiceId, force: opts?.force === true },
        });
        if (fnErr) throw fnErr;
        if (data?.error) throw new Error(data.error);
        // Quebra cache do <audio> quando regerar (mesma URL pública)
        const finalUrl =
          opts?.force && data.url ? `${data.url}?v=${Date.now()}` : data.url;
        setUrl(finalUrl);
        setCached(!!data.cached);
        const voiceName = voiceById(voiceId)?.name ?? "voz padrão";
        notifyDesktop(
          opts?.force ? "Áudio HQ regerado" : "Áudio HQ pronto",
          `${chapter.title} — voz ${voiceName}. Já pode ouvir.`,
        );
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      } finally {
        setLoading(false);
      }
    },
    [chapter, voiceId],
  );

  const regenerate = useCallback(() => generate({ force: true }), [generate]);

  return { url, loading, error, cached, generate, regenerate };
};
