import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, ImageIcon, Loader2, Play, Square, Video } from "lucide-react";
import { useCallback, useMemo, useRef, useState } from "react";
import { streamImage } from "@/lib/stream-image";

export const Route = createFileRoute("/imagens")({
  head: () => ({
    meta: [
      { title: "IMAGENS — Playground IA Imagem · Obsidian Aurora" },
      {
        name: "description",
        content:
          "Playground de geração de imagem em streaming via Lovable AI Gateway. 5 modelos (GPT-Image + Gemini Nano Banana).",
      },
      { property: "og:title", content: "IMAGENS — Playground IA Imagem" },
      {
        property: "og:description",
        content:
          "Stream real de partials → final via /v1/images/generations. GPT-Image 2 + Gemini Nano Banana.",
      },
    ],
  }),
  component: ImagensPage,
  errorComponent: ({ error, reset }) => (
    <div className="min-h-screen flex items-center justify-center bg-[var(--obsidian)] text-[var(--bone)] p-8">
      <div className="max-w-md text-center space-y-3 font-[Space_Grotesk]">
        <p className="text-xs tracking-[0.3em] text-aurora">// PLAYGROUND DERRUBADO</p>
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
      <p className="text-xs tracking-[0.3em] opacity-60">// 404 · imagens</p>
    </div>
  ),
});

type Tone = "mint" | "cyan" | "violet" | "plasma";

interface ImageModel {
  id:
    | "openai/gpt-image-2"
    | "openai/gpt-image-1-mini"
    | "google/gemini-2.5-flash-image"
    | "google/gemini-3-pro-image-preview"
    | "google/gemini-3.1-flash-image-preview";
  label: string;
  provider: "google" | "openai";
  tag: string;
  tone: Tone;
  modality: string;
  note: string;
}

const IMAGE_MODELS: ReadonlyArray<ImageModel> = [
  {
    id: "openai/gpt-image-2",
    label: "GPT-Image 2",
    provider: "openai",
    tag: "FLAGSHIP",
    tone: "violet",
    modality: "T → I",
    note: "State-of-the-art OpenAI. Suporta partials + quality low/med/high.",
  },
  {
    id: "openai/gpt-image-1-mini",
    label: "GPT-Image 1 Mini",
    provider: "openai",
    tag: "EFFICIENT",
    tone: "plasma",
    modality: "T → I",
    note: "Variante econômica OpenAI. Ícones, mocks, alto volume.",
  },
  {
    id: "google/gemini-3.1-flash-image-preview",
    label: "Gemini 3.1 Flash Image",
    provider: "google",
    tag: "NANO BANANA 2",
    tone: "mint",
    modality: "T+I → T+I",
    note: "Geração/edição rápida com qualidade pro.",
  },
  {
    id: "google/gemini-3-pro-image-preview",
    label: "Gemini 3 Pro Image",
    provider: "google",
    tag: "PRO QUALITY",
    tone: "cyan",
    modality: "T+I → T+I",
    note: "Top de linha Google. Alta fidelidade.",
  },
  {
    id: "google/gemini-2.5-flash-image",
    label: "Gemini 2.5 Flash Image",
    provider: "google",
    tag: "NANO BANANA",
    tone: "mint",
    modality: "T+I → T+I",
    note: "Versão estável da família Nano Banana.",
  },
];

function toneAccent(tone: Tone): string {
  switch (tone) {
    case "mint":
      return "oklch(0.86 0.21 158)";
    case "cyan":
      return "oklch(0.84 0.16 210)";
    case "violet":
      return "oklch(0.68 0.24 295)";
    case "plasma":
      return "oklch(0.72 0.28 335)";
  }
}

const DEFAULT_SYSTEM = `Você é um diretor de arte TIER S rodando dentro do console privado de Caio Mello.
Estilo: cinematográfico, denso, anti-genérico, anti-marketês.
Quando gerar imagem: alta fidelidade, iluminação intencional, composição editorial.
Nunca produza estética AI-padrão (gradientes roxos, sparkles, mascotes vazios).`;

type Status = "idle" | "streaming" | "done" | "error";

