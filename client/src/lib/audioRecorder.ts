/**
 * audioRecorder.ts — Perekam Suara Mikrofon Web untuk Interkom Kamera IP
 * Mengonversi audio mikrofon browser ke format Linear PCM 16-bit 8000Hz Mono.
 */

export class IntercomAudioRecorder {
  private mediaStream: MediaStream | null = null;
  private audioContext: AudioContext | null = null;
  private processor: ScriptProcessorNode | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private recordedSamples: Float32Array[] = [];

  /**
   * Memulai perekaman mikrofon dari Web Audio API.
   */
  async startRecording(): Promise<void> {
    this.recordedSamples = [];
    this.mediaStream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true },
    });

    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    this.audioContext = new AudioCtx();
    this.source = this.audioContext.createMediaStreamSource(this.mediaStream);

    // Buffer size 4096 untuk performa seimbang
    this.processor = this.audioContext.createScriptProcessor(4096, 1, 1);
    this.processor.onaudioprocess = (e) => {
      const channelData = e.inputBuffer.getChannelData(0);
      this.recordedSamples.push(new Float32Array(channelData));
    };

    this.source.connect(this.processor);
    this.processor.connect(this.audioContext.destination);
  }

  /**
   * Menghentikan perekaman dan mengembalikan ArrayBuffer PCM 16-bit 8000Hz.
   */
  async stopRecording(): Promise<ArrayBuffer> {
    this.cleanupMedia();
    return this.downsampleAndEncode();
  }

  /**
   * Membersihkan resource stream mikrofon dan AudioContext.
   */
  private cleanupMedia(): void {
    if (this.processor && this.source) {
      this.source.disconnect(this.processor);
      this.processor.disconnect();
    }
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((t) => t.stop());
      this.mediaStream = null;
    }
    if (this.audioContext && this.audioContext.state !== "closed") {
      this.audioContext.close();
      this.audioContext = null;
    }
  }

  /**
   * Melakukan downsample buffer ke 8000Hz dan mengonversi ke 16-bit Int PCM.
   */
  private downsampleAndEncode(): ArrayBuffer {
    const totalLength = this.recordedSamples.reduce((acc, curr) => acc + curr.length, 0);
    const merged = new Float32Array(totalLength);
    let offset = 0;
    for (const chunk of this.recordedSamples) {
      merged.set(chunk, offset);
      offset += chunk.length;
    }

    const inputRate = 44100; // Standar sample rate Web Audio API
    const targetRate = 8000;
    const ratio = inputRate / targetRate;
    const newLength = Math.round(totalLength / ratio);
    const pcm16 = new Int16Array(newLength);

    for (let i = 0; i < newLength; i++) {
      const sampleIndex = Math.min(Math.floor(i * ratio), totalLength - 1);
      const s = Math.max(-1, Math.min(1, merged[sampleIndex]));
      pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
    }

    return pcm16.buffer;
  }
}
