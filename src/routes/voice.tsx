import { createFileRoute, Link } from "@tanstack/react-router";
import { Client, handle_file } from "@gradio/client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  Languages,
  Loader2,
  Mic2,
  Palette,
  Sliders,
  Sparkles,
  Upload,
  Volume2,
  Wand2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/voice")({
  component: VoicePage,
});

const SPACE_URL = "https://openbmb-voxcpm-demo.hf.space/";

type Mode = "design" | "controllable" | "ultimate";
type Lang = "pt" | "en";

interface ModeCopy {
  label: string;
  tag: string;
  body: string;
}

interface I18nDict {
  nav: { back: string; module: string };
  hero: { kicker: string; title1: string; title2: string; title3: string; sub: string };
  modes: Record<Mode, ModeCopy>;
  labels: {
    referenceAudio: string;
    refDrop: string;
    refUpload: string;
    refRemove: string;
    transcript: string;
    transcriptPlaceholder: string;
    control: string;
    controlHint: string;
    controlPlaceholder: string;
    target: string;
    targetHint: string;
    targetPlaceholder: string;
    advanced: string;
    cfg: string;
    cfgHint: string;
    denoise: string;
    normalize: string;
    generate: string;
    generating: string;
    connected: string;
    connecting: string;
    output: string;
    outputTitle: string;
    waiting: string;
    rendering: string;
    download: string;
    presets: string;
    presetsTitle: string;
    example: string;
    tech: string;
    footer: string;
    backToIndex: string;
    sizeKb: (kb: string) => string;
  };
  errors: {
    connect: (msg: string) => string;
    ultimateNeedsRef: string;
    unsupportedFormat: string;
    notConnected: string;
    needTarget: string;
    designNeedsControl: string;
    modeNeedsRef: string;
    ultimateNeedsTranscript: string;
    noAudio: string;
    queueFull: string;
  };
  examples: ReadonlyArray<{ title: string; control: string; text: string }>;
}

