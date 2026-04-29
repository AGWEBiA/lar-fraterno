import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export type AppRole = "admin_master" | "tenant_admin" | "moderator" | "user";

export const useUserRole = () => {
  const { user } = useAuth();
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setRoles([]);
      setLoading(false);
      return;
    }
    let alive = true;
    setLoading(true);
    supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .then(({ data }) => {
        if (!alive) return;
        setRoles(((data ?? []).map((r: any) => r.role)) as AppRole[]);
        setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [user]);

  const has = (r: AppRole) => roles.includes(r);
  return {
    roles,
    loading,
    isAdminMaster: has("admin_master"),
    isTenantAdmin: has("tenant_admin") || has("admin_master"),
    isModerator: has("moderator") || has("tenant_admin") || has("admin_master"),
  };
};
