# Système de mouvement POuxis

Le mouvement sert à **comprendre ce qui change** — d'où vient un élément, où il est allé — et à
confirmer qu'une action a été prise en compte. Il ne décore pas. Implémentation :
`apps/pouxis/src/design/motion.css` (primitives), tokens `--dur-*`, `--ease-*`, `--stagger-step`,
`--motion-*` dans `tokens.css`, et `view-transition.ts`.

## 1. Fondements

Sources vérifiées dans [docs/research/SCIENTIFIC_BASIS.md](../research/SCIENTIFIC_BASIS.md)
(§ 4.8) ; aucune autre n'est invoquée ici.

- **Temps de réponse — 0,1 / 1 / 10 s** (Nielsen, _Usability Engineering_, 1993, synthétisant
  Miller, 1968, et Card et al., 1991) : ~0,1 s pour qu'une réaction paraisse immédiate, ~1 s pour
  ne pas interrompre le fil de la pensée, ~10 s pour garder l'attention. Ce sont des ordres de
  grandeur d'ingénierie, pas des seuils mesurés au milliseconde près.
- **Doherty et Thadani (1982)**, rapport industriel IBM non évalué par les pairs : gains de
  productivité quand le temps de réponse d'un système interactif descend sous ~400 ms. Nous en
  retenons un plafond pratique pour les transitions courantes.
- **Chang et Ungar (1993, UIST)** : transposer les principes du dessin animé (continuité,
  solidité, anticipation) pour que l'utilisateur suive les changements. Article de conception,
  pas expérience contrôlée.
- **Heer et Robertson (2007, IEEE TVCG)** : des transitions animées simples, découpées en étapes,
  améliorent la perception des changements dans les graphiques de données.

Conséquences : le retour d'une action directe tient sous 100 ms ; une transition ordinaire
reste sous ~400 ms ; seules les transitions plein écran vont jusqu'à 480 ms ; quand plusieurs
choses changent, on les **échelonne** plutôt que de tout animer à la fois.

## 2. Durées selon la distance parcourue

Plus un élément voyage loin (ou plus la surface est grande), plus la durée est longue — mais
toujours dans le budget ci-dessus.

| Token           | Valeur | Usage                                                             |
| --------------- | ------ | ----------------------------------------------------------------- |
| `--dur-instant` | 80 ms  | Changement d'état sur place : pression, case cochée, bascule.     |
| `--dur-fast`    | 140 ms | Déplacement < 8 px, couleur, sortie d'un élément, survol.         |
| `--dur-base`    | 220 ms | Petite surface : popover, menu, toast, fondu entre vues.          |
| `--dur-slow`    | 320 ms | Feuille, panneau latéral, entrée de liste.                        |
| `--dur-slower`  | 480 ms | Plein écran : mini-lecteur → lecteur, ouverture d'une vue modale. |
| `--dur-zen-out` | 700 ms | Effacement lent du chrome en interface Zen (aucun déplacement).   |

Règle : **une sortie est plus courte qu'une entrée** (l'utilisateur a déjà décidé ; on ne le
fait pas attendre).

Distances : `--motion-offset-sm` (8 px, glissement d'apparition), `--motion-offset-md` (24 px,
entrée latérale), `--motion-scale-from` (0,96, apparition par échelle), `--press-scale` (0,97).

## 3. Courbes et sémantique

| Token                         | Courbe                              | Sens                                                      |
| ----------------------------- | ----------------------------------- | --------------------------------------------------------- |
| `--ease-standard`             | `cubic-bezier(0.2, 0, 0, 1)`        | Élément qui se déplace d'un point à un autre à l'écran.   |
| `--ease-out` / `--ease-enter` | `cubic-bezier(0.16, 1, 0.3, 1)`     | Entrée : arrive vite, se pose doucement.                  |
| `--ease-in` / `--ease-exit`   | `cubic-bezier(0.4, 0, 1, 1)`        | Sortie : part en accélérant, hors de l'attention.         |
| `--ease-spring`               | `cubic-bezier(0.34, 1.56, 0.64, 1)` | Léger dépassement, réservé aux confirmations (`.px-pop`). |

Jamais de courbe linéaire pour un déplacement ; jamais de rebond sur un élément qui porte du
texte à lire.

## 4. Échelonnement

