import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import {
  ArrowUp,
  Loader2,
  RefreshCcw,
  Settings2,
  Sparkles,
  Square,
  Wallet,
  X,
} from "lucide-react";

export const Route = createFileRoute("/claude")({
  head: () => ({
    meta: [
      { title: "AI CONSOLE — Tier S via Lovable Gateway" },
      {
        name: "description",
        content:
          "Console privado de chat (Gemini 3 / GPT-5.5) servido via Lovable AI Gateway. Streaming token-a-token, seletor de modelo, system prompt editável.",
      },
      { property: "og:title", content: "AI CONSOLE — Tier S" },
      {
        property: "og:description",
        content: "Painel direto pra modelos top-tier via gateway Lovable.",
      },
    ],
  }),
  component: ClaudePanel,
});

// ---------- types ----------
type Role = "user" | "assistant";
interface Msg {
  id: string;
  role: Role;
  content: string;
  model?: string;
  pending?: boolean;
}

interface ModelSpec {
  id: string;
  label: string;
  tag: string;
  costPerMillion: number; // USD/1M tokens (in+out médio aprox.)
  tone: "mint" | "cyan" | "violet" | "plasma";
}

const MODELS: ReadonlyArray<ModelSpec> = [
  { id: "google/gemini-2.5-flash-lite",   label: "Gemini 2.5 Flash Lite", tag: "RAPID",     costPerMillion: 0.4,  tone: "mint"   },
  { id: "google/gemini-3-flash-preview",  label: "Gemini 3 Flash",        tag: "WORKHORSE", costPerMillion: 1.2,  tone: "cyan"   },
  { id: "google/gemini-3.5-flash",        label: "Gemini 3.5 Flash",      tag: "BALANCED",  costPerMillion: 2.0,  tone: "cyan"   },
  { id: "google/gemini-2.5-pro",          label: "Gemini 2.5 Pro",        tag: "DEEP",      costPerMillion: 7.0,  tone: "violet" },
  { id: "google/gemini-3.1-pro-preview",  label: "Gemini 3.1 Pro",        tag: "PREVIEW",   costPerMillion: 10.0, tone: "violet" },
  { id: "openai/gpt-5-mini",              label: "GPT-5 Mini",            tag: "EFFICIENT", costPerMillion: 3.0,  tone: "cyan"   },
  { id: "openai/gpt-5",                   label: "GPT-5",                 tag: "PREMIUM",   costPerMillion: 15.0, tone: "plasma" },
  { id: "openai/gpt-5.5",                 label: "GPT-5.5",               tag: "FRONTIER",  costPerMillion: 25.0, tone: "plasma" },
  { id: "openai/gpt-5.5-pro",             label: "GPT-5.5 Pro",           tag: "APEX",      costPerMillion: 40.0, tone: "plasma" },
];

const DEFAULT_SYSTEM = `Você é o AI TIER S rodando dentro do console privado de Caio Mello.
Estilo: denso, técnico, anti-marketês. Português PT-BR.
Responda em markdown quando ajudar (tabelas, código, listas).
Nunca invente fatos: se não souber, diga "não tenho dado".`;

const PROXY_URL = `${import.meta.env.VITE_SUPABASE_URL as string}/functions/v1/claude-proxy`;
const PROXY_AUTH = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

// Estimativa simples: 1 token ≈ 4 chars
const estimateTokens = (s: string): number => Math.ceil(s.length / 4);
const newId = (): string =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

function toneClasses(tone: ModelSpec["tone"]): string {
  switch (tone) {
    case "mint":   return "text-[oklch(0.86_0.21_158)] border-[oklch(0.86_0.21_158/0.4)]";
    case "cyan":   return "text-[oklch(0.84_0.16_210)] border-[oklch(0.84_0.16_210/0.4)]";
    case "violet": return "text-[oklch(0.68_0.24_295)] border-[oklch(0.68_0.24_295/0.4)]";
    case "plasma": return "text-[oklch(0.72_0.28_335)] border-[oklch(0.72_0.28_335/0.4)]";
  }
}

