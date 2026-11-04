# CI/CD

Ce document décrit les workflows GitHub Actions de POuxis, ce qu'ils vérifient et comment les
faire évoluer. Les secrets requis sont listés dans [SECRETS.md](SECRETS.md).

## Vue d'ensemble

| Workflow                                                     | Déclencheurs                                                             | Rôle                                                                      |
| ------------------------------------------------------------ | ------------------------------------------------------------------------ | ------------------------------------------------------------------------- |
| [`ci.yml`](../../.github/workflows/ci.yml)                   | push sur `main`, pull requests, manuel                                   | Prettier, types, tests unitaires, build ; e2e Playwright s'ils existent.  |
| [`rust.yml`](../../.github/workflows/rust.yml)               | push / PR touchant `apps/pouxis/src-tauri/**`, manuel                    | `cargo fmt --check`, Clippy (`-D warnings`), `cargo check`.               |
| [`codeql.yml`](../../.github/workflows/codeql.yml)           | push / PR sur `main`, chaque lundi, manuel                               | Analyse de sécurité TypeScript, Rust et workflows.                        |
| [`release.yml`](../../.github/workflows/release.yml)         | tag `v*`, manuel                                                         | Installateurs macOS universel, Windows, Linux dans une release brouillon. |
| [`mobile.yml`](../../.github/workflows/mobile.yml)           | manuel                                                                   | APK/AAB Android et IPA iOS en artefacts.                                  |
| [`sync-server.yml`](../../.github/workflows/sync-server.yml) | tag `v*` (publication), PR touchant le serveur ou le moteur (build seul) | Image Docker multi-architecture sur GHCR avec provenance et SBOM.         |
| [`dependabot.yml`](../../.github/dependabot.yml)             | chaque lundi                                                             | Mises à jour groupées npm, cargo, actions et Docker.                      |

Principes communs :

- **Moindre privilège** : `permissions: contents: read` au niveau du workflow ; seuls les jobs qui
  en ont besoin obtiennent davantage (`contents: write` pour la release, `packages: write` pour
  GHCR, `security-events: write` pour CodeQL).
- **`persist-credentials: false`** sur chaque checkout : le jeton n'est pas laissé dans
  `.git/config` pour les étapes suivantes.
- **Annulation des exécutions obsolètes** (`concurrency`) sauf pour la release, qui n'est jamais
  interrompue en cours de téléversement.
- **Étapes conditionnelles plutôt qu'échecs** quand une partie du dépôt n'existe pas encore
  (suite e2e, projet Tauri, Dockerfile) : le workflow affiche une notice et réussit.

## CI (`ci.yml`)

Le job `verify` exécute, dans l'ordre et comme en local :

```sh
npm ci
npm run format:check
npm run typecheck
npm test
npm run build
```

Les scripts sont ceux du `package.json` racine : ils parcourent tous les workspaces
(`--workspaces --if-present`). Node 22 est utilisé, conformément à `engines.node` (`>=22.18`).

Le job `e2e` ne s'active que si `apps/pouxis/e2e/**` contient des fichiers (`hashFiles`). Il
installe Chromium (`npx playwright install --with-deps chromium`) puis lance
`npm run e2e -w @pouxis/app`. En cas d'échec, le rapport Playwright est téléversé en artefact
pendant 14 jours. La configuration Playwright (`apps/pouxis/playwright.config.ts`) doit démarrer
elle-même le serveur web (`webServer`).

**Reproduire un échec en local** : lancez la commande de l'étape fautive à la racine, après
`npm ci`. Pour Prettier, `npm run format` corrige les fichiers.

## Rust (`rust.yml`)

S'exécute seulement si un fichier de `apps/pouxis/src-tauri/` (ou le workflow lui-même) change,
et seulement si `Cargo.toml` **et** `tauri.conf.json` existent. Un `index.html` factice remplace
le bundle web : `tauri::generate_context!` exige que `build.frontendDist` existe à la
compilation, mais son contenu n'importe pas pour les lints. Avec un `Cargo.lock` commité, Clippy
et `cargo check` tournent en `--locked`.

## Release (`release.yml`)

1. **`prepare`** lit la version de l'application avec
   [`.github/scripts/app-version.mjs`](../../.github/scripts/app-version.mjs) (ordre de Tauri :
   `tauri.conf.json`, puis `Cargo.toml`, puis `apps/pouxis/package.json`). Sur un tag, le tag doit
   valoir exactement `v<version>`, sinon le workflow échoue. Il crée ensuite la release
   **brouillon** (ou réutilise le brouillon existant ; une release déjà publiée bloque).
2. **`desktop`** construit en parallèle avec `tauri-apps/tauri-action@v0` :
   - macOS universel (`--target universal-apple-darwin`, Apple Silicon et Intel) ;
   - Windows x64 (MSI et NSIS) ;
   - Linux x64 sur Ubuntu 22.04 (`.deb`, `.rpm`, AppImage) pour garder une base glibc ancienne.
