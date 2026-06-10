import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, ImageIcon, Video } from "lucide-react";

export const Route = createFileRoute("/imagens")({
  head: () => ({
    meta: [
      { title: "IMAGENS — Catálogo IA Imagem/Vídeo · Obsidian Aurora" },
      {
        name: "description",
        content:
          "Catálogo dos modelos premium de geração de imagem e vídeo disponíveis no Lovable AI Gateway.",
      },
      { property: "og:title", content: "IMAGENS — Catálogo IA Imagem/Vídeo" },
      {
        property: "og:description",
        content:
          "5 modelos de imagem (Gemini Nano Banana + GPT-Image). Vídeo ainda não exposto no gateway.",
      },
    ],
  }),
  component: ImagensPage,
  errorComponent: ({ error, reset }) => (
    <div className="min-h-screen flex items-center justify-center bg-[var(--obsidian)] text-[var(--bone)] p-8">
      <div className="max-w-md text-center space-y-3 font-[Space_Grotesk]">
        <p className="text-xs tracking-[0.3em] text-aurora">// CATÁLOGO DERRUBADO</p>
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
  id: string;
  label: string;
  provider: "google" | "openai";
  tag: string;
  tone: Tone;
  endpoint: "images" | "chat";
  modality: string;
  note: string;
}

const IMAGE_MODELS: ReadonlyArray<ImageModel> = [
  {
    id: "google/gemini-3.1-flash-image-preview",
    label: "Gemini 3.1 Flash Image",
    provider: "google",
    tag: "NANO BANANA 2",
    tone: "mint",
    endpoint: "chat",
    modality: "T+I → T+I",
    note: "Geração/edição rápida com qualidade pro. Aceita texto + imagens de referência.",
  },
  {
    id: "google/gemini-3-pro-image-preview",
    label: "Gemini 3 Pro Image",
    provider: "google",
    tag: "PRO QUALITY",
    tone: "cyan",
    endpoint: "chat",
    modality: "T+I → T+I",
    note: "Top de linha Google pra imagem. Geração e edição de alta fidelidade.",
  },
  {
    id: "google/gemini-2.5-flash-image",
    label: "Gemini 2.5 Flash Image",
    provider: "google",
    tag: "NANO BANANA",
    tone: "mint",
    endpoint: "chat",
    modality: "T+I → T+I",
    note: "Versão estável da família Nano Banana. Edição instrucional via prompt.",
  },
  {
    id: "openai/gpt-image-2",
    label: "GPT-Image 2",
    provider: "openai",
    tag: "FLAGSHIP",
    tone: "violet",
    endpoint: "images",
    modality: "T → I",
    note: "State-of-the-art OpenAI. Suporta streaming de partials e quality low/med/high.",
  },
  {
    id: "openai/gpt-image-1-mini",
    label: "GPT-Image 1 Mini",
    provider: "openai",
    tag: "EFFICIENT",
    tone: "plasma",
    endpoint: "images",
    modality: "T → I",
    note: "Variante econômica OpenAI. Boa pra ícones, mocks e alto volume.",
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

function toneBorder(tone: Tone): string {
  return `border-[oklch(0.85_0.18_200_/_0.4)]`.replace(
    "oklch(0.85 0.18 200 / 0.4)",
    toneAccent(tone),
  );
}

function ImagensPage() {
  const google = IMAGE_MODELS.filter((m) => m.provider === "google");
  const openai = IMAGE_MODELS.filter((m) => m.provider === "openai");

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
              <span className="text-aurora">imagens</span>
              <span className="opacity-40">.</span>
            </h1>
            <p className="font-mono text-[11px] tracking-[0.2em] opacity-60 max-w-md">
              CATÁLOGO IA IMAGEM/VÍDEO · LOVABLE GATEWAY · 5 MODELOS DISPONÍVEIS
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

        {/* DESTAQUE */}
        <section
          aria-label="Modelo recomendado"
          className="mb-10 border border-[var(--bone)]/15 p-5 sm:p-6 flex flex-wrap items-center justify-between gap-4"
          style={{
            background: `linear-gradient(135deg, transparent, ${toneAccent("violet")}10)`,
          }}
        >
          <div className="space-y-1.5">
            <p className="font-mono text-[10px] tracking-[0.3em] opacity-60">RECOMENDADO</p>
            <p className="font-[Instrument_Serif] text-3xl sm:text-4xl italic">GPT-Image 2</p>
            <p className="font-mono text-[10px] opacity-50">openai/gpt-image-2</p>
          </div>
          <div className="flex flex-col items-end gap-1">
            <span
              className="font-mono text-[10px] tracking-[0.25em] px-2 py-1 border"
              style={{
                borderColor: toneAccent("violet"),
                color: toneAccent("violet"),
              }}
            >
              FLAGSHIP
            </span>
            <span className="font-mono text-[10px] opacity-60">/v1/images/generations</span>
            <span className="font-mono text-[10px] opacity-60">streaming · partials</span>
          </div>
        </section>

        {/* GRID */}
        <div className="space-y-10">
          <Group label="GEMINI · GOOGLE" items={google} />
          <Group label="GPT · OPENAI" items={openai} />

          {/* VIDEO */}
          <section aria-labelledby="grp-video">
            <h2
              id="grp-video"
              className="font-mono text-[10px] tracking-[0.35em] opacity-50 mb-4"
            >
              ◇ VÍDEO · INDISPONÍVEL NO GATEWAY
            </h2>
            <div className="border border-dashed border-[var(--bone)]/15 p-5 font-mono text-[11px] tracking-[0.05em] opacity-60 space-y-2">
              <p>
                // O Lovable AI Gateway <strong>não expõe</strong> modelos de geração de vídeo
                (Veo, Sora, Runway, etc.) hoje.
              </p>
              <p>
                // Pra vídeo dentro do app do usuário, hoje só via API externa com chave própria
                (Replicate, fal.ai, Google Veo direto).
              </p>
              <p>
                // Quando/se o gateway expor (provável <span className="text-aurora">veo-3</span>{" "}
                ou <span className="text-aurora">veo-3-fast</span>), entra aqui automaticamente.
              </p>
            </div>
          </section>
        </div>

        {/* RODAPÉ TÉCNICO */}
        <footer className="mt-14 pt-6 border-t border-[var(--bone)]/10 font-mono text-[10px] tracking-[0.2em] opacity-50 space-y-1">
          <p>// GATEWAY LOVABLE · ENDPOINT /v1/images/generations (OPENAI) OU /v1/chat/completions (GEMINI)</p>
          <p>// GEMINI USA modalities:["image","text"] · OPENAI USA prompt + size + quality</p>
          <p>// CATÁLOGO INFORMATIVO · SEM SELETOR (RUNTIME ESCOLHE POR REQUEST)</p>
        </footer>
      </div>
    </main>
  );
}

function Group({
  label,
  items,
}: {
  label: string;
  items: ReadonlyArray<ImageModel>;
}) {
  return (
    <section aria-labelledby={`grp-${label}`}>
      <h2
        id={`grp-${label}`}
        className="font-mono text-[10px] tracking-[0.35em] opacity-50 mb-4"
      >
        ◇ {label}
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {items.map((m) => (
          <article
            key={m.id}
            className="group relative text-left p-4 border border-[var(--bone)]/15 hover:border-[var(--bone)]/50 transition"
            style={{ boxShadow: `inset 0 0 0 1px ${toneAccent(m.tone)}22` }}
          >
            <div className="flex items-start justify-between gap-2 mb-3">
              <span
                className="font-mono text-[9px] tracking-[0.25em] px-1.5 py-0.5 border"
                style={{ borderColor: toneAccent(m.tone), color: toneAccent(m.tone) }}
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
            <div className="mt-3 flex items-center justify-between font-mono text-[10px] opacity-60">
              <span>
                {m.endpoint === "images" ? "/v1/images/generations" : "/v1/chat/completions"}
              </span>
              <span className="tracking-[0.2em]">{m.provider.toUpperCase()}</span>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
