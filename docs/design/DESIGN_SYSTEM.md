# Système de design POuxis

Référence des tokens, thèmes et règles visuelles de l'application. Source de vérité :
`apps/pouxis/src/design/tokens.css`. Ce document, `tokens.json` (format W3C DTCG) et la section
« daylight » de `tokens.css` sont en partie **générés** : après toute modification de
`tokens.css`, lancer

```sh
node apps/pouxis/src/design/build-tokens.mjs   # régénère tokens.json et les tableaux ci-dessous
npx vitest run src/design                      # dans apps/pouxis : contrat de contraste, CVD, e-ink
```

Le mouvement a son propre document : [MOTION.md](./MOTION.md). Le ton des textes :
[UX_WRITING.md](./UX_WRITING.md). Les sources scientifiques citées ici sont vérifiées dans
[docs/research/SCIENTIFIC_BASIS.md](../research/SCIENTIFIC_BASIS.md). Seules s'y ajoutent deux
références d'outillage, employées comme méthodes de calcul et non comme arguments : le modèle de
simulation des daltonismes de Machado, Oliveira et Fernandes (2009, _IEEE TVCG_, 15(6)) et les
algorithmes astronomiques de Meeus repris par le calculateur solaire de la NOAA.

## Sommaire

1. [Concept directeur](#1-concept-directeur)
2. [Principes](#2-principes)
3. [Des inspirations aux décisions](#3-des-inspirations-aux-décisions)
4. [Thèmes et modes](#4-thèmes-et-modes)
5. [Couleur](#5-couleur)
6. [Typographie](#6-typographie)
7. [Espacement, grille et points de rupture](#7-espacement-grille-et-points-de-rupture)
8. [Rayons, traits et élévation](#8-rayons-traits-et-élévation)
9. [Iconographie](#9-iconographie)
10. [Densité et cibles](#10-densité-et-cibles)
11. [États d'interaction](#11-états-dinteraction)
12. [Visualisation de données](#12-visualisation-de-données)
13. [Interface Zen (7.4)](#13-interface-zen-74)
14. [Thème « daylight » (7.6)](#14-thème--daylight--76)
15. [Thème E-Ink (7.10)](#15-thème-e-ink-710)
16. [Règles de contribution](#16-règles-de-contribution)
17. [Table complète des tokens](#17-table-complète-des-tokens)
18. [Résultats de contraste](#18-résultats-de-contraste)
19. [Questions ouvertes](#19-questions-ouvertes)

## 1. Concept directeur

**« Un carnet calme, une machine précise. »** POuxis doit avoir la chaleur d'un carnet papier
(fond crème, encre presque noire, titres serif) et la rigueur d'un outil : grille de 4 px,
contrastes mesurés, mouvement court et prévisible. La tension entre les deux est voulue : le
calme invite à créer, la précision donne confiance pour exécuter.

Conséquences concrètes :

- une seule couleur signature, le **corail** (`--accent`), utilisée en touche, jamais en aplat
  dominant ;
- pas de blanc ni de noir purs dans les thèmes clair et sombre (papier `#f6f4ef`, encre
  `#1c1b18`) ; le noir et blanc purs sont réservés à l'E-Ink, où ils sont une contrainte
  matérielle ;
- polices système uniquement : aucun téléchargement, rendu natif sur chaque plateforme,
  cohérent avec le local-first.

## 2. Principes

| Principe                                                                                                     | Décision dans le système                                                                                                                      | Source (vérifiée dans SCIENTIFIC_BASIS)             |
| ------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------- |
| Le temps de pointage croît avec la distance et diminue avec la taille de la cible (Fitts).                   | `--tap-min: 44px` pour toute cible tactile, `48px` en E-Ink ; actions fréquentes près du pouce (barre d'onglets en bas sur mobile).           | Fitts (1954) ; WCAG 2.2                             |
| Le temps de choix croît avec le logarithme du nombre d'options (Hick), surtout pour des menus non familiers. | Menus courts, une action principale par écran, regroupements visibles plutôt que listes plates.                                               | Hick (1952) ; Scheibehenne et al. (2010)            |
| Une réaction en ~0,1 s paraît immédiate ; ~1 s préserve le fil de la pensée.                                 | Retour d'une action directe ≤ 100 ms (`--dur-instant`), transitions ≤ 480 ms (`--dur-slower`). Voir MOTION.md.                                | Miller (1968) ; Card et al. (1991) ; Nielsen (1993) |
| La polarité positive (texte sombre sur fond clair) favorise la lecture.                                      | Thème clair par défaut, sombre proposé ; E-Ink en polarité positive.                                                                          | Piepenbrock et al. (2013)                           |
| L'encombrement visuel rend la recherche visuelle plus difficile.                                             | Interface Zen (§ 13) ; lignes de séparation très discrètes (`--line`) ; peu de couleurs simultanées.                                          | Rosenholtz et al. (2007)                            |
| Aucune palette n'a démontré qu'elle « stimule la créativité ».                                               | Les couleurs sont choisies pour le contraste, la lisibilité et l'identité, jamais présentées comme un levier cognitif (§ 4.3).                | Mehta et Zhu (2009) ; Steele (2014)                 |
| Accessibilité WCAG 2.2 AA.                                                                                   | Contrat de contraste testé automatiquement (§ 18) ; focus visible 2 px (3 px en E-Ink) ; jamais la couleur seule pour porter une information. | W3C (2023)                                          |

## 3. Des inspirations aux décisions

Le brief cite neuf références. Elles ont guidé des **choix de principe**, pas une copie : aucune
couleur, police ou forme propriétaire n'est reprise.

| Inspiration              | Ce que nous en retenons                                                           | Où cela se voit                                                                                  |
| ------------------------ | --------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| **Claude**               | Fond papier chaud, encre douce, ambiance calme et lettrée.                        | `--bg`, `--ink`, `--font-serif` pour les titres éditoriaux.                                      |
| **Klarna**               | Une couleur signature franche et chaleureuse, boutons en pilule, ton décontracté. | `--accent` corail, `--radius-pill`.                                                              |
| **Musique (iOS)**        | Grands titres, mini-lecteur persistant qui s'ouvre en plein écran.                | `--text-display` (fluide 36 → 60 px), transition d'élément partagé `.px-vt-player` (MOTION.md).  |
| **Eyeye**                | Référence non identifiée avec certitude (voir § 19).                              | Aucune décision n'en découle pour l'instant.                                                     |
| **Tiimo**                | Le temps rendu visible par des blocs colorés et doux.                             | Palette catégorielle pastel `--cat-1…8`, texte en `--ink` lisible sur chacune.                   |
| **Airbnb**               | Générosité de l'espace blanc, cartes arrondies, hiérarchie nette.                 | Échelle d'espacement jusqu'à `--space-12`, `--radius-lg`/`--radius-xl`, `--shadow-1…3` légers.   |
| **Web design éditorial** | Mesure de lecture maîtrisée, contraste serif/sans-serif, grands blancs.           | `--measure: 66ch`, `--leading-relaxed`, `.serif`.                                                |
| **Instagram**            | Contenu bord à bord, gestes directs, retour immédiat.                             | `--gutter` fluide, micro-interactions `.px-press`, `.px-pop`.                                    |
| **Spark**                | Tri et actions rapides par balayage, interface sobre centrée sur le contenu.      | Lignes de liste `--row-min`, états `--state-hover`/`--state-pressed`, couleurs de statut sobres. |

## 4. Thèmes et modes

### 4.1 Sélection

| Attribut sur `<html>`                                | Effet                                                                   |
| ---------------------------------------------------- | ----------------------------------------------------------------------- |
| _(aucun)_                                            | Préférence du système (`prefers-color-scheme`).                         |
| `data-theme="light" \| "dark" \| "eink"`             | Force un thème ; prioritaire sur tout le reste.                         |
| `data-theme-auto="daylight"` + `data-daylight-phase` | Palette pilotée par le soleil (§ 14), posés par `applyDaylight()`.      |
| `data-mode="create" \| "execute"`                    | Change `--mode-accent` (§ 4.3).                                         |
| `data-density="compact"`                             | Lignes et contrôles plus serrés, sur pointeur précis uniquement (§ 10). |
| `data-zen="idle"`                                    | Interface au repos, posé par `useZenIdle()` (§ 13).                     |

### 4.2 Thèmes

- **Clair** (défaut) : papier crème, encre presque noire.
- **Sombre** : gris très légèrement chauds (`#121211` → `#312f2b`), jamais de noir pur ; les
  couleurs sémantiques sont éclaircies pour garder 4,5:1 sur fond sombre.
- **E-Ink** : noir et blanc purs, sans mouvement ni ombre (§ 15).

Le bloc sombre existe deux fois dans `tokens.css` (préférence système et `data-theme="dark"`) ;
un test vérifie qu'ils restent identiques.

### 4.3 Modes de travail

`--mode-accent` vaut `--create` (bleu) en mode création et `--execute` (brun orangé) en mode
exécution. Le but est **d'identifier le mode dans lequel on se trouve**, d'un coup d'œil, sans
lire d'étiquette.

Ce choix s'inspire de Mehta et Zhu (2009, _Science_), qui rapportaient un avantage du rouge pour
les tâches de détail et du bleu pour les tâches créatives. **Ce résultat n'a pas été reproduit**
sur les anagrammes par Steele (2014, _Psychonomic Bulletin & Review_). POuxis ne promet donc
aucun effet de la couleur sur la performance : la teinte est un repère, la différence reste
discrète, et chaque mode est aussi nommé en toutes lettres.

## 5. Couleur

### 5.1 Rôles

| Famille    | Tokens                                                             | Rôle                                                                                            |
| ---------- | ------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------- |
| Papiers    | `--bg`, `--bg-elevated`, `--surface`, `--surface-2`, `--surface-3` | Fonds, du plus profond au plus en relief.                                                       |
| Encres     | `--ink`, `--ink-2`, `--ink-3`                                      | Texte principal, secondaire, tertiaire — **tous ≥ 4,5:1** sur les papiers 1 à 4.                |
| Lignes     | `--line`, `--line-strong`                                          | Séparateurs décoratifs (aucune exigence de contraste).                                          |
| Contrôles  | `--line-control`                                                   | Bordure des champs, cases, interrupteurs : ≥ 3:1 (WCAG 1.4.11).                                 |
| Marque     | `--accent`, `--accent-ink`, `--accent-soft`, `--accent-strong`     | `--accent` est un **aplat** (texte en `--accent-ink`) ; `--accent-strong` est la version texte. |
| Modes      | `--create*`, `--execute*`, `--mode-accent*`                        | Voir § 4.3.                                                                                     |
| Statuts    | `--success*`, `--warning*`, `--danger*`                            | Toujours accompagnés d'une icône ou d'un mot.                                                   |
| Catégories | `--cat-1…8`                                                        | Blocs de la timeline, texte `--ink`/`--ink-2` dessus.                                           |
| Chaleur    | `--heat-0…4`                                                       | Échelle séquentielle (énergie, activité).                                                       |
| Données    | `--viz-1…8`                                                        | Séries de graphiques (§ 12).                                                                    |
| Focus      | `--focus-ring`, `--focus-ring-width`, `--focus-ring-offset`        | Anneau de focus clavier.                                                                        |

### 5.2 Contrat de contraste

Vérifié par `apps/pouxis/src/design/contrast.test.ts` dans les trois thèmes et à six niveaux du
thème daylight. Les exigences :

- **Texte ≥ 4,5:1** (WCAG 1.4.3) : toutes les encres sur `--bg`, `--bg-elevated`, `--surface`,
  `--surface-2` ; `--ink`/`--ink-2` sur `--surface-3` ; chaque couleur sémantique (`--accent-strong`,
  `--create`, `--execute`, `--success`, `--warning`, `--danger`) sur `--bg`, `--surface`,
  `--surface-2` et sa propre teinte `-soft` ; `--ink` sur chaque `-soft` ; les encres `*-ink` sur
  leur aplat ; `--ink` et `--ink-2` sur `--cat-1…8`.
- **Grand texte ≥ 3:1** (≥ 24 px, ou ≥ 18,66 px en gras) : `--ink-3` sur `--surface-3`
  uniquement. Ne pas y poser de texte courant tertiaire.
- **UI uniquement ≥ 3:1** (WCAG 1.4.11), jamais pour du texte courant : `--line-control`,
  `--focus-ring`, `--viz-1…8` sur `--bg` et `--surface`.
- **Décoratif, aucune exigence** : `--accent` comme fond de texte autre que `--accent-ink`,
  `--line`, `--line-strong`, `--cat-*` comme couleur de texte, `--heat-*`.

Résultats détaillés au § 18.

## 6. Typographie

- **Familles** : `--font-sans` (interface, `system-ui` : SF Pro, Segoe UI Variable, Roboto),
  `--font-serif` (titres éditoriaux et citations, `ui-serif` : New York sur Apple), `--font-mono`
  (code, durées alignées). Deux familles visibles au plus sur un même écran.
- **Échelle** (rem, base 16 px) : `--text-2xs` 11 · `--text-xs` 12 · `--text-sm` 14 ·
  `--text-md` 16 (corps) · `--text-lg` 18 · `--text-xl` 22 · `--text-2xl` 28 · `--text-3xl` 36 ·
  `--text-4xl` 48 · `--text-display` fluide 36 → 60 px.
- **Interlignage** : `--leading-tight` 1,15 (titres) · `--leading-snug` 1,3 · `--leading-normal`
  1,5 (corps) · `--leading-relaxed` 1,65 (lecture longue).
- **Graisses** : regular 400, medium 500, semibold 600, bold 700 — trois au plus par écran.
- **Approche** : `--tracking-tight` pour les grands titres, `--tracking-caps` pour les petites
  capitales.
- **Mesure** : `--measure: 66ch` pour tout texte de lecture (45–75 caractères).
- `--text-2xs` (11 px) est réservé aux badges et métadonnées non essentielles.
- Chiffres tabulaires (`.tabular`) pour les durées, horloges et tableaux.

## 7. Espacement, grille et points de rupture

- **Échelle de 4 px** : `--space-1` 4 · `-2` 8 · `-3` 12 · `-4` 16 · `-5` 20 · `-6` 24 · `-7` 32 ·
  `-8` 40 · `-9` 48 · `-10` 64 · `-11` 80 · `-12` 96 px. Aucune valeur arbitraire dans les
  composants.
- **Marges de page** : `--gutter` fluide, 16 px sur téléphone → 32 px sur ordinateur.
- **Largeurs** : `--content-max` 1120 px, `--content-narrow` 720 px (lecture, formulaires),
  `--sidebar-w` 264 px.
- **Chrome** : `--header-h` 56 px, `--tabbar-h` 64 px, zones sûres `--safe-*`.
- **Points de rupture** (référence ; les media queries répètent les valeurs, une propriété
  personnalisée ne pouvant pas piloter `@media`) :

| Token     | Valeur  | Usage                                                       |
| --------- | ------- | ----------------------------------------------------------- |
| `--bp-sm` | 480 px  | En dessous : téléphone (feuilles plein écran).              |
| `--bp-md` | 768 px  | À partir de : barre latérale au lieu de la barre d'onglets. |
| `--bp-lg` | 1200 px | À partir de : grand écran, vues en plusieurs colonnes.      |

- **Couches** : `--z-base` 0 < `--z-sticky` < `--z-nav` < `--z-player` < `--z-sheet` <
  `--z-overlay` < `--z-command` < `--z-toast` 70.

## 8. Rayons, traits et élévation

- **Rayons** : `--radius-xs` 6 (focus, puces) · `--radius-sm` 10 (champs) · `--radius-md` 14
  (cartes) · `--radius-lg` 20 (feuilles) · `--radius-xl` 28 (grandes surfaces) · `--radius-pill`.
  Règle des rayons imbriqués : rayon intérieur = rayon extérieur − marge intérieure.
- **Traits** : `--border-width` 1 px, `--border-width-strong` 2 px (2 et 3 px en E-Ink).
- **Élévation** : trois niveaux. `--shadow-1` (cartes au repos), `--shadow-2` (popovers, menus),
  `--shadow-3` (feuilles, dialogues). En sombre, l'élévation se lit surtout par la clarté du
  papier (`--surface` → `--surface-3`) ; en E-Ink, les ombres sont supprimées et remplacées par
  des traits.
- **Verre** : `--glass` (fond translucide de la barre de navigation) s'emploie avec
  `backdrop-filter`, retiré en E-Ink.

## 9. Iconographie

- Jeu d'icônes linéaires maison (`src/ui/icons.tsx`) : grille 24 × 24, trait 1,75, extrémités
  et angles arrondis, `currentColor`.
- Tailles : `--icon-sm` 16 · `--icon-md` 20 · `--icon-lg` 24 · `--icon-xl` 32 px ; l'icône
  s'aligne sur la taille du texte voisin.
- `--icon-stroke` (1,75 ; 2,25 en E-Ink) documente l'épaisseur du trait.
- Une icône seule porte toujours un nom accessible (`aria-label`) ; une icône à côté d'un
  libellé est décorative (`aria-hidden`).
- Pas de pictogrammes génériques là où un mot est plus clair.

## 10. Densité et cibles

- **Confortable** (défaut) : `--row-min` 44 px, `--tap-min` 44 px, `--control-h-sm` 32 px
  (visuel ; la zone active reste ≥ 44 px grâce à la marge), `--control-h-lg` 52 px.
- **Compacte** (`data-density="compact"`) : uniquement sous `@media (pointer: fine)` — lignes à
  36 px, petits contrôles à 28 px. Sur écran tactile, l'attribut est ignoré.
- **E-Ink** : `--tap-min` 48 px, `--row-min` 52 px, `--control-h-sm` 40 px.

## 11. États d'interaction

| État          | Traitement                                                                 | Tokens                             |
| ------------- | -------------------------------------------------------------------------- | ---------------------------------- |
| Survol        | Calque d'encre translucide, uniquement sous `@media (hover: hover)`.       | `--state-hover`                    |
| Pression      | Calque plus dense + légère réduction d'échelle.                            | `--state-pressed`, `--press-scale` |
| Focus clavier | Anneau 2 px décalé de 2 px, jamais supprimé.                               | `--focus-ring*`                    |
| Sélectionné   | Teinte `-soft` du mode ou de l'accent + texte `--ink`.                     | `--mode-accent-soft`               |
| Désactivé     | Opacité réduite, non focusable, explication à côté si utile.               | `--opacity-disabled`               |
| Erreur        | Bordure et message `--danger`, icône, secousse `.px-shake` facultative.    | `--danger*`                        |
| Chargement    | Pulsation d'opacité `.px-pulse` ; indicateur de progression au-delà d'1 s. | `--dur-slower`                     |

## 12. Visualisation de données

- `--viz-1…8` : huit emplacements **fixes**, attribués dans l'ordre et jamais recyclés ; nuages de
  points et cartes : trois premiers emplacements seulement.
- Testé pour les daltonismes (simulation de Machado, Oliveira et Fernandes, 2009, sévérité
  maximale) : deux séries adjacentes restent distinctes (ΔE OKLab × 100 ≥ 15 en vision normale,
  ≥ 6 en protanopie et deutéranopie).
- Chaque marque ≥ 3:1 sur `--bg` et `--surface`, y compris au crépuscule du thème daylight.
- Légende ou étiquettes directes toujours présentes ; la couleur n'est jamais le seul codage.
- `--heat-0…4` : échelle séquentielle d'une seule teinte, du clair au foncé.
- En E-Ink, toutes les séries passent au noir : étiquettes directes et motifs obligatoires.

## 13. Interface Zen (7.4)

`useZenIdle({ delayMs = 3000, enabled })` (`src/design/zen.ts`) pose `data-zen="idle"` sur
`<html>` après 3 s sans aucune entrée (pointeur, clavier, molette, toucher, focus). Les éléments
marqués `.px-chrome` (barres d'outils, menus, barres de défilement) s'estompent jusqu'à
`--zen-chrome-opacity` (8 %).

Garanties d'accessibilité :

- le chrome reste dans le DOM et **focusable** : `:hover` et `:focus-within` le rendent
  immédiatement visible ;
- toute entrée réveille l'interface entière ;
- `data-zen-keep` sur un élément le soustrait à l'effacement (par exemple un minuteur en cours) ;
- désactivé sous `prefers-reduced-motion` et dans un onglet masqué ;
- à n'activer que dans les modes de concentration : le délai de 3 s vient du brief, ce n'est pas
  un résultat de recherche.

## 14. Thème « daylight » (7.6)

`src/design/solar.ts` calcule la position du soleil selon les équations du calculateur solaire
de la NOAA (Meeus). Les tests la confrontent à des faits astronomiques connus : déclinaison
nulle à l'équinoxe de mars 2024, ±23,44° aux solstices, équation du temps à +16,4 min début
novembre et −14,2 min mi-février, hauteur méridienne de 90° − φ + δ à Paris, nuit polaire et
soleil de minuit à Tromsø.

`daylightLevel(élévation)` convertit la hauteur du soleil en niveau 0…1 : 0 sous −6° (fin du
crépuscule civil), 0,5 à l'horizon, 1 à partir de +6°, avec un lissage _smoothstep_ qui rend la
variation imperceptible d'une minute à l'autre. `applyDaylight(niveau)` écrit `--daylight`,
`data-theme-auto="daylight"` et `data-daylight-phase="day|night"`.

Dans `tokens.css`, la section générée mélange les papiers avec `color-mix(in oklab, …)` :

- de jour, les papiers s'assombrissent jusqu'à 4 % vers leur valeur sombre à l'approche du
  coucher ;
- au passage de l'horizon, le thème sombre prend le relais, légèrement éclairci (5 %), puis
  s'approfondit dans la nuit ;
- **les encres et couleurs sémantiques basculent d'un coup** à l'horizon : le contraste du texte
  ne traverse jamais un gris intermédiaire. Le test de contraste le vérifie à six niveaux.

Le soir, l'objectif est de réduire la luminosité, pas seulement d'inverser les couleurs (Chang
et al., 2015, pour le mécanisme ; l'effet d'un thème d'application sur le sommeil n'est pas
démontré). Un thème forcé (`data-theme`) a toujours la priorité.

**Météo** : seulement une interface (`WeatherProvider`), à activer explicitement. Un ciel couvert
assombrit la journée de 30 % au plus sans jamais la faire basculer en nuit. Aucun appel réseau
n'est fait par défaut.

`useDaylight({ enabled, at, weather? })` recalcule chaque minute et nettoie tout à la
désactivation.

## 15. Thème E-Ink (7.10)

Pour les liseuses à encre électronique (Onyx Boox, reMarkable) :

- **noir et blanc purs**, aucun gris de texte ou de trait plus clair que `#333` (testé) ;
- **aucune ombre, flou, dégradé, `backdrop-filter`, ni animation** : chaque rafraîchissement
  partiel d'un écran électrophorétique laisse une rémanence. Les durées valent 0 ms et
  `base.css` neutralise aussi les effets codés en dur dans les composants ;
- **traits de 2 px** (3 px pour les traits forts et l'anneau de focus) ;
- **cibles plus grandes** : 48 px minimum, lignes de 52 px ;
- lissage des polices désactivé (`-webkit-font-smoothing: none`) ;
- catégories et séries de données en blanc ou noir : l'information passe par le texte et les
  motifs.

## 16. Règles de contribution

1. Les **noms** de tokens sont un contrat : on ajuste une valeur, on **ajoute** un token, on ne
   renomme ni ne supprime jamais.
2. Toute couleur ajoutée qui porte du texte entre dans `CONTRAST_RULES`
   (`src/design/tokens-model.ts`).
3. Toute valeur sombre se modifie dans les **deux** blocs sombres.
4. Un composant n'emploie aucune couleur, durée, ombre ou espacement en dur.
5. Après modification : `node apps/pouxis/src/design/build-tokens.mjs`, puis les tests.

API TypeScript utile aux fonctionnalités :

| Module                      | Exports                                                                                                               |
| --------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| `design/color.ts`           | `contrastRatio`, `relativeLuminance`, `readableInk`, `mixOklab`, `toOklch`, `simulateCvd`, `cvdDeltaE`                |
| `design/zen.ts`             | `useZenIdle`, `ZEN_DEFAULT_DELAY_MS`                                                                                  |
| `design/solar.ts`           | `solarPosition`, `GeoPoint`                                                                                           |
| `design/daylight.ts`        | `daylightLevel`, `daylightAt`, `applyDaylight`, `clearDaylight`, `useDaylight`, `adjustForWeather`, `WeatherProvider` |
| `design/view-transition.ts` | `withViewTransition`                                                                                                  |

## 17. Table complète des tokens

« = » : même valeur que le thème clair.

<!-- @generated tokens:start -->

| Token                   | Clair                                                                                                         | Sombre                    | E-ink                    |
| ----------------------- | ------------------------------------------------------------------------------------------------------------- | ------------------------- | ------------------------ |
| `--bg`                  | `#f6f4ef`                                                                                                     | `#121211`                 | `#ffffff`                |
| `--bg-elevated`         | `#fbfaf7`                                                                                                     | `#1a1a18`                 | `#ffffff`                |
| `--surface`             | `#ffffff`                                                                                                     | `#1f1e1c`                 | =                        |
| `--surface-2`           | `#f0ede6`                                                                                                     | `#272623`                 | `#ffffff`                |
| `--surface-3`           | `#e8e4db`                                                                                                     | `#312f2b`                 | `#eeeeee`                |
| `--ink`                 | `#1c1b18`                                                                                                     | `#f3f1ec`                 | `#000000`                |
| `--ink-2`               | `#4f4b44`                                                                                                     | `#bdb8ad`                 | `#000000`                |
| `--ink-3`               | `#656156`                                                                                                     | `#9f9a8f`                 | `#333333`                |
| `--line`                | `#e6e2d8`                                                                                                     | `#2e2d29`                 | `#000000`                |
| `--line-strong`         | `#d3cec2`                                                                                                     | `#3d3b36`                 | `#000000`                |
| `--line-control`        | `#827d73`                                                                                                     | `#7e7a72`                 | `#000000`                |
| `--overlay`             | `rgb(28 27 24 / 0.32)`                                                                                        | `rgb(0 0 0 / 0.5)`        | `rgb(255 255 255 / 0.9)` |
| `--glass`               | `rgb(251 250 247 / 0.72)`                                                                                     | `rgb(26 26 24 / 0.72)`    | `#ffffff`                |
| `--shadow-color`        | `28 27 24`                                                                                                    | `0 0 0`                   | =                        |
| `--accent`              | `#ff8f70`                                                                                                     | `#ff9c80`                 | `#000000`                |
| `--accent-ink`          | `#1c1b18`                                                                                                     | =                         | `#ffffff`                |
| `--accent-soft`         | `#ffe5dc`                                                                                                     | `#3a2620`                 | `#ffffff`                |
| `--accent-strong`       | `#a83c1f`                                                                                                     | `#ffa58c`                 | `#000000`                |
| `--create`              | `#344ce5`                                                                                                     | `#8ea2ff`                 | `#000000`                |
| `--create-soft`         | `#e3e8ff`                                                                                                     | `#1e2547`                 | `#ffffff`                |
| `--create-ink`          | `#ffffff`                                                                                                     | `#121211`                 | =                        |
| `--execute`             | `#a04803`                                                                                                     | `#f2a067`                 | `#000000`                |
| `--execute-soft`        | `#ffead7`                                                                                                     | `#362113`                 | `#ffffff`                |
| `--execute-ink`         | `#ffffff`                                                                                                     | `#121211`                 | =                        |
| `--mode-accent`         | `var(--create)`                                                                                               | =                         | =                        |
| `--mode-accent-soft`    | `var(--create-soft)`                                                                                          | =                         | =                        |
| `--mode-accent-ink`     | `var(--create-ink)`                                                                                           | =                         | =                        |
| `--success`             | `#007144`                                                                                                     | `#5cc995`                 | `#000000`                |
| `--success-soft`        | `#dbf6e7`                                                                                                     | `#16301f`                 | `#ffffff`                |
| `--success-ink`         | `#ffffff`                                                                                                     | `#121211`                 | =                        |
| `--warning`             | `#8b5600`                                                                                                     | `#e9b05a`                 | `#000000`                |
| `--warning-soft`        | `#fdf0d5`                                                                                                     | `#33280f`                 | `#ffffff`                |
| `--danger`              | `#b12620`                                                                                                     | `#ff7a6e`                 | `#000000`                |
| `--danger-soft`         | `#fbe0dd`                                                                                                     | `#3a1a17`                 | `#ffffff`                |
| `--danger-ink`          | `#ffffff`                                                                                                     | `#121211`                 | =                        |
| `--focus-ring`          | `#344ce5`                                                                                                     | `#8ea2ff`                 | `#000000`                |
| `--focus-ring-width`    | `2px`                                                                                                         | =                         | `3px`                    |
| `--focus-ring-offset`   | `2px`                                                                                                         | =                         | =                        |
| `--state-hover`         | `rgb(28 27 24 / 0.05)`                                                                                        | `rgb(243 241 236 / 0.06)` | `transparent`            |
| `--state-pressed`       | `rgb(28 27 24 / 0.1)`                                                                                         | `rgb(243 241 236 / 0.11)` | `rgb(0 0 0 / 0.12)`      |
| `--opacity-disabled`    | `0.45`                                                                                                        | =                         | `0.6`                    |
| `--cat-1`               | `#ffd8cc`                                                                                                     | `#4a3029`                 | `#ffffff`                |
| `--cat-2`               | `#ffe9a8`                                                                                                     | `#453c23`                 | `#ffffff`                |
| `--cat-3`               | `#cdefd6`                                                                                                     | `#24402d`                 | `#ffffff`                |
| `--cat-4`               | `#cfe3ff`                                                                                                     | `#23364f`                 | `#ffffff`                |
| `--cat-5`               | `#e3d5ff`                                                                                                     | `#362c4f`                 | `#ffffff`                |
| `--cat-6`               | `#ffd3e6`                                                                                                     | `#4a2a39`                 | `#ffffff`                |
| `--cat-7`               | `#d4f0ef`                                                                                                     | `#20403f`                 | `#ffffff`                |
| `--cat-8`               | `#ede6da`                                                                                                     | `#3a352d`                 | `#ffffff`                |
| `--heat-0`              | `#f0ede6`                                                                                                     | `#272623`                 | `#ffffff`                |
| `--heat-1`              | `#ffe5dc`                                                                                                     | `#3a2620`                 | `#dddddd`                |
| `--heat-2`              | `#ffc2ad`                                                                                                     | `#6b3727`                 | `#aaaaaa`                |
| `--heat-3`              | `#ff9d80`                                                                                                     | `#b2533a`                 | `#555555`                |
| `--heat-4`              | `#e8694a`                                                                                                     | `#ff9c80`                 | `#000000`                |
| `--viz-1`               | `#2a78d6`                                                                                                     | `#3987e5`                 | `#000000`                |
| `--viz-2`               | `#dd5c26`                                                                                                     | `#d95926`                 | `#000000`                |
| `--viz-3`               | `#009764`                                                                                                     | `#199e70`                 | `#000000`                |
| `--viz-4`               | `#bd7300`                                                                                                     | `#c98500`                 | `#000000`                |
| `--viz-5`               | `#cb628b`                                                                                                     | `#d55181`                 | `#000000`                |
| `--viz-6`               | `#008300`                                                                                                     | =                         | `#000000`                |
| `--viz-7`               | `#4a3aa7`                                                                                                     | `#9085e9`                 | `#000000`                |
| `--viz-8`               | `#e34948`                                                                                                     | `#e66767`                 | `#000000`                |
| `--font-sans`           | `system-ui, -apple-system, 'Segoe UI Variable Text', 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif` | =                         | =                        |
| `--font-serif`          | `ui-serif, 'New York', 'Iowan Old Style', 'Charter', Georgia, serif`                                          | =                         | =                        |
| `--font-mono`           | `ui-monospace, 'SF Mono', 'Cascadia Code', 'JetBrains Mono', Menlo, Consolas, monospace`                      | =                         | =                        |
| `--text-2xs`            | `0.6875rem`                                                                                                   | =                         | =                        |
| `--text-xs`             | `0.75rem`                                                                                                     | =                         | =                        |
| `--text-sm`             | `0.875rem`                                                                                                    | =                         | =                        |
| `--text-md`             | `1rem`                                                                                                        | =                         | =                        |
| `--text-lg`             | `1.125rem`                                                                                                    | =                         | =                        |
| `--text-xl`             | `1.375rem`                                                                                                    | =                         | =                        |
| `--text-2xl`            | `1.75rem`                                                                                                     | =                         | =                        |
| `--text-3xl`            | `2.25rem`                                                                                                     | =                         | =                        |
| `--text-4xl`            | `3rem`                                                                                                        | =                         | =                        |
| `--text-display`        | `clamp(2.25rem, 1.5rem + 2.6vw, 3.75rem)`                                                                     | =                         | =                        |
| `--leading-tight`       | `1.15`                                                                                                        | =                         | =                        |
| `--leading-snug`        | `1.3`                                                                                                         | =                         | =                        |
| `--leading-normal`      | `1.5`                                                                                                         | =                         | =                        |
| `--leading-relaxed`     | `1.65`                                                                                                        | =                         | =                        |
| `--weight-regular`      | `400`                                                                                                         | =                         | =                        |
| `--weight-medium`       | `500`                                                                                                         | =                         | =                        |
| `--weight-semibold`     | `600`                                                                                                         | =                         | =                        |
| `--weight-bold`         | `700`                                                                                                         | =                         | =                        |
| `--tracking-tight`      | `-0.02em`                                                                                                     | =                         | =                        |
| `--tracking-wide`       | `0.04em`                                                                                                      | =                         | =                        |
| `--tracking-caps`       | `0.08em`                                                                                                      | =                         | =                        |
| `--measure`             | `66ch`                                                                                                        | =                         | =                        |
| `--space-1`             | `0.25rem`                                                                                                     | =                         | =                        |
| `--space-2`             | `0.5rem`                                                                                                      | =                         | =                        |
| `--space-3`             | `0.75rem`                                                                                                     | =                         | =                        |
| `--space-4`             | `1rem`                                                                                                        | =                         | =                        |
| `--space-5`             | `1.25rem`                                                                                                     | =                         | =                        |
| `--space-6`             | `1.5rem`                                                                                                      | =                         | =                        |
| `--space-7`             | `2rem`                                                                                                        | =                         | =                        |
| `--space-8`             | `2.5rem`                                                                                                      | =                         | =                        |
| `--space-9`             | `3rem`                                                                                                        | =                         | =                        |
| `--space-10`            | `4rem`                                                                                                        | =                         | =                        |
| `--space-11`            | `5rem`                                                                                                        | =                         | =                        |
| `--space-12`            | `6rem`                                                                                                        | =                         | =                        |
| `--gutter`              | `clamp(1rem, 0.6rem + 1.8vw, 2rem)`                                                                           | =                         | =                        |
| `--radius-xs`           | `6px`                                                                                                         | =                         | =                        |
| `--radius-sm`           | `10px`                                                                                                        | =                         | =                        |
| `--radius-md`           | `14px`                                                                                                        | =                         | =                        |
| `--radius-lg`           | `20px`                                                                                                        | =                         | =                        |
| `--radius-xl`           | `28px`                                                                                                        | =                         | =                        |
| `--radius-pill`         | `999px`                                                                                                       | =                         | =                        |
| `--border-width`        | `1px`                                                                                                         | =                         | `2px`                    |
| `--border-width-strong` | `2px`                                                                                                         | =                         | `3px`                    |
| `--shadow-1`            | `0 1px 2px rgb(var(--shadow-color) / 0.06), 0 1px 1px rgb(var(--shadow-color) / 0.04)`                        | =                         | `none`                   |
| `--shadow-2`            | `0 4px 12px rgb(var(--shadow-color) / 0.08), 0 1px 3px rgb(var(--shadow-color) / 0.06)`                       | =                         | `none`                   |
| `--shadow-3`            | `0 16px 40px rgb(var(--shadow-color) / 0.14), 0 4px 12px rgb(var(--shadow-color) / 0.08)`                     | =                         | `none`                   |
| `--dur-instant`         | `80ms`                                                                                                        | =                         | `0ms`                    |
| `--dur-fast`            | `140ms`                                                                                                       | =                         | `0ms`                    |
| `--dur-base`            | `220ms`                                                                                                       | =                         | `0ms`                    |
| `--dur-slow`            | `320ms`                                                                                                       | =                         | `0ms`                    |
| `--dur-slower`          | `480ms`                                                                                                       | =                         | `0ms`                    |
| `--dur-zen-out`         | `700ms`                                                                                                       | =                         | `0ms`                    |
| `--ease-standard`       | `cubic-bezier(0.2, 0, 0, 1)`                                                                                  | =                         | =                        |
| `--ease-out`            | `cubic-bezier(0.16, 1, 0.3, 1)`                                                                               | =                         | =                        |
| `--ease-in`             | `cubic-bezier(0.4, 0, 1, 1)`                                                                                  | =                         | =                        |
| `--ease-spring`         | `cubic-bezier(0.34, 1.56, 0.64, 1)`                                                                           | =                         | =                        |
| `--ease-enter`          | `var(--ease-out)`                                                                                             | =                         | =                        |
| `--ease-exit`           | `var(--ease-in)`                                                                                              | =                         | =                        |
| `--stagger-step`        | `24ms`                                                                                                        | =                         | `0ms`                    |
| `--motion-offset-sm`    | `8px`                                                                                                         | =                         | `0px`                    |
| `--motion-offset-md`    | `24px`                                                                                                        | =                         | `0px`                    |
| `--motion-scale-from`   | `0.96`                                                                                                        | =                         | `1`                      |
| `--daylight`            | `1`                                                                                                           | =                         | =                        |
| `--zen-chrome-opacity`  | `0.08`                                                                                                        | =                         | `0`                      |
| `--press-scale`         | `0.97`                                                                                                        | =                         | `1`                      |
| `--icon-sm`             | `16px`                                                                                                        | =                         | =                        |
| `--icon-md`             | `20px`                                                                                                        | =                         | =                        |
| `--icon-lg`             | `24px`                                                                                                        | =                         | =                        |
| `--icon-xl`             | `32px`                                                                                                        | =                         | =                        |
| `--icon-stroke`         | `1.75`                                                                                                        | =                         | `2.25`                   |
| `--bp-sm`               | `480px`                                                                                                       | =                         | =                        |
| `--bp-md`               | `768px`                                                                                                       | =                         | =                        |
| `--bp-lg`               | `1200px`                                                                                                      | =                         | =                        |
| `--sidebar-w`           | `264px`                                                                                                       | =                         | =                        |
| `--tabbar-h`            | `64px`                                                                                                        | =                         | =                        |
| `--header-h`            | `56px`                                                                                                        | =                         | =                        |
| `--content-max`         | `1120px`                                                                                                      | =                         | =                        |
| `--content-narrow`      | `720px`                                                                                                       | =                         | =                        |
| `--tap-min`             | `44px`                                                                                                        | =                         | `48px`                   |
| `--row-min`             | `44px`                                                                                                        | =                         | `52px`                   |
| `--control-h-sm`        | `32px`                                                                                                        | =                         | `40px`                   |
| `--control-h-lg`        | `52px`                                                                                                        | =                         | =                        |
| `--safe-top`            | `env(safe-area-inset-top, 0px)`                                                                               | =                         | =                        |
| `--safe-bottom`         | `env(safe-area-inset-bottom, 0px)`                                                                            | =                         | =                        |
| `--safe-left`           | `env(safe-area-inset-left, 0px)`                                                                              | =                         | =                        |
| `--safe-right`          | `env(safe-area-inset-right, 0px)`                                                                             | =                         | =                        |
| `--z-base`              | `0`                                                                                                           | =                         | =                        |
| `--z-sticky`            | `10`                                                                                                          | =                         | =                        |
| `--z-nav`               | `20`                                                                                                          | =                         | =                        |
| `--z-player`            | `30`                                                                                                          | =                         | =                        |
| `--z-sheet`             | `40`                                                                                                          | =                         | =                        |
| `--z-overlay`           | `50`                                                                                                          | =                         | =                        |
| `--z-command`           | `60`                                                                                                          | =                         | =                        |
| `--z-toast`             | `70`                                                                                                          | =                         | =                        |

<!-- @generated tokens:end -->

## 18. Résultats de contraste

Ratios WCAG 2.x calculés par `contrast.test.ts` (✅ conforme).

<!-- @generated contrast:start -->

| Premier plan        | Fond             | Exigence        | Clair    | Sombre   | E-ink    |
| ------------------- | ---------------- | --------------- | -------- | -------- | -------- |
| `--ink`             | `--bg`           | texte ≥ 4,5     | 15,67 ✅ | 16,61 ✅ | 21,00 ✅ |
| `--ink`             | `--bg-elevated`  | texte ≥ 4,5     | 16,50 ✅ | 15,44 ✅ | 21,00 ✅ |
| `--ink`             | `--surface`      | texte ≥ 4,5     | 17,22 ✅ | 14,76 ✅ | 21,00 ✅ |
| `--ink`             | `--surface-2`    | texte ≥ 4,5     | 14,73 ✅ | 13,41 ✅ | 21,00 ✅ |
| `--ink-2`           | `--bg`           | texte ≥ 4,5     | 7,89 ✅  | 9,48 ✅  | 21,00 ✅ |
| `--ink-2`           | `--bg-elevated`  | texte ≥ 4,5     | 8,31 ✅  | 8,82 ✅  | 21,00 ✅ |
| `--ink-2`           | `--surface`      | texte ≥ 4,5     | 8,67 ✅  | 8,43 ✅  | 21,00 ✅ |
| `--ink-2`           | `--surface-2`    | texte ≥ 4,5     | 7,41 ✅  | 7,65 ✅  | 21,00 ✅ |
| `--ink-3`           | `--bg`           | texte ≥ 4,5     | 5,62 ✅  | 6,69 ✅  | 12,63 ✅ |
| `--ink-3`           | `--bg-elevated`  | texte ≥ 4,5     | 5,92 ✅  | 6,22 ✅  | 12,63 ✅ |
| `--ink-3`           | `--surface`      | texte ≥ 4,5     | 6,18 ✅  | 5,94 ✅  | 12,63 ✅ |
| `--ink-3`           | `--surface-2`    | texte ≥ 4,5     | 5,29 ✅  | 5,40 ✅  | 12,63 ✅ |
| `--ink`             | `--surface-3`    | texte ≥ 4,5     | 13,57 ✅ | 11,83 ✅ | 18,10 ✅ |
| `--ink-2`           | `--surface-3`    | texte ≥ 4,5     | 6,83 ✅  | 6,76 ✅  | 18,10 ✅ |
| `--ink-3`           | `--surface-3`    | grand texte ≥ 3 | 4,87 ✅  | 4,77 ✅  | 10,89 ✅ |
| `--accent-ink`      | `--accent`       | texte ≥ 4,5     | 7,72 ✅  | 8,46 ✅  | 21,00 ✅ |
| `--accent-strong`   | `--bg`           | texte ≥ 4,5     | 5,74 ✅  | 9,83 ✅  | 21,00 ✅ |
| `--accent-strong`   | `--surface`      | texte ≥ 4,5     | 6,30 ✅  | 8,74 ✅  | 21,00 ✅ |
| `--accent-strong`   | `--surface-2`    | texte ≥ 4,5     | 5,39 ✅  | 7,94 ✅  | 21,00 ✅ |
| `--accent-strong`   | `--accent-soft`  | texte ≥ 4,5     | 5,25 ✅  | 7,45 ✅  | 21,00 ✅ |
| `--ink`             | `--accent-soft`  | texte ≥ 4,5     | 14,35 ✅ | 12,59 ✅ | 21,00 ✅ |
| `--create`          | `--bg`           | texte ≥ 4,5     | 5,77 ✅  | 7,82 ✅  | 21,00 ✅ |
| `--create`          | `--surface`      | texte ≥ 4,5     | 6,34 ✅  | 6,95 ✅  | 21,00 ✅ |
| `--create`          | `--surface-2`    | texte ≥ 4,5     | 5,42 ✅  | 6,31 ✅  | 21,00 ✅ |
| `--create`          | `--create-soft`  | texte ≥ 4,5     | 5,21 ✅  | 6,21 ✅  | 21,00 ✅ |
| `--ink`             | `--create-soft`  | texte ≥ 4,5     | 14,15 ✅ | 13,19 ✅ | 21,00 ✅ |
| `--execute`         | `--bg`           | texte ≥ 4,5     | 5,58 ✅  | 8,93 ✅  | 21,00 ✅ |
| `--execute`         | `--surface`      | texte ≥ 4,5     | 6,14 ✅  | 7,93 ✅  | 21,00 ✅ |
| `--execute`         | `--surface-2`    | texte ≥ 4,5     | 5,25 ✅  | 7,21 ✅  | 21,00 ✅ |
| `--execute`         | `--execute-soft` | texte ≥ 4,5     | 5,26 ✅  | 7,23 ✅  | 21,00 ✅ |
| `--ink`             | `--execute-soft` | texte ≥ 4,5     | 14,76 ✅ | 13,44 ✅ | 21,00 ✅ |
| `--success`         | `--bg`           | texte ≥ 4,5     | 5,54 ✅  | 9,14 ✅  | 21,00 ✅ |
| `--success`         | `--surface`      | texte ≥ 4,5     | 6,09 ✅  | 8,13 ✅  | 21,00 ✅ |
| `--success`         | `--surface-2`    | texte ≥ 4,5     | 5,21 ✅  | 7,38 ✅  | 21,00 ✅ |
| `--success`         | `--success-soft` | texte ≥ 4,5     | 5,33 ✅  | 6,94 ✅  | 21,00 ✅ |
| `--ink`             | `--success-soft` | texte ≥ 4,5     | 15,05 ✅ | 12,60 ✅ | 21,00 ✅ |
| `--warning`         | `--bg`           | texte ≥ 4,5     | 5,57 ✅  | 9,66 ✅  | 21,00 ✅ |
| `--warning`         | `--surface`      | texte ≥ 4,5     | 6,12 ✅  | 8,58 ✅  | 21,00 ✅ |
| `--warning`         | `--surface-2`    | texte ≥ 4,5     | 5,24 ✅  | 7,80 ✅  | 21,00 ✅ |
| `--warning`         | `--warning-soft` | texte ≥ 4,5     | 5,42 ✅  | 7,46 ✅  | 21,00 ✅ |
| `--ink`             | `--warning-soft` | texte ≥ 4,5     | 15,26 ✅ | 12,82 ✅ | 21,00 ✅ |
| `--danger`          | `--bg`           | texte ≥ 4,5     | 6,03 ✅  | 7,37 ✅  | 21,00 ✅ |
| `--danger`          | `--surface`      | texte ≥ 4,5     | 6,63 ✅  | 6,55 ✅  | 21,00 ✅ |
| `--danger`          | `--surface-2`    | texte ≥ 4,5     | 5,67 ✅  | 5,95 ✅  | 21,00 ✅ |
| `--danger`          | `--danger-soft`  | texte ≥ 4,5     | 5,31 ✅  | 6,16 ✅  | 21,00 ✅ |
| `--ink`             | `--danger-soft`  | texte ≥ 4,5     | 13,78 ✅ | 13,88 ✅ | 21,00 ✅ |
| `--create-ink`      | `--create`       | texte ≥ 4,5     | 6,34 ✅  | 7,82 ✅  | 21,00 ✅ |
| `--execute-ink`     | `--execute`      | texte ≥ 4,5     | 6,14 ✅  | 8,93 ✅  | 21,00 ✅ |
| `--mode-accent-ink` | `--mode-accent`  | texte ≥ 4,5     | 6,34 ✅  | 7,82 ✅  | 21,00 ✅ |
| `--danger-ink`      | `--danger`       | texte ≥ 4,5     | 6,63 ✅  | 7,37 ✅  | 21,00 ✅ |
| `--success-ink`     | `--success`      | texte ≥ 4,5     | 6,09 ✅  | 9,14 ✅  | 21,00 ✅ |
| `--ink`             | `--cat-1`        | texte ≥ 4,5     | 13,08 ✅ | 10,66 ✅ | 21,00 ✅ |
| `--ink-2`           | `--cat-1`        | texte ≥ 4,5     | 6,58 ✅  | 6,08 ✅  | 21,00 ✅ |
| `--ink`             | `--cat-2`        | texte ≥ 4,5     | 14,33 ✅ | 9,67 ✅  | 21,00 ✅ |
| `--ink-2`           | `--cat-2`        | texte ≥ 4,5     | 7,21 ✅  | 5,52 ✅  | 21,00 ✅ |
| `--ink`             | `--cat-3`        | texte ≥ 4,5     | 13,87 ✅ | 10,08 ✅ | 21,00 ✅ |
| `--ink-2`           | `--cat-3`        | texte ≥ 4,5     | 6,98 ✅  | 5,75 ✅  | 21,00 ✅ |
| `--ink`             | `--cat-4`        | texte ≥ 4,5     | 13,19 ✅ | 10,87 ✅ | 21,00 ✅ |
| `--ink-2`           | `--cat-4`        | texte ≥ 4,5     | 6,64 ✅  | 6,21 ✅  | 21,00 ✅ |
| `--ink`             | `--cat-5`        | texte ≥ 4,5     | 12,49 ✅ | 11,41 ✅ | 21,00 ✅ |
| `--ink-2`           | `--cat-5`        | texte ≥ 4,5     | 6,29 ✅  | 6,52 ✅  | 21,00 ✅ |
| `--ink`             | `--cat-6`        | texte ≥ 4,5     | 12,89 ✅ | 11,06 ✅ | 21,00 ✅ |
| `--ink-2`           | `--cat-6`        | texte ≥ 4,5     | 6,49 ✅  | 6,32 ✅  | 21,00 ✅ |
| `--ink`             | `--cat-7`        | texte ≥ 4,5     | 14,36 ✅ | 9,97 ✅  | 21,00 ✅ |
| `--ink-2`           | `--cat-7`        | texte ≥ 4,5     | 7,23 ✅  | 5,69 ✅  | 21,00 ✅ |
| `--ink`             | `--cat-8`        | texte ≥ 4,5     | 13,89 ✅ | 10,77 ✅ | 21,00 ✅ |
| `--ink-2`           | `--cat-8`        | texte ≥ 4,5     | 6,99 ✅  | 6,15 ✅  | 21,00 ✅ |
| `--focus-ring`      | `--bg`           | UI ≥ 3          | 5,77 ✅  | 7,82 ✅  | 21,00 ✅ |
| `--line-control`    | `--bg`           | UI ≥ 3          | 3,72 ✅  | 4,39 ✅  | 21,00 ✅ |
| `--focus-ring`      | `--surface`      | UI ≥ 3          | 6,34 ✅  | 6,95 ✅  | 21,00 ✅ |
| `--line-control`    | `--surface`      | UI ≥ 3          | 4,09 ✅  | 3,90 ✅  | 21,00 ✅ |
| `--focus-ring`      | `--surface-2`    | UI ≥ 3          | 5,42 ✅  | 6,31 ✅  | 21,00 ✅ |
| `--line-control`    | `--surface-2`    | UI ≥ 3          | 3,50 ✅  | 3,54 ✅  | 21,00 ✅ |
| `--viz-1`           | `--surface`      | UI ≥ 3          | 4,42 ✅  | 4,58 ✅  | 21,00 ✅ |
| `--viz-1`           | `--bg`           | UI ≥ 3          | 4,02 ✅  | 5,15 ✅  | 21,00 ✅ |
| `--viz-2`           | `--surface`      | UI ≥ 3          | 3,73 ✅  | 4,29 ✅  | 21,00 ✅ |
| `--viz-2`           | `--bg`           | UI ≥ 3          | 3,39 ✅  | 4,83 ✅  | 21,00 ✅ |
| `--viz-3`           | `--surface`      | UI ≥ 3          | 3,74 ✅  | 4,89 ✅  | 21,00 ✅ |
| `--viz-3`           | `--bg`           | UI ≥ 3          | 3,41 ✅  | 5,50 ✅  | 21,00 ✅ |
| `--viz-4`           | `--surface`      | UI ≥ 3          | 3,74 ✅  | 5,42 ✅  | 21,00 ✅ |
| `--viz-4`           | `--bg`           | UI ≥ 3          | 3,40 ✅  | 6,10 ✅  | 21,00 ✅ |
| `--viz-5`           | `--surface`      | UI ≥ 3          | 3,71 ✅  | 4,22 ✅  | 21,00 ✅ |
| `--viz-5`           | `--bg`           | UI ≥ 3          | 3,38 ✅  | 4,75 ✅  | 21,00 ✅ |
| `--viz-6`           | `--surface`      | UI ≥ 3          | 4,95 ✅  | 3,37 ✅  | 21,00 ✅ |
| `--viz-6`           | `--bg`           | UI ≥ 3          | 4,50 ✅  | 3,79 ✅  | 21,00 ✅ |
| `--viz-7`           | `--surface`      | UI ≥ 3          | 8,56 ✅  | 5,33 ✅  | 21,00 ✅ |
| `--viz-7`           | `--bg`           | UI ≥ 3          | 7,78 ✅  | 6,00 ✅  | 21,00 ✅ |
| `--viz-8`           | `--surface`      | UI ≥ 3          | 3,95 ✅  | 5,16 ✅  | 21,00 ✅ |
| `--viz-8`           | `--bg`           | UI ≥ 3          | 3,60 ✅  | 5,80 ✅  | 21,00 ✅ |

<!-- @generated contrast:end -->

## 19. Questions ouvertes

- **Eyeye** : le brief cite « Eyeye » parmi les inspirations, mais nous n'avons pas pu
  identifier avec certitude de quelle application, de quel site ou de quel studio il s'agit.
  Plutôt que d'inventer une interprétation, nous posons la question au fondateur : **quel
  produit (lien ou capture) désigne « Eyeye », et qu'est-ce qui vous y plaît — la typographie,
  la couleur, la mise en page, le mouvement ?** Le § 3 sera complété dès la réponse.
- **Polices de marque** : le système utilise les polices natives (zéro réseau). Si une police
  de marque est souhaitée pour les titres, elle devra être embarquée localement et sous licence
  libre (par exemple SIL OFL).
