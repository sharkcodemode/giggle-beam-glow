/* ACTO Chat History — conversa local (v2.2, context-aware)
 *  - Side panel (chrome-extension:)  -> BOTÃO ancorado acima do anexo (como antes),
 *    captura o que VOCÊ digita, alterna o estado aberto/fechado.
 *  - Página da Lovable (https:)      -> MODAL flutuante, arrastável e
 *    redimensionável; lê o storage compartilhado e (opcional) captura a
 *    RESPOSTA da Lovable direto do DOM — apenas mensagens NOVAS (baseline), em ordem.
 * Compartilham chrome.storage.local. Não toca no bundle React.
 */
(() => {
  "use strict";
  if (globalThis.__ACTO_CHAT_HISTORY_V2__) return;
  globalThis.__ACTO_CHAT_HISTORY_V2__ = true;

  const CAPTURE_ASSISTANT = true; // captura ativa com filtro temporal + deduplicação persistente

  const IS_PANEL = location.protocol === "chrome-extension:";
  const IS_PAGE = /^https?:$/.test(location.protocol);

  const STORAGE_KEY = "acto_chat_history_session";
  const OPEN_KEY = "acto_chat_history_open";
  const OPACITY_KEY = "acto_chat_history_opacity";
  const POS_KEY = "acto_chat_history_pos";
  const SIZE_KEY = "acto_chat_history_size";
  const MAX_MESSAGES = 300;
  const ENDPOINTS = ["/functions/v1/acto-tier-s", "/functions/v1/acto-v2"];
  const store = (typeof chrome !== "undefined" && chrome?.storage?.local) ? chrome.storage.local : null;

  const COPY_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>';
  const CHECK_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>';
  const DROP_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2.7 6.3 8.4a8 8 0 1 0 11.4 0L12 2.7z"/></svg>';
  const CHAT_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z"/><path d="M8 10h.01"/><path d="M12 10h.01"/><path d="M16 10h.01"/></svg>';
  const RESIZE_ICON = '<svg viewBox="0 0 10 10" aria-hidden="true"><path d="M9 1 L1 9 M9 5 L5 9" stroke="currentColor" stroke-width="1.4" fill="none" stroke-linecap="round"/></svg>';

  let messages = [];
  let isOpen = false, opacityPct = 0, panelPos = null, panelSize = null;
  // side panel
  let toggleEl = null;
  // page
  let rootEl = null, cardEl = null, listEl = null, toastEl = null, toastTimer = null;
  let mounted = false;

  // ───── storage compartilhado ─────────────────────────────────
  const getKey = (k, def) => new Promise((res) => { if (!store) return res(def); try { store.get(k, (o) => res(o && o[k] !== undefined ? o[k] : def)); } catch { res(def); } });
  const setKey = (k, v) => new Promise((res) => { if (!store) return res(); try { store.set({ [k]: v }, () => res()); } catch { res(); } });
  const loadSession = async () => { const v = await getKey(STORAGE_KEY, []); return Array.isArray(v) ? v : []; };
  const saveSession = () => setKey(STORAGE_KEY, messages.slice(-MAX_MESSAGES));
  const loadOpenState = async () => !!(await getKey(OPEN_KEY, false));
  const saveOpenState = (v) => setKey(OPEN_KEY, !!v);
  const loadOpacity = async () => { const v = Number(await getKey(OPACITY_KEY, 0)); return Number.isFinite(v) ? Math.max(0, Math.min(70, v)) : 0; };
  const saveOpacity = (v) => setKey(OPACITY_KEY, Math.max(0, Math.min(70, Number(v) || 0)));
  const loadPositions = async () => { panelPos = await getKey(POS_KEY, null); panelSize = await getKey(SIZE_KEY, null); };

  // ───── utils ────────────────────────────────────────────────
  const p2 = (n) => String(n).padStart(2, "0");
  const fmtTime = (ts) => { const d = new Date(ts); return `${p2(d.getHours())}:${p2(d.getMinutes())}`; };
  const fmtDateTime = (ts) => { const d = new Date(ts); return `${d.getFullYear()}-${p2(d.getMonth()+1)}-${p2(d.getDate())} ${p2(d.getHours())}:${p2(d.getMinutes())}:${p2(d.getSeconds())}`; };
  const roleName = (r) => r === "assistant" ? "Lovable" : r === "system" ? "Sistema" : "Você";
  const roleClass = (r) => r === "assistant" ? "assistant" : r === "system" ? "system" : "user";
  const newId = () => (crypto?.randomUUID?.() ?? `m_${Date.now()}_${Math.random().toString(36).slice(2,9)}`);
  const copyText = async (text) => {
    const t = String(text || "");
    try { await navigator.clipboard.writeText(t); return true; }
    catch { try { const ta = document.createElement("textarea"); ta.value = t; ta.style.position = "fixed"; ta.style.opacity = "0"; document.body.appendChild(ta); ta.select(); document.execCommand("copy"); ta.remove(); return true; } catch { return false; } }
  };
  const showToast = (msg) => { if (!toastEl) return; toastEl.textContent = msg; toastEl.classList.add("show"); clearTimeout(toastTimer); toastTimer = setTimeout(() => toastEl.classList.remove("show"), 1500); };

  // ───── message ops ──────────────────────────────────────────
  const addMessage = async (text, role = "user") => {
    const t = String(text || "").trim();
    if (!t) return null;
    const latest = await loadSession();
    const entry = { id: newId(), role, text: t, createdAt: Date.now(), status: "sent" };
    latest.push(entry);
    messages = latest.slice(-MAX_MESSAGES);
    await saveSession();
    renderAll();
    return entry.id;
  };
  const clearAll = async () => { if (!messages.length) return; if (!confirm("Limpar todo o histórico desta sessão?")) return; messages = []; await saveSession(); renderAll(); };
  const exportTxt = () => {
    if (!messages.length) { alert("Nenhuma mensagem para exportar."); return; }
    const lines = ["ACTO — Conversa local", `Exportado em: ${fmtDateTime(Date.now())}`, `Total: ${messages.length} mensagem(ns)`, "─".repeat(50), ""];
    for (const m of messages) { lines.push(`[${fmtDateTime(m.createdAt)}] ${roleName(m.role)}`); lines.push(m.text); lines.push(""); }
    const blob = new Blob([lines.join("\n")], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob); const a = document.createElement("a");
    a.href = url; a.download = `acto-chat-${new Date().toISOString().replace(/[:.]/g, "-")}.txt`;
    document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  // ═════ SIDE PANEL: botão ancorado ════════════════════════════════
  const injectButtonStyles = () => {
    if (document.getElementById("acto-chat-history-style")) return;
    const s = document.createElement("style"); s.id = "acto-chat-history-style";
    s.textContent = `
      #acto-chat-history-toggle{ position:fixed; z-index:2147483601; width:32px; height:32px; border-radius:8px; display:none; align-items:center; justify-content:center; padding:0; background:var(--acto-chat-button-bg,rgba(37,99,235,0.2)); border:1px solid var(--acto-chat-button-border,rgba(96,165,250,0.5)); color:var(--acto-chat-button-color,#bfdbfe); cursor:pointer; transition:transform .15s ease, background .15s ease, border-color .15s ease, color .15s ease; }
      #acto-chat-history-toggle[data-ready="1"]{ display:flex; }
      #acto-chat-history-toggle:hover{ transform:translateY(-1px); color:#fff; }
      #acto-chat-history-toggle[data-active="1"]{ background:var(--acto-chat-button-active-bg,rgba(37,99,235,0.35)); border-color:#4f8cff; color:#fff; }
      #acto-chat-history-toggle svg{ width:16px; height:16px; display:block; }
      #acto-chat-history-toggle .badge{ position:absolute; top:-4px; right:-4px; min-width:15px; height:15px; padding:0 3px; border-radius:8px; background:#4f8cff; color:#06101f; font:700 9px/15px -apple-system,system-ui,sans-serif; text-align:center; box-shadow:0 0 8px rgba(79,140,255,0.55); }
      #acto-chat-history-toggle .badge[data-empty="1"]{ display:none; }
    `;
    (document.head || document.documentElement).appendChild(s);
  };
  const isVisibleElement = (el) => { if (!el) return false; const r = el.getBoundingClientRect(); const cs = getComputedStyle(el); return r.width > 0 && r.height > 0 && cs.display !== "none" && cs.visibility !== "hidden" && cs.opacity !== "0"; };
  const findAttachButton = () => {
    const input = document.querySelector('input#file-upload[type="file"]');
    if (input) { const label = document.querySelector('label[for="file-upload"]'); if (isVisibleElement(label)) return label; const wrap = input.closest("button, label"); if (isVisibleElement(wrap)) return wrap; }
    return null;
  };
  const syncToggleStyle = (anchor) => {
    if (!toggleEl || !anchor) return; const cs = getComputedStyle(anchor);
    toggleEl.style.setProperty("--acto-chat-button-bg", cs.backgroundColor || "rgba(37,99,235,0.2)");
    toggleEl.style.setProperty("--acto-chat-button-border", cs.borderColor || "rgba(96,165,250,0.5)");
    toggleEl.style.setProperty("--acto-chat-button-color", cs.color || "#bfdbfe");
    toggleEl.style.setProperty("--acto-chat-button-active-bg", cs.backgroundColor || "rgba(37,99,235,0.35)");
  };
  const positionButton = () => {
    if (!toggleEl) return;
    const anchor = findAttachButton();
    if (!anchor) { toggleEl.dataset.ready = "0"; return; }
    const vw = window.innerWidth, vh = window.innerHeight; const r = anchor.getBoundingClientRect();
    syncToggleStyle(anchor); toggleEl.dataset.ready = "1";
    const size = Math.round(Math.max(28, Math.min(36, r.width || 32))); const gap = 6;
    toggleEl.style.width = size + "px"; toggleEl.style.height = size + "px";
    toggleEl.style.top = Math.min(vh - size - 8, Math.max(8, r.top - size - gap)) + "px";
    toggleEl.style.left = Math.min(vw - size - 8, Math.max(8, r.left + (r.width / 2) - (size / 2))) + "px";
  };
  const updateBadge = () => { const b = toggleEl?.querySelector(".badge"); if (!b) return; const n = messages.length; b.textContent = n > 99 ? "99+" : String(n); b.dataset.empty = n === 0 ? "1" : "0"; };
  const mountButton = () => {
    if (mounted || !document.body || !IS_PANEL) return;
    injectButtonStyles();
    toggleEl = document.createElement("button"); toggleEl.id = "acto-chat-history-toggle"; toggleEl.type = "button";
    toggleEl.title = "Histórico da conversa (sessão local)"; toggleEl.setAttribute("aria-label", "Abrir histórico de conversa local");
    toggleEl.innerHTML = `${CHAT_ICON}<span class="badge" data-empty="1">0</span>`;
    toggleEl.addEventListener("click", (e) => { e.preventDefault(); e.stopPropagation(); setOpen(!isOpen); });
    document.body.appendChild(toggleEl);
    mounted = true; updateBadge(); positionButton();
    window.addEventListener("resize", positionButton, { passive: true });
    window.addEventListener("scroll", positionButton, { passive: true });
    const mo = new MutationObserver(() => positionButton()); mo.observe(document.body, { childList: true, subtree: true });
  };

  // ═════ PÁGINA: modal flutuante ══════════════════════════════════
  const injectModalStyles = () => {
    if (document.getElementById("acto-chat-history-style")) return;
    const s = document.createElement("style"); s.id = "acto-chat-history-style";
    s.textContent = `
      #acto-chat-history-root{ position:fixed; z-index:2147483600; width:320px; max-width:calc(100vw - 16px); display:none; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif; font-size:12px; line-height:1.45; color:#e8efff; }
      #acto-chat-history-root[data-open="1"]{ display:block; }
      #acto-chat-history-root *{ box-sizing:border-box; }
      #acto-chat-history-card{ position:relative; display:flex; flex-direction:column; overflow:hidden; background:linear-gradient(180deg,#0d1730,#0a1226); border:1px solid rgba(80,140,255,0.28); border-radius:12px; box-shadow:0 0 0 1px rgba(79,140,255,0.06),0 18px 48px rgba(0,0,0,0.6),0 0 22px rgba(79,140,255,0.14); max-height:min(60vh,460px); min-height:120px; transition:opacity .15s ease; }
      #acto-chat-history-head{ flex:0 0 auto; user-select:none; border-bottom:1px solid rgba(80,140,255,0.14); background:rgba(79,140,255,0.05); }
      #acto-chat-history-head .row1{ display:flex; align-items:center; gap:7px; padding:8px 10px; cursor:grab; }
      #acto-chat-history-head .row1:active{ cursor:grabbing; }
      #acto-chat-history-head .row2{ display:flex; align-items:center; gap:6px; padding:0 10px 8px; }
      #acto-chat-history-head .dot{ width:7px; height:7px; border-radius:50%; background:#58e6ff; box-shadow:0 0 7px #58e6ff; flex-shrink:0; }
      #acto-chat-history-head .title{ font-size:10px; font-weight:700; letter-spacing:0.12em; text-transform:uppercase; white-space:nowrap; }
      #acto-chat-history-head .count{ font-size:9px; color:rgba(220,232,255,0.5); font-variant-numeric:tabular-nums; }
      #acto-chat-history-head .grip{ margin-left:2px; color:rgba(220,232,255,0.3); font-size:11px; letter-spacing:1px; }
      #acto-chat-history-head .spacer{ flex:1; }
      #acto-chat-history-head .acto-opacity{ display:flex; align-items:center; gap:5px; padding:3px 6px; border:1px solid rgba(80,140,255,0.14); border-radius:6px; background:rgba(6,11,24,0.5); }
      #acto-chat-history-head .acto-opacity svg{ width:11px; height:11px; stroke:#6aa4ff; flex-shrink:0; }
      #acto-chat-history-head .acto-range{ -webkit-appearance:none; appearance:none; width:56px; height:3px; border-radius:2px; background:linear-gradient(90deg,#4f8cff var(--fill,0%),rgba(79,140,255,0.2) var(--fill,0%)); outline:none; cursor:pointer; }
      #acto-chat-history-head .acto-range::-webkit-slider-thumb{ -webkit-appearance:none; appearance:none; width:10px; height:10px; border-radius:50%; background:#6aa4ff; border:2px solid #0a1226; box-shadow:0 0 7px rgba(79,140,255,0.9); cursor:pointer; }
      #acto-chat-history-head .acto-op-val{ font-size:8px; font-variant-numeric:tabular-nums; color:rgba(220,232,255,0.5); min-width:22px; text-align:right; }
      #acto-chat-history-head .btn{ appearance:none; border:1px solid rgba(80,140,255,0.18); background:rgba(6,11,24,0.4); color:#6aa4ff; font:700 8px/1 -apple-system,system-ui,sans-serif; letter-spacing:0.05em; text-transform:uppercase; padding:5px 7px; border-radius:6px; cursor:pointer; transition:all .13s ease; }
      #acto-chat-history-head .btn:hover{ border-color:#4f8cff; box-shadow:0 0 9px rgba(79,140,255,0.35); color:#fff; }
      #acto-chat-history-head .btn[data-act="close"]{ border-color:rgba(255,99,132,0.4); color:#ff7d95; background:rgba(255,99,132,0.08); width:24px; height:24px; padding:0; font-size:12px; }
      #acto-chat-history-head .btn[data-act="close"]:hover{ background:rgba(255,99,132,0.18); }
      #acto-chat-history-list{ flex:1 1 auto; min-height:0; overflow-y:auto; overflow-x:hidden; padding:12px; display:flex; flex-direction:column; gap:10px; scroll-behavior:smooth; }
      #acto-chat-history-list::-webkit-scrollbar{ width:6px; }
      #acto-chat-history-list::-webkit-scrollbar-thumb{ background:rgba(79,140,255,0.3); border-radius:3px; }
      #acto-chat-history-list .acto-msg{ display:flex; flex-direction:column; gap:3px; max-width:90%; animation:acto-msg-in .16s ease; }
      @keyframes acto-msg-in{ from{opacity:0; transform:translateY(3px);} to{opacity:1; transform:translateY(0);} }
      #acto-chat-history-list .acto-msg .meta{ display:flex; align-items:center; gap:6px; font-size:8.5px; letter-spacing:0.07em; text-transform:uppercase; color:rgba(220,232,255,0.5); font-variant-numeric:tabular-nums; }
      #acto-chat-history-list .acto-msg .meta .name{ font-weight:700; }
      #acto-chat-history-list .acto-msg .bubble-row{ display:flex; align-items:flex-start; gap:6px; }
      #acto-chat-history-list .acto-msg .bubble{ padding:8px 10px; font-size:12px; line-height:1.45; border-radius:9px; border:1px solid rgba(80,140,255,0.14); background:rgba(79,140,255,0.07); word-wrap:break-word; overflow-wrap:anywhere; white-space:pre-wrap; }
      #acto-chat-history-list .acto-msg.role-user{ align-self:flex-end; align-items:flex-end; }
      #acto-chat-history-list .acto-msg.role-user .bubble{ background:rgba(79,140,255,0.16); border-color:rgba(106,164,255,0.4); }
      #acto-chat-history-list .acto-msg.role-user .bubble-row{ flex-direction:row-reverse; }
      #acto-chat-history-list .acto-msg.role-user .meta{ justify-content:flex-end; }
      #acto-chat-history-list .acto-msg.role-user .meta .name{ color:#6aa4ff; }
      #acto-chat-history-list .acto-msg.role-assistant .bubble{ background:rgba(88,230,255,0.07); border-color:rgba(88,230,255,0.22); }
      #acto-chat-history-list .acto-msg.role-assistant .meta .name, #acto-chat-history-list .acto-msg.role-system .meta .name{ color:#58e6ff; }
      #acto-chat-history-list .acto-msg .btn-copy{ width:22px; height:22px; display:flex; align-items:center; justify-content:center; border:1px solid rgba(80,140,255,0.14); border-radius:6px; background:rgba(6,11,24,0.5); color:#6aa4ff; cursor:pointer; flex-shrink:0; margin-top:1px; transition:all .13s ease; }
      #acto-chat-history-list .acto-msg .btn-copy svg{ width:11px; height:11px; }
      #acto-chat-history-list .acto-msg .btn-copy:hover{ border-color:#4f8cff; }
      #acto-chat-history-list .acto-msg .btn-copy.copied{ color:#7effc4; border-color:rgba(126,255,196,0.5); }
      #acto-chat-history-list .acto-empty{ text-align:center; padding:18px 12px; font:italic 11px/1.5 Georgia,serif; color:rgba(220,232,255,0.5); }
      #acto-chat-history-resize{ position:absolute; right:2px; bottom:2px; width:18px; height:18px; display:flex; align-items:flex-end; justify-content:flex-end; cursor:nwse-resize; touch-action:none; user-select:none; color:rgba(150,180,255,0.55); z-index:4; }
      #acto-chat-history-resize svg{ width:10px; height:10px; }
      #acto-chat-history-resize:hover{ color:#8fb6ff; }
      #acto-chat-history-toast{ position:fixed; left:50%; bottom:18px; transform:translateX(-50%) translateY(8px); z-index:2147483602; padding:7px 13px; font:700 10px/1 -apple-system,system-ui,sans-serif; color:#e8efff; background:#0d1730; border:1px solid rgba(80,140,255,0.28); border-radius:8px; box-shadow:0 0 16px rgba(79,140,255,0.3); opacity:0; pointer-events:none; transition:opacity .18s ease, transform .18s ease; }
      #acto-chat-history-toast.show{ opacity:1; transform:translateX(-50%) translateY(0); }
      @media (prefers-reduced-motion: reduce){ #acto-chat-history-list .acto-msg{animation:none;} #acto-chat-history-list{scroll-behavior:auto;} }
    `;
    (document.head || document.documentElement).appendChild(s);
  };
  const updateCount = () => { const c = rootEl?.querySelector(".count"); if (c) c.textContent = messages.length ? `${messages.length} msg` : "vazio"; };
  const renderList = () => {
    if (!listEl) return;
    if (!messages.length) { listEl.innerHTML = `<div class="acto-empty">Nenhuma mensagem nesta sessão.<br/>Envie um prompt para começar.</div>`; return; }
    listEl.innerHTML = "";
    const frag = document.createDocumentFragment();
    for (const m of messages) {
      const rc = roleClass(m.role);
      const el = document.createElement("div"); el.className = `acto-msg role-${rc}`; el.dataset.id = m.id;
      const meta = document.createElement("div"); meta.className = "meta";
      const name = document.createElement("span"); name.className = "name"; name.textContent = roleName(m.role);
      const time = document.createElement("span"); time.className = "time"; time.textContent = fmtTime(m.createdAt);
      meta.append(name, time);
      const row = document.createElement("div"); row.className = "bubble-row";
      const bubble = document.createElement("div"); bubble.className = "bubble"; bubble.textContent = m.text;
      const copyBtn = document.createElement("button"); copyBtn.type = "button"; copyBtn.className = "btn-copy"; copyBtn.title = "Copiar"; copyBtn.setAttribute("aria-label", "Copiar mensagem"); copyBtn.innerHTML = COPY_ICON;
      row.append(bubble, copyBtn); el.append(meta, row); frag.appendChild(el);
    }
    listEl.appendChild(frag);
    requestAnimationFrame(() => { listEl.scrollTop = listEl.scrollHeight; });
  };
  const renderAll = () => { updateBadge(); updateCount(); if (isOpen) renderList(); };
  const applyOpacity = (v) => {
    opacityPct = Math.max(0, Math.min(70, Number(v) || 0));
    if (cardEl) cardEl.style.opacity = String((100 - opacityPct) / 100);
    const val = rootEl?.querySelector(".acto-op-val"); if (val) val.textContent = opacityPct + "%";
    const range = rootEl?.querySelector(".acto-range"); if (range) range.style.setProperty("--fill", ((opacityPct / 70) * 100) + "%");
  };
  const clampPos = (x, y, el) => { const w = el.offsetWidth || 300, h = el.offsetHeight || 120; return { x: Math.max(4, Math.min(window.innerWidth - w - 4, x)), y: Math.max(4, Math.min(window.innerHeight - h - 4, y)) }; };
  const placeEl = (el, pos, fallback) => { const p = pos && Number.isFinite(pos.x) ? pos : fallback; const c = clampPos(p.x, p.y, el); el.style.left = c.x + "px"; el.style.top = c.y + "px"; el.style.right = "auto"; el.style.bottom = "auto"; };
  const applySize = () => {
    if (!rootEl || !cardEl || !panelSize || !Number.isFinite(panelSize.w)) return;
    rootEl.style.width = Math.max(260, Math.min(window.innerWidth - 8, panelSize.w)) + "px";
    cardEl.style.maxHeight = "none";
    cardEl.style.height = Math.max(160, Math.min(window.innerHeight - 8, panelSize.h)) + "px";
  };
  const makeDraggable = (handle, target, onDrop) => {
    let dragging = false, moved = false, sx = 0, sy = 0, ox = 0, oy = 0;
    const pt = (e) => (e.touches && e.touches[0]) ? e.touches[0] : e;
    const down = (e) => {
      if (e.target.closest("button, input, .btn, .btn-copy, .acto-opacity, #acto-chat-history-resize")) return;
      dragging = true; moved = false; const p = pt(e); sx = p.clientX; sy = p.clientY;
      const r = target.getBoundingClientRect(); ox = r.left; oy = r.top;
      target.style.right = "auto"; target.style.bottom = "auto"; target.style.left = ox + "px"; target.style.top = oy + "px";
      document.addEventListener("mousemove", move); document.addEventListener("mouseup", up);
      document.addEventListener("touchmove", move, { passive: false }); document.addEventListener("touchend", up);
      if (e.cancelable) e.preventDefault();
    };
    const move = (e) => { if (!dragging) return; const p = pt(e); const dx = p.clientX - sx, dy = p.clientY - sy; if (Math.abs(dx) > 3 || Math.abs(dy) > 3) moved = true; const c = clampPos(ox + dx, oy + dy, target); target.style.left = c.x + "px"; target.style.top = c.y + "px"; if (e.cancelable) e.preventDefault(); };
    const up = () => { if (!dragging) return; dragging = false; document.removeEventListener("mousemove", move); document.removeEventListener("mouseup", up); document.removeEventListener("touchmove", move); document.removeEventListener("touchend", up); const r = target.getBoundingClientRect(); if (onDrop) onDrop({ x: r.left, y: r.top }); };
    handle.addEventListener("mousedown", down); handle.addEventListener("touchstart", down, { passive: false });
  };
  const makeResizable = (handle) => {
    let activePointer = null, sx = 0, sy = 0, sw = 0, sh = 0, maxW = 0, maxH = 0, frame = 0, nextW = 0, nextH = 0;
    const paint = () => { frame = 0; if (activePointer === null) return; rootEl.style.width = nextW + "px"; cardEl.style.height = nextH + "px"; };
    const finish = (e) => {
      if (activePointer === null || (e?.pointerId != null && e.pointerId !== activePointer)) return;
      if (frame) { cancelAnimationFrame(frame); frame = 0; rootEl.style.width = nextW + "px"; cardEl.style.height = nextH + "px"; }
      try { if (handle.hasPointerCapture(activePointer)) handle.releasePointerCapture(activePointer); } catch {}
      activePointer = null; document.documentElement.style.removeProperty("cursor"); document.body?.style.removeProperty("user-select");
      panelSize = { w: rootEl.offsetWidth, h: cardEl.offsetHeight }; setKey(SIZE_KEY, panelSize);
    };
    handle.addEventListener("pointerdown", (e) => {
      if (activePointer !== null || (e.button != null && e.button !== 0)) return;
      activePointer = e.pointerId; sx = e.clientX; sy = e.clientY; sw = rootEl.offsetWidth; sh = cardEl.offsetHeight;
      const r = rootEl.getBoundingClientRect(); maxW = Math.max(260, window.innerWidth - r.left - 4); maxH = Math.max(160, window.innerHeight - r.top - 4);
      nextW = sw; nextH = sh; cardEl.style.maxHeight = "none";
      try { handle.setPointerCapture(activePointer); } catch {}
      document.documentElement.style.cursor = "nwse-resize"; if (document.body) document.body.style.userSelect = "none";
      e.preventDefault(); e.stopPropagation();
    });
    handle.addEventListener("pointermove", (e) => {
      if (activePointer === null || e.pointerId !== activePointer) return;
      nextW = Math.round(Math.max(260, Math.min(maxW, sw + (e.clientX - sx))));
      nextH = Math.round(Math.max(160, Math.min(maxH, sh + (e.clientY - sy))));
      if (!frame) frame = requestAnimationFrame(paint);
      e.preventDefault();
    });
    handle.addEventListener("pointerup", finish);
    handle.addEventListener("pointercancel", finish);
    handle.addEventListener("lostpointercapture", finish);
    window.addEventListener("blur", () => finish(), { passive: true });
  };
  const mountModal = () => {
    if (mounted || !document.body || !IS_PAGE) return;
    injectModalStyles();
    rootEl = document.createElement("div"); rootEl.id = "acto-chat-history-root"; rootEl.dataset.open = "0";
    rootEl.innerHTML = `
      <div id="acto-chat-history-card">
        <div id="acto-chat-history-head">
          <div class="row1">
            <span class="dot"></span><span class="title">Conversa Local</span><span class="count">vazio</span>
            <span class="grip">∷∷</span><span class="spacer"></span>
            <button type="button" class="btn" data-act="close" title="Fechar" aria-label="Fechar">✕</button>
          </div>
          <div class="row2">
            <span class="acto-opacity" title="Transparência">${DROP_ICON}<input type="range" class="acto-range" min="0" max="70" value="0" aria-label="Transparência"><span class="acto-op-val">0%</span></span>
            <span class="spacer"></span>
            <button type="button" class="btn" data-act="export" title="Salvar em .txt">TXT</button>
            <button type="button" class="btn" data-act="clear" title="Limpar histórico">Limpar</button>
          </div>
        </div>
        <div id="acto-chat-history-list" role="log" aria-live="polite"></div>
        <div id="acto-chat-history-resize" title="Redimensionar">${RESIZE_ICON}</div>
      </div>`;
    document.body.appendChild(rootEl);
    cardEl = rootEl.querySelector("#acto-chat-history-card");
    listEl = rootEl.querySelector("#acto-chat-history-list");
    toastEl = document.createElement("div"); toastEl.id = "acto-chat-history-toast"; document.body.appendChild(toastEl);
    rootEl.querySelector('[data-act="clear"]').addEventListener("click", (e) => { e.stopPropagation(); clearAll(); });
    rootEl.querySelector('[data-act="export"]').addEventListener("click", (e) => { e.stopPropagation(); exportTxt(); });
    rootEl.querySelector('[data-act="close"]').addEventListener("click", (e) => { e.stopPropagation(); setOpen(false); });
    const range = rootEl.querySelector(".acto-range"); range.value = String(opacityPct);
    range.addEventListener("input", (e) => { e.stopPropagation(); const v = Number(range.value) || 0; applyOpacity(v); saveOpacity(v); });
    range.addEventListener("mousedown", (e) => e.stopPropagation());
    listEl.addEventListener("click", async (e) => {
      const btn = e.target instanceof Element ? e.target.closest(".btn-copy") : null; if (!btn) return; e.stopPropagation();
      const bubble = btn.closest(".bubble-row")?.querySelector(".bubble");
      if (await copyText(bubble ? bubble.textContent : "")) { btn.classList.add("copied"); btn.innerHTML = CHECK_ICON; setTimeout(() => { btn.classList.remove("copied"); btn.innerHTML = COPY_ICON; }, 1300); showToast("Texto copiado!"); }
    });
    makeDraggable(rootEl.querySelector(".row1"), rootEl, (pos) => { panelPos = pos; setKey(POS_KEY, pos); });
    makeResizable(rootEl.querySelector("#acto-chat-history-resize"));
    mounted = true; updateCount(); applyOpacity(opacityPct); applySize();
    window.addEventListener("resize", () => { if (isOpen && rootEl) { placeEl(rootEl, panelPos, { x: window.innerWidth - rootEl.offsetWidth - 16, y: 80 }); } }, { passive: true });
  };

  // ───── open/close (compartilhado) ──────────────────────────────────
  const setOpen = (v, persist = true) => {
    isOpen = !!v;
    if (persist) saveOpenState(isOpen);
    if (toggleEl) toggleEl.dataset.active = isOpen ? "1" : "0";
    if (rootEl) {
      rootEl.dataset.open = isOpen ? "1" : "0";
      if (isOpen) { placeEl(rootEl, panelPos, { x: window.innerWidth - rootEl.offsetWidth - 16, y: Math.max(16, window.innerHeight - 480) }); applySize(); applyOpacity(opacityPct); renderList(); }
    }
  };

  // ───── captura USUÁRIO (side panel) ─────────────────────────────
  let lastCapture = { text: "", at: 0 };
  const DEDUP_WINDOW_MS = 2000;
  const captureText = (text) => { const t = String(text || "").trim(); if (!t) return; const now = Date.now(); if (t === lastCapture.text && now - lastCapture.at < DEDUP_WINDOW_MS) return; lastCapture = { text: t, at: now }; addMessage(t, "user"); };
  const findComposerTextarea = () => { const all = Array.from(document.querySelectorAll("textarea")); return all.find((el) => el.offsetParent !== null) || all[0] || null; };
  const isSendButton = (btn) => { if (!btn || btn.tagName !== "BUTTON" || btn.disabled) return false; const label = `${btn.getAttribute("aria-label") || ""} ${btn.title || ""} ${btn.textContent || ""}`.toLowerCase(); if (/send|enviar|submit|prompt|mensagem|message/.test(label)) return true; if (btn.querySelector('svg[data-icon*="send" i], svg[data-icon*="arrow" i]')) return true; return false; };
  const wireDomCapture = () => {
    if (window.__ACTO_CHAT_DOM_CAPTURE__) return; window.__ACTO_CHAT_DOM_CAPTURE__ = true;
    document.addEventListener("keydown", (e) => { if (e.key !== "Enter" || e.shiftKey || e.ctrlKey || e.metaKey || e.altKey) return; const ta = e.target; if (!(ta instanceof HTMLTextAreaElement) || e.isComposing) return; captureText(ta.value); }, true);
    document.addEventListener("click", (e) => { const btn = e.target instanceof Element ? e.target.closest("button") : null; if (!isSendButton(btn)) return; const form = btn.closest("form"); const ta = (form?.querySelector("textarea")) || findComposerTextarea(); if (ta) captureText(ta.value); }, true);
    document.addEventListener("submit", (e) => { const form = e.target; if (!(form instanceof HTMLFormElement)) return; const ta = form.querySelector("textarea"); if (ta) captureText(ta.value); }, true);
  };

  // ───── captura RESPOSTA da Lovable (página; temporal + sem duplicar) ──────
  const wireAssistantCapture = () => {
    if (!CAPTURE_ASSISTANT || !IS_PAGE) return;
    if (window.__ACTO_ASSIST_CAPTURE__) return; window.__ACTO_ASSIST_CAPTURE__ = true;

    const STABLE_MS = 1400, SCAN_MS = 700;
    const CLOCK_SKEW_MS = 90 * 1000; // horário do DOM normalmente não tem segundos
    const SEEN_KEY = "acto_chat_history_assistant_seen_v3";
    const MAX_SEEN = 1200;
    const captureStartedAt = Date.now();
    const pending = new Map();
    let baselined = false;
    let seen = new Set();
    let seenReady = false;

    const inOwnUI = (el) => !!(el && el.closest && (el.closest("#acto-chat-history-root") || el.closest("#acto-chat-history-toggle") || el.closest("#acto-chat-history-toast") || el.closest("#acto-floating-panel-icon")));
    const RE_COPY = /copy|copiar/;
    const RE_FEEDBACK = /thumb|thumbs-up|thumbs-down|like|dislike|good response|bad response|feedback|útil|helpful|rotate|retry|regenera|refazer|redo|share|compartilhar/;
    const btnSig = (btn) => { let s = `${btn.getAttribute("aria-label") || ""} ${btn.title || ""} ${btn.textContent || ""}`.toLowerCase(); btn.querySelectorAll("svg").forEach((svg) => { s += " " + (svg.getAttribute("class") || "") + " " + (svg.getAttribute("data-icon") || "") + " " + (svg.getAttribute("data-lucide") || ""); }); return s; };
    const isAssistantToolbar = (el) => { if (!el || inOwnUI(el)) return false; const btns = el.querySelectorAll("button"); if (!btns || btns.length < 2) return false; let copy = false, fb = false; for (const b of btns) { const s = btnSig(b); if (RE_COPY.test(s)) copy = true; if (RE_FEEDBACK.test(s)) fb = true; if (copy && fb) break; } return copy && fb; };

    const normalizeText = (value) => String(value || "").replace(/\u00a0/g, " ").replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim();
    const hashText = (value) => { let h = 2166136261; const text = normalizeText(value); for (let i = 0; i < text.length; i++) { h ^= text.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0).toString(36); };
    const projectKey = () => { const m = location.pathname.match(/(?:projects?|project)\/([a-z0-9_-]{8,})/i); return m?.[1] || location.pathname.split("/").filter(Boolean).slice(0, 2).join("/") || location.host; };
    const makeFingerprint = (text, timeKey) => `${projectKey()}|assistant|${timeKey}|${hashText(text)}`;

    const persistSeen = async () => {
      const values = Array.from(seen).slice(-MAX_SEEN);
      seen = new Set(values);
      await setKey(SEEN_KEY, values);
    };
    const loadSeen = async () => {
      const values = await getKey(SEEN_KEY, []);
      seen = new Set(Array.isArray(values) ? values.filter((v) => typeof v === "string") : []);
      seenReady = true;
    };

    const parseDomTime = (raw, now = Date.now()) => {
      const value = String(raw || "").trim();
      if (!value) return null;
      const iso = value.match(/\b(20\d{2}-\d{2}-\d{2}[T ]\d{2}:\d{2}(?::\d{2})?(?:\.\d+)?(?:Z|[+-]\d{2}:?\d{2})?)\b/);
      if (iso) { const ts = Date.parse(iso[1]); if (Number.isFinite(ts)) return { ts, key: new Date(ts).toISOString().slice(0, 19) }; }
      const full = value.match(/\b(\d{1,2})[\/.\-](\d{1,2})[\/.\-](20\d{2})[^\d]{0,8}(\d{1,2}):(\d{2})(?::(\d{2}))?\b/);
      if (full) { const ts = new Date(Number(full[3]), Number(full[2]) - 1, Number(full[1]), Number(full[4]), Number(full[5]), Number(full[6] || 0), 0).getTime(); return { ts, key: `${full[3]}-${p2(full[2])}-${p2(full[1])}T${p2(full[4])}:${full[5]}:${p2(full[6] || 0)}` }; }
      const clock = value.match(/^\s*(?:hoje\s*(?:às|as)?\s*)?(\d{1,2}):(\d{2})(?::(\d{2}))?\s*$/i);
      if (!clock) return null;
      const d = new Date(now); d.setHours(Number(clock[1]), Number(clock[2]), Number(clock[3] || 0), 0);
      if (d.getTime() > now + 5 * 60 * 1000) d.setDate(d.getDate() - 1);
      return { ts: d.getTime(), key: `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}T${p2(d.getHours())}:${p2(d.getMinutes())}:${p2(d.getSeconds())}` };
    };

    const textFromNode = (node) => {
      if (!node || inOwnUI(node)) return "";
      const clone = node.cloneNode(true);
      clone.querySelectorAll("button, svg, textarea, input, [role='toolbar'], time, [datetime], [data-timestamp], [data-time], [data-created-at], script, style").forEach((n) => n.remove());
      return normalizeText(clone.innerText || clone.textContent || "");
    };
    const isCaptureNoise = (value) => {
      const t = normalizeText(value).toLowerCase();
      if (!t) return true;
      return /^(?:lovable\s+update|acto\s*:|corrigir\s+erro|mostrar\s+(?:mais|menos)|detalhes|preview)\b/.test(t)
        || /nenhuma\s+tarefa\s+registrada/.test(t)
        || /^(?:consultando|pesquisando|buscando|verificando|analisando|explorando|sincronizando|re-testando|testando|checando)\b.{0,180}$/.test(t);
    };
    const isNonContentElement = (el) => {
      if (!el || !(el instanceof Element)) return true;
      if (el.matches("button, svg, textarea, input, time, script, style, [role='toolbar'], [datetime], [data-timestamp], [data-time], [data-created-at]")) return true;
      return !!el.closest("[role='toolbar']");
    };
    const tailContentFrom = (node) => {
      if (!node || isNonContentElement(node)) return "";
      const children = Array.from(node.children || []).filter((el) => !isNonContentElement(el));
      if (!children.length) { const own = textFromNode(node); return !isCaptureNoise(own) ? own : ""; }
      const parts = [];
      for (let i = children.length - 1; i >= 0; i--) {
        const child = children[i];
        const raw = textFromNode(child);
        if (!raw) continue;
        if (isCaptureNoise(raw)) { if (parts.length) break; continue; }
        parts.unshift(raw);
      }
      const joined = normalizeText(parts.join("\n\n"));
      if (joined && !isCaptureNoise(joined)) return joined;
      const own = textFromNode(node);
      return own && !isCaptureNoise(own) ? own : "";
    };
    const extractAnswerText = (bar) => {
      // A resposta real costuma ser o último bloco antes da barra Copiar/Feedback.
      // Sobe pela árvore e olha primeiro os irmãos anteriores mais próximos,
      // sem exigir que o horário esteja dentro do mesmo bloco.
      let branch = bar;
      for (let level = 0; level < 9 && branch?.parentElement; level++) {
        let sibling = branch.previousElementSibling;
        for (let checked = 0; sibling && checked < 6; checked++, sibling = sibling.previousElementSibling) {
          const text = tailContentFrom(sibling);
          if (text.length >= 2 && text.length <= 8000 && !isCaptureNoise(text)) return { root: sibling, text };
        }
        branch = branch.parentElement;
        if (inOwnUI(branch)) return null;
      }
      // Fallback para variações sem um irmão dedicado: conserva apenas o
      // último grupo de conteúdo e corta cards/status que vêm antes dele.
      let node = bar.parentElement;
      for (let i = 0; i < 8 && node; i++, node = node.parentElement) {
        if (inOwnUI(node)) return null;
        const text = tailContentFrom(node);
        if (text.length >= 2 && text.length <= 8000 && !isCaptureNoise(text)) return { root: node, text };
      }
      return null;
    };

    const extractMessageTime = (bar) => {
      let node = bar.parentElement;
      for (let i = 0; i < 10 && node; i++, node = node.parentElement) {
        if (inOwnUI(node)) return null;
        const timeCandidates = [];
        node.querySelectorAll("time, [datetime], [data-timestamp], [data-time], [data-created-at]").forEach((el) => {
          for (const attr of ["datetime", "data-timestamp", "data-time", "data-created-at", "title", "aria-label"]) { const v = el.getAttribute?.(attr); if (v) timeCandidates.push(v); }
          const own = normalizeText(el.textContent); if (own && own.length <= 80) timeCandidates.push(own);
        });
        node.querySelectorAll("span, div").forEach((el) => { if (el.children.length) return; const own = normalizeText(el.textContent); if (own.length <= 80 && (/^\s*(?:hoje\s*(?:às|as)?\s*)?\d{1,2}:\d{2}(?::\d{2})?\s*$/i.test(own) || /20\d{2}-\d{2}-\d{2}[T ]\d{2}:\d{2}/.test(own))) timeCandidates.push(own); });
        for (const raw of timeCandidates) { const parsed = parseDomTime(raw); if (parsed) return parsed; }
      }
      return null;
    };

    const findMessage = (bar) => {
      const answer = extractAnswerText(bar); // menor ancestral: somente a resposta final
      const time = extractMessageTime(bar); // busca separada: a hora fica no cabeçalho externo
      return answer && time ? { root: answer.root, text: answer.text, time } : null;
    };

    const latestFreshUserAt = (latest) => {
      let ts = 0;
      for (let i = latest.length - 1; i >= 0; i--) { const m = latest[i]; if (m?.role === "user" && Number.isFinite(Number(m.createdAt))) { ts = Number(m.createdAt); break; } }
      return ts;
    };

    const commitAssistant = async ({ text, time, fingerprint }) => {
      const t = normalizeText(text);
      if (!t || seen.has(fingerprint)) return;
      const latest = await loadSession();
      const freshAfter = Math.max(captureStartedAt, latestFreshUserAt(latest));
      if (time.ts < freshAfter - CLOCK_SKEW_MS) return;

      for (let i = latest.length - 1; i >= 0 && i >= latest.length - 8; i--) {
        const m = latest[i];
        if (m.role !== "assistant") continue;
        if (normalizeText(m.text) === t) { seen.add(fingerprint); await persistSeen(); return; }
        if (t.startsWith(normalizeText(m.text)) && (t.length - normalizeText(m.text).length) < 6000) {
          m.text = t; m.sourceTimestamp = time.ts; m.captureFingerprint = fingerprint;
          messages = latest.slice(-MAX_MESSAGES); seen.add(fingerprint); await Promise.all([saveSession(), persistSeen()]); renderAll(); return;
        }
        break;
      }
      latest.push({ id: newId(), role: "assistant", text: t, createdAt: time.ts, sourceTimestamp: time.ts, captureFingerprint: fingerprint, status: "sent" });
      messages = latest.slice(-MAX_MESSAGES); seen.add(fingerprint); await Promise.all([saveSession(), persistSeen()]); renderAll();
    };

    const findBars = () => { const bars = new Set(); document.querySelectorAll("button").forEach((btn) => { if (inOwnUI(btn)) return; if (!RE_COPY.test(btnSig(btn))) return; let bar = btn.parentElement; for (let i = 0; i < 3 && bar; i++) { if (isAssistantToolbar(bar)) { bars.add(bar); break; } bar = bar.parentElement; } }); return bars; };
    const scan = () => {
      if (!seenReady) return;
      const bars = findBars();
      if (!baselined) {
        for (const bar of bars) { try { bar.dataset.actoAssistDone = "1"; } catch {} const msg = findMessage(bar); if (msg) seen.add(makeFingerprint(msg.text, msg.time.key)); }
        baselined = true; persistSeen(); return;
      }
      const now = Date.now();
      for (const bar of bars) {
        if (bar.dataset && bar.dataset.actoAssistDone === "1") continue;
        const msg = findMessage(bar);
        if (!msg) continue;
        const fingerprint = makeFingerprint(msg.text, msg.time.key);
        if (seen.has(fingerprint)) { try { bar.dataset.actoAssistDone = "1"; } catch {} continue; }
        const latest = messages.length ? messages : [];
        const freshAfter = Math.max(captureStartedAt, latestFreshUserAt(latest));
        if (msg.time.ts < freshAfter - CLOCK_SKEW_MS) { try { bar.dataset.actoAssistDone = "1"; } catch {} seen.add(fingerprint); continue; }
        const prev = pending.get(bar);
        if (!prev || prev.fingerprint !== fingerprint) pending.set(bar, { ...msg, fingerprint, at: now });
        else if (now - prev.at >= STABLE_MS) { try { bar.dataset.actoAssistDone = "1"; } catch {} pending.delete(bar); commitAssistant(prev); }
      }
    };

    let t = null; const sched = () => { if (t) return; t = setTimeout(() => { t = null; try { scan(); } catch {} }, 250); };
    const mo = new MutationObserver(sched);
    const start = () => { if (document.body) mo.observe(document.body, { childList: true, subtree: true, characterData: true }); else document.addEventListener("DOMContentLoaded", start, { once: true }); };
    loadSeen().finally(() => setTimeout(() => { try { scan(); } catch {} start(); }, 900));
    setInterval(() => { try { scan(); } catch {} }, SCAN_MS);
  };

  // ───── fetch fallback (side panel) ────────────────────────────────
  const extractPromptFromBody = (body) => {
    if (!body) return null;
    try {
      let raw = body;
      if (body instanceof FormData) { for (const k of ["prompt", "message", "text", "content"]) { const v = body.get(k); if (typeof v === "string" && v.trim()) return v; } return null; }
      if (body instanceof Blob) return null;
      if (typeof body === "string") raw = body; else if (typeof body === "object" && body !== null) raw = JSON.stringify(body);
      if (typeof raw !== "string") return null;
      const parsed = JSON.parse(raw);
      if (parsed?.v === 1 && parsed?.license_id && parsed?.ct) return null;
      for (const k of ["prompt", "message", "text", "content", "input", "query"]) { if (typeof parsed?.[k] === "string" && parsed[k].trim()) return parsed[k]; }
      const msgList = Array.isArray(parsed?.messages) ? parsed.messages : Array.isArray(parsed?.params?.messages) ? parsed.params.messages : null;
      if (msgList && msgList.length) { const lu = [...msgList].reverse().find((m) => m?.role === "user") || msgList[msgList.length - 1]; const c = lu?.content; if (typeof c === "string" && c.trim()) return c; if (Array.isArray(c)) { const tt = c.find((part) => typeof part?.text === "string" && part.text.trim()); if (tt) return tt.text; } }
      return null;
    } catch { return null; }
  };
  const matchesEndpoint = (u) => { try { return ENDPOINTS.some((p) => u.includes(p)); } catch { return false; } };
  const wrapFetch = () => {
    const orig = window.fetch?.bind(window); if (!orig || window.__ACTO_FETCH_WRAPPED__) return; window.__ACTO_FETCH_WRAPPED__ = true;
    window.fetch = async function actoFetch(input, init) {
      let url = "", method = "GET", body = null;
      try { if (typeof input === "string") { url = input; method = (init?.method || "GET").toUpperCase(); body = init?.body ?? null; } else if (input instanceof Request) { url = input.url; method = (init?.method || input.method || "GET").toUpperCase(); body = init?.body ?? null; if (!body && method === "POST") { try { body = await input.clone().text(); } catch {} } } else if (input instanceof URL) { url = input.toString(); method = (init?.method || "GET").toUpperCase(); body = init?.body ?? null; } } catch {}
      if (method === "POST" && url && matchesEndpoint(url)) { const prompt = extractPromptFromBody(body); if (prompt) { const now = Date.now(); if (!(prompt.trim() === lastCapture.text && now - lastCapture.at < DEDUP_WINDOW_MS)) { lastCapture = { text: prompt.trim(), at: now }; addMessage(prompt, "user"); } } }
      return orig(input, init);
    };
  };

  // ───── sync ─────────────────────────────────────────────────
  const subscribe = () => {
    if (!chrome?.storage?.onChanged) return;
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area !== "local") return;
      if (changes[STORAGE_KEY]) { const nv = changes[STORAGE_KEY].newValue; messages = Array.isArray(nv) ? nv : []; renderAll(); }
      if (changes[OPEN_KEY]) setOpen(!!changes[OPEN_KEY].newValue, false);
      if (changes[OPACITY_KEY] && rootEl) applyOpacity(Number(changes[OPACITY_KEY].newValue) || 0);
    });
  };

  // ───── boot ───────────────────────────────────────────────
  const boot = async () => {
    messages = await loadSession();
    opacityPct = await loadOpacity();
    isOpen = await loadOpenState();
    subscribe();
    if (IS_PANEL) {
      wireDomCapture(); wrapFetch();
      if (document.body) mountButton(); else document.addEventListener("DOMContentLoaded", mountButton, { once: true });
      setTimeout(() => { if (toggleEl) toggleEl.dataset.active = isOpen ? "1" : "0"; }, 60);
    }
    if (IS_PAGE) {
      await loadPositions();
      const start = () => { mountModal(); setOpen(isOpen, false); wireAssistantCapture(); };
      if (document.body) start(); else document.addEventListener("DOMContentLoaded", start, { once: true });
    }
  };
  boot();
})();
