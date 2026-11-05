# `@pouxis/core/sync` — replication layer

Local-first replication for POuxis (features 1.7 offline calendar, 3.1 local-first storage,
3.3 block documents, 3.11 low-bandwidth sync). Pure TypeScript, no dependency, no DOM or Node
API: the same code runs in the app, the CLI, tests and any future native host.

```
 app store ──change()──▶ Replica ◀──apply()── SyncClient ◀──frames──▶ relay (apps/sync-server)
              get/all ◀──┘   │ subscribe            │ encrypt/decrypt (crypto module)
                             └─ snapshot()/load() ──┘ persisted by the app
```

| File            | Role                                                                    |
| --------------- | ----------------------------------------------------------------------- |
| `hlc.ts`        | Hybrid logical clock, sortable string timestamps                        |
| `ops.ts`        | `Op` types and validation of untrusted ops                              |
| `replica.ts`    | Field-level LWW map, tombstones, version vectors, history, snapshots    |
| `fractional.ts` | Fractional order keys (`between`, `spread`)                             |
| `markdown.ts`   | Block model ⇄ Markdown                                                  |
| `blocks.ts`     | Block documents on top of a replica                                     |
| `text.ts`       | Text patches (prefix/suffix trim + bounded Myers diff)                  |
| `codec.ts`      | Compact JSON encoding of op batches                                     |
| `protocol.ts`   | Wire protocol with the relay, envelopes                                 |
| `client.ts`     | Transport-agnostic sync client (state machine, outbox, backoff)         |
| `json.ts`       | JSON validation/freeze, structural equality, canonical order (internal) |

## Data model

A replica holds **collections** of **records**; a record is a map of top-level **fields**,
each an independent last-writer-wins register `(hlc, value)`. Values are JSON (validated and
deep-frozen on the way in: no `Date`, `NaN`, cycles or class instances). Nested objects and
arrays are replaced as a whole — use separate fields (or separate records, like blocks) for
data that must merge at a finer grain.

Every change is an `Op`:

```ts
type Op =
  | { type: 'set'; collection; id; field; hlc; value? } // no `value`: the field is unset
  | { type: 'delete'; collection; id; hlc };
```

`replica.change(collection, id, patch)` writes only the fields whose value actually changes,
all under a single new timestamp, and returns the ops to replicate. A field set to `undefined`
is unset (the model omits absent optional fields).

## Guarantees

- **Convergence (strong eventual consistency).** `apply` is a join of registers: idempotent,
  commutative and associative. Two replicas that have received the same set of ops hold the
  same state, whatever the order, batching or duplication of deliveries. Property tests run
  random concurrent sessions on several replicas with skewed clocks, then deliver every op in
  random order with duplicates (`convergence.test.ts`).
- **Per-field merge.** Concurrent edits of different fields of a record are all kept; for
  one field the write with the highest HLC wins. Exact HLC ties (only possible when two
  replicas share a node id, which they must not) are broken by the canonical JSON order of
  the values, so even then replicas agree.
- **Causality.** An edit made after seeing another one always has a higher timestamp
  (HLC `receive`), so it wins, whatever the physical clocks say.
- **Not guaranteed:** intention preservation for concurrent edits of the _same_ text field
  (the last one wins; every version stays in the history when the field is tracked).

### Tombstones: delete wins

A deletion is a tombstone on the record. **It wins over every write to that record — before
or after it in HLC order — and is final for that id.** A concurrent edit made on another
device that had not seen the deletion is discarded, as is any later write.

Why: with LWW per field, letting a later write "resurrect" the record would bring back only
the fields written after the deletion — a partial, inconsistent record. Ids are random
UUIDs and never reused, so finality costs nothing; "restore from trash" is modelled by the
app as a field (`archived`, `status`) rather than a deletion. Local `change()` on a deleted
record returns `[]`. Tested in both delivery orders and when the delete arrives before the
record itself.

### Clock drift

`receive` refuses remote timestamps more than `maxDriftMs` (default 24 h) ahead of the local
physical clock, so one device with a wrong clock cannot drag everyone into the future. The
replica keeps such ops **deferred** (in memory and in snapshots, deduplicated) and retries them
on every `apply` until local time catches up; `deferred()` exposes them so the app can warn
the user. Within the tolerance the remote clock is adopted (standard HLC behaviour). Counter
overflow borrows the next millisecond, so the clock stays strictly monotonic.

## Hybrid logical clock

`createHlc(nodeId, now?, { maxDriftMs?, last? })` → `{ tick(), receive(remote), peek() }`.
Timestamps are fixed-width strings, so `<` on strings is the timestamp order:

