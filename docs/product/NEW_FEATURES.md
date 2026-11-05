# Labo d'innovation — fonctions au-delà des 100 du brief

> Statut : proposition, novembre 2026. Les fonctions retenues sont livrées en **expérimental**
> dans la vue Labo (`#/lab`), code dans `apps/pouxis/src/features/lab/<id>/`. Les références
> renvoient à [`SCIENTIFIC_BASIS.md`](../research/SCIENTIFIC_BASIS.md) ; aucune étude n'est citée
> ici qui n'y figure pas. Identifiants provisoires `X.n`, comme le prévoit le
> [gabarit](./FEATURE_TEMPLATE.md).

## 1. Démarche

1. **Partir de la boucle** Capturer → Planifier → Se concentrer → Faire le bilan
   ([`ROADMAP.md`](./ROADMAP.md)) et chercher les moments du jour que les 100 fonctions du brief
   couvrent mal : le **début** de journée (passer de la liste à l'action), le **milieu** (rythme
   et fatigue) et la **fin** (fermer la journée sans emporter ses tâches ouvertes).
2. **Exiger un appui scientifique** déjà vérifié dans la base de recherche, avec sa confiance
   déclarée. Une idée sans appui peut figurer dans la liste, mais elle est notée comme telle.
3. **S'inspirer des rituels d'outils existants** (Sunsama propose des rituels de planification
   et de clôture quotidiens ; Things sépare « Aujourd'hui » et « Ce soir » ; Tiimo met l'accent sur
   des plannings visuels et apaisants), sans reprendre de chiffre d'usage ni de témoignage : ces
   attentes restent des **hypothèses à valider** avec le guide d'entretien de
   [`USER_RESEARCH.md`](../research/USER_RESEARCH.md).
4. **Réutiliser le moteur** (`@pouxis/core`) plutôt que d'ajouter des modèles : chaque fonction
   s'appuie sur les collections existantes (`tasks`, `events`, `journal`) et sur les modules
   `scheduler`, `insights` et `tasks`.

## 2. Barème

| Critère   | 1                                             | 3                                | 5                                                   |
| --------- | --------------------------------------------- | -------------------------------- | --------------------------------------------------- |
| Impact    | Confort marginal                              | Améliore un maillon de la boucle | Change un comportement quotidien clé                |
| Effort    | Plusieurs semaines, nouveau modèle de données | Quelques jours, moteur existant  | Moins d'un jour, composants et moteur existants     |
| Fondement | Aucune étude dans la base                     | Étude unique ou analogie         | Méta-analyse ou résultat répliqué (confiance forte) |

Le **score** est la somme (sur 15). L'effort est noté **à l'envers** : 5 = peu d'effort.

## 3. Candidats

| #    | Idée                                             | Impact | Effort | Fondement | Score | Décision          |
| ---- | ------------------------------------------------ | :----: | :----: | :-------: | :---: | ----------------- |
| X.1  | Intention du jour « Quand X, je fais Y »         |   5    |   4    |     5     |  14   | **Livrée**        |
| X.2  | Clôture de journée et plan de reprise            |   5    |   4    |     4     |  13   | **Livrée**        |
| X.3  | Check-in d'énergie relié au placement            |   4    |   4    |     3     |  11   | **Livrée**        |
| X.4  | Pauses au bon moment                             |   4    |   4    |     3     |  11   | **Livrée**        |
| X.5  | Bocal des victoires                              |   3    |   5    |     3     |  11   | **Livrée**        |
| X.6  | Correctif d'estimation visible                   |   4    |   3    |     4     |  11   | À intégrer en 1.1 |
| X.7  | Ambiance sonore liée au type de tâche            |   3    |   3    |     2     |   8   | Plus tard         |
| X.8  | « Marcher et parler » : capture vocale en marche |   3    |   2    |     3     |   8   | Plus tard         |
| X.9  | Budget de temps hebdomadaire visuel              |   3    |   3    |     1     |   7   | Plus tard         |
| X.10 | Pré-mortem express avant un gros projet          |   3    |   4    |     1     |   8   | À explorer        |
| X.11 | Regroupement des notifications aux pauses        |   4    |   2    |     4     |  10   | Plateforme (6.8)  |
| X.12 | Sas de transition entre deux blocs               |   3    |   4    |     3     |  10   | À explorer        |

### X.1 Intention du jour — livrée

- **Problème.** Une liste du jour dit _quoi_ faire, rarement _quand_ s'y mettre ; la tâche
  importante glisse.
