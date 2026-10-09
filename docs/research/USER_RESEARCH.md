# Programme de recherche utilisateur — POuxis

> **Statut : plan v0.1, aucune donnée collectée à ce jour (2026-10-08).**
> Tout ce qui décrit les utilisateurs dans `docs/research/` est une **hypothèse** tant qu'une carte
> insight (`INS-###`) fondée sur des observations ne l'étaye pas. Les seuils chiffrés ci-dessous
> sont des **critères de décision provisoires**, à figer avant chaque collecte. Ce ne sont pas des
> résultats.

Documents liés :

- [`PERSONAS.md`](./PERSONAS.md) — 5 proto-personas (hypothèses) et anti-personas.
- [`USABILITY_TEST_PLAN.md`](./USABILITY_TEST_PLAN.md) — protocole de test modéré des flux du MVP.
- [`templates/`](./templates/) — instruments réutilisables :
  - [`guide-entretien-decouverte.md`](./templates/guide-entretien-decouverte.md) (45 min) ;
  - [`formulaire-consentement.md`](./templates/formulaire-consentement.md) ;
  - [`journal-14-jours.md`](./templates/journal-14-jours.md) (étude journal) ;
  - [`tableau-de-synthese.md`](./templates/tableau-de-synthese.md) ;
  - [`carte-insight.md`](./templates/carte-insight.md).
- [`../BRIEF.md`](../BRIEF.md) — vision et 100 fonctionnalités.

## Sommaire