const DICT: Record<Lang, I18nDict> = {
  pt: {
    nav: { back: "Obsidian Index", module: "módulo · voxcpm2 · tts" },
    hero: {
      kicker: "00 · voice forge",
      title1: "VoxCPM2",
      title2: "voice",
      title3: "forge",
      sub: "Geração de fala neural em três modos — voz inventada do zero, clone controlado por estilo e replicação ultra-fiel por continuação de áudio. Roda direto no Space oficial OpenBMB.",
    },
    modes: {
      design: { label: "Voice Design", tag: "Zero-Shot", body: "Cria uma voz totalmente nova só com descrição em texto. Sem áudio de referência." },
      controllable: { label: "Controllable Cloning", tag: "Clone + Estilo", body: "Faz clone de um áudio de referência e ajusta emoção, ritmo e estilo via instrução." },
      ultimate: { label: "Ultimate Cloning", tag: "Fidelidade Máxima", body: "Continuação por áudio — usa o clip + transcrição como prefixo e replica cada nuance." },
    },
    labels: {
      referenceAudio: "Áudio de Referência",
      refDrop: "Arraste áudio aqui — ou clique para enviar",
      refUpload: "Enviar",
      refRemove: "Remover áudio",
      transcript: "Transcrição da Referência",
      transcriptPlaceholder: "Transcreva o que está dito no áudio de referência…",
      control: "Instrução de Controle",
      controlHint: "Descreva timbre, idade, emoção, ritmo",
      controlPlaceholder: 'Ex.: "Narrador calmo de meia-idade, voz quente e pausada, leve sotaque britânico."',
      target: "Texto Alvo",
      targetHint: "O que a voz deve falar",
      targetPlaceholder: "Digite o roteiro a ser sintetizado…",
      advanced: "⚙ Configurações Avançadas",
      cfg: "CFG · Escala de Guidance",
      cfgHint: "↑ mais fiel ao prompt · ↓ mais criativo",
      denoise: "Aprimoramento do áudio de referência (ZipEnhancer)",
      normalize: "Normalização de texto (números, datas, abreviações)",
      generate: "Gerar Voz",
      generating: "Sintetizando…",
      connected: "space · conectado",
      connecting: "space · conectando…",
      output: "saída",
      outputTitle: "Áudio Gerado",
      waiting: "aguardando geração",
      rendering: "renderizando…",
      download: "↓ baixar wav",
      presets: "presets",
      presetsTitle: "Exemplos de Voz",
      example: "Exemplo",
      tech: "tecnologia",
      footer: "obsidian aurora · módulo de voz",
      backToIndex: "← voltar ao início",
      sizeKb: (kb) => `${kb} kb`,
    },
    errors: {
      connect: (msg) => `Falha ao conectar ao Space: ${msg}`,
      ultimateNeedsRef: "O modo Ultimate requer um áudio de referência.",
      unsupportedFormat: "Formato não suportado. Envie um áudio (wav, mp3, m4a, ogg, flac).",
      notConnected: "Cliente não conectado ainda.",
      needTarget: "Informe o texto-alvo a ser falado.",
      designNeedsControl: "No modo Voice Design, descreva a voz em Instrução de Controle.",
      modeNeedsRef: "Esse modo exige um áudio de referência.",
      ultimateNeedsTranscript: "No Ultimate Cloning, informe a transcrição do áudio de referência.",
      noAudio: "O Space não retornou áudio.",
      queueFull: "Fila do Space cheia. Aguarde alguns segundos e tente de novo.",
    },
    examples: [
      {
        title: "Garota Doce e Melancólica",
        control: "Voz de garota jovem, suave e doce. Fala devagar, com tom melancólico e levemente tsundere.",
        text: "Eu nunca te pedi pra ficar… Não é como se eu me importasse ou algo assim. Mas… por que ainda dói tanto agora que você foi embora?",
      },
      {
        title: "Surfista Descolado",
        control: "Voz masculina jovem e relaxada, levemente nasal, arrastada, bem casual e tranquila.",
        text: "Cara, viu aquela série de ondas? O mar tá insano hoje. Passei a manhã pegando tubo — é tipo, sensacional, sacou?",
      },
    ],
  },
  en: {
    nav: { back: "Obsidian Index", module: "module · voxcpm2 · tts" },
    hero: {
      kicker: "00 · voice forge",
      title1: "VoxCPM2",
      title2: "voice",
      title3: "forge",
      sub: "Neural speech generation in three modes — invented from scratch, style-controlled cloning, and ultra-faithful audio continuation. Runs on the official OpenBMB Space.",
    },
    modes: {
      design: { label: "Voice Design", tag: "Zero-Shot", body: "Create a brand-new voice from text description only. No reference audio needed." },
      controllable: { label: "Controllable Cloning", tag: "Clone + Style", body: "Clone a reference audio and adjust emotion, pace and style through an instruction." },
      ultimate: { label: "Ultimate Cloning", tag: "Max Fidelity", body: "Audio continuation — uses the clip + transcript as a prefix and replicates every nuance." },
    },
    labels: {
      referenceAudio: "Reference Audio",
      refDrop: "Drop audio here — or click to upload",
      refUpload: "Upload",
      refRemove: "Remove audio",
      transcript: "Reference Transcript",
      transcriptPlaceholder: "Transcribe what is said in the reference audio…",
      control: "Control Instruction",
      controlHint: "Describe timbre, age, emotion, pace",
      controlPlaceholder: 'E.g.: "Calm middle-aged narrator, warm and deliberate, slight British accent."',
      target: "Target Text",
      targetHint: "What the voice should say",
      targetPlaceholder: "Type the script to synthesize…",
      advanced: "⚙ Advanced Settings",
      cfg: "CFG · Guidance Scale",
      cfgHint: "↑ closer to prompt · ↓ more creative",
      denoise: "Reference audio enhancement (ZipEnhancer)",
      normalize: "Text normalization (numbers, dates, abbreviations)",
      generate: "Generate Voice",
      generating: "Synthesizing…",
      connected: "space · connected",
      connecting: "space · connecting…",
      output: "output",
      outputTitle: "Generated Audio",
      waiting: "awaiting generation",
      rendering: "rendering…",
      download: "↓ download wav",
      presets: "presets",
      presetsTitle: "Voice Examples",
      example: "Example",
      tech: "tech",
      footer: "obsidian aurora · voice module",
      backToIndex: "← back to index",
      sizeKb: (kb) => `${kb} kb`,
    },
    errors: {
      connect: (msg) => `Failed to connect to Space: ${msg}`,
      ultimateNeedsRef: "Ultimate mode requires a reference audio.",
      unsupportedFormat: "Unsupported format. Send an audio file (wav, mp3, m4a, ogg, flac).",
      notConnected: "Client not connected yet.",
      needTarget: "Provide the target text to speak.",
      designNeedsControl: "In Voice Design mode, describe the voice in Control Instruction.",
      modeNeedsRef: "This mode requires a reference audio.",
      ultimateNeedsTranscript: "In Ultimate Cloning, provide the transcript of the reference audio.",
      noAudio: "The Space returned no audio.",
      queueFull: "Space queue is full. Wait a few seconds and try again.",
    },
    examples: [
      {
        title: "Gentle & Melancholic Girl",
        control: "A young girl with a soft, sweet voice. Speaks slowly with a melancholic, slightly tsundere tone.",
        text: "I never asked you to stay… It's not like I care or anything. But… why does it still hurt so much now that you're gone?",
      },
      {
        title: "Laid-Back Surfer Dude",
        control: "Relaxed young male voice, slightly nasal, lazy drawl, very casual and chill.",
        text: "Dude, did you see that set? The waves out there are totally gnarly today. Just catching barrels all morning — it's like, totally righteous, you know what I mean?",
      },
    ],
  },
};

