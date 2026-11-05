# Performances du moteur et du relais de synchronisation

Ce document décrit les bancs d'essai de `@pouxis/core` et le test de charge du relais
`@pouxis/sync-server` : ce qu'ils mesurent, les budgets visés, les résultats avant et après
optimisation, et la façon de les relancer.

## Machine de référence

Mesures du 5 novembre 2026, dans un conteneur Linux partagé :

| Élément | Valeur                                                  |
| ------- | ------------------------------------------------------- |
| CPU     | Intel Xeon @ 2,80 GHz, 4 cœurs virtuels                 |
| Mémoire | 16 Gio                                                  |
| Système | Linux 6.18 (x64)                                        |
| Node.js | 22.22.0 (exécution directe du `.ts` par type stripping) |

**Bruit de mesure.** La machine était partagée avec d'autres processus (charge moyenne de 3 à
6 sur 4 cœurs). Des scénarios dont le code n'a pas changé ont varié jusqu'à ±40 % d'une série à
l'autre ; seuls les écarts nettement supérieurs (×2 et plus) sont donc interprétés comme des
gains. Les chiffres « avant » et « après » ont été mesurés en alternance, groupe par groupe,
dans la même fenêtre de temps, pour limiter ce biais. La médiane est la valeur de référence : elle
est peu sensible aux pauses du ramasse-miettes et aux recompilations du JIT.

## Budgets

Un budget est la médiane à ne pas dépasser sur la machine de référence. Les budgets
interactifs s'appuient sur le modèle RAIL de Google (réponse perçue comme immédiate sous
100 ms, traitement d'un événement en moins de 50 ms) :

| Domaine                       | Budget                                                | Justification                                      |
| ----------------------------- | ----------------------------------------------------- | -------------------------------------------------- |
| Routage d'une semaine         | `scheduler.route` < 50 ms (100 événements, 60 tâches) | recalcul à chaque modification du planning         |
| Routage d'un mois             | < 250 ms (500 événements, 200 tâches)                 | replanification complète, déclenchée explicitement |
| Recherche à la frappe         | < 50 ms par requête sur 50 000 documents              | une requête par touche                             |
| Mise à jour de l'index        | < 1 ms par document                                   | indexation au fil de l'édition                     |
| Capture en langage naturel    | `nlp.parse` < 0,1 ms par ligne (100 ms pour 1 000)    | analyse à chaque frappe dans la barre de capture   |
| Graphe de dépendances         | < 40 ms (tri topologique, 10 000 tâches)              | vue Aujourd'hui et liens de dépendance             |
| Pas de mise en page du graphe | < 25 ms pour 5 000 nœuds                              | animation de la mise en page, un pas par image     |
| Fusion CRDT                   | < 1,5 s pour appliquer 100 000 opérations distantes   | première synchronisation d'un nouvel appareil      |
| Récurrence                    | < 60 ms pour 10 ans d'occurrences quotidiennes        | cas extrême : une vue n'expanse qu'un mois         |

Chaque scénario porte son budget dans `packages/core/bench/scenarios.ts` ;
`--check-budgets` fait échouer le lanceur quand une médiane le dépasse.

## Scénarios

Toutes les données sont générées de façon déterministe (PRNG à graine fixe) dans
`packages/core/bench/fixtures.ts` :

- **tâches** : 10 000 et 100 000 tâches formant un graphe acyclique (1,5 dépendance en moyenne,
  vers l'une des 200 tâches précédentes), statuts, priorités, étiquettes et créneaux variés ;
- **planificateur** : une semaine (100 événements, 60 tâches) et un mois (500 événements, 200
  puis 1 000 tâches) avec profil d'énergie, découpage et plafond quotidien ;
- **récurrence** : 10 ans d'occurrences (quotidienne, lundi-mercredi-vendredi, 3ᵉ mardi du
  mois, toutes les heures de 9 h à 17 h en semaine) dans le fuseau `Europe/Paris` ;
- **NLP** : 1 000 lignes de capture françaises et anglaises réalistes ;
- **recherche** : 50 000 documents au vocabulaire de 20 000 mots distribué selon une loi de
  Zipf (quelques mots très fréquents, une longue traîne de mots rares) ;
- **graphe** : 5 000 nœuds, un arbre couvrant plus 2 500 arêtes aléatoires ;
- **synchronisation** : 100 000 opérations (20 000 enregistrements × 5 champs) par réplique,
  fusion de deux répliques concurrentes, encodage des lots, horloges hybrides (HLC) ;
