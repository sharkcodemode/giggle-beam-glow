(() => {
  "use strict";

  const LIVE_TOKEN_URL = "https://melhorar-prompt.lovable.app/api/public/live-token";
  const TOKEN_TIMEOUT_MS = 60000;
  const START_TIMEOUT_MS = 45000;
  const FINAL_PROMPT_TEXT = [
    "Com base em toda a conversa, gere agora o prompt final.",
    "Preserve a intenção confirmada pelo usuário.",
    "O resultado deve ser claro, natural, objetivo e pronto para implementação.",
    "Não inclua explicações antes ou depois.",
    "Retorne somente o prompt final.",
  ].join("\n\n");

  const STATUS_LABELS = Object.freeze({
    idle: "Pronto para conversar",
    connecting: "Conectando...",
    setup_pending: "Conectando...",
    microphone_starting: "Ativando microfone...",
    listening: "Ouvindo...",
    thinking: "Pensando...",
    speaking: "Falando...",
    finalizing: "Pensando...",
    stopping: "Encerrando...",
    stopped: "Conversa encerrada",
    error: "Erro ao iniciar conversa",
  });

  function runtime() {
    return globalThis.chrome?.runtime || null;
  }

  function makeSessionId() {
    if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
    const random = Math.random().toString(16).slice(2);
    return `acto-live-${Date.now().toString(16)}-${random}`;
  }

  function safeText(value) {
    return String(value || "").trim();
  }

  function wait(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  function isDeviceRetry(status, body) {
    const text = [body?.reason, body?.code, body?.error, body?.erro, body?.message, body?.mensagem]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return status === 409 || status === 425 || text.includes("retry_device") || text.includes("device_missing") || (text.includes("device_id") && text.includes("missing"));
  }

  async function requestCredentialsFromBackground() {
    const rt = runtime();
    if (!rt?.sendMessage) return {};
    return new Promise((resolve) => {
      try {
        rt.sendMessage({ type: "ACTO_GET_ACTIVE_LOVABLE_CONTEXT", includeActoCredentials: true }, (response) => {
          const error = rt.lastError;
          if (error || !response?.ok) {
            resolve({});
            return;
          }
          resolve(response.context || {});
        });
      } catch {
        resolve({});
      }
    });
  }

  function publicTokenError(status, body) {
    const code = safeText(body?.error);
    if (status === 401 || code === "UNAUTHORIZED") {
      return "Licença ou dispositivo não identificado.";
    }
    if (status === 403 || code === "LICENSE_ACCESS_DENIED") {
      return "Sua licença não está autorizada para usar esta função.";
    }
    if (status === 429) {
      return "Limite temporário atingido. Tente novamente em instantes.";
    }
    if (status === 503 || code === "LICENSE_SERVICE_UNAVAILABLE") {
      return "Não foi possível validar a licença agora.";
    }
    return "Não foi possível iniciar a conversa.";
  }

  async function requestLiveToken(key, deviceId, signal) {
    let cleanKey = safeText(key);
    let cleanDeviceId = safeText(deviceId);

    if (!cleanKey || !cleanDeviceId) {
      const credentials = await requestCredentialsFromBackground();
      cleanKey = cleanKey || safeText(credentials.license_key || credentials.license);
      cleanDeviceId = cleanDeviceId || safeText(credentials.device_id || credentials.deviceId);
    }

    if (!cleanKey || !cleanDeviceId) {
      throw new Error("Licença ou dispositivo não identificado.");
    }

    const controller = new AbortController();
    const abortFromParent = () => controller.abort();
    signal?.addEventListener?.("abort", abortFromParent, { once: true });
    const timeout = setTimeout(() => controller.abort(), TOKEN_TIMEOUT_MS);

    try {
      let response = null;
      let body = null;

      for (let attempt = 0; attempt < 3; attempt += 1) {
        response = await fetch(LIVE_TOKEN_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ key: cleanKey, device_id: cleanDeviceId }),
          signal: controller.signal,
        });

        try {
          body = await response.clone().json();
        } catch {
          body = null;
        }

        if (!isDeviceRetry(response.status, body) || attempt === 2) break;

        const credentials = await requestCredentialsFromBackground();
        cleanDeviceId = safeText(credentials.device_id || credentials.deviceId) || cleanDeviceId;
        await wait(300 * (attempt + 1));
      }

      if (!body) {
        try {
          body = await response.json();
        } catch {
          body = null;
        }
      }

      if (!response.ok || body?.success !== true) {
        throw new Error(publicTokenError(response.status, body));
      }

      const token = safeText(body.token);
      const model = safeText(body.model) ||
        "models/gemini-2.5-flash-native-audio-preview-12-2025";

      if (token.length <= 20 || !token.startsWith("auth_tokens/")) {
        throw new Error("Não foi possível validar o token da conversa.");
      }

      return { token, model, expiresAt: safeText(body.expires_at) };
    } catch (error) {
      if (controller.signal.aborted) {
        if (signal?.aborted) throw new DOMException("Aborted", "AbortError");
        throw new Error("Não foi possível iniciar a conversa.");
      }
      throw error;
    } finally {
      clearTimeout(timeout);
      signal?.removeEventListener?.("abort", abortFromParent);
    }
  }

  function sendRuntimeMessage(message, timeoutMs = START_TIMEOUT_MS) {
    const rt = runtime();
    if (!rt?.sendMessage) {
      return Promise.reject(new Error("Runtime da extensão indisponível."));
    }

    return new Promise((resolve, reject) => {
      let settled = false;
      const timer = setTimeout(() => {
        if (settled) return;
        settled = true;
        reject(new Error("A inicialização da conversa demorou demais."));
      }, timeoutMs);

      try {
        rt.sendMessage(message, (response) => {
          if (settled) return;
          settled = true;
          clearTimeout(timer);
          const lastError = rt.lastError;
          if (lastError) {
            reject(new Error(lastError.message || "Falha na comunicação interna."));
            return;
          }
          resolve(response || null);
        });
      } catch (error) {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        reject(error);
      }
    });
  }

  function createSession(options = {}) {
    const sessionId = makeSessionId();
    const abortController = new AbortController();
    let state = "idle";
    let startPromise = null;
    let active = false;
    let closed = false;
    let closing = false;
    let listenerInstalled = false;
    let errorReported = false;
    let closedReported = false;
    let startupError = null;
    let transcript = "";
    let modelText = "";

    const rt = runtime();

    function isUiClosed() {
      return closed || (typeof options.getClosed === "function" && options.getClosed());
    }

    function setStatus(nextState) {
      if (closed || isUiClosed()) return;
      state = nextState;
      const label = STATUS_LABELS[nextState] || nextState;
      options.onStatus?.(label);
    }

    function reportClosed(reason) {
      if (closedReported) return;
      closedReported = true;
      options.onClosed?.(reason);
    }

    function reportPostStartError(message) {
      if (errorReported || closed) return;
      errorReported = true;
      state = "error";
      options.onStatus?.(STATUS_LABELS.error);
      options.onError?.(safeText(message) || "A conexão com a IA foi interrompida.");
    }

    function cleanupListener() {
      if (!listenerInstalled) return;
      listenerInstalled = false;
      try {
        rt?.onMessage?.removeListener?.(onRuntimeMessage);
      } catch {
        // Ignore cleanup failures.
      }
    }

    function appendText(current, next) {
      const value = safeText(next);
      if (!value) return current;
      if (!current) return value;
      if (current.endsWith(value)) return current;
      return `${current}\n\n${value}`.slice(-12000);
    }

    function onRuntimeMessage(message) {
      if (!message || message.sessionId !== sessionId) return;

      if (message.type === "ACTO_LIVE_STATUS") {
        const nextState = safeText(message.status);
        if (!nextState) return;
        if (nextState === "listening" && !active) {
          active = true;
          options.onActive?.(true);
        }
        setStatus(nextState);
        return;
      }

      if (message.type === "ACTO_LIVE_TRANSCRIPT") {
        transcript = message.replace === true
          ? safeText(message.text)
          : appendText(transcript, message.text);
        if (!isUiClosed()) options.onUserText?.(transcript);
        return;
      }

      if (message.type === "ACTO_LIVE_MODEL_TEXT") {
        modelText = message.replace === true
          ? safeText(message.text)
          : appendText(modelText, message.text);
        if (!isUiClosed()) options.onModelText?.(modelText);
        return;
      }

      if (message.type === "ACTO_LIVE_FINAL_PROMPT") {
        const prompt = safeText(message.prompt);
        if (prompt && !isUiClosed()) options.onFinalPrompt?.(prompt);
        void close("final", false);
        return;
      }

      if (message.type === "ACTO_LIVE_ERROR") {
        const text = safeText(message.message) || "A conexão com a IA foi interrompida.";
        if (!active && startPromise) {
          startupError = new Error(text);
          return;
        }
        reportPostStartError(text);
        void close("error", true);
      }
    }

    function installListener() {
      if (listenerInstalled || !rt?.onMessage?.addListener) return;
      rt.onMessage.addListener(onRuntimeMessage);
      listenerInstalled = true;
    }

    async function start() {
      if (startPromise) return startPromise;
      if (closed) return;

      startPromise = (async () => {
        installListener();
        setStatus("connecting");

        let tokenInfo;
        try {
          tokenInfo = await requestLiveToken(
            options.key,
            options.deviceId,
            abortController.signal,
          );
        } catch (error) {
          if (closed || abortController.signal.aborted) return;
          cleanupListener();
          throw error;
        }

        if (closed || isUiClosed()) return;

        const response = await sendRuntimeMessage({
          type: "ACTO_LIVE_SESSION_START",
          target: "background",
          sessionId,
          token: tokenInfo.token,
          model: tokenInfo.model,
        });

        if (closed || isUiClosed()) return;
        if (startupError) throw startupError;
        if (!response?.ok) {
          throw new Error(
            safeText(response?.message) ||
            "Não foi possível iniciar a conversa por voz.",
          );
        }

        if (!active) {
          active = true;
          options.onActive?.(true);
        }
        setStatus("listening");
      })().catch(async (error) => {
        if (closed || abortController.signal.aborted) return;
        await stopRemote("startup_error");
        cleanupListener();
        throw error;
      });

      return startPromise;
    }

    async function stopRemote(reason) {
      try {
        await sendRuntimeMessage({
          type: "ACTO_LIVE_SESSION_STOP",
          target: "background",
          sessionId,
          reason,
        }, 15000);
      } catch {
        // Cleanup is best-effort when the extension context is closing.
      }
    }

    async function close(reason = "manual", notifyClosed = true) {
      if (closing || closed) return;
      closing = true;
      closed = true;
      abortController.abort();
      state = "stopping";
      await stopRemote(reason);
      active = false;
      cleanupListener();
      closing = false;
      state = "stopped";
      if (notifyClosed) reportClosed(reason);
    }

    function generateFinalPrompt() {
      if (closed || !active) {
        throw new Error("Inicie a conversa antes de gerar o prompt.");
      }
      setStatus("finalizing");
      void sendRuntimeMessage({
        type: "ACTO_LIVE_GENERATE_FINAL",
        target: "background",
        sessionId,
        text: FINAL_PROMPT_TEXT,
      }, 15000).then((response) => {
        if (!response?.ok) {
          reportPostStartError(
            safeText(response?.message) || "Não foi possível gerar o prompt final.",
          );
        }
      }).catch((error) => {
        reportPostStartError(error?.message || "Não foi possível gerar o prompt final.");
      });
    }

    installListener();

    return {
      sessionId,
      start,
      generateFinalPrompt,
      close,
      getState: () => state,
    };
  }

  globalThis.ActoLiveBridge = Object.freeze({ createSession });
})();
