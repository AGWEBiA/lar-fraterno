// Processa um LOTE de capítulos (síncrono, ≤3 por rodada para evitar timeout 150s)
// Apenas admin_master. Cada capítulo passa pelo tts-chapter; este endpoint só orquestra
// o batch_run e devolve o progresso.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface BatchBody {
  chapters: Array<{ slug: string; text: string; characters: number }>;
  voiceId: string;
  voiceLabel?: string;
  maxCharsPerChapter?: number;
  force?: boolean;
}

const supabaseAdmin = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    // Auth
    const authHeader = req.headers.get("Authorization") ?? "";
    const jwt = authHeader.replace("Bearer ", "");
    if (!jwt) {
      return new Response(JSON.stringify({ error: "Não autenticado" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { data: u } = await supabaseAdmin.auth.getUser(jwt);
    const userId = u?.user?.id;
    if (!userId) {
      return new Response(JSON.stringify({ error: "Não autenticado" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { data: isAdmin } = await supabaseAdmin.rpc("is_admin_master", { _user_id: userId });
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Apenas admin master pode gerar áudio." }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = (await req.json()) as BatchBody;
    if (!Array.isArray(body.chapters) || body.chapters.length === 0) {
      return new Response(JSON.stringify({ error: "chapters obrigatório (>= 1)" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (body.chapters.length > 3) {
      return new Response(
        JSON.stringify({ error: "Máx. 3 capítulos por rodada (limite de timeout)." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Cria batch run
    const { data: run } = await supabaseAdmin
      .from("audio_batch_runs")
      .insert({
        triggered_by: userId,
        voice_id: body.voiceId,
        voice_label: body.voiceLabel ?? null,
        max_chars_per_chapter: body.maxCharsPerChapter ?? 25000,
        chapter_slugs: body.chapters.map((c) => c.slug),
        total_characters: body.chapters.reduce((a, c) => a + c.characters, 0),
        status: "running",
      })
      .select("id")
      .single();

    const batchId = run?.id;
    const results: Array<{ slug: string; ok: boolean; error?: string; cached?: boolean; characters?: number }> = [];
    let succeeded = 0;
    let failed = 0;

    for (const ch of body.chapters) {
      try {
        const r = await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/tts-chapter`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${jwt}`,
            apikey: Deno.env.get("SUPABASE_ANON_KEY") ?? "",
          },
          body: JSON.stringify({
            slug: ch.slug,
            text: ch.text,
            voiceId: body.voiceId,
            voiceLabel: body.voiceLabel,
            force: body.force === true,
            batchId,
          }),
        });
        const data = await r.json();
        if (!r.ok || data.error) {
          failed++;
          results.push({ slug: ch.slug, ok: false, error: data.error || `HTTP ${r.status}` });
        } else {
          succeeded++;
          results.push({ slug: ch.slug, ok: true, cached: !!data.cached, characters: data.characters });
        }
      } catch (e) {
        failed++;
        results.push({ slug: ch.slug, ok: false, error: e instanceof Error ? e.message : String(e) });
      }
    }

    if (batchId) {
      await supabaseAdmin
        .from("audio_batch_runs")
        .update({
          succeeded,
          failed,
          status: failed === 0 ? "done" : succeeded === 0 ? "aborted" : "partial",
          finished_at: new Date().toISOString(),
        })
        .eq("id", batchId);
    }

    return new Response(JSON.stringify({ batchId, succeeded, failed, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
