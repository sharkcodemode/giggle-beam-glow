import { createFileRoute } from "@tanstack/react-router";

/**
 * Backend — Google AI Studio (chave do usuário) · geração de imagem
 * -----------------------------------------------------------------
 * Usa GOOGLE_AI_STUDIO_API_KEY direto (sem passar pelo Lovable Gateway).
 * Suporta:
 *  - gemini-2.5-flash-image-preview / gemini-2.5-flash-image (Nano Banana)
 *  - gemini-3.0-flash-image-preview (Nano Banana 2)
 *  - imagen-4.0-generate-001 / imagen-4.0-fast-generate-001
 *  - imagen-3.0-generate-002
 *
 * Resposta: text/event-stream com 1 evento `image_generation.completed`
 * para manter compatibilidade com src/lib/stream-image.ts.
 */

type GoogleModel =
  | "gemini-2.5-flash-image"
  | "gemini-2.5-flash-image-preview"
  | "imagen-4.0-ultra-generate-001"
  | "imagen-4.0-generate-001"
  | "imagen-4.0-fast-generate-001"
  | "imagen-3.0-generate-002";

const ALLOWED: ReadonlyArray<GoogleModel> = [
  "gemini-2.5-flash-image",
  "gemini-2.5-flash-image-preview",
  "imagen-4.0-ultra-generate-001",
  "imagen-4.0-generate-001",
  "imagen-4.0-fast-generate-001",
  "imagen-3.0-generate-002",
];

interface Body {
  model: GoogleModel;
  prompt: string;
  system?: string;
  aspectRatio?: "1:1" | "3:4" | "4:3" | "9:16" | "16:9";
}

interface GeminiPart {
  text?: string;
  inlineData?: { mimeType?: string; data?: string };
  inline_data?: { mime_type?: string; data?: string };
}
interface GeminiResp {
  candidates?: Array<{
    content?: { parts?: GeminiPart[] };
    finishReason?: string;
  }>;
  promptFeedback?: { blockReason?: string };
  error?: { message?: string; status?: string };
}
interface ImagenResp {
  predictions?: Array<{
    bytesBase64Encoded?: string;
    mimeType?: string;
    raiFilteredReason?: string;
  }>;
  error?: { message?: string; status?: string };
}

function sse(event: string, payload: unknown): string {
  return `event: ${event}\ndata: ${JSON.stringify(payload)}\n\n`;
}

function sseStream(b64: string): Response {
  const body = sse("image_generation.completed", {
    type: "image_generation.completed",
    b64_json: b64,
    created_at: Math.floor(Date.now() / 1000),
  });
  return new Response(body, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "x-acto-provider": "google-ai-studio",
    },
  });
}

function errJson(status: number, message: string, modelAttempted: string): Response {
  return new Response(
    JSON.stringify({ error: "upstream", status, model_attempted: modelAttempted, message }),
    { status, headers: { "Content-Type": "application/json" } },
  );
}

async function callGemini(model: GoogleModel, prompt: string, key: string): Promise<Response> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(key)}`;
  const upstream = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: { responseModalities: ["IMAGE", "TEXT"] },
    }),
  });
  const text = await upstream.text();
  if (!upstream.ok) {
    let msg = `Google AI Studio HTTP ${upstream.status}`;
    try {
      const j = JSON.parse(text) as GeminiResp;
      if (j.error?.message) msg = j.error.message;
    } catch {
      if (text) msg = `${msg} · ${text.slice(0, 240)}`;
    }
    return errJson(upstream.status, msg, model);
  }
  let data: GeminiResp;
  try {
    data = JSON.parse(text) as GeminiResp;
  } catch {
    return errJson(502, "Resposta Gemini não-JSON.", model);
  }
  if (data.promptFeedback?.blockReason) {
    return errJson(400, `Bloqueado: ${data.promptFeedback.blockReason}`, model);
  }
  const parts = data.candidates?.[0]?.content?.parts ?? [];
  for (const p of parts) {
    const inline = p.inlineData ?? p.inline_data;
    const b64 = inline?.data;
    if (b64) return sseStream(b64);
  }
  const reason = data.candidates?.[0]?.finishReason ?? "sem imagem na resposta";
  return errJson(502, `Gemini não devolveu imagem (${reason}).`, model);
}

async function callImagen(
  model: GoogleModel,
  prompt: string,
  aspect: Body["aspectRatio"],
  key: string,
): Promise<Response> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:predict?key=${encodeURIComponent(key)}`;
  const upstream = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      instances: [{ prompt }],
      parameters: { sampleCount: 1, aspectRatio: aspect ?? "1:1" },
    }),
  });
  const text = await upstream.text();
  if (!upstream.ok) {
    let msg = `Google AI Studio HTTP ${upstream.status}`;
    try {
      const j = JSON.parse(text) as ImagenResp;
      if (j.error?.message) msg = j.error.message;
    } catch {
      if (text) msg = `${msg} · ${text.slice(0, 240)}`;
    }
    return errJson(upstream.status, msg, model);
  }
  let data: ImagenResp;
  try {
    data = JSON.parse(text) as ImagenResp;
  } catch {
    return errJson(502, "Resposta Imagen não-JSON.", model);
  }
  const pred = data.predictions?.[0];
  if (pred?.raiFilteredReason) {
    return errJson(400, `Imagen filtrou: ${pred.raiFilteredReason}`, model);
  }
  const b64 = pred?.bytesBase64Encoded;
  if (!b64) return errJson(502, "Imagen não devolveu bytesBase64Encoded.", model);
  return sseStream(b64);
}

export const Route = createFileRoute("/api/generate-image-google")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const key = process.env.GOOGLE_AI_STUDIO_API_KEY;
        if (!key) {
          return new Response(
            JSON.stringify({
              error: "config",
              message: "GOOGLE_AI_STUDIO_API_KEY ausente. Adicione a chave nos Secrets.",
            }),
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

        const fullPrompt = parsed.system ? `${parsed.system}\n\n${parsed.prompt}` : parsed.prompt;

        if (parsed.model.startsWith("imagen-")) {
          return callImagen(parsed.model, fullPrompt, parsed.aspectRatio, key);
        }
        return callGemini(parsed.model, fullPrompt, key);
      },
    },
  },
});
