import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "content-type, authorization, apikey, x-acto-license",
};

// Protocolo ELITE DEPTH 10 — TIER S
// Esta Edge Function atua como gateway seguro entre a Extensão ACTO e o Lovable AI Gateway.

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("Segredo LOVABLE_API_KEY não configurado.");
    }

    // O corpo da requisição da extensão chega criptografado no seu sistema original.
    // Aqui implementamos a ponte direta para o Gateway da Lovable.
    const body = await req.json();
    const { action, params } = body;

    if (action === "gateway_chat") {
      const { model, messages, temperature = 0.2, stream = false } = params;

      // Mapeamento para garantir TIER S (Sonnet 3.5 ou GPT 5.5 Pro)
      // Se o usuário não especificar, forçamos o melhor modelo de código.
      const targetModel = model || "claude-3-5-sonnet";

      console.log(`[TIER S] Roteando para: ${targetModel}`);

      const response = await fetch("https://api.lovable.app/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${LOVABLE_API_KEY}`,
          "x-lovable-model": targetModel,
        },
        body: JSON.stringify({
          messages,
          temperature,
          stream,
        }),
      });

      // Retorna a resposta da IA diretamente para a extensão
      return new Response(response.body, {
        headers: {
          ...corsHeaders,
          "Content-Type": stream ? "text/event-stream" : "application/json",
        },
      });
    }

    return new Response(JSON.stringify({ error: "Ação não suportada" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
