# POuxis — conventions du dépôt

Application open source, local-first, de gestion du temps, des tâches et des idées.
Vision complète : `docs/BRIEF.md`. Architecture : `docs/architecture/`.

## Structure

- `packages/core` — `@pouxis/core` : moteur de domaine en TypeScript pur, **zéro dépendance**,
  sans API DOM ni Node dans `src/`. Contrats partagés : `src/model.ts` (types du domaine),
  `src/time.ts` (dates avec fuseau IANA explicite — jamais le fuseau local de la machine),
  `src/id.ts`. Chaque module vit dans `src/<module>/` avec `index.ts` comme API publique ;
  `src/index.ts` les réexporte en namespaces (`scheduler.route(...)`).
- `apps/pouxis` — client React 19 + Vite 8 ; shell natif Tauri 2 (`src-tauri/`) pour iOS,
  Android, macOS, Windows, Linux.
  - `src/design/tokens.css` : les **noms** de tokens sont un contrat (valeurs ajustables).
  - `src/ui` : primitives et icônes — importer depuis `src/ui/index.ts`.
  - `src/store` : interface `Store` + hooks `useCollection`, `useRecord`, `usePrefs`.
  - `src/i18n` : clés typées, `fr` canonique, `en` miroir, un fichier par namespace.
  - `src/platform` : capacités natives (Ne pas déranger, notifications, haptique, raccourcis).
  - `src/views/<vue>`, `src/features/<fonction>` ; styles en CSS Modules.
- `apps/sync-server`, `apps/cli` — Node ≥ 22.18 exécute le `.ts` directement.
- `docs/`, `website/`.

## Règles de code

- TypeScript strict, `noUncheckedIndexedAccess`, `erasableSyntaxOnly` (pas d'`enum`, de
  `namespace` ni de propriétés de paramètres). Imports relatifs avec extension `.ts`/`.tsx`,
  `import type` pour les types.
- Code et commentaires en anglais ; documentation utilisateur en français.
- Animations : uniquement `transform`/`opacity`, durées via les tokens `--dur-*`, toujours
  compatibles `prefers-reduced-motion`.
- Accessibilité : WCAG 2.2 AA, cibles tactiles ≥ 44 px, navigation clavier complète.

## Commandes

```sh
npm install          # une fois
npm run dev          # client web sur http://localhost:1420
npm test             # tests de tous les paquets
npm run typecheck
npm run build
npm run tauri dev -w @pouxis/app   # shell natif (nécessite Rust + dépendances système Tauri)
```
