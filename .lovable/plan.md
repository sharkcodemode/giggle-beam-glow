
# PLANO TIER-S — BLUEPRINT FORGE

## 1. Objetivo
Criar a rota **`/pulse`** (Obsidian Aurora) com duas zonas integradas em tempo real: **Live Chat** (stream contínuo de mensagens efêmeras) e **Mural de Posts** (postagens persistentes curtidas/comentadas). Suporte exclusivo a **texto + emoji** (sem upload de mídia), com identidade anônima auto-gerada por sessão, persistência em Supabase, broadcast via Realtime e estética coerente com `/audios` e home.

## 2. Diagnóstico do estado atual
- Projeto TanStack Start + Supabase (Lovable Cloud) ativo, sem tabelas no schema `public`.
- Sem autenticação implementada; usuários atuais são anônimos.
- Design system **OBSIDIAN AURORA** consolidado em `src/styles.css` (tokens `--obsidian`, `--bone`, `.text-aurora`, `.bg-aurora`, `.grain`, `.scanlines`, `.conic-border`, fontes Instrument Serif + Space Grotesk + JetBrains Mono).
- Rotas atuais: `/`, `/audios`, `/radar-lovable`, `/voice`. Nenhuma feature realtime publicada.
- Supabase Realtime disponível mas nenhuma tabela está em `supabase_realtime`.
- Home (`src/routes/index.tsx`) lista assets numerados; precisa receber asset #11 apontando para `/pulse`.

## 3. Decisões assumidas
1. **DECISÃO ASSUMIDA:** Identidade por *handle anônimo* gerado no client (`adjective-animal-####`) persistido em `localStorage` + cor aurora derivada por hash. | **MOTIVO:** Usuário pediu "qualquer usuário" sem login; evita fricção e mantém custo zero de auth.
2. **DECISÃO ASSUMIDA:** Chat = mensagens efêmeras (TTL 24h via cron) limitadas a 280 chars; Posts = persistentes, 500 chars, com contador de reações emoji. | **MOTIVO:** Separa cadência (stream vs mural) e controla custo de storage/realtime.
3. **DECISÃO ASSUMIDA:** Sanitização cliente + server: regex permite apenas Unicode (letras, números, pontuação, emoji) — bloqueia HTML/scripts. Validação Zod no `createServerFn`. | **MOTIVO:** Sem auth, superfície de XSS/spam é máxima; sanitização dupla é mandatória.
4. **DECISÃO ASSUMIDA:** Rate-limit por `client_id` (uuid em localStorage) — 1 msg/2s chat, 1 post/30s, 1 reação/1s — enforced via função SQL `check_rate_limit()` com tabela `rate_limits`. | **MOTIVO:** Anti-flood obrigatório em chat público anônimo.
5. **DECISÃO ASSUMIDA:** Realtime via `supabase.channel().on('postgres_changes')` para INSERTs em `pulse_messages` e `pulse_posts`; UPDATE em `pulse_posts` para contagem de reações. | **MOTIVO:** Padrão nativo Supabase, latência <300ms, sem servidor extra.
6. **DECISÃO ASSUMIDA:** RLS aberta para `SELECT` (público) + `INSERT` (anon) com WITH CHECK validando length/regex; `UPDATE/DELETE` negados ao anon (somente service_role via RPC). | **MOTIVO:** Postagens são públicas por design; integridade garantida por policies + triggers.
7. **DECISÃO ASSUMIDA:** Layout split-screen desktop (chat fixo à direita 380px, mural feed à esquerda) → stack vertical mobile (tabs Chat/Mural). | **MOTIVO:** Viewport atual do usuário é 360px; mobile-first obrigatório.

## 4. Estratégia de produto & design
- **Narrativa:** "PULSE — o batimento coletivo da Aurora". Ticker no topo com contagem ao vivo (`{n} almas online`, `{n} pulsos hoje`).
- **Chat (direita/tab 1):** Stream invertido (mais recente embaixo), bolhas minimalistas sem avatar, handle em mono + timestamp relativo, animação `floaty` na entrada, auto-scroll inteligente (pausa ao rolar pra cima).
- **Mural (esquerda/tab 2):** Cards broken-grid com número de post gigante em outline, autor em JetBrains Mono, texto em Instrument Serif para posts >120 chars (destaque editorial), barra de reações emoji (👁 🔥 💀 ✨ 🌀) com contadores aurora-gradient.
- **Composer:** Sticky bottom. Input + emoji picker nativo (`<button>` que injeta `🌀✨🔥💀👁⚡🩸🜂`) + toggle "Chat | Post". Contador de chars com borda conic quando >80%.
- **Estados:** Empty ("Seja o primeiro pulso"), Loading (skeleton aurora), Error (banner scanlines), Offline (badge "RECONECTANDO").
- **Microcopy:** "Transmitir", "Publicar no mural", "Reagir", "Silenciar canal" — todo em PT-BR, denso.

