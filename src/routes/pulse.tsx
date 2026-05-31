import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getAnonIdentity, regenerateHandle, type AnonIdentity } from "@/lib/anon-identity";
import {
  sendPulseMessage,
  createPulsePost,
  togglePulseReaction,
} from "@/lib/pulse.functions";

export const Route = createFileRoute("/pulse")({
  head: () => ({
    meta: [
      { title: "PULSE — Batimento Coletivo · Obsidian Aurora" },
      {
        name: "description",
        content:
          "Chat global em tempo real e mural público de manifestos. Identidade anônima, latência sub-segundo, estética obsidian aurora.",
      },
      { property: "og:title", content: "PULSE — Batimento Coletivo" },
      {
        property: "og:description",
        content: "Chat global em tempo real + mural público. Apenas texto e emoji.",
      },
    ],
  }),
  component: PulsePage,
  errorComponent: ({ error }) => (
    <div className="min-h-screen flex items-center justify-center bg-[var(--obsidian)] text-[var(--bone)] p-8">
      <div className="max-w-md text-center space-y-3 font-[Space_Grotesk]">
        <p className="text-xs tracking-[0.3em] text-aurora">// CANAL DERRUBADO</p>
        <p className="text-sm opacity-70">{error.message}</p>
        <Link to="/" className="inline-block mt-4 text-xs underline opacity-80 hover:opacity-100">
          ← voltar
        </Link>
      </div>
    </div>
  ),
});

// ─── tipos ─────────────────────────────────────────────────────────
interface PulseMessage {
  id: string;
  client_id: string;
  handle: string;
  color_hash: number;
  body: string;
  created_at: string;
  _pending?: boolean;
}

interface PulsePost {
  id: string;
  client_id: string;
  handle: string;
  color_hash: number;
  body: string;
  reactions: Record<string, number>;
  created_at: string;
  _pending?: boolean;
}

const EMOJIS = ["🌀", "✨", "🔥", "💀", "👁", "⚡", "🩸", "🜂"] as const;
const REACT_EMOJIS = ["👁", "🔥", "💀", "✨", "🌀"] as const;

// ─── utils ─────────────────────────────────────────────────────────
function timeAgo(iso: string): string {
  const s = Math.max(1, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 60) return `${s}s`;
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  return `${Math.floor(s / 86400)}d`;
}

function hueOf(hash: number): number {
  return Math.abs(hash) % 360;
}

