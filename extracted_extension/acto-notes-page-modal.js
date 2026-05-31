(() => {
  if (globalThis.__ACTO_NOTES_PAGE_MODAL__) return;
  globalThis.__ACTO_NOTES_PAGE_MODAL__ = true;

  const OPEN_MESSAGE_TYPE = "ACTO_OPEN_NOTES_PAGE_MODAL";
  const CLOSE_MESSAGE_TYPE = "ACTO_CLOSE_NOTES_PAGE_MODAL";
  const PING_MESSAGE_TYPE = "ACTO_NOTES_PAGE_MODAL_PING";
  const MODAL_ID = "acto-notes-page-modal";
  const STYLE_ID = "acto-notes-page-modal-style";
  const STORAGE_KEY = "acto-notes-page-modal-geometry";
  const NOTES_URL = "https://notas-lumen.lovable.app/auth";
  const DEFAULT_WIDTH = 760;
  const DEFAULT_HEIGHT = 560;
  const MIN_WIDTH = 360;
  const MIN_HEIGHT = 340;
  const EDGE = 8;

  const runtime = globalThis.chrome?.runtime;
  let modal = null;
  let position = null;
  let size = null;

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function minWidth() {
    return Math.min(MIN_WIDTH, Math.max(280, window.innerWidth - EDGE * 2));
  }

  function minHeight() {
    return Math.min(MIN_HEIGHT, Math.max(260, window.innerHeight - EDGE * 2));
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
      if (!parsed || typeof parsed !== "object") return;
      if (parsed.position) position = parsed.position;
      if (parsed.size) size = parsed.size;
    } catch {}
  }

  function saveGeometry() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ position, size }));
    } catch {}
  }

  function iconSvg(path, className = "") {
    return `
      <svg class="${className}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="${path}"></path>
      </svg>
    `;
  }

  function removeStaleNotesLayers() {
    document.querySelectorAll(`[id="${MODAL_ID}"]`).forEach((element) => {
      if (element !== modal) element.remove();
    });
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
        background: transparent;
        color: #eef6ff;
        font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
      }
      #${MODAL_ID} * { box-sizing: border-box; }
      #${MODAL_ID} button,
      #${MODAL_ID} iframe {
        font: inherit;
      }
      #${MODAL_ID} .acto-notes-window {
        position: fixed;
        width: ${DEFAULT_WIDTH}px;
        height: ${DEFAULT_HEIGHT}px;
        min-width: ${MIN_WIDTH}px;
        min-height: ${MIN_HEIGHT}px;
        display: flex;
        flex-direction: column;
        overflow: hidden;
        pointer-events: auto;
        border: 1px solid rgba(92, 184, 255, .45);
        border-radius: 12px;
        background:
          linear-gradient(180deg, rgba(14, 165, 233, .14), transparent 44%),
          rgba(3, 7, 18, .98);
        box-shadow: 0 25px 80px rgba(0, 0, 0, .70), 0 0 55px rgba(56, 189, 248, .26);
      }
      #${MODAL_ID} .acto-notes-window[data-resizing="1"] iframe {
        pointer-events: none;
      }
      #${MODAL_ID} .acto-notes-header {
        min-height: 46px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 10px;
        padding: 9px 12px;
        border-bottom: 1px solid rgba(92, 184, 255, .35);
        background: rgba(15, 23, 42, .88);
        cursor: move;
        user-select: none;
      }
      #${MODAL_ID} .acto-notes-title {
        min-width: 0;
        display: flex;
        align-items: center;
        gap: 8px;
        color: #7dd3fc;
        font-size: 12px;
        font-weight: 900;
        letter-spacing: .20em;
        text-transform: uppercase;
      }
      #${MODAL_ID} .acto-notes-title span {
        min-width: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      #${MODAL_ID} .acto-notes-title svg {
        width: 17px;
        height: 17px;
        flex: 0 0 auto;
      }
      #${MODAL_ID} .acto-notes-actions {
        display: flex;
        align-items: center;
        gap: 6px;
        flex: 0 0 auto;
      }
      #${MODAL_ID} button {
        border: 1px solid rgba(92, 184, 255, .35);
        border-radius: 7px;
        background: rgba(30, 58, 138, .26);
        color: #bae6fd;
        cursor: pointer;
        transition: background .16s ease, border-color .16s ease, color .16s ease, transform .16s ease;
      }
      #${MODAL_ID} button:hover {
        border-color: rgba(125, 211, 252, .80);
        background: rgba(14, 116, 144, .28);
        color: #fff;
      }
      #${MODAL_ID} button:active { transform: translateY(1px); }
      #${MODAL_ID} .acto-notes-icon-button {
        width: 30px;
        height: 30px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        padding: 0;
      }
      #${MODAL_ID} .acto-notes-icon-button svg {
        width: 15px;
        height: 15px;
      }
      #${MODAL_ID} .acto-notes-close {
        color: #fecaca;
        border-color: rgba(248, 113, 113, .34);
        background: rgba(127, 29, 29, .24);
      }
      #${MODAL_ID} .acto-notes-close:hover {
        border-color: rgba(248, 113, 113, .72);
        background: rgba(185, 28, 28, .38);
      }
      #${MODAL_ID} .acto-notes-frame {
        flex: 1;
        min-width: 0;
        min-height: 0;
        border: 0;
        background: #020617;
      }
      #${MODAL_ID} .acto-notes-resize {
        position: absolute;
        z-index: 5;
        background: rgba(125, 211, 252, .14);
        opacity: 0;
      }
      #${MODAL_ID} .acto-notes-window:hover .acto-notes-resize[data-resize="se"] {
        opacity: .75;
      }
      #${MODAL_ID} .acto-notes-resize[data-resize="n"],
      #${MODAL_ID} .acto-notes-resize[data-resize="s"] {
        left: 12px;
        right: 12px;
        height: 8px;
        cursor: ns-resize;
      }
      #${MODAL_ID} .acto-notes-resize[data-resize="n"] { top: 0; }
      #${MODAL_ID} .acto-notes-resize[data-resize="s"] { bottom: 0; }
      #${MODAL_ID} .acto-notes-resize[data-resize="e"],
      #${MODAL_ID} .acto-notes-resize[data-resize="w"] {
        top: 12px;
        bottom: 12px;
        width: 8px;
        cursor: ew-resize;
      }
      #${MODAL_ID} .acto-notes-resize[data-resize="e"] { right: 0; }
      #${MODAL_ID} .acto-notes-resize[data-resize="w"] { left: 0; }
      #${MODAL_ID} .acto-notes-resize[data-resize="ne"],
      #${MODAL_ID} .acto-notes-resize[data-resize="nw"],
      #${MODAL_ID} .acto-notes-resize[data-resize="se"],
      #${MODAL_ID} .acto-notes-resize[data-resize="sw"] {
        width: 15px;
        height: 15px;
      }
      #${MODAL_ID} .acto-notes-resize[data-resize="ne"] {
        top: 0;
        right: 0;
        cursor: nesw-resize;
      }
      #${MODAL_ID} .acto-notes-resize[data-resize="nw"] {
        top: 0;
        left: 0;
        cursor: nwse-resize;
      }
      #${MODAL_ID} .acto-notes-resize[data-resize="se"] {
        right: 0;
        bottom: 0;
        cursor: nwse-resize;
        border-radius: 12px 0 12px 0;
      }
      #${MODAL_ID} .acto-notes-resize[data-resize="sw"] {
        left: 0;
        bottom: 0;
        cursor: nesw-resize;
      }
      @media (max-width: 720px) {
        #${MODAL_ID} .acto-notes-window {
          min-width: 280px;
          min-height: 300px;
        }
        #${MODAL_ID} .acto-notes-header {
          min-height: 42px;
          padding: 7px 9px;
        }
        #${MODAL_ID} .acto-notes-title {
          font-size: 11px;
          letter-spacing: .14em;
        }
        #${MODAL_ID} .acto-notes-icon-button {
          width: 28px;
          height: 28px;
        }
      }
    `;

    document.head.appendChild(style);
  }

  function applyGeometry() {
    const panel = modal?.querySelector(".acto-notes-window");
    if (!panel) return;

    if (!size) size = defaultSize();
    if (!position) position = defaultPosition(size);

    const nextMinWidth = minWidth();
    const nextMinHeight = minHeight();
    size = {
      width: clamp(size.width, nextMinWidth, Math.max(nextMinWidth, window.innerWidth - EDGE * 2)),
      height: clamp(size.height, nextMinHeight, Math.max(nextMinHeight, window.innerHeight - EDGE * 2)),
    };
    position = {
      x: clamp(position.x, EDGE, Math.max(EDGE, window.innerWidth - size.width - EDGE)),
      y: clamp(position.y, EDGE, Math.max(EDGE, window.innerHeight - size.height - EDGE)),
    };

    panel.style.width = `${size.width}px`;
    panel.style.height = `${size.height}px`;
    panel.style.left = `${position.x}px`;
    panel.style.top = `${position.y}px`;
    saveGeometry();
  }

  function resizeGeometry(direction, drag, event) {
    let nextX = drag.x;
    let nextY = drag.y;
    let nextWidth = drag.width;
    let nextHeight = drag.height;
    const dx = event.clientX - drag.startX;
    const dy = event.clientY - drag.startY;

    if (direction.includes("e")) nextWidth = drag.width + dx;
    if (direction.includes("s")) nextHeight = drag.height + dy;
    if (direction.includes("w")) {
      nextWidth = drag.width - dx;
      nextX = drag.x + dx;
    }
    if (direction.includes("n")) {
      nextHeight = drag.height - dy;
      nextY = drag.y + dy;
    }

    const nextMinWidth = minWidth();
    const nextMinHeight = minHeight();
    if (nextWidth < nextMinWidth) {
      if (direction.includes("w")) nextX -= nextMinWidth - nextWidth;
      nextWidth = nextMinWidth;
    }
    if (nextHeight < nextMinHeight) {
      if (direction.includes("n")) nextY -= nextMinHeight - nextHeight;
      nextHeight = nextMinHeight;
    }

    if (nextX < EDGE) {
      nextWidth -= EDGE - nextX;
      nextX = EDGE;
    }
    if (nextY < EDGE) {
      nextHeight -= EDGE - nextY;
      nextY = EDGE;
    }

    nextWidth = clamp(nextWidth, nextMinWidth, Math.max(nextMinWidth, window.innerWidth - nextX - EDGE));
    nextHeight = clamp(nextHeight, nextMinHeight, Math.max(nextMinHeight, window.innerHeight - nextY - EDGE));

    position = { x: nextX, y: nextY };
    size = { width: nextWidth, height: nextHeight };
  }

  function wireDrag() {
    const panel = modal?.querySelector(".acto-notes-window");
    const header = modal?.querySelector(".acto-notes-header");
    if (!panel || !header || header.dataset.dragReady === "1") return;

    header.dataset.dragReady = "1";
    let drag = null;
    header.addEventListener("pointerdown", (event) => {
      if (event.button !== 0 || event.target.closest("button,a,iframe")) return;
      drag = {
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        originX: position?.x ?? panel.getBoundingClientRect().left,
        originY: position?.y ?? panel.getBoundingClientRect().top,
      };
      header.setPointerCapture(event.pointerId);
      event.preventDefault();
    });
    header.addEventListener("pointermove", (event) => {
      if (!drag || drag.pointerId !== event.pointerId) return;
      position = {
        x: drag.originX + event.clientX - drag.startX,
        y: drag.originY + event.clientY - drag.startY,
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

  function wireResize() {
    const panel = modal?.querySelector(".acto-notes-window");
    if (!panel) return;

    panel.querySelectorAll("[data-resize]").forEach((handle) => {
      if (handle.dataset.resizeReady === "1") return;
      handle.dataset.resizeReady = "1";
      const direction = handle.dataset.resize || "";
      let drag = null;

      handle.addEventListener("pointerdown", (event) => {
        if (event.button !== 0) return;
        const rect = panel.getBoundingClientRect();
        drag = {
          pointerId: event.pointerId,
          startX: event.clientX,
          startY: event.clientY,
          x: position?.x ?? rect.left,
          y: position?.y ?? rect.top,
          width: size?.width ?? rect.width,
          height: size?.height ?? rect.height,
        };
        panel.dataset.resizing = "1";
        handle.setPointerCapture(event.pointerId);
        event.preventDefault();
        event.stopPropagation();
      });

      handle.addEventListener("pointermove", (event) => {
        if (!drag || drag.pointerId !== event.pointerId) return;
        resizeGeometry(direction, drag, event);
        applyGeometry();
      });

      function stopResize(event) {
        if (!drag || drag.pointerId !== event.pointerId) return;
        drag = null;
        panel.dataset.resizing = "0";
        try {
          handle.releasePointerCapture(event.pointerId);
        } catch {}
      }

      handle.addEventListener("pointerup", stopResize);
      handle.addEventListener("pointercancel", stopResize);
    });
  }

  function renderResizeHandles() {
    return ["n", "e", "s", "w", "ne", "nw", "se", "sw"]
      .map((direction) => `<div class="acto-notes-resize" data-resize="${direction}"></div>`)
      .join("");
  }

  function renderNotes() {
    if (!modal) return;

    const panel = modal.querySelector(".acto-notes-window");
    if (!panel) return;

    panel.innerHTML = `
      <div class="acto-notes-header">
        <div class="acto-notes-title">
          ${iconSvg("M4 4.5A2.5 2.5 0 0 1 6.5 2H20v17.5A2.5 2.5 0 0 1 17.5 22H6.5A2.5 2.5 0 0 1 4 19.5v-15ZM8 6h8M8 10h8M8 14h5M6.5 2A2.5 2.5 0 0 0 4 4.5v15A2.5 2.5 0 0 1 6.5 17H20", "")}
          <span>NOTAS</span>
        </div>
        <div class="acto-notes-actions">
          <button type="button" class="acto-notes-icon-button" data-notes-open-tab title="Abrir em nova aba" aria-label="Abrir em nova aba">${iconSvg("M14 3h7v7M10 14 21 3M21 14v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5", "")}</button>
          <button type="button" class="acto-notes-icon-button acto-notes-close" data-notes-close aria-label="Fechar">X</button>
        </div>
      </div>
      <iframe class="acto-notes-frame" src="${NOTES_URL}" title="ACTO Notas" referrerpolicy="strict-origin-when-cross-origin" allow="clipboard-read; clipboard-write" sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox"></iframe>
      ${renderResizeHandles()}
    `;

    applyGeometry();
    wireDrag();
    wireResize();
    wireNotesEvents();
  }

  function wireNotesEvents() {
    if (!modal) return;

    modal.querySelectorAll("[data-notes-close]").forEach((button) => button.addEventListener("click", closeNotes));
    modal.querySelectorAll("[data-notes-open-tab]").forEach((button) =>
      button.addEventListener("click", () => {
        window.open(NOTES_URL, "_blank", "noopener,noreferrer");
      }),
    );
  }

  function openNotes() {
    ensureStyles();
    readGeometry();
    removeStaleNotesLayers();

    if (modal?.isConnected) {
      applyGeometry();
      modal.focus();
      return;
    }

    modal = document.createElement("div");
    modal.id = MODAL_ID;
    modal.setAttribute("role", "dialog");
    modal.setAttribute("aria-modal", "false");
    modal.setAttribute("aria-label", "Notas");
    modal.tabIndex = -1;
    modal.innerHTML = `<div class="acto-notes-window"></div>`;
    document.body.appendChild(modal);

    modal.addEventListener("click", (event) => {
      if (event.target === modal) closeNotes();
    });
    modal.addEventListener("keydown", (event) => {
      if (event.key === "Escape") closeNotes();
    });

    renderNotes();
    modal.focus();
  }

  function closeNotes() {
    modal?.remove();
    modal = null;
  }

  runtime?.onMessage?.addListener?.((message, _sender, sendResponse) => {
    if (message?.type === PING_MESSAGE_TYPE) {
      sendResponse({ ok: true });
      return false;
    }

    if (message?.type === CLOSE_MESSAGE_TYPE) {
      closeNotes();
      sendResponse({ ok: true });
      return false;
    }

    if (message?.type !== OPEN_MESSAGE_TYPE) return false;

    openNotes();
    sendResponse({ ok: true });
    return false;
  });

  window.addEventListener("resize", () => {
    if (modal?.isConnected) applyGeometry();
  });

  globalThis.actoOpenNotesPageModal = openNotes;
})();
