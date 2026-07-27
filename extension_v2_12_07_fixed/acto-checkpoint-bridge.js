(() => {
  if (globalThis.__ACTO_CHECKPOINT_BRIDGE__) return;
  globalThis.__ACTO_CHECKPOINT_BRIDGE__ = true;

  const BUTTON_ATTR = "data-acto-checkpoint-button";
  const TOOLTIP_ID = "acto-spen-tooltip";
  const LABEL = "S-Pen";
  const OPEN = "ACTO_SPEN_OPEN_OVERLAY";
  const ATTACH = "ACTO_SPEN_ATTACHMENT";
  const runtime = globalThis.chrome?.runtime;
  const tabs = globalThis.chrome?.tabs;
  const scripting = globalThis.chrome?.scripting;
  const originalLabels = new Set([
    "começar do zero","start from scratch","начать с нуля","empezar de cero","从零开始","ゼロから開始","처음부터 시작","शुरू से शुरू करें","repartir de zero","von vorne beginnen","ابدأ من الصفر",
    "criar checkpoint","create checkpoint","создать чекпоинт","crear punto de control","创建检查点","チェックポイント作成","체크포인트 생성","चेकपॉइंट बनाएं","créer un point de contrôle","checkpoint erstellen","إنشاء نقطة تفتيش",
    "criar checkpoint tier-s","s-pen"
  ].map(normalize));
  const PEN = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="width:18px;height:18px;display:block"><path d="m12 20 9-9-4-4-9 9-1 5 5-1Z"/><path d="m15 9 4 4"/></svg>`;
  let busy = false;

  function normalize(v){return String(v||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/\s+/g," ").trim().toLowerCase()}
  function textNode(button){return [...button.childNodes].find(n=>n.nodeType===Node.TEXT_NODE&&n.textContent?.trim())}
  function ensureStyle(){if(document.getElementById("acto-spen-bridge-style"))return;const s=document.createElement("style");s.id="acto-spen-bridge-style";s.textContent=`#${TOOLTIP_ID}{position:fixed;z-index:2147483647;pointer-events:none;padding:6px 10px;border:1px solid rgba(96,165,250,.45);border-radius:6px;background:#0b1220;color:#dbeafe;font:700 11px/1.2 ui-sans-serif,system-ui,sans-serif;box-shadow:0 8px 24px rgba(0,0,0,.5);opacity:0;transform:translateY(4px);transition:.12s}#${TOOLTIP_ID}[data-show="1"]{opacity:1;transform:none}#acto-spen-toast{position:fixed;left:50%;bottom:18px;z-index:2147483647;transform:translateX(-50%);padding:8px 12px;border:1px solid rgba(96,165,250,.45);border-radius:8px;background:#0b1220;color:#bfdbfe;font:800 10px/1.3 ui-monospace,Menlo,monospace;box-shadow:0 12px 28px rgba(0,0,0,.5)}`;document.head.appendChild(s)}
  function tooltip(){ensureStyle();let e=document.getElementById(TOOLTIP_ID);if(!e){e=document.createElement("div");e.id=TOOLTIP_ID;e.textContent=LABEL;document.body.appendChild(e)}return e}
  function showTip(button){const e=tooltip(),r=button.getBoundingClientRect();e.dataset.show="1";e.style.left="0";e.style.top="0";const t=e.getBoundingClientRect();let left=clamp(r.left+r.width/2-t.width/2,6,innerWidth-t.width-6),top=r.bottom+8;if(top+t.height>innerHeight-6)top=r.top-t.height-8;e.style.left=`${left}px`;e.style.top=`${top}px`}
  function hideTip(){document.getElementById(TOOLTIP_ID)?.removeAttribute("data-show")}
  function clamp(v,min,max){return Math.max(min,Math.min(max,v))}
  function toast(text,bad=false){ensureStyle();let e=document.getElementById("acto-spen-toast");if(!e){e=document.createElement("div");e.id="acto-spen-toast";document.body.appendChild(e)}e.textContent=text;e.style.borderColor=bad?"rgba(244,63,94,.55)":"rgba(96,165,250,.45)";clearTimeout(toast.timer);toast.timer=setTimeout(()=>e.remove(),2200)}
  function siblingButton(button){return [...(button.parentElement?.children||[])].find(el=>el!==button&&el instanceof HTMLButtonElement&&el.querySelector("svg")&&!el.hasAttribute(BUTTON_ATTR))||null}
  function decorate(button){const ref=siblingButton(button);button.textContent="";if(ref){button.className=ref.className;const r=ref.getBoundingClientRect();if(r.width&&r.height){button.style.width=`${Math.round(r.width)}px`;button.style.height=`${Math.round(r.height)}px`}}else Object.assign(button.style,{width:"32px",height:"32px",padding:"0",display:"inline-flex",alignItems:"center",justifyContent:"center"});button.insertAdjacentHTML("afterbegin",PEN);button.setAttribute(BUTTON_ATTR,"1");button.setAttribute("aria-label",LABEL);button.setAttribute("title",LABEL);button.addEventListener("mouseenter",()=>showTip(button));button.addEventListener("mouseleave",hideTip);button.addEventListener("focus",()=>showTip(button));button.addEventListener("blur",hideTip)}
  function isTarget(b){if(!(b instanceof HTMLButtonElement)||b.hasAttribute(BUTTON_ATTR))return false;const label=normalize(textNode(b)?.textContent||b.textContent||b.getAttribute("aria-label")||b.title);return originalLabels.has(label)}
  function relabel(){document.querySelectorAll("button").forEach(b=>{if(isTarget(b))decorate(b)})}
  const queryActive=()=>new Promise((resolve,reject)=>{if(!tabs?.query)return reject(new Error("API de abas indisponível."));tabs.query({active:true,currentWindow:true},list=>{const err=runtime?.lastError;if(err)reject(new Error(err.message));else resolve(list?.[0]||null)})});
  const inject=(tabId)=>new Promise((resolve,reject)=>{if(!scripting?.executeScript)return reject(new Error("Não foi possível carregar a S-Pen."));scripting.executeScript({target:{tabId},files:["acto-spen-page.js"]},()=>{const err=runtime?.lastError;if(err)reject(new Error(err.message));else resolve()})});
  const capture=(windowId)=>new Promise((resolve,reject)=>{if(!tabs?.captureVisibleTab)return reject(new Error("Captura da tela indisponível."));tabs.captureVisibleTab(windowId,{format:"png"},url=>{const err=runtime?.lastError;if(err||!url)reject(new Error(err?.message||"Falha ao capturar o preview."));else resolve(url)})});
  const sendTab=(tabId,message)=>new Promise((resolve,reject)=>{tabs.sendMessage(tabId,message,response=>{const err=runtime?.lastError;if(err||!response?.ok)reject(new Error(err?.message||response?.error||"A S-Pen não respondeu."));else resolve(response)})});
  async function startSPen(){if(busy)return;busy=true;hideTip();toast("Abrindo S-Pen...");try{const tab=await queryActive();if(!tab?.id||!/https?:\/\/([^/]+\.)?lovable\.(dev|app)\//i.test(tab.url||""))throw new Error("Abra um projeto do Lovable na aba ativa.");await inject(tab.id);const dataUrl=await capture(tab.windowId);await sendTab(tab.id,{type:OPEN,dataUrl});document.getElementById("acto-spen-toast")?.remove()}catch(e){toast(e?.message||"Falha ao abrir S-Pen.",true)}finally{busy=false}}
  function dataUrlFile(dataUrl,name,mime){const [head,payload]=String(dataUrl||"").split(",",2);if(!payload)throw new Error("Imagem inválida.");const bin=atob(payload),bytes=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)bytes[i]=bin.charCodeAt(i);return new File([bytes],name||`spen-${Date.now()}.png`,{type:mime||head.match(/data:([^;]+)/)?.[1]||"image/png",lastModified:Date.now()})}
  async function waitInput(){for(let i=0;i<40;i++){const input=document.querySelector('input#file-upload[type="file"],input[type="file"][multiple]');if(input)return input;await new Promise(r=>setTimeout(r,100))}return null}
  async function attachScreenshot(message){const input=await waitInput();if(!input)throw new Error("Campo de anexos não encontrado.");const file=dataUrlFile(message.dataUrl,message.name,message.mimeType);const dt=new DataTransfer();for(const f of Array.from(input.files||[]))dt.items.add(f);dt.items.add(file);input.files=dt.files;input.dispatchEvent(new Event("change",{bubbles:true}));toast("Captura S-Pen anexada");return {ok:true,name:file.name,size:file.size}}

  document.addEventListener("click",e=>{const b=e.target?.closest?.(`[${BUTTON_ATTR}]`);if(!b)return;e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();startSPen()},true);
  runtime?.onMessage?.addListener?.((message,_sender,sendResponse)=>{if(message?.type!==ATTACH)return false;attachScreenshot(message).then(sendResponse).catch(e=>sendResponse({ok:false,error:e?.message||String(e)}));return true});
  const observer=new MutationObserver(relabel);function boot(){relabel();observer.observe(document.documentElement,{childList:true,subtree:true,characterData:true})}if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot,{once:true});else boot();
  globalThis.actoOpenCheckpoint=startSPen;globalThis.actoOpenSPen=startSPen;
})();
