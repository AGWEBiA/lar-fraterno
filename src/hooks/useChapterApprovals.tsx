import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

/**
 * Returns the set of chapter slugs approved (globally) for use.
 * Approvals are managed by the admin master and are visible to all
 * authenticated users — every user sees the same review status.
 */
export const useChapterApprovals = () => {
  const { user } = useAuth();
  const [approved, setApproved] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setApproved(new Set());
      setLoading(false);
      return;
    }
    setLoading(true);
    supabase
      .from("chapter_approvals")
      .select("chapter_slug, approved")
      .eq("approved", true)
      .then(({ data }) => {
        setApproved(new Set((data ?? []).map((r) => r.chapter_slug)));
        setLoading(false);
      });
  }, [user]);

  return {
    approved,
    isApproved: (slug: string) => approved.has(slug),
    loading,
  };
};
