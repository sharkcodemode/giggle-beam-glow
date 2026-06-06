import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import {
  ArrowLeft,
  ArrowUp,
  Check,
  Database,
  FileText,
  Loader2,
  MessageSquare,
  Quote,
  Trash2,
  X,
} from "lucide-react";
import {
  CHAT_MODELS,
  type ChatModelSpec,
} from "@/lib/chat-models";
import {
  DEFAULT_EMBEDDING_MODEL_ID,
  EMBEDDING_MODELS,
  MAX_DOC_CHARS,
  MAX_QUERY_LEN,
  MAX_TITLE_LEN,
  type EmbeddingModelSpec,
} from "@/lib/rag.catalog";
import {
  ragChat,
  ragDeleteDoc,
  ragIngestDoc,
  ragListDocs,
  type RagChatMatch,
  type RagDocSummary,
} from "@/lib/rag.functions";

export const Route = createFileRoute("/ragmodelos")({
  head: () => ({
    meta: [
      { title: "RAGMODELOS — Console RAG · Obsidian Aurora" },
      {
        name: "description",
        content:
          "RAG de verdade: ingestão por chunks com embeddings (Gemini/OpenAI), busca vetorial pgvector e chat com citação de fontes. Seletor de modelo de embedding + modelo de chat.",
      },
      { property: "og:title", content: "RAGMODELOS — Console RAG" },
      {
        property: "og:description",
        content:
          "Indexe documentos, faça perguntas, receba respostas com fontes recuperadas via pgvector.",
      },
    ],
  }),
  component: RagModelosPage,
  errorComponent: ({ error, reset }) => (
    <div className="min-h-screen flex items-center justify-center bg-[var(--obsidian)] text-[var(--bone)] p-8">
      <div className="max-w-md text-center space-y-3 font-[Space_Grotesk]">
        <p className="text-xs tracking-[0.3em] text-aurora">// RAG DERRUBADO</p>
        <p className="text-sm opacity-70">{error.message}</p>
        <button
          type="button"
          onClick={() => reset()}
          className="mt-4 text-xs underline opacity-80 hover:opacity-100"
        >
          tentar de novo
        </button>
      </div>
    </div>
  ),
  notFoundComponent: () => (
    <div className="min-h-screen flex items-center justify-center bg-[var(--obsidian)] text-[var(--bone)]">
      <p className="text-xs tracking-[0.3em] opacity-60">// 404 · ragmodelos</p>
    </div>
  ),
});

const STORAGE_PASSCODE = "ragmodelos:passcode";
const STORAGE_EMB = "ragmodelos:embedding_model";
const STORAGE_CHAT = "ragmodelos:chat_model";

type Toast = { kind: "ok" | "err"; msg: string } | null;

type ChatTurn = {
  id: string;
  role: "user" | "assistant";
  content: string;
  matches?: RagChatMatch[];
  model?: string;
  embedding?: string;
};

const newId = (): string =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

function loadStr(key: string, fallback: string): string {
  if (typeof window === "undefined") return fallback;
  try {
    return window.localStorage.getItem(key) ?? fallback;
  } catch {
    return fallback;
  }
}
function saveStr(key: string, val: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, val);
  } catch {
    /* noop */
  }
}

