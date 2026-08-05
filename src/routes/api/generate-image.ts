import { createFileRoute } from "@tanstack/react-router";
import { checkRateLimit, rateLimitResponse } from "@/lib/rate-limit.server";

const RL_MAX = 8;
const RL_WINDOW = 60;

/**
 * Backend — Lovable AI Gateway · streaming image generation
 * ---------------------------------------------------------
 * Encaminha SSE de /v1/images/generations direto pro client.
 * Body por família:
 *  - openai/*  → { model, prompt, size, quality, stream, partial_images }
 *  - google/*  → { model, messages, modalities, stream }
 *
 * Resposta: text/event-stream pass-through (eventos image_generation.partial_image
 * e image_generation.completed normalizados pelo gateway).
 */

type ImageModel =
  | "openai/gpt-image-2"
  | "openai/gpt-image-1-mini"
  | "google/gemini-3.1-flash-image-preview"
  | "google/gemini-2.5-flash-image"
  | "google/gemini-3-pro-image-preview";

interface Body {
  model: ImageModel;
  prompt: string;
  system?: string;
  size?: string;
  quality?: "low" | "medium" | "high";
}

const ALLOWED: ReadonlyArray<ImageModel> = [
  "openai/gpt-image-2",
  "openai/gpt-image-1-mini",
  "google/gemini-3.1-flash-image-preview",
  "google/gemini-2.5-flash-image",
  "google/gemini-3-pro-image-preview",
];

function buildUpstreamBody(b: Body): Record<string, unknown> {
  const fullPrompt = b.system ? `${b.system}\n\n${b.prompt}` : b.prompt;
  if (b.model.startsWith("openai/")) {
    return {
      model: b.model,
      prompt: fullPrompt,
      size: b.size ?? "1024x1024",
      quality: b.quality ?? "low",
      n: 1,
      stream: true,
      partial_images: 2,
    };
  }
  // Gemini image (OpenRouter chat-completions image shape)
  return {
    model: b.model,
    messages: [{ role: "user", content: fullPrompt }],
    modalities: ["image", "text"],
    stream: true,
  };
}

export const Route = createFileRoute("/api/generate-image")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const rl = await checkRateLimit(request, "generate-image", RL_MAX, RL_WINDOW);
        if (!rl.allowed) return rateLimitResponse(rl, RL_WINDOW);

        const key = process.env.LOVABLE_API_KEY;
        if (!key) {
          return new Response(
            JSON.stringify({ error: "config", message: "LOVABLE_API_KEY ausente no servidor." }),
            { status: 500, headers: { "Content-Type": "application/json" } },
          );
        }

        let parsed: Body;
        try {
          parsed = (await request.json()) as Body;
        } catch {
          return new Response("Invalid JSON", { status: 400 });
        }
        if (!parsed?.prompt || typeof parsed.prompt !== "string") {
          return new Response("prompt obrigatório", { status: 400 });
        }
        if (!ALLOWED.includes(parsed.model)) {
          return new Response("model inválido", { status: 400 });
        }

        const upstream = await fetch(
          "https://ai.gateway.lovable.dev/v1/images/generations",
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${key}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify(buildUpstreamBody(parsed)),
          },
        );

        if (!upstream.ok || !upstream.body) {
          const txt = await upstream.text().catch(() => "");
          let message = `Lovable AI Gateway falhou (HTTP ${upstream.status}).`;
          if (upstream.status === 402)
            message = "Créditos Lovable AI esgotados. Recarregue em Settings → Workspace → Usage.";
          else if (upstream.status === 429)
            message = "Rate limit Lovable AI. Aguarde alguns segundos e tente de novo.";
          else if (txt) {
            try {
              const j = JSON.parse(txt) as { error?: { message?: string } | string };
              if (typeof j.error === "string") message = j.error;
              else if (j.error?.message) message = j.error.message;
            } catch {
              message = `${message} · ${txt.slice(0, 240)}`;
            }
          }
          return new Response(
            JSON.stringify({
              error: "upstream",
              status: upstream.status,
              model_attempted: parsed.model,
              message,
            }),
            {
              status: upstream.status,
              headers: { "Content-Type": "application/json" },
            },
          );
        }

        return new Response(upstream.body, {
          headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
            Connection: "keep-alive",
            "x-acto-provider": "lovable-ai-gateway",
            "x-acto-model-used": parsed.model,
          },
        });
      },
    },
  },
});
