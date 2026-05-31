(() => {
  if (window.__ACTO_LOVABLE_CONTEXT_CAPTURED__) return;
  window.__ACTO_LOVABLE_CONTEXT_CAPTURED__ = true;

  const MESSAGE_TYPE = "ACTO_LOVABLE_CONTEXT_CAPTURE";
  const SHOW_FLOATING_ICON_MESSAGE_TYPE = "ACTO_SHOW_FLOATING_ICON";
  const HIDE_FLOATING_ICON_MESSAGE_TYPE = "ACTO_HIDE_FLOATING_ICON";
  const OPEN_SIDE_PANEL_MESSAGE_TYPE = "ACTO_OPEN_SIDE_PANEL_MODE";
  const PAGE_TOKEN_MESSAGE_TYPE = "ACTO_LOVABLE_TOKEN_FROM_PAGE";
  const PAGE_TOKEN_MESSAGE_SOURCE = "ACTO_LOVABLE_TOKEN_HOOK";
  const FLOATING_ICON_ID = "acto-floating-panel-icon";
  const FLOATING_ICON_POSITION_KEY = "acto-floating-panel-icon-position";
  const FLOATING_ICON_HTML = '<span class="acto-floating-label"><strong>ACTO</strong><span>IMAGINE</span><span>PROMPT</span><span>CREATE</span></span>';
  const FLOATING_ICON_WIDTH = 56;
  const FLOATING_ICON_HEIGHT = 520;
  const FLOATING_ICON_PADDING = 12;
  const TOKEN_KEYS = [
    "lovable_token",
    "__lovable_token",
    "token",
    "access_token",
    "authToken",
    "sb-access-token",
  ];

  const ID_KEYS = {
    project: ["projectId", "project_id", "currentProjectId", "current_project_id"],
    workspace: ["workspaceId", "workspace_id", "currentWorkspaceId", "current_workspace_id", "workspace", "id", "uuid", "slug"],
    browserSession: ["browserSessionId", "browser_session_id", "x-browser-session-id"],
  };

  let lastUrl = "";

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function getFloatingIconPosition() {
    try {
      return JSON.parse(localStorage.getItem(FLOATING_ICON_POSITION_KEY) || "null");
    } catch {
      return null;
    }
  }

  function setFloatingIconPosition(icon, position) {
    const width = icon.offsetWidth || FLOATING_ICON_WIDTH;
    const height = icon.offsetHeight || Math.min(FLOATING_ICON_HEIGHT, window.innerHeight - FLOATING_ICON_PADDING * 2);
    const maxX = Math.max(FLOATING_ICON_PADDING, window.innerWidth - width - FLOATING_ICON_PADDING);
    const maxY = Math.max(FLOATING_ICON_PADDING, window.innerHeight - height - FLOATING_ICON_PADDING);
    const x = clamp(position?.x ?? maxX, FLOATING_ICON_PADDING, maxX);
    const y = clamp(position?.y ?? 96, FLOATING_ICON_PADDING, maxY);

    icon.style.left = `${x}px`;
    icon.style.top = `${y}px`;
    return { x, y };
  }

  function saveFloatingIconPosition(position) {
    try {
      localStorage.setItem(FLOATING_ICON_POSITION_KEY, JSON.stringify(position));
    } catch {}
  }

  function buildFloatingIcon() {
    const icon = document.createElement("button");
    icon.id = FLOATING_ICON_ID;
    icon.type = "button";
    icon.setAttribute("aria-label", "Abrir ACTO");
    icon.innerHTML = FLOATING_ICON_HTML;

    document.getElementById("acto-floating-panel-icon-style")?.remove();
    const style = document.createElement("style");
    style.id = "acto-floating-panel-icon-style";
    style.textContent = `
      #${FLOATING_ICON_ID} {
        position: fixed !important;
        z-index: 2147483647 !important;
        width: ${FLOATING_ICON_WIDTH}px !important;
        height: min(${FLOATING_ICON_HEIGHT}px, calc(100vh - ${FLOATING_ICON_PADDING * 2}px)) !important;
        border: 1px solid rgba(96, 165, 250, .22) !important;
        border-radius: 22px !important;
        background: linear-gradient(180deg, rgba(2, 6, 23, .94), rgba(2, 10, 31, .9)) !important;
        box-shadow: 0 18px 42px rgba(2, 6, 23, .45), inset 0 0 28px rgba(37, 99, 235, .12) !important;
        color: #dbeafe !important;
        display: block !important;
        padding: 0 !important;
        cursor: grab !important;
        touch-action: none !important;
        user-select: none !important;
        overflow: hidden !important;
      }
      #${FLOATING_ICON_ID}.acto-dragging {
        cursor: grabbing !important;
        transform: scale(1.04) !important;
      }
      #${FLOATING_ICON_ID} .acto-floating-label {
        position: absolute !important;
        left: 50% !important;
        top: 50% !important;
        width: max-content !important;
        max-width: none !important;
        display: inline-flex !important;
        align-items: center !important;
        justify-content: center !important;
        gap: 18px !important;
        transform: translate(-50%, -50%) rotate(90deg) !important;
        transform-origin: center !important;
        color: #f8fbff !important;
        font: 900 11px/1 ui-sans-serif, system-ui, sans-serif !important;
        letter-spacing: .16em !important;
        white-space: nowrap !important;
        text-shadow: 0 1px 10px rgba(15, 23, 42, .9) !important;
        pointer-events: none !important;
      }
      #${FLOATING_ICON_ID} .acto-floating-label strong {
        color: #3b82f6 !important;
        font: inherit !important;
        text-shadow: 0 0 12px rgba(59, 130, 246, .88) !important;
      }
    `;

    document.documentElement.appendChild(style);
    return icon;
  }

  function showFloatingIcon() {
    let icon = document.getElementById(FLOATING_ICON_ID);

    if (!icon) {
      icon = buildFloatingIcon();
      document.documentElement.appendChild(icon);
      setFloatingIconPosition(icon, getFloatingIconPosition());
      attachFloatingIconEvents(icon);
    } else {
      setFloatingIconPosition(icon, getFloatingIconPosition());
    }

    icon.innerHTML = FLOATING_ICON_HTML;
    icon.hidden = false;
  }

  function hideFloatingIcon() {
    const icon = document.getElementById(FLOATING_ICON_ID);

    if (icon) {
      icon.hidden = true;
    }
  }

  function attachFloatingIconEvents(icon) {
    icon.addEventListener("pointerdown", (event) => {
      const rect = icon.getBoundingClientRect();
      const startX = event.clientX;
      const startY = event.clientY;
      const offsetX = startX - rect.left;
      const offsetY = startY - rect.top;
      let moved = false;

      icon.setPointerCapture?.(event.pointerId);
      icon.classList.add("acto-dragging");

      const onMove = (moveEvent) => {
        const dx = Math.abs(moveEvent.clientX - startX);
        const dy = Math.abs(moveEvent.clientY - startY);

        if (dx > 3 || dy > 3) {
          moved = true;
        }

        const position = setFloatingIconPosition(icon, {
          x: moveEvent.clientX - offsetX,
          y: moveEvent.clientY - offsetY,
        });

        saveFloatingIconPosition(position);
      };

      const onUp = (upEvent) => {
        icon.releasePointerCapture?.(upEvent.pointerId);
        icon.classList.remove("acto-dragging");
        icon.removeEventListener("pointermove", onMove);
        icon.removeEventListener("pointerup", onUp);
        icon.removeEventListener("pointercancel", onUp);

        if (!moved) {
          chrome.runtime.sendMessage({ type: OPEN_SIDE_PANEL_MESSAGE_TYPE }, (response) => {
            if (response?.ok && response?.opened) {
              hideFloatingIcon();
            }
          });
        }
      };

      icon.addEventListener("pointermove", onMove);
      icon.addEventListener("pointerup", onUp);
      icon.addEventListener("pointercancel", onUp);
    });
  }

  function isNonEmptyString(value) {
    return typeof value === "string" && value.trim().length > 0;
  }

  function safeJsonParse(value) {
    if (!isNonEmptyString(value)) return null;
    try {
      return JSON.parse(value);
    } catch {
      return null;
    }
  }

  function parseJwtPayload(token) {
    if (!isNonEmptyString(token)) return null;
    const parts = token.split(".");
    if (parts.length !== 3) return null;

    try {
      const payload = parts[1].replace(/-/g, "+").replace(/_/g, "/");
      const padded = payload.padEnd(payload.length + ((4 - (payload.length % 4)) % 4), "=");
      return JSON.parse(atob(padded));
    } catch {
      return null;
    }
  }

  function classifyToken(token) {
    const payload = parseJwtPayload(token);
    if (!payload) return undefined;

    if (payload.access_type === "project" || payload.project_id || payload.projectId || (payload.project_id && payload.sub === payload.project_id)) {
      return "lovable";
    }

    return "auth";
  }

  function extractTokenFromValue(value) {
    if (!isNonEmptyString(value)) return undefined;
    const text = value.trim();

    if (/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(text)) return text;

    const parsed = safeJsonParse(text);
    if (!parsed || typeof parsed !== "object") return undefined;

    const candidates = [
      parsed.access_token,
      parsed.token,
      parsed.authToken,
      parsed.currentSession?.access_token,
      parsed.session?.access_token,
      parsed.data?.access_token,
    ];

    return candidates.find(isNonEmptyString);
  }

  function readTokensFromStorage(storage) {
    const result = {};
    const keys = [...TOKEN_KEYS];

    try {
      for (let index = 0; index < storage.length; index += 1) {
        const key = storage.key(index);
        if (key && !keys.includes(key)) keys.push(key);
      }

      for (const key of keys) {
        const token = extractTokenFromValue(storage.getItem(key));
        const type = classifyToken(token);

        if (type === "lovable" && !result.lovableToken) result.lovableToken = token;
        if (type === "auth" && !result.authToken) result.authToken = token;
        if (result.authToken && result.lovableToken) break;
      }
    } catch {}

    return result;
  }

  function extractProjectIdFromUrl(url) {
    if (!isNonEmptyString(url)) return undefined;
    const match = url.match(/\/projects\/([A-Za-z0-9_-]+)/);
    if (match?.[1]) return match[1];

    try {
      const parsed = new URL(url);
      return parsed.searchParams.get("projectId") || parsed.searchParams.get("project_id") || undefined;
    } catch {
      return undefined;
    }
  }

  function extractWorkspaceIdFromUrl(url) {
    if (!isNonEmptyString(url)) return undefined;
    const match = url.match(/\/workspaces?\/([A-Za-z0-9_-]+)/);
    if (match?.[1]) return sanitizeWorkspaceId(match[1]);

    try {
      const parsed = new URL(url);
      return sanitizeWorkspaceId(parsed.searchParams.get("workspaceId") || parsed.searchParams.get("workspace_id") || undefined);
    } catch {
      return undefined;
    }
  }

  function isWorkspaceLookup(keys) {
    return keys.some((item) => item.toLowerCase().includes("workspace"));
  }

  function isLikelyBrowserSessionId(value) {
    const text = String(value || "").trim();
    if (!text) return false;
    if (/^bsess_[A-Za-z0-9_-]+$/i.test(text)) return true;
    return /^[A-Za-z0-9_-]{16,32}$/.test(text) && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(text) && !/^(ws|workspace)_/i.test(text);
  }

  function isBlockedWorkspaceValue(value) {
    const text = String(value || "").trim().toLowerCase();
    if (!text) return true;
    if (/\s/.test(text) || /^https?:\/\//i.test(text) || /[/?#]/.test(text)) return true;
    return [
      "salvo",
      "detectado",
      "workspace",
      "workspace salvo",
      "workspace: salvo",
      "workspace detectado",
      "workspace: detectado",
      "workspace pendente",
      "pendente",
      "template",
      "templates",
    ].includes(text);
  }

  function isValidWorkspaceId(value, options = {}) {
    const text = String(value || "").trim();
    if (!text || isBlockedWorkspaceValue(text)) return false;
    if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(text)) return true;
    if (/^(ws|workspace)_[A-Za-z0-9_-]{8,}$/i.test(text)) return true;
    if (options.trusted === true && /^[A-Za-z0-9_-]{6,96}$/.test(text) && !/^bsess_/i.test(text)) return true;
    return false;
  }

  function sanitizeWorkspaceId(value, options = {}) {
    const text = String(value || "").trim();
    if (!text) return undefined;
    if (isBlockedWorkspaceValue(text)) return undefined;
    if (options.browserSessionId && text === String(options.browserSessionId).trim()) return undefined;
    if (options.trusted !== true && isLikelyBrowserSessionId(text)) return undefined;
    return isValidWorkspaceId(text, { trusted: options.trusted === true }) ? text : undefined;
  }

  function sanitizeProjectId(value) {
    const text = String(value || "").trim();
    if (!text || /\s/.test(text) || /^https?:\/\//i.test(text) || /[/?#]/.test(text) || text.toLowerCase() === "templates") return undefined;
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(text) ? text : undefined;
  }

  function isBrowserSessionKeyPath(path = []) {
    const joined = path.map((item) => String(item || "").toLowerCase()).join(".");
    return (
      joined.includes("x-browser-session-id") ||
      joined.includes("browsersessionid") ||
      joined.includes("browser_session_id") ||
      (joined.includes("browser") && joined.includes("session"))
    );
  }

  function isProjectKeyPath(path = []) {
    const key = String(path[path.length - 1] || "").toLowerCase();
    const joined = path.map((item) => String(item || "").toLowerCase()).join(".");
    return (
      key === "projectid" ||
      key === "project_id" ||
      key === "currentprojectid" ||
      key === "current_project_id" ||
      joined.includes("projectid") ||
      joined.includes("project_id") ||
      joined.includes("currentprojectid") ||
      joined.includes("current_project_id") ||
      (joined.includes("project") && (key === "id" || key === "uuid"))
    );
  }

  function isWorkspaceKeyPath(path = []) {
    const key = String(path[path.length - 1] || "").toLowerCase();
    const joined = path.map((item) => String(item || "").toLowerCase()).join(".");
    return (
      key === "workspaceid" ||
      key === "workspace_id" ||
      key === "currentworkspaceid" ||
      key === "current_workspace_id" ||
      joined.includes("workspaceid") ||
      joined.includes("workspace_id") ||
      joined.includes("currentworkspaceid") ||
      joined.includes("current_workspace_id") ||
      key === "workspace" ||
      (key === "id" && joined.includes("workspace")) ||
      (key === "uuid" && joined.includes("workspace")) ||
      (key === "slug" && joined.includes("workspace"))
    );
  }

  function collectContextCandidates(value, source = "storage", path = [], output = { projects: [], workspaces: [], browserSessions: [] }, depth = 0) {
    if (value == null || depth > 6) return output;
    if (typeof value === "string" || typeof value === "number") {
      const text = String(value).trim();
      if (!text) return output;
      if (isBrowserSessionKeyPath(path)) output.browserSessions.push({ value: text, source, path: path.join(".") });
      if (isProjectKeyPath(path)) output.projects.push({ value: text, source, path: path.join(".") });
      if (isWorkspaceKeyPath(path)) {
        const pathText = path.join(".");
        output.workspaces.push({ value: text, source, path: pathText, trusted: source !== "url" && !/(^|\.)slug$/i.test(pathText) });
      }
      return output;
    }
    if (Array.isArray(value)) {
      value.forEach((item, index) => collectContextCandidates(item, source, [...path, String(index)], output, depth + 1));
      return output;
    }
    if (typeof value === "object") {
      Object.entries(value).forEach(([key, item]) => collectContextCandidates(item, source, [...path, key], output, depth + 1));
    }
    return output;
  }

  function sanitizeProjectName(value) {
    if (!isNonEmptyString(value)) return undefined;

    const cleaned = value
      .replace(/\s+[-|]\s+Lovable.*$/i, "")
      .replace(/\s+Lovable.*$/i, "")
      .trim();

    if (!cleaned || cleaned.length < 2 || cleaned.length > 80) return undefined;
    if (/^https?:\/\//i.test(cleaned) || cleaned.toLowerCase() === "lovable") return undefined;

    return cleaned;
  }

  function extractProjectNameFromDocument() {
    const metaTitle =
      document.querySelector('meta[property="og:title"]')?.getAttribute("content") ||
      document.querySelector('meta[name="twitter:title"]')?.getAttribute("content");

    return (
      sanitizeProjectName(metaTitle) ||
      sanitizeProjectName(document.title) ||
      sanitizeProjectName(document.querySelector("[data-project-name]")?.textContent) ||
      sanitizeProjectName(document.querySelector("h1")?.textContent)
    );
  }

  function findValueByKeys(value, keys, depth = 0) {
    if (!value || typeof value !== "object" || depth > 4) return undefined;

    for (const key of keys) {
      const found = value[key];
      if (isNonEmptyString(found)) return found;
    }

    for (const item of Array.isArray(value) ? value : Object.values(value)) {
      const found = findValueByKeys(item, keys, depth + 1);
      if (found) return found;
    }

    return undefined;
  }

  function pickFirstSanitized(candidates, sanitizer) {
    for (const candidate of candidates || []) {
      const value = sanitizer(candidate.value, candidate);
      if (value) return { value, source: candidate.source, path: candidate.path };
    }
    return { value: undefined, source: undefined, path: undefined };
  }

  function collectCandidatesFromStorage() {
    const output = { projects: [], workspaces: [], browserSessions: [] };
    for (const storage of [localStorage, sessionStorage]) {
      try {
        for (let index = 0; index < storage.length; index += 1) {
          const key = storage.key(index);
          const raw = key ? storage.getItem(key) : "";
          const parsed = safeJsonParse(raw);
          if (parsed) collectContextCandidates(parsed, "storage", [key || "storage"], output);
          collectContextCandidates(raw, "storage", [key || "storage"], output);
        }
      } catch {}
    }
    return output;
  }

  function collectCandidatesFromNextData() {
    const script = document.getElementById("__NEXT_DATA__");
    const parsed = safeJsonParse(script?.textContent || "");
    return collectContextCandidates(parsed, "next-data");
  }

  function findIdInStorage(keys) {
    const workspaceLookup = isWorkspaceLookup(keys);
    for (const storage of [localStorage, sessionStorage]) {
      try {
        for (let index = 0; index < storage.length; index += 1) {
          const key = storage.key(index);
          const raw = key ? storage.getItem(key) : "";
          const parsed = safeJsonParse(raw);
          const fromJson = findValueByKeys(parsed, keys);
          if (fromJson) {
            if (!workspaceLookup) return fromJson;
            const workspaceId = sanitizeWorkspaceId(fromJson, { trusted: true });
            if (workspaceId) return workspaceId;
          }

          if (workspaceLookup) continue;

          const combined = `${key || ""} ${raw || ""}`;
          const regex = /project[_-]?id["'=:\s]+([A-Za-z0-9_-]+)/i;
          const match = combined.match(regex);
          if (match?.[1]) return match[1];
        }
      } catch {}
    }

    return undefined;
  }

  function findIdInNextData(keys) {
    const script = document.getElementById("__NEXT_DATA__");
    const parsed = safeJsonParse(script?.textContent || "");
    const found = findValueByKeys(parsed, keys);
    return isWorkspaceLookup(keys) ? sanitizeWorkspaceId(found, { trusted: true }) : found;
  }

  function sendContextCapture() {
    const localTokens = readTokensFromStorage(localStorage);
    const sessionTokens = readTokensFromStorage(sessionStorage);
    const href = window.location.href;
    const storageCandidates = collectCandidatesFromStorage();
    const nextDataCandidates = collectCandidatesFromNextData();
    const browserSessionId = pickFirstSanitized(
      [...nextDataCandidates.browserSessions, ...storageCandidates.browserSessions],
      (value) => (isNonEmptyString(value) && !/\s/.test(value) ? String(value).trim() : undefined),
    );
    const workspaceFromUrl = extractWorkspaceIdFromUrl(href);
    const workspaceFromCandidates = pickFirstSanitized(
      [...nextDataCandidates.workspaces, ...storageCandidates.workspaces],
      (value, candidate) => sanitizeWorkspaceId(value, { browserSessionId: browserSessionId.value, trusted: candidate.trusted === true }),
    );
    const projectFromCandidates = pickFirstSanitized(
      [...nextDataCandidates.projects, ...storageCandidates.projects],
      sanitizeProjectId,
    );

    chrome.runtime.sendMessage({
      type: MESSAGE_TYPE,
      payload: {
        authToken: localTokens.authToken || sessionTokens.authToken,
        lovableToken: localTokens.lovableToken || sessionTokens.lovableToken,
        current_lovable_url: href,
        projectName: extractProjectNameFromDocument(),
        projectId:
          sanitizeProjectId(extractProjectIdFromUrl(href)) ||
          projectFromCandidates.value ||
          sanitizeProjectId(findIdInNextData(ID_KEYS.project)) ||
          sanitizeProjectId(findIdInStorage(ID_KEYS.project)),
        projectSource: sanitizeProjectId(extractProjectIdFromUrl(href)) ? "url" : projectFromCandidates.source || "storage",
        workspaceId: workspaceFromCandidates.value || workspaceFromUrl,
        workspaceSource: workspaceFromCandidates.value ? workspaceFromCandidates.source || "storage" : workspaceFromUrl ? "url" : undefined,
        browserSessionId: browserSessionId.value,
        browserSessionSource: browserSessionId.source,
      },
    });
  }

  function injectPageTokenHook() {
    try {
      if (document.documentElement.dataset.actoTokenHookInjected === "1") return;
      document.documentElement.dataset.actoTokenHookInjected = "1";

      const script = document.createElement("script");
      script.src = chrome.runtime.getURL("lovable-token-hook.js");
      script.async = false;
      script.onload = () => script.remove();
      (document.head || document.documentElement).appendChild(script);
    } catch {}
  }

  window.addEventListener("message", (event) => {
    if (event.source !== window) return;
    const data = event.data || {};
    if (data.source !== PAGE_TOKEN_MESSAGE_SOURCE || data.type !== PAGE_TOKEN_MESSAGE_TYPE) return;
    if (
      !isNonEmptyString(data.token) &&
      !isNonEmptyString(data.projectId) &&
      !isNonEmptyString(data.workspaceId) &&
      !isNonEmptyString(data.browserSessionId) &&
      !isNonEmptyString(data.clientGitSha)
    ) {
      return;
    }

    chrome.runtime.sendMessage({
      type: MESSAGE_TYPE,
      payload: {
        token: data.token,
        tokenType: "lovable",
        requestUrl: data.requestUrl || "",
        current_lovable_url: window.location.href,
        projectId: sanitizeProjectId(data.projectId),
        workspaceId: sanitizeWorkspaceId(data.workspaceId, { browserSessionId: data.browserSessionId, trusted: true }),
        workspaceSource: data.workspaceId ? (String(data.captureSource || "").includes("response") ? "response" : "request") : undefined,
        browserSessionId: data.browserSessionId,
        clientGitSha: data.clientGitSha,
        source: String(data.captureSource || "").startsWith("xhr") ? "page-xhr-hook" : "page-fetch-hook",
      },
    });
  });

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message?.type === SHOW_FLOATING_ICON_MESSAGE_TYPE) {
      showFloatingIcon();
      sendResponse({ ok: true });
      return false;
    }

    if (message?.type === HIDE_FLOATING_ICON_MESSAGE_TYPE) {
      hideFloatingIcon();
      sendResponse({ ok: true });
      return false;
    }

    return false;
  });

  function captureIfUrlChanged() {
    if (lastUrl === window.location.href) return;
    lastUrl = window.location.href;
    sendContextCapture();
  }

  injectPageTokenHook();
  sendContextCapture();
  window.addEventListener("focus", sendContextCapture);
  window.addEventListener("popstate", captureIfUrlChanged);
  window.addEventListener("hashchange", captureIfUrlChanged);
  window.setInterval(captureIfUrlChanged, 1500);
  window.setInterval(sendContextCapture, 10000);
})();
