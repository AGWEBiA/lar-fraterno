-- Approvals per user per chapter
CREATE TABLE public.chapter_approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  chapter_slug TEXT NOT NULL,
  approved BOOLEAN NOT NULL DEFAULT false,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, chapter_slug)
);

ALTER TABLE public.chapter_approvals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own approvals" ON public.chapter_approvals
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own approvals" ON public.chapter_approvals
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own approvals" ON public.chapter_approvals
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users delete own approvals" ON public.chapter_approvals
  FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER chapter_approvals_updated_at
  BEFORE UPDATE ON public.chapter_approvals
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Cached AI-generated meeting guides
CREATE TABLE public.meeting_guides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  chapter_slug TEXT NOT NULL,
  guide JSONB NOT NULL,
  model TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, chapter_slug)
);

ALTER TABLE public.meeting_guides ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own guides" ON public.meeting_guides
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own guides" ON public.meeting_guides
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own guides" ON public.meeting_guides
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users delete own guides" ON public.meeting_guides
  FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER meeting_guides_updated_at
  BEFORE UPDATE ON public.meeting_guides
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();