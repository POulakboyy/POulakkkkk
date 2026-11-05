/**
 * Ambient noise for focus sessions: white, pink or brown noise generated locally with Web
 * Audio (no files, no network). A few seconds of noise are synthesised into a buffer and
 * looped; the gain ramps in and out so starting or stopping never clicks.
 */

export type NoiseKind = 'white' | 'pink' | 'brown';

export const NOISE_KINDS: readonly NoiseKind[] = ['white', 'pink', 'brown'];

/** Length of the looped buffer. Long enough that the loop point is not noticeable. */
const LOOP_SECONDS = 4;
const FADE_SECONDS = 0.4;
/** Pink and brown carry more energy in the lows; scaled so the three feel equally loud. */
const GAIN: Record<NoiseKind, number> = { white: 0.18, pink: 0.32, brown: 0.5 };

/**
 * Fills `out` with noise of the given colour, in -1..1. Pink uses Paul Kellet's refined
 * filter (≈ −3 dB/octave); brown is leaky-integrated white noise (≈ −6 dB/octave).
 * `random` returns 0..1 and is injectable for deterministic tests.
 */
export function fillNoise(
  kind: NoiseKind,
  out: Float32Array,
  random: () => number = Math.random,
): Float32Array {
  let b0 = 0,
    b1 = 0,
    b2 = 0,
    b3 = 0,
    b4 = 0,
    b5 = 0,
    b6 = 0,
    last = 0;
  for (let i = 0; i < out.length; i++) {
    const white = random() * 2 - 1;
    let v = white;
    if (kind === 'pink') {
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.969 * b2 + white * 0.153852;
      b3 = 0.8665 * b3 + white * 0.3104856;
      b4 = 0.55 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.016898;
      v = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
      b6 = white * 0.115926;
    } else if (kind === 'brown') {
      last = (last + 0.02 * white) / 1.02;
      v = last * 3.5;
    }
    out[i] = Math.max(-1, Math.min(1, v));
  }
  return out;
}

export interface NoisePlayer {
  /** Starts (or switches to) a noise colour. Resolves once audio is running. */
  play(kind: NoiseKind): Promise<void>;
  /** Fades out and stops. */
  stop(): void;
  readonly kind: NoiseKind | null;
}

type AudioContextFactory = () => AudioContext;

const defaultFactory: AudioContextFactory = () => {
  const Ctor =
    globalThis.AudioContext ??
    (globalThis as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) throw new Error('Web Audio is not available');
  return new Ctor();
};

/** Whether this runtime can play generated noise. */
export function noiseSupported(): boolean {
  return (
    typeof globalThis.AudioContext === 'function' ||
    typeof (globalThis as { webkitAudioContext?: unknown }).webkitAudioContext === 'function'
  );
}

/**
 * Creates a player. The audio context is created lazily on the first `play` (browsers only
 * allow it after a user gesture) and buffers are cached per colour.
 */
export function createNoisePlayer(factory: AudioContextFactory = defaultFactory): NoisePlayer {
  let ctx: AudioContext | null = null;
  let current: { kind: NoiseKind; source: AudioBufferSourceNode; gain: GainNode } | null = null;
  const buffers = new Map<NoiseKind, AudioBuffer>();

  const bufferFor = (audio: AudioContext, kind: NoiseKind): AudioBuffer => {
    let buffer = buffers.get(kind);
    if (!buffer) {
      buffer = audio.createBuffer(1, Math.round(audio.sampleRate * LOOP_SECONDS), audio.sampleRate);
      fillNoise(kind, buffer.getChannelData(0));
      buffers.set(kind, buffer);
    }
    return buffer;
  };

  const fadeOut = (audio: AudioContext) => {
    if (!current) return;
    const { source, gain } = current;
    const t = audio.currentTime;
    gain.gain.cancelScheduledValues(t);
    gain.gain.setValueAtTime(gain.gain.value, t);
    gain.gain.linearRampToValueAtTime(0, t + FADE_SECONDS);
    source.stop(t + FADE_SECONDS + 0.05);
    current = null;
  };

  return {
    get kind() {
      return current?.kind ?? null;
    },
    async play(kind) {
      ctx ??= factory();
      const audio = ctx;
      if (audio.state === 'suspended') await audio.resume();
      if (current?.kind === kind) return;
      fadeOut(audio);
      const source = audio.createBufferSource();
      source.buffer = bufferFor(audio, kind);
      source.loop = true;
      const gain = audio.createGain();
      const t = audio.currentTime;
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(GAIN[kind], t + FADE_SECONDS);
      source.connect(gain).connect(audio.destination);
      source.start(t);
      current = { kind, source, gain };
    },
    stop() {
      if (ctx) fadeOut(ctx);
    },
  };
}
