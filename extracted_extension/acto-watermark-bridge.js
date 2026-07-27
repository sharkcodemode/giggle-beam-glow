(() => {
  if (globalThis.__ACTO_WATERMARK_BRIDGE__) return;
  globalThis.__ACTO_WATERMARK_BRIDGE__ = true;

  const BUTTON_ATTR = "data-acto-watermark-button";
  const BUTTON_TITLE = "Remover Marca D'água";
  const PROMPT_TEXT =
    'Adicione isso ao arquivo index.css do projecto a[href*="lovable.app"], iframe[src*="lovable.app"], a[href*="lovable.dev"], iframe[src*="lovable.dev"], div[style*="Edit with Lovable"], .lovable-badge { display: none !important; opacity: 0 !important; visibility: hidden !important; pointer-events: none !important; position: absolute !important; z-index: -9999 !important; }';

  let observer = null;

  function dropletIcon() {
    return `
      <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M12 2.8 6.5 10a8 8 0 1 0 11 0L12 2.8z"></path>
      </svg>
    `;
  }

  function visible(element) {
    if (!element) return false;
    const rect = element.getBoundingClientRect();
    const style = getComputedStyle(element);
    return rect.width > 0 && rect.height > 0 && style.display !== "none" && style.visibility !== "hidden";
  }

  function findPromptTextarea() {
    const textareas = Array.from(document.querySelectorAll("textarea")).filter(visible);
    return (
      textareas.find((textarea) => String(textarea.placeholder || "").includes("Enviando prompt em modo Think")) ||
      textareas.find((textarea) => !textarea.closest("form")?.querySelector('input[type="password"]')) ||
      textareas[0] ||
      null
    );
  }

  function findSendButton() {
    const buttons = Array.from(document.querySelectorAll('button[aria-label="Enviar mensagem"], button[title="Enviar mensagem"]'));
    return buttons.find((button) => visible(button) && !button.disabled) || null;
  }

  function setNativeTextareaValue(textarea, value) {
    const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value")?.set;
    if (setter) setter.call(textarea, value);
    else textarea.value = value;

    textarea.dispatchEvent(new Event("input", { bubbles: true }));
    textarea.dispatchEvent(new Event("change", { bubbles: true }));
  }

  function waitFrame() {
    return new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  }

  function setBusy(button, busy) {
    if (!button) return;
    button.disabled = !!busy;
    button.style.opacity = busy ? "0.55" : "";
    button.style.pointerEvents = busy ? "none" : "";
    button.dataset.actoWatermarkBusy = busy ? "1" : "0";
  }

  function sendThroughRuntime(button) {
    const runtime = globalThis.chrome?.runtime;
    if (!runtime?.sendMessage) return;

    setBusy(button, true);
    runtime.sendMessage(
      {
        type: "ACTO_EDGE_ACTION",
        action: "send_message",
        params: { message: PROMPT_TEXT },
      },
      () => setTimeout(() => setBusy(button, false), 600),
    );
  }

  async function handleClick(event) {
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();

    const button = event.currentTarget;
    if (button?.dataset.actoWatermarkBusy === "1") return;
    sendThroughRuntime(button);
  }

  function findDockButtons() {
    return Array.from(document.querySelectorAll("button[title]")).filter((button) => {
      const title = button.getAttribute("title") || "";
      return ["Criar Projeto", "Publicar Projeto", "Baixar Projeto", "Começar do Zero", "Music", "Informações"].includes(title);
    });
  }

  function createDockButton(reference) {
    const button = reference.cloneNode(false);
    button.removeAttribute("draggable");
    button.removeAttribute("disabled");
    button.disabled = false;
    button.draggable = false;
    button.setAttribute(BUTTON_ATTR, "1");
    button.setAttribute("type", "button");
    button.setAttribute("title", BUTTON_TITLE);
    button.setAttribute("aria-label", BUTTON_TITLE);
    button.className = String(reference.className || "").replace(/\bcursor-grab\b/g, "cursor-pointer").replace(/\bactive:cursor-grabbing\b/g, "");

    const iconClass =
      reference.querySelector("div")?.className ||
      "relative z-10 transition-all duration-300 pointer-events-none group-hover:-translate-y-1";
    const tooltipClass =
      Array.from(reference.querySelectorAll("span")).find((span) => String(span.className || "").includes("group-hover:opacity-100"))?.className ||
      "absolute -top-10 left-1/2 -translate-x-1/2 px-2 py-1 border text-[9px] text-white rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap uppercase tracking-tighter bg-blue-900/90 border-blue-500/30";
    const dotClass =
      Array.from(reference.querySelectorAll("div")).find((div) => String(div.className || "").includes("bottom-0.5"))?.className ||
      "absolute bottom-0.5 left-1/2 -translate-x-1/2 w-0.5 h-0.5 rounded-full transition-all duration-300 blur-[1px] opacity-0 group-hover:opacity-100 bg-blue-400";

    button.innerHTML = `
      <div class="${iconClass}">${dropletIcon()}</div>
      <span class="${tooltipClass}">${BUTTON_TITLE}</span>
      <div class="${dotClass}"></div>
    `;
    button.addEventListener("click", handleClick, true);
    return button;
  }

  function ensureDockButton() {
    if (document.querySelector(`[${BUTTON_ATTR}]`)) return;

    const buttons = findDockButtons();
    if (!buttons.length) return;

    const reference = buttons.find((button) => button.getAttribute("title") === "Baixar Projeto") || buttons[0];
    const parent = reference.parentElement;
    if (!parent) return;

    const button = createDockButton(reference);
    const before = buttons.find((item) => item.getAttribute("title") === "Começar do Zero") || reference.nextElementSibling;
    parent.insertBefore(button, before || null);
  }

  function boot() {
    ensureDockButton();
    observer = new MutationObserver(() => ensureDockButton());
    observer.observe(document.documentElement, { childList: true, subtree: true });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot, { once: true });
  } else {
    boot();
  }
})();
