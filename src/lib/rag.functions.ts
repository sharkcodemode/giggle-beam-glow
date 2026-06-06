import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import {
  CHUNK_SIZE,
  DEFAULT_EMBEDDING_MODEL_ID,
  DEFAULT_TOP_K,
  EMBEDDING_MODEL_IDS,
  MAX_DOC_CHARS,
  MAX_QUERY_LEN,
  MAX_TITLE_LEN,
  MAX_TOP_K,
  chunkText,
} from "./rag.catalog";
import { CHAT_MODELS } from "./chat-models";

// =====================================================
// ENV
// =====================================================
function getSupabaseEnv(): { url: string; key: string } {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase server env ausente.");
  return { url, key };
}

function getLovableKey(): string {
  const k = process.env.LOVABLE_API_KEY;
  if (!k) throw new Error("LOVABLE_API_KEY ausente no servidor.");
  return k;
}

function getMasterSecret(): string {
  const s = process.env.ACTO_MASTER_SECRET;
  if (!s) throw new Error("ACTO_MASTER_SECRET não configurado.");
  return s;
}

function assertPasscode(input: string): void {
  if (input !== getMasterSecret()) {
    throw new Error("Passcode inválido.");
  }
}

// =====================================================
// SCHEMAS
// =====================================================
const ChatModelIdSet: ReadonlySet<string> = new Set(CHAT_MODELS.map((m) => m.id));

const EmbeddingModelIdSchema = z
  .string()
  .min(3)
  .max(120)
  .refine((v) => EMBEDDING_MODEL_IDS.has(v), "modelo de embedding inválido");

const ChatModelIdSchema = z
  .string()
  .min(3)
  .max(120)
  .refine((v) => ChatModelIdSet.has(v), "modelo de chat inválido");

const IngestSchema = z.object({
  passcode: z.string().min(1).max(512),
  title: z.string().min(1).max(MAX_TITLE_LEN),
  source: z.string().max(512).optional().nullable(),
  content: z.string().min(20).max(MAX_DOC_CHARS),
  embedding_model: EmbeddingModelIdSchema.optional(),
});

const DeleteSchema = z.object({
  passcode: z.string().min(1).max(512),
  id: z.string().uuid(),
});

const ChatSchema = z.object({
  query: z.string().min(1).max(MAX_QUERY_LEN),
  top_k: z.number().int().min(1).max(MAX_TOP_K).optional(),
  embedding_model: EmbeddingModelIdSchema.optional(),
  chat_model: ChatModelIdSchema,
  history: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().min(1).max(8_000),
      }),
    )
    .max(20)
    .optional(),
});

// =====================================================
// SUPABASE REST helpers
// =====================================================
async function sbFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const { url, key } = getSupabaseEnv();
  const headers = new Headers(init.headers);
  headers.set("apikey", key);
  headers.set("Authorization", `Bearer ${key}`);
  if (!headers.has("Accept")) headers.set("Accept", "application/json");
  return fetch(`${url}${path}`, { ...init, headers });
}

// =====================================================
// LOVABLE GATEWAY — embeddings
// =====================================================
async function embedTexts(model: string, inputs: string[]): Promise<number[][]> {
  const apiKey = getLovableKey();
  const out: number[][] = [];

  // Chama um por um pra simplificar (alguns providers via gateway aceitam só string).
  for (const input of inputs) {
    const res = await fetch("https://ai.gateway.lovable.dev/v1/embeddings", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ model, input }),
    });
    if (!res.ok) {
      const txt = await res.text();
      throw new Error(`Embedding falhou (${res.status}): ${txt.slice(0, 300)}`);
    }
    const json = (await res.json()) as {
      data?: Array<{ embedding?: number[] }>;
    };
    const vec = json.data?.[0]?.embedding;
    if (!Array.isArray(vec) || vec.length === 0) {
      throw new Error("Resposta de embedding vazia.");
    }
    if (vec.length !== 3072) {
      throw new Error(
        `Embedding com dimensão ${vec.length}, esperado 3072 (modelo: ${model}).`,
      );
    }
    out.push(vec);
  }

  return out;
}

