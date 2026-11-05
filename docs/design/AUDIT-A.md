# Audit A — Aujourd’hui, Tâches, Calendrier, Focus, bibliothèque UI

**Périmètre** : vues `today`, `tasks`, `calendar`, fonction `focus`, primitives `src/ui`, tokens `src/design`.
**Référentiel** : WCAG 2.2 niveau AA, règles du dépôt (`CLAUDE.md` : animations `transform`/`opacity`
et durées `--dur-*`, cibles tactiles ≥ 44 px, navigation clavier complète), inspirations du
`docs/BRIEF.md`.
**Date** : 5 novembre 2026 — vague 3.

## Méthode

Un script Playwright (Chromium 1194, locale `fr-FR`, fuseau `Europe/Paris`, données de démo de
`store/seed.ts`, onboarding sauté par la préférence `onboarded`) parcourt **74 états** et produit
**70 captures** :

- 4 configurations : 1440 × 900 et 390 × 844 (tactile), thèmes clair et sombre ;
- états : vues peuplées, sous-vues (Tableau, Matrice, Jour, Mois, Spirale), fiche de tâche
  (dialogue), éditeur d’événement (dialogue), mini-lecteur Focus, Focus Unique plein écran, toast
  après une tâche cochée, états vides (tâches, événements et journaux supprimés via le store).

Sur chaque état, des vérifications calculées dans la page :

| Contrôle                         | Méthode                                                                                                                                |
| -------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| 1.4.3 Contraste du texte         | Couleur calculée du texte, composée avec l’opacité cumulée des ancêtres et les fonds semi-transparents ; seuil 4,5:1 (3:1 grand texte) |
| 2.5.8 / règle 44 px              | Boîte de chaque contrôle interactif en 390 px, en tenant compte des zones de frappe étendues par pseudo-élément                        |
| 4.1.2 Nom accessible             | `aria-label`, `aria-labelledby`, `<label>`, texte, `title` ; signalement des champs nommés seulement par leur placeholder              |
| 2.4.3 / 2.4.7 / 2.4.11 Clavier   | 45 tabulations par vue en 1440 px : anneau de focus présent, élément focalisé non masqué (`elementFromPoint` au centre)                |
| 1.4.10 Reflow (zoom 200 %/400 %) | Fenêtres de 720 px et 320 px : aucun défilement horizontal de page hors conteneurs défilants voulus                                    |
| 2.3.3 Mouvement réduit           | `prefers-reduced-motion: reduce` : aucune animation de plus de 20 ms en cours après le chargement                                      |

Compléments statiques : analyse des transitions et `@keyframes` de toutes les feuilles CSS du
périmètre (propriétés animées, durées codées en dur), recherche de couleurs et d’espacements codés
en dur, recherche de libellés accessibles écrits en dur (hors i18n), relecture des captures.

Les tests de contraste des tokens (`design/contrast.test.ts`) passaient déjà avant l’audit : les
défauts trouvés venaient de l’usage des tokens dans les composants, pas des valeurs.

## Synthèse avant / après

| Mesure automatique (74 états)                             | Avant | Après |
| --------------------------------------------------------- | ----: | ----: |
| Textes sous le seuil de contraste                         |     3 |     0 |
| Contrôles sans nom accessible                             |     0 |     0 |
| Focus clavier masqué par la chrome (hors mesure)          |     1 |     0 |
| Ordre de tabulation non chronologique (frise)             |   oui |   non |
| Débordement horizontal à 320 px / 720 px                  |     0 |     0 |
| Animations actives en mouvement réduit                    |     0 |     0 |
| Transitions sur une propriété autre que transform/opacity |     1 |     0 |
| Erreurs console / exceptions pendant le parcours          |     0 |     0 |

## Problèmes relevés et statut

Gravité : 🔴 bloquant, 🟡 majeur, 🟢 mineur.

### Accessibilité

