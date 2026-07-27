(() => {
  if (globalThis.__ACTO_PUBLISH_PROJECT_BRIDGE__) return;
  globalThis.__ACTO_PUBLISH_PROJECT_BRIDGE__ = true;

  const MESSAGE_TYPE = "ACTO_PUBLISH_LOVABLE_PROJECT";
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

  function slugify(value, fallback = "") {
    const base = String(value || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .replace(/-{2,}/g, "-")
      .slice(0, 50)
      .replace(/^-+|-+$/g, "");
    return base || fallback;
  }

  function suggestProjectSlug() {
    const fromHost = (() => {
      try {
        const host = location.hostname || "";
        if (host.endsWith(".lovable.app") && host !== "lovable.app") return host.replace(/\.lovable\.app$/i, "");
      } catch {}
      return "";
    })();
    if (fromHost) return slugify(fromHost);

    const title = String(document.title || "")
      .replace(/\s+[-|]\s+Lovable.*$/i, "")
      .replace(/\s+[-|]\s+lovable\.dev.*$/i, "")
      .trim();
    const fromTitle = slugify(title);
    if (fromTitle && !/^(lovable|app|project|dashboard)$/i.test(fromTitle)) return fromTitle;
    return "";
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

  function buttonStyle(main) {
    return [
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
  }

  function renderModal(state = {}) {
    const status = String(state.status || "form");
    const message = String(state.message || "Revise a URL antes de publicar.");
    const projectUrl = String(state.projectUrl || "");
    const publishName = slugify(state.publishName || suggestProjectSlug());
    const isError = status === "error";
    const isCompleted = status === "completed";
    const isRunning = status === "running";
    const isForm = status === "form";
    const colors = themeColors();
    const main = isError ? "#ef4444" : colors.main;
    const bg = isError ? "#7f1d1d" : colors.bg;
    const title = isForm ? "Publicar projeto" : isCompleted ? "Projeto publicado" : isRunning ? "Publicacao em andamento" : isError ? "Falha ao publicar" : "Publicando projeto";
    const mark = isForm ? "URL" : status === "loading" ? "..." : isError ? "!" : isCompleted ? "OK" : "...";
    const safeUrl = escapeHtml(projectUrl);
    const canOpen = projectUrl && isPublishedLovableUrl(projectUrl);
    const baseButtonStyle = buttonStyle(main);

    let modal = document.getElementById("acto-publish-direct-modal");
    if (!modal) {
      modal = document.createElement("div");
      modal.id = "acto-publish-direct-modal";
      document.body.appendChild(modal);
    }

    modal.innerHTML = `
      <div style="position:fixed;inset:0;z-index:2147483646;display:flex;align-items:center;justify-content:center;padding:16px;background:rgba(0,0,0,.72);backdrop-filter:blur(6px)">
        <div style="position:relative;width:min(380px,100%);border:1px solid ${main}99;border-radius:14px;padding:22px 18px 18px;text-align:center;background:${bg}f2;box-shadow:0 0 50px rgba(0,0,0,.55);font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace">
          <button type="button" data-acto-publish-close style="position:absolute;right:10px;top:10px;width:28px;height:28px;border:1px solid ${main}66;border-radius:8px;background:rgba(255,255,255,.06);color:white;font-size:12px;font-weight:800;cursor:pointer">X</button>
          <div style="width:46px;height:46px;margin:0 auto 16px;display:grid;place-items:center;border:1px solid ${main}99;border-radius:999px;background:rgba(255,255,255,.06);color:white;font-size:11px;font-weight:900">${mark}</div>
          <h2 style="margin:0 0 10px;color:white;font-size:12px;font-weight:900;text-transform:uppercase;letter-spacing:.2em">${escapeHtml(title)}</h2>
          <p style="margin:0 0 16px;color:rgba(255,255,255,.76);font-size:11px;line-height:1.55">${escapeHtml(message)}</p>
          ${isForm ? `
            <label style="display:block;margin:0 0 7px;color:rgba(255,255,255,.76);font-size:9px;font-weight:800;text-align:left;text-transform:uppercase;letter-spacing:.14em">URL do projeto</label>
            <div style="display:flex;align-items:center;border:1px solid ${main}66;border-radius:9px;background:rgba(0,0,0,.22);overflow:hidden;margin-bottom:9px">
              <input data-acto-publish-slug value="${escapeHtml(publishName)}" placeholder="meu-projeto" maxlength="50" spellcheck="false" style="min-width:0;flex:1;height:38px;border:0;background:transparent;color:white;padding:0 10px;font-size:12px;font-weight:800;outline:none;font-family:inherit" />
              <span style="padding-right:10px;color:rgba(255,255,255,.54);font-size:10px;white-space:nowrap">.lovable.app</span>
            </div>
            <div data-acto-publish-preview style="margin-bottom:14px;border:1px solid ${main}44;border-radius:8px;background:rgba(255,255,255,.04);padding:8px 10px;color:rgba(255,255,255,.72);font-size:10px;line-height:1.45;word-break:break-all">https://${escapeHtml(publishName || "meu-projeto")}.lovable.app</div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
              <button type="button" data-acto-publish-close style="${baseButtonStyle}">Cancelar</button>
              <button type="button" data-acto-publish-confirm style="${baseButtonStyle};border-color:${main};background:rgba(255,255,255,.14)">Publicar</button>
            </div>
          ` : canOpen ? `
            <div style="margin-bottom:14px;border:1px solid ${main}55;border-radius:8px;background:rgba(0,0,0,.22);padding:9px 10px;color:rgba(255,255,255,.82);font-size:10px;line-height:1.45;word-break:break-all">${safeUrl}</div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
              <button type="button" data-acto-publish-copy style="${baseButtonStyle}">Copiar link</button>
              <button type="button" data-acto-publish-open style="${baseButtonStyle};border-color:${main};background:rgba(255,255,255,.14)">Abrir site</button>
            </div>
          ` : `
            <button type="button" data-acto-publish-close style="${baseButtonStyle};width:100%">Fechar</button>
          `}
        </div>
      </div>
    `;

    modal.querySelectorAll("[data-acto-publish-close]").forEach((button) => {
      button.addEventListener("click", () => {
        if (!busy || isError || isCompleted) removeModal();
      });
    });

    const input = modal.querySelector("[data-acto-publish-slug]");
    const preview = modal.querySelector("[data-acto-publish-preview]");
    if (input && preview) {
      const updatePreview = () => {
        const clean = slugify(input.value);
        if (input.value !== clean) input.value = clean;
        preview.textContent = `https://${clean || "meu-projeto"}.lovable.app`;
      };
      input.addEventListener("input", updatePreview);
      input.addEventListener("blur", updatePreview);
      setTimeout(() => input.focus(), 30);
    }

    modal.querySelector("[data-acto-publish-confirm]")?.addEventListener("click", () => {
      const value = slugify(modal.querySelector("[data-acto-publish-slug]")?.value || "");
      if (!value || value.length < 3) {
        renderModal({ status: "error", message: "Informe uma URL com pelo menos 3 caracteres." });
        return;
      }
      publishWithSlug(value);
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
    if (button) {
      button.disabled = value;
      button.style.opacity = value ? ".55" : "";
      button.style.pointerEvents = value ? "none" : "";
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

  let activeButton = null;

  async function publishWithSlug(publishName) {
    if (busy) return;

    setButtonBusy(activeButton, true);
    renderModal({ status: "loading", message: `Preparando publicacao em https://${publishName}.lovable.app...`, publishName });

    try {
      const response = await sendRuntimeMessage({
        type: MESSAGE_TYPE,
        publishName,
        projectName: publishName,
        currentLovableUrl: location.href,
      });
      if (!response?.ok && response?.sucesso !== true && response?.success !== true) {
        throw new Error(response?.error || response?.message || "Falha ao publicar projeto.");
      }

      const status = response.status === "completed" ? "completed" : "running";
      renderModal({
        status,
        message: response.message || (status === "completed" ? "Projeto publicado." : "Publicacao em andamento..."),
        projectUrl: response.projectUrl || `https://${publishName}.lovable.app`,
        publishName,
      });
    } catch (error) {
      renderModal({ status: "error", message: error?.message || "Falha ao publicar projeto.", publishName });
    } finally {
      setButtonBusy(activeButton, false);
    }
  }

  function handlePublishProject(event, button) {
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation?.();

    if (busy || button.disabled) return;
    activeButton = button;
    renderModal({ status: "form", publishName: suggestProjectSlug() });
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
