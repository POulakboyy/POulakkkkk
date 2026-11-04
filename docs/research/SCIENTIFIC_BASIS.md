# Base scientifique de POuxis

> Ce que la recherche dit, et ne dit pas, des 100 fonctionnalités du brief (`docs/BRIEF.md`).
> Ce document sert à choisir des valeurs par défaut, à éviter les promesses non fondées et à
> repérer ce qu'il faudra valider auprès des utilisateurs (`docs/research/USER_RESEARCH.md`).
> La bibliographie BibTeX est dans `docs/research/references.bib` (les clés entre crochets, par
> exemple `[leroy2009residue]`, y renvoient).

## Sommaire

1. [Méthode et règles d'honnêteté](#1-méthode-et-règles-dhonnêteté)
2. [Synthèse](#2-synthèse)
3. [Échelle de confiance](#3-échelle-de-confiance)
4. [Données par module](#4-données-par-module)
   - [4.1 Temps et calendrier](#41-temps-et-calendrier)
   - [4.2 Tâches et exécution](#42-tâches-et-exécution)
   - [4.3 Stockage et multi-plateforme](#43-stockage-et-multi-plateforme)
   - [4.4 Graphes et espace](#44-graphes-et-espace)
   - [4.5 Idéation et créativité](#45-idéation-et-créativité)
   - [4.6 Collaboration](#46-collaboration)
   - [4.7 Interface, bien-être et télémétrie](#47-interface-bien-être-et-télémétrie)
   - [4.8 Interface, temps de réponse et mouvement](#48-interface-temps-de-réponse-et-mouvement)
5. [Correspondance fonctionnalités → références](#5-correspondance-fonctionnalités--références)
6. [Valeurs par défaut fondées sur les preuves](#6-valeurs-par-défaut-fondées-sur-les-preuves)
7. [Ce que la recherche ne soutient pas (encore)](#7-ce-que-la-recherche-ne-soutient-pas-encore)
8. [Tensions de conception](#8-tensions-de-conception)
9. [Ce qu'il reste à mesurer](#9-ce-quil-reste-à-mesurer)
10. [Références](#10-références)

---

## 1. Méthode et règles d'honnêteté

**Périmètre.** Psychologie cognitive et sociale, comportement organisationnel, interaction
humain-machine (IHM), chronobiologie et systèmes distribués, en tant qu'ils éclairent une
fonctionnalité du brief. Ce n'est pas une revue systématique : c'est une revue ciblée, orientée
décision, qui privilégie les méta-analyses lorsqu'elles existent.

**Vérification.** Chaque référence portant un DOI a été résolue le 4 novembre 2026 auprès de
l'API Crossref (`api.crossref.org`) : auteurs, année, titre, revue, volume et pages proviennent de
cet enregistrement, pas de la mémoire. Les références sans DOI ont été contrôlées sur PubMed
(E-utilities, PMID 1027738 pour Horne et Östberg), Open Library (ouvrages de Nielsen et
d'Amabile et Kramer) ou la page de l'éditeur (W3C). Le rapport IBM de Doherty et Thadani (1982)
n'a pu être confirmé que par des sources secondaires : il est signalé comme tel.

**Règles.**

- Aucun chiffre n'est cité s'il n'a pas été lu dans le résumé vérifié ou s'il ne fait pas partie
  des résultats largement établis de l'article cité. Dans le doute, l'effet est décrit
  qualitativement.
- Les problèmes de réplication connus sont signalés à côté du résultat, pas en note de bas de page.
- Une « implication » est une **inférence de conception**, pas un résultat. Elle hérite au mieux
  de la confiance de l'étude, et souvent moins, car le contexte (laboratoire, étudiants, tâche
  artificielle) diffère d'une application de productivité utilisée au quotidien.
- Quand rien ne soutient une fonctionnalité, le document le dit. Cela ne signifie pas qu'elle est
  inutile : seulement qu'elle doit être justifiée autrement (demande utilisateur, test A/B,
  confort) et jamais présentée comme « scientifique ».

**Limites générales à garder en tête.**

- Une grande partie des études de laboratoire porte sur des étudiants, sur des tâches de quelques
  minutes, avec des échantillons modestes.
- La psychologie sociale des années 1990–2010 a traversé une crise de réplication ; les effets
  issus de cette période (amorçage, épuisement de l'ego, etc.) sont traités avec prudence même
  lorsqu'aucun échec de réplication spécifique n'est connu.
- Plusieurs principes célèbres de l'IHM (seuils de temps de réponse, loi de Hick) sont des
  synthèses d'ingénieurs plus que des résultats expérimentaux précis.

## 2. Synthèse

1. **Les interruptions coûtent, et se préparent.** Les interruptions accélèrent le travail au prix
   du stress [mark2008cost] ; changer de tâche en laissant la précédente inachevée laisse un
   « résidu attentionnel » qui dégrade la tâche suivante [leroy2009residue]. Un court plan de
   reprise (« où j'en suis, que faire ensuite ») réduit ce résidu [leroy2018readytoresume]. C'est
   l'argument le plus solide pour les _buffers_ (1.6), le mode Hyperfocus (1.11) et un rituel de
   clôture de bloc.
2. **Planifier libère l'esprit ; une heure et un lieu précis aident à passer à l'acte.** Formuler
   un plan supprime les pensées intrusives liées aux buts inachevés [masicampo2011plan] ; les
   intentions de mise en œuvre (« quand X, je fais Y ») ont un effet moyen à important sur
   l'atteinte des buts [gollwitzer2006meta]. Cela soutient la capture rapide suivie d'un
   traitement, et invite à proposer un créneau précis plutôt que de tout laisser « flotter » (1.10).
3. **Nous sous-estimons nos durées.** Le biais de planification est robuste [buehler1994planning].
   Le routage automatique (1.1) doit s'appuyer sur l'historique _personnel_ « prévu vs réel »
   (1.9) plutôt que sur l'estimation brute.
4. **Les notifications se regroupent.** Différer les notifications aux points de rupture réduit la
   frustration [iqbal2008notification] ; consulter ses courriels trois fois par jour réduit le
   stress [kushlev2015email] ; laisser les notifications actives augmente les symptômes
   d'inattention [kushlev2016silence].
5. **La créativité aime la marche, l'incubation et les contraintes.** Marcher augmente la pensée
   divergente [oppezzo2014walking] ; une pause pendant un problème créatif aide, surtout pour les
   tâches divergentes [sio2009incubation] ; une contrainte bien choisie peut rendre plus créatif
   [haughttromp2017constraints].
6. **Les séries (streaks) motivent… jusqu'à ce qu'elles cassent.** Une série rompue réduit
   l'engagement, sauf si l'on peut la « réparer » [silverman2022streaks] ; manquer un jour ne
   compromet pas la formation d'une habitude [lally2010habits]. Le « joker » de 7.3 est soutenu.
7. **La beauté influence l'utilisabilité perçue**, pas l'utilisabilité réelle
   [kurosu1995apparent ; tractinsky2000beautiful ; tuch2012beautiful]. Il faut soigner
   l'esthétique _et_ mesurer les performances réelles.
8. **Plusieurs idées populaires ne tiennent pas** : couleurs qui « boostent » la créativité,
   mémoire supérieure des tâches inachevées (effet Zeigarnik), présence du téléphone qui
   « draine » le cerveau, 25 minutes comme durée de Pomodoro optimale, cycles de 90 minutes
   comme loi. Voir la [section 7](#7-ce-que-la-recherche-ne-soutient-pas-encore).

## 3. Échelle de confiance

| Niveau          | Critère                                                                                                                                             |
| --------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Forte**       | Méta-analyse ou ensemble convergent de réplications, effet pertinent pour l'usage visé, transposition directe vers l'interface.                     |
| **Modérée**     | Une ou plusieurs études solides (expérimentales ou de terrain), sans échec de réplication connu, mais contexte éloigné ou effet peu quantifié.      |
| **Faible**      | Étude unique, petit échantillon, réplication contestée, ou transposition par analogie (le mécanisme est plausible, l'application n'est pas testée). |
| **Spéculative** | Aucune donnée directe ; choix de conception raisonnable à valider par la recherche utilisateur.                                                     |

## 4. Données par module

Format de chaque fiche : **affirmation** — études (auteur, année, titre, revue, DOI) — ce qui a
été trouvé — limites — implication pour POuxis — confiance.

### 4.1 Temps et calendrier

#### Transitions entre tâches et résidu attentionnel (1.6, 1.11, 1.15)

- **Études.**
  - Leroy, S. (2009). _Why is it so hard to do my work? The challenge of attention residue when
    switching between work tasks._ Organizational Behavior and Human Decision Processes, 109(2),
    168–181. doi:10.1016/j.obhdp.2009.04.002
  - Leroy, S. et Glomb, T. M. (2018). _Tasks interrupted: How anticipating time pressure on
    resumption of an interrupted task causes attention residue and low performance on
    interrupting tasks and how a "ready-to-resume" plan mitigates the effects._ Organization
    Science, 29(3), 380–397. doi:10.1287/orsc.2017.1184
  - Mark, G., Gudith, D. et Klocke, U. (2008). _The cost of interrupted work: More speed and
    stress._ CHI 2008, 107–110. doi:10.1145/1357054.1357072
- **Résultats.** Passer à une tâche B alors que A n'est pas terminée laisse des pensées sur A qui
  dégradent la performance sur B (Leroy, 2009). Anticiper une pression temporelle à la reprise
  aggrave ce résidu ; rédiger un bref plan « prêt à reprendre » avant de changer de tâche
  l'atténue (Leroy et Glomb, 2018). Les personnes interrompues compensent en travaillant plus vite,
  au prix d'un stress, d'une frustration et d'un effort perçus plus élevés (Mark et al., 2008).
- **Limites.** Tâches de laboratoire courtes ; aucune de ces études ne fixe une durée optimale de
  transition. Le chiffre de « 5 à 15 minutes » du brief n'est donc pas issu de ces travaux.
- **Implication.** Le buffer (1.6) vaut surtout par ce qu'on y fait : proposer, à la fin d'un
  bloc, une invite « Où en suis-je ? Prochaine étape ? » d'une ligne, enregistrée dans la tâche et
  réaffichée à la reprise. La durée du buffer est un réglage, pas un résultat de recherche.
- **Confiance.** Modérée (mécanisme) ; spéculative (durée par défaut).

#### Biais de planification et estimation des durées (1.1, 1.2, 1.9)

- **Étude.** Buehler, R., Griffin, D. et Ross, M. (1994). _Exploring the "planning fallacy": Why
  people underestimate their task completion times._ Journal of Personality and Social
  Psychology, 67(3), 366–381. doi:10.1037/0022-3514.67.3.366
- **Résultats.** Les personnes sous-estiment de façon systématique le temps nécessaire pour finir
  leurs propres projets, même quand elles savent que leurs prévisions passées étaient trop
  optimistes ; elles se concentrent sur le scénario futur plutôt que sur leur historique. Inciter
  à relier la prévision aux expériences passées réduit le biais.
- **Limites.** Échantillons étudiants (mémoires, devoirs) ; l'ampleur du biais varie selon la
  tâche et la personne.
- **Implication.** Le routage (1.1) doit corriger les estimations par le ratio personnel
  « durée réelle / durée estimée », calculé à partir des instantanés de planification (1.9) et
  du minuteur par tâche (2.6), et le montrer (« vos estimations de ce type de tâche sont
  d'habitude courtes de X % »). La propagation des retards (1.2) est la conséquence logique d'un
  biais attendu, pas une exception.
- **Confiance.** Forte (existence du biais) ; modérée (efficacité d'un correctif automatique, non
  testée dans une application).

#### Rythmes circadiens, chronotype et moment de la journée (1.3)

- **Études.**
  - Horne, J. A. et Östberg, O. (1976). _A self-assessment questionnaire to determine
    morningness-eveningness in human circadian rhythms._ International Journal of
    Chronobiology, 4(2), 97–110. PMID 1027738.
  - Wieth, M. B. et Zacks, R. T. (2011). _Time of day effects on problem solving: When the
    non-optimal is optimal._ Thinking & Reasoning, 17(4), 387–401.
    doi:10.1080/13546783.2011.625663
  - Kleitman, N. (1982). _Basic rest-activity cycle — 22 years later._ Sleep, 5(4), 311–317.
    doi:10.1093/sleep/5.4.311
- **Résultats.** Le questionnaire matin-soir (MEQ) mesure un chronotype stable et validé.
  Wieth et Zacks observent que les problèmes d'_insight_ sont mieux résolus au moment
  **non optimal** de la journée (moins d'inhibition), sans différence pour les problèmes
  analytiques. Kleitman propose un cycle de repos-activité d'environ 90 minutes prolongeant le
  cycle du sommeil à l'éveil ; c'est une hypothèse théorique dont le support en éveil reste
  discuté.
- **Limites.** Wieth et Zacks : une seule étude, étudiants, problèmes d'insight classiques.
  Kleitman : article de synthèse, pas un protocole expérimental.
- **Implication.** La heatmap d'énergie (1.3) peut proposer un questionnaire de chronotype
  facultatif comme point de départ, puis apprendre de l'historique. Elle doit distinguer
  « heures de concentration analytique » et « heures propices aux idées » plutôt que de
  désigner une seule « meilleure heure ». Attention : l'historique reflète les habitudes et les
  contraintes, pas seulement la capacité ; l'afficher comme une suggestion, jamais comme un
  verdict.
- **Confiance.** Forte (chronotype) ; faible (insight au moment non optimal) ; spéculative
  (cycle de 90 minutes appliqué au travail).

#### Blocs de travail profond (1.15)

- **Études.**
  - Ericsson, K. A., Krampe, R. T. et Tesch-Römer, C. (1993). _The role of deliberate practice in
    the acquisition of expert performance._ Psychological Review, 100(3), 363–406.
    doi:10.1037/0033-295X.100.3.363
  - Macnamara, B. N., Hambrick, D. Z. et Oswald, F. L. (2014). _Deliberate practice and
    performance in music, games, sports, education, and professions: A meta-analysis._
    Psychological Science, 25(8), 1608–1618. doi:10.1177/0956797614535810
  - Perlow, L. A. (1999). _The time famine: Toward a sociology of work time._ Administrative
    Science Quarterly, 44(1), 57–81. doi:10.2307/2667031
  - Graham, P. (2009). _Maker's Schedule, Manager's Schedule_ (essai, non empirique).
- **Résultats.** Ericsson et al. avancent que la pratique délibérée soutenue est limitée à
  quelques heures par jour (de l'ordre de quatre chez les musiciens étudiés). La méta-analyse de
  Macnamara et al. relativise fortement le rôle de la pratique : elle explique 26 % de la variance
  de performance dans les jeux, 21 % en musique, 18 % en sport, 4 % en éducation et moins de 1 %
  dans les professions. Perlow décrit, dans une équipe d'ingénieurs logiciel, une culture
  d'interruptions permanentes et l'essai de plages collectives sans interruption (« quiet
  time ») ; les bénéfices perçus ne se sont pas maintenus une fois l'intervention terminée.
- **Limites.** Aucune étude ne démontre que « 4 heures » est un seuil ; c'est l'essai de Graham
  qui popularise l'idée de blocs d'une demi-journée.
- **Implication.** La protection du « maker schedule » (1.15) est défendable comme réduction des
  interruptions (voir 1.6 et 4.6), pas comme un seuil biologique de 4 heures. La durée doit être
  réglable ; l'alerte doit informer et non refuser (autonomie, voir 4.7). Les gains d'une plage
  protégée dépendent aussi des collègues : en mode équipe, rendre la plage visible.
- **Confiance.** Faible (durée) ; modérée (réduire les interruptions).

#### Plans précis plutôt que tâches flottantes (1.10, 2.11)

- **Études.**
  - Gollwitzer, P. M. (1999). _Implementation intentions: Strong effects of simple plans._
    American Psychologist, 54(7), 493–503. doi:10.1037/0003-066X.54.7.493
  - Gollwitzer, P. M. et Sheeran, P. (2006). _Implementation intentions and goal achievement: A
    meta-analysis of effects and processes._ Advances in Experimental Social Psychology, 38,
    69–119. doi:10.1016/S0065-2601(06)38002-1
  - Masicampo, E. J. et Baumeister, R. F. (2011). _Consider it done! Plan making can eliminate the
    cognitive effects of unfulfilled goals._ Journal of Personality and Social Psychology,
    101(4), 667–683. doi:10.1037/a0024192
- **Résultats.** Les intentions de mise en œuvre (« si situation X, alors action Y ») améliorent
  l'atteinte des buts ; la méta-analyse (94 tests indépendants) rapporte un effet moyen à
  important (d ≈ 0,65). Masicampo et Baumeister montrent que les buts inachevés provoquent des
  pensées intrusives qui gênent une autre tâche, et qu'élaborer un plan précis supprime cet effet
  sans que le but soit atteint.
- **Limites.** Masicampo et Baumeister : issu d'un laboratoire et d'une période concernés par la
  crise de réplication (ego depletion) ; à notre connaissance, pas de réplication directe à grande
  échelle. Les effets des intentions de mise en œuvre sont plus faibles dans les études récentes
  et préenregistrées que dans les premières.
- **Implication.** Après une capture (2.11, 5.14), proposer un traitement rapide : prochaine
  action + quand/où. Pour une tâche flottante (1.10), suggérer un créneau concret dans la
  journée plutôt que de la laisser indéfiniment flottante ; l'aimantation automatique est
  utile si elle débouche sur un créneau explicite et visible.
- **Confiance.** Forte (intentions de mise en œuvre) ; faible à modérée (plan making).

#### Visualiser le temps : spirale et barre de progression absolue (1.4, 1.14)

- **Études.**
  - Weber, M., Alexa, M. et Müller, W. (2001). _Visualizing time-series on spirals._ IEEE
    InfoVis 2001, 7–13. doi:10.1109/INFVIS.2001.963273
  - Barkley, R. A. (1997). _Behavioral inhibition, sustained attention, and executive functions:
    Constructing a unifying theory of ADHD._ Psychological Bulletin, 121(1), 65–94.
    doi:10.1037/0033-2909.121.1.65
- **Résultats.** Les spirales font ressortir les motifs périodiques lorsque la période de la
  spirale correspond à celle des données ; ils sont masqués sinon. Barkley décrit le TDAH comme un
  déficit d'inhibition qui affecte notamment la perception et la gestion du temps ; c'est un
  cadre théorique, souvent invoqué pour « externaliser le temps ».
- **Limites.** Weber et al. : article de technique de visualisation, sans évaluation de la
  planification. Barkley : théorie, pas un essai d'intervention.
- **Implication.** La spirale (1.4) est adaptée à l'analyse de régularités (heatmap d'énergie,
  habitudes) ; pour planifier une semaine, une vue linéaire reste plus sûre. La barre de
  progression absolue (1.14) est cohérente avec l'idée d'externaliser le temps, mais doit rester
  discrète (filigrane) pour ne pas créer d'anxiété.
- **Confiance.** Faible (spirale pour planifier) ; spéculative (barre absolue).

#### Synchronisation et local-first (1.7, 3.1, 3.11)

- **Études.**
  - Shapiro, M., Preguiça, N., Baquero, C. et Zawirski, M. (2011). _Conflict-free replicated data
    types._ SSS 2011, LNCS 6976, 386–400. doi:10.1007/978-3-642-24550-3_29
  - Kleppmann, M., Wiggins, A., van Hardenberg, P. et McGranaghan, M. (2019). _Local-first
    software: You own your data, in spite of the cloud._ Onward! 2019, 154–178.
    doi:10.1145/3359591.3359737
- **Résultats.** Les CRDT garantissent formellement la convergence des répliques sans
  coordination. Kleppmann et al. formulent des idéaux du logiciel local-first (pas d'attente
  réseau, multi-appareil, hors-ligne, collaboration, longévité, confidentialité, contrôle par
  l'utilisateur) et en discutent la faisabilité.
- **Limites.** Ce sont des résultats d'informatique (preuves, prototypes), pas des études
  d'usage.
- **Implication.** Choix d'architecture justifié sur le plan technique ; côté utilisateur, il
  rejoint les seuils de temps de réponse (4.8).
- **Confiance.** Forte (propriétés techniques) ; spéculative (effet sur l'adoption, à mesurer :
  voir R5 de `USER_RESEARCH.md`).

### 4.2 Tâches et exécution

#### Mémoire de travail et limite de travail en cours (2.15, 2.14)

- **Études.**
  - Cowan, N. (2001). _The magical number 4 in short-term memory: A reconsideration of mental
    storage capacity._ Behavioral and Brain Sciences, 24(1), 87–114.
    doi:10.1017/S0140525X01003922
  - Sweller, J. (1988). _Cognitive load during problem solving: Effects on learning._ Cognitive
    Science, 12(2), 257–285. doi:10.1207/s15516709cog1202_4
- **Résultats.** La capacité de stockage à court terme serait d'environ 3 à 5 éléments
  regroupés (« chunks »), loin du « 7 ± 2 » souvent cité. La théorie de la charge cognitive
  montre que les ressources consommées par la gestion de la tâche réduisent celles disponibles
  pour l'apprentissage.
- **Limites.** Une liste de priorités affichée à l'écran n'est pas stockée en mémoire de travail :
  la transposition est une analogie. Aucune étude ne fixe le nombre idéal de priorités
  quotidiennes.
- **Implication.** Une limite de 3 à 5 priorités par jour (2.15) est cohérente avec ces travaux,
  mais elle doit être un garde-fou explicable (« Vous avez déjà 5 priorités. En remplacer
  une ? ») plutôt qu'un blocage. Le mode Focus unique (2.14) réduit la charge extrinsèque.
- **Confiance.** Forte (capacité limitée) ; faible (valeur exacte de la limite).

#### Sous-buts proximaux et décomposition (2.2, 2.1)

- **Études.**
  - Bandura, A. et Schunk, D. H. (1981). _Cultivating competence, self-efficacy, and intrinsic
    interest through proximal self-motivation._ Journal of Personality and Social Psychology,
    41(3), 586–598. doi:10.1037/0022-3514.41.3.586
  - Steel, P. (2007). _The nature of procrastination: A meta-analytic and theoretical review of
    quintessential self-regulatory failure._ Psychological Bulletin, 133(1), 65–94.
    doi:10.1037/0033-2909.133.1.65
  - Locke, E. A. et Latham, G. P. (2002). _Building a practically useful theory of goal setting
    and task motivation: A 35-year odyssey._ American Psychologist, 57(9), 705–717.
    doi:10.1037/0003-066X.57.9.705
- **Résultats.** Des enfants en difficulté en mathématiques ayant des sous-buts proches ont
  progressé plus vite et développé plus de sentiment d'efficacité et d'intérêt que ceux ayant un
  but lointain (Bandura et Schunk). La procrastination est associée à l'aversion pour la tâche, à
  l'éloignement de l'échéance et à l'impulsivité (Steel, méta-analyse). Des buts précis et
  exigeants produisent de meilleures performances que « faites de votre mieux » (Locke et
  Latham).
- **Limites.** Bandura et Schunk : enfants, contexte scolaire, effectif réduit. Steel : données
  majoritairement corrélationnelles.
- **Implication.** La décomposition (2.2) doit produire des **premières étapes petites et
  concrètes** et afficher la prochaine, pas une liste de 15 sous-tâches d'un coup (voir aussi
  Hick, 4.8). Masquer les tâches bloquées (2.1) réduit le bruit, à condition de pouvoir
  afficher la chaîne de dépendances à la demande.
- **Confiance.** Modérée.

#### Urgence vs importance (2.4)

- **Étude.** Zhu, M., Yang, Y. et Hsee, C. K. (2018). _The mere urgency effect._ Journal of
  Consumer Research. doi:10.1093/jcr/ucy008
- **Résultats.** Les personnes privilégient des tâches urgentes (fenêtre courte) au détriment de
  tâches importantes offrant un meilleur gain, même lorsque l'urgence est fictive.
- **Limites.** Tâches expérimentales et choix simulés.
- **Implication.** Une matrice d'Eisenhower « calculée » (2.4) à partir des seules échéances
  reproduirait ce biais : l'importance doit être saisie ou confirmée par l'utilisateur, jamais
  déduite de la date. Afficher explicitement les tâches importantes non urgentes.
- **Confiance.** Modérée.

#### Pauses : Pomodoro et pauses autorégulées (2.6)

- **Études.**
  - Biwer, F., Wiradhany, W., oude Egbrink, M. G. A. et de Bruin, A. B. H. (2023).
    _Understanding effort regulation: Comparing "Pomodoro" breaks and self-regulated breaks._
    British Journal of Educational Psychology, 93(S2), 353–367. doi:10.1111/bjep.12593
  - Ariga, A. et Lleras, A. (2011). _Brief and rare mental "breaks" keep you focused: Deactivation
    and reactivation of task goals preempt vigilance decrements._ Cognition, 118(3), 439–443.
    doi:10.1016/j.cognition.2010.12.007
- **Résultats.** Chez 87 étudiants en session d'étude réelle, les pauses systématiques (24 min
  de travail / 6 min de pause, ou 12 / 3) se sont accompagnées de moins de fatigue et de
  distraction, de plus de concentration et de motivation, avec un taux d'achèvement identique en
  moins de temps, par rapport aux pauses autorégulées (plus longues). Ariga et Lleras montrent
  que de brèves déconnexions de l'objectif évitent la baisse de vigilance lors d'une tâche
  prolongée.
- **Limites.** Biwer et al. : une seule journée, étudiants, pas de différence d'effort investi ni
  d'achèvement ; aucune comparaison de durées au-delà de deux formats. Rien n'établit que
  25 / 5 est optimal.
- **Implication.** Proposer des pauses systématiques par défaut, avec la durée réglable et un
  mode « pauses libres ». Le minuteur par tâche (2.6) alimente le correctif d'estimation (4.1).
- **Confiance.** Modérée (pauses planifiées) ; spéculative (durée optimale).

#### Marcher et capturer à la voix (2.7)

- Voir 4.5 (Oppezzo et Schwartz, 2014). La capture vocale en marchant est cohérente avec l'effet
  de la marche sur la pensée divergente. **Confiance : modérée.**

#### Usure de la tâche et culpabilité (2.3)

- **Aucune étude identifiée** sur le changement de couleur d'une tâche reportée. La
  procrastination est liée à l'aversion pour la tâche (Steel, 2007) : une tâche qui « rougit »
  pourrait accroître cette aversion. **Implication :** préférer une couleur neutre (vers le gris)
  et une question utile (« Reporter, découper ou abandonner ? ») plutôt qu'un signal d'alarme.
  **Confiance : spéculative.**

### 4.3 Stockage et multi-plateforme

#### Latence et local-first (3.1, 7.1)

- Voir 4.1 (Kleppmann et al., 2019) et 4.8 (seuils de temps de réponse). Une base locale permet
  de tenir le seuil de 0,1 s pour les actions directes, ce qu'un aller-retour réseau ne garantit
  pas. **Confiance : modérée.**

#### Mémoire et retrouvabilité (3.2, 3.14, 5.15)

- **Étude.** Ghibellini, R. et Meier, B. (2025). _Interruption, recall and resumption: A
  meta-analysis of the Zeigarnik and Ovsiankina effects._ Humanities and Social Sciences
  Communications, 12(1). doi:10.1057/s41599-025-05000-w
- **Résultats.** Aucun avantage mnésique des tâches inachevées (effet Zeigarnik), mais une
  tendance générale à **reprendre** les tâches interrompues (effet Ovsiankina).
- **Implication.** Le détecteur de « Dead Ends » (5.15) ne doit pas supposer que l'utilisateur se
  souvient de ses brouillons : il doit les lui rappeler, avec un bouton « reprendre » en un geste.
  Le backlinking (3.14) aide à retrouver le contexte. Aucune étude citée ici n'évalue la
  recherche sémantique (3.2).
- **Confiance.** Modérée (reprise) ; spéculative (recherche sémantique).

#### Autres fonctionnalités du module

- Chiffrement (3.5), OCR (3.4), compression (3.6), aperçus (3.7), pointeurs de fichiers (3.8),
  partage (3.10), drag & drop natif (3.12), métadonnées (3.13), CLI (3.15) : choix d'ingénierie
  ou de confort sans base comportementale spécifique recensée ici. Le nettoyage automatique (3.9)
  touche à la confiance : aucune donnée, prudence (archiver, jamais supprimer sans accord).

### 4.4 Graphes et espace

#### Mémoire spatiale et stabilité des positions (4.1, 4.2, 4.3, 4.5)

- **Étude.** Robertson, G., Czerwinski, M., Larson, K., Robbins, D. C., Thiel, D. et van Dantzich,
  M. (1998). _Data Mountain: Using spatial memory for document management._ UIST 1998, 153–162.
  doi:10.1145/288392.288596
- **Résultats.** Disposer soi-même des documents dans un espace (pseudo-3D) a permis de les
  retrouver plus rapidement qu'avec une liste de favoris classique.
- **Limites.** Prototype, échantillon modeste, documents de type page web.
- **Implication.** **Tension avec le layout automatique (4.2)** : un algorithme à forces
  (Fruchterman et Reingold, 1991, doi:10.1002/spe.4380211102) qui redistribue les nœuds détruit
  les repères spatiaux de l'utilisateur. Le layout doit être déclenché à la demande, animé
  (constance d'objet, voir 4.8), annulable, et épingler les nœuds déplacés à la main.
- **Confiance.** Modérée.

#### Vue d'ensemble et minimap (4.13, 4.10)

- **Étude.** Hornbæk, K., Bederson, B. B. et Plaisant, C. (2002). _Navigation patterns and
  usability of zoomable user interfaces with and without an overview._ ACM Transactions on
  Computer-Human Interaction, 9(4), 362–389. doi:10.1145/586081.586086
- **Résultats.** Les participants ont préféré l'interface avec vue d'ensemble, mais celle-ci
  n'a pas été systématiquement plus rapide ; selon la tâche, elle pouvait même ralentir la
  navigation.
- **Implication.** Minimap (4.13) repliable, masquée par défaut sur petits écrans ; mesurer les
  temps de navigation plutôt que de se fier à la préférence déclarée.
- **Confiance.** Modérée.

#### Repli de branches et complexité (4.9, 4.15)

- Charge cognitive (Sweller, 1988) et encombrement visuel (Rosenholtz et al., 2007, voir 4.8) :
  replier des branches réduit la charge extrinsèque. **Confiance : faible** (analogie).

#### Rendu massif, stylet, IA (4.1, 4.6, 4.8, 4.12)

- Pas de base comportementale spécifique recensée. Le seuil de fluidité relève des temps de
  réponse (4.8). **Confiance : spéculative.**

### 4.5 Idéation et créativité

#### Marche et pensée divergente (2.7, 5.7)

- **Étude.** Oppezzo, M. et Schwartz, D. L. (2014). _Give your ideas some legs: The positive
  effect of walking on creative thinking._ Journal of Experimental Psychology: Learning, Memory,
  and Cognition, 40(4), 1142–1152. doi:10.1037/a0036577
- **Résultats.** Marcher (sur tapis roulant ou dehors) augmente la production d'idées
  originales (usages alternatifs), avec un effet résiduel peu après s'être rassis ; l'effet ne
  s'étend pas à la pensée convergente.
- **Limites.** Étudiants, tâches de laboratoire ; mesure de fluidité et d'originalité, pas
  d'idées « utiles » en contexte réel.
- **Implication.** Capture vocale rapide et utilisable en marchant (2.7) ; suggérer une marche
  lors d'un blocage créatif, pas lors d'un blocage analytique.
- **Confiance.** Modérée.

#### Incubation et vagabondage mental (5.15, pauses)

- **Études.**
  - Sio, U. N. et Ormerod, T. C. (2009). _Does incubation enhance problem solving? A
    meta-analytic review._ Psychological Bulletin, 135(1), 94–120. doi:10.1037/a0014212
  - Baird, B., Smallwood, J., Mrazek, M. D., Kam, J. W. Y., Franklin, M. S. et Schooler, J. W.
    (2012). _Inspired by distraction: Mind wandering facilitates creative incubation._
    Psychological Science, 23(10), 1117–1122. doi:10.1177/0956797612446024
- **Résultats.** La méta-analyse confirme un effet positif de l'incubation, plus marqué pour les
  tâches divergentes et après une période de préparation plus longue. Baird et al. observent
  qu'une tâche peu exigeante pendant l'incubation améliore la performance sur des problèmes déjà
  rencontrés, davantage qu'une tâche exigeante, le repos ou l'absence de pause.
- **Limites.** Baird et al. : étude unique, échantillon modeste ; à traiter comme une hypothèse.
- **Implication.** Après un long effort créatif sans progrès, proposer une pause avec une
  activité simple (marcher, ranger) plutôt que de passer directement à une tâche exigeante ; le
  retour sur l'idée doit être facilité (5.15).
- **Confiance.** Forte (incubation) ; faible (rôle spécifique du vagabondage).

#### Contraintes (5.4)

- **Étude.** Haught-Tromp, C. (2017). _The Green Eggs and Ham hypothesis: How constraints
  facilitate creativity._ Psychology of Aesthetics, Creativity, and the Arts, 11(1), 10–17.
  doi:10.1037/aca0000061
- **Résultats.** Devoir intégrer des mots imposés a conduit à des textes courts jugés plus
  créatifs que sans contrainte.
- **Limites.** Tâche d'écriture brève ; la relation entre contrainte et créativité dépend du
  type et du niveau de contrainte.
- **Implication.** Le générateur de contraintes (5.4) est défendable : une contrainte à la fois,
  facultative, avec possibilité d'en tirer une autre.
- **Confiance.** Faible à modérée.

#### Associations éloignées et sérendipité (5.1, 5.12)

- **Étude.** Mednick, S. (1962). _The associative basis of the creative process._ Psychological
  Review, 69(3), 220–232. doi:10.1037/h0048850
- **Résultats.** Théorie : la créativité consiste à combiner des éléments associativement
  éloignés ; elle a inspiré le test des associations éloignées (RAT).
- **Limites.** Théorie ; rien ne montre qu'un rapprochement _aléatoire_ de deux notes produise de
  meilleures idées.
- **Implication.** Le Random Connector (5.1) est une hypothèse à tester (CSI, voir 9), pas une
  fonctionnalité « prouvée ». Laisser l'utilisateur ignorer ou rejeter une association sans coût.
- **Confiance.** Spéculative.

#### Bruit ambiant (5.13)

- **Études.**
  - Mehta, R., Zhu, R. et Cheema, A. (2012). _Is noise always bad? Exploring the effects of
    ambient noise on creative cognition._ Journal of Consumer Research, 39(4), 784–799.
    doi:10.1086/665048
  - Söderlund, G., Sikström, S. et Smart, A. (2007). _Listen to the noise: Noise is beneficial
    for cognitive performance in ADHD._ Journal of Child Psychology and Psychiatry, 48(8),
    840–847. doi:10.1111/j.1469-7610.2007.01749.x
- **Résultats.** Un bruit ambiant modéré (environ 70 dB) a amélioré la performance créative par
  rapport à un niveau faible (50 dB) ou élevé (85 dB) (Mehta et al.). Le bruit blanc a amélioré
  la performance de mémoire d'enfants inattentifs et l'a dégradée chez les enfants sans
  difficulté d'attention (Söderlund et al.).
- **Limites.** Un seul article pour l'effet créatif ; une application ne contrôle pas le niveau
  sonore réel (casque, volume système). Les effets dépendent fortement des individus.
- **Implication.** Ambiance sonore facultative, désactivée par défaut, avec un volume initial
  bas ; proposée pour les sessions d'idéation, pas pour la concentration analytique.
- **Confiance.** Faible.

#### Écriture expressive et journal de friction (5.5)

- **Études.**
  - Pennebaker, J. W. (1997). _Writing about emotional experiences as a therapeutic process._
    Psychological Science, 8(3), 162–166. doi:10.1111/j.1467-9280.1997.tb00403.x
  - Frattaroli, J. (2006). _Experimental disclosure and its moderators: A meta-analysis._
    Psychological Bulletin, 132(6), 823–865. doi:10.1037/0033-2909.132.6.823
  - Klein, K. et Boals, A. (2001). _Expressive writing can increase working memory capacity._
    Journal of Experimental Psychology: General, 130(3), 520–533.
    doi:10.1037/0096-3445.130.3.520
- **Résultats.** Écrire sur des expériences émotionnelles a des effets bénéfiques ; la
  méta-analyse de Frattaroli conclut à un effet global faible, variable selon les modérateurs.
  Klein et Boals observent une hausse de la capacité de mémoire de travail et une baisse des
  pensées intrusives après une écriture expressive sur un événement négatif.
- **Limites.** Le journal de friction porte sur des blocages de travail, pas sur des expériences
  émotionnelles marquantes : la transposition est une analogie.
- **Implication.** Journal privé, non mesuré, non partagé par défaut, sans score ; la valeur
  attendue est de « vider » un blocage pour revenir au travail.
- **Confiance.** Faible (analogie).

#### Couleur et créativité (5.2, 5.12, thèmes)

- **Études.**
  - Mehta, R. et Zhu, R. (2009). _Blue or red? Exploring the effect of color on cognitive task
    performances._ Science, 323(5918), 1226–1229. doi:10.1126/science.1169144
  - Steele, K. M. (2014). _Failure to replicate the Mehta and Zhu (2009) color-priming effect on
    anagram solution times._ Psychonomic Bulletin & Review, 21(3), 771–776.
    doi:10.3758/s13423-013-0548-3
- **Résultats.** Mehta et Zhu rapportaient un avantage du rouge pour les tâches de détail et du
  bleu pour les tâches créatives. Steele n'a pas reproduit l'effet sur les anagrammes.
- **Implication.** Ne pas choisir ni promouvoir une palette pour « stimuler la créativité ». Les
  couleurs se choisissent pour le contraste, la lisibilité et l'identité.
- **Confiance.** Faible (effet contesté) — classé en [section 7](#7-ce-que-la-recherche-ne-soutient-pas-encore).

#### Mesurer le soutien à la créativité (tout le module 5)

- **Étude.** Cherry, E. et Latulipe, C. (2014). _Quantifying the creativity support of digital
  tools through the Creativity Support Index._ ACM Transactions on Computer-Human Interaction,
  21(4), 1–25. doi:10.1145/2617588
- **Résultats.** Questionnaire psychométrique (CSI) couvrant exploration, expressivité,
  immersion, plaisir, résultats à la hauteur de l'effort et collaboration, avec pondération par
  comparaisons par paires.
- **Implication.** Utiliser le CSI pour évaluer les outils du module 5 (voir R6 de
  `USER_RESEARCH.md`) au lieu d'affirmer qu'ils « boostent » la créativité.
- **Confiance.** Forte (outil de mesure validé).

#### Machine à écrire stricte, prompts visuels, banques d'assets, SCAMPER, 6 chapeaux (5.3, 5.9, 5.10, 5.12)

- **Aucune étude vérifiée** dans le cadre de ce document. Le mode machine à écrire (5.3) repose
  sur une intuition (séparer rédaction et révision) répandue chez les auteurs, mais nous n'avons
  pas de référence expérimentale vérifiée à citer. **Confiance : spéculative.**

### 4.6 Collaboration

#### Notifications, regroupement et points de rupture (6.8, 1.11)

- **Études.**
  - Iqbal, S. T. et Bailey, B. P. (2008). _Effects of intelligent notification management on users
    and their tasks._ CHI 2008, 93–102. doi:10.1145/1357054.1357070
  - Iqbal, S. T. et Horvitz, E. (2007). _Disruption and recovery of computing tasks: Field study,
    analysis, and directions._ CHI 2007, 677–686. doi:10.1145/1240624.1240730
  - Czerwinski, M., Horvitz, E. et Wilhite, S. (2004). _A diary study of task switching and
    interruptions._ CHI 2004, 175–182. doi:10.1145/985692.985715
  - Mark, G., González, V. M. et Harris, J. (2005). _No task left behind? Examining the nature of
    fragmented work._ CHI 2005, 321–330. doi:10.1145/1054972.1055017
  - Kushlev, K. et Dunn, E. W. (2015). _Checking email less frequently reduces stress._ Computers
    in Human Behavior, 43, 220–228. doi:10.1016/j.chb.2014.11.005
  - Mark, G., Iqbal, S. T., Czerwinski, M., Johns, P., Sano, A. et Lutchyn, Y. (2016). _Email
    duration, batching and self-interruption._ CHI 2016, 1717–1728.
    doi:10.1145/2858036.2858262
  - Kushlev, K., Proulx, J. et Dunn, E. W. (2016). _"Silence your phones": Smartphone
    notifications increase inattention and hyperactivity symptoms._ CHI 2016, 1011–1020.
    doi:10.1145/2858036.2858359
  - Stothart, C., Mitchum, A. et Yehnert, C. (2015). _The attentional cost of receiving a cell
    phone notification._ Journal of Experimental Psychology: Human Perception and Performance,
    41(4), 893–897. doi:10.1037/xhp0000100
- **Résultats.** Différer les notifications jusqu'à un point de rupture de la tâche réduit la
  frustration et le temps de réaction par rapport à une remise immédiate (Iqbal et Bailey).
  Sur le terrain, une alerte conduit souvent à visiter d'autres applications avant de revenir à
  la tâche suspendue (Iqbal et Horvitz) ; le travail est fragmenté et les tâches complexes sont
  plus difficiles à reprendre (Czerwinski et al. ; Mark et al., 2005). Limiter la consultation
  des courriels à trois fois par jour pendant une semaine a réduit le stress quotidien (Kushlev
  et Dunn). Dans l'étude de terrain de Mark et al. (2016), le temps passé sur les courriels était
  associé à un stress plus élevé, et le traitement groupé n'était pas, en soi, associé à un
  stress moindre. Une semaine avec notifications actives a augmenté les symptômes d'inattention
  et d'hyperactivité (Kushlev et al., 2016). Recevoir une notification, même sans y répondre,
  dégrade une tâche exigeant de l'attention (Stothart et al.).
- **Limites.** Effets modestes, populations variées (étudiants, employés d'une même
  entreprise) ; le regroupement aide surtout s'il réduit la fréquence de consultation.
- **Implication.** Boîte de réception d'équipe (6.8) en **digest** par défaut (quelques remises
  par jour, réglables), notifications urgentes explicitement marquées par l'expéditeur, remise
  différée pendant les blocs de focus et à la fin d'un bloc (point de rupture naturel).
- **Confiance.** Modérée à forte (ensemble convergent).

#### Brainstorming en groupe et votes (6.10, 6.4)

- **Étude.** Diehl, M. et Stroebe, W. (1987). _Productivity loss in brainstorming groups: Toward
  the solution of a riddle._ Journal of Personality and Social Psychology, 53(3), 497–509.
  doi:10.1037/0022-3514.53.3.497
- **Résultats.** Le blocage de production (attendre son tour pour parler) explique l'essentiel
  de la perte de productivité des groupes de brainstorming par rapport à des individus
  travaillant séparément.
- **Implication.** Pour les sondages et l'idéation en équipe (6.10), recueillir d'abord les
  idées individuellement et en parallèle (asynchrone), puis les révéler ; masquer les votes des
  autres jusqu'à son propre vote.
- **Confiance.** Forte (effet ancien et répliqué).

#### Statuts vidéo asynchrones, canaux vocaux (6.6, 6.13)

- Perlow (1999, voir 4.1) documente le coût des interruptions dans une équipe. Les statuts
  asynchrones (6.6) remplacent une interruption synchrone ; les canaux vocaux persistants (6.13)
  pourraient au contraire en créer. **Confiance : spéculative.**

#### Export, API, webhooks, SSO, audit (6.1–6.3, 6.5, 6.11, 6.14)

- Choix d'écosystème et de conformité ; l'export sans enfermement (6.11) correspond aux idéaux
  de longévité et de contrôle de Kleppmann et al. (2019). Pas de base comportementale.

### 4.7 Interface, bien-être et télémétrie

#### Motivation, autonomie et récompenses (7.2, 7.3, 7.5, 7.9)

- **Études.**
  - Deci, E. L. et Ryan, R. M. (2000). _The "what" and "why" of goal pursuits: Human needs and the
    self-determination of behavior._ Psychological Inquiry, 11(4), 227–268.
    doi:10.1207/S15327965PLI1104_01
  - Ryan, R. M. et Deci, E. L. (2000). _Self-determination theory and the facilitation of
    intrinsic motivation, social development, and well-being._ American Psychologist, 55(1),
    68–78. doi:10.1037/0003-066X.55.1.68
  - Deci, E. L., Koestner, R. et Ryan, R. M. (1999). _A meta-analytic review of experiments
    examining the effects of extrinsic rewards on intrinsic motivation._ Psychological
    Bulletin, 125(6), 627–668. doi:10.1037/0033-2909.125.6.627
- **Résultats.** La théorie de l'autodétermination (TAD) distingue trois besoins : autonomie,
  compétence, affiliation. La méta-analyse de 1999 conclut que les récompenses tangibles
  attendues et conditionnées à la tâche réduisent la motivation intrinsèque, alors que le retour
  verbal positif tend à l'augmenter.
- **Implication.** Pas de points, badges ni classements par défaut ; préférer un retour
  informatif (« 3 sessions de création cette semaine ») à un contrôle (« objectif manqué »).
  Les limites (WIP, maker schedule) informent et proposent, sans interdire.
- **Confiance.** Forte (récompenses tangibles) ; modérée (transposition aux apps).

#### Séries sans culpabilité (7.3)

- **Études.**
  - Silverman, J. et Barasch, A. (2022). _On or off track: How (broken) streaks affect consumer
    decisions._ Journal of Consumer Research, 49(6), 1095–1117. doi:10.1093/jcr/ucac029
  - Lally, P., van Jaarsveld, C. H. M., Potts, H. W. W. et Wardle, J. (2010). _How are habits
    formed: Modelling habit formation in the real world._ European Journal of Social Psychology,
    40(6), 998–1009. doi:10.1002/ejsp.674
- **Résultats.** Sur sept études, une série intacte mise en avant augmente l'engagement
  ultérieur par rapport à une série rompue ; l'effet négatif de la rupture est amplifié quand la
  personne s'en attribue la faute et **atténué quand elle peut « réparer » la série** (Silverman
  et Barasch). Chez 96 volontaires, l'automaticité d'un nouveau comportement a atteint un plateau
  après une médiane de 66 jours (de 18 à 254 jours) ; manquer une occasion n'a pas compromis
  sensiblement le processus (Lally et al.).
- **Implication.** Les jokers (7.3) sont directement soutenus. Afficher les séries comme
  « jours créatifs cette semaine / ce mois » plutôt qu'un compteur qui retombe à zéro ; ne jamais
  promettre « une habitude en 21 jours ».
- **Confiance.** Modérée.

#### Progrès et petites victoires (7.9, 2.12, 1.14)

- **Études.**
  - Amabile, T. et Kramer, S. (2011). _The Progress Principle: Using Small Wins to Ignite Joy,
    Engagement, and Creativity at Work._ Harvard Business Review Press. ISBN 978-1-4221-9857-5.
  - Kivetz, R., Urminsky, O. et Zheng, Y. (2006). _The goal-gradient hypothesis resurrected:
    Purchase acceleration, illusionary goal progress, and customer retention._ Journal of
    Marketing Research, 43(1), 39–58. doi:10.1509/jmkr.43.1.39
  - Kahneman, D., Fredrickson, B. L., Schreiber, C. A. et Redelmeier, D. A. (1993). _When more
    pain is preferred to less: Adding a better end._ Psychological Science, 4(6), 401–405.
    doi:10.1111/j.1467-9280.1993.tb00589.x
- **Résultats.** Dans l'étude par journaux de bord d'Amabile et Kramer (professionnels de
  plusieurs entreprises), les jours où les personnes progressaient dans un travail porteur de
  sens étaient associés à une meilleure « vie intérieure au travail » (émotions, motivation,
  perceptions). Kivetz et al. montrent que l'effort s'accélère à l'approche d'un but et qu'une
  progression initiale, même illusoire, accélère l'achèvement. Kahneman et al. montrent que
  l'évaluation rétrospective d'une expérience dépend fortement de son pic et de sa fin : des
  participants ont préféré répéter une expérience douloureuse plus longue mais qui se terminait
  mieux.
- **Limites.** Amabile et Kramer : données corrélationnelles, ouvrage de vulgarisation. Kivetz
  et al. : cartes de fidélité ; la « progression illusoire » est une technique de persuasion
  dont l'usage doit rester honnête.
- **Implication.** Le bilan hebdomadaire (7.9) commence et **se termine** par les progrès réels ;
  les blocages sont présentés comme des questions actionnables. Les barres de progression
  montrent un progrès réel, jamais gonflé.
- **Confiance.** Modérée (pic-fin, gradient de but) ; faible (principe du progrès, corrélationnel).

#### Polarité d'affichage, lumière du soir et thèmes (7.6, 7.10)

- **Études.**
  - Piepenbrock, C., Mayr, S., Mund, I. et Buchner, A. (2013). _Positive display polarity is
    advantageous for both younger and older adults._ Ergonomics, 56(7), 1116–1124.
    doi:10.1080/00140139.2013.790485
  - Chang, A.-M., Aeschbach, D., Duffy, J. F. et Czeisler, C. A. (2015). _Evening use of
    light-emitting eReaders negatively affects sleep, circadian timing, and next-morning
    alertness._ Proceedings of the National Academy of Sciences, 112(4), 1232–1237.
    doi:10.1073/pnas.1418490112
- **Résultats.** La polarité positive (texte sombre sur fond clair) a amélioré la performance de
  lecture et de détection chez les jeunes comme chez les plus âgés. Lire le soir sur une
  liseuse rétroéclairée, comparé à un livre imprimé, a retardé l'endormissement et l'horloge
  circadienne, réduit la mélatonine et la vigilance du lendemain.
- **Limites.** Chang et al. : petit échantillon en laboratoire, plusieurs heures de lecture
  chaque soir à luminosité élevée ; rien ne démontre qu'un « mode sombre » d'application suffit
  à éviter ces effets.
- **Implication.** Thème clair par défaut pour la lecture longue, thème sombre proposé ;
  l'adaptation au soleil (7.6) doit **réduire la luminosité et réchauffer** le soir, pas
  seulement inverser les couleurs. Le thème E-Ink (7.10) en polarité positive à fort contraste
  est cohérent.
- **Confiance.** Modérée (polarité) ; modérée (lumière du soir, mécanisme) ; spéculative (effet
  d'un thème d'application sur le sommeil).

#### Interface qui s'efface (7.4) et encombrement (2.14)

- **Étude.** Rosenholtz, R., Li, Y. et Nakano, L. (2007). _Measuring visual clutter._ Journal of
  Vision, 7(2), 17. doi:10.1167/7.2.17
- **Résultats.** Des mesures d'encombrement visuel prédisent la difficulté de recherche
  visuelle.
- **Limites.** Aucune étude identifiée sur le délai d'effacement des barres d'outils ; masquer
  les commandes peut nuire à leur découverte.
- **Implication.** Effacement limité aux modes de focus, réapparition instantanée à toute
  interaction (souris, clavier, toucher), jamais pendant une saisie au lecteur d'écran, et
  respect de `prefers-reduced-motion`. Le délai de 3 s du brief est un réglage par défaut, pas un
  résultat.
- **Confiance.** Faible (moins d'encombrement) ; spéculative (délai).

#### Retour haptique, arbre de compétences, remapping (7.5, 7.7, 7.8)

- Pas de base spécifique recensée. L'arbre de compétences (7.5) peut nourrir le besoin de
  compétence (TAD) s'il reflète des réalisations réelles. **Confiance : spéculative.**

### 4.8 Interface, temps de réponse et mouvement

#### Temps de réponse (7.1, 5.14, 2.11, 3.1)

- **Études.**
  - Miller, R. B. (1968). _Response time in man-computer conversational transactions._ AFIPS Fall
    Joint Computer Conference, 267 et suiv. doi:10.1145/1476589.1476628
  - Card, S. K., Robertson, G. G. et Mackinlay, J. D. (1991). _The information visualizer, an
    information workspace._ CHI 1991, 181–186. doi:10.1145/108844.108874
  - Nielsen, J. (1993). _Usability Engineering._ Academic Press. ISBN 0-12-518405-0.
  - Doherty, W. J. et Thadani, A. J. (1982). _The economic value of rapid response time._ IBM,
    GE20-0752-0 (rapport industriel, non évalué par les pairs).
- **Résultats.** Synthèse classique : environ 0,1 s pour qu'une réaction paraisse immédiate,
  environ 1 s pour ne pas interrompre le fil de la pensée, environ 10 s pour garder l'attention
  sur la tâche (Miller ; Card et al. ; Nielsen). Doherty et Thadani rapportent des gains de
  productivité quand le temps de réponse d'un système interactif descend sous environ 400 ms.
- **Limites.** Ordres de grandeur issus de l'ingénierie, pas de seuils mesurés précisément ;
  le rapport IBM date des terminaux de 1982.
- **Implication.** Budgets : retour visuel d'une action directe ≤ 100 ms ; navigation ≤ 1 s ;
  au-delà d'1 s, indicateur de progression ; au-delà de 10 s, progression estimée et possibilité
  d'annuler. L'objectif de 50 ms du brief pour le brain dump (5.14) est plus exigeant que
  nécessaire mais compatible.
- **Confiance.** Modérée.

#### Choix, pointage et cibles (interface générale)

- **Études.**
  - Hick, W. E. (1952). _On the rate of gain of information._ Quarterly Journal of Experimental
    Psychology, 4(1), 11–26. doi:10.1080/17470215208416600
  - Fitts, P. M. (1954). _The information capacity of the human motor system in controlling the
    amplitude of movement._ Journal of Experimental Psychology, 47(6), 381–391.
    doi:10.1037/h0055392
  - Scheibehenne, B., Greifeneder, R. et Todd, P. M. (2010). _Can there ever be too many options?
    A meta-analytic review of choice overload._ Journal of Consumer Research, 37(3), 409–425.
    doi:10.1086/651235
  - Chernev, A., Böckenholt, U. et Goodman, J. (2015). _Choice overload: A conceptual review and
    meta-analysis._ Journal of Consumer Psychology, 25(2), 333–358.
    doi:10.1016/j.jcps.2014.08.002
  - W3C (2023). _Web Content Accessibility Guidelines (WCAG) 2.2._
- **Résultats.** Le temps de choix croît avec le logarithme du nombre d'alternatives (Hick) ; le
  temps de pointage croît avec la distance et diminue avec la taille de la cible (Fitts). La
  surcharge de choix (Iyengar et Lepper, 2000, doi:10.1037/0022-3514.79.6.995) a un effet moyen
  proche de zéro dans la méta-analyse de Scheibehenne et al. ; Chernev et al. montrent qu'elle
  apparaît sous certaines conditions (ensemble complexe, tâche difficile, préférences incertaines,
  objectif de minimiser l'effort).
- **Limites.** Hick s'applique mal aux menus familiers (l'utilisateur ne choisit plus, il
  reconnaît).
- **Implication.** Cibles tactiles ≥ 44 px (convention du dépôt, au-delà du minimum AA de
  WCAG 2.2) ; actions fréquentes proches du pouce ou du curseur ; menus courts et ordonnés par
  fréquence ; pas de « limite magique » d'options, mais réduire les choix dans les moments
  difficiles (capture, traitement de l'inbox).
- **Confiance.** Forte (Fitts) ; modérée (Hick) ; modérée (surcharge conditionnelle).

#### Esthétique et utilisabilité perçue

- **Études.**
  - Kurosu, M. et Kashimura, K. (1995). _Apparent usability vs. inherent usability._ CHI 95
    Conference Companion, 292–293. doi:10.1145/223355.223680
  - Tractinsky, N., Katz, A. S. et Ikar, D. (2000). _What is beautiful is usable._ Interacting with
    Computers, 13(2), 127–145. doi:10.1016/S0953-5438(00)00031-X
  - Tuch, A. N., Roth, S. P., Hornbæk, K., Opwis, K. et Bargas-Avila, J. A. (2012). _Is beautiful
    really usable? Toward understanding the relation between usability, aesthetics, and affect in
    HCI._ Computers in Human Behavior, 28(5), 1596–1607. doi:10.1016/j.chb.2012.03.024
- **Résultats.** L'utilisabilité perçue de variantes de distributeurs de billets était fortement
  liée à leur esthétique (Kurosu et Kashimura) ; l'esthétique perçue avant usage prédisait
  l'utilisabilité perçue après usage (Tractinsky et al.). Tuch et al. trouvent l'effet inverse :
  une mauvaise utilisabilité réduit l'esthétique perçue après usage, sans effet de l'esthétique
  sur l'utilisabilité perçue.
- **Implication.** L'esthétique (inspirations du brief) améliore la première impression mais ne
  compense pas une friction réelle ; les tests d'utilisabilité doivent mesurer réussite et temps,
  pas seulement la satisfaction.
- **Confiance.** Modérée (relation réelle mais bidirectionnelle et dépendante du contexte).

#### Animation et transitions

- **Études.**
  - Chang, B.-W. et Ungar, D. (1993). _Animation: From cartoons to the user interface._ UIST 1993,
    45–55. doi:10.1145/168642.168647
  - Heer, J. et Robertson, G. (2007). _Animated transitions in statistical data graphics._ IEEE
    Transactions on Visualization and Computer Graphics, 13(6), 1240–1247.
    doi:10.1109/TVCG.2007.70539
  - Harrison, C., Amento, B., Kuznetsov, S. et Bell, R. (2007). _Rethinking the progress bar._
    UIST 2007, 115–118. doi:10.1145/1294211.1294231
- **Résultats.** Chang et Ungar transposent des principes du dessin animé (continuité, solidité,
  anticipation) à l'interface pour préserver la compréhension des changements ; c'est un article
  de conception. Heer et Robertson montrent que des transitions animées, simples et découpées en
  étapes, améliorent la perception des changements dans des graphiques. Harrison et al.
  observent que la forme d'avancement d'une barre de progression modifie la durée perçue ; une
  progression qui accélère vers la fin paraît plus rapide.
- **Implication.** Animer pour **maintenir la constance d'objet** (où est allé cet élément ?),
  pas pour décorer : transitions courtes via les tokens `--dur-*`, limitées à `transform` et
  `opacity`, découpées en étapes quand plusieurs choses changent, supprimées ou réduites à un
  fondu sous `prefers-reduced-motion`. Les barres de progression indéterminées sont évitées
  quand une estimation honnête existe.
- **Confiance.** Modérée (constance d'objet) ; faible (principes du dessin animé, non testés).

## 5. Correspondance fonctionnalités → références

Numérotation du brief (`module.numéro`). « — » signifie qu'aucune base comportementale n'a été
retenue : la fonctionnalité se justifie autrement (ingénierie, demande utilisateur) et ne doit
pas être présentée comme fondée sur la recherche.

### Module 1 — Temps et calendrier

| ID   | Fonctionnalité               | Références                                                          | Implication                                                     | Confiance         |
| ---- | ---------------------------- | ------------------------------------------------------------------- | --------------------------------------------------------------- | ----------------- |
| 1.1  | Routage dynamique            | buehler1994planning, gollwitzer2006meta                             | Corriger les estimations par l'historique ; créneaux explicites | Modérée           |
| 1.2  | Propagation des retards      | buehler1994planning                                                 | Retards attendus ; propager sans culpabiliser                   | Modérée           |
| 1.3  | Heatmap d'énergie            | horne1976meq, wieth2011timeofday                                    | Chronotype + historique ; distinguer analytique et idées        | Faible            |
| 1.4  | Spirale continue             | weber2001spirals                                                    | Pour les régularités, pas pour planifier                        | Faible            |
| 1.5  | Multi-fuseaux                | —                                                                   | —                                                               | —                 |
| 1.6  | Buffers                      | leroy2009residue, leroy2018readytoresume, mark2008cost              | Invite « prêt à reprendre » ; durée réglable                    | Modérée           |
| 1.7  | Synchronisation CRDT         | shapiro2011crdt, kleppmann2019localfirst                            | Convergence garantie, hors-ligne                                | Forte (technique) |
| 1.8  | Saisie en langage naturel    | card1991visualizer                                                  | Analyse < 100 ms, aperçu avant validation                       | Spéculative       |
| 1.9  | Instantanés prévu/réel       | buehler1994planning                                                 | Calcule le ratio réel/estimé personnel                          | Modérée           |
| 1.10 | Tâches flottantes            | gollwitzer2006meta, masicampo2011plan                               | Proposer un créneau concret                                     | Modérée           |
| 1.11 | Hyperfocus (Ne pas déranger) | kushlev2016silence, stothart2015notification, iqbal2008notification | Couper les notifications, remise en fin de bloc                 | Modérée           |
| 1.12 | Temps de trajet              | buehler1994planning                                                 | Inclure le trajet dans l'estimation                             | Faible            |
| 1.13 | Liens profonds d'événements  | —                                                                   | —                                                               | —                 |
| 1.14 | Barre de progression absolue | barkley1997adhd                                                     | Externaliser le temps, discrètement                             | Spéculative       |
| 1.15 | Protection du maker schedule | perlow1999famine, ericsson1993deliberate, macnamara2014deliberate   | Moins d'interruptions ; seuil réglable ; alerte sans refus      | Faible            |

### Module 2 — Tâches et exécution

| ID   | Fonctionnalité           | Références                                    | Implication                                       | Confiance   |
| ---- | ------------------------ | --------------------------------------------- | ------------------------------------------------- | ----------- |
| 2.1  | Graphe de dépendances    | sweller1988load                               | Masquer le bloqué, chaîne visible à la demande    | Faible      |
| 2.2  | Décomposition IA         | bandura1981proximal, steel2007procrastination | Petites premières étapes, une à la fois           | Modérée     |
| 2.3  | Usure de la tâche        | steel2007procrastination                      | Gris neutre + question, pas d'alarme rouge        | Spéculative |
| 2.4  | Eisenhower calculée      | zhu2018urgency                                | Importance saisie par l'utilisateur               | Modérée     |
| 2.5  | Tags géolocalisés        | gollwitzer1999implementation                  | Déclencheur « quand/où » concret                  | Faible      |
| 2.6  | Pomodoro par tâche       | biwer2023pomodoro, ariga2011breaks            | Pauses systématiques par défaut, durées réglables | Modérée     |
| 2.7  | Parser vocal en marchant | oppezzo2014walking                            | Capture vocale mains libres                       | Modérée     |
| 2.8  | Champs à formules        | —                                             | —                                                 | —           |
| 2.9  | Récurrences complexes    | —                                             | —                                                 | —           |
| 2.10 | Tâches depuis le mail    | masicampo2011plan                             | Capture puis traitement                           | Spéculative |
| 2.11 | Capture universelle      | masicampo2011plan, card1991visualizer         | Ouverture < 100 ms ; traitement ultérieur         | Modérée     |
| 2.12 | Vues Kanban              | —                                             | —                                                 | —           |
| 2.13 | Délégation avec webhook  | —                                             | —                                                 | —           |
| 2.14 | Focus unique             | rosenholtz2007clutter, leroy2009residue       | Une tâche, moins d'encombrement                   | Faible      |
| 2.15 | Limite WIP               | cowan2001magical, deci2000what                | 3 à 5 priorités, garde-fou non bloquant           | Faible      |

### Module 3 — Stockage et multi-plateforme

| ID   | Fonctionnalité            | Références                                  | Implication                               | Confiance         |
| ---- | ------------------------- | ------------------------------------------- | ----------------------------------------- | ----------------- |
| 3.1  | Local-first               | kleppmann2019localfirst, miller1968response | Actions locales ≤ 100 ms                  | Modérée           |
| 3.2  | Recherche sémantique      | —                                           | —                                         | —                 |
| 3.3  | Versioning par bloc       | —                                           | —                                         | —                 |
| 3.4  | OCR local                 | —                                           | —                                         | —                 |
| 3.5  | Coffres chiffrés          | —                                           | —                                         | —                 |
| 3.6  | Compression asymétrique   | —                                           | —                                         | —                 |
| 3.7  | Aperçus universels        | —                                           | —                                         | —                 |
| 3.8  | Indexation des disques    | —                                           | —                                         | —                 |
| 3.9  | Nettoyage automatique     | —                                           | Archiver, ne jamais supprimer sans accord | Spéculative       |
| 3.10 | Partage par lien          | —                                           | —                                         | —                 |
| 3.11 | Synchronisation bas débit | shapiro2011crdt                             | Deltas                                    | Forte (technique) |
| 3.12 | Drag & drop natif         | fitts1954capacity                           | Cibles de dépôt larges                    | Faible            |
| 3.13 | Métadonnées audio         | —                                           | —                                         | —                 |
| 3.14 | Backlinks de fichiers     | ghibellini2025zeigarnik                     | Retrouver le contexte pour reprendre      | Faible            |
| 3.15 | Client CLI                | —                                           | —                                         | —                 |

### Module 4 — Graphes et espace

| ID   | Fonctionnalité         | Références                                      | Implication                                     | Confiance   |
| ---- | ---------------------- | ----------------------------------------------- | ----------------------------------------------- | ----------- |
| 4.1  | Canvas infini          | robertson1998datamountain, card1991visualizer   | Positions stables, rendu fluide                 | Modérée     |
| 4.2  | Layout à forces        | fruchterman1991force, robertson1998datamountain | À la demande, animé, annulable, nœuds épinglés  | Modérée     |
| 4.3  | Liste → arbre          | robertson1998datamountain                       | Conserver les positions existantes              | Faible      |
| 4.4  | Nœuds enrichis         | rosenholtz2007clutter                           | Aperçu replié par défaut                        | Spéculative |
| 4.5  | Organigramme temporel  | buehler1994planning                             | Déplacer = changer la date, avec confirmation   | Spéculative |
| 4.6  | Stylet                 | —                                               | —                                               | —           |
| 4.7  | Logique conditionnelle | —                                               | —                                               | —           |
| 4.8  | Squelette par IA       | —                                               | —                                               | —           |
| 4.9  | Repli de branches      | sweller1988load                                 | Réduire la charge extrinsèque                   | Faible      |
| 4.10 | Caméra de présentation | heer2007animated                                | Transitions qui préservent la constance d'objet | Modérée     |
| 4.11 | Export multi-formats   | kleppmann2019localfirst                         | Longévité des données                           | Spéculative |
| 4.12 | Templates d'ingénierie | —                                               | —                                               | —           |
| 4.13 | Minimap                | hornbaek2002overview                            | Repliable ; mesurer, ne pas supposer            | Modérée     |
| 4.14 | Multi-curseurs         | heer2007animated                                | Mouvement interpolé                             | Spéculative |
| 4.15 | Graphe → sommaire      | sweller1988load                                 | Double représentation                           | Spéculative |

### Module 5 — Idéation et créativité

| ID   | Fonctionnalité           | Références                                                           | Implication                                 | Confiance   |
| ---- | ------------------------ | -------------------------------------------------------------------- | ------------------------------------------- | ----------- |
| 5.1  | Random Connector         | mednick1962associative                                               | Hypothèse à tester (CSI)                    | Spéculative |
| 5.2  | Moodboard paramétrique   | — (cf. mehta2009blue, steele2014replication)                         | Pas de promesse « couleur = créativité »    | —           |
| 5.3  | Machine à écrire stricte | —                                                                    | Facultatif, à tester                        | Spéculative |
| 5.4  | Contraintes divergentes  | haughttromp2017constraints                                           | Une contrainte à la fois, facultative       | Faible      |
| 5.5  | Journal de friction      | klein2001expressive, pennebaker1997writing, frattaroli2006disclosure | Privé, sans score                           | Faible      |
| 5.6  | Scrapbook flottant       | masicampo2011plan                                                    | Capture rapide                              | Spéculative |
| 5.7  | Tag d'intonation vocale  | —                                                                    | —                                           | —           |
| 5.8  | Bac à sable              | —                                                                    | —                                           | —           |
| 5.9  | Banques d'assets         | —                                                                    | —                                           | —           |
| 5.10 | SCAMPER / 6 chapeaux     | —                                                                    | —                                           | —           |
| 5.11 | Markdown hybride         | rosenholtz2007clutter                                                | Moins d'encombrement                        | Spéculative |
| 5.12 | Prompts visuels          | — (cf. steele2014replication)                                        | —                                           | —           |
| 5.13 | Ambiance sonore          | mehta2012noise, soderlund2007noise                                   | Facultative, volume bas, pour l'idéation    | Faible      |
| 5.14 | Brain dump < 50 ms       | masicampo2011plan, card1991visualizer                                | Ouverture instantanée, traitement ultérieur | Modérée     |
| 5.15 | Détecteur de Dead Ends   | ghibellini2025zeigarnik, sio2009incubation                           | Rappeler et faciliter la reprise            | Faible      |

### Module 6 — Collaboration

| ID   | Fonctionnalité               | Références                                             | Implication                                     | Confiance   |
| ---- | ---------------------------- | ------------------------------------------------------ | ----------------------------------------------- | ----------- |
| 6.1  | Webhooks sortants            | —                                                      | —                                               | —           |
| 6.2  | API GraphQL                  | —                                                      | —                                               | —           |
| 6.3  | Commandes « / »              | hick1952rate                                           | Liste filtrée par saisie                        | Faible      |
| 6.4  | Commentaires par bloc        | —                                                      | —                                               | —           |
| 6.5  | Journal d'audit              | —                                                      | —                                               | —           |
| 6.6  | Statuts vidéo asynchrones    | perlow1999famine                                       | Remplacer une interruption synchrone            | Spéculative |
| 6.7  | Permissions par héritage     | —                                                      | —                                               | —           |
| 6.8  | Inbox d'équipe               | iqbal2008notification, kushlev2015email, mark2016email | Digest par défaut, remise aux points de rupture | Modérée     |
| 6.9  | Graphe social de compétences | —                                                      | —                                               | —           |
| 6.10 | Sondages et votes            | diehl1987brainstorming                                 | Idées et votes individuels avant révélation     | Modérée     |
| 6.11 | Export standardisé           | kleppmann2019localfirst                                | Longévité, contrôle                             | Spéculative |
| 6.12 | Mentions résumées par IA     | —                                                      | —                                               | —           |
| 6.13 | Canaux vocaux éphémères      | czerwinski2004diary                                    | Risque d'interruptions : opt-in                 | Spéculative |
| 6.14 | SSO                          | —                                                      | —                                               | —           |
| 6.15 | Modèles communautaires       | —                                                      | —                                               | —           |

### Module 7 — Interface, bien-être et télémétrie

| ID   | Fonctionnalité              | Références                                                   | Implication                                      | Confiance   |
| ---- | --------------------------- | ------------------------------------------------------------ | ------------------------------------------------ | ----------- |
| 7.1  | Moteur à faible latence     | miller1968response, card1991visualizer, nielsen1993usability | Budgets 0,1 / 1 / 10 s                           | Modérée     |
| 7.2  | Ratio création/organisation | deci1999rewards, ryan2000sdt                                 | Informatif, jamais un score                      | Spéculative |
| 7.3  | Séries sans culpabilité     | silverman2022streaks, lally2010habits                        | Jokers / réparation ; compteurs hebdomadaires    | Modérée     |
| 7.4  | Interface auto-fading       | rosenholtz2007clutter                                        | Mode focus uniquement ; réapparition instantanée | Spéculative |
| 7.5  | Arbre de compétences        | ryan2000sdt, bandura1981proximal                             | Refléter des réalisations réelles                | Spéculative |
| 7.6  | Thème selon soleil/météo    | chang2015ereaders, piepenbrock2013polarity                   | Le soir : moins lumineux et plus chaud           | Modérée     |
| 7.7  | Retour haptique             | —                                                            | —                                                | —           |
| 7.8  | Remapping clavier           | —                                                            | —                                                | —           |
| 7.9  | Bilan hebdomadaire          | kahneman1993peakend, amabile2011progress                     | Commencer et finir par les progrès réels         | Modérée     |
| 7.10 | Thème E-Ink                 | piepenbrock2013polarity                                      | Polarité positive, fort contraste                | Modérée     |

## 6. Valeurs par défaut fondées sur les preuves

Chaque valeur est **réglable** par l'utilisateur. La colonne « origine » indique si la valeur
vient d'une étude ou d'un choix de conception cohérent avec elle.

| Paramètre                       | Valeur par défaut proposée                                                                        | Origine                                                                                      | Confiance                              |
| ------------------------------- | ------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- | -------------------------------------- |
| Buffer entre réunions (1.6)     | 10 min, avec invite « prêt à reprendre » d'une ligne                                              | Durée : choix (fourchette du brief). Invite : leroy2018readytoresume                         | Modérée (invite) / spéculative (durée) |
| Résidu attentionnel             | Afficher la note de reprise à la réouverture de la tâche                                          | leroy2009residue, leroy2018readytoresume                                                     | Modérée                                |
| Limite de priorités (2.15)      | 5 priorités/jour, avertissement non bloquant, réglable de 1 à 7                                   | Valeur du brief, cohérente avec cowan2001magical ; non-blocage : deci2000what                | Faible                                 |
| Pauses (2.6)                    | Pauses systématiques activées ; 25 min / 5 min, alternative 24/6 ou libre                         | biwer2023pomodoro (systématique > autorégulé sur l'humeur) ; 25/5 = convention, non optimale | Modérée / spéculative                  |
| Bloc de travail profond (1.15)  | Bloc protégé de 2 h par défaut, alerte (pas de refus) ; seuil réglable jusqu'à 4 h                | Choix ; perlow1999famine, ericsson1993deliberate (ordre de grandeur, pas seuil)              | Faible                                 |
| Ambiance sonore (5.13)          | Désactivée ; si activée, volume initial bas ; proposée en idéation                                | mehta2012noise (effet unique), soderlund2007noise (fortes différences individuelles)         | Faible                                 |
| Effacement de l'interface (7.4) | Uniquement en mode focus ; 3 s ; réapparition immédiate ; désactivé sous mouvement réduit         | Choix (valeur du brief) ; rosenholtz2007clutter                                              | Spéculative                            |
| Retour d'une action directe     | ≤ 100 ms                                                                                          | miller1968response, card1991visualizer, nielsen1993usability                                 | Modérée                                |
| Navigation entre vues           | ≤ 1 s ; indicateur au-delà ; progression estimée + annulation au-delà de 10 s                     | idem                                                                                         | Modérée                                |
| Ouverture capture / brain dump  | Objectif 50 ms, plafond 100 ms                                                                    | Brief ; card1991visualizer                                                                   | Modérée                                |
| Notifications (6.8)             | Digest 3 fois par jour (matin, midi, fin d'après-midi) ; urgent explicite ; rien en focus         | kushlev2015email (3/jour), iqbal2008notification (points de rupture), kushlev2016silence     | Modérée                                |
| Remise différée                 | Fin de bloc de focus = point de rupture de remise                                                 | iqbal2008notification                                                                        | Modérée                                |
| Séries (7.3)                    | Compteur « jours créatifs cette semaine » ; 1 joker par semaine ; réparation possible             | silverman2022streaks, lally2010habits ; nombre de jokers : choix                             | Modérée                                |
| Visualisation du progrès        | Progrès réel uniquement ; barre déterminée dès qu'une estimation existe                           | kivetz2006goalgradient, harrison2007progress, amabile2011progress                            | Modérée                                |
| Polarité d'affichage            | Thème clair par défaut pour l'édition longue ; sombre proposé ; suivre le système                 | piepenbrock2013polarity                                                                      | Modérée                                |
| Lumière du soir (7.6)           | Après le coucher du soleil local : luminosité de l'interface réduite, teinte plus chaude          | chang2015ereaders (mécanisme) ; effet d'un thème non démontré                                | Faible                                 |
| Marche et idéation              | Capture vocale disponible écran verrouillé ; suggestion de marche en blocage créatif              | oppezzo2014walking                                                                           | Modérée                                |
| Incubation                      | Après ~45 min sans progrès sur une note créative : suggérer une pause simple (facultatif)         | sio2009incubation, baird2012inspired ; seuil de 45 min : choix                               | Faible                                 |
| Contraintes (5.4)               | Une contrainte tirée à la demande, jamais imposée                                                 | haughttromp2017constraints                                                                   | Faible                                 |
| Écriture expressive (5.5)       | Journal privé, chiffré localement, aucune statistique                                             | klein2001expressive, frattaroli2006disclosure                                                | Faible                                 |
| Intentions de mise en œuvre     | À la création d'une tâche importante : « Quand ? Où ? » proposé (facultatif)                      | gollwitzer2006meta                                                                           | Forte (principe)                       |
| Biais de planification          | Estimation affichée = estimation brute × ratio personnel, dès 10 tâches mesurées                  | buehler1994planning ; seuil de 10 : choix                                                    | Modérée                                |
| Plan et buts inachevés          | Traitement de l'inbox : chaque élément reçoit une prochaine action ou est archivé                 | masicampo2011plan                                                                            | Faible à modérée                       |
| Coût des interruptions          | Hyperfocus coupe les notifications ; mentions différées à la fin du bloc                          | mark2008cost, stothart2015notification                                                       | Modérée                                |
| Présence du téléphone           | Aucune affirmation marketing ; mode focus mobile proposé, pas présenté comme « anti brain drain » | ward2017braindrain contesté (ruizpardo2022braindrain, hartmann2020smartphone)                | Faible                                 |
| Mémoire spatiale (module 4)     | Positions des nœuds conservées ; layout automatique à la demande uniquement                       | robertson1998datamountain                                                                    | Modérée                                |
| Esthétique et utilisabilité     | Tests mesurant réussite et temps, pas seulement la satisfaction                                   | tractinsky2000beautiful, tuch2012beautiful                                                   | Modérée                                |
| Évaluation créative             | CSI à chaque test du module 5                                                                     | cherry2014csi                                                                                | Forte (outil)                          |
| Animations                      | `--dur-*` ; `transform`/`opacity` ; fondu simple sous `prefers-reduced-motion`                    | heer2007animated, chang1993animation ; conventions du dépôt                                  | Modérée                                |
| Cibles tactiles                 | ≥ 44 × 44 px                                                                                      | Convention du dépôt ; fitts1954capacity ; WCAG 2.2                                           | Forte                                  |

## 7. Ce que la recherche ne soutient pas (encore)

Ces affirmations circulent dans les applications et articles de productivité. POuxis ne doit pas
les reprendre dans son interface, sa documentation ou sa communication.

1. **« Le bleu rend plus créatif, le rouge plus précis. »** Résultat initial de Mehta et Zhu
   (2009) non reproduit sur les anagrammes par Steele (2014).
2. **« On se souvient mieux des tâches inachevées » (effet Zeigarnik).** La méta-analyse de
   Ghibellini et Meier (2025) ne trouve pas d'avantage mnésique ; seule la tendance à reprendre
   les tâches (effet Ovsiankina) tient.
3. **« La simple présence du téléphone draine le cerveau. »** L'étude de Ward et al. (2017) n'a
   pas été reproduite de façon concluante par Ruiz Pardo et Minda (2022) ni par Hartmann et al.
   (2020) ; la méta-analyse de Böttger et al. (2023) rapporte un effet négatif global mais
   hétérogène, qui mêle usage et présence. À considérer comme non établi pour la présence seule.
4. **« Il faut 23 minutes pour se reconcentrer après une interruption. »** Ce chiffre ne figure
   pas dans l'étude expérimentale de Mark et al. (2008) ; il est souvent attribué à tort à cet
   article. Ne pas le citer sans source primaire vérifiée.
5. **« 25 minutes est la durée optimale de concentration. »** La technique Pomodoro est une
   convention ; Biwer et al. (2023) soutiennent l'intérêt de pauses planifiées, pas une durée
   précise.
6. **« Le cerveau fonctionne par cycles de 90 minutes. »** Hypothèse de Kleitman (1982) ; elle ne
   justifie pas une durée de bloc imposée.
7. **« Une habitude se forme en 21 jours. »** Lally et al. (2010) observent une médiane de
   66 jours et une grande variabilité (18 à 254 jours).
8. **« Trop de choix paralyse toujours. »** L'effet moyen est proche de zéro (Scheibehenne et
   al., 2010) ; il n'apparaît que dans certaines conditions (Chernev et al., 2015).
9. **« La mémoire de travail contient 7 éléments, donc 7 tâches. »** Cowan (2001) suggère plutôt
   environ 4 éléments, et une liste à l'écran n'est pas stockée en mémoire de travail.
10. **« 10 000 heures de pratique font l'expert. »** La pratique délibérée n'explique qu'une part
    limitée et variable de la performance (Macnamara et al., 2014).
11. **« Un mode sombre protège le sommeil. »** Chang et al. (2015) concernent la lumière émise
    par un écran le soir ; aucun résultat cité ici ne montre qu'un thème sombre suffit.
12. **« Le brainstorming en groupe produit plus d'idées. »** Les groupes nominaux font mieux
    (Diehl et Stroebe, 1987).
13. **« Une interface belle est plus facile à utiliser. »** Elle _paraît_ plus facile ; l'effet
    sur la performance réelle n'est pas établi et la relation peut s'inverser (Tuch et al., 2012).
14. **Sans base vérifiée à ce jour :** mode machine à écrire (5.3), délai d'effacement de 3 s
    (7.4), Random Connector (5.1), tags d'intonation vocale (5.7), méthodes SCAMPER et 6 chapeaux
    (5.10), spirale pour planifier (1.4), usure colorée des tâches (2.3), retour haptique (7.7),
    seuil de 4 heures du maker schedule (1.15). Ces fonctionnalités peuvent exister ; elles ne
    sont pas « scientifiques ».

## 8. Tensions de conception

| Tension                                                 | Arbitrage proposé                                                                                  | Références                                  |
| ------------------------------------------------------- | -------------------------------------------------------------------------------------------------- | ------------------------------------------- |
| Tâches flottantes (1.10) vs intentions de mise en œuvre | Flotter pour capturer ; proposer un créneau précis au moment de planifier la journée               | gollwitzer2006meta                          |
| Layout automatique (4.2) vs mémoire spatiale            | Layout à la demande, animé, annulable ; nœuds déplacés à la main épinglés                          | robertson1998datamountain, heer2007animated |
| Limite WIP bloquante (2.15) vs autonomie                | Avertir et proposer un remplacement, ne pas bloquer                                                | cowan2001magical, ryan2000sdt               |
| Séries (7.3) vs culpabilité                             | Compteurs hebdomadaires, jokers, réparation, jamais de remise à zéro punitive                      | silverman2022streaks, deci1999rewards       |
| Matrice calculée (2.4) vs effet d'urgence               | Importance saisie, l'urgence seule ne classe pas                                                   | zhu2018urgency                              |
| Interface Zen (7.4) vs découvrabilité et accessibilité  | Effacement limité au focus, réapparition instantanée, désactivé avec les technologies d'assistance | rosenholtz2007clutter, w3c2023wcag22        |
| Métriques création/organisation (7.2) vs motivation     | Données informatives, privées, sans objectif imposé                                                | deci1999rewards                             |
| Esthétique du brief vs utilisabilité mesurée            | Soigner l'esthétique mais valider par des mesures de performance                                   | tractinsky2000beautiful, tuch2012beautiful  |
| Canaux vocaux persistants (6.13) vs interruptions       | Opt-in, silencieux en focus                                                                        | czerwinski2004diary, kushlev2016silence     |

## 9. Ce qu'il reste à mesurer

Ces questions alimentent `docs/research/USER_RESEARCH.md` :

- **Correctif du biais de planification.** Le ratio personnel améliore-t-il la précision des
  journées planifiées, et est-il perçu comme juste ? (R1, R3)
- **Invite « prêt à reprendre ».** Taux d'usage, et effet perçu sur la reprise après un buffer.
- **Digest de notifications.** Stress perçu et réactivité de l'équipe avec 3 remises/jour.
- **Séries hebdomadaires avec jokers.** Rétention à 8 semaines comparée à un compteur classique
  (étude longitudinale, phase 5).
- **Module 5.** Score CSI des outils d'idéation (Random Connector, contraintes, ambiance sonore,
  machine à écrire) comparé à un éditeur simple (R6).
- **Profils neurodivergents.** Les aides temporelles (1.14, heatmap) aident-elles réellement les
  personnes concernées ? Les données citées (Barkley, 1997 ; Söderlund et al., 2007) sont
  théoriques ou portent sur des enfants (R4).

## 10. Références

Toutes les entrées, avec leurs métadonnées complètes, sont dans
[`references.bib`](./references.bib). Liste alphabétique abrégée :

- Amabile, T. et Kramer, S. (2011). _The Progress Principle._ Harvard Business Review Press.
  ISBN 978-1-4221-9857-5.
- Ariga, A. et Lleras, A. (2011). Cognition, 118(3), 439–443. doi:10.1016/j.cognition.2010.12.007
- Baird, B. et al. (2012). Psychological Science, 23(10), 1117–1122. doi:10.1177/0956797612446024
- Bandura, A. et Schunk, D. H. (1981). JPSP, 41(3), 586–598. doi:10.1037/0022-3514.41.3.586
- Barkley, R. A. (1997). Psychological Bulletin, 121(1), 65–94. doi:10.1037/0033-2909.121.1.65
- Biwer, F. et al. (2023). British Journal of Educational Psychology, 93(S2), 353–367.
  doi:10.1111/bjep.12593
- Böttger, T., Poschik, M. et Zierer, K. (2023). Behavioral Sciences, 13(9), 751.
  doi:10.3390/bs13090751
- Buehler, R., Griffin, D. et Ross, M. (1994). JPSP, 67(3), 366–381.
  doi:10.1037/0022-3514.67.3.366
- Card, S. K., Robertson, G. G. et Mackinlay, J. D. (1991). CHI '91, 181–186.
  doi:10.1145/108844.108874
- Chang, A.-M. et al. (2015). PNAS, 112(4), 1232–1237. doi:10.1073/pnas.1418490112
- Chang, B.-W. et Ungar, D. (1993). UIST '93, 45–55. doi:10.1145/168642.168647
- Chernev, A., Böckenholt, U. et Goodman, J. (2015). Journal of Consumer Psychology, 25(2),
  333–358. doi:10.1016/j.jcps.2014.08.002
- Cherry, E. et Latulipe, C. (2014). ACM TOCHI, 21(4), 1–25. doi:10.1145/2617588
- Cowan, N. (2001). Behavioral and Brain Sciences, 24(1), 87–114. doi:10.1017/S0140525X01003922
- Czerwinski, M., Horvitz, E. et Wilhite, S. (2004). CHI '04, 175–182. doi:10.1145/985692.985715
- Deci, E. L., Koestner, R. et Ryan, R. M. (1999). Psychological Bulletin, 125(6), 627–668.
  doi:10.1037/0033-2909.125.6.627
- Deci, E. L. et Ryan, R. M. (2000). Psychological Inquiry, 11(4), 227–268.
  doi:10.1207/S15327965PLI1104_01
- Diehl, M. et Stroebe, W. (1987). JPSP, 53(3), 497–509. doi:10.1037/0022-3514.53.3.497
- Doherty, W. J. et Thadani, A. J. (1982). IBM GE20-0752-0 (rapport industriel).
- Ericsson, K. A., Krampe, R. T. et Tesch-Römer, C. (1993). Psychological Review, 100(3),
  363–406. doi:10.1037/0033-295X.100.3.363
- Fitts, P. M. (1954). Journal of Experimental Psychology, 47(6), 381–391. doi:10.1037/h0055392
- Frattaroli, J. (2006). Psychological Bulletin, 132(6), 823–865. doi:10.1037/0033-2909.132.6.823
- Fruchterman, T. M. J. et Reingold, E. M. (1991). Software: Practice and Experience, 21(11),
  1129–1164. doi:10.1002/spe.4380211102
- Ghibellini, R. et Meier, B. (2025). Humanities and Social Sciences Communications, 12(1).
  doi:10.1057/s41599-025-05000-w
- Gollwitzer, P. M. (1999). American Psychologist, 54(7), 493–503. doi:10.1037/0003-066X.54.7.493
- Gollwitzer, P. M. et Sheeran, P. (2006). Advances in Experimental Social Psychology, 38,
  69–119. doi:10.1016/S0065-2601(06)38002-1
- Graham, P. (2009). _Maker's Schedule, Manager's Schedule_ (essai).
- Harrison, C. et al. (2007). UIST '07, 115–118. doi:10.1145/1294211.1294231
- Hartmann, M. et al. (2020). Consciousness and Cognition, 86, 103033.
  doi:10.1016/j.concog.2020.103033
- Haught-Tromp, C. (2017). Psychology of Aesthetics, Creativity, and the Arts, 11(1), 10–17.
  doi:10.1037/aca0000061
- Heer, J. et Robertson, G. (2007). IEEE TVCG, 13(6), 1240–1247. doi:10.1109/TVCG.2007.70539
- Hick, W. E. (1952). QJEP, 4(1), 11–26. doi:10.1080/17470215208416600
- Horne, J. A. et Östberg, O. (1976). International Journal of Chronobiology, 4(2), 97–110.
  PMID 1027738.
- Hornbæk, K., Bederson, B. B. et Plaisant, C. (2002). ACM TOCHI, 9(4), 362–389.
  doi:10.1145/586081.586086
- Iqbal, S. T. et Bailey, B. P. (2008). CHI '08, 93–102. doi:10.1145/1357054.1357070
- Iqbal, S. T. et Horvitz, E. (2007). CHI '07, 677–686. doi:10.1145/1240624.1240730
- Iyengar, S. S. et Lepper, M. R. (2000). JPSP, 79(6), 995–1006. doi:10.1037/0022-3514.79.6.995
- Kahneman, D. et al. (1993). Psychological Science, 4(6), 401–405.
  doi:10.1111/j.1467-9280.1993.tb00589.x
- Kivetz, R., Urminsky, O. et Zheng, Y. (2006). Journal of Marketing Research, 43(1), 39–58.
  doi:10.1509/jmkr.43.1.39
- Klein, K. et Boals, A. (2001). JEP: General, 130(3), 520–533. doi:10.1037/0096-3445.130.3.520
- Kleitman, N. (1982). Sleep, 5(4), 311–317. doi:10.1093/sleep/5.4.311
- Kleppmann, M. et al. (2019). Onward! 2019, 154–178. doi:10.1145/3359591.3359737
- Kurosu, M. et Kashimura, K. (1995). CHI '95 Companion, 292–293. doi:10.1145/223355.223680
- Kushlev, K. et Dunn, E. W. (2015). Computers in Human Behavior, 43, 220–228.
  doi:10.1016/j.chb.2014.11.005
- Kushlev, K., Proulx, J. et Dunn, E. W. (2016). CHI '16, 1011–1020. doi:10.1145/2858036.2858359
- Lally, P. et al. (2010). European Journal of Social Psychology, 40(6), 998–1009.
  doi:10.1002/ejsp.674
- Leroy, S. (2009). OBHDP, 109(2), 168–181. doi:10.1016/j.obhdp.2009.04.002
- Leroy, S. et Glomb, T. M. (2018). Organization Science, 29(3), 380–397.
  doi:10.1287/orsc.2017.1184
- Locke, E. A. et Latham, G. P. (2002). American Psychologist, 57(9), 705–717.
  doi:10.1037/0003-066X.57.9.705
- Macnamara, B. N., Hambrick, D. Z. et Oswald, F. L. (2014). Psychological Science, 25(8),
  1608–1618. doi:10.1177/0956797614535810
- Mark, G., González, V. M. et Harris, J. (2005). CHI '05, 321–330. doi:10.1145/1054972.1055017
- Mark, G., Gudith, D. et Klocke, U. (2008). CHI '08, 107–110. doi:10.1145/1357054.1357072
- Mark, G. et al. (2016). CHI '16, 1717–1728. doi:10.1145/2858036.2858262
- Masicampo, E. J. et Baumeister, R. F. (2011). JPSP, 101(4), 667–683. doi:10.1037/a0024192
- Mednick, S. (1962). Psychological Review, 69(3), 220–232. doi:10.1037/h0048850
- Mehta, R. et Zhu, R. (2009). Science, 323(5918), 1226–1229. doi:10.1126/science.1169144
- Mehta, R., Zhu, R. et Cheema, A. (2012). Journal of Consumer Research, 39(4), 784–799.
  doi:10.1086/665048
- Miller, R. B. (1968). AFIPS Fall Joint Computer Conference, 267 et suiv.
  doi:10.1145/1476589.1476628
- Nielsen, J. (1993). _Usability Engineering._ Academic Press. ISBN 0-12-518405-0.
- Oppezzo, M. et Schwartz, D. L. (2014). JEP: LMC, 40(4), 1142–1152. doi:10.1037/a0036577
- Pennebaker, J. W. (1997). Psychological Science, 8(3), 162–166.
  doi:10.1111/j.1467-9280.1997.tb00403.x
- Perlow, L. A. (1999). Administrative Science Quarterly, 44(1), 57–81. doi:10.2307/2667031
- Piepenbrock, C. et al. (2013). Ergonomics, 56(7), 1116–1124. doi:10.1080/00140139.2013.790485
- Robertson, G. et al. (1998). UIST '98, 153–162. doi:10.1145/288392.288596
- Rosenholtz, R., Li, Y. et Nakano, L. (2007). Journal of Vision, 7(2), 17. doi:10.1167/7.2.17
- Ruiz Pardo, A. C. et Minda, J. P. (2022). Acta Psychologica, 230, 103717.
  doi:10.1016/j.actpsy.2022.103717
- Ryan, R. M. et Deci, E. L. (2000). American Psychologist, 55(1), 68–78.
  doi:10.1037/0003-066X.55.1.68
- Scheibehenne, B., Greifeneder, R. et Todd, P. M. (2010). Journal of Consumer Research, 37(3),
  409–425. doi:10.1086/651235
- Shapiro, M. et al. (2011). SSS 2011, LNCS 6976, 386–400. doi:10.1007/978-3-642-24550-3_29
- Silverman, J. et Barasch, A. (2022). Journal of Consumer Research, 49(6), 1095–1117.
  doi:10.1093/jcr/ucac029
- Sio, U. N. et Ormerod, T. C. (2009). Psychological Bulletin, 135(1), 94–120.
  doi:10.1037/a0014212
- Söderlund, G., Sikström, S. et Smart, A. (2007). Journal of Child Psychology and Psychiatry,
  48(8), 840–847. doi:10.1111/j.1469-7610.2007.01749.x
- Steel, P. (2007). Psychological Bulletin, 133(1), 65–94. doi:10.1037/0033-2909.133.1.65
- Steele, K. M. (2014). Psychonomic Bulletin & Review, 21(3), 771–776.
  doi:10.3758/s13423-013-0548-3
- Stothart, C., Mitchum, A. et Yehnert, C. (2015). JEP: HPP, 41(4), 893–897.
  doi:10.1037/xhp0000100
- Sweller, J. (1988). Cognitive Science, 12(2), 257–285. doi:10.1207/s15516709cog1202_4
- Tractinsky, N., Katz, A. S. et Ikar, D. (2000). Interacting with Computers, 13(2), 127–145.
  doi:10.1016/S0953-5438(00)00031-X
- Tuch, A. N. et al. (2012). Computers in Human Behavior, 28(5), 1596–1607.
  doi:10.1016/j.chb.2012.03.024
- W3C (2023). _Web Content Accessibility Guidelines (WCAG) 2.2._ https://www.w3.org/TR/WCAG22/
- Ward, A. F. et al. (2017). Journal of the Association for Consumer Research, 2(2), 140–154.
  doi:10.1086/691462
- Weber, M., Alexa, M. et Müller, W. (2001). IEEE InfoVis 2001, 7–13.
  doi:10.1109/INFVIS.2001.963273
- Wieth, M. B. et Zacks, R. T. (2011). Thinking & Reasoning, 17(4), 387–401.
  doi:10.1080/13546783.2011.625663
- Zeigarnik, B. (1927). _Das Behalten erledigter und unerledigter Handlungen._ Psychologische
  Forschung, 9(1), 1–85. doi:10.1007/BF02409755
- Zhu, M., Yang, Y. et Hsee, C. K. (2018). Journal of Consumer Research. doi:10.1093/jcr/ucy008
