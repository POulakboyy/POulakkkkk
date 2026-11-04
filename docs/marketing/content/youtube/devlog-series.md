# Série devlog — « Construire POuxis » (8 épisodes)

> Format : 8 à 14 min par épisode, une idée par épisode, deux ou trois spirales (voir la voix
> YouTube du fondateur). Rythme proposé : un épisode toutes les une à deux semaines, après la
> vidéo longue de lancement ([`long-form-script.md`](long-form-script.md)). Chaque épisode montre
> du vrai code, de vrais tests et l'état réel du produit ; ce qui n'existe pas encore est dit
> comme tel. Références `C#` : [registre des affirmations](../../stores/claims-register.md).

## Fil rouge de la série

Une seule question traverse les huit épisodes : **peut-on construire un outil qui organise sans
culpabiliser ?** Chaque épisode y répond par un morceau du produit, et chacun se termine sur une
question ouverte qui prépare le suivant.

## Épisodes

### Épisode 1 — « Cent idées, une boucle »

- **Brèche** : « J'ai écrit cent fonctionnalités. Aujourd'hui j'en supprime quatre-vingt-une. »
- **Contenu** : le brief d'origine, la feuille de route par phases, le choix des 19 fonctions du
  MVP (`docs/product/MVP_SPEC.md`). Pourquoi une boucle complète vaut mieux que cent fonctions
  partielles.
- **À l'écran** : `docs/BRIEF.md`, la table des phases de `ROADMAP.md`, un tri physique de cartes
  papier (cent cartes, dix-neuf restent).
- **Sortie ouverte** : « Ce qu'on enlève dit plus de nous que ce qu'on ajoute. »

### Épisode 2 — « Le cerveau sans dépendance »

- **Brèche** : « Mon moteur a zéro dépendance. Ce n'est pas de la fierté, c'est de la peur. »
- **Contenu** : `@pouxis/core` en TypeScript pur, sans API DOM ni Node, testé avec Vitest. Les
  dates avec fuseau IANA explicite (`src/time.ts`) et pourquoi « l'heure locale de la machine »
  est un piège (passage à l'heure d'été, voyage, serveur).
- **À l'écran** : `package.json` sans dépendances, un test de changement d'heure qui passe, l'ADR
  0005.
- **Sortie ouverte** : « Chaque dépendance est une promesse que quelqu'un d'autre doit tenir. »

### Épisode 3 — « Une phrase, une journée » (C4, C5)

- **Brèche** : « "Réunion projet mardi 14 h-16 h." Huit mots. Voilà comment ils deviennent un
  agenda. »
- **Contenu** : l'analyseur de langage naturel (`core/nlp`), puis le routage des tâches dans les
  créneaux libres (`core/scheduler`), avec une raison lisible pour chaque placement. Le biais de
  planification (Buehler et al., 1994) et pourquoi le routage doit apprendre du « prévu vs réel »
  plutôt que de croire nos estimations.
- **À l'écran** : saisie réelle, fragments reconnus surlignés, plan proposé puis annulé.
- **Sortie ouverte** : « On se trompe toujours sur le temps. La question, c'est qui corrige. »

### Épisode 4 — « Le temps entre les choses » (C6, C7, C8)

- **Brèche** : « La réunion de 14 h finit à 14 h 20. Qu'est-ce qui arrive à tout le reste ? »
- **Contenu** : propagation des retards sans toucher aux rendez-vous fixes, buffers entre réunions
  consécutives, alerte quand une réunion morcelle un long bloc de travail. Le résidu attentionnel
  (Leroy, 2009 ; Leroy et Glomb, 2018) — formulé avec ses limites.
- **À l'écran** : une journée qui se décale en direct, le résumé des tâches déplacées.
- **Sortie ouverte** : « Un agenda plein, c'est pas un agenda utile. »

### Épisode 5 — « Mon téléphone et mon ordi ne se disputent plus » (C1, C26)

- **Brèche** : « J'ai modifié la même tâche sur deux appareils, en mode avion. Puis j'ai rallumé
  le Wi-Fi. »
- **Contenu** : local-first, horloge logique hybride (HLC), registres « dernier écrivain gagne »
  par champ, documents en blocs (ADR 0002) ; quand il faudra passer à Yjs ou Automerge. Le relais
  aveugle chiffré de bout en bout (ADR 0004) : AES-256-GCM côté client, le serveur ne voit que des
  enveloppes.
- **À l'écran** : les tests de convergence, deux fenêtres qui se rejoignent, le journal du relais
  illisible.
- **Sortie ouverte** : « Faire confiance à un serveur, c'est bien. Ne pas avoir à le faire, c'est
  mieux. »

### Épisode 6 — « Une chose à la fois » (C9, C10, C11)

- **Brèche** : « J'ai essayé d'ajouter une sixième priorité à ma journée. L'app m'a dit non. »
- **Contenu** : mode Focus (une seule tâche, en grand), minuteur par tâche qui enregistre le temps
  passé, limite de priorités par jour. Ce que dit la recherche sur les pauses planifiées (et
  pourquoi 25 minutes n'est qu'une convention), sur la mémoire de travail (environ quatre
  éléments selon Cowan, 2001, et pourquoi ce n'est pas une règle sur les listes).
- **À l'écran** : entrée et sortie du mode Focus (animations `transform`/`opacity`, version
  « animations réduites » aussi).
- **Sortie ouverte** : « Dire non à une tâche, c'est dire oui à une autre. Laquelle ? »

### Épisode 7 — « Des jokers pour les jours sans » (7.3, C23–C25)

- **Brèche** : « J'ai cassé ma série. Et mon app m'a dit : c'est rien. »
- **Contenu** : séries sans culpabilité avec jokers et pause (`core/insights/streak.ts`), bilan
  hebdomadaire des avancées et blocages, temps à organiser vs temps à produire. Silverman et
  Barasch (2022), Lally et al. (2010). Le bilan reste sur l'appareil : aucune télémétrie par
  défaut.
- **À l'écran** : les règles de série écrites en clair, les tests, puis l'écran de bilan s'il est
  livré (sinon le dire).
- **Sortie ouverte** : « Et si le repos comptait comme du temps bien utilisé ? »

### Épisode 8 — « Ce que vous avez changé » (bilan communautaire)

- **Brèche** : « Cette app ne ressemble plus à celle que j'avais imaginée. Tant mieux. »
- **Contenu** : retour sur les issues, discussions Discord et contributions reçues **réellement**
  (citées avec l'accord des personnes, sans chiffres arrondis à la hausse) ; ce qui a changé dans
  la feuille de route ; ce qui vient ensuite (Toile infinie, idéation, contraintes créatives).
- **À l'écran** : historique Git, contributions, la feuille de route mise à jour.
- **Sortie ouverte** : « Un outil ouvert n'est jamais fini. Il est seulement habité. »

## Éléments récurrents

- **Ouverture** : pas de générique. Le logo n'apparaît qu'à la fin (trait du « P », puis le point
  corail).
- **« Ce qui est vrai aujourd'hui »** : un carton de 5 s en fin d'épisode avec l'état réel (prêt
  dans le moteur / dans l'interface / pas encore).
- **Invitation finale** : une seule, sincère, après avoir donné : GitHub, liste d'attente ou
  Discord, selon l'épisode — jamais les trois à chaque fois.
- **Sources** : chaque étude citée apparaît en description avec son DOI, recopié de
  [`SCIENTIFIC_BASIS.md`](../../research/SCIENTIFIC_BASIS.md#10-références).
