# Calendrier éditorial — 6 semaines

> J0 = `{{LAUNCH_DATE}}`, jour où le dépôt public et la liste d'attente sont en ligne. Semaines 1–2
> avant J0 (préparation), semaine 3 = lancement, semaines 4–6 = suite. Les publications « produit »
> ne partent que si leurs affirmations sont cochées dans le
> [registre](../stores/claims-register.md) ; sinon on décale ou on remplace par un contenu
> « coulisses ». Les canaux sont ceux du fondateur (YouTube, Instagram, X, LinkedIn) et le
> Discord communautaire.

## Objectifs

| #   | Objectif                                                | Indicateurs suivis                                                                                  |
| --- | ------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| O1  | Faire comprendre la boucle et la promesse               | Rétention à 30 s et durée moyenne de visionnage (YouTube) ; enregistrements et partages (Instagram) |
| O2  | Constituer une liste d'attente de personnes intéressées | Inscriptions à la liste d'attente, par source (paramètre `?src=` sur le lien, sans traceur tiers)   |
| O3  | Attirer des contributeurs et contributrices             | Étoiles, _issues_ ouvertes par des personnes extérieures, premières _pull requests_                 |
| O4  | Faire naître une communauté de retours                  | Membres Discord actifs (au moins un message), retours qualifiés sur les 5 premières minutes         |
| O5  | Asseoir la crédibilité                                  | Commentaires citant la base scientifique ; corrections signalées et traitées                        |

Aucune cible chiffrée n'est fixée : il n'existe pas encore de données de référence. À la fin de la
semaine 3, les valeurs observées deviennent la base ; les objectifs des semaines suivantes s'en
déduisent. Les métriques se relèvent chaque vendredi dans un tableau simple (date, canal, valeur,
commentaire), sans outil d'analytique ajouté au produit.

## Vue d'ensemble

| Semaine          | Thème        | YouTube                                 | Instagram                                 | X                                        | LinkedIn                              | Discord                                           |
| ---------------- | ------------ | --------------------------------------- | ----------------------------------------- | ---------------------------------------- | ------------------------------------- | ------------------------------------------------- |
| S1 (J-14 → J-8)  | Le problème  | Short 1 (buffers)                       | Post 1 (teaser), Post 2 (citation)        | Fil : « sept applis pour une journée »   | Billet : pourquoi local-first         | Ouverture discrète aux proches, salons de base    |
| S2 (J-7 → J-1)   | La méthode   | Short 2 (jokers)                        | Reel 1 (= post 3), Carrousel 1 (= post 4) | Extraits de code du moteur, 1/jour       | Billet : choix des licences           | Règles, salon #retours, test de l'onboarding      |
| S3 (J0 → J+6)    | Le lancement | **Vidéo longue** (J0) ; Short 3 (J+3)   | Reel 2 (= post 5), Story J0, Post 9 (J0)  | Fil de lancement, Show HN relayé         | Annonce + dossier de presse           | Ouverture publique, session questions (J+2)       |
| S4 (J+7 → J+13)  | La preuve    | Devlog 1 « Cent idées, une boucle »     | Post 6 (citation), Reel 3 (= post 7)      | Réponses aux retours, changelog          | Billet : ce que le lancement a appris | Premier tri public des retours                    |
| S5 (J+14 → J+20) | L'honnêteté  | Devlog 2 « Le cerveau sans dépendance » | Carrousel 3 (= post 8)                    | Fil : « ce que la recherche ne dit pas » | Billet : la base scientifique         | « Bonnes premières issues » étiquetées            |
| S6 (J+21 → J+27) | La suite     | Devlog 3 « Une phrase, une journée »    | Carrousel 2, Story « ce qui a changé »    | Feuille de route mise à jour             | Bilan de six semaines                 | Vote sur la prochaine fonction (vote consultatif) |

> Les numéros de posts Instagram suivent [`instagram/grid-plan.md`](instagram/grid-plan.md) : la
> grille de 9 est complète à la fin de la semaine 5 ; le carrousel 2 et les stories de S6 viennent
> au-dessus.

## Détail par semaine

### S1 — Le problème (J-14 → J-8)

| Jour | Canal     | Contenu                                                      | Source                                     |
| ---- | --------- | ------------------------------------------------------------ | ------------------------------------------ |
| J-14 | Instagram | Post 1 — teaser « sept applis pour une journée »             | `instagram/grid-plan.md`                   |
| J-13 | X         | Fil de 5 messages : le problème, sans nommer l'app           | Reprendre le [CONTEXTE] de la vidéo longue |
| J-12 | YouTube   | Short 1 — buffers et résidu attentionnel                     | `youtube/shorts.md`                        |
| J-11 | LinkedIn  | Billet : « Pourquoi mon app fonctionne sans réseau »         | ADR 0003, 0004                             |
| J-10 | Instagram | Post 2 — citation « être organisé n'est pas être surveillé » | `instagram/grid-plan.md`                   |
| J-9  | Discord   | Serveur ouvert aux premiers testeurs invités                 | —                                          |

