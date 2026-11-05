/**
 * Pure signal generators for the ambient sounds (5.13). Everything is synthesised locally:
 * no audio file is shipped or downloaded.
 */
import type { ideation } from '@pouxis/core';

type Rng = ideation.Rng;

export type NoiseColor = 'white' | 'pink' | 'brown';
export const SOUNDS = ['white', 'pink', 'brown', 'cafe', 'forest', 'rain'] as const;
export type SoundId = (typeof SOUNDS)[number];

/**
 * Fills `out` with noise of the given colour, normalised to a peak of `peak`.
 * Pink: Paul Kellet's refined filter (≈ −3 dB/octave). Brown: leaky integration of white
 * noise (≈ −6 dB/octave).
 */
export function fillNoise(
  out: Float32Array,
  color: NoiseColor,
  rng: Rng,
  peak = 0.9,
): Float32Array {
  let b0 = 0;
  let b1 = 0;
  let b2 = 0;
  let b3 = 0;
  let b4 = 0;
  let b5 = 0;
  let b6 = 0;
  let brown = 0;
  for (let i = 0; i < out.length; i++) {
    const white = rng() * 2 - 1;
    if (color === 'white') {
      out[i] = white;
    } else if (color === 'pink') {
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.969 * b2 + white * 0.153852;
      b3 = 0.8665 * b3 + white * 0.3104856;
      b4 = 0.55 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.016898;
      out[i] = b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362;
      b6 = white * 0.115926;
    } else {
      brown = (brown + 0.02 * white) / 1.02;
      out[i] = brown;
    }
  }
  return normalize(out, peak);
}

export function normalize(samples: Float32Array, peak: number): Float32Array {
  let max = 0;
  for (const s of samples) max = Math.max(max, Math.abs(s));
  if (max === 0) return samples;
  const k = peak / max;
  for (let i = 0; i < samples.length; i++) samples[i] = (samples[i] ?? 0) * k;
  return samples;
}

/** One continuous noise bed of a soundscape. */
export interface Layer {
  color: NoiseColor;
  filter: { type: BiquadFilterType; frequency: number; q?: number };
  gain: number;
  /** Slow amplitude swell: depth in [0, 1] of the gain, at `rate` Hz. */
  swell?: { rate: number; depth: number };
}

/** Short sound sprinkled at random intervals over the beds. */
export interface Accent {
  kind: 'clink' | 'chirp' | 'drop';
  /** Mean interval between two accents, in ms (exponentially distributed). */
  meanIntervalMs: number;
  gain: number;
}

export interface Soundscape {
  layers: Layer[];
  accents: Accent[];
}

export const SOUNDSCAPES: Readonly<Record<SoundId, Soundscape>> = {
  white: {
    layers: [{ color: 'white', filter: { type: 'lowpass', frequency: 12000 }, gain: 0.35 }],
    accents: [],
  },
  pink: {
    layers: [{ color: 'pink', filter: { type: 'lowpass', frequency: 10000 }, gain: 0.5 }],
    accents: [],
  },
  brown: {
    layers: [{ color: 'brown', filter: { type: 'lowpass', frequency: 2000 }, gain: 0.8 }],
    accents: [],
  },
  cafe: {
    layers: [
      // Murmur of voices: brown noise in the speech band, gently swelling.
      {
        color: 'brown',
        filter: { type: 'bandpass', frequency: 500, q: 0.7 },
        gain: 0.9,
        swell: { rate: 0.13, depth: 0.35 },
      },
      { color: 'pink', filter: { type: 'lowpass', frequency: 1800 }, gain: 0.12 },
    ],
    accents: [{ kind: 'clink', meanIntervalMs: 2600, gain: 0.08 }],
  },
  forest: {
    layers: [
      // Wind in the leaves.
      {
        color: 'pink',
        filter: { type: 'bandpass', frequency: 900, q: 0.5 },
        gain: 0.45,
        swell: { rate: 0.07, depth: 0.6 },
      },
    ],
    accents: [{ kind: 'chirp', meanIntervalMs: 3200, gain: 0.05 }],
  },
  rain: {
    layers: [
      {
        color: 'white',
        filter: { type: 'bandpass', frequency: 3500, q: 0.4 },
        gain: 0.32,
        swell: { rate: 0.05, depth: 0.2 },
      },
      { color: 'brown', filter: { type: 'lowpass', frequency: 600 }, gain: 0.35 },
    ],
    accents: [{ kind: 'drop', meanIntervalMs: 180, gain: 0.05 }],
  },
};

/** Exponentially distributed delay (Poisson arrivals), clamped to [mean/10, mean*5]. */
export function nextDelay(meanMs: number, rng: Rng): number {
  const u = Math.min(Math.max(rng(), 1e-6), 1 - 1e-6);
  const delay = -Math.log(1 - u) * meanMs;
  return Math.min(Math.max(delay, meanMs / 10), meanMs * 5);
}

/** Stop-after options of the ambient timer, in minutes (`0` = no timer). */
export const TIMER_OPTIONS = [0, 15, 25, 45, 60, 90] as const;