function ImagensPage() {
  const [modelId, setModelId] = useState<ImageModel["id"]>("openai/gpt-image-2");
  const [system, setSystem] = useState(DEFAULT_SYSTEM);
  const [prompt, setPrompt] = useState("");
  const [size, setSize] = useState("1024x1024");
  const [quality, setQuality] = useState<"low" | "medium" | "high">("low");
  const [src, setSrc] = useState<string | null>(null);
  const [isFinal, setIsFinal] = useState(false);
  const [frames, setFrames] = useState(0);
  const [status, setStatus] = useState<Status>("idle");
  const [errMsg, setErrMsg] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const abortRef = useRef<AbortController | null>(null);
  const startRef = useRef<number>(0);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const model = useMemo(
    () => IMAGE_MODELS.find((m) => m.id === modelId) ?? IMAGE_MODELS[0],
    [modelId],
  );
  const isOpenAI = model.provider === "openai";

  const stopTick = () => {
    if (tickRef.current !== null) {
      clearInterval(tickRef.current);
      tickRef.current = null;
    }
  };

  const generate = useCallback(async () => {
    if (!prompt.trim()) return;
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    setSrc(null);
    setIsFinal(false);
    setFrames(0);
    setStatus("streaming");
    setErrMsg(null);
    setElapsed(0);
    startRef.current = performance.now();
    stopTick();
    tickRef.current = setInterval(() => {
      setElapsed((performance.now() - startRef.current) / 1000);
    }, 100);

    try {
      await streamImage(
        "/api/generate-image",
        {
          model: modelId,
          prompt: prompt.trim(),
          system: system.trim() || undefined,
          size,
          quality,
        },
        (dataUrl, final) => {
          setSrc(dataUrl);
          setFrames((n) => n + 1);
          if (final) setIsFinal(true);
        },
        ctrl.signal,
      );
      setStatus("done");
    } catch (err) {
      if (ctrl.signal.aborted) {
        setStatus("idle");
        return;
      }
      const msg = err instanceof Error ? err.message : String(err);
      setErrMsg(msg);
      setStatus("error");
    } finally {
      stopTick();
      setElapsed((performance.now() - startRef.current) / 1000);
    }
  }, [modelId, prompt, system, size, quality]);

  const stop = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    stopTick();
    setStatus("idle");
  }, []);

  const isStreaming = status === "streaming";

  return (
    <main className="min-h-screen bg-[var(--obsidian)] text-[var(--bone)] grain">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-10 py-10 sm:py-14">
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
              <span className="text-aurora">imagens</span>
              <span className="opacity-40">.</span>
            </h1>
            <p className="font-mono text-[11px] tracking-[0.2em] opacity-60 max-w-md">
              PLAYGROUND · STREAM REAL · /v1/images/generations · 5 MODELOS
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-[10px] tracking-[0.25em] px-3 py-2 border border-[var(--bone)]/20 inline-flex items-center gap-2">
              <ImageIcon className="size-3.5" aria-hidden /> 5 IMAGEM
            </span>
            <span className="font-mono text-[10px] tracking-[0.25em] px-3 py-2 border border-[var(--bone)]/10 opacity-50 inline-flex items-center gap-2">
              <Video className="size-3.5" aria-hidden /> 0 VÍDEO
            </span>
          </div>
        </header>

        {/* PLAYGROUND */}
        <section
          aria-label="Playground geração de imagem"
          className="grid grid-cols-1 lg:grid-cols-[1fr_1.1fr] gap-4 mb-12"
        >
          {/* COLUNA ESQUERDA — controles */}
          <div className="space-y-4">
            {/* SYSTEM */}
            <fieldset className="border border-[var(--bone)]/15 p-4">
              <legend className="font-mono text-[10px] tracking-[0.35em] opacity-60 px-2">
                SYSTEM PROMPT
              </legend>
              <textarea
                value={system}
                onChange={(e) => setSystem(e.target.value)}
                rows={6}
                spellCheck={false}
                className="w-full bg-transparent font-mono text-[12px] leading-relaxed text-[var(--bone)]/90 outline-none resize-none placeholder:opacity-30"
                placeholder="// instruções de estilo, persona, constraints..."
              />
              <p className="font-mono text-[9px] opacity-40 mt-1">
                {system.length} chars · concatenado antes do prompt do usuário
              </p>
            </fieldset>

            {/* PROMPT */}
            <fieldset
              className="border p-4"
              style={{ borderColor: toneAccent(model.tone) }}
            >
              <legend
                className="font-mono text-[10px] tracking-[0.35em] px-2"
                style={{ color: toneAccent(model.tone) }}
              >
                DESCREVA A IMAGEM
              </legend>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                    e.preventDefault();
                    void generate();
                  }
                }}
                rows={5}
                autoFocus
                className="w-full bg-transparent font-[Space_Grotesk] text-[15px] leading-relaxed outline-none resize-none placeholder:opacity-30"
                placeholder="ex: retrato editorial de uma astronauta brasileira, luz lateral âmbar, grão de filme, 35mm…"
              />
              <div className="flex items-center justify-between mt-2 font-mono text-[9px] opacity-50">
                <span>{prompt.length} chars</span>
                <span>⌘/Ctrl + Enter para gerar</span>
              </div>
            </fieldset>

            {/* PARAMS */}
            <div className="grid grid-cols-2 gap-3">
              <label className="border border-[var(--bone)]/15 p-3 block">
                <span className="font-mono text-[9px] tracking-[0.3em] opacity-50 block mb-1">
                  MODEL
                </span>
                <select
                  value={modelId}
                  onChange={(e) =>
                    setModelId(e.target.value as ImageModel["id"])
                  }
                  className="w-full bg-[var(--obsidian)] font-mono text-[11px] outline-none"
                >
                  {IMAGE_MODELS.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.label} · {m.tag}
                    </option>
                  ))}
                </select>
              </label>

              <label className="border border-[var(--bone)]/15 p-3 block">
                <span className="font-mono text-[9px] tracking-[0.3em] opacity-50 block mb-1">
                  SIZE
                </span>
                <select
                  value={size}
                  onChange={(e) => setSize(e.target.value)}
                  disabled={!isOpenAI}
                  className="w-full bg-[var(--obsidian)] font-mono text-[11px] outline-none disabled:opacity-40"
                >
                  <option value="1024x1024">1024×1024 · square</option>
                  <option value="1024x1536">1024×1536 · portrait</option>
                  <option value="1536x1024">1536×1024 · landscape</option>
                </select>
              </label>

              <label className="border border-[var(--bone)]/15 p-3 block col-span-2">
                <span className="font-mono text-[9px] tracking-[0.3em] opacity-50 block mb-1">
                  QUALITY {isOpenAI ? "" : "(ignorado em Gemini)"}
                </span>
                <div className="flex gap-1">
                  {(["low", "medium", "high"] as const).map((q) => (
                    <button
                      key={q}
                      type="button"
                      disabled={!isOpenAI}
                      onClick={() => setQuality(q)}
                      className={`flex-1 font-mono text-[10px] tracking-[0.2em] py-1.5 border transition disabled:opacity-30 disabled:cursor-not-allowed ${
                        quality === q
                          ? "bg-[var(--bone)]/10 border-[var(--bone)]/60"
                          : "border-[var(--bone)]/15 hover:border-[var(--bone)]/40"
                      }`}
                    >
                      {q.toUpperCase()}
                    </button>
                  ))}
                </div>
              </label>
            </div>

            {/* AÇÕES */}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => void generate()}
                disabled={isStreaming || !prompt.trim()}
                className="flex-1 inline-flex items-center justify-center gap-2 py-3 font-mono text-[11px] tracking-[0.3em] bg-aurora text-[var(--obsidian)] disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {isStreaming ? (
                  <>
                    <Loader2 className="size-3.5 animate-spin" aria-hidden /> GERANDO…
                  </>
                ) : (
                  <>
                    <Play className="size-3.5" aria-hidden /> GERAR
                  </>
                )}
              </button>
              {isStreaming ? (
                <button
                  type="button"
                  onClick={stop}
                  className="inline-flex items-center justify-center gap-2 px-4 py-3 font-mono text-[11px] tracking-[0.3em] border border-[var(--bone)]/40 hover:border-[var(--bone)]"
                >
                  <Square className="size-3.5" aria-hidden /> STOP
                </button>
              ) : null}
            </div>
          </div>

          {/* COLUNA DIREITA — preview */}
          <div className="space-y-3">
            <div
              className="relative aspect-square border overflow-hidden"
              style={{
                borderColor:
                  status === "error"
                    ? "oklch(0.7 0.2 25)"
                    : toneAccent(model.tone),
                background: `repeating-linear-gradient(45deg, transparent 0 12px, ${toneAccent(model.tone)}08 12px 13px)`,
              }}
            >
              {src ? (
                <img
                  src={src}
                  alt={prompt || "imagem gerada"}
                  className="absolute inset-0 w-full h-full object-cover transition-[filter] duration-300"
                  style={{ filter: isFinal ? "none" : "blur(18px)" }}
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center">
                  <p className="font-mono text-[10px] tracking-[0.35em] opacity-40">
                    {status === "idle"
                      ? "// PREVIEW VAZIO"
                      : status === "streaming"
                        ? "// AGUARDANDO 1º FRAME…"
                        : "// ERRO"}
                  </p>
                </div>
              )}

              {/* HUD */}
              <div className="absolute top-2 left-2 right-2 flex items-start justify-between pointer-events-none">
                <span
                  className="font-mono text-[9px] tracking-[0.25em] px-1.5 py-0.5 border bg-[var(--obsidian)]/70 backdrop-blur"
                  style={{
                    borderColor: toneAccent(model.tone),
                    color: toneAccent(model.tone),
                  }}
                >
                  {model.tag}
                </span>
                <span className="font-mono text-[9px] tracking-[0.25em] px-1.5 py-0.5 border border-[var(--bone)]/30 bg-[var(--obsidian)]/70 backdrop-blur">
                  {status.toUpperCase()}
                </span>
              </div>

              {isStreaming ? (
                <div className="absolute bottom-0 inset-x-0 h-0.5 bg-aurora animate-pulse" />
              ) : null}
            </div>

            {/* INFO BAR */}
            <div className="grid grid-cols-3 gap-2 font-mono text-[10px]">
              <div className="border border-[var(--bone)]/15 px-2 py-1.5">
                <p className="opacity-40 text-[8px] tracking-[0.3em]">FRAMES</p>
                <p>{frames}</p>
              </div>
              <div className="border border-[var(--bone)]/15 px-2 py-1.5">
                <p className="opacity-40 text-[8px] tracking-[0.3em]">TEMPO</p>
                <p>{elapsed.toFixed(1)}s</p>
              </div>
              <div className="border border-[var(--bone)]/15 px-2 py-1.5 truncate">
                <p className="opacity-40 text-[8px] tracking-[0.3em]">MODEL</p>
                <p className="truncate">{model.id.split("/")[1]}</p>
              </div>
            </div>

            {/* ERRO */}
            {errMsg ? (
              <div className="border border-[oklch(0.7_0.2_25)] p-3 font-mono text-[10px] text-[oklch(0.85_0.18_25)] whitespace-pre-wrap break-words">
                {errMsg}
              </div>
            ) : null}

            {/* DOWNLOAD */}
            {src && isFinal ? (
              <a
                href={src}
                download={`imagem-${Date.now()}.png`}
                className="block text-center py-2 border border-[var(--bone)]/30 hover:border-[var(--bone)] font-mono text-[10px] tracking-[0.3em]"
              >
                ↓ DOWNLOAD PNG
              </a>
            ) : null}

            <p className="font-mono text-[9px] opacity-50 leading-relaxed">
              {model.note}
            </p>
          </div>
        </section>

        {/* CATÁLOGO COMPLETO */}
        <section aria-labelledby="catalogo" className="space-y-4">
          <h2
            id="catalogo"
            className="font-mono text-[10px] tracking-[0.35em] opacity-50"
          >
            ◇ CATÁLOGO COMPLETO
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {IMAGE_MODELS.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => setModelId(m.id)}
                className={`text-left p-4 border transition ${
                  modelId === m.id
                    ? "border-[var(--bone)]/60"
                    : "border-[var(--bone)]/15 hover:border-[var(--bone)]/40"
                }`}
                style={{ boxShadow: `inset 0 0 0 1px ${toneAccent(m.tone)}22` }}
              >
                <div className="flex items-start justify-between gap-2 mb-3">
                  <span
                    className="font-mono text-[9px] tracking-[0.25em] px-1.5 py-0.5 border"
                    style={{
                      borderColor: toneAccent(m.tone),
                      color: toneAccent(m.tone),
                    }}
                  >
                    {m.tag}
                  </span>
                  <span className="font-mono text-[9px] tracking-[0.2em] opacity-50">
                    {m.modality}
                  </span>
                </div>
                <p className="font-[Instrument_Serif] text-xl italic leading-tight">
                  {m.label}
                </p>
                <p className="font-mono text-[10px] opacity-50 mt-1 break-all">
                  {m.id}
                </p>
                <p className="font-mono text-[10px] opacity-70 mt-3 leading-relaxed">
                  {m.note}
                </p>
              </button>
            ))}
          </div>

          <section aria-labelledby="grp-video" className="pt-4">
            <h3
              id="grp-video"
              className="font-mono text-[10px] tracking-[0.35em] opacity-50 mb-3"
            >
              ◇ VÍDEO · INDISPONÍVEL NO GATEWAY
            </h3>
            <div className="border border-dashed border-[var(--bone)]/15 p-4 font-mono text-[11px] opacity-60 space-y-1">
              <p>// Veo/Sora/Runway não expostos hoje no Lovable AI Gateway.</p>
              <p>// Quando entrarem (provável veo-3 / veo-3-fast), aparece aqui.</p>
            </div>
          </section>
        </section>

        {/* RODAPÉ */}
        <footer className="mt-14 pt-6 border-t border-[var(--bone)]/10 font-mono text-[10px] tracking-[0.2em] opacity-50 space-y-1">
          <p>// SERVER ROUTE /api/generate-image · SSE PASSTHROUGH</p>
          <p>// OPENAI: prompt + quality + partial_images=1 · GEMINI: messages + modalities</p>
          <p>// PARSER: eventsource-parser + flushSync (React 18 batching mata partials)</p>
        </footer>
      </div>
    </main>
  );
}
