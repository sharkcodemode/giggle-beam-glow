import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  ArrowUpRight,
  Calculator,
  Cpu,
  Download,
  FileText,
  Github,
  Globe,
  Image as ImageIcon,
  Key,
  Mic2,
  Music,
  Plus,
  Radio,
  Server,
  Shield,
  Terminal,
  Trash2,
  Utensils,
  X,
  Zap,
} from "lucide-react";

export const Route = createFileRoute("/")({
  component: Index,
});

// ─── assets (preservados) ──────────────────────────────────────
const HERO_IMG =
  "https://storage.googleapis.com/gpt-engineer-file-uploads/MphejG7h8fgG39b2AeUzsfwMlmm1/f10efe35-b8f6-4da8-b3f0-d3f5775c6287?Expires=1779774013&GoogleAccessId=go-api-on-aws%40gpt-engineer-390607.iam.gserviceaccount.com&Signature=S%2BpCtnUCM6U7wc3CLvXdrHaGzToW7wkZUjBEXHQdOTLQJIIjJjAoptEjvCbiy8EqVO9B11tYkLZWUP3mqyzJDC%2BbhL1Y4A1RNY8O4pW22P1aDzOqbsw%2FGO9NK1%2FwUeVk4jb4CC1S0yqmFgT3xiHYZx5Lm0voPksqjSUjQ0kfO9F1PLGXYHx2mWBdzHfTU3u1caZahrDvD%2BT4Y4ZwoROHMoJ6ld1yza2fmmXt7gNx6s4F47z0%2BRejBiSKbDPiSUTb%2FPPpfv%2Bl8tCOYnmBTE0hyF%2F36%2BsAkTJ0FA569qfAWs%2B%2Fb%2FDgkw2hXS6%2B3OrmbR7d%2FawKnbLiCDasusdAIYdGRQ%3D%3D";
const EDITAL_PDF =
  "https://storage.googleapis.com/gpt-engineer-file-uploads/MphejG7h8fgG39b2AeUzsfwMlmm1/1f1e064e-4f19-4845-84b0-d804eb92534e?Expires=1779777312&GoogleAccessId=go-api-on-aws%40gpt-engineer-390607.iam.gserviceaccount.com&Signature=GzXznk57FYF47QARGxKK6kSje7q7wasYClpQ7nr%2F4h9FDrcD%2FInKFdrdZtCIx2jvnZIEBOIcjlbjKXOzOE%2Fy76Un5CWI5xrk8f0F%2FwlmgtkMC2rULdjMDZsjyPfq29FvtzbDSUdWYalC1SdA98w3u%2BHHfQsiffYo9gc3CwRuc%2BIoVuDzqFauXBmmVSV%2Fo0kqQVLJHC%2BA4yNZvNHv0oqIY%2Ff502Wrazw%2BtfasVNgyfwLtNSn1zSk%2BnA89984em5POPhBANAb8xvFmmwbgwkPYToJYN5uT%2B74%2BdRj7EbObZ%2FAtQX70N2t%2BCjXY%2F6xSyGpjQvbln6bAhV8kkDMm1vry9Q%3D%3D";
const NODE_MSI =
  "https://storage.googleapis.com/gpt-engineer-file-uploads/MphejG7h8fgG39b2AeUzsfwMlmm1/331aaf90-83c9-4fa7-90b2-2abfd7ea6996?Expires=1779777743&GoogleAccessId=go-api-on-aws%40gpt-engineer-390607.iam.gserviceaccount.com&Signature=Y2ugc%2FsEn4dljOLHNdC9vlNM1%2BnYQohnuHvibtx9EHpf054SRr3qISfPAO6HEzKq0DZOwUgueG%2FRwqZIB%2BE6EA8hknbNJ33O0rVIZfyteddxVx0w3H1%2Fipo%2FaejXLaVZl2EneGhoecVeS4J1XGqhUDfXSOXCGMZ4C3bfOIyN2Kn966v1maTdU64Uv4EAMUbZPk38O52OQ0u8DlqKyBOoo4mRn84wEaHyOLX%2BXn8tJevfCljy%2BTpnDj0DkYQEfcm0iJTHtzMv9kBjdw8RNUEnp%2BFFW%2BYkwUWrNYJa2mFOtqA5j%2FmO%2Ffz0MBW3EtTd8QZoaFvzNlaV347CejVgbXuPkA%3D%3D";
