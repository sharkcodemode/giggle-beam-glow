# RESTORE POINT — ponto ouro 09 jun 2026

> Ponto de restauração TIER-S. Não editar manualmente.

## Identificação
- **Nome**: ponto ouro 09 jun 2026
- **Slug**: ponto-ouro-09-jun-2026
- **Data local**: 09/06/2026
- **Hora local**: 18:23
- **Timestamp UTC**: 2026-06-09T21:23:22.749Z

## Estado Git
- **Commit HEAD**: `3b14f6c5119973fe28018728648d3a1ce4e937b8`
- **Branch atual**: `edit/edt-90cd846a-771c-4a46-9c1c-c0b0393587af`
- **Branch de checkpoint criada**: `checkpoint/ponto-ouro-09-jun-2026` → `3b14f6c5119973fe28018728648d3a1ce4e937b8`
- **Último commit**: `3b14f6c5119973fe28018728648d3a1ce4e937b8 2026-06-09 19:52:40 +0000 Adicionou streaming ao preview`
- **Working tree**: clean (git status --short vazio)

## Integridade
- **package.json SHA-256**: `838f9f39099c32096ef8571bda8cc5433e9420ad7fab6dc7f155e858ad51dcee`
- **bun.lockb SHA-256**: N/A (arquivo não existe)
- **bun.lock SHA-256**: `469a34004d75efedc31a7207d3f23bb240201d424af7c1441cfbbb31046aac1a`

## Stack
- Framework: TanStack Start v1.167.50 + TanStack Router v1.168.25 + React 19.2 + Vite 7.3
- Styling: Tailwind v4.2.1 + tw-animate-css + Radix UI (suite completa)
- Backend: Lovable Cloud (Supabase) — `@supabase/supabase-js` 2.106.2
- Data: TanStack Query 5.83, react-hook-form 7.71, zod 3.24
- Edge runtime: Cloudflare Workers (`@cloudflare/vite-plugin` 1.25.5, nitro 3.0.260603-beta)
- Outras: react-markdown 10.1, recharts 2.15, embla-carousel, sonner, vaul, lucide-react 0.575, @gradio/client 2.2
- TS 5.8.3, ESLint 9.32, Prettier 3.7

## Schema do banco (public)

### Tabelas
- **acto_model_config**: id text PK default 'global', primary_model text NN default 'anthropic/claude-4.5-opus', fallback_models text[] NN, updated_at timestamptz NN default now()
- **pulse_messages**: id uuid PK default gen_random_uuid(), client_id text NN, handle text NN, color_hash int NN, body text NN, created_at timestamptz NN default now()
- **pulse_posts**: id uuid PK default gen_random_uuid(), body text NN, color_hash int NN, client_id text NN, handle text NN, reactions jsonb NN default '{}', created_at timestamptz NN default now()
- **pulse_rate_limits**: client_id text NN, action text NN, last_at timestamptz NN default now()
- **pulse_reactions**: post_id uuid NN, client_id text NN, emoji text NN, created_at timestamptz NN default now()
- **rag_chunks**: id uuid PK default gen_random_uuid(), document_id uuid NN, idx int NN, content text NN, embedding vector NN, created_at timestamptz NN default now()
- **rag_documents**: id uuid PK default gen_random_uuid(), title text NN, source text, embedding_model text NN, chunk_count int NN default 0, created_at/updated_at timestamptz NN default now()

### Policies RLS
- acto_model_config: `acto_model_config_public_read` SELECT public true
- pulse_messages: `pulse_messages_public_read` SELECT public; `pulse_messages_public_insert` INSERT public (validação tamanho + sem URLs)
- pulse_posts: `pulse_posts_public_read` SELECT public; `pulse_posts_public_insert` INSERT public (idem)
- pulse_reactions: `pulse_reactions_public_read` SELECT public
- rag_chunks: `rag_chunks_public_read` SELECT public
- rag_documents: `rag_documents_public_read` SELECT public

### Functions SECURITY DEFINER (public)
- `pulse_check_rate_limit(client_id, action, interval_seconds)` — controle de rate por client
- `pulse_toggle_reaction(post_id, client_id, emoji)` — toggle e recálculo de contadores

