-- =========================================================
-- 1) AUDITORIA DE JOBS TRAVADOS / RECUPERAÇÃO
-- =========================================================
-- Tabela de auditoria de tentativas (toda ação de reprocessar/encerrar fica registrada)
CREATE TABLE IF NOT EXISTS public.audio_job_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL,
  action text NOT NULL CHECK (action IN ('mark_failed','retry','cancel','split_resume','complete_from_checkpoint')),
  performed_by uuid NOT NULL,
  notes text,
  details jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.audio_job_audit ENABLE ROW LEVEL SECURITY;
CREATE POLICY "audit_select_admin" ON public.audio_job_audit
  FOR SELECT USING (public.is_admin_master(auth.uid()));
CREATE POLICY "audit_insert_admin" ON public.audio_job_audit
  FOR INSERT WITH CHECK (public.is_admin_master(auth.uid()) AND performed_by = auth.uid());

-- =========================================================
-- 2) CHECKPOINTS (sub-lotes salvos parcialmente no Storage)
-- =========================================================
CREATE TABLE IF NOT EXISTS public.audio_chunk_checkpoints (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chapter_slug text NOT NULL,
  voice_id text NOT NULL,
  chunk_index integer NOT NULL,
  total_chunks integer NOT NULL,
  characters integer NOT NULL DEFAULT 0,
  storage_path text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (chapter_slug, voice_id, chunk_index)
);
ALTER TABLE public.audio_chunk_checkpoints ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ckpt_select_admin" ON public.audio_chunk_checkpoints
  FOR SELECT USING (public.is_admin_master(auth.uid()));

-- =========================================================
-- 3) BATCH RUNS (rodadas de geração em lote — total de tokens por rodada)
-- =========================================================
CREATE TABLE IF NOT EXISTS public.audio_batch_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  triggered_by uuid NOT NULL,
  voice_id text NOT NULL,
  voice_label text,
  max_chars_per_chapter integer NOT NULL DEFAULT 25000,
  chapter_slugs text[] NOT NULL DEFAULT '{}',
  total_characters integer NOT NULL DEFAULT 0,
  succeeded integer NOT NULL DEFAULT 0,
  failed integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'running' CHECK (status IN ('running','done','partial','aborted')),
  notes text,
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz
);
ALTER TABLE public.audio_batch_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "batch_select_admin" ON public.audio_batch_runs
  FOR SELECT USING (public.is_admin_master(auth.uid()));
CREATE POLICY "batch_insert_admin" ON public.audio_batch_runs
  FOR INSERT WITH CHECK (public.is_admin_master(auth.uid()) AND triggered_by = auth.uid());
CREATE POLICY "batch_update_admin" ON public.audio_batch_runs
  FOR UPDATE USING (public.is_admin_master(auth.uid()));

-- =========================================================
-- 4) ADMIN SETTINGS (margem de segurança, preço por crédito etc.)
-- =========================================================
CREATE TABLE IF NOT EXISTS public.admin_settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid
);
ALTER TABLE public.admin_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "settings_select_admin" ON public.admin_settings
  FOR SELECT USING (public.is_admin_master(auth.uid()));
CREATE POLICY "settings_upsert_admin" ON public.admin_settings
  FOR ALL USING (public.is_admin_master(auth.uid()))
  WITH CHECK (public.is_admin_master(auth.uid()));

INSERT INTO public.admin_settings (key, value) VALUES
  ('credit_planning', '{"safety_margin_pct": 20, "monthly_quota": 100000, "plan_label": "Creator $22"}'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- =========================================================
-- 5) MEETING AUDIO LINK (relatório por reunião — quais áudios foram tocados)
-- =========================================================
CREATE TABLE IF NOT EXISTS public.meeting_audio_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id uuid NOT NULL,
  user_id uuid NOT NULL,
  chapter_slug text NOT NULL,
  voice_id text,
  audio_status text NOT NULL DEFAULT 'played' CHECK (audio_status IN ('played','missing','failed','in_progress')),
  job_id uuid,
  characters integer DEFAULT 0,
  duration_ms integer,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.meeting_audio_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "mal_select_own_or_admin" ON public.meeting_audio_log
  FOR SELECT USING (user_id = auth.uid() OR public.is_admin_master(auth.uid()));
CREATE POLICY "mal_insert_own" ON public.meeting_audio_log
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- =========================================================
-- 6) Helper: cancelar/encerrar job travado com auditoria
-- =========================================================
CREATE OR REPLACE FUNCTION public.admin_close_stuck_job(_job_id uuid, _reason text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin_master(auth.uid()) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  UPDATE public.audio_generation_jobs
    SET status = 'failed',
        error_message = COALESCE(error_message, _reason),
        finished_at = COALESCE(finished_at, now()),
        duration_ms = COALESCE(duration_ms, EXTRACT(EPOCH FROM (now() - created_at))::int * 1000)
   WHERE id = _job_id;
  INSERT INTO public.audio_job_audit(job_id, action, performed_by, notes)
    VALUES (_job_id, 'mark_failed', auth.uid(), _reason);
END;
$$;

-- =========================================================
-- 7) Soft-delete user (forçar logout / excluir)
-- =========================================================
-- Função para revogar todas as sessões de um usuário (for_update no profiles)
CREATE OR REPLACE FUNCTION public.admin_revoke_sessions(_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin_master(auth.uid()) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  -- Marca timestamp em user_status (frontend pode forçar reload)
  INSERT INTO public.user_status(user_id, blocked, blocked_at, blocked_reason, updated_at)
    VALUES (_user_id, false, NULL, 'session_revoked', now())
    ON CONFLICT (user_id) DO UPDATE SET updated_at = now();
END;
$$;

-- Indexes úteis para os novos relatórios
CREATE INDEX IF NOT EXISTS idx_jobs_status ON public.audio_generation_jobs(status);
CREATE INDEX IF NOT EXISTS idx_jobs_voice ON public.audio_generation_jobs(voice_id);
CREATE INDEX IF NOT EXISTS idx_tvs_tenant ON public.tenant_voice_selections(tenant_id);
CREATE INDEX IF NOT EXISTS idx_mal_meeting ON public.meeting_audio_log(meeting_id);

-- user_status precisa de UNIQUE em user_id (verificar)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE schemaname='public' AND tablename='user_status' AND indexname='user_status_user_id_key'
  ) THEN
    BEGIN
      ALTER TABLE public.user_status ADD CONSTRAINT user_status_user_id_key UNIQUE (user_id);
    EXCEPTION WHEN duplicate_table OR duplicate_object THEN NULL;
    END;
  END IF;
END $$;