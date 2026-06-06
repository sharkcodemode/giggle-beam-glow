// Lê a cadeia de modelos TIER S a partir da tabela `acto_model_config`
// (singleton id='global'). Cache em memória por 30s para não onerar a edge.
// Em caso de falha de leitura, devolve a cadeia hardcoded como fallback seguro.

const DEFAULT_CHAIN = [
  "anthropic/claude-4.5-opus",
  "anthropic/claude-4.5-sonnet",
  "openai/gpt-5.5-pro",
  "openai/gpt-5.5",
  "google/gemini-3.1-pro-preview",
  "google/gemini-2.5-pro",
] as const;

const CACHE_TTL_MS = 30_000;
let cached: { chain: string[]; loadedAt: number } | null = null;

interface ConfigRow {
  primary_model?: unknown;
  fallback_models?: unknown;
}

function normalize(row: ConfigRow | null | undefined): string[] {
  if (!row) return [...DEFAULT_CHAIN];
  const primary = typeof row.primary_model === "string" && row.primary_model.trim()
    ? row.primary_model.trim()
    : DEFAULT_CHAIN[0];
  const fallbacks = Array.isArray(row.fallback_models)
    ? row.fallback_models.filter((m): m is string => typeof m === "string" && m.trim().length > 0)
    : [];
  const seen = new Set<string>();
  const chain: string[] = [];
  for (const m of [primary, ...fallbacks]) {
    if (!seen.has(m)) {
      seen.add(m);
      chain.push(m);
    }
  }
  return chain.length > 0 ? chain : [...DEFAULT_CHAIN];
}

export async function loadModelChain(): Promise<string[]> {
  const now = Date.now();
  if (cached && now - cached.loadedAt < CACHE_TTL_MS) {
    return cached.chain;
  }

  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) {
    console.warn("[model-chain] SUPABASE_URL/SERVICE_ROLE_KEY ausentes — usando default.");
    const chain = [...DEFAULT_CHAIN];
    cached = { chain, loadedAt: now };
    return chain;
  }

  try {
    const res = await fetch(
      `${url}/rest/v1/acto_model_config?id=eq.global&select=primary_model,fallback_models`,
      {
        headers: {
          "apikey": key,
          "Authorization": `Bearer ${key}`,
          "Accept": "application/json",
        },
      },
    );
    if (!res.ok) {
      console.warn(`[model-chain] REST ${res.status} — usando default.`);
      const chain = [...DEFAULT_CHAIN];
      cached = { chain, loadedAt: now };
      return chain;
    }
    const rows = (await res.json()) as ConfigRow[];
    const chain = normalize(rows[0]);
    cached = { chain, loadedAt: now };
    console.log(`[model-chain] cadeia ativa (${chain.length}): ${chain.join(" → ")}`);
    return chain;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[model-chain] erro de leitura: ${msg} — usando default.`);
    const chain = [...DEFAULT_CHAIN];
    cached = { chain, loadedAt: now };
    return chain;
  }
}

export function invalidateModelChainCache(): void {
  cached = null;
}

export const DEFAULT_MODEL_CHAIN: readonly string[] = DEFAULT_CHAIN;
