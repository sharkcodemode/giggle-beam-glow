// ACTO Plan Capture v8 — detecta cards de plano da Lovable, injeta botão
// "📋 Carregar na ACTO" que: captura o texto do plano, clica Negar nativo,
// copia pro clipboard e envia ao side panel para colar no textarea.
(() => {
  if (window.__ACTO_PLAN_CAPTURE_V8__) return;
  window.__ACTO_PLAN_CAPTURE_V8__ = true;

  const INJECTED_ATTR = "data-acto-plan-btn-v8";
  const CARD_MARK_ATTR = "data-acto-plan-card-v8";
  const BTN_ID_PREFIX = "acto-plan-load-";
  const TOAST_ID = "acto-plan-toast-v8";

  const APPROVE_RX = /^(approve|aprovar|implement|implementar|apply|aplicar)$/i;
  const REJECT_RX  = /^(reject|negar|deny|decline|cancel|cancelar|dismiss)$/i;

  function txt(el) { return (el?.innerText || el?.textContent || "").trim(); }

  function findButtons(root) {
    return Array.from(root.querySelectorAll('button, [role="button"]'));
  }

  // Acha cards que tenham SIMULTANEAMENTE um botão aprovar e um negar.
  function findPlanCards() {
    const buttons = findButtons(document);
    const approveBtns = buttons.filter((b) => APPROVE_RX.test(txt(b)));
    const cards = [];
    for (const ap of approveBtns) {
      // sobe até achar um container que tenha também o botão negar
      let node = ap.parentElement;
      let depth = 0;
      while (node && depth < 8) {
        const rejectBtn = findButtons(node).find((b) => REJECT_RX.test(txt(b)));
        if (rejectBtn && rejectBtn !== ap) {
          cards.push({ card: node, approveBtn: ap, rejectBtn });
          break;
        }
        node = node.parentElement;
        depth += 1;
      }
    }
    return cards;
  }

  function extractPlanText(card) {
    // pega innerText preservando quebras; remove labels dos botões
    let raw = card.innerText || "";
    raw = raw.replace(/^(Approve|Aprovar|Implement|Implementar|Apply|Aplicar)\s*$/gim, "");
    raw = raw.replace(/^(Reject|Negar|Deny|Decline|Cancel|Cancelar|Dismiss)\s*$/gim, "");
    return raw.replace(/\n{3,}/g, "\n\n").trim();
  }

  function showToast(message, kind = "ok") {
    document.getElementById(TOAST_ID)?.remove();
    const el = document.createElement("div");
    el.id = TOAST_ID;
    el.textContent = message;
    el.style.cssText = `
      position:fixed;z-index:2147483647;left:50%;bottom:24px;transform:translateX(-50%);
      padding:12px 18px;border-radius:12px;font:600 13px/1.3 ui-sans-serif,system-ui,sans-serif;
      color:#f8fbff;background:${kind === "err" ? "rgba(120,20,20,.95)" : "rgba(2,10,31,.95)"};
      border:1px solid ${kind === "err" ? "rgba(239,68,68,.4)" : "rgba(96,165,250,.35)"};
      box-shadow:0 12px 32px rgba(0,0,0,.45);max-width:min(560px,92vw);text-align:center;
      backdrop-filter:blur(10px);
    `;
    document.documentElement.appendChild(el);
    setTimeout(() => el.remove(), 4200);
  }

  async function copyToClipboard(text) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      try {
        const ta = document.createElement("textarea");
        ta.value = text;
        ta.style.cssText = "position:fixed;opacity:0;left:-9999px;";
        document.body.appendChild(ta);
        ta.select();
        const ok = document.execCommand("copy");
        ta.remove();
        return ok;
      } catch { return false; }
    }
  }

  function notifyPanel(planText) {
    try {
      chrome.runtime?.sendMessage({
        type: "ACTO_LOAD_PLAN",
        payload: { text: planText, ts: Date.now(), origin: window.location.href },
      });
    } catch {}
    try {
      chrome.storage?.local?.set({
        acto_last_plan: { text: planText, ts: Date.now() },
      });
    } catch {}
  }

  async function handleLoad(cardInfo) {
    const { card, rejectBtn } = cardInfo;
    const planText = extractPlanText(card);
    if (!planText || planText.length < 20) {
      showToast("Plano não detectado (texto muito curto).", "err");
      return;
    }

    const copied = await copyToClipboard(planText);
    notifyPanel(planText);

    // clica Negar nativo após copiar — não consome créditos
    try { rejectBtn.click(); } catch {}

    showToast(
      copied
        ? "Plano copiado + negado. Cole na ACTO (Ctrl+V) e envie."
        : "Plano enviado ao painel ACTO. Abra a extensão.",
      "ok",
    );
  }

  function buildLoadButton(cardInfo, idx) {
    const btn = document.createElement("button");
    btn.id = `${BTN_ID_PREFIX}${idx}`;
    btn.type = "button";
    btn.setAttribute(INJECTED_ATTR, "1");
    btn.textContent = "📋 Carregar na ACTO";
    btn.title = "Captura o plano, nega o nativo (0 créditos) e cola no painel ACTO";
    btn.style.cssText = `
      display:inline-flex;align-items:center;gap:6px;
      padding:8px 14px;margin:6px 6px 6px 0;
      border-radius:10px;cursor:pointer;
      font:700 12px/1 ui-sans-serif,system-ui,sans-serif;letter-spacing:.02em;
      color:#0a0f1e;background:linear-gradient(135deg,#7dd3fc,#a78bfa);
      border:1px solid rgba(255,255,255,.25);
      box-shadow:0 6px 18px rgba(124,58,237,.35);
      transition:transform .15s ease, box-shadow .15s ease;
    `;
    btn.addEventListener("mouseenter", () => {
      btn.style.transform = "translateY(-1px)";
      btn.style.boxShadow = "0 10px 24px rgba(124,58,237,.5)";
    });
    btn.addEventListener("mouseleave", () => {
      btn.style.transform = "";
      btn.style.boxShadow = "0 6px 18px rgba(124,58,237,.35)";
    });
    btn.addEventListener("click", (ev) => {
      ev.preventDefault();
      ev.stopPropagation();
      handleLoad(cardInfo);
    });
    return btn;
  }

  function injectIntoCards() {
    const cards = findPlanCards();
    cards.forEach((info, idx) => {
      if (info.card.getAttribute(CARD_MARK_ATTR) === "1") return;
      // injeta o botão ao lado do botão Aprovar
      const parent = info.approveBtn.parentElement;
      if (!parent) return;
      const loadBtn = buildLoadButton(info, idx);
      try {
        parent.insertBefore(loadBtn, info.approveBtn);
      } catch {
        parent.appendChild(loadBtn);
      }
      info.card.setAttribute(CARD_MARK_ATTR, "1");
    });
  }

  let scanTimer = 0;
  function scheduleScan() {
    if (scanTimer) return;
    scanTimer = window.setTimeout(() => {
      scanTimer = 0;
      try { injectIntoCards(); } catch {}
    }, 250);
  }

  const observer = new MutationObserver(scheduleScan);
  observer.observe(document.documentElement, { childList: true, subtree: true });

  // varreduras iniciais (Lovable renderiza assíncrono)
  [200, 600, 1200, 2400, 4800].forEach((t) => setTimeout(injectIntoCards, t));
})();
