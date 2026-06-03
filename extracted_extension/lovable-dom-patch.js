(() => {
  if (window.__ACTO_LOVABLE_DOM_PATCH_NATIVE_MASK_V16__) return;
  window.__ACTO_LOVABLE_DOM_PATCH_NATIVE_MASK_V16__ = true;

  const VERSION = "v16";
  const ACTO_HEADER = "⚡ 𝖠𝖢𝖳𝖮 𝖯𝗋𝗈𝗆𝗉𝗍 𝖱𝖾𝖼𝖾𝖻𝗂𝖽𝗈";
  const TITLE_FROM = "Fast Visual Edit";
  const TITLE_TO = "ACTO - Message Received";
  const MASK_ATTR = "data-acto-native-mask-v16";
  const MASK_CONTENT_ATTR = "data-acto-native-mask-content";
  const MASKED_FLAG = "data-acto-masked";

  const ATTACHMENT_MARKER = "[Contexto visual anexado]";
  const STORAGE_MARKER = "storage.googleapis.com/gpt-engineer-file-uploads";
  const MAX_SCAN_TEXT = 20000;
  // V16: subida MUITO conservadora — bolha individual, nunca container de chat.
  const MAX_ASCENT_DEPTH = 6;
  // V16: se o root tem >50% de texto extra além do trigger, é wrapper de chat → abortar.
  const TEXT_OVERFLOW_RATIO = 1.5;
  const SCAN_DELAYS = [40, 160, 480, 1200, 2400];
  const WRAPPER_PATTERNS = [
    /Fix all security issues/i,
    /Trate a mensagem abaixo como um bug\/issue/i,
    /Leia, analise e EXECUTE exatamente o que o usuário pediu/i,
    /Aplique o protocolo ELITE DEPTH 10/i,
    /===\s*MENSAGEM DO USU[ÁA]RIO\s*===/i,
    /===\s*FIM DA MENSAGEM\s*===/i,
    /\[MODO [^\]]*DEPTH 10[^\]]*\]/i,
    /\/skill:elite-depth-10-tier-s/i,
  ];

  let scanTimer = 0;
  let observer = null;

  function safeText(el) {
    return String(el?.textContent || "").slice(0, MAX_SCAN_TEXT);
  }

  function hasActoHeader(text) {
    const value = String(text || "");
    return value.includes(ACTO_HEADER) || /ACTO\s*.*Prompt\s+Recebido/i.test(value);
  }

  function isMaskTriggerText(text) {
    const value = String(text || "");
    if (!value || hasActoHeader(value)) return false;
    if (value.includes(ATTACHMENT_MARKER) || value.includes(STORAGE_MARKER)) return true;
    return WRAPPER_PATTERNS.some((pattern) => pattern.test(value));
  }

  function isIgnoredElement(el) {
    if (!el || el.nodeType !== Node.ELEMENT_NODE) return true;
    const tag = String(el.tagName || "").toUpperCase();
    return ["SCRIPT", "STYLE", "NOSCRIPT", "TEXTAREA", "INPUT", "BUTTON", "SVG", "PATH", "IMG", "IFRAME", "CANVAS"].includes(tag);
  }

  function isBoundaryElement(el) {
    if (!el || el === document.body || el === document.documentElement) return true;
    const tag = String(el.tagName || "").toUpperCase();
    if (["HTML", "BODY", "MAIN", "SECTION", "ARTICLE", "ASIDE", "NAV", "HEADER", "FOOTER", "FORM", "UL", "OL"].includes(tag)) return true;
    const id = String(el.id || "").toLowerCase();
    if (id === "root" || id === "__next" || id.includes("root")) return true;
    const role = String(el.getAttribute?.("role") || "").toLowerCase();
    return ["main", "application", "dialog", "tabpanel", "navigation", "banner", "contentinfo"].includes(role);
  }

  function rectOf(el) {
    try { return el.getBoundingClientRect(); } catch { return null; }
  }

  function isVisibleRect(rect) {
    if (!rect) return false;
    const vw = Math.max(320, window.innerWidth || 1440);
    const vh = Math.max(320, window.innerHeight || 900);
    if (rect.width < 24 || rect.height < 12) return false;
    if (rect.width > Math.min(860, vw * 0.92)) return false;
    if (rect.height > Math.min(720, vh * 0.82)) return false;
    if (rect.bottom < 0 || rect.top > vh) return false;
    return true;
  }

  function visualScore(el) {
    const rect = rectOf(el);
    if (!isVisibleRect(rect)) return -100;
    const vw = Math.max(320, window.innerWidth || 1440);
    const style = getComputedStyle(el);
    const radius = Math.max(
      parseFloat(style.borderTopLeftRadius || "0") || 0,
      parseFloat(style.borderTopRightRadius || "0") || 0,
      parseFloat(style.borderBottomLeftRadius || "0") || 0,
      parseFloat(style.borderBottomRightRadius || "0") || 0,
    );
    const bg = style.backgroundColor || "";
    const hasBg = bg && bg !== "transparent" && !/rgba?\(\s*0\s*,\s*0\s*,\s*0\s*(,\s*0\s*)?\)/i.test(bg);
    let score = 0;
    if (radius >= 8) score += 8;
    if (hasBg) score += 8;
    if (rect.right >= vw * 0.52) score += 6;
    if (rect.left >= vw * 0.18) score += 4;
    if (rect.width >= 120 && rect.width <= 620) score += 3;
    if (rect.height >= 28 && rect.height <= 420) score += 3;
    if (["flex", "inline-flex", "grid", "block"].includes(style.display)) score += 2;
    let ancestor = el.parentElement;
    for (let i = 0; ancestor && i < 5; i += 1, ancestor = ancestor.parentElement) {
      const ancestorStyle = getComputedStyle(ancestor);
      if (/flex-end|end|right/i.test(`${ancestorStyle.justifyContent} ${ancestorStyle.alignItems} ${ancestorStyle.textAlign}`)) score += 4;
    }
    if (rect.right < vw * 0.48) score -= 10;
    return score;
  }

  function collectTriggerTextNodes() {
    const nodes = [];
    if (!document.body) return nodes;
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        const value = node.nodeValue || "";
        return isMaskTriggerText(value) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
      },
    });
    while (walker.nextNode()) nodes.push(walker.currentNode);
    return nodes;
  }

  function candidateRootsFromTextNode(textNode) {
    const candidates = [];
    let node = textNode?.parentElement || null;
    for (let depth = 0; node && depth < 14; depth += 1, node = node.parentElement) {
      if (isIgnoredElement(node) || isBoundaryElement(node)) break;
      // V15: nó já mascarado é parada absoluta — nunca reescrever.
      if (node.getAttribute && node.getAttribute(MASKED_FLAG) === "1") break;
      const text = safeText(node);
      if (!isMaskTriggerText(text)) break;
      const score = visualScore(node);
      if (score >= 0) candidates.push({ el: node, score, area: (rectOf(node)?.width || 0) * (rectOf(node)?.height || 0), depth });
    }
    return candidates;
  }

  function chooseMaskRoot(textNode) {
    const candidates = candidateRootsFromTextNode(textNode);
    if (!candidates.length) return null;
    candidates.sort((a, b) => {
      const scoreDiff = b.score - a.score;
      if (scoreDiff) return scoreDiff;
      return a.area - b.area;
    });
    return candidates[0].el;
  }

  function applyMask(root) {
    if (!root) return false;
    // V15: write-once. Se já mascaramos este nó, não toca mais.
    if (root.getAttribute(MASKED_FLAG) === "1") return false;
    const originalText = safeText(root);
    if (!isMaskTriggerText(originalText)) return false;

    const mask = document.createElement("div");
    mask.setAttribute(MASK_CONTENT_ATTR, "1");
    mask.className = "acto-native-mask-content";
    mask.textContent = ACTO_HEADER;
    mask.style.whiteSpace = "pre-wrap";
    mask.style.lineHeight = "1.45";
    mask.style.fontWeight = "500";
    mask.style.overflowWrap = "anywhere";
    mask.style.wordBreak = "break-word";

    root.replaceChildren(mask);
    root.setAttribute(MASK_ATTR, "1");
    root.setAttribute(MASKED_FLAG, "1");
    root.dataset.actoNativeMask = VERSION;
    root.style.whiteSpace = "pre-wrap";
    root.style.minHeight = root.style.minHeight || "1.45em";
    return true;
  }

  function replaceLovableNativeChatTitle() {
    if (!document.body) return;
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    const nodes = [];
    while (walker.nextNode()) {
      const node = walker.currentNode;
      if (node.nodeValue && node.nodeValue.includes(TITLE_FROM)) nodes.push(node);
    }
    nodes.forEach((node) => { node.nodeValue = node.nodeValue.replaceAll(TITLE_FROM, TITLE_TO); });
  }

  function runPatch() {
    if (document.visibilityState === "hidden") return;
    replaceLovableNativeChatTitle();
    const roots = [];
    for (const textNode of collectTriggerTextNodes()) {
      const root = chooseMaskRoot(textNode);
      if (root && !roots.includes(root)) roots.push(root);
    }
    let applied = 0;
    for (const root of roots) {
      if (applyMask(root)) applied += 1;
    }
    if (applied) console.info(`[ACTO MASK ${VERSION}] applied`, { count: applied });
  }

  function scheduleScans(reason) {
    SCAN_DELAYS.forEach((delay) => setTimeout(() => { try { runPatch(); } catch {} }, delay));
    if (reason) console.info(`[ACTO MASK ${VERSION}] scheduled`, reason);
  }

  function startObserver() {
    if (!document.body || observer) return Boolean(observer);
    observer = new MutationObserver(() => {
      clearTimeout(scanTimer);
      scanTimer = setTimeout(() => { try { runPatch(); } catch {} }, 60);
    });
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });
    return true;
  }

  try {
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") scheduleScans("visibility");
    });
  } catch {}

  runPatch();
  scheduleScans("init");

  if (!startObserver()) {
    addEventListener("DOMContentLoaded", () => {
      runPatch();
      scheduleScans("domcontentloaded");
      startObserver();
    }, { once: true });
  }
})();
