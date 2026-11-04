# `pouxis` — POuxis en ligne de commande

Le client terminal de POuxis (fonctions 3.15 et 6.11) : capturer une tâche en langage naturel,
lister, planifier sa journée en frise horaire, rechercher, exporter et importer ses données —
sans quitter le terminal, sans compte et sans réseau. Le CLI s’appuie sur le même moteur que
l’application (`@pouxis/core` : `nlp`, `scheduler`, `search`, `tasks`).

## Démarrage rapide

Prérequis : Node.js ≥ 22.18 (le `.ts` est exécuté directement, sans compilation).

```sh
npm install                                   # à la racine du dépôt, une fois
alias pouxis="node $PWD/apps/cli/src/bin.ts"  # ou : npm link -w @pouxis/cli

pouxis add "Réunion projet X mardi prochain 14h-16h avec @paul"
pouxis add "Écrire l’article !! 2h vendredi #blog"
pouxis ls
pouxis plan
```

`pouxis plan` affiche la journée en frise horaire :

```text
Plan du jeudi 8 octobre 2026 · Europe/Paris

09:00 │    ◂ maintenant
09:30 │
10:00 │ ## Point équipe 10:00–11:00
10:30 │ ##
11:00 │ == Écrire le rapport 11:00–12:30
11:30 │ ==
12:00 │ ==
…
Légende : ## événement  == tâche  ~~ tampon  !! chevauchement
```

## Commandes

| Commande                                                        | Rôle                                                                                                              |
| --------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `add <texte…> [--inbox] [--dry-run]`                            | crée une tâche ou un événement à partir d’une phrase (date, heure, durée, `#étiquette`, `!priorité`, `@personne`) |
| `ls [--today] [--tag t] [--status s] [--all] [--events]`        | liste les tâches ouvertes (ou les événements à venir)                                                             |
| `done <id…>`                                                    | termine des tâches et signale celles qui se débloquent                                                            |
| `edit <id> [--title …] [--due …] …`                             | modifie une tâche ou un événement                                                                                 |
| `rm <id…>`                                                      | supprime et nettoie les références (dépendances, liens, nœuds de graphe)                                          |
| `plan [--date d] [--save] [--step 15\|30\|60]`                  | planifie une journée (`scheduler.route` puis `magnetize`) et l’affiche                                            |
| `search <requête…> [--limit n]`                                 | recherche plein texte (BM25F, français/anglais) dans toutes les collections                                       |
| `export [--zip f.zip \| --dir dossier] [--force]`               | exporte toutes les données                                                                                        |
| `import <f.zip\|dossier> [--replace] [--dry-run]`               | importe un export (fusion par défaut)                                                                             |
| `config get [clé] \| set <clé> <valeur> \| unset <clé> \| path` | lit ou modifie les préférences                                                                                    |
| `help [commande]`, `--version`                                  | aide et version                                                                                                   |

Chaque commande a son aide détaillée et des exemples : `pouxis help <commande>`.
Alias courants : `list`, `find`, `delete`, `backup`, `restore`, `conf`.

**Identifiants.** `ls` affiche le début de chaque identifiant ; un préfixe suffit tant qu’il
est unique (`pouxis done 3f2a`). En cas d’ambiguïté, le CLI liste les correspondances.

**Dates des options** (`--due`, `--day`, `--date`, `--start`, `--end`) : `2026-10-14`,
`"2026-10-14 15:00"`, `aujourd’hui`/`today`, `demain`, `+3j`, `+2s`, `vendredi`, `14:30`, et
`none` pour effacer. Durées : `45`, `45m`, `1h30`. Priorités : `0`–`3` ou `basse`/`moyenne`/`haute`.

**Préférences** (`pouxis config`) : `timeZone`, `locale`, `workingHours.start`,
`workingHours.end`, `workingHours.days` (`1,2,3`, `lun,mar`, `mon-fri`), `bufferMin`,
`makerBlockMin`, `wipLimit`, `decayThreshold`. Au premier lancement, le fuseau est celui de la
machine ; il est ensuite enregistré explicitement et toutes les dates sont calculées dans ce
fuseau IANA.

## Pour les scripts

- `--json` sur toutes les commandes : sortie JSON stable, sans couleur.
  Exemple : `pouxis ls --json | jq -r '.[] | select(.priority == 3) | .title'`.
