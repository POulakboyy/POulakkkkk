# Proto-personas — POuxis

> **Statut : HYPOTHÈSES, non validées (v0.1, 2026-10-08).**
> Ces proto-personas (Gothelf, _Lean UX_, 2013) ont été construits à partir du brief, de la
> composition **supposée** de l'audience de K13 Studios et de connaissances générales du domaine.
> **Aucune donnée utilisateur POuxis n'a encore été collectée.** Ils servent à cadrer le
> recrutement et les questions de recherche, pas à justifier des décisions. Chaque affirmation est à
> lire comme « nous supposons que… ».
> Plan de validation : § 8 et [`USER_RESEARCH.md`](./USER_RESEARCH.md).

Conventions : les identifiants `m.n` renvoient aux fonctionnalités du [brief](../BRIEF.md) (module
m, fonctionnalité n). `R1`–`R7` renvoient aux risques produit de
[`USER_RESEARCH.md`](./USER_RESEARCH.md#2-risques-produit-et-questions-de-recherche). Les prénoms sont
fictifs.

## Sommaire

1. [Vue d'ensemble](#1-vue-densemble)
2. [PP1 — Inès, créatrice de contenu solo](#pp1--inès-créatrice-de-contenu-solo)
3. [PP2 — Malik, designer freelance](#pp2--malik-designer-freelance)
4. [PP3 — Sam, développeur·se indépendant·e](#pp3--sam-développeurse-indépendante)
5. [PP4 — Léa, étudiante avec un TDAH](#pp4--léa-étudiante-avec-un-tdah)
6. [PP5 — Studio Lumen, petite équipe créative](#pp5--studio-lumen-petite-équipe-créative)
7. [Matrice personas × fonctionnalités et « top 10 » hypothétique](#7-matrice-personas--fonctionnalités-et-top-10-hypothétique)
8. [Anti-personas](#8-anti-personas)
9. [Profils à surveiller](#9-profils-à-surveiller)
10. [Plan de validation](#10-plan-de-validation)

---

## 1. Vue d'ensemble

| ID    | Proto-persona                       | Job principal (hypothèse)                                         | Appareils (hypothèse)                 | Confiance a priori | Priorité MVP (hypothèse) |
| ----- | ----------------------------------- | ----------------------------------------------------------------- | ------------------------------------- | ------------------ | ------------------------ |
| `PP1` | Inès, créatrice de contenu solo     | Ne perdre aucune idée et publier à l'heure sans nuits blanches    | iPhone, MacBook, iPad                 | Moyenne            | Haute                    |
| `PP2` | Malik, designer freelance           | Protéger le temps de création et facturer le temps réel           | PC Windows, Android, tablette graphique | Moyenne          | Haute                    |
| `PP3` | Sam, développeur·se indé            | Capturer sans quitter le clavier et garder la maîtrise des données | Linux, Mac (mission), Android        | Moyenne            | Moyenne                  |
| `PP4` | Léa, étudiante avec un TDAH         | Voir le temps qui reste, démarrer, et ne pas abandonner l'outil   | Android milieu de gamme, PC Windows   | Faible             | Haute                    |
| `PP5` | Studio Lumen, 4 personnes           | Coordonner charge, retours clients et confidentialité             | Mac et Windows mêlés, iPhone et Android | Faible           | Basse (MVP solo)         |

« Confiance a priori » : notre degré de certitude que ce segment existe dans l'audience atteignable
et a bien ce besoin. Elle est faible pour `PP4` parce que nous ne voulons pas projeter une
expérience que nous ne vivons pas, et pour `PP5` parce que l'adoption d'équipe obéit à d'autres
logiques.

**Hypothèse transversale à tester.** Les segments utiles pour concevoir POuxis sont peut-être
**comportementaux** (rapport au temps, besoin de contrôle, tolérance à l'automatisation) plutôt que
professionnels. Si la phase 1 le confirme, ces cinq profils seront remplacés par des segments
comportementaux (§ 10).

---

## PP1 — Inès, créatrice de contenu solo

> « J'ai trois idées de vidéo par jour et je n'en retrouve aucune le lundi matin. »
> _(citation imaginée pour incarner l'hypothèse ; ce n'est pas un verbatim)_

### Profil et contexte (hypothèse)

- 26–32 ans, vidéaste sur YouTube (vulgarisation, technologie ou lifestyle) : une vidéo longue par
  semaine et des formats courts. Revenus mixtes : publicité, partenariats, montage pour d'autres.
- Travaille chez elle, tourne parfois en extérieur. Semaine type : idées et script le lundi,
  tournage le mardi, montage le mercredi et le jeudi, publication et réseaux le vendredi.
- Imprévus fréquents : échéance d'un partenaire avancée, tournage reporté, montage plus long que
  prévu.

### Appareils et outils actuels (hypothèse)

| Appareil       | Usage                                       |
| -------------- | ------------------------------------------- |
| iPhone         | Capture d'idées, tournage, réseaux          |
| MacBook Pro    | Script, montage, planning éditorial         |
| iPad           | Storyboard, lecture                         |

Outils : Notion (calendrier éditorial), Apple Notes (idées), Google Agenda (partenaires), messages
envoyés à soi-même. Variante probable chez les créateur·ices débutant·es : Android et PC Windows.

### Jobs to be done (job stories)

- **Principal** — Quand une idée de vidéo me vient loin de mon bureau, je veux la capturer en
  quelques secondes, afin de la retrouver le jour où j'écris sans craindre de l'avoir perdue.
- Quand je prépare ma semaine de production, je veux que le montage (que je sous-estime toujours)
  soit réparti de façon réaliste autour de mes contraintes fixes, afin de publier à l'heure sans
  nuits blanches.
- Quand je suis à court d'angle, je veux que mes anciennes idées me soient reproposées sous un jour
  nouveau, afin de relancer ma créativité.
- **Émotionnel** : me sentir créatrice plutôt que gestionnaire. **Social** : tenir mes engagements
  envers les marques.

### Douleurs (hypothèse)

- Idées dispersées dans quatre applications ; certaines perdues.
- Durée du montage systématiquement sous-estimée.
- Culpabilité quand le planning casse ; irrégularité de publication.
- Temps passé à « organiser » plutôt qu'à créer.

### Forces du progrès (hypothèse)

| Poussée (ce qui ne va plus)                | Attraction (ce qui séduit)                              | Anxiété (ce qui fait hésiter)                         | Habitude (ce qui retient)                     |
| ------------------------------------------ | ------------------------------------------------------- | ----------------------------------------------------- | --------------------------------------------- |
| Échéances ratées, idées perdues            | Une seule app de la capture au planning ; esthétique soignée | Migrer depuis Notion ; fiabilité de la synchronisation | Notion configuré, modèles achetés          |

### Critères de succès (de son point de vue)

- « Je publie à la date prévue 3 semaines sur 4, sans nuit blanche. »
- « Je retrouve une idée en moins de 10 secondes. »
- « Je passe moins de temps à organiser qu'avant. » Indicateur possible : ratio
  création / organisation (7.2).

### Fonctionnalités qui comptent (hypothèse, classées)

| Rang | ID   | Fonctionnalité                        | Pourquoi (hypothèse)                                         |
| ---- | ---- | ------------------------------------- | ------------------------------------------------------------ |
| 1    | 2.7  | Parser vocal avec auto-catégorisation | Capture en marchant ou en tournage                           |
| 2    | 5.14 | Brain dump ultra-rapide               | Vider sa tête sans choisir où ranger                         |
| 3    | 1.8  | Analyseur de langage naturel          | « Montage épisode 12 jeudi 4 h » sans formulaire             |
| 4    | 1.1  | Routage dynamique des tâches          | Répartir le montage autour des contraintes                   |
| 5    | 1.2  | Propagation des retards               | Le planning survit au tournage qui déborde                   |
| 6    | 5.1  | Moteur de sérendipité                 | Nouveaux angles à partir d'idées anciennes                   |
| 7    | 7.9  | Bilan hebdomadaire                    | Voir ses victoires, pas seulement ses retards                |
| 8    | 2.6  | Pomodoro par tâche                    | Mesurer le temps réel de montage pour mieux estimer          |
| 9    | 7.2  | Équilibre création / organisation     | Vérifier qu'elle crée plus qu'elle n'organise                |
| 10   | 5.2  | Moodboard paramétrique                | Direction visuelle des miniatures et des décors              |

**Fonctionnalités à risque pour ce profil** : 2.15 (limiteur de charge) bloquant les jours de
publication chargés ; 7.3 (séries) si le rythme de publication est irrégulier par nature.

### Hypothèses à valider

| ID       | Hypothèse                                                                          | Risque | Méthode                    |
| -------- | ---------------------------------------------------------------------------------- | ------ | -------------------------- |
| PP1-H1   | La sous-estimation du montage est la première cause de dérapage du planning        | R3     | Entretiens, journal        |
| PP1-H2   | En mobilité, elle préfère dicter plutôt que taper                                  | R3, R7 | Journal (J2), test F1      |
| PP1-H3   | L'esthétique de l'application pèse autant que les fonctions dans l'adoption        | R2     | Tests de concept           |
| PP1-H4   | La confidentialité est un faible moteur d'adoption pour ce profil                  | R5     | Entretiens « switch », MaxDiff |

---

## PP2 — Malik, designer freelance

> « Mes journées sont découpées en morceaux de 40 minutes par les appels clients. »
> _(citation imaginée)_

### Profil et contexte (hypothèse)

- 30–40 ans, designer graphique et UI en freelance, 3 à 5 clients en parallèle, facturation au temps
  ou au forfait. Travaille entre un espace de coworking et chez lui.
- Les réunions et appels morcellent ses journées ; il finit souvent les maquettes le soir.

### Appareils et outils actuels (hypothèse)

| Appareil                   | Usage                                       |
| -------------------------- | ------------------------------------------- |
| PC Windows fixe            | Création (suite graphique, Figma)           |
| Smartphone Android         | Appels, messages clients, agenda            |
| Tablette graphique ou iPad | Esquisses                                   |

Outils : Google Agenda, un tableau Trello ou Notion par client, un outil de suivi du temps, des
moodboards en ligne, beaucoup de mails. Combinaison Windows + Android : précisément celle que les
outils centrés sur l'écosystème Apple servent mal (`R7`).

### Jobs to be done (job stories)

- **Principal** — Quand je jongle entre plusieurs clients, je veux protéger de longs blocs de travail
  profond tout en casant les réunions, afin de ne plus finir mes maquettes le soir.
- Quand je termine une mission, je veux savoir combien de temps j'y ai réellement passé, afin de
  facturer juste et de mieux chiffrer les devis suivants.
- Quand je démarre un projet, je veux rassembler références et palette rapidement, afin de converger
  vite avec le client.
- **Social** : paraître fiable et professionnel auprès des clients.

### Douleurs (hypothèse)

- Morcellement par les réunions ; aucun bloc de plus de 2 heures certains jours.
- Temps non suivi, donc non facturé.
- Retours clients dispersés (mails, messageries, commentaires).
- Abonnements cumulés pour des outils qui se recoupent.

### Forces du progrès (hypothèse)

| Poussée                                   | Attraction                                                       | Anxiété                                                  | Habitude                                   |
| ----------------------------------------- | ---------------------------------------------------------------- | -------------------------------------------------------- | ------------------------------------------ |
| Sous-facturation, soirées de travail      | Suivi du temps intégré à la tâche ; protection du temps de création | Perdre des données clients ; confidentialité (accords de confidentialité) | Outil de suivi du temps et agenda en place |

### Critères de succès (de son point de vue)

- « J'ai au moins deux blocs de 3 heures protégés par semaine. »
- « Je connais l'écart entre estimé et réel pour chaque projet. »
- « Mes devis sont plus justes. »

### Fonctionnalités qui comptent (hypothèse, classées)

| Rang | ID   | Fonctionnalité                          | Pourquoi (hypothèse)                                     |
| ---- | ---- | --------------------------------------- | -------------------------------------------------------- |
| 1    | 1.15 | Protection de la « maker schedule »     | Alerte quand une réunion casse un bloc de travail profond |
| 2    | 2.6  | Pomodoro par tâche (temps enregistré)   | Temps réel par client, base de facturation              |
| 3    | 2.8  | Champs de métadonnées programmables     | `Temps passé * Taux horaire`                             |
| 4    | 1.6  | Buffers entre réunions                  | Respirer entre deux appels                               |
| 5    | 1.1  | Routage dynamique des tâches            | Caser les tâches autour des réunions                     |
| 6    | 5.2  | Moodboard paramétrique                  | Palette extraite des références                          |
| 7    | 3.10 | Partage granulaire par lien             | Envoyer une maquette au client avec commentaires         |
| 8    | 3.7  | Aperçus natifs universels               | Voir SVG et fichiers sans ouvrir la suite graphique      |
| 9    | 5.9  | Banques d'assets intégrées              | Typographies et icônes sans quitter l'outil              |
| 10   | 3.5  | Vaults chiffrés                         | Documents clients sous accord de confidentialité        |

**Fonctionnalité à risque pour ce profil** : 2.3 (usure des tâches). Une tâche qui attend le retour
d'un client se « dégraderait » alors que le retard ne dépend pas de lui. Hypothèse : il faut un état
« en attente de quelqu'un ».

### Hypothèses à valider

| ID       | Hypothèse                                                                              | Risque | Méthode                         |
| -------- | -------------------------------------------------------------------------------------- | ------ | ------------------------------- |
| PP2-H1   | Le suivi du temps par tâche est un moteur d'adoption plus fort que le routage automatique | R1, R2 | Concept, MaxDiff              |
| PP2-H2   | La combinaison Windows + Android est fréquente dans ce segment et mal servie           | R7     | Screener, enquête               |
| PP2-H3   | Les tâches bloquées par un client faussent l'usure (2.3) et la rendent injuste         | R4     | Entretiens, test F4             |

---

## PP3 — Sam, développeur·se indépendant·e

> « Si je dois lâcher le clavier pour noter une tâche, je ne la note pas. »
> _(citation imaginée)_

### Profil et contexte (hypothèse)

- 28–38 ans, iel, développeur·se full-stack. Alterne une mission freelance (3 jours par semaine) et un
  produit personnel (petit logiciel en ligne ou jeu indépendant) le soir et le week-end.
- Vit dans le terminal et l'éditeur de code ; méfiant·e envers les services en ligne fermés.

### Appareils et outils actuels (hypothèse)

| Appareil                     | Usage                                      |
| ---------------------------- | ------------------------------------------ |
| PC Linux (personnel)         | Projet perso, terminal                     |
| Mac portable (mission)       | Travail client                             |
| Smartphone Android           | Capture rapide, notifications              |

Outils : notes Markdown locales (Obsidian ou équivalent), tickets GitHub, une application de tâches,
scripts maison. Utilise des raccourcis façon Vim partout où c'est possible.

### Jobs to be done (job stories)

- **Principal** — Quand je suis en plein code et qu'une tâche me traverse l'esprit, je veux la noter
  sans quitter le clavier ni mon terminal, afin de ne pas casser ma concentration.
- Quand je reprends mon projet perso le soir, je veux voir uniquement la prochaine action débloquée,
  afin de redémarrer sans recharger tout le contexte.
- Quand je choisis un outil, je veux être sûr·e de pouvoir partir avec mes données dans un format
  ouvert et d'automatiser ce que je veux, afin de ne jamais être captif·ve.

### Douleurs (hypothèse)

- Dispersion entre mission et projet perso ; le projet perso stagne faute d'échéance.
- Outils fermés, synchronisation payante, lenteur des applications web.
- Perte de contexte entre deux sessions espacées.
- Tendance à améliorer son système d'organisation plutôt qu'à avancer (voir anti-persona `A3`).

### Forces du progrès (hypothèse)

| Poussée                                       | Attraction                                          | Anxiété                                                        | Habitude                         |
| --------------------------------------------- | --------------------------------------------------- | -------------------------------------------------------------- | -------------------------------- |
| Enfermement propriétaire, prix des abonnements | Open source, local-first, CLI, API, extensions     | Maturité du projet ; perte de données en alpha ; conflits de synchronisation | Notes Markdown et scripts maison |

### Critères de succès (de son point de vue)

- « Je capture une tâche sans souris en moins de 3 secondes. »
- « Mon projet perso avance chaque semaine (au moins une session focus). »
- « L'export complet est lisible sans POuxis. »

### Fonctionnalités qui comptent (hypothèse, classées)

| Rang | ID   | Fonctionnalité                            | Pourquoi (hypothèse)                                  |
| ---- | ---- | ----------------------------------------- | ----------------------------------------------------- |
| 1    | 2.11 | Raccourci de capture universelle          | Capturer sans changer de fenêtre                      |
| 2    | 3.15 | Client CLI                                | Tâches depuis le terminal                             |
| 3    | 3.1  | Architecture local-first                  | Rapidité, hors-ligne, maîtrise des données            |
| 4    | 6.11 | Exportation standardisée                  | Condition pour essayer : pouvoir partir              |
| 5    | 2.1  | Graphe de dépendances                     | N'afficher que l'action débloquée                     |
| 6    | 7.8  | Remapping clavier absolu (compatible Vim) | Ergonomie clavier                                     |
| 7    | 3.5  | Vaults chiffrés                           | Secrets et documents sensibles                        |
| 8    | 2.9  | Récurrence en syntaxe cron ou littérale   | Règles complexes                                      |
| 9    | 6.2  | API publique GraphQL                      | Scripts et intégrations personnelles                  |
| 10   | 6.3  | Commandes extensibles (plugins)           | Adapter l'outil plutôt que le subir                   |

Non classé mais structurant : le serveur de synchronisation auto-hébergeable (`apps/sync-server`).

**Fonctionnalité à risque pour ce profil** : 1.1 (routage) s'il fonctionne comme une boîte noire.
Hypothèse : ce profil n'accepte l'automatisation que si les règles sont lisibles et modifiables.

### Hypothèses à valider

| ID       | Hypothèse                                                                                     | Risque | Méthode                          |
| -------- | --------------------------------------------------------------------------------------------- | ------ | -------------------------------- |
| PP3-H1   | Local-first, chiffrement et open source sont des critères éliminatoires pour ce profil        | R5     | Entretiens « switch », MaxDiff   |
| PP3-H2   | Le routage n'est accepté que s'il est inspectable (raison lisible, règles modifiables)        | R1     | Test F2, entretiens              |
| PP3-H3   | Ce profil, très présent sur GitHub et Reddit, sera surreprésenté si l'on ne fixe pas de quotas | —      | Suivi des quotas                 |

---

## PP4 — Léa, étudiante avec un TDAH

> « Je pense toujours que j'ai le temps, et d'un coup c'est la veille. »
> _(citation imaginée)_

> **Note de représentation.** Le TDAH est très hétérogène : ce profil ne représente pas « les
> personnes TDAH ». Il ne concerne pas que des étudiant·es. Il sera revu avec des personnes
> concernées (ateliers de co-conception, relecture associative) avant tout usage en conception.
> POuxis aide à s'organiser ; ce n'est ni un soin ni un dispositif médical.

### Profil et contexte (hypothèse)

- 19–24 ans, en licence ou master (par exemple arts appliqués, communication, sciences humaines).
  TDAH diagnostiqué à l'âge adulte ou auto-identifié. Emploi étudiant d'environ 12 heures par
  semaine.
- Décrit ce que les communautés TDAH appellent la « cécité temporelle » : difficulté à sentir le
  temps qui passe et à estimer les durées. Difficulté à démarrer les tâches floues ; hyperfocus qui
  fait rater le reste ; retards qui s'accumulent, puis honte, puis évitement de l'outil.
- Budget serré : le prix compte.

### Appareils et outils actuels (hypothèse)

| Appareil                         | Usage                                        |
| -------------------------------- | -------------------------------------------- |
| Smartphone Android milieu de gamme | Appareil central : rappels, alarmes, cours |
| PC portable Windows              | Devoirs, cours en ligne                      |

Outils : rappels et alarmes multiples du téléphone, agenda papier commencé puis abandonné plusieurs
fois, applications de tâches essayées puis délaissées après deux semaines (« cimetière d'apps »),
agenda de l'université.

### Jobs to be done (job stories)

- **Principal** — Quand j'ai une échéance dans 10 jours, je veux voir concrètement le temps qui reste
  et par où commencer, afin de ne pas tout faire la veille.
- Quand je dois démarrer une tâche floue (« mémoire »), je veux qu'elle soit découpée en une première
  étape minuscule, afin de franchir le cap du démarrage.
- Quand je suis en hyperfocus, je veux être prévenue doucement qu'il faut passer à autre chose, afin
  de ne pas rater mes cours ou mon travail.
- Quand j'ai « raté » ma journée, je veux pouvoir repartir sans voir un mur de rouge, afin de ne pas
  abandonner l'outil.

### Douleurs (hypothèse)

- Perception du temps ; démarrage ; surcharge visuelle.
- Culpabilité face aux retards ; abandon des outils trop complexes.
- Notifications ignorées ou au contraire anxiogènes.

### Forces du progrès (hypothèse)

| Poussée                               | Attraction                          | Anxiété                                         | Habitude                         |
| ------------------------------------- | ----------------------------------- | ----------------------------------------------- | -------------------------------- |
| Échéances ratées, stress, honte       | Visuel, doux, simple                | « Encore une app que je vais abandonner » ; coût | Alarmes du téléphone            |

### Critères de succès (de son point de vue)

- « Je commence mes devoirs avant la veille. »
- « J'utilise encore l'application au bout d'un mois. »
- « Je me sens moins coupable quand je regarde mon planning. » (auto-déclaration)

### Fonctionnalités qui comptent (hypothèse, classées)

| Rang | ID   | Fonctionnalité                           | Pourquoi (hypothèse)                                        |
| ---- | ---- | ---------------------------------------- | ----------------------------------------------------------- |
| 1    | 1.14 | Barre de progression temporelle absolue  | Rendre visible le temps qui passe                           |
| 2    | 2.2  | Décomposition IA en sous-tâches          | Une première étape minuscule pour démarrer                  |
| 3    | 2.14 | Mode « Focus unique »                    | Une seule chose à l'écran                                   |
| 4    | 1.10 | Tâches flottantes                        | Un jour sans heure imposée                                  |
| 5    | 1.11 | Mode Hyperfocus (Ne pas déranger)        | Protéger la concentration, avec une sortie douce            |
| 6    | 2.15 | Limiteur de charge (WIP limit)           | Moins de priorités, à condition d'être réglable             |
| 7    | 7.3  | Séries sans culpabilisation              | Motivation sans punition, avec « jokers »                   |
| 8    | 5.13 | Ambiance sonore générative               | S'isoler du bruit                                           |
| 9    | 5.14 | Brain dump ultra-rapide                  | Vider sa tête avant de se lancer                            |
| 10   | 7.4  | Interface zen (auto-fading)              | Moins de stimuli visuels                                    |

**Fonctionnalités à risque pour ce profil** : 2.3 (usure, glissement vers le rouge : risque de honte),
7.3 (séries mal conçues), 1.1 (routage : soulagement ou perte de contrôle selon les personnes),
volume de notifications. Voir `H4a`–`H4d`.

### Hypothèses à valider

| ID       | Hypothèse                                                                                    | Risque | Méthode                          |
| -------- | -------------------------------------------------------------------------------------------- | ------ | -------------------------------- |
| PP4-H1   | La représentation visuelle du temps aide à démarrer plus tôt                                 | R4     | Co-conception, journal (J8)      |
| PP4-H2   | L'usure rouge (2.3) et les séries (7.3) découragent une partie des personnes                 | R4     | Co-conception, test F4, journal (J10) |
| PP4-H3   | Le routage automatique soulage certaines personnes et en inquiète d'autres                   | R1, R4 | Test F2, journal (J3, J4)        |
| PP4-H4   | La version Android (milieu de gamme) est la condition d'accès principale à ce segment        | R7     | Screener, enquête                |

---

## PP5 — Studio Lumen, petite équipe créative

> « On paie cinq outils et on perd quand même les retours du client. »
> _(citation imaginée)_

### Profil et contexte (hypothèse)

- Studio de motion design de 4 personnes. Chloé (38 ans) dirige le studio et pilote les projets ;
  deux motion designers ; un monteur freelance à distance dans un autre fuseau horaire.
- Clients : marques et institutions ; projets de 2 à 8 semaines, souvent sous accord de
  confidentialité.

### Appareils et outils actuels (hypothèse)

| Personne             | Appareils                         |
| -------------------- | --------------------------------- |
| Chloé                | Mac, iPhone                       |
| Motion designers     | Mac et PC Windows                 |
| Monteur à distance   | PC Windows, Android               |

Outils : messagerie d'équipe, Notion, suite bureautique en ligne, Figma, un tableau de tâches, un
outil de validation vidéo.

### Jobs to be done (job stories)

- **Principal** — Quand je répartis la semaine du studio, je veux voir la charge de chacun et les
  jalons clients au même endroit, afin d'éviter les rushs et le travail du week-end.
- Quand un client fait un retour, je veux qu'il soit attaché à l'élément précis concerné, afin que
  personne ne travaille sur une version périmée.
- Quand on lance un projet, je veux réutiliser notre méthode de travail, afin de ne pas tout
  reconstruire.
- Quand on travaille sous accord de confidentialité, je veux garantir que les fichiers clients
  restent confidentiels, afin de garder la confiance des clients.

### Douleurs (hypothèse)

- Outils multiples et coût par siège ; retours clients éparpillés.
- Réunions de synchronisation longues ; visibilité faible sur la charge.
- Intégration laborieuse des freelances.

### Forces du progrès (hypothèse)

| Poussée                                  | Attraction                                  | Anxiété                                                                   | Habitude                                  |
| ---------------------------------------- | ------------------------------------------- | ------------------------------------------------------------------------- | ----------------------------------------- |
| Coût cumulé, chaos des versions          | Tout-en-un, rapidité, prix                  | Migration collective (coût de changement élevé) ; maturité de la collaboration | Messagerie et Notion très ancrés     |

### Critères de succès (de leur point de vue)

- « Moins d'outils payants. »
- « Réunion de synchronisation hebdomadaire de 30 minutes au plus. »
- « Aucun retour client perdu. »

### Fonctionnalités qui comptent (hypothèse, classées)

| Rang | ID   | Fonctionnalité                           | Pourquoi (hypothèse)                                   |
| ---- | ---- | ---------------------------------------- | ------------------------------------------------------ |
| 1    | 6.4  | Commentaires par blocs                   | Retour attaché à l'élément précis                      |
| 2    | 6.8  | Boîte de réception d'équipe unifiée      | Validations et mentions au même endroit                |
| 3    | 3.10 | Partage granulaire par lien              | Partage client avec expiration et mot de passe         |
| 4    | 1.5  | Gestion multi-fuseaux                    | Monteur à distance                                     |
| 5    | 3.5  | Vaults chiffrés                          | Fichiers sous accord de confidentialité               |
| 6    | 6.15 | Modèles d'espaces de travail             | Réutiliser la méthode du studio                        |
| 7    | 6.6  | Statuts vidéo asynchrones                | Éviter des réunions                                    |
| 8    | 4.14 | Multi-curseurs en temps réel             | Atelier sur la même toile                              |
| 9    | 2.13 | Délégation avec webhook                  | Prévenir un freelance externe                          |
| 10   | 6.10 | Sondages et votes pondérés               | Choisir une piste créative ensemble                    |

**Remarque de priorité.** Les flux du MVP sont solo. La collaboration combinée au chiffrement de bout
en bout est coûteuse à construire. Ce profil est donc de priorité basse pour le MVP, mais important
pour la feuille de route et le modèle économique (facturation par équipe). En recherche : 2 équipes
en phase de découverte ; pas de test du MVP en équipe, mais des membres individuels peuvent être
inclus.

### Hypothèses à valider

| ID       | Hypothèse                                                                                           | Risque | Méthode                   |
| -------- | --------------------------------------------------------------------------------------------------- | ------ | ------------------------- |
| PP5-H1   | L'adoption d'équipe est collective et lente ; un outil entre par une personne qui l'utilise seule   | R2     | Entretiens « switch »     |
| PP5-H2   | La collaboration en temps réel est un prérequis (Kano « obligatoire ») pour envisager POuxis        | R2     | Kano                      |
| PP5-H3   | Le chiffrement de bout en bout est un argument commercial face aux clients                          | R5     | Entretiens, MaxDiff       |

---

## 7. Matrice personas × fonctionnalités et « top 10 » hypothétique

Lecture : 3 = central pour ce profil, 2 = utile, 1 = secondaire, – = peu pertinent, **R** =
fonctionnalité à risque (peut nuire si mal conçue). **Tout est hypothèse** ; la matrice sert à
construire les stimuli de la phase 2 et la présélection des ~30 candidates.

| ID   | Fonctionnalité                       | PP1 | PP2 | PP3 | PP4 | PP5 | Flux MVP |
| ---- | ------------------------------------ | --- | --- | --- | --- | --- | -------- |
| 1.8  | Langage naturel                      | 3   | 2   | 2   | 2   | 1   | F1       |
| 2.11 | Capture universelle                  | 2   | 2   | 3   | 1   | 1   | F1       |
| 5.14 | Brain dump                           | 3   | 1   | 2   | 2   | –   | F1       |
| 2.7  | Parser vocal                         | 3   | 1   | –   | 2   | –   | F1       |
| 1.1  | Routage dynamique                    | 3   | 2   | R   | R   | 2   | F2       |
| 1.2  | Propagation des retards              | 3   | 2   | 1   | 2   | 2   | F2       |
| 1.10 | Tâches flottantes                    | 2   | 2   | 1   | 3   | 1   | F2       |
| 1.15 | Protection maker schedule            | 1   | 3   | 2   | 1   | 2   | F2       |
| 2.15 | Limiteur de charge                   | R   | 1   | 1   | 2/R | 1   | F2       |
| 2.6  | Pomodoro par tâche                   | 2   | 3   | 2   | 2   | 1   | F3       |
| 2.14 | Focus unique                         | 2   | 2   | 2   | 3   | 1   | F3       |
| 1.11 | Hyperfocus (Ne pas déranger)         | 2   | 2   | 2   | 3   | 1   | F3       |
| 5.13 | Ambiance sonore                      | 1   | 1   | 1   | 2   | –   | F3       |
| 7.9  | Bilan hebdomadaire                   | 3   | 2   | 2   | 2   | 2   | F4       |
| 1.9  | Snapshot prévu / réalisé             | 2   | 2   | 1   | 1   | 2   | F4       |
| 2.3  | Usure des tâches                     | 1   | R   | 1   | R   | 1   | F4       |
| 7.3  | Séries sans culpabilisation          | R   | 1   | 1   | 2/R | –   | F4       |
| 5.1  | Sérendipité                          | 3   | 2   | 1   | 1   | 1   | F5       |
| 1.14 | Barre de progression temporelle      | 1   | 1   | 1   | 3   | 1   | —        |
| 2.2  | Décomposition IA                     | 1   | 1   | 1   | 3   | 1   | —        |
| 3.1  | Local-first                          | 1   | 2   | 3   | 1   | 2   | Socle    |
| 3.5  | Vaults chiffrés                      | 1   | 2   | 2   | –   | 3   | —        |
| 6.11 | Export standardisé                   | 1   | 1   | 3   | –   | 2   | —        |
| 3.15 | Client CLI                           | –   | –   | 3   | –   | –   | —        |
| 6.4  | Commentaires par blocs               | –   | 2   | –   | –   | 3   | —        |

**« Top 10 » hypothétique (noyau commun, à valider en phase 2).** Retenu parce que ces fonctions
reviennent chez au moins trois profils et composent la boucle capture → plan → focus → revue (`R3`) :

1. `1.8` Langage naturel
2. `2.11` Capture universelle
3. `5.14` Brain dump
4. `1.1` Routage dynamique (à risque pour `PP3` et `PP4` : conditionné à `R1`)
5. `1.2` Propagation des retards
6. `1.10` Tâches flottantes
7. `2.6` Pomodoro par tâche
8. `2.14` Focus unique
9. `7.9` Bilan hebdomadaire
10. `5.1` Sérendipité (différenciation créative, conditionnée à `R6`)

Candidates suivantes : `1.14`, `2.2`, `3.1` (socle technique plus que fonction visible), `1.15`,
`1.11`. Ce classement est une **hypothèse de départ**. La règle de sélection définitive est celle de
la phase 2b de [`USER_RESEARCH.md`](./USER_RESEARCH.md#phase-2--tests-de-concept-des-7-modules-et-priorisation-s6s10).

---

## 8. Anti-personas

Les anti-personas décrivent pour qui nous ne concevons **pas** maintenant. Ces personnes peuvent
utiliser POuxis ; leurs demandes ne pilotent simplement pas les choix par défaut.

| ID   | Anti-persona                                                   | Pourquoi pas maintenant                                                                                         | Risque si l'on conçoit pour elle                                     | Ce qui nous ferait changer d'avis                                |
| ---- | -------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- | ---------------------------------------------------------------- |
| `A1` | DSI d'une entreprise réglementée (SSO, piste d'audit, conformité : 6.14, 6.5) | Cycle d'achat long, exigences de conformité lourdes, éloigné de l'audience atteignable | La feuille de route serait capturée par des exigences d'entreprise | Demande récurrente et financée, après adéquation produit-marché solo |
| `A2` | Chef·fe de projet d'une équipe de plus de 15 personnes cherchant un remplaçant d'outil de gestion de projet (Gantt, ressources, reporting) | Besoins de pilotage et de reporting hors de la boucle personnelle | Interface alourdie, perte de la simplicité « flow » | Croissance forte du segment `PP5` vers des équipes plus grandes |
| `A3` | « Collectionneur·se de systèmes » : son but principal est de configurer son système d'organisation plutôt que de produire | Très présent dans les communautés productivité, surreprésenté dans les retours | Configurabilité infinie au détriment de l'expérience par défaut ; contradiction avec 7.2 | Preuve que la configurabilité avancée améliore la rétention des autres profils |
| `A4` | Personne cherchant un soin ou un accompagnement thérapeutique du TDAH | POuxis n'est pas un dispositif médical (au sens du règlement (UE) 2017/745) et ne doit faire aucune allégation de soin | Promesses trompeuses, responsabilité, déception de personnes vulnérables | Aucun changement prévu ; on oriente vers des professionnel·les |

---

## 9. Profils à surveiller

Signaux faibles possibles, à noter s'ils apparaissent en phase 1 :

- **Chercheur·ses et doctorant·es** : recherche sémantique (3.2), OCR (3.4), canvas et graphes
  (module 4).
- **Musicien·nes et producteur·ices** : métadonnées audio (3.13), mémos vocaux (2.7, 5.7).
- **Enseignant·es** : récurrences complexes (2.9), planification de séquences.
- **Utilisateur·ices de tablettes à encre électronique** : thème E-Ink (7.10), stylet (4.6).

---

## 10. Plan de validation

| Étape                     | Ce qui change                                                                                                                                                         |
| ------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Avant la phase 1          | Les proto-personas servent uniquement aux quotas et au screener.                                                                                                      |
| Après la phase 1          | Chaque proto-persona reçoit un statut : **confirmé**, **modifié**, **fusionné** ou **abandonné**, avec les `INS-###` qui le justifient. Les citations imaginées sont remplacées par de vrais verbatims anonymisés (avec consentement C5 ou C6). |
| Après les phases 2 et 4   | Les colonnes « Fonctionnalités qui comptent » sont remplacées par les résultats MaxDiff et Kano par segment, puis par l'usage observé dans le journal.                 |
| En continu                | Si les segments comportementaux expliquent mieux les données que les métiers (§ 1), les personas sont reconstruits sur ces segments.                                  |

Critère de validation d'un persona : au moins 3 participant·es de la phase 1 partagent son job
principal **et** au moins 2 de ses douleurs principales, sans contre-preuve majeure. Sinon, le
persona est modifié ou abandonné.
