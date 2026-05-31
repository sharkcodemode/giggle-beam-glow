import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { 
  Terminal, 
  RefreshCcw, 
  ExternalLink, 
  Shield, 
  Search, 
  Filter, 
  ArrowUpRight, 
  Clock, 
  TrendingUp, 
  MessageSquare, 
  Heart, 
  Repeat, 
  Eye, 
  Share2, 
  AlertCircle, 
  BadgeCheck, 
  LayoutDashboard,
  Radio
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/radar-lovable")({
  component: RadarLovablePage,
});

// Mock categories for classification
const CATEGORIES = [
  "Todos", "Novidades", "Bugs", "Comunidade", "Atualizações", "Vibe Coding", "IA", "Discussões", "Deploy", "Supabase"
];

function RadarLovablePage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("Todos");
  const [sortBy, setSortBy] = useState("recent");

  const fetchNews = async () => {
    setLoading(true);
    try {
      const { data: response, error } = await supabase.functions.invoke("fetch-lovable-x-news");
      if (error) throw error;
      setData(response);
      toast.success("Radar atualizado com sucesso.");
    } catch (e) {
      console.error(e);
      toast.error("Não foi possível atualizar o radar agora.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNews();
  }, []);

  const filteredItems = useMemo(() => {
    if (!data?.items) return [];
    
    let items = [...data.items];

    // Filter by category
    if (filter !== "Todos") {
      items = items.filter(item => item.category === filter);
    }

    // Search
    if (search) {
      const s = search.toLowerCase();
      items = items.filter(item => 
        item.text.toLowerCase().includes(s) || 
        item.author_name.toLowerCase().includes(s) || 
        item.username.toLowerCase().includes(s)
      );
    }

    // Sort
    items.sort((a, b) => {
      if (sortBy === "recent") return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      if (sortBy === "likes") return b.likes - a.likes;
      if (sortBy === "relevant") {
        const scoreA = a.likes + a.reposts * 2 + a.replies * 1.5 + (a.views || 0) * 0.01;
        const scoreB = b.likes + b.reposts * 2 + b.replies * 1.5 + (b.views || 0) * 0.01;
        return scoreB - scoreA;
      }
      return 0;
    });

    return items;
  }, [data, filter, search, sortBy]);

  const stats = useMemo(() => {
    if (!data?.items) return { count: 0, engagement: 0, topCategory: "—" };
    const count = data.items.length;
    const engagement = data.items.reduce((acc: number, i: any) => acc + i.likes + i.reposts + i.replies, 0);
    
    const catCounts: any = {};
    data.items.forEach((i: any) => catCounts[i.category] = (catCounts[i.category] || 0) + 1);
    const topCategory = Object.entries(catCounts).sort((a: any, b: any) => b[1] - a[1])[0]?.[0] || "—";

    return { count, engagement, topCategory };
  }, [data]);

  const highlightPost = useMemo(() => {
    if (filteredItems.length === 0) return null;
    return [...filteredItems].sort((a, b) => (b.likes + b.reposts) - (a.likes + a.reposts))[0];
  }, [filteredItems]);

  const copyLink = (id: string) => {
    navigator.clipboard.writeText(`https://x.com/i/status/${id}`);
    toast.success("Link copiado!");
  };

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[var(--obsidian)] text-[var(--bone)] selection:bg-[var(--aurora-mint)]/40 selection:text-[var(--obsidian)]">
      {/* Background orbs */}
      <div aria-hidden className="pointer-events-none fixed inset-0 z-0 overflow-hidden opacity-30">
        <div className="absolute top-[-10%] right-[-10%] h-[60vh] w-[60vh] rounded-full bg-[var(--aurora-cyan)]/20 blur-[120px]" />
        <div className="absolute bottom-[-10%] left-[-10%] h-[50vh] w-[50vh] rounded-full bg-[var(--aurora-violet)]/10 blur-[120px]" />
      </div>
      <div aria-hidden className="grain pointer-events-none fixed inset-0 z-0 opacity-50" />

      <div className="relative z-10 mx-auto max-w-[1400px] px-6 py-12">
        {/* Header */}
        <header className="mb-12 flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-aurora text-[var(--obsidian)]">
                <Radio className="h-6 w-6" />
              </div>
              <h1 className="font-display text-4xl font-normal tracking-tight md:text-5xl">
                Radar <span className="italic text-aurora">Lovable</span>
              </h1>
            </div>
            <p className="max-w-2xl font-grotesk text-sm leading-relaxed text-white/50">
              Acompanhe em tempo real novidades, tendências, bugs, atualizações e discussões públicas sobre Lovable.dev.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button 
              onClick={fetchNews} 
              disabled={loading}
              className="conic-border rounded-full bg-[var(--obsidian-2)] px-6 py-6 text-[13px] font-medium text-white hover:bg-[var(--obsidian-2)]/80"
            >
              <RefreshCcw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Atualizar notícias
            </Button>
            <Button 
              variant="outline"
              onClick={() => window.open("https://lovable.dev", "_blank")}
              className="rounded-full border-white/10 bg-transparent px-6 py-6 text-[13px] font-medium text-white hover:bg-white/5"
            >
              Ver Lovable.dev
              <ExternalLink className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </header>

        {/* Stats Grid */}
        <section className="mb-12 grid grid-cols-2 gap-4 md:grid-cols-4">
          <StatCard title="Posts monitorados" value={stats.count.toString()} icon={LayoutDashboard} />
          <StatCard title="Mais comentado" value={stats.topCategory} icon={TrendingUp} color="text-aurora" />
          <StatCard title="Engajamento total" value={stats.engagement.toLocaleString()} icon={Heart} />
          <StatCard title="Última atualização" value={data?.updated_at ? new Date(data.updated_at).toLocaleTimeString() : "—"} icon={Clock} />
        </section>

        {/* Mock Warning */}
        {data?.mock && (
          <div className="mb-8 flex items-center gap-3 rounded-2xl border border-[var(--aurora-mint)]/20 bg-[var(--aurora-mint)]/5 p-4 text-sm text-[var(--aurora-mint)]/80 backdrop-blur-md">
            <AlertCircle className="h-4 w-4" />
            <span>API do X ainda não configurada. Exibindo notícias demonstrativas.</span>
          </div>
        )}

        {/* Filters & Search */}
        <section className="mb-10 space-y-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="no-scrollbar flex items-center gap-2 overflow-x-auto pb-2 md:pb-0">
              {CATEGORIES.map(cat => (
                <button
                  key={cat}
                  onClick={() => setFilter(cat)}
                  className={`whitespace-nowrap rounded-full px-5 py-2 text-[12px] font-medium transition-all ${
                    filter === cat 
                    ? "bg-aurora text-[var(--obsidian)] shadow-[0_0_20px_rgba(180,255,230,0.3)]" 
                    : "border border-white/5 bg-white/[0.03] text-white/50 hover:bg-white/[0.08] hover:text-white"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-4 md:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
              <input 
                type="text"
                placeholder="Buscar por palavra-chave, autor, hashtag ou assunto..."
                className="w-full rounded-2xl border border-white/5 bg-white/[0.03] py-4 pl-12 pr-4 font-grotesk text-[14px] text-white placeholder:text-white/20 focus:border-aurora/30 focus:outline-none focus:ring-0"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <select 
              className="rounded-2xl border border-white/5 bg-white/[0.03] px-6 py-4 font-grotesk text-[14px] text-white focus:outline-none md:w-48"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
            >
              <option value="recent">Mais recentes</option>
              <option value="relevant">Mais relevantes</option>
              <option value="likes">Mais curtidos</option>
            </select>
          </div>
        </section>

        {/* Content */}
        {loading ? (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[1,2,3,4,5,6].map(i => <div key={i} className="h-64 animate-pulse rounded-[28px] bg-white/[0.02] border border-white/5" />)}
          </div>
        ) : filteredItems.length > 0 ? (
          <div className="space-y-8">
            {/* Highlight */}
            {highlightPost && !search && filter === "Todos" && (
              <div className="space-y-4">
                <h3 className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.3em] text-white/30">
                  <BadgeCheck className="h-3 w-3 text-aurora" /> Destaque da Comunidade
                </h3>
                <PostCard post={highlightPost} highlight onCopy={copyLink} />
              </div>
            )}

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              {filteredItems.map(post => (
                <PostCard key={post.id} post={post} onCopy={copyLink} />
              ))}
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-32 text-center">
            <div className="mb-6 grid h-20 w-20 place-items-center rounded-full bg-white/[0.02] border border-white/5">
              <AlertCircle className="h-10 w-10 text-white/20" />
            </div>
            <h3 className="text-xl font-medium text-white/80">Nenhuma notícia encontrada no momento.</h3>
            <p className="mt-2 text-sm text-white/40">Tente atualizar novamente em alguns minutos.</p>
            <Button onClick={fetchNews} variant="outline" className="mt-8 rounded-full border-white/10 text-white">
              Atualizar novamente
            </Button>
          </div>
        )}

        {/* Terms */}
        <section className="mt-24 border-t border-white/5 pt-12 pb-24 text-center">
          <h4 className="mb-6 font-mono text-[10px] uppercase tracking-[0.3em] text-white/30">Termos monitorados</h4>
          <div className="flex flex-wrap justify-center gap-3">
            {["Lovable.dev", "Lovable AI", "Vibe Coding", "AI Coding", "Supabase", "React", "Deploy", "Bug Fix", "Updates"].map(term => (
              <span key={term} className="rounded-full border border-white/5 bg-white/[0.02] px-4 py-1.5 text-[11px] text-white/40">
                {term}
              </span>
            ))}
          </div>
          
          <footer className="mt-24 space-y-4">
            <p className="text-[11px] text-white/20">
              Notícias monitoradas automaticamente a partir de publicações públicas sobre Lovable.dev.
            </p>
            <p className="text-[10px] text-white/10">
              Este painel não é afiliado oficialmente à Lovable.
            </p>
          </footer>
        </section>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon: Icon, color = "text-white" }: any) {
  return (
    <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-5 backdrop-blur-md">
      <div className="mb-3 flex items-center justify-between text-white/30">
        <span className="font-mono text-[9px] uppercase tracking-widest">{title}</span>
        <Icon className="h-4 w-4" />
      </div>
      <p className={`text-2xl font-medium tracking-tight ${color}`}>{value}</p>
    </div>
  );
}

function PostCard({ post, highlight, onCopy }: any) {
  return (
    <div className={`group relative overflow-hidden rounded-[28px] border transition-all duration-500 ${
      highlight 
      ? "col-span-1 border-aurora/20 bg-gradient-to-br from-aurora/10 to-transparent lg:col-span-3 p-8" 
      : "border-white/5 bg-white/[0.02] hover:border-aurora/20 hover:bg-white/[0.04] p-6"
    }`}>
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 overflow-hidden rounded-full bg-white/10 ring-2 ring-white/5">
            <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${post.username}`} alt={post.author_name} />
          </div>
          <div>
            <h4 className="text-[14px] font-medium leading-tight text-white group-hover:text-aurora transition-colors">{post.author_name}</h4>
            <p className="text-[12px] text-white/30">@{post.username}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-white/5 px-3 py-1 text-[10px] font-medium text-white/40">{post.category}</span>
          <span className="text-[11px] text-white/20">{new Date(post.created_at).toLocaleDateString()}</span>
        </div>
      </div>

      <div className={`mt-6 font-grotesk leading-relaxed text-white/80 ${highlight ? 'text-lg md:text-xl' : 'text-[15px]'}`}>
        {post.text}
      </div>

      <div className="mt-8 flex items-center justify-between border-t border-white/5 pt-6">
        <div className="flex gap-6 text-[12px] text-white/40">
          <span className="flex items-center gap-1.5 hover:text-aurora transition-colors cursor-default"><Heart className="h-3.5 w-3.5" /> {post.likes}</span>
          <span className="flex items-center gap-1.5 hover:text-aurora transition-colors cursor-default"><Repeat className="h-3.5 w-3.5" /> {post.reposts}</span>
          <span className="flex items-center gap-1.5 hover:text-aurora transition-colors cursor-default"><MessageSquare className="h-3.5 w-3.5" /> {post.replies}</span>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={() => onCopy(post.id)}
            className="grid h-9 w-9 place-items-center rounded-full border border-white/5 bg-white/5 text-white/40 hover:bg-aurora hover:text-[var(--obsidian)] transition-all"
          >
            <Share2 className="h-4 w-4" />
          </button>
          <button 
            onClick={() => window.open(`https://x.com/i/status/${post.id}`, "_blank")}
            className="flex items-center gap-2 rounded-full border border-white/5 bg-white/5 px-4 py-2 text-[12px] text-white/40 hover:bg-white/10 hover:text-white transition-all"
          >
            Ver no X <ArrowUpRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
