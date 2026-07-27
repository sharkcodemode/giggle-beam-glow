(() => {
  if (globalThis.__ACTO_ATTACHMENT_THUMBS_BRIDGE__) return;
  globalThis.__ACTO_ATTACHMENT_THUMBS_BRIDGE__ = true;

  const STYLE_ID = "acto-attachment-thumbs-style";
  // Container das miniaturas (gerado pelo painel React do ACTO)
  const CONTAINER_SEL =
    'div.-mt-2.flex.max-h-24.flex-wrap.gap-2.overflow-y-auto.pr-1';

  function ensureStyle() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
      /* ACTO: anexos como miniaturas 33x33 entre textarea e Modo Thinking */
      ${CONTAINER_SEL} {
        margin-top: 6px !important;
        margin-bottom: 4px !important;
        max-height: 40px !important;
        flex-wrap: nowrap !important;
        overflow-x: auto !important;
        overflow-y: hidden !important;
        gap: 6px !important;
        padding: 2px !important;
        scrollbar-width: thin;
      }
      ${CONTAINER_SEL} > div {
        position: relative !important;
        width: 33px !important;
        height: 33px !important;
        min-width: 33px !important;
        max-width: 33px !important;
        padding: 0 !important;
        gap: 0 !important;
        border-radius: 6px !important;
        overflow: hidden !important;
      }
      /* Thumb/icone fica 33x33 ocupando todo o card */
      ${CONTAINER_SEL} > div > img,
      ${CONTAINER_SEL} > div > span:first-child {
        width: 33px !important;
        height: 33px !important;
        border-radius: 6px !important;
      }
      /* Esconde nome + tamanho */
      ${CONTAINER_SEL} > div > span:nth-child(2) {
        display: none !important;
      }
      /* Botão X compacto sobre o canto */
      ${CONTAINER_SEL} > div > button {
        position: absolute !important;
        top: 1px !important;
        right: 1px !important;
        width: 13px !important;
        height: 13px !important;
        min-width: 13px !important;
        padding: 0 !important;
        background: rgba(0,0,0,.65) !important;
        color: #fff !important;
        border-radius: 3px !important;
        font-size: 9px !important;
        line-height: 1 !important;
        opacity: 0;
        transition: opacity .15s ease;
      }
      ${CONTAINER_SEL} > div:hover > button {
        opacity: 1;
      }
    `;
    document.head.appendChild(style);
  }

  if (document.head) ensureStyle();
  else document.addEventListener("DOMContentLoaded", ensureStyle, { once: true });
})();
