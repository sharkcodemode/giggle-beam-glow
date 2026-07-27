const statusEl = document.getElementById("status");
const allowButton = document.getElementById("allowButton");
const closeButton = document.getElementById("closeButton");
const permissionParams = new URLSearchParams(window.location.search);
const targetTabId = Number(permissionParams.get("targetTabId"));

const microphoneConstraints = {
  audio: {
    channelCount: 1,
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true,
  },
};

function setStatus(message, state = "") {
  statusEl.textContent = message;
  statusEl.className = state;
}

function stopStream(stream) {
  for (const track of stream.getTracks()) {
    track.stop();
  }
}

async function notifySidePanel() {
  if (!Number.isInteger(targetTabId) || targetTabId <= 0) {
    return { ok: false, message: "Aba de origem não identificada." };
  }

  try {
    return await chrome.runtime.sendMessage({
      type: "ACTO_IDEA_MIC_PERMISSION_GRANTED_V8",
      target: "background",
      targetTabId,
      autoStart: true,
    });
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Falha ao avisar o painel.",
    };
  }
}

async function requestMicrophonePermission() {
  setStatus("Solicitando acesso...");
  allowButton.disabled = true;

  try {
    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error("Microfone indisponível");
    }

    const stream = await navigator.mediaDevices.getUserMedia(
      microphoneConstraints,
    );
    const track = stream.getAudioTracks()[0];
    const trackActive =
      !!track && track.readyState === "live" && track.enabled === true;

    stopStream(stream);

    if (!trackActive) {
      throw new Error("Microfone indisponível");
    }

    setStatus("Microfone autorizado. Conectando à conversa...", "success");
    allowButton.hidden = true;
    closeButton.hidden = true;

    const notification = await notifySidePanel();
    if (notification?.ok) {
      // The background focuses the original Lovable tab and closes this tab.
      // Keep a local fallback in case the close operation is delayed.
      setTimeout(() => {
        void closeCurrentTab();
      }, 500);
      return;
    }

    setStatus(
      "Microfone autorizado. Volte ao painel da ACTO para continuar.",
      "success",
    );
    closeButton.hidden = false;
  } catch (error) {
    const errorName = error instanceof Error ? error.name : "";
    const denied = errorName === "NotAllowedError" || errorName === "SecurityError";

    setStatus(denied ? "Permissão negada" : "Microfone indisponível", "error");
    allowButton.disabled = false;
  }
}

async function closeCurrentTab() {
  try {
    const tab = await chrome.tabs.getCurrent();
    if (tab?.id) {
      await chrome.tabs.remove(tab.id);
      return;
    }
  } catch {
    // Fall back to window.close for browsers that do not expose tabs here.
  }

  window.close();
}

allowButton.addEventListener("click", requestMicrophonePermission);
closeButton.addEventListener("click", closeCurrentTab);
