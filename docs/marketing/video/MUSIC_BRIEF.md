# Brief musical — films de présentation POuxis

> Lié à [`CREATIVE_BRIEF.md`](./CREATIVE_BRIEF.md) et à la grille rythmique de
> [`shotlist.json`](./shotlist.json) (`conventions.musicGrid`).

## 1. Intention

Une musique qui **range** au lieu de pousser. Elle doit donner l'impression d'une pièce qui se
calme : on part d'un espace saturé, on finit dans un espace vide et lumineux. Elle accompagne la
voix, elle ne la couvre jamais. Aucune montée « épique », aucun drop.

Mots-clés : chaud, feutré, précis, aéré, artisanal. Contre-mots : corporate, ukulélé et sifflets,
synthwave, cinématique à percussions lourdes.

## 2. Paramètres

| Paramètre       | Valeur                                                                                                                                                                   |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Tempo           | **96 BPM**, 4/4 (1 temps = 625 ms, 1 mesure = 2 500 ms) ; le montage coupe sur les demi-mesures                                                                          |
| Tonalité        | Majeure, claire (ré ou mi majeur conseillé) ; modulation douce possible à l'acte V                                                                                       |
| Instrumentation | Piano feutré (felt piano), marimba ou kalimba pour les « points », pad analogique chaud, contrebasse ou basse ronde, balais / shaker très discrets à partir de l'acte II |
| Dynamique       | Large : de presque rien (actes I et III) au plein modéré (acte V, `h16`)                                                                                                 |
| Mixage          | Musique au moins **12 dB sous la voix** pendant la VO ; pas de compression écrasante                                                                                     |
| Livraison       | WAV 48 kHz / 24 bits, master stéréo + **stems** (piano, percussions, pad, basse, motifs)                                                                                 |

## 3. Structure (film principal, 105 s = 42 mesures)

| Mesures | Temps         | Acte / plans      | Musique                                                                                                                                                                                                                                       |
| ------- | ------------- | ----------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1–6     | 00:00 → 00:15 | I — `h01`–`h03`   | Nappe de piano seule, notes espacées. Trois notes de marimba montantes sur les pastilles de saisie (`h02`).                                                                                                                                   |
| 7–14    | 00:15 → 00:35 | II — `h04`–`h06`  | Entrée d'une pulsation douce (shaker, basse). « Tic » feutré par bloc placé, quantifié à la croche. Glissando léger sur la propagation (`h05`). Arrêt net sur le « tock » de `h06`.                                                           |
| 15–20   | 00:35 → 00:50 | III — `h07`–`h09` | Une note grave tenue (`h07`), puis pad seul. Aucun rythme : c'est la concentration.                                                                                                                                                           |
| 21–28   | 00:50 → 01:10 | IV — `h10`–`h12`  | Retour de la pulsation, plus légère ; marimba joueur. Deux notes qui se répondent puis s'accordent sur la sérendipité (`h12`).                                                                                                                |
| 29–42   | 01:10 → 01:45 | V — `h13`–`h18`   | Respiration (`h13`), reprise en accords majeurs (`h14`), **un temps de silence total** sur le passage hors-ligne (`h15`), plein modéré sur les quatre appareils (`h16`), décrescendo (`h17`), logo sonore (`h18`) puis silence jusqu'au noir. |

Les coupes de la shotlist tombent sur des multiples de 1 250 ms : le compositeur peut caler les
accents sur `scenes[].durationMs` cumulés (tableau de `STORYBOARD.md`).

## 4. Logo sonore

Deux notes, une **quinte montante**, timbre marimba ou kalimba doublé d'un piano feutré, environ
800 ms avec résonance. Il accompagne la pose du point corail (`h18`, `v05`). Il doit fonctionner
seul (notifications marketing, fin des formats courts) et ne jamais ressembler à un son système
d'iOS, d'Android, de macOS ou de Windows.

## 5. Déclinaisons

- **30 s 16:9** et **verticaux 15/30 s** : version courte montée sur les mesures 7–14 et 29–42,
  attaque franche dès la première image (accroche), logo sonore final.
- **Aperçus App Store / Google Play** : une seule pièce continue (Apple conseille une bande-son
  unique pour la continuité), sans voix ; les sons d'interface restent audibles. Lecture muette par
  défaut : la musique est un bonus, jamais porteuse de sens.
- **Version sans musique** (voix + sons d'interface) pour le site, en option d'accessibilité.

## 6. Sons d'interface (SFX)

Courts, boisés, mixés bas : clic de touche, « tic » de placement, « tock » de tâche terminée,
souffle d'ouverture du mini-lecteur. Si l'app embarque ses propres sons, utiliser **ceux-là**
(cohérence produit). Aucun whoosh de transition, aucune alarme.

## 7. Droits et licences

Règle absolue : **aucun morceau protégé non licencié**, aucune reprise, aucun « son tendance » de
plateforme sociale sur les versions officielles.

Deux voies, par ordre de préférence :

1. **Commande originale** à un compositeur, avec cession ou licence **exclusive, mondiale, tous
   médias, durée illimitée**, couvrant : publicité payante, stores (App Store, Google Play),
   YouTube, réseaux sociaux, site, salons. Contrat écrit précisant que l'œuvre **n'est pas
   enregistrée dans Content ID** ni dans un système d'identification équivalent (ou que la chaîne
   POuxis est mise en liste blanche). Livraison des stems incluse.
2. **Bibliothèque libre de droits** (catalogues sur abonnement ou à l'achat) : vérifier sur la
   licence elle-même, avant achat, l'usage publicitaire, les stores d'applications, tous les
   territoires, la durée après fin d'abonnement et la gestion des revendications Content ID.
   Archiver la licence (PDF) avec l'identifiant du morceau dans le dossier de production.

Pourquoi c'est critique ici : Google Play exige une vidéo YouTube **sans publicité** ; l'aide Play
Console précise que si la vidéo contient un contenu protégé revendiqué, désactiver la monétisation
peut ne pas suffire et qu'il faut alors une autre vidéo (voir `CREATIVE_BRIEF.md` §7.2). Apple
demande de ne montrer que du contenu pour lequel on détient les droits, dans tous les territoires.

Les licences Creative Commons « NC » (pas d'usage commercial) et « ND » sont **exclues** ;
CC0 ou CC BY sont acceptables si l'attribution est possible partout où la vidéo est diffusée
(impossible dans un aperçu App Store : préférer la commande).

## 8. Livrables attendus

- `music_hero_96bpm_master.wav` + stems ; `music_cut30.wav` ; `music_vertical15.wav` ;
  `music_vertical30.wav` ; `music_preview_27s5.wav` ; `sonic_logo.wav`.
- Fichier de cue sheet (titre, compositeur, éditeur, durée, licence) pour chaque format.