| #   | Problème                                                                                                                                                              | Critère          | Gravité | Statut                                                                                                                                                                        |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------- | ------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A1  | Aujourd’hui : un bloc terminé était grisé par `opacity: 0.6` ; l’horaire tombait à 2,73:1 (clair) et 3,21:1 (sombre), le titre à 4,12:1.                              | 1.4.3            | 🟡      | **Corrigé** — atténuation par la couleur (`--surface-2`, `--ink-2`) au lieu de l’opacité ; seule l’icône décorative reste estompée.                                           |
| A2  | Aujourd’hui : la frise rendait tous les créneaux libres avant les blocs ; Tab passait 9 h → 12 h → 13 h 30 → 17 h puis remontait à 10 h.                              | 2.4.3, 1.3.2     | 🟡      | **Corrigé** — blocs et créneaux fusionnés dans une seule liste ordonnée par heure (`chronological()` dans `Timeline.tsx`, testée).                                            |
| A3  | Le mini-lecteur Focus (fixe, en bas) recouvrait l’élément focalisé quand la tabulation descendait dans la frise.                                                      | 2.4.11           | 🟡      | **Corrigé** — `scroll-padding` du document piloté par `--obscured-start`/`--obscured-end` (`base.css`) ; en-tête et barre d’onglets sur téléphone, mini-lecteur via `:has()`. |
| A4  | Calendrier : la ligne « maintenant » (z-index 4) et un événement focalisé ou déplacé passaient au-dessus de l’en-tête collant des jours, barrant le libellé « JEU. ». | 2.4.11, 1.4.3    | 🟢      | **Corrigé** — en-têtes de jours et coin au-dessus de tout le contenu défilant (z-index 6 et 7).                                                                               |
| A5  | Focus : les changements de phase (focus → pause → en pause) n’étaient pas annoncés aux lecteurs d’écran ; seul l’anneau portait la valeur.                            | 4.1.3            | 🟡      | **Corrigé** — région `aria-live="polite"` sur la phase, dans le mini-lecteur et dans Focus Unique (le minuteur qui défile n’est pas annoncé).                                 |
| A6  | Créneaux libres de 30 min de la frise : 32 px de haut sur téléphone.                                                                                                  | 2.5.8 / règle 44 | 🟢      | **Accepté** — 24 px minimum AA respectés ; la hauteur encode la durée. Alternatives équivalentes : « Trouver un créneau » et « Tout placer » (44 px).                         |
| A7  | Événements de 15 min de la grille Semaine (18 px de haut).                                                                                                            | 2.5.8            | 🟢      | **Accepté** — zone de frappe étendue par pseudo-élément ; l’événement reste atteignable au clavier et dans la vue Jour, plus haute.                                           |
| A8  | Champs texte : `<input>` de 42 px dans un cadre de 44 px.                                                                                                             | règle 44         | —       | **Faux positif** — le cadre fait 44 px, la différence correspond à la bordure.                                                                                                |
| A9  | Lien d’évitement « Aller au contenu » : 40 px de haut.                                                                                                                | règle 44         | 🟢      | **Hors périmètre** — `app/Shell.module.css` ; demandé à l’équipe Shell (`min-height: var(--tap-min)`).                                                                        |

Points vérifiés sans défaut : noms accessibles de tous les contrôles en FR (les dictionnaires EN
ont la même forme, imposée par le typage des clés) ; aucun libellé accessible écrit en dur dans le
périmètre ; piège de focus et `Escape` dans la fiche, l’éditeur et Focus Unique ; toasts annoncés
(`aria-live`) ; reflow à 320 px et 720 px ; aucune animation en mouvement réduit.

### Design et microcopie

