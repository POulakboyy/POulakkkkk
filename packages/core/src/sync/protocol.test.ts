import { describe, expect, it } from 'vitest';
import { encodeBatch } from './codec.ts';
import {
  encodeClientMessage,
  envelopeToOps,
  opsToEnvelope,
  parseServerMessage,
  type ClientMessage,
} from './protocol.ts';
import { createReplica } from './replica.ts';
import { manualClock } from './test-utils.ts';

// The relay's own validator: every client frame must pass it unchanged (byte compatibility).
const SERVER_PROTOCOL = new URL('../../../../apps/sync-server/src/protocol.ts', import.meta.url)
  .href;
type ServerProtocol = {
  parseClientMessage(raw: string): { ok: true; message: unknown } | { ok: false; error: string };
  encodeServerMessage(message: unknown): string;
};
const server = (await import(/* @vite-ignore */ SERVER_PROTOCOL)) as ServerProtocol;

function ops() {
  const clock = manualClock();
  const replica = createReplica({ nodeId: 'phone-7f3a', now: clock.now });
  return [
    ...replica.change('tasks', 't1', { title: 'Relire', done: false }),
    ...replica.change('tasks', 't2', 'delete'),
  ];
}

describe('envelopes', () => {
  it('round-trips ops and carries the max HLC and the node', () => {
    const batch = ops();
    const envelope = opsToEnvelope(batch, 'phone-7f3a');
    expect(envelope.hlc).toBe(batch[2]?.hlc);
    expect(envelope.node).toBe('phone-7f3a');
    expect(envelopeToOps(envelope)).toEqual(batch);
  });

  it('derives the same id for the same ops and a different one otherwise', () => {
    const batch = ops();
    expect(opsToEnvelope(batch, 'phone-7f3a').id).toBe(opsToEnvelope([...batch], 'phone-7f3a').id);
    expect(opsToEnvelope(batch.slice(1), 'phone-7f3a').id).not.toBe(
      opsToEnvelope(batch, 'phone-7f3a').id,
    );
    expect(opsToEnvelope(batch, 'phone-7f3a').id.length).toBeLessThanOrEqual(128);
  });

  it('refuses ops of another node and forged envelopes', () => {
    const batch = ops();
    expect(() => opsToEnvelope(batch, 'other')).toThrow();
    expect(() => opsToEnvelope([], 'x')).toThrow();
    const envelope = opsToEnvelope(batch, 'phone-7f3a');
    expect(() => envelopeToOps({ ...envelope, node: 'intruder' })).toThrow();
    expect(() => envelopeToOps({ ...envelope, hlc: batch[0]!.hlc })).toThrow();
    expect(() => envelopeToOps({ ...envelope, payload: encodeBatch(batch).slice(3) })).toThrow();
  });
});

describe('wire messages', () => {
  it('client frames pass the relay validator unchanged', () => {
    const envelope = opsToEnvelope(ops(), 'phone-7f3a');
    const messages: ClientMessage[] = [
      { t: 'hello', space: 'space-1', node: 'phone-7f3a', since: null, token: 'tok.en-1' },
      { t: 'hello', space: 'space-1', node: 'phone-7f3a', since: '42', token: 'tok' },
      { t: 'push', envelopes: [envelope] },
    ];
    for (const message of messages) {
      const parsed = server.parseClientMessage(encodeClientMessage(message));
      expect(parsed).toEqual({ ok: true, message });
    }
  });

  it('parses every server message produced by the relay encoder', () => {
    const envelope = { ...opsToEnvelope(ops(), 'phone-7f3a'), seq: 3 };
    const messages = [
      { t: 'welcome', cursor: '0' },
      { t: 'ack', ids: [envelope.id], cursor: '3' },
      { t: 'ops', envelopes: [envelope], cursor: '3' },
      { t: 'error', code: 'rate_limited', message: 'slow down' },
    ];
    for (const message of messages) {
      expect(parseServerMessage(server.encodeServerMessage(message))).toEqual(message);
    }
  });

  it('rejects malformed server frames and maps unknown error codes', () => {
    for (const raw of [
      'nope',
      '[]',
      '{"t":"welcome","cursor":"-1"}',
      '{"t":"ack","ids":[1],"cursor":"1"}',
      '{"t":"ops","envelopes":[{"id":"x"}],"cursor":"1"}',
      '{"t":"other"}',
    ]) {
      expect(() => parseServerMessage(raw)).toThrow();
    }
    expect(parseServerMessage('{"t":"error","code":"teapot","message":"m"}')).toEqual({
      t: 'error',
      code: 'internal',
      message: '[teapot] m',
    });
  });
});
