/**
 * Generative ambient sound engine (5.13), built on WebAudio. A module-level singleton so the
 * ambience keeps playing while the user moves between views. Preferences (sound, volume) are
 * remembered per device in localStorage as a convenience.
 */
import { useSyncExternalStore } from 'react';
import { ideation } from '@pouxis/core';
import {
  fillNoise,
  nextDelay,
  SOUNDS,
  SOUNDSCAPES,
  type Accent,
  type Layer,
  type NoiseColor,
  type SoundId,
} from './noise.ts';

export interface AmbientState {
  sound: SoundId;
  playing: boolean;
  /** 0..1 */
  volume: number;
  /** Epoch ms at which playback stops by itself, or `null`. */
  endsAt: number | null;
  /** Minutes chosen for the stop timer (`0` = none). */
  timerMin: number;
  /** WebAudio is unavailable (very old webview). */
  unsupported: boolean;
}

const PREFS_KEY = 'pouxis:ideas:ambient';
const LOOP_SECONDS = 6;
const FADE = 0.6;

type AudioContextCtor = typeof AudioContext;

function audioCtor(): AudioContextCtor | undefined {
  const g = globalThis as typeof globalThis & { webkitAudioContext?: AudioContextCtor };
  return g.AudioContext ?? g.webkitAudioContext;
}

function loadPrefs(): Pick<AmbientState, 'sound' | 'volume'> {
  try {
    const raw = globalThis.localStorage?.getItem(PREFS_KEY);
    const data = raw ? (JSON.parse(raw) as Partial<AmbientState>) : {};
    const sound = SOUNDS.includes(data.sound as SoundId) ? (data.sound as SoundId) : 'rain';
    const volume = typeof data.volume === 'number' ? Math.min(1, Math.max(0, data.volume)) : 0.5;
    return { sound, volume };
  } catch {
    return { sound: 'rain', volume: 0.5 };
  }
}

function savePrefs(state: AmbientState): void {
  try {
    globalThis.localStorage?.setItem(
      PREFS_KEY,
      JSON.stringify({ sound: state.sound, volume: state.volume }),
    );
  } catch {
    // Storage blocked: preferences simply are not remembered.
  }
}

let state: AmbientState = {
  ...loadPrefs(),
  playing: false,
  endsAt: null,
  timerMin: 0,
  unsupported: audioCtor() === undefined,
};
const listeners = new Set<() => void>();

function set(patch: Partial<AmbientState>): void {
  state = { ...state, ...patch };
  savePrefs(state);
  for (const l of [...listeners]) l();
}

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let voice: { stop: () => void } | null = null;
let stopTimer: ReturnType<typeof setTimeout> | null = null;
const buffers = new Map<NoiseColor, AudioBuffer>();
const rng = ideation.mulberry32(Date.now() >>> 0);

function context(): AudioContext | null {
  if (ctx) return ctx;
  const Ctor = audioCtor();
  if (!Ctor) return null;
  ctx = new Ctor();
  master = ctx.createGain();
  master.gain.value = 0;
  master.connect(ctx.destination);
  return ctx;
}

function noiseBuffer(audio: AudioContext, color: NoiseColor): AudioBuffer {
  const cached = buffers.get(color);
  if (cached) return cached;
  const length = Math.floor(audio.sampleRate * LOOP_SECONDS);
  const buffer = audio.createBuffer(2, length, audio.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const data = new Float32Array(length);
    fillNoise(data, color, rng);
    crossfadeLoop(data, Math.floor(audio.sampleRate * 0.05));
    buffer.copyToChannel(data, ch);
  }
  buffers.set(color, buffer);
  return buffer;
}

/** Blends the tail into the head so the loop point is inaudible. */
function crossfadeLoop(data: Float32Array, n: number): void {
  const len = data.length;
  for (let i = 0; i < n; i++) {
    const t = i / n;
    data[i] = (data[i] ?? 0) * t + (data[len - n + i] ?? 0) * (1 - t);
  }
}

function startLayer(audio: AudioContext, out: AudioNode, layer: Layer): () => void {
  const src = audio.createBufferSource();
  src.buffer = noiseBuffer(audio, layer.color);
  src.loop = true;
  src.loopEnd = LOOP_SECONDS - 0.05;
  const filter = audio.createBiquadFilter();
  filter.type = layer.filter.type;
  filter.frequency.value = layer.filter.frequency;
  if (layer.filter.q !== undefined) filter.Q.value = layer.filter.q;
  const gain = audio.createGain();
  gain.gain.value = layer.gain;
  src.connect(filter).connect(gain).connect(out);
  let lfo: OscillatorNode | null = null;
  if (layer.swell) {
    lfo = audio.createOscillator();
    lfo.frequency.value = layer.swell.rate;
    const depth = audio.createGain();
    depth.gain.value = layer.gain * layer.swell.depth;
    lfo.connect(depth).connect(gain.gain);
    lfo.start();
  }
  src.start(0, rng() * LOOP_SECONDS);
  return () => {
    src.stop();
    lfo?.stop();
  };
}

