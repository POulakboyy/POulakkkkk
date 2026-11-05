# Performance de l’interface — test de charge et budgets

Ce document décrit comment l’interface de POuxis est mesurée sous forte charge, ce que la
campagne du 5 novembre 2026 a mesuré, ce qui a été corrigé au niveau du shell et ce qui reste à
corriger dans les vues. Les chiffres moteur et serveur de synchronisation sont dans
[`BENCHMARKS.md`](./BENCHMARKS.md).

## 1. Méthode

### 1.1 Poids du bundle — `apps/pouxis/perf/bundle.mjs`

Le script lit le `index.html` produit par `vite build` pour identifier le **graphe initial**
(script d’entrée, `modulepreload`, feuilles de style), compresse chaque chunk en gzip (niveau 9)
et attribue les octets minifiés de chaque chunk JavaScript à leurs sources d’origine en décodant
les source maps (aucune dépendance). Il échoue (code de sortie 1) si un budget de
[`perf/budget.json`](../../apps/pouxis/perf/budget.json) est dépassé.

### 1.2 Test de charge — `apps/pouxis/perf/runtime.mjs`

Le script pilote Chromium (Playwright) sur un **build de production** servi par `vite preview`,
fenêtre 1440 × 900, `fr-FR`, fuseau `Europe/Paris`, horloge figée au jeudi 5 novembre 2026 à
07:30 (comme la suite e2e). Étapes :

1. ouverture sur une base vide (données de démonstration), introduction marquée comme vue ;
2. **injection, via l’API du store dans la page**, d’un jeu déterministe
   ([`perf/seed.mjs`](../../apps/pouxis/perf/seed.mjs), PRNG à graine fixe) :
   **5 000 tâches, 2 000 événements, 1 000 notes, une toile de 2 000 nœuds** (100 grappes de 20,
   1 900 liens) — une transaction `store.batch` par collection ;
3. attente de la persistance IndexedDB, rechargement, mesure du **démarrage avec données** ;
4. pour chaque vue, depuis une vue légère (Aujourd’hui, ou Réglages pour Aujourd’hui) :
   - **temps jusqu’à interactivité** : du clic sur le lien de navigation jusqu’au premier titre
     `h1` dans `<main>` sans squelette `aria-busy`, plus deux images peintes. Première visite
     (« à froid ») puis seconde visite (« à chaud », chunk déjà évalué) ;
   - **tâches longues** (> 50 ms) via `PerformanceObserver({ type: 'longtask' })`, jusqu’à
     300 ms après l’affichage ;
   - **images par seconde pendant un défilement** à la molette (40 crans) de l’élément qui
     défile réellement, échantillonnées par `requestAnimationFrame` ; une image est « perdue »
     quand elle dure plus de 1,5 × 16,7 ms ;
   - **mémoire** : tas JavaScript utilisé après ramasse-miettes forcé (CDP
     `HeapProfiler.collectGarbage` puis `Performance.getMetrics`) ;
   - nombre de nœuds DOM ;
5. sur la toile de 2 000 nœuds : FPS pendant un **panoramique** (glisser au bouton du milieu),
   un **zoom** (Ctrl + molette) et un **glisser** au bouton gauche ;
6. **latence de saisie de type INP** dans la barre de commande (⌘K / Ctrl+K puis 53 frappes à
   40 ms d’intervalle), mesurée par l’API Event Timing (`type: 'event'`, seuil 16 ms) : les
   entrées d’une même interaction sont fusionnées, la latence retenue est la pire en ignorant
   une interaction sur 50, comme l’INP. Mesure faite derrière la vue Tâches (5 000 tâches) et
   derrière la vue Bilan (vue légère).

Option `--cpu=4` : ralentissement CPU ×4 (CDP) pour approcher un téléphone d’entrée de gamme.

### 1.3 Limites

Mesures faites dans un conteneur Linux partagé avec d’autres processus de build et de test :
d’un passage à l’autre, les durées varient couramment de ± 30 % (le temps d’injection des 5 000
tâches a varié de 349 à 778 ms entre deux passages identiques). Chaque chiffre ci-dessous provient
d’un seul passage ; seuls les écarts nets sont interprétés. Chromium headless, sans GPU : les
FPS mesurent le fil principal, pas la composition matérielle d’un appareil réel.

## 2. Résultats

### 2.1 Bundle (gzip)

| Mesure                       | Avant    | Après    | Budget |
| ---------------------------- | -------- | -------- | ------ |
| JavaScript initial           | 244,4 kB | 184,1 kB | 195 kB |
| CSS initial                  | 15,4 kB  | 14,1 kB  | 16 kB  |
| Plus gros chunk différé (JS) | 32,6 kB  | 35,7 kB  | 40 kB  |
| JavaScript total             | 383,3 kB | 394,3 kB | 420 kB |

Le JavaScript chargé au démarrage baisse de **25 %**. Le total augmente légèrement (+ 11 kB) :
le code autrefois concentré dans un seul chunk commun est réparti en chunks partagés plus petits,
chacun ne se chargeant que pour les vues qui l’utilisent.

