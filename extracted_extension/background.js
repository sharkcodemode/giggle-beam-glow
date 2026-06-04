async function enableSidePanelManualMode() {
  if (!chrome.sidePanel?.setPanelBehavior) return;

  try {
    await chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: false });
  } catch (error) {
    console.warn("Unable to set side panel behavior", error);
  }
}

const LOVABLE_URL_FILTERS = [
  "https://lovable.dev/*",
  "https://api.lovable.dev/*",
  "https://*.lovable.dev/*",
  "https://lovable.app/*",
  "https://*.lovable.app/*",
];

const CONTEXT_MESSAGE_TYPE = "ACTO_LOVABLE_CONTEXT_CAPTURE";
const ACTIVE_CONTEXT_MESSAGE_TYPE = "ACTO_GET_ACTIVE_LOVABLE_CONTEXT";
const COLLAPSE_TO_FLOATING_ICON_MESSAGE_TYPE = "ACTO_COLLAPSE_TO_FLOATING_ICON";
const OPEN_FLOATING_EXTENSION_MODAL_MESSAGE_TYPE = "ACTO_OPEN_FLOATING_EXTENSION_MODAL";
const CLOSE_FLOATING_EXTENSION_MODAL_MESSAGE_TYPE = "ACTO_CLOSE_FLOATING_EXTENSION_MODAL";
const OPEN_SIDE_PANEL_MODE_MESSAGE_TYPE = "ACTO_OPEN_SIDE_PANEL_MODE";
const OPEN_STORE_MODAL_MESSAGE_TYPE = "ACTO_OPEN_STORE_MODAL";
const OPEN_STORE_PAGE_MODAL_MESSAGE_TYPE = "ACTO_OPEN_STORE_PAGE_MODAL_V2";
const CLOSE_STORE_PAGE_MODAL_MESSAGE_TYPE = "ACTO_CLOSE_STORE_PAGE_MODAL_V2";
const STORE_MODAL_PING_MESSAGE_TYPE = "ACTO_STORE_PAGE_MODAL_V2_PING";
const OPEN_NOTES_MODAL_MESSAGE_TYPE = "ACTO_OPEN_NOTES_MODAL";
const OPEN_NOTES_PAGE_MODAL_MESSAGE_TYPE = "ACTO_OPEN_NOTES_PAGE_MODAL";
const CLOSE_NOTES_PAGE_MODAL_MESSAGE_TYPE = "ACTO_CLOSE_NOTES_PAGE_MODAL";
const NOTES_MODAL_PING_MESSAGE_TYPE = "ACTO_NOTES_PAGE_MODAL_PING";
const SHOW_FLOATING_ICON_MESSAGE_TYPE = "ACTO_SHOW_FLOATING_ICON";
const HIDE_FLOATING_ICON_MESSAGE_TYPE = "ACTO_HIDE_FLOATING_ICON";
const PUBLISH_NATIVE_CHAT_MASK_MESSAGE_TYPE = "ACTO_PUBLISH_NATIVE_CHAT_MASK";
const NATIVE_CHAT_MASK_MESSAGE_TYPE = "ACTO_NATIVE_CHAT_MASK";
const NATIVE_CHAT_MASK_STORAGE_KEY = "acto_native_chat_mask";
const MUSIC_MESSAGE_PREFIX = "ACTO_MUSIC_";
const YOUTUBE_SEARCH_MESSAGE_TYPE = "ACTO_YOUTUBE_SEARCH";
const YOUTUBE_PLAY_ON_PAGE_MESSAGE_TYPE = "ACTO_MUSIC_PLAY_ON_LOVABLE_PAGE";
const ACTO_EDGE_ACTION_MESSAGE_TYPE = "ACTO_EDGE_ACTION";
const CREATE_LOVABLE_PROJECT_MESSAGE_TYPE = "ACTO_CREATE_LOVABLE_PROJECT";
const PUBLISH_LOVABLE_PROJECT_MESSAGE_TYPE = "ACTO_PUBLISH_LOVABLE_PROJECT";
const GET_LOVABLE_SKILLS_MESSAGE_TYPE = "ACTO_GET_LOVABLE_SKILLS";
const RESPOND_LOVABLE_TOOL_MESSAGE_TYPE = "ACTO_RESPOND_LOVABLE_TOOL";
const ACTO_V2_URL = "https://bldjotvptyxnnxwvcufk.supabase.co/functions/v1/acto-tier-s";
const ACTO_V2_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJsZGpvdHZwdHl4bm54d3ZjdWZrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAyMTkyOTgsImV4cCI6MjA5NTc5NTI5OH0.eWMbyGO6NdT8YUxaEK2F9k5-hFrQnkJOMK5xnjwTiCs";
const ACTO_LICENSE_KEY = "license_key";
const ACTO_DEVICE_ID_KEY = "device_id";
const ACTO_SESSION_ID_KEY = "acto_session_id";
const ACTO_SESSION_CONTEXT_FINGERPRINT_KEY = "acto_session_context_fingerprint";
const CAPTURED_BROWSER_SESSION_ID_KEY = "captured_browser_session_id";
const DISPLAY_WORKSPACE_STATUS_KEY = "displayWorkspaceStatus";
const ACTO_SESSION_CONTEXT_KEYS = [
  "current_project_id",
  "current_workspace_id",
  "current_lovable_url",
  "captured_lovable_token",
  "captured_auth_token",
  "captured_client_git_sha",
];
const CURRENT_WORKSPACE_SOURCE_KEY = "current_workspace_source";
const YOUTUBE_HOME_URL = "https://www.youtube.com/";
const YOUTUBE_WINDOW_KEY = "youtubeWindowId";
const YOUTUBE_TAB_KEY = "youtubeTabId";
const LAST_YOUTUBE_URL_KEY = "lastYouTubeUrl";
const SELECTED_VIDEO_ID_KEY = "selectedVideoId";
const LAST_AUTO_MINI_VIDEO_ID_KEY = "lastAutoMiniVideoId";
const ACTO_PLAYER_BASE_URL = globalThis.__ACTO_PLAYER_BASE_URL || "https://acto-lov.online/player";
const AUTO_FOCUS_SEARCH_ON_OPEN = true;
const AUTO_OPEN_MINI_ON_RESULT_CLICK = false;
const AUTO_OPEN_YOUTUBE_IF_NO_API = true;
const AUTO_OPEN_MINI_ON_YOUTUBE_DETECT = false;
let activeTabId;
let activeTabSyncTimer;
const ACTIVE_TAB_SYNC_DEBOUNCE_MS = 800;

function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function isLovableUrl(url) {
  try {
    const hostname = new URL(url).hostname.toLowerCase();
    return (
      hostname === "lovable.dev" ||
      hostname.endsWith(".lovable.dev") ||
      hostname === "lovable.app" ||
      hostname.endsWith(".lovable.app")
    );
  } catch {
    return false;
  }
}

function isLovableDevUrl(url) {
  try {
    const hostname = new URL(url).hostname.toLowerCase();
    return hostname === "lovable.dev" || hostname.endsWith(".lovable.dev");
  } catch {
    return false;
  }
}

function isValidProjectId(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(value || "").trim());
}

