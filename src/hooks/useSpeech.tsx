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

  const speak = useCallback(
    (text: string, opts: TTSOptions = {}) => {
      if (!supported) return;
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = "pt-BR";
      u.rate = opts.rate ?? 0.95;
      u.pitch = opts.pitch ?? 1;
      const voice =
        (opts.voiceURI && voices.find((v) => v.voiceURI === opts.voiceURI)) ||
        voices.find((v) => v.lang === "pt-BR") ||
        voices[0];
      if (voice) u.voice = voice;
      u.onstart = () => { setSpeaking(true); setPaused(false); };
      u.onend = () => { setSpeaking(false); setPaused(false); };
      u.onerror = () => { setSpeaking(false); setPaused(false); };
      utterRef.current = u;
      window.speechSynthesis.speak(u);
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
