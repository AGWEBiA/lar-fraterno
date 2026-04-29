-- Bucket público para áudios pré-gerados
INSERT INTO storage.buckets (id, name, public)
VALUES ('audio-cache', 'audio-cache', true)
ON CONFLICT (id) DO NOTHING;

-- Leitura pública dos áudios
CREATE POLICY "Public read audio-cache"
ON storage.objects FOR SELECT
USING (bucket_id = 'audio-cache');

-- Tabela de metadados (qualquer um pode ler; só edge function escreve via service role)
CREATE TABLE public.audio_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chapter_slug text NOT NULL,
  voice_id text NOT NULL,
  storage_path text NOT NULL,
  public_url text NOT NULL,
  characters int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (chapter_slug, voice_id)
);

ALTER TABLE public.audio_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read audio_cache"
ON public.audio_cache FOR SELECT
USING (true);
