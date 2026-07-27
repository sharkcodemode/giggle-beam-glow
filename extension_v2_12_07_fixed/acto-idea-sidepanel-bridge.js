(() => {
  "use strict";

  if (globalThis.__ACTO_IDEA_SIDEPANEL_BRIDGE__) return;
  globalThis.__ACTO_IDEA_SIDEPANEL_BRIDGE__ = true;

  const USE_PROMPT_MESSAGE = "ACTO_IDEA_USE_PROMPT";

  function findPromptTextarea() {
    const candidates = Array.from(document.querySelectorAll("textarea"));
    return (
      candidates.find((element) =>
        String(element.getAttribute("placeholder") || "")
          .toLowerCase()
          .includes("enviando prompt"),
      ) ||
      candidates.find((element) => element.offsetParent !== null) ||
      candidates[0] ||
      null
    );
  }

  function applyPrompt(prompt) {
    const value = String(prompt || "").trim();
    if (!value) return false;

    if (typeof globalThis.__ACTO_APPLY_IDEA_PROMPT__ === "function") {
      globalThis.__ACTO_APPLY_IDEA_PROMPT__(value);
      return true;
    }

    const textarea = findPromptTextarea();
    if (!textarea) return false;

    const descriptor = Object.getOwnPropertyDescriptor(
      HTMLTextAreaElement.prototype,
      "value",
    );
    if (descriptor?.set) descriptor.set.call(textarea, value);
    else textarea.value = value;

    textarea.dispatchEvent(new Event("input", { bubbles: true }));
    textarea.dispatchEvent(new Event("change", { bubbles: true }));
    textarea.focus();
    textarea.setSelectionRange?.(value.length, value.length);
    return true;
  }

  chrome.runtime?.onMessage?.addListener?.((message, _sender, sendResponse) => {
    if (message?.type !== USE_PROMPT_MESSAGE) return false;

    const applied = applyPrompt(message.prompt);
    sendResponse({
      ok: applied,
      error: applied ? undefined : "Campo principal de prompt não encontrado.",
    });
    return false;
  });
})();
