#!/usr/bin/env node
// Resolves the POuxis application version — the one Tauri stamps on installers — and the
// release tag derived from it (`v<version>`). Used by the release and mobile workflows.
//
// Resolution order (mirrors Tauri's own precedence):
//   1. apps/pouxis/src-tauri/tauri.conf.json `version` — a literal, or a path to a package.json
//   2. apps/pouxis/src-tauri/Cargo.toml `[package] version`
//   3. apps/pouxis/package.json `version` (fallback while the native shell is not committed yet)
//
// Usage:
//   node .github/scripts/app-version.mjs                    # print {version, tag, prerelease}
//   node .github/scripts/app-version.mjs --expect-tag v1.2.3  # also fail unless the tag matches
//
// When $GITHUB_OUTPUT is set, `version`, `tag` and `prerelease` are appended to it.
// Zero dependencies on purpose: it runs before `npm ci`.

import { appendFileSync, existsSync, readFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const APP_DIR = join(ROOT, 'apps', 'pouxis');
const TAURI_DIR = join(APP_DIR, 'src-tauri');

// Official SemVer 2.0.0 regular expression (https://semver.org).
const SEMVER =
  /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\+([0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*))?$/;

function fail(message) {
  console.error(`::error title=Version de l'application::${message}`);
  process.exit(1);
}

function readJson(path) {
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch (error) {
    fail(`Lecture impossible de ${path} : ${error instanceof Error ? error.message : error}`);
  }
}

function fromTauriConf() {
  const confPath = join(TAURI_DIR, 'tauri.conf.json');
  if (!existsSync(confPath)) return undefined;
  const { version } = readJson(confPath);
  if (typeof version !== 'string') return undefined;
  if (!version.endsWith('.json')) return { version, source: confPath };
  const pkgPath = resolve(TAURI_DIR, version);
  const pkg = readJson(pkgPath);
  return typeof pkg.version === 'string' ? { version: pkg.version, source: pkgPath } : undefined;
}

function fromCargoToml() {
  const cargoPath = join(TAURI_DIR, 'Cargo.toml');
  if (!existsSync(cargoPath)) return undefined;
  const text = readFileSync(cargoPath, 'utf8');
  // Only look inside the [package] table: dependency tables also contain `version = "..."`.
  const pkgTable = /^\[package\]\s*$([\s\S]*?)(?=^\[|$(?![\s\S]))/m.exec(text);
  const match = pkgTable?.[1] && /^\s*version\s*=\s*"([^"]+)"/m.exec(pkgTable[1]);
  return match ? { version: match[1], source: cargoPath } : undefined;
}

function fromAppPackage() {
  const pkgPath = join(APP_DIR, 'package.json');
  const { version } = readJson(pkgPath);
  return typeof version === 'string' ? { version, source: pkgPath } : undefined;
}

const resolved = fromTauriConf() ?? fromCargoToml() ?? fromAppPackage();
if (!resolved) fail('Aucune version trouvée (tauri.conf.json, Cargo.toml ou package.json).');

const { version } = resolved;
const source = relative(ROOT, resolved.source);
const semver = SEMVER.exec(version);
if (!semver) fail(`« ${version} » (${source}) n'est pas une version SemVer valide.`);
if (semver[5] !== undefined) {
  fail(`« ${version} » contient des métadonnées de build (+…) : non autorisé pour une release.`);
}

const tag = `v${version}`;
const prerelease = semver[4] !== undefined;

const expectIndex = process.argv.indexOf('--expect-tag');
if (expectIndex !== -1) {
  const expected = process.argv[expectIndex + 1];
  if (!expected) fail('--expect-tag attend un nom de tag.');
  if (expected !== tag) {
    fail(
      `Le tag « ${expected} » ne correspond pas à la version de l'application « ${version} » ` +
        `(lue dans ${source}). Mettez la version à jour puis recréez le tag « ${tag} ».`,
    );
  }
}

// Workspace manifests should move in lockstep (see docs/operations/VERSIONING.md).
for (const rel of ['package.json', 'packages/core/package.json', 'apps/pouxis/package.json']) {
  const path = join(ROOT, rel);
  if (!existsSync(path)) continue;
  const other = readJson(path).version;
  if (other !== version) {
    console.log(`::warning title=Versions désalignées::${rel} est en ${other}, l'app en ${version}.`);
  }
}

const result = { version, tag, prerelease };
console.log(JSON.stringify(result));
if (process.env.GITHUB_OUTPUT) {
  appendFileSync(
    process.env.GITHUB_OUTPUT,
    `version=${version}\ntag=${tag}\nprerelease=${prerelease}\n`,
  );
}
