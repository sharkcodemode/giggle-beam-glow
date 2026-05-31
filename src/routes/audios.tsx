import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft, ArrowUpRight, Download, Mic2, Pause, Play,
  Share2, Volume2, Waves,
} from "lucide-react";

export const Route = createFileRoute("/audios")({ component: AudiosPage });

const TRACKS = [
  {
    id: "taciana-01",
    name: "Taciana — PVC Analysis",
    src: "/taciana-original.mp3",
    type: "neural_stream_v2"
  },
  {
    id: "taciana-02",
    name: "Taciana — Neural Uplink 2026",
    src: "/taciana-new.mp3",
    type: "neural_stream_v3"
  }
];

function fmt(t: number): string {
  if (!Number.isFinite(t) || t < 0) return "0:00";
  const m = Math.floor(t / 60);
  const s = Math.floor(t % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function AudiosPage() {
  const audioRef    = useRef<HTMLAudioElement | null>(null);
  const canvasRef   = useRef<HTMLCanvasElement | null>(null);
  const ctxRef      = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef   = useRef<MediaElementAudioSourceNode | null>(null);
  const rafRef      = useRef<number | null>(null);

  const [activeTrackIdx, setActiveTrackIdx] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration]   = useState(0);
  const [current, setCurrent]     = useState(0);
  const [volume, setVolume]       = useState(0.85);

  const activeTrack = TRACKS[activeTrackIdx];

  // ─── analyser draw loop ───
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const analyser = analyserRef.current;
    if (!canvas || !analyser) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const cssW = canvas.clientWidth;
    const cssH = canvas.clientHeight;
    if (canvas.width !== cssW * dpr || canvas.height !== cssH * dpr) {
      canvas.width = cssW * dpr;
      canvas.height = cssH * dpr;
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const bins = analyser.frequencyBinCount;
    const data = new Uint8Array(bins);
    analyser.getByteFrequencyData(data);

    ctx.clearRect(0, 0, cssW, cssH);

    // Aurora gradient for bars
    const grad = ctx.createLinearGradient(0, 0, cssW, 0);
    grad.addColorStop(0.00, "oklch(0.86 0.21 158)");
    grad.addColorStop(0.35, "oklch(0.84 0.16 210)");
    grad.addColorStop(0.65, "oklch(0.68 0.24 295)");
    grad.addColorStop(1.00, "oklch(0.72 0.28 335)");

    const N = 96;
    const step = Math.floor(bins / N);
    const barW = cssW / N;

    for (let i = 0; i < N; i++) {
      const v = data[i * step] / 255;
      const h = Math.max(2, v * cssH * 0.92);
      ctx.fillStyle = grad;
      ctx.globalAlpha = 0.25 + v * 0.75;
      const x = i * barW + 1;
      const y = (cssH - h) / 2;
      ctx.fillRect(x, y, barW - 2, h);
    }
    ctx.globalAlpha = 1;

    rafRef.current = requestAnimationFrame(draw);
  }, []);

  const ensureAudioGraph = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (!ctxRef.current) {
      const w = window as unknown as { webkitAudioContext?: typeof AudioContext };
      const AC: typeof AudioContext = typeof AudioContext !== "undefined" ? AudioContext : w.webkitAudioContext!;
      const ac = new AC();
      const analyser = ac.createAnalyser();
      analyser.fftSize = 512;
      analyser.smoothingTimeConstant = 0.82;
      const source = ac.createMediaElementSource(audio);
      source.connect(analyser);
      analyser.connect(ac.destination);
      ctxRef.current = ac;
      analyserRef.current = analyser;
      sourceRef.current = source;
    }
    if (ctxRef.current.state === "suspended") {
      void ctxRef.current.resume();
    }
  }, []);

  const togglePlay = useCallback(async () => {
    const audio = audioRef.current;
    if (!audio) return;
    ensureAudioGraph();
    if (audio.paused) {
      try { await audio.play(); } catch (e) { console.error(e); }
    } else {
      audio.pause();
    }
  }, [ensureAudioGraph]);

  // Attach listeners once (audio element is stable, never re-keyed).
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const onTime  = () => setCurrent(audio.currentTime);
    const onMeta  = () => setDuration(Number.isFinite(audio.duration) ? audio.duration : 0);
    const onPlay  = () => {
      setIsPlaying(true);
      if (!rafRef.current) rafRef.current = requestAnimationFrame(draw);
    };
    const onPause = () => {
      setIsPlaying(false);
      if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
    };
    const onEnded = onPause;
    audio.addEventListener("timeupdate", onTime);
    audio.addEventListener("loadedmetadata", onMeta);
    audio.addEventListener("durationchange", onMeta);
    audio.addEventListener("play", onPlay);
    audio.addEventListener("pause", onPause);
    audio.addEventListener("ended", onEnded);
    return () => {
      audio.removeEventListener("timeupdate", onTime);
      audio.removeEventListener("loadedmetadata", onMeta);
      audio.removeEventListener("durationchange", onMeta);
      audio.removeEventListener("play", onPlay);
      audio.removeEventListener("pause", onPause);
      audio.removeEventListener("ended", onEnded);
    };
  }, [draw]);

  // Tear down audio graph only on unmount.
  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      try { sourceRef.current?.disconnect(); } catch { /* noop */ }
      try { analyserRef.current?.disconnect(); } catch { /* noop */ }
      const ac = ctxRef.current;
      if (ac && ac.state !== "closed") void ac.close().catch(() => { /* noop */ });
    };
  }, []);

  // Swap source on track change without remounting the <audio> element.
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const wasPlaying = !audio.paused;
    audio.pause();
    audio.src = activeTrack.src;
    audio.load();
    setCurrent(0);
    setDuration(0);
    if (wasPlaying) {
      void audio.play().catch(() => { /* user gesture required */ });
    }
  }, [activeTrack.src]);

  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volume;
  }, [volume]);

  const onSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const audio = audioRef.current;
    if (!audio || !Number.isFinite(duration) || duration <= 0) return;
    const t = (Number(e.target.value) / 1000) * duration;
    audio.currentTime = t;
    setCurrent(t);
  };

  const progress = duration > 0 ? Math.min(1000, (current / duration) * 1000) : 0;

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[var(--obsidian)] text-[var(--bone)] selection:bg-[var(--aurora-cyan)]/40 selection:text-[var(--obsidian)]">
      {/* Aurora bg */}
      <div aria-hidden className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <div className="absolute -top-[25%] left-[5%] h-[70vh] w-[70vh] rounded-full bg-[var(--aurora-violet)]/30 blur-[160px]" />
        <div className="absolute bottom-[-30%] right-[-10%] h-[70vh] w-[70vh] rounded-full bg-[var(--aurora-cyan)]/25 blur-[160px]" />
        <div className="absolute top-[40%] left-[40%] h-[50vh] w-[50vh] rounded-full bg-[var(--aurora-plasma)]/15 blur-[140px]" />
      </div>
      <div aria-hidden className="grain pointer-events-none fixed inset-0 z-0" />

      {/* Header */}
      <header className="fixed inset-x-0 top-0 z-50 border-b border-white/5 bg-black/55 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-[1600px] items-center justify-between px-6">
          <Link
            to="/"
            className="group inline-flex items-center gap-3 font-grotesk text-sm text-white/65 transition hover:text-white"
          >
            <span className="grid h-9 w-9 place-items-center rounded-xl border border-white/10 bg-white/5 transition group-hover:border-white/30">
              <ArrowLeft className="h-4 w-4" />
            </span>
            Back to Index
          </Link>
          <div className="flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.3em] text-white/45">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[var(--aurora-mint)]" />
            Audio Interface · Tier S
          </div>
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-[1600px] px-6 pb-32 pt-32">
        {/* Hero */}
        <section className="grid grid-cols-12 gap-6">
          <div className="col-span-12 lg:col-span-7">
            <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-[var(--aurora-cyan)]/30 bg-[var(--aurora-cyan)]/5 px-4 py-1.5 font-mono text-[10px] uppercase tracking-[0.3em] text-[var(--aurora-cyan)]">
              <Waves className="h-3 w-3" /> Neural voice processing
            </div>
            <h1 className="font-display text-[clamp(72px,12vw,200px)] leading-[0.85] tracking-[-0.04em]">
              <span className="block">audio</span>
              <span className="block italic text-aurora">vault.</span>
            </h1>
            <p className="mt-8 max-w-[44ch] text-[16px] leading-relaxed text-white/60">
              Câmara de encriptação neural de áudio em alta-fidelidade.
              Análise espectral em tempo real, motor PVC ElevenLabs,
              precisão vocal biométrica máxima.
            </p>
          </div>

          <div className="col-span-12 hidden items-end justify-end lg:col-span-5 lg:flex">
            <p className="font-mono text-[10px] uppercase tracking-[0.35em] text-white/35">
              ── side A · take 01 · obsidian aurora ── 2026
            </p>
          </div>
        </section>

        {/* Player */}
        <section className="conic-border mt-20 overflow-hidden rounded-[32px] bg-[var(--obsidian-2)]/65 p-8 md:p-12">
          <div className="grid grid-cols-12 gap-10">
            {/* Disc */}
            <div className="col-span-12 flex items-center justify-center lg:col-span-4">
              <div className="relative aspect-square w-full max-w-[320px]">
                <div className={`absolute inset-0 rounded-full border border-dashed border-white/15 ${isPlaying ? "animate-[spin_18s_linear_infinite]" : ""}`} />
                <div className="absolute inset-3 rounded-full border border-white/10" />
                <div className="absolute inset-6 grid place-items-center rounded-full bg-aurora">
                  <div className="grid h-[88%] w-[88%] place-items-center rounded-full bg-[var(--obsidian)]">
                    <Mic2
                      className={`h-12 w-12 text-white transition-all duration-500 ${
                        isPlaying ? "scale-110 drop-shadow-[0_0_20px_var(--aurora-cyan)]" : "opacity-50"
                      }`}
                      strokeWidth={1.5}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Controls */}
            <div className="col-span-12 space-y-7 lg:col-span-8">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.35em] text-[var(--aurora-mint)]">
                  {activeTrack.type}
                </p>
                <h2 className="mt-2 font-display text-5xl italic md:text-6xl">{activeTrack.name}</h2>
              </div>

              {/* Spectrum canvas */}
              <div className="relative h-32 overflow-hidden rounded-2xl border border-white/10 bg-black/50">
                <canvas ref={canvasRef} className="block h-full w-full" />
                {!isPlaying && (
                  <div className="pointer-events-none absolute inset-0 grid place-items-center font-mono text-[10px] uppercase tracking-[0.35em] text-white/30">
                    awaiting signal — press play
                  </div>
                )}
              </div>

              {/* Scrubber */}
              <div className="space-y-2">
                <div className="relative h-2 overflow-hidden rounded-full bg-white/10">
                  <div
                    className="absolute inset-y-0 left-0 bg-aurora"
                    style={{ width: `${(progress / 1000) * 100}%` }}
                  />
                  <input
                    type="range"
                    min={0}
                    max={1000}
                    value={progress}
                    onChange={onSeek}
                    aria-label="Seek"
                    className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                  />
                </div>
                <div className="flex justify-between font-mono text-[10px] uppercase tracking-[0.3em] text-white/45">
                  <span>{fmt(current)}</span>
                  <span className="text-[var(--aurora-cyan)]/70">live processing</span>
                  <span>{fmt(duration)}</span>
                </div>
              </div>

              {/* Controls row */}
              <div className="flex flex-wrap items-center gap-4">
                <Button
                  onClick={togglePlay}
                  aria-label={isPlaying ? "Pause" : "Play"}
                  className="h-16 w-16 rounded-2xl bg-[var(--bone)] text-[var(--obsidian)] shadow-[0_20px_60px_-15px_var(--aurora-cyan)] hover:bg-white"
                >
                  {isPlaying ? <Pause className="h-6 w-6 fill-current" /> : <Play className="ml-1 h-6 w-6 fill-current" />}
                </Button>

                <a
                  href={activeTrack.src}
                  download
                  className="inline-flex h-16 items-center gap-3 rounded-2xl border border-white/15 px-7 font-grotesk text-sm text-white transition hover:border-white/40"
                >
                  <Download className="h-4 w-4" /> Download
                </a>

                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Share"
                  className="h-16 w-16 rounded-2xl text-white/55 hover:bg-white/10 hover:text-white"
                >
                  <Share2 className="h-5 w-5" />
                </Button>

                <div className="ml-auto flex items-center gap-3">
                  <Volume2 className="h-4 w-4 text-white/55" />
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={Math.round(volume * 100)}
                    onChange={(e) => setVolume(Number(e.target.value) / 100)}
                    aria-label="Volume"
                    className="h-1.5 w-32 cursor-pointer appearance-none rounded-full bg-white/15 accent-[var(--aurora-mint)]"
                  />
                </div>
              </div>

              <audio
                ref={audioRef}
                preload="metadata"
              />

              {/* Playlist Switcher */}
              <div className="mt-10 flex gap-4 overflow-x-auto pb-4 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {TRACKS.map((t, idx) => (
                  <button
                    key={t.id}
                    onClick={() => setActiveTrackIdx(idx)}
                    className={`flex-shrink-0 px-6 py-4 rounded-2xl border transition-all duration-300 flex items-center gap-4 ${
                      activeTrackIdx === idx 
                        ? "bg-white/10 border-white/30 text-white shadow-lg" 
                        : "bg-black/20 border-white/5 text-white/40 hover:border-white/15 hover:text-white/70"
                    }`}
                  >
                    <div className={`h-2 w-2 rounded-full ${activeTrackIdx === idx ? "bg-[var(--aurora-cyan)]" : "bg-white/10"}`} />
                    <span className="font-mono text-[10px] uppercase tracking-widest">{t.name}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Stats */}
        <section className="mt-10 grid grid-cols-2 gap-3 md:grid-cols-4">
          {[
            ["Bitrate",    "320", "kbps"],
            ["Sample",     "48.0", "khz"],
            ["Latency",    "12",   "ms"],
            ["Encryption", "AES",  "256"],
          ].map(([k, v, unit]) => (
            <div
              key={k}
              className="rounded-2xl border border-white/10 bg-[var(--obsidian-2)]/50 p-6 transition hover:border-white/25"
            >
              <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-white/40">{k}</p>
              <p className="mt-3 font-display text-4xl">
                <span className="text-white">{v}</span>
                <span className="ml-1 text-base text-white/40">{unit}</span>
              </p>
            </div>
          ))}
        </section>

        {/* Metadata */}
        <section className="mt-10 grid grid-cols-12 gap-6">
          <div className="col-span-12 rounded-3xl border border-white/10 bg-[var(--obsidian-2)]/40 p-8 lg:col-span-8">
            <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-white/40">metadata</p>
            <p className="mt-5 max-w-prose font-display text-3xl italic leading-snug text-white/85">
              "Este áudio contém traços biométricos vocais processados através
              da infraestrutura procore — cada onda é uma assinatura."
            </p>
            <div className="mt-8 grid grid-cols-2 gap-6 font-mono text-[11px] uppercase tracking-widest text-white/45 md:grid-cols-4">
              <div><p className="text-white/35">format</p><p className="mt-1 text-white">mp3</p></div>
              <div><p className="text-white/35">channels</p><p className="mt-1 text-white">stereo</p></div>
              <div><p className="text-white/35">engine</p><p className="mt-1 text-white">elevenlabs</p></div>
              <div><p className="text-white/35">profile</p><p className="mt-1 text-white">pvc.v2</p></div>
            </div>
          </div>
          <div className="col-span-12 flex flex-col justify-between rounded-3xl border border-white/10 bg-gradient-to-br from-[var(--aurora-violet)]/15 via-transparent to-[var(--aurora-cyan)]/15 p-8 lg:col-span-4">
            <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-white/55">next</p>
            <p className="font-display text-3xl">
              Voltar ao <span className="italic text-aurora">índice</span> de ativos
            </p>
            <Link
              to="/"
              className="mt-6 inline-flex items-center gap-2 font-grotesk text-sm text-white hover:text-[var(--aurora-mint)]"
            >
              Explorar Index <ArrowUpRight className="h-4 w-4" />
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