// ─── página ────────────────────────────────────────────────────────
function PulsePage() {
  const [identity, setIdentity] = useState<AnonIdentity | null>(null);
  const [messages, setMessages] = useState<PulseMessage[]>([]);
  const [posts, setPosts] = useState<PulsePost[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"chat" | "mural">("chat");
  const [body, setBody] = useState("");
  const [mode, setMode] = useState<"chat" | "post">("chat");
  const [sending, setSending] = useState(false);
  const [errMsg, setErrMsg] = useState<string | null>(null);
  const [online, setOnline] = useState<"on" | "off" | "wait">("wait");
  const [newCount, setNewCount] = useState(0);

  const sendMsgFn = useServerFn(sendPulseMessage);
  const sendPostFn = useServerFn(createPulsePost);
  const reactFn = useServerFn(togglePulseReaction);

  const chatRef = useRef<HTMLDivElement>(null);
  const stickToBottom = useRef(true);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Identity (client-side only)
  useEffect(() => {
    setIdentity(getAnonIdentity());
  }, []);

  // Initial fetch
  useEffect(() => {
    let alive = true;
    (async () => {
      const [msgRes, postRes] = await Promise.all([
        supabase
          .from("pulse_messages")
          .select("id, client_id, handle, color_hash, body, created_at")
          .order("created_at", { ascending: false })
          .limit(80),
        supabase
          .from("pulse_posts")
          .select("id, client_id, handle, color_hash, body, reactions, created_at")
          .order("created_at", { ascending: false })
          .limit(40),
      ]);
      if (!alive) return;
      if (msgRes.data) setMessages([...msgRes.data].reverse() as PulseMessage[]);
      if (postRes.data) {
        setPosts(
          (postRes.data as PulsePost[]).map((p) => ({
            ...p,
            reactions: (p.reactions ?? {}) as Record<string, number>,
          })),
        );
      }
      setLoading(false);
    })();
    return () => {
      alive = false;
    };
  }, []);

  // Realtime
  useEffect(() => {
    const channel = supabase
      .channel("pulse-public")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "pulse_messages" },
        (payload) => {
          const m = payload.new as PulseMessage;
          setMessages((prev) => {
            if (prev.some((x) => x.id === m.id)) return prev;
            return [...prev, m].slice(-200);
          });
          if (!stickToBottom.current) setNewCount((n) => n + 1);
        },
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "pulse_posts" },
        (payload) => {
          const p = payload.new as PulsePost;
          setPosts((prev) => (prev.some((x) => x.id === p.id) ? prev : [{ ...p, reactions: p.reactions ?? {} }, ...prev].slice(0, 80)));
        },
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "pulse_posts" },
        (payload) => {
          const p = payload.new as PulsePost;
          setPosts((prev) =>
            prev.map((x) => (x.id === p.id ? { ...x, reactions: (p.reactions ?? {}) as Record<string, number> } : x)),
          );
        },
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") setOnline("on");
        else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") setOnline("off");
      });

    return () => {
      void supabase.removeChannel(channel);
    };
  }, []);

  // Auto-scroll
  useEffect(() => {
    const el = chatRef.current;
    if (!el || tab !== "chat") return;
    if (stickToBottom.current) {
      el.scrollTop = el.scrollHeight;
      setNewCount(0);
    }
  }, [messages, tab]);

  const onChatScroll = () => {
    const el = chatRef.current;
    if (!el) return;
    stickToBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
    if (stickToBottom.current) setNewCount(0);
  };

  const scrollToBottom = () => {
    const el = chatRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
    stickToBottom.current = true;
    setNewCount(0);
  };

  // Send
  const maxLen = mode === "chat" ? 280 : 500;
  const remaining = maxLen - body.length;

  const onSend = async () => {
    if (!identity || sending) return;
    const trimmed = body.trim();
    if (!trimmed) return;
    if (trimmed.length > maxLen) {
      setErrMsg(`máximo ${maxLen} caracteres`);
      return;
    }
    setSending(true);
    setErrMsg(null);
    try {
      if (mode === "chat") {
        await sendMsgFn({
          data: {
            clientId: identity.clientId,
            handle: identity.handle,
            colorHash: identity.colorHash,
            body: trimmed,
          },
        });
        stickToBottom.current = true;
      } else {
        await sendPostFn({
          data: {
            clientId: identity.clientId,
            handle: identity.handle,
            colorHash: identity.colorHash,
            body: trimmed,
          },
        });
        setTab("mural");
      }
      setBody("");
    } catch (e) {
      setErrMsg(e instanceof Error ? e.message : "falha no envio");
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  };

  const insertEmoji = (e: string) => {
    setBody((b) => (b + e).slice(0, maxLen));
    inputRef.current?.focus();
  };

  const onReact = async (postId: string, emoji: string) => {
    if (!identity) return;
    try {
      const res = await reactFn({ data: { postId, clientId: identity.clientId, emoji } });
      setPosts((prev) => prev.map((p) => (p.id === postId ? { ...p, reactions: res.reactions } : p)));
    } catch (e) {
      setErrMsg(e instanceof Error ? e.message : "falha na reação");
    }
  };

  const onRegenHandle = () => {
    if (!confirm("Gerar novo handle? O atual será descartado.")) return;
    setIdentity(regenerateHandle());
  };

  const onlineLabel = useMemo(
    () => (online === "on" ? "AO VIVO" : online === "off" ? "RECONECTANDO" : "CONECTANDO"),
    [online],
  );

  return (
    <div className="min-h-screen bg-[var(--obsidian)] text-[var(--bone)] grain">
      <div className="scanlines pointer-events-none fixed inset-0 z-0" />

      {/* HEADER */}
      <header className="relative z-10 border-b border-white/10 bg-[var(--obsidian)]/80 backdrop-blur">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
          <Link
            to="/"
            className="text-[10px] tracking-[0.3em] opacity-70 hover:opacity-100 font-[JetBrains_Mono]"
          >
            ← OBSIDIAN
          </Link>
          <div className="flex items-center gap-3 font-[JetBrains_Mono] text-[10px]">
            <span className="hidden sm:inline opacity-60">// PULSE.LIVE</span>
            <span
              className={`inline-flex items-center gap-1.5 px-2 py-0.5 border ${
                online === "on"
                  ? "border-emerald-400/40 text-emerald-300"
                  : online === "off"
                    ? "border-red-400/40 text-red-300"
                    : "border-white/20 text-white/60"
              }`}
            >
              <span
                className={`h-1.5 w-1.5 rounded-full ${
                  online === "on" ? "bg-emerald-400 animate-pulse" : online === "off" ? "bg-red-400" : "bg-white/50"
                }`}
              />
              {onlineLabel}
            </span>
          </div>
        </div>
      </header>

      {/* HERO */}
      <section className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 pt-8 pb-4">
        <div className="flex items-end justify-between gap-4 flex-wrap">
          <div>
            <p className="font-[JetBrains_Mono] text-[10px] tracking-[0.3em] opacity-60">11 · BATIMENTO COLETIVO</p>
            <h1 className="font-[Instrument_Serif] italic text-5xl sm:text-7xl leading-[0.9] mt-2">
              <span className="text-aurora">pulse</span>
              <span className="opacity-30">.</span>
            </h1>
            <p className="mt-3 max-w-xl text-sm sm:text-base opacity-70 font-[Space_Grotesk]">
              Stream global ao vivo + mural público de manifestos. Identidade anônima, texto e emoji. Sem login, sem rastro.
            </p>
          </div>
          {identity && (
            <button
              onClick={onRegenHandle}
              className="group text-left border border-white/10 px-3 py-2 hover:border-white/30 transition"
              aria-label="Regenerar handle anônimo"
            >
              <span className="block font-[JetBrains_Mono] text-[10px] opacity-60 group-hover:opacity-100">VOCÊ É</span>
              <span
                className="block font-[JetBrains_Mono] text-sm mt-0.5"
                style={{ color: `hsl(${identity.hue} 70% 70%)` }}
              >
                @{identity.handle}
              </span>
            </button>
          )}
        </div>

        {/* tabs mobile */}
        <div className="lg:hidden mt-6 grid grid-cols-2 border border-white/10 font-[JetBrains_Mono] text-[11px]">
          {(["chat", "mural"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`py-2 tracking-[0.3em] uppercase ${
                tab === t ? "bg-white text-black" : "opacity-70 hover:opacity-100"
              }`}
            >
              {t === "chat" ? `chat · ${messages.length}` : `mural · ${posts.length}`}
            </button>
          ))}
        </div>
      </section>

      {/* CONTENT */}
      <section className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 pb-40">
        <div className="lg:grid lg:grid-cols-12 lg:gap-6">
          {/* MURAL */}
          <div className={`lg:col-span-7 ${tab === "mural" ? "" : "hidden lg:block"}`}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-[JetBrains_Mono] text-[10px] tracking-[0.3em] opacity-60">// MURAL · MANIFESTOS</h2>
              <span className="font-[JetBrains_Mono] text-[10px] opacity-50">{posts.length} pulsos</span>
            </div>

            {loading ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="h-32 border border-white/5 bg-white/[0.02] animate-pulse" />
                ))}
              </div>
            ) : posts.length === 0 ? (
              <EmptyState text="o mural aguarda o primeiro manifesto." />
            ) : (
              <ul className="space-y-3">
                {posts.map((p, idx) => (
                  <PostCard key={p.id} post={p} index={idx} onReact={onReact} myClientId={identity?.clientId ?? ""} />
                ))}
              </ul>
            )}
          </div>

          {/* CHAT */}
          <div className={`lg:col-span-5 lg:sticky lg:top-20 lg:self-start ${tab === "chat" ? "" : "hidden lg:block"}`}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-[JetBrains_Mono] text-[10px] tracking-[0.3em] opacity-60">// CHAT · STREAM</h2>
              <span className="font-[JetBrains_Mono] text-[10px] opacity-50">{messages.length} pulsos</span>
            </div>

            <div className="relative border border-white/10 bg-black/30">
              <div
                ref={chatRef}
                onScroll={onChatScroll}
                role="log"
                aria-live="polite"
                aria-label="Mensagens do chat ao vivo"
                className="h-[60vh] lg:h-[70vh] overflow-y-auto p-3 space-y-2 font-[Space_Grotesk] text-sm"
              >
                {loading ? (
                  <p className="opacity-50 text-xs font-[JetBrains_Mono]">// carregando stream...</p>
                ) : messages.length === 0 ? (
                  <EmptyState text="silêncio absoluto. transmita o primeiro pulso." />
                ) : (
                  messages.map((m) => (
                    <MessageBubble key={m.id} m={m} mine={m.client_id === identity?.clientId} />
                  ))
                )}
              </div>

              {newCount > 0 && (
                <button
                  onClick={scrollToBottom}
                  className="absolute bottom-3 left-1/2 -translate-x-1/2 px-3 py-1 text-[11px] font-[JetBrains_Mono] bg-white text-black hover:opacity-90"
                >
                  ↓ {newCount} novas
                </button>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* COMPOSER */}
      <div className="fixed bottom-0 inset-x-0 z-20 border-t border-white/10 bg-[var(--obsidian)]/95 backdrop-blur">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 py-3">
          {errMsg && (
            <p className="text-[11px] font-[JetBrains_Mono] text-red-300 mb-2" role="alert">
              ⚠ {errMsg}
            </p>
          )}
          <div className="flex items-start gap-2">
            <div className="flex flex-col gap-1 font-[JetBrains_Mono] text-[10px]">
              {(["chat", "post"] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => setMode(m)}
                  className={`px-2 py-1 tracking-[0.2em] uppercase border ${
                    mode === m ? "bg-white text-black border-white" : "border-white/20 opacity-70 hover:opacity-100"
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>

            <div className="flex-1">
              <textarea
                ref={inputRef}
                value={body}
                onChange={(e) => setBody(e.target.value.slice(0, maxLen))}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    void onSend();
                  }
                }}
                placeholder={mode === "chat" ? "transmita um pulso..." : "publique um manifesto..."}
                rows={mode === "chat" ? 1 : 2}
                className="w-full resize-none bg-black/40 border border-white/10 px-3 py-2 text-sm font-[Space_Grotesk] text-[var(--bone)] placeholder:text-white/30 focus:outline-none focus:border-white/40"
                disabled={!identity}
              />
              <div className="mt-1.5 flex items-center justify-between gap-2">
                <div className="flex flex-wrap gap-1">
                  {EMOJIS.map((e) => (
                    <button
                      key={e}
                      type="button"
                      onClick={() => insertEmoji(e)}
                      className="h-7 w-7 grid place-items-center border border-white/10 hover:border-white/40 text-base leading-none"
                      aria-label={`Inserir ${e}`}
                    >
                      {e}
                    </button>
                  ))}
                </div>
                <span
                  className={`font-[JetBrains_Mono] text-[10px] ${
                    remaining < 20 ? "text-aurora" : "opacity-50"
                  }`}
                >
                  {remaining}
                </span>
              </div>
            </div>

            <button
              onClick={() => void onSend()}
              disabled={sending || !body.trim() || !identity}
              className="self-stretch px-4 font-[JetBrains_Mono] text-[11px] tracking-[0.2em] uppercase bg-white text-black hover:opacity-90 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              {sending ? "..." : mode === "chat" ? "Transmitir" : "Publicar"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── subcomponentes ────────────────────────────────────────────────
function EmptyState({ text }: { text: string }) {
  return (
    <div className="py-10 text-center font-[Instrument_Serif] italic text-lg opacity-50">{text}</div>
  );
}

function MessageBubble({ m, mine }: { m: PulseMessage; mine: boolean }) {
  const hue = hueOf(m.color_hash);
  return (
    <div className={`flex ${mine ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[85%] border-l-2 px-2.5 py-1.5 bg-white/[0.03] ${mine ? "border-r-0" : ""}`}
        style={{ borderLeftColor: `hsl(${hue} 70% 65%)` }}
      >
        <div className="flex items-center gap-2 mb-0.5">
          <span className="font-[JetBrains_Mono] text-[10px]" style={{ color: `hsl(${hue} 70% 70%)` }}>
            @{m.handle}
          </span>
          <span className="font-[JetBrains_Mono] text-[9px] opacity-40">{timeAgo(m.created_at)}</span>
        </div>
        <p className="text-sm leading-snug whitespace-pre-wrap break-words">{m.body}</p>
      </div>
    </div>
  );
}

function PostCard({
  post,
  index,
  onReact,
  myClientId,
}: {
  post: PulsePost;
  index: number;
  onReact: (id: string, emoji: string) => void;
  myClientId: string;
}) {
  const hue = hueOf(post.color_hash);
  const long = post.body.length > 120;
  return (
    <li className="relative border border-white/10 bg-white/[0.02] p-4 sm:p-5 hover:border-white/30 transition">
      <span className="absolute -top-3 right-3 font-[JetBrains_Mono] text-[10px] opacity-40 bg-[var(--obsidian)] px-1">
        #{String(index + 1).padStart(3, "0")}
      </span>
      <div className="flex items-baseline justify-between gap-3 mb-2">
        <span className="font-[JetBrains_Mono] text-[11px]" style={{ color: `hsl(${hue} 70% 70%)` }}>
          @{post.handle}
        </span>
        <span className="font-[JetBrains_Mono] text-[10px] opacity-40">{timeAgo(post.created_at)}</span>
      </div>
      <p
        className={`whitespace-pre-wrap break-words ${
          long ? "font-[Instrument_Serif] italic text-xl leading-snug" : "font-[Space_Grotesk] text-sm leading-relaxed"
        }`}
      >
        {post.body}
      </p>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {REACT_EMOJIS.map((e) => {
          const count = post.reactions?.[e] ?? 0;
          return (
            <button
              key={e}
              onClick={() => onReact(post.id, e)}
              className="inline-flex items-center gap-1 border border-white/10 hover:border-white/40 px-2 py-1 text-xs"
              aria-label={`Reagir ${e} (${count})`}
              disabled={!myClientId}
            >
              <span className="leading-none">{e}</span>
              {count > 0 && (
                <span className="font-[JetBrains_Mono] text-[10px] opacity-70">{count}</span>
              )}
            </button>
          );
        })}
      </div>
    </li>
  );
}
