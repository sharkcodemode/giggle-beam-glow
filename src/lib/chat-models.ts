// Catálogo compartilhado entre /claude (console) e /chatmodelos (seletor).
// Modelos servidos pelo Lovable AI Gateway via edge claude-proxy.

export type ModelTone = "mint" | "cyan" | "violet" | "plasma";

export interface ChatModelSpec {
  id: string;
  label: string;
  tag: string;
  costPerMillion: number; // USD/1M tokens (média in+out)
  tone: ModelTone;
  provider: "google" | "openai";
}

export const CHAT_MODELS: ReadonlyArray<ChatModelSpec> = [
  { id: "google/gemini-2.5-flash-lite",  label: "Gemini 2.5 Flash Lite", tag: "RAPID",     costPerMillion: 0.4,  tone: "mint",   provider: "google" },
  { id: "google/gemini-3-flash-preview", label: "Gemini 3 Flash",        tag: "WORKHORSE", costPerMillion: 1.2,  tone: "cyan",   provider: "google" },
  { id: "google/gemini-3.5-flash",       label: "Gemini 3.5 Flash",      tag: "BALANCED",  costPerMillion: 2.0,  tone: "cyan",   provider: "google" },
  { id: "google/gemini-2.5-pro",         label: "Gemini 2.5 Pro",        tag: "DEEP",      costPerMillion: 7.0,  tone: "violet", provider: "google" },
  { id: "google/gemini-3.1-pro-preview", label: "Gemini 3.1 Pro",        tag: "PREVIEW",   costPerMillion: 10.0, tone: "violet", provider: "google" },
  { id: "openai/gpt-5-mini",             label: "GPT-5 Mini",            tag: "EFFICIENT", costPerMillion: 3.0,  tone: "cyan",   provider: "openai" },
  { id: "openai/gpt-5",                  label: "GPT-5",                 tag: "PREMIUM",   costPerMillion: 15.0, tone: "plasma", provider: "openai" },
  { id: "openai/gpt-5.5",                label: "GPT-5.5",               tag: "FRONTIER",  costPerMillion: 25.0, tone: "plasma", provider: "openai" },
  { id: "openai/gpt-5.5-pro",            label: "GPT-5.5 Pro",           tag: "APEX",      costPerMillion: 40.0, tone: "plasma", provider: "openai" },
];

export const DEFAULT_CHAT_MODEL_ID: string = "google/gemini-3-flash-preview";

const STORAGE_KEY = "chatmodelos:default";

export function getStoredChatModelId(): string {
  if (typeof window === "undefined") return DEFAULT_CHAT_MODEL_ID;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_CHAT_MODEL_ID;
    if (CHAT_MODELS.some((m) => m.id === raw)) return raw;
    return DEFAULT_CHAT_MODEL_ID;
  } catch {
    return DEFAULT_CHAT_MODEL_ID;
  }
}

export function setStoredChatModelId(id: string): void {
  if (typeof window === "undefined") return;
  if (!CHAT_MODELS.some((m) => m.id === id)) return;
  try {
    window.localStorage.setItem(STORAGE_KEY, id);
  } catch {
    // storage indisponível — ignora
  }
}

export function findChatModel(id: string): ChatModelSpec {
  return CHAT_MODELS.find((m) => m.id === id) ?? CHAT_MODELS[1];
}

export function toneClasses(tone: ModelTone): string {
  switch (tone) {
    case "mint":   return "text-[oklch(0.86_0.21_158)] border-[oklch(0.86_0.21_158/0.4)]";
    case "cyan":   return "text-[oklch(0.84_0.16_210)] border-[oklch(0.84_0.16_210/0.4)]";
    case "violet": return "text-[oklch(0.68_0.24_295)] border-[oklch(0.68_0.24_295/0.4)]";
    case "plasma": return "text-[oklch(0.72_0.28_335)] border-[oklch(0.72_0.28_335/0.4)]";
  }
}
