(() => {
  if (globalThis.__ACTO_PASTE_ATTACHMENT_BRIDGE__) return;
  globalThis.__ACTO_PASTE_ATTACHMENT_BRIDGE__ = true;

  const FILE_INPUT_SELECTOR = 'input#file-upload[type="file"], input[type="file"][multiple]';
  const PROMPT_TEXTAREA_PLACEHOLDER = "Enviando prompt em modo Think";

  function isEditableTarget(target) {
    const element = target?.closest?.("textarea, input, [contenteditable='true'], [contenteditable='']");
    if (!element) return false;
    if (element.matches?.("textarea")) return true;
    if (element.matches?.("[contenteditable='true'], [contenteditable='']")) return true;
    const type = String(element.getAttribute("type") || "text").toLowerCase();
    return !["button", "checkbox", "file", "radio", "submit"].includes(type);
  }

  function isCreateProjectModalTarget(target) {
    const element = target?.closest?.("textarea, input");
    if (!element) return false;
    const placeholder = String(element.getAttribute("placeholder") || "");
    return placeholder.includes("Meu projeto") || placeholder.includes("Descreva o app que deseja criar");
  }

  function findAttachmentInput() {
    const inputs = Array.from(document.querySelectorAll(FILE_INPUT_SELECTOR));
    return inputs.find((input) => input.id === "file-upload") || inputs[0] || null;
  }

  function findPromptTextarea() {
    return (
      Array.from(document.querySelectorAll("textarea")).find((textarea) =>
        String(textarea.getAttribute("placeholder") || "").includes(PROMPT_TEXTAREA_PLACEHOLDER),
      ) || document.activeElement?.closest?.("textarea")
    );
  }

  function filesFromClipboard(event) {
    const clipboard = event.clipboardData;
    if (!clipboard) return [];

    const files = Array.from(clipboard.files || []).filter((file) => file && file.size > 0);
    if (files.length) return files;

    return Array.from(clipboard.items || [])
      .filter((item) => item.kind === "file")
      .map((item) => item.getAsFile?.())
      .filter((file) => file && file.size > 0);
  }

  function withGeneratedNames(files) {
    return files.map((file, index) => {
      const hasUsefulName = file.name && !/^image\.png$/i.test(file.name);
      if (hasUsefulName) return file;

      const extension = String(file.type || "").split("/")[1]?.replace(/[^a-z0-9.+-]/gi, "") || "png";
      const name = `clipboard-${new Date().toISOString().replace(/[:.]/g, "-")}-${index + 1}.${extension}`;
      return new File([file], name, {
        type: file.type || "application/octet-stream",
        lastModified: file.lastModified || Date.now(),
      });
    });
  }

  function assignFilesToInput(input, files) {
    const transfer = new DataTransfer();
    for (const file of files) transfer.items.add(file);
    input.files = transfer.files;
    input.dispatchEvent(new Event("change", { bubbles: true }));
    return transfer.files.length;
  }

  function dispatchDropToTextarea(textarea, files) {
    const transfer = new DataTransfer();
    for (const file of files) transfer.items.add(file);
    const dropEvent = new DragEvent("drop", {
      bubbles: true,
      cancelable: true,
      dataTransfer: transfer,
    });
    textarea.dispatchEvent(dropEvent);
    return transfer.files.length;
  }

  function showPasteHint(count) {
    let hint = document.getElementById("acto-paste-attachment-hint");
    if (!hint) {
      hint = document.createElement("div");
      hint.id = "acto-paste-attachment-hint";
      hint.style.position = "fixed";
      hint.style.left = "50%";
      hint.style.bottom = "18px";
      hint.style.transform = "translateX(-50%)";
      hint.style.zIndex = "220";
      hint.style.maxWidth = "calc(100vw - 24px)";
      hint.style.border = "1px solid rgba(96, 165, 250, .35)";
      hint.style.borderRadius = "8px";
      hint.style.background = "rgba(15, 23, 42, .94)";
      hint.style.boxShadow = "0 12px 28px rgba(0, 0, 0, .35)";
      hint.style.color = "#bfdbfe";
      hint.style.padding = "8px 10px";
      hint.style.font = "800 9px/1.35 ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";
      hint.style.letterSpacing = ".14em";
      hint.style.textTransform = "uppercase";
      hint.style.pointerEvents = "none";
      document.body.appendChild(hint);
    }

    hint.textContent = count === 1 ? "Arquivo colado como anexo" : `${count} arquivos colados como anexos`;
    clearTimeout(showPasteHint.timer);
    showPasteHint.timer = setTimeout(() => hint.remove(), 1800);
  }

  function handlePaste(event) {
    const files = withGeneratedNames(filesFromClipboard(event));
    if (!files.length) return;
    if (isCreateProjectModalTarget(event.target)) return;

    const input = findAttachmentInput();
    const textarea = findPromptTextarea();
    if (!input && !textarea) return;

    event.preventDefault();
    event.stopPropagation();

    let attachedCount = 0;
    try {
      attachedCount = input ? assignFilesToInput(input, files) : dispatchDropToTextarea(textarea, files);
    } catch {
      if (textarea) attachedCount = dispatchDropToTextarea(textarea, files);
    }

    if (attachedCount > 0) showPasteHint(attachedCount);
  }

  document.addEventListener("paste", handlePaste, true);
})();