## 5. Estratégia técnica
- **Rota:** `src/routes/pulse.tsx` com `createFileRoute("/pulse")`, head() meta próprio.
- **DB:** 3 tabelas (`pulse_messages`, `pulse_posts`, `pulse_reactions`) + `rate_limits` + função `check_rate_limit()` + função `increment_reaction()` (SECURITY DEFINER, search_path fixo).
- **Realtime:** Habilitado em `pulse_messages` e `pulse_posts` via `ALTER PUBLICATION supabase_realtime ADD TABLE`.
- **Server fns:** `sendMessage`, `createPost`, `toggleReaction` em `src/lib/pulse.functions.ts` com validação Zod + rate-limit RPC.
- **Client hooks:** `usePulseChannel()` (subscribe + cleanup), `useAnonIdentity()` (handle + uuid persistente).
- **TanStack Query:** `pulseMessagesQueryOptions`, `pulsePostsQueryOptions` com `ensureQueryData` no loader; cache invalidado por eventos realtime via `queryClient.setQueryData` (otimista).
- **Sanitização:** Regex `/^[\p{L}\p{N}\p{P}\p{Z}\p{Emoji}\n]+$/u` no client + server; trim + collapse whitespace; rejeita URLs (`/https?:\/\//i`) para reduzir spam.

## 6. Arquivos afetados

| Arquivo | Ação | Responsabilidade |
|---|---|---|
| `supabase/migrations/<ts>_pulse.sql` | criar | Tabelas, RLS, GRANTs, funções, triggers, publication |
| `src/routes/pulse.tsx` | criar | UI completa, hooks, realtime, composer |
| `src/lib/pulse.functions.ts` | criar | `sendMessage`, `createPost`, `toggleReaction` (createServerFn + Zod) |
| `src/lib/pulse.schemas.ts` | criar | Schemas Zod compartilhados client/server |
| `src/lib/anon-identity.ts` | criar | Geração de handle + uuid + cor aurora por hash |
| `src/hooks/use-pulse-channel.ts` | criar | Subscribe Realtime + sync com QueryClient |
| `src/routes/index.tsx` | editar | Adicionar asset #11 "Pulse — Batimento Coletivo" |
| `src/styles.css` | editar (mínimo) | Adicionar utilitário `.bubble-aurora` e `.post-card` se necessário |

## 7. Plano de implementação por etapas

1. **Migration SQL** (independente)
   - Criar `pulse_messages` (id, client_id, handle, color_hash, body, created_at).
   - Criar `pulse_posts` (id, client_id, handle, color_hash, body, reactions jsonb default `{}`, created_at).
   - Criar `pulse_reactions` (post_id, client_id, emoji, created_at) com PK composta.
   - Criar `rate_limits` (client_id, action, last_at).
   - GRANTs: `SELECT, INSERT` para `anon` e `authenticated` nas 3 tabelas públicas; `ALL` para `service_role`.
   - RLS: SELECT público (`USING (true)`); INSERT com WITH CHECK validando `length(body) BETWEEN 1 AND 280` (chat) ou `500` (post) e `body ~ '^[[:print:][:space:]]+$'`.
   - Função `check_rate_limit(p_client_id text, p_action text, p_interval interval)` SECURITY DEFINER.
   - Função `increment_reaction(p_post_id uuid, p_client_id text, p_emoji text)` que faz upsert em `pulse_reactions` e recomputa contagens em `pulse_posts.reactions`.
   - Habilitar Realtime: `ALTER PUBLICATION supabase_realtime ADD TABLE pulse_messages, pulse_posts;` + `REPLICA IDENTITY FULL`.
   - Cron (pg_cron opcional) para TTL — registrado como tech-debt; v1 mantém tudo.
   - **Depende de:** aprovação do usuário (tool migration aguarda confirmação).

