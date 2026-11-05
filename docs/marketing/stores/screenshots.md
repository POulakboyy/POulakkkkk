# Plan des captures d'écran et légendes

Chaque série raconte la même histoire en huit à neuf temps : **voir sa journée → la remplir sans
effort → la garder vivante → avancer → penser → comprendre → rester maître de ses données**. Les
deux premières captures portent l'essentiel : elles sont souvent les seules visibles dans les
résultats de recherche sans ouvrir la fiche.

Règles communes (sources dans `LIMITS.md`) :

- Légendes de **3 à 5 mots**, orientées bénéfice, sans point final, sans appel à l'action, sans
  prix ni classement ; texte ≤ 20 % de l'image sur Google Play.
- L'interface réelle du build soumis, avec du contenu réaliste et cohérent d'une capture à
  l'autre (même semaine fictive, mêmes projets) ; jamais d'état vide, d'écran de démarrage ni de
  maquette retouchée (App Review 2.3.3 ; Play).
- Pas de main, pas de cadre d'appareil sur Google Play ; barre d'état propre (batterie et réseau
  pleins, sans notification).
- Pas de logo ni de nom d'une autre plateforme dans les captures Apple (2.3.10).
- Même ordre et même contenu en français et en anglais ; seule la langue change. Prévoir
  ~30 % de longueur en plus pour certaines langues futures : la mise en page doit tolérer des
  légendes sur deux lignes.
- Texte alternatif Google Play : reprendre la légende puis décrire l'écran (« Vue Aujourd'hui :
  trois tâches planifiées entre deux réunions »).
- Légendes dans la police de marque, sur fond issu des tokens `--color-*` ; contraste texte/fond
  ≥ 4,5:1 (WCAG 2.2 AA).

