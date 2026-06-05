// Tier S — Proxy Claude via Lovable AI Gateway
// Cliente nunca vê LOVABLE_API_KEY. Suporta streaming SSE.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "content-type, authorization, apikey",
};

const ALLOWED_MODELS = new Set([
  "anthropic/claude-3.5-sonnet",
  "anthropic/claude-3.5-haiku",
  "anthropic/claude-sonnet-4",
  "anthropic/claude-opus-4",
  "anthropic/claude-4.5-sonnet",
  "anthropic/claude-4.5-opus",
]);

const DEFAULT_MODEL = "anthropic/claude-3.5-sonnet";
const MAX_MESSAGES = 50;
const MAX_CONTENT_CHARS = 16_000;

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
      max_tokens = 2048,
    } = body as Record<string, unknown>;

    if (!Array.isArray(messages) || messages.length === 0 || messages.length > MAX_MESSAGES) {
      return new Response(
        JSON.stringify({ error: `messages deve ser array de 1 a ${MAX_MESSAGES} itens.` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (!messages.every(isValidMessage)) {
      return new Response(
        JSON.stringify({ error: "Mensagem inválida: role deve ser system|user|assistant e content string <=16k chars." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const finalModel = typeof model === "string" && ALLOWED_MODELS.has(model) ? model : DEFAULT_MODEL;

    const finalMessages: ChatMessage[] = [];
    if (typeof system === "string" && system.trim().length > 0 && system.length <= MAX_CONTENT_CHARS) {
      finalMessages.push({ role: "system", content: system });
    }
    finalMessages.push(...messages);

    console.log(`[claude-proxy] model=${finalModel} msgs=${finalMessages.length} stream=${stream}`);

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
        max_tokens: Number(max_tokens),
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