// ---------- streaming parser ----------
async function streamChat(opts: {
  signal: AbortSignal;
  model: string;
  system: string;
  history: Array<{ role: Role; content: string }>;
  onDelta: (chunk: string) => void;
  onError: (err: { status: number; message: string }) => void;
}): Promise<void> {
  const { signal, model, system, history, onDelta, onError } = opts;
  let resp: Response;
  try {
    resp = await fetch(PROXY_URL, {
      method: "POST",
      signal,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${PROXY_AUTH}`,
      },
      body: JSON.stringify({
        model,
        system,
        messages: history,
        stream: true,
        temperature: 0.7,
        max_completion_tokens: 16384,
      }),
    });
  } catch (e) {
    if ((e as Error).name === "AbortError") return;
    onError({ status: 0, message: `Falha de rede: ${(e as Error).message}` });
    return;
  }

  if (!resp.ok || !resp.body) {
    let errMsg = `Erro ${resp.status}`;
    try {
      const j = (await resp.json()) as { error?: string };
      if (j.error) errMsg = j.error;
    } catch {
      // ignore
    }
    onError({ status: resp.status, message: errMsg });
    return;
  }

  const reader = resp.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let done = false;

  while (!done) {
    const { value, done: streamDone } = await reader.read();
    if (streamDone) break;
    buffer += decoder.decode(value, { stream: true });

    let nlIdx: number;
    while ((nlIdx = buffer.indexOf("\n")) !== -1) {
      let line = buffer.slice(0, nlIdx);
      buffer = buffer.slice(nlIdx + 1);
      if (line.endsWith("\r")) line = line.slice(0, -1);
      if (line.length === 0 || line.startsWith(":")) continue;
      if (!line.startsWith("data: ")) continue;
      const payload = line.slice(6).trim();
      if (payload === "[DONE]") {
        done = true;
        break;
      }
      try {
        const parsed = JSON.parse(payload) as {
          choices?: Array<{ delta?: { content?: string } }>;
        };
        const delta = parsed.choices?.[0]?.delta?.content;
        if (typeof delta === "string" && delta.length > 0) onDelta(delta);
      } catch {
        // chunk parcial — devolve pro buffer
        buffer = `data: ${payload}\n${buffer}`;
        break;
      }
    }
  }
}

// ---------- component ----------
function ClaudePanel() {
  const [messages, setMessages] = useState<ReadonlyArray<Msg>>([]);
  const [input, setInput] = useState<string>("");
  const [model, setModel] = useState<string>(MODELS[1].id);
  const [systemPrompt, setSystemPrompt] = useState<string>(DEFAULT_SYSTEM);
  const [isStreaming, setIsStreaming] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState<boolean>(false);

  const abortRef = useRef<AbortController | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const currentModel = useMemo<ModelSpec>(
    () => MODELS.find((m) => m.id === model) ?? MODELS[1],
    [model],
  );

  const approxTokens = useMemo<number>(
    () => estimateTokens(`${systemPrompt}${messages.map((m) => m.content).join("")}`),
    [messages, systemPrompt],
  );
  
  const approxCost = useMemo<number>(() => (approxTokens / 1_000_000) * currentModel.costPerMillion, [approxTokens, currentModel]);

  useEffect(() => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = `${Math.min(ta.scrollHeight, 240)}px`;
  }, [input]);

  const handleSend = useCallback(async () => {
    const trimmed = input.trim();
    if (trimmed.length === 0 || isStreaming) return;

    setError(null);
    const userMsg: Msg = { id: newId(), role: "user", content: trimmed };
    const assistantId = newId();
    const assistantMsg: Msg = {
      id: assistantId,
      role: "assistant",
      content: "",
      model,
      pending: true,
    };

    const nextHistory: Array<{ role: Role; content: string }> = [
      ...messages.map((m) => ({ role: m.role, content: m.content })),
      { role: "user", content: trimmed },
    ];

    setMessages((prev) => [...prev, userMsg, assistantMsg]);
    setInput("");
    setIsStreaming(true);

    const controller = new AbortController();
    abortRef.current = controller;

    await streamChat({
      signal: controller.signal,
      model,
      system: systemPrompt,
      history: nextHistory,
      onDelta: (chunk) => {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId ? { ...m, content: m.content + chunk, pending: false } : m,
          ),
        );
      },
      onError: ({ status, message }) => {
        setError(`[${status}] ${message}`);
        setMessages((prev) => prev.filter((m) => m.id !== assistantId));
      },
    });

    setIsStreaming(false);
    abortRef.current = null;
    setMessages((prev) =>
      prev.map((m) => (m.id === assistantId ? { ...m, pending: false } : m)),
    );
  }, [input, isStreaming, messages, model, systemPrompt]);

  const handleStop = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setIsStreaming(false);
    setMessages((prev) => prev.map((m) => ({ ...m, pending: false })));
  }, []);

  const handleReset = useCallback(() => {
    handleStop();
    setMessages([]);
    setError(null);
  }, [handleStop]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        void handleSend();
      }
    },
    [handleSend],
  );

  return (
    <div className="min-h-svh bg-[var(--obsidian)] text-[var(--bone)] grain scanlines flex flex-col">
      {/* TICKER */}
      <div className="border-b border-[var(--bone)]/10 overflow-hidden">
        <div className="marquee-track py-2 font-mono text-[10px] tracking-[0.3em] text-[var(--bone)]/60 whitespace-nowrap">
          {Array.from({ length: 4 }).map((_, i) => (
            <span key={i} className="px-8">
              ◇ AI CONSOLE · TIER S · {currentModel.label.toUpperCase()} · STREAM SSE · LOVABLE GATEWAY · {currentModel.tag} · ZERO LOG ·
            </span>
          ))}
        </div>
      </div>

      {/* HEADER */}
      <header className="px-4 md:px-10 pt-8 pb-6 border-b border-[var(--bone)]/10">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex-1 min-w-0">
            <p className="font-mono text-[10px] tracking-[0.4em] text-[var(--bone)]/50 mb-2">
              ◇ ROUTE /claude · GEMINI + GPT VIA LOVABLE
            </p>
            <h1 className="font-display italic text-5xl md:text-7xl leading-[0.95] text-aurora">
              AI Console
            </h1>
            <p className="font-grotesk text-sm md:text-base text-[var(--bone)]/70 mt-3 max-w-xl">
              Chat direto com Gemini 3 e GPT-5.5 via{" "}
              <code className="font-mono text-xs text-aurora">ai.gateway.lovable.dev</code>.
              Streaming token-a-token. Sua chave fica server-side.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setSettingsOpen((v) => !v)}
              aria-expanded={settingsOpen}
              aria-controls="claude-settings"
              className="font-mono text-[10px] tracking-[0.25em] px-3 py-2 border border-[var(--bone)]/20 hover:border-[var(--bone)]/60 transition flex items-center gap-2"
            >
              <Settings2 className="size-3.5" aria-hidden />
              CONFIG
            </button>
            <button
              type="button"
              onClick={handleReset}
              className="font-mono text-[10px] tracking-[0.25em] px-3 py-2 border border-[var(--bone)]/20 hover:border-[var(--bone)]/60 transition flex items-center gap-2"
            >
              <RefreshCcw className="size-3.5" aria-hidden />
              RESET
            </button>
          </div>
        </div>

        {/* METRICS */}
        <dl className="grid grid-cols-2 md:grid-cols-4 gap-px mt-6 bg-[var(--bone)]/10 border border-[var(--bone)]/10">
          <Metric label="MODEL" value={currentModel.label} tone={currentModel.tone} />
          <Metric label="TIER" value={currentModel.tag} />
          <Metric label="TOKENS≈" value={approxTokens.toLocaleString("pt-BR")} />
          <Metric label="COST≈" value={`$${approxCost.toFixed(4)}`} />
        </dl>
      </header>

      {/* SETTINGS DRAWER */}
      {settingsOpen && (
        <section
          id="claude-settings"
          className="border-b border-[var(--bone)]/10 px-4 md:px-10 py-6 bg-[var(--obsidian-2)]"
        >
          <div className="flex items-center justify-between mb-4">
            <p className="font-mono text-[10px] tracking-[0.4em] text-[var(--bone)]/50">
              ◇ CONFIGURAÇÃO DA SESSÃO
            </p>
            <button
              type="button"
              onClick={() => setSettingsOpen(false)}
              aria-label="Fechar configurações"
              className="text-[var(--bone)]/60 hover:text-[var(--bone)]"
            >
              <X className="size-4" />
            </button>
          </div>

          <div className="grid lg:grid-cols-[1fr_1.2fr] gap-6">
            <fieldset>
              <legend className="font-mono text-[10px] tracking-[0.3em] text-[var(--bone)]/60 mb-3">
                MODELO
              </legend>
              <div className="grid sm:grid-cols-2 gap-2">
                {MODELS.map((m) => {
                  const active = m.id === model;
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setModel(m.id)}
                      aria-pressed={active}
                      className={[
                        "text-left px-3 py-3 border transition",
                        active
                          ? `${toneClasses(m.tone)} bg-[var(--bone)]/5`
                          : "border-[var(--bone)]/15 text-[var(--bone)]/80 hover:border-[var(--bone)]/40",
                      ].join(" ")}
                    >
                      <div className="font-grotesk text-sm">{m.label}</div>
                      <div className="font-mono text-[10px] tracking-[0.25em] opacity-70 mt-1 flex items-center justify-between">
                        <span>{m.tag}</span>
                        <span>${m.costPerMillion.toFixed(2)}/1M</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </fieldset>

            <fieldset>
              <legend className="font-mono text-[10px] tracking-[0.3em] text-[var(--bone)]/60 mb-3">
                SYSTEM PROMPT
              </legend>
              <textarea
                value={systemPrompt}
                onChange={(e) => setSystemPrompt(e.target.value)}
                rows={8}
                maxLength={4000}
                aria-label="System prompt"
                className="w-full bg-[var(--obsidian)] border border-[var(--bone)]/15 focus:border-[var(--bone)]/50 outline-none px-3 py-2 font-mono text-xs leading-relaxed text-[var(--bone)] resize-none"
              />
              <p className="font-mono text-[10px] tracking-[0.2em] text-[var(--bone)]/40 mt-2">
                {systemPrompt.length}/4000 CHARS · injetado em cada request
              </p>
            </fieldset>
          </div>
        </section>
      )}

      {/* MESSAGES */}
      <main
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-4 md:px-10 py-8"
        aria-live="polite"
      >
        <div className="max-w-3xl mx-auto flex flex-col gap-6">
          {messages.length === 0 && <EmptyState model={currentModel} />}

          {messages.map((m) => (
            <MessageBubble key={m.id} msg={m} />
          ))}

          {error && (
            <div
              role="alert"
              className="border border-[oklch(0.72_0.28_335/0.6)] bg-[oklch(0.72_0.28_335/0.08)] px-4 py-3"
            >
              <p className="font-mono text-[10px] tracking-[0.3em] text-[oklch(0.72_0.28_335)] mb-1">
                ◇ ERRO
              </p>
              <p className="font-grotesk text-sm text-[var(--bone)]">{error}</p>
            </div>
          )}
        </div>
      </main>

      {/* COMPOSER */}
      <footer className="border-t border-[var(--bone)]/10 bg-[var(--obsidian-2)] px-4 md:px-10 py-4">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void handleSend();
          }}
          className="max-w-3xl mx-auto"
        >
          <div className="flex items-end gap-3 border border-[var(--bone)]/15 focus-within:border-[var(--bone)]/50 bg-[var(--obsidian)] px-3 py-2 transition">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={
                isStreaming
                  ? "Aguardando resposta…"
                  : `Pergunte ao ${currentModel.label}…  (Enter envia · Shift+Enter quebra linha)`
              }
              rows={1}
              maxLength={16_000}
              disabled={isStreaming}
              aria-label="Mensagem para o modelo selecionado"
              className="flex-1 bg-transparent outline-none resize-none font-grotesk text-sm md:text-base text-[var(--bone)] placeholder:text-[var(--bone)]/35 disabled:opacity-50 py-2"
            />
            {isStreaming ? (
              <button
                type="button"
                onClick={handleStop}
                aria-label="Parar streaming"
                className="size-10 shrink-0 border border-[oklch(0.72_0.28_335/0.6)] text-[oklch(0.72_0.28_335)] hover:bg-[oklch(0.72_0.28_335/0.12)] transition flex items-center justify-center"
              >
                <Square className="size-4" aria-hidden />
              </button>
            ) : (
              <button
                type="submit"
                disabled={input.trim().length === 0}
                aria-label="Enviar mensagem"
                className="size-10 shrink-0 border border-[var(--bone)]/30 text-[var(--bone)] hover:border-[var(--bone)] hover:bg-[var(--bone)]/10 disabled:opacity-30 disabled:hover:bg-transparent transition flex items-center justify-center"
              >
                <ArrowUp className="size-4" aria-hidden />
              </button>
            )}
          </div>

          <div className="flex items-center justify-between mt-2 font-mono text-[10px] tracking-[0.25em] text-[var(--bone)]/40">
            <span className="flex items-center gap-1.5">
              <Wallet className="size-3" aria-hidden />
              SALDO DEBITA DE: LOVABLE AI · WORKSPACE
            </span>
            <span>{input.length.toLocaleString("pt-BR")}/16000</span>
          </div>
        </form>
      </footer>
    </div>
  );
}

// ---------- subcomponents ----------
interface MetricProps {
  label: string;
  value: string;
  tone?: ModelSpec["tone"];
}
function Metric({ label, value, tone }: MetricProps) {
  return (
    <div className="bg-[var(--obsidian)] px-3 py-3">
      <dt className="font-mono text-[10px] tracking-[0.3em] text-[var(--bone)]/40">{label}</dt>
      <dd
        className={[
          "font-display italic text-2xl md:text-3xl mt-1 truncate",
          tone ? toneClasses(tone).split(" ")[0] : "text-[var(--bone)]",
        ].join(" ")}
      >
        {value}
      </dd>
    </div>
  );
}

function EmptyState({ model }: { model: ModelSpec }) {
  const suggestions: ReadonlyArray<string> = [
    "Explique RLS do Postgres com um exemplo prático em 5 linhas.",
    "Compare Gemini 3 Pro vs GPT-5.5 Pro em raciocínio simbólico.",
    "Refatore esta query SQL para usar window functions:\nSELECT…",
    "Me dê 3 ideias de arquitetura pra um chat com rate-limit por IP.",
  ];
  return (
    <div className="border border-[var(--bone)]/15 bg-[var(--obsidian-2)] p-6 md:p-10">
      <div className="flex items-center gap-3 mb-4">
        <Sparkles className={`size-5 ${toneClasses(model.tone).split(" ")[0]}`} aria-hidden />
        <p className="font-mono text-[10px] tracking-[0.4em] text-[var(--bone)]/50">
          ◇ SESSÃO LIMPA · {model.label.toUpperCase()}
        </p>
      </div>
      <h2 className="font-display italic text-3xl md:text-4xl leading-tight text-[var(--bone)] mb-2">
        Faça a primeira <span className="text-aurora">pergunta</span>.
      </h2>
      <p className="font-grotesk text-sm text-[var(--bone)]/60 mb-6 max-w-lg">
        Sem login. Sem histórico salvo. Sem chave do provedor na sua máquina.
        Cada token consumido sai do saldo Lovable AI do workspace.
      </p>
      <ul className="grid sm:grid-cols-2 gap-2">
        {suggestions.map((s, i) => (
          <li
            key={i}
            className="font-mono text-xs text-[var(--bone)]/70 border border-[var(--bone)]/10 px-3 py-2 hover:border-[var(--bone)]/30 hover:text-[var(--bone)] transition cursor-default"
          >
            {s}
          </li>
        ))}
      </ul>
    </div>
  );
}

function MessageBubble({ msg }: { msg: Msg }) {
  const isUser = msg.role === "user";
  return (
    <article
      className={[
        "flex flex-col gap-2",
        isUser ? "items-end" : "items-start",
      ].join(" ")}
    >
      <header className="flex items-center gap-2 font-mono text-[10px] tracking-[0.3em] text-[var(--bone)]/40">
        <span>◇ {isUser ? "VOCÊ" : "AI"}</span>
        {msg.model && !isUser && (
          <span className="text-[var(--bone)]/30">
            · {msg.model.replace(/^(anthropic|google|openai)\//, "").toUpperCase()}
          </span>
        )}
      </header>
      <div
        className={[
          "max-w-[88%] md:max-w-[80%] px-4 py-3 border font-grotesk text-sm md:text-[15px] leading-relaxed",
          isUser
            ? "bg-[var(--bone)]/5 border-[var(--bone)]/15 text-[var(--bone)]"
            : "bg-[var(--obsidian-2)] border-[var(--bone)]/10 text-[var(--bone)]",
        ].join(" ")}
      >
        {msg.pending && msg.content.length === 0 ? (
          <span className="inline-flex items-center gap-2 text-[var(--bone)]/60 font-mono text-xs">
            <Loader2 className="size-3.5 animate-spin" aria-hidden />
            pensando…
          </span>
        ) : isUser ? (
          <p className="whitespace-pre-wrap">{msg.content}</p>
        ) : (
          <div className="prose-claude">
            <ReactMarkdown
              components={{
                p: ({ children }) => <p className="mb-3 last:mb-0">{children}</p>,
                ul: ({ children }) => <ul className="list-disc pl-5 my-3 space-y-1">{children}</ul>,
                ol: ({ children }) => <ol className="list-decimal pl-5 my-3 space-y-1">{children}</ol>,
                li: ({ children }) => <li className="marker:text-[var(--bone)]/40">{children}</li>,
                h1: ({ children }) => <h3 className="font-display italic text-2xl mt-4 mb-2 text-aurora">{children}</h3>,
                h2: ({ children }) => <h3 className="font-display italic text-xl mt-3 mb-2 text-[var(--bone)]">{children}</h3>,
                h3: ({ children }) => <h4 className="font-grotesk font-semibold text-base mt-3 mb-1.5">{children}</h4>,
                strong: ({ children }) => <strong className="text-aurora font-semibold">{children}</strong>,
                em: ({ children }) => <em className="italic text-[var(--bone)]/90">{children}</em>,
                a: ({ children, href }) => (
                  <a href={href} target="_blank" rel="noreferrer noopener" className="underline decoration-dotted underline-offset-4 hover:text-aurora">
                    {children}
                  </a>
                ),
                code: ({ children, className }) => {
                  const inline = !className;
                  if (inline) {
                    return (
                      <code className="font-mono text-[12px] bg-[var(--bone)]/10 px-1.5 py-0.5 rounded-sm text-[oklch(0.86_0.21_158)]">
                        {children}
                      </code>
                    );
                  }
                  return (
                    <code className="font-mono text-[12px] text-[var(--bone)]/95 block">
                      {children}
                    </code>
                  );
                },
                pre: ({ children }) => (
                  <pre className="bg-[var(--obsidian)] border border-[var(--bone)]/15 p-3 my-3 overflow-x-auto text-[12px] leading-relaxed">
                    {children}
                  </pre>
                ),
                blockquote: ({ children }) => (
                  <blockquote className="border-l-2 border-[oklch(0.84_0.16_210)] pl-3 my-3 italic text-[var(--bone)]/80">
                    {children}
                  </blockquote>
                ),
                table: ({ children }) => (
                  <div className="overflow-x-auto my-3">
                    <table className="w-full text-xs border-collapse">{children}</table>
                  </div>
                ),
                th: ({ children }) => <th className="border border-[var(--bone)]/20 px-2 py-1 text-left font-mono uppercase tracking-wider text-[10px]">{children}</th>,
                td: ({ children }) => <td className="border border-[var(--bone)]/10 px-2 py-1">{children}</td>,
                hr: () => <hr className="border-[var(--bone)]/15 my-4" />,
              }}
            >
              {msg.content}
            </ReactMarkdown>
            {msg.pending && (
              <span className="inline-block w-2 h-4 bg-aurora align-middle ml-0.5 animate-pulse" />
            )}
          </div>
        )}
      </div>
    </article>
  );
}