const PLUTONIUM_EXE =
  "https://storage.googleapis.com/gpt-engineer-file-uploads/MphejG7h8fgG39b2AeUzsfwMlmm1/576a2345-5241-4768-a67c-39979dff7018?Expires=1779777936&GoogleAccessId=go-api-on-aws%40gpt-engineer-390607.iam.gserviceaccount.com&Signature=Q2mtp%2F%2Bk7lOGeNpjGWM8DoJ36m9KRkHgBvPMwu%2FQbDqBq9yU1GQNtEsIg8ssKgqyNUam5FOTgRVYhVOtFZn4JSPF9m7FrFF%2B5%2Bm3DiPQJDen9JIpK7DpoiJaRn%2BjlBNg%2BzwlxBUJ2Ai4PYReiQ24LRCasPsGTWxUCjAynf7ok%2FIzonUP1Npn0zeQF9IDiI3jJ2Qv9ZI8Mw8vd3oNfLlT9nqNUGZCaf6NaIhjm%2FqzPsJX%2BdPs4ejEfzFhU4JTMZ9y%2Fvziccl7S0XdA3ZTbnjLR52wCjJqf92LwWb%2BLUYyPf1i202bGT9WY6qLih9CTn3Pir0Ocj%2F1FyEld2CSu%2FyHqg%3D%3D";
const KEYS_TXT =
  "https://storage.googleapis.com/gpt-engineer-file-uploads/MphejG7h8fgG39b2AeUzsfwMlmm1/89dd8928-fc27-4768-b66e-9fc1d9ec8463?Expires=1779780172&GoogleAccessId=go-api-on-aws%40gpt-engineer-390607.iam.gserviceaccount.com&Signature=Yik15u4DL%2BJEBx85V0cmmg%2B1s9Maqzl1oltgBIlK2mjxh0sAt7P0tlSdfOrDCZ9MWb27Zow%2FV9odXIONBDz0dXH%2FkmZn1emXsvEP1gBLgTaTtE%2Breik7ZFLVjvC1cafCuyqQeikgjNiI2OBAcUxDEh15U94bmVIrUty8FBzXRqy1xI%2FsUVIO7PNzVCeZi8aZNvUW5B9bYKfdCYx%2BOT7TDv9XPeuy2kslHPTEuMh9PnV8GHQrf6vIy10Uyt6ySmsk27JmWYlML%2FKEGKc1bctLM4bg2SuY2MtsHY0sLrJYbSPMzt%2FeymSHbLopVXAc%2Ba7OxsraDo0lnmPqRQhL9iYUCQ%3D%3D";
const BRIEFING_MP3 =
  "https://storage.googleapis.com/gpt-engineer-file-uploads/MphejG7h8fgG39b2AeUzsfwMlmm1/ddedf186-4c7d-42e5-93aa-8a37f2b0d97e?Expires=1779777066&GoogleAccessId=go-api-on-aws%40gpt-engineer-390607.iam.gserviceaccount.com&Signature=GGMjoj4BmFN45r9wq0jpNS%2B%2FUzSUff1K04R1PGUEVFkgPmKbitS9485gaK6wjEeujS6FqmsXl1SntElSOdbAVWEWseCt7XRSfo6dciRU8CSMBCu2tVwl6XuUqqQ8xYo43foTNtLHJo7I7NX5tYbTeGkrzFD9TIDDc3NnnQLaURp4dg4bwIh463tWrmYhSdCpYnP2q5oKQ3%2FlSDy3h2uvuihqiQlzSnAPTDmYU%2Bn5a4LXwP74x9D6kYYkmvecon%2FHYCYFjxldyDUZAO6UIU8%2Fv3kU23PbKhYC3ftA%2BeqvKvFBzId6DQGwlHPTv%2FvHNLpq9L5WDgGQgdvh6fxgBPChUg%3D%3D";
const CYBERPUNK_IMG =
  "https://storage.googleapis.com/gpt-engineer-file-uploads/MphejG7h8fgG39b2AeUzsfwMlmm1/ed47bbb2-8463-46a7-9ab8-11f44a977524?Expires=1779779106&GoogleAccessId=go-api-on-aws%40gpt-engineer-390607.iam.gserviceaccount.com&Signature=3sRneXY1DcejASyNYgmy2A6bonouZ8FR%2Bh9%2F9JJOlF8lEi8W0O9kahEkWlKfxBJKM6dxGys4mhB5xE4VFaso%2FxL5N6anCmhASxkAjSctr1R2pCsG57ORHRPq%2FSLYijPuVDv2XWu25wmzDb9V7IDrvo%2BXPeZ1%2F8Cp%2FZTES2gX2%2FsEclXeSknflInlK83t2DlSKn%2B9NT7hXx%2BufMDfOeGI4%2BiqQ3vEuNW8xJSEa6z8%2FD36M1Iln%2Bi8qSRwVrD23bjEN2V0pKBjrtstsB%2BuaSzosXCPWFNRmzKZJH%2B7WplP%2FiEktdx5kTCLsAIzi33D3QNKsGUjSZZ1CKpEvejgR%2B0f9g%3D%3D";
