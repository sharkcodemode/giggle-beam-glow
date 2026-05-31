// ACTO Plan Capture v10 — detecta plano da Lovable em DOIS modos:
//  (A) Cards com botões Approve/Reject (modo implementação)
//  (B) Bolhas de mensagem contendo um blueprint MODO PLANO (## 1..## 11, "PLANO TIER-S", etc.)
// Injeta botão "📋 COPIAR PLANO" que copia o texto limpo e avisa o painel ACTO.
(() => {
  if (window.__ACTO_PLAN_CAPTURE_V10__) return;
  window.__ACTO_PLAN_CAPTURE_V10__ = true;

  const INJECTED_ATTR = "data-acto-plan-btn-v10";
  const BUBBLE_FLAG_ATTR = "data-acto-plan-bubble-v10";
  const TOAST_ID = "acto-plan-toast-v10";

  const APPROVE_RX = /(approve|aprovar|implement|implementar|apply\b|aplicar|accept|aceitar)/i;
  const REJECT_RX  = /(reject|negar|deny|decline|cancel|cancelar|dismiss|discard|descartar)/i;

  // Marcadores fortes de "isto é um plano"
  const PLAN_SIGNATURES = [
    /PLANO\s+TIER[\s-]?S/i,
    /BLUEPRINT\s+FORGE/i,
    /MODO\s+PLANO\s+ELITE/i,
    /##\s*1\.\s*Objetivo/i,
    /##\s*11\.\s*Resultado\s+esperado/i,
  ];

  const injectedForApprove = new WeakSet();
  const injectedForBubble = new WeakSet();

  function btnText(b) {
    return (b?.innerText || b?.textContent || b?.getAttribute?.("aria-label") || b?.getAttribute?.("title") || "").trim();
  }
  function isApprove(b) { const t = btnText(b); return APPROVE_RX.test(t) && !REJECT_RX.test(t); }
  function isReject(b)  { const t = btnText(b); return REJECT_RX.test(t)  && !APPROVE_RX.test(t); }
  function findButtons(root) { return Array.from(root.querySelectorAll('button, [role="button"]')); }

  function findPlanPairs() {
    const approveBtns = findButtons(document).filter(isApprove);
    const pairs = [];
    for (const ap of approveBtns) {
      if (injectedForApprove.has(ap) || !ap.isConnected) continue;
      let node = ap.parentElement, depth = 0, rejectBtn = null, card = null;
      while (node && depth < 10) {
        const cs = findButtons(node);
        rejectBtn = cs.find((b) => b !== ap && isReject(b));
        if (rejectBtn) { card = node; break; }
        node = node.parentElement; depth += 1;
      }
      if (rejectBtn && card) pairs.push({ approveBtn: ap, rejectBtn, card });
    }
    return pairs;
  }

  // Heurística RIGOROSA: precisa ter '## 1.' E ('## 11.' OU >=6 headings) OU 2+ assinaturas fortes
  function looksLikePlan(text) {
    const t = String(text || "");
    if (t.length < 400) return false;
    const headings = (t.match(/(^|\n)\s*##\s*\d+\.\s+/g) || []).length;
    const hasStart = /(^|\n)\s*##\s*1\.\s+/.test(t);
    const hasEnd = /(^|\n)\s*##\s*11\.\s+/.test(t);
    if (hasStart && hasEnd) return true;
    if (hasStart && headings >= 6) return true;
    const sig = PLAN_SIGNATURES.reduce((acc, rx) => acc + (rx.test(t) ? 1 : 0), 0);
    return sig >= 2 && headings >= 4;
  }

  // Extrai apenas a região do plano: do primeiro '## 1.' até o fim do '## 11.' (ou EOF)
  function extractPlanRegion(text) {
    const t = String(text || "");
    const startMatch = t.match(/(^|\n)\s*##\s*1\.\s+/);
    if (!startMatch) return t.trim();
    const startIdx = startMatch.index + (startMatch[1] ? startMatch[1].length : 0);
    const rest = t.slice(startIdx);
    // tenta cortar depois da seção 11
    const sec11 = rest.match(/(^|\n)\s*##\s*11\.\s+[^\n]*\n([\s\S]*?)(?=\n\s*##\s+\d+\.|\n\s*(?:Approve|Aprovar|Reject|Negar)\b|$)/i);
    if (sec11) {
      const endIdx = sec11.index + sec11[0].length;
      return rest.slice(0, endIdx).trim();
    }
    return rest.trim();
  }

  function isChatBubbleCandidate(el) {
    if (!el || el.nodeType !== 1) return false;
    const tag = (el.tagName || "").toUpperCase();
    if (["SCRIPT","STYLE","NOSCRIPT","TEXTAREA","INPUT","BUTTON","SVG","IMG","IFRAME","CANVAS"].includes(tag)) return false;
    const r = el.getBoundingClientRect?.();
    if (!r || r.width < 200 || r.height < 80) return false;
    return true;
  }

  function findPlanBubbles() {
    const out = [];
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
      acceptNode(n) {
        const v = n.nodeValue || "";
        if (v.length < 30) return NodeFilter.FILTER_REJECT;
        return /##\s*11\.\s+/.test(v) || PLAN_SIGNATURES.some((rx) => rx.test(v))
          ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
      },
    });
    const seen = new Set();
    let tn;
    while ((tn = walker.nextNode())) {
      // Sobe procurando o MENOR container que satisfaz looksLikePlan (a bolha real, não o chat inteiro)
      let node = tn.parentElement, depth = 0, best = null;
      while (node && depth < 16) {
        if (isChatBubbleCandidate(node)) {
          const txt = node.innerText || node.textContent || "";
          if (looksLikePlan(txt)) { best = node; break; } // primeiro match = menor container
        }
        node = node.parentElement; depth += 1;
      }
      if (best && !seen.has(best) && !injectedForBubble.has(best)) {
        // guarda: não injeta em containers gigantes (chat inteiro)
        const r = best.getBoundingClientRect();
        if (r.height > window.innerHeight * 3) continue;
        seen.add(best);
        out.push(best);
      }
    }
    return out;
  }

  function cleanPlanText(raw) {
    return String(raw || "")
      .replace(/\r/g, "")
      .replace(/^\s*(Approve|Aprovar|Implement|Implementar|Apply|Aplicar|Accept|Aceitar)(\s+plan|\s+plano)?\s*$/gim, "")
      .replace(/^\s*(Reject|Negar|Deny|Decline|Cancel|Cancelar|Dismiss|Discard|Descartar)\s*$/gim, "")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
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
        ta.value = text; ta.style.cssText = "position:fixed;opacity:0;left:-9999px;";
        document.body.appendChild(ta); ta.select();
        const ok = document.execCommand("copy"); ta.remove(); return ok;
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
    try { chrome.storage?.local?.set({ acto_last_plan: { text: planText, ts: Date.now() } }); } catch {}
  }

  async function handleCopy({ card, rejectBtn }) {
    const planText = cleanPlanText(card.innerText || card.textContent || "");
    if (!planText || planText.length < 40) { showToast("Plano não detectado (texto muito curto).", "err"); return; }
    const copied = await copyToClipboard(planText);
    notifyPanel(planText);
    if (rejectBtn) { try { rejectBtn.click(); } catch {} }
    showToast(
      copied
        ? (rejectBtn ? "Plano copiado + negado (0 créditos). Cole na ACTO (Ctrl+V)." : "Plano copiado. Cole na ACTO (Ctrl+V).")
        : "Plano enviado ao painel ACTO. Abra a extensão.",
      "ok",
    );
  }

  function buildButton(label = "📋 COPIAR PLANO") {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.setAttribute(INJECTED_ATTR, "1");
    btn.textContent = label;
    btn.title = "Captura o plano e envia ao painel ACTO (0 créditos)";
    btn.style.cssText = `
      display:inline-flex;align-items:center;gap:6px;
      padding:8px 14px;margin:6px 8px 6px 0;
      border-radius:10px;cursor:pointer;
      font:700 12px/1 ui-sans-serif,system-ui,sans-serif;letter-spacing:.04em;
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
    return btn;
  }

  function injectModeA() {
    for (const pair of findPlanPairs()) {
      const parent = pair.approveBtn.parentElement;
      if (!parent) continue;
      if (parent.querySelector(`[${INJECTED_ATTR}="1"]`)) { injectedForApprove.add(pair.approveBtn); continue; }
      const btn = buildButton("📋 COPIAR PLANO");
      btn.addEventListener("click", (ev) => { ev.preventDefault(); ev.stopPropagation(); handleCopy(pair); });
      try { parent.insertBefore(btn, pair.approveBtn); } catch { parent.appendChild(btn); }
      injectedForApprove.add(pair.approveBtn);
    }
  }

  function injectModeB() {
    for (const bubble of findPlanBubbles()) {
      if (bubble.querySelector(`[${INJECTED_ATTR}="1"]`)) { injectedForBubble.add(bubble); continue; }
      const btn = buildButton("📋 COPIAR PLANO");
      btn.style.margin = "10px 0 4px";
      btn.addEventListener("click", (ev) => {
        ev.preventDefault(); ev.stopPropagation();
        handleCopy({ card: bubble, rejectBtn: null });
      });
      // tenta fixar como primeiro filho visível pra ficar no topo da bolha
      try { bubble.insertBefore(btn, bubble.firstChild); }
      catch { bubble.appendChild(btn); }
      bubble.setAttribute(BUBBLE_FLAG_ATTR, "1");
      injectedForBubble.add(bubble);
    }
  }

  function injectAll() {
    try { injectModeA(); } catch (e) { console.warn("[ACTO plan-capture A]", e); }
    try { injectModeB(); } catch (e) { console.warn("[ACTO plan-capture B]", e); }
  }

  let scanTimer = 0;
  function scheduleScan() {
    if (scanTimer) return;
    scanTimer = window.setTimeout(() => { scanTimer = 0; injectAll(); }, 220);
  }

  const observer = new MutationObserver(scheduleScan);
  observer.observe(document.documentElement, { childList: true, subtree: true, characterData: true });

  [150, 500, 1200, 2400, 4800, 8000, 14000].forEach((t) => setTimeout(injectAll, t));
  window.__ACTO_RESCAN__ = injectAll;
  console.info("[ACTO] plan-capture v10 ativo (modo A: approve/reject, modo B: bolha de plano)");
})();