Formats à produire : voir `video-specs.md` pour la vidéo et `LIMITS.md` pour les dimensions.
Pour l'iPhone, livrer la taille exigée par App Store Connect pour « iPhone with Dynamic Island »
au moment de la soumission (les tailles acceptées évoluent avec les appareils) ; pour l'iPad,
2064 × 2752 px ; pour le Mac, 2880 × 1800 px (16:10) ; pour Android, 1080 × 1920 px minimum
(9:16) ; pour Windows, 3840 × 2160 px (accepté jusqu'à 4K, minimum 1366 × 768).

## iPhone (série « ios-phone », 9 captures)

| #   | Écran à montrer                                                                                                                 |
| --- | ------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Vue Aujourd'hui : chronologie de la journée, tâches et événements, barre de progression.                                        |
| 2   | Capture rapide : saisie « Réunion projet mardi 14 h-16 h » et aperçu de l'événement reconnu.                                    |
| 3   | Propagation d'un retard : une tâche prolongée, les suivantes décalées, un rendez-vous fixe intact.                              |
| 4   | Mode Focus : une seule tâche en grande typographie, minuteur Pomodoro en cours.                                                 |
| 5   | Boîte de réception d'idées remplie par la capture rapide.                                                                       |
| 6   | Toile : carte mentale mise en page automatiquement.                                                                             |
| 7   | Bilan : carte de chaleur des heures productives.                                                                                |
| 8   | Réglages de confidentialité : stockage local, aucune connexion requise.                                                         |
| 9   | Synchronisation : appareils appairés, mention « chiffré de bout en bout » (si la synchronisation est livrée, voir le registre). |

<!-- field: captions.ios-phone@fr -->

```text
Votre journée, d’un seul regard
Écrivez, POuxis planifie
Votre planning se réajuste seul
Une tâche à la fois
Vos idées, notées en secondes
Pensez sur une toile infinie
Découvrez votre propre rythme
Vos données restent chez vous
Synchronisé, chiffré, privé
```

<!-- field: captions.ios-phone@en -->

```text
Your day at a glance
Type it, POuxis plans it
Delays reschedule themselves
One task at a time
Ideas saved in seconds
Think on an endless canvas
Discover your own rhythm
Your data stays yours
Synced and end-to-end encrypted
```

## iPad (série « ipad », 8 captures)

La largeur sert la Toile et la vue semaine ; mettre en avant le clavier et le Pencil seulement
si la prise en charge du stylet est livrée.

| #   | Écran à montrer                                                     |
| --- | ------------------------------------------------------------------- |
| 1   | Aujourd'hui et calendrier de la semaine côte à côte.                |
| 2   | Capture rapide en langage naturel au-dessus de la vue semaine.      |
| 3   | Toile infinie : organigramme d'un projet, mise en page automatique. |
| 4   | Tableau Kanban généré depuis une liste.                             |
| 5   | Mode Focus plein écran.                                             |
| 6   | Moteur de sérendipité : deux notes rapprochées.                     |
| 7   | Bilan : équilibre organisation/production.                          |
| 8   | Confidentialité : local-first, export complet.                      |

<!-- field: captions.ipad@fr -->

```text
Toute votre semaine, en clair
Une phrase devient un événement
Vos projets, sur une toile
Vos listes deviennent un tableau
Plein écran sur l’essentiel
Des idées qui se rencontrent
Organiser moins, produire plus
Vos données, sur votre iPad
```

<!-- field: captions.ipad@en -->

```text
Your whole week, clearly
One sentence becomes an event
Your projects on one canvas
Lists turn into boards
Full screen on what matters
Ideas that meet by chance
Organize less, make more
Your data, on your iPad
```

## Android — téléphone (série « android-phone », 8 captures)

Google Play affiche au plus 8 captures par type d'appareil : la capture « synchronisation » est
fusionnée avec la confidentialité.

| #   | Écran à montrer                                                     |
| --- | ------------------------------------------------------------------- |
| 1   | Vue Aujourd'hui.                                                    |
| 2   | Capture rapide en langage naturel.                                  |
| 3   | Propagation d'un retard.                                            |
| 4   | Mode Focus avec minuteur.                                           |
| 5   | Partage vers POuxis depuis le menu de partage d'Android (si livré). |
| 6   | Toile : carte mentale.                                              |
| 7   | Bilan : heures productives.                                         |
| 8   | Confidentialité et synchronisation chiffrée.                        |

<!-- field: captions.android-phone@fr -->

```text
Votre journée, d’un seul regard
Écrivez, POuxis planifie
Votre planning se réajuste seul
Une tâche à la fois
Partagez, c’est déjà rangé
Pensez sur une toile infinie
Découvrez votre propre rythme
Privé et chiffré, par défaut
```

<!-- field: captions.android-phone@en -->

```text
Your day at a glance
Type it, POuxis plans it
Delays reschedule themselves
One task at a time
Share it, it's filed
Think on an endless canvas
Discover your own rhythm
Private and encrypted by default
```

## Mac (série « mac », 8 captures)

| #   | Écran à montrer                                                                                  |
| --- | ------------------------------------------------------------------------------------------------ |
| 1   | Fenêtre complète : Aujourd'hui + barre latérale.                                                 |
| 2   | Capture universelle au-dessus d'une autre fenêtre (bureau neutre, sans app tierce identifiable). |
| 3   | Palette de commandes ouverte.                                                                    |
| 4   | Vue semaine avec temps de transition entre réunions.                                             |
| 5   | Alerte de protection d'un long bloc de travail.                                                  |
| 6   | Toile infinie, grand organigramme.                                                               |
| 7   | Mode Focus plein écran.                                                                          |
| 8   | Bilan hebdomadaire.                                                                              |

<!-- field: captions.mac@fr -->

```text
Votre journée, d’un seul regard
Capturez depuis n’importe quelle app
Toute l’app au clavier
Des pauses entre vos réunions
Vos heures profondes, protégées
Pensez en grand, sans limite
Une seule tâche, plein écran
Chaque semaine, votre bilan
```

<!-- field: captions.mac@en -->

```text
Your day at a glance
Capture from any app
The whole app, keyboard-first
Breathing room between meetings
Your deep work, protected
Think big, without edges
One task, full screen
Your week, in review
```

## Windows (série « windows », 8 captures)

Légendes reprises dans le champ `ms.screenshotCaptions` des fiches Microsoft Store (format plus
long autorisé, 200 caractères). La série courte ci-dessous sert aux visuels.

<!-- field: captions.windows@fr -->

```text
Votre journée, d’un seul regard
Capturez depuis n’importe quelle application
Une phrase, un événement
Votre planning se réajuste seul
Une seule tâche, plein écran
Pensez sur une toile infinie
Découvrez votre propre rythme
Vos données, sur votre PC
```

<!-- field: captions.windows@en -->

```text
Your day at a glance
Capture from any app
One sentence, one event
Delays reschedule themselves
One task, full screen
Think on an endless canvas
Discover your own rhythm
Your data, on your PC
```

## Linux (série « linux », 8 captures, facultative)

Flathub préfère des captures de fenêtre seule, sans texte ajouté : ces légendes servent aux
visuels du site ou de Snapcraft ; les légendes AppStream sont dans `listings/flathub.md`.

<!-- field: captions.linux@fr -->

```text
Votre journée, d’un seul regard
Capturez au clavier, partout
Une phrase, un événement
Votre planning se réajuste seul
Une seule tâche, plein écran
Pensez sur une toile infinie
Découvrez votre propre rythme
Vos données restent chez vous
```

<!-- field: captions.linux@en -->

```text
Your day at a glance
Capture by keyboard, anywhere
One sentence, one event
Delays reschedule themselves
One task, full screen
Think on an endless canvas
Discover your own rhythm
Your data stays yours
```
