-- 1. Profiles: admin master pode ver e editar todos os perfis
CREATE POLICY "Admin master can view all profiles"
ON public.profiles FOR SELECT
USING (public.is_admin_master(auth.uid()));

CREATE POLICY "Admin master can update all profiles"
ON public.profiles FOR UPDATE
USING (public.is_admin_master(auth.uid()));

-- 2. Chapter approvals: tornar global (admin master controla, todos leem)
DROP POLICY IF EXISTS "Users delete own approvals" ON public.chapter_approvals;
DROP POLICY IF EXISTS "Users insert own approvals" ON public.chapter_approvals;
DROP POLICY IF EXISTS "Users update own approvals" ON public.chapter_approvals;
DROP POLICY IF EXISTS "Users view own approvals" ON public.chapter_approvals;

CREATE POLICY "Authenticated can view approvals"
ON public.chapter_approvals FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Admin master can insert approvals"
ON public.chapter_approvals FOR INSERT
TO authenticated
WITH CHECK (public.is_admin_master(auth.uid()) AND user_id = auth.uid());

CREATE POLICY "Admin master can update approvals"
ON public.chapter_approvals FOR UPDATE
TO authenticated
USING (public.is_admin_master(auth.uid()));

CREATE POLICY "Admin master can delete approvals"
ON public.chapter_approvals FOR DELETE
TO authenticated
USING (public.is_admin_master(auth.uid()));