- **Fonction.** Choisir une tâche (aujourd'hui, puis importantes), un repère (« après mon café »,
  une heure, ou le **premier créneau libre** calculé par `scheduler.magnetize`) et un lieu
  facultatif. La phrase « Quand…, je m'y mets : … » s'affiche en direct ; le créneau peut être
  réservé sur la tâche. Annulable.
- **Fondement.** Intentions de mise en œuvre : effet moyen à fort sur l'atteinte des buts
  (Gollwitzer et Sheeran, 2006, méta-analyse ; confiance forte dans la base).
- **Risque.** Transformer l'intention en obligation : un seul énoncé par jour, modifiable, sans
  rappel culpabilisant.

### X.2 Clôture de journée — livrée

- **Problème.** Les tâches inachevées « suivent » la personne le soir et la reprise du lendemain
  est lente.
- **Fonction.** Rituel en trois étapes : voir ce qui est fait ; décider pour chaque tâche
  restante (demain par défaut, plus tard, laisser) via `tasks.postponePatch` ; écrire la
  première action de demain et, si besoin, ce qui a coincé (entrée `friction`). La journée se
  ferme sur le meilleur moment (tâche la plus importante ou la plus travaillée). Tout est
  annulable d'un geste.
- **Fondement.** Faire un plan pour un but inachevé supprime les pensées intrusives
  (Masicampo et Baumeister, 2011) ; un plan de reprise réduit le résidu attentionnel (Leroy et
  Glomb, 2018) ; finir sur un pic positif (Kahneman et al., 1993).
- **Risque.** Les reports répétés nourrissent l'usure des tâches (2.3) : le compteur
  `postponedCount` est incrémenté honnêtement, le rituel n'en fait pas un reproche.

### X.3 Check-in d'énergie — livrée

- **Problème.** La heatmap d'énergie (1.3) ne s'appuie que sur l'historique de focus ; elle met
  longtemps à refléter la personne.
- **Fonction.** Trois niveaux (basse, moyenne, haute) en un toucher. Le niveau propose les
  tâches qui conviennent maintenant et ajuste la **courbe horaire** : chaque check-in tire
  l'heure concernée (et, moins, ses voisines) vers le niveau déclaré, avec une demi-vie de
  deux semaines sur une fenêtre de quatre. Cette courbe, exportée comme `labEnergyProfile`, a
  la forme attendue par `scheduler.route({ energyProfile })`.
- **Fondement.** Chronotype (Horne et Östberg, 1976) et effet du moment de la journée selon le
  type de problème (Wieth et Zacks, 2011) ; confiance faible dans la base (une étude, étudiants).
  Les poids sont des **choix produit**, documentés dans le code, pas des valeurs ajustées.
- **Risque.** Sur-interpréter quelques points : la courbe reste « tirée » vers l'a priori tant
  que les données sont rares.

### X.4 Pauses au bon moment — livrée

- **Problème.** Le minuteur Pomodoro (2.6) suit un rythme fixe ; hors session, rien n'invite à
  s'arrêter, et le type de pause n'est jamais adapté au travail en cours.
- **Fonction.** Mesure du focus continu à partir des journaux de temps du jour (un écart au
  moins égal à une pause remet le compteur à zéro). Rythmes 24/6, 12/3 ou libre. La suggestion
  varie : micro-pause, **pause en marchant** après un travail créatif, vraie pause au-delà de
  90 minutes. « Pas maintenant » reporte de 10 minutes ; la pause terminée est enregistrée.
- **Fondement.** Pauses systématiques associées à moins de fatigue que les pauses autorégulées
  (Biwer et al., 2023, rythmes 24/6 et 12/3) ; brèves coupures et attention soutenue (Ariga et
  Lleras, 2011) ; marche et pensée divergente (Oppezzo et Schwartz, 2014). Aucune durée n'est
  démontrée optimale, ce que l'interface dit explicitement.
- **Risque.** Interrompre un état de flow : jamais de notification depuis le Labo, suggestion
  dans la vue seulement, mode libre disponible.

### X.5 Bocal des victoires — livrée

- **Problème.** Les progrès de la semaine s'oublient ; le bilan hebdomadaire (7.9) commence
  souvent par ce qui manque.
- **Fonction.** Ajouter une victoire en une ligne, ou d'un toucher depuis les tâches terminées
  aujourd'hui. Le bocal se remplit de galets colorés ; un **souvenir** fait réapparaître une
  victoire plus ancienne. Les entrées `win` alimentent déjà `insights.weeklyReview`.
