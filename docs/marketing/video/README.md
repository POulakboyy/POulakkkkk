# Films de présentation — production

Ce dossier contient la direction des films (`CREATIVE_BRIEF.md`, `STORYBOARD.md`,
`shotlist.json`, `SCRIPT_VO_FR.md` / `SCRIPT_VO_EN.md`, `MUSIC_BRIEF.md`, `subtitles/`) et la chaîne
qui les fabrique (`render/`). Les fichiers livrés sont dans `out/`.

## Livrables (`out/`)

| Fichier                                  | Format shotlist        | Usage                                     | Cadre       | Durée  |
| ---------------------------------------- | ---------------------- | ----------------------------------------- | ----------- | ------ |
| `pouxis-presentation-16x9.mp4`           | `hero-16x9`            | YouTube, site, dossier de presse          | 1920 × 1080 | 105 s  |
| `pouxis-presentation-9x16.mp4`           | `vertical-30-9x16`     | Reels, Shorts, TikTok                     | 1080 × 1920 | 30 s   |
| `pouxis-app-preview-iphone-886x1920.mp4` | `appstore-iphone`      | Aperçu App Store (iPhone, Dynamic Island) | 886 × 1920  | 27,5 s |
| `pouxis-google-play-promo-1080x1920.mp4` | `google-play-portrait` | Vidéo de fiche Google Play (via YouTube)  | 1080 × 1920 | 27,5 s |
| `pouxis-app-preview-mac-1920x1080.mp4`   | `appstore-mac`         | Aperçu Mac App Store                      | 1920 × 1080 | 27,5 s |
| `pouxis-presentation-30s-16x9.mp4`       | `cut-30-16x9`          | YouTube, LinkedIn, X, site                | 1920 × 1080 | 30 s   |
| `pouxis-presentation-15s-9x16.mp4`       | `vertical-15-9x16`     | Reels, Shorts, TikTok                     | 1080 × 1920 | 15 s   |

Pour chaque vidéo : une image d'affiche `<nom>.poster.png` (même définition), et pour les formats
avec voix off les sous-titres `<nom>.fr.srt` et `<nom>.en.srt` (copiés de `subtitles/`). Le film
principal a les sous-titres français **incrustés** ; la version anglaise est fournie en `.srt`
(sous-titres fermés YouTube, site).

Tous les fichiers sont en H.264 (profil High, niveau 4.0, 4:2:0), 30 i/s, `+faststart`, CRF 28
(fichiers versionnés : moins de 25 Mo chacun), avec une piste audio AAC stéréo 48 kHz 256 kbit/s
**silencieuse** : App Store Connect attend une piste audio, et aucune musique n'a encore été
produite (voir `MUSIC_BRIEF.md` : composition originale à commander, puis mixage sur ces montages).
La voix off n'est pas enregistrée non plus : le film principal porte le texte du script par ses
sous-titres incrustés.

`out/render-log.json` consigne, pour chaque format, la mesure ffprobe (durée, définition, cadence,
codecs, poids) comparée à la shotlist, les crochets `data-demo` résolus et les adaptations de mise
en scène appliquées.

## Re-rendre

Prérequis : dépendances du dépôt installées (`npm install`), Chromium (par défaut
`/opt/pw-browsers/chromium-1194/chrome-linux/chrome`, sinon `CHROMIUM_PATH=…`), `ffmpeg` et
`ffprobe` avec libx264 et libass, polices Inter et Bitstream Charter installées.

```sh
# Depuis la racine du dépôt — tous les formats (≈ 30 min)
node docs/marketing/video/render/render.mjs

# Quelques formats seulement
node docs/marketing/video/render/render.mjs --formats hero-16x9,appstore-iphone

# Vérifier que chaque crochet de la shotlist se résout dans le build, sans filmer
node docs/marketing/video/render/render.mjs --check-hooks

# Tests unitaires de la chaîne (planification, scène, sous-titres)
node --test docs/marketing/video/render/render.test.mjs
```

Options : `--lang en` filme l'interface en anglais (les cartons et légendes passent en anglais ;
les sous-titres incrustés restent ceux de la langue choisie), `--keep` conserve les images et
clips intermédiaires dans `render/.work/` (jamais versionné). Variables : `VIDEO_PORT` (4195 par
défaut), `VIDEO_CRF` (28), `VIDEO_SLOW` (facteur de ralenti de la capture, 3), `VIDEO_WORK_DIR`.

Le script démarre lui-même le serveur Vite (`apps/pouxis`, port 4195) s'il ne répond pas, et
l'arrête à la fin. Après une modification de `shotlist.json`, lancer d'abord
`node docs/marketing/video/build.mjs` (tableaux du storyboard et SRT), puis le rendu.

