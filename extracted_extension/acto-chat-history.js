/* ACTO Chat History — sidepanel local conversation overlay
 * v18.1 — toggle por botão acima do anexar; painel oculto por padrão;
 * exporta histórico em .txt. Não toca bundle React.
 */
(() => {
  "use strict";
  if (globalThis.__ACTO_CHAT_HISTORY__) return;
  globalThis.__ACTO_CHAT_HISTORY__ = true;

  const STORAGE_KEY = "acto_chat_history_session";
  const OPEN_KEY = "acto_chat_history_open";
  const MAX_MESSAGES = 300;
  const SESSION_OK = !!(chrome?.storage?.session);
  const ENDPOINTS = ["/functions/v1/acto-tier-s", "/functions/v1/acto-v2"];

  /** @type {Array<{id:string,role:"user",text:string,createdAt:number,status:"sending"|"sent"|"error"}>} */
  let messages = [];
  let listEl = null;
  let rootEl = null;
  let toggleEl = null;
  let mounted = false;
  let isOpen = false;

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
  const loadOpenState = async () => {
    if (!SESSION_OK) return false;
    try {
      const o = await chrome.storage.session.get(OPEN_KEY);
      return !!o?.[OPEN_KEY];
    } catch { return false; }
  };
  const saveOpenState = (v) => {
    if (!SESSION_OK) return;
    try { chrome.storage.session.set({ [OPEN_KEY]: !!v }); } catch {}
  };

  // ───── styles ────────────────────────────────────────────────────────────
  const injectStyles = () => {
    if (document.getElementById("acto-chat-history-style")) return;
    const s = document.createElement("style");
    s.id = "acto-chat-history-style";
    s.textContent = `
      #acto-chat-history-toggle{
        position:fixed; z-index:2147483601;
        width:34px; height:34px; border-radius:10px;
        display:flex; align-items:center; justify-content:center;
        background:linear-gradient(135deg, rgba(8,12,20,0.92), rgba(8,12,20,0.86));
        border:1px solid rgba(125,247,205,0.32);
        color:#7df7cd; cursor:pointer;
        backdrop-filter:blur(10px) saturate(1.1);
        -webkit-backdrop-filter:blur(10px) saturate(1.1);
        box-shadow:0 4px 14px rgba(0,0,0,0.45), 0 0 0 1px rgba(125,247,205,0.06) inset;
        transition:transform .15s ease, border-color .15s ease, color .15s ease;
        font:700 14px/1 'JetBrains Mono', ui-monospace, monospace;
      }
      #acto-chat-history-toggle:hover{
        transform:translateY(-1px);
        border-color:rgba(125,247,205,0.7);
        color:#a8ffd8;
      }
      #acto-chat-history-toggle[data-active="1"]{
        background:linear-gradient(135deg, rgba(125,247,205,0.25), rgba(103,232,249,0.18));
        border-color:rgba(125,247,205,0.85);
        color:#0a0f18;
      }
      #acto-chat-history-toggle .badge{
        position:absolute; top:-4px; right:-4px;
        min-width:16px; height:16px; padding:0 4px;
        border-radius:8px;
        background:#7df7cd; color:#0a0f18;
        font:700 9px/16px 'JetBrains Mono', monospace;
        text-align:center;
        box-shadow:0 0 8px rgba(125,247,205,0.6);
      }
      #acto-chat-history-toggle .badge[data-empty="1"]{ display:none; }

      #acto-chat-history-root{
        position:fixed; left:8px; right:8px;
        z-index:2147483600;
        display:none;
        font-family:'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, monospace;
      }
      #acto-chat-history-root[data-open="1"]{ display:flex; flex-direction:column; }
      #acto-chat-history-root *{ box-sizing:border-box; }
      #acto-chat-history-card{
        background:linear-gradient(180deg, rgba(8,12,20,0.94), rgba(8,12,20,0.9));
        border:1px solid rgba(125,247,205,0.32);
        border-radius:14px;
        backdrop-filter:blur(14px) saturate(1.1);
        -webkit-backdrop-filter:blur(14px) saturate(1.1);
        box-shadow:0 12px 44px rgba(0,0,0,0.55), 0 0 0 1px rgba(125,247,205,0.06) inset;
        overflow:hidden;
        display:flex; flex-direction:column;
        max-height:46vh; min-height:0;
        animation:acto-panel-in .18s ease;
      }
      @keyframes acto-panel-in{ from{opacity:0; transform:translateY(6px);} to{opacity:1; transform:translateY(0);} }
      #acto-chat-history-head{
        display:flex; align-items:center; gap:8px;
        padding:8px 10px;
        border-bottom:1px solid rgba(125,247,205,0.14);
        background:linear-gradient(90deg, rgba(125,247,205,0.06), rgba(167,139,250,0.04));
        user-select:none; flex:0 0 auto;
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
        letter-spacing:0.08em; text-transform:uppercase;
        padding:5px 7px; border-radius:6px; cursor:pointer;
        transition:all .15s ease;
      }
      #acto-chat-history-head .btn:hover{
        background:rgba(125,247,205,0.1); color:#7df7cd;
        border-color:rgba(125,247,205,0.5);
      }
      #acto-chat-history-head .btn[data-act="close"]{
        border-color:rgba(248,113,113,0.3); color:#fda4a4;
      }
      #acto-chat-history-head .btn[data-act="close"]:hover{
        background:rgba(248,113,113,0.12); border-color:rgba(248,113,113,0.6);
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
        max-width:80%; align-self:flex-end;
        background:linear-gradient(135deg, rgba(125,247,205,0.18), rgba(103,232,249,0.12));
        border:1px solid rgba(125,247,205,0.3);
        color:#e8f8f0;
        font:500 12px/1.4 'Space Grotesk', system-ui, sans-serif;
        padding:7px 10px 6px; border-radius:12px 12px 4px 12px;
        word-wrap:break-word; overflow-wrap:anywhere; white-space:pre-wrap;
        animation:acto-msg-in .18s ease;
      }
      @keyframes acto-msg-in{ from{opacity:0; transform:translateY(3px);} to{opacity:1; transform:translateY(0);} }
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
      .acto-empty{
        text-align:center; padding:14px 8px;
        font:italic 11px/1.5 'Instrument Serif', serif;
        color:rgba(232,226,212,0.5);
      }
      @media (prefers-reduced-motion: reduce){
        .acto-msg, #acto-chat-history-card{ animation:none; }
        #acto-chat-history-toggle{ transition:none; }
        #acto-chat-history-list{ scroll-behavior:auto; }
      }
    `;
    document.head.appendChild(s);
  };

  // ───── utils ─────────────────────────────────────────────────────────────
  const fmtTime = (ts) => {
    const d = new Date(ts);
    return `${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}`;
  };
  const fmtDateTime = (ts) => {
    const d = new Date(ts);
    const p = (n) => String(n).padStart(2,"0");
    return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
  };
  const statusIcon = (s) => s === "sending" ? "◐" : s === "error" ? "⚠" : "✓";

  // ───── render ────────────────────────────────────────────────────────────
  const renderList = () => {
    updateBadge();
    updateCount();
    if (!listEl || !isOpen) return;
    if (messages.length === 0) {
      listEl.innerHTML = `<div class="acto-empty">Nenhuma mensagem nesta sessão.<br/>Envie um prompt para começar.</div>`;
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
      text.textContent = m.text;
      const meta = document.createElement("div");
      meta.className = "meta";
      const icon = document.createElement("span");
      icon.textContent = statusIcon(m.status);
      const time = document.createElement("span");
      time.textContent = fmtTime(m.createdAt);
      meta.append(icon, time);
      el.append(text, meta);
      frag.appendChild(el);
    }
    listEl.appendChild(frag);
    requestAnimationFrame(() => { listEl.scrollTop = listEl.scrollHeight; });
  };

  const updateBadge = () => {
    if (!toggleEl) return;
    const badge = toggleEl.querySelector(".badge");
    if (!badge) return;
    const n = messages.length;
    badge.textContent = n > 99 ? "99+" : String(n);
    badge.dataset.empty = n === 0 ? "1" : "0";
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
    updateBadge();
    const el = listEl?.querySelector(`.acto-msg[data-id="${id}"]`);
    if (el) {
      el.dataset.status = messages[i].status;
      const icon = el.querySelector(".meta .status-icon, .meta span:first-child");
      if (icon) icon.textContent = statusIcon(messages[i].status);
    }
  };

  const addMessage = (text) => {
    const id = (crypto.randomUUID?.() ?? `m_${Date.now()}_${Math.random().toString(36).slice(2,9)}`);
    messages.push({ id, role: "user", text, createdAt: Date.now(), status: "sending" });
    if (messages.length > MAX_MESSAGES) messages = messages.slice(-MAX_MESSAGES);
    saveSession();
    renderList();
    return id;
  };

  const clearAll = () => {
    if (!messages.length) return;
    if (!confirm("Limpar todo o histórico desta sessão?")) return;
    messages = [];
    saveSession();
    renderList();
  };

  const exportTxt = () => {
    if (!messages.length) {
      alert("Nenhuma mensagem para exportar.");
      return;
    }
    const lines = [
      "ACTO — Histórico de conversa (sessão local)",
      `Exportado em: ${fmtDateTime(Date.now())}`,
      `Total: ${messages.length} mensagem(ns)`,
      "─".repeat(60),
      "",
    ];
    for (const m of messages) {
      lines.push(`[${fmtDateTime(m.createdAt)}] (${m.status})`);
      lines.push(m.text);
      lines.push("");
    }
    const blob = new Blob([lines.join("\n")], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `acto-chat-${new Date().toISOString().replace(/[:.]/g, "-")}.txt`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  // ───── positioning ───────────────────────────────────────────────────────
  const findAttachButton = () => {
    // Botão de anexar: input#file-upload tem um label/button acima
    const input = document.querySelector('input#file-upload[type="file"]');
    if (input) {
      const label = document.querySelector('label[for="file-upload"]');
      if (label) return label;
      const wrap = input.closest("button, label, div");
      if (wrap) return wrap;
    }
    // Fallback: textarea
    return document.querySelector("textarea");
  };

  const positionUI = () => {
    if (!toggleEl) return;
    const anchor = findAttachButton();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    let toggleTop, toggleLeft;
    if (anchor) {
      const r = anchor.getBoundingClientRect();
      // Acima do botão de anexar
      toggleTop = Math.max(8, r.top - 42);
      toggleLeft = Math.min(vw - 42, Math.max(8, r.left + (r.width / 2) - 17));
    } else {
      toggleTop = vh - 200;
      toggleLeft = vw - 50;
    }
    toggleEl.style.top = `${toggleTop}px`;
    toggleEl.style.left = `${toggleLeft}px`;

    if (rootEl && isOpen) {
      // painel acima do toggle
      const panelMaxH = Math.min(vh * 0.46, 380);
      const panelBottom = vh - toggleTop + 8;
      rootEl.style.bottom = `${panelBottom}px`;
      rootEl.style.top = "auto";
      rootEl.style.maxHeight = `${panelMaxH}px`;
    }
  };

  // ───── mount ─────────────────────────────────────────────────────────────
  const setOpen = (v) => {
    isOpen = !!v;
    saveOpenState(isOpen);
    if (rootEl) rootEl.dataset.open = isOpen ? "1" : "0";
    if (toggleEl) {
      toggleEl.dataset.active = isOpen ? "1" : "0";
      toggleEl.setAttribute("aria-expanded", isOpen ? "true" : "false");
    }
    if (isOpen) {
      renderList();
      positionUI();
    }
  };

  const mount = () => {
    if (mounted || !document.body) return;
    injectStyles();

    // Toggle button
    toggleEl = document.createElement("button");
    toggleEl.id = "acto-chat-history-toggle";
    toggleEl.type = "button";
    toggleEl.title = "Histórico da conversa (sessão local)";
    toggleEl.setAttribute("aria-label", "Abrir histórico de conversa local");
    toggleEl.setAttribute("aria-expanded", "false");
    toggleEl.innerHTML = `💬<span class="badge" data-empty="1">0</span>`;
    toggleEl.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      setOpen(!isOpen);
    });
    document.body.appendChild(toggleEl);

    // Panel
    rootEl = document.createElement("div");
    rootEl.id = "acto-chat-history-root";
    rootEl.dataset.open = "0";
    rootEl.innerHTML = `
      <div id="acto-chat-history-card">
        <div id="acto-chat-history-head">
          <span class="dot"></span>
          <span class="title">Conversa local</span>
          <span class="count">vazio</span>
          <button type="button" class="btn" data-act="export" title="Salvar histórico em .txt">TXT</button>
          <button type="button" class="btn" data-act="clear" title="Limpar histórico local desta sessão">Limpar</button>
          <button type="button" class="btn" data-act="close" title="Fechar painel" aria-label="Fechar">✕</button>
        </div>
        <div id="acto-chat-history-list" role="log" aria-live="polite" aria-label="Histórico de mensagens enviadas nesta sessão"></div>
      </div>
    `;
    document.body.appendChild(rootEl);
    listEl = rootEl.querySelector("#acto-chat-history-list");
    rootEl.querySelector('[data-act="clear"]').addEventListener("click", (e) => { e.stopPropagation(); clearAll(); });
    rootEl.querySelector('[data-act="export"]').addEventListener("click", (e) => { e.stopPropagation(); exportTxt(); });
    rootEl.querySelector('[data-act="close"]').addEventListener("click", (e) => { e.stopPropagation(); setOpen(false); });

    mounted = true;
    updateBadge();
    positionUI();

    window.addEventListener("resize", positionUI, { passive: true });
    window.addEventListener("scroll", positionUI, { passive: true });
    const mo = new MutationObserver(() => positionUI());
    mo.observe(document.body, { childList: true, subtree: true });
  };

  // ───── capture: DOM (composer) ───────────────────────────────────────────
  // Necessário porque o side-panel envia para acto-tier-s com payload AES-GCM
  // criptografado — extrair prompt do body do fetch é impossível.
  // Estratégia: escutar Enter no textarea + click em botão de enviar, em
  // capture-phase, e ler o valor do textarea antes do React limpar.
  let lastCapture = { text: "", at: 0 };
  const DEDUP_WINDOW_MS = 2000;

  const captureText = (text) => {
    const t = String(text || "").trim();
    if (!t) return;
    const now = Date.now();
    if (t === lastCapture.text && now - lastCapture.at < DEDUP_WINDOW_MS) return;
    lastCapture = { text: t, at: now };
    mount();
    const id = addMessage(t);
    // Sem resposta atrelada (payload cifrado): marca como enviado após pequeno
    // delay, assim o ícone reflete o estado real do envio quando ele falha rápido.
    setTimeout(() => updateMessage(id, { status: "sent" }), 350);
    return id;
  };

  const findComposerTextarea = () => {
    // O side-panel React tem 1 textarea de composição. Fallback: primeiro textarea visível.
    const all = Array.from(document.querySelectorAll("textarea"));
    return all.find((el) => el.offsetParent !== null) || all[0] || null;
  };

  const isSendButton = (btn) => {
    if (!btn || btn.tagName !== "BUTTON") return false;
    if (btn.disabled) return false;
    const label = `${btn.getAttribute("aria-label") || ""} ${btn.title || ""} ${btn.textContent || ""}`.toLowerCase();
    if (/send|enviar|submit|prompt|mensagem|message/.test(label)) return true;
    // Ícone de seta — heurística por svg path/d ou data-attrs comuns
    if (btn.querySelector('svg[data-icon*="send" i], svg[data-icon*="arrow" i]')) return true;
    return false;
  };

  const wireDomCapture = () => {
    if (window.__ACTO_CHAT_DOM_CAPTURE__) return;
    window.__ACTO_CHAT_DOM_CAPTURE__ = true;

    // Enter sem Shift dentro do textarea do composer
    document.addEventListener(
      "keydown",
      (e) => {
        if (e.key !== "Enter" || e.shiftKey || e.ctrlKey || e.metaKey || e.altKey) return;
        const ta = e.target;
        if (!(ta instanceof HTMLTextAreaElement)) return;
        if (e.isComposing) return; // IME ativo
        captureText(ta.value);
      },
      true,
    );

    // Click em botão de envio (mesmo form ou irmão do textarea)
    document.addEventListener(
      "click",
      (e) => {
        const btn = (e.target instanceof Element ? e.target.closest("button") : null);
        if (!isSendButton(btn)) return;
        const form = btn.closest("form");
        const ta = (form?.querySelector("textarea")) || findComposerTextarea();
        if (!ta) return;
        captureText(ta.value);
      },
      true,
    );

    // Submit de formulário (fallback adicional)
    document.addEventListener(
      "submit",
      (e) => {
        const form = e.target;
        if (!(form instanceof HTMLFormElement)) return;
        const ta = form.querySelector("textarea");
        if (!ta) return;
        captureText(ta.value);
      },
      true,
    );
  };

  // ───── fetch interception (fallback p/ endpoints sem cifra) ─────────────
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
      // Envelope cifrado acto-v2 — nada extraível, ignora silenciosamente.
      if (parsed?.v === 1 && parsed?.license_id && parsed?.ct) return null;
      for (const k of ["prompt", "message", "text", "content", "input", "query"]) {
        if (typeof parsed?.[k] === "string" && parsed[k].trim()) return parsed[k];
      }
      if (parsed?.payload && typeof parsed.payload === "object") {
        for (const k of ["prompt", "message", "text", "content"]) {
          if (typeof parsed.payload[k] === "string" && parsed.payload[k].trim()) return parsed.payload[k];
        }
      }
      // gateway_chat: { action, params: { messages: [...] } }
      const msgList = Array.isArray(parsed?.messages)
        ? parsed.messages
        : Array.isArray(parsed?.params?.messages)
          ? parsed.params.messages
          : null;
      if (msgList && msgList.length) {
        const lastUser = [...msgList].reverse().find((m) => m?.role === "user") || msgList[msgList.length - 1];
        const c = lastUser?.content;
        if (typeof c === "string" && c.trim()) return c;
        if (Array.isArray(c)) {
          const t = c.find((part) => typeof part?.text === "string" && part.text.trim());
          if (t) return t.text;
        }
      }
      return null;
    } catch { return null; }
  };

  const matchesEndpoint = (urlStr) => {
    try { return ENDPOINTS.some((p) => urlStr.includes(p)); } catch { return false; }
  };

  const wrapFetch = () => {
    const origFetch = window.fetch?.bind(window);
    if (!origFetch || window.__ACTO_FETCH_WRAPPED__) return;
    window.__ACTO_FETCH_WRAPPED__ = true;
    window.fetch = async function actoFetch(input, init) {
      let url = "", method = "GET", body = null;
      try {
        if (typeof input === "string") {
          url = input; method = (init?.method || "GET").toUpperCase(); body = init?.body ?? null;
        } else if (input instanceof Request) {
          url = input.url; method = (init?.method || input.method || "GET").toUpperCase(); body = init?.body ?? null;
          if (!body && method === "POST") { try { body = await input.clone().text(); } catch {} }
        } else if (input instanceof URL) {
          url = input.toString(); method = (init?.method || "GET").toUpperCase(); body = init?.body ?? null;
        }
      } catch {}

      let msgId = null;
      if (method === "POST" && url && matchesEndpoint(url)) {
        const prompt = extractPromptFromBody(body);
        if (prompt) {
          const now = Date.now();
          // Evita duplicar com captura por DOM (mesma string, janela curta)
          if (!(prompt.trim() === lastCapture.text && now - lastCapture.at < DEDUP_WINDOW_MS)) {
            mount();
            msgId = addMessage(prompt);
            lastCapture = { text: prompt.trim(), at: now };
          }
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
    const wasOpen = await loadOpenState();
    wrapFetch();
    wireDomCapture();
    if (document.body) mount();
    else document.addEventListener("DOMContentLoaded", () => mount(), { once: true });
    // restaurar estado de abertura após mount
    setTimeout(() => { if (mounted) setOpen(wasOpen); }, 50);
  };
  boot();
})();