0. [Conventions](#0-conventions)
1. [Pourquoi ce programme](#1-pourquoi-ce-programme)
2. [Risques produit et questions de recherche](#2-risques-produit-et-questions-de-recherche)
3. [Principes de conduite](#3-principes-de-conduite)
4. [Programme par phases](#4-programme-par-phases)
5. [Tailles d'échantillon et justification](#5-tailles-déchantillon-et-justification)
6. [Recrutement, screener et incitations](#6-recrutement-screener-et-incitations)
7. [Éthique, RGPD et consentement](#7-éthique-rgpd-et-consentement)
8. [Accessibilité des sessions](#8-accessibilité-des-sessions)
9. [Méthode de synthèse](#9-méthode-de-synthèse)
10. [Journal des décisions](#10-journal-des-décisions)
11. [Calendrier indicatif et rôles](#11-calendrier-indicatif-et-rôles)
12. [Dépendances avec les autres équipes](#12-dépendances-avec-les-autres-équipes)
13. [Références](#13-références)

---

## 0. Conventions

| Préfixe       | Signification                                                                    | Exemple                       |
| ------------- | -------------------------------------------------------------------------------- | ----------------------------- |
| `m.n`         | Fonctionnalité n du module m du brief (même convention que les commentaires du code) | `1.1` Routage dynamique       |
| `R1`–`R7`     | Risque produit étudié (§ 2)                                                      | `R1` Confiance dans le routage |
| `H1a`…        | Hypothèse falsifiable rattachée à un risque                                      | `H4b` Usure et culpabilité    |
| `PP1`–`PP5`   | Proto-persona ([`PERSONAS.md`](./PERSONAS.md))                                   | `PP4` Étudiante TDAH          |
| `P01`…        | Participant·e pseudonymisé·e (jamais de nom dans le dépôt)                       | `P07`                         |
| `OBS-###`     | Observation atomique (un fait, une source)                                       | `OBS-042`                     |
| `INS-###`     | Insight (carte, [`templates/carte-insight.md`](./templates/carte-insight.md))    | `INS-007`                     |
| `DEC-###`     | Décision produit (§ 10)                                                          | `DEC-003`                     |

**Échelle de preuve.** HYPOTHÈSE (non testée) → SIGNAL (une source, peu de participant·es) →
INSIGHT (convergence, confiance moyenne ou forte) → DÉCISION. On ne saute pas d'étape.

**Observation ≠ interprétation.** « 5 participant·es sur 8 n'ont pas trouvé l'action Épingler » est
une observation. « L'action Épingler est mal placée » est une interprétation, à formuler comme telle.

---

## 1. Pourquoi ce programme

Le brief décrit 100 fonctionnalités réparties en 7 modules. À ce jour, les seules sources sur les
futurs utilisateurs sont l'intuition du fondateur et la composition **supposée** de l'audience de
la chaîne YouTube K13 Studios (créateur·ices, designers, développeur·ses indépendant·es,
étudiant·es). Cette composition est elle-même une hypothèse.

Le risque principal n'est pas technique. C'est de construire beaucoup de fonctions que personne
n'adopte, ou une automatisation à laquelle personne ne fait confiance. Le programme vise à réduire
sept risques produit (§ 2), dans l'ordre où ils bloquent les décisions, avec des critères de
décision explicites.

**Ce que nous ne savons pas encore** (liste non exhaustive) :

- qui adopterait POuxis en premier, et pour quel « travail » (job) précis ;
- si l'idée de laisser un algorithme placer ses tâches rassure ou inquiète ;
- quelles fonctionnalités, parmi 100, portent réellement la valeur ;
- si la confidentialité (local-first, chiffrement de bout en bout) fait choisir l'outil ou
  seulement rassure ;
- si les choix « bien-être » (usure des tâches, séries) aident ou culpabilisent, en particulier les
  personnes neurodivergentes.

---

## 2. Risques produit et questions de recherche

### Vue d'ensemble

| Risque | Intitulé                                       | Fonctionnalités principales                         | Méthodes clés                                   | Décision éclairée                                    |
| ------ | ---------------------------------------------- | --------------------------------------------------- | ----------------------------------------------- | ---------------------------------------------------- |
| `R1`   | Confiance dans le routage automatique          | 1.1, 1.2, 1.6, 1.10, 1.15, 2.4, 2.15                 | Entretiens, test F2, journal, métriques         | Routage par défaut ou suggestion ; explication ; contrôle |
| `R2`   | Périmètre : 100 fonctions, lesquelles comptent | Toutes ; présélection de ~30                         | Tests de concept, Kano, MaxDiff, buy-a-feature  | Périmètre MVP ; ordre de la feuille de route         |
| `R3`   | Boucle capture → plan → focus → revue          | 2.11, 1.8, 5.14, 2.7, 1.1, 2.6, 2.14, 1.11, 7.9, 1.9 | Journal 14 jours, tests F1–F4, métriques        | Maillon à renforcer en premier ; rituels             |
| `R4`   | Personnes neurodivergentes (TDAH)              | 1.14, 1.10, 2.2, 2.14, 2.15, 2.3, 7.3, 7.4, 5.13    | Co-conception, entretiens, journal, tests       | Réglages par défaut ; formulations ; mode « doux »   |
| `R5`   | Local-first / E2EE comme moteur d'adoption     | 3.1, 3.5, 1.7, 6.11, 3.15                            | Entretiens « switch », MaxDiff critères, prix   | Positionnement ; priorité de 3.5 ; modèle économique |
| `R6`   | Soutien à la créativité                        | 5.1, 5.4, 5.3, 5.11, 5.14, 5.15                      | Test F5 + CSI, journal                          | Place de l'idéation dans le MVP                      |
| `R7`   | Réalité multi-plateforme                       | 1.7, 3.11, 3.12, 2.11, 7.7                           | Screener, enquête, journal                      | Plateformes prioritaires pour le MVP et les tests    |

### R1 — Confiance dans le routage automatique des tâches

**Question.** Les gens acceptent-ils qu'un algorithme place leurs tâches dans leur agenda ? À
quelles conditions (explication, contrôle, réversibilité) la confiance est-elle **calibrée**,
c'est-à-dire ni excessive ni absente (Lee & See, 2004) ?

**Hypothèses.**

- `H1a` — La confiance dépend moins de la justesse du plan que de la possibilité de le comprendre
  (une raison lisible par placement) et de le corriger en un geste. Appui : les gens utilisent plus
  volontiers un algorithme imparfait quand ils peuvent le modifier, même légèrement (Dietvorst,
  Simmons & Massey, 2018).
- `H1b` — Une erreur visible du routage (tâche placée sur un moment impossible) fait chuter l'usage
  plus que ne le justifie le taux d'erreur réel (« aversion algorithmique », Dietvorst, Simmons &
  Massey, 2015).
- `H1c` — Chaque personne a des « zones sacrées » que l'algorithme ne doit jamais toucher (rendez-vous
  fixes, blocs épinglés, soirées, temps de récupération), et ces zones varient selon les profils.

**Indicateurs.** Part des plans acceptés sans modification ; épinglages et déplacements par jour ;
score de confiance (Jian, Bisantz & Drury, 2000) ; routage désactivé à J7 et J14 ; verbatims de
surprise ou de perte de contrôle.

**Ce qui invaliderait H1a.** La majorité des participant·es du journal désactive ou contourne le
routage dès la première semaine, alors même que l'explication et l'épinglage sont disponibles.

**Seuil de décision provisoire.** Si ≥ 60 % des participant·es du journal ont encore le routage
actif à J14 et un score moyen de confiance ≥ 5/7 (items de méfiance inversés), le routage est activé
par défaut. Sinon, il devient une suggestion à accepter explicitement (opt-in).

### R2 — Périmètre : 100 fonctionnalités, lesquelles comptent ?

**Question.** Quelles ~10 fonctionnalités portent l'essentiel de la valeur perçue, par segment ? À
partir de quand montrer plus de fonctions nuit-il à la compréhension et à l'adoption ?

**Hypothèses.**

- `H2a` — Pour chaque proto-persona, moins de 10 fonctionnalités expliquent l'essentiel de l'intérêt
  déclaré et observé. Elles se recoupent en partie : un noyau commun autour de la boucle capture →
  plan → focus → revue.
- `H2b` — Présenter d'emblée les 7 modules dégrade la compréhension de « à quoi sert POuxis » au
  premier contact. Prudence : l'effet de surcharge de choix (Iyengar & Lepper, 2000) varie beaucoup
  selon les contextes, et une méta-analyse trouve un effet moyen proche de zéro (Scheibehenne,
  Greifeneder & Todd, 2010). On le teste, on ne le présuppose pas.
- `H2c` — Certaines fonctions spectaculaires (4.1 canvas WebGL, 1.4 calendrier en spirale, 7.6
  palette selon la météo) suscitent de l'enthousiasme déclaré mais peu d'usage concret anticipé.

**Indicateurs.** Scores MaxDiff, catégories Kano, choix du jeu « buy-a-feature », reformulation du
concept (« En une phrase, POuxis sert à… »), adoption effective des fonctions (phase 5).

**Ce qui invaliderait H2a.** Des scores MaxDiff plats (aucune fonction ne se détache). Dans ce cas,
on segmente autrement (par comportement plutôt que par métier) ou on reformule les fonctions.

**Règle de sélection du « top 10 »** : voir phase 2b (§ 4).

### R3 — La boucle capture → planifier → focus → revue fonctionne-t-elle ?

**Question.** La boucle tient-elle dans la vie réelle pendant deux semaines ? Où casse-t-elle, et
pourquoi ?

**Hypothèses.**

- `H3a` — La capture (2.11, 1.8, 5.14) est le maillon le plus solide ; la revue hebdomadaire (7.9)
  le plus fragile (sautée faute de temps ou par évitement).
- `H3b` — Le plan casse au premier débordement, parce que les durées sont sous-estimées (« erreur de
  planification », Buehler, Griffin & Ross, 1994). La propagation des retards (1.2) atténue ce
  décrochage.
- `H3c` — Une boîte de réception qui grossit sans être triée (capture sans planification) est le
  principal signe avant-coureur d'abandon.

**Indicateurs.** Jours avec boucle complète (au moins 1 capture, plan consulté, au moins 1 session
focus) ; délai entre capture et planification ; nombre de revues effectuées ; taille de la boîte de
réception à J7 et J14.

**Seuil de décision provisoire.** La boucle est jugée viable si ≥ 50 % des participant·es du journal
la bouclent au moins 4 jours sur 7 en semaine 2 et font au moins 1 revue sur 2. Sinon, on renforce
d'abord le maillon où se concentrent les ruptures.

### R4 — Les personnes neurodivergentes (TDAH, « cécité temporelle ») sont-elles bien servies ?

**Contexte.** Tiimo, cité dans les inspirations d'interface du brief, s'adresse explicitement aux
personnes neurodivergentes. Si POuxis reprend ce langage visuel, il attirera probablement ce public.
Il doit donc le servir sans lui nuire.

**Question.** Les choix de POuxis aident-ils les personnes TDAH ou neurodivergentes à percevoir le
temps, à démarrer et à terminer, **sans les culpabiliser** ?

**Hypothèses.**

- `H4a` — La représentation visuelle du temps qui passe (1.14, frise du jour) et le focus unique
  (2.14) réduisent la difficulté à démarrer et la perte de la notion du temps.
- `H4b` — **Risque** : l'usure visuelle des tâches (2.3, glissement vers le gris ou le rouge) et les
  séries (7.3) peuvent provoquer honte ou évitement chez une partie des participant·es, malgré
  l'intention « sans culpabilisation ».
- `H4c` — Le routage automatique (1.1) soulage la charge exécutive de certaines personnes et donne à
  d'autres un sentiment de perte de contrôle. L'effet n'est pas homogène.
- `H4d` — Le limiteur de charge (2.15) est vécu comme une aide s'il est réglable et comme une
  punition s'il bloque.

**Indicateurs.** Affect déclaré après la revue (journal J7, J10, J14) ; abandon après J7 ventilé
neurodivergent·es / autres ; charge perçue (NASA-TLX brut) sur les flux F2 et F4 ; problèmes
étiquetés « bien-être » dans l'échelle de gravité ([`USABILITY_TEST_PLAN.md`](./USABILITY_TEST_PLAN.md)).

**Méthodes.** Quota d'au moins 30 % de personnes neurodivergentes auto-identifiées dans chaque phase
qualitative ; deux ateliers de co-conception (4 à 5 personnes chacun) ; journal ; sessions adaptées
(§ 8).

**Garde-fous.** Aucun diagnostic demandé ni vérifié. Aucune allégation thérapeutique : POuxis n'est
pas un dispositif médical. Une information sur un TDAH est une donnée de santé, donc une catégorie
particulière au sens de l'article 9 du RGPD (§ 7).

### R5 — Local-first et chiffrement de bout en bout : moteur d'adoption ou simple réassurance ?

**Question.** La confidentialité (données sur l'appareil, chiffrement de bout en bout, export ouvert
sans enfermement) fait-elle choisir, payer ou recommander POuxis ? Ou est-ce un critère attendu qui
ne motive pas, à la manière d'un « facteur d'hygiène » ?

**Hypothèses.**

- `H5a` — Pour la plupart des segments, local-first et chiffrement relèvent de la réassurance (Kano
  : « obligatoire » ou « indifférent »), pas de la motivation. Les moteurs seraient une
  multi-plateforme réelle (Android + Windows + Apple) et la fluidité.
- `H5b` — Pour le segment développeur·se indé (`PP3`) et pour les équipes créatives sous accord de
  confidentialité (`PP5`), c'est un critère décisif.
- `H5c` — L'export ouvert (6.11) réduit davantage l'anxiété liée au changement d'outil que le
  chiffrement.

**Précaution méthodologique.** L'écart entre ce que les gens disent de leur vie privée et ce qu'ils
font est documenté (« privacy paradox », Norberg, Horne & Horne, 2007). On ne conclut donc pas sur
des déclarations seules. On combine : récits d'achats et d'abandons passés (entretiens « switch »),
arbitrages forcés (MaxDiff des critères de choix, prix inclus), et comportements observés (option de
synchronisation choisie, coffres créés pendant le journal).

**Méthodes.** Entretiens (§ 4, phase 1), enquête (MaxDiff des critères + Van Westendorp, 1976),
page d'inscription honnête (liste d'attente) avec plusieurs variantes de message. Aucune fausse
promesse : la page dit clairement que l'application n'est pas encore disponible.

### R6 — Les outils d'idéation soutiennent-ils réellement la créativité ?

**Question.** La sérendipité (5.1) et les contraintes aléatoires (5.4) aident-elles à produire des
idées jugées utiles, ou sont-elles perçues comme des gadgets ?

**Hypothèses.**

- `H6a` — Le connecteur aléatoire (5.1) produit une association jugée utile au moins une fois sur
  trois, **à condition** que la base de notes soit suffisamment fournie (problème de démarrage à
  froid).
- `H6b` — Les créateur·ices (`PP1`, `PP2`) valorisent davantage la capture rapide d'idées (5.14,
  2.7) que la stimulation (5.1, 5.12).

**Indicateurs.** Creativity Support Index (Cherry & Latulipe, 2014) en test et à J14 ; part des idées
conservées issues de 5.1 ; verbatims.

### R7 — Réalité multi-plateforme

**Question.** Quelles combinaisons d'appareils nos segments utilisent-ils vraiment, et quel appareil
intervient à quel moment de la boucle ?

**Hypothèses.**

- `H7a` — Une part significative de la cible combine plusieurs écosystèmes (Android + macOS, iPhone +
  Windows…) que les outils mono-écosystème servent mal. Ce serait un moteur d'adoption.
- `H7b` — La capture se fait surtout sur mobile ; la planification et le focus surtout sur
  ordinateur.

**Méthodes.** Inventaire d'appareils (screener), enquête, journal (J2 et J11), métriques.

---

## 3. Principes de conduite

1. **Critères de décision avant la collecte.** Les seuils provisoires du § 2 sont relus et figés
   (avec date) avant chaque phase. On note toute modification ultérieure et sa raison.
2. **Triangulation.** Pour chaque risque : ce que les gens **disent** (entretiens, enquêtes), ce
   qu'ils **font** (tests, journal) et ce que montrent les **traces** (métriques volontaires).
3. **Passé concret plutôt qu'hypothétique.** « Racontez la dernière fois que… » plutôt que « Est-ce
   que vous utiliseriez… ».
4. **Biais de l'audience du fondateur.** Les abonné·es de K13 Studios ont un lien affectif avec le
   créateur : risque de complaisance (on dit ce qui fera plaisir) et de sélection. Mesures :
   - au moins 40 % de participant·es **hors audience** K13 dans chaque phase ;
   - le fondateur ne modère pas les sessions avec ses abonné·es ; il peut observer en silence ;
   - on présente POuxis comme « un projet que nous testons », jamais comme « mon application » ;
   - les résultats sont ventilés audience / hors audience.
5. **Biais des passionné·es de productivité.** Les communautés « productivité » surreprésentent les
   personnes qui aiment configurer leurs outils. Elles sont utiles, mais encadrées par des quotas.
6. **Inclusion par défaut.** Personnes neurodivergentes, utilisateur·ices de technologies
   d'assistance, utilisateur·ices Android et Windows, personnes peu technophiles.
7. **Le dépôt est public.** Aucune donnée brute (nom, enregistrement, transcription non anonymisée,
   capture d'écran personnelle) n'entre dans git. Seules les synthèses anonymisées y sont versées.

---

## 4. Programme par phases

| Phase | Semaines (indicatif) | Méthodes                                                    | n cible (min)              | Risques           | Livrables                                         |
| ----- | -------------------- | ----------------------------------------------------------- | -------------------------- | ----------------- | ------------------------------------------------- |
| 0     | S0–S2                | Analyse documentaire, avis publics, pilotes, panel          | Pilotes : 1 + 1            | Tous              | Instruments validés, panel ≥ 60 inscrit·es        |
| 1     | S2–S6                | Entretiens de découverte (JTBD + « switch »), co-conception | 18 (12) + 2 ateliers × 4–5 | R1, R3, R4, R5, R7 | Synthèse, personas révisés, jobs prioritaires    |
| 2     | S6–S10               | Tests de concept des 7 modules ; enquête Kano + MaxDiff     | 12 (8) ; 300 (150)         | R2, R5, R6        | Classement par segment, périmètre MVP recommandé  |
| 3     | S10–S14              | Tests d'utilisabilité modérés du MVP (2 rounds)             | 2 × 8                      | R1, R3, R4, R6    | Rapports de round, problèmes classés par gravité  |
| 4     | S14–S18              | Étude journal de 14 jours sur la version alpha              | 16 recruté·es (12 au bout) | R1, R3, R4, R6, R7 | Carte d'expérience 14 jours, ruptures de boucle  |
| 5     | S18 → continu        | Mesures longitudinales volontaires + entretiens de suivi    | 40–60 par cohorte ; 6      | R1, R2, R3, R5    | Tableau HEART, cohortes, entretiens trimestriels  |

### Phase 0 — Cadrage et préparation (S0–S2)

- **Analyse documentaire.** Codage d'avis publics (magasins d'applications, forums) sur des outils
  de planification et de notes (par exemple Tiimo, Todoist, Things, Sunsama, Motion, Notion,
  Obsidian, Structured) : environ 300 avis, grille ouverte (plaintes et éloges récurrents). On ne
  conserve aucun pseudonyme d'auteur·ice.
- **Instruments.** Proto-personas ([`PERSONAS.md`](./PERSONAS.md)), screener (§ 6.3), formulaire de
  consentement, guide d'entretien, protocole de test.
- **Panel.** Ouverture des canaux de recrutement (§ 6.1) ; objectif ≥ 60 inscrit·es qualifié·es.
- **Pilotes.** Un entretien pilote et un test pilote, exclus de l'analyse, pour ajuster durées et
  formulations.

### Phase 1 — Découverte (S2–S6)

- **Entretiens semi-directifs de 45 min** ([`templates/guide-entretien-decouverte.md`](./templates/guide-entretien-decouverte.md)),
  à distance ou en présentiel, enregistrement audio avec consentement.
- **Volet « switch » (JTBD).** Reconstitution chronologique du dernier changement d'outil
  d'organisation : premier doute, recherche, comparaison, choix, premiers usages. On y repère les
  quatre forces du progrès : poussée (ce qui ne va plus), attraction (ce qui séduit), anxiété (ce qui
  fait hésiter), habitude (ce qui retient).
- **Échantillon.** 18 personnes (minimum 12) : 3 à 4 par proto-persona, dont au moins 5 personnes
  neurodivergentes et au moins 7 hors audience K13.
- **Ateliers de co-conception neurodivergence** (fin de phase, 2 × 90 min, 4 à 5 personnes) :
  réactions à des variantes d'usure (2.3), de séries (7.3), de limiteur (2.15) et de frise du temps
  (1.14), en papier ou en maquettes basse fidélité.
- **Analyse.** Analyse thématique (Braun & Clarke, 2006), job stories, forces du progrès (§ 9).
- **Livrables.** Synthèse de découverte ; personas révisés **fondés sur les données** ; liste des
  jobs prioritaires ; mise à jour du registre des risques.

### Phase 2 — Tests de concept des 7 modules et priorisation (S6–S10)

**2a — Sessions qualitatives de concept (60 min, modérées).**

- **Stimulus par module.** Une planche-scénario de 3 à 4 cases et une maquette basse fidélité (ou une
  vidéo de 30 s au plus) montrant 2 ou 3 fonctions emblématiques du module.
- **Plan d'exposition.** Chaque personne voit 4 des 7 modules (plan incomplet équilibré, ordre
  tourné) pour limiter fatigue et effets d'ordre. Avec 12 personnes, chaque module est vu par 6 ou 7
  personnes.
- **Pour chaque module :**
  1. reformulation : « Expliquez-moi avec vos mots ce que ça fait » ;
  2. ancrage dans le passé : « À quel moment de la semaine dernière cela vous aurait-il servi ? » ;
  3. utilité perçue, de 1 à 7 (item maison, non validé : indicatif) ;
  4. inquiétudes et conditions d'usage ;
  5. trois mots choisis dans un sous-ensemble traduit des Product Reaction Cards (Benedek & Miner,
     2002).
- **Fin de session : jeu « buy-a-feature »** (Hohmann, 2006). Chaque personne répartit un budget
  fictif entre ~20 fonctionnalités dont le « prix » reflète l'effort estimé par l'équipe technique.
  Les arbitrages et leurs justifications comptent plus que le classement.
- **Échantillon.** 12 personnes (minimum 8).

**2b — Enquête de priorisation (en ligne, 10–12 min).**

1. **Présélection interne de 100 à ~30 fonctionnalités candidates**, selon quatre critères :
   appartenance à la boucle (R3), signaux des phases 1 et 2a, faisabilité dans les 6 mois (avis de
   l'ingénierie), au moins 3 candidates par proto-persona. Les ~70 autres forment un réservoir
   réévalué plus tard ; elles ne sont pas abandonnées.
2. **Questionnaire Kano** (Kano et al., 1984) : pour chaque fonction, une question « fonctionnelle »
   (« Si POuxis avait… ») et une « dysfonctionnelle » (« Si POuxis n'avait pas… »). Chaque
   répondant·e évalue 10 fonctions tirées au hasard parmi les 30.
3. **MaxDiff / Best-Worst Scaling** (Louviere, Flynn & Marley, 2015) sur les mêmes 30 fonctions :
   environ 12 écrans de 5 items (« la plus utile pour vous » / « la moins utile »).
4. **MaxDiff des critères de choix d'un outil** (prix, multi-plateforme, confidentialité et
   local-first, chiffrement, IA, design, open source, import et export) → `R5`.
5. **Sensibilité au prix** (Van Westendorp, 1976), quatre questions, résultat indicatif → `R5`.

**Règle de sélection du « top 10 » (à figer avant analyse).** Une fonction entre dans le top 10 si
(a) elle figure dans le tiers supérieur MaxDiff, au global ou pour au moins deux segments
prioritaires ; (b) une majorité de répondant·es ne la classe pas « indifférente » en Kano ; (c) les
données qualitatives (phases 1 et 2a) confirment un usage concret. En cas d'égalité, priorité aux
fonctions de la boucle (`R3`).

**Livrables.** Classement par segment, recommandation de périmètre MVP, entrées du journal des
décisions.

### Phase 3 — Tests d'utilisabilité du MVP (S10–S14)

Protocole complet : [`USABILITY_TEST_PLAN.md`](./USABILITY_TEST_PLAN.md). Deux rounds de 8 personnes,
modérés, avec pensée à voix haute. Les problèmes graves sont corrigés entre les rounds.

**Pourquoi avant le journal ?** On retire d'abord les obstacles bloquants. Sinon, le journal de 14
jours mesurerait surtout des bugs, et non la boucle.

### Phase 4 — Étude journal de 14 jours (S14–S18)

- **Principe.** Les participant·es utilisent la version alpha du MVP dans leur vie réelle, sur leurs
  propres appareils, pendant 14 jours.
- **Rendez-vous.** Accueil à J0 (30 min), point d'étape à J7 (15 min), débrief à J15 (45 min).
- **Saisie quotidienne de 3 à 5 min** ([`templates/journal-14-jours.md`](./templates/journal-14-jours.md)),
  avec rappel à l'heure choisie par la personne. Les jours sautés sont acceptés **sans pénalité**.
- **Outil de collecte.** Formulaire hébergé dans l'UE ou auto-hébergé (par exemple LimeSurvey),
  compatible avec les lecteurs d'écran, acceptant texte, note vocale ou capture floutée. On ne
  collecte pas dans POuxis lui-même (biais, et risque de perte de données en alpha).
- **Échantillon.** 16 personnes recrutées pour au moins 12 qui vont au bout ; au moins 5 personnes
  neurodivergentes ; au moins 3 par proto-persona prioritaire (`PP1`–`PP4`) ; plusieurs plateformes.
- **Questionnaires.** UMUX-Lite à J7 (Lewis, Utesch & Maher, 2013) ; SUS en version française F-SUS
  (Brooke, 1996 ; Gronier & Baudet, 2021) et CSI à J14.
- **Livrables.** Carte d'expérience sur 14 jours ; points de rupture de la boucle ; statut de `H1`,
  `H3`, `H4`, `H6`.

### Phase 5 — Mesures longitudinales (à partir de S18, cohortes de 8 à 12 semaines)

**Respect du local-first.** Aucune télémétrie par défaut. La mesure passe par un **panel de
recherche volontaire** : l'application calcule localement des agrégats **sans contenu** (ni titres,
ni notes, ni noms), la personne les voit, puis choisit chaque semaine de les envoyer (« don de
données »). Cette spécification est à co-construire avec les responsables vie privée et
synchronisation (§ 12).

**Cadre HEART** (Rodden, Hutchinson & Fu, 2010), décliné en objectifs → signaux → indicateurs :

| Dimension    | Indicateurs proposés                                                                                                     | Risques |
| ------------ | ------------------------------------------------------------------------------------------------------------------------ | ------- |
| Happiness    | UMUX-Lite mensuel ; à J30, question de Sean Ellis : « Comment vous sentiriez-vous si vous ne pouviez plus utiliser POuxis ? » | R2      |
| Engagement   | Jours actifs par semaine ; jours avec boucle complète ; sessions focus par semaine                                      | R3      |
| Adoption     | Première utilisation de chaque fonction du top 10 ; délai jusqu'à la première revue                                      | R2, R3  |
| Retention    | Part de personnes actives en S1, S4 et S8 (par cohorte) ; réactivation après une pause                                  | R3, R4  |
| Task success | Part des tâches planifiées faites le jour prévu ; écart prévu / réalisé (instantanés 1.9) ; taille de la boîte de réception ; plans acceptés sans modification | R1, R3 |

- **Échantillon.** 40 à 60 volontaires par cohorte. Analyses descriptives et par cohorte, sans
  généralisation à l'ensemble des utilisateur·ices (échantillon volontaire, donc biaisé).
- **Entretiens de suivi trimestriels** (6 personnes) pour expliquer les tendances observées.

**Méthode optionnelle.** Si la navigation entre les 7 modules pose problème en phase 3 : tri de
cartes ouvert avec 15 à 20 personnes (ordre de grandeur recommandé par Tullis & Wood, 2004).

---

## 5. Tailles d'échantillon et justification

| Méthode                          | n cible (min)       | Justification                                                                                                                                                                                                                                                                                  |
| -------------------------------- | ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Entretiens de découverte         | 18 (12)             | Dans un groupe assez homogène, l'essentiel des thèmes apparaît dans les 12 premiers entretiens (Guest, Bunce & Johnson, 2006) ; une revue systématique situe la saturation entre 9 et 17 entretiens, surtout pour des populations homogènes et des objectifs ciblés (Hennink & Kaiser, 2022). Notre population couvre 5 profils : d'où 3 à 4 entretiens par profil. Règle d'arrêt complémentaire : on s'arrête quand 3 entretiens consécutifs n'apportent plus de code nouveau (Francis et al., 2010). |
| Ateliers de co-conception        | 8–10                | Profondeur et co-construction, pas représentativité.                                                                                                                                                                                                                                           |
| Tests de concept qualitatifs     | 12 (8)              | Chaque module vu par 6 à 7 personnes. Objectif : compréhension et réactions, pas mesure.                                                                                                                                                                                                       |
| Enquête Kano + MaxDiff           | 300 (150)           | Marge d'erreur d'une proportion à 95 % (p = 0,5) : ±5,7 points à n = 300, ±8 points à n = 150. En Kano, 10 fonctions sur 30 par personne donnent environ 50 avis par fonction à n = 150. Comparer des segments exige au moins 50 répondant·es par segment ; sinon, on ne publie que le résultat global. |
| Utilisabilité formative          | 2 rounds × 8        | Avec 5 participant·es, on détecte en moyenne environ 85 % des problèmes fréquents (Nielsen & Landauer, 1993), mais cette moyenne masque une forte variabilité d'un échantillon à l'autre (Faulkner, 2003). 8 par round couvrent plateformes et profils, et limitent le risque de rater un problème propre à un segment. |
| Utilisabilité sommative (bêta)   | ≥ 20                | Pour des taux de réussite et un SUS avec des intervalles de confiance exploitables (Sauro & Lewis, 2016).                                                                                                                                                                                       |
| Étude journal 14 jours           | 16 (12 au bout)     | Hypothèse de planification : 20 à 30 % d'abandons sur deux semaines. 12 personnes au bout donnent environ 3 personnes par proto-persona prioritaire.                                                                                                                                             |
| Mesures longitudinales           | 40–60 par cohorte   | Suffisant pour des tendances descriptives et pour repérer un décrochage massif ; insuffisant pour des inférences fines.                                                                                                                                                                          |

---

## 6. Recrutement, screener et incitations

### 6.1 Canaux

| Canal                                                         | Public attendu                                  | Mode                                                                    | Précautions                                                                                                            |
| ------------------------------------------------------------- | ----------------------------------------------- | ----------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| YouTube K13 Studios (onglet communauté, commentaire épinglé, mention en fin de vidéo) | Créateur·ices, étudiant·es, designers | Lien vers le screener                                                   | Biais de complaisance ; au plus 60 % de l'échantillon de chaque phase                                                 |
| Discord (serveur communautaire)                               | Abonné·es engagé·es, devs                       | Salon `#panel-recherche`, rôle « Panel » attribué sur demande          | Annonces publiques seulement, aucun message privé non sollicité                                                       |
| Reddit                                                        | Productivité, TDAH, créateur·ices, freelances, devs, vie privée | Publication transparente, lien vers le screener          | Lire et respecter le règlement de chaque communauté ; demander l'accord des modérateur·ices avant toute publication dans les communautés TDAH (par ex. r/ADHD, r/ADHD_Programmers) ; communautés souvent anglophones |
| GitHub (Discussions du dépôt, README)                         | Devs, contributeur·ices potentiel·les           | Annonce épinglée                                                        | Les contributeur·ices actif·ves sont exclu·es des tests d'utilisabilité (leur connaissance du produit biaise)          |
| Fediverse / Mastodon, réseaux du fondateur                    | Public sensible à la vie privée, open source    | Publication                                                             | Quotas pour éviter la surreprésentation du profil « vie privée »                                                      |
| Écoles et universités (associations étudiantes, écoles d'art et de design, services d'accompagnement du handicap) | Étudiant·es, dont neurodivergent·es | Partenariat, affiche, mail relayé par l'institution | Jamais de démarchage individuel ; accord de l'institution                                                              |
| Associations TDAH (par ex. HyperSupers – TDAH France, TDA/H Belgique) | Personnes concernées                     | Partenariat ; relecture des documents par l'association                | Pas d'allégation de soin ; retour des résultats à l'association                                                        |
| Communautés freelances et studios créatifs                    | Designers, petites équipes                      | Relais, bouche-à-oreille                                                | Varier les villes et les secteurs                                                                                      |

Sessions en français par défaut. Des sessions en anglais sont possibles si une personne modératrice
anglophone est disponible ; elles sont signalées comme telles dans l'analyse.

### 6.2 Quotas par phase qualitative

| Critère                                                      | Quota                                                                                 |
| ------------------------------------------------------------ | ------------------------------------------------------------------------------------- |
| Proto-personas `PP1`–`PP4`                                   | Au moins 3 chacun en phase 1 ; au moins 1 par round de test                          |
| `PP5` petite équipe créative                                 | Au moins 2 équipes en phase 1 (2 membres par équipe ou entretiens individuels)       |
| Neurodivergent·es auto-identifié·es                          | Au moins 30 %                                                                         |
| Hors audience K13 Studios                                    | Au moins 40 %                                                                         |
| Plateformes                                                  | Au moins 30 % Android et au moins 30 % Windows ; plusieurs écosystèmes mélangés       |
| Technologies d'assistance (lecteur d'écran, zoom, clavier seul, commande vocale) | Au moins 2 par round de test                                  |
| Aisance numérique                                            | Au moins un tiers d'utilisateur·ices d'agenda natif ou papier (pas que des « power users ») |
| Genre et âge                                                 | Mélange ; 18 à 55 ans et plus                                                         |

**Exclusions.** Moins de 18 ans. Personnes ayant travaillé dans les 12 derniers mois pour un éditeur
d'applications de productivité, d'agenda ou de notes. Plus de 2 études rémunérées dans les 6 derniers
mois (« testeur·ses professionnel·les »). Proches de l'équipe (sauf pilotes). Contributeur·ices
actif·ves au code de POuxis (pour les tests d'utilisabilité).

### 6.3 Questionnaire de présélection (screener)

Durée cible : 5 minutes. Texte d'introduction proposé :

> Merci de votre intérêt pour POuxis ! Ce questionnaire prend environ 5 minutes. Il sert uniquement à
> choisir des personnes aux profils variés pour nos études. Si vous n'êtes pas retenu·e, vos réponses
> sont supprimées au plus tard 30 jours après la fin du recrutement. Elles ne sont ni vendues ni
> partagées.

| #   | Question                                                                                                                                                                                                                   | Réponses                                                                                                                                                                                                                       | Usage                                       |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------- |
| S1  | Quel âge avez-vous ?                                                                                                                                                                                                       | Moins de 18 ans · 18–24 · 25–34 · 35–44 · 45–54 · 55 et plus                                                                                                                                                                  | Moins de 18 ans : fin polie du questionnaire |
| S2  | Dans quel pays résidez-vous ?                                                                                                                                                                                              | Liste                                                                                                                                                                                                                          | RGPD, versement des incitations             |
| S3  | Dans quelle(s) langue(s) êtes-vous à l'aise pour une discussion d'une heure ?                                                                                                                                              | Français · Anglais · Autre                                                                                                                                                                                                     | Logistique                                  |
| S4  | Quelle description correspond le mieux à votre activité principale ? (une seule)                                                                                                                                           | Création de contenu (vidéo, podcast, streaming, écriture en ligne) · Design (graphique, UI/UX, illustration, motion) · Développement logiciel · Études (préciser le domaine) · Membre d'un studio ou d'une agence créative de 15 personnes ou moins · Salarié·e de bureau dans une organisation de plus de 50 personnes · Autre (préciser) | Proto-persona ; options leurres incluses     |
| S5  | Quel est votre statut ?                                                                                                                                                                                                    | Indépendant·e ou freelance · Salarié·e · Étudiant·e · Étudiant·e avec un emploi · En recherche d'emploi · Autre                                                                                                               | Proto-persona                               |
| S6  | Avec combien de personnes travaillez-vous régulièrement sur vos projets ?                                                                                                                                                  | Seul·e · 2 à 5 · 6 à 15 · Plus de 15                                                                                                                                                                                          | `PP5`                                       |
| S7  | Quels appareils utilisez-vous au moins une fois par semaine ? (plusieurs choix)                                                                                                                                            | iPhone · Téléphone Android · iPad · Tablette Android · Mac · PC Windows · PC Linux · Liseuse ou tablette à encre électronique · Autre                                                                                          | `R7`, quotas plateformes                    |
| S8  | Qu'utilisez-vous aujourd'hui pour organiser vos tâches et votre temps ? (plusieurs choix)                                                                                                                                  | Agenda ou carnet papier · Agenda numérique (Google, Apple, Outlook…) · Application de tâches (Todoist, Things, TickTick, Microsoft To Do…) · Outil de notes (Notion, Obsidian, Apple Notes…) · Planificateur visuel (Tiimo, Structured…) · Tableur · Rien de particulier · Autre | Contexte, aisance numérique                 |
| S9  | À quand remonte la dernière fois que vous avez changé d'outil d'organisation, ou sérieusement essayé de le faire ?                                                                                                        | Moins de 3 mois · 3 à 12 mois · Plus d'un an · Jamais                                                                                                                                                                          | Entretiens « switch » (privilégier moins de 12 mois) |
| S10 | En 2 ou 3 phrases, décrivez un moment récent où votre organisation vous a fait défaut.                                                                                                                                    | Texte libre                                                                                                                                                                                                                    | Capacité à raconter ; pas de « bonne réponse » |
| S11 | Combien de temps par semaine consacrez-vous à des projets créatifs (personnels ou professionnels) ?                                                                                                                       | Aucun · Moins de 2 h · 2 à 10 h · Plus de 10 h                                                                                                                                                                                | `PP1`, `PP2`, `R6`                          |
| S12 | Connaissez-vous la chaîne YouTube K13 Studios ?                                                                                                                                                                            | Non · J'en ai entendu parler · Je la regarde de temps en temps · Je suis abonné·e et la regarde régulièrement                                                                                                                 | Quota audience / hors audience              |
| S13 | Au cours des 12 derniers mois, avez-vous travaillé pour une entreprise qui développe une application de productivité, d'agenda ou de notes ? Combien d'études utilisateurs rémunérées avez-vous faites ces 6 derniers mois ? | Oui · Non ; nombre                                                                                                                                                                                                            | Exclusions                                  |
| S14 | (Facultatif) Utilisez-vous une technologie d'assistance ou des réglages particuliers ? Avez-vous besoin d'aménagements pour participer ?                                                                                 | Lecteur d'écran · Zoom ou agrandissement · Commande vocale · Clavier uniquement · Sous-titres · Autre · Je préfère ne pas répondre ; texte libre                                                                              | Quotas, préparation des sessions (§ 8)      |
| S15 | (Facultatif, section séparée, voir ci-dessous) Neurodivergence                                                                                                                                                             | Voir ci-dessous                                                                                                                                                                                                                | `R4`, quota                                 |
| S16 | Quelles modalités préférez-vous ? Quelles sont vos disponibilités ?                                                                                                                                                        | Visio · Téléphone · Présentiel (ville) · Écrit asynchrone ; créneaux                                                                                                                                                           | Logistique, accessibilité                   |
| S17 | Acceptez-vous d'être recontacté·e pour de futures études (pendant 24 mois au plus) ? Adresse e-mail.                                                                                                                      | Oui · Non                                                                                                                                                                                                                      | Panel                                       |

**S15 — Section séparée, facultative (donnée de santé, article 9 du RGPD).**

> Nous souhaitons inclure des personnes neurodivergentes (par exemple TDAH, dyslexie, autisme). Cette
> question est entièrement facultative. Y répondre ou non n'a aucune conséquence sur votre sélection
> dans les autres profils.
>
> ☐ J'accepte explicitement que ma réponse ci-dessous, qui peut révéler une information de santé,
> soit utilisée uniquement pour constituer un panel varié, puis supprimée à la fin du recrutement.
>
> Je me considère comme neurodivergent·e (avec ou sans diagnostic) : Oui, TDAH · Oui, autre (sans
> préciser) · Non · Je préfère ne pas répondre

La réponse S15 est stockée séparément du reste du screener, avec un accès restreint.

**Règles de qualification.**

| Profil | Critères                                                                                     |
| ------ | -------------------------------------------------------------------------------------------- |
| `PP1`  | S4 = création de contenu ; S6 = seul·e ou 2 à 5 ; S11 ≥ 2 h                                  |
| `PP2`  | S4 = design ; S5 = indépendant·e ou freelance                                               |
| `PP3`  | S4 = développement ; S5 = indépendant·e, ou projet personnel mentionné en S10               |
| `PP4`  | S5 = étudiant·e ; S15 = TDAH pour le cœur du segment, plus quelques étudiant·es non TDAH en comparaison |
| `PP5`  | S4 = studio ou agence ; S6 = 2 à 15                                                          |

**Signaux d'alerte.** Toutes les options cochées en S7 et S8 ; réponse S10 vide, générique ou
copiée ; incohérences entre S4, S5 et S6.

### 6.4 Incitations

Principes :

- l'incitation est **versée intégralement même en cas de retrait** pendant la session ;
- versement sous 7 jours, par le moyen choisi (virement, carte cadeau, ou don à une association) ;
- montants identiques pour l'audience K13 et hors audience ;
- pas de tirage au sort sans validation juridique préalable (les loteries sont encadrées) ;
- le traitement fiscal et comptable des incitations est à vérifier (ce document n'est pas un conseil
  fiscal).

| Activité                                    | Durée                      | Montant proposé (à ajuster au budget)                       |
| ------------------------------------------- | -------------------------- | ----------------------------------------------------------- |
| Entretien de découverte                     | 45 min                     | 40 €                                                        |
| Atelier de co-conception                    | 90 min                     | 60 €                                                        |
| Test de concept                             | 60 min                     | 50 €                                                        |
| Test d'utilisabilité                        | 75 min                     | 55 €                                                        |
| Étude journal                               | 14 jours + 3 rendez-vous   | 120 € (au prorata en cas d'arrêt : 30 € dès J0, puis par semaine) |
| Enquête                                     | 10–12 min                  | Pas d'incitation individuelle ; option : don collectif plafonné à une association choisie par vote |
| Panel longitudinal                          | 8–12 semaines              | Accès anticipé et mention dans les remerciements (sur option) ; non monétaire, donc à surveiller : risque d'attirer surtout des fans |

**Budget indicatif.**

| Poste                       | Plan complet                     | Plan minimal viable              |
| --------------------------- | -------------------------------- | -------------------------------- |
| Entretiens                  | 18 × 40 € = 720 €                | 12 × 40 € = 480 €                |
| Co-conception               | 10 × 60 € = 600 €                | 5 × 60 € = 300 €                 |
| Tests de concept            | 12 × 50 € = 600 €                | 8 × 50 € = 400 €                 |
| Tests d'utilisabilité       | 16 × 55 € = 880 €                | 12 × 55 € = 660 €                |
| Étude journal               | 16 × 120 € = 1 920 €             | 10 × 120 € = 1 200 €             |
| **Total incitations**       | **4 720 €**                      | **3 040 €**                      |

Le plan minimal réduit la puissance de chaque phase : il faut alors l'assumer dans les rapports
(« signaux » plutôt qu'« insights » quand la convergence est faible).

---

## 7. Éthique, RGPD et consentement

> **Avertissement.** Cette section décrit des bonnes pratiques. Elle ne constitue pas un avis
> juridique. Elle doit être validée par un·e juriste ou un·e délégué·e à la protection des données
> avant toute collecte.

### 7.1 Rôles

- **Responsable du traitement** : l'entité qui porte POuxis (à préciser : société, association ou
  fondateur en nom propre).
- **Sous-traitants** (art. 28 RGPD) : visioconférence, stockage, transcription, formulaires,
  paiement des incitations. Contrat de sous-traitance requis. On privilégie des outils hébergés dans
  l'UE ou exécutés localement (par exemple une transcription locale) pour éviter les transferts hors
  UE (chapitre V, art. 44 et suivants).

### 7.2 Bases légales et conditions du consentement

- Participation à la recherche : consentement (art. 6.1.a).
- Information éventuelle sur une neurodivergence : consentement **explicite** (art. 9.2.a),
  recueilli séparément.
- Le consentement doit pouvoir être démontré, être distinct des autres sujets, et être aussi facile à
  retirer qu'à donner (art. 7, notamment 7.3).
- Information des personnes au moment de la collecte (art. 13) : voir
  [`templates/formulaire-consentement.md`](./templates/formulaire-consentement.md).
- **Mineur·es** : exclu·es de l'ensemble du programme.

### 7.3 Minimisation (art. 5.1.c)

- Pas de diagnostic, pas de justificatif médical.
- En test d'utilisabilité, uniquement des **données fictives préchargées** ; jamais le vrai agenda de
  la personne.
- Partage d'écran limité à la fenêtre de l'application ; on demande de couper les notifications.
- Dans le journal, la personne choisit ce qu'elle montre ; captures floutées acceptées ; on ne
  demande jamais le contenu des tâches, seulement leur nature (« une tâche de travail »).
- Panel longitudinal : agrégats calculés localement, sans contenu.

### 7.4 Enregistrements

- Audio par défaut (avec consentement). Vidéo du visage facultative. Option « prise de notes
  seulement » toujours proposée.
- Usage **interne** par défaut.
- **Usage public** (vidéo YouTube, conférence, site) : consentement distinct, facultatif, non coché
  par défaut, et renouvelé **extrait par extrait** après que la personne l'a visionné. Le droit à
  l'image s'ajoute au RGPD. Refuser n'a aucune incidence sur l'incitation.
- Le fondateur étant créateur de contenu, la frontière entre recherche et contenu marketing doit être
  explicite : aucune séance n'est filmée « pour la chaîne ».

### 7.5 Pseudonymisation et sécurité

- Codes `P01`, `P02`… ; table de correspondance chiffrée, stockée séparément, accessible à deux
  personnes au plus.
- Stockage chiffré, double authentification sur les comptes utilisés.
- **Jamais de données brutes dans le dépôt git** (public). Avant publication, vérifier qu'un verbatim
  ne permet pas de réidentifier quelqu'un : métier précis + ville + nom de chaîne suffisent parfois.

### 7.6 Durées de conservation (proposition à valider)

| Donnée                                                   | Durée proposée                                                                       |
| -------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| Réponses au screener (personnes non retenues)            | 30 jours après la fin du recrutement                                                |
| Réponse facultative S15 (neurodivergence)                | Supprimée à la fin du recrutement ; pour les personnes retenues, remplacée par un code de segment pseudonymisé conservé jusqu'à la fin de l'analyse |
| Enregistrements audio et vidéo bruts                     | Supprimés dès transcription et vérification, et au plus tard 6 mois après la session |
| Transcriptions pseudonymisées                            | Fin du programme + 12 mois, 3 ans au maximum                                        |
| Synthèses anonymisées (insights, rapports)               | Sans limite (ce ne sont plus des données personnelles si l'anonymisation est effective) |
| Preuves de consentement                                  | Durée du traitement, puis durée de preuve à fixer avec le juriste                   |
| Coordonnées du panel (recontact)                         | 24 mois après le dernier contact, sauf renouvellement                               |
| Données de paiement des incitations                      | Selon les obligations comptables (à confirmer)                                      |

### 7.7 Droits et retrait

- Retrait à tout moment, **sans justification**, par simple e-mail ; l'incitation reste due.
- Suppression des données non encore anonymisées. Limite à expliquer dès le départ : les résultats
  déjà agrégés et anonymisés ne peuvent plus être retirés.
- Droits d'accès, de rectification, d'effacement, de limitation, de portabilité et d'opposition
  (art. 15 à 21). Réponse dans un délai d'un mois (art. 12.3).
- Réclamation possible auprès de l'autorité de contrôle : CNIL en France, Autorité de protection des
  données en Belgique, ou autorité du pays de résidence.

### 7.8 Bien-être et sujets sensibles

Les sessions peuvent toucher à l'épuisement, au TDAH, à l'anxiété ou à l'échec.

- Chaque personne peut passer une question, faire une pause ou arrêter, sans se justifier.
- La personne qui modère n'est pas thérapeute. En cas de détresse : on arrête la séance, on reste
  bienveillant, on propose une liste de ressources préparée par pays (lignes d'écoute, médecin
  traitant), sans insister.
- Débrief interne après toute séance difficile.

### 7.9 Simulation (« magicien d'Oz ») et tromperie

Si une fonction est simulée par un humain en coulisses (par exemple l'analyse en langage naturel), ou
si une erreur est volontairement introduite (variante de test de `H1b`), on le dit au débrief et on
propose le retrait des données de la séance.

### 7.10 Relecture éthique

- Liste de contrôle interne avant chaque phase (consentement, minimisation, accessibilité, ressources
  de soutien, stockage).
- Pour les phases touchant au TDAH : relecture des documents par au moins une personne concernée ou
  une association partenaire.
- Le besoin d'un avis de comité d'éthique est à confirmer avec le juriste. En cas de partenariat
  académique, la procédure de l'institution partenaire s'applique.

---

## 8. Accessibilité des sessions

Les sessions de recherche doivent elles-mêmes respecter le niveau d'exigence du produit (WCAG 2.2 AA,
navigation clavier complète, voir `CLAUDE.md`).

**Avant la session.**

- Documents et formulaires conformes WCAG 2.2 AA, testés au lecteur d'écran ; pas de PDF scanné.
- Résumé en langage simple (principes du FALC, « facile à lire et à comprendre ») en tête du
  formulaire de consentement.
- Dans les documents destinés aux participant·es, préférer les formulations neutres (« vous », « les
  personnes participantes ») aux points médians, que certains lecteurs d'écran lisent mal et qui
  gênent certaines personnes dyslexiques.
- Envoi des thèmes (et, sur demande, des questions) à l'avance : utile aux personnes
  neurodivergentes ou anxieuses, sans fausser un entretien centré sur des récits passés.
- Choix de la modalité (visio, audio seul, présentiel, écrit asynchrone), de l'horaire, et de la
  durée (une séance, ou deux séances plus courtes).
- Rappels la veille et une heure avant, par le canal choisi (utile en cas de « cécité temporelle »).
- Recueil des besoins d'aménagement (S14) et préparation : interprète en langue des signes sur
  demande, sous-titrage en direct, documents en gros caractères.

**Pendant la session.**

- Ordre du jour visible ; une question à la fois ; questions concrètes plutôt qu'abstraites.
- Caméra facultative ; bouger, se lever ou manipuler un objet est bienvenu.
- Pause proposée toutes les 20 à 25 minutes.
- Retard toléré (marge de 10 minutes), report sans pénalité.
- Personnes utilisant une technologie d'assistance : elles testent avec **leur** configuration et
  leur appareil ; on prévoit du temps supplémentaire et on ne chronomètre pas pour comparer.
- Penser à voix haute fatigue ; une alternative rétrospective (revisionnage commenté) est proposée
  (voir [`USABILITY_TEST_PLAN.md`](./USABILITY_TEST_PLAN.md)).
- Respect des pronoms et du prénom d'usage.

**Après la session.**

- Remerciements, rappel de la suite, versement de l'incitation sous 7 jours.
- Possibilité de compléter par écrit ce qui n'a pas été dit.

---

## 9. Méthode de synthèse

### 9.1 Chaîne de traitement

| Étape | Quoi                                                                                                                                                         | Quand                     | Outil                                                                 |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------- | --------------------------------------------------------------------- |
| 1     | Débrief à chaud : 3 surprises, 3 confirmations, questions à creuser                                                                                          | Dans l'heure              | Grille du guide d'entretien                                           |
| 2     | Transcription (locale de préférence) et pseudonymisation                                                                                                     | Sous 72 h                 | Outil de transcription local                                          |
| 3     | Découpage en observations atomiques `OBS-###` (un fait, une source, une citation éventuelle)                                                                 | Sous 1 semaine            | [`tableau-de-synthese.md`](./templates/tableau-de-synthese.md)        |
| 4     | Diagramme d'affinités (méthode KJ, Kawakita) : regroupement ascendant, en équipe d'au moins 2 personnes dont une qui n'a pas modéré ; libellés de groupes formulés à la première personne (« Je ne fais pas confiance à ce que je ne peux pas défaire ») | Fin de phase | Tableau blanc puis tableau de synthèse |
| 5     | Analyse thématique des entretiens (Braun & Clarke, 2006) ; double codage d'au moins 20 % des transcriptions, désaccords discutés et consignés                | Fin de phase              | Grille de codes                                                       |
| 6     | Jobs to be done : job stories « Quand…, je veux…, afin de… » et forces du progrès (poussée, attraction, anxiété, habitude)                                  | Fin de phase              | Tableau de synthèse                                                   |
| 7     | Insights : une carte par insight, **avec contre-preuves** et niveau de confiance                                                                            | Fin de phase              | [`carte-insight.md`](./templates/carte-insight.md)                    |
| 8     | Opportunités : arbre opportunités-solutions (Torres, 2021) et matrice impact / effort                                                                        | Atelier de restitution    | Tableau de synthèse                                                   |
| 9     | Mise à jour du registre des risques `R1`–`R7` : soutenu, affaibli, non concluant                                                                             | Atelier de restitution    | Tableau de synthèse                                                   |
| 10    | Décisions `DEC-###` et diffusion (synthèse d'une page + rapport)                                                                                             | Sous 1 semaine            | § 10                                                                  |

### 9.2 Niveaux de confiance d'un insight

| Niveau  | Critère                                                                                                   |
| ------- | --------------------------------------------------------------------------------------------------------- |
| Faible  | Une seule source ou 1 à 2 participant·es ; à traiter comme un signal                                      |
| Moyen   | Au moins 3 participant·es, une seule méthode ou un seul segment                                           |
| Fort    | Au moins 2 méthodes convergentes (dire / faire / traces), au moins 5 participant·es issu·es de plusieurs segments, pas de contre-preuve majeure |

### 9.3 Format du rapport de synthèse

Chaque phase produit un rapport structuré ainsi (gabarit dans
[`tableau-de-synthese.md`](./templates/tableau-de-synthese.md)) :

1. **Résumé** (3 à 4 phrases).
2. **Thèmes clés**, chacun avec sa **prévalence chiffrée** (« 7 sur 12 ») et 2 ou 3 citations.
3. **Insights → opportunités** (tableau impact / effort).
4. **Segments observés** (et écarts avec les proto-personas).
5. **Recommandations** classées.
6. **Statut des risques et hypothèses** (`R1`–`R7`, `H…`).
7. **Questions ouvertes.**
8. **Notes méthodologiques et limites** (taille, biais de recrutement, audience K13, données
   fictives…).

### 9.4 Implication de l'équipe

Chaque membre de l'équipe produit (fondateur, design, ingénierie) observe au moins deux séances par
phase, en silence, et participe à l'atelier d'affinités. Les insights n'ont d'effet que s'ils sont
partagés par celles et ceux qui décident.

---

## 10. Journal des décisions

Le journal relie chaque décision produit aux preuves qui la fondent, et dit ce qui ferait changer
d'avis. Il vit dans ce fichier jusqu'à ce qu'il dépasse une vingtaine d'entrées ; il sera alors
déplacé dans un fichier dédié.

### 10.1 Index

| ID  | Date | Décision | Risque | Confiance | Statut |
| --- | ---- | -------- | ------ | --------- | ------ |
| —   | —    | Aucune décision enregistrée à ce jour | — | — | — |

Statuts possibles : Proposée · Actée · Révisée · Abandonnée.

### 10.2 Gabarit d'entrée

```markdown
### DEC-### — [Titre court à l'infinitif : « Activer le routage par défaut »]

- **Date :** AAAA-MM-JJ
- **Statut :** Proposée | Actée | Révisée (voir DEC-###) | Abandonnée
- **Risque / question :** R# — [question de recherche]
- **Contexte :** [Pourquoi une décision est nécessaire maintenant ; contraintes]
- **Preuves :** INS-###, INS-### ; chiffres clés (avec n) ; lien vers le rapport de phase
- **Contre-preuves connues :** [ce qui va dans l'autre sens]
- **Niveau de confiance :** Faible | Moyen | Fort (voir § 9.2)
- **Options envisagées :**
  1. [Option A] — avantages / inconvénients
  2. [Option B] — avantages / inconvénients
- **Décision :** [ce qui est décidé, périmètre précis, fonctionnalités concernées m.n]
- **Critère de réouverture :** [quel signal, mesuré comment, ferait revoir la décision]
- **Responsable :** [rôle]
- **Date de revue :** AAAA-MM-JJ
```

### 10.3 Exemple — **FICTIF, à titre d'illustration uniquement**

```markdown
### DEC-000 — (EXEMPLE FICTIF) Faire du routage une suggestion à valider

- **Date :** AAAA-MM-JJ
- **Statut :** Exemple, ne reflète aucune donnée réelle
- **Risque / question :** R1 — confiance dans le routage automatique
- **Preuves :** (fictif) INS-0XX : 7 participant·es sur 12 du journal ont désactivé le routage
  avant J7 après un déplacement non désiré ; score de confiance moyen 3,9/7.
- **Contre-preuves connues :** (fictif) les 3 participant·es TDAH ayant gardé le routage le
  décrivent comme un soulagement.
- **Niveau de confiance :** Moyen
- **Options :** 1. Routage par défaut avec explication ; 2. Suggestion à valider chaque matin ;
  3. Routage par défaut uniquement pour les tâches flottantes (1.10).
- **Décision :** (fictif) option 2 pour tous, option 1 proposée après 7 jours d'usage.
- **Critère de réouverture :** plus de 60 % d'acceptations sans modification sur 4 semaines.
```

---

## 11. Calendrier indicatif et rôles

Les semaines sont relatives (S0 = lancement du programme) et dépendent de la disponibilité des
prototypes et du MVP.

| Semaines | S0–S2 | S2–S6 | S6–S10 | S10–S14 | S14–S18 | S18+ |
| -------- | ----- | ----- | ------ | ------- | ------- | ---- |
| Phase    | 0 Cadrage | 1 Découverte | 2 Concept et priorisation | 3 Utilisabilité MVP | 4 Journal 14 jours | 5 Longitudinal |
| Prérequis | Instruments, consentement validé | Panel ≥ 60 | Stimuli des 7 modules ; liste des ~30 candidates | Build de test avec données fictives | Alpha stable sur 4 plateformes | Export d'agrégats volontaire |

| Rôle                              | Responsabilités                                                                 |
| --------------------------------- | ------------------------------------------------------------------------------- |
| Responsable de la recherche       | Plan, instruments, modération, synthèse, journal des décisions                 |
| Co-modérateur·ice / preneur·se de notes | Grille d'observation, débrief à chaud, double codage                       |
| Fondateur                         | Observation silencieuse, arbitrage des décisions ; ne modère pas les sessions avec l'audience K13 |
| Design                            | Stimuli de concept, prototypes, participation aux ateliers d'affinités         |
| Ingénierie                        | Builds de test, données fictives, export d'agrégats                            |
| Juriste / DPO                     | Validation du consentement, des durées et des sous-traitants                   |
| Partenaire associatif (TDAH)      | Relecture des documents, retour des résultats                                  |

---

## 12. Dépendances avec les autres équipes

| Besoin                                                                                                   | Pour     | Phase |
| -------------------------------------------------------------------------------------------------------- | -------- | ----- |
| Feuille de route (`docs/product/ROADMAP.md`) utilisant les identifiants `m.n` et définissant le périmètre MVP | Produit  | 0, 2  |
| Présélection des ~30 fonctionnalités candidates et estimation d'effort (« prix » du buy-a-feature)      | Produit, ingénierie | 2 |
| Stimuli de concept pour les 7 modules (planches, maquettes basse fidélité, vidéos courtes)               | Design   | 2     |
| Build de test : chargement et réinitialisation d'un jeu de données fictif, horloge accélérée pour les sessions focus | Ingénierie | 3 |
| Distribution de builds alpha (iOS, Android, macOS, Windows) aux participant·es                           | Ingénierie | 4   |
| Export volontaire d'agrégats sans contenu (panel longitudinal)                                           | Vie privée, sync | 5 |
| Relecture du formulaire de consentement, des durées de conservation et des sous-traitants               | Juridique | 0    |
| Salon Discord `#panel-recherche`, relais YouTube                                                          | Communauté | 0   |
| Audit d'accessibilité des formulaires et questionnaires                                                  | Accessibilité | 0 |

---

## 13. Références

- Benedek, J., & Miner, T. (2002). _Measuring desirability: New methods for evaluating desirability
  in a usability lab setting_. Usability Professionals' Association Conference.
- Braun, V., & Clarke, V. (2006). Using thematic analysis in psychology. _Qualitative Research in
  Psychology, 3_(2), 77–101.
- Brooke, J. (1996). SUS: A "quick and dirty" usability scale. In P. W. Jordan et al. (Eds.),
  _Usability Evaluation in Industry_ (pp. 189–194). Taylor & Francis.
- Buehler, R., Griffin, D., & Ross, M. (1994). Exploring the "planning fallacy": Why people
  underestimate their task completion times. _Journal of Personality and Social Psychology, 67_(3),
  366–381.
- Cherry, E., & Latulipe, C. (2014). Quantifying the creativity support of digital tools through the
  Creativity Support Index. _ACM Transactions on Computer-Human Interaction, 21_(4), article 21.
- Dietvorst, B. J., Simmons, J. P., & Massey, C. (2015). Algorithm aversion: People erroneously avoid
  algorithms after seeing them err. _Journal of Experimental Psychology: General, 144_(1), 114–126.
- Dietvorst, B. J., Simmons, J. P., & Massey, C. (2018). Overcoming algorithm aversion: People will
  use imperfect algorithms if they can (even slightly) modify them. _Management Science, 64_(3),
  1155–1170.
- Faulkner, L. (2003). Beyond the five-user assumption: Benefits of increased sample sizes in
  usability testing. _Behavior Research Methods, Instruments, & Computers, 35_(3), 379–383.
- Francis, J. J., et al. (2010). What is an adequate sample size? Operationalising data saturation
  for theory-based interview studies. _Psychology & Health, 25_(10), 1229–1245.
- Gronier, G., & Baudet, A. (2021). Psychometric evaluation of the F-SUS: Creation and validation of
  the French version of the System Usability Scale. _International Journal of Human-Computer
  Interaction, 37_(16).
- Guest, G., Bunce, A., & Johnson, L. (2006). How many interviews are enough? An experiment with
  data saturation and variability. _Field Methods, 18_(1), 59–82.
- Hennink, M., & Kaiser, B. N. (2022). Sample sizes for saturation in qualitative research: A
  systematic review of empirical tests. _Social Science & Medicine, 292_, 114523.
- Hohmann, L. (2006). _Innovation Games: Creating Breakthrough Products Through Collaborative Play_.
  Addison-Wesley.
- Iyengar, S. S., & Lepper, M. R. (2000). When choice is demotivating: Can one desire too much of a
  good thing? _Journal of Personality and Social Psychology, 79_(6), 995–1006.
- Jian, J.-Y., Bisantz, A. M., & Drury, C. G. (2000). Foundations for an empirically determined
  scale of trust in automated systems. _International Journal of Cognitive Ergonomics, 4_(1), 53–71.
- Kano, N., Seraku, N., Takahashi, F., & Tsuji, S. (1984). Attractive quality and must-be quality.
  _Journal of the Japanese Society for Quality Control, 14_(2), 39–48.
- Lee, J. D., & See, K. A. (2004). Trust in automation: Designing for appropriate reliance. _Human
  Factors, 46_(1), 50–80.
- Lewis, J. R., Utesch, B. S., & Maher, D. E. (2013). UMUX-LITE: When there's no time for the SUS.
  _Proceedings of CHI 2013_, 2099–2102.
- Louviere, J. J., Flynn, T. N., & Marley, A. A. J. (2015). _Best-Worst Scaling: Theory, Methods and
  Applications_. Cambridge University Press.
- Nielsen, J., & Landauer, T. K. (1993). A mathematical model of the finding of usability problems.
  _Proceedings of INTERCHI '93_, 206–213.
- Norberg, P. A., Horne, D. R., & Horne, D. A. (2007). The privacy paradox: Personal information
  disclosure intentions versus behaviors. _Journal of Consumer Affairs, 41_(1), 100–126.
- Rodden, K., Hutchinson, H., & Fu, X. (2010). Measuring the user experience on a large scale:
  User-centered metrics for web applications. _Proceedings of CHI 2010_, 2395–2398.
- Sauro, J., & Lewis, J. R. (2016). _Quantifying the User Experience: Practical Statistics for User
  Research_ (2nd ed.). Morgan Kaufmann.
- Scheibehenne, B., Greifeneder, R., & Todd, P. M. (2010). Can there ever be too many options? A
  meta-analytic review of choice overload. _Journal of Consumer Research, 37_(3), 409–425.
- Torres, T. (2021). _Continuous Discovery Habits_. Product Talk.
- Tullis, T., & Wood, L. (2004). _How many users are enough for a card-sorting study?_ Usability
  Professionals' Association Conference.
- Van Westendorp, P. (1976). NSS-Price Sensitivity Meter: A new approach to study consumer perception
  of prices. _ESOMAR Congress_.
- Règlement (UE) 2016/679 (RGPD), notamment art. 5, 6, 7, 9, 12, 13, 15 à 21, 28 et 44.
