import { createFileRoute } from "@tanstack/react-router";

type ImageModel =
  | "openai/gpt-image-2"
  | "openai/gpt-image-1-mini"
  | "google/gemini-3-pro-image-preview"
  | "google/gemini-3.1-flash-image-preview"
  | "google/gemini-2.5-flash-image";

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
  "google/gemini-3-pro-image-preview",
  "google/gemini-3.1-flash-image-preview",
  "google/gemini-2.5-flash-image",
];

// Cadeia TIER S por modelo primário. Fallback automático em 402/429/5xx.
const FALLBACK_CHAINS: Record<ImageModel, ReadonlyArray<ImageModel>> = {
  "openai/gpt-image-2": [
    "openai/gpt-image-2",
    "openai/gpt-image-1-mini",
    "google/gemini-3-pro-image-preview",
    "google/gemini-3.1-flash-image-preview",
    "google/gemini-2.5-flash-image",
  ],
  "openai/gpt-image-1-mini": [
    "openai/gpt-image-1-mini",
    "google/gemini-3.1-flash-image-preview",
    "google/gemini-2.5-flash-image",
  ],
  "google/gemini-3-pro-image-preview": [
    "google/gemini-3-pro-image-preview",
    "google/gemini-3.1-flash-image-preview",
    "google/gemini-2.5-flash-image",
    "openai/gpt-image-1-mini",
  ],
  "google/gemini-3.1-flash-image-preview": [
    "google/gemini-3.1-flash-image-preview",
    "google/gemini-2.5-flash-image",
    "openai/gpt-image-1-mini",
  ],
  "google/gemini-2.5-flash-image": [
    "google/gemini-2.5-flash-image",
    "google/gemini-3.1-flash-image-preview",
    "openai/gpt-image-1-mini",
  ],
};

const RETRY_STATUS = new Set([402, 408, 409, 425, 429, 500, 502, 503, 504]);

function buildBody(model: ImageModel, b: Body): Record<string, unknown> {
  const isOpenAI = model.startsWith("openai/");
  const fullPrompt = b.system ? `${b.system}\n\n---\n\n${b.prompt}` : b.prompt;

  if (isOpenAI) {
    return {
      model,
      prompt: fullPrompt,
      size: b.size ?? "1024x1024",
      quality: b.quality ?? "low",
      n: 1,
      stream: true,
      partial_images: 1,
    };
  }
  return {
    model,
    messages: [{ role: "user", content: fullPrompt }],
    modalities: ["image", "text"],
    stream: true,
  };
}

function errorPayload(status: number, model: ImageModel, raw: string): string {
  if (status === 402) {
    return JSON.stringify({
      error: "payment_required",
      status,
      model_attempted: model,
      message:
        "Créditos do Lovable AI Gateway esgotados. Adicione créditos em Settings → Workspace → Usage para continuar gerando imagens.",
    });
  }
  if (status === 429) {
    return JSON.stringify({
      error: "rate_limited",
      status,
      model_attempted: model,
      message:
        "Rate limit do gateway atingido. Aguarde alguns segundos e tente de novo.",
    });
  }
  return JSON.stringify({
    error: "upstream_error",
    status,
    model_attempted: model,
    message: raw.slice(0, 400) || `Gateway respondeu ${status}.`,
  });
}

export const Route = createFileRoute("/api/generate-image")({
  server: {
    handlers: {
      POST: async ({ request }) => {
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
        const key = process.env.LOVABLE_API_KEY;
        if (!key) {
          return new Response("Missing LOVABLE_API_KEY", { status: 500 });
        }

        const chain = FALLBACK_CHAINS[parsed.model] ?? [parsed.model];
        let lastStatus = 500;
        let lastText = "";
        let lastModel: ImageModel = parsed.model;

        for (let i = 0; i < chain.length; i++) {
          const m = chain[i];
          lastModel = m;
          const upstream = await fetch(
            "https://ai.gateway.lovable.dev/v1/images/generations",
            {
              method: "POST",
              headers: {
                Authorization: `Bearer ${key}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify(buildBody(m, parsed)),
            },
          );

          if (upstream.ok && upstream.body) {
            return new Response(upstream.body, {
              headers: {
                "Content-Type": "text/event-stream",
                "Cache-Control": "no-cache",
                Connection: "keep-alive",
                "x-acto-model-used": m,
                "x-acto-fallback-depth": String(i),
              },
            });
          }

          lastStatus = upstream.status;
          lastText = await upstream.text().catch(() => "");
          if (!RETRY_STATUS.has(upstream.status)) break;
          // continua tentando próximo modelo
        }

        return new Response(errorPayload(lastStatus, lastModel, lastText), {
          status: lastStatus,
          headers: { "Content-Type": "application/json" },
        });
      },
    },
  },
});
