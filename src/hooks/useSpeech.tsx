import { useCallback, useEffect, useRef, useState } from "react";

interface TTSOptions {
  rate?: number;
  pitch?: number;
  voiceURI?: string;
}

export const useSpeech = () => {
  const [supported, setSupported] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [paused, setPaused] = useState(false);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const utterRef = useRef<SpeechSynthesisUtterance | null>(null);

  useEffect(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    setSupported(true);

    const loadVoices = () => {
      const all = window.speechSynthesis.getVoices();
      setVoices(all.filter((v) => v.lang.toLowerCase().startsWith("pt")));
    };
    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;

    return () => {
      window.speechSynthesis.cancel();
    };
  }, []);

  const chunkText = (text: string, max = 220): string[] => {
    // Split on sentence boundaries, then re-pack into chunks <= max chars.
    const sentences = text.replace(/\s+/g, " ").match(/[^.!?]+[.!?]+|\S+$/g) ?? [text];
    const chunks: string[] = [];
    let buf = "";
    for (const s of sentences) {
      const seg = s.trim();
      if (!seg) continue;
      if ((buf + " " + seg).trim().length > max && buf) {
        chunks.push(buf.trim());
        buf = seg;
      } else {
        buf = (buf + " " + seg).trim();
      }
    }
    if (buf) chunks.push(buf.trim());
    return chunks;
  };

  const speak = useCallback(
    (text: string, opts: TTSOptions = {}) => {
      if (!supported) return;
      window.speechSynthesis.cancel();
      const voice =
        (opts.voiceURI && voices.find((v) => v.voiceURI === opts.voiceURI)) ||
        voices.find((v) => v.lang === "pt-BR") ||
        voices[0];
      const chunks = chunkText(text);
      let idx = 0;
      const speakNext = () => {
        if (idx >= chunks.length) {
          setSpeaking(false);
          setPaused(false);
          return;
        }
        const u = new SpeechSynthesisUtterance(chunks[idx++]);
        u.lang = "pt-BR";
        u.rate = opts.rate ?? 0.95;
        u.pitch = opts.pitch ?? 1;
        if (voice) u.voice = voice;
        u.onstart = () => { setSpeaking(true); setPaused(false); };
        u.onend = () => speakNext();
        u.onerror = () => speakNext();
        utterRef.current = u;
        window.speechSynthesis.speak(u);
      };
      speakNext();
    },
    [supported, voices]
  );

  const pause = useCallback(() => {
    if (!supported) return;
    window.speechSynthesis.pause();
    setPaused(true);
  }, [supported]);

  const resume = useCallback(() => {
    if (!supported) return;
    window.speechSynthesis.resume();
    setPaused(false);
  }, [supported]);

  const stop = useCallback(() => {
    if (!supported) return;
    window.speechSynthesis.cancel();
    setSpeaking(false);
    setPaused(false);
  }, [supported]);

  return { supported, speaking, paused, voices, speak, pause, resume, stop };
};