const MEAT_IMG =
  "https://storage.googleapis.com/gpt-engineer-file-uploads/MphejG7h8fgG39b2AeUzsfwMlmm1/4412c292-a8ba-4869-92a9-5e144a59a960?Expires=1779797993&GoogleAccessId=go-api-on-aws%40gpt-engineer-390607.iam.gserviceaccount.com&Signature=pFP6N62Mvkai%2Fb7wxMqpDKWnO3SqaNlsJOYzUUx8aP%2FQksTCQJBFfqgpyigy3vvyjL3vhCblmpicwd0bx1sQ0kfn5WOrs0%2FzTH5s76PHgIiLWF25b%2Bm3xYaHMdcyfm94PRVaEz3XiwAl97%2BcfkXsE9K%2FgSYNG%2BL%2F2TI69qQVr50DDyim5msZOIBifRxf7uRXO3kfMwSPVhcS4pdaZdtPsVRrzw5mo7nbP0JsUADuxp22%2BLOYATTLwVjtPfVnKdrsXz3lsrRdJ33m0hNIZNKIRtKs5CaUG4aYsGX3k9BRoyraheSNNTY5MXgVA32zscYvrJpJl45h7yDDW4EGHXMoGw%3D%3D";

// ─── tipos ───────────────────────────────────────────────────
interface CalcItem {
  id: number;
  description: string;
  quantity: number;
  unitPrice: number;
  discount: number;
}

type AssetKind = "doc" | "exe" | "tool" | "keys" | "audio" | "visual" | "food" | "vault" | "radar" | "voice" | "pulse";

interface Asset {
  no: string;
  kind: AssetKind;
  title: string;
  tag: string;
  body: string;
  href?: string;
  to?: string;
  cta: string;
  image?: string;
}

const ASSETS: ReadonlyArray<Asset> = [
  { no: "01", kind: "doc",    title: "Matrícula / 2026",         tag: "Documento",  body: "Inscrições on-line abertas para o próximo ciclo letivo.",        href: EDITAL_PDF,    cta: "Edital PDF" },
  { no: "02", kind: "exe",    title: "Node.js v24.11.1",          tag: "Runtime",     body: "Ambiente de execução JavaScript profissional.",                 href: NODE_MSI,      cta: "Download MSI" },
  { no: "03", kind: "tool",   title: "Plutonium",                 tag: "Cliente",     body: "Client avançado para servidores dedicados.",                    href: PLUTONIUM_EXE, cta: "Download EXE" },
  { no: "04", kind: "keys",   title: "Access Keys × 500",         tag: "Cofre",       body: "Database de quinhentas chaves alfanuméricas auditadas.",         href: KEYS_TXT,      cta: "Download TXT" },
  { no: "05", kind: "vault",  title: "Audio Vault",               tag: "Câmara",      body: "Câmara dedicada para análise vocal biométrica em alta-fidelidade.", to: "/audios",    cta: "Entrar" },
  { no: "06", kind: "visual", title: "Cyberpunk View",            tag: "Visual",      body: "Cidade futurista neon-aesthetic em ultra-resolução.",            href: CYBERPUNK_IMG, cta: "Fullscreen", image: CYBERPUNK_IMG },
  { no: "07", kind: "food",   title: "Menu Gourmet",              tag: "Premium",     body: "Carne assada com crosta caramelizada — ordem premium.",         cta: "Order",        image: MEAT_IMG },
  { no: "08", kind: "tool",   title: "ACTO Elite Ext",            tag: "Chrome v2.11", body: "Extensão v2.11.0 — máscara V13 + bridges ACTO. Captura de plano removida; foco em estabilidade do painel lateral e isolamento de prompts por aba.", href: "/ACTO-tier-s-elite-v11.zip", cta: "Download v11" },
  { no: "09", kind: "radar",  title: "Radar Lovable",             tag: "Inteligência", body: "Painel de monitoramento em tempo real de novidades, bugs e tendências.", to: "/radar-lovable", cta: "Acessar Radar" },
  { no: "10", kind: "voice",  title: "VoxCPM2 Forge",             tag: "TTS Neural",  body: "Síntese de voz em 3 modos — design zero-shot, clone controlado e replicação ultra-fiel.", to: "/voice", cta: "Abrir Forge" },
  { no: "11", kind: "pulse",  title: "Pulse — Batimento",         tag: "Realtime",    body: "Chat global ao vivo + mural público de manifestos. Identidade anônima, texto e emoji. Sem login, sem rastro.", to: "/pulse", cta: "Entrar no Stream" },
] as const;

const KIND_ICON: Record<AssetKind, typeof FileText> = {
  doc: FileText, exe: Server, tool: Cpu, keys: Key, audio: Music, visual: ImageIcon, food: Utensils, vault: Music, radar: Radio, voice: Mic2, pulse: Zap,
};

