(() => {
  if (globalThis.__ACTO_REMOVER_BRIDGE__) return;
  globalThis.__ACTO_REMOVER_BRIDGE__ = true;

  const OPEN_REMOVER_MODAL_MESSAGE_TYPE = "ACTO_OPEN_REMOVER_MODAL";
  const BUTTON_ATTR = "data-acto-remover-button";
  const SUPPORT_LABELS = new Set(["suporte", "support", "soporte"]);
  const CREATE_ACCOUNT_LABELS = new Set(["criar conta", "create account", "crear cuenta", "creer un compte", "konto erstellen"]);

  const runtime = globalThis.chrome?.runtime;
  let observer = null;

  function normalizeText(value) {
    return String(value || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/\s+/g, " ")
      .trim()
      .toLowerCase();
  }

  function isLoginSupportButton(button) {
    if (!(button instanceof HTMLButtonElement)) return false;

    const siblings = Array.from(button.parentElement?.children || []).filter(
      (candidate) => candidate instanceof HTMLButtonElement,
    );
    const hasCreateAccountSibling = siblings.some(
      (candidate) => candidate !== button && CREATE_ACCOUNT_LABELS.has(normalizeText(candidate.textContent)),
    );
    const isKnownSupportLabel = SUPPORT_LABELS.has(normalizeText(button.textContent));
    const isLoginActionPair =
      siblings.length === 2 &&
      siblings[1] === button &&
      siblings.every(
        (candidate) =>
          candidate.classList.contains("flex-1") &&
          candidate.classList.contains("h-8") &&
          candidate.classList.contains("bg-transparent") &&
          candidate.classList.contains("text-[8px]"),
      );

    return (isKnownSupportLabel && hasCreateAccountSibling) || isLoginActionPair;
  }

  function setButtonLabel(button) {
    const textNode = Array.from(button.childNodes).find((node) => node.nodeType === Node.TEXT_NODE);
    if (textNode) {
      textNode.textContent = "Removedor";
    } else {
      button.textContent = "Removedor";
    }

    button.setAttribute(BUTTON_ATTR, "1");
    button.setAttribute("title", "Removedor");
    button.setAttribute("aria-label", "Removedor");
  }

  function ensureRemoverButton() {
    document.querySelectorAll("button").forEach((button) => {
      if (!button.hasAttribute(BUTTON_ATTR) && isLoginSupportButton(button)) setButtonLabel(button);
    });
  }

  function openRemover() {
    if (!runtime?.sendMessage) return;

    runtime.sendMessage({ type: OPEN_REMOVER_MODAL_MESSAGE_TYPE }, (response) => {
      const error = runtime.lastError;
      if (error || !response?.ok || !response?.opened) {
        console.warn("Nao foi possivel abrir o Removedor na pagina ativa.", error || response?.error || response);
      }
    });
  }

  document.addEventListener(
    "click",
    (event) => {
      const button = event.target?.closest?.(`[${BUTTON_ATTR}]`);
      if (!button) return;

      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      openRemover();
    },
    true,
  );

  observer = new MutationObserver(() => ensureRemoverButton());
  observer.observe(document.documentElement, { childList: true, subtree: true, characterData: true });
  ensureRemoverButton();

  globalThis.actoOpenRemover = openRemover;
})();
