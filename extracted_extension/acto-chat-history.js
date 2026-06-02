/* ACTO Chat History — sidepanel local conversation overlay
 * v17.1 — captura prompts via fetch interception, renderiza bolhas estilo
 * WhatsApp/ChatGPT, persiste em chrome.storage.session durante a sessão.
 * Não toca bundle React. Não puxa histórico nativo da Lovable.
 */
(() => {
  "use strict";
  if (globalThis.__ACTO_CHAT_HISTORY__) return;
  globalThis.__ACTO_CHAT_HISTORY__ = true;

  const STORAGE_KEY = "acto_chat_history_session";
  const MAX_MESSAGES = 300;
  const SESSION_OK = !!(chrome?.storage?.session);
  const ENDPOINTS = [
    "/functions/v1/acto-tier-s",
    "/functions/v1/acto-v2",
  ];

  /** @type {Array<{id:string,role:"user",text:string,createdAt:number,status:"sending"|"sent"|"error"}>} */
  let messages = [];
  let listEl = null;
  let rootEl = null;
  let mounted = false;

  // ───── storage ───────────────────────────────────────────────────────────
  const loadSession = async () => {
    if (!SESSION_OK) return [];
    try {
      const o = await chrome.storage.session.get(STORAGE_KEY);
      return Array.isArray(o?.[STORAGE_KEY]) ? o[STORAGE_KEY] : [];
    } catch { return []; }
  };
  const saveSession = () => {
    if (!SESSION_OK) return;
    try { chrome.storage.session.set({ [STORAGE_KEY]: messages.slice(-MAX_MESSAGES) }); } catch {}
  };

  // ───── styles ────────────────────────────────────────────────────────────
  const injectStyles = () => {
    if (document.getElementById("acto-chat-history-style")) return;
    const s = document.createElement("style");
    s.id = "acto-chat-history-style";
    s.textContent = `
      #acto-chat-history-root{
        position:fixed; left:8px; right:8px; bottom:auto; top:auto;
        z-index:2147483600;
        pointer-events:none;
        display:flex; flex-direction:column;
        font-family:'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, monospace;
      }
      #acto-chat-history-root *{ box-sizing:border-box; }
      #acto-chat-history-card{
        pointer-events:auto;
        margin-top:8px;
        background:linear-gradient(180deg, rgba(8,12,20,0.92), rgba(8,12,20,0.86));
        border:1px solid rgba(125,247,205,0.28);
        border-radius:14px;
        backdrop-filter:blur(14px) saturate(1.1);
        -webkit-backdrop-filter:blur(14px) saturate(1.1);
        box-shadow:0 10px 40px rgba(0,0,0,0.5), 0 0 0 1px rgba(125,247,205,0.06) inset;
        overflow:hidden;
        display:flex; flex-direction:column;
        max-height:38vh; min-height:0;
        transition:max-height .25s ease;
      }
      #acto-chat-history-card[data-collapsed="1"]{ max-height:42px; }
      #acto-chat-history-head{
        display:flex; align-items:center; gap:8px;
        padding:8px 10px;
        border-bottom:1px solid rgba(125,247,205,0.14);
        background:linear-gradient(90deg, rgba(125,247,205,0.06), rgba(167,139,250,0.04));
        cursor:pointer; user-select:none;
        flex:0 0 auto;
      }
      #acto-chat-history-head .dot{
        width:7px; height:7px; border-radius:50%;
        background:#7df7cd; box-shadow:0 0 10px #7df7cd;
      }
      #acto-chat-history-head .title{
        font-size:10px; letter-spacing:0.12em; text-transform:uppercase;
        color:#e8e2d4; font-weight:700;
      }
      #acto-chat-history-head .count{
        margin-left:auto; font-size:10px; color:#7df7cd; opacity:.8;
        font-variant-numeric:tabular-nums;
      }
      #acto-chat-history-head .btn{
        appearance:none; border:1px solid rgba(125,247,205,0.25);
        background:transparent; color:#cfd6c6;
        font:600 9px/1 'JetBrains Mono',monospace;
        letter-spacing:0.1em; text-transform:uppercase;
        padding:5px 8px; border-radius:6px; cursor:pointer;
        transition:all .15s ease;
      }
      #acto-chat-history-head .btn:hover{
        background:rgba(125,247,205,0.1); color:#7df7cd;
        border-color:rgba(125,247,205,0.5);
      }
      #acto-chat-history-list{
        flex:1 1 auto; min-height:0;
        overflow-y:auto; overflow-x:hidden;
        padding:10px 10px 12px;
        display:flex; flex-direction:column; gap:6px;
        scroll-behavior:smooth;
      }
      #acto-chat-history-list::-webkit-scrollbar{ width:5px; }
      #acto-chat-history-list::-webkit-scrollbar-thumb{
        background:rgba(125,247,205,0.25); border-radius:3px;
      }
      .acto-msg{
        max-width:78%; align-self:flex-end;
        background:linear-gradient(135deg, rgba(125,247,205,0.18), rgba(103,232,249,0.12));
        border:1px solid rgba(125,247,205,0.3);
        color:#e8f8f0;
        font:500 12px/1.4 'Space Grotesk', system-ui, sans-serif;
        padding:7px 10px 6px; border-radius:12px 12px 4px 12px;
        word-wrap:break-word; overflow-wrap:anywhere; white-space:pre-wrap;
        position:relative;
        animation:acto-msg-in .2s ease;
      }
      @keyframes acto-msg-in{ from{opacity:0; transform:translateY(4px);} to{opacity:1; transform:translateY(0);} }
      .acto-msg .meta{
        display:flex; align-items:center; gap:5px; justify-content:flex-end;
        margin-top:3px;
        font:500 9px/1 'JetBrains Mono', monospace;
        color:rgba(232,248,240,0.55);
        font-variant-numeric:tabular-nums;
      }
      .acto-msg[data-status="sending"]{ opacity:.65; }
      .acto-msg[data-status="error"]{
        background:linear-gradient(135deg, rgba(248,113,113,0.18), rgba(248,113,113,0.1));
        border-color:rgba(248,113,113,0.45);
      }
      .acto-msg[data-status="error"] .meta{ color:#fda4a4; }
      .acto-msg .status-icon{ font-size:9px; line-height:1; }
      .acto-empty{
        text-align:center; padding:14px 8px;
        font:italic 11px/1.5 'Instrument Serif', serif;
        color:rgba(232,226,212,0.45);
      }
      @media (prefers-reduced-motion: reduce){
        .acto-msg{ animation:none; }
        #acto-chat-history-card{ transition:none; }
        #acto-chat-history-list{ scroll-behavior:auto; }
      }
    `;
    document.head.appendChild(s);
  };

  // ───── render ────────────────────────────────────────────────────────────
  const fmtTime = (ts) => {
    const d = new Date(ts);
    const h = String(d.getHours()).padStart(2, "0");
    const m = String(d.getMinutes()).padStart(2, "0");
    return `${h}:${m}`;
  };
  const statusIcon = (s) => s === "sending" ? "◐" : s === "error" ? "⚠" : "✓";

  const renderList = () => {
    if (!listEl) return;
    if (messages.length === 0) {
      listEl.innerHTML = `<div class="acto-empty">Nenhuma mensagem nesta sessão.<br/>Envie um prompt para começar.</div>`;
      updateCount();
      return;
    }
    listEl.innerHTML = "";
    const frag = document.createDocumentFragment();
    for (const m of messages) {
      const el = document.createElement("div");
      el.className = "acto-msg";
      el.dataset.status = m.status;
      el.dataset.id = m.id;
      const text = document.createElement("div");
      text.className = "text";
      text.textContent = m.text;
      const meta = document.createElement("div");
      meta.className = "meta";
      const icon = document.createElement("span");
      icon.className = "status-icon";
      icon.textContent = statusIcon(m.status);
      const time = document.createElement("span");
      time.textContent = fmtTime(m.createdAt);
      meta.appendChild(icon);
      meta.appendChild(time);
      el.appendChild(text);
      el.appendChild(meta);
      frag.appendChild(el);
    }
    listEl.appendChild(frag);
    updateCount();
    requestAnimationFrame(() => {
      listEl.scrollTop = listEl.scrollHeight;
    });
  };

  const updateCount = () => {
    const c = rootEl?.querySelector(".count");
    if (c) c.textContent = messages.length ? `${messages.length} msg` : "vazio";
  };

  const updateMessage = (id, patch) => {
    const i = messages.findIndex((m) => m.id === id);
    if (i < 0) return;
    messages[i] = { ...messages[i], ...patch };
    saveSession();
    const el = listEl?.querySelector(`.acto-msg[data-id="${id}"]`);
    if (el) {
      el.dataset.status = messages[i].status;
      const icon = el.querySelector(".status-icon");
      if (icon) icon.textContent = statusIcon(messages[i].status);
    }
  };

  const addMessage = (text) => {
    const id = (crypto.randomUUID?.() ?? `m_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`);
    const msg = { id, role: "user", text, createdAt: Date.now(), status: "sending" };
    messages.push(msg);
    if (messages.length > MAX_MESSAGES) messages = messages.slice(-MAX_MESSAGES);
    saveSession();
    renderList();
    return id;
  };

  const clearAll = () => {
    if (!messages.length) return;
    messages = [];
    saveSession();
    renderList();
  };

  // ───── mount overlay ─────────────────────────────────────────────────────
  const positionRoot = () => {
    if (!rootEl) return;
    // Detecta o composer (textarea da Lovable) para ancorar acima dele
    const ta = document.querySelector("textarea");
    if (ta) {
      const r = ta.getBoundingClientRect();
      const vp = window.innerHeight;
      // posiciona o card logo acima do textarea
      const topPx = Math.max(8, r.top - Math.min(vp * 0.4, 360) - 8);
      rootEl.style.top = `${topPx}px`;
      rootEl.style.bottom = "auto";
    } else {
      rootEl.style.top = "auto";
      rootEl.style.bottom = "120px";
    }
  };

  const mount = () => {
    if (mounted || !document.body) return;
    injectStyles();
    rootEl = document.createElement("div");
    rootEl.id = "acto-chat-history-root";
    rootEl.innerHTML = `
      <div id="acto-chat-history-card">
        <div id="acto-chat-history-head" title="Clique para recolher/expandir">
          <span class="dot"></span>
          <span class="title">Conversa local</span>
          <span class="count">vazio</span>
          <button type="button" class="btn" data-act="clear" title="Limpar histórico local desta sessão">Limpar</button>
        </div>
        <div id="acto-chat-history-list" role="log" aria-live="polite" aria-label="Histórico de mensagens enviadas nesta sessão"></div>
      </div>
    `;
    document.body.appendChild(rootEl);
    listEl = rootEl.querySelector("#acto-chat-history-list");
    const card = rootEl.querySelector("#acto-chat-history-card");
    const head = rootEl.querySelector("#acto-chat-history-head");
    head.addEventListener("click", (e) => {
      if (e.target.closest("[data-act='clear']")) return;
      const collapsed = card.getAttribute("data-collapsed") === "1";
      card.setAttribute("data-collapsed", collapsed ? "0" : "1");
    });
    rootEl.querySelector("[data-act='clear']").addEventListener("click", (e) => {
      e.stopPropagation();
      if (messages.length === 0) return;
      clearAll();
    });
    mounted = true;
    positionRoot();
    renderList();
    // Re-posiciona ao redimensionar
    window.addEventListener("resize", positionRoot, { passive: true });
    // Observa mudanças de layout (textarea pode ser remontado pelo React)
    const mo = new MutationObserver(() => positionRoot());
    mo.observe(document.body, { childList: true, subtree: true });
  };

  // ───── fetch interception ────────────────────────────────────────────────
  const extractPromptFromBody = (body) => {
    if (!body) return null;
    try {
      let raw = body;
      if (body instanceof FormData) {
        for (const k of ["prompt", "message", "text", "content"]) {
          const v = body.get(k);
          if (typeof v === "string" && v.trim()) return v;
        }
        return null;
      }
      if (body instanceof Blob) return null;
      if (typeof body === "string") raw = body;
      else if (typeof body === "object" && body !== null) raw = JSON.stringify(body);
      if (typeof raw !== "string") return null;
      const parsed = JSON.parse(raw);
      for (const k of ["prompt", "message", "text", "content", "input", "query"]) {
        if (typeof parsed?.[k] === "string" && parsed[k].trim()) return parsed[k];
      }
      // payloads aninhados
      if (parsed?.payload && typeof parsed.payload === "object") {
        for (const k of ["prompt", "message", "text", "content"]) {
          if (typeof parsed.payload[k] === "string" && parsed.payload[k].trim()) return parsed.payload[k];
        }
      }
      if (Array.isArray(parsed?.messages)) {
        const last = parsed.messages[parsed.messages.length - 1];
        if (typeof last?.content === "string" && last.content.trim()) return last.content;
      }
      return null;
    } catch { return null; }
  };

  const matchesEndpoint = (urlStr) => {
    try {
      return ENDPOINTS.some((p) => urlStr.includes(p));
    } catch { return false; }
  };

  const wrapFetch = () => {
    const origFetch = window.fetch?.bind(window);
    if (!origFetch || window.__ACTO_FETCH_WRAPPED__) return;
    window.__ACTO_FETCH_WRAPPED__ = true;
    window.fetch = async function actoFetch(input, init) {
      let url = "";
      let method = "GET";
      let body = null;
      try {
        if (typeof input === "string") {
          url = input;
          method = (init?.method || "GET").toUpperCase();
          body = init?.body ?? null;
        } else if (input instanceof Request) {
          url = input.url;
          method = (init?.method || input.method || "GET").toUpperCase();
          body = init?.body ?? null;
          if (!body && method === "POST") {
            try { body = await input.clone().text(); } catch {}
          }
        } else if (input instanceof URL) {
          url = input.toString();
          method = (init?.method || "GET").toUpperCase();
          body = init?.body ?? null;
        }
      } catch {}

      let msgId = null;
      if (method === "POST" && url && matchesEndpoint(url)) {
        const prompt = extractPromptFromBody(body);
        if (prompt) {
          mount();
          msgId = addMessage(prompt);
        }
      }

      try {
        const res = await origFetch(input, init);
        if (msgId) updateMessage(msgId, { status: res.ok ? "sent" : "error" });
        return res;
      } catch (err) {
        if (msgId) updateMessage(msgId, { status: "error" });
        throw err;
      }
    };
  };

  // ───── boot ──────────────────────────────────────────────────────────────
  const boot = async () => {
    messages = await loadSession();
    wrapFetch();
    if (document.body) {
      mount();
    } else {
      document.addEventListener("DOMContentLoaded", () => mount(), { once: true });
    }
  };
  boot();
})();
