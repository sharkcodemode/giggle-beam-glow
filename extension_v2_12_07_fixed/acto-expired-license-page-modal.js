(() => {
  if (globalThis.__ACTO_EXPIRED_LICENSE_PAGE_MODAL__) return;
  globalThis.__ACTO_EXPIRED_LICENSE_PAGE_MODAL__ = true;

  const OPEN_MESSAGE_TYPE = "ACTO_OPEN_EXPIRED_LICENSE_PAGE_MODAL";
  const CLOSE_MESSAGE_TYPE = "ACTO_CLOSE_EXPIRED_LICENSE_PAGE_MODAL";
  const PING_MESSAGE_TYPE = "ACTO_EXPIRED_LICENSE_PAGE_MODAL_PING";
  const MODAL_ID = "acto-expired-license-page-modal";
  const STYLE_ID = "acto-expired-license-page-modal-style";
  const IMAGE_PATH = "assets/acto-expired-license-modal.png";
  const UNLOCK_URL = "https://acto-lov.online/";

  const runtime = globalThis.chrome?.runtime;
  const assetUrl = (path) => runtime?.getURL?.(path) || path;

  let modal = null;

  function ensureStyles() {
    if (document.getElementById(STYLE_ID)) return;

    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
      #${MODAL_ID} {
        position: fixed;
        inset: 0;
        z-index: 2147483647;
        display: grid;
        place-items: center;
        padding: 18px;
        background: rgba(0, 0, 0, .78);
        backdrop-filter: blur(6px);
        color: #fff;
        pointer-events: auto;
      }
      #${MODAL_ID} * { box-sizing: border-box; }
      #${MODAL_ID} .acto-expired-window {
        position: relative;
        width: min(760px, calc(100vw - 36px));
        animation: actoExpiredIn .18s ease-out both;
      }
      #${MODAL_ID} .acto-expired-image-button {
        display: block;
        width: 100%;
        padding: 0;
        border: 1px solid rgba(217, 70, 239, .58);
        border-radius: 14px;
        overflow: hidden;
        background: rgba(0, 0, 0, .52);
        box-shadow: 0 26px 90px rgba(0, 0, 0, .72), 0 0 56px rgba(217, 70, 239, .38);
        cursor: pointer;
        transition: transform .16s ease, border-color .16s ease, box-shadow .16s ease;
      }
      #${MODAL_ID} .acto-expired-image-button:hover {
        transform: scale(1.01);
        border-color: rgba(244, 114, 182, .86);
        box-shadow: 0 30px 96px rgba(0, 0, 0, .76), 0 0 68px rgba(236, 72, 153, .48);
      }
      #${MODAL_ID} .acto-expired-image {
        display: block;
        width: 100%;
        height: auto;
      }
      #${MODAL_ID} .acto-expired-close {
        position: absolute;
        top: -13px;
        right: -13px;
        z-index: 2;
        width: 38px;
        height: 38px;
        display: grid;
        place-items: center;
        border: 1px solid rgba(255, 255, 255, .38);
        border-radius: 999px;
        background: rgba(2, 6, 23, .88);
        color: #fff;
        font: 700 23px/1 Arial, sans-serif;
        cursor: pointer;
        box-shadow: 0 0 22px rgba(168, 85, 247, .45);
        transition: background .16s ease, transform .16s ease;
      }
      #${MODAL_ID} .acto-expired-close:hover {
        background: rgba(88, 28, 135, .94);
        transform: scale(1.04);
      }
      @keyframes actoExpiredIn {
        from { opacity: 0; transform: scale(.965); }
        to { opacity: 1; transform: scale(1); }
      }
      @media (max-width: 560px) {
        #${MODAL_ID} {
          padding: 10px;
        }
        #${MODAL_ID} .acto-expired-window {
          width: min(100%, calc(100vw - 20px));
        }
        #${MODAL_ID} .acto-expired-close {
          top: -8px;
          right: -8px;
          width: 34px;
          height: 34px;
          font-size: 20px;
        }
      }
    `;
    document.head.appendChild(style);
  }

  function openUnlockPage() {
    try {
      window.open(UNLOCK_URL, "_blank", "noopener,noreferrer");
    } catch {}
  }

  function closeModal() {
    modal?.remove();
    modal = null;
  }

  function openModal() {
    ensureStyles();

    if (modal?.isConnected) {
      modal.focus();
      return;
    }

    document.getElementById(MODAL_ID)?.remove();
    modal = document.createElement("div");
    modal.id = MODAL_ID;
    modal.setAttribute("role", "dialog");
    modal.setAttribute("aria-modal", "true");
    modal.setAttribute("aria-label", "ACTO");
    modal.tabIndex = -1;
    modal.innerHTML = `
      <div class="acto-expired-window">
        <button type="button" class="acto-expired-close" data-expired-close aria-label="Fechar">X</button>
        <button type="button" class="acto-expired-image-button" data-expired-open aria-label="Abrir ACTO">
          <img class="acto-expired-image" src="${assetUrl(IMAGE_PATH)}" alt="ACTO Prompts sem limite">
        </button>
      </div>
    `;
    document.body.appendChild(modal);

    modal.addEventListener("click", (event) => {
      if (event.target === modal || event.target.closest("[data-expired-close]")) {
        closeModal();
        return;
      }
      if (event.target.closest("[data-expired-open]")) openUnlockPage();
    });
    modal.addEventListener("keydown", (event) => {
      if (event.key === "Escape") closeModal();
    });
    modal.focus();
  }

  runtime?.onMessage?.addListener?.((message, _sender, sendResponse) => {
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

  globalThis.actoOpenExpiredLicensePageModal = openModal;
})();
