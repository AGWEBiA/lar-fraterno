
-- 1) Marcadores e notas por item numerado
CREATE TABLE public.item_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  chapter_slug text NOT NULL,
  item_number integer NOT NULL,
  read boolean NOT NULL DEFAULT false,
  bookmarked boolean NOT NULL DEFAULT false,
  note text,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, chapter_slug, item_number)
);
ALTER TABLE public.item_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own item progress" ON public.item_progress FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own item progress" ON public.item_progress FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own item progress" ON public.item_progress FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users delete own item progress" ON public.item_progress FOR DELETE USING (auth.uid() = user_id);
CREATE TRIGGER item_progress_updated BEFORE UPDATE ON public.item_progress
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX idx_item_progress_user_chapter ON public.item_progress (user_id, chapter_slug);

-- 2) Plano de sessões (cada linha = uma reunião planejada com itens específicos)
CREATE TABLE public.session_plan (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  chapter_slug text NOT NULL,
  session_index integer NOT NULL,            -- 1..N dentro do capítulo
  item_numbers integer[] NOT NULL DEFAULT '{}',
  scheduled_for timestamptz,                  -- preenchido pelo modo automático
  completed boolean NOT NULL DEFAULT false,
  completed_at timestamptz,
  reading_method text NOT NULL DEFAULT 'sequential', -- 'sequential' | 'random'
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.session_plan ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own session plan" ON public.session_plan FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own session plan" ON public.session_plan FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own session plan" ON public.session_plan FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users delete own session plan" ON public.session_plan FOR DELETE USING (auth.uid() = user_id);
CREATE TRIGGER session_plan_updated BEFORE UPDATE ON public.session_plan
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX idx_session_plan_user ON public.session_plan (user_id, completed, scheduled_for);

-- 3) Modo da agenda (manual vs automático) — adicionado em notification_preferences
ALTER TABLE public.notification_preferences
  ADD COLUMN IF NOT EXISTS schedule_mode text NOT NULL DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS reading_method text NOT NULL DEFAULT 'sequential';
