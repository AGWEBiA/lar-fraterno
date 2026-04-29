// Gera áudio MP3 de um capítulo usando ElevenLabs e cacheia no Storage.
// Registra cada geração em audio_generation_jobs (admin master-only).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const VOICE_DEFAULT = "EXAVITQu4vr4xnSDxMaL";
const MODEL_ID = "eleven_multilingual_v2";
const MAX_CHARS = 4800;

interface Body {
  slug: string;
  text: string;
  voiceId?: string;
  voiceLabel?: string;
  force?: boolean;
  batchId?: string;
}

const supabaseAdmin = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

const splitForTTS = (text: string, max = MAX_CHARS): string[] => {
  if (text.length <= max) return [text];
  const sentences = text.replace(/\s+/g, " ").match(/[^.!?]+[.!?]+|\S+$/g) ?? [text];
  const out: string[] = [];
  let buf = "";
  for (const s of sentences) {
    const seg = s.trim();
    if (!seg) continue;
    if ((buf + " " + seg).trim().length > max && buf) {
      out.push(buf.trim()); buf = seg;
    } else {
      buf = (buf + " " + seg).trim();
    }
  }
  if (buf) out.push(buf.trim());
  return out;
};

const synth = async (text: string, voiceId: string, prev?: string, next?: string) => {
  const apiKey = Deno.env.get("ELEVENLABS_API_KEY");
  if (!apiKey) throw new Error("ELEVENLABS_API_KEY não configurada");
  const res = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=mp3_44100_128`,
    {
      method: "POST",
      headers: { "xi-api-key": apiKey, "Content-Type": "application/json" },
      body: JSON.stringify({
        text, model_id: MODEL_ID, previous_text: prev, next_text: next,
        voice_settings: { stability: 0.55, similarity_boost: 0.75, style: 0.25, use_speaker_boost: true },
      }),
    },
  );
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`ElevenLabs ${res.status}: ${err.slice(0, 300)}`);
  }
  return new Uint8Array(await res.arrayBuffer());
};

const concat = (parts: Uint8Array[]) => {
  const total = parts.reduce((s, p) => s + p.length, 0);
  const out = new Uint8Array(total);
  let off = 0;
  for (const p of parts) { out.set(p, off); off += p.length; }
  return out;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  let jobId: string | null = null;
  let userId: string | null = null;
  const startedAt = Date.now();

  try {
    const body = (await req.json()) as Body;
    if (!body?.slug || typeof body.slug !== "string") {
      return new Response(JSON.stringify({ error: "slug obrigatório" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const voiceId = body.voiceId || VOICE_DEFAULT;
    const slug = body.slug;

    const authHeader = req.headers.get("Authorization") ?? "";
    const jwt = authHeader.replace("Bearer ", "");
    if (jwt) {
      const { data: u } = await supabaseAdmin.auth.getUser(jwt);
      userId = u?.user?.id ?? null;
    }

    // cache hit (sem force)
    if (!body.force) {
      const { data: existing } = await supabaseAdmin
        .from("audio_cache")
        .select("public_url")
        .eq("chapter_slug", slug)
        .eq("voice_id", voiceId)
        .maybeSingle();
      if (existing?.public_url) {
        return new Response(JSON.stringify({ url: existing.public_url, cached: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    if (!body.text || body.text.length < 10) {
      return new Response(JSON.stringify({ error: "texto vazio" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!userId) {
      return new Response(JSON.stringify({ error: "Não autenticado" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { data: isAdmin } = await supabaseAdmin.rpc("is_admin_master", { _user_id: userId });
    if (!isAdmin) {
      return new Response(
        JSON.stringify({ error: "Apenas o administrador master pode gerar áudio. Selecione uma voz já gerada." }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // cria job
    const { data: jobIns } = await supabaseAdmin
      .from("audio_generation_jobs")
      .insert({
        user_id: userId,
        chapter_slug: slug,
        voice_id: voiceId,
        voice_label: body.voiceLabel ?? null,
        status: "running",
        characters: body.text.length,
        forced: !!body.force,
        batch_id: body.batchId ?? null,
      })
      .select("id")
      .single();
    jobId = jobIns?.id ?? null;

    // gerar com concorrência limitada
    const chunks = splitForTTS(body.text);
    const CONCURRENCY = 2;
    const audios: Uint8Array[] = new Array(chunks.length);
    for (let start = 0; start < chunks.length; start += CONCURRENCY) {
      const slice = chunks.slice(start, start + CONCURRENCY);
      const results = await Promise.all(
        slice.map((chunk, j) => {
          const i = start + j;
          const prev = i > 0 ? chunks[i - 1].slice(-300) : undefined;
          const next = i < chunks.length - 1 ? chunks[i + 1].slice(0, 300) : undefined;
          return synth(chunk, voiceId, prev, next);
        }),
      );
      results.forEach((buf, j) => { audios[start + j] = buf; });
    }
    const combined = concat(audios);

    const path = `${slug}/${voiceId}.mp3`;
    const { error: upErr } = await supabaseAdmin.storage
      .from("audio-cache")
      .upload(path, combined, { contentType: "audio/mpeg", upsert: true });
    if (upErr) throw upErr;

    const { data: pub } = supabaseAdmin.storage.from("audio-cache").getPublicUrl(path);

    await supabaseAdmin.from("audio_cache").upsert(
      { chapter_slug: slug, voice_id: voiceId, storage_path: path, public_url: pub.publicUrl, characters: body.text.length },
      { onConflict: "chapter_slug,voice_id" },
    );

    if (jobId) {
      await supabaseAdmin.from("audio_generation_jobs")
        .update({ status: "success", duration_ms: Date.now() - startedAt, finished_at: new Date().toISOString() })
        .eq("id", jobId);
    }

    return new Response(
      JSON.stringify({ url: pub.publicUrl, cached: false, characters: body.text.length, jobId }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("tts-chapter error:", msg);
    if (jobId) {
      await supabaseAdmin.from("audio_generation_jobs")
        .update({ status: "failed", duration_ms: Date.now() - startedAt, finished_at: new Date().toISOString(), error_message: msg.slice(0, 1000) })
        .eq("id", jobId);
    }
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