```
0loyw3v28-00004-device-a      wall ms (9 base-36 digits) - counter (5 base-36) - node id
```

Node ids are 1–64 printable ASCII characters without spaces (wire-safe). `last` (restored
from a snapshot) keeps the clock monotonic across restarts even if the device clock went back.

## Delta sync and version vectors

`versionVector()` maps each node to the highest timestamp seen from it. `opsSince(vv)` returns
the state not covered by `vv`: the winning register or tombstone of every field newer than
what `vv` reports for its origin node, sorted by HLC. Superseded writes are never sent.

Precondition: a replica's version vector is exact when it receives each origin's ops through
full deltas (`opsSince`) or in log order (the relay preserves push order). Arbitrary
out-of-order delivery still converges, but then use full exchange rather than `opsSince`.

## Snapshots, compaction, history

- `snapshot()` is plain JSON (records, version vector, clock, horizon, deferred ops, history);
  `load(snapshot)` **merges** it into the replica (safe to call on a non-empty replica).
- `compact({ horizon })` removes tombstones older than `horizon`. Only safe when every replica
  has seen all ops up to it (e.g. the minimum of all known version vectors); afterwards, ops
  older than the horizon that target an unknown record are discarded, so a late duplicate
  cannot resurrect a purged record. `compact({ historyLimit })` trims histories.
- `history` option (`{ blocks: ['text'] }`) keeps up to `historyLimit` (default 50) versions per
  tracked field, in HLC order, deduplicated. History is **local**: it contains the writes this
  replica observed; a replica synced through deltas never sees intermediate versions it did
  not receive. In snapshots, each string version followed by a newer one is stored as the text
  patch that rebuilds it from the newer one (successive drafts differ by a few characters).

## Block documents (3.3)

`createBlockDoc(replica, docId, { collection = 'blocks', random?, createId? })`. Each block is a
record with a stable id and LWW fields `doc`, `type`, `text`, `pos`, plus `level` (heading),
`checked` (to-do), `lang` (code), `indent` (list items). Consequences:

- concurrent edits of different blocks, or of different fields of one block (tick a to-do
  while its text is edited, move a block while it is edited) all merge;
- **order** is a fractional key `pos` (`between(a, b)`), compared as a string, ties broken by
  block id. Insert and move write only the moved block's key. Random jitter digits make
  concurrent inserts at the same place pick distinct keys; if two keys still collide, the
  next insert between them re-spaces the tied run;
- delete follows the record policy (delete wins).

API: `blocks()`, `get(id)`, `insert(input, { after | before })` → `{ block, ops }`,
`update(id, input)`, `move(id, placement)`, `remove(id)`, `blockHistory(id)` (requires
`createReplica({ history: BLOCK_HISTORY })`), `toMarkdown()`, `setMarkdown(md)`.

`setMarkdown` aligns the current blocks with the parsed document (longest common
subsequence of identical blocks, then pairwise in-place edits inside each gap): untouched
blocks are not written at all, edited ones keep their id and history.

