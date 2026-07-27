(() => {
  if (globalThis.__ACTO_NOTES_BRIDGE__) return;
  globalThis.__ACTO_NOTES_BRIDGE__ = true;

  const DOCK_BUTTON_ATTR = "data-acto-notes-dock-button";
  const OPEN_NOTES_MODAL_MESSAGE_TYPE = "ACTO_OPEN_NOTES_MODAL";

  const runtime = globalThis.chrome?.runtime;
  let observer = null;

  function normalizeText(value) {
    return String(value || "").replace(/\s+/g, " ").trim();
  }

  function iconSvg(path, className = "") {
    return `
      <svg class="${className}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="${path}"></path>
      </svg>
    `;
  }

  function notesIcon() {
    return iconSvg("M4 4.5A2.5 2.5 0 0 1 6.5 2H20v17.5A2.5 2.5 0 0 1 17.5 22H6.5A2.5 2.5 0 0 1 4 19.5v-15ZM8 6h8M8 10h8M8 14h5M6.5 2A2.5 2.5 0 0 0 4 4.5v15A2.5 2.5 0 0 1 6.5 17H20", "w-4 h-4");
  }

  function openNotes() {
    if (!runtime?.sendMessage) {
      console.warn("Notas integradas indisponíveis neste contexto.");
      return;
    }

    runtime.sendMessage({ type: OPEN_NOTES_MODAL_MESSAGE_TYPE }, (response) => {
      const error = runtime.lastError;
      if (error || !response?.ok || !response?.opened) {
        console.warn("Nao foi possivel abrir o Notas fora do painel.", error || response?.error || response);
      }
    });
  }

  function setButtonLabel(button) {
    const labels = Array.from(button.querySelectorAll("span"));
    const knownLabel = labels.find((span) => {
      const text = normalizeText(span.textContent);
      return text === "Loja" || text === "Music";
    });

    if (knownLabel) {
      knownLabel.textContent = "Notas";
      return;
    }

    const visibleLabel = labels.find((span) => normalizeText(span.textContent));
    if (visibleLabel) visibleLabel.textContent = "Notas";
  }

  function createNotesDockButton(reference) {
    const button = reference.cloneNode(true);
    button.removeAttribute("data-acto-store-dock-button");
    button.setAttribute(DOCK_BUTTON_ATTR, "1");
    button.setAttribute("title", "Notas");
    button.setAttribute("aria-label", "Notas");
    button.removeAttribute("data-state");

    const firstSvg = button.querySelector("svg");
    if (firstSvg) firstSvg.outerHTML = notesIcon();
    setButtonLabel(button);

    button.addEventListener(
      "click",
      (event) => {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
        openNotes();
      },
      true,
    );

    return button;
  }

  function findReferenceButton() {
    return (
      document.querySelector("[data-acto-store-dock-button]") ||
      document.querySelector('button[title="Loja"]') ||
      document.querySelector('button[aria-label="Loja"]') ||
      document.querySelector('button[title="Music"]') ||
      document.querySelector('button[aria-label="Music"]') ||
      Array.from(document.querySelectorAll("button")).find((button) => {
        const text = normalizeText(button.textContent);
        return text === "Loja" || text === "Music";
      })
    );
  }

  function ensureDockButton() {
    if (document.querySelector(`[${DOCK_BUTTON_ATTR}]`)) return;

    const reference = findReferenceButton();
    const parent = reference?.parentElement;
    if (!reference || !parent) return;

    const button = createNotesDockButton(reference);
    reference.after(button);
  }

  document.addEventListener(
    "click",
    (event) => {
      const button = event.target?.closest?.(`[${DOCK_BUTTON_ATTR}], button[title="Notas"], button[aria-label="Notas"]`);
      if (!button) return;

      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      openNotes();
    },
    true,
  );

  observer = new MutationObserver(() => ensureDockButton());
  observer.observe(document.documentElement, { childList: true, subtree: true });
  ensureDockButton();

  globalThis.actoOpenNotes = openNotes;
})();
