class ActoMicrophoneProcessor extends AudioWorkletProcessor {
  constructor(options) {
    super();
    const requested = Number(options?.processorOptions?.chunkSize);
    this.chunkSize = Number.isFinite(requested) && requested >= 256
      ? Math.min(8192, Math.floor(requested))
      : 2048;
    this.buffer = new Float32Array(this.chunkSize);
    this.offset = 0;
    this.enabled = true;

    this.port.onmessage = (event) => {
      if (event?.data?.type === "set_enabled") {
        this.enabled = event.data.enabled !== false;
      }
    };
  }

  flush() {
    if (!this.offset) return;
    const samples = this.buffer.slice(0, this.offset);
    let sum = 0;
    let peak = 0;
    for (let index = 0; index < samples.length; index += 1) {
      const value = samples[index];
      sum += value * value;
      const absolute = Math.abs(value);
      if (absolute > peak) peak = absolute;
    }
    const rms = Math.sqrt(sum / Math.max(1, samples.length));
    this.port.postMessage(
      {
        type: "audio_chunk",
        samples,
        rms,
        peak,
        sampleRate,
      },
      [samples.buffer],
    );
    this.offset = 0;
  }

  process(inputs, outputs) {
    const input = inputs?.[0]?.[0];
    const output = outputs?.[0]?.[0];
    if (output) output.fill(0);
    if (!this.enabled || !input?.length) return true;

    let sourceOffset = 0;
    while (sourceOffset < input.length) {
      const remaining = this.chunkSize - this.offset;
      const available = input.length - sourceOffset;
      const count = Math.min(remaining, available);
      this.buffer.set(input.subarray(sourceOffset, sourceOffset + count), this.offset);
      this.offset += count;
      sourceOffset += count;
      if (this.offset >= this.chunkSize) this.flush();
    }
    return true;
  }
}

registerProcessor("acto-microphone-processor", ActoMicrophoneProcessor);
