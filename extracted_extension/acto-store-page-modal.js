(() => {
  if (globalThis.__ACTO_STORE_PAGE_MODAL_V2__) return;
  globalThis.__ACTO_STORE_PAGE_MODAL_V2__ = true;

  const OPEN_MESSAGE_TYPE = "ACTO_OPEN_STORE_PAGE_MODAL_V2";
  const CLOSE_MESSAGE_TYPE = "ACTO_CLOSE_STORE_PAGE_MODAL_V2";
  const PING_MESSAGE_TYPE = "ACTO_STORE_PAGE_MODAL_V2_PING";
  const MODAL_ID = "acto-store-page-modal-v2";
  const STYLE_ID = "acto-store-page-modal-v2-style";
  const STORAGE_KEY = "acto-store-page-modal-v2-geometry";
  const STALE_IDS = ["acto-store-page-modal", "acto-store-bridge-modal"];
  const STALE_STYLE_IDS = ["acto-store-page-modal-style", "acto-store-bridge-style"];
  const DEFAULT_WIDTH = 708;
  const DEFAULT_HEIGHT = 492;
  const MIN_WIDTH = 420;
  const MIN_HEIGHT = 360;
  const EDGE = 8;

  const runtime = globalThis.chrome?.runtime;
  const assetUrl = (path) => runtime?.getURL?.(path) || `./${path}`;

  const modules = [
    {
      id: "roleta",
      label: "ROLETA",
      sub: "Gire e ganhe",
      url: "https://www.acto-lov.online/roleta",
      tone: "pink",
      icon: "M12 2v3m0 14v3M2 12h3m14 0h3M4.93 4.93l2.12 2.12m9.9 9.9 2.12 2.12m0-14.14-2.12 2.12m-9.9 9.9-2.12 2.12M8 12a4 4 0 1 0 8 0 4 4 0 0 0-8 0Z",
    },
    {
      id: "planos",
      label: "PLANOS",
      sub: "Assinaturas pro",
      url: "https://www.acto-lov.online/planos",
      tone: "sky",
      icon: "M4 5h16v14H4z M8 9h8M8 13h5",
    },
    {
      id: "suporte",
      label: "SUPORTE",
      sub: "Ajuda e atendimento",
      url: "https://www.acto-lov.online/supp",
      tone: "amber",
      icon: "M4 14v-2a8 8 0 0 1 16 0v2M6 19H5a3 3 0 0 1-3-3v-2h4v5ZM18 19h1a3 3 0 0 0 3-3v-2h-4v5ZM12 20h3",
    },
    {
      id: "skills",
      label: "SKILLS",
      sub: "Habilidades extras",
      url: "https://skillforge-acto.lovable.app/",
      tone: "emerald",
      icon: "M12 2 15 8l6 1-4.5 4.4 1 6.1L12 16.7 6.5 19.5l1-6.1L3 9l6-1z",
    },
  ];

  const ads = [
    {
      id: "ad1",
      title: "BOOST - PRO PASS",
      sub: "30 dias premium - 50% OFF",
      href: "https://www.acto-lov.online/roleta",
      src: assetUrl("ads/anuncio-1.png"),
      alt: "ACTO Roleta da Sorte",
    },
    {
      id: "ad2",
      title: "ROLETA DIARIA",
      sub: "Gire e leve bonus gratis",
      href: "https://www.acto-lov.online/planos",
      src: assetUrl("ads/anuncio-2.png"),
      alt: "ACTO Seja Revendedor",
    },
    {
      id: "ad3",
      title: "SKILLS PACK",
      sub: "Habilidades exclusivas TIER S",
      href: "https://skillforge-acto.lovable.app/",
      src: assetUrl("ads/anuncio-3.png"),
      alt: "ACTO Skills",
    },
  ];

  let modal = null;
  let selectedModuleId = "";
  let slideIndex = 0;
  let slideTimer = 0;
  let position = null;
  let size = null;

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function minWidth() {
    return Math.min(MIN_WIDTH, Math.max(280, window.innerWidth - EDGE * 2));
  }

  function minHeight() {
    return Math.min(MIN_HEIGHT, Math.max(280, window.innerHeight - EDGE * 2));
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

  function removeStaleStoreLayers() {
    [...STALE_IDS, MODAL_ID].forEach((id) => {
      document.querySelectorAll(`[id="${id}"]`).forEach((element) => {
        if (element !== modal) element.remove();
      });
    });
    STALE_STYLE_IDS.forEach((id) => document.getElementById(id)?.remove());
  }

  function iconSvg(path, className = "") {
    return `
      <svg class="${className}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
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
        background: transparent;
        color: #eef6ff;
        font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
      }
      #${MODAL_ID} * { box-sizing: border-box; }
      #${MODAL_ID} button,
      #${MODAL_ID} iframe {
        font: inherit;
      }
      #${MODAL_ID} .acto-store-window {
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
          linear-gradient(180deg, rgba(30, 58, 138, .18), transparent 42%),
          rgba(3, 7, 18, .98);
        box-shadow: 0 25px 80px rgba(0, 0, 0, .70), 0 0 60px rgba(80, 140, 255, .35);
      }
      #${MODAL_ID} .acto-store-window[data-resizing="1"] iframe {
        pointer-events: none;
      }
      #${MODAL_ID} .acto-store-header {
        min-height: 48px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 10px;
        padding: 9px 12px;
        border-bottom: 1px solid rgba(92, 184, 255, .35);
        background: rgba(15, 23, 42, .86);
        cursor: move;
        user-select: none;
      }
      #${MODAL_ID} .acto-store-title {
        min-width: 0;
        display: flex;
        align-items: center;
        gap: 8px;
        color: #7dd3fc;
        font-size: 12px;
        font-weight: 900;
        letter-spacing: .22em;
        text-transform: uppercase;
      }
      #${MODAL_ID} .acto-store-title svg {
        width: 17px;
        height: 17px;
      }
      #${MODAL_ID} .acto-store-header-actions {
        display: flex;
        align-items: center;
        gap: 6px;
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
      #${MODAL_ID} .acto-store-back {
        height: 28px;
        display: inline-flex;
        align-items: center;
        gap: 5px;
        padding: 0 8px;
        font-size: 9px;
        font-weight: 900;
        letter-spacing: .12em;
        text-transform: uppercase;
      }
      #${MODAL_ID} .acto-store-close {
        width: 30px;
        height: 30px;
        padding: 0;
        color: #fecaca;
        border-color: rgba(248, 113, 113, .34);
        background: rgba(127, 29, 29, .24);
      }
      #${MODAL_ID} .acto-store-close:hover {
        border-color: rgba(248, 113, 113, .72);
        background: rgba(185, 28, 28, .38);
      }
      #${MODAL_ID} .acto-store-home {
        flex: 1;
        min-height: 0;
        overflow: auto;
        padding: 24px;
      }
      #${MODAL_ID} .acto-store-eyebrow {
        color: rgba(125, 211, 252, .74);
        font-size: 9px;
        font-weight: 900;
        letter-spacing: .35em;
        text-align: center;
        text-transform: uppercase;
      }
      #${MODAL_ID} .acto-store-heading {
        margin: 4px 0 22px;
        color: #fff;
        font-size: clamp(20px, 5vw, 30px);
        font-weight: 950;
        letter-spacing: .06em;
        text-align: center;
        text-transform: uppercase;
      }
      #${MODAL_ID} .acto-store-heading span {
        color: #7dd3fc;
      }
      #${MODAL_ID} .acto-store-grid {
        width: min(680px, 100%);
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 14px;
        margin: 0 auto;
      }
      #${MODAL_ID} .acto-store-card {
        position: relative;
        min-height: 122px;
        overflow: hidden;
        padding: 18px;
        text-align: left;
        background: rgba(15, 23, 42, .68);
      }
      #${MODAL_ID} .acto-store-card::before {
        content: "";
        position: absolute;
        inset: 0;
        opacity: .72;
        transition: opacity .16s ease;
      }
      #${MODAL_ID} .acto-store-card[data-tone="pink"]::before {
        background: linear-gradient(135deg, rgba(217, 70, 239, .36), rgba(236, 72, 153, .12), transparent);
      }
      #${MODAL_ID} .acto-store-card[data-tone="sky"]::before {
        background: linear-gradient(135deg, rgba(56, 189, 248, .34), rgba(37, 99, 235, .12), transparent);
      }
      #${MODAL_ID} .acto-store-card[data-tone="amber"]::before {
        background: linear-gradient(135deg, rgba(251, 191, 36, .34), rgba(234, 88, 12, .12), transparent);
      }
      #${MODAL_ID} .acto-store-card[data-tone="emerald"]::before {
        background: linear-gradient(135deg, rgba(52, 211, 153, .34), rgba(20, 184, 166, .12), transparent);
      }
      #${MODAL_ID} .acto-store-card:hover::before {
        opacity: 1;
      }
      #${MODAL_ID} .acto-store-card-content {
        position: relative;
        display: flex;
        align-items: flex-start;
        gap: 12px;
      }
      #${MODAL_ID} .acto-store-card-icon {
        width: 48px;
        height: 48px;
        display: flex;
        align-items: center;
        justify-content: center;
        border: 1px solid rgba(125, 211, 252, .60);
        border-radius: 9px;
        background: rgba(2, 6, 23, .62);
        box-shadow: 0 0 20px rgba(92, 184, 255, .28);
        color: #7dd3fc;
      }
      #${MODAL_ID} .acto-store-card-icon svg {
        width: 24px;
        height: 24px;
      }
      #${MODAL_ID} .acto-store-card-title {
        color: #fff;
        font-size: 15px;
        font-weight: 950;
        letter-spacing: .12em;
      }
      #${MODAL_ID} .acto-store-card-sub {
        margin-top: 4px;
        color: rgba(219, 234, 254, .64);
        font-size: 11px;
      }
      #${MODAL_ID} .acto-store-available {
        position: relative;
        display: flex;
        align-items: center;
        gap: 6px;
        margin-top: 18px;
        color: rgba(125, 211, 252, .75);
        font-size: 9px;
        font-weight: 900;
        letter-spacing: .25em;
        text-transform: uppercase;
      }
      #${MODAL_ID} .acto-store-available i {
        width: 6px;
        height: 6px;
        border-radius: 999px;
        background: #7dd3fc;
        box-shadow: 0 0 8px rgba(125, 211, 252, .90);
      }
      #${MODAL_ID} .acto-store-ad {
        width: min(860px, 100%);
        margin: 22px auto 0;
      }
      #${MODAL_ID} .acto-store-ad-top {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 7px;
      }
      #${MODAL_ID} .acto-store-ad-title {
        color: rgba(125, 211, 252, .65);
        font-size: 9px;
        font-weight: 900;
        letter-spacing: .25em;
        text-transform: uppercase;
      }
      #${MODAL_ID} .acto-store-dots {
        display: flex;
        gap: 6px;
      }
      #${MODAL_ID} .acto-store-dot {
        width: 7px;
        height: 7px;
        padding: 0;
        border-radius: 999px;
        border: 0;
        background: rgba(125, 211, 252, .30);
      }
      #${MODAL_ID} .acto-store-dot[data-active="1"] {
        width: 26px;
        background: #7dd3fc;
        box-shadow: 0 0 8px rgba(125, 211, 252, .80);
      }
      #${MODAL_ID} .acto-store-carousel {
        position: relative;
        width: 100%;
        aspect-ratio: 1960 / 802;
        overflow: hidden;
        border: 1px solid rgba(92, 184, 255, .40);
        border-radius: 12px;
        background: rgba(15, 23, 42, .66);
        box-shadow: 0 0 20px rgba(92, 184, 255, .18);
      }
      #${MODAL_ID} .acto-store-slide {
        position: absolute;
        inset: 0;
        opacity: 0;
        pointer-events: none;
        transition: opacity .45s ease;
      }
      #${MODAL_ID} .acto-store-slide[data-active="1"] {
        opacity: 1;
        pointer-events: auto;
      }
      #${MODAL_ID} .acto-store-slide img {
        width: 100%;
        height: 100%;
        display: block;
        object-fit: cover;
      }
      #${MODAL_ID} .acto-store-arrow {
        position: absolute;
        top: 50%;
        width: 30px;
        height: 30px;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 0;
        transform: translateY(-50%);
        border-radius: 999px;
        background: rgba(2, 6, 23, .64);
      }
      #${MODAL_ID} .acto-store-arrow[data-dir="prev"] { left: 8px; }
      #${MODAL_ID} .acto-store-arrow[data-dir="next"] { right: 8px; }
      #${MODAL_ID} .acto-store-module {
        flex: 1;
        min-height: 0;
        display: flex;
        background: rgba(0, 0, 0, .36);
      }
      #${MODAL_ID} .acto-store-nav {
        width: 176px;
        display: flex;
        flex-direction: column;
        gap: 3px;
        padding: 12px 0;
        border-right: 1px solid rgba(92, 184, 255, .28);
        background: rgba(2, 6, 23, .44);
      }
      #${MODAL_ID} .acto-store-nav button {
        height: 38px;
        display: flex;
        align-items: center;
        gap: 8px;
        border: 0;
        border-left: 2px solid transparent;
        border-radius: 0;
        background: transparent;
        color: rgba(219, 234, 254, .62);
        padding: 0 14px;
        text-align: left;
        font-size: 10px;
        font-weight: 900;
        letter-spacing: .14em;
      }
      #${MODAL_ID} .acto-store-nav button[data-active="1"] {
        border-left-color: #7dd3fc;
        background: rgba(14, 116, 144, .18);
        color: #7dd3fc;
      }
      #${MODAL_ID} .acto-store-nav svg {
        width: 15px;
        height: 15px;
      }
      #${MODAL_ID} .acto-store-frame {
        flex: 1;
        min-width: 0;
        border: 0;
        background: #000;
      }
      #${MODAL_ID} .acto-store-resize {
        position: absolute;
        z-index: 5;
        background: rgba(125, 211, 252, .14);
        opacity: 0;
      }
      #${MODAL_ID} .acto-store-window:hover .acto-store-resize[data-resize="se"] {
        opacity: .75;
      }
      #${MODAL_ID} .acto-store-resize[data-resize="n"],
      #${MODAL_ID} .acto-store-resize[data-resize="s"] {
        left: 12px;
        right: 12px;
        height: 8px;
        cursor: ns-resize;
      }
      #${MODAL_ID} .acto-store-resize[data-resize="n"] { top: 0; }
      #${MODAL_ID} .acto-store-resize[data-resize="s"] { bottom: 0; }
      #${MODAL_ID} .acto-store-resize[data-resize="e"],
      #${MODAL_ID} .acto-store-resize[data-resize="w"] {
        top: 12px;
        bottom: 12px;
        width: 8px;
        cursor: ew-resize;
      }
      #${MODAL_ID} .acto-store-resize[data-resize="e"] { right: 0; }
      #${MODAL_ID} .acto-store-resize[data-resize="w"] { left: 0; }
      #${MODAL_ID} .acto-store-resize[data-resize="ne"],
      #${MODAL_ID} .acto-store-resize[data-resize="nw"],
      #${MODAL_ID} .acto-store-resize[data-resize="se"],
      #${MODAL_ID} .acto-store-resize[data-resize="sw"] {
        width: 15px;
        height: 15px;
      }
      #${MODAL_ID} .acto-store-resize[data-resize="ne"] {
        top: 0;
        right: 0;
        cursor: nesw-resize;
      }
      #${MODAL_ID} .acto-store-resize[data-resize="nw"] {
        top: 0;
        left: 0;
        cursor: nwse-resize;
      }
      #${MODAL_ID} .acto-store-resize[data-resize="se"] {
        right: 0;
        bottom: 0;
        cursor: nwse-resize;
        border-radius: 12px 0 12px 0;
      }
      #${MODAL_ID} .acto-store-resize[data-resize="sw"] {
        left: 0;
        bottom: 0;
        cursor: nesw-resize;
      }
      @media (max-width: 720px) {
        #${MODAL_ID} .acto-store-window {
          min-width: 280px;
          min-height: 320px;
        }
        #${MODAL_ID} .acto-store-title span {
          max-width: 170px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        #${MODAL_ID} .acto-store-header {
          min-height: 42px;
          padding: 7px 9px;
        }
        #${MODAL_ID} .acto-store-close {
          width: 28px;
          height: 28px;
        }
        #${MODAL_ID} .acto-store-card {
          min-height: 104px;
          padding: 14px;
        }
        #${MODAL_ID} .acto-store-card-icon {
          width: 40px;
          height: 40px;
        }
        #${MODAL_ID} .acto-store-heading {
          font-size: 20px;
          margin-bottom: 16px;
        }
        #${MODAL_ID} .acto-store-ad {
          margin-top: 16px;
        }
        #${MODAL_ID} .acto-store-home {
          padding: 18px 14px;
        }
        #${MODAL_ID} .acto-store-grid {
          grid-template-columns: 1fr;
        }
        #${MODAL_ID} .acto-store-module {
          flex-direction: column;
        }
        #${MODAL_ID} .acto-store-nav {
          width: 100%;
          min-height: 48px;
          flex-direction: row;
          overflow: auto;
          border-right: 0;
          border-bottom: 1px solid rgba(92, 184, 255, .28);
          padding: 6px;
        }
        #${MODAL_ID} .acto-store-nav button {
          min-width: max-content;
          height: 34px;
          border-left: 0;
          border-bottom: 2px solid transparent;
          border-radius: 7px;
        }
        #${MODAL_ID} .acto-store-nav button[data-active="1"] {
          border-bottom-color: #7dd3fc;
        }
      }
    `;

    document.head.appendChild(style);
  }

  function applyGeometry() {
    const panel = modal?.querySelector(".acto-store-window");
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
    const panel = modal?.querySelector(".acto-store-window");
    const header = modal?.querySelector(".acto-store-header");
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
    const panel = modal?.querySelector(".acto-store-window");
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

  function stopSlides() {
    if (slideTimer) clearInterval(slideTimer);
    slideTimer = 0;
  }

  function startSlides() {
    stopSlides();
    slideTimer = setInterval(() => {
      if (!modal || selectedModuleId) return;
      slideIndex = (slideIndex + 1) % ads.length;
      renderStoreBody();
    }, 5000);
  }

  function renderHeader() {
    const selected = modules.find((item) => item.id === selectedModuleId);
    return `
      <div class="acto-store-header">
        <div class="acto-store-title">
          ${selected ? `<button type="button" class="acto-store-back" data-store-back>${iconSvg("M15 18l-6-6 6-6", "")} VOLTAR</button>` : ""}
          ${iconSvg("M6 8V6a6 6 0 0 1 12 0v2M4 8h16l-1 13H5L4 8Z", "")}
          <span>LOJA - ACTO${selected ? ` - ${selected.label}` : ""}</span>
        </div>
        <div class="acto-store-header-actions">
          <button type="button" class="acto-store-close" data-store-close aria-label="Fechar">X</button>
        </div>
      </div>
    `;
  }

  function moduleCard(item) {
    return `
      <button type="button" class="acto-store-card" data-store-module="${item.id}" data-tone="${item.tone}">
        <div class="acto-store-card-content">
          <div class="acto-store-card-icon">${iconSvg(item.icon, "")}</div>
          <div>
            <div class="acto-store-card-title">${item.label}</div>
            <div class="acto-store-card-sub">${item.sub}</div>
          </div>
        </div>
        <div class="acto-store-available"><i></i> DISPONIVEL</div>
      </button>
    `;
  }

  function renderCarousel() {
    const active = ((slideIndex % ads.length) + ads.length) % ads.length;
    return `
      <section class="acto-store-ad" data-ad-slot="store-carousel">
        <div class="acto-store-ad-top">
          <span class="acto-store-ad-title">ANUNCIO - DESTAQUES</span>
          <div class="acto-store-dots">
            ${ads
              .map(
                (ad, index) =>
                  `<button type="button" class="acto-store-dot" data-store-slide="${index}" data-active="${index === active ? "1" : "0"}" aria-label="Slide ${index + 1}"></button>`,
              )
              .join("")}
          </div>
        </div>
        <div class="acto-store-carousel">
          ${ads
            .map(
              (ad, index) => `
                <a class="acto-store-slide" data-active="${index === active ? "1" : "0"}" href="${ad.href}" target="_blank" rel="noopener noreferrer" aria-hidden="${index === active ? "false" : "true"}">
                  <img src="${ad.src}" alt="${ad.alt}" draggable="false" />
                </a>
              `,
            )
            .join("")}
          <button type="button" class="acto-store-arrow" data-dir="prev" aria-label="Anterior">${iconSvg("M15 18l-6-6 6-6", "")}</button>
          <button type="button" class="acto-store-arrow" data-dir="next" aria-label="Proximo">${iconSvg("M9 18l6-6-6-6", "")}</button>
        </div>
      </section>
    `;
  }

  function renderHome() {
    return `
      <div class="acto-store-home">
        <div class="acto-store-eyebrow">CENTRAL DE OPERACOES</div>
        <h2 class="acto-store-heading">ESCOLHA SEU <span>MODULO</span></h2>
        <div class="acto-store-grid">${modules.map(moduleCard).join("")}</div>
        ${renderCarousel()}
      </div>
    `;
  }

  function renderModule() {
    const selected = modules.find((item) => item.id === selectedModuleId) || modules[0];
    return `
      <div class="acto-store-module">
        <nav class="acto-store-nav" aria-label="Modulos da loja">
          ${modules
            .map(
              (item) => `
                <button type="button" data-store-module="${item.id}" data-active="${item.id === selected.id ? "1" : "0"}">
                  ${iconSvg(item.icon, "")}
                  <span>${item.label}</span>
                </button>
              `,
            )
            .join("")}
        </nav>
        <iframe class="acto-store-frame" src="${selected.url}" title="ACTO - ${selected.label}" referrerpolicy="strict-origin-when-cross-origin" sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox"></iframe>
      </div>
    `;
  }

  function renderResizeHandles() {
    return ["n", "e", "s", "w", "ne", "nw", "se", "sw"]
      .map((direction) => `<div class="acto-store-resize" data-resize="${direction}"></div>`)
      .join("");
  }

  function renderStoreBody() {
    if (!modal) return;

    const panel = modal.querySelector(".acto-store-window");
    if (!panel) return;
    panel.innerHTML = `${renderHeader()}${selectedModuleId ? renderModule() : renderHome()}${renderResizeHandles()}`;
    applyGeometry();
    wireDrag();
    wireResize();
    wireStoreEvents();
  }

  function wireStoreEvents() {
    if (!modal) return;

    modal.querySelectorAll("[data-store-close]").forEach((button) => button.addEventListener("click", closeStore));
    modal.querySelectorAll("[data-store-back]").forEach((button) =>
      button.addEventListener("click", () => {
        selectedModuleId = "";
        renderStoreBody();
        startSlides();
      }),
    );
    modal.querySelectorAll("[data-store-module]").forEach((button) =>
      button.addEventListener("click", () => {
        selectedModuleId = button.dataset.storeModule || "";
        stopSlides();
        renderStoreBody();
      }),
    );
    modal.querySelectorAll("[data-store-slide]").forEach((button) =>
      button.addEventListener("click", () => {
        slideIndex = Number(button.dataset.storeSlide || "0") || 0;
        renderStoreBody();
      }),
    );
    modal.querySelectorAll("[data-dir]").forEach((button) =>
      button.addEventListener("click", () => {
        slideIndex += button.dataset.dir === "prev" ? -1 : 1;
        renderStoreBody();
      }),
    );
  }

  function openStore() {
    ensureStyles();
    readGeometry();
    removeStaleStoreLayers();

    if (modal?.isConnected) {
      applyGeometry();
      modal.focus();
      return;
    }

    modal = document.createElement("div");
    modal.id = MODAL_ID;
    modal.setAttribute("role", "dialog");
    modal.setAttribute("aria-modal", "false");
    modal.setAttribute("aria-label", "Loja");
    modal.tabIndex = -1;
    modal.innerHTML = `<div class="acto-store-window"></div>`;
    document.body.appendChild(modal);

    modal.addEventListener("click", (event) => {
      if (event.target === modal) closeStore();
    });
    modal.addEventListener("keydown", (event) => {
      if (event.key !== "Escape") return;
      if (selectedModuleId) {
        selectedModuleId = "";
        renderStoreBody();
        startSlides();
        return;
      }
      closeStore();
    });

    renderStoreBody();
    startSlides();
    modal.focus();
  }

  function closeStore() {
    stopSlides();
    modal?.remove();
    modal = null;
    selectedModuleId = "";
  }

  runtime?.onMessage?.addListener?.((message, _sender, sendResponse) => {
    if (message?.type === PING_MESSAGE_TYPE) {
      sendResponse({ ok: true });
      return false;
    }

    if (message?.type === CLOSE_MESSAGE_TYPE) {
      closeStore();
      sendResponse({ ok: true });
      return false;
    }

    if (message?.type !== OPEN_MESSAGE_TYPE) return false;

    openStore();
    sendResponse({ ok: true });
    return false;
  });

  window.addEventListener("resize", () => {
    if (modal?.isConnected) applyGeometry();
  });

  globalThis.actoOpenStorePageModal = openStore;
})();
