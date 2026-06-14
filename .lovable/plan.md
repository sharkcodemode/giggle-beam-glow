## Diagnóstico

O painel renderiza dentro do `chrome.sidePanel` (largura típica **320–500px**, redimensionável pelo usuário). O bundle atual foi construído mirando viewport desktop — daí o aspecto "sequelado":

1. **Containers com `max-w-3xl`/`max-w-5xl` + `mx-auto`** ficam OK em largura, mas o **padding lateral** (`px-6`/`px-10`) come 60–80px de 360px → conteúdo espremido.
2. **Headers em `flex` com botões + título longo** sem `min-w-0` / `truncate` → texto vaza ou empurra widgets pra fora.
3. **Grids `grid-cols-2/3`** virados em larguras < 480px sem `sm:` guard → cards minúsculos.
4. **Console flutuante / ticker / marquee** (Obsidian Aurora) com `text-5xl/serif` italic gigante → quebra de linha agressiva.
5. **Viewport meta OK**, mas falta lock de `min-width` no `html, body` e `overflow-x:hidden` global → scroll horizontal indesejado.
6. **manifest.json** não declara nenhuma dica de largura preferida (Chrome respeita só o último resize do usuário, mas conseguimos forçar boa experiência via CSS).

## Plano (15 passos, ~20–30 min)

### Fase 1 — Recriar workspace de build
1. `cp -r /dev-server/<projeto-original> /tmp/elite-build` (precisa do source — perdemos `/tmp` da sessão anterior; o source original veio do zip do usuário, vou re-extrair `joy-kindler-spark-main.zip` se ainda disponível, senão pedir reupload).

### Fase 2 — CSS de compactação para side panel
2. Criar `src/styles/sidepanel.css` (importado **por último** em `src/styles.css`):
   ```css
   html, body, #root { min-width: 0; overflow-x: hidden; }
   /* container queries — ativa modo compacto < 520px */
   @media (max-width: 520px) {
     :root { --sp-pad: 12px; }
     .container, [class*="max-w-"] { max-width: 100% !important; padding-inline: var(--sp-pad) !important; }
     h1, .font-serif { font-size: clamp(1.5rem, 7vw, 2.25rem) !important; line-height: 1.05 !important; }
     .text-5xl, .text-6xl, .text-7xl { font-size: clamp(1.75rem, 9vw, 2.5rem) !important; }
     .grid-cols-2, .grid-cols-3, .grid-cols-4 { grid-template-columns: 1fr !important; }
     .gap-6, .gap-8, .gap-10 { gap: 12px !important; }
     .px-6, .px-8, .px-10 { padding-inline: var(--sp-pad) !important; }
     .py-10, .py-12, .py-16 { padding-block: 24px !important; }
     /* ticker/marquee não quebra largura */
     .marquee-track { will-change: transform; }
   }
   /* trava texto longo em headers sem min-w-0 */
   header [class*="flex"] > * { min-width: 0; }
   header h1, header h2 { overflow-wrap: anywhere; }
   ```
3. Garantir que `styles.css` faz `@import "./styles/sidepanel.css";` **depois** dos tokens (cascata vence).

### Fase 3 — Ajustes pontuais nas rotas críticas
4. `src/routes/__root.tsx`: wrapper raiz vira `<div className="min-h-dvh w-full max-w-full overflow-x-hidden">`.
5. `src/routes/index.tsx`: header principal — promover `flex flex-wrap` → `grid grid-cols-[minmax(0,1fr)_auto]` (padrão do `responsive-layout-patterns`), adicionar `truncate` no H1 serif.
6. `src/routes/login.tsx`: card central `max-w-sm` + `px-4`, evitar `max-w-md` que ainda passa do sidepanel.
7. Componentes com console/calculadora flutuante: `position:fixed` → trocar por `sticky bottom-2` dentro do fluxo, senão tampa conteúdo no sidepanel.

### Fase 4 — Manifest e SW
8. `manifest.json`: adicionar `"side_panel": { "default_path": "index.html" }` (já está) + nada mais — Chrome MV3 **não aceita** `min_width/max_width` no side_panel; a defesa é toda no CSS.
9. Opcional: registrar comando `Ctrl+Shift+E` para abrir popup window 800×900 como **fallback "modo amplo"** (usuário pode escolher).

### Fase 5 — Build + QA visual
10. `bun install && bun run build` → `dist-extension/`.
11. Substituir `extension/dist/` no zip atual.
12. **QA com Playwright/puppeteer headless**: abrir `dist/index.html` em viewports **360×600**, **400×800**, **520×900**, **1200×900**; screenshot de cada rota (`/`, `/login`, `/audios`); inspecionar overflow horizontal e clipping de texto.
13. Iterar CSS até zero overflow-x e zero clipping em 360px.
14. Re-zipar `extension/` → `elite-for-lovable-v2.1.0.zip` em `/mnt/documents/`.
15. Bump `manifest.version` → `2.1.0`, `version_name` → `2.1.0 — sidepanel fit`.

## Arquivos afetados
- **novo**: `src/styles/sidepanel.css`
- **edit**: `src/styles.css`, `src/routes/__root.tsx`, `src/routes/index.tsx`, `src/routes/login.tsx`, `extension/manifest.json`
- **regenerado**: `extension/dist/*`, zip final

## Critérios de aceite
- 360×600 (sidepanel mínimo Chrome): **zero scroll horizontal**, todos os botões clicáveis, headers não cortam.
- 400×800 (sidepanel default): layout fluido, tipografia legível ≥ 14px no corpo.
- 1200×900 (modo popup amplo / dev): **layout original Obsidian Aurora preservado** — sem regressão visual.
- a11y mantido (contraste, focus rings).
- TypeScript strict, build limpo.

## Riscos & mitigações
- **CSS override pode vazar pro modo amplo** → uso de `@media (max-width: 520px)` isola; tokens base intactos.
- **Source perdido em `/tmp`** → preciso confirmar se ainda tenho o `joy-kindler-spark-main.zip` mountado ou se você reanexa. Se reanexar, +2 min; sem ele, paro aqui.

## Próximo passo
Confirma que sigo? E me diz: **o zip-fonte (`joy-kindler-spark-main.zip`) ainda está disponível pra eu remontar o source, ou preciso que reanexe?**
