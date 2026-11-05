# Protocole de test d'utilisabilité modéré — MVP 0.1 « La boucle »

> **Statut : protocole v0.1, aucune session conduite à ce jour (2026-11-04).**
> Les seuils ci-dessous sont des **critères de décision provisoires**, à figer avant le premier
> participant du round 1. Ce ne sont pas des résultats. Le test est **formatif** : il sert à trouver
> et corriger des problèmes, pas à certifier un niveau de qualité.

Documents liés : [`USER_RESEARCH.md`](./USER_RESEARCH.md) (phase 3, éthique § 7, accessibilité § 8,
synthèse § 9) · [`PERSONAS.md`](./PERSONAS.md) · [`../product/MVP_SPEC.md`](../product/MVP_SPEC.md)
(parcours F1–F4, critères `AC-*`) · [`templates/formulaire-consentement.md`](./templates/formulaire-consentement.md)
· [`templates/tableau-de-synthese.md`](./templates/tableau-de-synthese.md).

## Sommaire

1. [Objectifs et questions](#1-objectifs-et-questions)
2. [Format, participants et matériel](#2-format-participants-et-matériel)
3. [Déroulé d'une session (75 min)](#3-déroulé-dune-session-75-min)
4. [Script de modération et pensée à voix haute](#4-script-de-modération-et-pensée-à-voix-haute)
5. [Tâches et critères de réussite](#5-tâches-et-critères-de-réussite)
6. [Mesures](#6-mesures)
7. [Grille d'observation](#7-grille-dobservation)
8. [Échelle de gravité](#8-échelle-de-gravité)
9. [Analyse et passage d'un round à l'autre](#9-analyse-et-passage-dun-round-à-lautre)
10. [Gabarit de rapport](#10-gabarit-de-rapport)
11. [Références](#11-références)

---

## 1. Objectifs et questions

| Flux testé                                         | Fonctionnalités (brief)   | Question principale                                                                                | Risque / hypothèse                      |
| -------------------------------------------------- | ------------------------- | -------------------------------------------------------------------------------------------------- | --------------------------------------- |
| F1 — Capture en langage naturel                    | 1.8, 5.14, 2.11           | Les personnes capturent-elles sans formulaire, et comprennent-elles ce qui a été reconnu ?         | `R3` (`H3a`)                            |
| F2 — Planification automatique                     | 1.1, 1.2, 1.6, 1.10, 2.15 | Le plan proposé est-il compris, corrigeable et réversible ? La confiance est-elle calibrée ?       | `R1` (`H1a`–`H1c`), `R4` (`H4c`, `H4d`) |
| F3 — Session focus et mini-lecteur                 | 2.6, 2.14, 1.11 (partiel) | Démarrer, suivre, mettre en pause et quitter une session sont-ils évidents, sans culpabilisation ? | `R3`, `R4`                              |
| F4 — Revue hebdomadaire                            | 1.9, 7.9                  | Le bilan est-il lisible, non culpabilisant, et mène-t-il à replanifier ?                           | `R3` (`H3a`), `R4`                      |
| F5 — Sérendipité (hors MVP 0.1, test conditionnel) | 5.1                       | Le rapprochement de deux notes suscite-t-il une association jugée utile ?                          | `R6` (`H6a`)                            |

F5 n'est inclus que si un prototype du connecteur aléatoire est disponible dans le build de test ;
sinon, il est remplacé par un test de concept sur maquette (même tâche, mesures CSI seulement).

**Hors objectifs.** Performance perçue sur les budgets du § 5 de `MVP_SPEC.md` (mesurée par des
tests automatisés), synchronisation entre appareils (observée dans l'étude journal, phase 4),
préférence entre concurrents.

---

## 2. Format, participants et matériel

### 2.1 Format

- **Modéré**, individuel, **75 minutes**, à distance (visio avec partage de la fenêtre de
  l'application) ou en présentiel.
- **Deux rounds de 8 personnes** (`USER_RESEARCH.md` § 5). Les problèmes de gravité 3 et 4 du
  round 1 sont corrigés avant le round 2, qui vérifie les corrections et cherche les problèmes
  restants.
- **Un test pilote** avant chaque round, exclu de l'analyse.
- Une personne modère, une autre observe et prend des notes (grille § 7). Les autres membres de
  l'équipe observent en silence, caméra et micro coupés, et posent leurs questions par message à la
  personne qui observe. Le fondateur ne modère pas (`USER_RESEARCH.md` § 11).

### 2.2 Composition de chaque round (quotas)

| Critère                                             | Quota par round de 8                                                                                                               |
| --------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| Proto-personas `PP1`, `PP2`, `PP3`, `PP4`           | 2 chacun (`PP5` hors MVP solo)                                                                                                     |
| Plateforme principale                               | Au moins 3 sur mobile (dont 1 Android et 1 iOS), au moins 3 sur ordinateur (macOS, Windows, Linux représentés sur les deux rounds) |
| Personnes neurodivergentes (déclaration volontaire) | Au moins 2                                                                                                                         |
| Technologie d'assistance                            | Au moins 1 sur l'ensemble des deux rounds (lecteur d'écran, agrandissement ou contrôle vocal)                                      |
| Hors audience K13 Studios                           | Au moins 40 % (`USER_RESEARCH.md` § 3)                                                                                             |
| Exclusions                                          | Mineurs ; personnes ayant déjà vu POuxis en test ; salariés d'un éditeur concurrent (screener S13)                                 |

### 2.3 Build et données de test

- Build de test avec **jeu de données fictif préchargé et réinitialisable** (demande à l'ingénierie,
  `USER_RESEARCH.md` § 12). Jamais l'agenda réel de la personne (§ 7.3).
- Fuseau `Europe/Paris`, date simulée : **jeudi 5 novembre 2026, 9 h 00** (cohérent avec
  `AC-1.1`). Langue de l'interface : celle de la personne (fr ou en).
- Contenu du jeu de données :
  - heures de travail 9 h – 18 h, du lundi au vendredi, pause déjeuner protégée 12 h 30 – 13 h 30 ;
  - 3 événements fixes jeudi (10 h – 10 h 30 point d'équipe, 10 h 35 – 11 h 30 appel client,
    14 h – 15 h rendez-vous dentiste) — deux réunions rapprochées pour faire apparaître un buffer
    (1.6) ;
  - 9 tâches, dont « Préparer le devis Durand » (1 h 30, échéance vendredi) et « Relire le script »
    (30 min) avec durée estimée parmi 4 au total, 1 épinglée à 16 h, 1 flottante attachée à jeudi
    (1.10), 1 dépendante d'une autre (2.1), 2 reportées plusieurs fois ; 5 tâches prioritaires
    jeudi, pour déclencher l'avertissement de charge (2.15) en T4 ;
  - 6 éléments non triés dans la boîte de réception ;
  - historique de la semaine précédente (snapshot 1.9, `TimeLog`, 2 entrées de journal `win` et
    1 `friction`) pour la revue hebdomadaire ;
  - 40 notes variées dans le module Idées (pour F5 ; une base trop pauvre biaiserait `H6a`).
- **Horloge accélérée** pour la session focus (1 minute réelle = 5 minutes simulées), annoncée à la
  personne.

### 2.4 Matériel

- Fiches de tâches (une par écran, lues à voix haute **et** affichées), en langage simple.
- Questionnaires en ligne accessibles (WCAG 2.2 AA), hébergés dans l'UE : SEQ, NASA-TLX brut, SUS
  (version F-SUS en français), CSI.
- Grille d'observation (§ 7) dans le tableau de synthèse.
- Enregistrement audio et écran **uniquement** si la personne a coché les consentements
  correspondants (C2, C3).

---

## 3. Déroulé d'une session (75 min)

| Minutage | Étape                                                     | Mesures                                        |
| -------- | --------------------------------------------------------- | ---------------------------------------------- |
| 0–7      | Accueil, rappel du consentement, réglages d'accessibilité | —                                              |
| 7–12     | Questions de contexte (outil actuel, journée type)        | —                                              |
| 12–15    | Entraînement à la pensée à voix haute (tâche neutre)      | —                                              |
| 15–25    | T1 Capture, T2 Brain dump et tri                          | Réussite, temps, SEQ                           |
| 25–40    | T3 Planifier la journée, T4 Débordement                   | Réussite, temps, SEQ, NASA-TLX brut, confiance |
| 40–50    | T5 Session focus et mini-lecteur, T6 Focus unique         | Réussite, temps, SEQ                           |
| 50–58    | Pause proposée (2 min) puis T7 Revue hebdomadaire         | Réussite, temps, SEQ, NASA-TLX brut            |
| 58–65    | T8 Sérendipité (si disponible)                            | Réussite, SEQ, CSI                             |
| 65–72    | SUS, questions de clôture                                 | SUS                                            |
| 72–75    | Débrief, remerciements, modalités de l'incitation         | —                                              |

**Règles de temps.** Si la session prend du retard, on supprime dans cet ordre : T8, T6, T4. On ne
raccourcit jamais l'accueil ni le débrief. Chaque tâche a une **limite souple** (indiquée § 5) :
au-delà, la personne qui modère propose de passer à la suite, sans que ce soit présenté comme un
échec.

**Ordre des tâches.** L'ordre suit la boucle (capture → plan → focus → revue), parce que chaque
étape utilise l'état laissé par la précédente. On ne contrebalance donc pas l'ordre ; l'effet
d'apprentissage est noté comme limite dans le rapport.

---

## 4. Script de modération et pensée à voix haute

Le script est lu de façon naturelle, pas récité. Les passages entre crochets sont des consignes pour
la personne qui modère.

### 4.1 Accueil

> Bonjour, et merci d'être là. Je m'appelle [prénom]. Aujourd'hui, nous testons une application
> encore en cours de construction, qui s'appelle POuxis. **C'est l'application que nous testons, pas
> vous.** Il n'y a ni bonne ni mauvaise réponse. Si quelque chose est difficile, c'est exactement ce
> que nous cherchons à découvrir.
>
> Je n'ai pas conçu ces écrans moi-même, donc vous ne me vexerez pas. Vous pouvez faire une pause,
> passer une tâche ou arrêter à tout moment, sans vous justifier. L'incitation vous reste acquise
> dans tous les cas.
>
> [Rappeler les consentements cochés : audio, écran, vidéo. Vérifier oralement.] Vous avez accepté
> l'enregistrement [audio / de l'écran]. Est-ce toujours d'accord ? Les données que vous verrez sont
> fictives ; n'utilisez aucune information personnelle.
>
> [Réglages.] Prenez le temps d'ajuster la taille du texte, le contraste ou votre technologie
> d'assistance comme vous en avez l'habitude. [Couper les notifications si la personne le souhaite.]

### 4.2 Entraînement à la pensée à voix haute

> Pendant que vous utilisez l'application, j'aimerais que vous disiez à voix haute ce que vous
> cherchez, ce que vous pensez et ce qui vous surprend. Par exemple, sur cette page d'actualités,
> pourriez-vous trouver la météo de demain en me racontant ce que vous faites ?
>
> [Tâche neutre, hors POuxis, 1 à 2 minutes.]
>
> Parfait. Si vous restez silencieux un moment, je vous demanderai simplement « Qu'est-ce que vous
> regardez ? ». Ce n'est pas une critique.

**Variante rétrospective.** Penser à voix haute fatigue et peut gêner certaines personnes (anxiété,
TDAH, lecteur d'écran qui parle déjà). On propose alors de réaliser les tâches en silence puis de
commenter l'enregistrement juste après (pensée à voix haute rétrospective ; Van den Haak, De Jong &
Schellens, 2003). Le temps sur la tâche est alors mesuré pendant l'exécution silencieuse ; on note la
variante utilisée dans la grille.

### 4.3 Relances neutres autorisées

Inspirées de l'approche de Boren & Ramey (2000) : relances courtes, qui accusent réception sans
orienter.

| Situation                         | Relance                                                                   |
| --------------------------------- | ------------------------------------------------------------------------- |
| Silence de plus de 10 secondes    | « Qu'est-ce que vous regardez en ce moment ? »                            |
| Hésitation                        | « Qu'est-ce que vous vous attendiez à voir ? »                            |
| Question à la personne qui modère | « Que feriez-vous si je n'étais pas là ? » (puis « Qu'en pensez-vous ? ») |
| Commentaire évaluatif             | « Qu'est-ce qui vous fait dire ça ? »                                     |
| Fin supposée de la tâche          | « Où en êtes-vous ? » (jamais « Vous avez terminé ? Bravo »)              |

**Interdits.** Nommer un élément de l'interface avant la personne (« cliquez sur Planifier ») ;
approuver (« très bien ! ») ; montrer du doigt ; expliquer le fonctionnement pendant une tâche.

**Aide.** On n'aide qu'après la limite souple ou en cas de blocage exprimé. Toute aide est notée
(niveau 1 : reformuler la consigne ; niveau 2 : indiquer la zone de l'écran ; niveau 3 : montrer).
Une tâche réussie avec aide de niveau 2 ou 3 compte comme **échec** pour le taux de réussite.

### 4.4 Après chaque tâche

> [Afficher la question SEQ.] Dans l'ensemble, cette tâche a-t-elle été difficile ou facile ?
> Répondez de 1, très difficile, à 7, très facile. … Qu'est-ce qui vous a fait choisir ce chiffre ?

### 4.5 Questions de clôture

1. Si vous deviez décrire POuxis à une amie en une phrase, que diriez-vous ?
2. Qu'est-ce qui vous a le plus surpris, en bien ou en mal ?
3. À quel moment avez-vous eu le sentiment de perdre le contrôle de votre journée, s'il y en a eu un ?
4. Y a-t-il un moment où l'application vous a mis mal à l'aise, culpabilisé ou stressé ?
5. Qu'est-ce qui vous empêcherait de l'utiliser demain à la place de votre outil actuel ?

### 4.6 Débrief

> Merci beaucoup. [Si une fonction était simulée ou si une erreur avait été introduite volontairement,
> l'expliquer ici et proposer le retrait des données de la séance — `USER_RESEARCH.md` § 7.9.]
> Votre incitation sera versée sous 7 jours. Si quelque chose vous revient plus tard, vous pouvez
> nous écrire à [adresse].

---

## 5. Tâches et critères de réussite

Les consignes sont des **scénarios** : elles décrivent un but, jamais l'interface ni la syntaxe à
taper. « Réussite » = critère atteint sans aide de niveau 2 ou 3, dans la limite souple.

### T1 — Capturer un rendez-vous en une phrase (F1 · 1.8 · `AC-1.1`, `AC-1.2`)

> Paul vient de vous proposer de travailler ensemble sur le projet Orion mardi prochain, de 14 h à
> 16 h. Notez-le dans POuxis, comme vous le feriez dans la vraie vie.

- **Réussite** : un événement existe mardi 10 novembre 2026, 14 h – 16 h, avec Paul, titre
  contenant « Orion ».
- **Partielle** : élément créé, mais date, heure ou participant erroné ou absent.
- **Observations clés** : passe-t-on par un formulaire ou par la saisie libre ? Les fragments
  reconnus (date, heure, mention) sont-ils remarqués avant validation ? Corrections effectuées ?
- **Limite souple** : 3 min. **Cible provisoire** : ≥ 6/8 réussites ; SEQ médian ≥ 5.

### T2 — Vider sa tête puis trier (F1 · 5.14 · 2.11 · `AC-3.2`, `AC-4.1`)

> Plusieurs choses vous trottent dans la tête : rappeler la banque, acheter des piles, finir le
> montage de la vidéo vendredi, et une idée de titre « Le temps n'existe pas ». Déposez tout ça
> rapidement. Ensuite, faites en sorte que le montage soit prêt à être planifié : il prendra environ
> 2 heures.

- **Réussite** : 4 éléments dans la boîte de réception ; « montage » au statut `todo` avec une durée
  de 2 h et une échéance vendredi.
- **Observations clés** : point d'entrée choisi (bouton central, raccourci, champ de capture) ;
  compréhension de « une ligne = un élément » ; réaction au nombre d'éléments de la boîte de
  réception (`AC-4.2`).
- **Limite souple** : 4 min. **Cible provisoire** : ≥ 6/8 ; SEQ médian ≥ 5.

### T3 — Faire planifier sa journée, comprendre et corriger (F2 · 1.1 · 1.6 · 1.10 · `AC-5.1` à `AC-5.6`)

> Vous voulez savoir ce que vous pouvez raisonnablement faire aujourd'hui. Demandez à POuxis de vous
> proposer un plan. Puis : (a) dites-moi pourquoi la tâche « Préparer le devis Durand » est placée à
> cet endroit ; (b) vous tenez à faire « Relire le script » à 13 h 30, juste après le déjeuner : faites en sorte
> qu'elle n'en bouge plus ; (c) finalement, vous changez d'avis sur tout le plan : revenez à la
> situation d'avant.

- **Réussite** : (a) la raison affichée est retrouvée et reformulée correctement ; (b) la tâche est
  épinglée à l'heure voulue ; (c) annulation complète, agenda identique à l'état initial.
  Chaque sous-tâche est notée séparément.
- **Observations clés** : les tâches non placées sont-elles remarquées et comprises (`AC-5.4`) ? Le
  buffer entre les deux réunions est-il compris ? La tâche flottante reste-t-elle sur jeudi ?
  Verbatims de surprise ou de perte de contrôle (`H1a`, `H1c`).
- **Mesures supplémentaires** : NASA-TLX brut ; 3 items de confiance (§ 6.5).
- **Limite souple** : 7 min. **Cible provisoire** : (a) ≥ 6/8, (b) ≥ 6/8, (c) ≥ 7/8.

### T4 — Gérer un débordement (F2 · 1.2 · 2.15 · `AC-6.1` à `AC-6.3`, `AC-11.1`)

> Vous êtes sur « Préparer le devis Durand » et vous avez besoin de 30 minutes de plus. Indiquez-le,
> puis vérifiez ce que ça change pour la suite de votre journée.
> Ensuite : un client vous demande d'ajouter une tâche urgente aujourd'hui. Ajoutez-la.

- **Réussite** : prolongation appliquée ; la personne décrit correctement quelles tâches ont bougé
  et lesquelles sont « à replanifier » ; l'ajout de la 6e tâche prioritaire est fait ou
  consciemment reporté après l'avertissement.
- **Observations clés** : le résumé de propagation est-il lu ? L'avertissement de charge est-il
  perçu comme une aide ou un reproche (`H4d`) ? Mots employés.
- **Limite souple** : 4 min. **Cible provisoire** : ≥ 6/8 ; aucune réaction de culpabilisation
  attribuée au message (sinon, problème étiqueté « bien-être », § 8).

### T5 — Lancer une session de concentration et naviguer (F3 · 2.6 · mini-lecteur · `AC-12.1` à `AC-12.4`, `AC-14.1`)

> Commencez une session de concentration sur « Relire le script ». Pendant la session, allez
> vérifier quelque chose dans votre liste de tâches, puis revenez à votre session. Mettez-la en
> pause, reprenez-la. [L'horloge accélérée amène la fin de session.] Que se passe-t-il ?

- **Réussite** : session démarrée sur la bonne tâche ; la personne retrouve sa session depuis une
  autre vue via le mini-lecteur ; pause et reprise réussies ; fin de session et proposition de pause
  comprises.
- **Observations clés** : le mini-lecteur est-il remarqué, reconnu comme la session en cours
  (comparaison spontanée avec un lecteur de musique ?), touché sans erreur (cibles ≥ 44 px) ? Le
  temps affiché semble-t-il fiable ? Une notification POuxis non urgente est-elle bien différée
  (`AC-14.1`, déclenchée par l'équipe pendant la session) ?
- **Limite souple** : 6 min. **Cible provisoire** : ≥ 6/8 retrouvent la session via le mini-lecteur
  sans aide.

### T6 — Focus unique et sortie (F3 · 2.14 · `AC-13.1` à `AC-13.3`)

> Vous voulez que rien d'autre que cette tâche ne soit visible pendant un moment. Faites-le. Puis
> arrêtez, comme si on venait de vous appeler.

- **Réussite** : mode focus unique ouvert ; sortie par Échap ou « Quitter » en moins de 10 secondes.
- **Observations clés** : sentiment d'être « enfermé » ; formulations de sortie ressenties comme
  culpabilisantes ou non (`AC-13.2`) ; avec `prefers-reduced-motion` activé, absence d'animation
  de déplacement (`AC-13.3`, vérifié sur au moins 2 sessions).
- **Limite souple** : 2 min. **Cible provisoire** : ≥ 7/8.

### T7 — Faire le bilan de la semaine (F4 · 1.9 · 7.9 · `AC-15.2`, `AC-16.2` à `AC-16.4`)

> C'est dimanche soir. Faites le point sur votre semaine passée : qu'est-ce qui s'est bien passé,
> qu'est-ce qui a été repoussé ? Ensuite, faites en sorte que ce qui a été repoussé trouve une place
> la semaine prochaine.

- **Réussite** : la personne cite au moins une victoire et une tâche reportée à partir de l'écran ;
  elle distingue « fait comme prévu » et « fait autrement » ; les reports sont replanifiés en une
  action.
- **Observations clés** : ton perçu du bilan (neutre, encourageant, culpabilisant) ; temps passé à
  lire ; réaction aux tâches reportées plusieurs fois (`H4b`) ; envie déclarée de refaire le bilan
  la semaine suivante.
- **Mesures supplémentaires** : NASA-TLX brut.
- **Limite souple** : 6 min. **Cible provisoire** : ≥ 6/8 ; aucun problème « bien-être » de gravité
  ≥ 3.

### T8 — Sérendipité (F5 · 5.1, conditionnel)

> Vous cherchez une idée pour votre prochaine vidéo. Demandez à POuxis de vous surprendre avec vos
> propres notes, et notez une idée qui vous vient, même imparfaite.

- **Réussite** : le connecteur est trouvé et déclenché ; une idée est notée et reliée (ou non, au
  choix de la personne) aux notes proposées.
- **Observations clés** : la personne comprend-elle pourquoi ces deux notes ? Relance-t-elle le
  tirage ? Jugement d'utilité de l'association (« utile », « amusant mais inutile », « absurde »),
  pour `H6a`.
- **Mesures supplémentaires** : CSI (§ 6.6).
- **Limite souple** : 5 min. **Cible provisoire** : aucune (exploratoire, n trop faible pour
  trancher `H6a`).

---

## 6. Mesures

Avec 8 personnes par round, on rapporte des **effectifs** (« 6 sur 8 ») et non des pourcentages.
Les intervalles de confiance sont donnés à titre indicatif, sans conclusion statistique.

### 6.1 Réussite de la tâche

- Codage : **1** réussite, **0,5** partielle (définie par tâche), **0** échec ou abandon.
- Taux de réussite binaire (réussite complète) avec intervalle de confiance de Wald ajusté
  (recommandé pour les petits échantillons ; Sauro & Lewis, 2016).
- Niveau d'aide (0 à 3) et nombre d'erreurs (action incorrecte corrigée ou non) notés séparément.

### 6.2 Temps sur la tâche

- Chronométré du dernier mot de la consigne jusqu'à la déclaration de fin ou l'abandon.
- Rapporté en **moyenne géométrique** (les temps de tâche sont asymétriques ; Sauro & Lewis, 2016),
  avec la médiane et l'étendue, réussites seulement.
- **Exclu** de la comparaison pour les personnes en pensée à voix haute rétrospective ou utilisant
  une technologie d'assistance (on le rapporte à part, sans comparaison).

### 6.3 SEQ — Single Ease Question

- Après chaque tâche : « Dans l'ensemble, cette tâche était… » de 1 (très difficile) à 7 (très
  facile).
- Choix de la mesure : parmi trois questionnaires post-tâche à une question, Sauro & Dumas (2009)
  ont trouvé la SEQ au moins aussi performante que les alternatives et la plus simple à administrer.
- Analyse : médiane par tâche, et surtout le **pourquoi** verbal recueilli juste après.

### 6.4 SUS — System Usability Scale

- 10 items, 5 points, en fin de session (Brooke, 1996). Version française validée F-SUS (Gronier &
  Baudet, 2021) pour les sessions en français ; version anglaise d'origine sinon.
- Score de 0 à 100 (items impairs : note − 1 ; items pairs : 5 − note ; somme × 2,5). **Ce n'est pas
  un pourcentage.**
- Repère : 68 est souvent cité comme score moyen d'un large ensemble d'études (Sauro & Lewis, 2016).
  Avec n = 8, on ne compare ni à ce repère ni entre rounds ; on suit la tendance et on lit les items
  extrêmes. La comparaison chiffrée est réservée au test sommatif en bêta (n ≥ 20).

### 6.5 Charge de travail — NASA-TLX brut

- Après T3 (planification) et T7 (revue), conformément à `R4` (`USER_RESEARCH.md`).
- Six dimensions (exigence mentale, exigence physique, pression temporelle, performance, effort,
  frustration), échelle de 0 à 100 par pas de 5 (Hart & Staveland, 1988).
- Version **brute** (moyenne des six dimensions, sans la pondération par comparaisons par paires),
  plus rapide en session ; Hart (2006) passe en revue son usage répandu.
- La dimension « exigence physique » est conservée pour garder l'instrument intact, mais n'est pas
  interprétée.
- Pas de version française validée identifiée à ce jour : la traduction utilisée est consignée et
  relue par deux personnes bilingues avant le pilote.

**Confiance (T3 seulement).** Trois items adaptés de l'échelle de confiance envers les systèmes
automatisés de Jian, Bisantz & Drury (2000), cotés de 1 à 7 : « Je peux faire confiance à ce
plan », « Je comprends pourquoi les tâches sont placées ainsi », « Je me méfie de ce plan »
(inversé). Il s'agit d'une adaptation **non validée**, utilisée pour orienter les entretiens de
l'étude journal, pas pour décider.

### 6.6 CSI — Creativity Support Index

- Après T8 uniquement (Cherry & Latulipe, 2014). Le CSI combine des affirmations notées sur six
  facteurs (exploration, expressivité, immersion, plaisir, rentabilité de l'effort, collaboration)
  et des comparaisons par paires entre facteurs ; le score va de 0 à 100.
- POuxis 0.1 est utilisé seul : la façon de traiter le facteur « collaboration » doit suivre les
  consignes de l'article d'origine, **à vérifier dans Cherry & Latulipe (2014) avant le pilote**.
- Une seule tâche courte sur des notes fictives : le CSI sert ici de **diagnostic par facteur**
  (lequel est faible ?), pas de score à comparer. Le score de référence est celui de J14 dans
  l'étude journal (`USER_RESEARCH.md`, phase 4).
- Traduction française non validée : même règle que pour le NASA-TLX.

### 6.7 Récapitulatif

| Mesure              | Quand              | Rapporté comme                                 |
| ------------------- | ------------------ | ---------------------------------------------- |
| Réussite            | Chaque tâche       | x/8, Wald ajusté, niveau d'aide                |
| Temps               | Chaque tâche       | Moyenne géométrique, médiane, étendue          |
| Erreurs             | Chaque tâche       | Nombre et nature                               |
| SEQ                 | Après chaque tâche | Médiane + raisons verbales                     |
| NASA-TLX brut       | Après T3 et T7     | Moyenne par dimension et globale, par personne |
| Confiance (3 items) | Après T3           | Distribution, sans seuil                       |
| CSI                 | Après T8           | Score par facteur                              |
| SUS                 | Fin de session     | Scores individuels, médiane, items extrêmes    |
| Problèmes           | Continu            | Liste dédupliquée, gravité, fréquence (§ 8)    |

---

## 7. Grille d'observation

Une ligne par **événement** observé. La personne qui observe remplit la grille pendant la séance ;
elle est complétée au réécoutage. Elle alimente directement les observations `OBS-###` du
[tableau de synthèse](./templates/tableau-de-synthese.md).

| Champ              | Contenu                                                                                                                                                 |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Participant        | `P##` (jamais de nom)                                                                                                                                   |
| Round / plateforme | `R1` ou `R2` · iOS, Android, macOS, Windows, Linux · technologie d'assistance éventuelle                                                                |
| Tâche              | `T1`…`T8`                                                                                                                                               |
| Horodatage         | Minute:seconde dans l'enregistrement                                                                                                                    |
| Type               | `HES` hésitation · `ERR` erreur · `AID` aide (1–3) · `VERB` verbatim · `EMO` émotion · `SUC` réussite · `ABD` abandon · `A11Y` obstacle d'accessibilité |
| Ce qui s'est passé | Fait observable, sans interprétation (« a appuyé trois fois sur le titre de la tâche »)                                                                 |
| Citation           | Mot pour mot, entre guillemets                                                                                                                          |
| Interprétation     | Hypothèse de l'observateur, clairement séparée (« croit que le titre ouvre la session »)                                                                |
| Écran / composant  | Vue et élément concernés                                                                                                                                |
| Gravité proposée   | 0–4 (§ 8), à confirmer en débrief                                                                                                                       |
| Étiquette          | `bien-être`, `confiance`, `a11y`, `performance`, `vocabulaire` (facultatif)                                                                             |

**Fiche récapitulative par participant** (remplie au débrief à chaud, 10 minutes) :

| Tâche | Résultat (1 / 0,5 / 0) | Aide max | Temps | SEQ | Problème principal |
| ----- | ---------------------- | -------- | ----- | --- | ------------------ |
| T1    |                        |          |       |     |                    |
| …     |                        |          |       |     |                    |

Plus : NASA-TLX T3 et T7, confiance, CSI, SUS ; 3 surprises, 3 confirmations, questions à creuser.

---

## 8. Échelle de gravité

Échelle de 0 à 4 inspirée des niveaux de gravité de Nielsen (1994), qui combinent fréquence, impact
et persistance. Chaque problème est noté **indépendamment par deux personnes**, puis la note est
discutée ; en cas de désaccord persistant, on retient la plus haute et on le signale.

| Note | Niveau          | Définition opérationnelle pour POuxis                                                                                                       | Traitement                                             |
| ---- | --------------- | ------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------ |
| 0    | Pas un problème | Désaccord de goût, sans effet sur la tâche                                                                                                  | Consigné, non traité                                   |
| 1    | Cosmétique      | Gêne remarquée, sans ralentissement mesurable                                                                                               | Si le temps le permet                                  |
| 2    | Mineur          | Ralentissement ou erreur corrigée seule ; ou confusion de vocabulaire                                                                       | Avant la bêta                                          |
| 3    | Majeur          | Échec ou aide de niveau 2–3 pour au moins une personne ; ou perte de confiance exprimée dans le plan ; ou obstacle WCAG 2.2 AA contournable | **Avant le round suivant**                             |
| 4    | Bloquant        | Perte de données, impossibilité de terminer, action irréversible non voulue, ou obstacle WCAG 2.2 AA non contournable                       | **Correction immédiate**, round suspendu si nécessaire |

**Étiquette « bien-être ».** Tout problème où la personne exprime culpabilité, honte, stress ou
sentiment d'échec **causé par l'interface** (formulation, couleur, compteur, ton du bilan) reçoit
l'étiquette `bien-être` et **au minimum la note 2**, même si la tâche est réussie. À partir de
2 personnes concernées, la note minimale passe à 3. Ces problèmes sont suivis à part pour `R4`.

**Fréquence.** Chaque problème est rapporté avec le nombre de personnes concernées (« 3/8 ») ; la
gravité ne dépend pas que de la fréquence : un problème bloquant vu une seule fois reste bloquant.

---

## 9. Analyse et passage d'un round à l'autre

1. **Débrief à chaud** après chaque session (10 min), fiche récapitulative remplie.
2. **Déduplication** des problèmes à la fin de chaque journée de tests ; chaque problème reçoit un
   identifiant `UX-###` dans le tableau de synthèse, avec ses `OBS-###`.
3. **Atelier de priorisation** à la fin du round (90 min) : gravité, fréquence, effort de correction
   estimé par l'ingénierie ; décisions consignées (`DEC-###`, `USER_RESEARCH.md` § 10).
4. **Entre les rounds** : correction des problèmes de gravité 3 et 4 ; les corrections sont
   décrites dans le rapport du round 1 pour que le round 2 les vérifie explicitement.
5. **Critères de sortie de la phase 3** (provisoires) :
   - aucun problème de gravité 4 ouvert ;
   - aucun problème de gravité 3 portant sur la perte de données, l'annulation ou l'accessibilité ;
   - au round 2, chaque tâche du MVP (T1–T7) atteint sa cible provisoire, ou l'écart est expliqué
     et assumé par une décision `DEC-###` ;
   - aucun problème `bien-être` de gravité ≥ 3 ouvert sur T4 et T7.

**Limites à rapporter.** Données fictives (moins d'enjeu qu'un vrai agenda) ; horloge accélérée ;
effet d'ordre ; biais de l'audience K13 ; présence de la personne qui modère ; n faible.

---

## 10. Gabarit de rapport

```markdown
# Test d'utilisabilité MVP 0.1 — Round [1|2] — rapport

**Dates :** AAAA-MM-JJ → AAAA-MM-JJ · **Build :** [version / commit] · **Participants :** n = [8]
(PP1 : x, PP2 : x, PP3 : x, PP4 : x ; mobile : x, ordinateur : x ; neurodivergent·es : x ;
technologie d'assistance : x ; hors audience K13 : x)
**Modération :** [rôle] · **Observation :** [rôles]

## 1. Résumé (5 lignes au maximum)

[Les 3 constats les plus importants, chacun avec son effectif.]

## 2. Résultats par tâche

| Tâche | Réussite (x/8) [IC Wald ajusté] | Aide ≥ 2 | Temps (moy. géom.) | SEQ médian | Cible atteinte ? |
| ----- | ------------------------------- | -------- | ------------------ | ---------- | ---------------- |
| T1    |                                 |          |                    |            |                  |

## 3. Questionnaires

- SUS : scores individuels [..], médiane [..] ; items les plus bas : [..]
- NASA-TLX brut T3 / T7 : [par dimension] ; frustration la plus haute : [..]
- Confiance (T3) : [distribution]
- CSI (T8) : [par facteur]

## 4. Problèmes (classés par gravité, puis fréquence)

| ID     | Problème (observation) | Tâche | Fréquence | Gravité | Étiquette | Preuves (OBS-###, citations) | Recommandation |
| ------ | ---------------------- | ----- | --------- | ------- | --------- | ---------------------------- | -------------- |
| UX-001 |                        |       | x/8       |         |           |                              |                |

## 5. Ce qui fonctionne (à préserver)

## 6. Statut des hypothèses

| Hypothèse | Signal observé | Sens (soutient / affaiblit / non concluant) | Prochaine étape |
| --------- | -------------- | ------------------------------------------- | --------------- |
| H1a       |                |                                             |                 |

## 7. Décisions et corrections avant le round suivant (DEC-###)

## 8. Questions ouvertes

## 9. Limites méthodologiques
```

---

## 11. Références

Références vérifiées (titre, auteurs, année, source) avant inclusion ; aucune statistique n'est
reprise sans source.

- Boren, T., & Ramey, J. (2000). Thinking aloud: Reconciling theory and practice. _IEEE
  Transactions on Professional Communication, 43_(3), 261–278.
- Brooke, J. (1996). SUS: A "quick and dirty" usability scale. In P. W. Jordan, B. Thomas, B. A.
  Weerdmeester & I. L. McClelland (Eds.), _Usability Evaluation in Industry_ (pp. 189–194). Taylor
  & Francis.
- Cherry, E., & Latulipe, C. (2014). Quantifying the creativity support of digital tools through
  the Creativity Support Index. _ACM Transactions on Computer-Human Interaction, 21_(4), article 21.
  https://doi.org/10.1145/2617588
- Gronier, G., & Baudet, A. (2021). Psychometric evaluation of the F-SUS: Creation and validation
  of the French version of the System Usability Scale. _International Journal of Human–Computer
  Interaction, 37_(16), 1571–1582.
- Hart, S. G. (2006). NASA-Task Load Index (NASA-TLX); 20 years later. _Proceedings of the Human
  Factors and Ergonomics Society Annual Meeting, 50_(9), 904–908.
- Hart, S. G., & Staveland, L. E. (1988). Development of NASA-TLX (Task Load Index): Results of
  empirical and theoretical research. In P. A. Hancock & N. Meshkati (Eds.), _Human Mental
  Workload_ (Advances in Psychology, vol. 52, pp. 139–183). North-Holland.
- Jian, J.-Y., Bisantz, A. M., & Drury, C. G. (2000). Foundations for an empirically determined
  scale of trust in automated systems. _International Journal of Cognitive Ergonomics, 4_(1),
  53–71.
- Nielsen, J. (1994). Severity ratings for usability problems. Nielsen Norman Group (article en
  ligne) ; voir aussi Nielsen, J., & Mack, R. L. (Eds.), _Usability Inspection Methods_, Wiley.
- Sauro, J., & Dumas, J. S. (2009). Comparison of three one-question, post-task usability
  questionnaires. _Proceedings of CHI 2009_, 1599–1608. https://doi.org/10.1145/1518701.1518946
- Sauro, J., & Lewis, J. R. (2016). _Quantifying the User Experience: Practical Statistics for User
  Research_ (2nd ed.). Morgan Kaufmann.
- Van den Haak, M. J., De Jong, M. D. T., & Schellens, P. J. (2003). Retrospective vs. concurrent
  think-aloud protocols: Testing the usability of an online library catalogue. _Behaviour &
  Information Technology, 22_(5), 339–351.
