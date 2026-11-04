# Script voix off — français (film principal, 105 s)

> À enregistrer par le fondateur. Les répliques sont **identiques** à `scenes[].vo.fr` de
> [`shotlist.json`](./shotlist.json), qui fait foi : en cas de modification, changer la shotlist,
> relancer `node docs/marketing/video/build.mjs`, puis reporter ici.
> Durées : fenêtre disponible dans le plan ; la réplique peut finir plus tôt, jamais plus tard.

## Intention

Vous ne présentez pas une application. Vous racontez **une journée** à quelqu'un qui en a déjà
vécu des centaines comme celle-là. Voix posée, proche du micro, sans sourire forcé. Le film
tourne en spirale autour d'une seule idée : _le temps redevient lisible_. Chaque acte s'en
rapproche un peu plus. La dernière phrase n'explique rien, elle laisse une porte ouverte.

- **Vouvoiement** (charte POuxis) : chaleureux par le rythme, pas par la familiarité.
- **Débit** : lent sur les mots lourds (« pleine », « ce moment-là », « chez vous »), plus vif sur
  la saisie et la planification. Les `[silence]` sont des respirations écrites : les tenir.
- **À éviter** : la voix « pub », l'emphase sur le nom de l'app, toute question rhétorique jouée.

## Script

```text
[OUVERTURE-BRÈCHE]                                          h01 · 00:00.60 · fenêtre 4,3 s
Le matin, la journée est souvent pleine…
avant même d’avoir commencé.
[silence — 0,5 s]

[CONTEXTE — une phrase]                                     h02 · 00:05.80 · fenêtre 5,5 s
Alors on commence par la vider.
Une phrase, telle qu’on la dirait.
[ton : simple, presque amusé]

                                                            h03 · 00:12.80 · fenêtre 3,0 s
Et elle est déjà là, sur le téléphone aussi.

[SPIRALE 1 — planifier]                                     h04 · 00:16.75 · fenêtre 6,5 s
Le reste se range autour :
chaque tâche trouve sa place,
avec de l’air entre les rendez-vous.
[« de l’air » : ralentir]

                                                            h05 · 00:24.25 · fenêtre 6,0 s
Une tâche déborde ? La suite se décale.
Les rendez-vous, eux, restent où ils sont.

                                                            h06 · 00:31.65 · fenêtre 2,4 s
Et ce qui est fait… est fait.
[silence — tout le carton h07, 3,75 s]

[SPIRALE 2 — se concentrer]                                 h08 · 00:39.35 · fenêtre 6,0 s
Planifier n’est pas le travail.
[pause]
Le travail, c’est ce moment-là.

                                                            h09 · 00:46.55 · fenêtre 4,4 s
Une tâche, un minuteur.
Rien d’autre ne réclame votre attention.

[SPIRALE 3 — penser]                                        h10 · 00:51.75 · fenêtre 5,2 s
Les idées, elles, n’arrivent jamais à l’heure.
On les dépose ici, en vrac.
[ton : plus léger, le sourire peut s’entendre ici]

                                                            h11 · 00:58.10 · fenêtre 6,2 s
Puis on prend du recul.
Sur la toile, ce qui était une liste devient une carte.

                                                            h12 · 01:05.40 · fenêtre 5,2 s
Et parfois, POuxis rapproche deux notes
qui ne se connaissaient pas.
[silence — tout le carton h13, 3,75 s]

[SPIRALE 4 — regarder le chemin]                            h14 · 01:15.40 · fenêtre 5,4 s
Le dimanche, un bilan sans jugement :
ce qui a avancé, ce qui coince.

                                                            h15 · 01:21.55 · fenêtre 3,0 s
Sans réseau ? Tout continue de fonctionner.

                                                            h16 · 01:25.50 · fenêtre 6,2 s
Sur l’iPhone, Android, le Mac ou Windows :
la même journée, synchronisée.

                                                            h17 · 01:32.90 · fenêtre 4,4 s
Vos données restent chez vous.
Vous les emportez quand vous voulez.

[SORTIE OUVERTE]                                            h18 · 01:38.70 · fenêtre 3,2 s
POuxis.
[pause]
Votre temps, en clair.
[silence jusqu’au noir — environ 3 s]
```

## Formats courts

Les formats 30 s et verticaux n’utilisent que la signature (prise séparée, plus serrée) :

| Format                     | Plan          | Réplique                       | Fenêtre |
| -------------------------- | ------------- | ------------------------------ | ------- |
| `cut-30-16x9`              | `h18-endcard` | POuxis. Votre temps, en clair. | 3,2 s   |
| `vertical-15-9x16`, `-30-` | `v05-endcard` | POuxis. Votre temps, en clair. | 2,1 s   |

Les aperçus App Store et Google Play n’ont **pas** de voix off (lecture muette par défaut).

## Variantes de secours

Si le build filmé ne contient pas la toile (`h11`) ou la sérendipité (`h12`) — voir
`CREATIVE_BRIEF.md` §8 — enregistrer aussi :

- **h11 (graphe de dépendances)** : « Puis on prend du recul. Chaque tâche attend la précédente,
  sans que vous y pensiez. »
- **h12 (brain dump trié)** : « Et chaque ligne retrouve sa place, le jour où vous voulez la
  regarder. »

## Enregistrement

- Pièce traitée ou penderie, micro à 15–20 cm, filtre anti-pop. Pas de musique au casque pendant
  la prise : le rythme vient du texte.
- WAV 48 kHz / 24 bits, mono. Trois prises par réplique, une prise « plus lente ».
- Nommage : `vo_fr_h04_take2.wav` (identifiant de plan de la shotlist).
- Laisser 1 s de silence de pièce en début de session (réduction de bruit).
