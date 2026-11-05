# YouTube Shorts — 3 scripts (≤ 45 s)

> Format vertical 9:16, sous-titres incrustés (texte dans la zone sûre centrale), voix du
> fondateur, tutoiement. Une fonction, une étude, une phrase qui reste. Durées estimées à un
> débit posé ; chronométrer au tournage et couper plutôt que d'accélérer. Les mêmes scripts
> servent de Reels (voir [`../instagram/reels.md`](../instagram/reels.md) pour les variantes
> propres à Instagram).

## Short 1 — « Le temps entre deux réunions » (buffers, résidu attentionnel)

**Durée cible** : 38–42 s · **Fonction** : 1.6, réf. C7 (MVP 0.1) · **Source** : Leroy (2009) ;
Leroy et Glomb (2018) — confiance modérée sur le mécanisme, aucune durée « optimale » établie.

| Temps   | Image                                                                         | Voix                                                                                                                                                                                 | Texte à l'écran                   |
| ------- | ----------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------- |
| 0–3 s   | Visage, plan serré. Coupe sèche.                                              | « Ta réunion finit à 14 h. La suivante commence à 14 h. »                                                                                                                            | 14:00 → 14:00                     |
| 3–7 s   | Deux fenêtres de visio qui se remplacent.                                     | « Sauf que ta tête, elle, est restée dans la première. »                                                                                                                             | —                                 |
| 7–18 s  | Insert : titre de l'article de Leroy (2009) en serif sur fond papier.         | « Une chercheuse appelle ça le résidu attentionnel. Quand tu changes de tâche sans avoir fini, une partie de ton attention reste derrière. Et ça se voit sur ce que tu fais après. » | résidu attentionnel — Leroy, 2009 |
| 18–26 s | Main qui écrit une ligne sur un carnet.                                       | « Ce qui aide, d'après une autre étude : écrire une ligne avant de changer. Où j'en suis. Ce que je fais ensuite. »                                                                  | où j'en suis ? · et ensuite ?     |
| 26–36 s | Capture réelle POuxis : un espace de transition apparaît entre deux réunions. | « Alors dans mon app, entre deux réunions collées, l'agenda laisse un espace. Tu choisis sa durée. Tu y mets ta ligne. »                                                             | un buffer entre deux réunions     |
| 36–41 s | Retour visage. Silence d'une seconde avant la phrase.                         | « Le temps entre les choses, c'est pas du temps perdu. »                                                                                                                             | POuxis · open source              |

**Description** : « Le résidu attentionnel, et pourquoi mon agenda laisse un espace entre deux
réunions. Sources : Leroy 2009 (doi:10.1016/j.obhdp.2009.04.002), Leroy & Glomb 2018
(doi:10.1287/orsc.2017.1184). Code : {{GITHUB_URL}} »

**À ne pas dire** : « 23 minutes pour se reconcentrer » (chiffre non issu de ces études), « prouvé »,
« 10 minutes est la durée idéale ».

---

## Short 2 — « Ma série a cassé. Mon app m'a dit : c'est rien. » (jokers sans culpabilité)

**Durée cible** : 40–44 s · **Fonction** : 7.3 — moteur prêt (`core/insights/streak.ts`),
interface à venir : le dire à l'écran tant que ce n'est pas livré · **Sources** : Silverman et
Barasch (2022) ; Lally et al. (2010) — confiance modérée.

| Temps   | Image                                                               | Voix                                                                                                                                        | Texte à l'écran                         |
| ------- | ------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------- |
| 0–3 s   | Un compteur « 80 » qui passe à « 0 » (animation sobre, pas de son). | « Quatre-vingts jours. Puis un jour sans. Zéro. »                                                                                           | 80 → 0                                  |
| 3–8 s   | Visage.                                                             | « Et le lendemain, t'ouvres plus l'appli. T'es pas le seul. »                                                                               | —                                       |
| 8–20 s  | Insert : titre « On or off track » en serif.                        | « Une étude de 2022 a observé ça : une série cassée fait décrocher, surtout quand on s'en veut. Mais moins quand on peut la réparer. »      | Silverman & Barasch, 2022               |
| 20–28 s | Insert : « 66 jours (médiane) — Lally et al., 2010 ».               | « Et rater un jour, de temps en temps, ça ne casse pas une habitude. Et les vingt et un jours pour tout le monde ? Pas dans cette étude. »  | pas 21 jours                            |
| 28–39 s | Code `streak.ts` puis tests verts ; ou capture de l'écran si livré. | « Alors j'ai mis des jokers. Un jour sans ? Le joker le couvre. Plus de joker ? La série se met en pause. Tu reviens vite ? Elle reprend. » | jokers · pause · reprise                |
| 39–44 s | Visage. Une seconde de silence.                                     | « Une habitude, c'est pas une chaîne. C'est un sentier. »                                                                                   | POuxis · dans le moteur, l'écran arrive |

**Description** : « Des séries qui ne punissent pas. Sources : Silverman & Barasch 2022
(doi:10.1093/jcr/ucac029), Lally et al. 2010 (doi:10.1002/ejsp.674). Code : {{GITHUB_URL}} »

**À ne pas dire** : « une habitude en 21 jours », « ça guérit la procrastination », toute
allégation de santé mentale.

---

## Short 3 — « Une contrainte pour débloquer une idée » (contraintes et créativité)

**Durée cible** : 36–42 s · **Fonction** : 5.4 générateur de contraintes, réf. C21 — moteur
(`core/ideation`), interface à venir · **Source** : Haught-Tromp (2017) — confiance faible à
modérée : le dire avec prudence.

| Temps   | Image                                                                                                                                    | Voix                                                                                                                                                           | Texte à l'écran                         |
| ------- | ---------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------- |
| 0–3 s   | Page blanche, curseur qui clignote.                                                                                                      | « Page blanche. Tu peux écrire n'importe quoi. Et c'est exactement le problème. »                                                                              | n'importe quoi                          |
| 3–14 s  | Insert : titre « The Green Eggs and Ham hypothesis » en serif.                                                                           | « En 2017, une chercheuse a demandé à des gens d'écrire de courts textes, avec ou sans mots imposés. Les textes avec contrainte ont été jugés plus créatifs. » | Haught-Tromp, 2017                      |
| 14–21 s | Visage.                                                                                                                                  | « C'est une seule étude, sur des textes courts. Mais je reconnais le mécanisme : quand tout est possible, rien ne commence. »                                  | une étude, des textes courts            |
| 21–33 s | Capture ou maquette annoncée comme telle : un bouton tire une contrainte au hasard (« Et si c'était pour quelqu'un qui ne voit pas ? »). | « Alors dans POuxis, quand tu bloques, un bouton te tire une contrainte. Une seule. Elle ne te plaît pas ? T'en tires une autre. »                             | une contrainte, au hasard               |
| 33–40 s | Visage. Silence.                                                                                                                         | « La liberté totale, c'est un mur. Une contrainte, c'est une porte. »                                                                                          | POuxis · dans le moteur, l'écran arrive |

**Description** : « Pourquoi une contrainte peut aider à démarrer. Source : Haught-Tromp 2017
(doi:10.1037/aca0000061). Code : {{GITHUB_URL}} »

**À ne pas dire** : « les contraintes rendent toujours plus créatif », « boostez votre
créativité », toute affirmation sur les couleurs et la créativité (non reproduite, voir
`SCIENTIFIC_BASIS.md` §7).