- **insights** : un an d'activité (2 920 tâches, environ 5 800 sessions de concentration,
  1 095 événements, 365 entrées de journal).

## Résultats du moteur

Durées en millisecondes (médiane, sauf mention contraire).

### Scénarios optimisés

| Scénario                                                  |  Avant |  Après | Après (p95) |  Gain |
| --------------------------------------------------------- | -----: | -----: | ----------: | ----: |
| `tasks.topoOrder` 10k                                     |   19,7 |    9,5 |        16,8 |  ×2,1 |
| `tasks.detectCycles` 10k                                  |   28,2 |    8,8 |        20,1 |  ×3,2 |
| `tasks.topoOrder` 100k                                    |    677 |    173 |         295 |  ×3,9 |
| `tasks.detectCycles` 100k                                 |    780 |    187 |         254 |  ×4,2 |
| `tasks.actionable` 100k                                   |    182 |    144 |         225 |  ×1,3 |
| `recurrence.occurrences` quotidienne × 10 ans             |    145 |   45,0 |        65,0 |  ×3,2 |
| `recurrence.occurrences` toutes les heures × 10 ans       |    757 |   63,8 |        99,9 | ×11,9 |
| `search` construction de l'index, 50k documents           | 14 328 | 11 079 |      14 267 |  ×1,3 |
| `search` requête 1 terme fréquent, 50k documents          |    253 |   16,9 |        46,3 | ×15,0 |
| `search` requête 3 termes, 50k documents                  |    581 |   29,5 |        45,5 | ×19,7 |
| `search` requête préfixe « conc » (frappe), 50k documents |    294 |   19,7 |        33,3 | ×14,9 |
| `insights.activeDays` + `streak`, 1 an                    |    194 |   31,0 |        56,1 |  ×6,3 |

La construction de l'index a varié de 7,6 à 11,1 s selon la charge de la machine (contre 12,6 à
20 s avant). La mémoire occupée par un index de 50 000 documents est passée de **612 Mio à
241 Mio** (tas mesuré après `gc()`, copies des documents comprises).

### Autres scénarios (code inchangé)

| Scénario                                                 |   Médiane |   p95 |   Budget |
| -------------------------------------------------------- | --------: | ----: | -------: |
| `tasks.actionable` 10k                                   |       6,3 |  17,3 |       15 |
| `tasks.unlockedBy` 10k / 100k                            |  3,6 / 94 |     — | 15 / 150 |
| `tasks.wouldCreateCycle` (pire cas) 10k / 100k           |  6,9 / 67 |     — | 30 / 300 |
| `tasks.decay` (toutes les tâches) 10k / 100k             |  1,5 / 50 |     — | 10 / 100 |
| `tasks.wipStatus` 10k / 100k                             | 0,5 / 8,0 |     — | 10 / 100 |
| `scheduler.route` semaine (100 événements, 60 tâches)    |       1,6 |  13,4 |       50 |
| `scheduler.route` mois (500 événements, 200 tâches)      |      11,2 |  32,0 |      250 |
| `scheduler.route` mois (500 événements, 1 000 tâches)    |      10,2 |  21,5 |    1 000 |
| `scheduler.magnetize` journée (200 tâches flottantes)    |       3,1 |   9,7 |       20 |
| `recurrence.occurrences` lun-mer-ven × 10 ans            |      34,6 |  66,1 |       60 |
| `recurrence.occurrences` 3ᵉ mardi × 10 ans               |       4,5 |  13,4 |       10 |
| `recurrence.parseRule` × 1 000                           |      23,8 |  57,4 |       50 |
| `nlp.parse` × 1 000 lignes                               |      69,7 |   195 |      100 |
| `search.update` d'un document (index de 50k)             |     0,057 | 0,105 |        1 |
| `graph.layout` 5 000 nœuds, 300 itérations               |     6 398 | 8 053 |    8 000 |
| `graph.layout` un pas, 5 000 nœuds                       |      21,3 |  68,4 |       25 |
| `graph.QuadTree` requête de fenêtre (5 000 nœuds)        |     0,042 | 0,075 |        1 |
| `sync` écriture de 100 000 opérations locales            |       347 |   488 |    1 500 |
| `sync` application de 100 000 opérations distantes       |       275 |   396 |    1 500 |
| `sync` fusion de 2 × 100 000 opérations concurrentes     |       524 |   730 |    3 000 |
| `sync` `opsSince` (delta de 100 000 opérations)          |      77,6 |   173 |      500 |
| `sync` `encodeBatch` + `decodeBatch`, 100 000 opérations |       265 |   492 |    1 500 |
| `sync` HLC `tick` × 100 000                              |      69,7 |  93,5 |      100 |
| `sync` HLC `receive` × 100 000                           |      93,7 |   147 |      200 |
| `insights.energyHeatmap`, 52 semaines                    |      80,0 |   122 |      150 |
| `insights.balance`, 1 an                                 |      31,7 |  55,3 |      150 |
| `insights.weeklyReview`, 1 an d'historique               |       1,5 |   3,6 |      100 |
| `insights.skillTree` + `deadEnds` + `archiveCandidates`  |       2,5 |   4,6 |       50 |

