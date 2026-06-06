import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Check, MessageSquare, Sparkles } from "lucide-react";
import {
  CHAT_MODELS,
  DEFAULT_CHAT_MODEL_ID,
  getStoredChatModelId,
  setStoredChatModelId,
  toneClasses,
  type ChatModelSpec,
  type ModelTone,
} from "@/lib/chat-models";

export const Route = createFileRoute("/chatmodelos")({
  head: () => ({
    meta: [
      { title: "CHATMODELOS — Seletor RAG/Chat · Obsidian Aurora" },
      {
        name: "description",
        content:
          "Escolha o modelo padrão do console RAG/chat (/claude). Persistido localmente, aplicado em nova sessão.",
      },
      { property: "og:title", content: "CHATMODELOS — Seletor RAG/Chat" },
      {
        property: "og:description",
        content: "9 modelos Gemini/GPT via Lovable AI Gateway. Escolha o default do console /claude.",
      },
    ],
  }),
  component: ChatModelosPage,
  errorComponent: ({ error, reset }) => (
    <div className="min-h-screen flex items-center justify-center bg-[var(--obsidian)] text-[var(--bone)] p-8">
      <div className="max-w-md text-center space-y-3 font-[Space_Grotesk]">
        <p className="text-xs tracking-[0.3em] text-aurora">// SELETOR DERRUBADO</p>
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
      <p className="text-xs tracking-[0.3em] opacity-60">// 404 · chatmodelos</p>
    </div>
  ),
});

type GroupKey = "google" | "openai";
const GROUP_LABEL: Record<GroupKey, string> = {
  google: "GEMINI · GOOGLE",
  openai: "GPT · OPENAI",
};

function toneAccent(tone: ModelTone): string {
  switch (tone) {
    case "mint":   return "oklch(0.86 0.21 158)";
    case "cyan":   return "oklch(0.84 0.16 210)";
    case "violet": return "oklch(0.68 0.24 295)";
    case "plasma": return "oklch(0.72 0.28 335)";
  }
}

