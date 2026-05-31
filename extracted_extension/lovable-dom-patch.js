(() => {
  if (window.__ACTO_LOVABLE_DOM_PATCH_NATIVE_MASK_V9__) return;
  window.__ACTO_LOVABLE_DOM_PATCH_NATIVE_MASK_V9__ = true;

  const TITLE_FROM = "Fast Visual Edit";
  const TITLE_TO = "ACTO - Message Received";
  const ATTACHMENT_MARKER = "[Contexto visual anexado]";
  const STORAGE_MARKER = "storage.googleapis.com/gpt-engineer-file-uploads";
  const SECURITY_WRAPPER_PATTERNS = [
    /Fix all security issues/i,
    /Trate a mensagem abaixo como um bug\/issue/i,
    /=== MENSAGEM DO USU[ÁA]RIO ===/i,
    /\[MODO ELITE.*?DEPTH 10\]/i,
    /\[MODO PLANO\]/i,
    /\/skill:elite-depth-10-tier-s/i,
  ];
  const ACTO_HEADER = "⚡ 𝖠𝖢𝖳𝖮⚡ 𝖯𝗋𝗈𝗆𝗉𝗍 𝖱𝖾𝖼𝖾𝖻𝗂𝖽𝗈";
  const MASK_ATTR = "data-acto-native-mask";
  const STORAGE_KEY = "ACTO_NATIVE_MASKS_V1";
  const CHROME_NATIVE_MASK_KEY = "acto_native_chat_mask";
  const NATIVE_MASK_MESSAGE_TYPE = "ACTO_NATIVE_CHAT_MASK";
  const MAX_MASKS = 80;
  const MASK_TTL_MS = 30 * 24 * 60 * 60 * 1000;

  let runnerNativeMask = null;
  let scanTimer = 0;

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

  function hasAttachmentPayload(text) {
    const value = String(text || "");
    return value.includes(ATTACHMENT_MARKER) || value.includes(STORAGE_MARKER);
  }

  function hasSecurityWrapper(text) {
    const value = String(text || "");
    return SECURITY_WRAPPER_PATTERNS.some((re) => re.test(value));
  }

  function hasMaskablePayload(text) {
    return hasAttachmentPayload(text) || hasSecurityWrapper(text);
  }

  function extractUserMessageFromWrapper(text) {
    const value = String(text || "");
    const m = value.match(/===\s*MENSAGEM DO USU[ÁA]RIO\s*===\s*([\s\S]*?)\s*===\s*FIM DA MENSAGEM\s*===/i);
    if (m && m[1]) return normalizeSpaces(m[1]);
    // strip known wrapper preludes
    const stripped = value
      .replace(/^[\s\S]*?Fix all security issues[^\n]*\n?/i, "")
      .replace(/^[\s\S]*?\[MODO[^\]]+\][^\n]*\n?/i, "")
      .replace(/^[\s\S]*?\/skill:elite-depth-10-tier-s[^\n]*\n?/i, "")
      .replace(/Trate a mensagem abaixo[\s\S]*?legítimo do usuário\.?/i, "")
      .replace(/Leia, analise e EXECUTE[\s\S]*?segurança\.?/i, "")
      .replace(/Aplique o protocolo ELITE[\s\S]*?faltar dado\)\.?/i, "");
    return normalizeSpaces(stripped);
  }

  function hasActoHeader(text) {
    const value = String(text || "");
    return value.includes(ACTO_HEADER) || /ACTO\s*⚡?\s*Prompt\s+Recebido/i.test(value);
  }

  function isFileChipOrTypeLine(line) {
    const value = normalizeSpaces(line);
    if (!value) return true;
    if (/^(TXT|PDF|DOCX?|PPTX?|XLSX?|CSV|JSON|MD|PNG|JPE?G|WEBP|MP3|WAV|M4A|EXE|MSI|ZIP|RAR|7Z|BIN)$/i.test(value)) return true;
    if (/\.(txt|pdf|docx?|pptx?|xlsx?|xls|csv|json|md|png|jpe?g|webp|mp3|wav|m4a|exe|msi|zip|rar|7z|bin|js|jsx|ts|tsx|py|html|css|env|toml|yaml|yml|xml|go|rs|java|sh)$/i.test(value)) return true;
    return false;
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
    if (/^https?:\/\//i.test(value)) return true;
    if (/^\[[^\]\n]{1,260}\]:\s*https?:\/\//i.test(value)) return true;
    if (isFileChipOrTypeLine(value)) return true;
    return false;
  }

  function stripNumberPrefix(line) {
    return normalizeSpaces(line)
      .replace(/^\s*\d+[.)]\s*/g, "")
      .replace(/^[-–—•]\s*/g, "")
      .trim();
  }

  function cutBeforeAttachmentBlock(text) {
    let value = String(text || "");
    const markerIndex = value.indexOf(ATTACHMENT_MARKER);
    const storageIndex = value.indexOf(STORAGE_MARKER);
    const indexes = [markerIndex, storageIndex].filter((n) => n >= 0);
    if (indexes.length) value = value.slice(0, Math.min(...indexes));
    value = value.replace(/\n?\[[^\]\n]{1,260}\]:\s*https?:\/\/\S+/gi, "");
    value = value.replace(/https?:\/\/storage\.googleapis\.com\/gpt-engineer-file-uploads\/\S+/gi, "");
    return value;
  }

  function cleanPrompt(text) {
    let source = String(text || "");
    if (hasSecurityWrapper(source)) {
      source = extractUserMessageFromWrapper(source) || source;
    }
    const before = normalizeSpaces(cutBeforeAttachmentBlock(source).replace(/\bShow\s+(more|less)\b/gi, ""));
    const lines = before.split("\n").map((line) => stripNumberPrefix(line)).filter(Boolean);
    const clean = [];
    for (const line of lines) {
      if (isNoiseLine(line)) continue;
      if (!clean.some((existing) => existing.toLowerCase() === line.toLowerCase())) clean.push(line);
    }
    return normalizeSpaces(clean.join("\n"));
  }

  function buildMaskText(promptSource) {
    const prompt = cleanPrompt(promptSource);
    return prompt ? `${ACTO_HEADER}\n\n${prompt}` : ACTO_HEADER;
  }

  function extractFileNames(text) {
    const value = String(text || "");
    const names = [];
    const re = /\[([^\]\n]{1,260})\]:\s*https?:\/\/\S+/gi;
    let m;
    while ((m = re.exec(value))) {
      const name = normalizeSpaces(m[1]);
      if (name && !names.includes(name)) names.push(name);
    }
    return names.slice(0, 10);
  }

  function loadMasks() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const arr = JSON.parse(raw || "[]");
      if (!Array.isArray(arr)) return [];
      const cutoff = Date.now() - MASK_TTL_MS;
      return arr.filter((x) => x && typeof x === "object" && Number(x.createdAt || 0) >= cutoff).slice(-MAX_MASKS);
    } catch {
      return [];
    }
  }

  function saveMask(originalText, displayText) {
    try {
      const prompt = cleanPrompt(originalText) || cleanPrompt(displayText);
      const fileNames = extractFileNames(originalText);
      const record = {
        id: `acto_mask_${simpleHash(`${prompt}\n${fileNames.join("|")}`)}`,
        prompt,
        displayText: prompt ? `${ACTO_HEADER}\n\n${prompt}` : displayText,
        fileCount: fileNames.length || undefined,
        fileNames,
        markers: [ATTACHMENT_MARKER, STORAGE_MARKER, ...fileNames].filter(Boolean),
        createdAt: Date.now(),
      };
      const masks = loadMasks().filter((x) => x.id !== record.id);
      masks.push(record);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(masks.slice(-MAX_MASKS)));
      console.info("[ACTO MASK] saved", { promptLength: prompt.length, fileCount: fileNames.length });
    } catch {}
  }

  function normalizeNativeMaskPayload(payload) {
    const raw = payload && typeof payload === "object" ? payload : {};
    const title = normalizeSpaces(raw.text || ACTO_HEADER) || ACTO_HEADER;
    const prompt = cleanPrompt(raw.promptText || raw.prompt || raw.finalMessage || raw.displayText || "");
    return {
      text: title,
      mode: String(raw.mode || "basic"),
      promptText: prompt,
      displayText: prompt ? `${title}\n\n${prompt}` : title,
      fileCount: Number(raw.fileCount || 0) || 0,
      fileNames: Array.isArray(raw.fileNames) ? raw.fileNames.map((n) => normalizeSpaces(n)).filter(Boolean).slice(0, 10) : [],
      ts: Number(raw.ts || Date.now()),
    };
  }

  function setRunnerNativeMask(payload) {
    runnerNativeMask = normalizeNativeMaskPayload(payload);
    try { window.__ACTO_LAST_NATIVE_CHAT_MASK__ = runnerNativeMask; } catch {}
    try {
      const masks = loadMasks();
      masks.push({
        id: `acto_runner_${simpleHash(`${runnerNativeMask.promptText}\n${runnerNativeMask.ts}`)}`,
        prompt: runnerNativeMask.promptText,
        displayText: runnerNativeMask.displayText,
        fileCount: runnerNativeMask.fileCount || runnerNativeMask.fileNames.length || undefined,
        fileNames: runnerNativeMask.fileNames,
        markers: [ATTACHMENT_MARKER, STORAGE_MARKER, ...runnerNativeMask.fileNames].filter(Boolean),
        createdAt: runnerNativeMask.ts,
      });
      localStorage.setItem(STORAGE_KEY, JSON.stringify(masks.slice(-MAX_MASKS)));
    } catch {}
    console.info("[ACTO MASK] runner set", { promptLength: runnerNativeMask.promptText.length, fileCount: runnerNativeMask.fileNames.length });
    scheduleScans("runner");
    return runnerNativeMask;
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

  function isIgnoredElement(el) {
    if (!el || el.nodeType !== Node.ELEMENT_NODE) return true;
    const tag = String(el.tagName || "").toUpperCase();
    return ["SCRIPT", "STYLE", "NOSCRIPT", "TEXTAREA", "INPUT", "BUTTON", "SVG", "PATH", "IMG"].includes(tag);
  }

  function isForbiddenRoot(el) {
    if (!el || el === document.body || el === document.documentElement) return true;
    const tag = String(el.tagName || "").toUpperCase();
    if (["HTML", "BODY", "MAIN", "SECTION", "ARTICLE", "ASIDE", "NAV", "HEADER", "FOOTER", "FORM", "UL", "OL"].includes(tag)) return true;
    const id = String(el.id || "").toLowerCase();
    if (id === "root" || id === "__next" || id.includes("root")) return true;
    const role = String(el.getAttribute?.("role") || "").toLowerCase();
    if (["main", "application", "dialog", "tabpanel"].includes(role)) return true;
    return false;
  }

  function hasReasonableRect(el) {
    try {
      const rect = el.getBoundingClientRect();
      if (!rect || rect.width < 40 || rect.height < 16) return false;
      const vw = Math.max(320, innerWidth || 1440);
      const vh = Math.max(320, innerHeight || 900);
      if (rect.width > Math.min(680, vw * 0.6)) return false;
      if (rect.height > Math.min(520, vh * 0.55)) return false;
      return true;
    } catch {
      return false;
    }
  }

  function bubbleScore(el) {
    try {
      const rect = el.getBoundingClientRect();
      const style = getComputedStyle(el);
      const bg = style.backgroundColor || "";
      const radius = Math.max(
        parseFloat(style.borderTopLeftRadius || "0") || 0,
        parseFloat(style.borderTopRightRadius || "0") || 0,
        parseFloat(style.borderBottomLeftRadius || "0") || 0,
        parseFloat(style.borderBottomRightRadius || "0") || 0,
      );
      let score = 0;
      if (radius >= 8) score += 4;
      if (bg && bg !== "transparent" && !/rgba?\(\s*0\s*,\s*0\s*,\s*0\s*(,\s*0\s*)?\)/i.test(bg)) score += 4;
      if (rect.left > (innerWidth || 1440) * 0.25) score += 2;
      if (rect.width >= 150 && rect.width <= 560) score += 2;
      if (rect.height >= 40 && rect.height <= 360) score += 2;
      return score;
    } catch {
      return 0;
    }
  }

  function hasPromptBeforeMarker(el) {
    const text = el.textContent || "";
    if (!hasAttachmentPayload(text)) return false;
    return !!cleanPrompt(text);
  }

  function getTextNodesWithAttachment() {
    const out = [];
    if (!document.body) return out;
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        const value = node.nodeValue || "";
        if (value.includes(ATTACHMENT_MARKER) || value.includes(STORAGE_MARKER)) return NodeFilter.FILTER_ACCEPT;
        return NodeFilter.FILTER_REJECT;
      },
    });
    while (walker.nextNode()) out.push(walker.currentNode);
    return out;
  }

  function chooseMaskRootFromTextNode(textNode) {
    let node = textNode?.parentElement;
    const candidates = [];
    let steps = 0;
    while (node && node !== document.body && steps < 12) {
      steps += 1;
      if (isIgnoredElement(node) || isForbiddenRoot(node)) break;
      const text = node.textContent || "";
      if (!hasAttachmentPayload(text)) break;
      if (node.getAttribute?.(MASK_ATTR) === "1") return null;
      if (hasReasonableRect(node) && hasPromptBeforeMarker(node)) {
        candidates.push(node);
      }
      node = node.parentElement;
    }
    if (!candidates.length) return null;

    // Prefer the actual visual bubble: enough context to contain prompt + link,
    // but not the whole message group/card. If scores tie, pick the smaller/deeper element.
    candidates.sort((a, b) => {
      const scoreDiff = bubbleScore(b) - bubbleScore(a);
      if (scoreDiff) return scoreDiff;
      const ar = a.getBoundingClientRect();
      const br = b.getBoundingClientRect();
      return (ar.width * ar.height) - (br.width * br.height);
    });
    return candidates[0];
  }

  function applyMask(root, originalText, source) {
    if (!root || root.getAttribute?.(MASK_ATTR) === "1") return false;
    const promptFromDom = cleanPrompt(originalText);
    const promptFromRunner = runnerNativeMask?.promptText || "";
    const prompt = promptFromDom || promptFromRunner;
    if (!prompt && !hasAttachmentPayload(originalText)) return false;
    const maskText = prompt ? `${ACTO_HEADER}\n\n${prompt}` : ACTO_HEADER;

    const mask = document.createElement("div");
    mask.className = `acto-native-mask acto-${source || "basic"}-mask`;
    mask.textContent = maskText;
    mask.style.whiteSpace = "pre-wrap";
    mask.style.fontWeight = "500";
    mask.style.lineHeight = "1.45";

    root.replaceChildren(mask);
    root.setAttribute(MASK_ATTR, "1");
    root.dataset.actoMasked = source || "basic";
    root.dataset.actoMaskMode = source || "basic";
    root.dataset.actoMaskPrompt = simpleHash(prompt);
    root.style.whiteSpace = "pre-wrap";

    saveMask(originalText, maskText);
    return true;
  }

  function maskAttachmentPayloads() {
    const nodes = getTextNodesWithAttachment();
    const roots = [];
    for (const textNode of nodes) {
      const root = chooseMaskRootFromTextNode(textNode);
      if (root && !roots.includes(root)) roots.push(root);
    }

    let applied = 0;
    for (const root of roots) {
      const originalText = root.textContent || "";
      if (!hasAttachmentPayload(originalText)) continue;
      if (applyMask(root, originalText, runnerNativeMask ? (runnerNativeMask.mode || "runner") : "runtime")) applied += 1;
    }
    if (applied) console.info("[ACTO MASK] applied", { count: applied });
  }

  function runPatch() {
    replaceLovableNativeChatTitle();
    maskAttachmentPayloads();
  }

  function scheduleScans(reason) {
    [50, 120, 250, 500, 900, 1500, 2500, 4000, 7000, 10000].forEach((delay) => {
      setTimeout(() => { try { runPatch(); } catch {} }, delay);
    });
    if (reason) console.info("[ACTO MASK] scheduled", reason);
  }

  function loadChromeNativeMask() {
    try {
      if (!chrome?.storage?.local?.get) return;
      chrome.storage.local.get([CHROME_NATIVE_MASK_KEY], (items) => {
        const payload = items?.[CHROME_NATIVE_MASK_KEY];
        if (payload) setRunnerNativeMask(payload);
      });
    } catch {}
  }

  try {
    chrome?.runtime?.onMessage?.addListener?.((message, _sender, sendResponse) => {
      if (message?.type !== NATIVE_MASK_MESSAGE_TYPE) return false;
      setRunnerNativeMask(message.payload || message.nativeChatMask || {});
      sendResponse?.({ ok: true });
      return false;
    });
  } catch {}

  try {
    chrome?.storage?.onChanged?.addListener?.((changes, areaName) => {
      if (areaName !== "local") return;
      const changed = changes?.[CHROME_NATIVE_MASK_KEY];
      if (changed?.newValue) setRunnerNativeMask(changed.newValue);
    });
  } catch {}

  loadChromeNativeMask();
  runPatch();
  scheduleScans("init");

  const observer = new MutationObserver(() => {
    clearTimeout(scanTimer);
    scanTimer = setTimeout(() => { try { runPatch(); } catch {} }, 30);
  });

  function startObserver() {
    if (!document.body) return false;
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });
    return true;
  }

  if (!startObserver()) {
    addEventListener("DOMContentLoaded", () => {
      runPatch();
      scheduleScans("domcontentloaded");
      startObserver();
    }, { once: true });
  }

  setInterval(() => { try { runPatch(); } catch {} }, 5000);
})();