const MODE_ORDER: ReadonlyArray<{ id: Mode; no: string; icon: typeof Palette }> = [
  { id: "design", no: "01", icon: Palette },
  { id: "controllable", no: "02", icon: Sliders },
  { id: "ultimate", no: "03", icon: Wand2 },
];

interface GenerateResult {
  url: string;
  filename: string;
}

function detectInitialLang(): Lang {
  if (typeof navigator === "undefined") return "pt";
  return navigator.language?.toLowerCase().startsWith("pt") ? "pt" : "en";
}

function VoicePage() {
  const [lang, setLang] = useState<Lang>(() => {
    if (typeof window === "undefined") return "pt";
    const saved = window.localStorage?.getItem("voice:lang") as Lang | null;
    return saved === "pt" || saved === "en" ? saved : detectInitialLang();
  });
  const t = useMemo(() => DICT[lang], [lang]);

  useEffect(() => {
    if (typeof window !== "undefined") window.localStorage?.setItem("voice:lang", lang);
    if (typeof document !== "undefined") document.documentElement.lang = lang === "pt" ? "pt-BR" : "en";
  }, [lang]);

  const [mode, setMode] = useState<Mode>("design");
  const [targetText, setTargetText] = useState("");
  const [control, setControl] = useState("");
  const [promptText, setPromptText] = useState("");
  const [refFile, setRefFile] = useState<File | null>(null);
  const [cfg, setCfg] = useState(13);
  const [normalize, setNormalize] = useState(true);
  const [denoise, setDenoise] = useState(true);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<GenerateResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [clientReady, setClientReady] = useState(false);
  const clientRef = useRef<Client | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    let cancelled = false;
    Client.connect(SPACE_URL)
      .then((c) => {
        if (cancelled) return;
        clientRef.current = c;
        setClientReady(true);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(t.errors.connect(err instanceof Error ? err.message : String(err)));
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (mode === "ultimate" && !refFile) {
      setError(t.errors.ultimateNeedsRef);
    } else {
      setError(null);
    }
    if (mode === "design") {
      setRefFile(null);
      setPromptText("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, lang]);

  const handleFile = useCallback(
    (file: File | null) => {
      if (!file) {
        setRefFile(null);
        return;
      }
      if (!file.type.startsWith("audio/") && !/\.(wav|mp3|m4a|ogg|flac|webm)$/i.test(file.name)) {
        setError(t.errors.unsupportedFormat);
        return;
      }
      setError(null);
      setRefFile(file);
    },
    [t],
  );

  const onDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      const file = e.dataTransfer.files?.[0];
      if (file) handleFile(file);
    },
    [handleFile],
  );

  const generate = useCallback(async () => {
    if (!clientRef.current) {
      setError(t.errors.notConnected);
      return;
    }
    if (!targetText.trim()) {
      setError(t.errors.needTarget);
      return;
    }
    if (mode === "design" && !control.trim()) {
      setError(t.errors.designNeedsControl);
      return;
    }
    if (mode !== "design" && !refFile) {
      setError(t.errors.modeNeedsRef);
      return;
    }
    if (mode === "ultimate" && !promptText.trim()) {
      setError(t.errors.ultimateNeedsTranscript);
      return;
    }

    setError(null);
    setLoading(true);
    setResult(null);
    try {
      const refPayload = refFile ? await handle_file(refFile) : null;
      const effectiveControl = mode === "ultimate" ? "" : control;
      const showPrompt = mode === "ultimate";

      const submission = await clientRef.current.predict("/generate", [
        targetText,
        effectiveControl,
        refPayload,
        showPrompt,
        promptText,
        cfg,
        normalize,
        denoise,
      ]);

      const data = submission?.data;
      const audio = Array.isArray(data) ? data[0] : data;
      const url: string | undefined = audio?.url ?? audio?.path ?? (typeof audio === "string" ? audio : undefined);
      if (!url) {
        throw new Error(t.errors.noAudio);
      }
      const filename: string = audio?.orig_name ?? "voxcpm2-output.wav";
      setResult({ url, filename });
    } catch (err) {
      const message = serializeError(err);
      console.error("[voice] generate failed:", err);
      setError(message.toLowerCase().includes("queue") ? t.errors.queueFull : message);
    } finally {
      setLoading(false);
    }
  }, [cfg, control, denoise, mode, normalize, promptText, refFile, t, targetText]);

  const applyExample = useCallback(
    (i: number) => {
      const ex = t.examples[i];
      if (!ex) return;
      setMode("design");
      setControl(ex.control);
      setTargetText(ex.text);
      setRefFile(null);
      setPromptText("");
    },
    [t],
  );

  return (
    <main className="relative min-h-dvh bg-obsidian text-bone selection:bg-aurora selection:text-obsidian">
      <div className="grain pointer-events-none fixed inset-0 z-10" aria-hidden />
      <div className="scanlines pointer-events-none fixed inset-0 z-10" aria-hidden />

      <header className="sticky top-0 z-30 border-b border-bone/10 bg-obsidian/80 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Link
            to="/"
            className="inline-flex items-center gap-2 font-mono text-xs uppercase tracking-[0.25em] text-bone/70 hover:text-bone"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            {t.nav.back}
          </Link>
          <div className="flex items-center gap-4">
            <LangSwitch lang={lang} onChange={setLang} />
            <span className="hidden sm:inline font-mono text-[10px] uppercase tracking-[0.3em] text-bone/50">
              {t.nav.module}
            </span>
          </div>
        </div>
      </header>

      <section className="relative px-6 pt-20 pb-12">
        <div className="mx-auto max-w-7xl">
          <p className="font-mono text-[11px] uppercase tracking-[0.35em] text-bone/55">
            {t.hero.kicker}
          </p>
          <h1 className="mt-4 font-display text-[clamp(3rem,9vw,8rem)] leading-[0.88] tracking-tight">
            <em className="italic text-aurora">{t.hero.title1}</em>{" "}
            <span className="text-outline">{t.hero.title2}</span>
            <br />
            <span className="text-bone">{t.hero.title3}</span>
          </h1>
          <p className="mt-6 max-w-2xl text-base text-bone/70 md:text-lg">{t.hero.sub}</p>
        </div>
      </section>

      <section className="px-6 pb-10">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-4 md:grid-cols-3">
            {MODE_ORDER.map((m) => {
              const Icon = m.icon;
              const active = mode === m.id;
              const c = t.modes[m.id];
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setMode(m.id)}
                  className={[
                    "group relative overflow-hidden rounded-2xl border p-6 text-left transition-all",
                    active
                      ? "border-transparent conic-border bg-obsidian-2"
                      : "border-bone/15 bg-obsidian-2/60 hover:border-bone/40",
                  ].join(" ")}
                  aria-pressed={active}
                >
                  <div className="flex items-start justify-between">
                    <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-bone/55">
                      {m.no}
                    </span>
                    <Icon className={["h-5 w-5", active ? "text-aurora" : "text-bone/70"].join(" ")} />
                  </div>
                  <h3 className="mt-6 font-display text-2xl italic">{c.label}</h3>
                  <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.3em] text-bone/50">{c.tag}</p>
                  <p className="mt-4 text-sm text-bone/70">{c.body}</p>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      <section className="px-6 pb-24">
        <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[1.4fr_1fr]">
          <div className="space-y-6 rounded-2xl border border-bone/15 bg-obsidian-2/60 p-6 md:p-8">
            {mode !== "design" && (
              <div>
                <Label icon={Mic2} text={t.labels.referenceAudio} required />
                <div
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={onDrop}
                  className="mt-3 flex items-center justify-between gap-4 rounded-xl border border-dashed border-bone/25 bg-obsidian/50 p-4"
                >
                  <div className="min-w-0">
                    {refFile ? (
                      <div className="flex items-center gap-3">
                        <Volume2 className="h-4 w-4 text-aurora" />
                        <div className="min-w-0">
                          <p className="truncate font-mono text-xs text-bone">{refFile.name}</p>
                          <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-bone/50">
                            {t.labels.sizeKb((refFile.size / 1024).toFixed(1))}
                          </p>
                        </div>
                      </div>
                    ) : (
                      <p className="font-mono text-xs uppercase tracking-[0.25em] text-bone/55">
                        {t.labels.refDrop}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {refFile && (
                      <button
                        type="button"
                        onClick={() => setRefFile(null)}
                        className="rounded-full border border-bone/20 p-2 text-bone/70 hover:text-bone"
                        aria-label={t.labels.refRemove}
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="inline-flex items-center gap-2 rounded-full border border-bone/25 bg-obsidian/70 px-4 py-2 font-mono text-[11px] uppercase tracking-[0.25em] text-bone hover:bg-obsidian"
                    >
                      <Upload className="h-3.5 w-3.5" /> {t.labels.refUpload}
                    </button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="audio/*,.wav,.mp3,.m4a,.ogg,.flac"
                      className="hidden"
                      onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
                    />
                  </div>
                </div>
              </div>
            )}

            {mode === "ultimate" && (
              <div>
                <Label icon={Sparkles} text={t.labels.transcript} required />
                <textarea
                  value={promptText}
                  onChange={(e) => setPromptText(e.target.value)}
                  rows={2}
                  placeholder={t.labels.transcriptPlaceholder}
                  className="mt-3 w-full rounded-xl border border-bone/20 bg-obsidian/60 p-4 font-mono text-sm text-bone outline-none placeholder:text-bone/30 focus:border-aurora"
                />
              </div>
            )}

            {mode !== "ultimate" && (
              <div>
                <Label
                  icon={Wand2}
                  text={t.labels.control}
                  required={mode === "design"}
                  hint={t.labels.controlHint}
                />
                <textarea
                  value={control}
                  onChange={(e) => setControl(e.target.value)}
                  rows={3}
                  placeholder={t.labels.controlPlaceholder}
                  className="mt-3 w-full rounded-xl border border-bone/20 bg-obsidian/60 p-4 text-sm text-bone outline-none placeholder:text-bone/30 focus:border-aurora"
                />
              </div>
            )}

            <div>
              <Label icon={Sparkles} text={t.labels.target} required hint={t.labels.targetHint} />
              <textarea
                value={targetText}
                onChange={(e) => setTargetText(e.target.value)}
                rows={5}
                placeholder={t.labels.targetPlaceholder}
                className="mt-3 w-full rounded-xl border border-bone/20 bg-obsidian/60 p-4 text-sm leading-relaxed text-bone outline-none placeholder:text-bone/30 focus:border-aurora"
              />
            </div>

            <details className="rounded-xl border border-bone/15 bg-obsidian/40 p-4">
              <summary className="cursor-pointer select-none font-mono text-[11px] uppercase tracking-[0.3em] text-bone/70">
                {t.labels.advanced}
              </summary>
              <div className="mt-5 space-y-5">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[11px] uppercase tracking-[0.25em] text-bone/70">
                      {t.labels.cfg}
                    </span>
                    <span className="font-mono text-sm text-aurora">{cfg}</span>
                  </div>
                  <input
                    type="range"
                    min={1}
                    max={30}
                    step={1}
                    value={cfg}
                    onChange={(e) => setCfg(Number(e.target.value))}
                    className="mt-3 w-full accent-[oklch(0.85_0.18_180)]"
                  />
                  <p className="mt-1 font-mono text-[10px] text-bone/40">{t.labels.cfgHint}</p>
                </div>
                <Toggle
                  label={t.labels.denoise}
                  checked={denoise}
                  onChange={setDenoise}
                  disabled={mode === "design"}
                />
                <Toggle label={t.labels.normalize} checked={normalize} onChange={setNormalize} />
              </div>
            </details>

            <div className="flex flex-col items-stretch gap-3 pt-2 sm:flex-row sm:items-center">
              <Button
                type="button"
                onClick={generate}
                disabled={loading || !clientReady}
                className="h-12 flex-1 rounded-full bg-aurora text-base font-medium text-obsidian hover:opacity-90 disabled:opacity-50"
              >
                {loading ? (
                  <span className="inline-flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" /> {t.labels.generating}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-2">
                    <Volume2 className="h-4 w-4" /> {t.labels.generate}
                  </span>
                )}
              </Button>
              <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-bone/45">
                {clientReady ? t.labels.connected : t.labels.connecting}
              </span>
            </div>

            {error && (
              <p className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 font-mono text-xs text-red-300">
                {error}
              </p>
            )}
          </div>

          <aside className="space-y-6">
            <div className="rounded-2xl border border-bone/15 bg-obsidian-2/60 p-6">
              <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-bone/55">{t.labels.output}</p>
              <h3 className="mt-2 font-display text-2xl italic">{t.labels.outputTitle}</h3>
              <div className="mt-5 rounded-xl border border-bone/15 bg-obsidian/60 p-4">
                {result ? (
                  <div className="space-y-3">
                    <audio src={result.url} controls className="w-full" />
                    <a
                      href={result.url}
                      download={result.filename}
                      className="inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.25em] text-aurora hover:underline"
                    >
                      {t.labels.download}
                    </a>
                  </div>
                ) : (
                  <p className="font-mono text-[11px] uppercase tracking-[0.25em] text-bone/45">
                    {loading ? t.labels.rendering : t.labels.waiting}
                  </p>
                )}
              </div>
            </div>

            <div className="rounded-2xl border border-bone/15 bg-obsidian-2/60 p-6">
              <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-bone/55">{t.labels.presets}</p>
              <h3 className="mt-2 font-display text-2xl italic">{t.labels.presetsTitle}</h3>
              <div className="mt-4 space-y-3">
                {t.examples.map((ex, i) => (
                  <button
                    key={ex.title}
                    type="button"
                    onClick={() => applyExample(i)}
                    className="block w-full rounded-xl border border-bone/15 bg-obsidian/60 p-4 text-left hover:border-aurora"
                  >
                    <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-bone/55">
                      {t.labels.example} {i + 1}
                    </p>
                    <p className="mt-1 font-display text-lg italic text-bone">{ex.title}</p>
                    <p className="mt-2 line-clamp-2 text-xs text-bone/60">{ex.control}</p>
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-bone/10 bg-obsidian-2/40 p-6">
              <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-bone/55">{t.labels.tech}</p>
              <ul className="mt-3 space-y-2 font-mono text-[11px] text-bone/65">
                <li>· model: OpenBMB / VoxCPM2</li>
                <li>· runtime: HuggingFace Space (Gradio)</li>
                <li>· transport: @gradio/client + SSE</li>
                <li>· sample rate: 24 kHz · 16-bit</li>
              </ul>
            </div>
          </aside>
        </div>
      </section>

      <footer className="border-t border-bone/10 px-6 py-10">
        <div className="mx-auto flex max-w-7xl items-center justify-between font-mono text-[10px] uppercase tracking-[0.3em] text-bone/45">
          <span>{t.labels.footer}</span>
          <Link to="/" className="hover:text-bone">
            {t.labels.backToIndex}
          </Link>
        </div>
      </footer>
    </main>
  );
}

function LangSwitch({ lang, onChange }: { lang: Lang; onChange: (l: Lang) => void }) {
  return (
    <div
      role="group"
      aria-label="Language / Idioma"
      className="inline-flex items-center gap-1 rounded-full border border-bone/20 bg-obsidian/60 p-1 font-mono text-[10px] uppercase tracking-[0.25em]"
    >
      <Languages className="ml-2 h-3 w-3 text-bone/60" aria-hidden />
      {(["pt", "en"] as const).map((l) => {
        const active = lang === l;
        return (
          <button
            key={l}
            type="button"
            onClick={() => onChange(l)}
            aria-pressed={active}
            className={[
              "rounded-full px-3 py-1 transition-colors",
              active ? "bg-aurora text-obsidian" : "text-bone/70 hover:text-bone",
            ].join(" ")}
          >
            {l === "pt" ? "PT-BR" : "EN"}
          </button>
        );
      })}
    </div>
  );
}

function Label({
  icon: Icon,
  text,
  required,
  hint,
}: {
  icon: typeof Sparkles;
  text: string;
  required?: boolean;
  hint?: string;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.3em] text-bone/75">
        <Icon className="h-3.5 w-3.5" />
        {text}
        {required && <em className="not-italic text-aurora">*</em>}
      </span>
      {hint && <span className="font-mono text-[10px] text-bone/40">{hint}</span>}
    </div>
  );
}

function Toggle({
  label,
  checked,
  onChange,
  disabled,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <label
      className={[
        "flex cursor-pointer items-center justify-between gap-4 rounded-lg border border-bone/15 bg-obsidian/40 p-3",
        disabled ? "opacity-50 cursor-not-allowed" : "hover:border-bone/30",
      ].join(" ")}
    >
      <span className="font-mono text-[11px] uppercase tracking-[0.25em] text-bone/75">{label}</span>
      <span
        className={[
          "relative h-5 w-9 rounded-full transition-colors",
          checked ? "bg-aurora" : "bg-bone/20",
        ].join(" ")}
      >
        <span
          className={[
            "absolute top-0.5 h-4 w-4 rounded-full bg-obsidian transition-transform",
            checked ? "translate-x-4" : "translate-x-0.5",
          ].join(" ")}
        />
      </span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        disabled={disabled}
        className="sr-only"
      />
    </label>
  );
}
