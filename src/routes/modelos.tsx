import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useState } from "react";
import {
  MODEL_CATALOG,
  TIER_LABEL,
  TIER_ORDER,
  PROVIDER_LABEL,
  DEFAULT_CHAIN,
  type ModelInfo,
  type ModelTier,
} from "@/lib/models.catalog";
import { getModelConfig, setModelConfig } from "@/lib/models.functions";

export const Route = createFileRoute("/modelos")({
  head: () => ({
    meta: [
      { title: "MODELOS — Seletor TIER S · Obsidian Aurora" },
      {
        name: "description",
        content:
          "Defina o modelo primário e a cadeia de fallback usados pela edge ACTO para responder ao chat editor nativo.",
      },
      { property: "og:title", content: "MODELOS — Seletor TIER S" },
      {
        property: "og:description",
        content: "Selecione o modelo primário e ordene fallbacks da cadeia RAG.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://actobredge.lovable.app/modelos" },
    ],
    links: [{ rel: "canonical", href: "https://actobredge.lovable.app/modelos" }],
  }),
  component: ModelosPage,
  errorComponent: ({ error }) => (
    <div className="min-h-screen flex items-center justify-center bg-[var(--obsidian)] text-[var(--bone)] p-8">
      <div className="max-w-md text-center space-y-3 font-[Space_Grotesk]">
        <p className="text-xs tracking-[0.3em] text-aurora">// SELETOR DERRUBADO</p>
        <p className="text-sm opacity-70">{error.message}</p>
        <Link to="/" className="inline-block mt-4 text-xs underline opacity-80 hover:opacity-100">
          ← voltar
        </Link>
      </div>
    </div>
  ),
  notFoundComponent: () => (
    <div className="min-h-screen flex items-center justify-center bg-[var(--obsidian)] text-[var(--bone)]">
      <p className="text-xs tracking-[0.3em] opacity-60">// 404 · modelos</p>
    </div>
  ),
});

type Status =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "saving" }
  | { kind: "ok"; message: string }
  | { kind: "error"; message: string };

const GROUPED = TIER_ORDER.map((tier) => ({
  tier,
  items: MODEL_CATALOG.filter((m) => m.tier === tier),
}));

