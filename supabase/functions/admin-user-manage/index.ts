// Admin master: deleta usuário do auth + dados (cascata via FKs onde existir).
// Requer JWT de admin master.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const supabaseAdmin = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const jwt = (req.headers.get("Authorization") ?? "").replace("Bearer ", "");
    if (!jwt) {
      return new Response(JSON.stringify({ error: "Não autenticado" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { data: u } = await supabaseAdmin.auth.getUser(jwt);
    const callerId = u?.user?.id;
    if (!callerId) {
      return new Response(JSON.stringify({ error: "Não autenticado" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { data: isAdmin } = await supabaseAdmin.rpc("is_admin_master", { _user_id: callerId });
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Apenas admin master." }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { action, userId, email, fullName, phone } = await req.json();
    if (!userId) {
      return new Response(JSON.stringify({ error: "userId obrigatório" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (userId === callerId && action === "delete") {
      return new Response(JSON.stringify({ error: "Não é possível excluir a si mesmo." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "update_profile") {
      const patch: Record<string, unknown> = {};
      if (typeof fullName === "string") patch.full_name = fullName;
      if (typeof phone === "string") patch.phone = phone;
      if (typeof email === "string") patch.email = email;
      patch.updated_at = new Date().toISOString();
      const { error } = await supabaseAdmin.from("profiles").update(patch).eq("id", userId);
      if (error) throw error;
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "reset_password") {
      const { data: target } = await supabaseAdmin.from("profiles").select("email").eq("id", userId).maybeSingle();
      if (!target?.email) throw new Error("Usuário sem e-mail.");
      const { error } = await supabaseAdmin.auth.admin.generateLink({
        type: "recovery",
        email: target.email,
      });
      if (error) throw error;
      return new Response(JSON.stringify({ ok: true, message: "E-mail de recuperação enviado." }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "revoke_sessions") {
      const { error } = await supabaseAdmin.auth.admin.signOut(userId);
      if (error) throw error;
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "delete") {
      const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);
      if (error) throw error;
      // Limpa registros públicos manualmente (sem FK)
      await supabaseAdmin.from("profiles").delete().eq("id", userId);
      await supabaseAdmin.from("user_roles").delete().eq("user_id", userId);
      await supabaseAdmin.from("user_status").delete().eq("user_id", userId);
      await supabaseAdmin.from("tenant_members").delete().eq("user_id", userId);
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Ação inválida." }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("admin-user-manage error:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