Composition du JavaScript initial après correction (minifié, avant gzip) : React DOM 198 kB,
catalogues de traduction **fr 75 kB + en 67 kB**, store 31 kB, primitives `src/ui` ~ 78 kB,
moteur `sync` 22 kB et `crypto` 6,5 kB (requis par le store), lecteur de focus 14 kB, shell 14 kB.

### 2.2 Exécution (5 000 tâches, 2 000 événements, 1 000 notes, 2 000 nœuds)

Temps jusqu’à interactivité, première visite depuis Aujourd’hui (ms) :

| Vue         | Avant  | Après | Nœuds DOM | Défilement (FPS) | Tas après GC |
| ----------- | ------ | ----- | --------- | ---------------- | ------------ |
| Tâches      | 10 005 | 7 628 | 95 200    | **1,8**          | 71,9 Mo      |
| Calendrier  | 603    | 378   | 720       | 62               | 20,4 Mo      |
| Toile       | 558    | 347   | 280       | —                | 21,6 Mo      |
| Idées       | 1 042  | 463   | 5 270     | 60               | 21,8 Mo      |
| Bilan       | 481    | 403   | 717       | 63               | 21,3 Mo      |
| Réglages    | 559    | 319   | 1 158     | 63               | 22,0 Mo      |
| Labo        | 1 539  | 919   | 773       | 62               | 21,9 Mo      |
| Aujourd’hui | 322    | 247   | 447       | 63               | 21,7 Mo      |

À chaud (chunk déjà évalué), les écarts avant/après restent dans le bruit de mesure : le gain
porte sur la première visite, désormais servie depuis le cache grâce au préchargement.

Autres mesures (après) :

- démarrage avec les données (rechargement → vue Aujourd’hui affichée) : ~ 1,1 s ;
- toile de 2 000 nœuds : panoramique 61 FPS, zoom 63 FPS, glisser 62 FPS (rendu Canvas 2D) ;
- barre de commande derrière Bilan : ouverture ~ 0,3 s, latence de type INP ~ 0,2–0,3 s ;
- barre de commande derrière Tâches : ouverture ~ 5 s, **chaque frappe ~ 3 s**.

## 3. Diagnostic

1. **Vue Tâches (critique)** — la liste rend toutes les tâches sans fenêtrage : ~ 95 000 nœuds
   DOM pour 5 000 tâches. Le profil CPU montre que le temps se passe hors JavaScript (recalcul
   de style et mise en page) : toute modification du document, y compris l’ouverture de la barre
   de commande, recalcule ces 95 000 nœuds. D’où 1,8 FPS au défilement et ~ 3 s par frappe.
   `groupTasks` est en outre recalculé à chaque rendu de `ListView`.
2. **Labo** — ~ 600 ms de tâche longue à chaque affichage : `dayRange()` (deux conversions de
   fuseau `Intl`) est recalculé **pour chaque tâche** dans `transition.ts`, et `isSameDay` fait
   de même dans `completedOn` / `isPlannedOn`. 720 ms sur 1,6 s de profil passent dans
   `zonedParts`.
3. **Idées** — la liste des notes rend les 1 000 notes (5 270 nœuds DOM), ~ 300 ms de tâche
   longue par affichage.
4. **Bundle** — le baril `@pouxis/core` réexporte tous les modules du moteur ; sans indication
   d’absence d’effets de bord, ils étaient tous placés dans le chunk initial (`nlp`,
   `recurrence`, `ideation`, `insights`, `scheduler`, `graph`…). Les deux catalogues de
   traduction sont chargés au démarrage alors qu’une seule langue est affichée.
5. **Shell** — la racine s’abonnait à toute la collection `tasks` (pour le mode de travail de
   la tâche en cours) : chaque modification de tâche rendait à nouveau l’application entière,
   vue courante comprise. La première navigation vers une vue suspendait toujours (squelette
   affiché une image, capturé par la View Transition), même chunk déjà en cache.

## 4. Corrections appliquées (shell)

- **Arbre de dépendances** (`vite.config.ts`) : les sources de `packages/core/src` sont
  déclarées sans effets de bord (`treeshake.moduleSideEffects`), ce qui laisse chaque module du
  moteur dans le chunk de la vue qui l’utilise (− 40 kB gzip au démarrage).
- **Barre de commande et capture rapide différées** (`src/app/deferred.tsx`) : l’analyseur de
  langage naturel, l’index de recherche et la saisie vocale sortent du chunk initial (− 20 kB
  gzip). La barre se charge juste après le premier rendu et reste montée ; ⌘K fonctionne
  avant son arrivée (l’état d’ouverture vit dans un module minuscule). Les exportateurs de
  données (`appActions.exportData`) se chargent à la demande.
