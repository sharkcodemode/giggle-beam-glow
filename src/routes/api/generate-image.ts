import { createFileRoute } from "@tanstack/react-router";

/**
 * Backend FREE — Pollinations.ai
 * --------------------------------
 * Por que não Lovable AI Gateway: cobra crédito por imagem (gpt-image-2 ≈ $0.19,
 * gemini-flash-image ≈ $0.04) e o saldo do workspace zerou (HTTP 402).
 * Pollinations é endpoint público gratuito, sem auth, modelos Flux.
 *
 * Mantemos o MESMO contrato SSE que o cliente (`streamImage`) já entende:
 * emitimos um único evento `image_generation.completed` com `b64_json`.
 * Pollinations não tem partials — sem blur progressivo, mas zero custo.
 */

type ImageModel =
  | "pollinations/flux"
  | "pollinations/flux-realism"
  | "pollinations/flux-anime"
  | "pollinations/flux-3d"
  | "pollinations/turbo";

interface Body {
  model: ImageModel;
  prompt: string;
  system?: string;
  size?: string;
  quality?: "low" | "medium" | "high";
}

const ALLOWED: ReadonlyArray<ImageModel> = [
  "pollinations/flux",
  "pollinations/flux-realism",
  "pollinations/flux-anime",
  "pollinations/flux-3d",
  "pollinations/turbo",
];

// Fallback dentro do próprio Pollinations: se o modelo escolhido falhar,
// degrada para turbo (mais leve) e depois flux base.
const FALLBACK_CHAINS: Record<ImageModel, ReadonlyArray<ImageModel>> = {
  "pollinations/flux": ["pollinations/flux", "pollinations/turbo"],
  "pollinations/flux-realism": [
    "pollinations/flux-realism",
    "pollinations/flux",
    "pollinations/turbo",
  ],
  "pollinations/flux-anime": [
    "pollinations/flux-anime",
    "pollinations/flux",
    "pollinations/turbo",
  ],
  "pollinations/flux-3d": [
    "pollinations/flux-3d",
    "pollinations/flux",
    "pollinations/turbo",
  ],
  "pollinations/turbo": ["pollinations/turbo", "pollinations/flux"],
};

function parseSize(size?: string): { width: number; height: number } {
  if (!size) return { width: 1024, height: 1024 };
  const m = size.match(/^(\d{3,4})x(\d{3,4})$/);
  if (!m) return { width: 1024, height: 1024 };
  const w = Math.min(1536, Math.max(256, parseInt(m[1], 10)));
  const h = Math.min(1536, Math.max(256, parseInt(m[2], 10)));
  return { width: w, height: h };
}

function buildPollinationsUrl(model: ImageModel, b: Body): string {
  const id = model.split("/")[1] ?? "flux";
  const fullPrompt = b.system ? `${b.system}\n\n${b.prompt}` : b.prompt;
  const { width, height } = parseSize(b.size);
  const seed = Math.floor(Math.random() * 1_000_000);
  const params = new URLSearchParams({
    width: String(width),
    height: String(height),
    model: id,
    seed: String(seed),
    nologo: "true",
    enhance: "true",
    private: "true",
    safe: "false",
  });
  return `https://image.pollinations.ai/prompt/${encodeURIComponent(fullPrompt)}?${params.toString()}`;
}

function sseEvent(event: string, data: unknown): Uint8Array {
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  return new TextEncoder().encode(payload);
}

function bufferToBase64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let binary = "";
  const CHUNK = 0x8000;
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode.apply(
      null,
      Array.from(bytes.subarray(i, i + CHUNK)),
    );
  }
  // btoa exists in Workers/Edge
  return btoa(binary);
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

        const chain = FALLBACK_CHAINS[parsed.model] ?? [parsed.model];
        let lastStatus = 500;
        let lastModel: ImageModel = parsed.model;
        let imageBuffer: ArrayBuffer | null = null;

        for (let i = 0; i < chain.length; i++) {
          const m = chain[i];
          lastModel = m;
          const url = buildPollinationsUrl(m, parsed);
          try {
            const upstream = await fetch(url, {
              method: "GET",
              headers: { Accept: "image/png,image/jpeg,image/*" },
            });
            if (!upstream.ok) {
              lastStatus = upstream.status;
              continue;
            }
            imageBuffer = await upstream.arrayBuffer();
            if (imageBuffer.byteLength < 512) {
              // Pollinations às vezes devolve placeholder minúsculo em erro
              imageBuffer = null;
              lastStatus = 502;
              continue;
            }
            break;
          } catch {
            lastStatus = 502;
          }
        }

        if (!imageBuffer) {
          return new Response(
            JSON.stringify({
              error: "upstream_error",
              status: lastStatus,
              model_attempted: lastModel,
              message: `Pollinations.ai falhou (status ${lastStatus}). Tente outro modelo ou reformule o prompt.`,
            }),
            {
              status: lastStatus,
              headers: { "Content-Type": "application/json" },
            },
          );
        }

        const b64 = bufferToBase64(imageBuffer);
        const stream = new ReadableStream({
          start(controller) {
            controller.enqueue(
              sseEvent("image_generation.completed", {
                type: "image_generation.completed",
                b64_json: b64,
                created_at: Date.now(),
                model: lastModel,
              }),
            );
            controller.close();
          },
        });

        return new Response(stream, {
          headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
            Connection: "keep-alive",
            "x-acto-provider": "pollinations.ai",
            "x-acto-model-used": lastModel,
          },
        });
      },
    },
  },
});
