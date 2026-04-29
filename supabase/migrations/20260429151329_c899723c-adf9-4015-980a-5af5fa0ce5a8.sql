-- 1) tenant_schedules
CREATE TABLE public.tenant_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  title text NOT NULL DEFAULT 'Evangelho no Lar',
  day_of_week smallint NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  time_of_day time NOT NULL,
  timezone text NOT NULL DEFAULT 'America/Sao_Paulo',
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_tenant_schedules_tenant ON public.tenant_schedules(tenant_id);
ALTER TABLE public.tenant_schedules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ts_select_members" ON public.tenant_schedules FOR SELECT
  USING (public.is_admin_master(auth.uid()) OR public.is_tenant_member(auth.uid(), tenant_id));
CREATE POLICY "ts_insert_admin" ON public.tenant_schedules FOR INSERT
  WITH CHECK (public.is_admin_master(auth.uid()) OR public.is_tenant_admin(auth.uid(), tenant_id));
CREATE POLICY "ts_update_admin" ON public.tenant_schedules FOR UPDATE
  USING (public.is_admin_master(auth.uid()) OR public.is_tenant_admin(auth.uid(), tenant_id));
CREATE POLICY "ts_delete_admin" ON public.tenant_schedules FOR DELETE
  USING (public.is_admin_master(auth.uid()) OR public.is_tenant_admin(auth.uid(), tenant_id));

CREATE TRIGGER set_updated_at_tenant_schedules BEFORE UPDATE ON public.tenant_schedules
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 2) audio_generation_jobs
CREATE TABLE public.audio_generation_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  chapter_slug text NOT NULL,
  voice_id text NOT NULL,
  voice_label text,
  status text NOT NULL DEFAULT 'pending', -- pending | running | success | failed | cached
  characters integer NOT NULL DEFAULT 0,
  duration_ms integer,
  error_message text,
  forced boolean NOT NULL DEFAULT false,
  batch_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz
);
CREATE INDEX idx_jobs_created_at ON public.audio_generation_jobs(created_at DESC);
CREATE INDEX idx_jobs_status ON public.audio_generation_jobs(status);
ALTER TABLE public.audio_generation_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "jobs_select_admin" ON public.audio_generation_jobs FOR SELECT
  USING (public.is_admin_master(auth.uid()));
-- escritas só pela edge function (service role bypassa RLS)

-- 3) tenant_active_voice (uma voz ativa por tenant)
CREATE TABLE public.tenant_active_voice (
  tenant_id uuid PRIMARY KEY REFERENCES public.tenants(id) ON DELETE CASCADE,
  voice_id text NOT NULL,
  selected_by uuid NOT NULL,
  selected_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.tenant_active_voice ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tav_select_members" ON public.tenant_active_voice FOR SELECT
  USING (public.is_admin_master(auth.uid()) OR public.is_tenant_member(auth.uid(), tenant_id));
CREATE POLICY "tav_upsert_admin" ON public.tenant_active_voice FOR INSERT
  WITH CHECK (public.is_admin_master(auth.uid()) OR public.is_tenant_admin(auth.uid(), tenant_id));
CREATE POLICY "tav_update_admin" ON public.tenant_active_voice FOR UPDATE
  USING (public.is_admin_master(auth.uid()) OR public.is_tenant_admin(auth.uid(), tenant_id));

-- 4) tenant_voice_selections (log histórico)
CREATE TABLE public.tenant_voice_selections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  voice_id text NOT NULL,
  voice_label text,
  selected_by uuid NOT NULL,
  selected_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_tvs_tenant ON public.tenant_voice_selections(tenant_id, selected_at DESC);
ALTER TABLE public.tenant_voice_selections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tvs_select_members" ON public.tenant_voice_selections FOR SELECT
  USING (public.is_admin_master(auth.uid()) OR public.is_tenant_member(auth.uid(), tenant_id));
CREATE POLICY "tvs_insert_admin" ON public.tenant_voice_selections FOR INSERT
  WITH CHECK ((public.is_admin_master(auth.uid()) OR public.is_tenant_admin(auth.uid(), tenant_id)) AND selected_by = auth.uid());

-- 5) app_notifications (in-app)
CREATE TABLE public.app_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  kind text NOT NULL, -- batch_started | batch_finished | batch_failed | generic
  title text NOT NULL,
  body text,
  data jsonb,
  read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_notif_user ON public.app_notifications(user_id, created_at DESC);
ALTER TABLE public.app_notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "notif_select_own" ON public.app_notifications FOR SELECT
  USING (user_id = auth.uid());
CREATE POLICY "notif_update_own" ON public.app_notifications FOR UPDATE
  USING (user_id = auth.uid());
-- inserts vêm da edge function (service role)
