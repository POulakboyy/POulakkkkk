# Vidéo longue — « Je construis l'app de productivité que j'ai toujours voulue (open source) »

> Chaîne : K13 Studios. Durée visée : 10 à 12 min (environ 1 500 mots parlés à un débit posé, pauses,
> silences et plans de démonstration compris). Voix : le fondateur, tutoiement, monologue en spirale. Garde-fous : voir
> [`../README.md`](../README.md#garde-fous-avant-publication). Passages ◆ = anecdote à remplacer
> par un souvenir vrai ou à supprimer.

## Repères de production

- **Cadre principal** : plan fixe, lumière naturelle de côté, fond sobre (bois, papier, lin).
  Pas de « setup » de bureau surchargé : la vidéo parle justement de retirer du bruit.
- **Écran** : captures réelles de POuxis uniquement, données d'exemple réalistes, jamais de faux
  chiffres. Si une vue n'est pas prête, on montre le code ou le moteur qui tourne dans un
  terminal, et on le dit.
- **Musique** : absente ou presque. Une nappe discrète sur les B-rolls, coupée net avant chaque
  phrase forte. Le silence est l'instrument.
- **Texte à l'écran** : serif en bas de casse, un seul point corail par plan
  ([`BRAND.md` §6](../../../brand/BRAND.md#6-langage-visuel)). Sous-titres FR incrustés et piste
  EN.
- **Convention** : `[B-ROLL]` image de coupe · `[ÉCRAN]` texte incrusté · `[silence]` deux
  secondes de vide · `[pause]` une seconde.

## Chapitres (description YouTube)

```
00:00 Le jour où mon agenda a gagné
00:45 Sept applis pour une seule journée
02:15 Une phrase, une journée
03:30 Spirale 1 — Le temps entre les choses
05:30 Spirale 2 — La série qui casse
07:30 Spirale 3 — Ce qui t'appartient
09:30 Ce que j'ai déjà construit (et ce qui manque)
10:45 Pourquoi je le fais en public
11:30 La porte reste ouverte
```

---

## [OUVERTURE-BRÈCHE] — 00:00

[Plan serré, regard caméra. Aucun logo, aucune musique.]

J'ai une application qui me dit quoi faire à chaque heure de ma journée.
[pause]
Une autre qui me dit ce que j'ai oublié.
Une troisième qui me dit que j'ai cassé ma série.
[silence]
Et aucune ne m'a jamais demandé si j'avais besoin de respirer entre deux choses.

[ÉCRAN : « alors je la construis. »]

Alors je la construis. Et je te montre tout. Le code aussi.

> Les 15 premières secondes s'arrêtent ici. Pas de « salut à tous », pas d'appel à l'abonnement.

## [CONTEXTE] — 00:45 · « Sept applis pour une seule journée »

[B-ROLL : un téléphone posé, écran allumé, notifications qui s'empilent en silence. Puis la main
qui le retourne.]

◆ Un mardi, j'ai compté. Un agenda pour les rendez-vous. Une liste de tâches pour le reste. Une
appli de notes pour les idées. Une autre pour les idées « sérieuses ». Un minuteur. Un tracker
d'habitudes. Et un tableau blanc, pour quand tout ça ne suffisait plus.
[pause]
Sept endroits pour une seule journée.

Le problème, c'est pas qu'il y en ait sept. Le problème, c'est que chacune pense être le centre.
Chacune veut ton attention. Chacune a son petit badge rouge, sa petite alarme, sa petite façon de
te dire que tu n'en fais pas assez.

[ÉCRAN : « productivité = culpabilité ? »]

Et à force, j'ai fini par confondre deux choses. Être organisé… et être surveillé.
[silence]

Alors j'ai écrit une liste. Pas une liste de tâches. Une liste de tout ce que je voudrais qu'un
outil fasse pour moi. Elle a fini par faire cent lignes.
[B-ROLL : le document `docs/BRIEF.md` qui défile, lentement.]
Cent idées. Et je sais très bien qu'aucune app ne devrait en avoir cent. Donc ce que je te montre
aujourd'hui, ce n'est pas les cent. C'est le cœur. Une boucle : capturer, planifier, se
concentrer, faire le bilan.

[ÉCRAN : capturer → planifier → se concentrer → faire le bilan]

Ça s'appelle POuxis. <!-- prononciation à trancher, BRAND.md §9 --> C'est open source, ça
marche sans connexion, et tes données restent chez toi.

## [DÉMO — Une phrase, une journée] — 02:15

[ÉCRAN plein cadre : capture réelle, vitesse 1×, aucune accélération. Réf. C4, C5.]

Je te montre plutôt que de t'expliquer.
[pause]
J'écris : « Réunion projet mardi 14 h-16 h ».
[Les fragments reconnus se surlignent : « mardi », « 14 h-16 h ».]
Huit mots. L'app a compris le jour, l'heure de début, l'heure de fin. L'événement est là, dans la
semaine.

Maintenant j'ajoute trois tâches. Une de deux heures, une d'une heure, une de vingt minutes. Je ne
leur donne pas d'heure. Je leur donne juste une durée.
[Les tâches se placent dans les créneaux libres, autour de la réunion.]
Elles trouvent leur place toutes seules, dans les trous de la journée. Et la réunion, elle, ne
bouge pas. Ce qui est fixe reste fixe.
[Toucher une tâche : une ligne explique pourquoi elle est là.]
Et si je me demande pourquoi celle-ci est à 10 h, l'app me le dit. En une phrase. Je ne veux pas
d'une boîte noire qui décide de ma journée à ma place.
[pause]
Et si le plan ne me plaît pas ? J'annule. Tout revient exactement comme avant.

◆ La première fois que ça a marché sur mon écran, j'ai pas crié, j'ai pas sauté. J'ai juste
regardé ma journée. Et pour une fois, elle avait l'air… respirable.
[silence]

Mais une journée bien rangée, ça ne suffit pas. Ce qui m'intéresse, c'est ce qui se passe dans
les interstices.

## [SPIRALE 1 — Le temps entre les choses] — 03:30

**Anecdote.**
◆ Tu connais ce moment. Une réunion finit à 14 h. La suivante commence à 14 h. Tu fermes une
fenêtre, t'en ouvres une autre, et tu dis « oui, oui, je suis là ». Sauf que t'es pas là.
T'es encore dans la réunion d'avant. Dans la phrase que t'as pas finie.
[pause]

**Réflexion.**
Il y a une chercheuse, Sophie Leroy, qui a donné un nom à ça en 2009 : le résidu attentionnel.
Quand tu passes à une tâche alors que la précédente n'est pas terminée, une partie de ta tête
reste derrière. Et ça se voit sur ce que tu fais ensuite.
[ÉCRAN : « résidu attentionnel — Leroy, 2009 »]
Et le plus intéressant, c'est la suite. En 2018, avec Theresa Glomb, elle montre qu'un geste tout
bête réduit ce résidu : avant de changer de tâche, écrire un petit plan pour reprendre. Où j'en
suis. Ce que je fais ensuite. Une ligne.
[pause]
Attention, je ne vais pas te dire que c'est « prouvé » que tu seras plus productif. Ce sont des
études en laboratoire, sur des tâches courtes. Mais le mécanisme, lui, je le reconnais. Et toi
aussi, je crois.

[ÉCRAN : capture réelle — deux réunions consécutives, un espace de transition qui apparaît entre
elles. Réf. C7.]

Alors dans POuxis, entre deux réunions collées, l'agenda laisse un espace. Un buffer. Sa durée,
c'est toi qui la règles, parce qu'aucune étude ne dit combien de minutes il faut. Et ce qui
compte, c'est ce que tu y mets : une ligne pour te dire où tu en étais.

**Image forte.**
Le temps entre les choses, c'est pas du temps perdu.
[pause]
C'est la porte qu'on referme doucement pour ne pas la claquer.
[silence]

## [SPIRALE 2 — La série qui casse] — 05:30

**Anecdote.**
◆ J'ai eu une série de quatre-vingts jours dans une appli de langue. Le quatre-vingt-unième, j'étais
malade. Le compteur est retombé à zéro. Et je ne l'ai jamais rouverte.
[pause]
C'est fou, non ? Quatre-vingts jours de travail, et c'est un seul jour qui a gagné.

**Réflexion.**
J'ai cherché si j'étais le seul. En 2022, deux chercheuses, Jackie Silverman et Alixandra
Barasch, ont étudié les séries sur sept études. Ce qu'elles observent : une série intacte pousse
à continuer, une série cassée fait décrocher. Surtout quand on s'en veut. Mais l'effet est
atténué quand on peut réparer la série.
[ÉCRAN : « une série qu'on peut réparer fait moins décrocher — Silverman & Barasch, 2022 »]
Et une autre étude, plus ancienne, de Phillippa Lally et son équipe, sur la formation des
habitudes : rater une occasion de temps en temps n'a pas compromis sensiblement le processus.
[pause]
Au passage : dans cette étude, il a fallu en médiane soixante-six jours, avec énormément de
variations d'une personne à l'autre. Pas vingt et un. Les vingt et un jours pour tout le monde,
ça ne vient pas de là.

[ÉCRAN : `packages/core/src/insights/streak.ts` dans l'éditeur, puis les tests qui passent en
vert dans le terminal. Réf. 7.3 — moteur prêt, interface à venir.]

Alors j'ai écrit des jokers. Chaque semaine, tu en as quelques-uns. Un jour sans création ? Le
joker le couvre, la série continue. Plus de joker ? La série se met en pause. Elle ne meurt pas.
Tu reviens dans les jours qui suivent, elle reprend là où elle s'était arrêtée.
C'est dans le moteur aujourd'hui. L'écran arrive.

**Image forte.**
Une habitude, c'est pas une chaîne.
[pause]
C'est un sentier. Il ne disparaît pas parce que t'as pas marché dessus un mardi.
[silence]

## [SPIRALE 3 — Ce qui t'appartient] — 07:30

**Anecdote.**
◆ Un jour, une appli que j'utilisais tous les jours a changé ses conditions. Rien de dramatique.
Juste une ligne. Et j'ai réalisé que mes notes, mes idées, des années de pensée… vivaient chez
quelqu'un d'autre.
[pause]

**Réflexion.**
Il y a une façon de construire du logiciel qui s'appelle le local-first. L'idée est simple : la
vraie copie de tes données, c'est celle qui est sur ton appareil. Pas celle du serveur. L'app
s'ouvre sans réseau, elle répond tout de suite, et la synchronisation devient un service, pas une
condition.
[B-ROLL : mode avion activé sur le téléphone, l'app qui continue de répondre normalement.
Réf. C1.]
Pour que ton téléphone et ton ordi se mettent d'accord sans se marcher dessus, j'utilise ce
qu'on appelle un CRDT. Chaque champ de chaque élément porte une horloge, et quand deux appareils
se retrouvent, ils convergent vers le même état. Sans demander qui a raison.
[ÉCRAN : schéma simple — téléphone ⇄ relais ⇄ ordinateur, cadenas sur le relais. Réf. C26.]
Et le serveur qui fait le lien ? Il ne voit rien. Tout est chiffré sur ton appareil avant de
partir. Il transporte des enveloppes fermées. Tu peux même l'héberger toi-même.
[pause]
Et le code est ouvert. Tu n'as pas besoin de me croire : tu peux lire.

**Image forte.**
On dit souvent que si c'est gratuit, c'est toi le produit.
[pause]
Ici, je voudrais que ce soit plus simple que ça. C'est gratuit, c'est ouvert… et c'est à toi.
[silence]

## [CE QUI EST FAIT, CE QUI MANQUE] — 09:30

[Ton plus direct, presque technique. Plan d'écran + insert visage.]

Je te dois l'honnêteté sur où j'en suis.
[ÉCRAN : liste en deux colonnes « prêt dans le moteur » / « en cours ». À mettre à jour le jour
du tournage d'après `docs/product/ROADMAP.md` et le registre des affirmations.]

Le moteur, c'est-à-dire le cerveau de l'app, est écrit en TypeScript pur, sans aucune
dépendance, avec des tests partout. La planification, les tâches, le chiffrement, la
synchronisation : ça tourne. L'interface, je la construis en ce moment, en React, emballée par
Tauri pour tourner sur Mac, Windows, Linux, iPhone et Android.
[pause]
Ce qui n'est pas là : l'IA, la collaboration, la plupart des cent idées. Et c'est voulu. Je
préfère une boucle complète que cent fonctions à moitié finies.

<!-- Ne lister à l'écran que les éléments vérifiés le jour du tournage. -->

## [POURQUOI EN PUBLIC] — 10:45

Pourquoi je te montre tout ça avant que ce soit fini ?
[pause]
Parce qu'une appli de productivité construite en secret, c'est un peu absurde. Elle finit par
ressembler à la personne qui l'a faite. Et moi, je voudrais qu'elle ressemble à ceux qui vont
l'utiliser.

Si ça te parle, il y a trois portes. [ÉCRAN : trois lignes, une à la fois]
Le code est sur GitHub : une étoile, ça m'aide à savoir que je ne parle pas dans le vide.
La liste d'attente, si tu veux tester la bêta en premier.
Et le Discord, si tu veux me dire où je me trompe. C'est là que j'apprends le plus.
[Liens : `{{GITHUB_URL}}`, `{{WAITLIST_URL}}`, `{{DISCORD_URL}}`, en commentaire épinglé et en
description.]

## [SORTIE OUVERTE] — 11:30

[Retour au plan serré du début. Même lumière.]

Je ne sais pas si on peut construire un outil qui t'aide à faire plus… sans te faire sentir que
tu n'en fais jamais assez.
[pause]
Mais je crois que ça vaut la peine d'essayer.
[pause]
Peut-être que la bonne question, c'était jamais « comment je remplis ma journée ».
[silence]
C'était : qu'est-ce que je laisse vide, exprès.
[silence — 3 s. Animation du logo : le trait du « P » se dessine, le point corail se pose. Noir.]

---

## Description YouTube (proposition)

```
Sept applis pour une seule journée. Alors j'ai décidé d'en construire une, en public, et open source.

POuxis réunit agenda, tâches et idées. Il fonctionne sans connexion, garde tes données sur ton
appareil et se synchronise chiffré de bout en bout. Le code est ouvert.

⭐ Le code : {{GITHUB_URL}}
✉️ Liste d'attente de la bêta : {{WAITLIST_URL}}
💬 Le Discord : {{DISCORD_URL}}

Sources citées :
— Leroy, S. (2009). Why is it so hard to do my work? OBHDP, 109(2). doi:10.1016/j.obhdp.2009.04.002
— Leroy, S. & Glomb, T. M. (2018). Tasks interrupted… Organization Science, 29(3). doi:10.1287/orsc.2017.1184
— Silverman, J. & Barasch, A. (2022). On or off track. Journal of Consumer Research, 49(6). doi:10.1093/jcr/ucac029
— Lally, P. et al. (2010). How are habits formed. European Journal of Social Psychology, 40(6). doi:10.1002/ejsp.674

[chapitres]
```

> Émojis de la description : un par lien, fonction de repère visuel uniquement ; les retirer si
> le fondateur préfère une description sans émoji.