**Objectif de la semaine** : O1. **Point de vigilance** : ne pas encore promettre de date ferme.

### S2 — La méthode (J-7 → J-1)

| Jour | Canal     | Contenu                                                    | Source                                                       |
| ---- | --------- | ---------------------------------------------------------- | ------------------------------------------------------------ |
| J-7  | Instagram | Post 3 — Reel 1 « le temps entre deux réunions »           | `instagram/reels.md`                                         |
| J-6  | YouTube   | Short 2 — jokers sans culpabilité                          | `youtube/shorts.md`                                          |
| J-5  | LinkedIn  | Billet : MPL pour le moteur, AGPL pour les apps            | `launch/reddit.md` (r/opensource), `docs/legal/LICENSING.md` |
| J-4  | Instagram | Post 4 — carrousel « cent idées, une boucle »              | `instagram/carousels.md`                                     |
| J-3  | X         | Annonce de la date de lancement + lien liste d'attente     | `{{WAITLIST_URL}}`                                           |
| J-2  | Discord   | Test de l'onboarding avec les invités ; corrections        | —                                                            |
| J-1  | Tous      | Gel : vérification du registre, des liens, des sous-titres | `README.md` (garde-fous)                                     |

**Objectifs** : O1, O2.

### S3 — Le lancement (J0 → J+6)

| Jour | Canal        | Contenu                                               | Source                        |
| ---- | ------------ | ----------------------------------------------------- | ----------------------------- |
| J0   | YouTube      | Vidéo longue « Je construis l'app de productivité… »  | `youtube/long-form-script.md` |
| J0   | Instagram    | Story 7 écrans + post 9 « jour J »                    | `instagram/launch-story.md`   |
| J0   | E-mail       | E-mail de lancement à la liste d'attente              | `launch/launch-email.md`      |
| J0   | X, LinkedIn  | Annonce, lien vers la vidéo et le dépôt               | —                             |
| J+1  | Hacker News  | Show HN (si un build est essayable)                   | `launch/show-hn.md`           |
| J+1  | Product Hunt | Fiche (si un build est installable ; sinon reporter)  | `launch/product-hunt.md`      |
| J+2  | Discord      | Session questions-réponses en direct (texte ou vocal) | —                             |
| J+3  | YouTube      | Short 3 — contraintes                                 | `youtube/shorts.md`           |
| J+4  | Instagram    | Post 5 — Reel 2 « une phrase, une journée »           | `instagram/reels.md`          |
| J+5  | Reddit       | r/selfhosted (une communauté par jour, règles relues) | `launch/reddit.md`            |
| J+6  | Presse       | Envoi du dossier de presse à une courte liste ciblée  | `launch/press-kit.md`         |

**Objectifs** : O2, O3. **Règle** : Show HN et Product Hunt pas le même jour que la vidéo, pour
pouvoir répondre à chaque commentaire.

### S4 — La preuve (J+7 → J+13)

- YouTube : Devlog 1. Instagram : post 6 (citation séries), post 7 (Reel 3 mode avion).
- Reddit : r/opensource (J+8), r/SideProject (J+11).
- X : un message par correctif livré suite à un retour (« signalé par… », avec accord).
- LinkedIn : billet « ce que le lancement m'a appris », avec les métriques **observées** de S3.
- Discord : tri public des retours, étiquettes sur les issues.
- **Objectifs** : O3, O4.

### S5 — L'honnêteté (J+14 → J+20)

- YouTube : Devlog 2. Instagram : post 8 (carrousel « ce que la recherche ne dit pas »).
- Reddit : r/productivity (fil dédié aux outils si c'est la règle).
- X et LinkedIn : la base scientifique, ses niveaux de confiance, ses refus.
- Discord : « bonnes premières issues » pour accueillir des contributions.
- **Objectifs** : O5, O3.

### S6 — La suite (J+21 → J+27)

- YouTube : Devlog 3. Instagram : carrousel 2, story « ce qui a changé grâce à vous ».
- Reddit : r/developpeurs (FR), si la communauté s'y prête.
- LinkedIn : bilan de six semaines (chiffres observés, ce qui a marché, ce qui n'a pas marché).
- Discord : vote consultatif sur la prochaine fonction, résultats publiés tels quels.
- **Objectifs** : O4, revue de tous les objectifs ; préparation du cycle suivant (devlogs 4–8).

## Règles transverses

- **Une publication produit = une preuve** : capture réelle, démonstration ou lien vers le code.
- **Pas de publication pour remplir** : si un contenu n'est pas prêt, on décale plutôt que de
  publier un contenu faible.
- **Correction publique** : une erreur signalée (fonction, chiffre, source) est corrigée sur le
  contenu et mentionnée dans le canal concerné.
- **Accessibilité** : sous-titres sur toutes les vidéos, texte alternatif sur toutes les images,
  pas d'information portée par la couleur seule.
- **X et LinkedIn** : textes dérivés des contenus de ce kit (pas de nouvelle affirmation) ; sur
  LinkedIn, vouvoiement et ton de la marque ; sur X, voix du fondateur.
