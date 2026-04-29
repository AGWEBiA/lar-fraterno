REVOKE EXECUTE ON FUNCTION public.admin_close_stuck_job(uuid, text) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.admin_close_stuck_job(uuid, text) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.admin_revoke_sessions(uuid) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.admin_revoke_sessions(uuid) TO authenticated;