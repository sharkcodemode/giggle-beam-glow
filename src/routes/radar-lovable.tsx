import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  RefreshCcw,
  ExternalLink,
  Search,
  ArrowUpRight,
  Clock,
  TrendingUp,
  MessageSquare,
  Heart,
  Repeat,
  Share2,
  AlertCircle,
  BadgeCheck,
  LayoutDashboard,
  Radio,
  ArrowLeft,
  X,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/radar-lovable")({
  head: () => ({
    meta: [
      { title: "Radar Lovable — Monitor da comunidade Lovable.dev" },
      {
        name: "description",
        content:
          "Acompanhe em tempo real novidades, bugs, atualizações e discussões sobre Lovable.dev.",
      },
      { property: "og:title", content: "Radar Lovable" },
      {
        property: "og:description",
        content: "Monitor em tempo real da comunidade Lovable.dev.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://actobredge.lovable.app/radar-lovable" },
    ],
    links: [{ rel: "canonical", href: "https://actobredge.lovable.app/radar-lovable" }],
  }),
  component: RadarLovablePage,
});

type Post = {
  id: string;
  author_name: string;
  username: string;
  text: string;
  category: string;
  likes: number;
  reposts: number;
  replies: number;
  views?: number;
  created_at: string;
};

type RadarResponse = {
  ok: boolean;
  source: string;
  mock?: boolean;
  message?: string;
  updated_at: string;
  items: Post[];
};

type SortMode = "recent" | "relevant" | "likes";

const SORT_LABEL: Record<SortMode, string> = {
  recent: "Mais recentes",
  relevant: "Mais relevantes",
  likes: "Mais curtidos",
};

const ALL = "Todos";

const dateFmt = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "short",
});
const timeFmt = new Intl.DateTimeFormat("pt-BR", {
  hour: "2-digit",
  minute: "2-digit",
});
const numFmt = new Intl.NumberFormat("pt-BR");

function relevanceScore(p: Post) {
  return p.likes + p.reposts * 2 + p.replies * 1.5 + (p.views ?? 0) * 0.01;
}

