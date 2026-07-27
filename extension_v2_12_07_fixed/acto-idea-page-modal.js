(() => {
  "use strict";

  const MODAL_VERSION = "5.3.0";
  if (globalThis.__ACTO_IDEA_PAGE_MODAL_VERSION__ === MODAL_VERSION) return;
  globalThis.__ACTO_IDEA_PAGE_MODAL_VERSION__ = MODAL_VERSION;
  globalThis.__ACTO_IDEA_PAGE_MODAL__ = true;

  // Versioned page messages prevent stale injected modal listeners from older
  // extension builds from handling the current flow after an extension reload.
  const OPEN_MESSAGE = "ACTO_IDEA_PAGE_MODAL_OPEN_V8";
  const CLOSE_MESSAGE = "ACTO_IDEA_PAGE_MODAL_CLOSE_V8";
  const PING_MESSAGE = "ACTO_IDEA_PAGE_MODAL_PING_V8";
  const START_MESSAGE = "ACTO_IDEA_PAGE_START_V8";
  const STOP_MESSAGE = "ACTO_IDEA_PAGE_STOP_V8";
  const FINALIZE_MESSAGE = "ACTO_IDEA_PAGE_FINALIZE_V8";
  const ACTIVITY_START_MESSAGE = "ACTO_IDEA_PAGE_ACTIVITY_START_V8";
  const ACTIVITY_END_MESSAGE = "ACTO_IDEA_PAGE_ACTIVITY_END_V8";
  const SEND_TEXT_MESSAGE = "ACTO_IDEA_PAGE_SEND_TEXT_V8";
  const OPEN_PERMISSION_MESSAGE = "ACTO_IDEA_OPEN_MIC_PERMISSION_V8";
  const PERMISSION_GRANTED_MESSAGE = "ACTO_IDEA_MIC_PERMISSION_GRANTED_V8";
  const PERMISSION_STORAGE_KEY = "acto_microphone_permission_granted_v8";
  const MODAL_ID = "acto-idea-page-modal";
  const STYLE_ID = "acto-idea-page-modal-style";
  const STORAGE_KEY = "acto-idea-page-modal-geometry";
  const INTERACTION_MODE_STORAGE_KEY = "acto-idea-interaction-mode-v1";
  const AUTOMATIC_MODE = "automatic";
  const PUSH_TO_TALK_MODE = "push_to_talk";
  const DEFAULT_WIDTH = 920;
  const DEFAULT_HEIGHT = 680;
  const MIN_WIDTH = 620;
  const MIN_HEIGHT = 470;
  const EDGE = 10;

  const staleModal = document.getElementById("acto-idea-page-modal");
  if (staleModal) staleModal.remove();
  console.info("[ACTO][IDEA]", { stage: "modal_script_loaded", version: MODAL_VERSION });

  const runtime = chrome.runtime;
  let modal = null;
  let position = null;
  let size = null;
  let sessionId = "";
  let status = "idle";
  let busy = false;
  let active = false;
  let permissionRequired = false;
  let permissionFlowActive = false;
  let permissionFlowTimer = null;
  let finalPrompt = "";
  let conversation = [];
  let pendingUser = "";
  let pendingAssistant = "";
  let errorShownForSession = false;
  let sessionHadVoiceActivity = false;
  let interactionMode = (() => {
    try {
      return localStorage.getItem(INTERACTION_MODE_STORAGE_KEY) === PUSH_TO_TALK_MODE
        ? PUSH_TO_TALK_MODE
        : AUTOMATIC_MODE;
    } catch {
      return AUTOMATIC_MODE;
    }
  })();
  let pttRecording = false;
  let switchingMode = false;
  let textComposerOpen = false;
  let textDraft = "";
  let textSending = false;

  const STATUS_LABELS = Object.freeze({
    idle: "Pronto para conversar",
    connecting: "Conectando...",
    setup_pending: "Preparando conversa...",
    microphone_starting: "Ativando microfone...",
    ready_to_talk: "Pronto para falar",
    recording: "Gravando...",
    processing: "Processando...",
    switching_mode: "Trocando modo...",
    listening: "Ouvindo...",
    thinking: "Pensando...",
    speaking: "Falando...",
    finalizing: "Gerando prompt...",
    stopping: "Encerrando...",
    stopped: "Conversa encerrada",
    error: "Ocorreu um erro",
  });

  function cleanText(value) {
    return String(value || "").replace(/\s+/g, " ").trim();
  }

  function makeSessionId() {
    if (crypto?.randomUUID) return crypto.randomUUID();
    return `acto-idea-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }

  function clearPermissionFlow() {
    permissionFlowActive = false;
    if (permissionFlowTimer) {
      clearTimeout(permissionFlowTimer);
      permissionFlowTimer = null;
    }
  }

  function schedulePermissionFlowReset() {
    if (permissionFlowTimer) clearTimeout(permissionFlowTimer);
    permissionFlowTimer = setTimeout(() => {
      permissionFlowTimer = null;
      permissionFlowActive = false;
      if (permissionRequired && !active && !busy) {
        showError("A autorização não foi concluída. Clique em Autorizar microfone para tentar novamente.");
        updateUi();
      }
    }, 120000);
  }

  function handleMicrophonePermissionGranted(autoStart = true) {
    permissionRequired = false;
    clearPermissionFlow();
    showError("");
    if (!active && !busy) status = "idle";
    updateUi();

    if (autoStart && !active && !busy) {
      setTimeout(() => {
        void startConversation();
      }, 0);
    }
  }

  function sendMessage(message, timeoutMs = 60000) {
    return new Promise((resolve, reject) => {
      let settled = false;
      const timer = setTimeout(() => {
        if (settled) return;
        settled = true;
        reject(new Error("A operação demorou demais."));
      }, timeoutMs);

      try {
        runtime.sendMessage(message, (response) => {
          if (settled) return;
          settled = true;
          clearTimeout(timer);
          const error = runtime.lastError;
          if (error) {
            reject(new Error(error.message || "Falha na comunicação interna."));
            return;
          }
          resolve(response || null);
        });
      } catch (error) {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        reject(error);
      }
    });
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function minWidth() {
    return Math.min(MIN_WIDTH, Math.max(320, window.innerWidth - EDGE * 2));
  }

  function minHeight() {
    return Math.min(MIN_HEIGHT, Math.max(360, window.innerHeight - EDGE * 2));
  }

  function defaultSize() {
    return {
      width: Math.min(DEFAULT_WIDTH, Math.max(minWidth(), window.innerWidth - EDGE * 2)),
      height: Math.min(DEFAULT_HEIGHT, Math.max(minHeight(), window.innerHeight - EDGE * 2)),
    };
  }

  function defaultPosition(nextSize = defaultSize()) {
    return {
      x: Math.max(EDGE, Math.round((window.innerWidth - nextSize.width) / 2)),
      y: Math.max(EDGE, Math.round((window.innerHeight - nextSize.height) / 2)),
    };
  }

  function readGeometry() {
    try {
      const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
      if (parsed?.position) position = parsed.position;
      if (parsed?.size) size = parsed.size;
    } catch {}
  }

  function saveGeometry() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ position, size }));
    } catch {}
  }

  function applyGeometry() {
    const panel = modal?.querySelector(".acto-idea-window");
    if (!panel) return;
    if (!size) size = defaultSize();
    size.width = clamp(Number(size.width) || DEFAULT_WIDTH, minWidth(), Math.max(minWidth(), window.innerWidth - EDGE * 2));
    size.height = clamp(Number(size.height) || DEFAULT_HEIGHT, minHeight(), Math.max(minHeight(), window.innerHeight - EDGE * 2));
    if (!position) position = defaultPosition(size);
    position.x = clamp(Number(position.x) || EDGE, EDGE, Math.max(EDGE, window.innerWidth - size.width - EDGE));
    position.y = clamp(Number(position.y) || EDGE, EDGE, Math.max(EDGE, window.innerHeight - size.height - EDGE));
    panel.style.left = `${position.x}px`;
    panel.style.top = `${position.y}px`;
    panel.style.width = `${size.width}px`;
    panel.style.height = `${size.height}px`;
  }

  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function ensureStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
      #${MODAL_ID}{position:fixed;z-index:2147483647;pointer-events:none;color:#eef6ff;font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}
      #${MODAL_ID} *{box-sizing:border-box}
      #${MODAL_ID} button,#${MODAL_ID} textarea{font:inherit}
      #${MODAL_ID} .acto-idea-window{position:fixed;display:flex;flex-direction:column;overflow:hidden;pointer-events:auto;contain:layout style paint;isolation:isolate;border:1px solid rgba(96,165,250,.48);border-radius:16px;background:linear-gradient(180deg,rgba(30,58,138,.22),transparent 38%),rgba(3,7,18,.985);box-shadow:0 28px 95px rgba(0,0,0,.76),0 0 65px rgba(59,130,246,.24)}
      #${MODAL_ID} .acto-idea-header{height:54px;display:flex;align-items:center;justify-content:space-between;padding:0 14px;border-bottom:1px solid rgba(96,165,250,.25);background:rgba(15,23,42,.9);cursor:move;user-select:none;touch-action:none}
      #${MODAL_ID} .acto-idea-title{display:flex;align-items:center;gap:10px;font-size:12px;font-weight:900;letter-spacing:.16em;text-transform:uppercase;color:#bfdbfe}
      #${MODAL_ID} .acto-idea-title-icon{width:30px;height:30px;display:grid;place-items:center;border:1px solid rgba(96,165,250,.45);border-radius:9px;background:rgba(37,99,235,.2);color:#93c5fd}
      #${MODAL_ID} .acto-idea-close{width:32px;height:32px;border:1px solid rgba(248,113,113,.32);border-radius:9px;background:rgba(127,29,29,.22);color:#fecaca;cursor:pointer;font-size:18px}
      #${MODAL_ID} .acto-idea-body{flex:1;min-height:0;display:grid;grid-template-rows:auto 1fr auto;gap:12px;padding:14px}
      #${MODAL_ID} .acto-idea-mode-row{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:9px;padding:8px 10px;border:1px solid rgba(96,165,250,.16);border-radius:11px;background:rgba(2,6,23,.48)}
      #${MODAL_ID} .acto-idea-mode-label{font-size:10px;font-weight:900;letter-spacing:.1em;text-transform:uppercase;color:#94a3b8}
      #${MODAL_ID} .acto-idea-mode-options{display:flex;gap:6px;padding:3px;border:1px solid rgba(96,165,250,.2);border-radius:9px;background:rgba(15,23,42,.72)}
      #${MODAL_ID} .acto-idea-mode-button{height:28px;padding:0 11px;border:0;border-radius:7px;background:transparent;color:#94a3b8;font-size:9px;font-weight:900;letter-spacing:.08em;text-transform:uppercase;cursor:pointer}
      #${MODAL_ID} .acto-idea-mode-button[data-selected="1"]{background:rgba(37,99,235,.36);color:#dbeafe;box-shadow:0 0 16px rgba(59,130,246,.14)}
      #${MODAL_ID} .acto-idea-mode-button:disabled{opacity:.45;cursor:not-allowed}
      #${MODAL_ID} .acto-idea-mode-state{display:inline-flex;align-items:center;gap:6px;height:28px;padding:0 9px;border-radius:7px;color:#bfdbfe;font-size:9px;font-weight:900;letter-spacing:.07em;text-transform:uppercase}
      #${MODAL_ID} .acto-idea-mode-state::before{content:"";width:7px;height:7px;border-radius:50%;background:#34d399;box-shadow:0 0 10px rgba(52,211,153,.75)}
      #${MODAL_ID} .acto-idea-status{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:10px 12px;border:1px solid rgba(96,165,250,.2);border-radius:12px;background:rgba(2,6,23,.62)}
      #${MODAL_ID} .acto-idea-status-main{display:flex;align-items:center;gap:10px;min-width:0}
      #${MODAL_ID} .acto-idea-pulse{width:11px;height:11px;border-radius:50%;background:#60a5fa;box-shadow:0 0 16px rgba(96,165,250,.95)}
      #${MODAL_ID} .acto-idea-status[data-state="listening"] .acto-idea-pulse{background:#34d399;box-shadow:0 0 16px rgba(52,211,153,.95);animation:actoIdeaPulse 1.2s infinite}
      #${MODAL_ID} .acto-idea-status[data-state="speaking"] .acto-idea-pulse{background:#c084fc;box-shadow:0 0 16px rgba(192,132,252,.95);animation:actoIdeaPulse .8s infinite}
      #${MODAL_ID} .acto-idea-status[data-state="recording"] .acto-idea-pulse{background:#fb7185;box-shadow:0 0 18px rgba(251,113,133,.95);animation:actoIdeaPulse .65s infinite}
      #${MODAL_ID} .acto-idea-status[data-state="ready_to_talk"] .acto-idea-pulse{background:#fbbf24;box-shadow:0 0 16px rgba(251,191,36,.75)}
      #${MODAL_ID} .acto-idea-status[data-state="error"] .acto-idea-pulse{background:#f87171;box-shadow:0 0 16px rgba(248,113,113,.95)}
      @keyframes actoIdeaPulse{50%{transform:scale(1.45);opacity:.55}}
      #${MODAL_ID} .acto-idea-status-label{font-size:12px;font-weight:800;color:#e2e8f0}
      #${MODAL_ID} .acto-idea-status-hint{font-size:10px;color:#94a3b8;white-space:nowrap}
      #${MODAL_ID} .acto-idea-chat{min-height:0;overflow:auto;display:flex;flex-direction:column;align-items:stretch;gap:8px;padding:10px 12px;border:1px solid rgba(96,165,250,.18);border-radius:14px;background:rgba(2,6,23,.58);scroll-behavior:smooth}
      #${MODAL_ID} .acto-idea-empty{height:100%;min-height:150px;display:grid;place-items:center;text-align:center;color:#64748b;font-size:12px;line-height:1.5}
      #${MODAL_ID} .acto-idea-message-row{all:initial!important;box-sizing:border-box!important;display:flex!important;flex:0 0 auto!important;flex-direction:column!important;width:auto!important;max-width:min(72%,560px)!important;min-width:0!important;min-height:0!important;height:auto!important;margin:0!important;padding:0!important;gap:3px!important;font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif!important}
      #${MODAL_ID} .acto-idea-message-row[data-role="user"]{align-self:flex-end!important;align-items:flex-end!important}
      #${MODAL_ID} .acto-idea-message-row[data-role="assistant"]{align-self:flex-start!important;align-items:flex-start!important}
      #${MODAL_ID} .acto-idea-message{all:initial!important;box-sizing:border-box!important;display:inline-block!important;width:auto!important;max-width:100%!important;min-width:0!important;min-height:0!important;height:auto!important;margin:0!important;padding:6px 10px!important;border-radius:10px!important;white-space:normal!important;overflow-wrap:anywhere!important;word-break:normal!important;font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif!important;font-size:12px!important;line-height:1.35!important;box-shadow:0 2px 7px rgba(0,0,0,.12)!important}
      #${MODAL_ID} .acto-idea-message[data-role="user"]{border:1px solid rgba(52,211,153,.34)!important;background:rgba(6,78,59,.62)!important;color:#d1fae5!important;border-bottom-right-radius:3px!important}
      #${MODAL_ID} .acto-idea-message[data-role="assistant"]{border:1px solid rgba(96,165,250,.34)!important;background:rgba(30,58,138,.56)!important;color:#dbeafe!important;border-bottom-left-radius:3px!important}
      #${MODAL_ID} .acto-idea-message[data-kind="voice"]{padding:7px 11px!important}
      #${MODAL_ID} .acto-idea-message-text{all:initial!important;display:block!important;margin:0!important;padding:0!important;min-width:0!important;min-height:0!important;height:auto!important;color:inherit!important;font:inherit!important;line-height:inherit!important}
      #${MODAL_ID} .acto-idea-role{all:initial!important;display:block!important;margin:0 0 2px!important;font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif!important;font-size:7px!important;line-height:1!important;font-weight:900!important;letter-spacing:.08em!important;text-transform:uppercase!important;opacity:.55!important;color:inherit!important}
      #${MODAL_ID} .acto-idea-message[data-pending="1"]{opacity:.92!important}
      #${MODAL_ID} .acto-idea-pending-badge{display:inline-block;margin-left:4px;font-size:6.5px;letter-spacing:.04em;text-transform:uppercase;opacity:.48}
      #${MODAL_ID} .acto-idea-composer{display:none;grid-template-columns:1fr 36px;gap:7px;align-items:end;padding:8px;border:1px solid rgba(96,165,250,.22);border-radius:11px;background:rgba(2,6,23,.74)}
      #${MODAL_ID} .acto-idea-composer[data-open="1"]{display:grid}
      #${MODAL_ID} .acto-idea-composer textarea{width:100%;min-height:38px;max-height:120px;resize:vertical;padding:9px 10px;border:1px solid rgba(96,165,250,.26);border-radius:9px;background:rgba(15,23,42,.92);color:#e2e8f0;outline:none;font-size:12px;line-height:1.35}
      #${MODAL_ID} .acto-idea-composer textarea:focus{border-color:rgba(96,165,250,.7);box-shadow:0 0 0 2px rgba(59,130,246,.12)}
      #${MODAL_ID} .acto-idea-send{width:36px;height:36px;border:1px solid rgba(52,211,153,.4);border-radius:9px;background:rgba(5,150,105,.28);color:#d1fae5;cursor:pointer;font-size:17px;line-height:1}
      #${MODAL_ID} .acto-idea-send:disabled{opacity:.4;cursor:not-allowed}
      #${MODAL_ID} .acto-idea-actions{display:grid;grid-template-columns:minmax(90px,.75fr) minmax(110px,1fr) minmax(110px,1fr) minmax(145px,1.2fr);gap:8px}
      #${MODAL_ID} .acto-idea-button{height:40px;border-radius:9px;border:1px solid rgba(96,165,250,.32);background:rgba(30,58,138,.28);color:#bfdbfe;font-size:9px;font-weight:900;letter-spacing:.11em;text-transform:uppercase;cursor:pointer;transition:.16s ease}
      #${MODAL_ID} .acto-idea-button:hover{border-color:rgba(147,197,253,.75);background:rgba(37,99,235,.34);color:#fff}
      #${MODAL_ID} .acto-idea-button:disabled{opacity:.48;cursor:not-allowed}
      #${MODAL_ID} .acto-idea-button[data-tone="danger"]{border-color:rgba(248,113,113,.34);background:rgba(127,29,29,.25);color:#fecaca}
      #${MODAL_ID} .acto-idea-button[data-tone="primary"]{border-color:rgba(52,211,153,.45);background:rgba(5,150,105,.28);color:#d1fae5;box-shadow:0 0 22px rgba(16,185,129,.12)}
      #${MODAL_ID} .acto-idea-error{display:none;padding:9px 11px;border:1px solid rgba(248,113,113,.35);border-radius:10px;background:rgba(127,29,29,.25);color:#fecaca;font-size:11px}
      #${MODAL_ID} .acto-idea-error[data-visible="1"]{display:block}
      #${MODAL_ID} .acto-idea-final{position:absolute;inset:54px 0 0;display:none;grid-template-rows:auto 1fr auto;gap:12px;padding:16px;background:rgba(3,7,18,.985);z-index:5}
      #${MODAL_ID} .acto-idea-final[data-visible="1"]{display:grid}
      #${MODAL_ID} .acto-idea-final h3{margin:0;font-size:14px;font-weight:900;letter-spacing:.12em;text-transform:uppercase;color:#dbeafe}
      #${MODAL_ID} .acto-idea-final textarea{width:100%;height:100%;min-height:280px;resize:none;padding:15px;border:1px solid rgba(96,165,250,.3);border-radius:12px;background:#020617;color:#e2e8f0;font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:13px;line-height:1.55;outline:none}
      #${MODAL_ID} .acto-idea-final-actions{display:grid;grid-template-columns:1fr 1fr 1.15fr;gap:9px}
      #${MODAL_ID} .acto-idea-resize{position:absolute;z-index:8;touch-action:none;user-select:none}
      #${MODAL_ID} .acto-idea-resize[data-resize="n"]{top:-4px;left:12px;right:12px;height:8px;cursor:n-resize}
      #${MODAL_ID} .acto-idea-resize[data-resize="s"]{bottom:-4px;left:12px;right:12px;height:8px;cursor:s-resize}
      #${MODAL_ID} .acto-idea-resize[data-resize="e"]{right:-4px;top:12px;bottom:12px;width:8px;cursor:e-resize}
      #${MODAL_ID} .acto-idea-resize[data-resize="w"]{left:-4px;top:12px;bottom:12px;width:8px;cursor:w-resize}
      #${MODAL_ID} .acto-idea-resize[data-resize="ne"]{right:-5px;top:-5px;width:12px;height:12px;cursor:ne-resize}
      #${MODAL_ID} .acto-idea-resize[data-resize="nw"]{left:-5px;top:-5px;width:12px;height:12px;cursor:nw-resize}
      #${MODAL_ID} .acto-idea-resize[data-resize="se"]{right:-5px;bottom:-5px;width:12px;height:12px;cursor:se-resize}
      #${MODAL_ID} .acto-idea-resize[data-resize="sw"]{left:-5px;bottom:-5px;width:12px;height:12px;cursor:sw-resize}
      @media(max-width:760px){#${MODAL_ID} .acto-idea-actions{grid-template-columns:1fr 1fr}#${MODAL_ID} .acto-idea-final-actions{grid-template-columns:1fr}#${MODAL_ID} .acto-idea-status-hint{display:none}}
    `;
    document.documentElement.appendChild(style);
  }

  function renderResizeHandles() {
    return ["n", "e", "s", "w", "ne", "nw", "se", "sw"]
      .map((direction) => `<div class="acto-idea-resize" data-resize="${direction}"></div>`)
      .join("");
  }

  function renderShell() {
    if (!modal) return;
    modal.innerHTML = `
      <section class="acto-idea-window" role="dialog" aria-modal="false" aria-label="Desenvolver sua ideia">
        <header class="acto-idea-header">
          <div class="acto-idea-title">
            <span class="acto-idea-title-icon">🎙</span>
            <span>Desenvolver sua ideia</span>
          </div>
          <button class="acto-idea-close" type="button" data-action="close" title="Fechar">×</button>
        </header>
        <main class="acto-idea-body">
          <div>
            <div class="acto-idea-mode-row">
              <span class="acto-idea-mode-label">Conversa por voz</span>
              <div class="acto-idea-mode-options" role="group" aria-label="Controle da conversa">
                <span class="acto-idea-mode-state" data-mode-state>Automático ativo</span>
                <button class="acto-idea-mode-button" data-action="toggle-control" type="button">Assumir controle</button>
              </div>
            </div>
            <div class="acto-idea-status" data-state="idle">
              <div class="acto-idea-status-main">
                <span class="acto-idea-pulse"></span>
                <span class="acto-idea-status-label">Pronto para conversar</span>
              </div>
              <span class="acto-idea-status-hint" data-status-hint>Explique sua ideia naturalmente. A IA fará perguntas curtas.</span>
            </div>
            <div class="acto-idea-error" data-visible="0"></div>
          </div>
          <div class="acto-idea-chat"></div>
          <div class="acto-idea-composer" data-open="0">
            <textarea data-text-draft placeholder="Digite uma mensagem para a Helena..." aria-label="Digite uma mensagem para a Helena"></textarea>
            <button class="acto-idea-send" data-action="send-text" type="button" title="Enviar mensagem" aria-label="Enviar mensagem">➤</button>
          </div>
          <div class="acto-idea-actions">
            <button class="acto-idea-button" data-tone="danger" data-action="exit" type="button">Sair</button>
            <button class="acto-idea-button" data-action="speak" type="button">Falar</button>
            <button class="acto-idea-button" data-action="type" type="button">Digitar</button>
            <button class="acto-idea-button" data-tone="primary" data-action="finalize" type="button">Gerar prompt</button>
          </div>
        </main>
        <section class="acto-idea-final" data-visible="0">
          <h3>Prompt final</h3>
          <textarea readonly data-final-prompt></textarea>
          <div class="acto-idea-final-actions">
            <button class="acto-idea-button" data-action="continue" type="button">Continuar conversa</button>
            <button class="acto-idea-button" data-action="copy" type="button">Copiar</button>
            <button class="acto-idea-button" data-tone="primary" data-action="use" type="button">Usar este prompt</button>
          </div>
        </section>
        ${renderResizeHandles()}
      </section>
    `;
    applyGeometry();
    wireEvents();
    updateUi();
  }

  function messageItems() {
    const items = conversation.map((item) => ({ ...item, pending: false }));
    if (cleanText(pendingAssistant)) items.push({ role: "assistant", text: pendingAssistant, pending: true });
    return items;
  }

  function renderChat() {
    const chat = modal?.querySelector(".acto-idea-chat");
    if (!chat) return;
    const items = messageItems();
    if (!items.length) {
      chat.innerHTML = `<div class="acto-idea-empty"><div><strong>Fale ou digite para conversar com a Helena.</strong><br>Quando a ideia estiver clara, clique em <b>Gerar Prompt</b>.</div></div>`;
      return;
    }
    chat.innerHTML = items.map((item) => {
      const pendingLabel = item.pending
        ? `<span class="acto-idea-pending-badge">recebendo</span>`
        : "";
      const kind = item.kind === "voice" ? "voice" : "text";
      const text = kind === "voice" ? "🎙 Mensagem de voz" : item.text;
      return `
        <div class="acto-idea-message-row" data-role="${item.role}">
          <div class="acto-idea-message" data-role="${item.role}" data-kind="${kind}" data-pending="${item.pending ? "1" : "0"}">
            <span class="acto-idea-role">${item.role === "user" ? "Você" : "Helena"}${pendingLabel}</span>
            <span class="acto-idea-message-text">${escapeHtml(text)}</span>
          </div>
        </div>`;
    }).join("");
    chat.scrollTop = chat.scrollHeight;
  }

  function showError(message) {
    const element = modal?.querySelector(".acto-idea-error");
    if (!element) return;
    const text = cleanText(message);
    element.textContent = text;
    element.dataset.visible = text ? "1" : "0";
  }

  function saveInteractionMode() {
    try {
      localStorage.setItem(INTERACTION_MODE_STORAGE_KEY, interactionMode);
    } catch {}
  }

  function interactionHint() {
    if (status === "switching_mode") return "Trocando o controle sem perder o histórico da conversa.";
    if (interactionMode === AUTOMATIC_MODE) {
      return "Fale naturalmente. Se o automático falhar, clique em Assumir controle.";
    }
    if (status === "recording") {
      return "Fale à vontade, faça pausas e clique em Parar e enviar quando terminar.";
    }
    if (["processing", "thinking"].includes(status)) {
      return "A Helena está entendendo sua fala. Aguarde a resposta.";
    }
    if (status === "speaking") {
      return "Clique em Falar agora para interromper a Helena de propósito.";
    }
    return "Controle manual ativo. Clique em Falar, diga tudo no seu ritmo e depois clique em Parar e enviar.";
  }

  async function switchInteractionMode(nextMode, autoRecord = false) {
    const normalized = nextMode === PUSH_TO_TALK_MODE ? PUSH_TO_TALK_MODE : AUTOMATIC_MODE;
    if (switchingMode || busy || normalized === interactionMode) return;

    commitPending();
    switchingMode = true;
    busy = true;
    showError("");
    const previousSessionId = sessionId;
    status = "switching_mode";
    updateUi();

    try {
      if (previousSessionId) {
        await sendMessage({
          type: STOP_MESSAGE,
          target: "background",
          sessionId: previousSessionId,
          reason: "mode_switch",
        }, 20000).catch(() => null);
      }

      active = false;
      pttRecording = false;
      sessionId = "";
      interactionMode = normalized;
      saveInteractionMode();
      busy = false;
      switchingMode = false;
      status = "idle";
      updateUi();
      await startConversation({ autoRecord });
    } catch (error) {
      busy = false;
      switchingMode = false;
      active = false;
      status = "error";
      showError(error?.message || "Não foi possível trocar o modo da conversa.");
      updateUi();
    }
  }

  async function toggleControlMode() {
    if (busy || switchingMode) return;
    const nextMode = interactionMode === AUTOMATIC_MODE ? PUSH_TO_TALK_MODE : AUTOMATIC_MODE;
    const shouldStartImmediately = active || status === "error";

    if (active) {
      await switchInteractionMode(nextMode, nextMode === PUSH_TO_TALK_MODE);
      return;
    }

    interactionMode = nextMode;
    saveInteractionMode();
    showError("");
    status = "idle";
    updateUi();
    if (shouldStartImmediately) {
      await startConversation({ autoRecord: nextMode === PUSH_TO_TALK_MODE });
    }
  }

  function updateUi() {
    if (!modal) return;
    const statusBox = modal.querySelector(".acto-idea-status");
    const statusLabel = modal.querySelector(".acto-idea-status-label");
    if (statusBox) statusBox.dataset.state = status;
    if (statusLabel) statusLabel.textContent = STATUS_LABELS[status] || status;

    const hint = modal.querySelector("[data-status-hint]");
    if (hint) hint.textContent = interactionHint();

    const modeState = modal.querySelector("[data-mode-state]");
    const controlButton = modal.querySelector('[data-action="toggle-control"]');
    if (modeState) {
      modeState.textContent = interactionMode === PUSH_TO_TALK_MODE
        ? "Controle manual"
        : "Automático ativo";
    }
    if (controlButton) {
      if (interactionMode === AUTOMATIC_MODE) {
        controlButton.textContent = active ? "Assumir controle" : "Iniciar manual";
      } else {
        controlButton.textContent = active ? "Voltar ao automático" : "Usar automático";
      }
      if (status === "error" && interactionMode === AUTOMATIC_MODE) {
        controlButton.textContent = "Tentar manual";
      }
      controlButton.disabled = busy || switchingMode || ["finalizing", "stopping"].includes(status);
    }

    const speakButton = modal.querySelector('[data-action="speak"]');
    const typeButton = modal.querySelector('[data-action="type"]');
    const finalizeButton = modal.querySelector('[data-action="finalize"]');
    const composer = modal.querySelector(".acto-idea-composer");
    const textArea = modal.querySelector("[data-text-draft]");
    const sendButton = modal.querySelector('[data-action="send-text"]');

    if (speakButton) {
      if (permissionRequired) {
        speakButton.textContent = "Autorizar";
        speakButton.disabled = false;
      } else if (!active) {
        speakButton.textContent = busy ? "Conectando..." : "Falar";
        speakButton.disabled = busy;
      } else if (interactionMode === AUTOMATIC_MODE) {
        speakButton.textContent = "Falar";
        speakButton.title = "Assumir o controle manual e começar a falar";
        speakButton.disabled = busy || ["finalizing", "stopping"].includes(status);
      } else if (status === "recording") {
        speakButton.textContent = "Parar e enviar";
        speakButton.disabled = false;
      } else if (["ready_to_talk", "listening", "speaking"].includes(status)) {
        speakButton.textContent = status === "speaking" ? "Falar agora" : "Falar";
        speakButton.disabled = false;
      } else {
        speakButton.textContent = ["processing", "thinking"].includes(status) ? "Processando..." : "Aguarde...";
        speakButton.disabled = true;
      }
    }
    if (typeButton) {
      typeButton.textContent = textComposerOpen ? "Fechar texto" : "Digitar";
      typeButton.disabled = textSending || pttRecording || ["finalizing", "stopping"].includes(status);
    }
    if (composer) composer.dataset.open = textComposerOpen ? "1" : "0";
    if (textArea && document.activeElement !== textArea) textArea.value = textDraft;
    if (sendButton) sendButton.disabled = textSending || !cleanText(textArea?.value || textDraft);
    if (finalizeButton) {
      finalizeButton.disabled = status === "finalizing";
      finalizeButton.title = finalizeButton.disabled
        ? "Aguarde a geração do prompt."
        : "Gerar o prompt final com base na conversa.";
    }

    const finalLayer = modal.querySelector(".acto-idea-final");
    const finalArea = modal.querySelector("[data-final-prompt]");
    if (finalLayer) finalLayer.dataset.visible = finalPrompt ? "1" : "0";
    if (finalArea) finalArea.value = finalPrompt;
    renderChat();
  }

  function mergePending(current, next) {
    const previous = cleanText(current);
    const incoming = cleanText(next);
    if (!incoming) return previous;
    if (!previous) return incoming;
    if (incoming.startsWith(previous)) return incoming;
    if (previous.startsWith(incoming) || previous.endsWith(incoming)) return previous;
    if (incoming.endsWith(previous)) return incoming;

    const maxOverlap = Math.min(previous.length, incoming.length);
    for (let overlap = maxOverlap; overlap >= 3; overlap -= 1) {
      if (previous.slice(-overlap).toLowerCase() === incoming.slice(0, overlap).toLowerCase()) {
        return `${previous}${incoming.slice(overlap)}`.trim();
      }
    }
    return `${previous} ${incoming}`.trim();
  }

  function addCommitted(role, text, kind = "text") {
    const value = cleanText(text);
    if (!value || !["user", "assistant"].includes(role)) return;
    const normalizedKind = kind === "voice" ? "voice" : "text";
    const last = conversation[conversation.length - 1];
    if (last?.role === role && last.text === value && last.kind === normalizedKind) return;
    conversation.push({ role, text: value, kind: normalizedKind });
    conversation = conversation.slice(-60);
  }

  function commitPending() {
    if (cleanText(pendingAssistant)) addCommitted("assistant", pendingAssistant);
    pendingUser = "";
    pendingAssistant = "";
  }

  async function startConversation(options = {}) {
    const autoRecord = options?.autoRecord === true;
    if (permissionRequired) {
      await openPermissionPage();
      return;
    }
    if (busy || active) return;
    busy = true;
    errorShownForSession = false;
    showError("");
    status = "connecting";
    sessionId = makeSessionId();
    pendingUser = "";
    pendingAssistant = "";
    pttRecording = false;
    textSending = false;
    sessionHadVoiceActivity = conversation.length > 0;
    updateUi();

    try {
      const response = await sendMessage({
        type: START_MESSAGE,
        target: "background",
        sessionId,
        interactionMode,
        conversation: conversation.slice(-30),
      }, 75000);

      if (response?.code === "MIC_PERMISSION_REQUIRED") {
        permissionRequired = true;
        busy = false;
        status = "idle";
        showError("Autorize o microfone na nova aba. A conversa iniciará automaticamente em seguida.");
        updateUi();
        await openPermissionPage();
        return;
      }
      if (!response?.ok) throw new Error(response?.message || "Não foi possível iniciar a conversa.");
      permissionRequired = false;
      active = true;
      sessionHadVoiceActivity = true;
      busy = false;
      interactionMode = response.interactionMode === PUSH_TO_TALK_MODE
        ? PUSH_TO_TALK_MODE
        : interactionMode;
      saveInteractionMode();
      status = response.status || (interactionMode === PUSH_TO_TALK_MODE ? "ready_to_talk" : "listening");
      updateUi();
      if (autoRecord && interactionMode === PUSH_TO_TALK_MODE) {
        await startPushToTalkTurn();
      }
    } catch (error) {
      busy = false;
      active = false;
      status = "error";
      showError(error?.message || "Não foi possível iniciar a conversa.");
      updateUi();
    }
  }

  async function startPushToTalkTurn() {
    if (!sessionId || !active || interactionMode !== PUSH_TO_TALK_MODE) return;
    showError("");
    try {
      const response = await sendMessage({
        type: ACTIVITY_START_MESSAGE,
        target: "background",
        sessionId,
      }, 15000);
      if (!response?.ok) throw new Error(response?.message || "Não foi possível iniciar a gravação.");
      pttRecording = true;
      status = "recording";
      sessionHadVoiceActivity = true;
      updateUi();
    } catch (error) {
      showError(error?.message || "Não foi possível iniciar a gravação.");
      updateUi();
    }
  }

  async function ensureActiveForText() {
    if (active && sessionId) return true;
    await startConversation();
    return Boolean(active && sessionId);
  }

  async function sendTypedMessage() {
    const text = cleanText(modal?.querySelector("[data-text-draft]")?.value || textDraft);
    if (!text || textSending || pttRecording || status === "finalizing") return;
    textDraft = text;
    textSending = true;
    showError("");
    updateUi();
    try {
      if (!(await ensureActiveForText())) throw new Error("Não foi possível iniciar a conversa.");
      const response = await sendMessage({
        type: SEND_TEXT_MESSAGE,
        target: "background",
        sessionId,
        text,
      }, 20000);
      if (!response?.ok) throw new Error(response?.message || "Não foi possível enviar a mensagem.");
      textDraft = "";
      textComposerOpen = false;
      status = response.status || "thinking";
    } catch (error) {
      showError(error?.message || "Não foi possível enviar a mensagem.");
    } finally {
      textSending = false;
      updateUi();
    }
  }

  async function toggleTextComposer() {
    if (status === "finalizing" || pttRecording) return;
    if (!active && !busy) await startConversation();
    textComposerOpen = !textComposerOpen;
    updateUi();
    if (textComposerOpen) {
      requestAnimationFrame(() => modal?.querySelector("[data-text-draft]")?.focus?.());
    }
  }

  async function handleSpeakAction() {
    if (permissionRequired) {
      await openPermissionPage();
      return;
    }
    if (!active) {
      await startConversation();
      return;
    }
    if (interactionMode === AUTOMATIC_MODE) {
      await switchInteractionMode(PUSH_TO_TALK_MODE, true);
      return;
    }
    if (pttRecording || status === "recording") {
      await stopPushToTalkTurn();
      return;
    }
    if (["ready_to_talk", "listening", "speaking"].includes(status)) {
      await startPushToTalkTurn();
    }
  }

  async function stopPushToTalkTurn() {
    if (!sessionId || !active || interactionMode !== PUSH_TO_TALK_MODE || !pttRecording) return;
    showError("");
    try {
      const response = await sendMessage({
        type: ACTIVITY_END_MESSAGE,
        target: "background",
        sessionId,
      }, 15000);
      if (!response?.ok) throw new Error(response?.message || "Não foi possível enviar sua fala.");
      pttRecording = false;
      status = "processing";
      updateUi();
    } catch (error) {
      showError(error?.message || "Não foi possível enviar sua fala.");
      updateUi();
    }
  }

  async function stopConversation(reason = "manual") {
    const id = sessionId;
    if (!id) return;
    active = false;
    pttRecording = false;
    textComposerOpen = false;
    textDraft = "";
    textSending = false;
    busy = true;
    status = "stopping";
    updateUi();
    try {
      await sendMessage({
        type: STOP_MESSAGE,
        target: "background",
        sessionId: id,
        reason,
      }, 20000);
    } catch {}
    commitPending();
    busy = false;
    status = "stopped";
    sessionId = "";
    updateUi();
  }

  async function finalizeIdea() {
    if (status === "finalizing") return;

    commitPending();
    const finalizeSessionId = sessionId;
    const localConversation = conversation.slice(-60);

    if (!finalizeSessionId && localConversation.length === 0 && !sessionHadVoiceActivity) {
      showError("Inicie a conversa antes de gerar o prompt.");
      return;
    }

    busy = true;
    status = "finalizing";
    showError("");
    updateUi();

    try {
      const response = await sendMessage({
        type: FINALIZE_MESSAGE,
        target: "background",
        sessionId: finalizeSessionId,
        conversation: localConversation,
      }, 120000);

      if (!response?.ok || !cleanText(response.final_prompt)) {
        throw new Error(response?.message || "Não foi possível gerar o prompt final.");
      }

      finalPrompt = cleanText(response.final_prompt);

      // Stop only after the textual finalizer has captured the session
      // transcript. This avoids losing the final turn before generation.
      if (finalizeSessionId) {
        try {
          await sendMessage({
            type: STOP_MESSAGE,
            target: "background",
            sessionId: finalizeSessionId,
            reason: "finalize",
          }, 20000);
        } catch {}
      }

      active = false;
      busy = false;
      status = "stopped";
      sessionId = "";
      updateUi();
    } catch (error) {
      busy = false;
      status = active ? "listening" : "error";
      showError(error?.message || "Não foi possível gerar o prompt final.");
      updateUi();
    }
  }

  async function openPermissionPage() {
    if (permissionFlowActive) return;
    permissionFlowActive = true;
    schedulePermissionFlowReset();

    try {
      const response = await sendMessage({
        type: OPEN_PERMISSION_MESSAGE,
        target: "background",
      }, 15000);
      if (!response?.ok) throw new Error(response?.message || "Não foi possível abrir a autorização do microfone.");
      showError("Autorize o microfone na nova aba. A conversa iniciará automaticamente em seguida.");
      updateUi();
    } catch (error) {
      clearPermissionFlow();
      showError(error?.message || "Não foi possível abrir a autorização do microfone.");
      updateUi();
    }
  }

  async function copyPrompt() {
    if (!finalPrompt) return;
    try {
      await navigator.clipboard.writeText(finalPrompt);
      showError("");
      const button = modal?.querySelector('[data-action="copy"]');
      if (button) {
        const original = button.textContent;
        button.textContent = "Copiado";
        setTimeout(() => { if (button.isConnected) button.textContent = original; }, 1200);
      }
    } catch {
      showError("Não foi possível copiar automaticamente.");
    }
  }

  async function usePrompt() {
    if (!finalPrompt) return;
    try {
      const response = await sendMessage({
        type: "ACTO_IDEA_USE_PROMPT",
        prompt: finalPrompt,
      }, 10000);
      if (!response?.ok) throw new Error(response?.error || "Não foi possível inserir o prompt no painel.");
      showError("");
      closeModal(false);
    } catch (error) {
      showError(error?.message || "Não foi possível inserir o prompt no painel.");
    }
  }

  async function continueConversation() {
    finalPrompt = "";
    showError("");
    status = "idle";
    updateUi();
    await startConversation();
  }

  let activePointerGestureFinish = null;

  function startPointerGesture(target, event, onMove, onFinish, cursor) {
    if (!target || event.button !== 0) return;
    if (activePointerGestureFinish) activePointerGestureFinish();

    event.preventDefault();
    event.stopPropagation();

    const pointerId = event.pointerId;
    const root = document.documentElement;
    const previousUserSelect = root.style.userSelect;
    const previousCursor = root.style.cursor;
    let finished = false;

    const cleanup = () => {
      target.removeEventListener("pointermove", move);
      target.removeEventListener("pointerup", finish);
      target.removeEventListener("pointercancel", finish);
      target.removeEventListener("lostpointercapture", finish);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", finish);
      window.removeEventListener("pointercancel", finish);
      window.removeEventListener("blur", finish);
      document.removeEventListener("visibilitychange", visibilityChange);
      root.style.userSelect = previousUserSelect;
      root.style.cursor = previousCursor;
      try {
        if (target.hasPointerCapture?.(pointerId)) target.releasePointerCapture(pointerId);
      } catch {}
      if (activePointerGestureFinish === finish) activePointerGestureFinish = null;
    };

    const finish = () => {
      if (finished) return;
      finished = true;
      cleanup();
      onFinish?.();
    };

    const move = (moveEvent) => {
      if (moveEvent.pointerId !== pointerId) return;
      if ((moveEvent.buttons & 1) !== 1) {
        finish();
        return;
      }
      moveEvent.preventDefault();
      onMove(moveEvent);
    };

    const visibilityChange = () => {
      if (document.hidden) finish();
    };

    activePointerGestureFinish = finish;
    root.style.userSelect = "none";
    if (cursor) root.style.cursor = cursor;

    target.addEventListener("pointermove", move);
    target.addEventListener("pointerup", finish);
    target.addEventListener("pointercancel", finish);
    target.addEventListener("lostpointercapture", finish);
    window.addEventListener("blur", finish, { once: true });
    document.addEventListener("visibilitychange", visibilityChange);

    try {
      target.setPointerCapture(pointerId);
    } catch {
      window.addEventListener("pointermove", move);
      window.addEventListener("pointerup", finish, { once: true });
    }
  }

  function wireDrag() {
    const panel = modal?.querySelector(".acto-idea-window");
    const header = modal?.querySelector(".acto-idea-header");
    if (!panel || !header) return;
    header.addEventListener("pointerdown", (event) => {
      if (event.target.closest("button")) return;
      const startX = event.clientX;
      const startY = event.clientY;
      const startPosition = { ...position };
      startPointerGesture(
        header,
        event,
        (moveEvent) => {
          position.x = startPosition.x + moveEvent.clientX - startX;
          position.y = startPosition.y + moveEvent.clientY - startY;
          applyGeometry();
        },
        saveGeometry,
        "grabbing"
      );
    });
  }

  function wireResize() {
    const panel = modal?.querySelector(".acto-idea-window");
    if (!panel) return;
    modal.querySelectorAll("[data-resize]").forEach((handle) => {
      handle.addEventListener("pointerdown", (event) => {
        const direction = handle.dataset.resize || "";
        const startX = event.clientX;
        const startY = event.clientY;
        const startSize = { ...size };
        const startPosition = { ...position };
        const resizeCursor = getComputedStyle(handle).cursor;

        startPointerGesture(
          handle,
          event,
          (moveEvent) => {
            const dx = moveEvent.clientX - startX;
            const dy = moveEvent.clientY - startY;
            if (direction.includes("e")) size.width = startSize.width + dx;
            if (direction.includes("s")) size.height = startSize.height + dy;
            if (direction.includes("w")) {
              size.width = startSize.width - dx;
              position.x = startPosition.x + dx;
            }
            if (direction.includes("n")) {
              size.height = startSize.height - dy;
              position.y = startPosition.y + dy;
            }
            applyGeometry();
          },
          saveGeometry,
          resizeCursor
        );
      });
    });
  }

  function wireEvents() {
    modal.querySelector('[data-action="close"]')?.addEventListener("click", () => closeModal(true));
    modal.querySelector('[data-action="exit"]')?.addEventListener("click", () => closeModal(true));
    modal.querySelector('[data-action="speak"]')?.addEventListener("click", () => void handleSpeakAction());
    modal.querySelector('[data-action="type"]')?.addEventListener("click", () => void toggleTextComposer());
    modal.querySelector('[data-action="send-text"]')?.addEventListener("click", () => void sendTypedMessage());
    modal.querySelector('[data-action="toggle-control"]')?.addEventListener("click", () => {
      void toggleControlMode();
    });
    modal.querySelector('[data-action="finalize"]')?.addEventListener("click", finalizeIdea);
    modal.querySelector('[data-action="continue"]')?.addEventListener("click", continueConversation);
    modal.querySelector('[data-action="copy"]')?.addEventListener("click", copyPrompt);
    modal.querySelector('[data-action="use"]')?.addEventListener("click", usePrompt);
    const textArea = modal.querySelector("[data-text-draft]");
    textArea?.addEventListener("input", (event) => {
      textDraft = event.target.value;
      const sendButton = modal?.querySelector('[data-action="send-text"]');
      if (sendButton) sendButton.disabled = textSending || !cleanText(textDraft);
    });
    textArea?.addEventListener("keydown", (event) => {
      if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();
        void sendTypedMessage();
      }
    });
    wireDrag();
    wireResize();
  }

  async function closeModal(stop = true) {
    clearPermissionFlow();
    if (stop && sessionId) await stopConversation("modal_closed");
    modal?.remove();
    modal = null;
  }

  function openModal() {
    ensureStyles();
    readGeometry();
    if (modal?.isConnected) {
      applyGeometry();
      modal.focus();
      return;
    }
    modal = document.createElement("div");
    modal.id = MODAL_ID;
    modal.tabIndex = -1;
    document.body.appendChild(modal);
    renderShell();
    modal.focus();
  }

  // Atalho de teclado: a barra de espaco aciona o mesmo botao "Falar" / "Parar e enviar".
  // Funciona nos modos automatico e manual (apenas dispara o clique do botao, sem duplicar logica).
  document.addEventListener(
    "keydown",
    (event) => {
      if (event.code !== "Space" && event.key !== " " && event.key !== "Spacebar") return;
      if (!modal || !modal.isConnected) return;
      if (event.repeat) return;
      const target = event.target;
      const tag = target && target.tagName ? String(target.tagName).toUpperCase() : "";
      // Nao interferir quando o foco esta em campo de texto ou em outro elemento interativo,
      // assim digitar espaco no "Digitar" e navegar/acionar por Tab continuam normais.
      if (
        (target && target.isContentEditable) ||
        tag === "INPUT" ||
        tag === "TEXTAREA" ||
        tag === "SELECT" ||
        tag === "BUTTON" ||
        tag === "A"
      ) {
        return;
      }
      const speakButton = modal.querySelector('[data-action="speak"]');
      if (!speakButton) return;
      event.preventDefault();
      event.stopPropagation();
      if (speakButton.disabled) return;
      speakButton.click();
    },
    true
  );

  chrome.storage?.onChanged?.addListener?.((changes, areaName) => {
    if (
      areaName === "local" &&
      changes[PERMISSION_STORAGE_KEY]?.newValue === true
    ) {
      handleMicrophonePermissionGranted(true);
    }
  });

  runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message?.type === PERMISSION_GRANTED_MESSAGE) {
      handleMicrophonePermissionGranted(message.autoStart !== false);
      sendResponse({ ok: true, version: MODAL_VERSION, autoStartAccepted: true });
      return false;
    }

    if (message?.type === PING_MESSAGE) {
      sendResponse({ ok: true, version: MODAL_VERSION });
      return false;
    }
    if (message?.type === OPEN_MESSAGE) {
      openModal();
      sendResponse({ ok: true });
      return false;
    }
    if (message?.type === CLOSE_MESSAGE) {
      void closeModal(true);
      sendResponse({ ok: true });
      return false;
    }

    if (!sessionId || message?.sessionId !== sessionId) return false;

    if (message.type === "ACTO_LIVE_STATUS") {
      status = cleanText(message.status) || status;
      active = !["stopped", "error"].includes(status);
      pttRecording = status === "recording";
      busy = ["connecting", "setup_pending", "microphone_starting", "switching_mode", "stopping", "finalizing", "processing", "thinking"].includes(status);
      if (["listening", "ready_to_talk", "recording", "thinking", "processing", "speaking"].includes(status)) sessionHadVoiceActivity = true;
      updateUi();
      return false;
    }

    if (message.type === "ACTO_LIVE_TRANSCRIPT") {
      // Input transcription is intentionally not displayed. Helena understands
      // the original audio directly; this caption is only an optional API aid.
      if (cleanText(message.text)) sessionHadVoiceActivity = true;
      return false;
    }

    if (message.type === "ACTO_LIVE_MODEL_TEXT") {
          pendingAssistant = mergePending(pendingAssistant, message.text);
      if (cleanText(message.text)) sessionHadVoiceActivity = true;
      updateUi();
      return false;
    }

    if (message.type === "ACTO_LIVE_TURN_COMMITTED") {
      if (cleanText(message.userText)) addCommitted("user", message.userText, message.userKind);
      if (cleanText(message.assistantText)) addCommitted("assistant", message.assistantText);
      pendingUser = "";
      pendingAssistant = "";
      updateUi();
      return false;
    }

    if (message.type === "ACTO_LIVE_ERROR") {
      if (!errorShownForSession) {
        errorShownForSession = true;
        showError(message.message || "A conexão com a IA foi interrompida.");
      }
      active = false;
      pttRecording = false;
      busy = false;
      status = "error";
      updateUi();
      return false;
    }

    return false;
  });

  window.addEventListener("resize", () => {
    if (modal?.isConnected) applyGeometry();
  });

  window.addEventListener("pagehide", () => {
    if (!sessionId) return;
    try {
      runtime.sendMessage({
        type: STOP_MESSAGE,
        target: "background",
        sessionId,
        reason: "page_unload",
      });
    } catch {}
  });
})();
