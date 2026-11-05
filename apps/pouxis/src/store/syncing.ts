import { crypto as pxCrypto } from '@pouxis/core';
import type { sync } from '@pouxis/core';
import type { Persistence } from './persistence.ts';
import { connectRelay, relayUrl } from './relay.ts';
import type { RelayConnection, SocketFactory } from './relay.ts';
import { MAX_SLOTS } from './slots.ts';
import type { SyncConfig, SyncInfo, SyncStatus } from './types.ts';
import { deriveSyncKey, MIN_SYNC_PASSPHRASE_LENGTH } from './vault.ts';

const META_CONFIG = 'sync:config';
const META_KEY = 'sync:key';
const META_CHECK = 'sync:check';
const stateKey = (node: string): string => `sync:state:${node}`;

const CHECK_PLAINTEXT = 'pouxis/sync-key-check/v1';
const checkContext = (space: string) => ({
  spaceId: space,
  id: 'key-check',
  hlc: '0',
  node: 'key-check',
});

const SPACE_RE = /^[\x21-\x7e]{1,128}$/;

export interface SyncControllerOptions {
  persistence: Persistence;
  /** Any observable change (status, pending count, issue, configuration). */
  onChange(): void;
  socket?: SocketFactory;
  /** PBKDF2 iterations (tests only; never below the core minimum). */
  iterations?: number;
}

export interface ConfigureInput {
  url: string;
  token: string;
  space?: string;
  passphrase: string;
}

/**
 * Checks a sync configuration without touching anything, and normalizes it. `space` is only
 * returned when the caller joins an existing space.
 */
export function validateSyncInput(input: ConfigureInput): {
  url: string;
  token: string;
  space?: string;
} {
  const url = input.url.trim();
  relayUrl(url);
  const token = input.token.trim();
  if (!token) throw new Error('A relay token is required');
  if (pxCrypto.passphraseLength(input.passphrase) < MIN_SYNC_PASSPHRASE_LENGTH) {
    throw new Error('Passphrase too short');
  }
  const space = input.space?.trim();
  if (!space) return { url, token };
  if (!SPACE_RE.test(space)) throw new Error('Invalid space id');
  return { url, token, space };
}

/**
 * Owns the sync configuration, the space key and the relay connection of one replica.
 * Secrets live in the persistence meta area only: the token (needed to reconnect) and the key
 * as a non-extractable `CryptoKey` handle. The passphrase is never stored.
 */
export class SyncController {
  private readonly options: SyncControllerOptions;
  private replica: sync.Replica | undefined;
  private config: SyncConfig | undefined;
  private key: CryptoKey | undefined;
  private relay: RelayConnection | undefined;
  private problem: { code: string; message: string } | undefined;
  private cached: SyncInfo | undefined;

  constructor(options: SyncControllerOptions) {
    this.options = options;
  }

  /** Binds the replica and resumes a saved configuration. */
  async start(replica: sync.Replica): Promise<void> {
    this.replica = replica;
    const { persistence } = this.options;
    this.config = await persistence.getMeta<SyncConfig>(META_CONFIG);
    this.key = this.config ? await persistence.getMeta<CryptoKey>(META_KEY) : undefined;
    await this.connect();
  }

  async configure(input: ConfigureInput): Promise<string> {
    const { url, token, space: joined } = validateSyncInput(input);
    const space = joined ?? globalThis.crypto.randomUUID();
    const key = await this.derive(input.passphrase, space);
    const config: SyncConfig = { url, space, token };
    const { persistence } = this.options;
    this.closeRelay();
    // The client state (cursor, acked) belongs to a relay log: a new space starts over.
    if (this.config?.space !== space || this.config.url !== url) await this.forgetCursors();
    await persistence.setMeta(META_CONFIG, config);
    await persistence.setMeta(META_KEY, key);
    await persistence.setMeta(META_CHECK, await this.sealCheck(key, space));
    this.config = config;
    this.key = key;
    this.problem = undefined;
    await this.connect();
    return space;
  }

