(() => {
  if (globalThis.__ACTO_CHECKPOINT_BRIDGE__) return;
  globalThis.__ACTO_CHECKPOINT_BRIDGE__ = true;

  const BUTTON_ATTR = "data-acto-checkpoint-button";
  const MODAL_ID = "acto-checkpoint-modal";
  const STYLE_ID = "acto-checkpoint-style";

  // Rótulos originais do botão "Começar do Zero" em todos os idiomas suportados
  // (mantemos para detecção mesmo se o i18n bridge ainda não trocou)
  const ORIGINAL_LABELS = new Set(
    [
      "Começar do Zero",
      "Start from Scratch",
      "Начать с нуля",
      "Empezar de cero",
      "从零开始",
      "ゼロから開始",
      "처음부터 시작",
      "शुरू से शुरू करें",
      "Repartir de zero",
      "Von vorne beginnen",
      "ابدأ من الصفر",
      // novo rótulo já traduzido (caso i18n troque antes de marcarmos)
      "Criar Checkpoint",
      "Create Checkpoint",
      "Создать чекпоинт",
      "Crear punto de control",
      "创建检查点",
      "チェックポイント作成",
      "체크포인트 생성",
      "चेकपॉइंट बनाएं",
      "Créer un point de contrôle",
      "Checkpoint erstellen",
      "إنشاء نقطة تفتيش",
    ].map((s) => normalize(s)),
  );

  function normalize(value) {
    return String(value || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/\s+/g, " ")
      .trim()
      .toLowerCase();
  }

  function getButtonTextNode(button) {
    return Array.from(button.childNodes).find(
      (n) => n.nodeType === Node.TEXT_NODE && n.textContent && n.textContent.trim().length > 0,
    );
  }

  const CLOCK_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false" style="width:18px;height:18px;display:block;flex:0 0 auto;"><circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 15.5 14"/></svg>`;
  const TOOLTIP_LABEL = "Criar Checkpoint TIER-S";
  const TOOLTIP_ID = "acto-checkpoint-tooltip";

  // procura um botão-irmão no mesmo container da dock pra clonar className/tamanho
  function findSiblingDockButton(button) {
    const parent = button.parentElement;
    if (!parent) return null;
    const siblings = Array.from(parent.children).filter(
      (el) =>
        el !== button &&
        el instanceof HTMLButtonElement &&
        el.querySelector("svg") &&
        !el.hasAttribute(BUTTON_ATTR),
    );
    return siblings[0] || null;
  }

  function setButtonLabel(button) {
    const sibling = findSiblingDockButton(button);
    button.textContent = "";
    let svgSize = 18;
    if (sibling) {
      button.className = sibling.className;
      const rect = sibling.getBoundingClientRect();
      if (rect.width && rect.height) {
        button.style.width = `${Math.round(rect.width)}px`;
        button.style.height = `${Math.round(rect.height)}px`;
      }
      const sSvg = sibling.querySelector("svg");
      if (sSvg) {
        const sRect = sSvg.getBoundingClientRect();
        if (sRect.width >= 10) svgSize = Math.round(sRect.width);
      }
    } else {
      button.style.width = "32px";
      button.style.height = "32px";
      button.style.padding = "0";
      button.style.display = "inline-flex";
      button.style.alignItems = "center";
      button.style.justifyContent = "center";
      button.style.flex = "0 0 auto";
    }
    const svg = CLOCK_SVG.replace(
      'style="width:18px;height:18px;display:block;flex:0 0 auto;"',
      `style="width:${svgSize}px;height:${svgSize}px;display:block;flex:0 0 auto;"`,
    );
    button.insertAdjacentHTML("afterbegin", svg);
    button.setAttribute(BUTTON_ATTR, "1");
    button.setAttribute("aria-label", TOOLTIP_LABEL);
    button.removeAttribute("title");
    attachTooltip(button);
  }

  // ---------- TOOLTIP CUSTOM ----------

  function ensureTooltipStyle() {
    if (document.getElementById("acto-cp-tooltip-style")) return;
    const css = document.createElement("style");
    css.id = "acto-cp-tooltip-style";
    css.textContent = `
      #${TOOLTIP_ID}{position:fixed;z-index:2147483647;pointer-events:none;padding:6px 10px;border-radius:6px;background:#0b1220;border:1px solid rgba(96,165,250,.45);color:#dbeafe;font:600 11px/1.2 ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,sans-serif;white-space:nowrap;box-shadow:0 8px 24px rgba(0,0,0,.5);opacity:0;transform:translateY(4px);transition:opacity .12s,transform .12s;}
      #${TOOLTIP_ID}[data-show="1"]{opacity:1;transform:translateY(0);}
    `;
    document.documentElement.appendChild(css);
  }

  function getTooltipEl() {
    ensureTooltipStyle();
    let el = document.getElementById(TOOLTIP_ID);
    if (!el) {
      el = document.createElement("div");
      el.id = TOOLTIP_ID;
      el.setAttribute("role", "tooltip");
      document.documentElement.appendChild(el);
    }
    return el;
  }

  function showTooltip(button) {
    const el = getTooltipEl();
    el.textContent = TOOLTIP_LABEL;
    const r = button.getBoundingClientRect();
    el.style.left = "0px";
    el.style.top = "0px";
    el.setAttribute("data-show", "1");
    const tr = el.getBoundingClientRect();
    let left = r.left + r.width / 2 - tr.width / 2;
    let top = r.bottom + 8;
    left = Math.max(6, Math.min(left, window.innerWidth - tr.width - 6));
    if (top + tr.height > window.innerHeight - 6) top = r.top - tr.height - 8;
    el.style.left = `${Math.round(left)}px`;
    el.style.top = `${Math.round(top)}px`;
  }

  function hideTooltip() {
    const el = document.getElementById(TOOLTIP_ID);
    if (el) el.removeAttribute("data-show");
  }

  function attachTooltip(button) {
    if (button.__actoCpTip) return;
    button.__actoCpTip = true;
    button.addEventListener("mouseenter", () => showTooltip(button));
    button.addEventListener("mouseleave", hideTooltip);
    button.addEventListener("focus", () => showTooltip(button));
    button.addEventListener("blur", hideTooltip);
    button.addEventListener("click", hideTooltip);
  }

  function isTargetButton(button) {
    if (!(button instanceof HTMLButtonElement)) return false;
    if (button.hasAttribute(BUTTON_ATTR)) return false;
    // pula botões dentro do nosso modal
    if (button.closest(`#${MODAL_ID}`)) return false;
    const node = getButtonTextNode(button);
    const label = normalize(node?.textContent || button.textContent);
    return ORIGINAL_LABELS.has(label);
  }

  function relabelAll() {
    document.querySelectorAll("button").forEach((b) => {
      if (isTargetButton(b)) setButtonLabel(b);
    });
  }

  // ---------- MODAL ----------

  function ensureStyle() {
    if (document.getElementById(STYLE_ID)) return;
    const css = document.createElement("style");
    css.id = STYLE_ID;
    css.textContent = `
      #${MODAL_ID}{position:fixed;inset:0;z-index:2147483646;display:flex;align-items:center;justify-content:center;background:rgba(2,6,23,.78);backdrop-filter:blur(6px);font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,sans-serif;color:#dbeafe;}
      #${MODAL_ID} *{box-sizing:border-box;}
      #${MODAL_ID} .acto-cp-card{width:min(360px,calc(100vw - 32px));max-height:calc(100vh - 32px);overflow:auto;background:#0b1220;border:1px solid rgba(96,165,250,.42);border-radius:10px;padding:16px;box-shadow:0 24px 60px rgba(0,0,0,.55);}
      #${MODAL_ID} h2{font:800 12px/1.2 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;letter-spacing:.08em;text-transform:uppercase;color:#93c5fd;margin:0 0 4px;}
      #${MODAL_ID} p.acto-cp-sub{font:500 10px/1.4 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;color:#94a3b8;margin:0 0 14px;}
      #${MODAL_ID} label{display:block;font:700 9px/1 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;letter-spacing:.1em;text-transform:uppercase;color:#93c5fd;margin:10px 0 4px;}
      #${MODAL_ID} input{width:100%;height:32px;padding:0 10px;background:rgba(2,6,23,.7);border:1px solid rgba(96,165,250,.25);border-radius:6px;color:#e2e8f0;font:600 12px/1 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;outline:none;transition:border-color .15s;}
      #${MODAL_ID} input:focus{border-color:rgba(147,197,253,.85);}
      #${MODAL_ID} input[readonly]{opacity:.7;cursor:not-allowed;}
      #${MODAL_ID} .acto-cp-row{display:flex;gap:8px;}
      #${MODAL_ID} .acto-cp-row > div{flex:1;}
      #${MODAL_ID} .acto-cp-actions{display:flex;gap:8px;margin-top:16px;}
      #${MODAL_ID} button{flex:1;height:34px;border-radius:6px;border:1px solid transparent;font:800 10px/1 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;letter-spacing:.08em;text-transform:uppercase;cursor:pointer;transition:filter .15s,background .15s,border-color .15s;}
      #${MODAL_ID} button.acto-cp-cancel{background:rgba(15,23,42,.9);border-color:rgba(148,163,184,.35);color:#cbd5e1;}
      #${MODAL_ID} button.acto-cp-cancel:hover{filter:brightness(1.15);}
      #${MODAL_ID} button.acto-cp-confirm{background:linear-gradient(135deg,#2563eb,#7c3aed);color:#fff;border-color:rgba(147,197,253,.5);}
      #${MODAL_ID} button.acto-cp-confirm:hover{filter:brightness(1.1);}
      #${MODAL_ID} button.acto-cp-confirm:disabled{opacity:.5;cursor:wait;}
      #${MODAL_ID} .acto-cp-error{margin-top:10px;font:600 10px/1.3 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;color:#fca5a5;}
      #${MODAL_ID} .acto-cp-ok{margin-top:10px;font:600 10px/1.3 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;color:#86efac;}
    `;
    document.documentElement.appendChild(css);
  }

  function formatLocal(d) {
    const pad = (n) => String(n).padStart(2, "0");
    return {
      date: `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`,
      time: `${pad(d.getHours())}:${pad(d.getMinutes())}`,
      iso: d.toISOString(),
    };
  }

  function slugify(s) {
    return String(s || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "checkpoint";
  }

  function buildPrompt({ name, dateLocal, timeLocal, iso }) {
    const slug = slugify(name);
    const ymd = iso.slice(0, 10);
    return `[CHECKPOINT TIER S]

Nome: ${name}
Data local: ${dateLocal}
Hora local: ${timeLocal}
Timestamp UTC: ${iso}
Slug: ${slug}

Crie um ponto de restauração TIER-S deste projeto no estado exato em que ele está agora. Execute os 4 passos abaixo em ordem e me devolva o resultado de cada um:

1) ESTADO BRUTO — capture e registre: git rev-parse HEAD, git rev-parse --abbrev-ref HEAD, git status --short, git log -1 --pretty="%H %ci %s", sha256sum package.json, sha256sum bun.lockb (se existir), timestamp UTC ISO 8601.

2) SCHEMA DO BANCO — liste todas as tabelas do schema public (nome, colunas, tipos, nullable, defaults), todas as policies RLS, todas as functions SECURITY DEFINER e todas as migrations aplicadas em ordem cronológica.

3) ARQUIVO DE CHECKPOINT — crie na raiz do projeto o arquivo \`RESTORE-POINT-${slug}-${ymd}.md\` preenchido com TODOS os dados reais coletados acima:
   - Nome, data local (${dateLocal}), hora local (${timeLocal}), timestamp UTC (${iso})
   - Commit hash + branch + status (clean/dirty)
   - Hashes SHA-256 do package.json e bun.lockb
   - Stack completa (framework, libs principais com versões)
   - Schema completo do banco (passo 2)
   - Lista de rotas ativas (src/routes/)
   - Lista de edge functions ativas (supabase/functions/)
   - Lista de secrets configurados — APENAS nomes, NUNCA valores
   - Riscos conhecidos e TODOs em aberto

4) PROTEÇÃO EXTRA — crie a branch git dedicada \`checkpoint/${slug}\` apontando para o commit atual.

Não pule passos. Não invente dados — registre apenas o que conseguir capturar de fato. Se algum comando falhar, registre a falha explicitamente no arquivo. No final, me confirme o caminho do arquivo criado e o hash do commit ancorado.`;
  }

  // ---------- INJETAR PROMPT NO CHAT DO PAINEL ----------

  function findChatTextarea() {
    const list = Array.from(document.querySelectorAll("textarea"));
    // 1) por classe canônica do chat
    const byClass = list.find((t) => {
      const c = t.className || "";
      return c.includes("font-mono") && c.includes("min-h-[160px]");
    });
    if (byClass) return byClass;
    // 2) por placeholder
    const byPh = list.find((t) => /think|prompt/i.test(t.placeholder || ""));
    if (byPh) return byPh;
    // 3) fallback: maior textarea visível
    return (
      list
        .filter((t) => t.offsetParent !== null)
        .sort((a, b) => b.clientHeight - a.clientHeight)[0] || null
    );
  }

  function setReactValue(el, value) {
    const proto = el instanceof HTMLTextAreaElement
      ? HTMLTextAreaElement.prototype
      : HTMLInputElement.prototype;
    const setter = Object.getOwnPropertyDescriptor(proto, "value")?.set;
    if (setter) setter.call(el, value);
    else el.value = value;
    el.dispatchEvent(new Event("input", { bubbles: true }));
    el.dispatchEvent(new Event("change", { bubbles: true }));
  }

  function dispatchEnter(el) {
    const init = {
      key: "Enter",
      code: "Enter",
      keyCode: 13,
      which: 13,
      bubbles: true,
      cancelable: true,
    };
    el.dispatchEvent(new KeyboardEvent("keydown", init));
    el.dispatchEvent(new KeyboardEvent("keypress", init));
    el.dispatchEvent(new KeyboardEvent("keyup", init));
  }

  async function sendPromptThroughPanel(prompt) {
    const ta = findChatTextarea();
    if (!ta) throw new Error("Chat indisponível no painel.");
    ta.focus();
    setReactValue(ta, prompt);
    // pequena espera pro React reconciliar antes do Enter
    await new Promise((r) => setTimeout(r, 60));
    dispatchEnter(ta);
  }

  // ---------- MODAL UI ----------

  function closeModal() {
    document.getElementById(MODAL_ID)?.remove();
  }

  function openModal() {
    if (document.getElementById(MODAL_ID)) return;
    ensureStyle();

    const now = new Date();
    const fmt = formatLocal(now);

    const overlay = document.createElement("div");
    overlay.id = MODAL_ID;
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");
    overlay.setAttribute("aria-label", "Criar Checkpoint TIER-S");

    overlay.innerHTML = `
      <div class="acto-cp-card">
        <h2>Criar Checkpoint TIER-S</h2>
        <p class="acto-cp-sub">Gera ponto de restauração com git + schema + arquivo auditável.</p>

        <label for="acto-cp-name">Nome do checkpoint</label>
        <input id="acto-cp-name" type="text" maxlength="60" autocomplete="off" placeholder="ex: PONTO DE OURO" />

        <div class="acto-cp-row">
          <div>
            <label for="acto-cp-date">Data</label>
            <input id="acto-cp-date" type="text" readonly value="${fmt.date}" />
          </div>
          <div>
            <label for="acto-cp-time">Hora</label>
            <input id="acto-cp-time" type="text" readonly value="${fmt.time}" />
          </div>
        </div>

        <div class="acto-cp-actions">
          <button type="button" class="acto-cp-cancel">Cancelar</button>
          <button type="button" class="acto-cp-confirm">Criar Checkpoint</button>
        </div>

        <div class="acto-cp-error" hidden></div>
        <div class="acto-cp-ok" hidden></div>
      </div>
    `;

    document.documentElement.appendChild(overlay);

    const nameEl = overlay.querySelector("#acto-cp-name");
    const cancelEl = overlay.querySelector(".acto-cp-cancel");
    const confirmEl = overlay.querySelector(".acto-cp-confirm");
    const errEl = overlay.querySelector(".acto-cp-error");
    const okEl = overlay.querySelector(".acto-cp-ok");

    setTimeout(() => nameEl?.focus(), 50);

    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) closeModal();
    });

    document.addEventListener(
      "keydown",
      function escListener(e) {
        if (e.key === "Escape") {
          closeModal();
          document.removeEventListener("keydown", escListener, true);
        }
      },
      true,
    );

    cancelEl.addEventListener("click", closeModal);

    nameEl.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        confirmEl.click();
      }
    });

    confirmEl.addEventListener("click", async () => {
      errEl.hidden = true;
      okEl.hidden = true;
      const name = String(nameEl.value || "").trim();
      if (!name) {
        errEl.textContent = "Informe um nome para o checkpoint.";
        errEl.hidden = false;
        nameEl.focus();
        return;
      }
      const now2 = new Date();
      const fmt2 = formatLocal(now2);
      const prompt = buildPrompt({
        name,
        dateLocal: fmt2.date,
        timeLocal: fmt2.time,
        iso: fmt2.iso,
      });
      confirmEl.disabled = true;
      cancelEl.disabled = true;
      confirmEl.textContent = "Enviando...";
      try {
        await sendPromptThroughPanel(prompt);
        okEl.textContent = "Checkpoint enviado ao chat.";
        okEl.hidden = false;
        setTimeout(closeModal, 700);
      } catch (err) {
        errEl.textContent = err?.message || "Falha ao enviar o checkpoint.";
        errEl.hidden = false;
        confirmEl.disabled = false;
        cancelEl.disabled = false;
        confirmEl.textContent = "Criar Checkpoint";
      }
    });
  }

  // ---------- WIRING ----------

  // intercepta clique no botão antes do handler React original
  document.addEventListener(
    "click",
    (event) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const button = target.closest(`[${BUTTON_ATTR}]`);
      if (!button) return;
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      openModal();
    },
    true,
  );

  const obs = new MutationObserver(() => relabelAll());
  function boot() {
    relabelAll();
    obs.observe(document.documentElement, {
      childList: true,
      subtree: true,
      characterData: true,
    });
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot, { once: true });
  } else {
    boot();
  }

  globalThis.actoOpenCheckpoint = openModal;
})();
