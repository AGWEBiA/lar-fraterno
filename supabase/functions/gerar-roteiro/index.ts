// Edge function: gerar-roteiro
// Recebe { chapterSlug, chapterTitle, chapterSummary, excerpt }
// Devolve estrutura JSON com prece de abertura, sugestões de comentários, vibrações, prece final.
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface Body {
  chapterSlug: string;
  chapterTitle: string;
  chapterSummary?: string;
  excerpt?: string;
}

const SYSTEM_PROMPT = `Você é um facilitador experiente de reuniões de Evangelho no Lar, na tradição espírita kardecista (Allan Kardec, FEB).
Seu papel é gerar um ROTEIRO acolhedor, claro e respeitoso para uma reunião familiar de cerca de 30 minutos, baseada em um capítulo de "O Evangelho Segundo o Espiritismo".

Princípios:
- Tom sereno, fraterno, sem doutrinarismo nem proselitismo.
- Evitar polêmicas e julgamentos.
- Linguagem em português do Brasil, simples e direta.
- Comentários devem aplicar a mensagem à vida cotidiana e familiar.
- Preces curtas (3 a 5 linhas), em prosa, falando com Deus de forma simples.
- NUNCA reproduzir trechos longos do livro (apenas ideias parafraseadas).

Você responderá APENAS chamando a função "build_guide" com a estrutura solicitada.`;

const TOOL_SCHEMA = {
  type: "function",
  function: {
    name: "build_guide",
    description: "Monta o roteiro completo da reunião de Evangelho no Lar.",
    parameters: {
      type: "object",
      properties: {
        opening_prayer: {
          type: "string",
          description: "Prece de abertura curta (3-5 linhas), pedindo proteção e auxílio dos bons Espíritos.",
        },
        reading_intro: {
          type: "string",
          description: "Frase introdutória curta (1-2 linhas) a ser lida antes do trecho do livro, situando o tema do capítulo.",
        },
        commentary_points: {
          type: "array",
          description: "3 a 5 pontos breves de comentário/reflexão para discussão familiar. Cada um focado em aplicação prática.",
          minItems: 3,
          maxItems: 5,
          items: {
            type: "object",
            properties: {
              title: { type: "string", description: "Título curto do ponto (até 6 palavras)." },
              text: { type: "string", description: "1-3 frases aplicando a ideia à vida cotidiana." },
            },
            required: ["title", "text"],
            additionalProperties: false,
          },
        },
        reflection_questions: {
          type: "array",
          description: "2 a 3 perguntas suaves para a família refletir em conjunto.",
          minItems: 2,
          maxItems: 3,
          items: { type: "string" },
        },
        vibrations_focus: {
          type: "string",
          description: "Sugestão de focos para as vibrações (familiares, doentes, desafetos, humanidade...) em 2-3 linhas.",
        },
        closing_prayer: {
          type: "string",
          description: "Prece de encerramento curta (3-5 linhas), de gratidão e pedido de continuidade da paz no lar.",
        },
      },
      required: [
        "opening_prayer",
        "reading_intro",
        "commentary_points",
        "reflection_questions",
        "vibrations_focus",
        "closing_prayer",
      ],
      additionalProperties: false,
    },
  },
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = (await req.json()) as Body;
    if (!body?.chapterSlug || !body?.chapterTitle) {
      return new Response(JSON.stringify({ error: "chapterSlug e chapterTitle são obrigatórios." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY não configurada");

    const userPrompt = [
      `Capítulo: ${body.chapterTitle}`,
      body.chapterSummary ? `Resumo do capítulo: ${body.chapterSummary}` : "",
      body.excerpt ? `Trecho de referência (parafrasear, não citar literalmente):\n${body.excerpt}` : "",
      "",
      "Monte o roteiro completo da reunião chamando a função build_guide.",
    ]
      .filter(Boolean)
      .join("\n");

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userPrompt },
        ],
        tools: [TOOL_SCHEMA],
        tool_choice: { type: "function", function: { name: "build_guide" } },
      }),
    });

    if (!aiResp.ok) {
      if (aiResp.status === 429) {
        return new Response(
          JSON.stringify({ error: "Muitas solicitações em pouco tempo. Tente novamente em instantes." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      if (aiResp.status === 402) {
        return new Response(
          JSON.stringify({ error: "Créditos da IA esgotados. Adicione créditos em Settings → Workspace → Usage." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      const t = await aiResp.text();
      console.error("AI gateway error:", aiResp.status, t);
      return new Response(JSON.stringify({ error: "Erro ao contatar a IA." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await aiResp.json();
    const toolCall = data?.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall?.function?.arguments) {
      console.error("No tool call returned:", JSON.stringify(data).slice(0, 500));
      return new Response(JSON.stringify({ error: "Resposta da IA sem estrutura esperada." }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const guide = JSON.parse(toolCall.function.arguments);

    return new Response(JSON.stringify({ guide, model: "google/gemini-3-flash-preview" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("gerar-roteiro error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
