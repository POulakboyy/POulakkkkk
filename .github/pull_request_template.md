## Résumé

<!-- Quoi et pourquoi, en deux ou trois phrases. Liez l'issue : « Ferme #123 ». -->

## Type de changement

- [ ] Correction de bug
- [ ] Nouvelle fonctionnalité
- [ ] Changement incompatible (API publique de `@pouxis/core`, format de données, protocole de sync)
- [ ] Refactorisation sans changement de comportement
- [ ] Documentation
- [ ] CI, outillage ou dépendances

## Comment vérifier

<!-- Étapes concrètes pour un·e relecteur·rice, et commandes lancées. -->

## Captures

<!-- Pour toute modification visible : avant / après, thème clair et sombre, mobile et bureau. -->

## Liste de contrôle

- [ ] `npm run format:check`, `npm run typecheck` et `npm test` passent en local.
- [ ] Des tests couvrent la logique ajoutée ou modifiée.
- [ ] Les dates passent par `@pouxis/core/time` avec un fuseau IANA explicite.
- [ ] Les textes visibles passent par `src/i18n` (`fr` canonique, `en` à jour).
- [ ] Accessibilité : navigation clavier, libellés, contraste AA, cibles ≥ 44 px.
- [ ] Animations limitées à `transform`/`opacity`, durées `--dur-*`, `prefers-reduced-motion` respecté.
- [ ] Aucun secret, jeton ni donnée personnelle dans le code, les tests ou les captures.
- [ ] Documentation utilisateur mise à jour si le comportement change.
