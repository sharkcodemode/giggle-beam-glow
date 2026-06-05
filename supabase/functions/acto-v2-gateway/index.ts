import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "content-type, authorization, apikey, x-acto-license",
};

// Protocolo ELITE DEPTH 10 — TIER S
// Gateway seguro entre a Extensão ACTO e o Lovable AI Gateway.
// Política de modelo: força TIER S server-side. Cliente NÃO escolhe modelo.
//   Primário:  openai/gpt-5.5-pro
//   Fallback:  anthropic/claude-3.5-sonnet  (se primário 402/429/5xx)
//   NUNCA cai para Gemini silenciosamente — erro explícito se ambos falharem.

const PRIMARY_MODEL = "openai/gpt-5.5-pro";
const FALLBACK_MODEL = "anthropic/claude-3.5-sonnet";
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

      // 1) Primário: GPT-5.5 Pro
      console.log(`[TIER S] tentando primário: ${PRIMARY_MODEL}`);
      let response = await callGateway(PRIMARY_MODEL, basePayload, LOVABLE_API_KEY);

      // 2) Fallback apenas em indisponibilidade real (não em 4xx de input)
      if (!response.ok && [402, 429, 500, 502, 503, 504].includes(response.status)) {
        console.warn(`[TIER S] primário falhou (${response.status}). Caindo para ${FALLBACK_MODEL}`);
        // Stream do primário não pode ser reaproveitado; consome para liberar.
        try { await response.body?.cancel(); } catch { /* ignore */ }
        response = await callGateway(FALLBACK_MODEL, basePayload, LOVABLE_API_KEY);
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
