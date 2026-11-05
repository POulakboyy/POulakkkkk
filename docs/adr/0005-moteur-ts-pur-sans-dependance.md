# 0005 — Moteur de domaine en TypeScript pur, sans dépendance

- **Statut** : accepté
- **Date** : 2026-11-04
- **Décideurs** : équipe cœur POuxis
- **Liens** : `packages/core/`, `CLAUDE.md`, ADR 0001, ADR 0002

## Contexte et problème

La logique métier (planification, tâches, CRDT, cryptographie, recherche, idéation, bilans) est
utilisée par l'interface (WebView), la CLI et le relais (Node), les tests, et à terme des
workers. Elle porte des engagements forts : exactitude des dates entre fuseaux, convergence,
sécurité. Elle doit rester auditable et durable.

## Options considérées

1. **TypeScript pur, zéro dépendance d'exécution, sans API DOM ni Node** dans `src/`.
2. TypeScript avec bibliothèques éprouvées (date-fns-tz/Luxon, Yjs, librairie crypto JS…).
3. Moteur en Rust compilé en WASM pour le web et natif pour Tauri.

## Décision

**Option 1.** Seules API autorisées : celles d'ECMAScript et `globalThis.crypto` (WebCrypto,
disponible dans les navigateurs, les WebView et Node ≥ 20), avec échec fermé s'il manque.
Contrats partagés figés : `model.ts`, `time.ts` (calcul calendaire avec **fuseau IANA explicite**,
jamais celui de la machine), `id.ts`. Chaque module expose `src/<module>/index.ts` et est
réexporté en namespace par `src/index.ts`. Node exécute le `.ts` directement (effacement de
types) : syntaxe effaçable uniquement (`erasableSyntaxOnly`, pas d'`enum` ni de `namespace`).

## Conséquences

- **Positives** : même code, mêmes résultats partout ; aucune chaîne d'approvisionnement à
  surveiller pour le cœur ; tests rapides et déterministes ; portabilité vers un worker.
- **Négatives** : l'équipe maintient elle-même des algorithmes non triviaux (HLC, BM25F, layout
  de Buchheim, quadtree, RRULE, formules) ; chacun doit être référencé, testé et documenté.
- `Intl` est utilisé pour les fuseaux (données tz de l'environnement d'exécution) : les résultats
  dépendent de la version de la base tz embarquée par la WebView ou Node.
- Pas de crypto maison : seules les primitives WebCrypto sont appelées.

## Pourquoi pas Rust/WASM (option 3)

Le partage avec la CLI et le relais serait conservé, mais au prix d'une frontière de
sérialisation sur chaque appel depuis l'interface, d'une chaîne de build plus lourde et d'une
équipe à double compétence. Aucune mesure ne montre aujourd'hui que le moteur est le goulet
d'étranglement. Un noyau de calcul précis pourra être porté en WASM derrière la même API si une
mesure le justifie (ARCHITECTURE § 12.5).
