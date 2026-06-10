import { createParser } from "eventsource-parser";
import { flushSync } from "react-dom";

type ImageEventPayload =
  | {
      type: "image_generation.partial_image";
      b64_json: string;
      partial_image_index: number;
      created_at: number;
    }
  | {
      type: "image_generation.completed";
      b64_json: string;
      created_at: number;
      usage?: {
        input_tokens: number;
        output_tokens: number;
        total_tokens: number;
      };
    };

export interface StreamImageRequest {
  model: string;
  prompt: string;
  system?: string;
  size?: string;
  quality?: "low" | "medium" | "high";
}

export async function streamImage(
  endpoint: string,
  body: StreamImageRequest,
  onFrame: (dataUrl: string, isFinal: boolean, index: number) => void,
  signal?: AbortSignal,
): Promise<void> {
  const res = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal,
  });
  if (!res.ok || !res.body) {
    const txt = await res.text().catch(() => "");
    throw new Error(`HTTP ${res.status} ${txt}`);
  }

  let sawCompleted = false;
  let frameCount = 0;
  const parser = createParser({
    onEvent(event) {
      if (
        event.event !== "image_generation.partial_image" &&
        event.event !== "image_generation.completed"
      ) {
        return;
      }
      let payload: ImageEventPayload;
      try {
        payload = JSON.parse(event.data) as ImageEventPayload;
      } catch {
        return;
      }
      const isFinal = event.event === "image_generation.completed";
      const idx = frameCount++;
      flushSync(() => {
        onFrame(`data:image/png;base64,${payload.b64_json}`, isFinal, idx);
      });
      if (isFinal) sawCompleted = true;
    },
  });

  const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      parser.feed(value);
    }
  } finally {
    reader.cancel().catch(() => {});
  }
  if (!sawCompleted) {
    throw new Error("stream encerrou sem image_generation.completed");
  }
}