(Demais funções públicas são do extension `vector` — não SECURITY DEFINER.)

### Migrations aplicadas (ordem cronológica)
1. 20260531162753_ba7ad74a-24a9-4809-b41b-4d69ad30db6f.sql
2. 20260531220425_6a975a9f-0c60-49a6-bb5d-a4487fc076b7.sql
3. 20260531220441_1ea1b915-150f-4ef1-ac53-2ef0333e6f19.sql
4. 20260606072744_197f6af6-a7cf-4c73-a3f5-989fa1ecefde.sql
5. 20260606161003_7e1ce539-5508-4f26-aafb-441475c2fec1.sql
6. 20260606161028_6a812e93-f14f-4d9c-938f-af1eef06f5ef.sql

## Rotas ativas (src/routes/)
- `__root.tsx` (layout raiz)
- `index.tsx` (/)
- `audios.tsx` (/audios)
- `chatmodelos.tsx` (/chatmodelos)
- `claude.tsx` (/claude)
- `modelos.tsx` (/modelos)
- `pulse.tsx` (/pulse)
- `radar-lovable.tsx` (/radar-lovable)
- `ragmodelos.tsx` (/ragmodelos)
- `voice.tsx` (/voice)
- `api/public/_secret-check.ts` (rota server pública)

## Edge functions ativas (supabase/functions/)
- `acto-tier-s` (verify_jwt = false) — chat tier-S via AI Gateway
- `acto-v2-gateway`
- `claude-proxy` (verify_jwt = false)
- `fetch-lovable-x-news`
- `secret-check` (verify_jwt = false)
- `validate-license` (verify_jwt = false)
- `_shared/` (cors.ts, model-chain.ts)

## Secrets configurados (apenas nomes)
- SUPABASE_SERVICE_ROLE_KEY
- SUPABASE_SECRET_KEYS
- SUPABASE_JWKS
- SUPABASE_PUBLISHABLE_KEY
- SUPABASE_PUBLISHABLE_KEYS
- SUPABASE_ANON_KEY
- SUPABASE_URL
- SUPABASE_DB_URL
- LOVABLE_API_KEY
- ACTO_APPS_SCRIPT_URL
- ACTO_MASTER_SECRET

## Riscos conhecidos e TODOs em aberto
- **PENDENTE (plano aprovado, NÃO aplicado neste checkpoint)**: mover lógica "fix_error/fastmode/tool_decision/integration_metadata" da extensão (`extracted_extension/background.js`) para dentro de `acto-tier-s` via `action: "fix_relay"`, deixando a extensão como cliente burro (só envia token + IDs). Tuning de lag: passthrough SSE puro no Deno (sem `await response.text()`), remoção de setTimeouts artificiais no leitor da extensão.
- `acto-tier-s` ganhará 2 responsabilidades (chat + fix relay) → isolar em `handleFixRelay()` separada.
- Quota Supabase free compartilhada chat + fix; se virar gargalo, considerar Pro.
- `pulse_rate_limits` sem RLS habilitado explicitamente (uso interno via SECURITY DEFINER).
- `bun.lockb` não existe — projeto usa `bun.lock` (formato novo). Hash desse arquivo registrado acima.

## Como restaurar

### Via Lovable
Pedir no chat: "restaurar projeto para o commit `3b14f6c`".

### Via git (fora do Lovable)
```bash
git checkout 3b14f6c5119973fe28018728648d3a1ce4e937b8
# ou usar a branch ancorada:
git checkout checkpoint/ponto-ouro-09-jun-2026
bun install
```

### Validação pós-restauração
```bash
sha256sum package.json  # deve bater com 838f9f39099c32096ef8571bda8cc5433e9420ad7fab6dc7f155e858ad51dcee
sha256sum bun.lock      # deve bater com 469a34004d75efedc31a7207d3f23bb240201d424af7c1441cfbbb31046aac1a
```

## Avisos
- `node_modules` não é versionado.
- Migrations aplicadas APÓS este ponto permanecem no banco — restauração de código ≠ restauração de schema.
- Secrets em Lovable Cloud não fazem parte deste checkpoint.