## Fonctionnement

1. **Planification** (`render/lib/plan.mjs`) : pour chaque format, la séquence de la shotlist
   devient une liste de clips en temps programme — le plan _i_ commence à la somme des durées
   précédentes, comme les SRT générés par `build.mjs`. Un fondu de _D_ ms montre le plan suivant
   _D_ ms plus tôt (pré-roll) ; « fondu au papier » passe par un clip couleur `--bg` intercalé.
2. **Scène** (`render/lib/stage.mjs`) : une page HTML au format final, fond et couleurs lus dans
   `apps/pouxis/src/design/tokens.css`. L'app réelle y tourne dans une iframe de même origine, à la
   taille de l'appareil de la shotlist, dans un **cadre générique dessiné en CSS** (téléphone à
   îlot ou à poinçon, portable à encoche ou à bord fin ; barre d'état 09:41, réseau et batterie
   pleins ; aucun visuel de constructeur). La caméra (échelle, point tenu au centre, courbe des
   tokens) est une transition CSS ; légendes et cartons sont du HTML en serif (`--font-serif`).
   Les formats de store filment l'app nue, plein cadre, sans zoom ni repère de toucher.
3. **Capture** (`render/lib/record.mjs`) : Playwright ouvre chaque scène dans un contexte neuf
   (base IndexedDB vide → jeu de démonstration de `apps/pouxis/src/store/seed.ts`), marque
   l'introduction comme faite (`pouxis:app-prefs:v1`), fixe l'horloge sur
   `fixtures.clock` (jeudi 5 novembre 2026, 09:12, Europe/Paris) et joue les actions aux instants
   prévus. Les images sont prises par le screencast de Chrome DevTools. Celui-ci plafonnant vers
   14 i/s en headless, la scène est **filmée au ralenti ×3** : temps JavaScript ralenti par une
   horloge virtuelle (`render/lib/timeshim.mjs`), temps CSS par `Animation.setPlaybackRate` ;
   les horodatages sont ramenés en temps réel, d'où ≈ 45 images utiles par seconde, rééchantillonnées
   à 30 i/s constants.
4. **Montage** (`render/lib/assemble.mjs`) : ffmpeg encode chaque clip, les enchaîne (`concat`
   pour les coupes, `xfade` pour les fondus et la poussée), incruste les sous-titres (SRT converti
   en ASS aux couleurs `--ink` sur `--bg`), ajoute la piste silencieuse, extrait l'image d'affiche,
   puis vérifie le résultat avec ffprobe.

## Écarts assumés avec la shotlist

La shotlist reste la référence (durées, caméra, légendes, voix off). Les écarts tiennent au build
filmé et sont tous listés, avec leur raison, dans `render/lib/directions.mjs` :

- **Crochets `data-demo`** : les vues ne les exposent pas encore. Chaque crochet a un repli
  explicite fondé sur les rôles et noms accessibles du build français (`render/lib/hooks.mjs`),
  vérifié par `--check-hooks` ; un crochet introuvable des deux façons fait échouer le rendu.
  Dès qu'un attribut `data-demo` existe, il est utilisé en priorité.
- **Données** : le jeu de démonstration de l'app (`seed.ts`) remplace les `fixtures` de la
  shotlist (persona et titres différents) ; aucune donnée n'est injectée hors de l'app.
- **Propagation des retards** (`h05`, `v06`, `ap03`) : filmée dans Aujourd'hui à 11:38, quand la
  tâche de 10:00–11:30 déborde — c'est là que le build la propose.
- **Focus** (`h08`, `v03`, `ap04`, `apm03`) : lancé depuis Aujourd'hui ; **mini-lecteur**
  (`h09`, `v07`) : session lancée puis réduite avant la prise.
- **Toile** (`h11`, `apm04`) : la toile est dessinée dans un `<canvas>` ; le plan part de la vue
  « Plan » (liste) et bascule sur « Toile » (carte), puis zoome au clavier.
- **Sérendipité** (`h12`, `v04`, `ap05`) : onglet « Atelier » des Idées, « Rapprocher deux idées ».
- **Polices** : sous Linux, la pile système est remplacée au rendu par Inter et Bitstream Charter
  (brief §10.3). Pour les aperçus App Store, Apple attend l'app réelle : refaire de préférence
  la capture sur un Mac et un simulateur iOS avant soumission, ou faire valider la substitution.
- **Raccourcis** : ⌘K de la shotlist est joué en Ctrl+K (même commande dans le keymap de l'app).
