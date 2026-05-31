(() => {
  if (globalThis.__ACTO_PUBLISH_PROJECT_BRIDGE__) return;
  globalThis.__ACTO_PUBLISH_PROJECT_BRIDGE__ = true;

  const MESSAGE_TYPE = "ACTO_PUBLISH_LOVABLE_PROJECT";
  const BUTTON_LABEL = "PUBLICAR PROJETO";
  const BUTTON_LABELS = ["PUBLICAR PROJETO", "Publicar Projeto"];
  let busy = false;

  function normalizeText(value) {
    return String(value || "").replace(/\s+/g, " ").trim();
  }

  function alternatives(source) {
    return globalThis.actoI18nAlternatives?.(source) || [source];
  }

  function originalAttr(element, attr) {
    return globalThis.actoI18nOriginalAttr?.(element, attr) || element?.getAttribute?.(attr) || "";
  }

  function matchesKnown(value, sources, options = {}) {
    const text = normalizeText(value).toUpperCase();
    return sources.some((source) =>
      alternatives(source).some((option) => {
        const target = normalizeText(option).toUpperCase();
        return options.includes ? text.includes(target) : text === target;
      }),
    );
  }

  function escapeHtml(value) {
    return String(value || "").replace(/[&<>"']/g, (char) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;",
    })[char]);
  }

  function isPublishedLovableUrl(value) {
    try {
      const url = new URL(value);
      return url.protocol === "https:" && (url.hostname === "lovable.app" || url.hostname.endsWith(".lovable.app"));
    } catch {
      return false;
    }
  }

  function isPublishProjectButton(button) {
    if (!button) return false;
    const title = originalAttr(button, "title");
    const ariaLabel = originalAttr(button, "aria-label");
    const label = button.textContent;
    return matchesKnown(title, BUTTON_LABELS) || matchesKnown(ariaLabel, BUTTON_LABELS) || matchesKnown(label, BUTTON_LABELS, { includes: true });
  }

  function themeColors() {
    const text = document.body?.textContent || "";
    if (matchesKnown(text, ["Dark Purple"], { includes: true })) return { main: "#a855f7", bg: "#1a0b2e" };
    if (matchesKnown(text, ["Dark Green"], { includes: true })) return { main: "#34d399", bg: "#021002" };
    return { main: "#60a5fa", bg: "#0f172a" };
  }

  function removeModal() {
    document.getElementById("acto-publish-direct-modal")?.remove();
  }

  function showModal(state = {}) {
    const status = String(state.status || "loading");
    const message = String(state.message || "Publicando projeto...");
    const projectUrl = String(state.projectUrl || "");
    const isError = status === "error";
    const isCompleted = status === "completed";
    const isRunning = status === "running";
    const colors = themeColors();
    const main = isError ? "#ef4444" : colors.main;
    const bg = isError ? "#7f1d1d" : colors.bg;
    const title = isCompleted ? "Projeto publicado" : isRunning ? "Publicacao em andamento" : isError ? "Falha ao publicar" : "Publicando projeto";
    const mark = status === "loading" ? "..." : isError ? "!" : isCompleted ? "OK" : "...";
    const safeUrl = escapeHtml(projectUrl);
    const canOpen = projectUrl && isPublishedLovableUrl(projectUrl);
    const buttonStyle = [
      `border:1px solid ${main}88`,
      "background:rgba(255,255,255,.08)",
      "color:white",
      "border-radius:8px",
      "height:34px",
      "font-size:9px",
      "font-weight:800",
      "text-transform:uppercase",
      "letter-spacing:.12em",
      "cursor:pointer",
    ].join(";");

    let modal = document.getElementById("acto-publish-direct-modal");
    if (!modal) {
      modal = document.createElement("div");
      modal.id = "acto-publish-direct-modal";
      document.body.appendChild(modal);
    }

    modal.innerHTML = `
      <div style="position:fixed;inset:0;z-index:160;display:flex;align-items:center;justify-content:center;padding:16px;background:rgba(0,0,0,.72);backdrop-filter:blur(6px)">
        <div style="position:relative;width:min(340px,100%);border:1px solid ${main}99;border-radius:14px;padding:22px 18px 18px;text-align:center;background:${bg}f2;box-shadow:0 0 50px rgba(0,0,0,.55);font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace">
          <button type="button" data-acto-publish-close style="position:absolute;right:10px;top:10px;width:28px;height:28px;border:1px solid ${main}66;border-radius:8px;background:rgba(255,255,255,.06);color:white;font-size:12px;font-weight:800;cursor:pointer">X</button>
          <div style="width:46px;height:46px;margin:0 auto 16px;display:grid;place-items:center;border:1px solid ${main}99;border-radius:999px;background:rgba(255,255,255,.06);color:white;font-size:13px;font-weight:900">${mark}</div>
          <h2 style="margin:0 0 10px;color:white;font-size:12px;font-weight:900;text-transform:uppercase;letter-spacing:.2em">${escapeHtml(title)}</h2>
          <p style="margin:0 0 16px;color:rgba(255,255,255,.76);font-size:11px;line-height:1.55">${escapeHtml(message)}</p>
          ${canOpen ? `
            <div style="margin-bottom:14px;border:1px solid ${main}55;border-radius:8px;background:rgba(0,0,0,.22);padding:9px 10px;color:rgba(255,255,255,.82);font-size:10px;line-height:1.45;word-break:break-all">${safeUrl}</div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
              <button type="button" data-acto-publish-copy style="${buttonStyle}">Copiar link</button>
              <button type="button" data-acto-publish-open style="${buttonStyle};border-color:${main};background:rgba(255,255,255,.14)">Abrir site</button>
            </div>
          ` : `
            <button type="button" data-acto-publish-close style="${buttonStyle};width:100%">Fechar</button>
          `}
        </div>
      </div>
    `;

    modal.querySelectorAll("[data-acto-publish-close]").forEach((button) => {
      button.addEventListener("click", removeModal);
    });
    modal.querySelector("[data-acto-publish-open]")?.addEventListener("click", () => {
      chrome?.tabs?.create ? chrome.tabs.create({ url: projectUrl }) : window.open(projectUrl, "_blank", "noopener,noreferrer");
    });
    modal.querySelector("[data-acto-publish-copy]")?.addEventListener("click", async () => {
      try {
        await navigator.clipboard?.writeText(projectUrl);
      } catch {}
    });
  }

  function setButtonBusy(button, value) {
    busy = value;
    button.disabled = value;
    button.style.opacity = value ? ".55" : "";
    button.style.pointerEvents = value ? "none" : "";
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

  async function handlePublishProject(event, button) {
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation?.();

    if (busy || button.disabled) return;

    setButtonBusy(button, true);
    showModal({ status: "loading", message: "Publicando projeto..." });

    try {
      const response = await sendRuntimeMessage({ type: MESSAGE_TYPE });
      if (!response?.ok && response?.sucesso !== true && response?.success !== true) {
        throw new Error(response?.error || response?.message || "Falha ao publicar projeto.");
      }

      const status = response.status === "completed" ? "completed" : "running";
      showModal({
        status,
        message: response.message || (status === "completed" ? "Projeto publicado." : "Publicacao em andamento..."),
        projectUrl: response.projectUrl || "",
      });
    } catch (error) {
      showModal({ status: "error", message: error?.message || "Falha ao publicar projeto." });
    } finally {
      setButtonBusy(button, false);
    }
  }

  document.addEventListener(
    "click",
    (event) => {
      const button = event.target?.closest?.("button");
      if (!isPublishProjectButton(button)) return;
      handlePublishProject(event, button);
    },
    true,
  );
})();
