# Captures d'écran des stores

Séries de captures marketing de POuxis pour l'App Store (iPhone, iPad, Mac), Google Play et le
Microsoft Store, en français et en anglais. Toutes sont rendues **à partir de l'application
réelle** (données de démonstration, horloge fixée) par le compositeur de
`docs/marketing/stores/render/` : aucune maquette retouchée.

Le plan éditorial (ordre, écrans, légendes) est celui de `../screenshots.md` ; les règles des
stores sont dans `../LIMITS.md`.

## Contenu

```text
screenshots/
  fr/ et en/
    ios-phone/       8 captures 1320 × 2868 (iPhone 6,9 pouces)
    ipad/            8 captures 2064 × 2752 (iPad 13 pouces)
    mac/             8 captures 2880 × 1800 (Mac, 16:10)
    windows/         8 captures 1920 × 1080 (Microsoft Store, bureau)
    android-phone/   8 captures 1080 × 1920 (Google Play, 9:16)
                     + feature-graphic-1024x500.png (image de présentation)
    manifest.json    fichier, légende et texte alternatif de chaque image
website/assets/screens/
  fr/ et en/         4 visuels pour la page d'accueil (fond transparent, densité 2×)
                     + manifest.json (dimensions)
```

Chaque fichier est nommé `NN-scène.png` : le numéro donne l'ordre de dépôt dans la console du
store.

## Les séries

Même semaine fictive (jeudi 5 novembre 2026, Paris), mêmes projets, même ordre en français et en
anglais ; seule la langue change. Une capture = un bénéfice, une légende de la liste de
`screenshots.md`, précédée d'un surtitre (le nom de la zone de l'app) et d'un seul point corail.

| #   | iPhone                     | iPad                     | Mac                        | Windows                    | Google Play                |
| --- | -------------------------- | ------------------------ | -------------------------- | -------------------------- | -------------------------- |
| 1   | Aujourd'hui                | Semaine (Calendrier)     | Aujourd'hui                | Aujourd'hui                | Aujourd'hui                |
| 2   | Capture en langage naturel | Capture sur la semaine   | Fenêtre de capture globale | Fenêtre de capture globale | Capture en langage naturel |
| 3   | Tâche qui déborde          | Toile                    | Barre de commande          | Capture en langage naturel | Tâche qui déborde          |
| 4   | Mode Focus                 | Tableau Kanban           | Semaine et temps tampon    | Tâche qui déborde          | Mode Focus                 |
| 5   | Idées                      | Mode Focus               | Plage de création protégée | Mode Focus (plein écran)   | Idées                      |
| 6   | Toile                      | Rencontre fortuite       | Toile                      | Toile                      | Toile                      |
| 7   | Carte de l'énergie         | Création et organisation | Mode Focus (plein écran)   | Carte de l'énergie         | Carte de l'énergie         |
| 8   | Confidentialité            | Export des données       | Point de la semaine        | Export des données         | Confidentialité            |

Écarts assumés par rapport au plan :

- **iPhone** : 8 captures au lieu de 9. La capture « synchronisation chiffrée » attend que la
  synchronisation soit vérifiée dans le build (registre des affirmations, C26).
- **Google Play, capture 5** : le partage depuis le menu d'Android n'est pas livré (C19). La
  boîte d'idées et la légende iPhone « Vos idées, notées en secondes » la remplacent.
- **Windows** : 1920 × 1080 (accepté : minimum 1366 × 768, maximum 3840 × 2160). Pour livrer
  en 4K, doubler `size` et `region` du format `windows` dans `render/lib/formats.mjs`.

## Choix de composition

- **Fond** : papier chaud issu des tokens (`--bg-elevated` → `--bg` → `--surface-2`), lu dans
  `apps/pouxis/src/design/tokens.css` à chaque rendu : les visuels ne dérivent jamais de l'app.
- **Typographie** : légende en serif de marque (`--font-serif`), surtitre sans en capitales
  espacées, un seul accent corail (le point du surtitre), conformément à `docs/brand/BRAND.md`.
  Texte `--ink` sur papier : contraste supérieur à 15:1.
