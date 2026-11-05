/**
 * Replication layer of POuxis (1.7, 3.1, 3.3, 3.11): hybrid logical clocks, field-level LWW
 * replicas with tombstones and delta sync, block documents, compact encodings and the relay
 * wire protocol with a transport-agnostic client. See README.md.
 */
export { SyncError, isSyncError } from './errors.ts';
export type { SyncErrorCode } from './errors.ts';

export {
  DEFAULT_MAX_DRIFT_MS,
  compareHlc,
  createHlc,
  decodeHlc,
  encodeHlc,
  hlcNode,
  hlcWall,
  isValidHlc,
  isValidNodeId,
  maxHlc,
} from './hlc.ts';
export type { HlcOptions, HlcTimestamp, HybridClock } from './hlc.ts';

export type { Json } from './json.ts';
export { validateOp } from './ops.ts';
export type { DeleteOp, Op, SetOp } from './ops.ts';

export { createReplica } from './replica.ts';
export type {
  ApplyResult,
  CompactOptions,
  CompactResult,
  HistoryEntry,
  Patch,
  RecordRef,
  RecordValue,
  Replica,
  ReplicaChange,
  ReplicaListener,
  ReplicaOptions,
  ReplicaSnapshot,
  VersionVector,
} from './replica.ts';

export { between, isValidOrderKey, spread } from './fractional.ts';
export type { BetweenOptions } from './fractional.ts';

export { BLOCK_TYPES, fromMarkdown, normalizeBlock, toMarkdown } from './markdown.ts';
export type { BlockContent, BlockInput, BlockType } from './markdown.ts';
export { BLOCK_HISTORY, DEFAULT_BLOCK_COLLECTION, createBlockDoc } from './blocks.ts';
export type { Block, BlockDoc, BlockDocOptions, Placement } from './blocks.ts';

export { applyTextPatch, diffText } from './text.ts';
export type { DiffOptions, TextPatch } from './text.ts';
export { decodeBatch, encodeBatch } from './codec.ts';

export {
  ERROR_CODES,
  PROTOCOL_LIMITS,
  PROTOCOL_PATH,
  encodeClientMessage,
  envelopeToOps,
  isValidCursor,
  opsToEnvelope,
  parseServerMessage,
} from './protocol.ts';
export type {
  AckMessage,
  ClientMessage,
  Envelope,
  ErrorCode,
  ErrorMessage,
  HelloMessage,
  OpsMessage,
  PushMessage,
  ServerMessage,
  StoredEnvelope,
  WelcomeMessage,
} from './protocol.ts';

export { backoff, createSyncClient } from './client.ts';
export type {
  BackoffOptions,
  EnvelopeHeader,
  SyncClient,
  SyncClientOptions,
  SyncClientState,
  SyncIssue,
  SyncIssueCode,
  SyncStatus,
} from './client.ts';
