(() => {
  if (globalThis.__ACTO_YOUTUBE_PAGE_PLAYER__) return;
  globalThis.__ACTO_YOUTUBE_PAGE_PLAYER__ = true;

  const PING_TYPE = "ACTO_YOUTUBE_PAGE_PLAYER_PING";
  const PLAYER_TYPE = "ACTO_YOUTUBE_PAGE_PLAYER";
  const ROOT_ID = "acto-youtube-page-player-root";
  const MINI_ID = "acto-youtube-page-player-mini";
  const STYLE_ID = "acto-youtube-page-player-style";
  const MIN_WIDTH = 320;
  const MIN_HEIGHT = 240;
  const EDGE_MARGIN = 8;

  let root = null;
  let mini = null;
  let iframe = null;
  let currentResult = null;
  let compact = false;
  let miniSmall = false;
  let position = null;
  let size = null;
  let savedSize = null;
  let miniPosition = null;

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function defaultPosition() {
    const width = size?.width || Math.min(760, window.innerWidth - 28);
    return {
      x: Math.max(14, window.innerWidth - width - 22),
      y: Math.max(14, window.innerHeight * 0.12),
    };
  }

  function defaultSize() {
    return {
      width: Math.min(760, Math.max(MIN_WIDTH, window.innerWidth - 28)),
      height: Math.min(520, Math.max(MIN_HEIGHT, window.innerHeight - 28)),
    };
  }

  function defaultMiniPosition(width, height) {
    return {
      x: Math.max(12, window.innerWidth - width - 16),
      y: Math.max(12, window.innerHeight - height - 16),
    };
  }

  function embedUrl(result) {
    return `https://www.youtube-nocookie.com/embed/${encodeURIComponent(result.videoId)}?autoplay=1&rel=0&modestbranding=1&playsinline=1`;
  }

  function watchUrl(result) {
    return result?.url || `https://www.youtube.com/watch?v=${encodeURIComponent(result?.videoId || "")}`;
  }

  function validResult(result) {
    return result && /^[A-Za-z0-9_-]{6,}$/.test(result.videoId || "");
  }

  function ensureStyle() {
    if (document.getElementById(STYLE_ID)) return;

    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
      #${ROOT_ID},
      #${MINI_ID} {
        box-sizing: border-box;
        color: #eef6ff;
        font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
      }
      #${ROOT_ID} *,
      #${MINI_ID} * { box-sizing: border-box; }
      #${ROOT_ID} {
        position: fixed;
        z-index: 2147483647;
        width: min(760px, calc(100vw - 28px));
        height: min(520px, calc(100vh - 28px));
        min-width: ${MIN_WIDTH}px;
        min-height: ${MIN_HEIGHT}px;
        display: flex;
        flex-direction: column;
        overflow: visible;
        border: 1px solid rgba(96, 165, 250, .42);
        border-radius: 8px;
        background: rgba(3, 7, 18, .98);
        box-shadow: 0 24px 70px rgba(0, 0, 0, .70), 0 0 34px rgba(59, 130, 246, .28);
        pointer-events: auto;
      }
      #${ROOT_ID}[data-resizing="1"] iframe {
        pointer-events: none;
      }
      #${ROOT_ID} .acto-yt-shell {
        width: 100%;
        height: 100%;
        min-height: 0;
        display: flex;
        flex-direction: column;
        overflow: hidden;
        border-radius: 8px;
      }
      #${ROOT_ID} .acto-yt-bar,
      #${MINI_ID} .acto-yt-mini-bar {
        display: flex;
        align-items: center;
        gap: 8px;
        border-bottom: 1px solid rgba(96, 165, 250, .24);
        background: rgba(15, 23, 42, .94);
        user-select: none;
      }
      #${ROOT_ID} .acto-yt-bar {
        min-height: 36px;
        padding: 6px 8px 6px 10px;
        cursor: move;
      }
      #${ROOT_ID} .acto-yt-title,
      #${MINI_ID} .acto-yt-mini-title {
        min-width: 0;
        flex: 1;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        color: #bfdbfe;
        font-size: 10px;
        font-weight: 900;
        letter-spacing: .08em;
      }
      #${ROOT_ID} .acto-yt-actions,
      #${MINI_ID} .acto-yt-mini-actions {
        display: flex;
        align-items: center;
        gap: 5px;
      }
      #${ROOT_ID} button,
      #${MINI_ID} button {
        height: 24px;
        border: 1px solid rgba(96, 165, 250, .34);
        border-radius: 5px;
        background: rgba(30, 58, 138, .32);
        color: #dbeafe;
        cursor: pointer;
        font: 900 9px/1 ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
        letter-spacing: .08em;
        padding: 0 7px;
      }
      #${ROOT_ID} button:hover,
      #${MINI_ID} button:hover {
        border-color: rgba(147, 197, 253, .72);
        background: rgba(37, 99, 235, .42);
        color: #fff;
      }
      #${ROOT_ID} button[data-close],
      #${MINI_ID} button[data-mini-close] {
        border-color: rgba(248, 113, 113, .38);
        background: rgba(127, 29, 29, .26);
        color: #fecaca;
      }
      #${ROOT_ID} .acto-yt-frame {
        position: relative;
        flex: 1;
        min-height: 0;
        background: #000;
      }
      #${ROOT_ID} iframe,
      #${MINI_ID} iframe {
        width: 100%;
        height: 100%;
        border: 0;
        display: block;
        background: #000;
      }
      #${ROOT_ID} .acto-yt-footer {
        min-height: 34px;
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 7px 10px;
        border-top: 1px solid rgba(96, 165, 250, .20);
        background: rgba(2, 6, 23, .96);
      }
      #${ROOT_ID} .acto-yt-meta {
        min-width: 0;
        flex: 1;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        color: rgba(219, 234, 254, .66);
        font-size: 9px;
        font-weight: 800;
      }
      #${ROOT_ID} .acto-yt-open {
        color: #bbf7d0;
        text-decoration: none;
        font-size: 9px;
        font-weight: 900;
        letter-spacing: .10em;
      }
      #${ROOT_ID} .acto-yt-resize {
        position: absolute;
        z-index: 3;
        opacity: 0;
        background: rgba(147, 197, 253, .18);
      }
      #${ROOT_ID}:hover .acto-yt-resize[data-resize="se"] {
        opacity: .7;
      }
      #${ROOT_ID} .acto-yt-resize[data-resize="n"],
      #${ROOT_ID} .acto-yt-resize[data-resize="s"] {
        left: 12px;
        right: 12px;
        height: 8px;
        cursor: ns-resize;
      }
      #${ROOT_ID} .acto-yt-resize[data-resize="n"] { top: -4px; }
      #${ROOT_ID} .acto-yt-resize[data-resize="s"] { bottom: -4px; }
      #${ROOT_ID} .acto-yt-resize[data-resize="e"],
      #${ROOT_ID} .acto-yt-resize[data-resize="w"] {
        top: 12px;
        bottom: 12px;
        width: 8px;
        cursor: ew-resize;
      }
      #${ROOT_ID} .acto-yt-resize[data-resize="e"] { right: -4px; }
      #${ROOT_ID} .acto-yt-resize[data-resize="w"] { left: -4px; }
      #${ROOT_ID} .acto-yt-resize[data-resize="ne"],
      #${ROOT_ID} .acto-yt-resize[data-resize="nw"],
      #${ROOT_ID} .acto-yt-resize[data-resize="se"],
      #${ROOT_ID} .acto-yt-resize[data-resize="sw"] {
        width: 14px;
        height: 14px;
      }
      #${ROOT_ID} .acto-yt-resize[data-resize="ne"] {
        top: -5px;
        right: -5px;
        cursor: nesw-resize;
      }
      #${ROOT_ID} .acto-yt-resize[data-resize="nw"] {
        top: -5px;
        left: -5px;
        cursor: nwse-resize;
      }
      #${ROOT_ID} .acto-yt-resize[data-resize="se"] {
        right: -5px;
        bottom: -5px;
        cursor: nwse-resize;
        border-radius: 999px;
      }
      #${ROOT_ID} .acto-yt-resize[data-resize="sw"] {
        left: -5px;
        bottom: -5px;
        cursor: nesw-resize;
      }
      #${MINI_ID} {
        position: fixed;
        z-index: 2147483647;
        width: 340px;
        height: 220px;
        display: flex;
        flex-direction: column;
        overflow: hidden;
        border: 1px solid rgba(52, 211, 153, .72);
        border-radius: 8px;
        background: #000;
        box-shadow: 0 18px 48px rgba(0, 0, 0, .62), 0 0 28px rgba(52, 211, 153, .30);
        pointer-events: auto;
      }
      #${MINI_ID} .acto-yt-mini-bar {
        min-height: 28px;
        padding: 4px 6px;
        cursor: move;
      }
      #${MINI_ID} iframe {
        flex: 1;
        min-height: 0;
      }
      #${MINI_ID}[data-small="1"] .acto-yt-mini-title,
      #${MINI_ID}[data-small="1"] [data-mini-half] {
        display: none;
      }
      #${MINI_ID}[data-small="1"] .acto-yt-mini-bar {
        min-height: 20px;
        padding: 2px 3px;
      }
      #${MINI_ID}[data-small="1"] button {
        height: 15px;
        min-width: 16px;
        padding: 0 3px;
        font-size: 8px;
      }
    `;
    document.documentElement.appendChild(style);
  }

  function applyWindowGeometry() {
    if (!root) return;
    if (!size) size = defaultSize();
    if (!position) position = defaultPosition();

    size = {
      width: clamp(size.width, MIN_WIDTH, Math.max(MIN_WIDTH, window.innerWidth - EDGE_MARGIN * 2)),
      height: clamp(size.height, MIN_HEIGHT, Math.max(MIN_HEIGHT, window.innerHeight - EDGE_MARGIN * 2)),
    };

    const maxX = Math.max(EDGE_MARGIN, window.innerWidth - size.width - EDGE_MARGIN);
    const maxY = Math.max(EDGE_MARGIN, window.innerHeight - size.height - EDGE_MARGIN);
    position = {
      x: clamp(position.x, EDGE_MARGIN, maxX),
      y: clamp(position.y, EDGE_MARGIN, maxY),
    };

    root.style.width = `${size.width}px`;
    root.style.height = `${size.height}px`;
    root.style.left = `${position.x}px`;
    root.style.top = `${position.y}px`;
  }

  function miniSize() {
    const baseWidth = 340;
    const baseHeight = 220;
    return {
      width: miniSmall ? Math.round(baseWidth * 0.5) : baseWidth,
      height: miniSmall ? Math.round(baseHeight * 0.5) : baseHeight,
    };
  }

  function applyMiniPosition() {
    if (!mini) return;
    const { width, height } = miniSize();
    if (!miniPosition) miniPosition = defaultMiniPosition(width, height);

    miniPosition = {
      x: clamp(miniPosition.x, 4, Math.max(4, window.innerWidth - width - 4)),
      y: clamp(miniPosition.y, 4, Math.max(4, window.innerHeight - height - 4)),
    };

    mini.style.width = `${width}px`;
    mini.style.height = `${height}px`;
    mini.style.left = `${miniPosition.x}px`;
    mini.style.top = `${miniPosition.y}px`;
    mini.dataset.small = miniSmall ? "1" : "0";
  }

  function wireDrag(handle, element, getPosition, setPosition, apply) {
    let drag = null;

    handle.addEventListener("pointerdown", (event) => {
      if (event.button !== 0 || event.target.closest("button,a,iframe")) return;
      const current = getPosition();
      drag = {
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        originX: current?.x || element.getBoundingClientRect().left,
        originY: current?.y || element.getBoundingClientRect().top,
      };
      handle.setPointerCapture(event.pointerId);
      event.preventDefault();
    });

    handle.addEventListener("pointermove", (event) => {
      if (!drag || drag.pointerId !== event.pointerId) return;
      setPosition({
        x: drag.originX + event.clientX - drag.startX,
        y: drag.originY + event.clientY - drag.startY,
      });
      apply();
    });

    function stopDrag(event) {
      if (!drag || drag.pointerId !== event.pointerId) return;
      drag = null;
      try {
        handle.releasePointerCapture(event.pointerId);
      } catch {}
    }

    handle.addEventListener("pointerup", stopDrag);
    handle.addEventListener("pointercancel", stopDrag);
  }

  function nextResizeGeometry(direction, drag, event) {
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

    if (nextX < EDGE_MARGIN) {
      nextWidth -= EDGE_MARGIN - nextX;
      nextX = EDGE_MARGIN;
    }
    if (nextY < EDGE_MARGIN) {
      nextHeight -= EDGE_MARGIN - nextY;
      nextY = EDGE_MARGIN;
    }

    nextWidth = clamp(nextWidth, MIN_WIDTH, Math.max(MIN_WIDTH, window.innerWidth - nextX - EDGE_MARGIN));
    nextHeight = clamp(nextHeight, MIN_HEIGHT, Math.max(MIN_HEIGHT, window.innerHeight - nextY - EDGE_MARGIN));

    return {
      position: { x: nextX, y: nextY },
      size: { width: nextWidth, height: nextHeight },
    };
  }

  function wireResizeHandles() {
    root?.querySelectorAll("[data-resize]").forEach((handle) => {
      const direction = handle.dataset.resize || "";
      let drag = null;

      handle.addEventListener("pointerdown", (event) => {
        if (event.button !== 0) return;
        const rect = root.getBoundingClientRect();
        drag = {
          pointerId: event.pointerId,
          startX: event.clientX,
          startY: event.clientY,
          x: position?.x ?? rect.left,
          y: position?.y ?? rect.top,
          width: size?.width ?? rect.width,
          height: size?.height ?? rect.height,
        };
        compact = false;
        savedSize = null;
        root.dataset.compact = "0";
        root.dataset.resizing = "1";
        handle.setPointerCapture(event.pointerId);
        event.preventDefault();
        event.stopPropagation();
      });

      handle.addEventListener("pointermove", (event) => {
        if (!drag || drag.pointerId !== event.pointerId) return;
        const next = nextResizeGeometry(direction, drag, event);
        position = next.position;
        size = next.size;
        applyWindowGeometry();
      });

      function stopResize(event) {
        if (!drag || drag.pointerId !== event.pointerId) return;
        drag = null;
        root.dataset.resizing = "0";
        try {
          handle.releasePointerCapture(event.pointerId);
        } catch {}
      }

      handle.addEventListener("pointerup", stopResize);
      handle.addEventListener("pointercancel", stopResize);
    });
  }

  function toggleRootHalfSize() {
    ensureRoot();

    if (!size) size = defaultSize();
    if (!compact) {
      savedSize = { ...size };
      size = {
        width: Math.max(MIN_WIDTH, Math.round(size.width * 0.5)),
        height: Math.max(MIN_HEIGHT, Math.round(size.height * 0.5)),
      };
      compact = true;
    } else {
      size = savedSize ? { ...savedSize } : defaultSize();
      savedSize = null;
      compact = false;
    }

    root.dataset.compact = compact ? "1" : "0";
    applyWindowGeometry();
  }

  function ensureRoot() {
    ensureStyle();
    if (root?.isConnected) return root;

    root = document.createElement("div");
    root.id = ROOT_ID;
    root.innerHTML = `
      <div class="acto-yt-shell">
        <div class="acto-yt-bar" data-drag>
          <div class="acto-yt-title" data-title>ACTO MUSIC</div>
          <div class="acto-yt-actions">
            <button type="button" data-pip title="Minimizar em PiP">PiP</button>
            <button type="button" data-half title="Alternar tamanho 50%">50%</button>
            <button type="button" data-close title="Fechar">X</button>
          </div>
        </div>
        <div class="acto-yt-frame">
          <iframe title="ACTO YouTube Player" src="about:blank" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>
        </div>
        <div class="acto-yt-footer">
          <div class="acto-yt-meta" data-meta>Player pronto.</div>
          <a class="acto-yt-open" data-open target="_blank" rel="noopener noreferrer" href="https://www.youtube.com">ABRIR</a>
        </div>
      </div>
      <div class="acto-yt-resize" data-resize="n"></div>
      <div class="acto-yt-resize" data-resize="e"></div>
      <div class="acto-yt-resize" data-resize="s"></div>
      <div class="acto-yt-resize" data-resize="w"></div>
      <div class="acto-yt-resize" data-resize="ne"></div>
      <div class="acto-yt-resize" data-resize="nw"></div>
      <div class="acto-yt-resize" data-resize="se"></div>
      <div class="acto-yt-resize" data-resize="sw"></div>
    `;

    document.documentElement.appendChild(root);
    iframe = root.querySelector("iframe");

    root.querySelector("[data-pip]")?.addEventListener("click", minimizePlayer);
    root.querySelector("[data-half]")?.addEventListener("click", toggleRootHalfSize);
    root.querySelector("[data-close]")?.addEventListener("click", closePlayer);
    wireDrag(
      root.querySelector("[data-drag]"),
      root,
      () => position,
      (next) => {
        position = next;
      },
      applyWindowGeometry,
    );
    wireResizeHandles();

    applyWindowGeometry();
    return root;
  }

  function updateRootText() {
    if (!root || !currentResult) return;
    const title = root.querySelector("[data-title]");
    const meta = root.querySelector("[data-meta]");
    const open = root.querySelector("[data-open]");

    if (title) title.textContent = currentResult.title || "ACTO MUSIC";
    if (meta) meta.textContent = [currentResult.channel, currentResult.duration].filter(Boolean).join(" - ") || "YouTube";
    if (open) open.href = watchUrl(currentResult);
  }

  function playResult(result) {
    if (!validResult(result)) throw new Error("Video invalido.");

    currentResult = {
      videoId: result.videoId,
      title: result.title || "Video YouTube",
      channel: result.channel || "",
      duration: result.duration || "",
      url: watchUrl(result),
    };

    ensureRoot();
    root.hidden = false;
    updateRootText();
    if (iframe) iframe.src = embedUrl(currentResult);
    removeMini();
    applyWindowGeometry();
  }

  function ensureMini() {
    ensureStyle();
    if (mini?.isConnected) return mini;

    mini = document.createElement("div");
    mini.id = MINI_ID;
    mini.innerHTML = `
      <div class="acto-yt-mini-bar" data-mini-drag title="Arraste para mover">
        <div class="acto-yt-mini-title" data-mini-title>ACTO MUSIC</div>
        <div class="acto-yt-mini-actions">
          <button type="button" data-mini-half title="Modo miniatura -50%">-50%</button>
          <button type="button" data-mini-expand title="Expandir">[]</button>
          <button type="button" data-mini-close title="Encerrar">x</button>
        </div>
      </div>
      <iframe title="ACTO YouTube Mini Player" src="about:blank" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>
    `;

    document.documentElement.appendChild(mini);
    mini.querySelector("[data-mini-half]")?.addEventListener("click", () => {
      miniSmall = !miniSmall;
      applyMiniPosition();
    });
    mini.querySelector("[data-mini-expand]")?.addEventListener("click", restorePlayer);
    mini.querySelector("[data-mini-close]")?.addEventListener("click", closePlayer);
    wireDrag(
      mini.querySelector("[data-mini-drag]"),
      mini,
      () => miniPosition,
      (next) => {
        miniPosition = next;
      },
      applyMiniPosition,
    );

    return mini;
  }

  function minimizePlayer(forceSmall = false) {
    if (!validResult(currentResult)) throw new Error("Selecione um video antes de minimizar.");
    if (forceSmall) miniSmall = true;

    const miniElement = ensureMini();
    const title = miniElement.querySelector("[data-mini-title]");
    const miniIframe = miniElement.querySelector("iframe");

    if (title) title.textContent = currentResult.title || "ACTO MUSIC";
    if (miniIframe) miniIframe.src = embedUrl(currentResult);
    applyMiniPosition();

    if (iframe) iframe.src = "about:blank";
    if (root) root.hidden = true;
  }

  function toggleMiniSmall() {
    if (!validResult(currentResult)) throw new Error("Selecione um video antes de usar 50%.");
    if (!mini?.isConnected) {
      minimizePlayer(true);
      return;
    }

    miniSmall = !miniSmall;
    applyMiniPosition();
  }

  function restorePlayer() {
    if (!validResult(currentResult)) return;
    ensureRoot();
    root.hidden = false;
    updateRootText();
    if (iframe) iframe.src = embedUrl(currentResult);
    removeMini();
    applyWindowGeometry();
  }

  function removeMini() {
    if (mini) {
      const miniIframe = mini.querySelector("iframe");
      if (miniIframe) miniIframe.src = "about:blank";
      mini.remove();
    }
    mini = null;
  }

  function closePlayer() {
    if (iframe) iframe.src = "about:blank";
    if (root) root.remove();
    root = null;
    iframe = null;
    removeMini();
    currentResult = null;
  }

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message?.type === PING_TYPE) {
      sendResponse({ ok: true });
      return false;
    }

    if (message?.type !== PLAYER_TYPE) return false;

    try {
      if (message.action === "close") closePlayer();
      else if (message.action === "minimize") minimizePlayer(false);
      else if (message.action === "minimizeSmall") minimizePlayer(true);
      else if (message.action === "toggleSmall") toggleMiniSmall();
      else if (message.action === "restore") restorePlayer();
      else playResult(message.result);

      sendResponse({ ok: true });
    } catch (error) {
      sendResponse({ ok: false, error: error?.message || "Falha no player." });
    }

    return false;
  });

  window.addEventListener("resize", () => {
    if (root?.isConnected && !root.hidden) applyWindowGeometry();
    if (mini?.isConnected) applyMiniPosition();
  });
})();