- Codes de sortie : `0` succès, `1` erreur d’exécution (identifiant introuvable, données
  illisibles, verrou occupé…), `2` mauvaise utilisation (commande ou option inconnue, valeur
  invalide). Les erreurs vont sur la sortie d’erreur, avec une suggestion (« Vouliez-vous
  dire… ») et la commande d’aide utile.
- Couleurs uniquement sur un terminal interactif ; jamais si `NO_COLOR` est définie
  (<https://no-color.org>), avec `TERM=dumb` ou `--no-color`. `--color` les force (sauf
  `NO_COLOR`).
- Langue : français par défaut ; anglais avec `--lang en` ou une locale `en_*` (`LC_ALL`,
  `LC_MESSAGES`, `LANG`).

| Variable       | Effet                                                                      |
| -------------- | -------------------------------------------------------------------------- |
| `POUXIS_HOME`  | dossier des données (défaut : `~/.pouxis`) ; `--home` prime                |
| `POUXIS_NOW`   | date courante simulée (ISO 8601 ou millisecondes) pour rejouer une journée |
| `NO_COLOR`     | désactive les couleurs                                                     |
| `POUXIS_DEBUG` | affiche la trace complète d’une erreur inattendue                          |

## Données locales

Tout est dans `$POUXIS_HOME/data.json` : les collections du modèle (`tasks`, `events`,
`notes`, `journal`, `graphs`) et les préférences, avec une version de schéma et un compteur de
révision. Les fichiers sont créés en mode `0600` (dossier `0700`).

- **Écritures atomiques** : fichier temporaire voisin, `fsync`, puis `rename` ; un lecteur voit
  toujours une version complète, jamais un fichier tronqué.
- **Concurrence** : chaque écriture prend un verrou inter-processus (`data.json.lock`, création
  exclusive), relit la dernière version, applique la modification, puis vérifie la révision
  avant d’écrire (contrôle optimiste contre un programme qui ignorerait le verrou). Un verrou
  laissé par un processus disparu est levé automatiquement.
- **Copie de secours** : la version précédente est conservée dans `data.json.bak`.
- Un fichier écrit par une version plus récente de POuxis est refusé sans être modifié.

## Export et import

`pouxis export` produit, sans dépendance externe, une archive ZIP standard (ou un dossier) :

```text
manifest.json      format « pouxis-export », version du schéma, nombre d’éléments, liste des fichiers
prefs.json         préférences
tasks.json  events.json  notes.json  journal.json  graphs.json   un tableau JSON par collection
notes/*.md         chaque note en Markdown avec en-tête YAML (id, titre, dates, étiquettes)
README.md          description du contenu
```

Les horodatages sont en millisecondes UTC. Les notes d’un coffre chiffré ne sont pas copiées en
Markdown (leur contenu est chiffré). L’archive utilise la méthode STORE, des noms UTF-8 et un
CRC-32 par fichier ; elle s’ouvre avec `unzip`, le Finder, l’Explorateur Windows ou 7-Zip.

`pouxis import` lit un tel export (ZIP, y compris recompressé par un autre outil, ou dossier).
Par défaut il **fusionne** : les éléments inconnus sont ajoutés, les éléments connus remplacés
seulement si la copie importée est plus récente (`updatedAt`). `--replace` remplace toutes les
données, préférences comprises. `--dry-run` montre le bilan sans rien écrire. Les fichiers
Markdown sont ignorés à l’import : les fichiers JSON font foi.

## Limites connues

- Les événements récurrents sont enregistrés avec leur règle (`recurrence`) mais `ls` et `plan`
  n’affichent que leur première occurrence.
- Les archives ZIP64 (> 4 Gio ou > 65 535 fichiers), chiffrées ou multi-volumes ne sont pas
  prises en charge à l’import.

## Développement

```sh
cd apps/cli
npx vitest run        # tests unitaires + tests de bout en bout (lance src/bin.ts)
npx tsc --noEmit -p . # vérification des types
```

Organisation : `src/main.ts` (aiguillage, erreurs, codes de sortie), `src/commands/` (une
commande par fichier), `src/store/` (fichier de données, verrou, écriture atomique),
`src/zip/` (lecture/écriture ZIP), `src/archive/` (format d’export, fusion), `src/plan/` (frise
horaire), `src/i18n/` (messages `fr` canonique, `en` miroir). `run(argv, runtime)` ne dépend pas
de `process` : les tests peuvent exécuter le programme entier en mémoire.