function Index() {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [items, setItems] = useState<CalcItem[]>([
    { id: Date.now(), description: "", quantity: 1, unitPrice: 0, discount: 0 },
  ]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const addItem = () =>
    setItems((s) => [...s, { id: Date.now() + Math.random(), description: "", quantity: 1, unitPrice: 0, discount: 0 }]);
  const removeItem = (id: number) =>
    setItems((s) => (s.length > 1 ? s.filter((i) => i.id !== id) : s));
  const updateItem = <K extends keyof CalcItem>(id: number, field: K, value: CalcItem[K]) =>
    setItems((s) => s.map((i) => (i.id === id ? { ...i, [field]: value } : i)));

  const itemTotal = (i: CalcItem) => {
    const sub = (Number.isFinite(i.quantity) ? i.quantity : 0) * (Number.isFinite(i.unitPrice) ? i.unitPrice : 0);
    const disc = Number.isFinite(i.discount) ? i.discount : 0;
    return sub - sub * (disc / 100);
  };
  const total = useMemo(() => items.reduce((a, i) => a + itemTotal(i), 0), [items]);

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[var(--obsidian)] text-[var(--bone)] selection:bg-[var(--aurora-mint)]/40 selection:text-[var(--obsidian)]">
      {/* Aurora orbs */}
      <div aria-hidden className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <div className="absolute -top-[20%] -left-[10%] h-[60vh] w-[60vh] rounded-full bg-[var(--aurora-violet)]/25 blur-[140px]" />
        <div className="absolute top-[30%] -right-[15%] h-[55vh] w-[55vh] rounded-full bg-[var(--aurora-cyan)]/20 blur-[140px]" />
        <div className="absolute bottom-[-25%] left-[20%] h-[50vh] w-[50vh] rounded-full bg-[var(--aurora-mint)]/15 blur-[160px]" />
      </div>
      <div aria-hidden className="grain pointer-events-none fixed inset-0 z-0" />

      {/* Status ticker */}
      <div className="relative z-30 border-b border-white/5 bg-black/40 backdrop-blur-md">
        <div className="mx-auto flex max-w-[1600px] items-center justify-between px-6 py-2 font-mono text-[10px] uppercase tracking-[0.25em] text-white/45">
          <span className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[var(--aurora-mint)]" />
            Live — sys.online
          </span>
          <span className="hidden md:block">Obsidian Aurora · v2.0.0 · Tier S</span>
          <span>RJ · 21°C · ☁</span>
        </div>
      </div>

      {/* Header */}
      <header
        className={`fixed left-0 right-0 top-[28px] z-40 transition-all duration-500 ${
          scrolled ? "border-b border-white/10 bg-[var(--obsidian)]/85 py-3 backdrop-blur-xl" : "border-b border-transparent py-5"
        }`}
      >
        <div className="mx-auto flex max-w-[1600px] items-center justify-between px-6">
          <Link to="/" className="group flex items-center gap-3">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-aurora text-[var(--obsidian)] shadow-[0_8px_30px_-10px_var(--aurora-cyan)]">
              <Terminal className="h-4 w-4" strokeWidth={2.5} />
            </span>
            <span className="font-grotesk text-[15px] font-semibold tracking-tight">
              procore<span className="text-aurora">/</span>obsidian
            </span>
          </Link>
          <nav className="hidden items-center gap-9 font-grotesk text-[13px] text-white/55 md:flex">
            <Link to="/" className="hover:text-white">Index</Link>
            <Link to="/audios" className="hover:text-white">Audio Vault</Link>
            <Link to="/radar-lovable" className="hover:text-white">Radar</Link>
            <a href="#assets" className="hover:text-white">Assets</a>
            <a href="#calc" className="hover:text-white">Calculator</a>
          </nav>
          <Button
            className="conic-border rounded-full bg-[var(--obsidian-2)] px-5 py-2 text-[12px] font-medium text-white hover:bg-[var(--obsidian-2)]/80"
          >
            Console <ArrowUpRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      </header>

      <main className="relative z-10">
        {/* ─── HERO ─── */}
        <section className="relative px-6 pb-32 pt-44">
          <div className="mx-auto grid max-w-[1600px] grid-cols-12 gap-6">
            <div className="col-span-12 lg:col-span-7">
              <div className="mb-10 flex items-center gap-3 font-mono text-[11px] uppercase tracking-[0.35em] text-white/40">
                <span>—— 2026 / Q2</span>
                <span className="text-aurora">Index.001</span>
              </div>

              <h1 className="font-display text-[clamp(64px,11vw,184px)] font-normal leading-[0.86] tracking-[-0.04em]">
                <span className="block">Obsidian</span>
                <span className="block italic text-aurora">aurora.</span>
                <span className="block text-outline">protocol</span>
              </h1>

              <p className="mt-10 max-w-[44ch] font-grotesk text-[16px] leading-relaxed text-white/65">
                Uma câmara digital onde documentos, runtimes, áudio e chaves
                coexistem em arquitetura editorial. Densidade técnica máxima,
                interface escultural.
              </p>

              <div className="mt-10 flex flex-wrap items-center gap-3">
                <a
                  href="#assets"
                  className="group inline-flex items-center gap-3 rounded-full bg-[var(--bone)] px-7 py-4 font-grotesk text-[14px] font-medium text-[var(--obsidian)] transition hover:gap-5"
                >
                  Explorar Ativos
                  <ArrowUpRight className="h-4 w-4 transition group-hover:rotate-45" />
                </a>
                <Link
                  to="/audios"
                  className="group inline-flex items-center gap-3 rounded-full border border-white/15 px-7 py-4 font-grotesk text-[14px] text-white/80 transition hover:border-white/40 hover:text-white"
                >
                  Audio Vault
                  <Music className="h-4 w-4 transition group-hover:translate-x-1" />
                </Link>
                <Link
                  to="/radar-lovable"
                  className="group inline-flex items-center gap-3 rounded-full border border-[var(--aurora-mint)]/30 bg-[var(--aurora-mint)]/5 px-7 py-4 font-grotesk text-[14px] text-[var(--aurora-mint)] transition hover:bg-[var(--aurora-mint)]/10"
                >
                  Radar Lovable
                  <Radio className="h-4 w-4 animate-pulse" />
                </Link>
              </div>
            </div>

            {/* Hero card */}
            <div className="col-span-12 lg:col-span-5">
              <div className="conic-border floaty relative aspect-[4/5] overflow-hidden rounded-[28px] bg-[var(--obsidian-2)]">
                <img
                  src={HERO_IMG}
                  alt="Banner principal — Neural network"
                  loading="lazy"
                  className="absolute inset-0 h-full w-full object-cover opacity-90 mix-blend-luminosity transition duration-1000 hover:scale-[1.03] hover:mix-blend-normal"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[var(--obsidian)] via-transparent to-transparent" />
                <div className="absolute inset-x-0 top-0 flex items-center justify-between p-6">
                  <span className="rounded-full border border-white/20 bg-black/30 px-3 py-1 font-mono text-[10px] uppercase tracking-widest text-white/70 backdrop-blur">
                    Active Banner — v2.0
                  </span>
                  <span className="grid h-9 w-9 place-items-center rounded-full bg-[var(--aurora-mint)] text-[var(--obsidian)]">
                    <Shield className="h-4 w-4" strokeWidth={2.5} />
                  </span>
                </div>
                <div className="absolute inset-x-0 bottom-0 p-6">
                  <p className="font-mono text-[10px] uppercase tracking-[0.35em] text-[var(--aurora-mint)]">Neural Network</p>
                  <p className="mt-2 font-display text-3xl italic leading-tight">status: locked</p>
                </div>
              </div>

              {/* meta stack */}
              <div className="mt-5 grid grid-cols-3 gap-3 font-mono text-[10px] uppercase tracking-widest text-white/45">
                <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
                  <p className="text-white/40">Latency</p>
                  <p className="mt-2 text-lg text-white">12<span className="text-white/40">ms</span></p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
                  <p className="text-white/40">Assets</p>
                  <p className="mt-2 text-lg text-white">{ASSETS.length.toString().padStart(2, "0")}</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
                  <p className="text-white/40">Uptime</p>
                  <p className="mt-2 text-lg text-white">99.9<span className="text-white/40">%</span></p>
                </div>
              </div>
            </div>
          </div>

          {/* Marquee */}
          <div className="relative mt-24 overflow-hidden border-y border-white/10 py-6">
            <div className="marquee-track flex w-max gap-12 whitespace-nowrap font-display text-5xl italic">
              {Array.from({ length: 2 }).map((_, dup) => (
                <div key={dup} className="flex items-center gap-12">
                  {["protocol", "·", "assets", "·", "audio", "·", "vault", "·", "runtime", "·", "keys", "·", "tier-S", "·"].map((w, i) => (
                    <span key={`${dup}-${i}`} className={i % 4 === 1 ? "text-aurora" : "text-outline"}>
                      {w}
                    </span>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ─── ASSETS ─── */}
        <section id="assets" className="relative px-6 py-28">
          <div className="mx-auto max-w-[1600px]">
            <div className="mb-14 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="font-mono text-[11px] uppercase tracking-[0.35em] text-white/40">02 — System Assets</p>
                <h2 className="mt-3 font-display text-[clamp(42px,6vw,84px)] leading-[0.95]">
                  Ativos <span className="italic text-aurora">compilados</span>
                </h2>
              </div>
              <p className="max-w-md font-grotesk text-sm leading-relaxed text-white/55">
                Cada bloco abaixo é uma unidade autônoma — documento, runtime,
                cliente, cofre ou mídia — pronta para download ou execução imediata.
              </p>
            </div>

            <div className="grid grid-cols-12 gap-5">
              {ASSETS.map((a, idx) => {
                const Icon = KIND_ICON[a.kind];
                // broken grid spans
                const span =
                  idx === 0 ? "col-span-12 md:col-span-7 lg:col-span-7" :
                  idx === 1 ? "col-span-12 md:col-span-5 lg:col-span-5" :
                  idx === 4 ? "col-span-12 md:col-span-8 lg:col-span-6" :
                  idx === 5 ? "col-span-12 md:col-span-4 lg:col-span-6" :
                              "col-span-12 md:col-span-6 lg:col-span-4";
                return (
                  <article
                    key={a.no}
                    className={`group relative ${span} overflow-hidden rounded-[26px] border border-white/10 bg-[var(--obsidian-2)]/60 p-7 transition hover:border-white/25`}
                  >
                    {a.image && (
                      <div className="absolute inset-0 -z-10">
                        <img
                          src={a.image}
                          alt=""
                          loading="lazy"
                          className="h-full w-full object-cover opacity-25 transition duration-700 group-hover:scale-105 group-hover:opacity-45"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-[var(--obsidian)] via-[var(--obsidian)]/70 to-transparent" />
                      </div>
                    )}

                    <div className="flex items-start justify-between">
                      <span className="font-display text-[64px] leading-none text-outline">{a.no}</span>
                      <span className="rounded-full border border-white/15 px-3 py-1 font-mono text-[9px] uppercase tracking-[0.3em] text-white/55">
                        {a.tag}
                      </span>
                    </div>

                    <div className="mt-12 flex items-center gap-3">
                      <span className="grid h-9 w-9 place-items-center rounded-xl border border-white/10 bg-white/5">
                        <Icon className="h-4 w-4 text-white/80" />
                      </span>
                      <h3 className="font-grotesk text-[22px] font-medium tracking-tight">{a.title}</h3>
                    </div>
                    <p className="mt-3 max-w-[40ch] text-sm leading-relaxed text-white/55">{a.body}</p>

                    {a.kind === "keys" && (
                      <pre className="mt-5 overflow-hidden rounded-xl border border-white/10 bg-black/40 p-3 font-mono text-[10px] leading-relaxed text-[var(--aurora-mint)]/85">
ABG-007-NQN  ABW-958-PDD{"\n"}AFI-892-QKZ  AFN-016-OFP{"\n"}AGC-441-LBR  AHK-733-MTU
                      </pre>
                    )}

                    <div className="mt-7 flex items-center justify-between">
                      {a.to ? (
                        <Link
                          to={a.to}
                          className="group/cta inline-flex items-center gap-2 font-grotesk text-sm text-white hover:text-[var(--aurora-mint)]"
                        >
                          {a.cta} <ArrowUpRight className="h-4 w-4 transition group-hover/cta:rotate-45" />
                        </Link>
                      ) : a.href ? (
                        <a
                          href={a.href}
                          target="_blank"
                          rel="noopener noreferrer"
                          download
                          className="group/cta inline-flex items-center gap-2 font-grotesk text-sm text-white hover:text-[var(--aurora-mint)]"
                        >
                          {a.cta} <Download className="h-4 w-4 transition group-hover/cta:translate-y-0.5" />
                        </a>
                      ) : (
                        <button
                          type="button"
                          className="group/cta inline-flex items-center gap-2 font-grotesk text-sm text-white hover:text-[var(--aurora-mint)]"
                        >
                          {a.cta} <ArrowUpRight className="h-4 w-4 transition group-hover/cta:rotate-45" />
                        </button>
                      )}
                      <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-white/35">
                        idx.{a.no}
                      </span>
                    </div>
                  </article>
                );
              })}

              {/* Audio briefing inline card */}
              <article className="col-span-12 overflow-hidden rounded-[26px] border border-white/10 bg-gradient-to-br from-[var(--obsidian-2)] to-[var(--obsidian)] p-8">
                <div className="grid grid-cols-12 items-center gap-8">
                  <div className="col-span-12 lg:col-span-5">
                    <p className="font-mono text-[11px] uppercase tracking-[0.35em] text-[var(--aurora-mint)]">briefing — voice</p>
                    <h3 className="mt-3 font-display text-4xl italic">Audio briefing 01</h3>
                    <p className="mt-3 max-w-md text-sm leading-relaxed text-white/55">
                      Módulo encriptado de voz — escute aqui ou abra a câmara
                      completa para análise espectral em tempo real.
                    </p>
                  </div>
                  <div className="col-span-12 space-y-4 lg:col-span-7">
                    <audio
                      controls
                      preload="none"
                      src={BRIEFING_MP3}
                      className="w-full"
                      aria-label="Audio briefing"
                    />
                    <Link
                      to="/audios"
                      className="inline-flex items-center gap-2 font-grotesk text-sm text-white hover:text-[var(--aurora-mint)]"
                    >
                      Abrir Audio Vault <ArrowUpRight className="h-4 w-4" />
                    </Link>
                  </div>
                </div>
              </article>
            </div>
          </div>
        </section>

        {/* ─── CALCULATOR ─── */}
        <section id="calc" className="relative px-6 py-28">
          <div className="mx-auto max-w-[1600px]">
            <div className="mb-14 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="font-mono text-[11px] uppercase tracking-[0.35em] text-white/40">03 — Discount Engine</p>
                <h2 className="mt-3 font-display text-[clamp(42px,6vw,84px)] leading-[0.95]">
                  Calculadora <span className="italic text-aurora">modular</span>
                </h2>
              </div>
              <Button
                onClick={addItem}
                className="conic-border h-12 rounded-full bg-[var(--obsidian-2)] px-6 font-grotesk text-sm text-white hover:bg-[var(--obsidian-2)]/80"
              >
                <Plus className="h-4 w-4" /> Adicionar item
              </Button>
            </div>

            <div className="space-y-3">
              {items.map((item, idx) => (
                <div
                  key={item.id}
                  className="grid grid-cols-12 items-end gap-3 rounded-2xl border border-white/10 bg-[var(--obsidian-2)]/50 p-5 transition hover:border-white/20"
                >
                  <div className="col-span-12 md:col-span-1 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.3em] text-white/40">
                    <span className="text-outline font-display text-3xl leading-none">
                      {String(idx + 1).padStart(2, "0")}
                    </span>
                  </div>
                  <Field label="Descrição" className="md:col-span-4">
                    <input
                      type="text"
                      value={item.description}
                      onChange={(e) => updateItem(item.id, "description", e.target.value)}
                      placeholder="Item…"
                      className="calc-input"
                    />
                  </Field>
                  <Field label="Qtd" className="md:col-span-1">
                    <input
                      type="number"
                      min={0}
                      value={item.quantity}
                      onChange={(e) => updateItem(item.id, "quantity", Number(e.target.value))}
                      className="calc-input"
                    />
                  </Field>
                  <Field label="Preço" className="md:col-span-2">
                    <input
                      type="number"
                      min={0}
                      step="0.01"
                      value={item.unitPrice}
                      onChange={(e) => updateItem(item.id, "unitPrice", Number(e.target.value))}
                      className="calc-input"
                    />
                  </Field>
                  <Field label="Desc %" className="md:col-span-1">
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={item.discount}
                      onChange={(e) => updateItem(item.id, "discount", Number(e.target.value))}
                      className="calc-input"
                    />
                  </Field>
                  <Field label="Total" className="md:col-span-2">
                    <div className="flex h-11 items-center rounded-xl border border-[var(--aurora-mint)]/40 bg-[var(--aurora-mint)]/5 px-4 font-mono text-sm text-[var(--aurora-mint)]">
                      R$ {itemTotal(item).toFixed(2)}
                    </div>
                  </Field>
                  <div className="md:col-span-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`Remover item ${idx + 1}`}
                      onClick={() => removeItem(item.id)}
                      className="h-11 w-full rounded-xl text-white/40 hover:bg-red-500/10 hover:text-red-300"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            <div className="conic-border mt-8 flex flex-col items-center justify-between gap-6 rounded-3xl bg-[var(--obsidian-2)]/60 p-8 md:flex-row">
              <div className="flex items-center gap-5">
                <span className="grid h-14 w-14 place-items-center rounded-2xl bg-aurora text-[var(--obsidian)]">
                  <Calculator className="h-6 w-6" strokeWidth={2.5} />
                </span>
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-[0.35em] text-white/45">total balance</p>
                  <p className="font-display text-5xl leading-none">
                    R$ <span className="text-aurora">{total.toFixed(2)}</span>
                  </p>
                </div>
              </div>
              <Button className="h-14 rounded-full bg-[var(--bone)] px-9 font-grotesk text-sm text-[var(--obsidian)] hover:bg-white">
                Executar Transação <ArrowUpRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </section>

        {/* ─── CONSOLE ─── */}
        <section className="relative px-6 pb-32">
          <div className="mx-auto max-w-[1600px]">
            <div className="scanlines relative overflow-hidden rounded-3xl border border-white/10 bg-black/60 p-8 backdrop-blur">
              <div className="mb-6 flex items-center gap-3">
                <span className="h-2.5 w-2.5 rounded-full bg-red-400/80" />
                <span className="h-2.5 w-2.5 rounded-full bg-amber-300/80" />
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/80" />
                <span className="ml-3 font-mono text-[10px] uppercase tracking-widest text-white/40">
                  procore_console · obsidian_aurora · v2.0.0
                </span>
              </div>
              <div className="space-y-2 font-mono text-[13px]">
                {[
                  ["06:22:01", "Initializing aurora gradient tokens…", "DONE",   "text-[var(--aurora-mint)]"],
                  ["06:22:05", "Loading obsidian shells & noise filters…", "DONE", "text-[var(--aurora-mint)]"],
                  ["06:22:12", "Authenticating Tier S privileges…", "GRANTED",   "text-[var(--aurora-violet)]"],
                  ["06:22:18", "Mounting 07 system assets…", "READY",            "text-[var(--aurora-cyan)]"],
                ].map(([t, msg, status, color]) => (
                  <div key={t} className="flex gap-4">
                    <span className="text-white/30">[{t}]</span>
                    <span className="text-white/70">{msg}</span>
                    <span className={`ml-auto ${color}`}>{status}</span>
                  </div>
                ))}
                <div className="mt-4 flex items-center gap-3 border-t border-white/10 pt-4">
                  <span className="text-[var(--aurora-mint)]">{">"}</span>
                  <span className="text-white">System ready</span>
                  <span className="h-4 w-2 animate-pulse bg-[var(--aurora-mint)]" />
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/10 px-6 py-14">
        <div className="mx-auto flex max-w-[1600px] flex-col items-center justify-between gap-8 md:flex-row">
          <div className="flex items-center gap-3">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-aurora text-[var(--obsidian)]">
              <Terminal className="h-4 w-4" strokeWidth={2.5} />
            </span>
            <span className="font-grotesk text-sm">procore/obsidian — © 2026</span>
          </div>
          <div className="flex gap-6 font-mono text-[11px] uppercase tracking-[0.3em] text-white/45">
            <a href="#" className="hover:text-white">Privacy</a>
            <a href="#" className="hover:text-white">License</a>
            <a href="#" className="hover:text-white">Security</a>
          </div>
          <div className="flex gap-2">
            <Button size="icon" variant="ghost" className="rounded-full text-white/55 hover:bg-white/10 hover:text-white">
              <Github className="h-4 w-4" />
            </Button>
            <Button size="icon" variant="ghost" className="rounded-full text-white/55 hover:bg-white/10 hover:text-white">
              <Globe className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </footer>

      {/* FAB */}
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        aria-label="Abrir Security Console"
        className="conic-border fixed bottom-6 right-6 z-40 grid h-16 w-16 place-items-center rounded-2xl bg-[var(--obsidian-2)] text-white shadow-[0_20px_60px_-15px_var(--aurora-violet)] transition hover:scale-105"
      >
        <Zap className="h-5 w-5" />
      </button>

      {/* Side panel */}
      {isOpen && (
        <div
          className="fixed inset-0 z-50 animate-in fade-in bg-black/70 backdrop-blur-sm"
          onClick={() => setIsOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-label="Security Console"
        >
          <aside
            onClick={(e) => e.stopPropagation()}
            className="absolute right-0 top-0 flex h-full w-full max-w-md animate-in slide-in-from-right flex-col gap-8 border-l border-white/10 bg-[var(--obsidian-2)] p-8"
          >
            <header className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="grid h-9 w-9 place-items-center rounded-xl bg-aurora text-[var(--obsidian)]">
                  <Shield className="h-4 w-4" strokeWidth={2.5} />
                </span>
                <h3 className="font-display text-2xl">Security Console</h3>
              </div>
              <Button
                size="icon"
                variant="ghost"
                onClick={() => setIsOpen(false)}
                aria-label="Fechar painel"
                className="rounded-full text-white/55 hover:bg-white/10 hover:text-white"
              >
                <X className="h-5 w-5" />
              </Button>
            </header>

            <div className="space-y-2 rounded-2xl border border-white/10 bg-black/30 p-5">
              <p className="text-sm text-white/65">
                Extensão <span className="text-white">Exportador Painel</span> sincronizada
                ao núcleo central — protocolos AES-256 ativos.
              </p>
              <div className="mt-4 grid grid-cols-2 gap-3 font-mono text-[10px] uppercase tracking-widest text-white/40">
                <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                  <p>Status</p>
                  <p className="mt-1 text-base text-[var(--aurora-mint)]">Encrypted</p>
                </div>
                <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                  <p>Latency</p>
                  <p className="mt-1 text-base text-[var(--aurora-cyan)]">12ms</p>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-white/40">Quick ops</p>
              <PanelAction label="Exportar dados brutos" icon={Terminal} accent="cyan" />
              <PanelAction label="Configurações do núcleo" icon={Cpu} accent="violet" />
              <PanelAction label="Resetar protocolos" icon={Shield} accent="plasma" />
            </div>

            <div className="mt-auto border-t border-white/10 pt-6 font-mono text-[10px] uppercase tracking-widest text-white/40">
              <span className="mr-2 inline-block h-1.5 w-1.5 animate-ping rounded-full bg-[var(--aurora-mint)] align-middle" />
              Sessão Tier S ativa até 07:00
            </div>
          </aside>
        </div>
      )}

      {/* Scoped styles */}
      <style>{`
        .calc-input {
          width: 100%;
          height: 2.75rem;
          background: rgba(0,0,0,0.35);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 0.75rem;
          padding: 0 0.85rem;
          color: white;
          font-family: var(--font-mono);
          font-size: 0.85rem;
          transition: border-color .2s ease, background .2s ease;
        }
        .calc-input:focus {
          outline: none;
          border-color: var(--aurora-cyan);
          background: rgba(0,0,0,0.5);
        }
        .calc-input::placeholder { color: rgba(255,255,255,0.25); }
      `}</style>
    </div>
  );
}

function Field({
  label, children, className = "",
}: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <label className={`block space-y-2 ${className}`}>
      <span className="block font-mono text-[9px] uppercase tracking-[0.3em] text-white/40">{label}</span>
      {children}
    </label>
  );
}

function PanelAction({
  label, icon: Icon, accent,
}: { label: string; icon: typeof Terminal; accent: "cyan" | "violet" | "plasma" }) {
  const color =
    accent === "cyan" ? "var(--aurora-cyan)" :
    accent === "violet" ? "var(--aurora-violet)" :
    "var(--aurora-plasma)";
  return (
    <button
      type="button"
      className="group flex h-14 w-full items-center justify-between rounded-xl border border-white/10 bg-white/5 px-5 font-grotesk text-sm text-white transition hover:border-white/30"
    >
      <span>{label}</span>
      <Icon className="h-4 w-4 opacity-60 transition group-hover:opacity-100" style={{ color }} />
    </button>
  );
}
