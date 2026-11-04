# Registre des risques — POuxis

> **Statut : v0.1 de travail (2026-11-04).** Revu à chaque fin de sprint. Complète les risques de
> recherche `R1`–`R7` de [`USER_RESEARCH.md`](../research/USER_RESEARCH.md#2-risques-produit-et-questions-de-recherche),
> qui ne sont pas répétés ici mais référencés. Feuille de route : [`ROADMAP.md`](./ROADMAP.md).

## Échelle

- **Probabilité** : Faible (F), Moyenne (M), Élevée (É) — estimation qualitative de l'équipe.
- **Impact** : Faible (F) = gêne contournable ; Moyen (M) = retarde une phase ; Élevé (É) =
  compromet la confiance, les données ou la viabilité du projet.
- **Déclencheur** : signal observable qui fait passer le risque en « avéré » et active le plan.

## 1. Produit et usage

| ID  | Risque                                                                                              | P   | I   | Mitigation                                                                                                                     | Déclencheur                                                              |
| --- | --------------------------------------------------------------------------------------------------- | --- | --- | ------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------ |
| P-1 | **Dérive de périmètre** : la richesse du brief (100 fonctions) dilue l'effort et retarde la boucle. | É   | É   | MVP limité à 19 fonctions ; toute fonction ajoutée en remplace une ou prouve qu'elle renforce la boucle (`ROADMAP.md` § 8).    | Une phase dépasse de moitié le nombre de fonctions prévu.                |
| P-2 | **Le routage automatique n'inspire pas confiance** (`R1`).                                          | M   | É   | Raison lisible par placement, épinglage, annulation (AC-5.2 à 5.6) ; bascule en suggestion si le seuil `R1` n'est pas atteint. | Routage désactivé par la majorité de la cohorte avant J14.               |
| P-3 | **La boucle casse au bilan** (`R3`, `H3a`).                                                         | M   | M   | Bilan court, notification réglable, replanification en une action (US-16).                                                     | Moins d'un bilan sur deux effectué en semaine 2.                         |
| P-4 | **Fonctions de « bien-être » qui culpabilisent** (2.3, 2.15, 7.3 ; `R4`).                           | M   | É   | Avertissements doux, opt-in, formulations testées avec `PP4` ; aucune couleur d'erreur sur un retard.                          | Verbatims de honte ou d'abandon liés à ces fonctions.                    |
| P-5 | **Positionnement flou** : « à quoi sert POuxis ? » reste sans réponse claire (`H2b`).               | M   | M   | Onboarding sur les 4 verbes ; divulgation progressive ; test de reformulation du concept.                                      | Moins de la moitié des participant·es reformule correctement le concept. |
| P-6 | **Attente « application finie »** décalée par rapport à un MVP phasé.                               | É   | M   | Communication publique de la feuille de route et des limitations connues ; notes de version honnêtes.                          | Retours publics centrés sur des fonctions annoncées absentes.            |

## 2. Technique

| ID  | Risque                                                                                                            | P   | I   | Mitigation                                                                                                                                     | Déclencheur                                                          |
| --- | ----------------------------------------------------------------------------------------------------------------- | --- | --- | ---------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| T-1 | **Bugs de convergence CRDT** : divergence silencieuse entre appareils.                                            | M   | É   | Tests de propriétés (ordres d'application aléatoires), tests multi-appareils, vérification d'empreinte d'état après synchronisation.           | Deux appareils affichent des états différents après synchronisation. |
| T-2 | **Perte de données** lors d'une migration de schéma ou d'un arrêt brutal.                                         | F   | É   | Écritures atomiques, migrations testées, export 6.11 dès le MVP comme filet de sécurité.                                                       | Tout signalement de perte.                                           |
| T-3 | **Perte de la clé de chiffrement** : appareils perdus sans phrase de récupération.                                | M   | É   | Phrase de récupération proposée à l'appairage (AC-18.3), rappel dans les réglages ; aucune récupération côté serveur possible, dit clairement. | Demandes d'assistance pour récupération impossible.                  |
| T-4 | **Fuseaux horaires et changements d'heure** : tâches décalées d'une heure.                                        | M   | M   | `time.ts` avec fuseau IANA explicite partout ; tests sur les transitions ; interdiction du fuseau local de la machine.                         | Défaut reproduit autour d'un changement d'heure.                     |
| T-5 | **Performances de la WebView** inégales selon l'OS (WebKit, WebView2, WebKitGTK, Android WebView).                | M   | M   | Budgets de `MVP_SPEC.md` § 5 mesurés par plateforme ; animations limitées à `transform`/`opacity` ; vues chargées à la demande.                | Budget dépassé sur une plateforme de référence.                      |
| T-6 | **Dette d'intégration native** : chaque fonction OS (1.11, 3.12, 2.5, 7.7) exige Swift/Kotlin hors de la WebView. | É   | M   | Regrouper par chantier natif ; documenter les replis ; ne pas promettre ce qu'une plateforme n'offre pas (§ 5 de la feuille de route).         | Fonction bloquée sur une plateforme plus d'une phase.                |
| T-7 | **Recherche sémantique trop lourde sur mobile** (taille du modèle, batterie).                                     | M   | F   | Modèle optionnel téléchargé à la demande ; recherche lexicale par défaut ; recherche hybride dégradable (`search/hybrid.ts`).                  | Modèle trop volumineux pour la cible mobile.                         |
| T-8 | **Travail concurrent dans le dépôt** : contrats partagés (`model.ts`, tokens) modifiés de façon incohérente.      | M   | M   | Contrats figés et modifiés seulement par demande explicite ; typage strict ; tests de tous les paquets en intégration continue.                | Rupture de typage entre paquets.                                     |

## 3. Plateformes et distribution

| ID  | Risque                                                                                                | P   | I   | Mitigation                                                                                              | Déclencheur                                |
| --- | ----------------------------------------------------------------------------------------------------- | --- | --- | ------------------------------------------------------------------------------------------------------- | ------------------------------------------ |
| D-1 | **Refus en revue des magasins** (autorisations de localisation, d'arrière-plan, chiffrement).         | M   | M   | Autorisations minimales et justifiées ; déclarations de chiffrement préparées ; bêtas avant soumission. | Refus de soumission.                       |
| D-2 | **API absentes ou restreintes** (1.11 sous Windows, macOS, iOS ; 5.6 sur mobile).                     | É   | F   | Replis documentés (`ROADMAP.md` § 5) ; jamais de contournement non public.                              | Changement de politique d'un OS.           |
| D-3 | **Coûts de signature et de distribution** (comptes développeur, certificats) pour un projet bénévole. | É   | M   | Distribution directe (bureau) et bêtas jusqu'à 1.0 ; recherche de financement communautaire avant 1.0.  | Impossibilité de renouveler un certificat. |

## 4. Vie privée, sécurité et juridique

Signalements détaillés : [`ROADMAP.md` § 6](./ROADMAP.md#6-signalements-vie-privée-et-juridiques).
Ce registre n'est pas un avis juridique.

| ID  | Risque                                                                                                        | P   | I   | Mitigation                                                                                                                     | Déclencheur                                 |
| --- | ------------------------------------------------------------------------------------------------------------- | --- | --- | ------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------- |
| L-1 | **Reconnaissance des émotions** (5.7) contraire au règlement IA dans les contextes de travail et d'éducation. | É   | É   | Phase « Recherche » ; aucune implémentation sans avis juridique ; alternative manuelle.                                        | Toute proposition d'implémentation.         |
| L-2 | **Profilage de salarié·es** (6.9) et surveillance au travail (7.2 en contexte d'équipe).                      | M   | É   | Données déclaratives, jamais inférées ni visibles par un employeur sans consentement ; métriques personnelles restent locales. | Demande d'un tableau de bord « manager ».   |
| L-3 | **Fuite de métadonnées par le relais** (horaires d'activité, taille des données).                             | M   | M   | Métadonnées minimales, journalisation sans identifiants, rétention courte ; auto-hébergement documenté.                        | Revue de sécurité ou signalement.           |
| L-4 | **Faille cryptographique** (mauvais usage d'une primitive).                                                   | F   | É   | Primitives standard, relecture extérieure avant 0.2 (coffres) et 1.0 ; procédure de divulgation responsable.                   | Signalement de vulnérabilité.               |
| L-5 | **Hébergement de contenus partagés** (3.10) : contenus illicites, obligations de signalement.                 | M   | M   | Contenu chiffré ; procédure de signalement et de retrait avant 1.0.                                                            | Premier signalement reçu.                   |
| L-6 | **Licences et marques** (icônes cloud, banques d'images, noms de méthodes).                                   | M   | F   | Vérification par fonction (gabarit, section juridique) ; noms génériques en cas de doute.                                      | Réclamation d'un ayant droit.               |
| L-7 | **Affirmations scientifiques non étayées** dans la communication (« appuyé sur des études »).                 | M   | M   | Citer seulement des sources vérifiées ; distinguer inspiration et preuve ; aucune statistique inventée.                        | Affirmation publiée sans source vérifiable. |

## 5. Projet et communauté

| ID  | Risque                                                                                     | P   | I   | Mitigation                                                                                                   | Déclencheur                                                |
| --- | ------------------------------------------------------------------------------------------ | --- | --- | ------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------- |
| C-1 | **Facteur bus de 1** : le fondateur est la seule personne à maîtriser l'ensemble.          | É   | É   | Documentation d'architecture, conventions (`CLAUDE.md`), tests exhaustifs, revue de code par la communauté.  | Aucune contribution externe fusionnée à la fin de 0.2.     |
| C-2 | **Épuisement du mainteneur** face aux demandes de fonctionnalités.                         | M   | É   | Gabarit de proposition obligatoire ; feuille de route publique ; droit de dire non consigné dans le journal. | Délai de réponse aux contributions en hausse continue.     |
| C-3 | **Financement du relais hébergé** et de la distribution.                                   | M   | M   | Auto-hébergement toujours possible ; décision sur le modèle économique avant 1.0 (`R5`).                     | Coûts d'hébergement non couverts.                          |
| C-4 | **Contributions incohérentes** avec les principes (vie privée, accessibilité, animations). | M   | M   | Critères de revue explicites dans le gabarit ; tests d'accessibilité automatisés là où c'est possible.       | Régression d'accessibilité ou appel réseau tiers fusionné. |

## 6. Risques les plus critiques

Par ordre de priorité (probabilité × impact, puis réversibilité) :

1. **P-1** Dérive de périmètre — c'est la menace directe sur la livraison de la boucle.
2. **T-1** Convergence CRDT — une divergence silencieuse détruit la confiance dans le local-first.
3. **C-1** Facteur bus — conditionne la pérennité de tout le reste.
4. **L-1** Reconnaissance des émotions — risque juridique évitable par simple décision de phase.
5. **P-2** Confiance dans le routage — cœur de la proposition de valeur du module 1.
