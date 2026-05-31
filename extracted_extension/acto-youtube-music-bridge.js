(() => {
  if (globalThis.__ACTO_YOUTUBE_MUSIC_BRIDGE__) return;
  globalThis.__ACTO_YOUTUBE_MUSIC_BRIDGE__ = true;

  const SEARCH_MESSAGE_TYPE = "ACTO_YOUTUBE_SEARCH";
  const OPEN_YOUTUBE_MESSAGE_TYPE = "ACTO_MUSIC_OPEN_YOUTUBE_POPUP";
  const PLAY_ON_PAGE_MESSAGE_TYPE = "ACTO_MUSIC_PLAY_ON_LOVABLE_PAGE";
  const STYLE_ID = "acto-youtube-music-bridge-style";
  const MODAL_ID = "acto-youtube-music-bridge-modal";
  const YOUTUBE_HOME = "https://www.youtube.com/";

  let modal = null;
  let input = null;
  let status = null;
  let list = null;
  let iframe = null;
  let playerEmpty = null;
  let nowTitle = null;
  let nowMeta = null;
  let busy = false;
  let lastQuery = "";
  let results = [];
  let currentResult = null;

  function normalizeText(value) {
    return String(value || "").replace(/\s+/g, " ").trim();
  }

  function alternatives(source) {
    return globalThis.actoI18nAlternatives?.(source) || [source];
  }

  function originalAttr(element, attr) {
    return globalThis.actoI18nOriginalAttr?.(element, attr) || element?.getAttribute?.(attr) || "";
  }

  function matchesKnown(value, source) {
    const text = normalizeText(value).toUpperCase();
    return alternatives(source).some((option) => text === normalizeText(option).toUpperCase());
  }

  function youtubeSearchUrl(query) {
    const trimmed = normalizeText(query);
    return trimmed ? `https://www.youtube.com/results?search_query=${encodeURIComponent(trimmed)}` : YOUTUBE_HOME;
  }

  function sendRuntimeMessage(payload) {
    return new Promise((resolve, reject) => {
      const runtime = globalThis.chrome?.runtime;
      if (!runtime?.sendMessage) {
        reject(new Error("Runtime da extensao indisponivel."));
        return;
      }

      runtime.sendMessage(payload, (response) => {
        const error = runtime.lastError;
        if (error) {
          reject(new Error(error.message || "Falha ao falar com a extensao."));
          return;
        }

        resolve(response || {});
      });
    });
  }

  function ensureStyles() {
    if (document.getElementById(STYLE_ID)) return;

    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
      #${MODAL_ID} {
        position: fixed;
        inset: 0;
        z-index: 2147483600;
        display: flex;
        align-items: stretch;
        justify-content: center;
        padding: 12px;
        background: rgba(0, 0, 0, .72);
        color: #eef6ff;
        font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
      }
      #${MODAL_ID} * { box-sizing: border-box; }
      #${MODAL_ID} .acto-yt-panel {
        width: min(980px, 100%);
        height: min(720px, calc(100vh - 24px));
        min-height: 420px;
        display: flex;
        flex-direction: column;
        overflow: hidden;
        border: 1px solid rgba(96, 165, 250, .30);
        border-radius: 8px;
        background: rgba(6, 12, 24, .98);
        box-shadow: 0 20px 60px rgba(0, 0, 0, .65);
      }
      #${MODAL_ID} .acto-yt-header,
      #${MODAL_ID} .acto-yt-search {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 10px 12px;
        border-bottom: 1px solid rgba(96, 165, 250, .20);
      }
      #${MODAL_ID} .acto-yt-header {
        justify-content: space-between;
        min-height: 48px;
      }
      #${MODAL_ID} .acto-yt-title {
        min-width: 0;
        display: flex;
        align-items: center;
        gap: 8px;
        color: #fff;
        font-size: 12px;
        font-weight: 900;
        letter-spacing: .16em;
        text-transform: uppercase;
      }
      #${MODAL_ID} .acto-yt-logo {
        display: inline-flex;
        width: 24px;
        height: 24px;
        align-items: center;
        justify-content: center;
        border: 1px solid rgba(239, 68, 68, .55);
        border-radius: 6px;
        color: #fecaca;
        background: rgba(127, 29, 29, .45);
        font-size: 11px;
      }
      #${MODAL_ID} .acto-yt-actions {
        display: flex;
        align-items: center;
        gap: 6px;
      }
      #${MODAL_ID} button,
      #${MODAL_ID} input {
        font: inherit;
      }
      #${MODAL_ID} button {
        border: 1px solid rgba(96, 165, 250, .30);
        border-radius: 6px;
        background: rgba(30, 58, 138, .28);
        color: #bfdbfe;
        cursor: pointer;
        transition: background .16s ease, border-color .16s ease, color .16s ease, transform .16s ease;
      }
      #${MODAL_ID} button:hover {
        border-color: rgba(147, 197, 253, .65);
        background: rgba(37, 99, 235, .36);
        color: #fff;
      }
      #${MODAL_ID} button:active { transform: translateY(1px); }
      #${MODAL_ID} button:disabled {
        cursor: not-allowed;
        opacity: .55;
        transform: none;
      }
      #${MODAL_ID} .acto-yt-action {
        height: 30px;
        padding: 0 10px;
        font-size: 9px;
        font-weight: 900;
        letter-spacing: .12em;
        text-transform: uppercase;
        white-space: nowrap;
      }
      #${MODAL_ID} .acto-yt-close {
        width: 30px;
        padding: 0;
        color: #fecaca;
        border-color: rgba(248, 113, 113, .35);
        background: rgba(127, 29, 29, .24);
      }
      #${MODAL_ID} .acto-yt-close:hover {
        border-color: rgba(248, 113, 113, .70);
        background: rgba(185, 28, 28, .42);
      }
      #${MODAL_ID} .acto-yt-search input {
        min-width: 0;
        flex: 1;
        height: 36px;
        border: 1px solid rgba(96, 165, 250, .28);
        border-radius: 6px;
        outline: none;
        background: rgba(2, 6, 23, .78);
        color: #dbeafe;
        padding: 0 10px;
        font-size: 12px;
      }
      #${MODAL_ID} .acto-yt-search input:focus {
        border-color: rgba(147, 197, 253, .75);
        box-shadow: 0 0 0 2px rgba(59, 130, 246, .14);
      }
      #${MODAL_ID} .acto-yt-body {
        flex: 1;
        min-height: 0;
        display: grid;
        grid-template-columns: minmax(260px, 360px) minmax(0, 1fr);
      }
      #${MODAL_ID} .acto-yt-results,
      #${MODAL_ID} .acto-yt-player {
        min-width: 0;
        min-height: 0;
      }
      #${MODAL_ID} .acto-yt-results {
        display: flex;
        flex-direction: column;
        border-right: 1px solid rgba(96, 165, 250, .18);
        background: rgba(2, 6, 23, .42);
      }
      #${MODAL_ID} .acto-yt-status {
        min-height: 34px;
        padding: 10px 12px 8px;
        color: rgba(219, 234, 254, .72);
        font-size: 10px;
        line-height: 1.35;
        letter-spacing: .08em;
        text-transform: uppercase;
        border-bottom: 1px solid rgba(96, 165, 250, .12);
      }
      #${MODAL_ID} .acto-yt-status[data-type="error"] { color: #fecaca; }
      #${MODAL_ID} .acto-yt-status[data-type="success"] { color: #bbf7d0; }
      #${MODAL_ID} .acto-yt-list {
        flex: 1;
        min-height: 0;
        overflow: auto;
        padding: 8px;
      }
      #${MODAL_ID} .acto-yt-result {
        width: 100%;
        min-height: 76px;
        display: grid;
        grid-template-columns: 96px minmax(0, 1fr);
        gap: 10px;
        align-items: center;
        margin: 0 0 8px;
        padding: 7px;
        text-align: left;
        color: #dbeafe;
        background: rgba(15, 23, 42, .74);
      }
      #${MODAL_ID} .acto-yt-result[data-active="true"] {
        border-color: rgba(52, 211, 153, .70);
        background: rgba(6, 78, 59, .30);
        color: #fff;
      }
      #${MODAL_ID} .acto-yt-thumb {
        width: 96px;
        aspect-ratio: 16 / 9;
        object-fit: cover;
        border-radius: 4px;
        background: rgba(15, 23, 42, .95);
      }
      #${MODAL_ID} .acto-yt-result-title {
        min-width: 0;
        color: inherit;
        font-size: 11px;
        font-weight: 800;
        line-height: 1.3;
        overflow-wrap: anywhere;
      }
      #${MODAL_ID} .acto-yt-result-meta {
        margin-top: 5px;
        color: rgba(191, 219, 254, .62);
        font-size: 9px;
        line-height: 1.35;
        overflow-wrap: anywhere;
      }
      #${MODAL_ID} .acto-yt-player {
        display: flex;
        flex-direction: column;
        padding: 12px;
        gap: 10px;
      }
      #${MODAL_ID} .acto-yt-frame-wrap {
        position: relative;
        width: 100%;
        aspect-ratio: 16 / 9;
        min-height: 190px;
        overflow: hidden;
        border: 1px solid rgba(96, 165, 250, .22);
        border-radius: 8px;
        background: #020617;
      }
      #${MODAL_ID} .acto-yt-empty {
        position: absolute;
        inset: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 16px;
        color: rgba(219, 234, 254, .62);
        font-size: 10px;
        letter-spacing: .12em;
        text-align: center;
        text-transform: uppercase;
      }
      #${MODAL_ID} iframe {
        width: 100%;
        height: 100%;
        border: 0;
        display: block;
      }
      #${MODAL_ID} .acto-yt-now {
        min-height: 54px;
        border: 1px solid rgba(96, 165, 250, .18);
        border-radius: 8px;
        padding: 10px;
        background: rgba(15, 23, 42, .55);
      }
      #${MODAL_ID} .acto-yt-now-title {
        min-width: 0;
        color: #fff;
        font-size: 12px;
        font-weight: 900;
        line-height: 1.35;
        overflow-wrap: anywhere;
      }
      #${MODAL_ID} .acto-yt-now-meta {
        margin-top: 5px;
        color: rgba(191, 219, 254, .62);
        font-size: 10px;
        line-height: 1.35;
        overflow-wrap: anywhere;
      }
      @media (max-width: 720px) {
        #${MODAL_ID} {
          padding: 8px;
        }
        #${MODAL_ID} .acto-yt-panel {
          height: calc(100vh - 16px);
          min-height: 0;
        }
        #${MODAL_ID} .acto-yt-header {
          align-items: flex-start;
          gap: 10px;
        }
        #${MODAL_ID} .acto-yt-actions {
          flex-wrap: wrap;
          justify-content: flex-end;
        }
        #${MODAL_ID} .acto-yt-action {
          height: 28px;
          padding: 0 8px;
          font-size: 8px;
        }
        #${MODAL_ID} .acto-yt-body {
          grid-template-columns: 1fr;
          grid-template-rows: auto minmax(0, 1fr);
        }
        #${MODAL_ID} .acto-yt-player {
          order: -1;
          padding: 10px;
        }
        #${MODAL_ID} .acto-yt-results {
          border-right: 0;
          border-top: 1px solid rgba(96, 165, 250, .18);
        }
        #${MODAL_ID} .acto-yt-frame-wrap {
          min-height: 150px;
        }
      }
    `;

    document.head.appendChild(style);
  }

  function createModal() {
    const root = document.createElement("div");
    root.id = MODAL_ID;
    root.setAttribute("role", "dialog");
    root.setAttribute("aria-modal", "true");
    root.innerHTML = `
      <div class="acto-yt-panel">
        <header class="acto-yt-header">
          <div class="acto-yt-title"><span class="acto-yt-logo">YT</span><span>Music</span></div>
          <div class="acto-yt-actions">
            <button type="button" class="acto-yt-action" data-action="open">Abrir YouTube</button>
            <button type="button" class="acto-yt-action" data-action="mini">PiP</button>
            <button type="button" class="acto-yt-action" data-action="half">-50%</button>
            <button type="button" class="acto-yt-action acto-yt-close" data-action="close" aria-label="Fechar">X</button>
          </div>
        </header>
        <form class="acto-yt-search">
          <input type="search" placeholder="Buscar musica ou video..." autocomplete="off" />
          <button type="submit" class="acto-yt-action">Buscar</button>
        </form>
        <main class="acto-yt-body">
          <section class="acto-yt-results">
            <div class="acto-yt-status">Digite uma busca para encontrar videos.</div>
            <div class="acto-yt-list"></div>
          </section>
          <section class="acto-yt-player">
            <div class="acto-yt-frame-wrap">
              <div class="acto-yt-empty">Selecione um video</div>
              <iframe allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen hidden></iframe>
            </div>
            <div class="acto-yt-now">
              <div class="acto-yt-now-title">Nada tocando agora</div>
              <div class="acto-yt-now-meta">Use a busca e clique em um resultado.</div>
            </div>
          </section>
        </main>
      </div>
    `;

    return root;
  }

  function cacheElements() {
    input = modal.querySelector("input[type='search']");
    status = modal.querySelector(".acto-yt-status");
    list = modal.querySelector(".acto-yt-list");
    iframe = modal.querySelector("iframe");
    playerEmpty = modal.querySelector(".acto-yt-empty");
    nowTitle = modal.querySelector(".acto-yt-now-title");
    nowMeta = modal.querySelector(".acto-yt-now-meta");
  }

  function setStatus(type, message) {
    if (!status) return;
    status.dataset.type = type || "";
    status.textContent = message;
  }

  function setBusy(value) {
    busy = value;
    modal?.querySelectorAll("button").forEach((button) => {
      if (button.dataset.action === "close") return;
      button.disabled = value;
    });
  }

  function resultMeta(result) {
    return [result.channel, result.duration].filter(Boolean).join(" - ");
  }

  async function sendPagePlayerAction(action, result = currentResult) {
    const response = await sendRuntimeMessage({
      type: PLAY_ON_PAGE_MESSAGE_TYPE,
      action,
      result,
    });

    if (!response.ok) throw new Error(response.error || "Falha ao controlar o player.");
    return response;
  }

  function setPlayer(result) {
    currentResult = result || null;

    if (!currentResult) {
      if (iframe) {
        iframe.hidden = true;
        iframe.src = "about:blank";
      }
      if (playerEmpty) playerEmpty.hidden = false;
      if (nowTitle) nowTitle.textContent = "Nada tocando agora";
      if (nowMeta) nowMeta.textContent = "Use a busca e clique em um resultado.";
      return;
    }

    if (iframe) {
      iframe.hidden = true;
      iframe.src = "about:blank";
    }
    if (playerEmpty) {
      playerEmpty.hidden = false;
      playerEmpty.textContent = "Abrindo player na pagina Lovable...";
    }
    if (nowTitle) nowTitle.textContent = currentResult.title || "Video selecionado";
    if (nowMeta) nowMeta.textContent = "O video toca no overlay da pagina Lovable.";

    sendPagePlayerAction("play", currentResult)
      .then(() => {
        if (playerEmpty) playerEmpty.textContent = "Tocando na pagina Lovable. Use PiP ou -50% para minimizar.";
        if (nowMeta) nowMeta.textContent = resultMeta(currentResult) || currentResult.url || "";
        setStatus("success", "Video aberto no player da pagina.");
      })
      .catch((error) => {
        if (playerEmpty) playerEmpty.textContent = "Abra uma aba do Lovable e tente novamente.";
        setStatus("error", error?.message || "Falha ao abrir player na pagina.");
      });
  }

  function renderResults() {
    if (!list) return;
    list.textContent = "";

    for (const result of results) {
      const item = document.createElement("button");
      item.type = "button";
      item.className = "acto-yt-result";
      item.dataset.active = currentResult?.videoId === result.videoId ? "true" : "false";
      item.title = result.title || "Video";

      const thumb = document.createElement("img");
      thumb.className = "acto-yt-thumb";
      thumb.alt = "";
      thumb.loading = "lazy";
      thumb.src = result.thumbnail || result.thumbnailUrl || `https://i.ytimg.com/vi/${result.videoId}/hqdefault.jpg`;
      thumb.addEventListener("error", () => {
        thumb.hidden = true;
      });

      const text = document.createElement("div");
      const title = document.createElement("div");
      title.className = "acto-yt-result-title";
      title.textContent = result.title || "Video";
      const meta = document.createElement("div");
      meta.className = "acto-yt-result-meta";
      meta.textContent = resultMeta(result) || "YouTube";

      text.append(title, meta);
      item.append(thumb, text);
      item.addEventListener("click", () => {
        setStatus("loading", "Abrindo player na pagina Lovable...");
        setPlayer(result);
        renderResults();
      });
      list.appendChild(item);
    }
  }

  async function submitSearch() {
    if (busy) return;

    const query = normalizeText(input?.value);
    if (!query) {
      setStatus("error", "Digite uma busca.");
      input?.focus();
      return;
    }

    lastQuery = query;
    results = [];
    setPlayer(null);
    renderResults();
    setBusy(true);
    setStatus("loading", "Buscando no YouTube...");

    try {
      const response = await sendRuntimeMessage({ type: SEARCH_MESSAGE_TYPE, query });
      if (!response.ok) throw new Error(response.error || "Falha na busca.");

      results = Array.isArray(response.results) ? response.results : [];
      if (!results.length) throw new Error("Nenhum video encontrado.");

      renderResults();
      setStatus("success", `${results.length} resultado${results.length === 1 ? "" : "s"} encontrado${results.length === 1 ? "" : "s"}.`);
    } catch (error) {
      setStatus("error", error?.message || "Falha na busca.");
    } finally {
      setBusy(false);
    }
  }

  async function openYouTube() {
    const targetUrl = currentResult?.url || youtubeSearchUrl(input?.value || lastQuery);
    try {
      await sendRuntimeMessage({ type: OPEN_YOUTUBE_MESSAGE_TYPE, url: targetUrl });
      setStatus("success", "YouTube aberto.");
    } catch {
      window.open(targetUrl, "acto-youtube", "popup,width=430,height=720,left=80,top=80");
    }
  }

  async function openMiniPlayer() {
    if (!currentResult?.videoId) {
      setStatus("error", "Selecione um video antes de abrir o PiP.");
      return;
    }

    try {
      await sendPagePlayerAction("minimize");
      setStatus("success", "PiP aberto na pagina.");
    } catch (error) {
      setStatus("error", error?.message || "Falha ao abrir PiP.");
    }
  }

  async function toggleHalfPlayer() {
    if (!currentResult?.videoId) {
      setStatus("error", "Selecione um video antes de usar -50%.");
      return;
    }

    try {
      await sendPagePlayerAction("toggleSmall");
      setStatus("success", "Modo -50% alternado.");
    } catch (error) {
      setStatus("error", error?.message || "Falha ao alternar -50%.");
    }
  }

  function closeModal() {
    if (iframe) iframe.src = "about:blank";
    modal?.remove();
    modal = null;
    input = null;
    status = null;
    list = null;
    iframe = null;
    playerEmpty = null;
    nowTitle = null;
    nowMeta = null;
    busy = false;
  }

  function openModal() {
    ensureStyles();

    if (modal?.isConnected) {
      modal.querySelector("input[type='search']")?.focus();
      return;
    }

    modal = createModal();
    document.body.appendChild(modal);
    cacheElements();

    if (lastQuery && input) input.value = lastQuery;
    renderResults();
    setPlayer(currentResult);

    modal.querySelector("form")?.addEventListener("submit", (event) => {
      event.preventDefault();
      submitSearch();
    });
    modal.querySelector("[data-action='open']")?.addEventListener("click", openYouTube);
    modal.querySelector("[data-action='mini']")?.addEventListener("click", openMiniPlayer);
    modal.querySelector("[data-action='half']")?.addEventListener("click", toggleHalfPlayer);
    modal.querySelector("[data-action='close']")?.addEventListener("click", closeModal);
    modal.addEventListener("click", (event) => {
      if (event.target === modal) closeModal();
    });

    setTimeout(() => input?.focus(), 0);
  }

  function isMusicDockButton(target) {
    const button = target?.closest?.("button");
    if (!button || modal?.contains(button)) return null;

    const title = originalAttr(button, "title");
    const label = originalAttr(button, "aria-label");
    const text = button.textContent;
    return matchesKnown(title, "Music") || matchesKnown(label, "Music") || matchesKnown(text, "Music") ? button : null;
  }

  document.addEventListener(
    "click",
    (event) => {
      const button = isMusicDockButton(event.target);
      if (!button) return;

      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      openModal();
    },
    true,
  );

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && modal?.isConnected) closeModal();
  });

  globalThis.actoOpenYoutubeMusic = openModal;
})();
