// Catálogo do sistema RAG — modelos de embedding (3072 dims, fixo no schema)
// e configuração de chunking.

import { CHAT_MODELS, type ChatModelSpec } from "./chat-models";

export interface EmbeddingModelSpec {
  id: string;
  label: string;
  provider: "google" | "openai";
  dims: 3072;
  notes: string;
}

// Apenas modelos que produzem nativamente (ou podem ser truncados pra) 3072 dims
// — para casar com `vector(3072)` em rag_chunks.
export const EMBEDDING_MODELS: ReadonlyArray<EmbeddingModelSpec> = [
  {
    id: "google/gemini-embedding-001",
    label: "Gemini Embedding 001",
    provider: "google",
    dims: 3072,
    notes: "Default. Forte em PT-BR + EN, multilingual.",
  },
  {
    id: "google/gemini-embedding-2-preview",
    label: "Gemini Embedding 2 (preview)",
    provider: "google",
    dims: 3072,
    notes: "Próxima geração Google. Em preview.",
  },
  {
    id: "openai/text-embedding-3-large",
    label: "OpenAI text-embedding-3-large",
    provider: "openai",
    dims: 3072,
    notes: "Alta qualidade de retrieval, mais caro.",
  },
];

export const DEFAULT_EMBEDDING_MODEL_ID: string = "google/gemini-embedding-001";

export const EMBEDDING_MODEL_IDS: ReadonlySet<string> = new Set(
  EMBEDDING_MODELS.map((m) => m.id),
);

export function findEmbeddingModel(id: string): EmbeddingModelSpec {
  return EMBEDDING_MODELS.find((m) => m.id === id) ?? EMBEDDING_MODELS[0];
}

// Reexport pra UI usar mesma fonte de modelos de chat (gateway).
export { CHAT_MODELS };
export type { ChatModelSpec };

// =====================================================
// CHUNKING
// =====================================================
export const CHUNK_SIZE = 1200; // chars
export const CHUNK_OVERLAP = 200;
export const MAX_DOC_CHARS = 80_000; // ~64 chunks
export const MAX_TITLE_LEN = 160;
export const MAX_QUERY_LEN = 2_000;
export const DEFAULT_TOP_K = 5;
export const MAX_TOP_K = 12;

export function chunkText(input: string): string[] {
  const clean = input.replace(/\r\n/g, "\n").trim();
  if (clean.length === 0) return [];
  if (clean.length <= CHUNK_SIZE) return [clean];

  const chunks: string[] = [];
  let i = 0;
  while (i < clean.length) {
    const end = Math.min(i + CHUNK_SIZE, clean.length);
    const slice = clean.slice(i, end);
    chunks.push(slice);
    if (end >= clean.length) break;
    i = end - CHUNK_OVERLAP;
    if (i < 0) i = 0;
  }
  return chunks;
}
