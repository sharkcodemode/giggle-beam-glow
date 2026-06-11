import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

export const Route = createFileRoute("/elitelovable")({
  component: EliteLovable,
  head: () => ({
    meta: [
      { title: "ELITE LOVABLE · Prompt Refiner" },
      { name: "description", content: "Refinador TIER S de prompts Lovable via Gemini 2.5 Flash." },
    ],
  }),
});

const ENDPOINT_PATH = "/api/public/elite-prompt";

function EliteLovable() {
  const [raw, setRaw] = useState("");
  const [ctx, setCtx] = useState("");
  const [mode, setMode] = useState<"lovable" | "generic">("lovable");
  const [out, setOut] = useState("");
  const [loading, setLoading] = useState(false);

  async function refine() {
    if (!raw.trim()) return;
    setLoading(true);
    setOut("");
    try {
      const r = await fetch(ENDPOINT_PATH, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: raw, context: ctx || undefined, mode }),
      });
      const j = (await r.json()) as { improved?: string; message?: string; error?: string };
      if (!r.ok) throw new Error(j.message ?? j.error ?? `HTTP ${r.status}`);
      setOut(j.improved ?? "");
      toast.success("Prompt refinado");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha");
    } finally {
      setLoading(false);
    }
  }

  async function copy(s: string) {
    await navigator.clipboard.writeText(s);
    toast.success("Copiado");
  }

  const origin = typeof window !== "undefined" ? window.location.origin : "https://SEU-DOMINIO";
  const curl = `curl -X POST ${origin}${ENDPOINT_PATH} \\
  -H "Content-Type: application/json" \\
  -d '{"prompt":"crie um botão azul","mode":"lovable"}'`;

  const extSnippet = `// chamar do content-script / popup da extensão
const r = await fetch("${origin}${ENDPOINT_PATH}", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ prompt: rawPrompt, mode: "lovable" }),
});
const { improved } = await r.json();
// injeta improved no textarea do Lovable`;

  return (
    <main className="min-h-screen bg-obsidian text-bone px-6 py-10 max-w-4xl mx-auto space-y-8">
      <header className="space-y-2">
        <p className="font-mono text-xs tracking-[0.3em] text-aurora">◇ ELITE LOVABLE · TIER S</p>
        <h1 className="font-serif text-5xl italic leading-none">Prompt Refiner</h1>
        <p className="text-sm opacity-70 font-mono">
          Gemini 2.5 Flash · sua chave Google AI Studio · custo zero Lovable · CORS aberto p/ extensão.
        </p>
      </header>

      <section className="space-y-3">
        <label className="font-mono text-xs tracking-widest opacity-70">PROMPT CRU</label>
        <Textarea
          value={raw}
          onChange={(e) => setRaw(e.target.value)}
          rows={6}
          placeholder="cole o prompt bruto que vc ia mandar pro lovable"
          className="bg-black/40 border-white/10 font-mono text-sm"
        />

        <label className="font-mono text-xs tracking-widest opacity-70">CONTEXTO (opcional)</label>
        <Textarea
          value={ctx}
          onChange={(e) => setCtx(e.target.value)}
          rows={3}
          placeholder="stack, arquivo-alvo, restrições, etc."
          className="bg-black/40 border-white/10 font-mono text-sm"
        />

        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex border border-white/10 rounded overflow-hidden font-mono text-xs">
            {(["lovable", "generic"] as const).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`px-3 py-1.5 ${mode === m ? "bg-aurora text-black" : "opacity-60"}`}
              >
                {m}
              </button>
            ))}
          </div>
          <Button onClick={refine} disabled={loading || !raw.trim()}>
            {loading ? "refinando..." : "REFINAR"}
          </Button>
        </div>
      </section>

      {out && (
        <section className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="font-mono text-xs tracking-widest opacity-70">PROMPT REFINADO</label>
            <Button size="sm" variant="ghost" onClick={() => copy(out)}>
              copiar
            </Button>
          </div>
          <pre className="whitespace-pre-wrap bg-black/60 border border-white/10 p-4 rounded text-sm font-mono">
            {out}
          </pre>
        </section>
      )}

      <section className="space-y-3 pt-6 border-t border-white/10">
        <h2 className="font-serif text-2xl italic">Integração extensão</h2>
        <p className="text-xs opacity-60 font-mono">
          Endpoint público, sem auth, CORS *. Funciona de qualquer origin (chrome-extension://, http://localhost, etc).
        </p>

        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="font-mono text-xs opacity-60">cURL</span>
            <Button size="sm" variant="ghost" onClick={() => copy(curl)}>copiar</Button>
          </div>
          <pre className="bg-black/60 border border-white/10 p-3 rounded text-xs font-mono overflow-x-auto">{curl}</pre>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="font-mono text-xs opacity-60">JS (extensão)</span>
            <Button size="sm" variant="ghost" onClick={() => copy(extSnippet)}>copiar</Button>
          </div>
          <pre className="bg-black/60 border border-white/10 p-3 rounded text-xs font-mono overflow-x-auto">{extSnippet}</pre>
        </div>

        <p className="text-xs opacity-60 font-mono">
          ⚠️ host_permissions no manifest.json:{" "}
          <code className="text-aurora">"{origin}/*"</code>
        </p>
      </section>
    </main>
  );
}
