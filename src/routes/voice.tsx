import { createFileRoute, Link } from "@tanstack/react-router";
import { Client, handle_file } from "@gradio/client";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
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

interface ModeMeta {
  readonly id: Mode;
  readonly no: string;
  readonly label: string;
  readonly tag: string;
  readonly body: string;
  readonly icon: typeof Palette;
}

const MODES: ReadonlyArray<ModeMeta> = [
  {
    id: "design",
    no: "01",
    label: "Voice Design",
    tag: "Zero-Shot",
    body: "Cria uma voz totalmente nova só com descrição em texto. Sem áudio de referência.",
    icon: Palette,
  },
  {
    id: "controllable",
    no: "02",
    label: "Controllable Cloning",
    tag: "Clone + Style",
    body: "Faz clone de um áudio de referência e ajusta emoção, ritmo e estilo via instrução.",
    icon: Sliders,
  },
  {
    id: "ultimate",
    no: "03",
    label: "Ultimate Cloning",
    tag: "Max Fidelity",
    body: "Continuação por áudio — usa o clip + transcrição como prefixo e replica cada nuance.",
    icon: Wand2,
  },
] as const;

const EXAMPLES = [
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
] as const;

interface GenerateResult {
  url: string;
  filename: string;
}

function VoicePage() {
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
        setError(`Falha ao conectar ao Space: ${err instanceof Error ? err.message : String(err)}`);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (mode === "ultimate" && !refFile) {
      setError("O modo Ultimate requer um áudio de referência.");
    } else {
      setError(null);
    }
    if (mode === "design") {
      setRefFile(null);
      setPromptText("");
    }
  }, [mode]);

  const handleFile = useCallback((file: File | null) => {
    if (!file) {
      setRefFile(null);
      return;
    }
    if (!file.type.startsWith("audio/") && !/\.(wav|mp3|m4a|ogg|flac|webm)$/i.test(file.name)) {
      setError("Formato não suportado. Envie um áudio (wav, mp3, m4a, ogg, flac).");
      return;
    }
    setError(null);
    setRefFile(file);
  }, []);

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
      setError("Cliente não conectado ainda.");
      return;
    }
    if (!targetText.trim()) {
      setError("Informe o texto-alvo a ser falado.");
      return;
    }
    if (mode === "design" && !control.trim()) {
      setError("No modo Voice Design, descreva a voz em Control Instruction.");
      return;
    }
    if (mode !== "design" && !refFile) {
      setError("Esse modo exige um áudio de referência.");
      return;
    }
    if (mode === "ultimate" && !promptText.trim()) {
      setError("No Ultimate Cloning, informe a transcrição do áudio de referência.");
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
        throw new Error("O Space não retornou áudio.");
      }
      const filename: string = audio?.orig_name ?? "voxcpm2-output.wav";
      setResult({ url, filename });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message.includes("queue") ? "Fila do Space cheia. Aguarde alguns segundos e tente de novo." : message);
    } finally {
      setLoading(false);
    }
  }, [cfg, control, denoise, mode, normalize, promptText, refFile, targetText]);

  const applyExample = useCallback((i: number) => {
    const ex = EXAMPLES[i];
    if (!ex) return;
    setMode("design");
    setControl(ex.control);
    setTargetText(ex.text);
    setRefFile(null);
    setPromptText("");
  }, []);

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
            Obsidian Index
          </Link>
          <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-bone/50">
            module · voxcpm2 · tts
          </span>
        </div>
      </header>

      <section className="relative px-6 pt-20 pb-12">
        <div className="mx-auto max-w-7xl">
          <p className="font-mono text-[11px] uppercase tracking-[0.35em] text-bone/55">
            00 · voice forge
          </p>
          <h1 className="mt-4 font-display text-[clamp(3rem,9vw,8rem)] leading-[0.88] tracking-tight">
            <em className="italic text-aurora">VoxCPM2</em>{" "}
            <span className="text-outline">voice</span>
            <br />
            <span className="text-bone">forge</span>
          </h1>
          <p className="mt-6 max-w-2xl text-base text-bone/70 md:text-lg">
            Geração de fala neural em três modos — voz inventada do zero, clone controlado por estilo e
            replicação ultra-fiel por continuação de áudio. Roda direto no Space oficial OpenBMB.
          </p>
        </div>
      </section>

      <section className="px-6 pb-10">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-4 md:grid-cols-3">
            {MODES.map((m) => {
              const Icon = m.icon;
              const active = mode === m.id;
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
                  <h3 className="mt-6 font-display text-2xl italic">{m.label}</h3>
                  <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.3em] text-bone/50">{m.tag}</p>
                  <p className="mt-4 text-sm text-bone/70">{m.body}</p>
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
                <Label icon={Mic2} text="Reference Audio" required />
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
                            {(refFile.size / 1024).toFixed(1)} kb
                          </p>
                        </div>
                      </div>
                    ) : (
                      <p className="font-mono text-xs uppercase tracking-[0.25em] text-bone/55">
                        Drop áudio aqui — ou clique para enviar
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {refFile && (
                      <button
                        type="button"
                        onClick={() => setRefFile(null)}
                        className="rounded-full border border-bone/20 p-2 text-bone/70 hover:text-bone"
                        aria-label="Remover áudio"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="inline-flex items-center gap-2 rounded-full border border-bone/25 bg-obsidian/70 px-4 py-2 font-mono text-[11px] uppercase tracking-[0.25em] text-bone hover:bg-obsidian"
                    >
                      <Upload className="h-3.5 w-3.5" /> Upload
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
                <Label icon={Sparkles} text="Reference Transcript" required />
                <textarea
                  value={promptText}
                  onChange={(e) => setPromptText(e.target.value)}
                  rows={2}
                  placeholder="Transcreva o que está dito no áudio de referência…"
                  className="mt-3 w-full rounded-xl border border-bone/20 bg-obsidian/60 p-4 font-mono text-sm text-bone outline-none placeholder:text-bone/30 focus:border-aurora"
                />
              </div>
            )}

            {mode !== "ultimate" && (
              <div>
                <Label
                  icon={Wand2}
                  text="Control Instruction"
                  required={mode === "design"}
                  hint="Descreva timbre, idade, emoção, ritmo"
                />
                <textarea
                  value={control}
                  onChange={(e) => setControl(e.target.value)}
                  rows={3}
                  placeholder='Ex.: "Calm middle-aged narrator, warm and deliberate, slight British accent."'
                  className="mt-3 w-full rounded-xl border border-bone/20 bg-obsidian/60 p-4 text-sm text-bone outline-none placeholder:text-bone/30 focus:border-aurora"
                />
              </div>
            )}

            <div>
              <Label icon={Sparkles} text="Target Text" required hint="O que a voz deve falar" />
              <textarea
                value={targetText}
                onChange={(e) => setTargetText(e.target.value)}
                rows={5}
                placeholder="Digite o roteiro a ser sintetizado…"
                className="mt-3 w-full rounded-xl border border-bone/20 bg-obsidian/60 p-4 text-sm leading-relaxed text-bone outline-none placeholder:text-bone/30 focus:border-aurora"
              />
            </div>

            <details className="rounded-xl border border-bone/15 bg-obsidian/40 p-4">
              <summary className="cursor-pointer select-none font-mono text-[11px] uppercase tracking-[0.3em] text-bone/70">
                ⚙ Advanced Settings
              </summary>
              <div className="mt-5 space-y-5">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[11px] uppercase tracking-[0.25em] text-bone/70">
                      CFG · Guidance Scale
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
                  <p className="mt-1 font-mono text-[10px] text-bone/40">
                    ↑ mais fiel ao prompt · ↓ mais criativo
                  </p>
                </div>
                <Toggle
                  label="Reference audio enhancement (ZipEnhancer)"
                  checked={denoise}
                  onChange={setDenoise}
                  disabled={mode === "design"}
                />
                <Toggle label="Text normalization (números, datas, abreviações)" checked={normalize} onChange={setNormalize} />
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
                    <Loader2 className="h-4 w-4 animate-spin" /> Sintetizando…
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-2">
                    <Volume2 className="h-4 w-4" /> Gerar Voz
                  </span>
                )}
              </Button>
              <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-bone/45">
                {clientReady ? "space · connected" : "space · connecting…"}
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
              <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-bone/55">output</p>
              <h3 className="mt-2 font-display text-2xl italic">Generated Audio</h3>
              <div className="mt-5 rounded-xl border border-bone/15 bg-obsidian/60 p-4">
                {result ? (
                  <div className="space-y-3">
                    <audio src={result.url} controls className="w-full" />
                    <a
                      href={result.url}
                      download={result.filename}
                      className="inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.25em] text-aurora hover:underline"
                    >
                      ↓ download wav
                    </a>
                  </div>
                ) : (
                  <p className="font-mono text-[11px] uppercase tracking-[0.25em] text-bone/45">
                    {loading ? "rendering…" : "aguardando geração"}
                  </p>
                )}
              </div>
            </div>

            <div className="rounded-2xl border border-bone/15 bg-obsidian-2/60 p-6">
              <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-bone/55">presets</p>
              <h3 className="mt-2 font-display text-2xl italic">Voice Examples</h3>
              <div className="mt-4 space-y-3">
                {EXAMPLES.map((ex, i) => (
                  <button
                    key={ex.title}
                    type="button"
                    onClick={() => applyExample(i)}
                    className="block w-full rounded-xl border border-bone/15 bg-obsidian/60 p-4 text-left hover:border-aurora"
                  >
                    <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-bone/55">
                      Example {i + 1}
                    </p>
                    <p className="mt-1 font-display text-lg italic text-bone">{ex.title}</p>
                    <p className="mt-2 line-clamp-2 text-xs text-bone/60">{ex.control}</p>
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-bone/10 bg-obsidian-2/40 p-6">
              <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-bone/55">tech</p>
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
          <span>obsidian aurora · voice module</span>
          <Link to="/" className="hover:text-bone">
            ← back to index
          </Link>
        </div>
      </footer>
    </main>
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
