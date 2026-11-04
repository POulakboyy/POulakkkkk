import { describe, expect, it } from 'vitest';
import { createLogger, tag } from '../src/logger.ts';
import { Metrics } from '../src/metrics.ts';
import { TokenBucket } from '../src/rate-limit.ts';

describe('TokenBucket', () => {
  it('allows a burst then refills over time', () => {
    let now = 0;
    const bucket = new TokenBucket(3, 2, () => now);
    expect([1, 2, 3, 4].map(() => bucket.tryRemove())).toEqual([true, true, true, false]);
    now = 499;
    expect(bucket.tryRemove()).toBe(false);
    now = 500;
    expect(bucket.tryRemove()).toBe(true);
    now = 100_000;
    expect(bucket.available()).toBe(3);
  });

  it('takes nothing when the cost is too high', () => {
    const bucket = new TokenBucket(10, 1, () => 0);
    expect(bucket.tryRemove(11)).toBe(false);
    expect(bucket.available()).toBe(10);
  });

  it('rejects invalid parameters', () => {
    expect(() => new TokenBucket(0, 1)).toThrow(RangeError);
    expect(() => new TokenBucket(1, -1)).toThrow(RangeError);
  });
});

describe('logger', () => {
  it('writes one JSON object per line and redacts sensitive keys', () => {
    const lines: string[] = [];
    const logger = createLogger({
      level: 'info',
      sink: (line) => lines.push(line),
      now: () => new Date(0),
    }).child({ conn: 1 });
    logger.debug('hidden');
    logger.info('hello', { token: 'abc.def', payload: 'secret', count: 2 });
    expect(lines).toHaveLength(1);
    expect(JSON.parse(lines[0] ?? '')).toEqual({
      ts: '1970-01-01T00:00:00.000Z',
      level: 'info',
      msg: 'hello',
      conn: 1,
      token: '[redacted]',
      payload: '[redacted]',
      count: 2,
    });
  });

  it('serializes errors without throwing on cycles', () => {
    const lines: string[] = [];
    const logger = createLogger({ sink: (line) => lines.push(line) });
    const cyclic: Record<string, unknown> = {};
    cyclic['self'] = cyclic;
    logger.error('boom', { err: new Error('bad'), cyclic });
    expect(JSON.parse(lines[0] ?? '')).toMatchObject({
      msg: 'boom',
      note: 'unserializable fields',
    });
  });

  it('tags identifiers with a stable one-way hash', () => {
    expect(tag('space-1')).toMatch(/^[0-9a-f]{12}$/);
    expect(tag('space-1')).toBe(tag('space-1'));
    expect(tag('space-1')).not.toBe(tag('space-2'));
  });
});

describe('Metrics', () => {
  it('renders counters, labelled series and gauges', () => {
    const metrics = new Metrics(() => 5000);
    metrics.inc('pouxis_sync_envelopes_stored_total', 3);
    metrics.inc('pouxis_sync_connections_rejected_total', 1, { key: 'reason', value: 'origin' });
    metrics.gauge('pouxis_sync_connections_active', () => 7);
    const text = metrics.render();
    expect(text).toContain('# TYPE pouxis_sync_envelopes_stored_total counter');
    expect(text).toContain('pouxis_sync_envelopes_stored_total 3\n');
    expect(text).toContain('pouxis_sync_connections_rejected_total{reason="origin"} 1\n');
    expect(text).toContain('pouxis_sync_auth_failures_total 0\n');
    expect(text).toContain('pouxis_sync_connections_active 7\n');
    expect(metrics.get('pouxis_sync_envelopes_stored_total')).toBe(3);
  });
});
