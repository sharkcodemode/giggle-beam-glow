// Tier S — Proxy Claude via Lovable AI Gateway
// Cliente nunca vê LOVABLE_API_KEY. Suporta streaming SSE.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "content-type, authorization, apikey",
};

// Lovable AI Gateway só serve Google + OpenAI. Anthropic não está disponível.
const ALLOWED_MODELS = new Set([
  "google/gemini-2.5-flash-lite",
  "google/gemini-3-flash-preview",
  "google/gemini-3.5-flash",
  "google/gemini-2.5-pro",
  "google/gemini-3.1-pro-preview",
  "openai/gpt-5-mini",
  "openai/gpt-5",
  "openai/gpt-5.5",
  // "openai/gpt-5.5-pro" removido — gateway responde 404 (não é chat model em /v1/chat/completions).
]);

const DEFAULT_MODEL = "google/gemini-3-flash-preview";
const MAX_MESSAGES = 500;          // hard cap (DoS guard)
const WINDOW_MESSAGES = 120;        // sliding window enviado ao gateway
const MAX_CONTENT_CHARS = 32_000;
const DEFAULT_MAX_COMPLETION = 16_384;

interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

function isValidMessage(m: unknown): m is ChatMessage {
  if (typeof m !== "object" || m === null) return false;
  const obj = m as Record<string, unknown>;
  return (
    (obj.role === "system" || obj.role === "user" || obj.role === "assistant") &&
    typeof obj.content === "string" &&
    obj.content.length > 0 &&
    obj.content.length <= MAX_CONTENT_CHARS
  );
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ error: "LOVABLE_API_KEY não configurada no servidor." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return new Response(JSON.stringify({ error: "Body JSON inválido." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const {
      messages,
      model = DEFAULT_MODEL,
      system,
      stream = true,
      temperature = 1,
      max_tokens,
      max_completion_tokens,
    } = body as Record<string, unknown>;

    if (!Array.isArray(messages) || messages.length === 0 || messages.length > MAX_MESSAGES) {
      return new Response(
        JSON.stringify({ error: `messages deve ser array de 1 a ${MAX_MESSAGES} itens.` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (!messages.every(isValidMessage)) {
      return new Response(
        JSON.stringify({ error: `Mensagem inválida: role deve ser system|user|assistant e content string <=${MAX_CONTENT_CHARS} chars.` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const finalModel = typeof model === "string" && ALLOWED_MODELS.has(model) ? model : DEFAULT_MODEL;

    // Sliding window: preserva primeiras 2 (contexto inicial) + últimas WINDOW-2.
    let windowed: ChatMessage[] = messages as ChatMessage[];
    if (windowed.length > WINDOW_MESSAGES) {
      const head = windowed.slice(0, 2);
      const tail = windowed.slice(-(WINDOW_MESSAGES - 2));
      windowed = [...head, ...tail];
    }

    const finalMessages: ChatMessage[] = [];
    if (typeof system === "string" && system.trim().length > 0 && system.length <= MAX_CONTENT_CHARS) {
      finalMessages.push({ role: "system", content: system });
    }
    finalMessages.push(...windowed);

    // Gateway: modelos GPT-5+ exigem `max_completion_tokens`; Gemini aceita ambos.
    // Usar sempre max_completion_tokens é o caminho universal.
    const rawCap = Number(max_completion_tokens ?? max_tokens ?? DEFAULT_MAX_COMPLETION);
    const completionCap = Number.isFinite(rawCap) && rawCap > 0
      ? Math.min(Math.max(Math.floor(rawCap), 64), 32_768)
      : DEFAULT_MAX_COMPLETION;

    console.log(
      `[claude-proxy] model=${finalModel} msgs=${finalMessages.length}/${messages.length} stream=${stream} cap=${completionCap}`,
    );

    const upstream = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: finalModel,
        messages: finalMessages,
        stream: Boolean(stream),
        temperature: Number(temperature),
        max_completion_tokens: completionCap,
      }),
    });

    if (upstream.status === 402) {
      return new Response(
        JSON.stringify({ error: "Saldo Lovable AI esgotado. Recarregue em Settings → Cloud & AI balance." }),
        { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    if (upstream.status === 429) {
      return new Response(
        JSON.stringify({ error: "Rate-limit atingido. Aguarde 30s e tente de novo." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    if (!upstream.ok) {
      const txt = await upstream.text();
      console.error(`[claude-proxy] gateway ${upstream.status}: ${txt.slice(0, 400)}`);
      return new Response(
        JSON.stringify({ error: `Gateway ${upstream.status}: ${txt.slice(0, 240)}` }),
        { status: upstream.status, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    return new Response(upstream.body, {
      headers: {
        ...corsHeaders,
        "Content-Type": stream ? "text/event-stream" : "application/json",
        "x-acto-model-used": finalModel,
        "Cache-Control": "no-cache, no-transform",
      },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error(`[claude-proxy] crash: ${msg}`);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
