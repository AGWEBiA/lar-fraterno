import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface VoiceRow {
  id: string;
  voice_id: string;
  label: string;
  description: string | null;
  language: string | null;
  is_active: boolean;
}

export const useVoiceLibrary = (opts?: { activeOnly?: boolean }) => {
  const [voices, setVoices] = useState<VoiceRow[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    setLoading(true);
    let q = supabase.from("voice_library").select("*").order("label");
    if (opts?.activeOnly) q = q.eq("is_active", true);
    const { data } = await q;
    setVoices((data ?? []) as VoiceRow[]);
    setLoading(false);
  }, [opts?.activeOnly]);

  useEffect(() => {
    reload();
  }, [reload]);

  return { voices, loading, reload };
};
