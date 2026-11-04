# Brief créatif — films de présentation POuxis

> Statut : v1 (2026-11-04), direction vidéo. Documents liés : [`STORYBOARD.md`](./STORYBOARD.md),
> [`shotlist.json`](./shotlist.json) (source de vérité machine), [`SCRIPT_VO_FR.md`](./SCRIPT_VO_FR.md),
> [`SCRIPT_VO_EN.md`](./SCRIPT_VO_EN.md), [`MUSIC_BRIEF.md`](./MUSIC_BRIEF.md),
> [`subtitles/`](./subtitles/). Vision produit : [`docs/BRIEF.md`](../../BRIEF.md) ; périmètre
> livré : [`docs/product/MVP_SPEC.md`](../../product/MVP_SPEC.md).

## Sommaire

1. [Objectif](#1-objectif)
2. [Audiences](#2-audiences)
3. [Message clé et promesse](#3-message-clé-et-promesse)
4. [Ton](#4-ton)
5. [Références : ce qui fait fonctionner un film de lancement](#5-références--ce-qui-fait-fonctionner-un-film-de-lancement)
6. [Alignement avec la marque](#6-alignement-avec-la-marque)
7. [Formats et spécifications](#7-formats-et-spécifications)
8. [Garde-fous : affirmations et fonctionnalités montrées](#8-garde-fous--affirmations-et-fonctionnalités-montrées)
9. [Accessibilité](#9-accessibilité)
10. [Chaîne de production](#10-chaîne-de-production)
11. [Sources consultées](#11-sources-consultées)

---

## 1. Objectif

Montrer en moins de deux minutes **une boucle complète** : capturer → planifier → se concentrer →
penser → faire le bilan, sur quatre appareils synchronisés. C'est la boucle du MVP 0.1 (« La
boucle », `MVP_SPEC.md` §1) : le film ne promet rien que le produit ne fasse pas.

Objectifs mesurables, à suivre sur les plateformes qui les exposent (aucune cible chiffrée n'est
fixée tant qu'aucune donnée de référence n'existe) :

- **Compréhension** : à la fin des 10 premières secondes, la personne a vu une vraie saisie en
  langage naturel (Google Play recommande de montrer l'expérience réelle dans les 10 premières
  secondes, voir §11).
- **Rétention** : part de spectateurs encore présents à 30 s (film principal) et taux de
  visionnage complet (formats courts).
- **Action** : clics vers le site ou le store depuis le carton final ou la description.

Ce que le film **n'est pas** : un tutoriel exhaustif des 100 fonctionnalités du brief. Il en
montre une douzaine, choisies parmi celles du MVP (voir §8).

## 2. Audiences

Les proto-personas de [`docs/research/PERSONAS.md`](../../research/PERSONAS.md) sont des
**hypothèses non validées**. Le film s'appuie sur leurs jobs supposés, pas sur des données.

| Audience (hypothèse)                          | Ce qu'elle doit voir                            | Plans clés                 | Format prioritaire            |
| --------------------------------------------- | ----------------------------------------------- | -------------------------- | ----------------------------- |
| PP1 — créatrice de contenu solo (iPhone, Mac) | Ne perdre aucune idée, une journée qui se range | `h02`, `h04`, `h10`, `h12` | Vertical 15/30 s, hero        |
| PP2 — designer freelance (Windows, Android)   | Temps de création protégé, minuteur par tâche   | `h05`, `h08`, `h09`        | Hero, 30 s 16:9               |
| PP3 — développeur·se indé (clavier, données)  | Capture au clavier, local-first, export         | `h02`, `h15`, `h17`        | Hero (YouTube), Mac App Store |
| PP4 — étudiante avec un TDAH (Android, PC)    | Voir le temps qui reste, une chose à la fois    | `h07`, `h08`, `h09`        | Vertical, Google Play         |
| Presse, contributeurs open source             | Ambition, sérieux, plateformes, licence ouverte | `h16`, `h18`               | Hero 4K                       |

Psychographie commune supposée : fatigue des outils qui « culpabilisent », besoin de calme et de
maîtrise. Objection principale anticipée : « encore une app de productivité ». Réponse du film :
ne pas argumenter, **montrer** une journée qui se range en une phrase.

## 3. Message clé et promesse

- **Message clé (une phrase)** : _Une phrase suffit pour planifier ; le reste de votre temps vous
  appartient._
- **Signature** : FR « Votre temps, en clair. » — EN “Your time, made clear.”
- **Trois preuves montrées à l'écran**, jamais affirmées sans image :
  1. la saisie en langage naturel devient un rendez-vous daté (US-1) ;
  2. la journée se planifie et se réorganise seule autour des rendez-vous fixes (1.1, 1.2, 1.6) ;
  3. tout fonctionne hors-ligne et se synchronise sur quatre systèmes (3.1, 1.7).
- **Tension narrative** (brand story) : l'ennemi n'est pas le manque d'outils, c'est la journée
  pleine avant d'avoir commencé. Le film part de cette saturation (carton noir sur papier, un
  curseur) et finit sur un espace vide, calme.

## 4. Ton

Axes de voix (alignés sur [`docs/design/UX_WRITING.md`](../../design/UX_WRITING.md)) :

| Axe               | Position                              | Conséquence à l'image et au son                                     |
| ----------------- | ------------------------------------- | ------------------------------------------------------------------- |
| Formel ↔ familier | Vouvoiement chaleureux                | VO et cartons au « vous » ; jamais d'injonction (« Téléchargez »)   |
| Sérieux ↔ ludique | Sérieux, avec une seule touche de jeu | Le jeu tient dans la carte de sérendipité et le logo sonore         |
| Complexe ↔ simple | Simple                                | Un plan = une idée ; aucun jargon (« CRDT », « local-first » en VO) |
| Chaud ↔ froid     | Chaud et précis                       | Papier chaud, corail en touche, rythme lent, silences assumés       |

Interdits, hérités de la charte rédactionnelle : vocabulaire d'échec (« en retard », « raté »),
pression, superlatifs (« la meilleure app »), chiffres de marché ou témoignages inventés.

## 5. Références : ce qui fait fonctionner un film de lancement

On retient des **mécanismes**, pas des plans. Aucun cadrage, musique ou texte de ces films n'est
reproduit.

| Référence                 | Mécanisme observé                                                                                                                  | Ce que POuxis en retient                                                                                          | Plans               |
| ------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- | ------------------- |
| Films produit d'Apple     | Chorégraphie des appareils dans un espace neutre ; gros plans macro sur l'interface ; balayages de lumière qui révèlent la matière | Appareils génériques sur fond papier ; macro sur la barre de commande ; un seul balayage lumineux doux par carton | `h02`, `h13`, `h16` |
| Linear                    | Fond sombre, typographie qui apparaît sans fioriture, rythme sec, l'interface comme héroïne                                        | Cartons typographiques sombres très courts, opacité seule, jamais de rebond                                       | `h07`, `h08`        |
| Arc (The Browser Company) | Récit à la première personne, humour, le fondateur qui parle comme à un ami                                                        | VO du fondateur, une histoire (une journée) plutôt qu'une liste de fonctions                                      | VO entière          |
| Things 3 (Cultured Code)  | Démonstrations calmes centrées sur l'UI, mouvements lents, interactions lisibles en temps réel                                     | Interactions jouées à vitesse réelle, curseur visible, aucun accéléré trompeur                                    | `h04`, `h06`        |
| Raycast                   | Coupes rapides au rythme du clavier ; la vitesse de la saisie devient le spectacle                                                 | Montage au demi-temps sur la saisie ⌘K ; une note par fragment reconnu                                            | `h02`, `v01`        |
| Notion Calendar (ex-Cron) | Mouvement de calendrier net : les blocs glissent, se redimensionnent, la grille reste stable                                       | Propagation des retards filmée sur une grille immobile, seuls les blocs bougent                                   | `h05`, `ap03`       |

Principes qui en découlent :

1. **L'interface est le personnage.** Au moins 80 % de la durée montre l'app réelle (c'est aussi
   la recommandation de Google Play pour sa vidéo, voir §11).
2. **Un mouvement par plan.** Soit la caméra bouge, soit l'interface bouge ; jamais les deux
   fortement à la fois (lisibilité, confort vestibulaire).
3. **Le silence est un outil.** Deux cartons (`h07`, `h13`) sans voix, une coupure musicale
   d'un temps sur le hors-ligne (`h15`).
4. **Rythme musical** : 96 BPM, coupes sur les demi-mesures (1 250 ms), voir `MUSIC_BRIEF.md`.

## 6. Alignement avec la marque

Sources : `apps/pouxis/src/design/tokens.css` (les **noms** de tokens sont un contrat) et
`docs/brand/assets/`.

- **Symbole** : le trait du « P » et le **point corail** (`symbol.svg`). Le point est le motif
  du film : il se pose à la fin (`h18`), il sonne (logo sonore de deux notes), il relie deux idées
  (`h12`). Le symbole est tracé, jamais déformé, jamais en 3D.
- **Couleurs** (valeurs actuelles des tokens, à relire au rendu car elles peuvent évoluer) :
  fond papier `--bg` (#f6f4ef), encre `--ink` (#1c1b18), corail `--accent` (#ff8f70) en
  **touche uniquement** (jamais en aplat dominant), bleu création `--create` (#344ce5) pour les
  scènes d'idéation, thème sombre `--bg` (#121211). Fond des scènes « appareils » : `--bg` du
  thème de la scène ; aucun dégradé violet ou néon.
- **Typographie** : interfaces dans la pile `--font-sans` ; cartons et signature en
  `--font-serif` (ui-serif, New York, Iowan Old Style, Charter, Georgia). Voir la note de rendu
  au §10 sur les polices disponibles sous Linux.
- **Mouvement** : courbes et durées des tokens (`--ease-out` cubic-bezier(0.16, 1, 0.3, 1),
  `--ease-standard`, `--ease-spring` pour la seule pose du point ; `--dur-*`). Les mouvements
  d'interface restent `transform`/`opacity`, comme dans l'app.
- **Logo** : lockups `lockup-horizontal(-reversed).svg` (16:9) et `lockup-stacked(-reversed).svg`
  (9:16). Zone de protection : au moins la hauteur du point corail autour du lockup.

## 7. Formats et spécifications

Tous les formats sont décrits dans `shotlist.json` › `formats` ; `validate-shotlist.mjs` vérifie
les durées et les limites des stores.

| ID                     | Usage                                | Ratio / résolution                                                | Durée  | Voix off            | Légendes                         |
| ---------------------- | ------------------------------------ | ----------------------------------------------------------------- | ------ | ------------------- | -------------------------------- |
| `hero-16x9`            | YouTube, site, dossier de presse     | 16:9, master 3840×2160 à 60 i/s ; livrables 4K 60 et 1920×1080 30 | 105 s  | Fondateur, complète | Bas de cadre + SRT FR/EN         |
| `cut-30-16x9`          | YouTube, LinkedIn, X, site           | 16:9, 1920×1080 à 30 i/s                                          | 30 s   | Signature seule     | Incrustées                       |
| `vertical-15-9x16`     | Reels, Shorts, TikTok                | 9:16, 1080×1920 à 30 i/s                                          | 15 s   | Signature seule     | Incrustées, zone sûre            |
| `vertical-30-9x16`     | Reels, Shorts, TikTok                | 9:16, 1080×1920 à 30 i/s                                          | 30 s   | Signature seule     | Incrustées, zone sûre            |
| `appstore-iphone`      | Aperçu App Store (iPhone)            | 886×1920 portrait, H.264, 30 i/s max                              | 27,5 s | Aucune              | Incrustées                       |
| `appstore-mac`         | Aperçu Mac App Store                 | 1920×1080 paysage, H.264, 30 i/s max                              | 27,5 s | Aucune              | Incrustées                       |
| `google-play-portrait` | Vidéo de fiche Google Play (YouTube) | 9:16, 1080×1920                                                   | 27,5 s | Aucune              | Incrustées + sous-titres YouTube |

### 7.1 App Store (Apple) — vérifié le 2026-11-04

D'après la page « App preview specifications » d'App Store Connect et la page « App Previews »
(§11) :

- **Durée** : 15 s minimum, 30 s maximum. Jusqu'à **trois aperçus** par taille d'appareil et par
  langue. Poids maximal 500 Mo. Traitement jusqu'à 24 h après envoi.
- **Formats** : .mov, .m4v, .mp4 en H.264 (débit cible 10–12 Mbit/s, progressif, jusqu'à High
  Profile 4.0) ou .mov ProRes 422 HQ. **30 images/s maximum.** Audio stéréo AAC 256 kbit/s,
  44,1 ou 48 kHz, toutes les pistes activées.
- **Résolutions acceptées** : iPhone grands et moyens écrans (Dynamic Island ou Face ID) :
  **886×1920** (portrait) ou 1920×886 ; iPhone à bouton d'accueil 5,5" : 1080×1920 ; 4,7" :
  750×1334 ; iPad 13" et 11" : 1200×1600 ; **Mac : 1920×1080, paysage uniquement**. Si l'interface
  est identique d'une taille à l'autre, fournir seulement la plus haute résolution requise.
- **Image d'affiche** : 5 s par défaut, modifiable. Notre plan `ap01` est conçu pour que l'image à
  5,0 s montre la saisie et toutes ses pastilles reconnues.
- **Contenu** : seulement ce qui existe dans l'app ; pas de mains ni de personnes manipulant
  l'appareil ; Apple recommande de capturer la résolution native plutôt que de zoomer, et des
  transitions simples (fondus) qui ne suggèrent pas de fonctionnalité absente. Lecture **muette
  par défaut** : les légendes portent le sens. Pas de prix, pas de référence datée (« nouveau cet
  automne »). Mentionner un achat intégré, un abonnement ou une connexion obligatoire s'il y en a.
- **Conséquences dans la shotlist** : scènes `ap*`/`apm*` en `device: "none"` (capture plein
  cadre, sans cadre d'appareil), caméra fixe à l'échelle 1, transitions `dissolve`, aucun carton
  logo (le dernier plan est un écran réel de l'app).

### 7.2 Google Play — vérifié le 2026-11-04

D'après l'article d'aide Play Console « Add preview assets to showcase your app » (§11) :

- **Une vidéo** par fiche, sous forme d'**URL YouTube** (pas de playlist ni de chaîne, pas de
  paramètre de temps). Vidéo **publique ou non répertoriée**, **sans publicité** (monétisation
  désactivée), non soumise à une limite d'âge, intégrable.
- Si la vidéo contient un contenu protégé faisant l'objet d'une revendication, désactiver la
  monétisation peut ne pas suffire à retirer les publicités : c'est la raison principale de la
  règle « musique originale ou licence vérifiée » du `MUSIC_BRIEF.md`.
- Portrait ou paysage acceptés ; **pas de bandes noires** sur une vidéo portrait. Lecture
  automatique **muette jusqu'à 30 s** sur certaines surfaces : 27,5 s couvre tout.
- Recommandé : expérience réelle dans les **10 premières secondes**, **au moins 80 %** de la vidéo
  représentative de l'usage, pas de doigts à l'écran, sous-titres, légendes lisibles assez
  longtemps, pas de mention de classement ou de prix, pas d'appel à l'action (« Téléchargez »),
  pas de contenu daté. La vignette affichée est l'image de présentation (feature graphic
  1024×500) : à coordonner avec l'agent des visuels de store.

### 7.3 Réseaux sociaux (formats verticaux)

Nous n'avons pas vérifié de page officielle pour Reels, Shorts et TikTok dans cette version ; on
s'en tient au format 1080×1920 (9:16) et à une **règle maison de zone sûre** : texte et logo dans
le cadre central de 1080×1420 px (250 px libres en haut, 250 px en bas) et 90 px de marge
latérale, pour rester clair des interfaces superposées. À revérifier sur la documentation de
chaque plateforme avant la diffusion.

## 8. Garde-fous : affirmations et fonctionnalités montrées

Chaque plan montre une fonctionnalité du build réel ; rien n'est maquetté. Avant la production,
vérifier dans le build filmé :

| Fonctionnalité (brief)                | Dans le MVP 0.1 ? | Plans                         | Si absente du build                                                  |
| ------------------------------------- | ----------------- | ----------------------------- | -------------------------------------------------------------------- |
| 1.8 Saisie en langage naturel         | Oui               | `h02`, `v01`, `ap01`, `apm01` | Bloquant : pas de film                                               |
| 1.1 / 1.10 Routage, tâches flottantes | Oui               | `h04`, `v02`, `ap02`          | Bloquant                                                             |
| 1.6 Marges entre réunions             | Oui               | `h04`                         | Retirer la mention « avec des marges »                               |
| 1.2 Propagation des retards           | Oui               | `h05`, `v06`, `ap03`          | Remplacer par une replanification manuelle                           |
| 2.6 / 2.14 Minuteur, focus unique     | Oui               | `h08`, `h09`, `v03`, `ap04`   | Bloquant                                                             |
| 5.14 Brain dump                       | Oui               | `h10`                         | —                                                                    |
| 4.x Toile infinie, mini-carte         | **Non**           | `h11`, `apm04`                | Remplacer par `#/tasks` et le graphe de dépendances (2.1) ou retirer |
| 5.1 Moteur de sérendipité             | **Non**           | `h12`, `v04`, `ap05`          | Remplacer par le brain dump (`h10`) et adapter la VO                 |
| 7.9 Bilan hebdomadaire                | Oui               | `h14`, `apm05`                | —                                                                    |
| 3.1 Local-first, hors-ligne           | Oui               | `h15`, `v08`                  | Bloquant                                                             |
| 1.7 Synchronisation multi-appareil    | Oui               | `h03`, `h16`                  | Bloquant                                                             |
| 6.11 Export complet                   | Oui               | `h17`                         | —                                                                    |

Autres règles :

- **Plateformes du carton final** : iPhone, Android, Mac, Windows. Le MVP place iOS et Android en
  bêta (TestFlight, test interne) : ne pas écrire « disponible sur » tant que les builds publics ne
  sont pas en ligne. L'URL `pouxis.app` du carton est un **paramètre à confirmer**.
- **Données de démonstration** : fictives (`fixtures` de la shotlist), persona « Inès » fictive ;
  chaque plan avec des chiffres (bilan, `h14`) affiche « Données de démonstration fictives ».
- **Affirmations** : chaque phrase de VO ou de légende doit renvoyer au registre des
  affirmations des fiches de store (`docs/marketing/stores/`, registre en cours de rédaction par
  l'agent stores). Aucune statistique, étude ou citation dans le film.
- **Appareils** : cadres génériques (ni logo de marque, ni modèle identifiable), barre d'état
  propre (09:41, réseau et batterie pleins). Les noms iPhone, Mac, Android et Windows ne servent
  qu'à désigner la compatibilité.

## 9. Accessibilité

- **Sous-titres** : SRT FR et EN fournis pour chaque format avec voix off (`subtitles/`, générés
  par `build.mjs`). 42 caractères par ligne au plus, 2 lignes au plus par sous-titre ; vitesse de
  lecture plafonnée à **17 caractères/s** (règle maison, contrôlée par le validateur).
- **Légendes incrustées** : affichées au moins 1,5 s (contrôlé) ; encre `--ink` sur `--bg`
  (paires de couleurs déjà testées ≥ 4,5:1 dans `contrast.test.ts`) ou l'inverse en thème
  sombre ; jamais de texte sur le corail. Taille minimale : 4,5 % de la hauteur du cadre pour les
  légendes, 7 % pour les cartons.
- **Flashs** : aucun contenu ne clignote plus de **trois fois par seconde** (WCAG 2.2, critère
  2.3.1). Le curseur clignote à 1 Hz ; les balayages lumineux sont lents (≥ 800 ms), de faible
  amplitude et uniques ; aucune alternance rapide clair/sombre lors des changements de thème
  (fondu ≥ 400 ms).
- **Mouvement** : pas de zoom rapide ni de rotation ; vitesse de caméra limitée (aucune variation
  d'échelle supérieure à ×1,0 par seconde, contrôlée par le validateur). Sur le site, la vidéo ne se lance pas d'elle-même
  quand `prefers-reduced-motion: reduce` est actif : afficher l'image d'affiche et un bouton
  « Lire ».
- **Audio** : la VO décrit déjà l'essentiel de l'action ; publier la **transcription** (scripts VO)
  sous la vidéo sur le site et sur YouTube. Musique mixée au moins 12 dB sous la voix.
- **Sens sans le son** : chaque format court se comprend muet grâce aux légendes.

## 10. Chaîne de production

1. Agent de production : lire `shotlist.json`, rendre chaque scène avec Playwright (Chromium
   `/opt/pw-browsers/chromium-1194/chrome-linux/chrome`), horloge figée sur
   `fixtures.clock` (`page.clock`), une passe par langue, puis composer avec ffmpeg (libx264).
2. **Crochets `data-demo`** : la shotlist cible uniquement des attributs `data-demo="…"`
   listés dans `selectorContract`. Ils doivent être ajoutés par les propriétaires des vues ; en
   leur absence, le rendu doit échouer explicitement plutôt que deviner un sélecteur.
3. **Polices au rendu** : la pile `--font-sans` est native ; sous Linux, Chromium tombera sur une
   police système différente de celle de l'iPhone, du Mac ou de Windows. Choix recommandé pour
   les films hors store : feuille de style de rendu qui fixe `--font-sans` sur Inter (installée,
   licence SIL OFL) et `--font-serif` sur Bitstream Charter (installée, présente dans la pile
   `--font-serif`). Pour les **aperçus App Store**, qui doivent montrer l'app réelle, capturer de
   préférence sur un Mac et un simulateur iOS, ou faire valider la substitution.
4. Mise à jour : modifier `shotlist.json`, puis `node docs/marketing/video/build.mjs` (régénère
   les tableaux de `STORYBOARD.md` et les SRT) ; `node docs/marketing/video/build.mjs --check`
   échoue si un fichier dérivé est périmé.

## 11. Sources consultées

Consultées le 2026-11-04 :

- Apple, App Store Connect Help, « App preview specifications » —
  <https://developer.apple.com/help/app-store-connect/reference/app-preview-specifications>
- Apple Developer, « App Previews » (recommandations de contenu) —
  <https://developer.apple.com/app-store/app-previews/>
- Google, Play Console Help, « Add preview assets to showcase your app » —
  <https://support.google.com/googleplay/android-developer/answer/9866151>
- W3C, WCAG 2.2, critère 2.3.1 « Three Flashes or Below Threshold » —
  <https://www.w3.org/TR/WCAG22/#three-flashes-or-below-threshold>