- **Préchargement** (`src/app/prefetch.ts`) : chaque vue est préchargée au survol, au focus
  clavier ou au toucher de son lien, et toutes les vues le sont une par une pendant les temps
  morts (`requestIdleCallback`, ou un court délai sous WebKit). Rien n’est préchargé en mode
  économie de données ou sur une connexion 2G.
- **Rendu direct des vues préchargées** (`split()` dans `src/app/routes.ts`) : une vue dont le
  chunk est arrivé s’affiche sans passer par `React.lazy`, donc sans squelette ni rendu
  supplémentaire ; la View Transition capture la vraie vue.
- **Rendus de la racine** (`src/app/App.tsx`, `theme.ts`) : la racine ne lit plus que le mode
  de la tâche en cours (`useSyncExternalStore` + `doingMode` mémoïsé) ; le shell est mémoïsé et
  l’élément de la vue est stable, si bien qu’un changement de préférence ne rend plus la vue.
- **Vider sa tête depuis partout** : nouvelle action de clavier `ideas.brainDump`
  (`Alt+D` par défaut, remappable dans Réglages › Clavier) et `appActions.brainDump()`, qui
  ouvre la vue Idées avec le vide-tête par-dessus.
- **Labo** : l’entrée existe déjà (vue `#/lab`, lien dans la barre latérale et le menu « Plus »).

## 5. Budgets

Budgets en vigueur (`perf/budget.json`, gzip) : JavaScript initial **195 kB**, CSS initial
**16 kB**, plus gros chunk différé **40 kB**, JavaScript total **420 kB**. Objectifs d’exécution
(non bloquants, à vérifier à chaque campagne) :

| Mesure                                 | Objectif |
| -------------------------------------- | -------- |
| Première visite d’une vue (5 k tâches) | < 500 ms |
| Tâche longue maximale par navigation   | < 200 ms |
| Défilement, panoramique, glisser       | ≥ 55 FPS |
| Latence de type INP dans la capture    | < 200 ms |
| Nœuds DOM d’une vue                    | < 5 000  |

Quand le chargement différé de la langue non affichée sera en place (voir § 6), le budget de
JavaScript initial pourra descendre à 165 kB.

## 6. Corrections attendues dans les vues

| Fichier                                                  | Cause                                              | Correction proposée                                                                                                                                                                     |
| -------------------------------------------------------- | -------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `views/tasks/ListView.tsx`                               | Toutes les lignes rendues (95 000 nœuds)           | Fenêtrage par groupe (lignes de hauteur fixe ou rendu par pages de 100 avec sentinelle `IntersectionObserver`), `content-visibility: auto` sur les sections, `useMemo` sur `groupTasks` |
| `views/tasks/BoardView.tsx`, `MatrixView.tsx`            | Même rendu exhaustif par colonne                   | Plafonner chaque colonne (« Afficher N de plus »)                                                                                                                                       |
| `features/lab/transition/transition.ts`, `shared/day.ts` | `dayRange()` / `isSameDay()` recalculés par tâche  | Calculer `dayRange(now, zone)` une fois et comparer des horodatages (`start <= t < end`)                                                                                                |
| `views/ideas/notes/NotesPane.tsx`                        | 1 000 notes rendues                                | Fenêtrage ou pagination de la liste                                                                                                                                                     |
| `i18n/index.ts`                                          | `fr` et `en` dans le chunk initial                 | Charger dynamiquement la langue non canonique                                                                                                                                           |
| `i18n/fr/settings.ts`, `en/settings.ts`                  | Libellé manquant pour `ideas.brainDump`            | `settings.keyboard.actions.ideasBrainDump`                                                                                                                                              |
| `features/command/commands.ts`                           | `command.actions.brainDump` traduit mais inutilisé | Commande appelant `appActions.brainDump()`                                                                                                                                              |

## 7. Relancer les mesures

Depuis `apps/pouxis` :

```sh
# Poids du bundle et contrôle des budgets (ne touche pas au dist partagé)
npx vite build --outDir /tmp/pouxis-perf-dist --emptyOutDir
node perf/bundle.mjs /tmp/pouxis-perf-dist          # --json pour la sortie brute

# Test de charge : build de perf (expose le store à la page), puis aperçu sur un port libre
VITE_POUXIS_PERF=1 npx vite build --outDir /tmp/pouxis-perf --emptyOutDir
npx vite preview --outDir /tmp/pouxis-perf --port 4194 --strictPort &
node perf/runtime.mjs --url=http://localhost:4194 --out=/tmp/perf-report.json
#   --cpu=4                                 ralentissement CPU ×4
#   --counts=tasks:10000,events:2000,notes:1000,nodes:5000
#   --chromium=/chemin/vers/chrome          (ou PW_CHROMIUM_PATH)

# Tests des outils de mesure
node --test perf/*.test.mjs
```

Le crochet `VITE_POUXIS_PERF=1` (`src/main.tsx`) expose `globalThis.__pouxis.store` ; il est
absent des builds ordinaires (branche éliminée à la compilation). Ne jamais publier un build de
perf.
