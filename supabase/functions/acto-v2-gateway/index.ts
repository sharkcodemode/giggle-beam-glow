import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { loadModelChain, DEFAULT_MODEL_CHAIN } from "../_shared/model-chain.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "content-type, authorization, apikey, x-acto-license",
};

// Protocolo ELITE DEPTH 10 — TIER S
// Cadeia agora é dinâmica (tabela `acto_model_config`, cache 30s).
// Em caso de falha de leitura → DEFAULT_MODEL_CHAIN.
// 4xx de input NÃO consome fallback (erro do cliente, não indisponibilidade).

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
      const { messages, temperature = 1, stream = false, reasoning } = params ?? {};

      const basePayload: Record<string, unknown> = {
        messages,
        temperature,
        stream,
        ...(reasoning ? { reasoning } : {}),
      };

      const chain = await loadModelChain();
      const primary = chain[0] ?? DEFAULT_MODEL_CHAIN[0];

      let response: Response | null = null;
      let modelUsed: string = primary;

      for (let i = 0; i < chain.length; i++) {
        const m = chain[i];
        console.log(`[TIER S] tentando ${i === 0 ? "primário" : `fallback${i}`}: ${m}`);
        response = await callGateway(m, basePayload, LOVABLE_API_KEY);
        modelUsed = m;
        if (response.ok) break;
        if (!RETRY_STATUS.has(response.status)) break;
        if (i < chain.length - 1) {
          console.warn(`[TIER S] ${m} falhou (${response.status}). Próximo na cadeia.`);
          try { await response.body?.cancel(); } catch { /* ignore */ }
        }
      }

      const finalResponse = response!;
      if (!finalResponse.ok) {
        const errText = await finalResponse.text();
        console.error(`[TIER S] cadeia esgotada. status=${finalResponse.status} body=${errText.slice(0, 400)}`);
        return new Response(
          JSON.stringify({
            error: `TIER S indisponível (status ${finalResponse.status}). Tente novamente em alguns segundos.`,
            detail: errText.slice(0, 400),
            model_attempted: chain,
          }),
          {
            status: finalResponse.status,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      return new Response(finalResponse.body, {
        headers: {
          ...corsHeaders,
          "Content-Type": stream ? "text/event-stream" : "application/json",
          "x-acto-model-used": finalResponse.headers.get("x-lovable-model") || modelUsed,
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