`.px-stagger` sur un conteneur, `--i` (index 0…n) sur chaque enfant : chaque élément démarre
`--stagger-step` (24 ms) après le précédent, plafonné à 12 pas pour que le dernier n'attende
jamais plus de ~0,3 s. On échelonne l'apparition d'une liste, jamais sa disparition.

## 5. View Transitions

`withViewTransition(update)` (`src/design/view-transition.ts`) enveloppe une mise à jour du DOM
dans `document.startViewTransition` lorsque l'API existe, et l'exécute directement sinon — ou
sous `prefers-reduced-motion`, ou en E-Ink.

- **Entre vues principales** : fondu enchaîné court (`--dur-fast` en sortie, `--dur-base` en
  entrée). Rien ne glisse : changer d'onglet n'est pas un déplacement dans l'espace.
- **Élément partagé — mini-lecteur → lecteur plein écran** : placer la classe `.px-vt-player`
  sur le mini-lecteur **et** sur le lecteur complet (un seul des deux est monté à la fois). Le
  navigateur interpole la boîte de l'un vers l'autre en `--dur-slower` avec `--ease-out`, comme
  dans Musique sur iOS. Le contenu se fond sans être étiré.

## 6. Catalogue des micro-interactions

| Classe                           | Animation                      | Durée / courbe                         | Quand                                              |
| -------------------------------- | ------------------------------ | -------------------------------------- | -------------------------------------------------- |
| `.px-press`                      | `scale(var(--press-scale))`    | instant à l'appui, fast au relâchement | Tout élément pressable non natif (cartes, lignes). |
| `.px-fade-in` / `.px-fade-out`   | opacité                        | base, enter / fast, exit               | Contenu qui remplace un autre sur place.           |
| `.px-rise-in`                    | opacité + 8 px vers le haut    | slow, enter                            | Apparition d'une carte, d'un bloc.                 |
| `.px-scale-in` / `.px-scale-out` | opacité + échelle 0,96         | base / fast                            | Popover, menu, dialogue.                           |
| `.px-sheet-in` / `.px-sheet-out` | translation verticale 100 %    | slow / base                            | Feuille modale du bas.                             |
| `.px-slide-in-end`               | opacité + 24 px latéraux       | slow, enter                            | Panneau latéral, détail d'un élément.              |
| `.px-pop`                        | échelle 1 → 1,12 → 1           | base, spring                           | Tâche cochée, objectif atteint.                    |
| `.px-shake`                      | translation horizontale ± 4 px | slow, standard                         | Saisie invalide — toujours avec un message.        |
| `.px-pulse`                      | opacité 1 → 0,55               | 3 × slower, en boucle                  | Squelette de chargement (pas de dégradé animé).    |
| `.px-chrome`                     | opacité                        | base ; zen-out à l'effacement          | Chrome effaçable de l'interface Zen.               |

Le retour haptique (7.7) se déclenche au même instant que l'animation correspondante, jamais
après (voir `src/platform`).

## 7. Règles de performance

1. **Uniquement `transform` et `opacity`** : composités par le GPU, sans recalcul de mise en
   page ni repeinture. Jamais `width`, `height`, `top`, `left`, `margin`, `box-shadow` animés.
2. Pas de dégradé animé ni de `filter: blur()` animé.
3. `will-change` seulement pendant l'animation, retiré ensuite.
4. Aucune animation ne bloque l'interaction : un élément qui entre est déjà cliquable.
5. Tester sur un appareil d'entrée de gamme ; une animation qui saccade est supprimée, pas
   ralentie.

## 8. Mouvement réduit et E-Ink

- **`prefers-reduced-motion: reduce`** : tous les tokens `--dur-*` et `--stagger-step` passent à
  0 ms, les distances à 0 et les échelles à 1. Les changements d'état restent visibles mais
  instantanés ; les View Transitions sont désactivées ; la pulsation de chargement s'arrête ;
  l'interface Zen ne s'efface pas. `useReducedMotion()` (`src/ui/hooks`) expose la même
  information au code JavaScript.
- **E-Ink** : mêmes valeurs à 0, plus un interrupteur global dans `base.css` (`animation`,
  `transition`, ombres, flous et dégradés supprimés, y compris ceux codés en dur), car chaque
  rafraîchissement partiel laisse une rémanence.

Un composant qui anime en JavaScript doit consulter `useReducedMotion()` ; un composant qui
anime en CSS doit utiliser les tokens — c'est ce qui rend ces deux modes automatiques.