function RagModelosPage() {
  const fetchList = useServerFn(ragListDocs);
  const callIngest = useServerFn(ragIngestDoc);
  const callDelete = useServerFn(ragDeleteDoc);
  const callChat = useServerFn(ragChat);

  // configs
  const [passcode, setPasscode] = useState<string>("");
  const [embeddingModel, setEmbeddingModel] = useState<string>(DEFAULT_EMBEDDING_MODEL_ID);
  const [chatModel, setChatModel] = useState<string>(CHAT_MODELS[1].id);

  // ingest form
  const [title, setTitle] = useState<string>("");
  const [source, setSource] = useState<string>("");
  const [content, setContent] = useState<string>("");
  const [ingesting, setIngesting] = useState<boolean>(false);

  // list
  const [docs, setDocs] = useState<RagDocSummary[]>([]);
  const [loadingDocs, setLoadingDocs] = useState<boolean>(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // chat
  const [turns, setTurns] = useState<ReadonlyArray<ChatTurn>>([]);
  const [query, setQuery] = useState<string>("");
  const [asking, setAsking] = useState<boolean>(false);
  const [topK, setTopK] = useState<number>(5);

  // misc
  const [toast, setToast] = useState<Toast>(null);
  const chatScrollRef = useRef<HTMLDivElement>(null);

  // init
  useEffect(() => {
    setPasscode(loadStr(STORAGE_PASSCODE, ""));
    setEmbeddingModel(loadStr(STORAGE_EMB, DEFAULT_EMBEDDING_MODEL_ID));
    setChatModel(loadStr(STORAGE_CHAT, CHAT_MODELS[1].id));
  }, []);

  useEffect(() => saveStr(STORAGE_PASSCODE, passcode), [passcode]);
  useEffect(() => saveStr(STORAGE_EMB, embeddingModel), [embeddingModel]);
  useEffect(() => saveStr(STORAGE_CHAT, chatModel), [chatModel]);

  useEffect(() => {
    if (!chatScrollRef.current) return;
    chatScrollRef.current.scrollTo({
      top: chatScrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [turns]);

  // toast auto-dismiss
  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 5000);
    return () => window.clearTimeout(t);
  }, [toast]);

  const reloadDocs = useCallback(async (): Promise<void> => {
    setLoadingDocs(true);
    try {
      const list = await fetchList();
      setDocs(list);
    } catch (e) {
      setToast({ kind: "err", msg: (e as Error).message });
    } finally {
      setLoadingDocs(false);
    }
  }, [fetchList]);

  useEffect(() => {
    void reloadDocs();
  }, [reloadDocs]);

  const currentEmb = useMemo<EmbeddingModelSpec>(
    () => EMBEDDING_MODELS.find((m) => m.id === embeddingModel) ?? EMBEDDING_MODELS[0],
    [embeddingModel],
  );
  const currentChat = useMemo<ChatModelSpec>(
    () => CHAT_MODELS.find((m) => m.id === chatModel) ?? CHAT_MODELS[1],
    [chatModel],
  );

  const totalChunks = useMemo<number>(
    () => docs.reduce((a, d) => a + (d.chunk_count ?? 0), 0),
    [docs],
  );

  const handleIngest = async (): Promise<void> => {
    if (ingesting) return;
    if (!passcode.trim()) {
      setToast({ kind: "err", msg: "Informe o passcode (ACTO_MASTER_SECRET)." });
      return;
    }
    if (!title.trim() || content.trim().length < 20) {
      setToast({ kind: "err", msg: "Título e conteúdo ≥ 20 caracteres." });
      return;
    }
    setIngesting(true);
    try {
      const doc = await callIngest({
        data: {
          passcode,
          title: title.trim(),
          source: source.trim() || null,
          content,
          embedding_model: embeddingModel,
        },
      });
      setTitle("");
      setSource("");
      setContent("");
      setToast({
        kind: "ok",
        msg: `Indexado: "${doc.title}" (${doc.chunk_count} chunks).`,
      });
      void reloadDocs();
    } catch (e) {
      setToast({ kind: "err", msg: (e as Error).message });
    } finally {
      setIngesting(false);
    }
  };

  const handleDelete = async (id: string): Promise<void> => {
    if (!passcode.trim()) {
      setToast({ kind: "err", msg: "Passcode obrigatório pra deletar." });
      return;
    }
    setDeletingId(id);
    try {
      await callDelete({ data: { passcode, id } });
      setDocs((prev) => prev.filter((d) => d.id !== id));
      setToast({ kind: "ok", msg: "Documento removido." });
    } catch (e) {
      setToast({ kind: "err", msg: (e as Error).message });
    } finally {
      setDeletingId(null);
    }
  };

  const handleAsk = async (): Promise<void> => {
    const q = query.trim();
    if (!q || asking) return;
    const userTurn: ChatTurn = { id: newId(), role: "user", content: q };
    setTurns((prev) => [...prev, userTurn]);
    setQuery("");
    setAsking(true);

    // history em formato simples
    const history = [...turns, userTurn]
      .slice(-10)
      .filter((t) => t.role === "user" || t.role === "assistant")
      .slice(0, -1) // sem a pergunta atual (vai como query)
      .map((t) => ({ role: t.role, content: t.content }));

    try {
      const res = await callChat({
        data: {
          query: q,
          top_k: topK,
          chat_model: chatModel,
          embedding_model: embeddingModel,
          history,
        },
      });
      const aiTurn: ChatTurn = {
        id: newId(),
        role: "assistant",
        content: res.answer,
        matches: res.matches,
        model: res.model_used,
        embedding: res.embedding_model_used,
      };
      setTurns((prev) => [...prev, aiTurn]);
    } catch (e) {
      const errTurn: ChatTurn = {
        id: newId(),
        role: "assistant",
        content: `// erro: ${(e as Error).message}`,
      };
      setTurns((prev) => [...prev, errTurn]);
    } finally {
      setAsking(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>): void => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void handleAsk();
    }
  };

  const contentLen = content.length;
  const contentOver = contentLen > MAX_DOC_CHARS;

  return (
    <main className="min-h-screen bg-[var(--obsidian)] text-[var(--bone)] grain">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-10 py-8 sm:py-12">
        {/* HEADER */}
        <header className="flex flex-wrap items-end justify-between gap-4 mb-10">
          <div className="space-y-2">
            <Link
              to="/"
              className="font-mono text-[10px] tracking-[0.3em] opacity-60 hover:opacity-100 transition inline-flex items-center gap-1.5"
            >
              <ArrowLeft className="size-3" aria-hidden /> HOME
            </Link>
            <h1 className="font-[Instrument_Serif] text-5xl sm:text-7xl leading-[0.95] italic">
              <span className="text-aurora">ragmodelos</span>
              <span className="opacity-40">.</span>
            </h1>
            <p className="font-mono text-[11px] tracking-[0.2em] opacity-60 max-w-xl">
              RAG REAL · PGVECTOR(3072) · CHUNKING · EMBED VIA GATEWAY · CITAÇÃO DE FONTES
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Link
              to="/chatmodelos"
              className="font-mono text-[10px] tracking-[0.25em] px-3 py-2 border border-[var(--bone)]/20 hover:border-[var(--bone)]/60 transition"
            >
              CHAT PURO
            </Link>
            <Link
              to="/modelos"
              className="font-mono text-[10px] tracking-[0.25em] px-3 py-2 border border-[var(--bone)]/20 hover:border-[var(--bone)]/60 transition"
            >
              CADEIA ACTO
            </Link>
          </div>
        </header>

        {/* CONFIG GLOBAL */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-3 mb-10">
          <ConfigCard label="PASSCODE">
            <input
              type="password"
              value={passcode}
              onChange={(e) => setPasscode(e.target.value)}
              placeholder="ACTO_MASTER_SECRET"
              className="w-full bg-transparent border border-[var(--bone)]/15 px-3 py-2 font-mono text-xs focus:border-[var(--bone)]/60 outline-none"
              aria-label="Passcode do servidor"
            />
            <p className="font-mono text-[9px] opacity-50 mt-1">
              persistido local · necessário p/ ingerir/apagar
            </p>
          </ConfigCard>

          <ConfigCard label="EMBEDDING MODEL">
            <select
              value={embeddingModel}
              onChange={(e) => setEmbeddingModel(e.target.value)}
              className="w-full bg-[var(--obsidian)] border border-[var(--bone)]/15 px-3 py-2 font-mono text-xs focus:border-[var(--bone)]/60 outline-none"
              aria-label="Modelo de embedding"
            >
              {EMBEDDING_MODELS.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.label} · {m.dims}d
                </option>
              ))}
            </select>
            <p className="font-mono text-[9px] opacity-50 mt-1 truncate">{currentEmb.notes}</p>
          </ConfigCard>

          <ConfigCard label="CHAT MODEL">
            <select
              value={chatModel}
              onChange={(e) => setChatModel(e.target.value)}
              className="w-full bg-[var(--obsidian)] border border-[var(--bone)]/15 px-3 py-2 font-mono text-xs focus:border-[var(--bone)]/60 outline-none"
              aria-label="Modelo de chat"
            >
              {CHAT_MODELS.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.label} · ${m.costPerMillion.toFixed(2)}/1M
                </option>
              ))}
            </select>
            <p className="font-mono text-[9px] opacity-50 mt-1">{currentChat.tag}</p>
          </ConfigCard>
        </section>

        {/* INGEST + DOCS */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 mb-10">
          {/* INGEST */}
          <section
            aria-label="Ingestão"
            className="lg:col-span-3 border border-[var(--bone)]/15 p-5"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-mono text-[10px] tracking-[0.35em] opacity-60 flex items-center gap-2">
                <FileText className="size-3.5" aria-hidden /> ◇ INGESTÃO
              </h2>
              <span className="font-mono text-[9px] opacity-50">
                máx {(MAX_DOC_CHARS / 1000).toFixed(0)}k chars
              </span>
            </div>

            <div className="space-y-3">
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={MAX_TITLE_LEN}
                placeholder="Título do documento"
                className="w-full bg-transparent border border-[var(--bone)]/15 px-3 py-2 font-mono text-xs focus:border-[var(--bone)]/60 outline-none"
                aria-label="Título"
              />
              <input
                value={source}
                onChange={(e) => setSource(e.target.value)}
                maxLength={512}
                placeholder="Fonte (URL ou descrição) — opcional"
                className="w-full bg-transparent border border-[var(--bone)]/15 px-3 py-2 font-mono text-xs focus:border-[var(--bone)]/60 outline-none"
                aria-label="Fonte"
              />
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Cole o conteúdo aqui (markdown, texto, código). Será quebrado em chunks de 1200 chars com overlap de 200."
                rows={10}
                className={`w-full bg-transparent border px-3 py-2 font-mono text-xs focus:border-[var(--bone)]/60 outline-none resize-y min-h-[160px] ${
                  contentOver
                    ? "border-[oklch(0.72_0.28_335/0.6)]"
                    : "border-[var(--bone)]/15"
                }`}
                aria-label="Conteúdo"
              />
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span
                  className={`font-mono text-[10px] ${contentOver ? "text-[oklch(0.72_0.28_335)]" : "opacity-50"}`}
                >
                  {contentLen.toLocaleString("pt-BR")} / {MAX_DOC_CHARS.toLocaleString("pt-BR")} chars
                </span>
                <button
                  type="button"
                  onClick={() => void handleIngest()}
                  disabled={ingesting || contentOver || !passcode || !title.trim() || content.trim().length < 20}
                  className="font-mono text-[10px] tracking-[0.25em] px-4 py-2 border border-[var(--bone)] bg-[var(--bone)] text-[var(--obsidian)] hover:opacity-90 transition inline-flex items-center gap-2 disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  {ingesting ? (
                    <>
                      <Loader2 className="size-3.5 animate-spin" aria-hidden /> INDEXANDO…
                    </>
                  ) : (
                    <>
                      <Database className="size-3.5" aria-hidden /> INDEXAR
                    </>
                  )}
                </button>
              </div>
            </div>
          </section>

          {/* DOCS */}
          <section
            aria-label="Documentos indexados"
            className="lg:col-span-2 border border-[var(--bone)]/15 p-5 flex flex-col"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-mono text-[10px] tracking-[0.35em] opacity-60 flex items-center gap-2">
                <Database className="size-3.5" aria-hidden /> ◇ DOCUMENTOS
              </h2>
              <span className="font-mono text-[9px] opacity-50">
                {docs.length} docs · {totalChunks} chunks
              </span>
            </div>

            <div className="flex-1 overflow-y-auto max-h-[420px] space-y-2 pr-1">
              {loadingDocs ? (
                <div className="flex items-center gap-2 font-mono text-[10px] opacity-60 py-4">
                  <Loader2 className="size-3 animate-spin" aria-hidden /> carregando…
                </div>
              ) : docs.length === 0 ? (
                <p className="font-mono text-[10px] opacity-50 py-4">
                  // nenhum documento indexado ainda
                </p>
              ) : (
                docs.map((d) => (
                  <article
                    key={d.id}
                    className="border border-[var(--bone)]/10 p-3 flex items-start justify-between gap-2 hover:border-[var(--bone)]/30 transition"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-[Instrument_Serif] text-base italic leading-tight truncate">
                        {d.title}
                      </p>
                      <p className="font-mono text-[9px] opacity-50 mt-0.5 truncate">
                        {d.embedding_model.split("/")[1]} · {d.chunk_count} chunks
                        {d.source ? ` · ${d.source}` : ""}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => void handleDelete(d.id)}
                      disabled={deletingId === d.id}
                      aria-label={`Apagar ${d.title}`}
                      className="font-mono text-[9px] opacity-40 hover:opacity-100 hover:text-[oklch(0.72_0.28_335)] transition p-1 disabled:opacity-20"
                    >
                      {deletingId === d.id ? (
                        <Loader2 className="size-3 animate-spin" aria-hidden />
                      ) : (
                        <Trash2 className="size-3" aria-hidden />
                      )}
                    </button>
                  </article>
                ))
              )}
            </div>
          </section>
        </div>

        {/* CHAT RAG */}
        <section
          aria-label="Chat RAG"
          className="border border-[var(--bone)]/15 flex flex-col"
        >
          <div className="flex items-center justify-between px-5 py-3 border-b border-[var(--bone)]/10">
            <h2 className="font-mono text-[10px] tracking-[0.35em] opacity-60 flex items-center gap-2">
              <MessageSquare className="size-3.5" aria-hidden /> ◇ CHAT RAG
            </h2>
            <div className="flex items-center gap-3 font-mono text-[9px] opacity-60">
              <label className="flex items-center gap-1.5">
                top_k
                <input
                  type="number"
                  min={1}
                  max={12}
                  value={topK}
                  onChange={(e) => setTopK(Math.max(1, Math.min(12, Number(e.target.value) || 5)))}
                  className="w-12 bg-transparent border border-[var(--bone)]/20 px-1.5 py-0.5 text-center"
                  aria-label="Quantidade de chunks recuperados"
                />
              </label>
              <button
                type="button"
                onClick={() => setTurns([])}
                className="hover:opacity-100 opacity-60 transition tracking-[0.2em]"
                aria-label="Limpar conversa"
              >
                LIMPAR
              </button>
            </div>
          </div>

          <div
            ref={chatScrollRef}
            className="flex-1 overflow-y-auto max-h-[60vh] min-h-[320px] p-5 space-y-5"
          >
            {turns.length === 0 ? (
              <EmptyChat hasDocs={docs.length > 0} />
            ) : (
              turns.map((t) => <ChatBubble key={t.id} turn={t} />)
            )}
            {asking && (
              <div className="flex items-center gap-2 font-mono text-[10px] opacity-60">
                <Loader2 className="size-3 animate-spin" aria-hidden /> recuperando + gerando…
              </div>
            )}
          </div>

          <div className="border-t border-[var(--bone)]/10 p-3 flex items-end gap-2">
            <textarea
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              maxLength={MAX_QUERY_LEN}
              rows={2}
              placeholder={
                docs.length === 0
                  ? "Indexe um documento primeiro…"
                  : "Pergunte algo (Enter envia, Shift+Enter quebra linha)"
              }
              disabled={asking || docs.length === 0}
              className="flex-1 bg-transparent border border-[var(--bone)]/15 px-3 py-2 font-mono text-xs focus:border-[var(--bone)]/60 outline-none resize-none disabled:opacity-50"
              aria-label="Pergunta"
            />
            <button
              type="button"
              onClick={() => void handleAsk()}
              disabled={asking || !query.trim() || docs.length === 0}
              aria-label="Enviar pergunta"
              className="size-10 shrink-0 border border-[var(--bone)] bg-[var(--bone)] text-[var(--obsidian)] hover:opacity-90 transition disabled:opacity-30 disabled:cursor-not-allowed inline-flex items-center justify-center"
            >
              {asking ? (
                <Loader2 className="size-4 animate-spin" aria-hidden />
              ) : (
                <ArrowUp className="size-4" aria-hidden />
              )}
            </button>
          </div>
        </section>

        <footer className="mt-10 pt-6 border-t border-[var(--bone)]/10 font-mono text-[10px] tracking-[0.2em] opacity-50 space-y-1">
          <p>// PASSCODE/CONFIGS PERSISTIDOS EM localStorage["ragmodelos:*"]</p>
          <p>// EMBED + CHAT VIA LOVABLE GATEWAY · INSERÇÃO COM SERVICE_ROLE · LEITURA RLS PÚBLICA</p>
          <p>// CHUNK_SIZE=1200 / OVERLAP=200 / MAX_DOC_CHARS=80k · pgvector(3072) · similaridade cosseno</p>
        </footer>
      </div>

      {toast && (
        <div
          role="status"
          aria-live="polite"
          className={`fixed bottom-4 right-4 max-w-sm px-4 py-3 font-mono text-[11px] border z-50 ${
            toast.kind === "ok"
              ? "border-[oklch(0.86_0.21_158/0.6)] text-[oklch(0.86_0.21_158)] bg-[oklch(0.86_0.21_158/0.08)]"
              : "border-[oklch(0.72_0.28_335/0.6)] text-[oklch(0.72_0.28_335)] bg-[oklch(0.72_0.28_335/0.08)]"
          }`}
        >
          <div className="flex items-start gap-2">
            {toast.kind === "ok" ? (
              <Check className="size-3.5 mt-0.5 shrink-0" aria-hidden />
            ) : (
              <X className="size-3.5 mt-0.5 shrink-0" aria-hidden />
            )}
            <p className="leading-tight">{toast.msg}</p>
          </div>
        </div>
      )}
    </main>
  );
}

