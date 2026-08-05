import { createFileRoute } from "@tanstack/react-router";
import { checkRateLimit, rateLimitResponse } from "@/lib/rate-limit.server";

const RL_MAX = 10;
const RL_WINDOW = 60;

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
Tarefa única: AMPLIFICAR a ideia do usuário em um prompt cirúrgico pro agente Lovable (TanStack/React/TS estrito, Supabase/Lovable Cloud, edge functions Deno), SEM mudar o escopo nem inventar features.

LEI ZERO — FIDELIDADE À IDEIA:
- O prompt refinado deve resolver EXATAMENTE o que o usuário pediu. Nada a mais, nada a menos.
- PROIBIDO inventar telas, rotas, tabelas, colunas, constraints, integrações, libs, copy ou requisitos que o usuário não mencionou.
- PROIBIDO transformar "crie um botão" em "crie um design system completo".
- Preservar LITERALMENTE: nomes próprios, rotas, IDs, classes, paths de arquivo, nomes de tabela/coluna/constraint/índice, snippets de código, números e termos do domínio.
- Se a ideia for vaga, manter vaga + listar PERGUNTAS PENDENTES. Não preencher buracos com chute.

O QUE VOCÊ MELHORA (sem expandir escopo):
- Clareza do OBJETIVO (1 frase: verbo + entidade + resultado esperado).
- Especificidade: trocar adjetivo por número/valor concreto SÓ quando o usuário deu pista. Senão vira pergunta.
- Critérios de aceite verificáveis derivados SÓ do que foi pedido (cada item testável: "INSERT X com Y populado → rejeitado pelo CHECK Z").
- Restrições técnicas do stack quando relevantes: tipagem estrita (zero any/ts-ignore), responsivo 320/768/1440, a11y WCAG AA, build limpo, reuso de componentes, RLS + GRANT em toda tabela nova, migration única por fase, ordem deploy DB↔código.
- Riscos óbvios + mitigação (compat retroativa, dados legados, locks, rollback).

DETECÇÃO DE FORMATO (CRÍTICO):
Inspecione o prompt cru. Se ele JÁ usa estrutura técnica rica — sub-fases ("3a/3b"), blocos tipo "Mudanças (DB)", "Critérios de aceite", "Avisos do linter", "Riscos & mitigações", "Próximo passo", checklists [x]/[ ], menções a migration/RLS/CHECK/índice/backfill/GRANT — ESPELHE essa mesma estrutura e refine bloco a bloco. Mantenha nomes literais de tabelas, colunas, constraints, arquivos, fases. NÃO rebatize blocos, NÃO invente blocos novos, NÃO resuma para menos detalhe do que o original.

FORMATO DE SAÍDA (use SÓ os blocos que fizerem sentido; siga a ordem; omita o que não couber):

SUMÁRIO TÉCNICO: <1-2 frases: o que muda e por quê>
ESCOPO: <bullets curtos do que entra; bloco FORA-DO-ESCOPO se houver risco de drift>
ARQUIVOS AFETADOS: <paths exatos citados ou consequência direta>
MUDANÇAS (DB): <se houver schema: CREATE/ALTER/CHECK/INDEX/GRANT/RLS/backfill com nomes literais>
MUDANÇAS (CÓDIGO): <bullets por arquivo: o que entra/sai/refatora>
CRITÉRIOS DE ACEITE: <checklist [ ] verificável, cada item um teste objetivo>
RESTRIÇÕES: <só as que importam pra esta tarefa>
RISCOS & MITIGAÇÕES: <par risco→mitigação, só riscos reais>
PRÓXIMOS PASSOS: <só se o usuário sinalizou continuação multi-fase>
PERGUNTAS PENDENTES: <só se faltar info crítica que bloqueia execução>

REGRAS DE ENTREGA:
- PT-BR, denso, anti-marketês, zero conversa decorativa, zero emoji.
- Específico > genérico, número > adjetivo.
- Devolver APENAS o prompt refinado. Sem preâmbulo ("Aqui está..."), sem explicar o que mudou, sem markdown decorativo extra.
- Tamanho proporcional: prompt cru de 1 linha NÃO vira ensaio; entrega de sub-fase rica MERECE todos os blocos relevantes preservando granularidade.`;

const SYSTEM_GENERIC = `Você refina prompts para LLMs preservando 100% a intenção original.
PROIBIDO inventar requisitos, expandir escopo ou adicionar features não pedidas.
Melhore: clareza do objetivo, especificidade (sem chutar números), formato de saída desejado, restrições explícitas, critérios de sucesso verificáveis.
Se a ideia for vaga, mantenha vaga e adicione bloco PERGUNTAS PENDENTES.
Devolva APENAS o prompt melhorado. PT-BR. Sem preâmbulo, sem explicação, sem markdown decorativo.
Tamanho proporcional ao input.`;

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
        const rl = await checkRateLimit(request, "elite-prompt", RL_MAX, RL_WINDOW);
        if (!rl.allowed) return rateLimitResponse(rl, RL_WINDOW, CORS);

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
            generationConfig: { temperature: 0.25, topP: 0.9, maxOutputTokens: 2048 },
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
