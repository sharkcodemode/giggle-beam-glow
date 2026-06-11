import { createFileRoute } from "@tanstack/react-router";

/**
 * ELITE LOVABLE — Prompt Refiner (Google AI Studio · Gemini 2.5 Flash)
 * --------------------------------------------------------------------
 * Endpoint público (sem auth) para ser chamado direto da extensão Chrome.
 * POST { prompt: string, context?: string, mode?: "lovable"|"generic" }
 *  → { improved: string, model: string }
 *
 * CORS: aberto (Access-Control-Allow-Origin: *) — qualquer extensão chama.
 * Custo: zero do lado Lovable (usa chave do usuário, free tier do Google).
 */

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "content-type, authorization",
  "Access-Control-Max-Age": "86400",
} as const;

const MODEL = "gemini-2.5-flash";
const ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;

const SYSTEM_LOVABLE = `Você é o ELITE LOVABLE PROMPT REFINER — protocolo TIER S.
Sua única tarefa: reescrever o prompt cru do usuário em um prompt cirúrgico para o agente Lovable (TanStack/React/TS estrito).

REGRAS:
- Português PT-BR, denso, anti-marketês, zero conversa decorativa.
- Específico > genérico. Número > adjetivo.
- Estruture em blocos curtos quando ajudar: OBJETIVO, ESCOPO, ARQUIVOS-ALVO, CRITÉRIOS DE ACEITE, RESTRIÇÕES.
- Inferir intenção implícita (responsivo 320/768/1440, a11y WCAG AA, zero any, build limpo). Listar só o que importa para a tarefa.
- Se faltar info crítica, NÃO invente: liste em "PERGUNTAS PENDENTES".
- Nunca explicar o que você fez. Devolver APENAS o prompt refinado, pronto para colar.
- Preservar nomes próprios, rotas, IDs e snippets de código do original.`;

const SYSTEM_GENERIC = `Você refina prompts para LLMs. Devolva APENAS o prompt melhorado:
mais específico, com contexto, formato de saída claro, restrições e critérios de sucesso.
Português PT-BR. Sem preâmbulo, sem explicação, sem markdown decorativo.`;

interface Body {
  prompt?: string;
  context?: string;
  mode?: "lovable" | "generic";
}

interface GeminiResp {
  candidates?: Array<{ content?: { parts?: Array<{ text?: string }> }; finishReason?: string }>;
  promptFeedback?: { blockReason?: string };
  error?: { message?: string };
}

function json(status: number, payload: unknown): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}

export const Route = createFileRoute("/api/public/elite-prompt")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS }),
      POST: async ({ request }) => {
        const key = process.env.GOOGLE_AI_STUDIO_API_KEY;
        if (!key) {
          return json(500, { error: "config", message: "GOOGLE_AI_STUDIO_API_KEY ausente." });
        }

        let body: Body;
        try {
          body = (await request.json()) as Body;
        } catch {
          return json(400, { error: "bad_json" });
        }
        const prompt = (body.prompt ?? "").trim();
        if (!prompt) return json(400, { error: "missing_prompt" });
        if (prompt.length > 16_000) return json(413, { error: "prompt_too_long" });

        const system = body.mode === "generic" ? SYSTEM_GENERIC : SYSTEM_LOVABLE;
        const userBlock = body.context?.trim()
          ? `CONTEXTO ADICIONAL:\n${body.context.trim()}\n\nPROMPT CRU:\n${prompt}`
          : `PROMPT CRU:\n${prompt}`;

        const upstream = await fetch(`${ENDPOINT}?key=${encodeURIComponent(key)}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            systemInstruction: { role: "system", parts: [{ text: system }] },
            contents: [{ role: "user", parts: [{ text: userBlock }] }],
            generationConfig: { temperature: 0.6, maxOutputTokens: 2048 },
          }),
        });

        const text = await upstream.text();
        if (!upstream.ok) {
          let msg = `Google AI HTTP ${upstream.status}`;
          try {
            const j = JSON.parse(text) as GeminiResp;
            if (j.error?.message) msg = j.error.message;
          } catch {
            if (text) msg = `${msg} · ${text.slice(0, 240)}`;
          }
          return json(upstream.status, { error: "upstream", message: msg });
        }

        let data: GeminiResp;
        try {
          data = JSON.parse(text) as GeminiResp;
        } catch {
          return json(502, { error: "non_json" });
        }
        if (data.promptFeedback?.blockReason) {
          return json(400, { error: "blocked", message: data.promptFeedback.blockReason });
        }
        const improved = (data.candidates?.[0]?.content?.parts ?? [])
          .map((p) => p.text ?? "")
          .join("")
          .trim();
        if (!improved) {
          return json(502, {
            error: "empty",
            message: data.candidates?.[0]?.finishReason ?? "sem texto",
          });
        }

        return json(200, { improved, model: MODEL });
      },
    },
  },
});
