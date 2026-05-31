(() => {
  if (globalThis.__ACTO_CREATE_PROJECT_BRIDGE__) return;
  globalThis.__ACTO_CREATE_PROJECT_BRIDGE__ = true;

  const MESSAGE_TYPE = "ACTO_CREATE_LOVABLE_PROJECT";
  const PROMPT_PLACEHOLDER = "Descreva o app que deseja criar";
  const NAME_PLACEHOLDER = "Meu projeto";
  const CREATE_PROJECT_LABELS = ["CRIAR PROJETO", "Criar Projeto"];
  const CONFIRM_LABELS = ["CONFIRMAR", "Confirmar"];
  const ACTION_LABELS = ["CANCELAR", "CONFIRMAR", "FECHAR", "ABRIR PROJETO", "Cancelar", "Confirmar", "Fechar", "Abrir projeto"];
  let busy = false;

  function normalizeText(value) {
    return String(value || "").replace(/\s+/g, " ").trim();
  }

  function alternatives(source) {
    return globalThis.actoI18nAlternatives?.(source) || [source];
  }

  function matchesKnown(value, sources, options = {}) {
    const text = normalizeText(value);
    const haystack = options.includes ? text.toUpperCase() : text.toUpperCase();
    return sources.some((source) =>
      alternatives(source).some((option) => {
        const target = normalizeText(option).toUpperCase();
        return options.includes ? haystack.includes(target) : haystack === target;
      }),
    );
  }

  function originalAttr(element, attr) {
    return globalThis.actoI18nOriginalAttr?.(element, attr) || element?.getAttribute?.(attr) || "";
  }

  function placeholderIncludes(element, source) {
    return [element?.getAttribute?.("placeholder"), originalAttr(element, "placeholder")].some((value) =>
      alternatives(source).some((option) => normalizeText(value).includes(normalizeText(option))),
    );
  }

  function findCreateProjectModal() {
    const textarea = Array.from(document.querySelectorAll("textarea")).find((item) =>
      placeholderIncludes(item, PROMPT_PLACEHOLDER),
    );
    if (!textarea) return null;

    let current = textarea;
    while (current && current !== document.body) {
      if (matchesKnown(current.textContent, CREATE_PROJECT_LABELS, { includes: true })) return current;
      current = current.parentElement;
    }

    return textarea.closest("div");
  }

  function findFields(modal) {
    const nameInput =
      Array.from(modal.querySelectorAll("input")).find((item) =>
        placeholderIncludes(item, NAME_PLACEHOLDER),
      ) || modal.querySelector("input");
    const promptInput =
      Array.from(modal.querySelectorAll("textarea")).find((item) =>
        placeholderIncludes(item, PROMPT_PLACEHOLDER),
      ) || modal.querySelector("textarea");

    return {
      nameInput,
      promptInput,
      projectName: String(nameInput?.value || "").trim(),
      initialPrompt: String(promptInput?.value || "").trim(),
    };
  }

  function ensureStatus(modal) {
    let status = modal.querySelector(".acto-create-project-direct-status");
    if (status) return status;

    status = document.createElement("div");
    status.className = "acto-create-project-direct-status";
    status.style.marginTop = "12px";
    status.style.border = "1px solid rgba(96, 165, 250, .28)";
    status.style.borderRadius = "6px";
    status.style.background = "rgba(15, 23, 42, .72)";
    status.style.padding = "9px 10px";
    status.style.color = "#bfdbfe";
    status.style.font = "700 9px/1.45 ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";
    status.style.letterSpacing = ".16em";
    status.style.textTransform = "uppercase";

    const actionRow = Array.from(modal.querySelectorAll("button"))
      .filter((button) => matchesKnown(button.textContent, ACTION_LABELS))
      .at(-1)
      ?.parentElement;
    if (actionRow?.parentElement) {
      actionRow.parentElement.insertBefore(status, actionRow);
    } else {
      modal.appendChild(status);
    }

    return status;
  }

  function setStatus(modal, type, message, detail = "") {
    const status = ensureStatus(modal);
    const palette = {
      loading: ["rgba(96, 165, 250, .28)", "rgba(30, 58, 138, .24)", "#bfdbfe"],
      success: ["rgba(52, 211, 153, .34)", "rgba(6, 78, 59, .32)", "#bbf7d0"],
      error: ["rgba(248, 113, 113, .35)", "rgba(127, 29, 29, .28)", "#fecaca"],
    }[type] || ["rgba(96, 165, 250, .28)", "rgba(15, 23, 42, .72)", "#bfdbfe"];

    status.style.borderColor = palette[0];
    status.style.background = palette[1];
    status.style.color = palette[2];
    status.textContent = detail ? `${message} - ${detail}` : message;
  }

  function setBusy(modal, confirmButton, value) {
    busy = value;
    confirmButton.disabled = value;
    confirmButton.style.opacity = value ? ".65" : "";
    confirmButton.textContent = value ? "Criando..." : "Confirmar";

    for (const field of modal.querySelectorAll("input, textarea")) {
      field.disabled = value;
      field.style.opacity = value ? ".65" : "";
    }
  }

  function sendRuntimeMessage(payload) {
    return new Promise((resolve, reject) => {
      if (!chrome?.runtime?.sendMessage) {
        reject(new Error("Runtime ACTO indisponivel."));
        return;
      }

      chrome.runtime.sendMessage(payload, (response) => {
        const runtimeError = chrome.runtime.lastError;
        if (runtimeError) {
          reject(new Error(runtimeError.message || "Falha no runtime ACTO."));
          return;
        }
        resolve(response || {});
      });
    });
  }

  async function handleCreateProject(event, confirmButton, modal) {
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation?.();

    if (busy) return;

    const { projectName, initialPrompt } = findFields(modal);
    if (!projectName || !initialPrompt) {
      setStatus(modal, "error", "Informe nome do projeto e prompt inicial.");
      return;
    }

    setBusy(modal, confirmButton, true);
    setStatus(modal, "loading", "Criando projeto...");

    let created = false;
    try {
      const response = await sendRuntimeMessage({
        type: MESSAGE_TYPE,
        projectName,
        initialPrompt,
      });

      if (!response?.ok && response?.sucesso !== true && response?.success !== true) {
        throw new Error(response?.error || response?.message || "Falha ao criar projeto.");
      }

      created = true;
      if (response.stopped === false) {
        setStatus(modal, "error", "Projeto criado, mas stop falhou", response.stopError || "");
      } else {
        setStatus(modal, "success", response.message || "Projeto criado e stop enviado", response.projectName || projectName);
      }
      confirmButton.disabled = true;
      confirmButton.textContent = "Criado";
      if (response.projectUrl) {
        chrome.tabs?.create?.({ url: response.projectUrl });
      }
    } catch (error) {
      setStatus(modal, "error", error?.message || "Falha ao criar projeto.");
    } finally {
      if (created) {
        busy = false;
      } else {
        setBusy(modal, confirmButton, false);
      }
    }
  }

  document.addEventListener(
    "click",
    (event) => {
      const button = event.target?.closest?.("button");
      if (!button || !matchesKnown(button.textContent, CONFIRM_LABELS)) return;

      const modal = findCreateProjectModal();
      if (!modal || !modal.contains(button)) return;

      handleCreateProject(event, button, modal);
    },
    true,
  );
})();