- **Fondement.** Principe du progrès (Amabile et Kramer, 2011 ; corrélationnel, confiance faible)
  et règle pic-fin (Kahneman et al., 1993 ; confiance modérée).
- **Risque.** Glisser vers la gamification : pas de score, pas de série, pas de comparaison.

### X.6 Correctif d'estimation visible — à intégrer

Afficher « vos estimations de ce type de tâche sont d'habitude courtes de X % » à partir des
instantanés (1.9). Fondement fort (biais de planification, Buehler et al., 1994). Relève du
routage (1.1) plus que du Labo : à proposer au propriétaire de la vue Tâches.

### X.7 Ambiance sonore liée au type de tâche — plus tard

Associer un bruit (blanc, rose, brun, déjà disponibles dans `features/focus/noise.ts`) au mode de
la tâche. Fondement partiel : un bruit modéré a aidé la créativité (Mehta et al., 2012) et le
bruit blanc certaines personnes inattentives (Söderlund et al., 2007), mais l'association
automatique n'est pas étudiée.

### X.8 « Marcher et parler » — plus tard

Capture vocale pensée pour la marche (gros bouton, sans regarder l'écran). Fondement : marche et
pensée divergente (Oppezzo et Schwartz, 2014). Dépend de la reconnaissance vocale native (2.7) et
de la plateforme ; effort élevé.

### X.9 Budget de temps hebdomadaire — plus tard

Répartir visuellement les heures de la semaine par projet ou par mode. Aucun appui direct dans la
base ; recouvre en partie l'équilibre création/organisation (7.2).

### X.10 Pré-mortem express — à explorer

Avant un projet long, imaginer qu'il a échoué et noter pourquoi. Technique connue de gestion de
projet, **absente de la base** : à documenter avant toute implémentation.

### X.11 Regroupement des notifications aux pauses — plateforme

Différer les notifications jusqu'au prochain point de rupture (fin de bloc ou pause). Fondement
solide (Iqbal et Bailey, 2008). Relève de `src/platform` et de 6.8, pas du Labo.

### X.12 Sas de transition — à explorer

Entre deux blocs, une minute pour écrire « où j'en suis » avant de changer de tâche. Même
fondement que le plan de reprise (Leroy et Glomb, 2018) ; pourrait réutiliser le champ « Demain,
je commence par » de X.2.

## 4. Données et confidentialité

Tout reste local, dans les collections existantes. Les entrées du Labo portent des étiquettes
`lab:*` (`lab:intention`, `lab:shutdown`, `lab:energy:<niveau>`, `lab:day:<AAAA-MM-JJ>`,
`lab:task:<id>`, `lab:win`) pour rester reconnaissables et filtrables ; `isLabEntry` permet aux
autres vues de les exclure de la boîte de vidage. Seul le rythme de pause choisi est conservé
dans le stockage local de l'appareil.

## 5. Mesurer avant de généraliser

Pour chaque fonction livrée, critères de sortie du Labo, à vérifier en test d'utilisabilité
([`USABILITY_TEST_PLAN.md`](../research/USABILITY_TEST_PLAN.md)) puis en usage réel, sans
télémétrie par défaut :

| Fonction | Question                                                                 | Signal local, consultable par la personne seule |
| -------- | ------------------------------------------------------------------------ | ----------------------------------------------- |
| X.1      | L'intention est-elle formulée en moins d'une minute ?                    | Intentions enregistrées par semaine             |
| X.2      | La clôture est-elle perçue comme apaisante plutôt que comme une corvée ? | Clôtures par semaine, reports annulés           |
| X.3      | Les créneaux proposés semblent-ils plus justes après deux semaines ?     | Check-ins sur 4 semaines (affiché)              |
| X.4      | Les suggestions tombent-elles à un moment acceptable ?                   | Proportion de « Pas maintenant »                |
| X.5      | Le souvenir est-il jugé agréable et non infantilisant ?                  | Victoires ajoutées par semaine                  |

## 6. Intégrations attendues hors du Labo

- **Placement automatique.** Passer `labEnergyProfile({ tasks, journal, now, timeZone,
chronotype })` comme `energyProfile` aux appels de `scheduler.route` (vues Aujourd'hui et
  Calendrier).
- **Boîte de vidage.** Exclure les entrées `isLabEntry` de la liste des vidages de cerveau.
- **Pauses.** Le compteur ne voit que les sessions de focus **enregistrées** : exposer l'état
  de la session en cours depuis `features/focus` le rendrait exact pendant un bloc.
