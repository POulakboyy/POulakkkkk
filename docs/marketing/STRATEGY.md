# Stratégie de mise sur le marché — POuxis

> **Statut : v1.0, 4 novembre 2026. Document de travail.**
> Sources : [`BRIEF.md`](../BRIEF.md) (vision), [`ROADMAP.md`](../product/ROADMAP.md) (phasage),
> [`MVP_SPEC.md`](../product/MVP_SPEC.md) (périmètre et vie privée),
> [`PERSONAS.md`](../research/PERSONAS.md) et [`USER_RESEARCH.md`](../research/USER_RESEARCH.md)
> (segments et validation), [`SCIENTIFIC_BASIS.md`](../research/SCIENTIFIC_BASIS.md) (preuves),
> [`stores/`](./stores/) (fiches, ASO, registre des affirmations).
> Support de présentation : [`pitch/POuxis-pitch.pptx`](./pitch/POuxis-pitch.pptx) (et
> [PDF](./pitch/POuxis-pitch.pdf)).

## Règles de ce document

1. **Aucun chiffre inventé.** Tout prix, tout effectif, toute taille de marché vient d'une page
   ouverte (URL et date d'accès en [§ 16](#16-sources)) ou porte la mention **hypothèse**. Ce
   document ne contient **aucune taille de marché** : nous n'en avons vérifié aucune, et une
   estimation descendante (« 1 % d'un marché de X milliards ») ne nous apprendrait rien d'utile.
2. **Aucune donnée utilisateur POuxis n'existe encore.** Les segments sont ceux des
   proto-personas, eux-mêmes des hypothèses. Les seuils chiffrés sont des **cibles provisoires**
   fixées par l'équipe.
3. **Une capacité n'est annoncée que si elle est livrée.** Toute promesse publique passe par le
   [registre des affirmations](./stores/claims-register.md). Le marketing ne parle jamais
   d'une fonction du brief comme si elle existait.
4. **Pas d'allégation médicale ni « scientifiquement prouvée ».** On peut dire qu'une fonction
   « s'inspire de travaux sur… » en citant la référence de `SCIENTIFIC_BASIS.md`, avec son niveau
   de confiance. Jamais « soigne », « traite », « prouvé », « recommandé pour le TDAH ».

## Sommaire

1. [Diagnostic en trois lignes](#1-diagnostic-en-trois-lignes)
2. [Positionnement](#2-positionnement)
3. [Paysage concurrentiel](#3-paysage-concurrentiel)
4. [Segments, ICP, jobs, déclencheurs, canaux](#4-segments-icp-jobs-déclencheurs-canaux)
5. [Modèle économique open source](#5-modèle-économique-open-source)
6. [Mise sur le marché portée par la communauté](#6-mise-sur-le-marché-portée-par-la-communauté)
7. [Séquence de lancement](#7-séquence-de-lancement)
8. [Piliers de contenu](#8-piliers-de-contenu)
9. [Partenariats](#9-partenariats)
10. [ASO : les bases](#10-aso--les-bases)
11. [Kit presse](#11-kit-presse)
12. [Métriques et mesure respectueuse de la vie privée](#12-métriques-et-mesure-respectueuse-de-la-vie-privée)
13. [Plan à 90 jours](#13-plan-à-90-jours)
14. [Risques et parades](#14-risques-et-parades)
15. [Ce qu'il ne faut pas faire](#15-ce-quil-ne-faut-pas-faire)
16. [Sources](#16-sources)

---

## 1. Diagnostic en trois lignes

- **Le terrain est saturé mais fragmenté.** Chaque concurrent étudié excelle sur une ou deux
  dimensions (notes locales, planification automatique, planificateur visuel, toile spatiale) ;
  aucun de ceux que nous avons vérifiés ne réunit à la fois _local-first_, code source ouvert,
  planification automatique du calendrier et outils d'idéation (voir § 3).
- **L'atout réel n'est pas le nombre de fonctionnalités, c'est la boucle** Capturer → Planifier →
  Se concentrer → Faire le bilan, hors ligne, sans compte, chiffrée de bout en bout. Vendre « 100
  fonctionnalités » serait vendre une promesse que l'équipe ne peut pas tenir à court terme.
- **Le risque principal est l'exécution**, pas la demande : périmètre immense, fondateur seul,
  attentes d'IA élevées. La stratégie ci-dessous réduit le périmètre annoncé, s'appuie sur
  l'audience existante du fondateur et fait de l'open source un levier de confiance et de
  contribution, pas seulement un argument.

## 2. Positionnement

### 2.1 Catégorie

Nous ne nous plaçons ni dans « gestion de notes » (Obsidian, Logseq, Anytype), ni dans
« calendrier IA » (Motion, Reclaim), ni dans « planificateur visuel » (Tiimo, Structured) : nous
perdrions la comparaison sur la profondeur de chacun.

**Catégorie proposée : « le carnet de bord du temps créatif ».** En pratique, un espace
_local-first_ qui relie le temps (calendrier), l'action (tâches) et les idées (notes, toile), avec
un plan de journée qui se recalcule. Formulation courte en anglais pour les communautés
internationales : _an open-source, local-first planner for makers_.

À tester (voir § 13) : « planificateur pour créatifs », « agenda local-first », « carnet de bord »
— la catégorie retenue sera celle que les personnes interrogées reformulent spontanément.

### 2.2 Phrase de positionnement

> **POuxis est le planificateur open source qui garde vos journées, vos tâches et vos idées sur
> votre appareil, et recompose votre plan quand la journée déraille.**

Variantes à tester (A/B sur la page d'accueil et les vignettes) :

| Variante | Angle               | Texte                                                                                  |
| -------- | ------------------- | -------------------------------------------------------------------------------------- |
| A        | Contrôle            | « Votre temps, vos idées, votre appareil. Un planificateur open source, sans compte. » |
| B        | Douleur (débordement) | « Une réunion déborde ? Votre journée se réorganise toute seule, sans toucher à vos rendez-vous. » |
| C        | Créativité          | « Protégez vos heures de création. Capturez tout le reste en deux secondes. »          |

### 2.3 Pitch d'ascenseur (30 secondes)

> Les créatifs indépendants jonglent entre un calendrier, une liste de tâches, une appli de notes
> et un tableau blanc. Aucun ne parle aux autres, et quand une réunion déborde, c'est à eux de
> tout replanifier à la main. POuxis réunit les trois dans une seule application qui fonctionne
> hors ligne, sans compte, avec une synchronisation chiffrée de bout en bout entre téléphone et
> ordinateur. Vous videz votre tête en une phrase, POuxis place vos tâches dans les créneaux
> libres, protège vos longs blocs de création, et décale la suite quand vous débordez. Le code
> est ouvert : vos données restent lisibles et exportables, toujours.

### 2.4 Différenciateurs ancrés dans le brief

| Différenciateur                          | Fonctions du brief          | Pourquoi c'est crédible                                                                 | Statut au 4 nov. 2026 (voir registre)                      |
| ---------------------------------------- | --------------------------- | --------------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| _Local-first_ réel, sans compte          | 3.1, 1.7, 3.11              | Architecture CRDT et relais auto-hébergeable (`apps/sync-server`)                       | En cours (moteur et relais), non vérifié en build          |
| Chiffrement de bout en bout du relais    | 1.7, 3.5                    | Le relais ne voit que des charges chiffrées (`MVP_SPEC.md` § 4.4)                       | En cours ; audit externe prévu avant 1.0                   |
| Plan qui se recalcule                    | 1.1, 1.2, 1.6, 1.10, 1.15   | Routage, propagation des retards, tampons, protection des blocs (`core/scheduler`)       | Moteur présent ; vues en cours                             |
| Capture en une phrase                    | 1.8, 5.14, 2.11             | Parseur bilingue fr/en, capture globale                                                 | En cours                                                   |
| Outils d'idéation intégrés               | 5.1, 5.4, 5.8               | Sérendipité, contraintes, bac à sable (`core/ideation`)                                 | En cours                                                   |
| Bilan honnête, sans culpabilisation      | 1.3, 7.2, 7.3, 7.9          | Séries avec joker, appuyées par [silverman2022streaks] et [lally2010habits]              | En cours                                                   |
| Open source AGPL-3.0, export complet     | 6.11                        | Fichier `LICENSE` (AGPL-3.0) présent dans le dépôt                                       | Licence présente ; export à livrer                         |
| Conception appuyée sur la littérature    | transversal                 | `SCIENTIFIC_BASIS.md` classe chaque fonction par niveau de confiance, y compris ce qui **ne** tient pas | Document publié ; aucune allégation marketing autorisée au-delà |

### 2.5 Faiblesses et risques, sans fard

| Faiblesse                          | Effet probable sur la mise sur le marché                                                                 | Réponse                                                                                       |
| ---------------------------------- | -------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| **Périmètre de 100 fonctionnalités** | Promesse impossible à tenir ; impression de « vaporware » si on la met en avant ; dispersion du produit | Communiquer sur la boucle (≈ 15 fonctions du MVP) ; la liste des 100 devient une feuille de route publique, votable |
| **Fondateur seul**                 | Lenteur, risque de bus factor, doute des utilisateurs sur la pérennité                                  | Open source + export complet = « vos données survivent au projet » ; gouvernance et contributions dès J0 |
| **Attentes d'IA**                  | Motion, Akiflow, Tiimo, Structured et Craft mettent l'IA en avant ; POuxis n'en a pas dans la 1.0          | Positionner l'absence d'IA distante comme un choix de confidentialité ; IA locale optionnelle en 2.0+ (ROADMAP) |
| **Pas de collaboration en 1.0**    | Exclut les équipes (`PP5`) et les usages « Notion d'équipe »                                            | Assumer le solo ; ouvrir une liste d'attente « équipes » pour mesurer la demande              |
| **Marques fortes en face**         | Notion, Todoist, TickTick ont des offres gratuites larges                                               | Ne pas se battre sur le prix : le cœur est gratuit et libre ; se battre sur le contrôle et la boucle |
| **Synchronisation = point de rupture** | Un bug de synchronisation détruit la confiance d'un produit _local-first_                           | Bêta fermée longue, tests de convergence, sauvegarde locale automatique avant chaque fusion  |
| **Biais d'audience**               | L'audience K13 Studios est bienveillante : signaux de demande gonflés                                   | Quotas hors audience déjà prévus dans `USER_RESEARCH.md` (≥ 40 %)                              |

## 3. Paysage concurrentiel

### 3.1 Tableau

Légende : ✅ oui, vérifié · ❌ non · ◐ partiel · **?** non vérifié. « Source » renvoie au § 16.
Prix en dollars US tels qu'affichés sur la page consultée le 4 novembre 2026 ; ils peuvent varier
selon le pays, la TVA et la date.

| Produit             | Segment                              | Modèle et prix vérifiés                                                                                                       | _Local-first_ | Code ouvert                                    | Planif. auto | Outils créatifs        | Plateformes                                         | Source |
| ------------------- | ------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------- | ------------- | ---------------------------------------------- | ------------ | ---------------------- | --------------------------------------------------- | ------ |
| **Notion**          | Espace de travail tout-en-un, équipes | Gratuit ; Plus 10 $ ; Business 20 $ par siège et par mois ; Enterprise sur devis                                              | ❌            | ❌                                             | ❌           | ◐ (pages, bases)       | **?** (non relevé sur la page tarifs)               | S1     |
| **Notion Calendar** | Calendrier lié à Notion              | Gratuit (sources secondaires)                                                                                                 | ❌            | ❌                                             | ❌           | ❌                     | Web, macOS, Windows, iOS ; Android d'après des sources secondaires | S2     |
| **Obsidian**        | Notes Markdown locales               | App gratuite, y compris usage commercial ; Sync 4 $/mois (annuel) ou 5 $ (mensuel) ; Publish 8–10 $/site/mois ; licence commerciale facultative 50 $/an ; Catalyst 25 $ une fois | ✅            | ❌ (application propriétaire ; à revérifier)     | ❌           | ◐ (Canvas, extensions) | **?**                                               | S3     |
| **Logseq**          | Notes en plan, graphe                | Gratuit ; offre de synchronisation non vérifiée                                                                               | ✅ (« privacy-first », thème `local-first`) | ✅ AGPL-3.0, 45,5 k étoiles GitHub | ❌           | ◐ (tableaux blancs)    | Bureau, web, mobile ; nouvelle version « DB » en bêta, app mobile et sync temps réel en alpha | S4     |
| **Anytype**         | Notes, objets, bases, chats chiffrés | Gratuit (100 Mo distants) ; Plus 4 $ ; Pro 8 $ ; Ultra 16 $ par mois                                                          | ✅ (« vos données restent sur votre appareil ») | ◐ « Any Source Available License 1.0 » pour les clients (source disponible, usage commercial soumis à accord) d'après une source secondaire | ❌ | ◐ | **?** | S5, S6 |
| **AFFiNE**          | Docs + tableau blanc                 | Gratuit ; Pro 6,75 $/mois ; Team 10 $/siège/mois ; « Believer » 499,99 $ à vie ; IA 8,9 $/mois (annuel) ; auto-hébergement gratuit | ✅ (« local-first by design ») | ◐ éditeur sous MIT, serveur « source-available » | ❌ | ✅ (tableau blanc) | **?** | S7 |
| **Heptabase**       | Cartes et toiles pour la recherche   | Pro 8,99 $ ; Premium 17,99 $ ; Premium+ 53,99 $ par mois ; essai non précisé                                                  | **?**         | ❌                                             | ❌           | ✅ (toile spatiale)    | **?**                                               | S8     |
| **Todoist**         | Gestion de tâches                    | Gratuit ; Pro 5 $/mois (annuel) ou 7 $ (mensuel) ; Business 8 $ (annuel) ou 10 $ (mensuel) par utilisateur                    | ❌            | ❌                                             | ❌           | ❌                     | **?**                                               | S9     |
| **Things**          | Tâches, écosystème Apple             | Achat unique : Mac 49,99 $ ; iPhone et Watch 9,99 $ ; iPad 19,99 $ ; Vision Pro 29,99 $                                       | **?**         | ❌                                             | ❌           | ❌                     | Mac, iPhone, iPad, Apple Watch, Vision Pro (Apple uniquement d'après la page) | S10    |
| **TickTick**        | Tâches, calendrier, habitudes        | Gratuit ; Premium 49,99 $/an                                                                                                  | ❌            | ❌                                             | ❌           | ❌                     | Multiplateforme (liste non détaillée sur la page)   | S11    |
| **Sunsama**         | Planification quotidienne guidée     | Pro 17 $/mois (annuel) ou 22 $ (mensuel) ; essai 14 jours ; Enterprise sur devis                                              | ❌            | ❌                                             | ◐ (rituel guidé) | ❌                 | **?**                                               | S12    |
| **Motion**          | Calendrier et projets pilotés par IA | Pro AI 19 $ ; Business AI 29 $ par siège et par mois ; essai gratuit                                                          | ❌            | ❌                                             | ✅ (IA)      | ❌                     | **?**                                               | S13    |
| **Reclaim.ai**      | Planification auto sur Google/Outlook | Lite gratuit ; Starter 8 $ (annuel) ou 10 $ ; Business 15 $ ou 18 $ ; Enterprise 22 $ (annuel) par siège                     | ❌            | ❌                                             | ✅           | ❌                     | Sur Google Calendar et Outlook                      | S14    |
| **Akiflow**         | Boîte de réception + time-blocking   | Pro 34 $/mois (mensuel) ou 16 $/mois (annuel, prix barré 19 $) ; essai 7 jours                                                | ❌            | ❌                                             | ◐            | ❌                     | Bureau et mobile                                    | S15    |
| **Amie**            | Calendrier + tâches, intégrations CRM | Pro 20 $ ; Business 40 $ par utilisateur et par mois (annuel) ; essai 7 jours                                                | ❌            | ❌                                             | **?**        | ❌                     | **?** (intègre calendriers Google et Apple)         | S16    |
| **Tiimo**           | Planificateur visuel, neurodivergence | Freemium (iOS et Android) ; Pro mensuel ou annuel, prix affichés au paiement seulement                                       | ❌            | ❌                                             | ◐ (planification par IA) | ❌         | iOS, Apple Watch, iPad, Android, Mac, web            | S17    |
| **Structured**      | Planificateur visuel en ligne du temps | Gratuit + Pro ; fiche App Store US : 6,49 $/mois, 19,99 $/an, 64,99 $ à vie (varie selon pays et date)                     | **?**         | ❌                                             | ◐ (IA, replanification des tâches manquées) | ❌ | iOS (fiche App Store) ; autres **?**       | S18    |
| **Craft**           | Documents soignés                    | Gratuit ; Plus 8 $/mois (6,4 $ en annuel) ; Family 12 $ ; Team 5 $/membre (min. 3) ; gratuit pour les étudiants              | **?**         | ❌                                             | ❌           | ◐                      | **?**                                               | S19    |
| **Capacities**      | Notes orientées objets               | Basic gratuit ; Pro 9,99 $/mois ; Believer dès 12,49 $/mois ; IA 8,33 $/mois (annuel)                                         | ◐ (« offline support ») | ❌                                     | ❌           | ◐                      | Web, Mac, Windows, Linux, iOS, Android              | S20    |
| **POuxis (cible 1.0)** | Créatifs et indépendants solo     | Cœur gratuit et libre ; synchronisation hébergée payante (hypothèse, § 5)                                                     | ✅ (conçu ainsi, à livrer) | ✅ AGPL-3.0                         | ✅ (algorithmique, sans IA) | ✅ (idéation, toile en 0.3) | Cibles : iOS, Android, macOS, Windows, Linux | —      |

Les « **?** » sont des trous de connaissance, pas des « non » : à compléter avant toute
comparaison publique. **Ne jamais publier ce tableau tel quel** : une comparaison publique doit
être revérifiée le jour même, datée et sourcée, et s'en tenir aux faits (règle de loyauté de la
publicité comparative).

### 3.2 Lecture

- **Le prix d'ancrage de la synchronisation est bas.** Obsidian Sync (4–5 $/mois) et Anytype Plus
  (4 $/mois) fixent ce que paie une personne pour synchroniser des notes locales. Un abonnement
  POuxis à 10 $/mois serait comparé à ces deux prix, pas à Motion.
- **La planification automatique est chère et propriétaire.** Motion (19–29 $), Sunsama (17–22 $),
  Akiflow (16–34 $), Amie (20–40 $) : ce segment accepte des prix élevés, mais vend du temps
  gagné à des professionnels, et repose sur des calendriers Google/Outlook dans le nuage.
- **Le planificateur visuel « doux » est mobile et grand public** (Tiimo, Structured) : prix bas,
  achat à vie fréquent, IA mise en avant.
- **Les outils spatiaux et de pensée** (Heptabase, AFFiNE, Capacities) parlent de recherche et
  d'apprentissage ; aucun ne planifie le temps.

### 3.3 Espace libre (« white space »)

Carte de positionnement sur deux axes : **contrôle des données** (nuage propriétaire → local et
ouvert) et **gestion du temps** (aucune → planification automatique).

```
                      Planification automatique
                                ▲
     Motion · Reclaim · Akiflow │
     Sunsama · Amie             │            ★ POuxis (cible)
     Structured · Tiimo (◐)     │
                                │
 Nuage propriétaire ◄───────────┼───────────► Local et ouvert
                                │
     Notion · Craft · Todoist   │   Obsidian · Logseq
     TickTick · Things          │   Anytype · AFFiNE
     Heptabase · Capacities     │
                                ▼
                       Pas de gestion du temps
```

Le quadrant supérieur droit est vide parmi les produits vérifiés. **Cela peut signifier une
opportunité ou un piège** : planifier exige des données de calendrier (souvent dans Google ou
Outlook), ce qui complique le _local-first_. Hypothèse à valider en priorité (`R5` dans
`USER_RESEARCH.md`) : le _local-first_ et le chiffrement sont-ils un **critère de choix** ou
seulement une **préférence** ? S'ils ne sont qu'une préférence, le positionnement doit basculer
vers la boucle et la créativité, et le _local-first_ devient une preuve de sérieux.

## 4. Segments, ICP, jobs, déclencheurs, canaux

### 4.1 Segments (alignés sur `PERSONAS.md`)

| Persona | Rôle dans la mise sur le marché              | Pourquoi                                                                                   | Priorité |
| ------- | -------------------------------------------- | ------------------------------------------------------------------------------------------ | -------- |
| `PP1` Inès, créatrice de contenu solo | **ICP de lancement**          | Le plus proche de l'audience K13 Studios ; douleur forte « idées perdues, publications en retard » | 1        |
| `PP2` Malik, designer freelance        | ICP de lancement (secondaire) | Protège son temps de création, multi-OS (Windows, Android) : là où Things n'existe pas     | 1        |
| `PP3` Sam, développeur·se indé         | **Premier cercle de contributeurs** | Sensible à l'open source, au CLI et à l'auto-hébergement ; lit Hacker News             | 2        |
| `PP4` Léa, étudiante avec un TDAH      | Segment à forte attente, à traiter avec prudence | Besoin réel probable mais confiance a priori faible ; risque d'allégation médicale | 3 (après recherche) |
| `PP5` Studio Lumen                      | Hors périmètre 1.0            | Pas de collaboration avant 2.0                                                             | Liste d'attente |

**Anti-cible explicite** : les équipes qui cherchent un remplaçant de Notion, et les personnes
qui veulent un assistant IA qui décide à leur place.

### 4.2 Profil de client idéal (ICP de lancement)

Indépendant·e ou créatif·ve solo, 20–40 ans (hypothèse), qui :

- travaille sur au moins deux appareils de systèmes différents (par ex. iPhone + PC Windows) ;
- utilise déjà deux à quatre outils pour le temps, les tâches et les notes ;
- a des blocs de création longs à protéger (montage, design, écriture, code) ;
- se soucie de la propriété de ses données ou a déjà subi une hausse de prix ou une fermeture de
  service ;
- découvre les outils par YouTube, Instagram, Reddit ou des créateurs qu'il ou elle suit.

### 4.3 Jobs-to-be-done (synthèse)

| Job principal                                                                                           | Persona    | Fonction POuxis           |
| ------------------------------------------------------------------------------------------------------- | ---------- | ------------------------- |
| Quand une idée me vient en marchant, je veux la noter en deux secondes pour ne pas la perdre.           | PP1, PP4   | 5.14, 1.8, 2.7 (plus tard) |
| Quand ma journée déraille, je veux que la suite se réorganise sans casser mes rendez-vous.             | PP1, PP2   | 1.2, 1.1                  |
| Quand j'ai un client à livrer, je veux protéger mes longs blocs de création contre les réunions.       | PP2        | 1.15, 1.6                 |
| Quand je travaille, je veux voir une seule chose et rien d'autre.                                       | PP4, PP1   | 2.14, 2.15                |
| Quand je choisis un outil, je veux être sûr·e de pouvoir partir avec mes données.                       | PP3, PP2   | 6.11, 3.1                 |
| Le dimanche soir, je veux voir ce que j'ai vraiment accompli, sans culpabiliser.                        | PP1, PP4   | 7.9, 7.3                  |

### 4.4 Déclencheurs de changement (moments où l'on cherche un nouvel outil)

- Hausse de prix ou passage d'une fonction en payant chez l'outil actuel.
- Changement de téléphone ou d'ordinateur (surtout passage iPhone ↔ Android, Mac ↔ Windows).
- Début de période : rentrée scolaire, janvier, début d'une activité indépendante.
- Surcharge visible : publication ratée, deadline client manquée.
- Inquiétude sur la vie privée (actualité, conditions d'utilisation modifiées, IA entraînée sur
  les contenus).

Ces déclencheurs guident le **calendrier éditorial** (§ 8) : rentrée et janvier sont les deux
fenêtres naturelles d'un lancement ou d'une campagne.

### 4.5 Canaux

| Canal                                         | Cible                 | Coût           | Délai     | Pourquoi / risque                                                                 | Priorité |
| --------------------------------------------- | --------------------- | -------------- | --------- | --------------------------------------------------------------------------------- | -------- |
| YouTube K13 Studios (devlogs, coulisses)      | PP1, PP2, PP4         | Temps          | Immédiat  | Audience existante ; risque de biais d'audience et de dépendance à un canal        | 1        |
| Instagram (formats courts, carrousels design) | PP1, PP2              | Temps          | Immédiat  | Esthétique du produit = argument ; risque : beaucoup de vues, peu d'installations  | 1        |
| GitHub (dépôt, issues, discussions)           | PP3                   | Temps          | Continu   | Crédibilité open source, contributions ; risque : charge de modération            | 1        |
| Discord communautaire                         | Tous                  | Temps          | J-8 sem.  | Boucle de retours rapide ; risque : chronophage, à cadrer (heures de présence)     | 2        |
| Show HN, Reddit, Indie Hackers, Product Hunt  | PP3, early adopters   | Temps          | Lancement | Pics de trafic ; risque : critique dure si le produit n'est pas prêt               | 2 (lancement) |
| Communautés tech francophones                 | PP3, PP2              | Temps          | Lancement | Langue native du fondateur et du produit ; audiences plus petites                  | 2        |
| Créateurs partenaires (vidéos d'outils)       | PP1, PP2              | Licences offertes, pas de paiement au départ | 1–3 mois | Effet de recommandation ; risque : perte de crédibilité si contenu sponsorisé non déclaré | 3 |
| Référencement naturel (site, guides)          | Tous                  | Temps          | 6 mois +  | Durable ; lent                                                                    | 3        |
| Publicité payante                             | —                     | Argent         | —         | **Non recommandée avant d'avoir mesuré la rétention** : on paierait pour remplir un seau percé | Exclu |

## 5. Modèle économique open source

### 5.1 Options évaluées

Notation qualitative (★ faible → ★★★ fort), fondée sur la structure du projet, pas sur des
données de marché.

| Modèle                                                         | Revenus récurrents | Cohérence avec les valeurs | Effort / coût         | Dépendance            | Verdict                       |
| -------------------------------------------------------------- | ------------------ | -------------------------- | --------------------- | --------------------- | ----------------------------- |
| **Synchronisation hébergée chiffrée (abonnement)**             | ★★★                | ★★★ (le relais ne voit rien ; l'auto-hébergement reste gratuit) | ★★ (exploitation, support, sécurité) | Faible | **Cœur du modèle**            |
| **Offre équipes** (partage chiffré, SSO, journal d'audit)      | ★★★                | ★★                         | ★★★ (multi-utilisateur chiffré complexe) | Moyenne | Plus tard (2.0+), liste d'attente dès 1.0 |
| **Parrainages** (GitHub Sponsors, Open Collective, dons)       | ★ (instable)       | ★★★                        | ★                     | Forte (audience)      | Complément dès J0             |
| **Statut « soutien »** (badge, icônes, thèmes, accès anticipé) | ★★                 | ★★ (si aucune fonction utile n'est bloquée) | ★          | Moyenne               | Complément, à tester          |
| **Place de marché de modèles** (commission)                     | ★                  | ★★                         | ★★★ (modération, paiements, droit) | Faible  | Repoussé : volume insuffisant au départ |
| **Support et installation de l'auto-hébergement** (entreprises) | ★★                 | ★★★                        | ★★ (temps du fondateur) | Forte (peu de clients) | Opportuniste, sur demande |
| **Subventions open source** (programmes publics ou fondations)  | Ponctuel           | ★★★                        | ★★ (dossiers)         | —                     | À explorer (éligibilité à vérifier) |
| Publicité, revente de données                                   | —                  | ❌ (contraire à `MVP_SPEC.md` § 4.4) | —           | —                     | **Exclu**                     |

### 5.2 Recommandation

1. **Tout ce qui tourne sur l'appareil reste gratuit et libre.** Aucune fonction locale n'est
   bridée. C'est la condition de crédibilité de l'AGPL et du discours « vos données vous
   appartiennent ».
2. **On paie le confort et le service** : le relais hébergé et chiffré de bout en bout,
   l'historique distant, l'espace pour les pièces jointes. Ceux qui savent auto-héberger le
   peuvent, gratuitement (`apps/sync-server`).
3. **Parrainages et statut « soutien » dès le premier jour**, pour financer avant la
   synchronisation payante.
4. **Équipes plus tard**, quand le partage multi-utilisateur chiffré aura été conçu et relu.

Points à trancher avec un conseil juridique (hors du champ de ce document) : maintien de l'AGPL
pour le relais, éventuelle politique de contribution (DCO ou CLA), marque déposée « POuxis »
pour éviter les copies trompeuses dans les stores.

### 5.3 Hypothèses de prix à tester

**Toutes les valeurs ci-dessous sont des hypothèses**, positionnées par rapport aux prix vérifiés
au § 3 (ancrage Obsidian Sync et Anytype Plus).

| Offre (hypothèse)             | Contenu                                                     | Prix à tester                          | Ancrage vérifié                       |
| ----------------------------- | ----------------------------------------------------------- | -------------------------------------- | ------------------------------------- |
| **Libre**                     | Toute l'app, auto-hébergement du relais                     | 0 €                                    | Obsidian (app gratuite), Logseq       |
| **Sync**                      | Relais hébergé E2EE, appareils illimités, quota de fichiers | 3 €, 4 € ou 5 €/mois ; 30–48 €/an       | Obsidian Sync 4–5 $, Anytype Plus 4 $ |
| **Soutien**                   | Sync + badge, thèmes, accès anticipé, vote prioritaire     | 8 €/mois ou achat « fondateur » à vie   | AFFiNE « Believer », Capacities Believer |
| **Équipe (2.0+)**             | Espaces partagés chiffrés, SSO, journal d'audit             | 6–10 €/siège/mois                      | AFFiNE Team 10 $, Craft Team 5 $      |
| **Étudiants**                 | Sync gratuite ou à moitié prix sur justificatif             | 0–2 €/mois                             | Craft gratuit pour étudiants          |

Arbitrage à tester : **prix unique « à vie » de lancement** (trésorerie immédiate, mais coût de
service perpétuel non couvert) contre **abonnement seul** (aligné avec le coût réel du relais).
Recommandation par défaut : une offre « fondateur » limitée en nombre et en durée, puis
abonnement uniquement.

### 5.4 Plan de test de prix (Van Westendorp, 1976)

Méthode déjà prévue dans `USER_RESEARCH.md` (enquête, `R5`). Déroulé :

1. **Population** : participant·es de l'enquête de la phase 1, avec les quotas de
   `USER_RESEARCH.md` (≥ 40 % hors audience K13). Taille visée : à fixer avec la recherche ; en
   dessous de quelques centaines de réponses, le résultat reste **indicatif**.
2. **Stimulus** : description neutre de l'offre « Sync » (une phrase, sans prix d'ancrage
   affiché), après une question de contexte sur les outils payés actuellement.
3. **Quatre questions** (en euros, montant mensuel) : à partir de quel prix est-ce **trop cher**
   pour l'envisager ? **cher** mais envisageable ? **bon marché**, une bonne affaire ? **trop bon
   marché**, au point de douter de la qualité ?
4. **Analyse** : courbes cumulées ; point de prix optimal (intersection « trop cher » / « trop bon
   marché ») et plage acceptable ; segmentation par persona et audience K13 / hors K13.
5. **Compléments** : question d'intention d'achat à prix fixe (modèle Newton–Miller–Smith si la
   taille d'échantillon le permet) et MaxDiff des critères de choix (déjà prévu).
6. **Validation comportementale** : la seule preuve qui compte est un paiement. Test de page
   tarifaire à trois prix (A/B/C) au lancement de la bêta de Sync, mesuré en conversions
   réelles, pas en clics.

### 5.5 Simulation économique simplifiée

Pas de chiffres de marché, seulement un **modèle de sensibilité** pour savoir quelles variables
comptent. **Toutes les entrées sont des hypothèses.**

```
Revenu mensuel Sync = Utilisateurs actifs mensuels × Taux de conversion Sync × Prix net
Prix net            = Prix affiché − commission store (si achat in-app) − TVA
Marge de service    = Revenu − (hébergement + stockage + support + paiement)
```

| Scénario (hypothèse) | Actifs mensuels à M12 | Conversion Sync | Prix net | Revenu mensuel Sync |
| -------------------- | --------------------- | --------------- | -------- | ------------------- |
| Prudent              | 2 000                 | 2 %             | 3 €      | 120 €               |
| Central              | 8 000                 | 4 %             | 3 €      | 960 €               |
| Favorable            | 25 000                | 6 %             | 3,5 €    | 5 250 €             |

Lecture : dans les trois scénarios, la synchronisation **ne fait pas vivre un fondateur à M12**.
Les variables les plus sensibles sont le nombre d'actifs (acquisition et rétention) et la
conversion. Conséquences : (1) garder des coûts fixes proches de zéro (relais léger, pas de
stockage de fichiers lourds au départ) ; (2) diversifier tôt avec parrainages et subventions ;
(3) ne pas embaucher sur la base de ces revenus. Les taux de conversion ci-dessus sont des
**ordres de grandeur supposés**, non issus d'une étude : à remplacer par les données réelles
de la bêta.

## 6. Mise sur le marché portée par la communauté

### 6.1 Construire en public

- **Devlog vidéo mensuel** (YouTube, 8–15 min) : ce qui a été livré, ce qui a échoué, une
  décision de conception expliquée (avec la référence scientifique et son niveau de confiance),
  la prochaine étape. Pas de démo truquée : capture du build réel.
- **Formats courts hebdomadaires** (Instagram Reels, YouTube Shorts) : une micro-interaction,
  un avant/après de design, une question à la communauté.
- **Journal de bord écrit** sur le site (`website/`) et dans les discussions GitHub : version
  texte des devlogs, indexable.
- **Feuille de route publique et votable** : les 100 fonctionnalités du brief, avec leur phase
  (`ROADMAP.md`). Transforme la faiblesse « périmètre » en participation.

### 6.2 Discord

- Salons : `#annonces`, `#retours-beta`, `#bugs` (renvoie vers GitHub), `#idées`, `#montrez-vos-setups`,
  `#contribuer`, `#english`.
- Règles écrites, code de conduite (celui du dépôt), modération par 2 bénévoles au moins avant
  le lancement public.
- Présence du fondateur annoncée sur des créneaux fixes (par ex. deux fois par semaine), pour
  ne pas sacrifier le temps de développement.
- Bêta fermée gérée par rôle Discord + liste d'attente sur le site.

### 6.3 Contributions

- Étiquettes `good first issue` et `help wanted` sur des tâches réellement isolées :
  traductions (namespaces `src/i18n`), thèmes, tests du moteur `@pouxis/core`, documentation.
- Guide de contribution (`CONTRIBUTING.md`) et environnement reproductible (`npm install`,
  `npm test`) : un premier contributeur doit pouvoir lancer les tests en moins de 15 minutes
  (cible provisoire).
- Mettre en avant chaque contribution fusionnée (notes de version, devlog, réseaux).
- Traductions communautaires : ouvrir d'abord les langues demandées dans Discord.

## 7. Séquence de lancement

« J » désigne la sortie publique (version 1.0 dans les stores, ou une bêta publique si la 1.0
prend du retard). **Ne pas fixer J tant que les critères de sortie de la 0.1 et de la 1.0
(`ROADMAP.md`) ne sont pas remplis.** Recommandation de fenêtre : rentrée (septembre) ou
janvier, d'après les déclencheurs du § 4.4.

### T-8 à T-5 semaines — Préparer

- Page d'accueil avec liste d'attente (variantes A/B/C du § 2.2), politique de confidentialité
  publiée.
- Ouverture du Discord à la bêta fermée (cohortes de recherche + audience K13 + hors audience).
- Devlog « Pourquoi je construis POuxis » ; série de 3 courts formats sur la boucle.
- Kit presse prêt (§ 11) ; fiches stores relues contre le registre des affirmations.
- Liste des communautés et de leurs règles d'auto-promotion (à relire une par une avant
  publication).

### T-4 à T-1 semaine — Chauffer

- Bêta élargie ; correction des bugs bloquants de synchronisation en priorité absolue.
- Recueillir 5 à 10 retours d'utilisateur·rices **réels**, avec leur accord écrit pour citation
  (aucun témoignage inventé ni « reformulé »).
- Préparer les publications : Show HN (lire les règles Show HN : le produit doit pouvoir être
  essayé), fiche Product Hunt, posts Reddit adaptés à chaque sous-communauté, article Indie
  Hackers « comment j'ai construit », publication dans des communautés francophones (par
  exemple LinuxFr.org, Journal du hacker — règles à vérifier).
- Prévenir 10 à 20 créateurs et journalistes ciblés, sous embargo, avec accès bêta.
- Tourner la vidéo de lancement (voir `docs/marketing/video/`).

### Semaine de lancement

| Jour | Action                                                                                         |
| ---- | ---------------------------------------------------------------------------------------------- |
| J    | Vidéo de lancement YouTube K13 Studios + Instagram ; publication stores ; dépôt GitHub mis en avant ; annonce Discord |
| J    | Show HN (en anglais, ton factuel, le fondateur répond toute la journée)                         |
| J+1  | Product Hunt (un jour distinct pour ne pas diviser l'attention)                                |
| J+2  | Reddit (sous-communautés productivité, open source, auto-hébergement, selon leurs règles)      |
| J+3  | Communautés francophones ; newsletter aux inscrits de la liste d'attente                       |
| J+4  | Article Indie Hackers ; fil « ce que le lancement m'a appris » (transparent, chiffres réels)   |
| J+5  | Session questions-réponses en direct (YouTube ou Discord)                                      |

Règle : **ne jamais demander de votes** (Product Hunt, Hacker News, Reddit l'interdisent ou le
pénalisent) ; demander d'essayer et de commenter.

### J+1 à J+12 semaines — Tenir

- Semaines 1–2 : correctifs rapides, notes de version publiques, réponse à chaque retour.
- Semaines 3–4 : premier devlog post-lancement (ce qui marche, ce qui ne marche pas), ouverture
  de la bêta de Sync payante si la synchronisation est stable.
- Semaines 5–8 : test de prix (§ 5.4), premiers partenariats créateurs, 2e vague de
  `good first issues`.
- Semaines 9–12 : bilan de rétention (§ 12), décision : continuer sur l'ICP ou pivoter de
  segment ; annonce de la prochaine phase de la feuille de route (0.3 « Penser en graphes »).

## 8. Piliers de contenu

| Pilier                         | Promesse                                                     | Formats                                    | Garde-fou                                                        |
| ------------------------------ | ------------------------------------------------------------ | ------------------------------------------ | ---------------------------------------------------------------- |
| **Construire en public**       | « Voici comment on fabrique un outil, erreurs comprises »    | Devlogs, journal, notes de version          | Ne montrer que le build réel                                     |
| **La science, honnêtement**    | « Ce que la recherche dit, et ce qu'elle ne dit pas »        | Vidéos explicatives, carrousels             | Citer `SCIENTIFIC_BASIS.md` avec niveau de confiance ; montrer aussi les mythes (`SCIENTIFIC_BASIS.md` § 7) |
| **Méthodes de travail créatif** | « Protéger son temps de création »                          | Tutoriels, routines de créateurs (avec accord) | Pas de promesse de productivité chiffrée                         |
| **Propriété des données**      | « Vos idées ne sont pas un produit »                         | Articles, comparaisons factuelles           | Comparaisons datées, sourcées, sans dénigrement                  |
| **Design et artisanat**        | « Pourquoi cette animation dure 180 ms »                     | Formats courts, études de cas de design     | Respecter `prefers-reduced-motion` dans les démos aussi          |

Exemples de sujets prêts à produire : « Le Pomodoro de 25 minutes n'a rien de magique » ;
« Pourquoi POuxis n'a pas d'IA (pour l'instant) » ; « Réparer une série plutôt que la casser » ;
« Ce que voit (et ne voit pas) notre serveur de synchronisation ».

## 9. Partenariats

| Partenaire potentiel                                      | Valeur                                        | Précautions                                                                                   |
| --------------------------------------------------------- | --------------------------------------------- | --------------------------------------------------------------------------------------------- |
| Écoles de design, d'audiovisuel, d'informatique           | Accès aux étudiant·es (PP2, PP4), retours terrain | Offre étudiante ; pas d'exclusivité                                                          |
| Créateurs de contenu « outils et productivité »           | Démonstrations crédibles                      | Mention obligatoire de tout partenariat ou avantage (règles de transparence publicitaire)    |
| Communautés open source et _local-first_                  | Crédibilité technique, contributeurs          | Contribuer en retour (bibliothèques, retours d'expérience)                                    |
| Associations liées à la neurodiversité                    | Comprendre les besoins de PP4                 | **Aucune allégation médicale** ; co-conception rémunérée ; pas d'usage de leur logo sans accord écrit ; validation éthique (`USER_RESEARCH.md`) |
| Programmes de financement de l'open source                | Financement non dilutif                       | Vérifier l'éligibilité (pays, statut juridique, licence) avant de candidater                  |
| Fabricants de liseuses à encre électronique (thème E-Ink) | Visibilité de niche                           | N'annoncer la compatibilité qu'après test sur appareil réel (critère de la 0.2)                |

## 10. ASO : les bases

Le détail opérationnel est dans [`stores/`](./stores/) (mots-clés : `aso-keywords.md`, catégories,
captures, limites de caractères vérifiées par `check-limits.mjs`). Principes stratégiques :

- **Nom et sous-titre** portent la catégorie (« planificateur », « agenda », « idées ») plutôt que
  des termes génériques saturés (« productivité »).
- **Première capture = la boucle** en une image : capture en une phrase → plan de la journée.
- **Captures sans promesse non livrée** : chaque capture renvoie à une ligne cochée du registre.
- **Avis** : demander une note seulement après un moment de réussite (par exemple un bilan
  hebdomadaire terminé), via l'API native du store, jamais par une fenêtre maison insistante.
- **Localisation** : fr et en d'abord, à l'identique de l'interface.
- **Mesure** : consoles Apple et Google (impressions, conversion fiche → installation) ; ce sont
  des données agrégées fournies par les stores, sans traceur dans l'app.

## 11. Kit presse

Contenu à préparer (dossier `website/press/` à créer par le propriétaire de `website/`) :

1. Fiche d'une page (fr, en) : ce qu'est POuxis, à qui il s'adresse, ce qu'il fait **aujourd'hui**,
   licence, plateformes, prix, contact.
2. Logos et icônes : déjà dans `docs/brand/assets/` (clair, sombre, monochrome, E-Ink).
3. Captures d'écran officielles (mêmes que les stores) et vidéo de 60–90 s.
4. Biographie du fondateur et lien vers K13 Studios.
5. FAQ factuelle : modèle économique, vie privée, ce que voit le relais, pourquoi pas d'IA.
6. Chronologie du projet (dates des versions, nombre de contributeurs **réels**).
7. Citations : uniquement d'utilisateur·rices réel·les ayant donné leur accord écrit.

## 12. Métriques et mesure respectueuse de la vie privée

### 12.1 Principe

POuxis **ne collecte rien à distance** (`MVP_SPEC.md` § 4.4 et § 6). Les métriques de mise sur le
marché viennent donc de sources qui ne demandent aucun traceur dans l'app :

| Source                                   | Ce qu'elle mesure                                         | Données personnelles ?                         |
| ---------------------------------------- | --------------------------------------------------------- | ---------------------------------------------- |
| Consoles des stores (Apple, Google, Microsoft) | Impressions, installations, désinstallations, notes   | Agrégées par les stores                        |
| GitHub                                   | Étoiles, forks, issues, contributeurs, téléchargements de versions | Publiques                              |
| Relais hébergé                           | Comptes Sync, appareils actifs, abonnements               | Métadonnées minimales ; aucun contenu (chiffré) |
| Site web                                 | Visites, inscriptions à la liste d'attente                | Mesure sans cookie, auto-hébergée, ou aucune   |
| Rapport d'usage volontaire (dans l'app)  | Boucle, activation, rétention des personnes qui l'envoient | Relu et envoyé par la personne elle-même      |
| Cohortes de recherche                    | Toutes les métriques de produit, avec consentement explicite | Cadre de `USER_RESEARCH.md` § 7            |

Biais connu : les volontaires ne sont pas représentatifs. Toujours présenter ces chiffres comme
issus d'un échantillon volontaire.

### 12.2 Indicateurs

| Indicateur                     | Définition                                                                                      | Source                                  | Cible provisoire (hypothèse)                         |
| ------------------------------ | ----------------------------------------------------------------------------------------------- | --------------------------------------- | ---------------------------------------------------- |
| **North Star**                 | Personnes qui bouclent la journée (capture + plan consulté + session de concentration) au moins 4 jours sur 7 | Cohortes + rapports volontaires | ≥ 50 % des cohortes en semaine 2 (seuil `R3` de la feuille de route) |
| Proxy de la North Star         | Appareils Sync actifs au moins 4 jours sur 7                                                    | Relais (métadonnées)                    | À fixer après la bêta                                |
| Activation                     | Première boucle complète dans les 24 h suivant l'installation                                  | Rapports volontaires, cohortes          | À fixer après la bêta                                |
| Rétention J1 / J7 / J30        | Part des installations encore actives à J1, J7, J30                                             | Consoles des stores (quand disponibles), relais pour les comptes Sync, cohortes | À fixer ; comparer par canal d'acquisition |
| Communauté                     | Étoiles GitHub, contributeurs ayant au moins une contribution fusionnée, membres Discord actifs | GitHub, Discord                         | ≥ 1 contribution externe fusionnée en 0.2 (`ROADMAP.md`) |
| Conversion Sync                | Comptes Sync payants / actifs estimés                                                          | Relais + stores                         | Mesurée, pas supposée (voir § 5.5)                   |
| Santé                          | Taux de plantage déclaré, délai de réponse aux issues, délai de correction des failles          | Stores, GitHub                          | Critères de la 1.0 (`ROADMAP.md`)                    |

Indicateurs de vanité à ne pas piloter : vues de vidéo, abonnés, votes Product Hunt.

## 13. Plan à 90 jours

Point de départ : aujourd'hui (4 novembre 2026), moteur en cours, vues en cours, aucune
fonction cochée dans le registre.

| Période        | Produit (rappel)                     | Marketing et communauté                                                                                   | Livrable de décision                                     |
| -------------- | ------------------------------------ | --------------------------------------------------------------------------------------------------------- | -------------------------------------------------------- |
| Jours 1–30     | Boucle MVP 0.1 jouable sur un appareil | Page d'accueil + liste d'attente (3 variantes) ; Discord fermé ; devlog n° 1 ; lancer le recrutement phase 1 de `USER_RESEARCH.md` | Variante de positionnement gagnante (inscriptions / visite) |
| Jours 31–60    | Synchronisation bureau ↔ mobile en bêta | Bêta fermée (cohorte de 14 jours) ; enquête MaxDiff + Van Westendorp ; devlog n° 2 ; 10 `good first issues` | Réponse à `R5` : le _local-first_ est-il un critère de choix ? Plage de prix acceptable |
| Jours 61–90    | Critères de sortie 0.1                 | Bilan public de la bêta ; parrainages ouverts ; kit presse ; liste des communautés de lancement ; date J candidate | Go / no-go pour la séquence T-8 semaines                  |

## 14. Risques et parades

| Risque                                                   | Probabilité (jugement) | Impact | Parade                                                                                     |
| -------------------------------------------------------- | ---------------------- | ------ | ------------------------------------------------------------------------------------------ |
| Lancement avant que la synchronisation soit fiable       | Moyenne                | Fort   | Critère de sortie strict ; bêta longue ; sauvegarde automatique avant fusion               |
| Surpromesse (100 fonctions, « fondé sur la science »)    | Forte si non cadré     | Fort   | Registre des affirmations obligatoire ; relecture de chaque publication                    |
| Épuisement du fondateur (code + contenu + communauté)    | Forte                  | Fort   | Contenu « coulisses » à faible coût de production ; modérateurs bénévoles ; rythme fixe     |
| Demande faible hors audience K13                         | Moyenne                | Fort   | Quotas hors audience ; tester des canaux hors YouTube dès la bêta                          |
| Concurrent qui ajoute _local-first_ ou planification     | Moyenne                | Moyen  | Avantage d'ouverture (AGPL, export) et d'intégration de la boucle, difficile à copier vite |
| Allégation de santé (TDAH) reprise par des tiers         | Moyenne                | Fort   | Formulations relues ; FAQ explicite « POuxis n'est pas un dispositif médical »             |
| Rejet en revue des stores (fonction déclarée non livrée) | Faible si registre tenu | Moyen | Fiches générées depuis le registre ; notes de revue (`stores/app-review-notes.md`)          |
| Fork commercial concurrent                               | Faible                 | Moyen  | AGPL (obligation de partage du code des services en réseau) ; marque déposée ; communauté   |
| Coût du relais supérieur aux revenus Sync                | Moyenne                | Moyen  | Quotas de stockage ; pas de fichiers lourds au départ ; auto-hébergement documenté          |

## 15. Ce qu'il ne faut pas faire

- Annoncer les 100 fonctionnalités comme un produit existant.
- Écrire « prouvé scientifiquement » ou citer une étude sans son niveau de confiance.
- Payer de la publicité avant d'avoir une rétention mesurée.
- Lancer sur toutes les plateformes communautaires le même jour avec le même texte.
- Acheter des étoiles, des votes ou des avis, ou demander des votes.
- Publier une comparaison avec un concurrent non revérifiée le jour même.
- Bloquer une fonction locale derrière un paiement : cela casse la promesse open source.
- Afficher des témoignages, logos de clients ou chiffres d'utilisateurs qui n'existent pas.

## 16. Sources

Toutes les pages ont été consultées le **4 novembre 2026** (S2 et S6 : moteurs de recherche, le
même jour). Les prix sont ceux affichés à cette date et peuvent avoir changé.

| Réf. | Source                                                                                                    | Ce qui en est tiré                                    |
| ---- | --------------------------------------------------------------------------------------------------------- | ----------------------------------------------------- |
| S1   | https://www.notion.com/pricing                                                                            | Offres et prix Notion                                 |
| S2   | Sources secondaires (fiches de répertoires et articles de presse sur le lancement de Notion Calendar, janvier 2024), via recherche web ; page officielle https://www.notion.com/product/calendar non consultée | Gratuité et plateformes de Notion Calendar — **à revérifier sur la page officielle** |
| S3   | https://obsidian.md/pricing                                                                               | Prix Obsidian, Sync, Publish, licence commerciale     |
| S4   | https://github.com/logseq/logseq                                                                          | Licence AGPL-3.0, étoiles, état de la version DB      |
| S5   | https://anytype.io/pricing                                                                                | Offres et prix Anytype                                |
| S6   | Dépôt `anyproto/anytype-ts` (README cité par des résultats de recherche ; fichier LICENSE non ouvert)      | Licence « Any Source Available License 1.0 » — **à revérifier** |
| S7   | https://affine.pro/pricing                                                                                | Offres, IA, auto-hébergement, licences AFFiNE         |
| S8   | https://heptabase.com/pricing                                                                             | Prix Heptabase                                        |
| S9   | https://www.todoist.com/pricing                                                                           | Prix Todoist                                          |
| S10  | https://culturedcode.com/things/                                                                          | Prix et plateformes Things                            |
| S11  | https://ticktick.com/about/upgrade                                                                        | Prix TickTick Premium                                 |
| S12  | https://www.sunsama.com/pricing                                                                           | Prix Sunsama, essai                                   |
| S13  | https://www.usemotion.com/pricing                                                                         | Prix Motion                                           |
| S14  | https://reclaim.ai/pricing                                                                                | Prix Reclaim, calendriers pris en charge              |
| S15  | https://akiflow.com/pricing                                                                               | Prix Akiflow, essai                                   |
| S16  | https://amie.so/pricing                                                                                   | Prix Amie, essai                                      |
| S17  | https://www.tiimoapp.com/pricing (redirige vers la FAQ)                                                   | Modèle Tiimo, plateformes, public visé                |
| S18  | Fiche App Store US de Structured (id1499198946), via résultats de recherche ; https://structured.app/ consulté sans prix | Prix Structured Pro (variables selon pays et date) |
| S19  | https://www.craft.do/pricing                                                                              | Prix Craft                                            |
| S20  | https://capacities.io/pricing                                                                             | Prix et plateformes Capacities                        |

Références internes : Van Westendorp, P. (1976), _NSS-Price Sensitivity Meter_ (référence complète
dans `USER_RESEARCH.md`) ; études citées par clé dans `docs/research/references.bib`.

**Trous à combler avant publication de toute comparaison** : plateformes de Notion, Obsidian,
Heptabase, Todoist, Sunsama, Motion, Amie, Craft ; statut _local-first_ de Things, Heptabase,
Structured, Craft ; prix de la synchronisation Logseq ; licence exacte d'Anytype et d'Obsidian.
