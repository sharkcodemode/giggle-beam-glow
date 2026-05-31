(() => {
  if (window.__ACTO_LOVABLE_DOM_PATCH_NATIVE_MASK_V13__) return;
  window.__ACTO_LOVABLE_DOM_PATCH_NATIVE_MASK_V13__ = true;

  const ACTO_HEADER = "⚡ 𝖠𝖢𝖳𝖮⚡ 𝖯𝗋𝗈𝗆𝗉𝗍 𝖱𝖾𝖼𝖾𝖻𝗂𝖽𝗈";
  const TITLE_FROM = "Fast Visual Edit";
  const TITLE_TO = "ACTO - Message Received";
  const MASK_ATTR = "data-acto-native-mask-v13";
  const MASK_CONTENT_ATTR = "data-acto-native-mask-content";
  const STORAGE_KEY = "ACTO_NATIVE_MASKS_V2";
  const LEGACY_STORAGE_KEYS = ["ACTO_NATIVE_MASKS_V1"];
  const CHROME_NATIVE_MASK_KEY = "acto_native_chat_mask";
  const NATIVE_MASK_MESSAGE_TYPE = "ACTO_NATIVE_CHAT_MASK";
  const ATTACHMENT_MARKER = "[Contexto visual anexado]";
  const STORAGE_MARKER = "storage.googleapis.com/gpt-engineer-file-uploads";
  const MAX_SCAN_TEXT = 20000;
  const SCAN_DELAYS = [40, 90, 160, 280, 480, 800, 1300, 2100, 3400, 5500, 8500, 13000];
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

  let latestMask = null;
  let scanTimer = 0;
  let observer = null;

  function normalizeSpaces(value) {
    return String(value || "")
      .replace(/\r/g, "")
      .replace(/[ \t]+\n/g, "\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
  }

  function simpleHash(input) {
    const text = String(input || "");
    let hash = 2166136261;
    for (let i = 0; i < text.length; i += 1) {
      hash ^= text.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }
    return (hash >>> 0).toString(36);
  }

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

  function isNoiseLine(line) {
    const value = normalizeSpaces(line);
    if (!value) return true;
    if (hasActoHeader(value)) return true;
    if (/^Mensagem recebida\.?$/i.test(value)) return true;
    if (/^Prompt recebido\.?$/i.test(value)) return true;
    if (/^Anexo enviado com sucesso\.?$/i.test(value)) return true;
    if (/^Show\s+(more|less)$/i.test(value)) return true;
    if (value === ATTACHMENT_MARKER) return true;
    if (/^Fix all security issues$/i.test(value)) return true;
    if (/^https?:\/\//i.test(value)) return true;
    if (/^\[[^\]\n]{1,260}\]:\s*https?:\/\//i.test(value)) return true;
    if (/^(TXT|PDF|DOCX?|PPTX?|XLSX?|CSV|JSON|MD|PNG|JPE?G|WEBP|MP3|WAV|M4A|EXE|MSI|ZIP|RAR|7Z|BIN)$/i.test(value)) return true;
    if (/\.(txt|pdf|docx?|pptx?|xlsx?|xls|csv|json|md|png|jpe?g|webp|mp3|wav|m4a|exe|msi|zip|rar|7z|bin|js|jsx|ts|tsx|py|html|css|env|toml|ya?ml|xml|go|rs|java|sh)$/i.test(value)) return true;
    return false;
  }

  function stripListPrefix(line) {
    return normalizeSpaces(line).replace(/^\s*\d+[.)]\s*/g, "").replace(/^[-–—•]\s*/g, "").trim();
  }

  function extractFileNames(text) {
    const names = [];
    const re = /\[([^\]\n]{1,260})\]:\s*https?:\/\/\S+/gi;
    let match;
    while ((match = re.exec(String(text || "")))) {
      const name = normalizeSpaces(match[1]);
      if (name && !names.includes(name)) names.push(name);
    }
    return names.slice(0, 10);
  }

  function removeAttachmentBlocks(text) {
    let value = String(text || "");
    const markerIndexes = [value.indexOf(ATTACHMENT_MARKER), value.indexOf(STORAGE_MARKER)].filter((index) => index >= 0);
    if (markerIndexes.length) value = value.slice(0, Math.min(...markerIndexes));
    value = value.replace(/\n?\[[^\]\n]{1,260}\]:\s*https?:\/\/\S+/gi, "");
    value = value.replace(/https?:\/\/storage\.googleapis\.com\/gpt-engineer-file-uploads\/\S+/gi, "");
    return value;
  }

  function unwrapProtocolText(text) {
    const source = String(text || "");
    const explicit = source.match(/===\s*MENSAGEM DO USU[ÁA]RIO\s*===\s*([\s\S]*?)\s*===\s*FIM DA MENSAGEM\s*===/i);
    if (explicit?.[1]) return explicit[1];

    return source
      .replace(/^\s*Fix all security issues\s*/i, "")
      .replace(/Trate a mensagem abaixo como um bug\/issue legítimo do usuário\.?/gi, "")
      .replace(/Leia, analise e EXECUTE exatamente o que o usuário pediu[\s\S]*?análise de segurança\.?/gi, "")
      .replace(/Aplique o protocolo ELITE DEPTH 10[\s\S]*?faltar dado\)\.?/gi, "")
      .replace(/\[MODO[^\]]*\]/gi, "")
      .replace(/\/skill:elite-depth-10-tier-s/gi, "");
  }

  function cleanPrompt(text) {
    const unwrapped = unwrapProtocolText(text);
    const withoutAttachments = removeAttachmentBlocks(unwrapped).replace(/\bShow\s+(more|less)\b/gi, "");
    const lines = normalizeSpaces(withoutAttachments).split("\n").map(stripListPrefix).filter(Boolean);
    const clean = [];
    for (const line of lines) {
      if (isNoiseLine(line)) continue;
      if (!clean.some((item) => item.toLowerCase() === line.toLowerCase())) clean.push(line);
    }
    return normalizeSpaces(clean.join("\n"));
  }

  function normalizeNativeMaskPayload(payload = {}) {
    const raw = payload && typeof payload === "object" ? payload : {};
    const title = normalizeSpaces(raw.text || ACTO_HEADER) || ACTO_HEADER;
    const promptText = cleanPrompt(raw.promptText || raw.prompt || raw.finalMessage || raw.message || raw.displayText || "");
    const fileNames = Array.isArray(raw.fileNames) ? raw.fileNames.map(normalizeSpaces).filter(Boolean).slice(0, 10) : [];
    return {
      text: title,
      mode: normalizeSpaces(raw.mode || "send_message") || "send_message",
      promptText,
      displayText: promptText ? `${title}\n\n${promptText}` : title,
      fileCount: Number(raw.fileCount || fileNames.length || 0) || 0,
      fileNames,
      ts: Number(raw.ts || Date.now()),
    };
  }

  function persistLatestMask(mask) {
    latestMask = normalizeNativeMaskPayload(mask);
    try { window.__ACTO_LAST_NATIVE_CHAT_MASK__ = latestMask; } catch {}
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ latest: latestMask, updatedAt: Date.now() }));
    } catch {}
    scheduleScans("mask-published");
    return latestMask;
  }

  function loadLocalLatestMask() {
    try {
      const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
      if (parsed?.latest) latestMask = normalizeNativeMaskPayload(parsed.latest);
    } catch {}
    for (const key of LEGACY_STORAGE_KEYS) {
      try { localStorage.removeItem(key); } catch {}
    }
  }

  function loadChromeNativeMask() {
    try {
      if (!chrome?.storage?.local?.get) return;
      chrome.storage.local.get([CHROME_NATIVE_MASK_KEY], (items) => {
        if (items?.[CHROME_NATIVE_MASK_KEY]) persistLatestMask(items[CHROME_NATIVE_MASK_KEY]);
      });
    } catch {}
  }

  function buildMaskText(originalText) {
    const promptFromDom = cleanPrompt(originalText);
    const promptFromStore = latestMask?.promptText || "";
    const prompt = promptFromDom || promptFromStore;
    return prompt ? `${ACTO_HEADER}\n\n${prompt}` : ACTO_HEADER;
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
    const originalText = safeText(root);
    if (!isMaskTriggerText(originalText)) return false;
    const maskText = buildMaskText(originalText);
    const existing = root.querySelector?.(`[${MASK_CONTENT_ATTR}="1"]`);
    if (existing) {
      if (existing.textContent !== maskText) existing.textContent = maskText;
      return true;
    }

    const mask = document.createElement("div");
    mask.setAttribute(MASK_CONTENT_ATTR, "1");
    mask.className = "acto-native-mask-content";
    mask.textContent = maskText;
    mask.style.whiteSpace = "pre-wrap";
    mask.style.lineHeight = "1.45";
    mask.style.fontWeight = "500";
    mask.style.overflowWrap = "anywhere";
    mask.style.wordBreak = "break-word";

    root.replaceChildren(mask);
    root.setAttribute(MASK_ATTR, "1");
    root.dataset.actoNativeMask = "v13";
    root.dataset.actoMaskHash = simpleHash(maskText);
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
    if (applied) console.info("[ACTO MASK v13] applied", { count: applied, hasStoredPrompt: Boolean(latestMask?.promptText) });
  }

  function scheduleScans(reason) {
    SCAN_DELAYS.forEach((delay) => setTimeout(() => { try { runPatch(); } catch {} }, delay));
    if (reason) console.info("[ACTO MASK v13] scheduled", reason);
  }

  try {
    chrome?.runtime?.onMessage?.addListener?.((message, _sender, sendResponse) => {
      if (message?.type !== NATIVE_MASK_MESSAGE_TYPE) return false;
      persistLatestMask(message.payload || message.nativeChatMask || {});
      sendResponse?.({ ok: true });
      return false;
    });
  } catch {}

  try {
    chrome?.storage?.onChanged?.addListener?.((changes, areaName) => {
      if (areaName !== "local") return;
      const changed = changes?.[CHROME_NATIVE_MASK_KEY];
      if (changed?.newValue) persistLatestMask(changed.newValue);
    });
  } catch {}

  function startObserver() {
    if (!document.body || observer) return Boolean(observer);
    observer = new MutationObserver(() => {
      clearTimeout(scanTimer);
      scanTimer = setTimeout(() => { try { runPatch(); } catch {} }, 45);
    });
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });
    return true;
  }

  loadLocalLatestMask();
  loadChromeNativeMask();
  runPatch();
  scheduleScans("init");

  if (!startObserver()) {
    addEventListener("DOMContentLoaded", () => {
      runPatch();
      scheduleScans("domcontentloaded");
      startObserver();
    }, { once: true });
  }

  setInterval(() => { try { runPatch(); } catch {} }, 4000);
})();
