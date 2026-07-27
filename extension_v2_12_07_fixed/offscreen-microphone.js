(() => {
  "use strict";

  const TARGET = "offscreen";
  const INPUT_RATE = 16000;
  const OUTPUT_RATE = 24000;
  const WS_BASE =
    "wss://generativelanguage.googleapis.com/ws/" +
    "google.ai.generativelanguage.v1alpha.GenerativeService." +
    "BidiGenerateContentConstrained";
  const START_TEXT = [
    "Inicie agora a conversa.",
    "Diga exatamente esta saudação, sem comentar, corrigir ou interpretar como fala do usuário:",
    '"Olá, tudo bem? Eu sou Helena, sua assistente pessoal criada pela ACTO. Me conte o que você tem em mente e vamos desenvolver essa ideia juntos."',
    "Depois, pare de falar e aguarde o usuário responder.",
  ].join("\n");
  const INITIAL_PLAYBACK_LEAD_SECONDS = 0.12;
  const RECOVERY_PLAYBACK_LEAD_SECONDS = 0.035;
  const MICROPHONE_STALL_MS = 2800;
  const HEALTH_CHECK_MS = 1000;
  const TURN_TRANSCRIPTION_GRACE_MS = 650;
  const GENERATION_COMMIT_FALLBACK_MS = 1200;
  const WORKLET_CHUNK_SIZE = 2048;
  const LOCAL_SPEECH_CONFIRM_MS = 120;
  const LOCAL_DUCK_RECOVERY_MS = 700;
  const LOCAL_DUCK_LEVEL = 0.06;
  const DEFAULT_FINAL_TEXT = [
    "Com base em toda a conversa, gere agora o prompt final.",
    "Preserve a intenção confirmada pelo usuário.",
    "O resultado deve ser claro, natural, objetivo e pronto para implementação.",
    "Não inclua explicações antes ou depois.",
    "Retorne somente o prompt final.",
  ].join("\n\n");
  const SEMANTIC_SUMMARY_TEXT = [
    "Analise silenciosamente toda a conversa desta sessão, incluindo tudo o que você compreendeu diretamente do áudio do usuário e as mensagens digitadas.",
    "Produza somente um resumo fiel, em português brasileiro, dos requisitos, objetivos, restrições, correções e decisões realmente confirmados.",
    "Não invente informações, não faça perguntas, não cumprimente e não mencione que está resumindo.",
    "Se houver ambiguidades não resolvidas, descreva-as de forma neutra.",
    "Esse resumo será usado para gerar o prompt final.",
  ].join("\n\n");
  const SUMMARY_TIMEOUT_MS = 30000;
  const SUMMARY_TRANSCRIPTION_GRACE_MS = 650;
  const INPUT_GAIN_VALUE = 1.65;

  let activeSession = null;

  const ALLOWED_TRANSITIONS = Object.freeze({
    idle: new Set(["connecting", "stopping", "error"]),
    connecting: new Set(["setup_pending", "stopping", "error"]),
    setup_pending: new Set(["microphone_starting", "stopping", "error"]),
    microphone_starting: new Set(["listening", "ready_to_talk", "speaking", "stopping", "error"]),
    ready_to_talk: new Set(["recording", "processing", "thinking", "speaking", "finalizing", "stopping", "error"]),
    recording: new Set(["processing", "speaking", "stopping", "error"]),
    processing: new Set(["ready_to_talk", "recording", "speaking", "finalizing", "stopping", "error"]),
    listening: new Set(["thinking", "speaking", "finalizing", "stopping", "error"]),
    thinking: new Set(["listening", "speaking", "finalizing", "stopping", "error"]),
    speaking: new Set(["listening", "ready_to_talk", "recording", "thinking", "finalizing", "stopping", "error"]),
    finalizing: new Set(["listening", "ready_to_talk", "speaking", "stopping", "error"]),
    stopping: new Set(["stopped", "error"]),
    stopped: new Set(),
    error: new Set(["stopping", "stopped"]),
  });

  console.log("[ACTO][LIVE-OFFSCREEN]", { stage: "script_loaded" });

  function sendRuntime(message) {
    try {
      chrome.runtime.sendMessage(message, () => {
        void chrome.runtime.lastError;
      });
    } catch {
      // The side panel may already be closed.
    }
  }

  function emitStatus(session, status) {
    if (!session || session.stopped) return;
    const current = session.state || "idle";
    if (current !== status) {
      const allowed = ALLOWED_TRANSITIONS[current];
      if (allowed && !allowed.has(status)) return;
      session.state = status;
    }
    sendRuntime({
      type: "ACTO_LIVE_STATUS",
      sessionId: session.sessionId,
      status,
    });
  }

  function emitError(session, code, message) {
    if (!session || session.errorReported) return;
    session.errorReported = true;
    session.state = "error";
    sendRuntime({
      type: "ACTO_LIVE_ERROR",
      sessionId: session.sessionId,
      code,
      message,
    });
  }

  function emitModelText(session, text) {
    sendRuntime({
      type: "ACTO_LIVE_MODEL_TEXT",
      sessionId: session.sessionId,
      text,
      replace: true,
    });
  }

  function clearTurnTimers(session) {
    if (!session) return;
    clearTimeout(session.turnCommitTimer);
    clearTimeout(session.softCommitTimer);
    clearTimeout(session.userCommitTimer);
    session.turnCommitTimer = null;
    session.softCommitTimer = null;
    session.userCommitTimer = null;
  }

  function commitVoiceTurn(session, reason = "voice_turn") {
    if (!session || session.stopped || session.voiceTurnCommitted) return false;
    if (!session.voiceTurnDetected && !session.transcript) return false;
    sendRuntime({
      type: "ACTO_LIVE_TURN_COMMITTED",
      sessionId: session.sessionId,
      userText: "🎙 Mensagem de voz",
      userKind: "voice",
      assistantText: "",
      reason,
    });
    session.transcript = "";
    session.voiceTurnDetected = false;
    session.voiceTurnCommitted = true;
    return true;
  }

  function commitTypedTurn(session, text, reason = "typed_turn") {
    const value = String(text || "").replace(/\s+/g, " ").trim();
    if (!session || session.stopped || !value) return false;
    sendRuntime({
      type: "ACTO_LIVE_TURN_COMMITTED",
      sessionId: session.sessionId,
      userText: value,
      userKind: "text",
      assistantText: "",
      reason,
    });
    session.voiceTurnDetected = false;
    session.voiceTurnCommitted = true;
    return true;
  }

  function commitAssistantTurn(session, reason = "assistant_turn") {
    if (!session || session.stopped) return false;
    const assistantText = String(session.modelText || "").trim();
    if (!assistantText) return false;
    sendRuntime({
      type: "ACTO_LIVE_TURN_COMMITTED",
      sessionId: session.sessionId,
      userText: "",
      assistantText,
      reason,
    });
    session.modelText = "";
    return true;
  }

  function commitCurrentTurn(session, reason = "turn_complete") {
    if (!session || session.stopped) return;
    clearTurnTimers(session);
    commitVoiceTurn(session, reason);
    commitAssistantTurn(session, reason);
    session.generationCompleteReceived = false;
    session.voiceTurnCommitted = false;
  }

  function scheduleUserTurnCommit(session, reason = "assistant_started", delay = 220) {
    if (!session || session.stopped || session.finalizing || session.summaryPending || session.voiceTurnCommitted) return;
    // The first model turn is the Helena greeting. After that, an assistant
    // response without a committed typed turn is reliable evidence that the
    // preceding user turn came from audio, even if input transcription was
    // missing or wrong.
    if (!session.greetingComplete && !session.voiceTurnDetected) return;
    if (session.greetingComplete && !session.voiceTurnDetected) {
      session.voiceTurnDetected = true;
    }
    clearTimeout(session.userCommitTimer);
    session.userCommitTimer = setTimeout(() => {
      session.userCommitTimer = null;
      if (!session.stopped && !session.stopping) commitVoiceTurn(session, reason);
    }, delay);
  }

  function scheduleTurnCommit(session, reason = "turn_complete", delay = TURN_TRANSCRIPTION_GRACE_MS) {
    if (!session || session.stopped || session.finalizing) return;
    clearTimeout(session.turnCommitTimer);
    session.turnCommitTimer = setTimeout(() => {
      session.turnCommitTimer = null;
      if (!session.stopped && !session.stopping) {
        commitCurrentTurn(session, reason);
        if (!session.player?.isPlaying?.()) emitStatus(session, idleInputStatus(session));
      }
    }, delay);
  }

  function scheduleGenerationFallback(session) {
    if (!session || session.stopped || session.finalizing || session.turnCompleteReceived) return;
    clearTimeout(session.softCommitTimer);
    const check = () => {
      session.softCommitTimer = null;
      if (session.stopped || session.stopping || session.finalizing || session.turnCompleteReceived) return;
      if (session.player?.isPlaying?.()) {
        session.softCommitTimer = setTimeout(check, 450);
        return;
      }
      if (session.generationCompleteReceived) {
        commitCurrentTurn(session, "generation_complete_fallback");
        emitStatus(session, idleInputStatus(session));
      }
    };
    session.softCommitTimer = setTimeout(check, GENERATION_COMMIT_FALLBACK_MS);
  }

  function appendText(current, next) {
    const previous = String(current || "").replace(/\s+/g, " ").trim();
    const incoming = String(next || "").replace(/\s+/g, " ").trim();
    if (!incoming) return previous;
    if (!previous) return incoming;
    if (incoming.startsWith(previous)) return incoming.slice(-12000);
    if (previous.startsWith(incoming) || previous.endsWith(incoming)) return previous;
    if (incoming.endsWith(previous)) return incoming.slice(-12000);

    const maxOverlap = Math.min(previous.length, incoming.length);
    for (let overlap = maxOverlap; overlap >= 3; overlap -= 1) {
      if (previous.slice(-overlap).toLowerCase() === incoming.slice(0, overlap).toLowerCase()) {
        return `${previous}${incoming.slice(overlap)}`.slice(-12000);
      }
    }
    return `${previous} ${incoming}`.trim().slice(-12000);
  }

  function bytesFromBase64(value) {
    const binary = atob(String(value || ""));
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  }

  function base64FromBytes(bytes) {
    let binary = "";
    const chunkSize = 0x8000;
    for (let i = 0; i < bytes.length; i += chunkSize) {
      binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
    }
    return btoa(binary);
  }

  function clampSample(sample) {
    return Math.max(-1, Math.min(1, sample));
  }

  function resampleMono(input, sourceRate, targetRate) {
    if (!sourceRate || sourceRate === targetRate) return input;
    const ratio = sourceRate / targetRate;
    const outputLength = Math.max(1, Math.floor(input.length / ratio));
    const output = new Float32Array(outputLength);
    for (let i = 0; i < outputLength; i += 1) {
      const sourceIndex = i * ratio;
      const index = Math.floor(sourceIndex);
      const fraction = sourceIndex - index;
      const first = input[index] || 0;
      const second = input[Math.min(index + 1, input.length - 1)] || first;
      output[i] = first + (second - first) * fraction;
    }
    return output;
  }

  function floatToPcm16(input, sourceRate) {
    const mono = resampleMono(input, sourceRate, INPUT_RATE);
    const buffer = new ArrayBuffer(mono.length * 2);
    const view = new DataView(buffer);
    for (let i = 0; i < mono.length; i += 1) {
      const sample = clampSample(mono[i]);
      view.setInt16(
        i * 2,
        sample < 0 ? sample * 0x8000 : sample * 0x7fff,
        true,
      );
    }
    return new Uint8Array(buffer);
  }

  function audioLevel(samples) {
    let sum = 0;
    for (let i = 0; i < samples.length; i += 1) {
      sum += samples[i] * samples[i];
    }
    return Math.sqrt(sum / Math.max(1, samples.length));
  }

  async function decodeMessage(data) {
    let text;
    if (typeof data === "string") {
      text = data;
    } else if (data instanceof Blob) {
      text = await data.text();
    } else if (data instanceof ArrayBuffer) {
      text = new TextDecoder("utf-8").decode(data);
    } else {
      throw new Error("Unsupported WebSocket message type");
    }
    return JSON.parse(text);
  }

  function createPcmPlayer(session) {
    let context = null;
    let masterGain = null;
    let nextStartTime = 0;
    let playing = false;
    let ducked = false;
    let playbackGeneration = 0;
    const sources = new Set();

    function getContext() {
      if (context) {
        if (["suspended", "interrupted"].includes(context.state)) void context.resume();
        return context;
      }
      const AudioContextClass = globalThis.AudioContext || globalThis.webkitAudioContext;
      if (!AudioContextClass) throw new Error("AudioContext unavailable");
      try {
        context = new AudioContextClass({ sampleRate: OUTPUT_RATE });
      } catch {
        context = new AudioContextClass();
      }
      masterGain = context.createGain();
      masterGain.gain.value = 1;
      masterGain.connect(context.destination);
      if (["suspended", "interrupted"].includes(context.state)) void context.resume();
      return context;
    }

    function setVolume(value, seconds = 0.06) {
      if (!context || !masterGain) return;
      const now = context.currentTime;
      const target = Math.max(0, Math.min(1, Number(value) || 0));
      try {
        masterGain.gain.cancelScheduledValues(now);
        masterGain.gain.setValueAtTime(masterGain.gain.value, now);
        masterGain.gain.linearRampToValueAtTime(target, now + Math.max(0.01, seconds));
      } catch {
        masterGain.gain.value = target;
      }
    }

    function duck() {
      if (ducked) return;
      getContext();
      ducked = true;
      setVolume(LOCAL_DUCK_LEVEL, 0.035);
    }

    function mute() {
      getContext();
      ducked = true;
      setVolume(0, 0.02);
    }

    function restore() {
      if (!ducked) return;
      ducked = false;
      setVolume(1, 0.11);
    }

    function interrupt() {
      playbackGeneration += 1;
      for (const source of sources) {
        try {
          source.onended = null;
          source.stop();
        } catch {
          // Already stopped.
        }
      }
      sources.clear();
      playing = false;
      ducked = false;
      if (masterGain) masterGain.gain.value = 1;
      nextStartTime = (context?.currentTime || 0) + RECOVERY_PLAYBACK_LEAD_SECONDS;
    }

    function enqueue(base64, mimeType) {
      const bytes = bytesFromBase64(base64);
      if (bytes.length < 2) return;
      const rateMatch = /rate=(\d+)/i.exec(String(mimeType || ""));
      const sampleRate = Number(rateMatch?.[1]) || OUTPUT_RATE;
      const audioContext = getContext();
      const frameCount = Math.floor(bytes.length / 2);
      const buffer = audioContext.createBuffer(1, frameCount, sampleRate);
      const channel = buffer.getChannelData(0);
      const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
      for (let i = 0; i < frameCount; i += 1) {
        channel[i] = view.getInt16(i * 2, true) / 32768;
      }

      const source = audioContext.createBufferSource();
      const generation = playbackGeneration;
      source.buffer = buffer;
      source.connect(masterGain);
      const now = audioContext.currentTime;
      const startAt = playing
        ? Math.max(nextStartTime, now + RECOVERY_PLAYBACK_LEAD_SECONDS)
        : Math.max(nextStartTime, now + INITIAL_PLAYBACK_LEAD_SECONDS);
      source.onended = () => {
        sources.delete(source);
        if (generation !== playbackGeneration) return;
        if (sources.size === 0) {
          playing = false;
          restore();
          if (!session.stopping && !session.stopped) {
            if (session.turnCompleteReceived) {
              if (!session.finalizing) scheduleTurnCommit(session, "turn_complete");
              emitStatus(session, session.finalizing ? "finalizing" : idleInputStatus(session));
            } else if (session.generationCompleteReceived) {
              scheduleGenerationFallback(session);
            }
          }
        }
      };
      sources.add(source);
      session.modelTurnActive = true;
      session.interruptedConfirmed = false;
      session.turnCompleteReceived = false;
      scheduleUserTurnCommit(session, "assistant_audio_started");
      if (!playing) {
        playing = true;
        emitStatus(session, "speaking");
      }
      source.start(startAt);
      nextStartTime = startAt + buffer.duration;
    }

    async function close() {
      interrupt();
      const currentGain = masterGain;
      const current = context;
      masterGain = null;
      context = null;
      try {
        currentGain?.disconnect?.();
      } catch {}
      if (current?.close) {
        try {
          await current.close();
        } catch {
          // Ignore close failures.
        }
      }
    }

    return {
      enqueue,
      interrupt,
      duck,
      mute,
      restore,
      close,
      isPlaying: () => playing || sources.size > 0,
      isDucked: () => ducked,
    };
  }

  function buildSetup(model) {
    return {
      setup: {
        model,
        generationConfig: {
          responseModalities: ["AUDIO"],
        },
      },
    };
  }

  function isPushToTalk(session) {
    return session?.interactionMode === "push_to_talk";
  }

  function idleInputStatus(session) {
    return isPushToTalk(session) ? "ready_to_talk" : "listening";
  }

  function sendRealtimeSignal(session, signalName) {
    if (session.websocket?.readyState !== WebSocket.OPEN) {
      throw new Error("WebSocket is not open");
    }
    session.websocket.send(JSON.stringify({
      realtimeInput: {
        [signalName]: {},
      },
    }));
  }

  function sendClientText(session, text) {
    if (session.websocket?.readyState !== WebSocket.OPEN) {
      throw new Error("WebSocket is not open");
    }
    session.websocket.send(JSON.stringify({
      clientContent: {
        turns: [{ role: "user", parts: [{ text }] }],
        turnComplete: true,
      },
    }));
  }

  function sendClientContext(session, text) {
    const value = String(text || "").trim();
    if (!value) return;
    if (session.websocket?.readyState !== WebSocket.OPEN) {
      throw new Error("WebSocket is not open");
    }
    session.websocket.send(JSON.stringify({
      clientContent: {
        turns: [{ role: "user", parts: [{ text: value }] }],
        turnComplete: false,
      },
    }));
  }

  async function stopAudioInput(session) {
    if (!session) return;
    clearTimeout(session.localDuckTimer);
    session.localDuckTimer = null;
    session.localSpeechMs = 0;
    session.localDuckPending = false;
    session.player?.restore?.();
    try {
      if (session.workletNode) {
        session.workletNode.port.onmessage = null;
        session.workletNode.port.postMessage({ type: "set_enabled", enabled: false });
        session.workletNode.disconnect();
      }
    } catch {
      // Ignore worklet disconnect failures.
    }
    try {
      if (session.processor) {
        session.processor.onaudioprocess = null;
        session.processor.disconnect();
      }
    } catch {
      // Ignore fallback processor disconnect failures.
    }
    try {
      session.source?.disconnect();
    } catch {
      // Ignore disconnect failures.
    }
    try {
      session.inputGain?.disconnect();
    } catch {}
    try {
      session.inputCompressor?.disconnect();
    } catch {}
    try {
      session.silentGain?.disconnect();
    } catch {
      // Ignore disconnect failures.
    }
    try {
      session.mediaStream?.getTracks?.().forEach((track) => {
        track.onended = null;
        track.onmute = null;
        track.onunmute = null;
        track.stop();
      });
    } catch {
      // Ignore track cleanup failures.
    }
    try {
      await session.inputAudioContext?.close?.();
    } catch {
      // Ignore close failures.
    }
    session.workletNode = null;
    session.processor = null;
    session.source = null;
    session.inputGain = null;
    session.inputCompressor = null;
    session.silentGain = null;
    session.mediaStream = null;
    session.inputAudioContext = null;
    session.micEngine = "none";
  }

  async function cleanupSession(session, reason = "manual", notifyStopped = true) {
    if (!session || session.stopped || session.stopping) return;
    session.stopping = true;
    emitStatus(session, "stopping");
    clearTimeout(session.setupTimer);
    clearTimeout(session.microphoneTimer);
    clearTurnTimers(session);
    clearTimeout(session.summaryTimeout);
    clearTimeout(session.summaryFinishTimer);
    clearInterval(session.healthTimer);
    session.setupTimer = null;
    session.microphoneTimer = null;
    session.healthTimer = null;
    session.summaryTimeout = null;
    session.summaryFinishTimer = null;
    if (session.summaryReject) {
      session.summaryReject(new Error("A conversa foi encerrada antes do resumo."));
      session.summaryResolve = null;
      session.summaryReject = null;
    }

    await stopAudioInput(session);
    await session.player?.close?.();

    const websocket = session.websocket;
    session.websocket = null;
    if (websocket) {
      session.intentionalClose = true;
      try {
        if (websocket.readyState === WebSocket.OPEN) {
          if (isPushToTalk(session)) {
            if (session.pttRecording) {
              websocket.send(JSON.stringify({ realtimeInput: { activityEnd: {} } }));
            }
          } else {
            websocket.send(JSON.stringify({ realtimeInput: { audioStreamEnd: true } }));
          }
        }
      } catch {
        // Ignore end-of-stream failures.
      }
      websocket.onopen = null;
      websocket.onmessage = null;
      websocket.onerror = null;
      websocket.onclose = null;
      try {
        if (
          websocket.readyState === WebSocket.OPEN ||
          websocket.readyState === WebSocket.CONNECTING
        ) {
          websocket.close(1000, "client_stop");
        }
      } catch {
        // Ignore close failures.
      }
    }

    session.stopping = false;
    session.stopped = true;
    session.state = "stopped";
    if (activeSession === session) activeSession = null;
    if (notifyStopped) {
      sendRuntime({
        type: "ACTO_LIVE_STATUS",
        sessionId: session.sessionId,
        status: "stopped",
        reason,
      });
    }
  }

  async function failSession(session, code, message) {
    if (!session || session.stopped) return;
    emitError(session, code, message);
    if (!session.readySettled) {
      session.readySettled = true;
      session.rejectReady?.(new Error(message));
    }
    await cleanupSession(session, "error", false);
  }

  function restoreLocalDucking(session) {
    if (!session) return;
    clearTimeout(session.localDuckTimer);
    session.localDuckTimer = null;
    session.localSpeechMs = 0;
    session.localDuckPending = false;
    session.player?.restore?.();
  }

  function armLocalDucking(session) {
    if (!session || session.stopped || session.stopping || isPushToTalk(session)) return;
    if (!session.player?.isPlaying?.()) return;
    if (!session.localDuckPending) {
      session.localDuckPending = true;
      session.player?.duck?.();
    }
    clearTimeout(session.localDuckTimer);
    session.localDuckTimer = setTimeout(() => {
      if (!session.interruptedConfirmed) restoreLocalDucking(session);
    }, LOCAL_DUCK_RECOVERY_MS);
  }

  function updateLocalSpeechCandidate(session, rms, durationMs) {
    if (!session || isPushToTalk(session) || !session.player?.isPlaying?.()) {
      session.localSpeechMs = 0;
      return;
    }
    const level = Number(rms) || 0;
    const noiseFloor = Math.max(0.0015, Number(session.noiseFloor) || 0.003);
    const threshold = Math.max(0.0045, noiseFloor * 2.2);
    if (level >= threshold) {
      session.localSpeechMs += Math.max(1, Number(durationMs) || 0);
      if (session.localSpeechMs >= LOCAL_SPEECH_CONFIRM_MS) armLocalDucking(session);
    } else {
      session.localSpeechMs = Math.max(0, session.localSpeechMs - Math.max(8, durationMs * 1.5));
    }
  }

  function updateNoiseFloor(session, rms) {
    if (!session || session.player?.isPlaying?.()) return;
    const level = Number(rms) || 0;
    if (level <= 0 || level > 0.025) return;
    const previous = Number(session.noiseFloor) || 0.003;
    session.noiseFloor = previous * 0.97 + level * 0.03;
  }

  function markMicrophoneReady(session) {
    if (session.firstPcmSent) return;
    session.firstPcmSent = true;
    clearTimeout(session.microphoneTimer);
    session.microphoneTimer = null;
    emitStatus(session, idleInputStatus(session));
    if (!session.readySettled) {
      session.readySettled = true;
      session.resolveReady?.();
    }
    try {
      if (!session.greetingSent) {
        session.greetingSent = true;
        if (session.initialContextText) {
          session.greetingComplete = true;
          sendClientContext(session, session.initialContextText);
        } else {
          sendClientText(session, START_TEXT);
        }
      }
    } catch {
      void failSession(
        session,
        "INITIAL_MESSAGE_ERROR",
        "Não foi possível iniciar a conversa com a IA.",
      );
    }
  }

  function handleMicrophoneSamples(session, samples, sourceRate, rmsValue) {
    if (!session || session.stopping || session.stopped || activeSession !== session) return;
    const websocket = session.websocket;
    if (!websocket || websocket.readyState !== WebSocket.OPEN) return;
    if (!(samples instanceof Float32Array) || !samples.length) return;

    const now = Date.now();
    session.lastMicChunkAt = now;
    const rms = Number.isFinite(rmsValue) ? rmsValue : audioLevel(samples);
    const durationMs = (samples.length / Math.max(1, sourceRate || session.inputAudioContext?.sampleRate || 48000)) * 1000;
    updateNoiseFloor(session, rms);
    const voiceThreshold = Math.max(0.0042, (Number(session.noiseFloor) || 0.003) * 2.05);
    if (rms >= voiceThreshold) {
      session.voiceActivityMs = Math.min(1200, (session.voiceActivityMs || 0) + durationMs);
      if (session.voiceActivityMs >= 110) session.voiceTurnDetected = true;
    } else {
      session.voiceActivityMs = Math.max(0, (session.voiceActivityMs || 0) - Math.max(8, durationMs));
    }
    updateLocalSpeechCandidate(session, rms, durationMs);
    markMicrophoneReady(session);

    if (session.suppressMic) return;
    if (isPushToTalk(session) && !session.pttRecording) return;

    const pcm = floatToPcm16(samples, sourceRate || session.inputAudioContext?.sampleRate || 48000);
    const data = base64FromBytes(pcm);
    try {
      websocket.send(JSON.stringify({
        realtimeInput: {
          audio: {
            data,
            mimeType: "audio/pcm;rate=16000",
          },
        },
      }));
      session.lastMicSentAt = now;
    } catch {
      void failSession(
        session,
        "AUDIO_SEND_ERROR",
        "A conexão com a IA foi interrompida.",
      );
    }
  }

  async function attachAudioWorklet(session) {
    const context = session.inputAudioContext;
    if (!context?.audioWorklet || typeof AudioWorkletNode !== "function") {
      throw new Error("AudioWorklet unavailable");
    }
    await context.audioWorklet.addModule(chrome.runtime.getURL("offscreen-microphone-worklet.js"));
    const node = new AudioWorkletNode(context, "acto-microphone-processor", {
      numberOfInputs: 1,
      numberOfOutputs: 1,
      outputChannelCount: [1],
      processorOptions: { chunkSize: WORKLET_CHUNK_SIZE },
    });
    node.port.onmessage = (event) => {
      const payload = event?.data;
      if (payload?.type !== "audio_chunk") return;
      const samples = payload.samples instanceof Float32Array
        ? payload.samples
        : new Float32Array(payload.samples || []);
      handleMicrophoneSamples(
        session,
        samples,
        Number(payload.sampleRate) || context.sampleRate,
        Number(payload.rms),
      );
    };
    session.workletNode = node;
    session.inputCompressor.connect(node);
    node.connect(session.silentGain);
    session.micEngine = "audio_worklet";
  }

  function attachScriptProcessorFallback(session) {
    const context = session.inputAudioContext;
    session.processor = context.createScriptProcessor(2048, 1, 1);
    session.processor.onaudioprocess = (event) => {
      const input = event.inputBuffer.getChannelData(0);
      const copy = new Float32Array(input.length);
      copy.set(input);
      handleMicrophoneSamples(session, copy, context.sampleRate, audioLevel(copy));
    };
    session.inputCompressor.connect(session.processor);
    session.processor.connect(session.silentGain);
    session.micEngine = "script_processor_fallback";
  }

  async function startMicrophone(session) {
    if (session.stopping || session.stopped) return;
    emitStatus(session, "microphone_starting");

    session.mediaStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        channelCount: 1,
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
    });

    const track = session.mediaStream.getAudioTracks()[0];
    if (!track || track.readyState !== "live" || track.enabled !== true) {
      throw new Error("Microphone track is not active");
    }
    track.onended = () => {
      if (!session.stopping && !session.stopped) {
        void restartMicrophonePipeline(session, "track_ended");
      }
    };

    const AudioContextClass = globalThis.AudioContext || globalThis.webkitAudioContext;
    if (!AudioContextClass) throw new Error("AudioContext unavailable");

    session.inputAudioContext = new AudioContextClass({ latencyHint: "interactive" });
    if (["suspended", "interrupted"].includes(session.inputAudioContext.state)) {
      await session.inputAudioContext.resume();
    }
    if (session.inputAudioContext.state !== "running") {
      throw new Error("AudioContext is not running");
    }

    session.inputAudioContext.onstatechange = () => {
      const state = session.inputAudioContext?.state;
      if (["suspended", "interrupted"].includes(state) && !session.stopping && !session.stopped) {
        void session.inputAudioContext.resume().catch(() => {});
      }
    };

    session.source = session.inputAudioContext.createMediaStreamSource(session.mediaStream);
    session.inputGain = session.inputAudioContext.createGain();
    session.inputGain.gain.value = INPUT_GAIN_VALUE;
    session.inputCompressor = session.inputAudioContext.createDynamicsCompressor();
    session.inputCompressor.threshold.value = -24;
    session.inputCompressor.knee.value = 18;
    session.inputCompressor.ratio.value = 4;
    session.inputCompressor.attack.value = 0.003;
    session.inputCompressor.release.value = 0.22;
    session.source.connect(session.inputGain);
    session.inputGain.connect(session.inputCompressor);
    session.silentGain = session.inputAudioContext.createGain();
    session.silentGain.gain.value = 0;
    session.silentGain.connect(session.inputAudioContext.destination);

    try {
      await attachAudioWorklet(session);
    } catch (error) {
      console.warn("[ACTO][LIVE-OFFSCREEN]", {
        stage: "audio_worklet_fallback",
        reason: String(error?.message || "unavailable").slice(0, 120),
      });
      attachScriptProcessorFallback(session);
    }

    session.microphoneTimer = setTimeout(() => {
      if (!session.firstPcmSent && !session.stopped) {
        void failSession(
          session,
          "MICROPHONE_START_TIMEOUT",
          "Não foi possível iniciar a captura do microfone.",
        );
      }
    }, 10000);
  }

  async function restartMicrophonePipeline(session, reason = "watchdog") {
    if (!session || session.stopping || session.stopped || session.restartingMicrophone) return;
    session.restartingMicrophone = true;
    try {
      await stopAudioInput(session);
      session.firstPcmSent = false;
      session.lastMicChunkAt = Date.now();
      session.lastMicSentAt = Date.now();
      await startMicrophone(session);
      console.log("[ACTO][LIVE-OFFSCREEN]", {
        stage: "microphone_restarted",
        reason,
      });
    } catch {
      await failSession(
        session,
        "MICROPHONE_RECOVERY_FAILED",
        "Não foi possível restaurar o microfone.",
      );
    } finally {
      session.restartingMicrophone = false;
    }
  }

  function startHealthMonitor(session) {
    clearInterval(session.healthTimer);
    session.healthTimer = setInterval(() => {
      if (!session || session.stopping || session.stopped) return;
      const websocket = session.websocket;
      if (!websocket || websocket.readyState !== WebSocket.OPEN) return;

      const context = session.inputAudioContext;
      if (["suspended", "interrupted"].includes(context?.state)) {
        void context.resume().catch(() => {});
      }

      const now = Date.now();
      if (session.firstPcmSent && now - session.lastMicChunkAt > MICROPHONE_STALL_MS) {
        void restartMicrophonePipeline(session, "mic_callback_stall");
        return;
      }
      if (
        !isPushToTalk(session) &&
        session.firstPcmSent &&
        now - session.lastMicSentAt > MICROPHONE_STALL_MS
      ) {
        void restartMicrophonePipeline(session, "mic_send_stall");
        return;
      }

      if (session.state === "speaking" && !session.player?.isPlaying?.() && session.turnCompleteReceived) {
        emitStatus(session, idleInputStatus(session));
      }
    }, HEALTH_CHECK_MS);
  }

  function handleServerContent(session, content) {
    if (content.interrupted) {
      session.interruptedConfirmed = true;
      session.modelTurnActive = false;
      session.turnCompleteReceived = true;
      session.generationCompleteReceived = true;
      clearTimeout(session.localDuckTimer);
      session.localDuckTimer = null;
      session.player?.interrupt?.();
      // Transcription events can arrive shortly after the interruption event.
      // Give them a small grace period before consolidating the visible turn.
      if (!session.finalizing) scheduleTurnCommit(session, "interrupted", 420);
      emitStatus(
        session,
        isPushToTalk(session) && session.pttRecording
          ? "recording"
          : idleInputStatus(session),
      );
    }

    const inputText = String(content.inputTranscription?.text || "").trim();
    if (inputText) {
      session.voiceTurnDetected = true;
      if (session.player?.isPlaying?.()) armLocalDucking(session);
      if (!session.modelTurnActive || !session.voiceTurnCommitted) {
        if (!session.modelTurnActive) {
          session.voiceTurnCommitted = false;
          session.interruptedConfirmed = false;
        }
        // Keep the API transcription only as a hidden aid. Helena understands
        // the original audio directly, so this text is not shown or trusted as
        // the user's message.
        session.transcript = appendText(session.transcript, inputText);
      }
    }

    const outputText = String(content.outputTranscription?.text || "").trim();
    if (outputText) {
      if (session.summaryPending) {
        session.summaryText = appendText(session.summaryText, outputText);
      } else {
        session.modelTurnActive = true;
        session.interruptedConfirmed = false;
        scheduleUserTurnCommit(session, "assistant_transcription_started");
        session.modelText = appendText(session.modelText, outputText);
        if (session.finalizing) {
          session.finalText = appendText(session.finalText, outputText);
        }
        emitModelText(session, session.modelText);
      }
    }

    const parts = Array.isArray(content.modelTurn?.parts)
      ? content.modelTurn.parts
      : [];
    for (const part of parts) {
      const inlineData = part?.inlineData || part?.inline_data;
      const audioData = inlineData?.data;
      if (audioData && !session.summaryPending) {
        session.player.enqueue(audioData, inlineData?.mimeType || inlineData?.mime_type);
      }
    }

    if (content.generationComplete || content.generation_complete) {
      session.modelTurnActive = false;
      session.generationCompleteReceived = true;
      restoreLocalDucking(session);
      if (!session.summaryPending) scheduleGenerationFallback(session);
    }

    if (content.turnComplete || content.turn_complete) {
      session.modelTurnActive = false;
      session.turnCompleteReceived = true;
      session.interruptedConfirmed = false;
      restoreLocalDucking(session);
      if (session.summaryPending) {
        clearTimeout(session.summaryFinishTimer);
        session.summaryFinishTimer = setTimeout(() => {
          session.summaryFinishTimer = null;
          const summary = String(session.summaryText || "").trim();
          const resolve = session.summaryResolve;
          const reject = session.summaryReject;
          clearTimeout(session.summaryTimeout);
          session.summaryTimeout = null;
          session.summaryPending = false;
          session.suppressMic = false;
          session.summaryResolve = null;
          session.summaryReject = null;
          session.summaryText = "";
          session.player?.restore?.();
          if (summary) resolve?.(summary);
          else reject?.(new Error("A Helena não conseguiu consolidar o resumo da conversa."));
        }, SUMMARY_TRANSCRIPTION_GRACE_MS);
      } else if (session.finalizing) {
        const prompt = String(session.finalText || "").trim();
        if (prompt) {
          sendRuntime({
            type: "ACTO_LIVE_FINAL_PROMPT",
            sessionId: session.sessionId,
            prompt,
          });
          void cleanupSession(session, "final", false);
        } else {
          void failSession(
            session,
            "EMPTY_FINAL_PROMPT",
            "Resposta sem conteúdo.",
          );
        }
      } else {
        if (!session.greetingComplete && session.greetingSent && !session.voiceTurnDetected) {
          session.greetingComplete = true;
        }
        // Input/output transcription can arrive after turnComplete. Delay the
        // visual commit slightly so captions do not remain fragmented or dimmed.
        scheduleTurnCommit(session, "turn_complete");
        if (!session.player?.isPlaying?.()) {
          emitStatus(session, idleInputStatus(session));
        }
      }
    }
  }

  async function handleWebSocketMessage(session, event) {
    let message;
    try {
      message = await decodeMessage(event.data);
    } catch {
      return;
    }
    if (session.stopping || session.stopped || activeSession !== session) return;
    session.lastServerMessageAt = Date.now();

    if (message?.error) {
      await failSession(
        session,
        "GEMINI_ERROR",
        "A conexão com a IA foi recusada.",
      );
      return;
    }

    if (message?.goAway) {
      await failSession(
        session,
        "SESSION_EXPIRED",
        "A sessão expirou. Inicie novamente.",
      );
      return;
    }

    if (Object.prototype.hasOwnProperty.call(message || {}, "setupComplete")) {
      session.setupComplete = true;
      clearTimeout(session.setupTimer);
      try {
        await startMicrophone(session);
      } catch (error) {
        const name = String(error?.name || "MicrophoneError");
        const publicMessage = name === "NotAllowedError"
          ? "O acesso ao microfone está bloqueado."
          : name === "NotFoundError"
            ? "Nenhum microfone foi encontrado."
            : name === "NotReadableError"
              ? "O microfone está sendo usado por outro programa."
              : "Não foi possível iniciar a captura do microfone.";
        await failSession(session, "MICROPHONE_ERROR", publicMessage);
      }
      return;
    }

    if (message?.serverContent) {
      handleServerContent(session, message.serverContent);
    }
  }

  async function createLiveSession(payload) {
    const sessionId = String(payload?.sessionId || "").trim();
    const token = String(payload?.token || "").trim();
    const model = String(payload?.model || "").trim();
    const interactionMode = payload?.interactionMode === "push_to_talk"
      ? "push_to_talk"
      : "automatic";
    if (!sessionId || !token || !model) {
      throw new Error("Invalid live session payload");
    }

    if (activeSession?.sessionId === sessionId && !activeSession.stopped) {
      await activeSession.readyPromise;
      return activeSession;
    }

    if (activeSession && !activeSession.stopped) {
      await cleanupSession(activeSession, "replaced", false);
    }

    const session = {
      sessionId,
      token,
      model,
      interactionMode,
      initialContextText: String(payload?.initialContextText || "").trim().slice(-12000),
      pttRecording: false,
      state: "connecting",
      websocket: null,
      mediaStream: null,
      inputAudioContext: null,
      source: null,
      inputGain: null,
      inputCompressor: null,
      workletNode: null,
      processor: null,
      silentGain: null,
      micEngine: "none",
      player: null,
      transcript: "",
      voiceTurnDetected: false,
      voiceTurnCommitted: false,
      voiceActivityMs: 0,
      modelText: "",
      finalText: "",
      finalizing: false,
      summaryPending: false,
      suppressMic: false,
      summaryText: "",
      summaryResolve: null,
      summaryReject: null,
      summaryTimeout: null,
      summaryFinishTimer: null,
      firstPcmSent: false,
      greetingSent: false,
      greetingComplete: Boolean(String(payload?.initialContextText || "").trim()),
      modelTurnActive: false,
      turnCompleteReceived: false,
      interruptedConfirmed: false,
      generationCompleteReceived: false,
      turnCommitTimer: null,
      softCommitTimer: null,
      userCommitTimer: null,
      lastMicChunkAt: Date.now(),
      lastMicSentAt: Date.now(),
      lastServerMessageAt: Date.now(),
      noiseFloor: 0.003,
      localSpeechMs: 0,
      localDuckPending: false,
      localDuckTimer: null,
      healthTimer: null,
      restartingMicrophone: false,
      setupComplete: false,
      setupTimer: null,
      microphoneTimer: null,
      stopping: false,
      stopped: false,
      intentionalClose: false,
      errorReported: false,
      readySettled: false,
      resolveReady: null,
      rejectReady: null,
      readyPromise: null,
    };

    session.readyPromise = new Promise((resolve, reject) => {
      session.resolveReady = resolve;
      session.rejectReady = reject;
    });
    activeSession = session;
    session.player = createPcmPlayer(session);
    startHealthMonitor(session);
    emitStatus(session, "connecting");

    const wsUrl = `${WS_BASE}?access_token=${encodeURIComponent(token)}`;
    let websocket;
    try {
      websocket = new WebSocket(wsUrl);
    } catch {
      await failSession(session, "WEBSOCKET_CONSTRUCTOR", "A conexão com a IA foi recusada.");
      throw new Error("A conexão com a IA foi recusada.");
    }

    session.websocket = websocket;
    websocket.binaryType = "arraybuffer";

    websocket.onopen = () => {
      if (session.stopping || session.stopped) return;
      emitStatus(session, "setup_pending");
      try {
        websocket.send(JSON.stringify(buildSetup(model)));
      } catch {
        void failSession(
          session,
          "SETUP_SEND_ERROR",
          "Não foi possível configurar a sessão de voz.",
        );
        return;
      }
      session.setupTimer = setTimeout(() => {
        if (!session.setupComplete && !session.stopped) {
          void failSession(
            session,
            "SETUP_TIMEOUT",
            "A conexão com a IA demorou demais.",
          );
        }
      }, 15000);
    };

    websocket.onmessage = (event) => {
      void handleWebSocketMessage(session, event);
    };

    websocket.onerror = () => {
      if (!session.stopping && !session.stopped) {
        // onclose carries the actionable state.
      }
    };

    websocket.onclose = (event) => {
      if (session.intentionalClose || session.stopping || session.stopped) return;
      console.warn("[ACTO][LIVE-OFFSCREEN]", {
        stage: "websocket_closed",
        code: event?.code || 0,
        reason: String(event?.reason || "").slice(0, 160),
      });
      const message = session.readySettled
        ? "A conexão com a IA foi interrompida."
        : "A conexão com a IA foi recusada.";
      void failSession(
        session,
        `WEBSOCKET_${event?.code || "CLOSED"}`,
        message,
      );
    };

    await session.readyPromise;
    return session;
  }

  async function startPushToTalk(sessionId) {
    const session = activeSession;
    if (!session || session.sessionId !== sessionId || session.stopped) {
      throw new Error("A sessão de voz não está ativa.");
    }
    if (!isPushToTalk(session)) {
      throw new Error("A sessão atual não está no modo Falar por botão.");
    }
    if (session.pttRecording) return session;
    if (session.websocket?.readyState !== WebSocket.OPEN || !session.setupComplete) {
      throw new Error("A conversa ainda está sendo preparada.");
    }

    // A click is an explicit interruption intent, so stopping local playback
    // here is safe and does not depend on ambient noise or echo detection.
    session.player?.interrupt?.();
    session.turnCompleteReceived = false;
    session.interruptedConfirmed = false;
    session.voiceTurnDetected = true;
    session.voiceTurnCommitted = false;
    session.voiceActivityMs = 0;
    sendRealtimeSignal(session, "activityStart");
    session.pttRecording = true;
    emitStatus(session, "recording");
    return session;
  }

  async function stopPushToTalk(sessionId) {
    const session = activeSession;
    if (!session || session.sessionId !== sessionId || session.stopped) {
      throw new Error("A sessão de voz não está ativa.");
    }
    if (!isPushToTalk(session)) {
      throw new Error("A sessão atual não está no modo Falar por botão.");
    }
    if (!session.pttRecording) return session;

    session.pttRecording = false;
    commitVoiceTurn(session, "push_to_talk_sent");
    sendRealtimeSignal(session, "activityEnd");
    emitStatus(session, "processing");
    return session;
  }

  async function sendUserText(sessionId, text) {
    const session = activeSession;
    if (!session || session.sessionId !== sessionId || session.stopped) {
      throw new Error("A sessão de voz não está ativa.");
    }
    if (session.pttRecording) {
      throw new Error("Pare a gravação antes de enviar uma mensagem escrita.");
    }
    if (session.websocket?.readyState !== WebSocket.OPEN || !session.setupComplete) {
      throw new Error("A conexão com a Helena ainda não está pronta.");
    }

    const normalizedText = String(text || "").replace(/\s+/g, " ").trim().slice(0, 12000);
    if (!normalizedText) throw new Error("Digite uma mensagem antes de enviar.");

    // Text submission is an explicit new user turn. Stop any local playback so
    // the user gets immediate feedback and the new turn is not mixed with the
    // previous spoken answer.
    if (session.player?.isPlaying?.() || session.state === "speaking") {
      session.player?.interrupt?.();
    }
    session.turnCompleteReceived = false;
    session.interruptedConfirmed = false;
    session.voiceTurnDetected = false;
    session.voiceTurnCommitted = false;
    session.transcript = "";
    sendClientText(session, normalizedText);
    commitTypedTurn(session, normalizedText, "typed_message_sent");
    emitStatus(session, "thinking");
    return session;
  }

  async function resendText(sessionId, text) {
    return await sendUserText(sessionId, text);
  }

  async function requestSemanticSummary(sessionId) {
    const session = activeSession;
    if (!session || session.sessionId !== sessionId || session.stopped) {
      throw new Error("A sessão de voz não está ativa.");
    }
    if (session.summaryPending) throw new Error("O resumo da conversa já está sendo preparado.");
    if (session.pttRecording) {
      session.pttRecording = false;
      commitVoiceTurn(session, "push_to_talk_finalize");
      sendRealtimeSignal(session, "activityEnd");
    }
    if (session.websocket?.readyState !== WebSocket.OPEN || !session.setupComplete) {
      throw new Error("A conexão com a Helena ainda não está pronta.");
    }

    session.player?.interrupt?.();
    session.player?.mute?.();
    session.summaryPending = true;
    session.suppressMic = true;
    session.summaryText = "";

    const promise = new Promise((resolve, reject) => {
      session.summaryResolve = resolve;
      session.summaryReject = reject;
      session.summaryTimeout = setTimeout(() => {
        session.summaryTimeout = null;
        session.summaryPending = false;
        session.suppressMic = false;
        session.summaryResolve = null;
        session.summaryReject = null;
        session.summaryText = "";
        session.player?.restore?.();
        reject(new Error("A Helena demorou demais para consolidar a conversa."));
      }, SUMMARY_TIMEOUT_MS);
    });

    sendClientText(session, SEMANTIC_SUMMARY_TEXT);
    return await promise;
  }

  async function generateFinal(sessionId, text) {
    const session = activeSession;
    if (!session || session.sessionId !== sessionId || session.stopped) {
      throw new Error("Live session is not active");
    }
    session.finalizing = true;
    session.finalText = "";
    emitStatus(session, "finalizing");
    sendClientText(session, String(text || DEFAULT_FINAL_TEXT));
  }

  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message?.target !== TARGET) return false;

    if (message.type === "ACTO_LIVE_SESSION_START") {
      (async () => {
        try {
          const session = await createLiveSession(message);
          sendResponse({
            ok: true,
            sessionId: session.sessionId,
            stage: "session_ready",
          });
        } catch (error) {
          sendResponse({
            ok: false,
            sessionId: String(message.sessionId || ""),
            stage: "session_start_error",
            message: String(error?.message || "Não foi possível iniciar a conversa por voz."),
          });
        }
      })();
      return true;
    }

    if (message.type === "ACTO_LIVE_SESSION_STOP") {
      (async () => {
        const sessionId = String(message.sessionId || "");
        const session = activeSession;
        if (!session || session.sessionId !== sessionId) {
          sendResponse({ ok: true, sessionId, stage: "stale_stop_ignored" });
          return;
        }
        await cleanupSession(session, String(message.reason || "manual"), true);
        sendResponse({ ok: true, sessionId, stage: "session_stopped" });
      })();
      return true;
    }

    if (
      message.type === "ACTO_LIVE_ACTIVITY_START" ||
      message.type === "ACTO_LIVE_ACTIVITY_END"
    ) {
      (async () => {
        try {
          const sessionId = String(message.sessionId || "");
          const session = message.type === "ACTO_LIVE_ACTIVITY_START"
            ? await startPushToTalk(sessionId)
            : await stopPushToTalk(sessionId);
          sendResponse({
            ok: true,
            sessionId: session.sessionId,
            stage: message.type === "ACTO_LIVE_ACTIVITY_START"
              ? "recording_started"
              : "recording_ended",
          });
        } catch (error) {
          sendResponse({
            ok: false,
            sessionId: String(message.sessionId || ""),
            stage: "activity_control_error",
            message: String(error?.message || "Não foi possível controlar a gravação."),
          });
        }
      })();
      return true;
    }

    if (message.type === "ACTO_LIVE_SEND_TEXT") {
      (async () => {
        try {
          const session = await sendUserText(
            String(message.sessionId || ""),
            String(message.text || ""),
          );
          sendResponse({
            ok: true,
            sessionId: session.sessionId,
            stage: "text_sent",
          });
        } catch (error) {
          sendResponse({
            ok: false,
            sessionId: String(message.sessionId || ""),
            stage: "text_send_error",
            message: String(error?.message || "Não foi possível enviar a mensagem."),
          });
        }
      })();
      return true;
    }

    if (message.type === "ACTO_LIVE_SUMMARIZE_FOR_FINALIZE") {
      (async () => {
        try {
          const summary = await requestSemanticSummary(String(message.sessionId || ""));
          sendResponse({
            ok: true,
            sessionId: String(message.sessionId || ""),
            stage: "semantic_summary_ready",
            summary,
          });
        } catch (error) {
          sendResponse({
            ok: false,
            sessionId: String(message.sessionId || ""),
            stage: "semantic_summary_error",
            message: String(error?.message || "Não foi possível consolidar a conversa."),
          });
        }
      })();
      return true;
    }

    if (message.type === "ACTO_LIVE_RESEND_TEXT") {
      (async () => {
        try {
          const session = await resendText(
            String(message.sessionId || ""),
            String(message.text || ""),
          );
          sendResponse({
            ok: true,
            sessionId: session.sessionId,
            stage: "text_resent",
          });
        } catch (error) {
          sendResponse({
            ok: false,
            sessionId: String(message.sessionId || ""),
            stage: "resend_error",
            message: String(error?.message || "Não foi possível reenviar a mensagem."),
          });
        }
      })();
      return true;
    }

    if (message.type === "ACTO_LIVE_GENERATE_FINAL") {
      (async () => {
        try {
          await generateFinal(
            String(message.sessionId || ""),
            String(message.text || ""),
          );
          sendResponse({
            ok: true,
            sessionId: String(message.sessionId || ""),
            stage: "final_requested",
          });
        } catch (error) {
          sendResponse({
            ok: false,
            sessionId: String(message.sessionId || ""),
            stage: "final_request_error",
            message: String(error?.message || "Não foi possível gerar o prompt final."),
          });
        }
      })();
      return true;
    }

    return false;
  });
})();