function isTemplateLovableUrl(url) {
  if (!isNonEmptyString(url)) return false;
  try {
    const parsed = new URL(url);
    return /(^|\/)templates(?:[/?#]|$)/i.test(parsed.pathname);
  } catch {
    return /(^|\/)templates(?:[/?#]|$)/i.test(url);
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

function isProjectScopedLovableRequest(url) {
  if (!isNonEmptyString(url) || !isLovableUrl(url)) return false;

  try {
    const parsed = new URL(url);
    return /\/projects\/[^/?#]+(?:[/?#]|$)/.test(parsed.pathname);
  } catch {
    return /\/projects\/[^/?#]+(?:[/?#]|$)/.test(url);
  }
}

function classifyTokenForContext(token, context = {}) {
  const explicitType = context.tokenType || classifyToken(token);
  if (explicitType === "lovable") return "lovable";

  const requestUrl = context.requestUrl || context.current_lovable_url || "";
  if (isProjectScopedLovableRequest(requestUrl)) return "lovable";

  return explicitType || "auth";
}

function logTokenCapture(stage, details = {}) {
  console.info("[ACTO token capture]", stage, details);
}

function tokenFromAuthorization(value) {
  if (!isNonEmptyString(value)) return undefined;
  const match = value.trim().match(/^Bearer\s+(.+)$/i);
  return (match?.[1] || value).trim();
}

function safeUrlPath(value) {
  if (!isNonEmptyString(value)) return "";
  try {
    return new URL(value).pathname;
  } catch {
    return String(value).slice(0, 80);
  }
}

function extractProjectIdFromUrl(url) {
  if (!isNonEmptyString(url)) return undefined;
  const match = url.match(/\/projects\/([A-Za-z0-9_-]+)/);
  if (match?.[1]) return isValidProjectId(match[1]) ? match[1] : undefined;

  try {
    const parsed = new URL(url);
    const projectId = parsed.searchParams.get("projectId") || parsed.searchParams.get("project_id") || undefined;
    return isValidProjectId(projectId) ? projectId : undefined;
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

function isLikelyBrowserSessionId(value) {
  const text = String(value || "").trim();
  if (!text) return false;
  if (/^bsess_[A-Za-z0-9_-]+$/i.test(text)) return true;
  return /^[A-Za-z0-9_-]{16,32}$/.test(text) && !isValidProjectId(text) && !/^(ws|workspace)_/i.test(text);
}

function hasUnsafeIdCharacters(value) {
  const text = String(value || "").trim();
  return !text || /\s/.test(text) || /^https?:\/\//i.test(text) || /[/?#]/.test(text);
}

function isBlockedWorkspaceValue(value) {
  const text = String(value || "").trim().toLowerCase();
  if (!text) return true;
  if (hasUnsafeIdCharacters(text)) return true;
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
  if (isValidProjectId(text)) return true;
  if (/^(ws|workspace)_[A-Za-z0-9_-]{8,}$/i.test(text)) return true;
  if (options.trusted === true && /^[A-Za-z0-9_-]{6,96}$/.test(text) && !/^bsess_/i.test(text)) return true;
  return false;
}

function sanitizeWorkspaceId(value, context = {}) {
  const text = String(value || "").trim();
  if (!text) return undefined;
  if (isBlockedWorkspaceValue(text)) return undefined;
  if (context.browserSessionId && text === String(context.browserSessionId).trim()) return undefined;
  if (context.trusted !== true && isLikelyBrowserSessionId(text)) return undefined;
  return isValidWorkspaceId(text, { trusted: context.trusted === true }) ? text : undefined;
}

function sanitizeProjectId(value) {
  const text = String(value || "").trim();
  if (hasUnsafeIdCharacters(text) || text.toLowerCase() === "templates") return undefined;
  return isValidProjectId(text) ? text : undefined;
}

function normalizeContextPrimitive(value) {
  if (typeof value === "string" || typeof value === "number") return String(value).trim();
  return undefined;
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
    key === "uuid" && joined.includes("workspace") ||
    key === "id" && joined.includes("workspace") ||
    key === "slug" && joined.includes("workspace")
  );
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

function collectContextCandidates(value, source = "unknown", path = [], output = { projects: [], workspaces: [], browserSessions: [] }, depth = 0) {
  if (value == null || depth > 6) return output;

  const primitive = normalizeContextPrimitive(value);
  if (primitive) {
    if (isBrowserSessionKeyPath(path)) output.browserSessions.push({ value: primitive, source, path: path.join(".") });
    if (isProjectKeyPath(path)) output.projects.push({ value: primitive, source, path: path.join(".") });
    if (isWorkspaceKeyPath(path)) {
      const pathText = path.join(".");
      output.workspaces.push({ value: primitive, source, path: pathText, trusted: source !== "url" && !/(^|\.)slug$/i.test(pathText) });
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

function safeJsonParse(value) {
  if (!isNonEmptyString(value)) return undefined;
  try {
    return JSON.parse(value);
  } catch {
    return undefined;
  }
}

function decodeRequestBody(details = {}) {
  const requestBody = details.requestBody || {};
  if (requestBody.formData && typeof requestBody.formData === "object") return requestBody.formData;
  const raw = Array.isArray(requestBody.raw) ? requestBody.raw : [];
  const decoder = typeof TextDecoder !== "undefined" ? new TextDecoder("utf-8") : null;
  const chunks = raw
    .map((item) => {
      try {
        if (!item?.bytes || !decoder) return "";
        return decoder.decode(item.bytes);
      } catch {
        return "";
      }
    })
    .filter(Boolean);
  const text = chunks.join("");
  return safeJsonParse(text) || undefined;
}

function maskContextId(value) {
  const text = String(value || "").trim();
  if (!text) return "";
  if (text.length <= 12) return `${text.slice(0, 4)}...`;
  return `${text.slice(0, 8)}...${text.slice(-4)}`;
}

function logContextCapture(details = {}) {
  console.info("[ACTO context]", {
    projectId: maskContextId(details.projectId),
    workspaceId: maskContextId(details.workspaceId) || "pending",
    browserSessionId: maskContextId(details.browserSessionId),
    source: details.source || "unknown",
  });
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

function shouldAcceptTabCapture(tabId) {
  if (typeof tabId !== "number" || tabId < 0) return true;
  if (typeof activeTabId !== "number") return true;
  return tabId === activeTabId;
}

function tokenMarker(value) {
  const text = String(value || "");
  if (!text) return "";
  let hash = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `${text.length}:${(hash >>> 0).toString(36)}`;
}

function buildSessionContextFingerprint(context = {}) {
  const activeProjectId = isValidProjectId(context.current_project_id) ? context.current_project_id : "";
  const urlProjectId = extractProjectIdFromUrl(context.current_lovable_url);

  return [
    urlProjectId || activeProjectId,
    tokenMarker(context.captured_lovable_token),
    tokenMarker(context.captured_auth_token),
    context.captured_client_git_sha || "",
  ].join("|");
}

function hasSessionRelevantUpdate(updates = {}) {
  return ACTO_SESSION_CONTEXT_KEYS
    .filter((key) => key !== "current_workspace_id")
    .some((key) => Object.prototype.hasOwnProperty.call(updates, key));
}

async function invalidateSessionIfContextChanged(updates = {}) {
  if (!hasSessionRelevantUpdate(updates)) return;

  const previous = await storageGet([
    ...ACTO_SESSION_CONTEXT_KEYS,
    ACTO_SESSION_ID_KEY,
    ACTO_SESSION_CONTEXT_FINGERPRINT_KEY,
  ]);
  const next = { ...previous, ...updates };
  const nextFingerprint = buildSessionContextFingerprint(next);
  const storedFingerprint = previous[ACTO_SESSION_CONTEXT_FINGERPRINT_KEY] || "";
  const hasSession = isNonEmptyString(previous[ACTO_SESSION_ID_KEY]);

  if (!hasSession) return;
  if (!storedFingerprint || storedFingerprint !== nextFingerprint) {
    await storageRemove([ACTO_SESSION_ID_KEY, ACTO_SESSION_CONTEXT_FINGERPRINT_KEY]);
    console.info("[ACTO session] context changed, session invalidated", {
      projectChanged: previous.current_project_id !== next.current_project_id,
      urlChanged: previous.current_lovable_url !== next.current_lovable_url,
      tokenChanged: tokenMarker(previous.captured_lovable_token) !== tokenMarker(next.captured_lovable_token),
      authChanged: tokenMarker(previous.captured_auth_token) !== tokenMarker(next.captured_auth_token),
      gitShaChanged: previous.captured_client_git_sha !== next.captured_client_git_sha,
    });
  }
}

async function getStoredLovableContext() {
  return storageGet([
    ...ACTO_SESSION_CONTEXT_KEYS,
    "current_project_name",
    CAPTURED_BROWSER_SESSION_ID_KEY,
    DISPLAY_WORKSPACE_STATUS_KEY,
    "last_context_capture_at",
    ACTO_SESSION_ID_KEY,
    ACTO_SESSION_CONTEXT_FINGERPRINT_KEY,
  ]);
}

async function syncActiveLovableTab() {
  const tab = await new Promise((resolve) => {
    chrome.tabs?.query?.({ active: true, lastFocusedWindow: true }, (tabs) => {
      if (chrome.runtime.lastError) {
        resolve(undefined);
        return;
      }
      resolve(tabs?.[0]);
    });
  });

  if (tab?.id) activeTabId = tab.id;
  if (tab?.url && isLovableUrl(tab.url)) await persistLovableContext({ current_lovable_url: tab.url, tabTitle: tab.title });
  return getStoredLovableContext();
}

async function getActiveTab() {
  return new Promise((resolve) => {
    chrome.tabs?.query?.({ active: true, lastFocusedWindow: true }, (tabs) => {
      if (chrome.runtime.lastError) {
        resolve(undefined);
        return;
      }

      resolve(tabs?.[0]);
    });
  });
}

function sendTabMessage(tabId, message) {
  return new Promise((resolve) => {
    if (typeof tabId !== "number") {
      resolve(false);
      return;
    }

    chrome.tabs?.sendMessage?.(tabId, message, () => {
      resolve(!chrome.runtime.lastError);
    });
  });
}

function sendTabMessageWithResponse(tabId, message) {
  return new Promise((resolve, reject) => {
    if (typeof tabId !== "number") {
      reject(new Error("Aba Lovable nao encontrada."));
      return;
    }

    chrome.tabs?.sendMessage?.(tabId, message, (response) => {
      const error = chrome.runtime.lastError;
      if (error) {
        reject(new Error(error.message || "Falha ao comunicar com a aba."));
        return;
      }

      resolve(response || {});
    });
  });
}

function injectScriptFile(tabId, file) {
  return new Promise((resolve, reject) => {
    if (typeof tabId !== "number" || !chrome.scripting?.executeScript) {
      reject(new Error("Injecao de script indisponivel."));
      return;
    }

    chrome.scripting.executeScript({ target: { tabId }, files: [file] }, () => {
      const error = chrome.runtime.lastError;
      if (error) {
        reject(new Error(error.message || "Falha ao injetar player."));
        return;
      }

      resolve(true);
    });
  });
}

async function ensureYouTubePagePlayer(tabId) {
  const ping = { type: "ACTO_YOUTUBE_PAGE_PLAYER_PING" };
  try {
    const response = await sendTabMessageWithResponse(tabId, ping);
    if (response?.ok) return true;
  } catch {}

  await injectScriptFile(tabId, "acto-youtube-page-player.js");

  const response = await sendTabMessageWithResponse(tabId, ping);
  return response?.ok === true;
}

async function playYouTubeOnLovablePage(message = {}) {
  const tab = await getActiveTab();
  if (!tab?.id || !isLovableUrl(tab.url)) {
    throw new Error("Abra uma aba do Lovable para tocar o video.");
  }

  activeTabId = tab.id;
  const ready = await ensureYouTubePagePlayer(tab.id);
  if (!ready) throw new Error("Nao consegui iniciar o player na pagina Lovable.");

  const response = await sendTabMessageWithResponse(tab.id, {
    type: "ACTO_YOUTUBE_PAGE_PLAYER",
    action: message.action || "play",
    result: message.result,
  });

  if (!response?.ok) throw new Error(response?.error || "Falha ao abrir player na pagina.");
  return response;
}

async function closeFloatingExtensionModalOnTab(tab = undefined) {
  const targetTab = tab || (await getActiveTab());
  if (!targetTab?.id || !isLovableUrl(targetTab.url)) return false;

  return sendTabMessage(targetTab.id, { type: CLOSE_FLOATING_EXTENSION_MODAL_MESSAGE_TYPE });
}

async function openSidePanelForTab(tab = undefined) {
  const targetTab = tab || (await getActiveTab());
  if (!chrome.sidePanel?.open || typeof targetTab?.windowId !== "number") return false;

  try {
    if (typeof targetTab.id === "number") {
      await chrome.sidePanel.open({ tabId: targetTab.id });
    } else {
      await chrome.sidePanel.open({ windowId: targetTab.windowId });
    }
    return true;
  } catch (error) {
    console.warn("Unable to open ACTO side panel", error);
    return false;
  }
}

async function closeSidePanelForTab(tab = undefined) {
  const targetTab = tab || (await getActiveTab());
  if (!chrome.sidePanel?.close || typeof targetTab?.windowId !== "number") return false;

  try {
    await chrome.sidePanel.close({ windowId: targetTab.windowId });
    return true;
  } catch (error) {
    console.warn("Unable to close ACTO side panel", error);
    return false;
  }
}

async function moveFloatingModalToSidePanel(tab = undefined) {
  const targetTab = tab || (await getActiveTab());
  if (!targetTab?.id || !isLovableUrl(targetTab.url)) return false;

  const opened = await openSidePanelForTab(targetTab);
  if (opened) await closeFloatingExtensionModalOnTab(targetTab);
  return opened;
}

async function ensureStorePageModal(tabId) {
  const ping = { type: STORE_MODAL_PING_MESSAGE_TYPE };
  try {
    const response = await sendTabMessageWithResponse(tabId, ping);
    if (response?.ok) return true;
  } catch {}

  await injectScriptFile(tabId, "acto-store-page-modal.js");

  const response = await sendTabMessageWithResponse(tabId, ping);
  return response?.ok === true;
}

async function openStoreModalOnTab(tab = undefined) {
  const targetTab = tab?.id && isLovableUrl(tab.url) ? tab : await getActiveTab();
  if (!targetTab?.id || !isLovableUrl(targetTab.url)) {
    return false;
  }

  activeTabId = targetTab.id;
  const ready = await ensureStorePageModal(targetTab.id);
  if (!ready) return false;

  const response = await sendTabMessageWithResponse(targetTab.id, {
    type: OPEN_STORE_PAGE_MODAL_MESSAGE_TYPE,
  });

  return response?.ok === true;
}

async function ensureNotesPageModal(tabId) {
  const ping = { type: NOTES_MODAL_PING_MESSAGE_TYPE };
  try {
    const response = await sendTabMessageWithResponse(tabId, ping);
    if (response?.ok) return true;
  } catch {}

  await injectScriptFile(tabId, "acto-notes-page-modal.js");

  const response = await sendTabMessageWithResponse(tabId, ping);
  return response?.ok === true;
}

async function openNotesModalOnTab(tab = undefined) {
  const targetTab = tab?.id && isLovableUrl(tab.url) ? tab : await getActiveTab();
  if (!targetTab?.id || !isLovableUrl(targetTab.url)) {
    return false;
  }

  activeTabId = targetTab.id;
  const ready = await ensureNotesPageModal(targetTab.id);
  if (!ready) return false;

  const response = await sendTabMessageWithResponse(targetTab.id, {
    type: OPEN_NOTES_PAGE_MODAL_MESSAGE_TYPE,
  });

  return response?.ok === true;
}

function injectFloatingIconInPage() {
  const ICON_ID = "acto-floating-panel-icon";
  const STYLE_ID = "acto-floating-panel-icon-style";
  const POSITION_KEY = "acto-floating-panel-icon-position";
  const HTML = '<span class="acto-floating-label"><strong>ACTO</strong><span>IMAGINE</span><span>PROMPT</span><span>CREATE</span></span>';
  const WIDTH = 56;
  const HEIGHT = 520;
  const PADDING = 12;
  const OPEN_MESSAGE_TYPE = "ACTO_OPEN_SIDE_PANEL_MODE";

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function readPosition() {
    try {
      return JSON.parse(localStorage.getItem(POSITION_KEY) || "null");
    } catch {
      return null;
    }
  }

  function place(icon, position) {
    const width = icon.offsetWidth || WIDTH;
    const height = icon.offsetHeight || Math.min(HEIGHT, window.innerHeight - PADDING * 2);
    const maxX = Math.max(PADDING, window.innerWidth - width - PADDING);
    const maxY = Math.max(PADDING, window.innerHeight - height - PADDING);
    const x = clamp(position?.x ?? maxX, PADDING, maxX);
    const y = clamp(position?.y ?? 96, PADDING, maxY);

    icon.style.left = `${x}px`;
    icon.style.top = `${y}px`;
    return { x, y };
  }

  function save(position) {
    try {
      localStorage.setItem(POSITION_KEY, JSON.stringify(position));
    } catch {}
  }

  function ensureStyle() {
    document.getElementById(STYLE_ID)?.remove();

    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
      #${ICON_ID} {
        position: fixed !important;
        z-index: 2147483647 !important;
        width: ${WIDTH}px !important;
        height: min(${HEIGHT}px, calc(100vh - ${PADDING * 2}px)) !important;
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
      #${ICON_ID}.acto-dragging {
        cursor: grabbing !important;
        transform: scale(1.04) !important;
      }
      #${ICON_ID} .acto-floating-label {
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
      #${ICON_ID} .acto-floating-label strong {
        color: #3b82f6 !important;
        font: inherit !important;
        text-shadow: 0 0 12px rgba(59, 130, 246, .88) !important;
      }
    `;
    document.documentElement.appendChild(style);
  }

  function attachEvents(icon) {
    if (icon.dataset.actoFloatingPageReady === "true") return;

    icon.dataset.actoFloatingPageReady = "true";
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

        if (dx > 3 || dy > 3) moved = true;

        const position = place(icon, {
          x: moveEvent.clientX - offsetX,
          y: moveEvent.clientY - offsetY,
        });

        save(position);
      };

      const onUp = (upEvent) => {
        icon.releasePointerCapture?.(upEvent.pointerId);
        icon.classList.remove("acto-dragging");
        icon.removeEventListener("pointermove", onMove);
        icon.removeEventListener("pointerup", onUp);
        icon.removeEventListener("pointercancel", onUp);

        if (!moved) {
          chrome.runtime.sendMessage({ type: OPEN_MESSAGE_TYPE }, (response) => {
            if (response?.ok && response?.opened) icon.hidden = true;
          });
        }
      };

      icon.addEventListener("pointermove", onMove);
      icon.addEventListener("pointerup", onUp);
      icon.addEventListener("pointercancel", onUp);
    });
  }

  ensureStyle();

  let icon = document.getElementById(ICON_ID);
  if (!icon) {
    icon = document.createElement("button");
    icon.id = ICON_ID;
    icon.type = "button";
    icon.setAttribute("aria-label", "Abrir ACTO");
    document.documentElement.appendChild(icon);
  }

  icon.innerHTML = HTML;
  place(icon, readPosition());
  attachEvents(icon);
  icon.hidden = false;
  return true;
}

async function showFloatingIconViaScripting(tabId) {
  if (!chrome.scripting?.executeScript || typeof tabId !== "number") return false;

  try {
    const results = await chrome.scripting.executeScript({
      target: { tabId },
      func: injectFloatingIconInPage,
    });

    return results?.some((item) => item.result === true) || false;
  } catch (error) {
    console.warn("Unable to inject floating ACTO icon", error);
    return false;
  }
}

async function showFloatingIconOnTab(tab) {
  if (!tab?.id || !isLovableUrl(tab.url)) return false;

  const contentScriptShown = await sendTabMessage(tab.id, { type: SHOW_FLOATING_ICON_MESSAGE_TYPE });
  if (contentScriptShown) return true;

  return showFloatingIconViaScripting(tab.id);
}

async function collapseToFloatingIcon() {
  const tab = await getActiveTab();
  const iconShown = await showFloatingIconOnTab(tab);

  if (!iconShown) {
    return false;
  }

  if (tab?.id) {
    await sendTabMessage(tab.id, { type: CLOSE_FLOATING_EXTENSION_MODAL_MESSAGE_TYPE });
  }

  await closeSidePanelForTab(tab);

  return true;
}

async function openFromFloatingIcon(sender) {
  const tab = sender?.tab || await getActiveTab();
  const opened = await openSidePanelForTab(tab);

  if (tab?.id) {
    await sendTabMessage(tab.id, { type: HIDE_FLOATING_ICON_MESSAGE_TYPE });
  }

  return opened;
}

async function persistLovableContext(context = {}) {
  const updates = {};
  const removals = [];
  const requestUrl = context.requestUrl || context.current_lovable_url || "";
  const currentUrl = context.current_lovable_url || "";
  const token = context.token || context.authorizationToken;
  const stored = await storageGet(["current_project_id", "current_workspace_id", CAPTURED_BROWSER_SESSION_ID_KEY, CURRENT_WORKSPACE_SOURCE_KEY]);
  const payloadCandidates = collectContextCandidates(context.payload || context.requestPayload || context.body || {}, context.source || "payload");
  const explicitCandidates = collectContextCandidates(
    {
      projectId: context.projectId,
      current_project_id: context.current_project_id,
      workspaceId: context.workspaceId,
      current_workspace_id: context.current_workspace_id,
      browserSessionId: context.browserSessionId,
    },
    context.source || "explicit",
  );

  if (isNonEmptyString(token)) {
    const type = classifyTokenForContext(token, context);
    if (type === "lovable") updates.captured_lovable_token = token.trim();
    else updates.captured_auth_token = token.trim();
  }

  if (isNonEmptyString(context.authToken)) updates.captured_auth_token = context.authToken.trim();
  if (isNonEmptyString(context.lovableToken)) updates.captured_lovable_token = context.lovableToken.trim();
  if (isNonEmptyString(context.clientGitSha)) updates.captured_client_git_sha = context.clientGitSha.trim();
  if (isNonEmptyString(context.browserSessionId)) updates[CAPTURED_BROWSER_SESSION_ID_KEY] = context.browserSessionId.trim();

  const projectName = sanitizeProjectName(context.projectName || context.current_project_name || context.tabTitle);
  const projectCandidates = [
    context.projectId,
    context.current_project_id,
    extractProjectIdFromUrl(currentUrl),
    extractProjectIdFromUrl(requestUrl),
    ...explicitCandidates.projects.map((candidate) => candidate.value),
    ...payloadCandidates.projects.map((candidate) => candidate.value),
  ];
  const projectId = projectCandidates.map(sanitizeProjectId).find(isNonEmptyString);
  const browserSessionCandidates = [
    context.browserSessionId,
    ...explicitCandidates.browserSessions.map((candidate) => candidate.value),
    ...payloadCandidates.browserSessions.map((candidate) => candidate.value),
  ].filter(isNonEmptyString);
  const browserSessionId = browserSessionCandidates[0] || updates[CAPTURED_BROWSER_SESSION_ID_KEY] || stored[CAPTURED_BROWSER_SESSION_ID_KEY] || "";
  const trustedStoredSources = ["response", "request", "storage", "next-data", "payload", "explicit", "create-project-response"];
  const storedWorkspaceTrusted = trustedStoredSources.includes(String(stored[CURRENT_WORKSPACE_SOURCE_KEY] || "").toLowerCase());
  const storedWorkspaceId = sanitizeWorkspaceId(stored.current_workspace_id, { browserSessionId, trusted: storedWorkspaceTrusted });
  const workspaceCandidateRecords = [
    { value: context.workspaceId, source: context.workspaceSource || context.source || "explicit", trusted: context.workspaceSource !== "url" },
    { value: context.current_workspace_id, source: context.source || "explicit", trusted: context.source !== "url" },
    { value: extractWorkspaceIdFromUrl(currentUrl), source: "url", trusted: false },
    { value: extractWorkspaceIdFromUrl(requestUrl), source: "url", trusted: false },
    ...explicitCandidates.workspaces,
    ...payloadCandidates.workspaces,
  ].filter((candidate) => isNonEmptyString(candidate.value));
  const workspaceMatch = workspaceCandidateRecords
    .map((candidate) => ({
      candidate,
      value: sanitizeWorkspaceId(candidate.value, { browserSessionId, trusted: candidate.trusted === true }),
    }))
    .find((item) => isNonEmptyString(item.value));
  const workspaceId = workspaceMatch?.value;
  const browserSessionCandidate =
    browserSessionCandidates.find(isNonEmptyString) ||
    workspaceCandidateRecords.find((candidate) => isLikelyBrowserSessionId(candidate.value))?.value;

  if (isNonEmptyString(browserSessionCandidate)) {
    updates[CAPTURED_BROWSER_SESSION_ID_KEY] = String(browserSessionCandidate).trim();
  }

  if (isNonEmptyString(projectName)) updates.current_project_name = projectName.trim();
  if (isValidProjectId(projectId)) updates.current_project_id = projectId.trim();
  if (isNonEmptyString(workspaceId)) {
    updates.current_workspace_id = workspaceId.trim();
    updates[CURRENT_WORKSPACE_SOURCE_KEY] = workspaceMatch?.candidate?.source || context.workspaceSource || context.source || "context";
    updates[DISPLAY_WORKSPACE_STATUS_KEY] = "Workspace capturado";
  } else {
    const projectChanged =
      isValidProjectId(projectId) && isValidProjectId(stored.current_project_id) && projectId !== stored.current_project_id;
    const storedWorkspaceInvalid =
      isNonEmptyString(stored.current_workspace_id) && !storedWorkspaceId;
    if (projectChanged || storedWorkspaceInvalid) {
      removals.push("current_workspace_id");
      removals.push(CURRENT_WORKSPACE_SOURCE_KEY);
    }
    updates[DISPLAY_WORKSPACE_STATUS_KEY] = storedWorkspaceId && !projectChanged ? "Workspace capturado" : "Workspace pendente";
  }
  if (isNonEmptyString(currentUrl) && isLovableUrl(currentUrl)) updates.current_lovable_url = currentUrl.trim();

  if (Object.keys(updates).length > 0 || removals.length > 0) {
    await invalidateSessionIfContextChanged(updates);
    if (removals.length > 0) await storageRemove(removals);
    updates.last_context_capture_at = new Date().toISOString();
    if (updates.captured_lovable_token) {
      logTokenCapture("token detected", {
        source: context.source || "context",
        requestUrl: safeUrlPath(requestUrl),
        tokenLength: updates.captured_lovable_token.length,
      });
    }
    await storageSet(updates);
    if (updates.captured_lovable_token) logTokenCapture("token persisted", { key: "captured_lovable_token" });
    logContextCapture({
      projectId: updates.current_project_id || stored.current_project_id,
      workspaceId: updates.current_workspace_id || (!removals.includes("current_workspace_id") ? stored.current_workspace_id : ""),
      browserSessionId: updates[CAPTURED_BROWSER_SESSION_ID_KEY] || stored[CAPTURED_BROWSER_SESSION_ID_KEY],
      source: context.source || "context",
    });
  }
}

async function sanitizeStoredWorkspaceContext() {
  const stored = await storageGet(["current_workspace_id", CAPTURED_BROWSER_SESSION_ID_KEY, CURRENT_WORKSPACE_SOURCE_KEY]);
  const browserSessionId = stored[CAPTURED_BROWSER_SESSION_ID_KEY] || "";
  const currentWorkspaceId = stored.current_workspace_id || "";
  const trustedStoredSources = ["response", "request", "storage", "next-data", "payload", "explicit", "create-project-response"];
  const trusted = trustedStoredSources.includes(String(stored[CURRENT_WORKSPACE_SOURCE_KEY] || "").toLowerCase());
  const workspaceId = sanitizeWorkspaceId(currentWorkspaceId, { browserSessionId, trusted });
  const updates = {};
  const removals = [];

  if (isNonEmptyString(currentWorkspaceId) && !workspaceId) {
    if (isLikelyBrowserSessionId(currentWorkspaceId) && !browserSessionId) {
      updates[CAPTURED_BROWSER_SESSION_ID_KEY] = currentWorkspaceId.trim();
    }
    removals.push("current_workspace_id");
    removals.push(CURRENT_WORKSPACE_SOURCE_KEY);
    updates[DISPLAY_WORKSPACE_STATUS_KEY] = "Workspace pendente";
  } else if (workspaceId) {
    updates[DISPLAY_WORKSPACE_STATUS_KEY] = "Workspace capturado";
  }

  if (removals.length > 0) await storageRemove(removals);
  if (Object.keys(updates).length > 0) await storageSet(updates);
}

function storageGet(keys) {
  return new Promise((resolve) => {
    chrome.storage.local.get(keys, (items) => resolve(items || {}));
  });
}

function storageSet(items) {
  return new Promise((resolve) => {
    chrome.storage.local.set(items, () => resolve());
  });
}

function storageRemove(keys) {
  return new Promise((resolve) => {
    chrome.storage.local.remove(keys, () => resolve());
  });
}

function isExtensionPageSender(sender = {}) {
  if (isNonEmptyString(sender.url)) return sender.url.startsWith(`chrome-extension://${chrome.runtime.id}/`);
  return sender.id === chrome.runtime.id && !sender.tab;
}

function actoV2Headers() {
  return {
    apikey: ACTO_V2_ANON_KEY,
    Authorization: `Bearer ${ACTO_V2_ANON_KEY}`,
    "Content-Type": "application/json",
  };
}

function actoV2MultipartHeaders() {
  return {
    apikey: ACTO_V2_ANON_KEY,
    Authorization: `Bearer ${ACTO_V2_ANON_KEY}`,
  };
}

function actoRandomId() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return `acto-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
}

async function getOrCreateActoDeviceId(existingValue) {
  const existing = String(existingValue || "").trim();
  if (existing) return existing;

  const next = actoRandomId();
  await storageSet({ [ACTO_DEVICE_ID_KEY]: next });
  return next;
}

function safeResponseBody(value) {
  const text = String(value || "");
  return text.length > 1200 ? `${text.slice(0, 1200)}...` : text;
}

function parseJsonBody(value) {
  if (!isNonEmptyString(value)) return {};
  try {
    return JSON.parse(value);
  } catch {
    return {};
  }
}

function edgeActionFromMessage(message = {}) {
  if (message.type === "acto.uploadInit") return "upload_init";
  if (message.type === "acto.uploadFinalize") return "upload_finalize";
  if (message.type === "acto.sendMessage") return "send_message";
  return message.action;
}

async function callActoEdge(action, params = {}, contextOverride = {}) {
  const stored = await storageGet([
    ACTO_LICENSE_KEY,
    ACTO_DEVICE_ID_KEY,
    "current_project_id",
    "current_lovable_url",
    "captured_auth_token",
    "captured_lovable_token",
    "captured_client_git_sha",
    CAPTURED_BROWSER_SESSION_ID_KEY,
  ]);

  const license = String(contextOverride.license || stored[ACTO_LICENSE_KEY] || "").trim();
  const deviceId = await getOrCreateActoDeviceId(contextOverride.device_id || stored[ACTO_DEVICE_ID_KEY]);
  const projectId =
    sanitizeProjectId(params.project_id) ||
    sanitizeProjectId(contextOverride.project_id) ||
    sanitizeProjectId(contextOverride.captured?.project_id) ||
    sanitizeProjectId(extractProjectIdFromUrl(stored.current_lovable_url)) ||
    sanitizeProjectId(stored.current_project_id) ||
    "";
  const captured = {
    auth_token: contextOverride.captured?.auth_token || stored.captured_auth_token || "",
    lovable_token: contextOverride.captured?.lovable_token || stored.captured_lovable_token || "",
    client_git_sha: contextOverride.captured?.client_git_sha || stored.captured_client_git_sha || "",
    browser_session_id:
      contextOverride.captured?.browser_session_id || stored[CAPTURED_BROWSER_SESSION_ID_KEY] || "",
    project_id: projectId,
    device_id: deviceId,
  };
  const actionParams = { ...(params || {}) };

  if (projectId && !actionParams.project_id) actionParams.project_id = projectId;

  const payload = {
    action,
    license,
    license_id: license,
    device_id: deviceId,
    project_id: projectId,
    params: actionParams,
    captured,
    tokens: {
      auth_token: captured.auth_token,
      lovable_token: captured.lovable_token,
      client_git_sha: captured.client_git_sha,
      browser_session_id: captured.browser_session_id,
    },
    ts: Date.now(),
    nonce: actoRandomId(),
  };

  if (action === "send_message") {
    const fileRefs = Array.isArray(actionParams.file_refs) ? actionParams.file_refs : [];
    const filesInline = Array.isArray(actionParams.files_inline) ? actionParams.files_inline : [];
    payload.message = String(actionParams.message || "").trim() || (fileRefs.length || filesInline.length ? "Arquivo anexado." : "");
    if (fileRefs.length) payload.file_refs = fileRefs;
    if (filesInline.length) payload.files_inline = filesInline;
    if (actionParams.context) payload.context = actionParams.context;

    await publishNativeChatMask({
      mode: "send_message",
      promptText: payload.message,
      fileCount: fileRefs.length + filesInline.length,
      fileNames: extractNativeMaskFileNames(actionParams),
      ts: Date.now(),
    }).catch((error) => {
      console.warn("[ACTO MASK] publish before send failed", error);
    });
  }

  const response = await fetch(ACTO_V2_URL, {
    method: "POST",
    headers: actoV2Headers(),
    body: JSON.stringify(payload),
  });
  const body = await response.text();
  const data = parseJsonBody(body);
  const status = Number(data?.status || response.status);
  const ok = response.ok && data?.ok !== false && data?.sucesso !== false && status >= 200 && status < 300;

  if (!ok) {
    console.error("[ACTO acto-tier-s] action failed", {
      action,
      status: response.status,
      body: safeResponseBody(body),
    });
  }

  return { ok, status, responseStatus: response.status, body, data };
}

async function putGcsSignedUrl(uploadUrl, body, mime, extraHeaders = {}) {
  if (!isNonEmptyString(uploadUrl)) throw new Error("upload_url ausente");
  const headers = {};
  const normalized = new Set();

  if (extraHeaders && typeof extraHeaders === "object" && !Array.isArray(extraHeaders)) {
    for (const [key, value] of Object.entries(extraHeaders)) {
      if (!isNonEmptyString(key) || value == null) continue;
      headers[key] = String(value);
      normalized.add(key.toLowerCase());
    }
  }

  if (!normalized.has("content-type")) {
    headers["Content-Type"] = mime || "application/octet-stream";
  }

  const response = await fetch(uploadUrl, {
    method: "PUT",
    headers,
    body,
  });

  if (!response.ok) throw new Error(`PUT ${response.status}`);
  return { ok: true, status: response.status };
}

async function getActiveLovableTab() {
  const active = await getActiveTab();
  if (active?.id && isLovableUrl(active.url)) return active;

  const tabs = await new Promise((resolve) => {
    chrome.tabs?.query?.(
      {
        url: [
          "https://lovable.dev/*",
          "https://*.lovable.dev/*",
          "https://lovable.app/*",
          "https://*.lovable.app/*",
        ],
      },
      (items) => {
        if (chrome.runtime.lastError) {
          resolve([]);
          return;
        }
        resolve(items || []);
      },
    );
  });

  return tabs.find((tab) => tab.active && typeof tab.id === "number") || tabs.find((tab) => typeof tab.id === "number");
}

async function getActiveLovableDevTab() {
  const active = await getActiveTab();
  if (active?.id && isLovableDevUrl(active.url)) return active;

  const tabs = await new Promise((resolve) => {
    chrome.tabs?.query?.(
      {
        url: [
          "https://lovable.dev/*",
          "https://*.lovable.dev/*",
        ],
      },
      (items) => {
        if (chrome.runtime.lastError) {
          resolve([]);
          return;
        }
        resolve(items || []);
      },
    );
  });

  return tabs.find((tab) => tab.active && typeof tab.id === "number") || tabs.find((tab) => typeof tab.id === "number");
}

async function uploadFilesViaLovableTab(message = {}) {
  if (!chrome.scripting?.executeScript) throw new Error("chrome.scripting indisponivel");

  const projectId = sanitizeProjectId(message.projectId || message.project_id);
  if (!projectId) throw new Error("projectId invalido");

  const files = Array.isArray(message.files) ? message.files : [];
  if (!files.length) return [];
  if (files.length > 10) throw new Error("Max 10 arquivos por mensagem.");

  const tab = await getActiveLovableTab();
  if (!tab?.id) throw new Error("Aba Lovable ativa nao encontrada.");

  const tokens = Array.isArray(message.tokens) ? message.tokens.filter(isNonEmptyString) : [];
  const clientGitSha = String(message.clientGitSha || message.client_git_sha || "").trim();
  const results = await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    world: "MAIN",
    args: [{ files, projectId, clientGitSha, tokens }],
    func: async ({ files, projectId, clientGitSha, tokens }) => {
      const endpointOrigin = "https://api.lovable.dev";

      function parseJson(text) {
        try {
          return JSON.parse(text);
        } catch {
          return {};
        }
      }

      function b64ToBytes(value) {
        const base64 = String(value || "").includes(",") ? String(value || "").split(",").pop() : String(value || "");
        const binary = atob(base64);
        const bytes = new Uint8Array(binary.length);
        for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
        return bytes;
      }

      function parseJwt(token) {
        if (!token || typeof token !== "string") return null;
        const parts = token.split(".");
        if (parts.length !== 3) return null;
        try {
          const body = parts[1].replace(/-/g, "+").replace(/_/g, "/");
          const padded = body.padEnd(body.length + ((4 - (body.length % 4)) % 4), "=");
          return JSON.parse(atob(padded));
        } catch {
          return null;
        }
      }

      function extractToken(value) {
        if (!value || typeof value !== "string") return null;
        const text = value.trim();
        if (!text) return null;
        if (/^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+$/.test(text)) return text;
        try {
          const parsed = JSON.parse(text);
          if (!parsed || typeof parsed !== "object") return null;
          return [
            parsed.access_token,
            parsed.token,
            parsed.currentSession?.access_token,
            parsed.session?.access_token,
          ].find((item) => typeof item === "string" && item.trim()) || null;
        } catch {
          return null;
        }
      }

      function classifyToken(token) {
        const payload = parseJwt(token);
        if (!payload) return null;
        return payload.access_type === "project" || (payload.project_id && payload.sub === payload.project_id)
          ? "lovable"
          : "auth";
      }

      function readTokensFromStorage(storage) {
        const found = { authToken: null, lovableToken: null, userId: null };
        if (!storage) return found;

        try {
          for (let index = 0; index < storage.length; index += 1) {
            const key = storage.key(index);
            if (!key) continue;
            const token = extractToken(storage.getItem(key));
            if (!token) continue;

            const type = classifyToken(token);
            if (type === "auth" && !found.authToken) {
              found.authToken = token;
              const payload = parseJwt(token);
              if (payload?.sub) found.userId = payload.sub;
            }
            if (type === "lovable" && !found.lovableToken) found.lovableToken = token;
            if (found.authToken && found.lovableToken) break;
          }
        } catch {
          return found;
        }

        return found;
      }

      function tokenState() {
        const local = readTokensFromStorage(window.localStorage);
        const session = readTokensFromStorage(window.sessionStorage);
        const passed = Array.isArray(tokens) ? tokens : [tokens];
        const candidates = [
          local.authToken || session.authToken || null,
          local.lovableToken || session.lovableToken || null,
          ...passed.map(extractToken),
        ].filter((item, index, list) => typeof item === "string" && item.trim() && list.indexOf(item) === index);
        candidates.push(null);
        return {
          candidates,
          userId: local.userId || session.userId || "",
        };
      }

      const tokenInfo = tokenState();

      async function fetchWithTokenFallback(url, options = {}) {
        let last = null;

        for (const token of tokenInfo.candidates) {
          const headers = { ...(options.headers || {}) };
          if (token) headers.Authorization = `Bearer ${token}`;
          else delete headers.Authorization;

          try {
            const response = await fetch(url, {
              ...options,
              credentials: "include",
              referrer: "https://lovable.dev/",
              headers,
            });
            const text = await response.text();
            const data = parseJson(text);
            last = { ok: response.ok, status: response.status, text, data };
            if (response.ok) return last;

            const lower = String(text || "").toLowerCase();
            const retryable =
              response.status === 401 ||
              response.status === 403 ||
              lower.includes("authorization") ||
              lower.includes("forbidden") ||
              lower.includes("invalid token") ||
              lower.includes("jwt");
            if (!retryable) return last;
          } catch (error) {
            last = {
              ok: false,
              status: 0,
              text: "",
              data: null,
              error: error?.message || String(error),
            };
          }
        }

        return last || { ok: false, status: 0, text: "", data: null, error: "no candidates" };
      }

      async function postJson(path, body) {
        const headers = { Accept: "*/*", "Content-Type": "application/json" };
        if (clientGitSha) headers["x-client-git-sha"] = clientGitSha;
        const result = await fetchWithTokenFallback(`${endpointOrigin}${path}`, {
          method: "POST",
          headers,
          body: JSON.stringify(body),
        });
        if (result.ok) return result.data || {};

        const details =
          result.data?.message ||
          result.data?.error ||
          result.data?.erro ||
          result.error ||
          result.text ||
          `HTTP ${result.status}`;
        throw new Error(`${path} ${result.status}: ${String(details).slice(0, 220)}`);
      }

      async function tryPostJson(path, body) {
        try {
          return await postJson(path, body);
        } catch {
          return null;
        }
      }

      function uuid4() {
        if (crypto?.randomUUID) return crypto.randomUUID();
        const bytes = crypto.getRandomValues(new Uint8Array(16));
        bytes[6] = (bytes[6] & 0x0f) | 0x40;
        bytes[8] = (bytes[8] & 0x3f) | 0x80;
        const hex = Array.from(bytes).map((byte) => byte.toString(16).padStart(2, "0")).join("");
        return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
      }

      function splitFileId(fileId) {
        const parts = String(fileId || "").split("/").filter(Boolean);
        return {
          dirName: parts.length > 1 ? parts[0] : "",
          fileName: parts.length > 1 ? parts.slice(1).join("/") : parts[0] || "",
        };
      }

      function dirNameFromGcsUrl(uploadUrl) {
        try {
          const parts = new URL(uploadUrl).pathname.split("/").filter(Boolean);
          const markerIndex = parts.indexOf("gpt-engineer-file-uploads");
          if (markerIndex >= 0 && parts[markerIndex + 1]) return parts[markerIndex + 1];
        } catch {
          return "";
        }
        return "";
      }

      async function generateDownloadUrl(attempts) {
        const seen = new Set();
        for (const attempt of attempts) {
          const dirName = String(attempt?.dir_name || "").trim();
          const fileName = String(attempt?.file_name || "").trim();
          if (!dirName || !fileName) continue;
          const key = `${dirName}/${fileName}`;
          if (seen.has(key)) continue;
          seen.add(key);

          const data = await tryPostJson("/files/generate-download-url", {
            dir_name: dirName,
            file_name: fileName,
          });
          const url = data?.url || data?.download_url;
          if (url) return url;
        }

        return "";
      }

      async function uploadOne(file) {
        const mime = file.type || "application/octet-stream";
        const generatedFileName = uuid4();
        const init = await postJson("/files/generate-upload-url", {
          file_name: generatedFileName,
          content_type: mime,
          status: "uploading",
          project_id: projectId,
          original_file_name: file.name,
          file_size_bytes: file.size,
          original_file_size_bytes: file.size,
        });
        const uploadUrl = init.url || init.upload_url;
        const rawFileId = init.file_id || init.fileId || "";
        const chatFileId = generatedFileName;
        if (!uploadUrl) throw new Error("Lovable nao retornou URL de upload.");

        const uploadHeaders = {};
        if (init.headers && typeof init.headers === "object" && !Array.isArray(init.headers)) {
          for (const [key, value] of Object.entries(init.headers)) {
            if (key && value != null) uploadHeaders[key] = String(value);
          }
        }
        if (!Object.keys(uploadHeaders).some((key) => key.toLowerCase() === "content-type")) {
          uploadHeaders["Content-Type"] = mime;
        }

        const putResponse = await fetch(uploadUrl, {
          method: "PUT",
          headers: uploadHeaders,
          body: b64ToBytes(file.b64),
        });
        if (!putResponse.ok) throw new Error(`PUT GCS ${putResponse.status}`);

        const responsePath = splitFileId(rawFileId);
        const gcsDirName = dirNameFromGcsUrl(uploadUrl);
        const downloadUrl = await generateDownloadUrl([
          { dir_name: gcsDirName, file_name: generatedFileName },
          { dir_name: responsePath.dirName, file_name: responsePath.fileName },
          { dir_name: tokenInfo.userId, file_name: generatedFileName },
          { dir_name: projectId, file_name: generatedFileName },
        ]);

        return {
          ok: true,
          file_id: chatFileId,
          file_name: file.name,
          mime_type: mime,
          download_url: downloadUrl,
        };
      }

      const results = [];
      for (const file of files) {
        try {
          results.push(await uploadOne(file));
        } catch (error) {
          results.push({
            ok: false,
            file_name: file?.name || "arquivo",
            mime_type: file?.type || "application/octet-stream",
            error: error?.message || String(error),
          });
        }
      }

      return results;
    },
  });

  return results?.[0]?.result || [];
}

function normalizeLovableToolDecision(value) {
  const text = String(value || "").trim().toLowerCase();
  if (["reject", "rejected", "deny", "denied", "negar", "recusar"].includes(text)) return "rejected";
  return "approved";
}

async function respondLovableToolViaTab(message = {}) {
  if (!chrome.scripting?.executeScript) throw new Error("chrome.scripting indisponivel");

  const decision = normalizeLovableToolDecision(message.decision || message.tool_decision || message.action);
  const stored = await syncActiveLovableTab().catch(() => ({}));
  const browserSessionId = String(
    message.browserSessionId ||
      message.browser_session_id ||
      stored[CAPTURED_BROWSER_SESSION_ID_KEY] ||
      "",
  ).trim();
  const clientGitSha = String(message.clientGitSha || message.client_git_sha || stored.captured_client_git_sha || "").trim();
  const authToken = String(message.authToken || message.auth_token || stored.captured_auth_token || "").trim();
  const lovableToken = String(message.lovableToken || message.lovable_token || stored.captured_lovable_token || "").trim();
  const currentLovableUrl = String(message.currentLovableUrl || message.current_lovable_url || stored.current_lovable_url || "").trim();
  const projectId = sanitizeProjectId(message.projectId || message.project_id || stored.current_project_id || extractProjectIdFromUrl(currentLovableUrl)) || "";

  const tab = await getActiveLovableDevTab();
  if (!tab?.id) throw new Error("Abra uma aba do lovable.dev com um plano pendente.");

  const [execution] = await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    world: "MAIN",
    args: [
      {
        decision,
        projectId,
        browserSessionId,
        clientGitSha,
        authToken,
        lovableToken,
        currentLovableUrl,
        toolCallEventId: message.toolCallEventId || message.tool_call_event_id || "",
        prevSessionId: message.prevSessionId || message.prev_session_id || "",
        threadId: message.threadId || message.thread_id || "",
        planContent: message.planContent || message.plan_content || "",
      },
    ],
    func: async (input) => {
      const API_ORIGIN = "https://api.lovable.dev";
      const ULID_ALPHABET = "0123456789abcdefghjkmnpqrstvwxyz";

      function isNonEmptyString(value) {
        return typeof value === "string" && value.trim().length > 0;
      }

      function safeJsonParse(value) {
        try {
          return JSON.parse(value);
        } catch {
          return {};
        }
      }

      function isJwt(value) {
        return /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(String(value || "").trim());
      }

      function normalizeToken(value) {
        const text = String(value || "").trim();
        if (!text) return "";
        if (isJwt(text)) return text;
        try {
          const parsed = JSON.parse(text);
          return [
            parsed.access_token,
            parsed.token,
            parsed.authToken,
            parsed.currentSession?.access_token,
            parsed.session?.access_token,
            parsed.data?.access_token,
          ].find((item) => isJwt(item)) || "";
        } catch {
          return "";
        }
      }

      function parseJwtPayload(token) {
        if (!isJwt(token)) return null;
        try {
          const payload = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
          const padded = payload.padEnd(payload.length + ((4 - (payload.length % 4)) % 4), "=");
          return JSON.parse(atob(padded));
        } catch {
          return null;
        }
      }

      function tokenKind(token) {
        const payload = parseJwtPayload(token);
        if (!payload) return "";
        return payload.access_type === "project" || payload.project_id || payload.projectId ? "lovable" : "auth";
      }

      function findTokenInStorage(storage, desiredKind) {
        if (!storage) return "";
        try {
          for (let index = 0; index < storage.length; index += 1) {
            const key = storage.key(index);
            const token = normalizeToken(key ? storage.getItem(key) : "");
            if (token && (!desiredKind || tokenKind(token) === desiredKind)) return token;
          }
        } catch {}
        return "";
      }

      function extractProjectIdFromUrl(value) {
        const text = String(value || "").trim();
        const match = text.match(/\/projects\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i);
        return match?.[1] || "";
      }

      function encodeUlidTime(time) {
        let output = "";
        let current = Math.max(0, Number(time) || Date.now());
        for (let index = 0; index < 10; index += 1) {
          output = ULID_ALPHABET[current % 32] + output;
          current = Math.floor(current / 32);
        }
        return output;
      }

      function makeUlid() {
        const bytes = crypto.getRandomValues(new Uint8Array(16));
        return `${encodeUlidTime(Date.now())}${Array.from(bytes, (byte) => ULID_ALPHABET[byte % 32]).join("")}`;
      }

      function makeMessageId() {
        return `umsg_${makeUlid()}`;
      }

      function extractBrowserSessionFromStorage(storage) {
        if (!storage) return "";
        const directKeys = ["browserSessionId", "browser_session_id", "x-browser-session-id"];
        for (const key of directKeys) {
          const value = storage.getItem(key);
          if (isNonEmptyString(value) && !/\s/.test(value)) return value.trim();
        }
        try {
          for (let index = 0; index < storage.length; index += 1) {
            const key = storage.key(index);
            const value = key ? storage.getItem(key) : "";
            if (/browser.*session|x-browser-session-id/i.test(`${key} ${value}`)) {
              const match = String(value || "").match(/bsess_[A-Za-z0-9_-]+|[A-Za-z0-9_-]{16,32}/);
              if (match?.[0]) return match[0];
            }
          }
        } catch {}
        return "";
      }

      function findClientGitSha() {
        const explicit = String(input.clientGitSha || "").trim();
        if (/^[a-f0-9]{40}$/i.test(explicit)) return explicit;

        const urls = [
          ...Array.from(document.scripts || [], (script) => script.src || ""),
          ...performance.getEntriesByType("resource").map((entry) => entry.name || ""),
        ];
        for (const url of urls) {
          const match = String(url || "").match(/dpl=[^&]*-([a-f0-9]{40})(?:[&/?#]|$)/i);
          if (match?.[1]) return match[1];
        }
        return explicit;
      }

      function headersForLovable({ json = false } = {}) {
        const headers = { accept: "*/*" };
        if (json) headers["content-type"] = "application/json";
        if (resolvedBearerToken) headers.authorization = `Bearer ${resolvedBearerToken}`;
        if (resolvedBrowserSessionId) headers["x-browser-session-id"] = resolvedBrowserSessionId;
        if (resolvedClientGitSha) headers["x-client-git-sha"] = resolvedClientGitSha;
        return headers;
      }

      function normalizeToolCallEventId(value) {
        const text = String(value || "").trim();
        if (!text) return "";
        const decoded = (() => {
          try {
            return decodeURIComponent(text);
          } catch {
            return text;
          }
        })();
        const fromPath = decoded.match(/\/tools\/respond\/([^?#\s]+)/i)?.[1];
        if (fromPath) return normalizeToolCallEventId(fromPath);
        const match = decoded.match(/main:agent#[^"'\s<>{}]+#tcb:[A-Za-z0-9_-]+/i);
        return match?.[0] || "";
      }

      function cleanPlanText(value) {
        return String(value || "")
          .replace(/\b(Approve|Reject|Accept|Deny|Aprovar|Negar|Recusar|Save to workspace)\b/gi, " ")
          .replace(/\s+/g, " ")
          .trim()
          .slice(0, 16000);
      }

      function visibleElement(element) {
        if (!element || !(element instanceof Element)) return false;
        const rect = element.getBoundingClientRect();
        const style = getComputedStyle(element);
        return rect.width > 2 && rect.height > 2 && style.visibility !== "hidden" && style.display !== "none";
      }

      function actionButtonScore(element) {
        const text = String(element?.innerText || element?.textContent || element?.ariaLabel || element?.title || "").trim();
        if (!text) return 0;
        if (/approve|aprovar|accept|aplicar/i.test(text)) return 4;
        if (/reject|negar|deny|recusar/i.test(text)) return 3;
        if (/save\s+to\s+workspace|salvar/i.test(text)) return 2;
        return 0;
      }

      function findActionContainer(button) {
        let node = button;
        let best = button;
        for (let depth = 0; node && depth < 8; depth += 1, node = node.parentElement) {
          const text = cleanPlanText(node.innerText || node.textContent || "");
          if (text.length > 80) best = node;
          if (text.length > 250 && /(proposed|changes|plano|approve|aprovar|workspace|skill|files|alteracoes|modificar)/i.test(text)) return node;
        }
        return best;
      }

      function reactSeedsFromElement(element) {
        const seeds = [];
        let node = element;
        for (let depth = 0; node && depth < 10; depth += 1, node = node.parentElement) {
          seeds.push(node);
          try {
            for (const key of Object.getOwnPropertyNames(node)) {
              if (key.startsWith("__reactFiber$") || key.startsWith("__reactProps$") || key.startsWith("__reactContainer$")) {
                seeds.push(node[key]);
              }
            }
          } catch {}
        }
        return seeds;
      }

      function inspectString(text, path, found) {
        const value = String(text || "");
        if (!found.toolCallEventId) {
          found.toolCallEventId = normalizeToolCallEventId(value);
        }
        if (!found.prevSessionId) {
          const prev = value.match(/aimsg_[a-z0-9]+/i)?.[0];
          if (prev) found.prevSessionId = prev;
        }
        if (!found.threadId && /thread[_-]?id|thread/i.test(path) && /^[A-Za-z0-9_-]{1,40}$/.test(value.trim())) {
          found.threadId = value.trim();
        }
        if (!found.planContent && /content|message|plan|description|proposal|markdown|text|input/i.test(path) && value.length > 80) {
          found.planContent = cleanPlanText(value);
        }
      }

      function collectMetadata(seeds) {
        const found = {
          toolCallEventId: normalizeToolCallEventId(input.toolCallEventId),
          prevSessionId: String(input.prevSessionId || "").trim(),
          threadId: String(input.threadId || "").trim(),
          planContent: cleanPlanText(input.planContent),
        };
        const seen = new WeakSet();
        const stack = seeds.map((value) => ({ value, path: "", depth: 0 }));
        let visited = 0;

        while (stack.length && visited < 8000) {
          const { value, path, depth } = stack.pop();
          visited += 1;
          if (value == null || depth > 10) continue;

          if (typeof value === "string" || typeof value === "number") {
            inspectString(value, path, found);
            if (found.toolCallEventId && found.prevSessionId && found.planContent) break;
            continue;
          }

          if (typeof value === "function") continue;
          if (typeof value !== "object") continue;
          if (seen.has(value)) continue;
          seen.add(value);

          if (typeof Window !== "undefined" && value instanceof Window) continue;
          if (typeof Document !== "undefined" && value instanceof Document) continue;
          if (typeof Storage !== "undefined" && value instanceof Storage) continue;

          if (typeof Element !== "undefined" && value instanceof Element) {
            for (const key of Object.getOwnPropertyNames(value)) {
              if (key.startsWith("__reactFiber$") || key.startsWith("__reactProps$") || key.startsWith("__reactContainer$")) {
                stack.push({ value: value[key], path: `${path}.${key}`, depth: depth + 1 });
              }
            }
            continue;
          }

          let keys = [];
          try {
            keys = Object.keys(value);
          } catch {
            continue;
          }
          for (const key of keys.slice(0, 120)) {
            if (/^(ownerDocument|parentNode|childNodes|children|nextSibling|previousSibling|firstChild|lastChild)$/i.test(key)) continue;
            let item;
            try {
              item = value[key];
            } catch {
              continue;
            }
            const nextPath = path ? `${path}.${key}` : key;
            const lowered = key.toLowerCase();
            if (!found.toolCallEventId && /tool.*(event|call).*id|tool_call_event_id/.test(lowered)) {
              found.toolCallEventId = normalizeToolCallEventId(item);
            }
            if (!found.prevSessionId && /prev.*session.*id|prev_session_id/.test(lowered)) {
              const prev = String(item || "").match(/aimsg_[a-z0-9]+/i)?.[0];
              if (prev) found.prevSessionId = prev;
            }
            if (!found.threadId && /thread.*id|thread_id/.test(lowered) && isNonEmptyString(item)) {
              found.threadId = String(item).trim();
            }
            stack.push({ value: item, path: nextPath, depth: depth + 1 });
          }
        }
        return found;
      }

      function findPendingToolAction() {
        const buttons = Array.from(document.querySelectorAll("button,[role='button']"))
          .filter(visibleElement)
          .map((button) => ({ button, score: actionButtonScore(button) }))
          .filter((item) => item.score > 0)
          .sort((a, b) => b.score - a.score);

        for (const { button } of buttons) {
          const container = findActionContainer(button);
          const metadata = collectMetadata([...reactSeedsFromElement(button), ...reactSeedsFromElement(container)]);
          const containerText = cleanPlanText(container?.innerText || container?.textContent || "");
          if (!metadata.planContent && containerText.length > 80) metadata.planContent = containerText;
          if (metadata.toolCallEventId) return metadata;
        }

        const fallbackSeeds = [
          ...reactSeedsFromElement(document.querySelector("#root") || document.body),
          ...Array.from(document.querySelectorAll("[data-testid],[data-test-id]")).slice(0, 12).flatMap(reactSeedsFromElement),
        ];
        return collectMetadata(fallbackSeeds);
      }

      function shouldSendPlanContent(text) {
        const value = cleanPlanText(text);
        return value.length > 80 && /(proposed|changes|implementation|plan|plano|alteracoes|arquivos|modificar|vou|will)/i.test(value);
      }

      const resolvedBrowserSessionId =
        String(input.browserSessionId || "").trim() ||
        extractBrowserSessionFromStorage(localStorage) ||
        extractBrowserSessionFromStorage(sessionStorage);
      const resolvedClientGitSha = findClientGitSha();
      const resolvedAuthToken =
        normalizeToken(input.authToken) ||
        findTokenInStorage(localStorage, "auth") ||
        findTokenInStorage(sessionStorage, "auth");
      const resolvedLovableToken =
        normalizeToken(input.lovableToken) ||
        findTokenInStorage(localStorage, "lovable") ||
        findTokenInStorage(sessionStorage, "lovable");
      const resolvedBearerToken = resolvedAuthToken || resolvedLovableToken;

      const detected = findPendingToolAction();
      const toolCallEventId = normalizeToolCallEventId(input.toolCallEventId) || detected.toolCallEventId;
      const prevSessionId = String(input.prevSessionId || detected.prevSessionId || "").trim();
      const threadId = String(input.threadId || detected.threadId || "main").trim();
      const projectId =
        extractProjectIdFromUrl(location.href) ||
        extractProjectIdFromUrl(input.currentLovableUrl) ||
        String(input.projectId || "").trim();
      const decision = input.decision === "rejected" ? "rejected" : "approved";

      if (!toolCallEventId) throw new Error("Nao detectei um plano ou acao pendente da Lovable.");
      if (!projectId) throw new Error("Projeto Lovable nao detectado.");

      const msgId = makeMessageId();
      const payload = decision === "rejected" ? {
        id: msgId,
        message: "Try to fix",
        tool_decision: "approved",
        tool_call_event_id: toolCallEventId,
        user_input: {
          fix_error: {
            decision: "approved",
            error_id: makeMessageId(),
          },
        },
        mode: "instant",
        thread_id: threadId || "main",
      } : {
        message: "",
        id: msgId,
        mode: "fix_error",
        fastmode: true,
        prev_session_id: prevSessionId,
        tool_call_event_id: toolCallEventId,
        tool_decision: decision,
        user_input: {},
        thread_id: threadId || "main",
        session_replay: "[]",
        client_logs: [],
        network_requests: [],
        runtime_errors: [],
        integration_metadata: {
          browser: {
            preview_viewport_width: window.innerWidth,
            preview_viewport_height: window.innerHeight,
          },
        },
      };
      const response = await fetch(`${API_ORIGIN}/tools/respond/${encodeURIComponent(toolCallEventId)}?project_id=${encodeURIComponent(projectId)}`, {
        method: "POST",
        credentials: "include",
        headers: headersForLovable({ json: true }),
        body: JSON.stringify(payload),
      });
      const text = await response.text();
      const data = safeJsonParse(text);
      if (!response.ok) {
        throw new Error(data?.message || data?.error || `Lovable tools/respond ${response.status}`);
      }

      return {
        ok: true,
        status: response.status,
        decision,
        projectId,
        toolCallEventId,
        prevSessionId,
        sentPlanContent: Boolean(userInput.content),
      };
    },
  });

  const payload = execution?.result || {};
  if (!payload?.ok) throw new Error(payload?.error || "Plano aprovado.");
  return payload;
}

async function getLovableSkillsViaTab(message = {}) {
  if (!chrome.scripting?.executeScript) throw new Error("chrome.scripting indisponivel");

  const stored = await syncActiveLovableTab().catch(() => ({}));
  const browserSessionId = String(
    message.browserSessionId ||
      message.browser_session_id ||
      stored[CAPTURED_BROWSER_SESSION_ID_KEY] ||
      "",
  ).trim();
  const clientGitSha = String(message.clientGitSha || message.client_git_sha || stored.captured_client_git_sha || "").trim();
  const authToken = String(message.authToken || message.auth_token || stored.captured_auth_token || "").trim();
  const lovableToken = String(message.lovableToken || message.lovable_token || stored.captured_lovable_token || "").trim();
  const currentLovableUrl = String(message.currentLovableUrl || message.current_lovable_url || stored.current_lovable_url || "").trim();
  const workspaceId = sanitizeWorkspaceId(message.workspaceId || message.workspace_id || stored.current_workspace_id, {
    browserSessionId,
    trusted: true,
  }) || "";

  const tab = (await getActiveLovableDevTab()) || (await getActiveLovableTab());
  if (!tab?.id || !isLovableUrl(tab.url)) throw new Error("Abra uma aba do Lovable logada para carregar as skills.");

  const [execution] = await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    world: "MAIN",
    args: [
      {
        workspaceId,
        browserSessionId,
        clientGitSha,
        authToken,
        lovableToken,
        currentLovableUrl,
      },
    ],
    func: async (input) => {
      const API_ORIGIN = "https://api.lovable.dev";

      function isNonEmptyString(value) {
        return typeof value === "string" && value.trim().length > 0;
      }

      function safeJsonParse(value) {
        try {
          return JSON.parse(value);
        } catch {
          return {};
        }
      }

      function isValidWorkspaceId(value) {
        const text = String(value || "").trim();
        return /^[A-Za-z0-9_-]{6,96}$/.test(text) && !/^bsess_/i.test(text) && !/[/?#\s]/.test(text);
      }

      function isJwt(value) {
        return /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(String(value || "").trim());
      }

      function normalizeToken(value) {
        const text = String(value || "").trim();
        if (!text) return "";
        if (isJwt(text)) return text;
        try {
          const parsed = JSON.parse(text);
          return [
            parsed.access_token,
            parsed.token,
            parsed.authToken,
            parsed.currentSession?.access_token,
            parsed.session?.access_token,
            parsed.data?.access_token,
          ].find((item) => isJwt(item)) || "";
        } catch {
          return "";
        }
      }

      function parseJwtPayload(token) {
        if (!isJwt(token)) return null;
        try {
          const payload = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
          const padded = payload.padEnd(payload.length + ((4 - (payload.length % 4)) % 4), "=");
          return JSON.parse(atob(padded));
        } catch {
          return null;
        }
      }

      function tokenKind(token) {
        const payload = parseJwtPayload(token);
        if (!payload) return "";
        return payload.access_type === "project" || payload.project_id || payload.projectId ? "lovable" : "auth";
      }

      function findTokenInStorage(storage, desiredKind) {
        if (!storage) return "";
        try {
          for (let index = 0; index < storage.length; index += 1) {
            const key = storage.key(index);
            const token = normalizeToken(key ? storage.getItem(key) : "");
            if (token && (!desiredKind || tokenKind(token) === desiredKind)) return token;
          }
        } catch {}
        return "";
      }

      function extractProjectIdFromUrl(value) {
        const text = String(value || "").trim();
        const match = text.match(/\/projects\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i);
        return match?.[1] || "";
      }

      function extractBrowserSessionFromStorage(storage) {
        if (!storage) return "";
        const directKeys = ["browserSessionId", "browser_session_id", "x-browser-session-id"];
        for (const key of directKeys) {
          const value = storage.getItem(key);
          if (isNonEmptyString(value) && !/\s/.test(value)) return value.trim();
        }
        try {
          for (let index = 0; index < storage.length; index += 1) {
            const key = storage.key(index);
            const value = key ? storage.getItem(key) : "";
            if (/browser.*session|x-browser-session-id/i.test(`${key} ${value}`)) {
              const match = String(value || "").match(/bsess_[A-Za-z0-9_-]+|[A-Za-z0-9_-]{16,32}/);
              if (match?.[0]) return match[0];
            }
          }
        } catch {}
        return "";
      }

      function findBrowserSessionId() {
        return (
          String(input.browserSessionId || "").trim() ||
          extractBrowserSessionFromStorage(localStorage) ||
          extractBrowserSessionFromStorage(sessionStorage)
        );
      }

      function findClientGitSha() {
        const explicit = String(input.clientGitSha || "").trim();
        if (/^[a-f0-9]{40}$/i.test(explicit)) return explicit;

        const urls = [
          ...Array.from(document.scripts || [], (script) => script.src || ""),
          ...performance.getEntriesByType("resource").map((entry) => entry.name || ""),
        ];
        for (const url of urls) {
          const match = String(url || "").match(/dpl=[^&]*-([a-f0-9]{40})(?:[&/?#]|$)/i);
          if (match?.[1]) return match[1];
        }
        return explicit;
      }

      function headersForLovable({ json = false } = {}) {
        const headers = { accept: "*/*" };
        if (json) headers["content-type"] = "application/json";
        if (resolvedBearerToken) headers.authorization = `Bearer ${resolvedBearerToken}`;
        if (resolvedBrowserSessionId) headers["x-browser-session-id"] = resolvedBrowserSessionId;
        if (resolvedClientGitSha) headers["x-client-git-sha"] = resolvedClientGitSha;
        return headers;
      }

      async function fetchJsonOrThrow(url, label) {
        const response = await fetch(url, {
          method: "GET",
          credentials: "include",
          headers: headersForLovable(),
        });
        const text = await response.text();
        const data = safeJsonParse(text);
        if (!response.ok) throw new Error(data?.message || data?.error || `${label} (${response.status})`);
        return data;
      }

      function workspaceListFromResponse(data) {
        if (Array.isArray(data)) return data;
        if (!data || typeof data !== "object") return [];
        return data.workspaces || data.data || data.items || data.results || [];
      }

      function workspaceFromProjectWorkspaceResponse(data) {
        return String(
          data?.workspace?.id ||
            data?.workspace?.uuid ||
            data?.workspace_id ||
            data?.workspaceId ||
            data?.data?.workspace?.id ||
            data?.data?.workspace_id ||
            data?.id ||
            "",
        ).trim();
      }

      async function resolveWorkspaceId() {
        const provided = String(input.workspaceId || "").trim();
        if (isValidWorkspaceId(provided)) return provided;

        const projectId = extractProjectIdFromUrl(location.href) || extractProjectIdFromUrl(input.currentLovableUrl);
        if (projectId) {
          try {
            const data = await fetchJsonOrThrow(`${API_ORIGIN}/projects/${encodeURIComponent(projectId)}/workspace`, "Falha ao buscar workspace do projeto");
            const workspaceId = workspaceFromProjectWorkspaceResponse(data);
            if (isValidWorkspaceId(workspaceId)) return workspaceId;
          } catch {}
        }

        const data = await fetchJsonOrThrow(`${API_ORIGIN}/user/workspaces`, "Falha ao buscar workspace");
        for (const item of workspaceListFromResponse(data)) {
          const workspaceId = String(item?.id || item?.uuid || item?.workspace_id || item?.workspaceId || "").trim();
          if (isValidWorkspaceId(workspaceId)) return workspaceId;
        }

        throw new Error("Workspace Lovable nao detectado.");
      }

      function readSkills(data) {
        if (Array.isArray(data)) return data;
        if (!data || typeof data !== "object") return [];
        return data.skills || data.data?.skills || data.data || data.items || data.results || [];
      }

      function normalizeSkill(skill, index) {
        const rawSlug = String(skill?.name || skill?.slug || skill?.id || skill?.key || "").trim();
        const explicitLabel = String(skill?.display_name || skill?.displayName || skill?.title || skill?.label || "").trim();
        const label = explicitLabel || String(rawSlug || `Skill ${index + 1}`)
          .replace(/[-_]+/g, " ")
          .replace(/\b\w/g, (letter) => letter.toUpperCase())
          .trim();
        const slug = rawSlug || label
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-+|-+$/g, "");
        if (!slug) return null;
        return {
          slug,
          name: rawSlug || slug,
          label,
          description: String(skill?.description || skill?.summary || "").trim(),
        };
      }

      const resolvedBrowserSessionId = findBrowserSessionId();
      const resolvedClientGitSha = findClientGitSha();
      const resolvedAuthToken =
        normalizeToken(input.authToken) ||
        findTokenInStorage(localStorage, "auth") ||
        findTokenInStorage(sessionStorage, "auth");
      const resolvedLovableToken =
        normalizeToken(input.lovableToken) ||
        findTokenInStorage(localStorage, "lovable") ||
        findTokenInStorage(sessionStorage, "lovable");
      const resolvedBearerToken = resolvedAuthToken || resolvedLovableToken;
      const workspaceId = await resolveWorkspaceId();
      const skillsData = await fetchJsonOrThrow(`${API_ORIGIN}/workspaces/${encodeURIComponent(workspaceId)}/skills`, "Falha ao buscar skills");

      let disabled = [];
      try {
        const settings = await fetchJsonOrThrow(`${API_ORIGIN}/workspaces/${encodeURIComponent(workspaceId)}/skill-settings`, "Falha ao buscar configuracao de skills");
        disabled = Array.isArray(settings?.disabled_skills) ? settings.disabled_skills.map((item) => String(item || "").trim()).filter(Boolean) : [];
      } catch {}

      const disabledSet = new Set(disabled);
      const skills = readSkills(skillsData)
        .map(normalizeSkill)
        .filter(Boolean)
        .filter((skill) => !disabledSet.has(skill.slug) && !disabledSet.has(skill.name));

      return { ok: true, workspaceId, skills };
    },
  });

  const payload = execution?.result || {};
  if (!payload?.ok) throw new Error(payload?.error || "Nao consegui carregar as skills.");
  return payload;
}

async function createLovableProjectViaTab(message = {}) {
  if (!chrome.scripting?.executeScript) throw new Error("chrome.scripting indisponivel");

  const projectName = String(message.projectName || message.project_name || message.name || "").trim();
  const initialPrompt = String(message.initialPrompt || message.prompt || message.description || "").trim();
  if (!projectName) throw new Error("Informe o nome do projeto.");
  if (!initialPrompt) throw new Error("Informe o prompt inicial.");

  const stored = await syncActiveLovableTab().catch(() => ({}));
  const browserSessionId = String(
    message.browserSessionId ||
      message.browser_session_id ||
      stored[CAPTURED_BROWSER_SESSION_ID_KEY] ||
      "",
  ).trim();
  const clientGitSha = String(message.clientGitSha || message.client_git_sha || stored.captured_client_git_sha || "").trim();
  const authToken = String(message.authToken || message.auth_token || stored.captured_auth_token || "").trim();
  const lovableToken = String(message.lovableToken || message.lovable_token || stored.captured_lovable_token || "").trim();
  const currentLovableUrl = String(message.currentLovableUrl || message.current_lovable_url || stored.current_lovable_url || "").trim();
  const workspaceId = sanitizeWorkspaceId(message.workspaceId || message.workspace_id || stored.current_workspace_id, {
    browserSessionId,
    trusted: true,
  }) || "";

  const tab = await getActiveLovableDevTab();
  if (!tab?.id) throw new Error("Abra uma aba do lovable.dev logada antes de criar projeto.");

  const [execution] = await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    world: "MAIN",
    args: [
      {
        projectName,
        initialPrompt,
        workspaceId,
        browserSessionId,
        clientGitSha,
        authToken,
        lovableToken,
        currentLovableUrl,
      },
    ],
    func: async (input) => {
      const API_ORIGIN = "https://api.lovable.dev";
      const ULID_ALPHABET = "0123456789abcdefghjkmnpqrstvwxyz";
      const CASTLE_WAIT_MS = 9000;
      const AUTO_STOP_DELAY_MS = 3200;

      function isNonEmptyString(value) {
        return typeof value === "string" && value.trim().length > 0;
      }

      function safeJsonParse(value) {
        try {
          return JSON.parse(value);
        } catch {
          return {};
        }
      }

      function sleep(ms) {
        return new Promise((resolve) => setTimeout(resolve, ms));
      }

      function isValidWorkspaceId(value) {
        const text = String(value || "").trim();
        return /^[A-Za-z0-9_-]{6,96}$/.test(text) && !/^bsess_/i.test(text) && !/[/?#\s]/.test(text);
      }

      function isJwt(value) {
        return /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(String(value || "").trim());
      }

      function normalizeToken(value) {
        const text = String(value || "").trim();
        if (!text) return "";
        if (isJwt(text)) return text;
        try {
          const parsed = JSON.parse(text);
          return [
            parsed.access_token,
            parsed.token,
            parsed.authToken,
            parsed.currentSession?.access_token,
            parsed.session?.access_token,
            parsed.data?.access_token,
          ].find((item) => isJwt(item)) || "";
        } catch {
          return "";
        }
      }

      function parseJwtPayload(token) {
        if (!isJwt(token)) return null;
        try {
          const payload = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
          const padded = payload.padEnd(payload.length + ((4 - (payload.length % 4)) % 4), "=");
          return JSON.parse(atob(padded));
        } catch {
          return null;
        }
      }

      function tokenKind(token) {
        const payload = parseJwtPayload(token);
        if (!payload) return "";
        return payload.access_type === "project" || payload.project_id || payload.projectId ? "lovable" : "auth";
      }

      function findTokenInStorage(storage, desiredKind) {
        if (!storage) return "";
        try {
          for (let index = 0; index < storage.length; index += 1) {
            const key = storage.key(index);
            const token = normalizeToken(key ? storage.getItem(key) : "");
            if (token && (!desiredKind || tokenKind(token) === desiredKind)) return token;
          }
        } catch {}
        return "";
      }

      function extractProjectIdFromUrl(value) {
        const text = String(value || "").trim();
        const match = text.match(/\/projects\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i);
        return match?.[1] || "";
      }

      function encodeUlidTime(time) {
        let output = "";
        let current = Math.max(0, Number(time) || Date.now());
        for (let index = 0; index < 10; index += 1) {
          output = ULID_ALPHABET[current % 32] + output;
          current = Math.floor(current / 32);
        }
        return output;
      }

      function encodeUlidRandom(length = 16) {
        const bytes = crypto.getRandomValues(new Uint8Array(length));
        return Array.from(bytes, (byte) => ULID_ALPHABET[byte % 32]).join("");
      }

      function makeUlid() {
        return `${encodeUlidTime(Date.now())}${encodeUlidRandom(16)}`;
      }

      function makePrefixedId(prefix) {
        return `${prefix}_${makeUlid()}`;
      }

      function makeBrowserSessionId() {
        return `bsess_${makeUlid()}`;
      }

      function extractBrowserSessionFromStorage(storage) {
        if (!storage) return "";
        const directKeys = ["browserSessionId", "browser_session_id", "x-browser-session-id"];
        for (const key of directKeys) {
          const value = storage.getItem(key);
          if (isNonEmptyString(value) && !/\s/.test(value)) return value.trim();
        }
        try {
          for (let index = 0; index < storage.length; index += 1) {
            const key = storage.key(index);
            const value = key ? storage.getItem(key) : "";
            if (/browser.*session|x-browser-session-id/i.test(`${key} ${value}`)) {
              const match = String(value || "").match(/bsess_[A-Za-z0-9_-]+|[A-Za-z0-9_-]{16,32}/);
              if (match?.[0]) return match[0];
            }
          }
        } catch {}
        return "";
      }

      function findBrowserSessionId() {
        return (
          String(input.browserSessionId || "").trim() ||
          extractBrowserSessionFromStorage(localStorage) ||
          extractBrowserSessionFromStorage(sessionStorage) ||
          makeBrowserSessionId()
        );
      }

      function findClientGitSha() {
        const explicit = String(input.clientGitSha || "").trim();
        if (/^[a-f0-9]{40}$/i.test(explicit)) return explicit;

        const urls = [
          ...Array.from(document.scripts || [], (script) => script.src || ""),
          ...performance.getEntriesByType("resource").map((entry) => entry.name || ""),
        ];
        for (const url of urls) {
          const match = String(url || "").match(/dpl=[^&]*-([a-f0-9]{40})(?:[&/?#]|$)/i);
          if (match?.[1]) return match[1];
        }
        return explicit;
      }

      const resolvedBrowserSessionId = findBrowserSessionId();
      const resolvedClientGitSha = findClientGitSha();
      const resolvedAuthToken =
        normalizeToken(input.authToken) ||
        findTokenInStorage(localStorage, "auth") ||
        findTokenInStorage(sessionStorage, "auth");
      const resolvedLovableToken =
        normalizeToken(input.lovableToken) ||
        findTokenInStorage(localStorage, "lovable") ||
        findTokenInStorage(sessionStorage, "lovable");
      const resolvedBearerToken = resolvedAuthToken || resolvedLovableToken;

      function headersForLovable({ json = false } = {}) {
        const headers = { accept: "*/*" };
        if (json) headers["content-type"] = "application/json";
        if (resolvedBearerToken) headers.authorization = `Bearer ${resolvedBearerToken}`;
        if (resolvedBrowserSessionId) headers["x-browser-session-id"] = resolvedBrowserSessionId;
        if (resolvedClientGitSha) headers["x-client-git-sha"] = resolvedClientGitSha;
        return headers;
      }

      function workspaceListFromResponse(data) {
        if (Array.isArray(data)) return data;
        if (!data || typeof data !== "object") return [];
        return data.workspaces || data.data || data.items || data.results || [];
      }

      function workspaceFromProjectWorkspaceResponse(data) {
        return String(
          data?.workspace?.id ||
            data?.workspace?.uuid ||
            data?.workspace_id ||
            data?.workspaceId ||
            data?.data?.workspace?.id ||
            data?.data?.workspace_id ||
            data?.id ||
            "",
        ).trim();
      }

      async function fetchJsonOrThrow(url, label) {
        const response = await fetch(url, {
          method: "GET",
          credentials: "include",
          headers: headersForLovable(),
        });
        const text = await response.text();
        const data = safeJsonParse(text);
        if (!response.ok) {
          const message = data?.message || data?.error || `${label} (${response.status})`;
          throw new Error(message);
        }
        return data;
      }

      async function resolveWorkspaceId() {
        const provided = String(input.workspaceId || "").trim();
        if (isValidWorkspaceId(provided)) return provided;

        const projectId = extractProjectIdFromUrl(location.href) || extractProjectIdFromUrl(input.currentLovableUrl);
        if (projectId) {
          try {
            const data = await fetchJsonOrThrow(`${API_ORIGIN}/projects/${encodeURIComponent(projectId)}/workspace`, "Falha ao buscar workspace do projeto");
            const workspaceId = workspaceFromProjectWorkspaceResponse(data);
            if (isValidWorkspaceId(workspaceId)) return workspaceId;
          } catch {}
        }

        const data = await fetchJsonOrThrow(`${API_ORIGIN}/user/workspaces`, "Falha ao buscar workspace");
        for (const item of workspaceListFromResponse(data)) {
          const workspaceId = String(item?.id || item?.uuid || item?.workspace_id || item?.workspaceId || "").trim();
          if (isValidWorkspaceId(workspaceId)) return workspaceId;
        }

        throw new Error("Workspace Lovable nao detectado. Abra o dashboard ou um projeto do Lovable e tente de novo.");
      }

      function tokenFromCastleResult(value) {
        if (isNonEmptyString(value) && value.trim().length > 40) return value.trim();
        if (!value || typeof value !== "object") return "";
        return [
          value.token,
          value.requestToken,
          value.request_token,
          value.castle_request_token,
          value.data?.token,
          value.data?.requestToken,
        ].find((item) => isNonEmptyString(item) && item.trim().length > 40) || "";
      }

      async function callCastleMethod(target, methodName) {
        const method = target?.[methodName];
        if (typeof method !== "function") return "";
        const attempts = [
          [],
          ["create_project"],
          [{ action: "create_project" }],
          [{ method: "POST", url: `${API_ORIGIN}/workspaces/projects` }],
        ];
        for (const args of attempts) {
          try {
            const result = method.apply(target, args);
            const token = tokenFromCastleResult(result && typeof result.then === "function" ? await result : result);
            if (token) return token;
          } catch {}
        }
        return "";
      }

      async function callCastleCommand(fn) {
        if (typeof fn !== "function") return "";
        const attempts = [
          ["createRequestToken"],
          ["create_request_token"],
          ["getRequestToken"],
        ];

        for (const args of attempts) {
          try {
            let callbackResolved = false;
            const callbackToken = await new Promise((resolve) => {
              const timer = setTimeout(() => resolve(""), 500);
              const done = (value) => {
                if (callbackResolved) return;
                callbackResolved = true;
                clearTimeout(timer);
                resolve(tokenFromCastleResult(value));
              };
              try {
                const result = fn.apply(window, [...args, done]);
                Promise.resolve(result).then(done).catch(() => done(""));
              } catch {
                done("");
              }
            });
            if (callbackToken) return callbackToken;

            const result = fn.apply(window, args);
            const token = tokenFromCastleResult(result && typeof result.then === "function" ? await result : result);
            if (token) return token;
          } catch {}
        }
        return "";
      }

      function castleCandidates() {
        const directNames = [
          "Castle",
          "castle",
          "__Castle",
          "__castle",
          "_castle",
          "CastleSDK",
          "castleSDK",
          "__castleClient",
        ];
        const candidates = [];
        for (const name of directNames) {
          try {
            if (window[name]) candidates.push(window[name]);
          } catch {}
        }
        try {
          for (const name of Object.getOwnPropertyNames(window)) {
            if (!/castle/i.test(name)) continue;
            try {
              const value = window[name];
              if (value && typeof value === "object") candidates.push(value);
            } catch {}
          }
        } catch {}
        return [...new Set(candidates)];
      }

      async function createCastleRequestTokenOnce() {
        const methodNames = [
          "createRequestToken",
          "create_request_token",
          "getRequestToken",
          "requestToken",
          "getToken",
        ];
        for (const name of ["_castle", "castle"]) {
          try {
            const token = await callCastleCommand(window[name]);
            if (token) return token;
          } catch {}
        }
        for (const candidate of castleCandidates()) {
          for (const methodName of methodNames) {
            const token = await callCastleMethod(candidate, methodName);
            if (token) return token;
          }
        }
        return "";
      }

      async function createTurnstileFallbackToken() {
        const turnstile = window.turnstile;
        if (!turnstile || typeof turnstile.execute !== "function") return "";
        const siteKey =
          document.querySelector("[data-sitekey]")?.getAttribute("data-sitekey") ||
          "0x4AAAAAAChnKAZBY0iFpFHC";
        try {
          const result = turnstile.execute(siteKey, { action: "create_project" });
          return tokenFromCastleResult(result && typeof result.then === "function" ? await result : result);
        } catch {
          return "";
        }
      }

      async function createCastleRequestToken() {
        const startedAt = Date.now();
        while (Date.now() - startedAt < CASTLE_WAIT_MS) {
          const token = await createCastleRequestTokenOnce();
          if (token) return token;
          await new Promise((resolve) => setTimeout(resolve, 250));
        }

        const fallback = await createTurnstileFallbackToken();
        if (fallback) return fallback;
        throw new Error("Nao consegui gerar castle_request_token. Recarregue a aba do Lovable e tente de novo.");
      }

      async function stopInitialProjectPlan(projectId, userMessageId, aiMessageId) {
        await sleep(AUTO_STOP_DELAY_MS);
        const response = await fetch(
          `${API_ORIGIN}/projects/${encodeURIComponent(projectId)}/chat/${encodeURIComponent(userMessageId)}/cancel`,
          {
            method: "POST",
            credentials: "include",
            headers: headersForLovable({ json: true }),
            body: JSON.stringify({ ai_message_id: aiMessageId }),
          },
        );
        const text = await response.text();
        const data = safeJsonParse(text);
        if (!response.ok) {
          throw new Error(data?.message || data?.error || `Stop retornou ${response.status}.`);
        }
        return data;
      }

      try {
        const prompt = String(input.initialPrompt || "").trim();
        const projectName = String(input.projectName || "").trim();
        const workspaceId = await resolveWorkspaceId();
        const castleRequestToken = await createCastleRequestToken();
        const userMessageId = makePrefixedId("umsg");
        const aiMessageId = makePrefixedId("aimsg");

        const response = await fetch(`${API_ORIGIN}/workspaces/${encodeURIComponent(workspaceId)}/projects`, {
          method: "POST",
          credentials: "include",
          headers: headersForLovable({ json: true }),
          body: JSON.stringify({
            description: prompt,
            visibility: "private",
            env_vars: {},
            metadata: {
              chat_mode_enabled: false,
              fullscreen_enabled: true,
              feature_flag_overrides: {
                "unify-design-systems": false,
              },
            },
            initial_message: {
              id: userMessageId,
              message: prompt,
              files: [],
              optimisticImageUrls: [],
              chat_only: false,
              agent_mode_enabled: false,
              ai_message_id: aiMessageId,
            },
            castle_request_token: castleRequestToken,
          }),
        });

        const text = await response.text();
        const data = safeJsonParse(text);
        if (!response.ok) {
          throw new Error(data?.message || data?.error || `Lovable retornou ${response.status}.`);
        }
        if (!data?.id || !data?.link) throw new Error("Lovable nao retornou o projeto criado.");

        let stopResult = { ok: true };
        try {
          const cancelData = await stopInitialProjectPlan(data.id, userMessageId, aiMessageId);
          stopResult = { ok: true, data: cancelData };
        } catch (error) {
          stopResult = { ok: false, error: error?.message || "Falha ao parar criacao inicial." };
        }

        return {
          ok: true,
          project: {
            id: data.id,
            status: data.status || "in_progress",
            link: data.link,
            projectName,
            workspaceId,
            stopped: stopResult.ok,
            stopError: stopResult.error || "",
          },
        };
      } catch (error) {
        return {
          ok: false,
          error: error?.message || "Falha ao criar projeto no Lovable.",
        };
      }
    },
  });

  const result = execution?.result || {};
  if (!result.ok) throw new Error(result.error || "Falha ao criar projeto no Lovable.");

  const project = result.project || {};
  const projectId = sanitizeProjectId(project.id);
  const projectUrl = String(project.link || "").trim();
  const resultWorkspaceId = sanitizeWorkspaceId(project.workspaceId || workspaceId, {
    browserSessionId,
    trusted: true,
  });

  await storageSet({
    ...(projectId ? { current_project_id: projectId } : {}),
    ...(projectName ? { current_project_name: projectName } : {}),
    ...(projectUrl ? { current_lovable_url: projectUrl } : {}),
    ...(resultWorkspaceId
      ? {
          current_workspace_id: resultWorkspaceId,
          current_workspace_source: "create-project-response",
          [DISPLAY_WORKSPACE_STATUS_KEY]: "Workspace capturado",
        }
      : {}),
    last_context_capture_at: new Date().toISOString(),
  });

  return {
    ok: true,
    sucesso: true,
    success: true,
    projectId: projectId || project.id || "",
    projectUrl,
    projectName,
    workspaceId: resultWorkspaceId || "",
    status: project.status || "in_progress",
    stopped: project.stopped === true,
    stopError: project.stopError || "",
    message: project.stopped === true ? "Projeto criado e stop enviado." : "Projeto criado, mas o stop inicial falhou.",
  };
}

async function publishLovableProjectViaTab(message = {}) {
  if (!chrome.scripting?.executeScript) throw new Error("chrome.scripting indisponivel");

  const stored = await syncActiveLovableTab().catch(() => getStoredLovableContext());
  const browserSessionId = String(
    message.browserSessionId ||
      message.browser_session_id ||
      stored[CAPTURED_BROWSER_SESSION_ID_KEY] ||
      "",
  ).trim();
  const clientGitSha = String(message.clientGitSha || message.client_git_sha || stored.captured_client_git_sha || "").trim();
  const authToken = String(message.authToken || message.auth_token || stored.captured_auth_token || "").trim();
  const lovableToken = String(message.lovableToken || message.lovable_token || stored.captured_lovable_token || "").trim();
  const currentLovableUrl = String(message.currentLovableUrl || message.current_lovable_url || stored.current_lovable_url || "").trim();
  const projectId =
    sanitizeProjectId(message.projectId || message.project_id) ||
    sanitizeProjectId(extractProjectIdFromUrl(currentLovableUrl)) ||
    sanitizeProjectId(stored.current_project_id) ||
    "";
  const projectName = String(message.projectName || message.project_name || stored.current_project_name || "").trim();

  if (!projectId) throw new Error("Projeto Lovable nao detectado. Abra o projeto no lovable.dev e tente de novo.");

  const tab = await getActiveLovableDevTab();
  if (!tab?.id) throw new Error("Abra uma aba do lovable.dev logada antes de publicar projeto.");

  const [execution] = await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    world: "MAIN",
    args: [
      {
        projectId,
        projectName,
        browserSessionId,
        clientGitSha,
        authToken,
        lovableToken,
        currentLovableUrl,
      },
    ],
    func: async (input) => {
      const API_ORIGIN = "https://api.lovable.dev";
      const PROXY_NOTIFY_URL = "https://proxy-worker.lovable.run/__l5e/proxy/new-deployment";
      const POLL_INTERVAL_MS = 5000;
      const FIRST_POLL_DELAY_MS = 900;
      const MAX_POLL_MS = 120000;

      function isNonEmptyString(value) {
        return typeof value === "string" && value.trim().length > 0;
      }

      function safeJsonParse(value) {
        try {
          return JSON.parse(value);
        } catch {
          return {};
        }
      }

      function sleep(ms) {
        return new Promise((resolve) => setTimeout(resolve, ms));
      }

      function isJwt(value) {
        return /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(String(value || "").trim());
      }

      function normalizeToken(value) {
        const text = String(value || "").trim();
        if (!text) return "";
        if (isJwt(text)) return text;
        try {
          const parsed = JSON.parse(text);
          return [
            parsed.access_token,
            parsed.token,
            parsed.authToken,
            parsed.currentSession?.access_token,
            parsed.session?.access_token,
            parsed.data?.access_token,
          ].find((item) => isJwt(item)) || "";
        } catch {
          return "";
        }
      }

      function parseJwtPayload(token) {
        if (!isJwt(token)) return null;
        try {
          const payload = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
          const padded = payload.padEnd(payload.length + ((4 - (payload.length % 4)) % 4), "=");
          return JSON.parse(atob(padded));
        } catch {
          return null;
        }
      }

      function tokenKind(token) {
        const payload = parseJwtPayload(token);
        if (!payload) return "";
        return payload.access_type === "project" || payload.project_id || payload.projectId ? "lovable" : "auth";
      }

      function findTokenInStorage(storage, desiredKind) {
        if (!storage) return "";
        try {
          for (let index = 0; index < storage.length; index += 1) {
            const key = storage.key(index);
            const token = normalizeToken(key ? storage.getItem(key) : "");
            if (token && (!desiredKind || tokenKind(token) === desiredKind)) return token;
          }
        } catch {}
        return "";
      }

      function extractProjectIdFromUrl(value) {
        const text = String(value || "").trim();
        const match = text.match(/\/projects\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i);
        return match?.[1] || "";
      }

      function extractBrowserSessionFromStorage(storage) {
        if (!storage) return "";
        const directKeys = ["browserSessionId", "browser_session_id", "x-browser-session-id"];
        for (const key of directKeys) {
          const value = storage.getItem(key);
          if (isNonEmptyString(value) && !/\s/.test(value)) return value.trim();
        }
        try {
          for (let index = 0; index < storage.length; index += 1) {
            const key = storage.key(index);
            const value = key ? storage.getItem(key) : "";
            if (/browser.*session|x-browser-session-id/i.test(`${key} ${value}`)) {
              const match = String(value || "").match(/bsess_[A-Za-z0-9_-]+|[A-Za-z0-9_-]{16,32}/);
              if (match?.[0]) return match[0];
            }
          }
        } catch {}
        return "";
      }

      function makeBrowserSessionId() {
        const alphabet = "0123456789abcdefghjkmnpqrstvwxyz";
        const bytes = crypto.getRandomValues(new Uint8Array(26));
        return `bsess_${Array.from(bytes, (byte) => alphabet[byte % 32]).join("")}`;
      }

      function findBrowserSessionId() {
        return (
          String(input.browserSessionId || "").trim() ||
          extractBrowserSessionFromStorage(localStorage) ||
          extractBrowserSessionFromStorage(sessionStorage) ||
          makeBrowserSessionId()
        );
      }

      function findClientGitSha() {
        const explicit = String(input.clientGitSha || "").trim();
        if (/^[a-f0-9]{40}$/i.test(explicit)) return explicit;

        const urls = [
          ...Array.from(document.scripts || [], (script) => script.src || ""),
          ...performance.getEntriesByType("resource").map((entry) => entry.name || ""),
        ];
        for (const url of urls) {
          const match = String(url || "").match(/dpl=[^&]*-([a-f0-9]{40})(?:[&/?#]|$)/i);
          if (match?.[1]) return match[1];
        }
        return explicit;
      }

      function slugify(value, fallback) {
        const base = String(value || "")
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-+|-+$/g, "")
          .replace(/-{2,}/g, "-")
          .slice(0, 50)
          .replace(/^-+|-+$/g, "");
        return base || fallback;
      }

      function headersForLovable({ json = false, readAfter } = {}) {
        const headers = { accept: "*/*" };
        if (json) headers["content-type"] = "application/json";
        if (resolvedBearerToken) headers.authorization = `Bearer ${resolvedBearerToken}`;
        if (resolvedBrowserSessionId) headers["x-browser-session-id"] = resolvedBrowserSessionId;
        if (resolvedClientGitSha) headers["x-client-git-sha"] = resolvedClientGitSha;
        if (readAfter) headers["x-lovable-read-after"] = readAfter;
        return headers;
      }

      async function fetchJsonOrThrow(url, options = {}, label = "Lovable") {
        const response = await fetch(url, {
          credentials: "include",
          ...options,
          headers: {
            ...(options.headers || {}),
          },
        });
        const text = await response.text();
        const data = safeJsonParse(text);
        if (!response.ok) {
          throw new Error(data?.message || data?.error || `${label} retornou ${response.status}.`);
        }
        return { data, response, raw: text };
      }

      async function discoverProjectName(projectId) {
        const direct = String(input.projectName || "").trim();
        if (direct) return direct;

        try {
          const { data } = await fetchJsonOrThrow(
            `${API_ORIGIN}/projects/${encodeURIComponent(projectId)}`,
            { method: "GET", headers: headersForLovable({ json: true }) },
            "Falha ao buscar projeto",
          );
          const fromApi = [
            data?.name,
            data?.title,
            data?.slug,
            data?.project?.name,
            data?.project?.title,
            data?.project?.slug,
            data?.data?.name,
            data?.data?.title,
            data?.data?.slug,
          ].find(isNonEmptyString);
          if (fromApi) return fromApi;
        } catch {}

        const title = String(document.title || "").replace(/\s+[-|]\s+Lovable.*$/i, "").trim();
        return title || `acto-${String(projectId || "").slice(0, 8)}`;
      }

      async function notifyProxy(projectId, deploymentId) {
        const response = await fetch(PROXY_NOTIFY_URL, {
          method: "PUT",
          headers: {
            accept: "application/json",
            "content-type": "application/json",
          },
          body: JSON.stringify({
            project_id: projectId,
            deployment_id: deploymentId,
          }),
        });
        const text = await response.text();
        if (!response.ok) throw new Error(text || `Proxy retornou ${response.status}.`);
        return text;
      }

      function normalizeDeploymentProgress(data = {}) {
        const statusText = String(data.status || data.state || "").toLowerCase();
        const step = String(data.step || data.current_step || "").trim();
        const url = String(data.url || data.published_url || data.publishedUrl || "").trim();
        const failed = /fail|error|cancel/i.test(statusText);
        const completed = /complete|success|ready|deployed/i.test(statusText) || Boolean(url && !/running|pending|progress|building/i.test(statusText));
        return {
          status: failed ? "failed" : completed ? "completed" : "running",
          step,
          url,
          buildRunId: data.build_run_id || data.buildRunId || "",
          rawStatus: data.status || data.state || "",
        };
      }

      async function pollDeployment(projectId, deploymentId, initialUrl) {
        const startedAt = Date.now();
        let lastProgress = {
          status: "running",
          step: "Building",
          url: initialUrl || "",
          buildRunId: "",
          rawStatus: "",
        };

        await sleep(FIRST_POLL_DELAY_MS);
        while (Date.now() - startedAt < MAX_POLL_MS) {
          const { data } = await fetchJsonOrThrow(
            `${API_ORIGIN}/projects/${encodeURIComponent(projectId)}/deployments/${encodeURIComponent(deploymentId)}/progress`,
            { method: "GET", headers: headersForLovable({ json: true, readAfter: deploymentId }) },
            "Falha ao consultar progresso",
          );
          lastProgress = normalizeDeploymentProgress(data);
          if (lastProgress.status === "failed") {
            throw new Error(data?.message || data?.error || `Deploy falhou${lastProgress.step ? ` em ${lastProgress.step}` : ""}.`);
          }
          if (lastProgress.status === "completed") return lastProgress;
          await sleep(POLL_INTERVAL_MS);
        }

        return lastProgress;
      }

      const resolvedBrowserSessionId = findBrowserSessionId();
      const resolvedClientGitSha = findClientGitSha();
      const resolvedAuthToken =
        normalizeToken(input.authToken) ||
        findTokenInStorage(localStorage, "auth") ||
        findTokenInStorage(sessionStorage, "auth");
      const resolvedLovableToken =
        normalizeToken(input.lovableToken) ||
        findTokenInStorage(localStorage, "lovable") ||
        findTokenInStorage(sessionStorage, "lovable");
      const resolvedBearerToken = resolvedAuthToken || resolvedLovableToken;

      try {
        const projectId = extractProjectIdFromUrl(location.href) || extractProjectIdFromUrl(input.currentLovableUrl) || String(input.projectId || "").trim();
        if (!projectId) throw new Error("Projeto Lovable nao detectado.");

        const discoveredName = await discoverProjectName(projectId);
        const deploymentName = slugify(discoveredName, `acto-${projectId.slice(0, 8)}`);

        await fetchJsonOrThrow(
          `${API_ORIGIN}/projects/${encodeURIComponent(projectId)}`,
          {
            method: "PUT",
            headers: headersForLovable({ json: true }),
            body: JSON.stringify({ publish_visibility: "public" }),
          },
          "Falha ao ativar visibilidade publica",
        );

        const deployment = await fetchJsonOrThrow(
          `${API_ORIGIN}/projects/${encodeURIComponent(projectId)}/deployments?async=true`,
          {
            method: "POST",
            headers: headersForLovable({ json: true }),
            body: JSON.stringify({ name: deploymentName }),
          },
          "Falha ao iniciar publicacao",
        );

        const deploymentData = deployment.data || {};
        const deploymentId = String(deploymentData.deployment_id || deploymentData.deploymentId || deploymentData.id || "").trim();
        const deploymentUrl = String(deploymentData.url || deploymentData.published_url || deploymentData.publishedUrl || "").trim();
        if (!deploymentId) throw new Error("Lovable nao retornou deployment_id.");

        const progress = await pollDeployment(projectId, deploymentId, deploymentUrl);
        let proxyResult = { ok: false, error: "" };
        if (progress.status === "completed") {
          try {
            const text = await notifyProxy(projectId, deploymentId);
            proxyResult = { ok: true, text };
          } catch (error) {
            proxyResult = { ok: false, error: error?.message || "Falha ao avisar proxy." };
          }
        }

        const projectUrl = progress.url || deploymentUrl;
        return {
          ok: true,
          project: {
            projectId,
            projectName: discoveredName,
            deploymentName,
            deploymentId,
            projectUrl,
            status: progress.status,
            step: progress.step,
            proxyNotified: proxyResult.ok,
            proxyError: proxyResult.error || "",
          },
        };
      } catch (error) {
        return {
          ok: false,
          error: error?.message || "Falha ao publicar projeto no Lovable.",
        };
      }
    },
  });

  const result = execution?.result || {};
  if (!result.ok) throw new Error(result.error || "Falha ao publicar projeto no Lovable.");

  const project = result.project || {};
  const deploymentId = String(project.deploymentId || "").trim();
  const publishedUrl = String(project.projectUrl || "").trim();
  const status = String(project.status || "running").trim() || "running";

  await storageSet({
    current_project_id: projectId,
    ...(project.projectName ? { current_project_name: project.projectName } : {}),
    ...(deploymentId ? { current_deployment_id: deploymentId } : {}),
    ...(publishedUrl ? { current_published_url: publishedUrl } : {}),
    last_context_capture_at: new Date().toISOString(),
  });

  return {
    ok: true,
    sucesso: true,
    success: true,
    projectId,
    projectName: project.projectName || projectName || "",
    deploymentName: project.deploymentName || "",
    deploymentId,
    projectUrl: publishedUrl,
    status,
    step: project.step || "",
    proxyNotified: project.proxyNotified === true,
    proxyError: project.proxyError || "",
    message:
      status === "completed"
        ? project.proxyNotified === false && project.proxyError
          ? "Projeto publicado, mas o proxy nao confirmou."
          : "Projeto publicado."
        : "Publicacao em andamento...",
  };
}

function isYouTubeUrl(url) {
  try {
    const hostname = new URL(url).hostname.replace(/^www\./, "").toLowerCase();
    return hostname === "youtube.com" || hostname === "youtu.be" || hostname === "youtube-nocookie.com";
  } catch {
    return false;
  }
}

function decodeYouTubeJsonString(value) {
  try {
    return JSON.parse(`"${String(value || "").replace(/\r/g, "\\r").replace(/\n/g, "\\n")}"`);
  } catch {
    return String(value || "")
      .replace(/\\u0026/g, "&")
      .replace(/\\"/g, '"')
      .replace(/\\\\/g, "\\");
  }
}

function pickYouTubeText(block, patterns) {
  for (const pattern of patterns) {
    const match = block.match(pattern);
    if (match?.[1]) return decodeYouTubeJsonString(match[1]);
  }

  return "";
}

function parseYouTubeResults(html) {
  const results = [];
  const seen = new Set();
  const rendererPattern = /"videoRenderer":\{"videoId":"([a-zA-Z0-9_-]{11})"/g;
  let match;

  while ((match = rendererPattern.exec(html)) && results.length < 20) {
    const videoId = match[1];
    if (seen.has(videoId)) continue;

    const block = html.slice(match.index, match.index + 9000);
    const title = pickYouTubeText(block, [
      /"title":\{"runs":\[\{"text":"((?:\\.|[^"\\])*)"/,
      /"title":\{"simpleText":"((?:\\.|[^"\\])*)"/,
    ]);

    if (!title) continue;

    const channel = pickYouTubeText(block, [
      /"ownerText":\{"runs":\[\{"text":"((?:\\.|[^"\\])*)"/,
      /"longBylineText":\{"runs":\[\{"text":"((?:\\.|[^"\\])*)"/,
      /"shortBylineText":\{"runs":\[\{"text":"((?:\\.|[^"\\])*)"/,
    ]);
    const duration = pickYouTubeText(block, [
      /"lengthText":\{"accessibility":\{"accessibilityData":\{"label":"((?:\\.|[^"\\])*)"/,
      /"lengthText":\{"simpleText":"((?:\\.|[^"\\])*)"/,
    ]);

    seen.add(videoId);
    results.push({
      videoId,
      title,
      channel,
      duration,
      thumbnail: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
      thumbnailUrl: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
      url: `https://www.youtube.com/watch?v=${videoId}`,
    });
  }

  return results;
}

async function searchYouTube(query) {
  const trimmed = String(query || "").trim();
  if (!trimmed) throw new Error("Digite uma busca.");
  if (trimmed.length > 200) throw new Error("Busca muito longa.");

  const url = `https://www.youtube.com/results?search_query=${encodeURIComponent(trimmed)}&sp=EgIQAQ%253D%253D`;
  let response;
  try {
    response = await fetch(url, {
      headers: {
        "Accept-Language": "pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7",
        Accept: "text/html,application/xhtml+xml",
      },
    });
  } catch {
    throw new Error("Falha ao conectar no YouTube. Recarregue a extensao e tente novamente.");
  }

  if (!response.ok) throw new Error(`YouTube respondeu ${response.status}.`);

  const html = await response.text();
  const results = parseYouTubeResults(html);
  if (!results.length) throw new Error("Nenhum video encontrado.");

  return results;
}

function extractYouTubeVideoId(url) {
  if (!isNonEmptyString(url)) return undefined;

  try {
    const parsed = new URL(url);
    const hostname = parsed.hostname.replace(/^www\./, "").toLowerCase();

    if (hostname === "youtu.be") {
      const id = parsed.pathname.split("/").filter(Boolean)[0];
      return /^[A-Za-z0-9_-]{6,}$/.test(id || "") ? id : undefined;
    }

    if (hostname !== "youtube.com" && hostname !== "youtube-nocookie.com") return undefined;

    const watchId = parsed.searchParams.get("v");
    if (/^[A-Za-z0-9_-]{6,}$/.test(watchId || "")) return watchId || undefined;

    const pathId = parsed.pathname.match(/\/(?:embed|shorts|live)\/([A-Za-z0-9_-]{6,})/)?.[1];
    return /^[A-Za-z0-9_-]{6,}$/.test(pathId || "") ? pathId : undefined;
  } catch {
    return url.match(/[?&]v=([A-Za-z0-9_-]{6,})/)?.[1];
  }
}

async function getMusicState() {
  const state = await storageGet([YOUTUBE_WINDOW_KEY, YOUTUBE_TAB_KEY, LAST_YOUTUBE_URL_KEY, SELECTED_VIDEO_ID_KEY]);
  return {
    youtubeWindowId: state[YOUTUBE_WINDOW_KEY],
    youtubeTabId: state[YOUTUBE_TAB_KEY],
    lastYouTubeUrl: state[LAST_YOUTUBE_URL_KEY],
    selectedVideoId: state[SELECTED_VIDEO_ID_KEY],
  };
}

async function persistYouTubeTab(windowId, tabId, url) {
  const updates = {};
  let detectedVideoId;

  if (typeof windowId === "number") updates[YOUTUBE_WINDOW_KEY] = windowId;
  if (typeof tabId === "number") updates[YOUTUBE_TAB_KEY] = tabId;
  if (isNonEmptyString(url)) {
    updates[LAST_YOUTUBE_URL_KEY] = url;
    const videoId = extractYouTubeVideoId(url);
    if (videoId) {
      detectedVideoId = videoId;
      updates[SELECTED_VIDEO_ID_KEY] = videoId;
    } else {
      updates[LAST_AUTO_MINI_VIDEO_ID_KEY] = "";
    }
  }

  if (Object.keys(updates).length > 0) await storageSet(updates);

  if (AUTO_OPEN_MINI_ON_YOUTUBE_DETECT && detectedVideoId) {
    const { [LAST_AUTO_MINI_VIDEO_ID_KEY]: lastAutoMiniVideoId } = await storageGet([LAST_AUTO_MINI_VIDEO_ID_KEY]);
    if (lastAutoMiniVideoId !== detectedVideoId) {
      await storageSet({ [LAST_AUTO_MINI_VIDEO_ID_KEY]: detectedVideoId });
      await openMiniPlayer(detectedVideoId);
    }
  }

  return getMusicState();
}

async function getExistingYouTubePopup() {
  const state = await getMusicState();
  const windowId = state.youtubeWindowId;
  if (typeof windowId !== "number") return { state };

  return new Promise((resolve) => {
    chrome.windows.get(windowId, { populate: true }, async (windowInfo) => {
      if (chrome.runtime.lastError || !windowInfo) {
        await storageRemove([YOUTUBE_WINDOW_KEY, YOUTUBE_TAB_KEY]);
        resolve({ state: await getMusicState() });
        return;
      }

      const tab = windowInfo.tabs?.find((item) => item.id === state.youtubeTabId) || windowInfo.tabs?.[0];
      resolve({ windowInfo, tab, state });
    });
  });
}

async function createYouTubePopup(url = YOUTUBE_HOME_URL) {
  return new Promise((resolve) => {
    chrome.windows.create(
      {
        url,
        type: "popup",
        width: 430,
        height: 720,
        left: 80,
        top: 80,
      },
      async (windowInfo) => {
        const tab = windowInfo?.tabs?.[0];
        const state = await persistYouTubeTab(windowInfo?.id, tab?.id, tab?.url || url);
        resolve(state);
      },
    );
  });
}

async function openYouTubePopup(url = YOUTUBE_HOME_URL) {
  const targetUrl = isNonEmptyString(url) && isYouTubeUrl(url) ? url : YOUTUBE_HOME_URL;
  const existing = await getExistingYouTubePopup();
  if (existing.windowInfo?.id) {
    chrome.windows.update(existing.windowInfo.id, { focused: true });
    if (existing.tab?.id) chrome.tabs.update(existing.tab.id, { active: true, url: targetUrl });
    return persistYouTubeTab(existing.windowInfo.id, existing.tab?.id, targetUrl);
  }

  return createYouTubePopup(targetUrl);
}

async function reopenYouTube() {
  const state = await getMusicState();
  const targetUrl = state.lastYouTubeUrl || YOUTUBE_HOME_URL;
  const existing = await getExistingYouTubePopup();

  if (existing.windowInfo?.id) {
    chrome.windows.update(existing.windowInfo.id, { focused: true });
    if (existing.tab?.id) chrome.tabs.update(existing.tab.id, { active: true, url: targetUrl });
    return persistYouTubeTab(existing.windowInfo.id, existing.tab?.id, targetUrl);
  }

  return createYouTubePopup(targetUrl);
}

async function openMiniPlayer(videoId) {
  if (!/^[A-Za-z0-9_-]{6,}$/.test(videoId || "")) return getMusicState();

  const url = `${ACTO_PLAYER_BASE_URL}?videoId=${encodeURIComponent(videoId)}`;
  chrome.windows.create({
    url,
    type: "popup",
    width: 390,
    height: 260,
    left: 900,
    top: 600,
  });

  await storageSet({ [SELECTED_VIDEO_ID_KEY]: videoId });
  return getMusicState();
}

async function closeYouTubePopup() {
  const state = await getMusicState();

  if (typeof state.youtubeWindowId === "number") {
    await new Promise((resolve) => {
      chrome.windows.remove(state.youtubeWindowId, () => resolve());
    });
  } else if (typeof state.youtubeTabId === "number") {
    await new Promise((resolve) => {
      chrome.tabs.remove(state.youtubeTabId, () => resolve());
    });
  }

  await storageRemove([YOUTUBE_WINDOW_KEY, YOUTUBE_TAB_KEY]);
  return getMusicState();
}

async function handleMusicMessage(message) {
  switch (message?.type) {
    case "ACTO_MUSIC_GET_STATE":
      return getMusicState();
    case "ACTO_MUSIC_OPEN_YOUTUBE_POPUP":
      return openYouTubePopup(message.url);
    case "ACTO_MUSIC_REOPEN_YOUTUBE":
      return reopenYouTube();
    case "ACTO_MUSIC_OPEN_MINI_PLAYER":
      return openMiniPlayer(message.videoId);
    case "ACTO_MUSIC_CLOSE_YOUTUBE_POPUP":
      return closeYouTubePopup();
    default:
      return undefined;
  }
}

function captureLovableHeaders(details) {
  if (!details || !isLovableUrl(details.url)) return;
  if (!shouldAcceptTabCapture(details.tabId)) return;

  const context = {
    requestUrl: details.url,
    current_lovable_url: details.documentUrl || details.initiator || "",
    source: "webRequest",
  };

  for (const header of details.requestHeaders || []) {
    const name = String(header.name || "").toLowerCase();
    const value = String(header.value || "");

    if (name === "authorization") {
      context.token = tokenFromAuthorization(value);
    }

    if (name === "x-client-git-sha") {
      context.clientGitSha = value;
    }

    if (name === "x-browser-session-id") {
      context.browserSessionId = value.trim();
    }
  }

  logTokenCapture("webRequest observed", {
    requestUrl: safeUrlPath(details.url),
    hasAuthorization: Boolean(context.token),
    hasBrowserSessionId: Boolean(context.browserSessionId),
  });

  persistLovableContext(context);
}

function captureLovableRequestBody(details) {
  if (!details || !isLovableUrl(details.url)) return;
  if (!shouldAcceptTabCapture(details.tabId)) return;

  const payload = decodeRequestBody(details);
  if (!payload) return;

  persistLovableContext({
    requestUrl: details.url,
    current_lovable_url: details.documentUrl || details.initiator || "",
    source: "request",
    requestPayload: payload,
  });
}

if (chrome.webRequest?.onBeforeSendHeaders) {
  chrome.webRequest.onBeforeSendHeaders.addListener(
    captureLovableHeaders,
    { urls: LOVABLE_URL_FILTERS },
    ["requestHeaders", "extraHeaders"],
  );
}

if (chrome.webRequest?.onBeforeRequest) {
  chrome.webRequest.onBeforeRequest.addListener(captureLovableRequestBody, { urls: LOVABLE_URL_FILTERS }, ["requestBody"]);
}


function normalizeNativeChatMaskPayload(payload = {}) {
  const promptText = String(payload.promptText || payload.prompt || payload.finalMessage || payload.message || "").trim();
  const title = String(payload.text || "⚡ 𝖠𝖢𝖳𝖮⚡ 𝖯𝗋𝗈𝗆𝗉𝗍 𝖱𝖾𝖼𝖾𝖻𝗂𝖽𝗈").trim();
  const displayText = String(payload.displayText || `${title}${promptText ? `\n\n${promptText}` : ""}`).trim();
  return {
    text: title,
    mode: String(payload.mode || "basic"),
    promptText,
    displayText,
    fileCount: Number(payload.fileCount || 0) || 0,
    fileNames: Array.isArray(payload.fileNames) ? payload.fileNames.map((name) => String(name || "").trim()).filter(Boolean).slice(0, 10) : [],
    ts: Number(payload.ts || Date.now()),
  };
}

function extractNativeMaskFileNames(params = {}) {
  const refs = Array.isArray(params.file_refs) ? params.file_refs : [];
  const inline = Array.isArray(params.files_inline) ? params.files_inline : [];
  return [...refs, ...inline]
    .map((item) => String(item?.name || item?.fileName || item?.filename || item?.title || "").trim())
    .filter(Boolean)
    .slice(0, 10);
}

async function publishNativeChatMask(payload = {}) {
  const normalized = normalizeNativeChatMaskPayload(payload);
  await chrome.storage?.local?.set?.({ [NATIVE_CHAT_MASK_STORAGE_KEY]: normalized });

  let tab = await getActiveTab();
  if (!tab?.id || !isLovableUrl(tab.url || "")) {
    await syncActiveLovableTab().catch(() => undefined);
    tab = await getActiveTab();
  }

  if (tab?.id && isLovableUrl(tab.url || "")) {
    await sendTabMessage(tab.id, { type: NATIVE_CHAT_MASK_MESSAGE_TYPE, payload: normalized });
  }

  console.info("[ACTO MASK] published", {
    fileCount: normalized.fileCount,
    promptLength: normalized.promptText.length,
  });
  return normalized;
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type === CREATE_LOVABLE_PROJECT_MESSAGE_TYPE) {
    if (!isExtensionPageSender(sender)) {
      sendResponse({ ok: false, error: "Origem ACTO invalida." });
      return false;
    }

    createLovableProjectViaTab(message)
      .then((payload) => sendResponse(payload))
      .catch((error) => sendResponse({ ok: false, sucesso: false, success: false, error: error?.message || "Falha ao criar projeto" }));
    return true;
  }

  if (message?.type === PUBLISH_LOVABLE_PROJECT_MESSAGE_TYPE) {
    if (!isExtensionPageSender(sender)) {
      sendResponse({ ok: false, error: "Origem ACTO invalida." });
      return false;
    }

    publishLovableProjectViaTab(message)
      .then((payload) => sendResponse(payload))
      .catch((error) => sendResponse({ ok: false, sucesso: false, success: false, error: error?.message || "Falha ao publicar projeto" }));
    return true;
  }

  if (message?.type === GET_LOVABLE_SKILLS_MESSAGE_TYPE) {
    if (!isExtensionPageSender(sender)) {
      sendResponse({ ok: false, error: "Origem ACTO invalida." });
      return false;
    }

    getLovableSkillsViaTab(message)
      .then((payload) => sendResponse(payload))
      .catch((error) => sendResponse({ ok: false, skills: [], error: error?.message || "Falha ao carregar skills" }));
    return true;
  }

  if (message?.type === RESPOND_LOVABLE_TOOL_MESSAGE_TYPE) {
    if (!isExtensionPageSender(sender)) {
      sendResponse({ ok: false, error: "Origem ACTO invalida." });
      return false;
    }

    respondLovableToolViaTab(message)
      .then((payload) => sendResponse({ ok: true, ...payload }))
      .catch((error) => sendResponse({ ok: false, error: error?.message || "Falha ao responder acao da Lovable" }));
    return true;
  }

  if (message?.type === PUBLISH_NATIVE_CHAT_MASK_MESSAGE_TYPE || message?.type === NATIVE_CHAT_MASK_MESSAGE_TYPE) {
    publishNativeChatMask(message.payload || message.nativeChatMask || {})
      .then((payload) => sendResponse({ ok: true, payload }))
      .catch((error) => sendResponse({ ok: false, error: error?.message || "Falha ao publicar native chat mask" }));
    return true;
  }

  if (message?.type === "acto.putGcs") {
    putGcsSignedUrl(message.uploadUrl || message.url, message.body || message.blob, message.mime, message.headers)
      .then((result) => sendResponse(result))
      .catch((error) => sendResponse({ ok: false, error: error?.message || "Falha no PUT GCS" }));
    return true;
  }

  if (message?.type === "acto.uploadViaTab") {
    uploadFilesViaLovableTab(message)
      .then((results) => sendResponse({ ok: true, results }))
      .catch((error) => sendResponse({ ok: false, error: error?.message || "Falha no upload via aba Lovable" }));
    return true;
  }

  const edgeAction = message?.type === ACTO_EDGE_ACTION_MESSAGE_TYPE || String(message?.type || "").startsWith("acto.")
    ? edgeActionFromMessage(message)
    : "";
  if (isNonEmptyString(edgeAction)) {
    callActoEdge(edgeAction, message.params || message.payload || {}, message.context || {})
      .then((result) => sendResponse({ actoEdge: true, ...result }))
      .catch((error) => sendResponse({ actoEdge: true, ok: false, error: error?.message || "Falha na Edge ACTO" }));
    return true;
  }

  if (message?.type === COLLAPSE_TO_FLOATING_ICON_MESSAGE_TYPE) {
    collapseToFloatingIcon()
      .then((closed) => sendResponse({ ok: true, closed }))
      .catch((error) => sendResponse({ ok: false, error: error?.message || "Falha ao retrair" }));
    return true;
  }

  if (message?.type === OPEN_FLOATING_EXTENSION_MODAL_MESSAGE_TYPE) {
    openSidePanelForTab(sender?.tab)
      .then((opened) => sendResponse({ ok: true, opened }))
      .catch((error) => sendResponse({ ok: false, error: error?.message || "Falha ao abrir painel" }));
    return true;
  }

  if (message?.type === OPEN_SIDE_PANEL_MODE_MESSAGE_TYPE) {
    moveFloatingModalToSidePanel(sender?.tab)
      .then((opened) => sendResponse({ ok: opened, opened, error: opened ? undefined : "Abra uma aba do Lovable para alternar o painel." }))
      .catch((error) => sendResponse({ ok: false, opened: false, error: error?.message || "Falha ao abrir painel lateral" }));
    return true;
  }

  if (message?.type === OPEN_STORE_MODAL_MESSAGE_TYPE) {
    openStoreModalOnTab(sender?.tab)
      .then((opened) => sendResponse({ ok: opened, opened, error: opened ? undefined : "Abra uma aba do Lovable para abrir a Loja." }))
      .catch((error) => sendResponse({ ok: false, opened: false, error: error?.message || "Falha ao abrir Loja" }));
    return true;
  }

  if (message?.type === OPEN_NOTES_MODAL_MESSAGE_TYPE) {
    openNotesModalOnTab(sender?.tab)
      .then((opened) => sendResponse({ ok: opened, opened, error: opened ? undefined : "Abra uma aba do Lovable para abrir o Notas." }))
      .catch((error) => sendResponse({ ok: false, opened: false, error: error?.message || "Falha ao abrir Notas" }));
    return true;
  }

  if (message?.type === ACTIVE_CONTEXT_MESSAGE_TYPE) {
    syncActiveLovableTab()
      .then(async (context) => {
        if (message.includeActoCredentials === true && isExtensionPageSender(sender)) {
          const stored = await storageGet([ACTO_LICENSE_KEY, ACTO_DEVICE_ID_KEY]);
          const deviceId = await getOrCreateActoDeviceId(stored[ACTO_DEVICE_ID_KEY]);
          sendResponse({
            ok: true,
            context: {
              ...context,
              license_key: stored[ACTO_LICENSE_KEY] || "",
              device_id: deviceId,
            },
          });
          return;
        }

        sendResponse({ ok: true, context });
      })
      .catch((error) => sendResponse({ ok: false, error: error?.message || "Falha ao sincronizar aba ativa" }));
    return true;
  }

  if (message?.type === YOUTUBE_SEARCH_MESSAGE_TYPE) {
    searchYouTube(message.query)
      .then((results) => sendResponse({ ok: true, results }))
      .catch((error) => sendResponse({ ok: false, error: error?.message || "Falha na busca." }));
    return true;
  }

  if (message?.type === YOUTUBE_PLAY_ON_PAGE_MESSAGE_TYPE) {
    playYouTubeOnLovablePage(message)
      .then((result) => sendResponse({ ok: true, ...result }))
      .catch((error) => sendResponse({ ok: false, error: error?.message || "Falha ao tocar video." }));
    return true;
  }

  if (typeof message?.type === "string" && message.type.startsWith(MUSIC_MESSAGE_PREFIX)) {
    handleMusicMessage(message)
      .then((state) => sendResponse({ ok: true, state }))
      .catch((error) => sendResponse({ ok: false, error: error?.message || "Music action failed" }));
    return true;
  }

  if (message?.type !== CONTEXT_MESSAGE_TYPE) return false;
  const isTokenHookCapture = message.payload?.source === "page-fetch-hook" || message.payload?.source === "page-xhr-hook";
  if (!isTokenHookCapture && !shouldAcceptTabCapture(sender.tab?.id)) {
    sendResponse({ ok: true, ignored: true });
    return false;
  }

  persistLovableContext({
    ...(message.payload || {}),
    current_lovable_url: message.payload?.current_lovable_url || sender.tab?.url || "",
  });

  sendResponse({ ok: true });
  return false;
});

function persistTabUrl(tab) {
  if (!tab?.url || !isLovableUrl(tab.url)) return;
  persistLovableContext({ current_lovable_url: tab.url, tabTitle: tab.title });
}

function schedulePersistTabUrl(tab) {
  if (!tab?.url || !isLovableUrl(tab.url)) return;
  clearTimeout(activeTabSyncTimer);
  activeTabSyncTimer = setTimeout(() => persistTabUrl(tab), ACTIVE_TAB_SYNC_DEBOUNCE_MS);
}

chrome.tabs?.onUpdated?.addListener((_tabId, changeInfo, tab) => {
  if (!shouldAcceptTabCapture(tab?.id)) return;
  if (changeInfo.url || tab?.url) schedulePersistTabUrl({ ...tab, url: changeInfo.url || tab.url });
});

chrome.tabs?.onUpdated?.addListener(async (tabId, changeInfo, tab) => {
  const state = await getMusicState();
  if (tabId !== state.youtubeTabId) return;

  const url = changeInfo.url || tab?.url;
  if (!isNonEmptyString(url) || !isYouTubeUrl(url)) return;

  persistYouTubeTab(tab?.windowId, tabId, url);
});

chrome.tabs?.onRemoved?.addListener(async (tabId) => {
  const state = await getMusicState();
  if (tabId === state.youtubeTabId) await storageRemove([YOUTUBE_WINDOW_KEY, YOUTUBE_TAB_KEY]);
});

chrome.windows?.onRemoved?.addListener(async (windowId) => {
  const state = await getMusicState();
  if (windowId === state.youtubeWindowId) await storageRemove([YOUTUBE_WINDOW_KEY, YOUTUBE_TAB_KEY]);
});

chrome.tabs?.onActivated?.addListener((activeInfo) => {
  activeTabId = activeInfo.tabId;
  chrome.tabs.get(activeInfo.tabId, (tab) => {
    if (chrome.runtime.lastError) return;
    schedulePersistTabUrl(tab);
  });
});

chrome.tabs?.query?.({ active: true, lastFocusedWindow: true }, (tabs) => {
  const tab = tabs?.[0];
  activeTabId = tab?.id;
  persistTabUrl(tab);
});

enableSidePanelManualMode();
sanitizeStoredWorkspaceContext().catch((error) => console.warn("[ACTO workspace] cleanup failed", error));
chrome.runtime.onInstalled.addListener(enableSidePanelManualMode);

chrome.action.onClicked.addListener(async (tab) => {
  try {
    await openSidePanelForTab(tab);
  } catch (error) {
    console.warn("Unable to open ACTO side panel", error);
  }
});

// ============================================================
// ACTO License Validation (MV3 alarms, dual-format key support)
// ============================================================
const ACTO_LICENSE_API_BASE = "https://bldjotvptyxnnxwvcufk.supabase.co/functions/v1";
const ACTO_LICENSE_TERMINAL_STATUSES = new Set(["expired", "revoked", "not_found"]);
const ACTO_LICENSE_VALIDATE_ENDPOINT = `${ACTO_LICENSE_API_BASE}/validate-license`;
const ACTO_LICENSE_STATUS_KEY = "license_status";
const ACTO_LICENSE_EXPIRES_KEY = "license_expires_at";
const ACTO_LICENSE_LAST_CHECK_KEY = "license_last_check";
const ACTO_LICENSE_POLL_ALARM = "license_poll";
const ACTO_LICENSE_POLL_PERIOD_MIN = 0.5; // 30s
// Unified regex: accepts legacy (3 segs) + new (4 segs) formats
const ACTO_LICENSE_REGEX = /^[A-Z]{2,5}(-[A-Z0-9]{3}){2,3}$/;

function isValidActoLicenseFormat(key) {
  return typeof key === "string" && ACTO_LICENSE_REGEX.test(key.trim());
}

async function validateActoLicense() {
  const stored = await storageGet([ACTO_LICENSE_KEY, ACTO_DEVICE_ID_KEY]);
  const key = stored[ACTO_LICENSE_KEY];
  if (!key) return { status: "not_found", reason: "no_key" };

  const deviceId = await getOrCreateActoDeviceId(stored[ACTO_DEVICE_ID_KEY]);

  try {
    const resp = await fetch(ACTO_LICENSE_VALIDATE_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key, device_id: deviceId }),
    });
    if (!resp.ok) {
      console.warn("[ACTO license] HTTP", resp.status);
      return { status: "network_error", reason: `http_${resp.status}` };
    }
    const data = await resp.json();
    await storageSet({
      [ACTO_LICENSE_STATUS_KEY]: data.status || "unknown",
      [ACTO_LICENSE_EXPIRES_KEY]: data.expires_at || null,
      [ACTO_LICENSE_LAST_CHECK_KEY]: Date.now(),
    });

    if (ACTO_LICENSE_TERMINAL_STATUSES.has(data.status)) {
      await forceActoLogout(data.reason || data.status);
    }
    return data;
  } catch (error) {
    console.warn("[ACTO license] validate failed", error);
    return { status: "network_error", reason: error?.message || "fetch_failed" };
  }
}

async function forceActoLogout(reason) {
  try {
    await new Promise((resolve) =>
      chrome.storage.local.remove(
        [ACTO_LICENSE_KEY, ACTO_DEVICE_ID_KEY, "session", ACTO_LICENSE_STATUS_KEY, ACTO_LICENSE_EXPIRES_KEY],
        () => resolve()
      )
    );
    chrome.runtime.sendMessage({ type: "FORCE_LOGOUT", reason }).catch(() => {});
    chrome.alarms.clear(ACTO_LICENSE_POLL_ALARM).catch(() => {});
  } catch (error) {
    console.warn("[ACTO license] forceLogout failed", error);
  }
}

async function ensureActoLicensePollAlarm() {
  const existing = await chrome.alarms.get(ACTO_LICENSE_POLL_ALARM).catch(() => null);
  if (existing) return;
  await chrome.alarms.create(ACTO_LICENSE_POLL_ALARM, {
    periodInMinutes: ACTO_LICENSE_POLL_PERIOD_MIN,
    delayInMinutes: ACTO_LICENSE_POLL_PERIOD_MIN,
  });
}

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm?.name === ACTO_LICENSE_POLL_ALARM) {
    validateActoLicense().catch((error) => console.warn("[ACTO license] poll error", error));
  }
});

chrome.runtime.onStartup.addListener(() => {
  ensureActoLicensePollAlarm().catch(() => {});
  validateActoLicense().catch(() => {});
});
chrome.runtime.onInstalled.addListener(() => {
  ensureActoLicensePollAlarm().catch(() => {});
  validateActoLicense().catch(() => {});
});

// Expose validation to popup/content scripts on demand
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === "ACTO_VALIDATE_LICENSE_NOW") {
    validateActoLicense()
      .then((data) => sendResponse({ ok: true, data }))
      .catch((error) => sendResponse({ ok: false, error: error?.message || "validate failed" }));
    return true;
  }
  if (message?.type === "ACTO_CHECK_LICENSE_FORMAT") {
    sendResponse({ ok: true, valid: isValidActoLicenseFormat(message.key) });
    return false;
  }
});

ensureActoLicensePollAlarm().catch(() => {});
