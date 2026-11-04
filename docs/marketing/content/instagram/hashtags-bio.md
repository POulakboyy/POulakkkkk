# Hashtags, bio et page « lien en bio »

## Jeux de hashtags (FR)

Règle : un jeu court par publication (3 à 5 hashtags), placé en fin de légende après une ligne
vide. Chaque hashtag doit décrire réellement le contenu ; pas de hashtag générique « pour
l'algorithme ». Avant le premier usage, ouvrir chaque hashtag sur Instagram pour vérifier qu'il
n'est pas restreint et que les publications récentes correspondent au sujet.

| Jeu               | Usage                                   | Hashtags                                                            |
| ----------------- | --------------------------------------- | ------------------------------------------------------------------- |
| A — Construire    | Devlog, coulisses, code                 | `#buildinpublic` `#opensource` `#devlog` `#développeur` `#indiedev` |
| B — Temps         | Agenda, buffers, planification          | `#gestiondutemps` `#organisation` `#agenda` `#planification`        |
| C — Attention     | Focus, transitions, une chose à la fois | `#concentration` `#travailprofond` `#deepwork` `#attention`         |
| D — Créer         | Contraintes, idées, page blanche        | `#créativité` `#processuscréatif` `#idées` `#écriture`              |
| E — Données à soi | Local-first, chiffrement, vie privée    | `#vieprivée` `#localfirst` `#logiciellibre` `#chiffrement`          |
| F — Lancement     | Jour J uniquement                       | `#POuxis` `#opensource` `#applimobile` `#productivité`              |

Correspondance avec la grille : 1 → A · 2 → E · 3 → C · 4 → A · 5 → B · 6 → C · 7 → E · 8 → C ·
9 → F.

Le mot `#productivité` est volontairement réservé au jour J : la marque évite le vocabulaire de
la « productivité maximale » ([`BRAND.md` §2](../../../brand/BRAND.md#mots-de-la-marque)).

## Bio

### Compte du fondateur (K13 Studios)

Limite Instagram : 150 caractères. Trois options :

1. `Je pense à voix haute. En vidéo, en mots, en code.\nJe construis POuxis : agenda, tâches, idées. Open source.` (108 caractères)
2. `Des vidéos sur le temps, l'attention et ce qu'on en fait.\nEn ce moment : je code POuxis, en public.` (99 caractères)
3. `K13 Studios · récits, idées, code.\nPOuxis : l'app que je construis en public ↓` (78 caractères)

### Compte POuxis

`Agenda, tâches et idées au même endroit.\nHors-ligne d'abord. Code ouvert.\nVotre temps, en clair.` (96 caractères)

> Le décompte inclut les retours à la ligne (`\n` = 1 caractère). Recompter après toute
> modification.

## Page « lien en bio »

Une page simple sur le site (`{{SITE_URL}}/liens`), plutôt qu'un service tiers qui ajoute du
suivi : cohérent avec la promesse vie privée. Contenu, dans cet ordre :

| Ordre | Libellé du bouton              | Destination                                                  | Sous-texte                                             |
| ----- | ------------------------------ | ------------------------------------------------------------ | ------------------------------------------------------ |
| 1     | Rejoindre la bêta              | `{{WAITLIST_URL}}`                                           | Un e-mail quand une version est prête à tester.        |
| 2     | Voir le code sur GitHub        | `{{GITHUB_URL}}`                                             | Lire, vérifier, contribuer.                            |
| 3     | Discuter sur Discord           | `{{DISCORD_URL}}`                                            | Idées, retours, questions.                             |
| 4     | Regarder la vidéo de lancement | `{{YOUTUBE_URL}}`                                            | « Je construis l'app que j'ai toujours voulue. »       |
| 5     | Lire la base scientifique      | `{{GITHUB_URL}}/blob/main/docs/research/SCIENTIFIC_BASIS.md` | Les études derrière chaque fonction, et leurs limites. |

En-tête de la page : symbole POuxis, puis « Votre temps, en clair. » Pied de page : « Cette page
ne dépose aucun cookie et ne mesure rien. » (à n'écrire que si c'est vrai pour la page publiée).
