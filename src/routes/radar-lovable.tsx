import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Terminal, RefreshCcw, ExternalLink, Shield } from "lucide-react";

export const Route = createFileRoute("/radar-lovable")({
  component: RadarLovablePage,
});

function RadarLovablePage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchNews = async () => {
    setLoading(true);
    try {
      const { data: response, error } = await supabase.functions.invoke("fetch-lovable-x-news");
      if (error) throw error;
      setData(response);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchNews(); }, []);

  return (
    <div className="min-h-screen bg-[var(--obsidian)] p-8 text-[var(--bone)]">
      <header className="mb-12 flex items-center justify-between border-b border-white/10 pb-8">
        <div>
          <h1 className="font-display text-5xl">Radar Lovable</h1>
          <p className="mt-2 text-white/55">Acompanhe tendências, bugs e atualizações sobre Lovable.dev.</p>
        </div>
        <div className="flex gap-4">
          <Button onClick={fetchNews} className="bg-aurora text-black"><RefreshCcw className="mr-2 h-4 w-4" /> Atualizar</Button>
          <Button variant="outline" onClick={() => window.open("https://lovable.dev", "_blank")}>Ver Lovable.dev <ExternalLink className="ml-2 h-4 w-4" /></Button>
        </div>
      </header>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1,2,3,4,5,6].map(i => <div key={i} className="h-64 rounded-xl bg-white/5 animate-pulse" />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {data?.items?.map((item: any) => (
            <div key={item.id} className="rounded-xl border border-white/10 bg-white/5 p-6 hover:border-aurora/50 transition">
              <h3 className="font-bold text-aurora">{item.author_name} (@{item.username})</h3>
              <p className="mt-4">{item.text}</p>
              <div className="mt-6 text-sm text-white/40">❤️ {item.likes} | 🔁 {item.reposts}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