function ModelosPage() {
  const fetchConfig = useServerFn(getModelConfig);
  const saveConfig = useServerFn(setModelConfig);

  const [primary, setPrimary] = useState<string>(DEFAULT_CHAIN[0]);
  const [fallbacks, setFallbacks] = useState<string[]>([...DEFAULT_CHAIN.slice(1)]);
  const [passcode, setPasscode] = useState("");
  const [status, setStatus] = useState<Status>({ kind: "loading" });
  const [updatedAt, setUpdatedAt] = useState<string>("");

  useEffect(() => {
    let cancelled = false;
    fetchConfig()
      .then((cfg) => {
        if (cancelled) return;
        setPrimary(cfg.primary_model);
        setFallbacks(Array.isArray(cfg.fallback_models) ? cfg.fallback_models : []);
        setUpdatedAt(cfg.updated_at ?? "");
        setStatus({ kind: "idle" });
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        const msg = err instanceof Error ? err.message : "falha ao carregar config";
        setStatus({ kind: "error", message: msg });
      });
    return () => {
      cancelled = true;
    };
  }, [fetchConfig]);

  const fallbackSet = useMemo(() => new Set(fallbacks), [fallbacks]);

  function handleSelectPrimary(id: string) {
    setPrimary(id);
    // Remove o novo primário da lista de fallbacks (não pode duplicar).
    setFallbacks((prev) => prev.filter((m) => m !== id));
  }

  function toggleFallback(id: string) {
    if (id === primary) return;
    setFallbacks((prev) =>
      prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id].slice(0, 8),
    );
  }

  function moveFallback(id: string, dir: -1 | 1) {
    setFallbacks((prev) => {
      const i = prev.indexOf(id);
      if (i < 0) return prev;
      const j = i + dir;
      if (j < 0 || j >= prev.length) return prev;
      const next = [...prev];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  }

  async function handleApply(e: React.FormEvent) {
    e.preventDefault();
    if (!passcode.trim()) {
      setStatus({ kind: "error", message: "passcode obrigatório." });
      return;
    }
    setStatus({ kind: "saving" });
    try {
      const cfg = await saveConfig({
        data: {
          passcode: passcode.trim(),
          primary_model: primary,
          fallback_models: fallbacks,
        },
      });
      setPrimary(cfg.primary_model);
      setFallbacks(cfg.fallback_models);
      setUpdatedAt(cfg.updated_at);
      setPasscode("");
      setStatus({ kind: "ok", message: "cadeia aplicada. edges relêem em até 30s." });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "falha ao salvar";
      setStatus({ kind: "error", message: msg });
    }
  }

  const chainPreview = [primary, ...fallbacks];
  const isBusy = status.kind === "loading" || status.kind === "saving";

  return (
    <div className="min-h-screen bg-[var(--obsidian)] text-[var(--bone)] grain">
      <div className="scanlines pointer-events-none fixed inset-0 opacity-[0.04]" aria-hidden />

      <header className="border-b border-[var(--bone)]/10">
        <div className="max-w-6xl mx-auto px-4 sm:px-8 py-4 flex items-center justify-between font-[JetBrains_Mono] text-[10px] tracking-[0.3em]">
          <Link to="/" className="opacity-60 hover:opacity-100 transition">
            ← INDEX
          </Link>
          <span className="opacity-60">/ MODELOS · TIER S RAG</span>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-8 py-10 sm:py-16 space-y-10">
        <section className="space-y-4">
          <p className="font-[JetBrains_Mono] text-[10px] tracking-[0.4em] opacity-60">
            // ASSET 12 · SELETOR DE MODELO RAG
          </p>
          <h1 className="font-[Instrument_Serif] italic text-5xl sm:text-7xl leading-[0.9] text-aurora">
            cadeia tier s
          </h1>
          <p className="font-[Space_Grotesk] text-sm sm:text-base opacity-80 max-w-2xl">
            Defina o modelo <strong>primário</strong> e ordene até 8{" "}
            <strong>fallbacks</strong>. As edges <code className="font-[JetBrains_Mono] text-xs">acto-v2-gateway</code>
            {" "}e <code className="font-[JetBrains_Mono] text-xs">acto-tier-s</code> consomem a cadeia em até 30s.
            4xx de input não consome fallback — apenas 402/429/5xx.
          </p>
          {updatedAt && (
            <p className="font-[JetBrains_Mono] text-[10px] tracking-[0.2em] opacity-50">
              ÚLTIMA ALTERAÇÃO · {new Date(updatedAt).toISOString().replace("T", " ").slice(0, 19)} UTC
            </p>
          )}
        </section>

        {/* Cadeia atual */}
        <section className="conic-border rounded-lg p-[1px]">
          <div className="bg-[var(--obsidian)] rounded-lg p-5 sm:p-6 space-y-3">
            <p className="font-[JetBrains_Mono] text-[10px] tracking-[0.3em] opacity-60">
              CADEIA ATIVA
            </p>
            <ol className="font-[Space_Grotesk] text-sm space-y-1.5">
              {chainPreview.map((id, i) => (
                <li key={id} className="flex items-baseline gap-3">
                  <span className="font-[JetBrains_Mono] text-[10px] opacity-50 w-10 shrink-0">
                    {i === 0 ? "PRIM" : `FB-${i}`}
                  </span>
                  <span className={i === 0 ? "text-aurora font-medium" : "opacity-90"}>{id}</span>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Catálogo por tier */}
        {GROUPED.map(({ tier, items }) => (
          <section key={tier} className="space-y-4">
            <header className="flex items-baseline gap-4">
              <span className="font-[Instrument_Serif] italic text-3xl sm:text-4xl text-outline opacity-70">
                {tier === "flagship" ? "01" : tier === "standard" ? "02" : "03"}
              </span>
              <h2 className="font-[JetBrains_Mono] text-[11px] tracking-[0.35em] opacity-80">
                {TIER_LABEL[tier]}
              </h2>
            </header>
            <ul className="grid gap-3 sm:grid-cols-2">
              {items.map((m) => (
                <ModelCard
                  key={m.id}
                  model={m}
                  isPrimary={m.id === primary}
                  fallbackRank={fallbackSet.has(m.id) ? fallbacks.indexOf(m.id) + 1 : null}
                  fallbackCount={fallbacks.length}
                  onSelectPrimary={() => handleSelectPrimary(m.id)}
                  onToggleFallback={() => toggleFallback(m.id)}
                  onMove={(dir) => moveFallback(m.id, dir)}
                />
              ))}
            </ul>
          </section>
        ))}

        {/* Aplicar */}
        <section className="conic-border rounded-lg p-[1px]">
          <form
            onSubmit={handleApply}
            className="bg-[var(--obsidian)] rounded-lg p-5 sm:p-7 space-y-5"
          >
            <div className="space-y-2">
              <label
                htmlFor="passcode"
                className="block font-[JetBrains_Mono] text-[10px] tracking-[0.3em] opacity-70"
              >
                PASSCODE · ACTO_MASTER_SECRET
              </label>
              <input
                id="passcode"
                type="password"
                autoComplete="off"
                value={passcode}
                onChange={(e) => setPasscode(e.target.value)}
                disabled={isBusy}
                className="w-full bg-transparent border-b border-[var(--bone)]/30 focus:border-[var(--bone)] outline-none py-2 font-[JetBrains_Mono] text-sm tracking-wider transition"
                placeholder="••••••••"
                aria-describedby="passcode-help"
              />
              <p
                id="passcode-help"
                className="font-[JetBrains_Mono] text-[10px] opacity-50"
              >
                exigido para gravar — comparado server-side contra o segredo da edge.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
              <button
                type="submit"
                disabled={isBusy}
                className="bg-aurora text-[var(--obsidian)] font-[JetBrains_Mono] text-xs tracking-[0.3em] px-6 py-3 rounded transition hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {status.kind === "saving" ? "APLICANDO…" : "APLICAR CADEIA"}
              </button>

              <div
                aria-live="polite"
                className="font-[JetBrains_Mono] text-[11px] tracking-wider"
              >
                {status.kind === "loading" && (
                  <span className="opacity-60">carregando config…</span>
                )}
                {status.kind === "ok" && (
                  <span className="text-aurora">✓ {status.message}</span>
                )}
                {status.kind === "error" && (
                  <span className="text-[#ff6b6b]">⚠ {status.message}</span>
                )}
              </div>
            </div>
          </form>
        </section>

        <footer className="font-[JetBrains_Mono] text-[10px] tracking-[0.25em] opacity-40 pt-6 border-t border-[var(--bone)]/10">
          // EDGE acto-v2-gateway · acto-tier-s · cache 30s · fallback hardcoded em falha de leitura
        </footer>
      </main>
    </div>
  );
}

interface ModelCardProps {
  model: ModelInfo;
  isPrimary: boolean;
  fallbackRank: number | null;
  fallbackCount: number;
  onSelectPrimary: () => void;
  onToggleFallback: () => void;
  onMove: (dir: -1 | 1) => void;
}

function ModelCard({
  model,
  isPrimary,
  fallbackRank,
  fallbackCount,
  onSelectPrimary,
  onToggleFallback,
  onMove,
}: ModelCardProps) {
  const isFallback = fallbackRank !== null;
  return (
    <li
      className={`relative rounded-lg border p-4 transition ${
        isPrimary
          ? "border-transparent bg-aurora/[0.08] ring-1 ring-[var(--bone)]/30"
          : isFallback
            ? "border-[var(--bone)]/30 bg-[var(--bone)]/[0.02]"
            : "border-[var(--bone)]/10 hover:border-[var(--bone)]/30"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-[Instrument_Serif] italic text-2xl leading-tight">
              {model.label}
            </h3>
            {model.preview && (
              <span className="font-[JetBrains_Mono] text-[9px] tracking-[0.25em] px-1.5 py-0.5 border border-[var(--bone)]/30 opacity-70">
                PREVIEW
              </span>
            )}
          </div>
          <p className="font-[JetBrains_Mono] text-[10px] tracking-[0.2em] opacity-60">
            {PROVIDER_LABEL[model.provider]} · {model.id}
          </p>
          <p className="font-[Space_Grotesk] text-xs opacity-80 pt-1">{model.description}</p>
        </div>
        {isPrimary ? (
          <span className="font-[JetBrains_Mono] text-[10px] tracking-[0.25em] text-aurora shrink-0">
            ★ PRIMÁRIO
          </span>
        ) : isFallback ? (
          <span className="font-[JetBrains_Mono] text-[10px] tracking-[0.25em] opacity-80 shrink-0">
            FB-{fallbackRank}
          </span>
        ) : null}
      </div>

      <div className="flex items-center gap-2 mt-4 flex-wrap">
        <button
          type="button"
          onClick={onSelectPrimary}
          disabled={isPrimary}
          aria-pressed={isPrimary}
          className="font-[JetBrains_Mono] text-[10px] tracking-[0.25em] border border-[var(--bone)]/30 px-3 py-1.5 rounded hover:border-[var(--bone)] transition disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {isPrimary ? "É O PRIMÁRIO" : "TORNAR PRIMÁRIO"}
        </button>
        <button
          type="button"
          onClick={onToggleFallback}
          disabled={isPrimary}
          aria-pressed={isFallback}
          className="font-[JetBrains_Mono] text-[10px] tracking-[0.25em] border border-[var(--bone)]/30 px-3 py-1.5 rounded hover:border-[var(--bone)] transition disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {isFallback ? "REMOVER FALLBACK" : "+ FALLBACK"}
        </button>
        {isFallback && fallbackRank !== null && (
          <span className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => onMove(-1)}
              disabled={fallbackRank === 1}
              aria-label={`Subir ${model.label} na ordem de fallback`}
              className="font-[JetBrains_Mono] text-xs w-7 h-7 border border-[var(--bone)]/30 rounded hover:border-[var(--bone)] transition disabled:opacity-30 disabled:cursor-not-allowed"
            >
              ↑
            </button>
            <button
              type="button"
              onClick={() => onMove(1)}
              disabled={fallbackRank === fallbackCount}
              aria-label={`Descer ${model.label} na ordem de fallback`}
              className="font-[JetBrains_Mono] text-xs w-7 h-7 border border-[var(--bone)]/30 rounded hover:border-[var(--bone)] transition disabled:opacity-30 disabled:cursor-not-allowed"
            >
              ↓
            </button>
          </span>
        )}
      </div>
    </li>
  );
}
