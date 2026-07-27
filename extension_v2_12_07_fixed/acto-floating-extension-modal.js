(() => {
  if (globalThis.__ACTO_FLOATING_EXTENSION_MODAL__) return;
  globalThis.__ACTO_FLOATING_EXTENSION_MODAL__ = true;

  const OPEN_MESSAGE_TYPE = "ACTO_OPEN_FLOATING_EXTENSION_MODAL";
  const CLOSE_MESSAGE_TYPE = "ACTO_CLOSE_FLOATING_EXTENSION_MODAL";
  const PING_MESSAGE_TYPE = "ACTO_FLOATING_EXTENSION_MODAL_PING";
  const OPEN_SIDE_PANEL_MODE_MESSAGE_TYPE = "ACTO_OPEN_SIDE_PANEL_MODE";
  const ROOT_ID = "acto-floating-extension-modal-root";
  const STYLE_ID = "acto-floating-extension-modal-style";
  const STORAGE_KEY = "acto-floating-extension-modal-geometry";
  const MIN_WIDTH = 360;
  const MIN_HEIGHT = 480;
  const EDGE = 8;

  let root = null;
  let shell = null;
  let minimized = null;
  let position = null;
  let size = null;
  let savedSize = null;
  let half = false;

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function defaultSize() {
    return {
      width: Math.min(460, Math.max(MIN_WIDTH, window.innerWidth - EDGE * 2)),
      height: Math.min(760, Math.max(MIN_HEIGHT, window.innerHeight - EDGE * 2)),
    };
  }

  function defaultPosition(nextSize = defaultSize()) {
    return {
      x: Math.max(EDGE, window.innerWidth - nextSize.width - 28),
      y: Math.max(EDGE, (window.innerHeight - nextSize.height) / 2),
    };
  }

  function readGeometry() {
    try {
      const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
      if (!parsed || typeof parsed !== "object") return;
      if (parsed.size) size = parsed.size;
      if (parsed.position) position = parsed.position;
    } catch {}
  }

  function saveGeometry() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ position, size }));
    } catch {}
  }

  function ensureStyle() {
    if (document.getElementById(STYLE_ID)) return;

    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
      #${ROOT_ID} {
        position: fixed;
        z-index: 2147483646;
        pointer-events: none;
        color: #eef6ff;
        font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
      }
      #${ROOT_ID} * { box-sizing: border-box; }
      #${ROOT_ID} .acto-float-window {
        position: fixed;
        min-width: ${MIN_WIDTH}px;
        min-height: ${MIN_HEIGHT}px;
        display: flex;
        flex-direction: column;
        overflow: visible;
        border: 1px solid rgba(96, 165, 250, .46);
        border-radius: 10px;
        background: rgba(3, 7, 18, .98);
        box-shadow: 0 24px 80px rgba(0, 0, 0, .68), 0 0 45px rgba(59, 130, 246, .30);
        pointer-events: auto;
      }
      #${ROOT_ID} .acto-float-window[data-resizing="1"] iframe {
        pointer-events: none;
      }
      #${ROOT_ID} .acto-float-inner {
        width: 100%;
        height: 100%;
        min-height: 0;
        display: flex;
        flex-direction: column;
        overflow: hidden;
        border-radius: 10px;
      }
      #${ROOT_ID} .acto-float-bar {
        min-height: 36px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 10px;
        padding: 6px 8px 6px 12px;
        border-bottom: 1px solid rgba(96, 165, 250, .24);
        background: rgba(15, 23, 42, .94);
        cursor: move;
        user-select: none;
      }
      #${ROOT_ID} .acto-float-title {
        flex: 1;
        min-width: 92px;
        display: flex;
        align-items: center;
        gap: 7px;
        color: #bfdbfe;
        font-size: 12px;
        font-weight: 900;
        letter-spacing: .08em;
        text-transform: uppercase;
        white-space: nowrap;
      }
      #${ROOT_ID} .acto-float-title-badge {
        width: 19px;
        height: 19px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        border: 1px solid rgba(96, 165, 250, .45);
        border-radius: 5px;
        background: rgba(30, 58, 138, .32);
        color: #dbeafe;
        font-size: 9px;
      }
      #${ROOT_ID} .acto-float-actions {
        flex: 0 0 auto;
        display: flex;
        align-items: center;
        gap: 4px;
      }
      #${ROOT_ID} button {
        height: 23px;
        border: 1px solid rgba(96, 165, 250, .34);
        border-radius: 5px;
        background: rgba(30, 58, 138, .30);
        color: #dbeafe;
        cursor: pointer;
        font: 900 9px/1 ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
        letter-spacing: .08em;
        padding: 0 7px;
      }
      #${ROOT_ID} button:hover {
        border-color: rgba(147, 197, 253, .72);
        background: rgba(37, 99, 235, .42);
        color: #fff;
      }
      #${ROOT_ID} button[data-close] {
        border-color: rgba(248, 113, 113, .38);
        background: rgba(127, 29, 29, .28);
        color: #fecaca;
      }
      #${ROOT_ID} button[data-side-panel] {
        width: 28px;
        padding: 0;
        font-size: 9px;
      }
      #${ROOT_ID} .acto-float-frame-wrap {
        flex: 1;
        min-height: 0;
        background: #020617;
      }
      #${ROOT_ID} iframe {
        width: 100%;
        height: 100%;
        display: block;
        border: 0;
        background: #020617;
      }
      #${ROOT_ID} .acto-float-resize {
        position: absolute;
        z-index: 3;
        opacity: 0;
        background: rgba(147, 197, 253, .16);
      }
      #${ROOT_ID} .acto-float-window:hover .acto-float-resize[data-resize="se"] {
        opacity: .7;
      }
      #${ROOT_ID} .acto-float-resize[data-resize="n"],
      #${ROOT_ID} .acto-float-resize[data-resize="s"] {
        left: 12px;
        right: 12px;
        height: 8px;
        cursor: ns-resize;
      }
      #${ROOT_ID} .acto-float-resize[data-resize="n"] { top: -4px; }
      #${ROOT_ID} .acto-float-resize[data-resize="s"] { bottom: -4px; }
      #${ROOT_ID} .acto-float-resize[data-resize="e"],
      #${ROOT_ID} .acto-float-resize[data-resize="w"] {
        top: 12px;
        bottom: 12px;
        width: 8px;
        cursor: ew-resize;
      }
      #${ROOT_ID} .acto-float-resize[data-resize="e"] { right: -4px; }
      #${ROOT_ID} .acto-float-resize[data-resize="w"] { left: -4px; }
      #${ROOT_ID} .acto-float-resize[data-resize="ne"],
      #${ROOT_ID} .acto-float-resize[data-resize="nw"],
      #${ROOT_ID} .acto-float-resize[data-resize="se"],
      #${ROOT_ID} .acto-float-resize[data-resize="sw"] {
        width: 14px;
        height: 14px;
      }
      #${ROOT_ID} .acto-float-resize[data-resize="ne"] {
        top: -5px;
        right: -5px;
        cursor: nesw-resize;
      }
      #${ROOT_ID} .acto-float-resize[data-resize="nw"] {
        top: -5px;
        left: -5px;
        cursor: nwse-resize;
      }
      #${ROOT_ID} .acto-float-resize[data-resize="se"] {
        right: -5px;
        bottom: -5px;
        cursor: nwse-resize;
        border-radius: 999px;
      }
      #${ROOT_ID} .acto-float-resize[data-resize="sw"] {
        left: -5px;
        bottom: -5px;
        cursor: nesw-resize;
      }
      #${ROOT_ID} .acto-float-minimized {
        position: fixed;
        right: 18px;
        bottom: 18px;
        height: 38px;
        display: inline-flex;
        align-items: center;
        gap: 8px;
        padding: 0 12px;
        border: 1px solid rgba(96, 165, 250, .42);
        border-radius: 999px;
        background: rgba(3, 7, 18, .96);
        box-shadow: 0 14px 42px rgba(0, 0, 0, .48), 0 0 24px rgba(59, 130, 246, .24);
        color: #dbeafe;
        pointer-events: auto;
      }
      @media (max-width: 640px) {
        #${ROOT_ID} .acto-float-window {
          min-width: 320px;
          min-height: 420px;
        }
        #${ROOT_ID} .acto-float-title span:last-child {
          max-width: 120px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
      }
    `;

    document.documentElement.appendChild(style);
  }

  function applyGeometry() {
    if (!shell) return;
    if (!size) size = defaultSize();
    if (!position) position = defaultPosition(size);

    size = {
      width: clamp(size.width, MIN_WIDTH, Math.max(MIN_WIDTH, window.innerWidth - EDGE * 2)),
      height: clamp(size.height, MIN_HEIGHT, Math.max(MIN_HEIGHT, window.innerHeight - EDGE * 2)),
    };
    position = {
      x: clamp(position.x, EDGE, Math.max(EDGE, window.innerWidth - size.width - EDGE)),
      y: clamp(position.y, EDGE, Math.max(EDGE, window.innerHeight - size.height - EDGE)),
    };

    shell.style.width = `${size.width}px`;
    shell.style.height = `${size.height}px`;
    shell.style.left = `${position.x}px`;
    shell.style.top = `${position.y}px`;
    saveGeometry();
  }

  function openModal() {
    ensureStyle();
    readGeometry();

    if (shell?.isConnected) {
      shell.hidden = false;
      minimized?.remove();
      minimized = null;
      applyGeometry();
      return;
    }

    root = document.getElementById(ROOT_ID) || document.createElement("div");
    root.id = ROOT_ID;
    if (!root.isConnected) document.documentElement.appendChild(root);

    shell = document.createElement("section");
    shell.className = "acto-float-window";
    shell.setAttribute("role", "dialog");
    shell.setAttribute("aria-label", "ACTO");
    shell.innerHTML = `
      <div class="acto-float-inner">
        <header class="acto-float-bar" data-drag>
          <div class="acto-float-title">
            <span class="acto-float-title-badge">A</span>
            <span>ACTO</span>
          </div>
          <div class="acto-float-actions">
            <button type="button" data-side-panel title="Abrir como painel lateral">[]</button>
            <button type="button" data-minimize title="Minimizar">_</button>
            <button type="button" data-half title="Alternar tamanho 50%">50%</button>
            <button type="button" data-close title="Fechar">X</button>
          </div>
        </header>
        <div class="acto-float-frame-wrap">
          <iframe title="ACTO" src="${chrome.runtime.getURL("index.html")}"></iframe>
        </div>
      </div>
      <div class="acto-float-resize" data-resize="n"></div>
      <div class="acto-float-resize" data-resize="e"></div>
      <div class="acto-float-resize" data-resize="s"></div>
      <div class="acto-float-resize" data-resize="w"></div>
      <div class="acto-float-resize" data-resize="ne"></div>
      <div class="acto-float-resize" data-resize="nw"></div>
      <div class="acto-float-resize" data-resize="se"></div>
      <div class="acto-float-resize" data-resize="sw"></div>
    `;
    root.appendChild(shell);

    shell.querySelector("[data-close]")?.addEventListener("click", closeModal);
    shell.querySelector("[data-minimize]")?.addEventListener("click", minimizeModal);
    shell.querySelector("[data-half]")?.addEventListener("click", toggleHalf);
    shell.querySelector("[data-side-panel]")?.addEventListener("click", moveToSidePanel);
    wireDrag();
    wireResize();
    applyGeometry();
  }

  function closeModal() {
    shell?.remove();
    shell = null;
    minimized?.remove();
    minimized = null;
  }

  function moveToSidePanel() {
    chrome.runtime.sendMessage({ type: OPEN_SIDE_PANEL_MODE_MESSAGE_TYPE }, (response) => {
      if (response?.ok && response?.opened) closeModal();
    });
  }

  function minimizeModal() {
    if (!shell) return;
    shell.hidden = true;
    if (minimized?.isConnected) return;

    minimized = document.createElement("button");
    minimized.type = "button";
    minimized.className = "acto-float-minimized";
    minimized.innerHTML = `<span class="acto-float-title-badge">A</span><strong>ACTO</strong>`;
    minimized.addEventListener("click", () => {
      if (shell) shell.hidden = false;
      minimized?.remove();
      minimized = null;
      applyGeometry();
    });
    root.appendChild(minimized);
  }

  function toggleHalf() {
    if (!shell) return;
    if (!size) size = defaultSize();

    if (!half) {
      savedSize = { ...size };
      size = {
        width: Math.max(MIN_WIDTH, Math.round(size.width * 0.5)),
        height: Math.max(MIN_HEIGHT, Math.round(size.height * 0.5)),
      };
      half = true;
    } else {
      size = savedSize ? { ...savedSize } : defaultSize();
      savedSize = null;
      half = false;
    }

    applyGeometry();
  }

  function wireDrag() {
    const header = shell?.querySelector("[data-drag]");
    if (!header || header.dataset.ready === "1") return;
    header.dataset.ready = "1";
    let drag = null;

    header.addEventListener("pointerdown", (event) => {
      if (event.button !== 0 || event.target.closest("button,a,iframe")) return;
      drag = {
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        x: position?.x || shell.getBoundingClientRect().left,
        y: position?.y || shell.getBoundingClientRect().top,
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

    if (nextWidth < MIN_WIDTH) {
      if (direction.includes("w")) nextX -= MIN_WIDTH - nextWidth;
      nextWidth = MIN_WIDTH;
    }
    if (nextHeight < MIN_HEIGHT) {
      if (direction.includes("n")) nextY -= MIN_HEIGHT - nextHeight;
      nextHeight = MIN_HEIGHT;
    }

    if (nextX < EDGE) {
      nextWidth -= EDGE - nextX;
      nextX = EDGE;
    }
    if (nextY < EDGE) {
      nextHeight -= EDGE - nextY;
      nextY = EDGE;
    }

    nextWidth = clamp(nextWidth, MIN_WIDTH, Math.max(MIN_WIDTH, window.innerWidth - nextX - EDGE));
    nextHeight = clamp(nextHeight, MIN_HEIGHT, Math.max(MIN_HEIGHT, window.innerHeight - nextY - EDGE));

    position = { x: nextX, y: nextY };
    size = { width: nextWidth, height: nextHeight };
  }

  function wireResize() {
    shell?.querySelectorAll("[data-resize]").forEach((handle) => {
      if (handle.dataset.ready === "1") return;
      handle.dataset.ready = "1";
      const direction = handle.dataset.resize || "";
      let drag = null;

      handle.addEventListener("pointerdown", (event) => {
        if (event.button !== 0) return;
        const rect = shell.getBoundingClientRect();
        drag = {
          pointerId: event.pointerId,
          startX: event.clientX,
          startY: event.clientY,
          x: position?.x ?? rect.left,
          y: position?.y ?? rect.top,
          width: size?.width ?? rect.width,
          height: size?.height ?? rect.height,
        };
        half = false;
        savedSize = null;
        shell.dataset.resizing = "1";
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
        shell.dataset.resizing = "0";
        try {
          handle.releasePointerCapture(event.pointerId);
        } catch {}
      }

      handle.addEventListener("pointerup", stopResize);
      handle.addEventListener("pointercancel", stopResize);
    });
  }

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message?.type === PING_MESSAGE_TYPE) {
      sendResponse({ ok: true });
      return false;
    }

    if (message?.type === CLOSE_MESSAGE_TYPE) {
      closeModal();
      sendResponse({ ok: true });
      return false;
    }

    if (message?.type !== OPEN_MESSAGE_TYPE) return false;

    openModal();
    sendResponse({ ok: true });
    return false;
  });

  window.addEventListener("resize", () => {
    if (shell?.isConnected && !shell.hidden) applyGeometry();
  });
})();
