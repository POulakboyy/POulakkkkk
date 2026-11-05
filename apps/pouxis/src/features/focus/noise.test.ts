import { describe, expect, it, vi } from 'vitest';
import { createNoisePlayer, fillNoise } from './noise.ts';

/** Deterministic pseudo-random source (LCG). */
function seeded(seed = 42) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 2 ** 32;
    return s / 2 ** 32;
  };
}

/** Mean absolute difference between consecutive samples: high for white, low for brown. */
function roughness(a: Float32Array): number {
  let sum = 0;
  for (let i = 1; i < a.length; i++) sum += Math.abs(a[i]! - a[i - 1]!);
  return sum / (a.length - 1);
}

describe('fillNoise', () => {
  it('stays within -1..1 for every colour', () => {
    for (const kind of ['white', 'pink', 'brown'] as const) {
      const out = fillNoise(kind, new Float32Array(8192), seeded());
      expect(Math.max(...out)).toBeLessThanOrEqual(1);
      expect(Math.min(...out)).toBeGreaterThanOrEqual(-1);
    }
  });

  it('gets smoother from white to pink to brown', () => {
    const [white, pink, brown] = (['white', 'pink', 'brown'] as const).map((k) =>
      roughness(fillNoise(k, new Float32Array(8192), seeded())),
    );
    expect(white!).toBeGreaterThan(pink!);
    expect(pink!).toBeGreaterThan(brown!);
  });
});

function fakeAudio() {
  const sources: { start: ReturnType<typeof vi.fn>; stop: ReturnType<typeof vi.fn> }[] = [];
  const param = () => ({
    value: 0,
    setValueAtTime: vi.fn(),
    linearRampToValueAtTime: vi.fn(),
    cancelScheduledValues: vi.fn(),
  });
  const ctx = {
    state: 'suspended',
    currentTime: 0,
    sampleRate: 1000,
    destination: {},
    resume: vi.fn(async () => {
      ctx.state = 'running';
    }),
    createBuffer: vi.fn((_c: number, length: number) => {
      const data = new Float32Array(length);
      return { getChannelData: () => data };
    }),
    createBufferSource: vi.fn(() => {
      const source = {
        buffer: null,
        loop: false,
        connect: vi.fn((n) => n),
        start: vi.fn(),
        stop: vi.fn(),
      };
      sources.push(source);
      return source;
    }),
    createGain: vi.fn(() => ({ gain: param(), connect: vi.fn((n) => n) })),
  };
  return { ctx, sources };
}

describe('createNoisePlayer', () => {
  it('creates the audio context lazily, loops a cached buffer and cross-fades colours', async () => {
    const { ctx, sources } = fakeAudio();
    const factory = vi.fn(() => ctx as unknown as AudioContext);
    const player = createNoisePlayer(factory);
    expect(factory).not.toHaveBeenCalled();

    await player.play('pink');
    expect(ctx.resume).toHaveBeenCalled();
    expect(player.kind).toBe('pink');
    expect(sources[0]?.start).toHaveBeenCalled();

    await player.play('pink');
    expect(sources).toHaveLength(1);

    await player.play('brown');
    expect(sources[0]?.stop).toHaveBeenCalled();
    expect(player.kind).toBe('brown');

    await player.play('pink');
    expect(ctx.createBuffer).toHaveBeenCalledTimes(2);

    player.stop();
    expect(player.kind).toBeNull();
    expect(factory).toHaveBeenCalledTimes(1);
  });
});
