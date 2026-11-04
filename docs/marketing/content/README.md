# Kit de contenu de lancement — POuxis

> Statut : v1 (2026-11-04), à relire par le fondateur avant toute publication. Ce dossier
> contient les textes ; les visuels suivent [`docs/brand/BRAND.md`](../../brand/BRAND.md) et
> les films de présentation vivent dans [`../video/`](../video/).

## Contenu du dossier

| Dossier / fichier                                              | Contenu                                                                                              |
| -------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| [`youtube/long-form-script.md`](youtube/long-form-script.md)   | Vidéo longue 10–12 min « Je construis l'app de productivité que j'ai toujours voulue (open source) » |
| [`youtube/devlog-series.md`](youtube/devlog-series.md)         | Série devlog en 8 épisodes                                                                           |
| [`youtube/shorts.md`](youtube/shorts.md)                       | 3 Shorts (≤ 45 s) : buffers, jokers de série, contraintes                                            |
| [`youtube/thumbnails-titles.md`](youtube/thumbnails-titles.md) | Concepts de miniatures (≤ 4 mots) et variantes de titres                                             |
| [`instagram/grid-plan.md`](instagram/grid-plan.md)             | Grille de lancement en 9 publications et leurs légendes                                              |
| [`instagram/carousels.md`](instagram/carousels.md)             | 3 scripts de carrousels                                                                              |
| [`instagram/reels.md`](instagram/reels.md)                     | 3 scripts de Reels                                                                                   |
| [`instagram/launch-story.md`](instagram/launch-story.md)       | Story du jour J en 7 écrans                                                                          |
| [`instagram/hashtags-bio.md`](instagram/hashtags-bio.md)       | Jeux de hashtags, bio, page « lien en bio »                                                          |
| [`launch/product-hunt.md`](launch/product-hunt.md)             | Fiche Product Hunt et premier commentaire du maker                                                   |
| [`launch/show-hn.md`](launch/show-hn.md)                       | Publication « Show HN » (anglais)                                                                    |
| [`launch/reddit.md`](launch/reddit.md)                         | Publications Reddit par communauté                                                                   |
| [`launch/launch-email.md`](launch/launch-email.md)             | E-mail de lancement (liste d'attente / newsletter)                                                   |
| [`launch/readme-hero.md`](launch/readme-hero.md)               | Propositions d'en-tête pour le `README.md` du dépôt                                                  |
| [`launch/press-kit.md`](launch/press-kit.md)                   | Dossier de presse sur une page                                                                       |
| [`CALENDAR.md`](CALENDAR.md)                                   | Calendrier éditorial sur 6 semaines                                                                  |

## Deux voix, une marque

| Canal                                                                | Qui parle                            | Registre                                                                                                                       |
| -------------------------------------------------------------------- | ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------ |
| YouTube et Instagram du fondateur (K13 Studios)                      | Le fondateur, à la première personne | Tutoiement, oralité pensée, phrases courtes, silences ; un récit, pas une publicité                                            |
| Comptes et pages POuxis (site, Product Hunt, e-mail, presse, README) | La marque                            | Vouvoiement chaleureux de [`BRAND.md` §2](../../brand/BRAND.md#2-voix-et-ton) et [`UX_WRITING.md`](../../design/UX_WRITING.md) |
| Hacker News, Reddit                                                  | Le fondateur, en développeur         | Anglais simple, technique, modeste ; aucun ton marketing                                                                       |

Les deux voix partagent les mêmes interdits : pas de superlatifs (« révolutionnaire »,
« ultime », « boostez »), pas de « prouvé scientifiquement », pas de chiffres inventés, pas de
faux témoignages, pas de vocabulaire d'échec (« en retard », « raté »). Mots de marque : clair,
calme, au même endroit, à vous, hors-ligne, ouvert. Signature : « Votre temps, en clair. »

## Garde-fous avant publication

1. **Chaque fonction citée renvoie à une ligne du
   [registre des affirmations](../stores/claims-register.md).** Une phrase ne part que si sa
   case « Vérifié dans le build » est cochée. Au 4 novembre 2026, aucune ne l'est : tout ce kit
   est donc **en attente**. Les références `C#` en marge des textes indiquent la ligne concernée.
2. **Les fonctions hors MVP 0.1** (séries et jokers 7.3, générateur de contraintes 5.4) existent
   dans le moteur `@pouxis/core` mais pas encore dans l'interface. Les contenus qui en parlent le
   disent (« dans le moteur, l'interface arrive ») ou attendent leur livraison.
3. **Toute mention scientifique** reprend la formulation et le niveau de confiance de
   [`SCIENTIFIC_BASIS.md`](../../research/SCIENTIFIC_BASIS.md). Formules autorisées : « une
   étude a observé… », « des travaux en psychologie suggèrent… ». Jamais « prouvé », jamais de
   chiffre absent du document (en particulier pas de « 23 minutes pour se reconcentrer », pas de
   « 21 jours pour une habitude », pas de « 25 minutes optimales »). Voir la
   [section 7](../../research/SCIENTIFIC_BASIS.md#7-ce-que-la-recherche-ne-soutient-pas-encore).
4. **Aucune allégation médicale ou thérapeutique** (TDAH, anxiété, burn-out) : POuxis est un
   outil d'organisation, pas un dispositif de santé.
5. **Passages ◆** : dans les scripts, les passages marqués ◆ sont des propositions d'anecdote. Le
   fondateur les remplace par un souvenir vrai ou les supprime ; on ne raconte jamais une scène
   qu'on n'a pas vécue.
6. **Prononciation et origine du nom** ne sont pas fixées ([`BRAND.md` §9](../../brand/BRAND.md#9-questions-ouvertes-pour-le-fondateur)) :
   à trancher avant le tournage. Les scripts n'inventent pas d'étymologie.
7. **Licences** : dire « open source » seulement quand le dépôt public porte ses licences
   (AGPL-3.0-or-later pour les applications et le relais, MPL-2.0 pour `@pouxis/core`, voir
   [`LICENSING.md`](../../legal/LICENSING.md)).

## Copier les textes

Les légendes et textes parlés sont écrits **une ligne par retour à la ligne**. Copier depuis le
fichier source (pas depuis l'aperçu Markdown, qui fusionne les lignes d'une même citation) et
retirer le chevron `>` en tête de ligne.

## Variables à renseigner

Aucune de ces adresses n'existe encore. Elles complètent [`../stores/urls.md`](../stores/urls.md).

| Variable               | Usage                                       |
| ---------------------- | ------------------------------------------- |
| `{{GITHUB_URL}}`       | Dépôt public (étoile, contributions)        |
| `{{WAITLIST_URL}}`     | Inscription à la liste d'attente / bêta     |
| `{{DISCORD_URL}}`      | Invitation au serveur Discord communautaire |
| `{{SITE_URL}}`         | Page d'accueil du site (`website/`)         |
| `{{YOUTUBE_URL}}`      | Chaîne YouTube K13 Studios                  |
| `{{INSTAGRAM_HANDLE}}` | Compte Instagram (fondateur ou POuxis)      |
| `{{PRESS_EMAIL}}`      | Contact presse                              |
| `{{LAUNCH_DATE}}`      | Jour J (J0 du calendrier)                   |