  async unlock(passphrase: string): Promise<void> {
    const config = this.config;
    if (!config) throw new Error('Sync is not configured');
    const key = await this.derive(passphrase, config.space);
    const check = await this.options.persistence.getMeta<string>(META_CHECK);
    if (check !== undefined) {
      try {
        await pxCrypto.decryptPayload(key, check, checkContext(config.space));
      } catch {
        throw new Error('Wrong passphrase');
      }
    }
    await this.options.persistence.setMeta(META_KEY, key);
    this.key = key;
    this.problem = undefined;
    await this.connect();
  }

  async disable(): Promise<void> {
    this.closeRelay();
    const { persistence } = this.options;
    await Promise.all([META_CONFIG, META_KEY, META_CHECK].map((k) => persistence.deleteMeta(k)));
    await this.forgetCursors();
    this.config = undefined;
    this.key = undefined;
    this.problem = undefined;
    this.changed();
  }

  syncNow(): void {
    if (this.relay) this.relay.reconnect();
    else void this.connect();
  }

  status(): SyncStatus {
    if (!this.relay) return this.problem ? 'error' : 'offline';
    const status = this.relay.status();
    return status === 'live' ? 'synced' : status;
  }

  info(): SyncInfo {
    if (this.cached) return this.cached;
    const info: SyncInfo = {
      status: this.status(),
      configured: this.config !== undefined,
      locked: this.config !== undefined && this.key === undefined,
      encrypted: true,
      pending: this.relay?.pending() ?? 0,
    };
    if (this.config) {
      info.url = this.config.url;
      info.space = this.config.space;
    }
    const last = this.relay?.lastSyncedAt();
    if (last !== undefined) info.lastSyncedAt = last;
    const issue = this.relay?.issue() ?? this.problem;
    if (issue) info.issue = issue;
    this.cached = Object.freeze(info);
    return this.cached;
  }

  /** Drops the cached `info()` (the pending count moves with every local change). */
  invalidate(): void {
    this.cached = undefined;
  }

  /** Resolves when the relay connection has processed every received frame (tests). */
  idle(): Promise<void> {
    return this.relay?.idle() ?? Promise.resolve();
  }

  close(): void {
    this.closeRelay();
    this.replica = undefined;
  }

  private async connect(): Promise<void> {
    const { replica, config, key } = this;
    if (!replica || !config || !key || this.relay) {
      this.changed();
      return;
    }
    const persistence = this.options.persistence;
    const node = replica.node;
    const state = await persistence.getMeta<sync.SyncClientState>(stateKey(node));
    if (this.replica !== replica || this.relay) return;
    try {
      this.relay = connectRelay({
        replica,
        url: config.url,
        space: config.space,
        token: config.token,
        key,
        ...(state ? { state } : {}),
        saveState: (next) => void persistence.setMeta(stateKey(node), next).catch(() => {}),
        onChange: () => this.changed(),
        ...(this.options.socket ? { socket: this.options.socket } : {}),
      });
    } catch (error) {
      this.problem = { code: 'config', message: (error as Error).message };
    }
    this.changed();
  }

  private derive(passphrase: string, space: string): Promise<CryptoKey> {
    if (pxCrypto.passphraseLength(passphrase) < MIN_SYNC_PASSPHRASE_LENGTH) {
      return Promise.reject(new Error('Passphrase too short'));
    }
    const iterations = this.options.iterations;
    return deriveSyncKey(passphrase, space, iterations === undefined ? {} : { iterations });
  }

  private sealCheck(key: CryptoKey, space: string): Promise<string> {
    return pxCrypto.encryptPayload(key, CHECK_PLAINTEXT, checkContext(space));
  }

  /** Drops the client state of every slot of this device (see `acquireNodeSlot`). */
  private async forgetCursors(): Promise<void> {
    const node = this.replica?.node;
    if (!node) return;
    const device = node.slice(0, node.lastIndexOf('.'));
    const keys = Array.from({ length: MAX_SLOTS }, (_, i) => stateKey(`${device}.${i}`));
    if (!keys.includes(stateKey(node))) keys.push(stateKey(node));
    await Promise.all(keys.map((k) => this.options.persistence.deleteMeta(k)));
  }

  private closeRelay(): void {
    this.relay?.close();
    this.relay = undefined;
  }

  private changed(): void {
    this.cached = undefined;
    this.options.onChange();
  }
}