function RadarLovablePage() {
  const [data, setData] = useState<RadarResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [filter, setFilter] = useState<string>(ALL);
  const [sortBy, setSortBy] = useState<SortMode>("recent");

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search.trim().toLowerCase()), 180);
    return () => clearTimeout(t);
  }, [search]);

  const fetchNews = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: response, error: err } = await supabase.functions.invoke(
        "fetch-lovable-x-news",
      );
      if (err) throw err;
      setData(response as RadarResponse);
      toast.success("Radar atualizado.");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Falha desconhecida";
      console.error(e);
      setError(msg);
      toast.error("Não foi possível atualizar o radar.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNews();
  }, [fetchNews]);

  // Derive categories from data (avoid stale hardcoded list)
  const categories = useMemo(() => {
    const counts = new Map<string, number>();
    (data?.items ?? []).forEach((i) =>
      counts.set(i.category, (counts.get(i.category) ?? 0) + 1),
    );
    const list = Array.from(counts.entries()).sort((a, b) => b[1] - a[1]);
    return [
      { name: ALL, count: data?.items.length ?? 0 },
      ...list.map(([name, count]) => ({ name, count })),
    ];
  }, [data]);

  const filteredItems = useMemo(() => {
    if (!data?.items) return [] as Post[];
    let items = data.items;
    if (filter !== ALL) items = items.filter((i) => i.category === filter);
    if (debounced) {
      items = items.filter(
        (i) =>
          i.text.toLowerCase().includes(debounced) ||
          i.author_name.toLowerCase().includes(debounced) ||
          i.username.toLowerCase().includes(debounced),
      );
    }
    const sorted = [...items];
    sorted.sort((a, b) => {
      if (sortBy === "recent")
        return +new Date(b.created_at) - +new Date(a.created_at);
      if (sortBy === "likes") return b.likes - a.likes;
      return relevanceScore(b) - relevanceScore(a);
    });
    return sorted;
  }, [data, filter, debounced, sortBy]);

  const stats = useMemo(() => {
    const items = data?.items ?? [];
    const count = items.length;
    const engagement = items.reduce(
      (acc, i) => acc + i.likes + i.reposts + i.replies,
      0,
    );
    const catCounts = new Map<string, number>();
    items.forEach((i) =>
      catCounts.set(i.category, (catCounts.get(i.category) ?? 0) + 1),
    );
    const topCategory =
      Array.from(catCounts.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] ??
      "—";
    return { count, engagement, topCategory };
  }, [data]);

  const highlightPost = useMemo(() => {
    if (filter !== ALL || debounced) return null;
    if (filteredItems.length === 0) return null;
    return [...filteredItems].sort(
      (a, b) => b.likes + b.reposts - (a.likes + a.reposts),
    )[0];
  }, [filteredItems, filter, debounced]);

  const restItems = useMemo(
    () =>
      highlightPost
        ? filteredItems.filter((i) => i.id !== highlightPost.id)
        : filteredItems,
    [filteredItems, highlightPost],
  );

  const copyLink = useCallback((id: string) => {
    navigator.clipboard
      .writeText(`https://x.com/i/status/${id}`)
      .then(() => toast.success("Link copiado."))
      .catch(() => toast.error("Não foi possível copiar."));
  }, []);

  const resetFilters = () => {
    setFilter(ALL);
    setSearch("");
    setSortBy("recent");
  };

  const filtersActive = filter !== ALL || debounced !== "" || sortBy !== "recent";

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-obsidian text-bone selection:bg-aurora-mint/40 selection:text-obsidian">
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 z-0 overflow-hidden opacity-30 motion-reduce:opacity-20"
      >
        <div className="absolute top-[-10%] right-[-10%] h-[60vh] w-[60vh] rounded-full bg-aurora-cyan/20 blur-[120px]" />
        <div className="absolute bottom-[-10%] left-[-10%] h-[50vh] w-[50vh] rounded-full bg-aurora-violet/10 blur-[120px]" />
      </div>
      <div aria-hidden className="grain pointer-events-none fixed inset-0 z-0 opacity-50" />

      <div className="relative z-10 mx-auto max-w-[1400px] px-6 py-12">
        {/* Header */}
        <header className="mb-12 flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
          <div className="space-y-3">
            <Link
              to="/"
              className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.3em] text-white/40 transition-colors hover:text-aurora-mint"
            >
              <ArrowLeft className="h-3 w-3" /> Voltar
            </Link>
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-aurora text-obsidian">
                <Radio className="h-5 w-5" />
              </div>
              <h1 className="font-display text-4xl font-normal tracking-tight md:text-5xl">
                Radar <span className="italic text-aurora">Lovable</span>
              </h1>
            </div>
            <p className="max-w-2xl font-grotesk text-sm leading-relaxed text-white/50">
              Acompanhe em tempo real novidades, tendências, bugs, atualizações e
              discussões públicas sobre Lovable.dev.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button
              onClick={fetchNews}
              disabled={loading}
              className="conic-border rounded-full bg-obsidian-2 px-6 py-6 text-[13px] font-medium text-white hover:bg-obsidian-2/80"
            >
              <RefreshCcw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              {loading ? "Atualizando…" : "Atualizar"}
            </Button>
            <Button
              variant="outline"
              onClick={() => window.open("https://lovable.dev", "_blank", "noopener,noreferrer")}
              className="rounded-full border-white/10 bg-transparent px-6 py-6 text-[13px] font-medium text-white hover:bg-white/5"
            >
              Lovable.dev
              <ExternalLink className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </header>

        {/* Stats */}
        <section className="mb-12 grid grid-cols-2 gap-4 md:grid-cols-4" aria-label="Estatísticas">
          <StatCard title="Posts" value={numFmt.format(stats.count)} icon={LayoutDashboard} />
          <StatCard title="Top categoria" value={stats.topCategory} icon={TrendingUp} accent />
          <StatCard title="Engajamento" value={numFmt.format(stats.engagement)} icon={Heart} />
          <StatCard
            title="Atualizado"
            value={data?.updated_at ? timeFmt.format(new Date(data.updated_at)) : "—"}
            icon={Clock}
          />
        </section>

        {data?.mock && (
          <div
            role="status"
            className="mb-8 flex items-center gap-3 rounded-2xl border border-aurora-mint/20 bg-aurora-mint/5 p-4 text-sm text-aurora-mint/90 backdrop-blur-md"
          >
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>
              {data.message ??
                "API do X ainda não configurada. Exibindo notícias demonstrativas."}
            </span>
          </div>
        )}

        {error && !loading && (
          <div
            role="alert"
            className="mb-8 flex items-center justify-between gap-3 rounded-2xl border border-red-500/30 bg-red-500/5 p-4 text-sm text-red-200"
          >
            <span className="flex items-center gap-3">
              <AlertCircle className="h-4 w-4" />
              Erro ao carregar: {error}
            </span>
            <Button size="sm" variant="outline" onClick={fetchNews} className="border-red-500/30 text-red-200">
              Tentar novamente
            </Button>
          </div>
        )}

        {/* Filters */}
        <section className="mb-10 space-y-6" aria-label="Filtros">
          <div
            className="flex items-center gap-2 overflow-x-auto pb-2 [&::-webkit-scrollbar]:hidden"
            style={{ scrollbarWidth: "none" }}
          >
            {categories.map((cat) => {
              const active = filter === cat.name;
              return (
                <button
                  key={cat.name}
                  onClick={() => setFilter(cat.name)}
                  aria-pressed={active}
                  className={`group flex shrink-0 items-center gap-2 whitespace-nowrap rounded-full px-5 py-2 text-[12px] font-medium transition-all ${
                    active
                      ? "bg-aurora text-obsidian shadow-[0_0_20px_rgba(180,255,230,0.3)]"
                      : "border border-white/5 bg-white/[0.03] text-white/50 hover:bg-white/[0.08] hover:text-white"
                  }`}
                >
                  {cat.name}
                  <span
                    className={`rounded-full px-1.5 py-0.5 text-[10px] tabular-nums ${
                      active ? "bg-obsidian/20 text-obsidian" : "bg-white/5 text-white/40"
                    }`}
                  >
                    {cat.count}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="flex flex-col gap-4 md:flex-row">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
              <input
                type="search"
                aria-label="Buscar posts"
                placeholder="Buscar por palavra-chave, autor ou assunto…"
                className="w-full rounded-2xl border border-white/5 bg-white/[0.03] py-4 pl-12 pr-12 font-grotesk text-[14px] text-white placeholder:text-white/20 focus:border-aurora-mint/40 focus:outline-none focus:ring-2 focus:ring-aurora-mint/20"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              {search && (
                <button
                  onClick={() => setSearch("")}
                  aria-label="Limpar busca"
                  className="absolute right-3 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-full bg-white/5 text-white/50 hover:bg-white/10 hover:text-white"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
            <select
              aria-label="Ordenar por"
              className="rounded-2xl border border-white/5 bg-obsidian-2 px-6 py-4 font-grotesk text-[14px] text-white focus:border-aurora-mint/40 focus:outline-none md:w-52"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortMode)}
            >
              {(Object.keys(SORT_LABEL) as SortMode[]).map((k) => (
                <option key={k} value={k} className="bg-obsidian-2">
                  {SORT_LABEL[k]}
                </option>
              ))}
            </select>
          </div>

          {filtersActive && !loading && (
            <div className="flex items-center justify-between text-[11px] text-white/40">
              <span>
                {numFmt.format(filteredItems.length)} de {numFmt.format(stats.count)} posts
              </span>
              <button
                onClick={resetFilters}
                className="text-aurora-mint/80 underline-offset-4 hover:underline"
              >
                Limpar filtros
              </button>
            </div>
          )}
        </section>

        {/* Content */}
        {loading ? (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3" aria-busy="true">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="h-64 animate-pulse rounded-[28px] border border-white/5 bg-white/[0.02]"
              />
            ))}
          </div>
        ) : filteredItems.length > 0 ? (
          <div className="space-y-10">
            {highlightPost && (
              <div className="space-y-4">
                <h3 className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.3em] text-white/30">
                  <BadgeCheck className="h-3 w-3 text-aurora-mint" /> Destaque da Comunidade
                </h3>
                <PostCard post={highlightPost} highlight onCopy={copyLink} />
              </div>
            )}

            {restItems.length > 0 && (
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                {restItems.map((post) => (
                  <PostCard key={post.id} post={post} onCopy={copyLink} />
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-32 text-center">
            <div className="mb-6 grid h-20 w-20 place-items-center rounded-full border border-white/5 bg-white/[0.02]">
              <AlertCircle className="h-10 w-10 text-white/20" />
            </div>
            <h3 className="text-xl font-medium text-white/80">
              {filtersActive ? "Nenhum post bate com os filtros." : "Nenhuma notícia disponível."}
            </h3>
            <p className="mt-2 text-sm text-white/40">
              {filtersActive
                ? "Tente limpar os filtros ou refazer a busca."
                : "Tente atualizar novamente em alguns minutos."}
            </p>
            <Button
              onClick={filtersActive ? resetFilters : fetchNews}
              variant="outline"
              className="mt-8 rounded-full border-white/10 text-white"
            >
              {filtersActive ? "Limpar filtros" : "Atualizar"}
            </Button>
          </div>
        )}

        {/* Terms */}
        <section className="mt-24 border-t border-white/5 pt-12 pb-24 text-center">
          <h4 className="mb-6 font-mono text-[10px] uppercase tracking-[0.3em] text-white/30">
            Termos monitorados
          </h4>
          <div className="flex flex-wrap justify-center gap-3">
            {["Lovable.dev", "Lovable AI", "Vibe Coding", "AI Coding", "Supabase", "React", "Deploy", "Bug Fix", "Updates"].map(
              (term) => (
                <span
                  key={term}
                  className="rounded-full border border-white/5 bg-white/[0.02] px-4 py-1.5 text-[11px] text-white/40"
                >
                  {term}
                </span>
              ),
            )}
          </div>
          <footer className="mt-24 space-y-4">
            <p className="text-[11px] text-white/20">
              Notícias monitoradas a partir de publicações públicas sobre Lovable.dev.
            </p>
            <p className="text-[10px] text-white/10">
              Painel não oficial. Sem afiliação com a Lovable.
            </p>
          </footer>
        </section>
      </div>
    </div>
  );
}

function StatCard({
  title,
  value,
  icon: Icon,
  accent = false,
}: {
  title: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
  accent?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-5 backdrop-blur-md transition-colors hover:border-white/10">
      <div className="mb-3 flex items-center justify-between text-white/30">
        <span className="font-mono text-[9px] uppercase tracking-widest">{title}</span>
        <Icon className="h-4 w-4" />
      </div>
      <p
        className={`truncate text-2xl font-medium tracking-tight ${
          accent ? "text-aurora" : "text-white"
        }`}
        title={value}
      >
        {value}
      </p>
    </div>
  );
}

function PostCard({
  post,
  highlight = false,
  onCopy,
}: {
  post: Post;
  highlight?: boolean;
  onCopy: (id: string) => void;
}) {
  const created = new Date(post.created_at);
  return (
    <article
      className={`group relative flex flex-col overflow-hidden rounded-[28px] border transition-all duration-500 ${
        highlight
          ? "border-aurora-mint/20 bg-gradient-to-br from-aurora-mint/10 to-transparent p-8"
          : "border-white/5 bg-white/[0.02] p-6 hover:-translate-y-0.5 hover:border-aurora-mint/20 hover:bg-white/[0.04] motion-reduce:hover:transform-none"
      }`}
    >
      <header className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <img
            src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(post.username)}`}
            alt=""
            loading="lazy"
            className="h-10 w-10 shrink-0 rounded-full bg-white/10 ring-2 ring-white/5"
          />
          <div className="min-w-0">
            <h4 className="truncate text-[14px] font-medium leading-tight text-white transition-colors group-hover:text-aurora">
              {post.author_name}
            </h4>
            <p className="truncate text-[12px] text-white/30">@{post.username}</p>
          </div>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <span className="rounded-full bg-white/5 px-3 py-1 text-[10px] font-medium text-white/40">
            {post.category}
          </span>
          <time
            dateTime={post.created_at}
            className="font-mono text-[10px] text-white/20"
            title={created.toLocaleString("pt-BR")}
          >
            {dateFmt.format(created)}
          </time>
        </div>
      </header>

      <p
        className={`mt-6 flex-1 font-grotesk leading-relaxed text-white/80 ${
          highlight ? "text-lg md:text-xl" : "text-[15px]"
        }`}
      >
        {post.text}
      </p>

      <footer className="mt-8 flex items-center justify-between border-t border-white/5 pt-6">
        <div className="flex gap-5 text-[12px] tabular-nums text-white/40">
          <span className="flex items-center gap-1.5" aria-label={`${post.likes} curtidas`}>
            <Heart className="h-3.5 w-3.5" /> {numFmt.format(post.likes)}
          </span>
          <span className="flex items-center gap-1.5" aria-label={`${post.reposts} reposts`}>
            <Repeat className="h-3.5 w-3.5" /> {numFmt.format(post.reposts)}
          </span>
          <span className="flex items-center gap-1.5" aria-label={`${post.replies} respostas`}>
            <MessageSquare className="h-3.5 w-3.5" /> {numFmt.format(post.replies)}
          </span>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => onCopy(post.id)}
            aria-label="Copiar link"
            className="grid h-9 w-9 place-items-center rounded-full border border-white/5 bg-white/5 text-white/40 transition-all hover:bg-aurora hover:text-obsidian"
          >
            <Share2 className="h-4 w-4" />
          </button>
          <a
            href={`https://x.com/i/status/${post.id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 rounded-full border border-white/5 bg-white/5 px-4 py-2 text-[12px] text-white/40 transition-all hover:bg-white/10 hover:text-white"
          >
            Ver no X <ArrowUpRight className="h-3.5 w-3.5" />
          </a>
        </div>
      </footer>
    </article>
  );
}
