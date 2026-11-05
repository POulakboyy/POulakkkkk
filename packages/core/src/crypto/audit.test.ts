import { beforeAll, describe, expect, it } from 'vitest';
import {
  AUDIT_GENESIS,
  type AuditEntry,
  type AuditRecord,
  appendAudit,
  exportCheckpointPublicKey,
  generateCheckpointKeyPair,
  importCheckpointPublicKey,
  signCheckpoint,
  verifyAuditChain,
  verifyCheckpoint,
} from './audit.ts';

function entry(n: number): AuditEntry {
  return {
    at: 1_800_000_000_000 + n,
    actor: 'user-1',
    action: n % 2 ? 'task.update' : 'share.create',
    target: { collection: 'tasks', id: `task-${n}` },
    details: { n },
  };
}

async function buildChain(length: number): Promise<AuditRecord[]> {
  const records: AuditRecord[] = [];
  for (let n = 0; n < length; n++) {
    records.push(await appendAudit(records.at(-1) ?? null, entry(n)));
  }
  return records;
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

let chain: AuditRecord[];
beforeAll(async () => {
  chain = await buildChain(6);
});

describe('appendAudit', () => {
  it('links records from the genesis with consecutive sequence numbers', () => {
    expect(chain[0]?.prev).toBe(AUDIT_GENESIS);
    chain.forEach((record, index) => {
      expect(record.seq).toBe(index);
      expect(record.hash).toMatch(/^[0-9a-f]{64}$/);
      if (index > 0) expect(record.prev).toBe(chain[index - 1]?.hash);
    });
  });

  it('is deterministic and independent of key order', async () => {
    const shuffled = {
      details: { n: 0 },
      target: { id: 'task-0', collection: 'tasks' },
      action: 'share.create',
      actor: 'user-1',
      at: 1_800_000_000_000,
    };
    expect((await appendAudit(null, shuffled)).hash).toBe(chain[0]?.hash);
  });

  it('snapshots the entry so later mutation cannot desync the hash', async () => {
    const mutable = entry(0);
    const record = await appendAudit(null, mutable);
    mutable.actor = 'someone-else';
    expect(record.entry.actor).toBe('user-1');
  });

  it('rejects invalid entries and heads', async () => {
    await expect(appendAudit(null, { ...entry(0), actor: '' })).rejects.toThrow(/actor/);
    await expect(appendAudit(null, { ...entry(0), at: Number.NaN })).rejects.toThrow(/at/);
    await expect(appendAudit({ seq: 0, hash: 'nope' }, entry(1))).rejects.toThrow(/head/);
  });
});

describe('verifyAuditChain', () => {
  it('accepts an intact chain and an empty one', async () => {
    expect(await verifyAuditChain(chain)).toEqual({
      ok: true,
      head: { seq: 5, hash: chain[5]?.hash },
      length: 6,
    });
    expect(await verifyAuditChain([])).toEqual({ ok: true, head: null, length: 0 });
  });

  it('detects an edited entry', async () => {
    const tampered = clone(chain);
    const target = tampered[2];
    if (target) target.entry.actor = 'attacker';
    expect(await verifyAuditChain(tampered)).toEqual({
      ok: false,
      reason: 'hash-mismatch',
      index: 2,
    });
  });

  it('detects a recomputed record that no longer links to its successor', async () => {
    const tampered = clone(chain);
    const forged = await appendAudit(chain[1] ?? null, { ...entry(2), actor: 'attacker' });
    tampered[2] = forged;
    expect(await verifyAuditChain(tampered)).toEqual({
      ok: false,
      reason: 'broken-link',
      index: 3,
    });
  });

  it('detects deletion, insertion and reordering', async () => {
    const deleted = chain.filter((_, index) => index !== 3);
    const reordered = [chain[0], chain[2], chain[1], ...chain.slice(3)];
    const inserted = [...chain.slice(0, 3), { ...clone(chain[3]), seq: 3 }, ...chain.slice(3)];
    expect(await verifyAuditChain(deleted)).toMatchObject({
      ok: false,
      reason: 'sequence-gap',
      index: 3,
    });
    expect(await verifyAuditChain(reordered)).toMatchObject({
      ok: false,
      reason: 'sequence-gap',
      index: 1,
    });
    expect(await verifyAuditChain(inserted)).toMatchObject({ ok: false, index: 4 });
  });

  it('reports malformed records', async () => {
    expect(await verifyAuditChain([{ v: 1, seq: 0 }])).toEqual({
      ok: false,
      reason: 'malformed',
      index: 0,
    });
  });

  it('verifies a suffix from a trusted head', async () => {
    const from = { seq: 2, hash: chain[2]?.hash ?? '' };
    expect(await verifyAuditChain(chain.slice(3), { from })).toMatchObject({ ok: true, length: 3 });
    expect(
      await verifyAuditChain(chain.slice(3), { from: { seq: 2, hash: chain[1]?.hash ?? '' } }),
    ).toMatchObject({ ok: false, reason: 'broken-link', index: 0 });
  });
});

describe('signed checkpoints', () => {
  let keys: CryptoKeyPair;
  beforeAll(async () => {
    keys = await generateCheckpointKeyPair();
  });

  it('detects tail truncation that the chain alone cannot reveal', async () => {
    const head = { seq: 5, hash: chain[5]?.hash ?? '' };
    const checkpoint = await signCheckpoint(head, keys.privateKey, 1_800_000_000_100);
    const truncated = chain.slice(0, 4);
    expect(await verifyAuditChain(truncated)).toMatchObject({ ok: true });
    expect(
      await verifyAuditChain(truncated, { checkpoint, checkpointKey: keys.publicKey }),
    ).toEqual({ ok: false, reason: 'truncated', index: 4 });
    expect(
      await verifyAuditChain(chain, { checkpoint, checkpointKey: keys.publicKey }),
    ).toMatchObject({
      ok: true,
    });
  });

  it('detects rewritten history behind a checkpoint', async () => {
    const checkpoint = await signCheckpoint(
      { seq: 3, hash: chain[3]?.hash ?? '' },
      keys.privateKey,
    );
    const rewritten = await buildChain(3);
    rewritten.push(await appendAudit(rewritten[2] ?? null, { ...entry(3), actor: 'attacker' }));
    expect(
      await verifyAuditChain(rewritten, { checkpoint, checkpointKey: keys.publicKey }),
    ).toEqual({
      ok: false,
      reason: 'checkpoint-mismatch',
      index: 3,
    });
  });

  it('rejects forged or altered checkpoints', async () => {
    const checkpoint = await signCheckpoint(
      { seq: 5, hash: chain[5]?.hash ?? '' },
      keys.privateKey,
    );
    const other = await generateCheckpointKeyPair();
    expect(await verifyCheckpoint(checkpoint, keys.publicKey)).toBe(true);
    expect(await verifyCheckpoint({ ...checkpoint, seq: 4 }, keys.publicKey)).toBe(false);
    expect(await verifyCheckpoint(checkpoint, other.publicKey)).toBe(false);
    expect(await verifyCheckpoint({ ...checkpoint, sig: '!!' }, keys.publicKey)).toBe(false);
    expect(
      await verifyAuditChain(chain, {
        checkpoint: { ...checkpoint, at: 1 },
        checkpointKey: keys.publicKey,
      }),
    ).toEqual({ ok: false, reason: 'bad-checkpoint-signature', index: -1 });
  });

  it('distributes the public key as a JWK', async () => {
    const jwk = await exportCheckpointPublicKey(keys.publicKey);
    const imported = await importCheckpointPublicKey(jwk);
    const checkpoint = await signCheckpoint(
      { seq: 0, hash: chain[0]?.hash ?? '' },
      keys.privateKey,
    );
    expect(await verifyCheckpoint(checkpoint, imported)).toBe(true);
    await expect(importCheckpointPublicKey({ ...jwk, d: 'secret' })).rejects.toThrow();
  });
});
