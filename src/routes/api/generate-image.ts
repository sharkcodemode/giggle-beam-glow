import { createFileRoute } from "@tanstack/react-router";

type ImageModel =
  | "openai/gpt-image-2"
  | "openai/gpt-image-1-mini"
  | "google/gemini-2.5-flash-image"
  | "google/gemini-3-pro-image-preview"
  | "google/gemini-3.1-flash-image-preview";

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
  "google/gemini-2.5-flash-image",
  "google/gemini-3-pro-image-preview",
  "google/gemini-3.1-flash-image-preview",
];

function buildBody(b: Body): Record<string, unknown> {
  const isOpenAI = b.model.startsWith("openai/");
  const fullPrompt = b.system ? `${b.system}\n\n---\n\n${b.prompt}` : b.prompt;

  if (isOpenAI) {
    return {
      model: b.model,
      prompt: fullPrompt,
      size: b.size ?? "1024x1024",
      quality: b.quality ?? "low",
      n: 1,
      stream: true,
      partial_images: 1,
    };
  }
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

        const upstream = await fetch(
          "https://ai.gateway.lovable.dev/v1/images/generations",
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${key}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify(buildBody(parsed)),
          },
        );

        if (!upstream.ok || !upstream.body) {
          const text = await upstream.text().catch(() => "");
          return new Response(text || "upstream error", {
            status: upstream.status,
          });
        }

        return new Response(upstream.body, {
          headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
            Connection: "keep-alive",
          },
        });
      },
    },
  },
});
