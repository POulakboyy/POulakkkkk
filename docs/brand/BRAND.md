# Identité de marque — POuxis

> Référence de la marque : positionnement, voix, logo, icônes, langage visuel. Les valeurs de
> couleur et de typographie viennent de `apps/pouxis/src/design/tokens.css` : en cas d’écart,
> les tokens font foi. La planche visuelle hors-ligne est [`brand-sheet.html`](brand-sheet.html) ;
> les fichiers sources sont dans [`assets/`](assets/) et leurs rendus PNG dans [`png/`](png/).

Sommaire :

1. [Plateforme de marque](#1-plateforme-de-marque)
2. [Voix et ton](#2-voix-et-ton)
3. [Nom](#3-nom)
4. [Logo](#4-logo)
5. [Icône d’application](#5-icône-dapplication)
6. [Langage visuel](#6-langage-visuel)
7. [Modèles pour les réseaux sociaux](#7-modèles-pour-les-réseaux-sociaux)
8. [Fichiers et régénération](#8-fichiers-et-régénération)
9. [Questions ouvertes pour le fondateur](#9-questions-ouvertes-pour-le-fondateur)

---

## 1. Plateforme de marque

### Concept directeur

**Le papier calme, le point net.** Une surface chaude et silencieuse (le papier) où une seule
chose est mise au point à la fois (le point corail). Tout le système découle de cette tension :
beaucoup d’espace, très peu d’accent, une seule priorité visible.

### Vérité

POuxis réunit l’agenda, les tâches et les idées dans une seule application, open source, qui
fonctionne d’abord sur l’appareil (local-first) et se synchronise ensuite. Ses fonctions de
planification s’appuient sur des travaux publiés, recensés dans
[`docs/research/SCIENTIFIC_BASIS.md`](../research/SCIENTIFIC_BASIS.md).

### Ennemi

La journée pleine avant d’avoir commencé : les outils qui ajoutent du bruit, des badges, des
alarmes et de la culpabilité. POuxis refuse la productivité anxiogène et la captation de
données.

### Pour qui

Des personnes qui créent et qui doivent aussi exécuter : indépendants, étudiants, équipes
réduites. Elles jonglent entre réunions et travail profond, et veulent garder la main sur leurs
données. Les personas détaillés sont dans [`docs/research/PERSONAS.md`](../research/PERSONAS.md).

### Positionnement

> Pour les personnes qui créent et qui organisent leur temps, POuxis est l’agenda, la liste de
> tâches et le carnet d’idées réunis, qui planifie la journée à partir d’une simple phrase et
> fonctionne hors-ligne, sans exiger vos données. Contrairement aux suites de productivité
> fermées, son code est ouvert et vos données restent sur vos appareils.

### Promesse

- **Signature** : FR « Votre temps, en clair. » — EN “Your time, made clear.” (partagée avec
  [`docs/marketing/video/CREATIVE_BRIEF.md`](../marketing/video/CREATIVE_BRIEF.md)).
- **Message clé** : une phrase suffit pour planifier ; le reste de votre temps vous appartient.
- **Engagement vérifiable** : chaque affirmation publique renvoie à une fonction démontrable ou à
  une source listée dans [`docs/marketing/stores/claims-register.md`](../marketing/stores/claims-register.md).

### Personnalité

| POuxis est…      | …sans être         |
| ---------------- | ------------------ |
| Calme            | Endormi ou terne   |
| Précis           | Froid ou technique |
| Chaleureux       | Familier ou mièvre |
| Sûr de ses choix | Autoritaire        |
| Discret          | Effacé             |

### Valeurs

1. **Open source** — le code est public ; on peut lire, vérifier, modifier et héberger soi-même
   le serveur de synchronisation.
2. **Local d’abord** — l’application fonctionne sans réseau ; la synchronisation est un service,
   pas une condition.
3. **Vie privée** — aucune donnée n’est collectée par défaut ; ce qui est chiffré l’est de bout en
   bout. On ne promet que ce que l’architecture garantit (voir `docs/security/`).
4. **Fondé sur des preuves** — une fonction qui se réclame de la recherche cite une source
   vérifiée. Jamais d’étude, de chiffre ou de témoignage inventé.
5. **Respect de l’attention** — pas de pression, pas de culpabilité, pas de mécanique addictive.
   Le repos fait partie du temps bien utilisé.

---

## 2. Voix et ton

La voix suit [`docs/design/UX_WRITING.md`](../design/UX_WRITING.md) (vouvoiement, registre
informatif, glossaire). Cette section l’étend à la communication de marque : site, stores,
réseaux sociaux, notes de version.

### Les quatre axes

| Axe               | Position               | En pratique                                                          |
| ----------------- | ---------------------- | -------------------------------------------------------------------- |
| Formel ↔ familier | Vouvoiement chaleureux | « vous », phrases simples ; en anglais, « you » et contractions      |
| Sérieux ↔ ludique | Sérieux, sourire rare  | Un trait d’esprit par page au plus, jamais aux dépens de la personne |
| Complexe ↔ simple | Simple sans simplifier | Le mot exact (« CRDT ») seulement s’il est expliqué une fois         |
| Chaud ↔ froid     | Chaud par le rythme    | Phrases courtes, verbes concrets, pas d’adjectifs d’emphase          |

### Trois scènes

| Scène             | FR                                                                                                    | EN                                                                             |
| ----------------- | ----------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| Dire bonjour      | « Bonjour. Qu’avez-vous en tête aujourd’hui ? »                                                       | “Hello. What’s on your mind today?”                                            |
| Mauvaise nouvelle | « La synchronisation est en pause : le serveur ne répond pas. Vos données restent sur cet appareil. » | “Sync is paused: the server isn’t responding. Your data stays on this device.” |
| Célébrer          | « Version 1.0. Merci aux personnes qui ont testé, traduit et corrigé. »                               | “Version 1.0. Thanks to everyone who tested, translated and fixed.”            |

### À faire / à éviter

| À faire                                                                           | À éviter                                                   |
| --------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| Décrire ce que fait la fonction : « Placez une tâche, la journée se réorganise. » | Superlatifs : « révolutionnaire », « ultime », « boostez » |
| Montrer une preuve (capture, démo) avant d’affirmer                               | « Prouvé scientifiquement », chiffres sans source          |
| Proposer : « Essayez POuxis sur votre Mac. »                                      | Injonctions : « Téléchargez maintenant ! »                 |
| Nommer les limites : « La recherche sémantique n’est pas encore disponible. »     | Promettre ce qui n’est pas livré                           |
| Un point, pas de point d’exclamation                                              | Émojis en série, majuscules d’emphase, « !!! »             |
| Vocabulaire du glossaire (« à replanifier »)                                      | Vocabulaire d’échec (« en retard », « raté »)              |
| Anglais naturel, _sentence case_ : “Plan your day in one sentence.”               | Calques du français, _Title Case_ partout                  |

### Mots de la marque

- **Oui** : clair, calme, au même endroit, à vous, hors-ligne, ouvert, phrase, journée, idée.
- **Non** : hack, booster, grind, ninja, 10×, productivité maximale, IA magique.

---

## 3. Nom

- **Graphie recommandée** : « POuxis » (P et O capitales, suite en minuscules), telle qu’elle
  apparaît dans le dépôt, les stores et l’interface. Le logotype reproduit cette graphie : les
  deux capitales « PO » forment un bloc, « uxis » suit en bas de casse.
- **Étymologie** : aucune n’est documentée. Ce guide n’en propose pas et la communication ne doit
  pas en inventer. Si le fondateur souhaite raconter l’origine du nom, c’est à lui de la fournir.
- **Prononciation** : non fixée. Hypothèse de travail à valider : /pu.ksis/ (« pou-xis »). Une
  prononciation en lettres (« P-O-uxis ») est aussi possible. À trancher avant la vidéo et les
  podcasts (voir §9).
- **Dans une phrase** : le nom est invariable et sans article : « POuxis planifie… », pas « le
  POuxis ». Pas de forme tout en capitales (« POUXIS ») ni tout en minuscules (« pouxis »), sauf
  contrainte technique (identifiant de paquet, URL, nom de fichier).

---

## 4. Logo

### Construction

- **Symbole** : un « P » tracé d’un seul trait, à extrémités arrondies, sur une grille de 24.
  Sa panse contient un **point corail** : la tâche en cours, le moment mis au point. C’est le seul
  élément de couleur vive de la marque.
- **Logotype** : « POuxis » dessiné en tracés géométriques (aucune police n’est requise ni
  embarquée) : capitales de 87 unités, bas de casse de 57, épaisseur de trait 13. Le « P » du
  logotype reprend le point du symbole.
- **Règle du point unique** : dans un assemblage symbole + logotype, le corail n’apparaît qu’une
  fois (dans la pastille) ; le point du « P » du logotype passe à l’encre.
- **Pastille** : dans les assemblages, le symbole se pose sur un carré arrondi encre (rayon
  22,4 % du côté, proche des icônes système), symbole en papier, point en corail.

### Déclinaisons

| Fichier (`assets/`)                                             | Usage                                                           |
| --------------------------------------------------------------- | --------------------------------------------------------------- |
| `symbol.svg`                                                    | Symbole couleur, à partir de 32 px                              |
| `symbol-small.svg`                                              | Taille optique ≤ 24 px : trait épaissi, point agrandi           |
| `symbol-reversed.svg`                                           | Symbole sur fond encre                                          |
| `symbol-mono.svg` / `-mono-reversed.svg`                        | Une seule couleur (gravure, tampon, broderie)                   |
| `symbol-eink.svg`                                               | Noir pur, bords nets, trait épaissi pour encre électronique     |
| `logotype.svg`, `-reversed`, `-mono`, `-mono-reversed`, `-eink` | Nom seul                                                        |
| `lockup-horizontal.svg` / `-reversed.svg`                       | Assemblage principal (en-tête du site, documents)               |
| `lockup-stacked.svg` / `-reversed.svg`                          | Formats carrés ou verticaux (affiche, écran d’accueil)          |
| `lockup-*-mono.svg` / `-mono-reversed.svg`                      | Assemblages une couleur ; le symbole est évidé dans la pastille |
| `lockup-*-eink.svg`                                             | Assemblages noir pur pour liseuses et impression laser          |

### Zone de protection

- **Symbole seul** : marge libre égale à **25 % de sa hauteur** sur chaque côté.
- **Assemblages** : marge libre égale à **la moitié de la hauteur de la pastille** autour de
  l’ensemble. L’espace entre pastille et logotype (40 unités pour une pastille de 130) est fixe.
- **Logotype seul** : marge libre égale à **la hauteur du bas de casse** (le « u »).

### Tailles minimales

| Élément               | Écran                       | Impression |
| --------------------- | --------------------------- | ---------- |
| Symbole               | 16 px (avec `symbol-small`) | 5 mm       |
| Logotype              | 64 px de large              | 18 mm      |
| Assemblage horizontal | 96 px de large              | 25 mm      |
| Assemblage vertical   | 80 px de large              | 20 mm      |

Sous ces tailles, utiliser le symbole seul.

### À éviter

- Déformer, incliner, ajouter un contour, une ombre ou un dégradé.
- Recolorer le point dans une autre teinte que le corail (ou l’encre en monochrome).
- Ajouter un second point corail, ou mettre le logotype en corail.
- Recomposer « POuxis » avec une police : toujours utiliser les fichiers SVG.
- Poser le logo couleur sur une photo chargée ; utiliser la version mono ou une zone unie.
- Poser la pastille encre sur un fond encre : passer à la version inversée.

---

## 5. Icône d’application

### Principe

Une seule image partout : le symbole encre et son point corail sur le papier chaud `#F6F4EF`,
centré optiquement (légèrement décalé vers la droite et le bas pour compenser la masse de la
panse). Pas de texte, pas de dégradé, pas de reflet.

### Fichiers

| Plateforme                 | Fichier                                                                                                                                                    | Notes                                                                                                                                                                        |
| -------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Source `tauri icon`        | `assets/app-icon-1024.svg` → `assets/app-icon-1024.png`                                                                                                    | Carré plein, opaque (RVB, sans alpha), 1024 px. Commande : `npm run tauri -w @pouxis/app -- icon ../../docs/brand/assets/app-icon-1024.png`                                  |
| iOS                        | `app-icon-1024.png` ; variantes `app-icon-ios-dark-1024.svg` (fond transparent, fourni par le système) et `app-icon-ios-tinted-1024.svg` (niveaux de gris) | iOS applique lui-même le masque arrondi : ne jamais arrondir le fichier.                                                                                                     |
| Android (icône adaptative) | `android-adaptive-foreground.svg`, `-background.svg`, `-monochrome.svg` (108 × 108 dp)                                                                     | Le symbole tient dans la zone sûre centrale de 66 dp ; le masque du lanceur peut rogner tout ce qui dépasse. La couche monochrome sert aux icônes thématiques (Android 13+). |
| macOS                      | `app-icon-macos-1024.svg` → `png/app-icon-macos-1024.png`                                                                                                  | Grille macOS : carré arrondi de 824 px centré dans 1024, ombre portée légère, fond transparent autour.                                                                       |
| Windows, Linux             | `app-icon-rounded-1024.svg` → `png/app-icon-rounded-1024.png`                                                                                              | Carré arrondi avec filet discret, lisible sur barre des tâches claire ou sombre. `tauri icon` génère `.ico` et tuiles.                                                       |
| Web (PWA)                  | `apps/pouxis/public/icon-192.png`, `icon-512.png`, `icon-maskable-512.png`, `apple-touch-icon.png` (180), `favicon.svg`                                    | Le favicon SVG bascule en clair/sombre avec `prefers-color-scheme`. L’icône masquable reprend la zone sûre Android.                                                          |

### Contrôle

Vérifier l’icône à 16, 32, 64 et 180 px, sur fond clair et sombre : le « P » doit rester
lisible à 16 px et le point visible dès 32 px.

---

## 6. Langage visuel

### Couleurs et proportions

| Rôle                | Token       | Clair     | Sombre    | Part indicative            |
| ------------------- | ----------- | --------- | --------- | -------------------------- |
| Papier (fond)       | `--bg`      | `#F6F4EF` | `#121211` | ≈ 70 %                     |
| Encre (texte, logo) | `--ink`     | `#1C1B18` | `#F3F1EC` | ≈ 20–25 %                  |
| Encre secondaire    | `--ink-2`   | `#4F4B44` | `#BDB8AD` | texte courant secondaire   |
| Corail (signature)  | `--accent`  | `#FF8F70` | `#FF9C80` | ≤ 5 %, un seul point focal |
| Créer (mode)        | `--create`  | `#344CE5` | —         | dans le produit uniquement |
| Exécuter (mode)     | `--execute` | `#A04803` | —         | dans le produit uniquement |

Contrastes mesurés (WCAG 2.2) : encre sur papier 15,7:1 ; encre sur corail 7,7:1 ; corail sur
papier 2,0:1. Le corail est donc **une surface ou un point, jamais une couleur de texte** sur
papier ; pour un lien ou un texte d’accent, utiliser `--accent-strong` (`#A83C1F`, 5,7:1).
Le bleu « créer » et le brun « exécuter » sont des repères d’état dans l’application ; ils
n’entrent pas dans la communication de marque, sauf sur une capture d’écran.

### Typographie

- **Sans (interface, texte courant)** : pile système `--font-sans` (SF Pro, Segoe UI, Roboto…).
  Aucune police téléchargée : rapidité, confidentialité, rendu natif.
- **Serif (titres éditoriaux, citations, signature)** : `--font-serif` (`ui-serif`, New York,
  Iowan Old Style, Charter, Georgia). Graisse régulière, approche légèrement resserrée
  (−1 à −2 % aux grandes tailles).
- **Mono (heures, données, code)** : `--font-mono`, chiffres tabulaires.
- **Règles** : deux familles par composition au plus (serif + sans) ; titres serif en bas de
  casse, pas en capitales ; surtitres sans en capitales espacées (+8 à +12 %) ; corps 16–18 px,
  interlignage 1,5.

### Iconographie

Le jeu d’icônes de l’interface (`apps/pouxis/src/ui/icons.tsx`) fixe la règle : grille 24 × 24,
trait 1,75, extrémités et jonctions arrondies, `currentColor`, pas de remplissage sauf un point
d’état. Les illustrations de marque suivent la même logique (trait, pas d’aplat décoratif) ; le
symbole, lui, a un trait plus épais car il doit tenir seul à 16 px.

### Images

- **Captures d’écran** d’abord : le produit est la meilleure illustration. Données d’exemple
  réalistes, jamais de faux avis ni de faux chiffres.
- **Photographie** (si nécessaire) : lumière naturelle, matières (papier, bois, lin), mains au
  travail, cadrages larges avec de l’air. Pas de banque d’images « bureau souriant ».
- **Formes** : le point corail peut servir de motif (puce, ponctuation, indicateur), jamais en
  motif répété ou en fond.

### Mouvement

- **Personnalité** : posé et précis, comme une page qu’on tourne. Les éléments entrent par
  fondu et léger glissement, sortent plus vite qu’ils n’entrent.
- **Règles** : uniquement `transform` et `opacity` ; durées `--dur-fast` (140 ms) à
  `--dur-slow` (320 ms) pour l’interface, `--dur-zen-out` (700 ms) pour la sortie du mode Focus ;
  courbes `--ease-out` à l’entrée, `--ease-in` à la sortie ; `--ease-spring` réservé aux gestes
  directs (glisser-déposer). Tout mouvement disparaît avec `prefers-reduced-motion`.
- **Animation du logo** (vidéo, écran de chargement) : le trait du « P » se dessine, puis le point
  se pose. Rien d’autre ne bouge.

### À faire / à éviter

| À faire                                | À éviter                                        |
| -------------------------------------- | ----------------------------------------------- |
| Grandes marges, une idée par écran     | Remplir chaque zone, cartes empilées            |
| Un seul accent corail par composition  | Corail en fond plein, en texte, ou en multiples |
| Fond papier chaud ou fond sombre chaud | Blanc pur `#FFFFFF` ou noir pur (sauf e-ink)    |
| Titres serif + texte sans              | Troisième famille, polices fantaisie            |
| Mouvements courts, désactivables       | Parallaxe, rebonds en boucle, confettis         |

---

## 7. Modèles pour les réseaux sociaux

| Fichier (`assets/`)          | Format      | Usage                                                             |
| ---------------------------- | ----------- | ----------------------------------------------------------------- |
| `social-og-1200x630.svg`     | 1200 × 630  | Aperçu de lien (Open Graph), site, GitHub                         |
| `social-square-1080.svg`     | 1080 × 1080 | Publication carrée (annonce d’une fonction)                       |
| `social-story-1080x1920.svg` | 1080 × 1920 | Story verticale, fond sombre ; texte dans la zone sûre y 250–1670 |

Règles : marges de 80 à 96 px ; un surtitre sans en capitales, un titre serif de trois lignes au
plus, l’assemblage horizontal en bas ou en haut à gauche, un seul point corail. Les textes des
modèles sont des balises `<text>` en polices système : remplacer le contenu, puis exporter avec
`node docs/brand/render.mjs` (le rendu dépend des polices de la machine ; vérifier l’aperçu PNG).

---

## 8. Fichiers et régénération

- Sources vectorielles : `docs/brand/assets/*.svg` (tracés écrits à la main, aucune police, aucune
  image matricielle).
- Rendus : `node docs/brand/render.mjs` depuis la racine du dépôt régénère
  `assets/app-icon-1024.png`, `png/*.png` et les icônes de `apps/pouxis/public/`. Le script utilise
  Playwright (déjà installé) ; la variable `CHROMIUM_PATH` permet de choisir le navigateur.
- Planche de marque : [`brand-sheet.html`](brand-sheet.html), autonome, consultable hors-ligne.

---

## 9. Questions ouvertes pour le fondateur

1. **Prononciation** : « pou-xis » /pu.ksis/, ou en lettres « P-O-uxis » ? Nécessaire pour la voix
   off et les présentations orales.
2. **Origine du nom** : existe-t-il une histoire à raconter ? Sinon, le nom reste sans explication,
   ce qui est un choix valable.
3. **Graphie « POuxis »** : la capitale sur le « O » est-elle définitive ? Elle est distinctive,
   mais les correcteurs automatiques et certains stores la normalisent ; confirmer avant le
   dépôt de marque.
4. **Dépôt de marque et nom de domaine** : aucune vérification d’antériorité n’a été faite dans ce
   dossier ; à mener avant le lancement public.