function playAccent(audio: AudioContext, out: AudioNode, accent: Accent): void {
  const t = audio.currentTime;
  const env = audio.createGain();
  env.connect(out);
  env.gain.setValueAtTime(0, t);
  if (accent.kind === 'drop') {
    const src = audio.createBufferSource();
    src.buffer = noiseBuffer(audio, 'white');
    const band = audio.createBiquadFilter();
    band.type = 'bandpass';
    band.frequency.value = 1500 + rng() * 4500;
    band.Q.value = 6;
    src.connect(band).connect(env);
    env.gain.linearRampToValueAtTime(accent.gain * (0.4 + rng()), t + 0.004);
    env.gain.exponentialRampToValueAtTime(0.0001, t + 0.06);
    src.start(t, rng() * LOOP_SECONDS, 0.08);
    return;
  }
  const osc = audio.createOscillator();
  osc.type = 'sine';
  osc.connect(env);
  if (accent.kind === 'clink') {
    osc.frequency.value = 2200 + rng() * 2400;
    env.gain.linearRampToValueAtTime(accent.gain * (0.5 + rng() * 0.5), t + 0.003);
    env.gain.exponentialRampToValueAtTime(0.0001, t + 0.35);
    osc.start(t);
    osc.stop(t + 0.4);
  } else {
    // A bird call: two or three quick upward sweeps.
    const base = 2600 + rng() * 2000;
    const notes = 2 + Math.floor(rng() * 2);
    for (let i = 0; i < notes; i++) {
      const s = t + i * 0.14;
      osc.frequency.setValueAtTime(base, s);
      osc.frequency.exponentialRampToValueAtTime(base * 1.35, s + 0.08);
      env.gain.setValueAtTime(0, s);
      env.gain.linearRampToValueAtTime(accent.gain, s + 0.02);
      env.gain.exponentialRampToValueAtTime(0.0001, s + 0.11);
    }
    osc.start(t);
    osc.stop(t + notes * 0.14 + 0.05);
  }
}

function startVoice(audio: AudioContext, out: AudioNode, sound: SoundId): { stop: () => void } {
  const scape = SOUNDSCAPES[sound];
  const stops = scape.layers.map((layer) => startLayer(audio, out, layer));
  const timers = new Set<ReturnType<typeof setTimeout>>();
  const schedule = (accent: Accent) => {
    const id = setTimeout(() => {
      timers.delete(id);
      playAccent(audio, out, accent);
      schedule(accent);
    }, nextDelay(accent.meanIntervalMs, rng));
    timers.add(id);
  };
  scape.accents.forEach(schedule);
  return {
    stop: () => {
      for (const id of timers) clearTimeout(id);
      for (const stop of stops) stop();
    },
  };
}

function rampMaster(target: number): void {
  if (!ctx || !master) return;
  master.gain.cancelScheduledValues(ctx.currentTime);
  master.gain.setTargetAtTime(target, ctx.currentTime, FADE / 3);
}

function clearStopTimer(): void {
  if (stopTimer) clearTimeout(stopTimer);
  stopTimer = null;
}

function armTimer(minutes: number): number | null {
  clearStopTimer();
  if (minutes <= 0) return null;
  const ms = minutes * 60_000;
  stopTimer = setTimeout(() => ambient.stop(), ms);
  return Date.now() + ms;
}

export const ambient = {
  getState: (): AmbientState => state,
  subscribe(listener: () => void): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  play(sound: SoundId = state.sound): void {
    const audio = context();
    if (!audio || !master) {
      set({ unsupported: true });
      return;
    }
    void audio.resume();
    voice?.stop();
    voice = startVoice(audio, master, sound);
    rampMaster(state.volume);
    set({ sound, playing: true, endsAt: state.endsAt ?? armTimer(state.timerMin) });
  },
  stop(): void {
    clearStopTimer();
    rampMaster(0);
    const current = voice;
    voice = null;
    if (current) setTimeout(() => current.stop(), FADE * 1000);
    set({ playing: false, endsAt: null });
  },
  toggle(): void {
    if (state.playing) ambient.stop();
    else ambient.play();
  },
  select(sound: SoundId): void {
    if (state.playing) ambient.play(sound);
    else set({ sound });
  },
  setVolume(volume: number): void {
    const v = Math.min(1, Math.max(0, volume));
    if (state.playing) rampMaster(v);
    set({ volume: v });
  },
  setTimer(minutes: number): void {
    set({ timerMin: minutes, endsAt: state.playing ? armTimer(minutes) : null });
  },
};

export function useAmbient(): AmbientState {
  return useSyncExternalStore(ambient.subscribe, ambient.getState);
}
