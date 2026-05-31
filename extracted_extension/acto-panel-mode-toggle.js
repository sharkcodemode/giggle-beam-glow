(() => {
  if (globalThis.__ACTO_PANEL_MODE_TOGGLE__) return;
  globalThis.__ACTO_PANEL_MODE_TOGGLE__ = true;

  const TO_FLOATING_MODAL_MESSAGE_TYPE = "ACTO_RETURN_FLOATING_MODAL";
  const BUTTON_ID = "acto-panel-mode-toggle";
  const STYLE_ID = "acto-panel-mode-toggle-style";
  const isEmbedded = globalThis.top !== globalThis;

  if (isEmbedded) return;

  function ensureStyle() {
    if (document.getElementById(STYLE_ID)) return;

    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
      #${BUTTON_ID} {
        position: fixed;
        top: 8px;
        right: 8px;
        z-index: 2147483647;
        width: 28px;
        height: 26px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        border: 1px solid rgba(96, 165, 250, .42);
        border-radius: 6px;
        background: rgba(15, 23, 42, .92);
        color: #dbeafe;
        box-shadow: 0 8px 22px rgba(0, 0, 0, .32);
        cursor: pointer;
        font: 900 10px/1 ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
      }
      #${BUTTON_ID}:hover {
        border-color: rgba(147, 197, 253, .82);
        background: rgba(37, 99, 235, .44);
        color: #fff;
      }
    `;
    document.documentElement.appendChild(style);
  }

  function ensureButton() {
    ensureStyle();
    if (document.getElementById(BUTTON_ID)) return;

    const button = document.createElement("button");
    button.id = BUTTON_ID;
    button.type = "button";
    button.title = "Voltar para modal livre";
    button.setAttribute("aria-label", button.title);
    button.textContent = "[]";
    button.addEventListener("click", () => {
      chrome.runtime.sendMessage({ type: TO_FLOATING_MODAL_MESSAGE_TYPE });
    });
    document.documentElement.appendChild(button);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", ensureButton, { once: true });
  } else {
    ensureButton();
  }
})();
