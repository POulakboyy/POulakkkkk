# Contribuer à POuxis

Merci de votre intérêt pour POuxis, l'espace de travail open source et local-first pour le
temps, les tâches et les idées. Ce guide explique comment proposer un changement et ce que nous
vérifions avant de l'intégrer.

En participant, vous acceptez de respecter le [code de conduite](CODE_OF_CONDUCT.md).
Pour une faille de sécurité, n'ouvrez pas d'issue : suivez la
[politique de sécurité](SECURITY.md).

## Avant de commencer

- **Une petite correction** (faute, bug évident, test manquant) : ouvrez directement une pull
  request.
- **Une fonctionnalité ou un changement de comportement** : ouvrez d'abord une issue avec le
  formulaire « Proposer une fonctionnalité », pour valider le besoin avant d'écrire du code.
- **Un retour d'ergonomie ou de design** : utilisez le formulaire « Retour sur le design ».

La vision du produit est décrite dans [`docs/BRIEF.md`](docs/BRIEF.md).

## Mise en place

Prérequis : **Node.js ≥ 22.18** (exécute le TypeScript directement) et npm. Pour le shell natif :
Rust stable et les [dépendances système de Tauri 2](https://v2.tauri.app/start/prerequisites/).

```sh
npm install          # une fois, à la racine (workspaces npm)
npm run dev          # client web sur http://localhost:1420
npm test             # tests de tous les paquets
npm run typecheck
npm run format:check # vérifie le formatage Prettier (npm run format pour corriger)
npm run build
npm run tauri dev -w @pouxis/app   # shell natif
```

## Organisation du dépôt

| Chemin              | Rôle                                                                                      |
| ------------------- | ----------------------------------------------------------------------------------------- |
| `packages/core`     | `@pouxis/core` : moteur de domaine en TypeScript pur, sans dépendance ni API DOM ou Node. |
| `apps/pouxis`       | Client React + Vite ; shell natif Tauri 2 dans `src-tauri/`.                              |
| `apps/sync-server`  | Relais de synchronisation (opérations CRDT chiffrées).                                    |
| `apps/cli`          | Interface en ligne de commande.                                                           |
| `docs/`, `website/` | Documentation et site.                                                                    |

Les conventions détaillées sont dans [`CLAUDE.md`](CLAUDE.md) ; les points essentiels :

- TypeScript strict (`noUncheckedIndexedAccess`, `erasableSyntaxOnly` : pas d'`enum`, de
  `namespace` ni de propriétés de paramètres) ; imports relatifs avec extension `.ts`/`.tsx` et
  `import type` pour les types.
- Les dates passent toujours par `@pouxis/core` avec un **fuseau IANA explicite** ; jamais le
  fuseau local de la machine.
- Code et commentaires en anglais ; documentation utilisateur en français.
- Textes de l'interface dans `src/i18n` : `fr` canonique, `en` tenu à jour.
- Animations : uniquement `transform` et `opacity`, durées via les tokens `--dur-*`, compatibles
  `prefers-reduced-motion`.
- Accessibilité WCAG 2.2 AA : navigation clavier complète, cibles tactiles d'au moins 44 px.

## Branches et commits

- Partez de `main` et nommez la branche selon son objet : `fix/semaine-fuseau`,
  `feat/minuteur-focus`, `docs/guide-sync`.
- Messages de commit au format [Conventional Commits](https://www.conventionalcommits.org/fr/) :
  `feat(scheduler): …`, `fix(app): …`, `docs: …`, `ci: …`, `chore(deps): …`.
  Un changement incompatible porte `!` (`feat(core)!: …`) et un paragraphe `BREAKING CHANGE:`.
- Gardez les pull requests petites et centrées sur un seul sujet.

## Pull requests

1. Remplissez le modèle de pull request, y compris « Comment vérifier ».
2. La CI doit être verte : formatage, types, tests unitaires, build, et selon les fichiers
   touchés : Rust (`cargo fmt`, Clippy, `cargo check`), tests de bout en bout, CodeQL.
3. Ajoutez des tests pour toute logique nouvelle ou modifiée. Le moteur (`packages/core`) se teste
   en isolation : `cd packages/core && npx vitest run src/<module>`.
4. Joignez des captures avant/après pour toute modification visible (thèmes clair et sombre).
5. Une revue d'un·e mainteneur·euse est requise (voir `.github/CODEOWNERS`).

## Signaler un bug

Utilisez le formulaire « Signaler un bug ». Les éléments qui accélèrent le diagnostic : version,
plateforme, étapes de reproduction minimales, et si des données ont été perdues. Retirez toute
donnée personnelle des journaux et captures.

## Licence

Les contributions sont publiées sous la licence du paquet concerné (AGPL-3.0-or-later pour
`@pouxis/core` et le serveur de synchronisation, voir le champ `license` de chaque
`package.json`). En ouvrant une pull request, vous confirmez avoir le droit de publier ce code
sous cette licence.

## Pour les mainteneur·euse·s

- Publication d'une version : [`docs/operations/RELEASE_CHECKLIST.md`](docs/operations/RELEASE_CHECKLIST.md)
- Numérotation des versions : [`docs/operations/VERSIONING.md`](docs/operations/VERSIONING.md)
- Pipelines CI/CD : [`docs/operations/CI_CD.md`](docs/operations/CI_CD.md)
- Secrets de signature : [`docs/operations/SECRETS.md`](docs/operations/SECRETS.md)
