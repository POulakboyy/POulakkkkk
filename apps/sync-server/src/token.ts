/**
 * Space access tokens: `base64url(claims JSON) "." base64url(HMAC-SHA256(secret, input))`.
 *
 * - The MAC covers a domain-separated input (`pouxis-sync-token.v1.` + encoded claims).
 * - The MAC is verified in constant time *before* the claims are decoded, so untrusted
 *   JSON is never parsed.
 * - Several secrets can be accepted at once (key rotation); the first one signs.
 *
 * Also usable as a CLI to mint tokens (reads `POUXIS_SYNC_SECRET`):
 *
 *   node src/token.ts --space <space-id> [--node <node-id>] [--ttl 30d]
 */
import { createHmac, timingSafeEqual } from 'node:crypto';
import { realpathSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { DEFAULT_LIMITS, isValidIdentifier } from './protocol.ts';

export interface TokenClaims {
  /** Format version. */
  v: 1;
  /** Space the bearer may sync. */
  space: string;
  /** Expiry, Unix seconds. */
  exp: number;
  /** Issued at, Unix seconds (informational). */
  iat?: number;
  /** When present, only this node id may use the token. */
  node?: string;
}

export type TokenFailure = 'malformed' | 'bad_signature' | 'bad_claims' | 'expired';

export type VerifyResult = { ok: true; claims: TokenClaims } | { ok: false; reason: TokenFailure };

const MAC_CONTEXT = 'pouxis-sync-token.v1.';
const B64URL_RE = /^[A-Za-z0-9_-]+$/;
const MAC_BYTES = 32;
/** Claims larger than this are refused before any work is done. */
const MAX_CLAIMS_CHARS = 2048;

function mac(secret: string, encodedClaims: string): Buffer {
  return createHmac('sha256', secret)
    .update(MAC_CONTEXT + encodedClaims)
    .digest();
}

export interface SignOptions {
  space: string;
  /** Expiry, Unix seconds. */
  exp: number;
  node?: string;
  /** Issued at, Unix seconds. Defaults to now. */
  iat?: number;
}

/** Mints a token. Throws on invalid input. */
export function signToken(options: SignOptions, secret: string): string {
  if (secret.length === 0) throw new Error('secret must not be empty');
  if (!isValidIdentifier(options.space, DEFAULT_LIMITS.maxIdLength)) {
    throw new Error('space: invalid identifier');
  }
  if (options.node !== undefined && !isValidIdentifier(options.node, DEFAULT_LIMITS.maxIdLength)) {
    throw new Error('node: invalid identifier');
  }
  if (!Number.isSafeInteger(options.exp) || options.exp <= 0) {
    throw new Error('exp: must be a positive integer (Unix seconds)');
  }
  const claims: TokenClaims = {
    v: 1,
    space: options.space,
    exp: options.exp,
    iat: options.iat ?? Math.floor(Date.now() / 1000),
  };
  if (options.node !== undefined) claims.node = options.node;
  const encoded = Buffer.from(JSON.stringify(claims), 'utf8').toString('base64url');
  return `${encoded}.${mac(secret, encoded).toString('base64url')}`;
}

/**
 * Verifies a token against the accepted secrets. Does not check space/node binding: use
 * {@link authorize} for that.
 */
export function verifyToken(
  token: string,
  secrets: readonly string[],
  nowSeconds: number = Math.floor(Date.now() / 1000),
): VerifyResult {
  const dot = token.indexOf('.');
  if (dot <= 0 || dot !== token.lastIndexOf('.')) return { ok: false, reason: 'malformed' };
  const encoded = token.slice(0, dot);
  const signature = token.slice(dot + 1);
  if (
    encoded.length > MAX_CLAIMS_CHARS ||
    !B64URL_RE.test(encoded) ||
    !B64URL_RE.test(signature)
  ) {
    return { ok: false, reason: 'malformed' };
  }
  const given = Buffer.from(signature, 'base64url');
  if (given.length !== MAC_BYTES) return { ok: false, reason: 'malformed' };

  // Check every secret (no early exit) so timing does not depend on which one matches.
  let valid = false;
  for (const secret of secrets) {
    if (timingSafeEqual(mac(secret, encoded), given)) valid = true;
  }
  if (!valid) return { ok: false, reason: 'bad_signature' };

  let claims: unknown;
  try {
    claims = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8'));
  } catch {
    return { ok: false, reason: 'bad_claims' };
  }
  const parsed = parseClaims(claims);
  if (!parsed) return { ok: false, reason: 'bad_claims' };
  if (parsed.exp <= nowSeconds) return { ok: false, reason: 'expired' };
  return { ok: true, claims: parsed };
}

function parseClaims(value: unknown): TokenClaims | null {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  const { v, space, exp, iat, node } = record;
  if (v !== 1) return null;
  if (!isValidIdentifier(space, DEFAULT_LIMITS.maxIdLength)) return null;
  if (typeof exp !== 'number' || !Number.isSafeInteger(exp)) return null;
  if (iat !== undefined && (typeof iat !== 'number' || !Number.isSafeInteger(iat))) return null;
  if (node !== undefined && !isValidIdentifier(node, DEFAULT_LIMITS.maxIdLength)) return null;
  const claims: TokenClaims = { v: 1, space, exp };
  if (iat !== undefined) claims.iat = iat;
  if (node !== undefined) claims.node = node;
  return claims;
}

export type AuthorizeFailure = TokenFailure | 'wrong_space' | 'wrong_node';

/** Verifies the token and checks it grants `space` (and `node` when the token is bound). */
export function authorize(
  token: string,
  space: string,
  node: string,
  secrets: readonly string[],
  nowSeconds?: number,
): { ok: true; claims: TokenClaims } | { ok: false; reason: AuthorizeFailure } {
  const result = verifyToken(token, secrets, nowSeconds);
  if (!result.ok) return result;
  // Space ids are not secret, a plain comparison is fine here.
  if (result.claims.space !== space) return { ok: false, reason: 'wrong_space' };
  if (result.claims.node !== undefined && result.claims.node !== node) {
    return { ok: false, reason: 'wrong_node' };
  }
  return result;
}

const DURATION_RE = /^([1-9][0-9]{0,9})([smhd]?)$/;
const UNIT_SECONDS: Readonly<Record<string, number>> = { '': 1, s: 1, m: 60, h: 3600, d: 86400 };

/** Parses `3600`, `90s`, `15m`, `12h`, `30d` into seconds. Returns `undefined` if invalid. */
export function parseDuration(text: string): number | undefined {
  const match = DURATION_RE.exec(text.trim());
  if (!match) return undefined;
  const unit = UNIT_SECONDS[match[2] ?? ''];
  if (unit === undefined) return undefined;
  const seconds = Number(match[1]) * unit;
  return Number.isSafeInteger(seconds) ? seconds : undefined;
}

/* ------------------------------------------------------------------------------------------ */
/* CLI                                                                                         */
/* ------------------------------------------------------------------------------------------ */

const USAGE = `Usage: node src/token.ts --space <space-id> [--node <node-id>] [--ttl <duration>]

Mints a sync token signed with POUXIS_SYNC_SECRET and prints it on stdout.
  --space  space id the token grants access to (required)
  --node   bind the token to a single node id (optional)
  --ttl    lifetime: 3600, 90s, 15m, 12h, 30d (default 30d)`;

export function parseCliArgs(argv: readonly string[]): SignOptionsInput | string {
  const out: SignOptionsInput = { ttl: 30 * 86400 };
  for (let i = 0; i < argv.length; i++) {
    const flag = argv[i];
    const value = argv[i + 1];
    if (flag === '--help' || flag === '-h') return USAGE;
    if (value === undefined) return `missing value for ${flag}\n\n${USAGE}`;
    i++;
    if (flag === '--space') out.space = value;
    else if (flag === '--node') out.node = value;
    else if (flag === '--ttl') {
      const ttl = parseDuration(value);
      if (ttl === undefined) return `invalid --ttl "${value}"\n\n${USAGE}`;
      out.ttl = ttl;
    } else return `unknown option ${flag}\n\n${USAGE}`;
  }
  if (out.space === undefined) return `--space is required\n\n${USAGE}`;
  return out;
}

export interface SignOptionsInput {
  space?: string;
  node?: string;
  ttl: number;
}

async function main(): Promise<number> {
  const parsed = parseCliArgs(process.argv.slice(2));
  if (typeof parsed === 'string') {
    process.stderr.write(parsed + '\n');
    return parsed === USAGE ? 0 : 2;
  }
  // Imported lazily so that importing this module stays free of config side effects.
  const { resolveSecrets } = await import('./config.ts');
  let secrets: string[];
  let insecure: boolean;
  try {
    ({ secrets, insecure } = resolveSecrets(process.env));
  } catch (error) {
    process.stderr.write(`${(error as Error).message}\n`);
    return 2;
  }
  const [secret] = secrets;
  if (secret === undefined) return 2;
  if (insecure) {
    process.stderr.write('warning: using the insecure development secret (NODE_ENV=development)\n');
  }
  const exp = Math.floor(Date.now() / 1000) + parsed.ttl;
  try {
    const options: SignOptions = { space: parsed.space ?? '', exp };
    if (parsed.node !== undefined) options.node = parsed.node;
    process.stdout.write(signToken(options, secret) + '\n');
  } catch (error) {
    process.stderr.write(`${(error as Error).message}\n`);
    return 2;
  }
  return 0;
}

function isEntryPoint(): boolean {
  const entry = process.argv[1];
  if (entry === undefined) return false;
  try {
    return realpathSync(entry) === realpathSync(fileURLToPath(import.meta.url));
  } catch {
    return false;
  }
}

if (isEntryPoint()) {
  main().then(
    (code) => {
      process.exitCode = code;
    },
    (error: unknown) => {
      process.stderr.write(`${String(error)}\n`);
      process.exitCode = 1;
    },
  );
}
