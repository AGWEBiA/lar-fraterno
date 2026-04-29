// Vozes ElevenLabs disponíveis para o áudio HQ.
// Multilingual v2 funciona bem em PT-BR com qualquer voz da lista.
export interface VoiceOption {
  id: string;
  name: string;
  description: string;
  gender: "F" | "M";
}

export const VOICES: VoiceOption[] = [
  { id: "EXAVITQu4vr4xnSDxMaL", name: "Sarah", description: "Feminina, suave e acolhedora", gender: "F" },
  { id: "FGY2WhTYpPnrIDTdsKH5", name: "Laura", description: "Feminina, expressiva e calorosa", gender: "F" },
  { id: "XrExE9yKIg1WjnnlVkGX", name: "Matilda", description: "Feminina, clara e serena", gender: "F" },
  { id: "Xb7hH8MSUJpSbSDYk0k2", name: "Alice", description: "Feminina, jovem e leve", gender: "F" },
  { id: "pFZP5JQG7iQjIQuC4Bku", name: "Lily", description: "Feminina, doce e tranquila", gender: "F" },
  { id: "JBFqnCBsd6RMkjVDRZzb", name: "George", description: "Masculina, grave e pausada", gender: "M" },
  { id: "onwK4e9ZLuTAKqWW03F9", name: "Daniel", description: "Masculina, séria e narrativa", gender: "M" },
  { id: "nPczCjzI2devNBz1zQrb", name: "Brian", description: "Masculina, calma e profunda", gender: "M" },
  { id: "CwhRBWXzGAHq8TQ4Fs17", name: "Roger", description: "Masculina, firme e clara", gender: "M" },
  { id: "iP95p4xoKVk53GoZ742B", name: "Chris", description: "Masculina, natural e amigável", gender: "M" },
];

export const DEFAULT_VOICE_ID = "EXAVITQu4vr4xnSDxMaL";

export const voiceById = (id: string): VoiceOption | undefined =>
  VOICES.find((v) => v.id === id);
