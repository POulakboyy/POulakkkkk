# Registre des affirmations

Chaque phrase des fiches qui décrit une capacité de l'app renvoie à une ligne de ce registre.
**Une affirmation ne part en soumission que si sa case « Vérifié dans le build » est cochée.**
Si une fonction n'est pas livrée, retirer la phrase correspondante de toutes les fiches (fr et
en) et de la série de captures, puis relancer `node check-limits.mjs`.

État au 4 novembre 2026 : moteur `@pouxis/core` en cours (planification, tâches et chiffrement
présents ; NLP, récurrence, graphe, idéation, bilan et synchronisation client en cours) ; vues
de l'app en cours de réalisation. Aucune case n'est cochée.

| #   | Affirmation (formulation fr)                                                             | Brief            | Module                                         | Vérifié dans le build |
| --- | ---------------------------------------------------------------------------------------- | ---------------- | ---------------------------------------------- | --------------------- |
| C1  | Données stockées et traitées sur l'appareil ; fonctionne hors ligne                      | 3.1              | `apps/pouxis/src/store`                        | ☐                     |
| C2  | Pas de compte à créer                                                                    | —                | app                                            | ☐                     |
| C3  | Pas de publicité                                                                         | —                | décision produit                               | ☐                     |
| C4  | « Réunion projet mardi 14 h-16 h » devient un événement daté                             | 1.8              | `core/nlp`                                     | ☐                     |
| C5  | Les tâches sont placées dans les créneaux libres selon leur durée                        | 1.1, 1.10        | `core/scheduler` (`route`, `magnetize`)        | ☐                     |
| C6  | Une tâche qui déborde décale la suite sans toucher aux rendez-vous fixes                 | 1.2              | `core/scheduler` (`propagateDelay`)            | ☐                     |
| C7  | Temps de transition entre réunions consécutives                                          | 1.6              | `core/scheduler` (`insertBuffers`)             | ☐                     |
| C8  | Alerte avant qu'une réunion morcelle un long bloc de travail                             | 1.15             | `core/scheduler` (`checkMakerSchedule`)        | ☐                     |
| C9  | Mode Focus : une seule tâche, en grand / plein écran                                     | 2.14             | `features/focus`                               | ☐                     |
| C10 | Minuteur Pomodoro par tâche, temps enregistré avec la tâche                              | 2.6              | `core/tasks`                                   | ☐                     |
| C11 | Limite de priorités par jour                                                             | 2.15             | `core/tasks`                                   | ☐                     |
| C12 | Tâches dépendantes affichées quand la précédente est terminée                            | 2.1              | `core/tasks`                                   | ☐                     |
| C13 | Matrice urgence-importance et tableaux Kanban générés depuis les listes                  | 2.4, 2.12        | `core/tasks`                                   | ☐                     |
| C14 | Répétitions du type « 3e mardi ouvré de chaque mois »                                    | 2.9              | `core/recurrence`                              | ☐                     |
| C15 | Toile infinie, cartes mentales et organigrammes, mise en page automatique                | 4.1, 4.2         | `core/graph`, `views/canvas`                   | ☐                     |
| C16 | Capture rapide d'idées vers la boîte de réception                                        | 5.14             | `features/command`                             | ☐                     |
| C17 | Raccourci clavier global par-dessus les autres apps (Mac, Windows, Linux)                | 2.11             | `platform`, `src-tauri`                        | ☐                     |
| C18 | Palette de commandes                                                                     | —                | `features/command`                             | ☐                     |
| C19 | Partage vers POuxis depuis le menu de partage d'Android                                  | 3.12             | `platform`                                     | ☐                     |
| C20 | Moteur de sérendipité (deux notes sans lien)                                             | 5.1              | `core/ideation`                                | ☐                     |
| C21 | Contraintes créatives aléatoires                                                         | 5.4              | `core/ideation`                                | ☐                     |
| C22 | Bac à sable exclu de la recherche                                                        | 5.8              | `core/search`                                  | ☐                     |
| C23 | Bilan : heures productives d'après l'historique                                          | 1.3              | `core/insights`                                | ☐                     |
| C24 | Bilan : temps à organiser vs temps à produire                                            | 7.2              | `core/insights`                                | ☐                     |
| C25 | Résumé hebdomadaire des avancées et blocages                                             | 7.9              | `core/insights`                                | ☐                     |
| C26 | Synchronisation facultative, chiffrée de bout en bout ; le relais ne voit pas le contenu | 1.7              | `core/sync`, `core/crypto`, `apps/sync-server` | ☐                     |
| C27 | Coffres chiffrés                                                                         | 3.5              | `core/crypto`                                  | ☐                     |
| C28 | Export complet dans un format ouvert                                                     | 6.11             | à identifier                                   | ☐                     |
| C29 | Code source ouvert                                                                       | —                | **aucune licence dans le dépôt** à ce jour     | ☐                     |
| C30 | Recherche instantanée dans notes, tâches et événements                                   | 3.2              | `core/search`                                  | ☐                     |
| C31 | Navigation complète au clavier ; réglage de réduction des animations respecté            | 7.x, `CLAUDE.md` | app                                            | ☐                     |
| C32 | Interface en français et en anglais                                                      | —                | `src/i18n`                                     | ☐                     |
| C33 | Saisie à la souris, au pavé tactile ou au stylet sur la Toile (Windows)                  | 4.6              | `views/canvas`                                 | ☐                     |

Volontairement **absent** de toutes les fiches de la 1.0 :

- Déclenchement du « Ne pas déranger » / « Concentration » du système (1.11). À notre
  connaissance, iOS ne permet pas à une app tierce d'activer un mode Concentration (les filtres
  de Concentration permettent seulement d'y réagir), et Android l'autorise avec une permission
  d'accès explicite ; la situation sous macOS et Windows est à confirmer par le responsable de
  `src/platform`. Ne l'annoncer que plateforme par plateforme, une fois livré et vérifié.
- Toute fonction d'IA (décomposition, recherche sémantique, squelettes d'organigramme,
  tonalité vocale) : elle changerait aussi les réponses de confidentialité si un service
  distant est utilisé.
- Collaboration, commentaires, multi-curseurs, SSO, webhooks : hors périmètre 1.0.
- Toute allégation scientifique (« prouvé », « fondé sur des études ») : le brief annonce des
  fonctions « appuyées sur des études » mais aucune étude n'est citée ni vérifiée à ce jour.