3. Les installateurs (et `latest.json` pour le module de mise à jour quand les artefacts sont
   signés) sont attachés au brouillon. **La publication reste manuelle** : voir
   [RELEASE_CHECKLIST.md](RELEASE_CHECKLIST.md).

Les secrets de signature ne sont exportés que s'ils sont définis : sans eux, les builds sont
produits non signés, avec un avertissement dans le résumé du job. La signature Windows passe par
une surcharge de configuration temporaire (`--config`) contenant l'empreinte du certificat
importé, si bien que `tauri.conf.json` ne contient aucune donnée de signature.

Le déclenchement manuel accepte une référence (branche, tag ou commit) : pratique pour une
répétition générale avant de poser le tag. Le tag est alors créé à la publication du brouillon.

## Mobile (`mobile.yml`)

Déclenchement manuel uniquement (choix : Android, iOS ou les deux).

**Prérequis, une seule fois** : générer et commiter les projets natifs.

```sh
npm run tauri -w @pouxis/app -- android init   # crée apps/pouxis/src-tauri/gen/android
npm run tauri -w @pouxis/app -- ios init       # sur macOS : crée apps/pouxis/src-tauri/gen/apple
```

Sans ces dossiers, le job correspondant échoue avec un message explicite.

- **Android** : Java 17 (Temurin), SDK Android, NDK (version fixée dans `NDK_VERSION`), cibles
  Rust `aarch64`, `armv7`, `i686`, `x86_64`, puis `tauri android build --apk --aab`. La signature
  suit la méthode documentée par Tauri : le workflow écrit `gen/android/keystore.properties` à
  partir des secrets, et `gen/android/app/build.gradle.kts` doit déclarer la configuration de
  signature `release` qui le lit
  ([guide Tauri](https://v2.tauri.app/distribute/sign/android/)).
- **iOS** : macOS, cible `aarch64-apple-ios`, puis `tauri ios build --export-method <méthode>`.
  Signature manuelle (`IOS_CERTIFICATE`, `IOS_CERTIFICATE_PASSWORD`, `IOS_MOBILE_PROVISION`) ou
  automatique via une clé API App Store Connect (`APPLE_API_ISSUER`, `APPLE_API_KEY`,
  `APPLE_API_KEY_PATH`) ([guide Tauri](https://v2.tauri.app/distribute/sign/ios/)).

Les artefacts (APK, AAB, IPA) sont conservés 30 jours ; leur envoi aux stores reste manuel.

## Image du serveur de synchronisation (`sync-server.yml`)

- Contexte de build : **`apps/sync-server`** ; le Dockerfile (`apps/sync-server/Dockerfile`)
  est autonome : il copie `src/` et installe lui-même `ws`, seule dépendance d'exécution. Si
  le serveur se met à importer `@pouxis/core`, le contexte et le Dockerfile devront évoluer
  ensemble.
- Image : `ghcr.io/<propriétaire en minuscules>/pouxis-sync-server`, plates-formes
  `linux/amd64` et `linux/arm64`.
- Tags : `X.Y.Z`, `X.Y`, `X` (sauf en `0.x`, où une mineure peut casser la compatibilité),
  et `sha-<commit>`.
- Provenance SLSA (`provenance: mode=max`) et SBOM (`sbom: true`) sont attachés à l'image par
  BuildKit. Vérification : `docker buildx imagetools inspect <image>:<tag> --format '{{ json .Provenance }}'`.
- Sur une pull request, l'image est construite sans être poussée.

## Épinglage des actions

Les actions sont épinglées sur leur **version majeure** (`actions/checkout@v7`), mise à jour
chaque semaine par Dependabot. C'est un compromis lisibilité/maintenance : un tag majeur est
mobile, et son propriétaire peut le déplacer.

Pour un niveau d'assurance supérieur (recommandé avant d'ajouter des secrets de signature),
épinglez sur le **SHA complet du commit**, en gardant la version en commentaire pour Dependabot :

```yaml
- uses: actions/checkout@<sha-de-40-caractères> # v7.x.y
```

Retrouver le SHA d'un tag :

```sh
git ls-remote --tags https://github.com/actions/checkout.git 'refs/tags/v7*'
```

Pour un tag annoté, prenez la ligne suffixée `^{}` (le commit pointé, pas l'objet tag).
Dependabot met à jour le SHA et le commentaire ensemble. Les actions des éditeurs les plus
sensibles ici sont `tauri-apps/tauri-action` (reçoit les clés de signature) et
`docker/*` (pousse l'image).

## Faire évoluer les workflows

- Validez la syntaxe avant de pousser (`python3 -c 'import yaml,sys; yaml.safe_load(open(sys.argv[1]))' <fichier>`),
  et idéalement avec [`actionlint`](https://github.com/rhysd/actionlint).
- Ne référencez jamais un secret dans `if:` : exposez-le en variable d'environnement de l'étape et
  testez la variable.
- Ne passez jamais une valeur contrôlée par un tiers (titre de PR, nom de branche) directement
  dans `run:` via `${{ }}` : passez-la par `env:` pour éviter l'injection de commandes.