Markdown (`toMarkdown` / `fromMarkdown`): paragraphs, ATX headings, bullet / numbered / to-do
items with nesting (two spaces per level), quotes, fenced code (fence longer than any fence
inside the code), dividers. Inline Markdown stays verbatim. Lines that would read as block
syntax are escaped with `\`. Round trip is exact for normalized blocks, except that a blank
line inside a paragraph, quote or list item splits it and headings are single-line.
The current alignment is O(n·m) in time and memory for n and m blocks.

## Low bandwidth (3.11)

- **Coalescing:** the client sends only the newest queued write of each field; a delete drops
  queued writes of its record; `change()` skips unchanged values.
- **Compact batches:** `encodeBatch(ops)` interns collections, record keys and timestamps
  (`[1, collections, keys, hlcs, ops]`); `decodeBatch` validates strictly. A typical batch is
  less than half the size of plain JSON ops (tested).
- **Text patches:** `diffText(base, target, { maxEdits = 512 })` trims the common prefix and
  suffix, then runs Myers' O(ND) diff on the middle, bounded so pathological inputs degrade to
  a single replacement. A patch is `(number | string)[]` (retain n / delete −n / insert) over
  UTF-16 units covering the whole base; `applyTextPatch` throws `patch-mismatch` when it does
  not fit. Used for history storage; usable by any channel that shares a base text.

## Wire protocol

JSON text frames over WebSocket at `/v1/sync`, byte-compatible with
`apps/sync-server/src/protocol.ts` (the tests run every client frame through the relay's own
validator and parse every relay message with the client parser).

```ts
type Envelope = { id: string; hlc: string; node: string; payload: string };
// client → relay
{ t: 'hello'; space; node; since: string | null; token }
{ t: 'push'; envelopes: Envelope[] }
// relay → client
{ t: 'welcome'; cursor }
{ t: 'ack'; ids: string[]; cursor }
{ t: 'ops'; envelopes: (Envelope & { seq: number })[]; cursor }
{ t: 'error'; code; message }
```

- One append-only log per space; `cursor = String(seq)` of the last entry delivered (`'0'`
  before the first). The relay is idempotent on envelope id and never echoes a client's own
  pushes. `payload` is opaque to it: an `encodeBatch` string, or its ciphertext.
- `opsToEnvelope(ops, node)` builds a cleartext envelope; its id is
  `node.minClock.maxClock.count` — deterministic, so a batch rebuilt after a reconnection with
  the same ops gets the same id and is deduplicated, and it reveals nothing about the content.
  This relies on batches never splitting ops of one timestamp, which the client guarantees.
- `envelopeToOps(envelope)` rejects ops claiming another origin node or a timestamp above the
  envelope's (forged or corrupted batch).
- Limits mirrored in `PROTOCOL_LIMITS` (500 envelopes per push, 256 KiB payload, 128-char ids).

## Sync client

```ts
const client = createSyncClient({
  replica,
  space,
  token, // token may be a function (refreshed per connection)
  send: (message) => socket.send(encodeClientMessage(message)),
  onStatus,
  onIssue,
  onPersist: (state) => save(state), // { cursor, acked }: two strings
  state: await load(), // resume
  encrypt: (payload, h) =>
    encryptPayload(key, payload, { spaceId, id: h.id, hlc: h.hlc, node: h.node }),
  decrypt: (sealed, h) =>
    decryptPayload<string>(key, sealed, { spaceId, id: h.id, hlc: h.hlc, node: h.node }),
});
socket.onopen = () => client.connected();
socket.onmessage = (event) => client.receive(event.data);
socket.onclose = () => {
  client.disconnected();
  setTimeout(reconnect, client.retryDelay());
};
```

States: `offline → connecting → (welcome) syncing → (outbox drained) live`; `disconnected()`
returns to `offline`. The protocol has no end-of-backlog marker, so `live` means "handshake done
and every own op acknowledged"; remote backlog pages may still be arriving.

- **Outbox without persistence.** The client persists only `acked` (highest own timestamp
  acknowledged) and `cursor`. On every `welcome` it rebuilds the outbox from the replica
  (`opsSince({ [node]: acked }, { origin: node })`), which also resends anything in flight when
  the connection dropped. Offline edits are simply replica changes.
- Envelopes respect `maxOpsPerEnvelope` (256), a cleartext budget `maxPayloadBytes` (96 KiB,
  leaving room for encryption), `maxEnvelopesPerPush` (100) and `maxInFlight` (500).
- Incoming pages are applied in order, then the cursor advances (`onPersist`). An envelope that
  cannot be decrypted or decoded **halts** the client by default (status `error`, cursor kept,
  nothing lost — fix the key and reconnect); `onBadEnvelope: 'skip'` reports and moves on.
- Relay errors: `unauthorized` → fatal (`error` until the app reconnects with a new token);
  `bad_cursor` → cursor reset to `null` (full resync on next connection); `rate_limited` →
  unacknowledged envelopes are resent after `retryAfterMs` (via `setTimer` when provided,
  otherwise on the next flush); `quota_exceeded` → pushes paused until the next connection;
  others are reported with a backoff hint, the relay closes the connection.
- `backoff(attempt, { baseMs = 500, maxMs = 30000 })`: exponential with full jitter;
  `client.retryDelay()` applies it to consecutive failed connection attempts.

## Errors

`SyncError` with `code`: `invalid`, `invalid-hlc`, `clock-drift`, `decode`, `patch-mismatch`.
`isSyncError(error, code?)` narrows.

## Tests

```sh
cd packages/core && npx vitest run src/sync
```

Covers: HLC order, monotonicity under backwards and skewed clocks, drift and overflow;
merge laws and convergence properties (random concurrent sessions, random order, duplicates,
arbitrary batching, associativity, version-vector gossip); tombstones in every order and after
compaction; deferred drifted ops; history and its patch encoding; snapshots; fractional keys;
block documents (concurrent inserts, move vs edit, tied keys, history, Markdown re-import,
random concurrent sessions); Markdown round trips; text patch round trips and bounds; batch
codec validation; protocol compatibility with the relay validator; the sync client against an
in-memory relay (live sync, offline queue and coalescing, resend after a lost ack with
deduplication, resume from persisted state, end-to-end encryption, bad envelopes, auth,
cursor reset, rate limiting, quota, envelope splitting).
