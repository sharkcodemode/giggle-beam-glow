// ACTO Plan Capture v9 — detecta cards de plano da Lovable de forma robusta,
// injeta botão "📋 Carregar na ACTO" ao lado do Approve. Captura o texto,
// clica Negar nativo (custo 0) e envia ao side panel ACTO.
(() => {
  if (window.__ACTO_PLAN_CAPTURE_V9__) return;
  window.__ACTO_PLAN_CAPTURE_V9__ = true;

  const INJECTED_ATTR = "data-acto-plan-btn-v9";
  const TOAST_ID = "acto-plan-toast-v9";

  // substring match (não mais exato) — Lovable usa "Approve plan", "Reject", etc.
  const APPROVE_RX = /(approve|aprovar|implement|implementar|apply\b|aplicar|accept|aceitar)/i;
  const REJECT_RX  = /(reject|negar|deny|decline|cancel|cancelar|dismiss|discard|descartar)/i;

  // marca botões já processados via WeakSet (sobrevive re-renders sem lixo)
  const injectedForApprove = new WeakSet();

  function btnText(b) {
    return (
      b?.innerText ||
      b?.textContent ||
      b?.getAttribute?.("aria-label") ||
      b?.getAttribute?.("title") ||
      ""
    ).trim();
  }

  function findButtons(root) {
    return Array.from(root.querySelectorAll('button, [role="button"]'));
  }

  function isApprove(b) {
    const t = btnText(b);
    return APPROVE_RX.test(t) && !REJECT_RX.test(t);
  }
  function isReject(b) {
    const t = btnText(b);
    return REJECT_RX.test(t) && !APPROVE_RX.test(t);
  }

  function findPlanPairs() {
    const buttons = findButtons(document);
    const approveBtns = buttons.filter(isApprove);
    const pairs = [];
    for (const ap of approveBtns) {
      if (injectedForApprove.has(ap)) continue;
      if (!ap.isConnected) continue;
      // sobe até 10 níveis procurando um botão Negar irmão/parent
      let node = ap.parentElement;
      let depth = 0;
      let rejectBtn = null;
      let card = null;
      while (node && depth < 10) {
        const candidates = findButtons(node);
        rejectBtn = candidates.find((b) => b !== ap && isReject(b));
        if (rejectBtn) { card = node; break; }
        node = node.parentElement;
        depth += 1;
      }
      if (rejectBtn && card) pairs.push({ approveBtn: ap, rejectBtn, card });
    }
    return pairs;
  }

  function extractPlanText(card) {
    let raw = card.innerText || card.textContent || "";
    // remove labels dos próprios botões para não poluir o plano
    raw = raw
      .replace(/^\s*(Approve|Aprovar|Implement|Implementar|Apply|Aplicar|Accept|Aceitar)(\s+plan|\s+plano)?\s*$/gim, "")
      .replace(/^\s*(Reject|Negar|Deny|Decline|Cancel|Cancelar|Dismiss|Discard|Descartar)\s*$/gim, "")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
    return raw;
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
    try { await navigator.clipboard.writeText(text); return true; }
    catch {
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
        payload: { text: planText, ts: Date.now(), origin: location.href },
      });
    } catch {}
    try {
      chrome.storage?.local?.set({ acto_last_plan: { text: planText, ts: Date.now() } });
    } catch {}
  }

  async function handleLoad(pair) {
    const { card, rejectBtn } = pair;
    const planText = extractPlanText(card);
    if (!planText || planText.length < 20) {
      showToast("Plano não detectado (texto muito curto).", "err");
      return;
    }
    const copied = await copyToClipboard(planText);
    notifyPanel(planText);
    try { rejectBtn.click(); } catch {}
    showToast(
      copied
        ? "Plano copiado + negado (0 créditos). Cole na ACTO (Ctrl+V) e envie."
        : "Plano enviado ao painel ACTO. Abra a extensão.",
      "ok",
    );
  }

  function buildLoadButton(pair) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.setAttribute(INJECTED_ATTR, "1");
    btn.textContent = "📋 Carregar na ACTO";
    btn.title = "Captura o plano, nega o nativo (0 créditos) e envia ao painel ACTO";
    btn.style.cssText = `
      display:inline-flex;align-items:center;gap:6px;
      padding:8px 14px;margin:0 8px 0 0;
      border-radius:10px;cursor:pointer;
      font:700 12px/1 ui-sans-serif,system-ui,sans-serif;letter-spacing:.02em;
      color:#0a0f1e;background:linear-gradient(135deg,#7dd3fc,#a78bfa);
      border:1px solid rgba(255,255,255,.25);
      box-shadow:0 6px 18px rgba(124,58,237,.35);
      transition:transform .15s ease, box-shadow .15s ease;
      vertical-align:middle;
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
      handleLoad(pair);
    });
    return btn;
  }

  function injectAll() {
    const pairs = findPlanPairs();
    for (const pair of pairs) {
      const parent = pair.approveBtn.parentElement;
      if (!parent) continue;
      // se já existe um botão nosso ao lado, pula
      const exists = parent.querySelector(`[${INJECTED_ATTR}="1"]`);
      if (exists) { injectedForApprove.add(pair.approveBtn); continue; }
      const loadBtn = buildLoadButton(pair);
      try { parent.insertBefore(loadBtn, pair.approveBtn); }
      catch { parent.appendChild(loadBtn); }
      injectedForApprove.add(pair.approveBtn);
    }
  }

  let scanTimer = 0;
  function scheduleScan() {
    if (scanTimer) return;
    scanTimer = window.setTimeout(() => {
      scanTimer = 0;
      try { injectAll(); } catch (e) { console.warn("[ACTO plan-capture]", e); }
    }, 200);
  }

  const observer = new MutationObserver(scheduleScan);
  observer.observe(document.documentElement, { childList: true, subtree: true });

  // varreduras iniciais
  [150, 500, 1200, 2400, 4800, 8000].forEach((t) => setTimeout(injectAll, t));

  // expõe trigger manual p/ debug: window.__ACTO_RESCAN__()
  window.__ACTO_RESCAN__ = injectAll;
  console.info("[ACTO] plan-capture v9 ativo");
})();