// =====================================================
// SUBCOMPONENTES
// =====================================================
function ConfigCard({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="border border-[var(--bone)]/15 p-4 bg-[var(--bone)]/[0.02]">
      <p className="font-mono text-[9px] tracking-[0.3em] opacity-60 mb-2">{label}</p>
      {children}
    </div>
  );
}

function EmptyChat({ hasDocs }: { hasDocs: boolean }) {
  return (
    <div className="text-center py-12 space-y-2">
      <p className="font-[Instrument_Serif] text-2xl italic opacity-70">
        ◇ {hasDocs ? "Pergunte algo" : "Indexe um documento primeiro"}
      </p>
      <p className="font-mono text-[10px] opacity-50">
        {hasDocs
          ? "Cada resposta vem com fontes recuperadas via pgvector"
          : "O chat só responde com base nos documentos indexados"}
      </p>
    </div>
  );
}

function ChatBubble({ turn }: { turn: ChatTurn }) {
  const isUser = turn.role === "user";
  return (
    <article className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div className={`max-w-[88%] sm:max-w-[80%] ${isUser ? "" : "w-full"}`}>
        <div className="flex items-center gap-2 mb-1.5 font-mono text-[9px] tracking-[0.25em] opacity-50">
          {isUser ? (
            <span>YOU</span>
          ) : (
            <>
              <span>RAG</span>
              {turn.model && (
                <span>· {turn.model.replace(/^(google|openai)\//, "").toUpperCase()}</span>
              )}
              {turn.embedding && (
                <span>· emb: {turn.embedding.split("/")[1]}</span>
              )}
            </>
          )}
        </div>

        <div
          className={`px-4 py-3 border ${
            isUser
              ? "bg-[var(--bone)]/[0.05] border-[var(--bone)]/20"
              : "bg-transparent border-[var(--bone)]/15"
          }`}
        >
          {isUser ? (
            <p className="font-mono text-xs whitespace-pre-wrap leading-relaxed">{turn.content}</p>
          ) : (
            <div className="prose prose-invert prose-sm max-w-none prose-headings:font-[Instrument_Serif] prose-headings:italic prose-p:font-[Space_Grotesk] prose-pre:bg-[var(--bone)]/[0.04] prose-pre:border prose-pre:border-[var(--bone)]/10 prose-code:font-mono prose-code:text-[11px]">
              <ReactMarkdown>{turn.content}</ReactMarkdown>
            </div>
          )}
        </div>

        {!isUser && turn.matches && turn.matches.length > 0 && (
          <details className="mt-2 border border-[var(--bone)]/10 group">
            <summary className="px-3 py-2 font-mono text-[10px] tracking-[0.25em] opacity-60 cursor-pointer hover:opacity-100 inline-flex items-center gap-2">
              <Quote className="size-3" aria-hidden />
              {turn.matches.length} FONTES RECUPERADAS
            </summary>
            <div className="border-t border-[var(--bone)]/10 divide-y divide-[var(--bone)]/10">
              {turn.matches.map((m, i) => (
                <div key={m.id} className="px-3 py-2 space-y-1">
                  <p className="font-mono text-[9px] tracking-[0.2em] opacity-60 flex items-center justify-between gap-2">
                    <span className="truncate">
                      [{i + 1}] {m.document_title} · chunk {m.idx}
                    </span>
                    <span className="text-aurora shrink-0">sim {m.similarity.toFixed(3)}</span>
                  </p>
                  <p className="font-mono text-[10px] opacity-70 leading-relaxed line-clamp-4 whitespace-pre-wrap">
                    {m.content}
                  </p>
                </div>
              ))}
            </div>
          </details>
        )}
      </div>
    </article>
  );
}
