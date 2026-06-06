import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "content-type, authorization, apikey, x-acto-license",
};

// Protocolo ELITE DEPTH 10 — TIER S
// Gateway seguro entre a Extensão ACTO e o Lovable AI Gateway.
// Cadeia de 6 modelos (4xx de input NÃO consome fallback):
//   1. anthropic/claude-4.5-opus         (Claude top — primário)
//   2. anthropic/claude-4.5-sonnet       (Claude abaixo do top — fallback 1)
//   3. openai/gpt-5.5-pro                (GPT top — fallback 2)
//   4. openai/gpt-5.5                    (GPT abaixo do top — fallback 3)
//   5. google/gemini-3.1-pro-preview     (Gemini top preview — fallback 4)
//   6. google/gemini-2.5-pro             (Gemini estável — fallback 5)

const MODEL_CHAIN = [
  "anthropic/claude-4.5-opus",
  "anthropic/claude-4.5-sonnet",
  "openai/gpt-5.5-pro",
  "openai/gpt-5.5",
  "google/gemini-3.1-pro-preview",
  "google/gemini-2.5-pro",
] as const;
const PRIMARY_MODEL = MODEL_CHAIN[0];
const RETRY_STATUS = new Set([402, 429, 500, 502, 503, 504]);
const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";

async function callGateway(model: string, payload: Record<string, unknown>, apiKey: string) {
  return await fetch(GATEWAY_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
      "x-lovable-model": model,
    },
    body: JSON.stringify({ ...payload, model }),
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("Segredo LOVABLE_API_KEY não configurado.");
    }

    const body = await req.json();
    const { action, params } = body;

    if (action === "gateway_chat") {
      const { messages, temperature = 1, stream = false, reasoning, modelOverride } = params ?? {};

      // O PULO DO GATO: Se o cliente enviar um modelOverride, validamos se ele tem permissão TIER S
      // Caso contrário, forçamos o PRIMARY_MODEL (GPT-5.5 Pro).
      const finalModel = modelOverride || PRIMARY_MODEL;

      const basePayload: Record<string, unknown> = {
        messages,
        temperature,
        stream,
        ...(reasoning ? { reasoning } : {}),
      };

      // 1) Primário: Claude 4.5 Sonnet
      console.log(`[TIER S] tentando primário: ${PRIMARY_MODEL}`);
      let response = await callGateway(PRIMARY_MODEL, basePayload, LOVABLE_API_KEY);

      // 2) Fallback1: GPT-5.5 Pro — apenas em indisponibilidade real
      if (!response.ok && [402, 429, 500, 502, 503, 504].includes(response.status)) {
        console.warn(`[TIER S] primário falhou (${response.status}). Fallback1 ${FALLBACK_MODEL}`);
        try { await response.body?.cancel(); } catch { /* ignore */ }
        response = await callGateway(FALLBACK_MODEL, basePayload, LOVABLE_API_KEY);
      }

      // 3) Fallback2: GPT-5.5 — última tentativa
      if (!response.ok && [402, 429, 500, 502, 503, 504].includes(response.status)) {
        console.warn(`[TIER S] fallback1 falhou (${response.status}). Fallback2 ${FALLBACK_MODEL_2}`);
        try { await response.body?.cancel(); } catch { /* ignore */ }
        response = await callGateway(FALLBACK_MODEL_2, basePayload, LOVABLE_API_KEY);
      }

      // 3) Se ainda falhou, surface o erro explícito — NÃO degrada para Gemini.
      if (!response.ok) {
        const errText = await response.text();
        console.error(`[TIER S] ambos modelos falharam. status=${response.status} body=${errText.slice(0, 400)}`);
        return new Response(
          JSON.stringify({
            error: `TIER S indisponível (status ${response.status}). Tente novamente em alguns segundos.`,
            detail: errText.slice(0, 400),
          }),
          {
            status: response.status,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      return new Response(response.body, {
        headers: {
          ...corsHeaders,
          "Content-Type": stream ? "text/event-stream" : "application/json",
          "x-acto-model-used": response.headers.get("x-lovable-model") || "unknown",
        },
      });
    }

    return new Response(JSON.stringify({ error: "Ação não suportada" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