function vecToPgLiteral(v: number[]): string {
  // pgvector aceita string "[0.1,0.2,...]" como literal de vector
  return `[${v.join(",")}]`;
}

// =====================================================
// LISTAR DOCUMENTOS
// =====================================================
export interface RagDocSummary {
  id: string;
  title: string;
  source: string | null;
  embedding_model: string;
  chunk_count: number;
  created_at: string;
  updated_at: string;
}

export const ragListDocs = createServerFn({ method: "GET" }).handler(
  async (): Promise<RagDocSummary[]> => {
    const res = await sbFetch(
      "/rest/v1/rag_documents?select=id,title,source,embedding_model,chunk_count,created_at,updated_at&order=created_at.desc&limit=200",
    );
    if (!res.ok) {
      throw new Error(`Falha ao listar docs (${res.status}).`);
    }
    return (await res.json()) as RagDocSummary[];
  },
);

// =====================================================
// INGEST
// =====================================================
export const ragIngestDoc = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => IngestSchema.parse(input))
  .handler(async ({ data }): Promise<RagDocSummary> => {
    assertPasscode(data.passcode);

    const model = data.embedding_model ?? DEFAULT_EMBEDDING_MODEL_ID;
    const chunks = chunkText(data.content);
    if (chunks.length === 0) throw new Error("Conteúdo vazio após normalização.");
    if (chunks.length > 80) {
      throw new Error(
        `Documento gerou ${chunks.length} chunks (limite 80). Reduza o conteúdo (~${CHUNK_SIZE * 80} chars).`,
      );
    }

    // 1) cria documento
    const insertDocRes = await sbFetch("/rest/v1/rag_documents", {
      method: "POST",
      headers: { "Content-Type": "application/json", Prefer: "return=representation" },
      body: JSON.stringify({
        title: data.title.trim(),
        source: data.source?.trim() || null,
        embedding_model: model,
        chunk_count: 0,
      }),
    });
    if (!insertDocRes.ok) {
      const t = await insertDocRes.text();
      throw new Error(`Falha ao criar documento (${insertDocRes.status}): ${t.slice(0, 200)}`);
    }
    const [doc] = (await insertDocRes.json()) as RagDocSummary[];
    if (!doc) throw new Error("Documento não retornado pela criação.");

    // 2) embeddings (sequencial — gateway 1 input/req)
    let vectors: number[][];
    try {
      vectors = await embedTexts(model, chunks);
    } catch (e) {
      // rollback
      await sbFetch(`/rest/v1/rag_documents?id=eq.${doc.id}`, { method: "DELETE" });
      throw e;
    }

    // 3) insert chunks em batch
    const payload = chunks.map((content, i) => ({
      document_id: doc.id,
      idx: i,
      content,
      embedding: vecToPgLiteral(vectors[i]),
    }));

    const insertChunksRes = await sbFetch("/rest/v1/rag_chunks", {
      method: "POST",
      headers: { "Content-Type": "application/json", Prefer: "return=minimal" },
      body: JSON.stringify(payload),
    });
    if (!insertChunksRes.ok) {
      const t = await insertChunksRes.text();
      await sbFetch(`/rest/v1/rag_documents?id=eq.${doc.id}`, { method: "DELETE" });
      throw new Error(
        `Falha ao gravar chunks (${insertChunksRes.status}): ${t.slice(0, 250)}`,
      );
    }

    // 4) atualiza chunk_count
    const patchRes = await sbFetch(`/rest/v1/rag_documents?id=eq.${doc.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Prefer: "return=representation" },
      body: JSON.stringify({ chunk_count: chunks.length }),
    });
    if (!patchRes.ok) {
      throw new Error("Documento criado, mas chunk_count não atualizou.");
    }
    const [updated] = (await patchRes.json()) as RagDocSummary[];
    return updated ?? { ...doc, chunk_count: chunks.length };
  });

// =====================================================
// DELETE
// =====================================================
export const ragDeleteDoc = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => DeleteSchema.parse(input))
  .handler(async ({ data }): Promise<{ ok: true; id: string }> => {
    assertPasscode(data.passcode);
    const res = await sbFetch(`/rest/v1/rag_documents?id=eq.${data.id}`, {
      method: "DELETE",
    });
    if (!res.ok && res.status !== 204) {
      throw new Error(`Falha ao apagar (${res.status}).`);
    }
    return { ok: true, id: data.id };
  });

// =====================================================
// CHAT RAG (non-streaming — server fn retorna DTO)
// =====================================================
export interface RagChatMatch {
  id: string;
  document_id: string;
  document_title: string;
  idx: number;
  content: string;
  similarity: number;
}

export interface RagChatResult {
  answer: string;
  matches: RagChatMatch[];
  model_used: string;
  embedding_model_used: string;
  prompt_tokens_est: number;
}

export const ragChat = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => ChatSchema.parse(input))
  .handler(async ({ data }): Promise<RagChatResult> => {
    const embeddingModel = data.embedding_model ?? DEFAULT_EMBEDDING_MODEL_ID;
    const topK = data.top_k ?? DEFAULT_TOP_K;

    // 1) embed query
    const [queryVec] = await embedTexts(embeddingModel, [data.query]);

    // 2) match via RPC
    const rpcRes = await sbFetch("/rest/v1/rpc/match_rag_chunks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query_embedding: vecToPgLiteral(queryVec),
        match_count: topK,
      }),
    });
    if (!rpcRes.ok) {
      const t = await rpcRes.text();
      throw new Error(`Falha em match_rag_chunks (${rpcRes.status}): ${t.slice(0, 200)}`);
    }
    const matches = (await rpcRes.json()) as RagChatMatch[];

    if (matches.length === 0) {
      return {
        answer:
          "Nenhum documento foi indexado ainda. Adicione conteúdo em INGESTÃO antes de perguntar.",
        matches: [],
        model_used: data.chat_model,
        embedding_model_used: embeddingModel,
        prompt_tokens_est: 0,
      };
    }

    // 3) montar prompt
    const contextBlock = matches
      .map(
        (m, i) =>
          `[Fonte ${i + 1} · "${m.document_title}" · chunk ${m.idx} · sim ${m.similarity.toFixed(3)}]\n${m.content}`,
      )
      .join("\n\n---\n\n");

    const system = `Você é um assistente RAG. Responda APENAS com base nos trechos abaixo.
Se a resposta não estiver nos trechos, diga: "não encontrei essa informação nos documentos indexados".
Cite as fontes no formato [Fonte N] quando usar conteúdo de um trecho.
Estilo: PT-BR, denso, técnico, anti-marketês.

CONTEXTO RECUPERADO:
${contextBlock}`;

    const history = data.history ?? [];

    // 4) chamar gateway de chat (non-stream)
    const apiKey = getLovableKey();
    const chatRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: data.chat_model,
        messages: [
          { role: "system", content: system },
          ...history,
          { role: "user", content: data.query },
        ],
        temperature: 0.3,
        max_completion_tokens: 2048,
      }),
    });

    if (!chatRes.ok) {
      const t = await chatRes.text();
      throw new Error(`Chat falhou (${chatRes.status}): ${t.slice(0, 250)}`);
    }
    const chatJson = (await chatRes.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const answer = chatJson.choices?.[0]?.message?.content ?? "(resposta vazia)";

    const promptChars =
      system.length + history.reduce((a, m) => a + m.content.length, 0) + data.query.length;
    const promptTokensEst = Math.ceil(promptChars / 4);

    return {
      answer,
      matches,
      model_used: data.chat_model,
      embedding_model_used: embeddingModel,
      prompt_tokens_est: promptTokensEst,
    };
  });
