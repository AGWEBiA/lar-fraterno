-- =============================================================
-- Multi-tenant + Roles
-- =============================================================

-- Enum de papéis
DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('admin_master', 'tenant_admin', 'moderator', 'user');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- =============================================================
-- TENANTS
-- =============================================================
CREATE TABLE IF NOT EXISTS public.tenants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  owner_id uuid NOT NULL,
  description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.tenant_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  role public.app_role NOT NULL DEFAULT 'user',
  joined_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_tenant_members_user ON public.tenant_members(user_id);
CREATE INDEX IF NOT EXISTS idx_tenant_members_tenant ON public.tenant_members(tenant_id);

-- =============================================================
-- USER ROLES (papéis globais e por tenant)
-- =============================================================
CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role public.app_role NOT NULL,
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role, tenant_id)
);

CREATE INDEX IF NOT EXISTS idx_user_roles_user ON public.user_roles(user_id);

-- =============================================================
-- USER STATUS (bloqueio)
-- =============================================================
CREATE TABLE IF NOT EXISTS public.user_status (
  user_id uuid PRIMARY KEY,
  blocked boolean NOT NULL DEFAULT false,
  blocked_reason text,
  blocked_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- =============================================================
-- INVITES (código)
-- =============================================================
CREATE TABLE IF NOT EXISTS public.tenant_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  code text NOT NULL UNIQUE,
  role public.app_role NOT NULL DEFAULT 'user',
  created_by uuid NOT NULL,
  max_uses integer,
  uses integer NOT NULL DEFAULT 0,
  expires_at timestamptz,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tenant_invites_code ON public.tenant_invites(code);

-- =============================================================
-- VOICE LIBRARY (somente admin master gera; todos selecionam)
-- =============================================================
CREATE TABLE IF NOT EXISTS public.voice_library (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  voice_id text NOT NULL UNIQUE,
  label text NOT NULL,
  description text,
  language text DEFAULT 'pt-BR',
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- =============================================================
-- FUNÇÕES DE SEGURANÇA
-- =============================================================
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  );
$$;

CREATE OR REPLACE FUNCTION public.is_admin_master(_user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = 'admin_master'
  );
$$;

CREATE OR REPLACE FUNCTION public.is_tenant_member(_user_id uuid, _tenant_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.tenant_members
    WHERE user_id = _user_id AND tenant_id = _tenant_id
  );
$$;

CREATE OR REPLACE FUNCTION public.is_tenant_admin(_user_id uuid, _tenant_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.tenants t
    WHERE t.id = _tenant_id AND t.owner_id = _user_id
  ) OR EXISTS (
    SELECT 1 FROM public.tenant_members m
    WHERE m.tenant_id = _tenant_id AND m.user_id = _user_id
      AND m.role IN ('tenant_admin','admin_master')
  );
$$;

CREATE OR REPLACE FUNCTION public.generate_invite_code()
RETURNS text
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  new_code text;
  done boolean := false;
BEGIN
  WHILE NOT done LOOP
    new_code := upper(substring(md5(gen_random_uuid()::text) from 1 for 8));
    PERFORM 1 FROM public.tenant_invites WHERE code = new_code;
    IF NOT FOUND THEN done := true; END IF;
  END LOOP;
  RETURN new_code;
END;
$$;

-- Aceitar convite (atomic)
CREATE OR REPLACE FUNCTION public.accept_tenant_invite(_code text)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_invite public.tenant_invites;
  v_user uuid := auth.uid();
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;

  SELECT * INTO v_invite FROM public.tenant_invites
  WHERE code = upper(_code) AND is_active = true
  FOR UPDATE;

  IF NOT FOUND THEN RAISE EXCEPTION 'invalid_code'; END IF;
  IF v_invite.expires_at IS NOT NULL AND v_invite.expires_at < now() THEN
    RAISE EXCEPTION 'expired';
  END IF;
  IF v_invite.max_uses IS NOT NULL AND v_invite.uses >= v_invite.max_uses THEN
    RAISE EXCEPTION 'max_uses_reached';
  END IF;

  INSERT INTO public.tenant_members (tenant_id, user_id, role)
  VALUES (v_invite.tenant_id, v_user, v_invite.role)
  ON CONFLICT (tenant_id, user_id) DO NOTHING;

  UPDATE public.tenant_invites SET uses = uses + 1 WHERE id = v_invite.id;
  RETURN v_invite.tenant_id;
END;
$$;

-- =============================================================
-- TRIGGERS
-- =============================================================
-- Adicionar role 'user' e tornar dono membro automático
CREATE OR REPLACE FUNCTION public.handle_new_tenant()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.tenant_members (tenant_id, user_id, role)
  VALUES (NEW.id, NEW.owner_id, 'tenant_admin')
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_new_tenant ON public.tenants;
CREATE TRIGGER trg_new_tenant
AFTER INSERT ON public.tenants
FOR EACH ROW EXECUTE FUNCTION public.handle_new_tenant();

-- Atribuir role 'user' global a cada novo signup
CREATE OR REPLACE FUNCTION public.handle_new_user_role()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user')
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS on_auth_user_created_role ON auth.users;
CREATE TRIGGER on_auth_user_created_role
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_role();

-- updated_at
DROP TRIGGER IF EXISTS trg_tenants_updated ON public.tenants;
CREATE TRIGGER trg_tenants_updated BEFORE UPDATE ON public.tenants
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_voice_library_updated ON public.voice_library;
CREATE TRIGGER trg_voice_library_updated BEFORE UPDATE ON public.voice_library
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =============================================================
-- RLS
-- =============================================================
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.voice_library ENABLE ROW LEVEL SECURITY;

-- TENANTS
CREATE POLICY "tenants_select_member_or_admin" ON public.tenants FOR SELECT
USING (public.is_admin_master(auth.uid()) OR public.is_tenant_member(auth.uid(), id) OR owner_id = auth.uid());

CREATE POLICY "tenants_insert_authenticated" ON public.tenants FOR INSERT
WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "tenants_update_owner_or_admin" ON public.tenants FOR UPDATE
USING (public.is_admin_master(auth.uid()) OR owner_id = auth.uid());

CREATE POLICY "tenants_delete_owner_or_admin" ON public.tenants FOR DELETE
USING (public.is_admin_master(auth.uid()) OR owner_id = auth.uid());

-- TENANT MEMBERS
CREATE POLICY "members_select" ON public.tenant_members FOR SELECT
USING (
  public.is_admin_master(auth.uid())
  OR user_id = auth.uid()
  OR public.is_tenant_member(auth.uid(), tenant_id)
);

CREATE POLICY "members_insert_admin_or_self" ON public.tenant_members FOR INSERT
WITH CHECK (
  public.is_admin_master(auth.uid())
  OR public.is_tenant_admin(auth.uid(), tenant_id)
);

CREATE POLICY "members_update_admin" ON public.tenant_members FOR UPDATE
USING (public.is_admin_master(auth.uid()) OR public.is_tenant_admin(auth.uid(), tenant_id));

CREATE POLICY "members_delete_admin_or_self" ON public.tenant_members FOR DELETE
USING (
  public.is_admin_master(auth.uid())
  OR public.is_tenant_admin(auth.uid(), tenant_id)
  OR user_id = auth.uid()
);

-- USER ROLES
CREATE POLICY "roles_select_self_or_admin" ON public.user_roles FOR SELECT
USING (user_id = auth.uid() OR public.is_admin_master(auth.uid()));

CREATE POLICY "roles_insert_admin" ON public.user_roles FOR INSERT
WITH CHECK (public.is_admin_master(auth.uid()));

CREATE POLICY "roles_update_admin" ON public.user_roles FOR UPDATE
USING (public.is_admin_master(auth.uid()));

CREATE POLICY "roles_delete_admin" ON public.user_roles FOR DELETE
USING (public.is_admin_master(auth.uid()));

-- USER STATUS
CREATE POLICY "status_select_self_or_admin" ON public.user_status FOR SELECT
USING (user_id = auth.uid() OR public.is_admin_master(auth.uid()));

CREATE POLICY "status_modify_admin" ON public.user_status FOR ALL
USING (public.is_admin_master(auth.uid()))
WITH CHECK (public.is_admin_master(auth.uid()));

-- INVITES
CREATE POLICY "invites_select_admin_or_tenant_admin" ON public.tenant_invites FOR SELECT
USING (public.is_admin_master(auth.uid()) OR public.is_tenant_admin(auth.uid(), tenant_id));

CREATE POLICY "invites_insert_tenant_admin" ON public.tenant_invites FOR INSERT
WITH CHECK (
  (public.is_admin_master(auth.uid()) OR public.is_tenant_admin(auth.uid(), tenant_id))
  AND created_by = auth.uid()
);

CREATE POLICY "invites_update_tenant_admin" ON public.tenant_invites FOR UPDATE
USING (public.is_admin_master(auth.uid()) OR public.is_tenant_admin(auth.uid(), tenant_id));

CREATE POLICY "invites_delete_tenant_admin" ON public.tenant_invites FOR DELETE
USING (public.is_admin_master(auth.uid()) OR public.is_tenant_admin(auth.uid(), tenant_id));

-- VOICE LIBRARY
CREATE POLICY "voices_select_active_or_admin" ON public.voice_library FOR SELECT
USING (is_active = true OR public.is_admin_master(auth.uid()));

CREATE POLICY "voices_insert_admin" ON public.voice_library FOR INSERT
WITH CHECK (public.is_admin_master(auth.uid()));

CREATE POLICY "voices_update_admin" ON public.voice_library FOR UPDATE
USING (public.is_admin_master(auth.uid()));

CREATE POLICY "voices_delete_admin" ON public.voice_library FOR DELETE
USING (public.is_admin_master(auth.uid()));

-- Seed inicial de vozes (do arquivo src/data/voices.ts)
INSERT INTO public.voice_library (voice_id, label, description, language, is_active) VALUES
  ('FGY2WhTYpPnrIDTdsKH5', 'Laura', 'Voz feminina serena e clara', 'pt-BR', true),
  ('XrExE9yKIg1WjnnlVkGX', 'Matilda', 'Voz feminina suave e expressiva', 'pt-BR', true),
  ('JBFqnCBsd6RMkjVDRZzb', 'George', 'Voz masculina profunda e serena', 'pt-BR', true),
  ('onwK4e9ZLuTAKqWW03F9', 'Daniel', 'Voz masculina narrador clássico', 'pt-BR', true)
ON CONFLICT (voice_id) DO NOTHING;