function ChatModelosPage() {
  const [selected, setSelected] = useState<string>(DEFAULT_CHAT_MODEL_ID);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  useEffect(() => {
    setSelected(getStoredChatModelId());
  }, []);

  const grouped = useMemo<ReadonlyArray<{ key: GroupKey; items: ReadonlyArray<ChatModelSpec> }>>(
    () => [
      { key: "google", items: CHAT_MODELS.filter((m) => m.provider === "google") },
      { key: "openai", items: CHAT_MODELS.filter((m) => m.provider === "openai") },
    ],
    [],
  );

  const current = useMemo<ChatModelSpec>(
    () => CHAT_MODELS.find((m) => m.id === selected) ?? CHAT_MODELS[1],
    [selected],
  );

  const handlePick = (id: string): void => {
    setSelected(id);
    setStoredChatModelId(id);
    setSavedAt(Date.now());
  };

  const handleReset = (): void => {
    setSelected(DEFAULT_CHAT_MODEL_ID);
    setStoredChatModelId(DEFAULT_CHAT_MODEL_ID);
    setSavedAt(Date.now());
  };

  return (
    <main className="min-h-screen bg-[var(--obsidian)] text-[var(--bone)] grain">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-10 py-10 sm:py-14">
        {/* TOPO */}
        <header className="flex flex-wrap items-end justify-between gap-4 mb-10">
          <div className="space-y-2">
            <Link
              to="/"
              className="font-mono text-[10px] tracking-[0.3em] opacity-60 hover:opacity-100 transition inline-flex items-center gap-1.5"
            >
              <ArrowLeft className="size-3" aria-hidden /> HOME
            </Link>
            <h1 className="font-[Instrument_Serif] text-5xl sm:text-7xl leading-[0.95] italic">
              <span className="text-aurora">chatmodelos</span>
              <span className="opacity-40">.</span>
            </h1>
            <p className="font-mono text-[11px] tracking-[0.2em] opacity-60 max-w-md">
              SELETOR DO CONSOLE <span className="text-aurora">/claude</span> · 9 MODELOS VIA LOVABLE GATEWAY · PERSISTIDO LOCAL
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleReset}
              className="font-mono text-[10px] tracking-[0.25em] px-3 py-2 border border-[var(--bone)]/20 hover:border-[var(--bone)]/60 transition"
            >
              RESETAR DEFAULT
            </button>
            <Link
              to="/claude"
              className="font-mono text-[10px] tracking-[0.25em] px-3 py-2 border border-[var(--bone)] bg-[var(--bone)] text-[var(--obsidian)] hover:opacity-90 transition inline-flex items-center gap-2"
            >
              <MessageSquare className="size-3.5" aria-hidden /> IR PRO CONSOLE
            </Link>
          </div>
        </header>

        {/* CURRENT */}
        <section
          aria-label="Modelo atualmente selecionado"
          className="mb-8 border border-[var(--bone)]/15 p-5 sm:p-6 flex flex-wrap items-center justify-between gap-4"
          style={{ background: `linear-gradient(135deg, transparent, ${toneAccent(current.tone)}10)` }}
        >
          <div className="space-y-1.5">
            <p className="font-mono text-[10px] tracking-[0.3em] opacity-60">DEFAULT ATIVO</p>
            <p className="font-[Instrument_Serif] text-3xl sm:text-4xl italic">
              {current.label}
            </p>
            <p className="font-mono text-[10px] opacity-50">{current.id}</p>
          </div>
          <div className="flex flex-col items-end gap-1">
            <span
              className={`font-mono text-[10px] tracking-[0.25em] px-2 py-1 border ${toneClasses(current.tone)}`}
            >
              {current.tag}
            </span>
            <span className="font-mono text-[10px] opacity-60">
              ≈ ${current.costPerMillion.toFixed(2)} / 1M tok
            </span>
            {savedAt !== null && (
              <span className="font-mono text-[10px] text-aurora inline-flex items-center gap-1">
                <Sparkles className="size-3" aria-hidden /> salvo
              </span>
            )}
          </div>
        </section>

        {/* GRID */}
        <div className="space-y-10">
          {grouped.map((group) => (
            <section key={group.key} aria-labelledby={`grp-${group.key}`}>
              <h2
                id={`grp-${group.key}`}
                className="font-mono text-[10px] tracking-[0.35em] opacity-50 mb-4"
              >
                ◇ {GROUP_LABEL[group.key]}
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {group.items.map((m) => {
                  const active = m.id === selected;
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => handlePick(m.id)}
                      aria-pressed={active}
                      className={`group relative text-left p-4 border transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--bone)] ${
                        active
                          ? "border-[var(--bone)] bg-[var(--bone)]/[0.04]"
                          : "border-[var(--bone)]/15 hover:border-[var(--bone)]/50"
                      }`}
                      style={
                        active
                          ? { boxShadow: `inset 0 0 0 1px ${toneAccent(m.tone)}66` }
                          : undefined
                      }
                    >
                      <div className="flex items-start justify-between gap-2 mb-3">
                        <span
                          className={`font-mono text-[9px] tracking-[0.25em] px-1.5 py-0.5 border ${toneClasses(m.tone)}`}
                        >
                          {m.tag}
                        </span>
                        {active && (
                          <span
                            className="inline-flex items-center justify-center size-5 rounded-full"
                            style={{ background: toneAccent(m.tone), color: "var(--obsidian)" }}
                            aria-label="Selecionado"
                          >
                            <Check className="size-3" aria-hidden />
                          </span>
                        )}
                      </div>
                      <p className="font-[Instrument_Serif] text-xl italic leading-tight">
                        {m.label}
                      </p>
                      <p className="font-mono text-[10px] opacity-50 mt-1 break-all">{m.id}</p>
                      <div className="mt-3 flex items-center justify-between font-mono text-[10px] opacity-60">
                        <span>${m.costPerMillion.toFixed(2)} / 1M tok</span>
                        <span className="tracking-[0.2em]">{m.provider.toUpperCase()}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </section>
          ))}
        </div>

        {/* RODAPÉ TÉCNICO */}
        <footer className="mt-14 pt-6 border-t border-[var(--bone)]/10 font-mono text-[10px] tracking-[0.2em] opacity-50 space-y-1">
          <p>// SELEÇÃO PERSISTIDA EM localStorage["chatmodelos:default"]</p>
          <p>// APLICA EM NOVA SESSÃO DE /claude · NÃO AFETA CADEIA DE FALLBACK DA EDGE ACTO (/modelos)</p>
          <p>// GATEWAY LOVABLE · CATÁLOGO GOOGLE + OPENAI (claude/anthropic NÃO SUPORTADO)</p>
        </footer>
      </div>
    </main>
  );
}