## Points chauds et optimisations

Les profils ont été relevés avec `node --cpu-prof` sur les scénarios concernés.

1. **Recherche lexicale** (`search/lexical.ts`, `search/text.ts`). Avant : un `Map` par terme
   (document → fréquences), un `Map` de scores et un `Set` de termes par document candidat, puis
   un tri complet de tous les candidats ; un terme fréquent touche tout l'index. Après :
   - chaque document reçoit un identifiant entier dense ; les listes de postings sont des
     tableaux typés plats (identifiants et fréquences), retirés en O(1) par permutation ;
   - les scores s'accumulent dans des `Float64Array` indexés par document ;
   - seuls les `limit` meilleurs résultats sont gardés grâce à un tas borné (O(n log k) au lieu
     d'un tri complet) ; les termes correspondants ne sont recalculés que pour eux ;
   - l'analyse des mots (pliage Unicode NFD + racinisation) est mémoïsée, la fréquence des mots
     suivant une loi de Zipf ; le cache est borné à 50 000 entrées.

   Le classement est strictement identique : `lexical.equivalence.test.ts` compare résultat
   par résultat (scores compris) l'index optimisé à l'implémentation d'origine, conservée comme
   référence de test, sur des séquences aléatoires d'ajouts, de mises à jour et de suppressions.

2. **Récurrence** (`recurrence/expand.ts`, `recurrence/offsets.ts`). Plus des deux tiers du temps étaient passés
   dans `Intl.DateTimeFormat#formatToParts`, appelé trois fois par occurrence pour connaître le
   décalage UTC. Les décalages sont désormais échantillonnés une fois par jour UTC pendant une
   expansion ; le calcul exact n'est refait que les jours où les deux échantillons diffèrent
   (changement d'heure). Cela repose sur l'hypothèse que faisait déjà le moteur (au plus un
   changement de décalage en 48 heures) ; `offsets.test.ts` vérifie l'égalité avec `tzOffset`
   toutes les 17 minutes sur une année dans huit fuseaux, dont des fuseaux à décalage de 30 ou
   45 minutes.

3. **Graphe de dépendances** (`tasks/dependencies.ts`). Le tri topologique et Tarjan
   utilisaient plusieurs `Map` indexées par identifiant et un `Set` par tâche. Ils travaillent
   maintenant sur des indices entiers (graphe en lignes compressées, états en `Uint8Array` et
   `Int32Array`, piles itératives préallouées). `actionable` et `unlockedBy` ne construisent
   plus de `Set` par tâche. `dependencies.equivalence.test.ts` compare les résultats à
   l'implémentation d'origine sur 40 graphes aléatoires avec cycles, boucles, doublons et
   identifiants orphelins, et vérifie une chaîne de 100 000 tâches.

4. **Séries de jours actifs** (`insights/streak.ts`, `insights/internal.ts`). Chaque session de
   concentration coûtait jusqu'à sept appels `Intl` (`dayKey` + `endOfDay`). Une table des jours
   locaux, calculée une fois par jour avec les fonctions de `time.ts` puis retrouvée par
   inclusion d'intervalle, donne des résultats identiques (`internal.test.ts`).

Essayé sans gain mesurable, donc abandonné : sortir les champs privés de la boucle chaude de
Barnes-Hut (`graph/force.ts`). La mise en page de force est déjà sur tableaux typés ; un pas
de 5 000 nœuds reste autour de 20 ms.

## Test de charge du relais

`apps/sync-server/bench/load.ts` démarre le serveur dans le même processus sur un port
aléatoire, connecte 200 clients WebSocket répartis sur 20 espaces (10 appareils par espace),
puis chaque client pousse 50 lots de 5 enveloppes de 512 octets en attendant chaque accusé de
réception (boucle fermée). Les limites de débit par connexion sont relevées pour mesurer le
relais et non le limiteur. Le test vérifie ensuite l'absence de perte : chaque client a reçu
chaque enveloppe de ses pairs exactement une fois, sans écho des siennes, et un client neuf qui
rejoue chaque espace depuis `since: null` obtient le journal complet, sans doublon et avec des
numéros de séquence contigus.

| Mesure                                               |   Stockage mémoire | Stockage fichier (`fsync` toutes les 100 ms) |
| ---------------------------------------------------- | -----------------: | -------------------------------------------: |
| Connexion + `hello` des 200 clients                  |             391 ms |                                       393 ms |
| Enveloppes stockées                                  |             50 000 |                                       50 000 |
| Enveloppes distribuées aux pairs                     |            450 000 |                                      450 000 |
| Débit d'écriture                                     |       7 347 env./s |                                 4 746 env./s |
| Pushs acquittés par seconde                          |              1 469 |                                          949 |
| Latence push → ack p50 / p95 / p99                   | 115 / 237 / 306 ms |                           189 / 343 / 488 ms |
| Latence push → réception par un pair p50 / p95 / p99 | 115 / 236 / 306 ms |                           189 / 343 / 488 ms |
| RSS avant / pic                                      |       98 / 320 Mio |                                 97 / 247 Mio |
| Tas JS avant / pic                                   |       13 / 125 Mio |                                 13 / 116 Mio |
| Pertes, doublons, trous de séquence                  |              **0** |                                        **0** |

Lecture : avec 200 boucles fermées simultanées, la latence est dictée par le débit (loi de
Little : 200 / 1 469 pushs par seconde ≈ 136 ms), pas par un traitement lent d'un message isolé.
Clients et serveur partagent le même processus et les mêmes cœurs : ces chiffres sont un
minorant de la capacité du relais seul. Le profil montre que l'essentiel du temps est passé dans
les écritures réseau (`writev`) ; la sérialisation des messages `ops` représente environ 6 %.

## Relancer les mesures

```sh
# Moteur : lanceur Node (référence), sans vitest
npm run bench -w @pouxis/core
npm run bench -w @pouxis/core -- --group search            # un seul groupe
npm run bench -w @pouxis/core -- --filter "route week"     # filtre sur le nom
npm run bench -w @pouxis/core -- --json avant.json         # enregistrer
npm run bench -w @pouxis/core -- --compare avant.json      # comparer à une mesure antérieure
npm run bench -w @pouxis/core -- --quick --check-budgets   # contrôle rapide des budgets

# Moteur : mêmes scénarios via `vitest bench` (statistiques tinybench détaillées)
npm run bench:vitest -w @pouxis/core

# Relais : test de charge
npm run bench -w @pouxis/sync-server
npm run bench -w @pouxis/sync-server -- --clients 400 --spaces 40 --rounds 100
npm run bench -w @pouxis/sync-server -- --storage file --json charge.json
```

Le lanceur Node est la mesure de référence : sous `vitest bench`, chaque accès à un export
passe par le chargeur de modules de vitest, ce qui ajoute un surcoût mesurable sur les
micro-scénarios.

Pour mesurer l'effet d'une modification, enregistrer d'abord une base (`--json avant.json`) sur
le code d'origine, puis lancer `--compare avant.json` sur le code modifié, dans la même fenêtre
de temps et sur la même machine.

## Intégration continue

Le workflow [`bench.yml`](../../.github/workflows/bench.yml) s'exécute chaque nuit (02:17 UTC)
et à la demande. Il lance les bancs du moteur, le test de charge en stockage mémoire puis
fichier, et publie les résultats JSON et Markdown en artefact (`bench-results-<n>`, conservé
90 jours) ainsi que dans le résumé du run. Un dépassement de budget produit un avertissement
sans faire échouer le run, les exécuteurs partagés de GitHub étant trop bruyants pour un seuil
strict.

## Pistes suivantes

- Recherche : l'indexation reste dominée par les `Map` indexées par chaîne (termes et formes de
  surface) ; internaliser les termes en entiers par index ramènerait la construction de
  50 000 documents sous quelques secondes.
- `time.ts` : `zonedParts` s'appuie sur `formatToParts`, l'appel le plus coûteux du moteur
  (environ 9 µs) ; une version plus rapide profiterait à tous les modules (planificateur,
  récurrence, insights).
- Relais : sérialiser une seule fois le lot d'enveloppes diffusé à tous les pairs d'un espace,
  au lieu d'une fois par connexion.
