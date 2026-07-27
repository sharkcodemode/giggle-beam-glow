(() => {
  if (globalThis.__ACTO_REMOVER_PAGE_MODAL__) return;
  globalThis.__ACTO_REMOVER_PAGE_MODAL__ = true;

  const OPEN_MESSAGE_TYPE = "ACTO_OPEN_REMOVER_PAGE_MODAL";
  const CLOSE_MESSAGE_TYPE = "ACTO_CLOSE_REMOVER_PAGE_MODAL";
  const PING_MESSAGE_TYPE = "ACTO_REMOVER_PAGE_MODAL_PING";
  const MODAL_ID = "acto-remover-page-modal";
  const STYLE_ID = "acto-remover-page-modal-style";
  const REMOVER_URL = "https://acto-lov.online/removedor";
  const DEFAULT_WIDTH = 920;
  const DEFAULT_HEIGHT = 680;
  const MIN_WIDTH = 320;
  const MIN_HEIGHT = 360;
  const EDGE = 12;

  const runtime = globalThis.chrome?.runtime;
  let modal = null;
  let position = null;
  let size = null;

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function defaultSize() {
    return {
      width: Math.min(DEFAULT_WIDTH, Math.max(MIN_WIDTH, window.innerWidth - EDGE * 2)),
      height: Math.min(DEFAULT_HEIGHT, Math.max(MIN_HEIGHT, window.innerHeight - EDGE * 2)),
    };
  }

  function defaultPosition(nextSize = defaultSize()) {
    return {
      x: Math.max(EDGE, Math.round((window.innerWidth - nextSize.width) / 2)),
      y: Math.max(EDGE, Math.round((window.innerHeight - nextSize.height) / 2)),
    };
  }

  function iconSvg(path) {
    return `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="${path}"></path>
      </svg>
    `;
  }

  function ensureStyles() {
    if (document.getElementById(STYLE_ID)) return;

    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
      #${MODAL_ID} {
        position: fixed;
        z-index: 2147483647;
        pointer-events: none;
        color: #eef6ff;
        font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
      }
      #${MODAL_ID} * { box-sizing: border-box; }
      #${MODAL_ID} .acto-remover-window {
        position: fixed;
        display: flex;
        flex-direction: column;
        min-width: ${MIN_WIDTH}px;
        min-height: ${MIN_HEIGHT}px;
        overflow: hidden;
        pointer-events: auto;
        border: 1px solid rgba(96, 165, 250, .55);
        border-radius: 14px;
        background: #020617;
        box-shadow: 0 28px 90px rgba(0, 0, 0, .72), 0 0 60px rgba(59, 130, 246, .32);
        animation: actoRemoverIn .18s ease-out both;
      }
      #${MODAL_ID} .acto-remover-header {
        min-height: 46px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        padding: 8px 10px 8px 14px;
        border-bottom: 1px solid rgba(96, 165, 250, .32);
        background: rgba(15, 23, 42, .98);
        cursor: move;
        user-select: none;
      }
      #${MODAL_ID} .acto-remover-title,
      #${MODAL_ID} .acto-remover-actions {
        display: flex;
        align-items: center;
      }
      #${MODAL_ID} .acto-remover-title {
        min-width: 0;
        gap: 9px;
        color: #bfdbfe;
        font-size: 12px;
        font-weight: 900;
        letter-spacing: .18em;
        text-transform: uppercase;
      }
      #${MODAL_ID} .acto-remover-title svg {
        width: 18px;
        height: 18px;
        flex: 0 0 auto;
      }
      #${MODAL_ID} .acto-remover-actions { gap: 6px; }
      #${MODAL_ID} button {
        height: 30px;
        display: inline-grid;
        place-items: center;
        border: 1px solid rgba(96, 165, 250, .38);
        border-radius: 7px;
        background: rgba(30, 58, 138, .30);
        color: #dbeafe;
        cursor: pointer;
        font: 800 11px/1 ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
        transition: background .16s ease, border-color .16s ease, color .16s ease;
      }
      #${MODAL_ID} button:hover {
        border-color: rgba(147, 197, 253, .82);
        background: rgba(37, 99, 235, .46);
        color: #fff;
      }
      #${MODAL_ID} .acto-remover-icon-button {
        width: 32px;
        padding: 0;
      }
      #${MODAL_ID} .acto-remover-icon-button svg {
        width: 15px;
        height: 15px;
      }
      #${MODAL_ID} .acto-remover-close {
        border-color: rgba(248, 113, 113, .40);
        background: rgba(127, 29, 29, .30);
        color: #fecaca;
      }
      #${MODAL_ID} .acto-remover-frame {
        flex: 1;
        min-width: 0;
        min-height: 0;
        display: block;
        border: 0;
        background: #fff;
      }
      @keyframes actoRemoverIn {
        from { opacity: 0; transform: scale(.97); }
        to { opacity: 1; transform: scale(1); }
      }
      @media (max-width: 640px) {
        #${MODAL_ID} .acto-remover-window {
          min-width: 280px;
          min-height: 320px;
        }
        #${MODAL_ID} .acto-remover-title {
          font-size: 11px;
          letter-spacing: .12em;
        }
      }
    `;

    (document.head || document.documentElement).appendChild(style);
  }

  function applyGeometry() {
    const panel = modal?.querySelector(".acto-remover-window");
    if (!panel) return;

    if (!size) size = defaultSize();
    if (!position) position = defaultPosition(size);

    const minWidth = Math.min(MIN_WIDTH, Math.max(280, window.innerWidth - EDGE * 2));
    const minHeight = Math.min(MIN_HEIGHT, Math.max(280, window.innerHeight - EDGE * 2));
    size = {
      width: clamp(size.width, minWidth, Math.max(minWidth, window.innerWidth - EDGE * 2)),
      height: clamp(size.height, minHeight, Math.max(minHeight, window.innerHeight - EDGE * 2)),
    };
    position = {
      x: clamp(position.x, EDGE, Math.max(EDGE, window.innerWidth - size.width - EDGE)),
      y: clamp(position.y, EDGE, Math.max(EDGE, window.innerHeight - size.height - EDGE)),
    };

    panel.style.width = `${size.width}px`;
    panel.style.height = `${size.height}px`;
    panel.style.left = `${position.x}px`;
    panel.style.top = `${position.y}px`;
  }

  function wireDrag() {
    const panel = modal?.querySelector(".acto-remover-window");
    const header = modal?.querySelector(".acto-remover-header");
    if (!panel || !header) return;

    let drag = null;
    header.addEventListener("pointerdown", (event) => {
      if (event.button !== 0 || event.target.closest("button,a,iframe")) return;
      drag = {
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        x: position?.x ?? panel.getBoundingClientRect().left,
        y: position?.y ?? panel.getBoundingClientRect().top,
      };
      header.setPointerCapture(event.pointerId);
      event.preventDefault();
    });
    header.addEventListener("pointermove", (event) => {
      if (!drag || drag.pointerId !== event.pointerId) return;
      position = {
        x: drag.x + event.clientX - drag.startX,
        y: drag.y + event.clientY - drag.startY,
      };
      applyGeometry();
    });
    function stopDrag(event) {
      if (!drag || drag.pointerId !== event.pointerId) return;
      drag = null;
      try {
        header.releasePointerCapture(event.pointerId);
      } catch {}
    }
    header.addEventListener("pointerup", stopDrag);
    header.addEventListener("pointercancel", stopDrag);
    header.addEventListener("dblclick", () => {
      position = defaultPosition(size || defaultSize());
      applyGeometry();
    });
  }

  function closeRemover() {
    modal?.remove();
    modal = null;
    position = null;
    size = null;
  }

  function openRemover() {
    ensureStyles();

    if (modal?.isConnected) {
      modal.focus();
      return;
    }

    document.getElementById(MODAL_ID)?.remove();
    size = defaultSize();
    position = defaultPosition(size);
    modal = document.createElement("div");
    modal.id = MODAL_ID;
    modal.setAttribute("role", "dialog");
    modal.setAttribute("aria-modal", "false");
    modal.setAttribute("aria-label", "Removedor");
    modal.tabIndex = -1;
    modal.innerHTML = `
      <section class="acto-remover-window">
        <header class="acto-remover-header">
          <div class="acto-remover-title">
            ${iconSvg("M3 6h18M8 6V4h8v2m-9 0 1 15h8l1-15M10 11v6m4-6v6")}
            <span>Removedor</span>
          </div>
          <div class="acto-remover-actions">
            <button type="button" class="acto-remover-icon-button" data-remover-open-tab title="Abrir em nova aba" aria-label="Abrir em nova aba">${iconSvg("M14 3h7v7M10 14 21 3M21 14v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5")}</button>
            <button type="button" class="acto-remover-icon-button acto-remover-close" data-remover-close aria-label="Fechar">X</button>
          </div>
        </header>
        <iframe class="acto-remover-frame" src="${REMOVER_URL}" title="ACTO Removedor" referrerpolicy="strict-origin-when-cross-origin" allow="clipboard-read; clipboard-write"></iframe>
      </section>
    `;
    (document.body || document.documentElement).appendChild(modal);

    modal.querySelector("[data-remover-close]")?.addEventListener("click", closeRemover);
    modal.querySelector("[data-remover-open-tab]")?.addEventListener("click", () => {
      window.open(REMOVER_URL, "_blank", "noopener,noreferrer");
    });
    modal.addEventListener("keydown", (event) => {
      if (event.key === "Escape") closeRemover();
    });

    applyGeometry();
    wireDrag();
    modal.focus();
  }

  runtime?.onMessage?.addListener?.((message, _sender, sendResponse) => {
    if (message?.type === PING_MESSAGE_TYPE) {
      sendResponse({ ok: true });
      return false;
    }

    if (message?.type === CLOSE_MESSAGE_TYPE) {
      closeRemover();
      sendResponse({ ok: true });
      return false;
    }

    if (message?.type !== OPEN_MESSAGE_TYPE) return false;

    openRemover();
    sendResponse({ ok: true });
    return false;
  });

  window.addEventListener("resize", () => {
    if (modal?.isConnected) applyGeometry();
  });

  globalThis.actoOpenRemoverPageModal = openRemover;
})();
