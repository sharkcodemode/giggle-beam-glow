(() => {
  const player = document.getElementById("player");
  const params = new URLSearchParams(window.location.search);
  const videoId = params.get("videoId") || "";

  function showFallback(message) {
    if (!player) return;
    const fallback = document.createElement("div");
    fallback.className = "fallback";
    const text = document.createElement("span");
    text.textContent = message;
    fallback.appendChild(text);

    if (/^[A-Za-z0-9_-]{6,}$/.test(videoId)) {
      const openButton = document.createElement("button");
      openButton.type = "button";
      openButton.textContent = "Abrir no YouTube";
      openButton.addEventListener("click", () => {
        window.open(`https://www.youtube.com/watch?v=${encodeURIComponent(videoId)}`, "_blank", "noopener,noreferrer");
      });
      fallback.appendChild(openButton);
    }

    player.replaceChildren(fallback);
  }

  if (!/^[A-Za-z0-9_-]{6,}$/.test(videoId)) {
    showFallback("Video nao informado");
    return;
  }

  let usedNoCookieFallback = false;
  const iframe = document.createElement("iframe");
  iframe.src = `https://www.youtube.com/embed/${encodeURIComponent(videoId)}?autoplay=1&rel=0`;
  iframe.title = "YouTube Mini Player";
  iframe.allow = "autoplay; encrypted-media; picture-in-picture";
  iframe.referrerPolicy = "strict-origin-when-cross-origin";
  iframe.allowFullscreen = true;
  iframe.addEventListener("error", () => {
    if (usedNoCookieFallback) {
      showFallback("O YouTube bloqueou o player dentro da extensao.");
      return;
    }

    usedNoCookieFallback = true;
    iframe.src = `https://www.youtube-nocookie.com/embed/${encodeURIComponent(videoId)}?autoplay=1&rel=0`;
  });

  player?.replaceChildren(iframe);
})();
