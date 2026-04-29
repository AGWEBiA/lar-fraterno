// Notifica admins masters sobre eventos de geração em lote: started/finished/failed.
// Cria entradas em app_notifications e envia e-mail via Lovable Emails (se domínio ativo).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Body {
  kind: "batch_started" | "batch_finished" | "batch_failed" | "generic";
  title: string;
  body?: string;
  data?: Record<string, unknown>;
}

const supabaseAdmin = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const jwt = authHeader.replace("Bearer ", "");
    if (!jwt) return new Response(JSON.stringify({ error: "Não autenticado" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    const { data: u } = await supabaseAdmin.auth.getUser(jwt);
    const userId = u?.user?.id;
    if (!userId) return new Response(JSON.stringify({ error: "Não autenticado" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    const { data: isAdmin } = await supabaseAdmin.rpc("is_admin_master", { _user_id: userId });
    if (!isAdmin) return new Response(JSON.stringify({ error: "Apenas admin master" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const payload = (await req.json()) as Body;

    // Busca todos admins masters
    const { data: admins } = await supabaseAdmin
      .from("user_roles").select("user_id").eq("role", "admin_master");
    const adminIds = Array.from(new Set((admins ?? []).map((r: any) => r.user_id)));

    // Cria notificações in-app
    if (adminIds.length) {
      const rows = adminIds.map((uid) => ({
        user_id: uid,
        kind: payload.kind,
        title: payload.title,
        body: payload.body ?? null,
        data: payload.data ?? null,
      }));
      await supabaseAdmin.from("app_notifications").insert(rows);
    }

    // Envia e-mail via fila se possível
    let emailQueued = 0;
    try {
      const { data: profiles } = await supabaseAdmin
        .from("profiles").select("id, email, full_name").in("id", adminIds);
      for (const p of profiles ?? []) {
        if (!p.email) continue;
        const { error: enqErr } = await supabaseAdmin.rpc("enqueue_email", {
          p_to: p.email,
          p_subject: payload.title,
          p_html: `<div style="font-family:sans-serif"><h2>${payload.title}</h2><p>${payload.body ?? ""}</p></div>`,
          p_purpose: "transactional",
        });
        if (!enqErr) emailQueued++;
      }
    } catch (e) {
      // sem infra de email é tolerável
      console.warn("email enqueue skipped:", e instanceof Error ? e.message : e);
    }

    return new Response(JSON.stringify({ ok: true, notified: adminIds.length, emailQueued }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return new Response(JSON.stringify({ error: msg }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