| #   | Constat                                                                                                                                             | Gravité | Statut                                                                                                                                                                                                               |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------- | ------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D1  | Toast avec une action longue (« L’ajouter à aujourd’hui ») : le message était comprimé en colonne de 9 lignes sur téléphone.                        | 🟡      | **Corrigé** — le toast passe à la ligne : l’action et la fermeture descendent sous le message quand la place manque (`Toast.module.css`).                                                                            |
| D2  | Tâches sur téléphone : neuf rangées d’en-tête avant la première tâche (≈ 560 px sur 844).                                                           | 🟡      | **Amélioré** — l’astuce de syntaxe n’apparaît que pendant la saisie (divulgation progressive) ; l’aperçu analysé reste toujours visible.                                                                             |
| D3  | Focus Unique : `max-width: 26ch` mesuré dans la police du conteneur (16 px) ; le titre en 36 px se cassait sur trois lignes étroites en 1440 px.    | 🟢      | **Corrigé** — largeur du bloc relâchée, titre limité à `22ch` de sa propre taille, équilibré sur deux lignes.                                                                                                        |
| D4  | Focus Unique : les descriptions de l’interrupteur « Ne pas déranger » répétaient le libellé (« Ne pas déranger est activé »).                       | 🟢      | **Corrigé** — la description dit l’effet : « Notifications coupées pendant la session », « Les notifications restent actives », « Indisponible sur cet appareil : coupez les notifications à la main. » (EN aligné). |
| D5  | Compteur de priorités incohérent : « 1/5 priorités » dans Aujourd’hui, « 1 sur 5 priorités » dans Tâches.                                           | 🟢      | **Corrigé** — « {count} sur {limit} priorités » partout (EN : « of »).                                                                                                                                               |
| D6  | Aujourd’hui sur téléphone : le résumé (« 7 choses prévues · 3 h de libre · … ») revenait à la ligne en commençant par un point séparateur orphelin. | 🟢      | **Corrigé** — sous 480 px, l’espacement seul sépare les éléments.                                                                                                                                                    |
| D7  | Calendrier : titres d’événements d’une ligne coupés net au bord de la colonne (« Trajet vers le stu »), l’horaire prenant la place du titre.        | 🟢      | **Corrigé** — le titre se réduit avec points de suspension ; l’horaire cède en premier.                                                                                                                              |
| D8  | Mini-lecteur Focus : le fond `--glass` laissait transparaître le texte de la frise sous la ligne « Focus · 25:00 ».                                 | 🟢      | **Corrigé** — fond plus dense (`--bg-elevated` à 90 %) en gardant le flou.                                                                                                                                           |
| D9  | Colonnes du tableau : transition sur `outline-color`, seule exception à la règle transform/opacity.                                                 | 🟢      | **Corrigé** — transition retirée (le changement d’état reste instantané et lisible).                                                                                                                                 |
| D10 | Changement de vue par l’URL : la position de défilement de la vue précédente est conservée (une vue vide peut s’ouvrir au milieu de la page).       | 🟢      | **Hors périmètre** — routeur dans `src/app` ; demandé à l’équipe Shell.                                                                                                                                              |

Ce qui fonctionne déjà bien et a été conservé : hiérarchie éditoriale (grand titre serif,
sur-titre en capitales espacées), frise de type Tiimo aux pastels lisibles en clair comme en
sombre, mini-lecteur et Focus Unique proches du lecteur d’Apple Music, filtres en pastilles
souples, états vides formulés sans culpabilisation (« Une journée ouverte… c’est aussi un
choix »). Aucune couleur ni aucun espacement codé en dur dans les feuilles du périmètre : tout
passe par les tokens.

### Performance

| #   | Constat                                                                                                                                                                                                                                       | Statut                                                                                                                                                                |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| P1  | Tableau et Matrice : chaque `pointermove` d’un glisser mettait à jour l’état React, re-rendait toute la vue (recalcul du tableau, toutes les cartes) puis appelait `elementFromPoint` — écriture puis lecture de mise en page à chaque image. | **Corrigé** — le fantôme est déplacé directement par `transform` via une ref ; React ne re-rend que quand la zone survolée change (`useDragDrop.ts`, `TaskCard.tsx`). |
| P2  | Grille horaire : chaque `pointermove` relançait un rendu, même quand le créneau aimanté (pas de 15 min) n’avait pas changé.                                                                                                                   | **Corrigé** — rendu seulement quand le créneau change (`useGridDrag.ts`).                                                                                             |
| P3  | Listes de tâches, frise et calendrier : index, filtres et regroupements déjà mémorisés (`useMemo`).                                                                                                                                           | Vérifié, sans changement.                                                                                                                                             |

## Vérification

```sh
npx tsc --noEmit -p apps/pouxis
cd apps/pouxis && npx vitest run src/views/today src/views/tasks src/views/calendar src/features/focus src/ui src/design
```

Les deux passent (y compris le nouveau `views/today/Timeline.test.ts`). Le parcours Playwright
final ne relève plus aucun défaut de contraste, de nom accessible ou de focus masqué sur les
74 états.

## Limites

- Les mesures automatiques ne remplacent pas une session avec VoiceOver (iOS, macOS) et TalkBack :
  à planifier avant la publication sur les stores.
- Le contraste est calculé sur des fonds unis ; les textes posés sur un dégradé ou une image ne
  sont pas mesurés (Focus Unique : fond dégradé très clair, vérifié visuellement).
- Le contrôle « focus non masqué » regarde le centre de l’élément ; un recouvrement partiel en bord
  d’élément reste possible.
