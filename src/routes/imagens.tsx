import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, ImageIcon, Loader2, Play, Square, Video } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { streamImage } from "@/lib/stream-image";

export const Route = createFileRoute("/imagens")({
  head: () => ({
    meta: [
      { title: "IMAGENS — Playground IA Imagem · Obsidian Aurora" },
      {
        name: "description",
        content:
          "Playground de geração de imagem via Lovable AI Gateway (GPT-Image-2 / Nano Banana 2 / Gemini 3 Pro), com streaming de frames parciais em tempo real.",
      },
      { property: "og:title", content: "IMAGENS — Playground IA Imagem" },
      {
        property: "og:description",
        content:
          "Geração streaming com blur progressivo. Cobertura: openai/gpt-image-2, google/gemini-3-pro-image-preview e variantes Flash.",
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

type ModelId =
  | "openai/gpt-image-2"
  | "openai/gpt-image-1-mini"
  | "google/gemini-3.1-flash-image-preview"
  | "google/gemini-2.5-flash-image"
  | "google/gemini-3-pro-image-preview"
  | "gas/gemini-2.5-flash-image-preview"
  | "gas/gemini-2.5-flash-image"
  | "gas/imagen-4.0-ultra-generate-001"
  | "gas/imagen-4.0-generate-001"
  | "gas/imagen-4.0-fast-generate-001"
  | "gas/imagen-3.0-generate-002";

type Provider = "openai" | "google" | "google-ai-studio";

interface ImageModel {
  id: ModelId;
  label: string;
  provider: Provider;
  tag: string;
  tone: Tone;
  modality: string;
  note: string;
  supportsSize: boolean;
  supportsQuality: boolean;
  supportsAspectRatio: boolean;
}

const IMAGE_MODELS: ReadonlyArray<ImageModel> = [
  {
    id: "openai/gpt-image-2",
    label: "GPT-Image-2",
    provider: "openai",
    tag: "DEFAULT · STREAM",
    tone: "violet",
    modality: "T → I",
    note: "State-of-the-art OpenAI via Lovable Gateway. Stream com 2 frames parciais. Cobra crédito Lovable.",
    supportsSize: true,
    supportsQuality: true,
    supportsAspectRatio: false,
  },
  {
    id: "openai/gpt-image-1-mini",
    label: "GPT-Image-1 mini",
    provider: "openai",
    tag: "CHEAP · STREAM",
    tone: "mint",
    modality: "T → I",
    note: "Variante econômica via Lovable Gateway. Bom para iterar prompt antes de fechar no 2.",
    supportsSize: true,
    supportsQuality: true,
    supportsAspectRatio: false,
  },
  {
    id: "google/gemini-3.1-flash-image-preview",
    label: "Nano Banana 2 (Gateway)",
    provider: "google",
    tag: "FAST · GATEWAY",
    tone: "cyan",
    modality: "T,I → T,I",
    note: "Gemini 3.1 Flash Image via Lovable Gateway. Cobra crédito Lovable. Streaming nativo.",
    supportsSize: false,
    supportsQuality: false,
    supportsAspectRatio: false,
  },
  {
    id: "google/gemini-2.5-flash-image",
    label: "Nano Banana (Gateway)",
    provider: "google",
    tag: "STREAM",
    tone: "cyan",
    modality: "T,I → T,I",
    note: "Gemini 2.5 Flash Image via Lovable Gateway.",
    supportsSize: false,
    supportsQuality: false,
    supportsAspectRatio: false,
  },
  {
    id: "google/gemini-3-pro-image-preview",
    label: "Gemini 3 Pro Image (Gateway)",
    provider: "google",
    tag: "HIGH FIDELITY",
    tone: "plasma",
    modality: "T,I → T,I",
    note: "Geração editorial high-end via Lovable Gateway. Mais caro, melhor coerência.",
    supportsSize: false,
    supportsQuality: false,
    supportsAspectRatio: false,
  },
  {
    id: "gas/gemini-2.5-flash-image-preview",
    label: "Nano Banana · GAS",
    provider: "google-ai-studio",
    tag: "DIRECT · PREVIEW",
    tone: "mint",
    modality: "T,I → T,I",
    note: "Gemini 2.5 Flash Image preview direto no Google AI Studio com sua chave. Sem custo Lovable.",
    supportsSize: false,
    supportsQuality: false,
    supportsAspectRatio: false,
  },
  {
    id: "gas/gemini-2.5-flash-image",
    label: "Nano Banana stable · GAS",
    provider: "google-ai-studio",
    tag: "DIRECT · STABLE",
    tone: "cyan",
    modality: "T,I → T,I",
    note: "Gemini 2.5 Flash Image estável direto no Google AI Studio.",
    supportsSize: false,
    supportsQuality: false,
    supportsAspectRatio: false,
  },
  {
    id: "gas/imagen-4.0-ultra-generate-001",
    label: "Imagen 4 Ultra · GAS",
    provider: "google-ai-studio",
    tag: "TOP · DIRECT",
    tone: "plasma",
    modality: "T → I",
    note: "Imagen 4 Ultra — máxima fidelidade fotorrealista. Mais caro/lento.",
    supportsSize: false,
    supportsQuality: false,
    supportsAspectRatio: true,
  },
  {
    id: "gas/imagen-4.0-generate-001",
    label: "Imagen 4 · GAS",
    provider: "google-ai-studio",
    tag: "PHOTOREAL · DIRECT",
    tone: "plasma",
    modality: "T → I",
    note: "Imagen 4 (text-to-image fotorrealismo) direto na sua key Google AI Studio. Suporta aspect ratio.",
    supportsSize: false,
    supportsQuality: false,
    supportsAspectRatio: true,
  },
  {
    id: "gas/imagen-4.0-fast-generate-001",
    label: "Imagen 4 Fast · GAS",
    provider: "google-ai-studio",
    tag: "FAST · DIRECT",
    tone: "mint",
    modality: "T → I",
    note: "Imagen 4 Fast — mais barato e rápido, qualidade ligeiramente menor.",
    supportsSize: false,
    supportsQuality: false,
    supportsAspectRatio: true,
  },
  {
    id: "gas/imagen-3.0-generate-002",
    label: "Imagen 3 · GAS",
    provider: "google-ai-studio",
    tag: "STABLE · DIRECT",
    tone: "violet",
    modality: "T → I",
    note: "Imagen 3 estável (fallback se Imagen 4 não estiver disponível na sua região).",
    supportsSize: false,
    supportsQuality: false,
    supportsAspectRatio: true,
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
  const [modelId, setModelId] = useState<ModelId>("gas/gemini-2.5-flash-image-preview");
  const [system, setSystem] = useState(DEFAULT_SYSTEM);
  const [prompt, setPrompt] = useState("");
  const [size, setSize] = useState("1024x1024");
  const [quality, setQuality] = useState<"low" | "medium" | "high">("low");
  const [aspectRatio, setAspectRatio] = useState<"1:1" | "3:4" | "4:3" | "9:16" | "16:9">("1:1");
  const [src, setSrc] = useState<string | null>(null);
  const [isFinal, setIsFinal] = useState(false);
  const [frames, setFrames] = useState(0);
  const [status, setStatus] = useState<Status>("idle");
  const [errMsg, setErrMsg] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const startRef = useRef<number>(0);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const model = useMemo(
    () => IMAGE_MODELS.find((m) => m.id === modelId) ?? IMAGE_MODELS[0],
    [modelId],
  );

  const stopTick = () => {
    if (tickRef.current !== null) {
      clearInterval(tickRef.current);
      tickRef.current = null;
    }
  };

  useEffect(
    () => () => {
      stopTick();
      abortRef.current?.abort();
    },
    [],
  );

  const generate = useCallback(async () => {
    const nextPrompt = prompt.trim();
    if (!nextPrompt) return;

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
      const isGAS = model.provider === "google-ai-studio";
      const endpoint = isGAS ? "/api/generate-image-google" : "/api/generate-image";
      const modelForApi = isGAS ? (modelId.replace(/^gas\//, "") as string) : modelId;
      await streamImage(
        endpoint,
        {
          model: modelForApi,
          prompt: nextPrompt,
          system: system.trim() || undefined,
          size: model.supportsSize ? size : undefined,
          quality: model.supportsQuality ? quality : undefined,
          aspectRatio: model.supportsAspectRatio ? aspectRatio : undefined,
        },
        (dataUrl, final) => {
          setSrc(dataUrl);
          setFrames((n) => n + 1);
          if (final) {
            setIsFinal(true);
            setStatus("done");
            stopTick();
            setElapsed((performance.now() - startRef.current) / 1000);
          }
        },
        ctrl.signal,
      );
    } catch (e) {
      if (ctrl.signal.aborted) return;
      const msg = e instanceof Error ? e.message : String(e);
      setStatus("error");
      stopTick();
      setElapsed((performance.now() - startRef.current) / 1000);
      setErrMsg(msg);
    }
  }, [
    modelId,
    prompt,
    system,
    size,
    quality,
    aspectRatio,
    model.provider,
    model.supportsSize,
    model.supportsQuality,
    model.supportsAspectRatio,
  ]);

  const stop = useCallback(() => {
    abortRef.current?.abort();
    stopTick();
    setStatus("idle");
  }, []);

  const isStreaming = status === "streaming";
  const errorIsRate = errMsg ? /402|429|crédito|credit|rate|limit/i.test(errMsg) : false;
  const errorAccent = errorIsRate ? "oklch(0.82 0.16 90)" : "oklch(0.7 0.2 25)";

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
              PLAYGROUND · LOVABLE AI GATEWAY · STREAMING SSE · PARTIAL FRAMES
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-[10px] tracking-[0.25em] px-3 py-2 border border-[var(--bone)]/20 inline-flex items-center gap-2">
              <ImageIcon className="size-3.5" aria-hidden /> {IMAGE_MODELS.length} IMAGEM
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
            <fieldset className="border p-4" style={{ borderColor: toneAccent(model.tone) }}>
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
              <label className="border border-[var(--bone)]/15 p-3 block col-span-2">
                <span className="font-mono text-[9px] tracking-[0.3em] opacity-50 block mb-1">
                  MODEL
                </span>
                <select
                  value={modelId}
                  onChange={(e) => setModelId(e.target.value as ModelId)}
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
                  SIZE {model.supportsSize ? "" : "(n/a)"}
                </span>
                <select
                  value={size}
                  onChange={(e) => setSize(e.target.value)}
                  disabled={!model.supportsSize}
                  className="w-full bg-[var(--obsidian)] font-mono text-[11px] outline-none disabled:opacity-40"
                >
                  <option value="1024x1024">1024×1024 · square</option>
                  <option value="1024x1536">1024×1536 · portrait</option>
                  <option value="1536x1024">1536×1024 · landscape</option>
                </select>
              </label>

              <label className="border border-[var(--bone)]/15 p-3 block">
                <span className="font-mono text-[9px] tracking-[0.3em] opacity-50 block mb-1">
                  QUALITY {model.supportsQuality ? "" : "(n/a)"}
                </span>
                <div className="flex gap-1">
                  {(["low", "medium", "high"] as const).map((q) => (
                    <button
                      key={q}
                      type="button"
                      disabled={!model.supportsQuality}
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

              <label className="border border-[var(--bone)]/15 p-3 block col-span-2">
                <span className="font-mono text-[9px] tracking-[0.3em] opacity-50 block mb-1">
                  ASPECT RATIO {model.supportsAspectRatio ? "" : "(n/a)"}
                </span>
                <div className="flex gap-1 flex-wrap">
                  {(["1:1", "3:4", "4:3", "9:16", "16:9"] as const).map((ar) => (
                    <button
                      key={ar}
                      type="button"
                      disabled={!model.supportsAspectRatio}
                      onClick={() => setAspectRatio(ar)}
                      className={`flex-1 min-w-[56px] font-mono text-[10px] tracking-[0.2em] py-1.5 border transition disabled:opacity-30 disabled:cursor-not-allowed ${
                        aspectRatio === ar
                          ? "bg-[var(--bone)]/10 border-[var(--bone)]/60"
                          : "border-[var(--bone)]/15 hover:border-[var(--bone)]/40"
                      }`}
                    >
                      {ar}
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
                borderColor: status === "error" ? "oklch(0.7 0.2 25)" : toneAccent(model.tone),
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
              <div
                className="border p-3 font-mono text-[10px] whitespace-pre-wrap break-words space-y-2"
                style={{ borderColor: errorAccent, color: errorAccent }}
              >
                <p className="tracking-[0.25em] text-[9px] opacity-80">
                  {errorIsRate ? "// LOVABLE AI · LIMITE/CRÉDITO" : "// ERRO UPSTREAM"}
                </p>
                <p className="leading-relaxed">{errMsg}</p>
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

            <p className="font-mono text-[9px] opacity-50 leading-relaxed">{model.note}</p>
          </div>
        </section>

        {/* CATÁLOGO COMPLETO */}
        <section aria-labelledby="catalogo" className="space-y-4">
          <h2 id="catalogo" className="font-mono text-[10px] tracking-[0.35em] opacity-50">
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
                <p className="font-[Instrument_Serif] text-xl italic leading-tight">{m.label}</p>
                <p className="font-mono text-[10px] opacity-50 mt-1 break-all">{m.id}</p>
                <p className="font-mono text-[10px] opacity-70 mt-3 leading-relaxed">{m.note}</p>
              </button>
            ))}
          </div>

          <section aria-labelledby="grp-video" className="pt-4">
            <h3 id="grp-video" className="font-mono text-[10px] tracking-[0.35em] opacity-50 mb-3">
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
          <p>// SERVER ROUTE /api/generate-image · PROVIDER: Lovable AI Gateway</p>
          <p>// SSE pass-through · image_generation.partial_image → blur · completed → sharp</p>
          <p>// OpenAI gpt-image-2/mini · Google Nano Banana 2 / Gemini 3 Pro Image</p>
        </footer>
      </div>
    </main>
  );
}
