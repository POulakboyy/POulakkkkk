# Spécification du MVP 0.1 — « La boucle »

> **Statut : v0.1 de travail (2026-11-04).** Périmètre et justification :
> [`ROADMAP.md` § 2](./ROADMAP.md#2-pourquoi-ce-mvp--la-boucle). Les identifiants `m.n` renvoient
> au [brief](../BRIEF.md) ; `R1`–`R7` aux risques de
> [`USER_RESEARCH.md`](../research/USER_RESEARCH.md) ; `PP1`–`PP5` aux proto-personas de
> [`PERSONAS.md`](../research/PERSONAS.md).

## Sommaire

1. [Objectif et périmètre](#1-objectif-et-périmètre)
2. [Parcours](#2-parcours)
3. [Récits utilisateur et critères d'acceptation](#3-récits-utilisateur-et-critères-dacceptation)
4. [Exigences non fonctionnelles](#4-exigences-non-fonctionnelles)
5. [Budgets de performance](#5-budgets-de-performance)
6. [Plan d'analytique locale](#6-plan-danalytique-locale)
7. [Critères de publication](#7-critères-de-publication)
8. [Hors périmètre](#8-hors-périmètre)
9. [Questions ouvertes](#9-questions-ouvertes)

---

## 1. Objectif et périmètre

**Objectif.** Une personne seule boucle Capturer → Planifier → Se concentrer → Faire le bilan
pendant deux semaines, sur un ordinateur et un téléphone synchronisés, y compris hors-ligne.

**Fonctionnalités incluses (19).** 1.1, 1.2, 1.6, 1.7, 1.8, 1.9, 1.10, 1.14, 2.1, 2.6, 2.9, 2.11,
2.14, 2.15, 3.1, 3.11, 5.14, 6.11, 7.9.

**Plateformes.** Bureau : macOS, Windows, Linux (builds de test). Mobile : iOS et Android en bêta
(TestFlight, piste de test interne). Le navigateur sert au développement et aux tests, pas à la
distribution.

**Conventions des critères.** Format Étant donné / Quand / Alors. « Fuseau de la personne » =
fuseau IANA explicite des préférences (`UserPrefs`), jamais le fuseau de la machine
(`packages/core/src/time.ts`). Chaque critère portant sur la logique est couvert par un test
automatisé dans `@pouxis/core` ; chaque critère d'interface par un test de composant ou de bout en
bout.

---

## 2. Parcours

| Parcours | Maillon                 | Récits        | Persona principal (hypothèse) |
| -------- | ----------------------- | ------------- | ----------------------------- |
| F1       | Capturer                | US-1 à US-4   | `PP1`, `PP3`                  |
| F2       | Planifier               | US-5 à US-11  | `PP1`, `PP2`, `PP4`           |
| F3       | Se concentrer           | US-12 à US-14 | `PP2`, `PP4`                  |
| F4       | Faire le bilan          | US-15 à US-16 | `PP1`                         |
| Socle    | Multi-appareil, données | US-17 à US-21 | tous                          |

Les numéros F1–F4 correspondent aux flux testés dans le programme de recherche (phase 3).

---

## 3. Récits utilisateur et critères d'acceptation

### F1 — Capturer

**US-1 — Saisie en langage naturel (1.8).** En tant que personne pressée, je veux taper une phrase
comme « Réunion projet X mardi prochain 14h-16h avec @paul » pour créer un élément daté sans
remplir de formulaire.

- **AC-1.1** — Étant donné le fuseau `Europe/Paris` et la date du jeudi 5 novembre 2026, quand je
  saisis « Réunion projet X mardi prochain 14h-16h avec @paul », alors un événement est proposé le
  mardi 10 novembre 2026 de 14 h à 16 h (heure de Paris), avec le participant `paul` et le titre
  « Réunion projet X ».
- **AC-1.2** — Étant donné une saisie, quand le texte est analysé, alors les fragments reconnus
  (date, heure, durée, mention, tag, priorité) sont mis en évidence avant validation, et je peux en
  annuler chacun d'un geste ou d'une touche.
- **AC-1.3** — Étant donné une saisie sans date reconnue, quand je valide, alors une tâche est
  créée dans la boîte de réception (`status: 'inbox'`), sans erreur.
- **AC-1.4** — Étant donné la langue de l'interface (fr ou en), quand je saisis des expressions
  dans l'autre langue prise en charge, alors elles sont aussi reconnues.
- **AC-1.5** — Étant donné une heure inexistante (passage à l'heure d'été), quand elle est saisie,
  alors l'heure est décalée vers l'avant (règle de `packages/core/src/time.ts` : une heure sautée
  par le changement d'heure est résolue vers l'avant) et l'aperçu affiche l'heure effective.

**US-2 — Capture universelle sur ordinateur (2.11).** En tant que développeur·se (`PP3`), je veux
un raccourci global qui ouvre une ligne de capture par-dessus n'importe quel logiciel.

- **AC-2.1** — Étant donné l'application lancée (même en arrière-plan), quand j'appuie sur le
  raccourci par défaut, alors une fenêtre de capture s'ouvre avec le curseur dans le champ.
- **AC-2.2** — Étant donné la fenêtre de capture ouverte, quand je valide avec Entrée, alors
  l'élément est enregistré localement, la fenêtre se ferme et le focus revient à l'application
  précédente.
- **AC-2.3** — Étant donné la fenêtre ouverte, quand j'appuie sur Échap, alors elle se ferme sans
  rien créer ; si du texte avait été saisi, il est conservé comme brouillon pour la prochaine
  ouverture.
- **AC-2.4** — Étant donné un raccourci déjà pris par une autre application, quand POuxis tente de
  l'enregistrer, alors un message explique le conflit et propose d'en choisir un autre.

**US-3 — Brain dump (5.14).** En tant que créatrice (`PP1`), je veux vider ma tête dans un champ de
texte pur, puis retrouver chaque ligne dans ma boîte de réception.

- **AC-3.1** — Étant donné l'application ouverte sur n'importe quel écran, quand j'utilise le
  bouton central (mobile) ou le raccourci (bureau), alors un champ de texte plein écran s'ouvre
  dans le budget de § 5.
- **AC-3.2** — Étant donné un texte de plusieurs lignes, quand je ferme le brain dump, alors chaque
  ligne non vide devient un élément de la boîte de réception, analysé comme en US-1.
- **AC-3.3** — Étant donné une fermeture inattendue de l'application pendant la saisie, quand je la
  rouvre, alors le texte saisi n'est pas perdu (sauvegarde locale continue).

**US-4 — Trier la boîte de réception.** En tant que personne, je veux transformer rapidement une
capture en tâche planifiable.

- **AC-4.1** — Étant donné un élément dans la boîte de réception, quand je lui donne une durée
  estimée et une échéance (ou un jour), alors il passe au statut `todo` et devient candidat au
  routage (US-5).
- **AC-4.2** — Étant donné la boîte de réception, quand je l'ouvre, alors son nombre d'éléments est
  visible, sans compteur alarmant ni couleur d'erreur.

### F2 — Planifier

**US-5 — Routage dynamique (1.1).** En tant que personne débordée, je veux que mes tâches soient
placées automatiquement dans les créneaux libres de mes heures de travail.

- **AC-5.1** — Étant donné des heures de travail, des événements fixes et des tâches avec durée
  estimée, quand je demande « Planifier ma journée », alors chaque tâche placée l'est dans un
  créneau libre, sans chevauchement avec un événement fixe ni sortie des heures de travail.
- **AC-5.2** — Étant donné un placement, quand je le consulte, alors une raison lisible en une
  phrase est affichée (par exemple « placée avant son échéance de jeudi, dans votre plus long bloc
  libre ») — exigence `H1a` de `R1`.
- **AC-5.3** — Étant donné une tâche que j'ai épinglée à une heure, quand le routage est relancé,
  alors elle ne bouge pas.
- **AC-5.4** — Étant donné des tâches qui ne tiennent pas dans la période, quand le routage
  s'exécute, alors elles sont listées comme « non placées » avec la raison, jamais placées hors des
  heures de travail.
- **AC-5.5** — Étant donné des entrées identiques, quand le routage est relancé, alors le résultat
  est identique (déterminisme).
- **AC-5.6** — Étant donné un plan proposé, quand je l'annule, alors l'agenda revient exactement à
  l'état précédent.

**US-6 — Propagation des retards (1.2).** En tant que personne, je veux que mes tâches suivantes se
décalent quand une tâche déborde, sans toucher mes rendez-vous.

- **AC-6.1** — Étant donné une tâche en cours qui dépasse sa fin prévue, quand je prolonge la
  tâche, alors les tâches non épinglées qui suivent sont décalées d'autant, en sautant les
  événements fixes.
- **AC-6.2** — Étant donné un décalage qui pousserait une tâche au-delà de la fin des heures de
  travail, quand la propagation s'applique, alors cette tâche est signalée « à replanifier » au lieu
  d'être placée hors des heures.
- **AC-6.3** — Étant donné une propagation, quand elle s'applique, alors un résumé indique quelles
  tâches ont bougé et propose de l'annuler.

**US-7 — Buffers (1.6).** En tant que personne enchaînant les réunions, je veux un temps de
transition automatique entre deux réunions consécutives.

- **AC-7.1** — Étant donné deux réunions séparées par moins que la durée de buffer réglée (5 à
  15 min), quand le plan est calculé, alors aucun bloc de travail n'est placé dans cet intervalle et
  un buffer de type `buffer` est affiché.
- **AC-7.2** — Étant donné le réglage des buffers à 0, quand le plan est calculé, alors aucun
  buffer n'est inséré.

**US-8 — Tâches flottantes (1.10).** En tant que personne avec une « cécité temporelle » (`PP4`), je
veux attacher une tâche à un jour sans lui donner d'heure.

- **AC-8.1** — Étant donné une tâche attachée au jour J sans heure, quand le routage s'exécute,
  alors elle se place dans un espace libre du jour J, jamais un autre jour.
- **AC-8.2** — Étant donné qu'aucun espace libre suffisant n'existe le jour J, quand le routage
  s'exécute, alors elle reste visible dans la liste du jour comme « à caser », sans être déplacée à
  un autre jour sans mon accord.

**US-9 — Dépendances (2.1).** En tant que personne, je veux que la tâche B n'apparaisse dans ma
journée que lorsque A est terminée.

- **AC-9.1** — Étant donné B dépendant de A, quand A n'est pas terminée, alors B n'apparaît pas
  dans la vue du jour et n'est pas routée.
- **AC-9.2** — Étant donné A terminée, quand la vue du jour se met à jour, alors B y apparaît et
  devient candidate au routage.
- **AC-9.3** — Étant donné une dépendance qui créerait un cycle, quand je tente de l'ajouter, alors
  elle est refusée avec un message explicite.

**US-10 — Récurrence (2.9).** En tant que personne, je veux exprimer des règles comme « le 3e mardi
ouvré de chaque mois ».

- **AC-10.1** — Étant donné la règle « le 3e mardi ouvré de chaque mois », quand j'affiche les
  six prochaines occurrences, alors chacune est le troisième mardi ouvré du mois correspondant,
  calculée dans le fuseau de la personne.
- **AC-10.2** — Étant donné une règle récurrente, quand une occurrence traverse un changement
  d'heure, alors elle garde son heure locale.
- **AC-10.3** — Étant donné une occurrence modifiée ou supprimée seule, quand la série est
  recalculée, alors l'exception est conservée.

**US-11 — Limite de charge douce (2.15) et barre de progression (1.14).** En tant que personne, je
veux être prévenue quand ma journée devient irréaliste, sans être bloquée.

- **AC-11.1** — Étant donné 5 tâches prioritaires dans la journée (seuil réglable), quand j'en
  ajoute une 6e, alors un avertissement non bloquant propose de reporter une tâche ; l'ajout reste
  possible.
- **AC-11.2** — Étant donné la vue du jour, quand je la consulte, alors une barre indique
  l'avancement dans la période choisie (jour, semaine, trimestre ou année), avec une alternative
  textuelle (« 63 % de la journée de travail écoulée »).
- **AC-11.3** — Étant donné le réglage « afficher la progression » désactivé, quand j'ouvre la vue
  du jour, alors la barre n'est pas affichée.

### F3 — Se concentrer

**US-12 — Pomodoro par tâche (2.6).** En tant que designer freelance (`PP2`), je veux un minuteur
lié à la tâche qui enregistre le temps réel passé.

- **AC-12.1** — Étant donné une tâche, quand je démarre une session, alors un `TimeLog` est ouvert
  sur cette tâche et le temps écoulé s'affiche.
- **AC-12.2** — Étant donné une session en cours, quand l'application passe en arrière-plan ou que
  l'appareil se met en veille, alors le temps est calculé à partir des horodatages, pas d'un
  compteur, et reste exact au retour.
- **AC-12.3** — Étant donné une session terminée ou interrompue, quand je consulte la tâche, alors
  le temps cumulé et le nombre de sessions sont à jour sur tous mes appareils après
  synchronisation.
- **AC-12.4** — Étant donné une fin de session, quand elle survient, alors une notification
  (visuelle et, si activée, sonore) est émise, et une pause est proposée sans être imposée.

**US-13 — Focus unique (2.14).** En tant qu'étudiante avec un TDAH (`PP4`), je veux n'afficher
qu'une tâche en plein écran.

- **AC-13.1** — Étant donné une tâche, quand j'entre en focus unique, alors seuls son titre (en
  grande typographie), son minuteur et les actions « Terminer », « Pause » et « Quitter » sont
  visibles.
- **AC-13.2** — Étant donné le focus unique, quand j'appuie sur Échap ou sur « Quitter », alors je
  reviens à l'écran précédent, sans confirmation culpabilisante.
- **AC-13.3** — Étant donné `prefers-reduced-motion`, quand j'entre ou sors du mode, alors aucune
  animation de déplacement n'est jouée.

**US-14 — Silence pendant la concentration.** En tant que personne, je veux que POuxis lui-même ne
me dérange pas pendant une session (1.11 complet en 0.2).

- **AC-14.1** — Étant donné une session de concentration active, quand une notification POuxis non
  urgente devrait s'afficher, alors elle est différée à la fin de la session.

### F4 — Faire le bilan

**US-15 — Snapshot prévu / réalisé (1.9).** En tant que personne, je veux comparer ce que j'avais
prévu en début de semaine à ce que j'ai fait.

- **AC-15.1** — Étant donné un plan accepté, quand la semaine commence (premier jour selon les
  préférences) ou que je le demande, alors un snapshot immuable du plan est enregistré.
- **AC-15.2** — Étant donné un snapshot et les `TimeLog` de la semaine, quand j'ouvre la
  comparaison, alors chaque tâche est classée « faite comme prévu », « faite autrement »,
  « reportée » ou « non prévue mais faite ».

**US-16 — Bilan hebdomadaire (7.9).** En tant que créatrice (`PP1`), je veux un bilan le dimanche
soir avec mes victoires et mes blocages récurrents.

- **AC-16.1** — Étant donné le jour et l'heure de bilan réglés (dimanche 19 h par défaut, dans le
  fuseau de la personne), quand ce moment arrive, alors une notification invite au bilan ; elle se
  désactive en un geste.
- **AC-16.2** — Étant donné une semaine d'activité, quand j'ouvre le bilan, alors il présente les
  tâches terminées, le temps de concentration, les entrées de journal de type `win` et `friction`,
  et les tâches reportées plusieurs fois.
- **AC-16.3** — Étant donné une semaine sans activité, quand j'ouvre le bilan, alors il l'affiche
  sobrement, sans formulation culpabilisante (exigence `R4`).
- **AC-16.4** — Étant donné le bilan, quand je le termine, alors je peux replanifier les reports en
  une action, ce qui reboucle sur F2.

### Socle — multi-appareil et données

**US-17 — Fonctionnement hors-ligne (3.1).** En tant que personne, je veux que tout fonctionne sans
réseau.

- **AC-17.1** — Étant donné un appareil sans réseau, quand j'utilise les parcours F1 à F4, alors
  tous fonctionnent à l'identique, sans message d'erreur réseau bloquant.
- **AC-17.2** — Étant donné une écriture, quand elle est validée, alors elle est persistée
  localement avant que l'interface ne confirme (aucune perte en cas d'arrêt brutal).

**US-18 — Appairer un appareil.** En tant que personne, je veux synchroniser mon téléphone et mon
ordinateur sans créer de compte.

- **AC-18.1** — Étant donné deux appareils, quand j'affiche un code d'appairage (QR et texte) sur
  l'un et le saisis ou le scanne sur l'autre, alors ils partagent la même clé de chiffrement et
  commencent à se synchroniser.
- **AC-18.2** — Étant donné l'appairage, quand il est réalisé, alors aucune adresse e-mail ni mot
  de passe n'est demandé, et la saisie du code accepte le collage (WCAG 3.3.8).
- **AC-18.3** — Étant donné le premier appairage, quand il se termine, alors une phrase de
  récupération est proposée, avec l'explication qu'elle seule permet de restaurer les données si
  tous les appareils sont perdus.

**US-19 — Synchronisation sans conflit (1.7, 3.11).** En tant que personne, je veux que des
modifications faites hors-ligne sur deux appareils fusionnent sans perte.

- **AC-19.1** — Étant donné deux appareils hors-ligne modifiant des champs différents d'une même
  tâche, quand ils se reconnectent, alors les deux modifications sont présentes sur les deux
  appareils.
- **AC-19.2** — Étant donné deux modifications concurrentes du même champ, quand ils se
  reconnectent, alors les deux appareils convergent vers la même valeur, sans intervention : la valeur
  au plus grand HLC l'emporte ([`ARCHITECTURE.md` § 7](../architecture/ARCHITECTURE.md#7-sémantique-des-conflits),
  [ADR 0002](../adr/0002-crdt-hlc-lww-par-champ-et-blocs.md)).
- **AC-19.3** — Étant donné une suppression sur un appareil et une modification sur l'autre, quand
  ils se reconnectent, alors la suppression l'emporte (pas de « résurrection »,
  [`ARCHITECTURE.md` § 7](../architecture/ARCHITECTURE.md#7-sémantique-des-conflits)) et le
  résultat est identique sur les deux.
- **AC-19.4** — Étant donné le relais de synchronisation, quand il reçoit des données, alors il ne
  reçoit que des charges chiffrées ; aucun titre, contenu ni date en clair ne transite.
- **AC-19.5** — Étant donné une connexion instable, quand la synchronisation reprend, alors seules
  les opérations manquantes sont échangées (pas de renvoi intégral de l'état).

**US-20 — Export complet (6.11).** En tant que personne attachée à ses données (`PP3`), je veux tout
exporter dans un format ouvert.

- **AC-20.1** — Étant donné mes données, quand je demande l'export, alors un `.zip` contenant un
  JSON par collection et un fichier de manifeste versionné est produit localement.
- **AC-20.2** — Étant donné un export, quand je l'importe dans un espace vide, alors toutes les
  collections sont restaurées à l'identique (test aller-retour automatisé).

**US-21 — Langue et accessibilité.** En tant que personne, je veux une interface dans ma langue et
utilisable avec mes technologies d'assistance.

- **AC-21.1** — Étant donné la langue du système en français ou en anglais, quand j'ouvre POuxis
  pour la première fois, alors l'interface est dans cette langue ; sinon en anglais ; modifiable
  dans les réglages.
- **AC-21.2** — Étant donné un lecteur d'écran (VoiceOver, TalkBack, NVDA), quand je parcours F1 à
  F4, alors chaque contrôle a un nom accessible et chaque changement d'état important est annoncé.

---

## 4. Exigences non fonctionnelles

### 4.1 Hors-ligne et intégrité

- Toutes les fonctions du MVP fonctionnent hors-ligne ; seuls l'appairage initial et la
  synchronisation exigent le réseau.
- Écritures atomiques et persistées avant confirmation ; migration de schéma testée à chaque
  changement de version des données.
- Aucune dépendance à l'horloge réseau : les horodatages locaux sont tolérés en dérive, la
  convergence ne dépend pas de leur exactitude (propriété du CRDT).

### 4.2 Accessibilité — WCAG 2.2 niveau AA

Exigence minimale sur tous les parcours. Points d'attention propres à POuxis :

| Critère                                         | Application                                                                                          |
| ----------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| 2.1.1 Clavier                                   | Tous les parcours au clavier, y compris le calendrier et le déplacement de blocs.                    |
| 2.5.7 Mouvements de glissement (nouveau 2.2)    | Tout glisser-déposer (déplacer un bloc) a une alternative sans glisser (menu « Déplacer à… »).       |
| 2.5.8 Taille de cible minimale (nouveau 2.2)    | AA exige 24 × 24 px ; POuxis s'impose **44 × 44 px** (convention du dépôt).                          |
| 2.4.11 Focus non masqué (nouveau 2.2)           | Barres fixes et feuilles modales ne masquent jamais l'élément ayant le focus.                        |
| 3.3.8 Authentification accessible (nouveau 2.2) | Appairage et phrase de récupération : collage autorisé, aucun test cognitif.                         |
| 2.2.1 Réglage du délai                          | Fin de pomodoro et fondus (7.4, hors MVP) n'imposent aucune action dans un délai.                    |
| 1.4.3 / 1.4.11 Contrastes                       | Texte ≥ 4,5:1 ; composants et états ≥ 3:1, en thème clair et sombre.                                 |
| 2.3.3 / `prefers-reduced-motion`                | Animations limitées à `transform` et `opacity`, durées par tokens `--dur-*`, désactivées si demandé. |
| 1.4.10 Redimensionnement                        | Utilisable à 320 px CSS de large et avec le texte agrandi à 200 %.                                   |

### 4.3 Internationalisation

- Français canonique, anglais miroir ; clés typées, aucune chaîne en dur (vérifié par
  `npm run typecheck`).
- Dates, heures, nombres et durées formatés par `Intl` dans la locale choisie ; calculs de dates
  toujours avec un fuseau IANA explicite.
- Le parseur 1.8 reconnaît les deux langues indépendamment de la langue de l'interface.

### 4.4 Vie privée par défaut

- Aucun compte, aucune adresse e-mail requise.
- Aucune télémétrie distante, aucun outil d'analyse tiers, aucun rapport de plantage envoyé
  automatiquement ; un rapport technique peut être **exporté manuellement** par la personne.
- Aucune requête réseau vers un tiers ; seules connexions sortantes : le relais de synchronisation
  configuré (auto-hébergeable, `apps/sync-server`) et, à la demande, la vérification de mise à jour.
- Chiffrement de bout en bout de la synchronisation ; le relais ne voit que des charges chiffrées
  et des métadonnées de transport minimales.
- Données au repos sur l'appareil : stockage de l'application, protégé par le chiffrement de
  l'appareil fourni par l'OS. Chiffrement applicatif supplémentaire : coffres (3.5, phase 0.2).

### 4.5 Sécurité

- Primitives cryptographiques standard uniquement (module `crypto` de `@pouxis/core`), aucune
  cryptographie maison.
- Le relais applique une limitation de débit et n'accepte que des jetons d'appairage valides.
- Politique de sécurité du contenu stricte dans la WebView ; aucune exécution de code distant.

### 4.6 Fiabilité et qualité

- `npm test` et `npm run typecheck` verts sur la branche publiée.
- Logique du moteur couverte par des tests unitaires, y compris les cas limites de fuseaux
  (changements d'heure, fuseaux à décalage non entier).

---

## 5. Budgets de performance

Cibles fixées par l'équipe, mesurées sur des **appareils de référence** à définir et documenter
avant la publication (un ordinateur portable de milieu de gamme de moins de 5 ans, un téléphone
Android de milieu de gamme, un iPhone d'il y a deux générations). Elles s'inspirent des ordres de
grandeur classiques de temps de réponse perçu (environ 0,1 s pour une réaction perçue comme
instantanée, 1 s pour ne pas interrompre le fil de pensée ; Nielsen, 1993), sans prétendre à une
validation propre à POuxis.

| Mesure                                                                | Budget                                                     |
| --------------------------------------------------------------------- | ---------------------------------------------------------- |
| Retour visuel d'une interaction (frappe, clic, case cochée)           | ≤ 100 ms (p95)                                             |
| Ouverture du brain dump / de la capture, application résidente (5.14) | ≤ 50 ms visé, ≤ 100 ms exigé (p95)                         |
| Démarrage à froid jusqu'à la vue Aujourd'hui utilisable — bureau      | ≤ 1,5 s (p95)                                              |
| Démarrage à froid — mobile                                            | ≤ 2,5 s (p95)                                              |
| Analyse 1.8 d'une saisie                                              | ≤ 5 ms (p95), à chaque frappe                              |
| Routage 1.1 de 200 tâches sur 14 jours avec 100 événements            | ≤ 100 ms sur le fil principal, sinon déporté en worker     |
| Changement de vue                                                     | ≤ 200 ms (p95)                                             |
| Animations                                                            | 60 images/s sans saccade, `transform`/`opacity` uniquement |
| JavaScript initial (vue Aujourd'hui, compressé)                       | ≤ 250 Ko ; autres vues chargées à la demande               |
| Convergence de la synchronisation après reconnexion, 1 000 opérations | ≤ 5 s sur une connexion 4G                                 |
| Mémoire au repos — bureau                                             | ≤ 200 Mo                                                   |

Un budget dépassé bloque la publication (§ 7), sauf dérogation consignée dans le journal des
décisions de la feuille de route.

---

## 6. Plan d'analytique locale

**Principe.** POuxis ne collecte rien à distance. Les mesures servent d'abord à la personne
(vue Bilans), ensuite — uniquement si elle le décide — à la recherche.

**Collecte.** Événements de comportement stockés **sur l'appareil** dans une collection dédiée,
non synchronisée par défaut, conservés 90 jours (fenêtre glissante), effaçables à tout moment
depuis les réglages. Aucun contenu (titre, texte, participant) n'est enregistré : seulement le
type d'événement, un horodatage et des valeurs numériques.

| Événement                            | Propriétés                                         | Sert à                                           |
| ------------------------------------ | -------------------------------------------------- | ------------------------------------------------ |
| `capture.created`                    | canal (`nlp`, `dump`, `global`), éléments reconnus | Maillon F1                                       |
| `inbox.triaged`                      | délai depuis la capture (minutes)                  | Délai capture → planification (`R3`)             |
| `plan.proposed`                      | nombre de tâches placées / non placées             | Maillon F2                                       |
| `plan.accepted`                      | modifié avant acceptation (oui/non)                | Part des plans acceptés sans modification (`R1`) |
| `plan.item.moved`                    | épinglé (oui/non)                                  | Corrections manuelles (`R1`)                     |
| `delay.propagated`                   | nombre de tâches décalées                          | Robustesse du plan (`H3b`)                       |
| `focus.started` / `focus.ended`      | durée, interrompue (oui/non)                       | Maillon F3                                       |
| `review.opened` / `review.completed` | —                                                  | Maillon F4                                       |
| `wip.warning.shown`                  | action (reporter / ignorer)                        | Réglage de 2.15 (`R4`)                           |
| `routing.toggled`                    | activé (oui/non)                                   | Routage actif à J7/J14 (`R1`)                    |

**Indicateurs calculés localement.** Jours de boucle complète par semaine (au moins une capture,
un plan consulté, une session de concentration) ; délai médian capture → tri ; part des plans
acceptés sans modification ; nombre de bilans effectués ; taille de la boîte de réception.

**Partage volontaire.** Pour les cohortes de recherche uniquement : un bouton « Exporter mon
rapport d'usage » génère un fichier lisible (JSON et résumé) que la personne peut relire avant de
l'envoyer elle-même. Pas d'identifiant d'appareil, horodatages arrondis à l'heure. Base légale et
conservation : celles du programme de recherche (`USER_RESEARCH.md` § 7).

---

## 7. Critères de publication

La version 0.1 est publiée quand **tous** les points suivants sont vrais (la procédure opérationnelle de
publication est décrite dans [`RELEASE_CHECKLIST.md`](../operations/RELEASE_CHECKLIST.md)) :

1. **Fonctionnel** — tous les critères AC de § 3 passent ; les critères de logique sont couverts
   par des tests automatisés.
2. **Qualité** — `npm test`, `npm run typecheck` et `npm run build` verts ; aucun défaut ouvert de
   gravité bloquante ou majeure sur F1–F4 et le socle.
3. **Données** — test aller-retour d'export (US-20) vert ; test de convergence multi-appareil
   (US-19) vert, y compris avec modifications hors-ligne concurrentes ; migration depuis la
   dernière préversion testée.
4. **Accessibilité** — audit WCAG 2.2 AA des parcours F1–F4 sans non-conformité bloquante ; test
   au clavier seul et avec au moins un lecteur d'écran par famille de plateforme (bureau, mobile).
5. **Performance** — budgets de § 5 tenus sur les appareils de référence.
6. **Vie privée** — vérification que l'application n'émet aucune requête réseau hors relais et
   mise à jour (capture du trafic) ; relecture du chiffrement par une seconde personne.
7. **Langues** — FR et EN complets ; relecture humaine des textes d'interface.
8. **Documentation** — guide de démarrage FR/EN, procédure d'auto-hébergement du relais, notes de
   version, liste des limitations connues (notamment § 5 de la feuille de route).
9. **Recherche** — au moins une session de test d'utilisabilité (phase 3 de `USER_RESEARCH.md`)
   menée sur une préversion, et ses défauts bloquants corrigés.

---

## 8. Hors périmètre

Tout ce qui n'est pas listé en § 1, notamment : canvas, collaboration, IA générative, recherche
sémantique, parser vocal, coffres chiffrés, « Ne pas déranger » au niveau de l'OS (repli interne
seulement, US-14), services tiers. Voir [`ROADMAP.md` § 2](./ROADMAP.md#ce-qui-est-coupé-du-mvp-et-pourquoi).

---

## 9. Questions ouvertes

| Question                                                                                            | Décidée par                                 |
| --------------------------------------------------------------------------------------------------- | ------------------------------------------- |
| Routage activé par défaut ou en suggestion ?                                                        | Seuil `R1` (journal de 14 jours)            |
| Seuil par défaut de 2.15 (5 tâches prioritaires) et formulation de l'avertissement                  | Tests avec `PP4` (`R4`)                     |
| Plateformes mobiles prioritaires pour la bêta                                                       | Screener et enquête (`R7`)                  |
| Raccourci global par défaut (`Cmd+Shift+Space` entre en conflit possible avec des outils existants) | Tests sur macOS, Windows, Linux             |
| Relais hébergé par le projet ou seulement auto-hébergé en 0.1 ?                                     | Coût d'hébergement et modèle de financement |

### Références

- Nielsen, J. (1993). _Usability Engineering_. Academic Press (chapitre 5, temps de réponse).
- W3C (2023). _Web Content Accessibility Guidelines (WCAG) 2.2_. Recommandation du W3C.
