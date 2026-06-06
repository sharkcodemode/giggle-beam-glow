// Catálogo curado dos modelos disponíveis no Lovable AI Gateway.
// Fonte: knowledge base AI Gateway (only models routed through ai.gateway.lovable.dev).
// Mantém apenas modelos de chat — imagem/embeddings ficam fora.

export type ModelTier = "flagship" | "standard" | "fast";
export type ModelProvider = "anthropic" | "openai" | "google";

export interface ModelInfo {
  id: string;          // Ex.: "anthropic/claude-4.5-opus"
  label: string;       // Nome curto pra UI
  provider: ModelProvider;
  tier: ModelTier;
  description: string; // ≤ 90 chars, densidade técnica
  preview?: boolean;
}

export const MODEL_CATALOG: ModelInfo[] = [
  // ───── FLAGSHIP (top de linha) ─────
  {
    id: "anthropic/claude-4.5-opus",
    label: "Claude 4.5 Opus",
    provider: "anthropic",
    tier: "flagship",
    description: "Anthropic top — raciocínio profundo, código complexo, contexto longo.",
  },
  {
    id: "openai/gpt-5.5-pro",
    label: "GPT-5.5 Pro",
    provider: "openai",
    tier: "flagship",
    description: "OpenAI premium — extended reasoning, problemas mais difíceis.",
  },
  {
    id: "openai/gpt-5.5",
    label: "GPT-5.5",
    provider: "openai",
    tier: "flagship",
    description: "State-of-the-art OpenAI — coding, reasoning, instruction following.",
  },
  {
    id: "google/gemini-3.1-pro-preview",
    label: "Gemini 3.1 Pro",
    provider: "google",
    tier: "flagship",
    description: "Google next-gen reasoning preview.",
    preview: true,
  },

  // ───── STANDARD (alta qualidade, custo médio) ─────
  {
    id: "anthropic/claude-4.5-sonnet",
    label: "Claude 4.5 Sonnet",
    provider: "anthropic",
    tier: "standard",
    description: "Claude balanceado — custo/qualidade abaixo do Opus.",
  },
  {
    id: "openai/gpt-5.4-pro",
    label: "GPT-5.4 Pro",
    provider: "openai",
    tier: "standard",
    description: "GPT-5.4 premium — reasoning estendido pra tarefas complexas.",
  },
  {
    id: "openai/gpt-5.4",
    label: "GPT-5.4",
    provider: "openai",
    tier: "standard",
    description: "Reasoning multi-step, geração de código e análise.",
  },
  {
    id: "openai/gpt-5",
    label: "GPT-5",
    provider: "openai",
    tier: "standard",
    description: "All-rounder OpenAI — multimodal, long context, accuracy.",
  },
  {
    id: "openai/gpt-5.2",
    label: "GPT-5.2",
    provider: "openai",
    tier: "standard",
    description: "Reasoning aprimorado pra problem-solving complexo.",
  },
  {
    id: "google/gemini-2.5-pro",
    label: "Gemini 2.5 Pro",
    provider: "google",
    tier: "standard",
    description: "Gemini estável top — multimodal + reasoning + big context.",
  },
  {
    id: "google/gemini-3.1-flash-lite-preview",
    label: "Gemini 3.1 Flash Lite",
    provider: "google",
    tier: "standard",
    description: "Gemini 3.1 preview cost-efficient — chat/classify/extract.",
    preview: true,
  },
  {
    id: "google/gemini-3-flash-preview",
    label: "Gemini 3 Flash",
    provider: "google",
    tier: "standard",
    description: "Next-gen Google rápido — balanço velocidade e capacidade.",
    preview: true,
  },

  // ───── FAST (custo baixo, latência baixa) ─────
  {
    id: "openai/gpt-5.4-mini",
    label: "GPT-5.4 Mini",
    provider: "openai",
    tier: "fast",
    description: "GPT-5.4 menor — balance reasoning vs custo.",
  },
  {
    id: "openai/gpt-5.4-nano",
    label: "GPT-5.4 Nano",
    provider: "openai",
    tier: "fast",
    description: "GPT-5.4 mais rápido — high-volume / latency-sensitive.",
  },
  {
    id: "openai/gpt-5-mini",
    label: "GPT-5 Mini",
    provider: "openai",
    tier: "fast",
    description: "Meio-termo — custo/latência baixos, multimodal mantido.",
  },
  {
    id: "openai/gpt-5-nano",
    label: "GPT-5 Nano",
    provider: "openai",
    tier: "fast",
    description: "OpenAI mais barato — high-volume e tarefas simples.",
  },
  {
    id: "google/gemini-3.5-flash",
    label: "Gemini 3.5 Flash",
    provider: "google",
    tier: "fast",
    description: "High-efficiency Gemini 3.5 — coding/reasoning rápido.",
  },
  {
    id: "google/gemini-2.5-flash",
    label: "Gemini 2.5 Flash",
    provider: "google",
    tier: "fast",
    description: "Gemini balanceado — multimodal + reasoning custo médio.",
  },
  {
    id: "google/gemini-2.5-flash-lite",
    label: "Gemini 2.5 Flash Lite",
    provider: "google",
    tier: "fast",
    description: "Mais rápido e barato da família Gemini 2.5.",
  },
];

export const TIER_LABEL: Record<ModelTier, string> = {
  flagship: "TOP DE LINHA",
  standard: "PADRÃO",
  fast: "RÁPIDOS",
};

export const TIER_ORDER: ModelTier[] = ["flagship", "standard", "fast"];

export const PROVIDER_LABEL: Record<ModelProvider, string> = {
  anthropic: "Anthropic",
  openai: "OpenAI",
  google: "Google",
};

export const DEFAULT_CHAIN: readonly string[] = [
  "anthropic/claude-4.5-opus",
  "anthropic/claude-4.5-sonnet",
  "openai/gpt-5.5-pro",
  "openai/gpt-5.5",
  "google/gemini-3.1-pro-preview",
  "google/gemini-2.5-pro",
];

export const ALL_MODEL_IDS = new Set(MODEL_CATALOG.map((m) => m.id));

export function isValidModelId(id: string): boolean {
  return ALL_MODEL_IDS.has(id);
}

export function getModelInfo(id: string): ModelInfo | undefined {
  return MODEL_CATALOG.find((m) => m.id === id);
}
