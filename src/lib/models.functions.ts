import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { ALL_MODEL_IDS, DEFAULT_CHAIN } from "./models.catalog";

// Server fns gated por passcode (`ACTO_MASTER_SECRET`) — sem auth de usuário.
// Leitura é pública; gravação exige passcode válido contra o segredo da edge.
// Fala REST diretamente com Supabase via SERVICE_ROLE_KEY (server-only).

const MAX_FALLBACKS = 8;

const ModelIdSchema = z
  .string()
  .min(3)
  .max(120)
  .regex(/^[a-z0-9._-]+\/[a-z0-9._-]+$/, "model id deve ter formato provider/model")
  .refine((v) => ALL_MODEL_IDS.has(v), "modelo não está no catálogo");

const SetConfigInputSchema = z.object({
  passcode: z.string().min(1).max(512),
  primary_model: ModelIdSchema,
  fallback_models: z.array(ModelIdSchema).max(MAX_FALLBACKS),
});

interface ConfigRow {
  primary_model: string;
  fallback_models: string[];
  updated_at: string;
}

function getSupabaseEnv(): { url: string; key: string } {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("Supabase server env ausente (SUPABASE_URL/SERVICE_ROLE_KEY).");
  }
  return { url, key };
}

async function fetchConfig(): Promise<ConfigRow> {
  const { url, key } = getSupabaseEnv();
  const res = await fetch(
    `${url}/rest/v1/acto_model_config?id=eq.global&select=primary_model,fallback_models,updated_at`,
    {
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        Accept: "application/json",
      },
    },
  );
  if (!res.ok) {
    throw new Error(`Falha ao ler config (${res.status})`);
  }
  const rows = (await res.json()) as ConfigRow[];
  const row = rows[0];
  if (!row) {
    return {
      primary_model: DEFAULT_CHAIN[0],
      fallback_models: [...DEFAULT_CHAIN.slice(1)],
      updated_at: new Date(0).toISOString(),
    };
  }
  return row;
}

export const getModelConfig = createServerFn({ method: "GET" }).handler(async () => {
  const row = await fetchConfig();
  return {
    primary_model: row.primary_model,
    fallback_models: Array.isArray(row.fallback_models) ? row.fallback_models : [],
    updated_at: row.updated_at,
  };
});

export const setModelConfig = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => SetConfigInputSchema.parse(input))
  .handler(async ({ data }) => {
    const expected = process.env.ACTO_MASTER_SECRET;
    if (!expected) {
      throw new Error("ACTO_MASTER_SECRET não configurado no servidor.");
    }
    // Comparação simples (passcode curto, server-side, sem timing-attack relevante).
    if (data.passcode !== expected) {
      throw new Error("Passcode inválido.");
    }

    // Deduplica fallbacks e remove o primário caso esteja na lista.
    const seen = new Set<string>([data.primary_model]);
    const fallbacks: string[] = [];
    for (const m of data.fallback_models) {
      if (!seen.has(m)) {
        seen.add(m);
        fallbacks.push(m);
      }
    }

    const { url, key } = getSupabaseEnv();
    const res = await fetch(`${url}/rest/v1/acto_model_config?id=eq.global`, {
      method: "PATCH",
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
        Prefer: "return=representation",
      },
      body: JSON.stringify({
        primary_model: data.primary_model,
        fallback_models: fallbacks,
      }),
    });

    if (!res.ok) {
      const txt = await res.text();
      throw new Error(`Falha ao gravar config (${res.status}): ${txt.slice(0, 200)}`);
    }

    const rows = (await res.json()) as ConfigRow[];
    const row = rows[0];
    return {
      primary_model: row?.primary_model ?? data.primary_model,
      fallback_models: row?.fallback_models ?? fallbacks,
      updated_at: row?.updated_at ?? new Date().toISOString(),
    };
  });