2. **Identidade anônima** (depende de nada)
   - `src/lib/anon-identity.ts`: `getClientId()` (uuid v4 em localStorage), `getHandle()` (lista adjetivo+animal+####), `getColorHash()` (hsl derivada por DJB2).

3. **Schemas + Server fns** (depende de #1)
   - `pulse.schemas.ts`: `messageSchema`, `postSchema`, `reactionSchema`.
   - `pulse.functions.ts`: 3 server fns chamando `supabaseAdmin` após validar rate_limit via RPC.

4. **Hook realtime** (depende de #1)
   - `use-pulse-channel.ts`: subscribe `postgres_changes` para INSERT/UPDATE; faz `queryClient.setQueryData` otimista; cleanup em unmount.

5. **Rota /pulse** (depende de #2, #3, #4)
   - Layout responsivo (split desktop / tabs mobile).
   - Composer com toggle Chat/Post + emoji quick-bar.
   - Chat stream com auto-scroll inteligente.
   - Mural com cards broken-grid + reações.
   - Estados empty/loading/error/offline.
   - Head meta próprio (title, description, og).
   - `errorComponent` + `notFoundComponent`.

6. **Home asset #11** (depende de #5)
   - Adicionar entrada em `ASSETS` apontando para `/pulse` com descrição editorial.

7. **QA final** (depende de tudo)
   - Rodar todos os Quality Gates (seção 9).

## 8. Detalhes práticos

- **Tokens reutilizados:** `--obsidian`, `--bone`, `--aurora-*`, `.text-aurora`, `.bg-aurora`, `.conic-border`, `.grain`, `.scanlines`, `.floaty`.
- **Tipografia:** handles + timestamps + contadores → JetBrains Mono. Posts longos → Instrument Serif italic. UI → Space Grotesk.
- **Cores de handle:** `hsl(${hash % 360} 70% 65%)` aplicado em handle e borda esquerda da bolha.
- **Emoji quick-bar:** `['🌀','✨','🔥','💀','👁','⚡','🩸','🜂']` — botões 32px com hover aurora.
- **Auto-scroll inteligente:** ref no container; se `scrollTop + clientHeight >= scrollHeight - 80` → scroll automático; senão exibe badge "↓ {n} novas".
- **Otimistic update:** ao enviar, append local imediato com `status: 'sending'`; realtime confirma e troca para `'sent'`; erro → `'failed'` com retry.
- **Copy real:**
  - Header: "PULSE — batimento coletivo da aurora"
  - Empty chat: "silêncio absoluto. transmita o primeiro pulso."
  - Empty mural: "o mural aguarda o primeiro manifesto."
  - Rate-limited: "respira. tenta de novo em {n}s."
  - Offline: "RECONECTANDO AO NÚCLEO"
- **Acessibilidade:** `role="log" aria-live="polite"` no chat; `aria-label` nos botões de reação com contagem; foco visível aurora; respeitar `prefers-reduced-motion` desabilitando `floaty`.

## 9. Critérios de aceite & QA

**Visual**
- [ ] Estética OBSIDIAN AURORA preservada (tokens, fontes, grain, scanlines).
- [ ] Layout split em ≥1024px, tabs em <1024px, sem overflow em 320px.
- [ ] Composer sticky não cobre última mensagem.

**Funcional**
- [ ] Enviar mensagem aparece em <500ms para outros clientes (testado em 2 abas).
- [ ] Publicar post aparece no mural em tempo real.
- [ ] Reagir incrementa contador e é idempotente por client_id+emoji.
- [ ] Rate-limit retorna mensagem clara ao usuário.
- [ ] Handle anônimo persiste entre reloads.

**Segurança**
- [ ] RLS bloqueia UPDATE/DELETE para anon (testar via SQL).
- [ ] Body com `<script>` é rejeitado client + server.
- [ ] URLs http(s) são rejeitadas.
- [ ] Funções SECURITY DEFINER têm `search_path = public` fixo.

**A11y**
- [ ] Navegação por teclado completa (Tab no composer, Enter envia, Shift+Enter quebra linha).
- [ ] `prefers-reduced-motion` desabilita animações.
- [ ] Contraste WCAG AA em bone sobre obsidian e em badges aurora.

**Performance**
- [ ] LCP <2500ms (mural carrega via `ensureQueryData`, sem waterfall).
- [ ] Realtime payload <2KB por evento.
- [ ] Sem re-render do feed inteiro a cada nova msg (key por id + memo).

**Responsivo**
- [ ] 320px / 768px / 1440px validados.

## 10. Riscos & mitigação

| Risco | Impacto | Mitigação |
|---|---|---|
| Spam/flood anônimo | Alto | Rate-limit por client_id em RPC + regex anti-URL + limite de chars |
| XSS via body | Crítico | Renderizar como texto puro (React escapa), sanitização Zod + CHECK SQL |
| Crescimento ilimitado de `pulse_messages` | Médio | TTL 24h (cron futura) + paginação (últimas 100) no fetch inicial |
| Realtime cap (Supabase free) | Médio | Throttle de subscribe + filtro por `created_at > now() - interval '1 hour'` |
| Identidade falsificável (anon) | Baixo | Aceito por design; documentar como "canal público sem identidade verificada" |
| Reações duplicadas/race | Médio | PK composta `(post_id, client_id, emoji)` + UPSERT idempotente |
| Mobile composer cobre conteúdo | Médio | `padding-bottom` dinâmico + `scroll-margin-bottom` na última mensagem |

## 11. Resultado esperado
Rota `/pulse` entregando experiência de chat global + mural público em tempo real, com identidade anônima persistente, latência <500ms, estética Obsidian Aurora coesa, segurança via RLS + rate-limit + sanitização dupla, e integração com home como asset #11. Pronta para escalar para presença (online count) e TTL automatizado em iterações futuras.
