# 0009 — Routage par hash, vues découpées, CSS Modules et tokens

- **Statut** : accepté
- **Date** : 2026-11-04
- **Décideurs** : équipe cœur POuxis, design
- **Liens** : `apps/pouxis/src/app/`, `apps/pouxis/src/design/tokens.css`, ADR 0001

## Contexte et problème

L'interface doit démarrer en ≤ 1,5 s sur bureau avec ≤ 250 Ko de JavaScript initial compressé,
fonctionner identiquement dans la WebView Tauri (protocole personnalisé, pas de serveur HTTP)
et sur le web statique, accepter des liens profonds `pouxis://` (1.13), et garder une cohérence
visuelle stricte entre de nombreuses vues écrites en parallèle.

## Décision

1. **Routeur à hash maison** (`src/app/router.ts`, `useSyncExternalStore`) : `#/<vue>/...`.
   Fonctionne sans réécriture d'URL côté serveur (WebView, hébergement statique), se mappe
   directement sur les liens profonds, aucune dépendance.
2. **Registre de vues** (`src/app/routes.ts`) : chaque vue est chargée par `React.lazy` à la
   première visite ; seul le shell (navigation, primitives, i18n) est dans le lot initial.
3. **CSS Modules** pour l'isolement des styles par composant, sans moteur CSS-in-JS à l'exécution.
4. **Tokens de design** (`tokens.css`) : les **noms** sont un contrat, les valeurs sont
   ajustables ; thèmes clair, sombre, E-Ink ; durées d'animation `--dur-*` ; contrastes testés.

## Options écartées

| Option                                   | Raison                                                                                     |
| ---------------------------------------- | ------------------------------------------------------------------------------------------ |
| Routeur à historique (`pushState`)       | Exige des réécritures d'URL côté serveur ; plus fragile avec le protocole de la WebView.   |
| Bibliothèque de routage                  | Dépendance et poids pour un besoin limité à sept vues et quelques paramètres.              |
| CSS-in-JS à l'exécution                  | Coût d'exécution sur le chemin de rendu, contraire au budget de latence.                   |
| Framework utilitaire (classes atomiques) | Moins lisible pour un design system contractuel par tokens ; possible mais non nécessaire. |

## Conséquences

- **Positives** : démarrage maîtrisé, zéro dépendance de routage, liens profonds simples,
  thèmes et mouvement réglables globalement.
- **Négatives** : URL avec `#` (sans impact SEO, l'app n'en a pas besoin ; le site public est
  séparé dans `website/`) ; préchargement des vues à gérer manuellement si un changement de vue
  dépasse 200 ms.