- **Cadres** : dessinés en CSS, formes génériques (coins arrondis, pastille de caméra, barre
  d'état neutre) ; aucune silhouette ni illustration de fabricant. Barre d'état propre :
  batterie et réseau pleins, heure de la scène.
- **Portrait** (iPhone, iPad, Google Play) : légende en haut, appareil centré. **Paysage**
  (Mac, Windows) : légende à gauche, fenêtre à droite, ce qui laisse à la fenêtre une hauteur
  de travail réaliste.
- **Google Play** : ni cadre d'appareil ni main (règle Play) ; capture à coins arrondis. La
  légende occupe moins de 10 % de l'image (limite : 20 %).
- **Capture globale** (Mac, Windows) : la fenêtre de capture flotte au-dessus d'un document
  neutre (lignes grises), sans application tierce identifiable.
- **PNG** : opaques, 24 bits (ou palette sans transparence si nécessaire), chacun sous 1,5 Mo ;
  les visuels du site gardent leur transparence.

## Régénérer

Prérequis : dépendances installées (`npm install`), Chromium de Playwright, `ffmpeg`.

```sh
# 1. Serveur de l'app avec la poignée du store exposée (sert au passage en anglais)
cd apps/pouxis && VITE_POUXIS_PERF=1 npx vite --port 4196 --strictPort

# 2. Dans un autre terminal, depuis la racine du dépôt
node docs/marketing/stores/render/render.mjs                       # tout (≈ 25 min)
node docs/marketing/stores/render/render.mjs --formats mac --langs en --no-heroes

# 3. Vérifier dimensions, opacité, poids et nombre de captures
node docs/marketing/stores/render/validate.mjs
node --test docs/marketing/stores/render/render.test.mjs
```

Variables utiles : `SHOTS_PORT` ou `SHOTS_APP_URL` (autre serveur), `CHROMIUM_PATH`,
`SHOTS_OUT_DIR`, `SHOTS_HERO_DIR`, `SHOTS_WORK_DIR` (captures brutes, ignorées par Git).

Fonctionnement : pour chaque image, `render.mjs` ouvre un contexte de navigateur neuf (démo
réinitialisée), fixe l'horloge et le fuseau `Europe/Paris`, passe l'accueil, applique les marges
de sécurité de l'appareil, amène l'app dans l'état de la scène (`render/lib/scenes.mjs`, par les
noms accessibles tirés des dictionnaires de l'app), capture l'écran à la taille logique de
l'appareil, compose le visuel en HTML (`render/lib/compose.mjs`), le photographie à la taille
exacte du store, puis l'aplatit et l'optimise.

### Modifier

- **Une légende** : la changer dans `../screenshots.md` (les deux langues), puis relancer.
- **Un écran** : modifier la liste `frames` du format dans `render/lib/formats.mjs` ; une
  nouvelle scène s'ajoute dans `render/lib/scenes.mjs`, avec son texte alternatif.
- **Les données anglaises** : la démo (`apps/pouxis/src/store/seed.ts`) est écrite en français ;
  son miroir anglais est `render/lib/seed-en.mjs`. Une chaîne ajoutée à la démo sans traduction
  reste en français dans les séries anglaises : la compléter.

## Limites connues

- **Polices** : la machine de rendu (Linux) n'a ni SF Pro ni New York ; Inter et Bitstream
  Charter les remplacent (DejaVu Sans pour le symbole ⌘). Sur un appareil Apple, l'interface
  s'affiche dans les polices système. Avant une soumission Apple, relancer le rendu sur un Mac
  pour que les captures reflètent exactement l'app.
- **Build** : les captures viennent du serveur de développement ; les statistiques de rendu de
  la Toile, propres au développement, sont masquées.
- **Affirmations** : une capture ne part en soumission que si la fonction montrée est cochée
  dans `../claims-register.md`.
- **Textes alternatifs** : `manifest.json` reprend la légende puis décrit l'écran, à coller dans
  le champ prévu de Google Play.
