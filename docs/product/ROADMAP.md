# Feuille de route produit — POuxis

> **Statut : v0.1 de travail (2026-11-04).** Document vivant, mis à jour à chaque fin de sprint.
> Source de vérité de la vision : [`docs/BRIEF.md`](../BRIEF.md). Spécification du MVP :
> [`MVP_SPEC.md`](./MVP_SPEC.md). Risques : [`RISKS.md`](./RISKS.md). Gabarit de spécification :
> [`FEATURE_TEMPLATE.md`](./FEATURE_TEMPLATE.md).
>
> La feuille de route est organisée **par phases, pas par dates** : POuxis est porté par un
> fondateur solo et une communauté open source dont la disponibilité ne se planifie pas. Une phase
> se termine quand ses **critères de sortie** sont remplis, pas à une échéance.

## Sommaire

1. [Principes de priorisation](#1-principes-de-priorisation)
2. [Pourquoi ce MVP : la boucle](#2-pourquoi-ce-mvp--la-boucle)
3. [Les phases](#3-les-phases)
4. [Tableau des 100 fonctionnalités](#4-tableau-des-100-fonctionnalités)
5. [Contraintes de plateforme](#5-contraintes-de-plateforme)
6. [Signalements vie privée et juridiques](#6-signalements-vie-privée-et-juridiques)
7. [Sprint en cours](#7-sprint-en-cours)
8. [Gouvernance de la feuille de route](#8-gouvernance-de-la-feuille-de-route)
9. [Documents liés](#9-documents-liés)

---

## 1. Principes de priorisation

1. **Une boucle complète vaut mieux que cent fonctions partielles.** Une fonctionnalité entre dans
   une phase si elle renforce la boucle Capturer → Planifier → Se concentrer → Faire le bilan
   (§ 2), ou si elle est un socle sans lequel la boucle ne tient pas (stockage local,
   synchronisation, accessibilité).
2. **Local-first et vie privée par défaut.** Toute fonction qui exige d'envoyer des données en
   clair à un serveur, ou d'appeler un service tiers, est repoussée tant qu'une variante locale ou
   chiffrée de bout en bout n'existe pas, ou rendue strictement optionnelle (opt-in).
3. **Moteur avant interface.** La logique vit dans `@pouxis/core` (TypeScript pur, testé, sans
   dépendance). Une fonction peut donc avoir son moteur terminé plusieurs phases avant son
   interface ; la colonne « Statut » le distingue de la colonne « Phase » (§ 4).
4. **Honnêteté technique.** Quand une plateforme n'offre pas d'API publique (par exemple « Ne pas
   déranger » sous Windows), la fonction est livrée en version dégradée documentée, jamais
   simulée.
5. **Hypothèses, pas certitudes.** Les priorités ci-dessous reprennent les hypothèses de
   [`PERSONAS.md`](../research/PERSONAS.md) et les risques `R1`–`R7` de
   [`USER_RESEARCH.md`](../research/USER_RESEARCH.md). Elles seront révisées après la phase 2
   (tests de concept, MaxDiff, Kano) du programme de recherche.

### La loi de Hick appliquée au périmètre

La loi de Hick-Hyman (Hick, 1952 ; Hyman, 1953) décrit, en laboratoire, un temps de décision qui
croît avec le logarithme du nombre d'alternatives équiprobables. Nous l'utilisons ici comme
**analogie de conception**, pas comme preuve : chaque fonction visible ajoute une alternative à
chaque écran, une entrée dans l'onboarding et une surface à maintenir. Les effets de surcharge de
choix sont par ailleurs très dépendants du contexte (méta-analyse de Scheibehenne, Greifeneder &
Todd, 2010, citée dans `USER_RESEARCH.md`, `H2b`) ; nous mesurons donc la compréhension du produit
au lieu de la présupposer. En pratique :

- le MVP expose **4 verbes** (capturer, planifier, se concentrer, faire le bilan) et au plus
  **4 onglets mobiles** plus le bouton central de capture (contrainte déjà inscrite dans
  `apps/pouxis/src/app/routes.ts`) ;
- une fonction avancée n'apparaît pas tant que la personne n'en a pas besoin (divulgation
  progressive) ;
- toute fonction ajoutée doit en remplacer une, ou prouver qu'elle ne rallonge pas le parcours
  principal.

---

## 2. Pourquoi ce MVP : la boucle

```
        ┌──────────────┐     ┌──────────────┐     ┌──────────────────┐     ┌────────────────┐
        │  CAPTURER    │ ──▶ │  PLANIFIER   │ ──▶ │  SE CONCENTRER   │ ──▶ │ FAIRE LE BILAN │
        │ 1.8 2.11 5.14│     │ 1.1 1.2 1.6  │     │ 2.6 2.14 1.11    │     │ 1.9 7.9        │
        │              │     │ 1.10 2.1 2.9 │     │                  │     │                │
        └──────────────┘     └──────────────┘     └──────────────────┘     └───────┬────────┘
               ▲                                                                   │
               └───────────────────── ajustements, nouvelles idées ◀───────────────┘
                     Socle : 3.1 local-first · 1.7 / 3.11 synchronisation · 6.11 export
```

**Le problème que le MVP doit résoudre.** Une idée capturée sur le téléphone en marchant doit se
retrouver, sans ressaisie, planifiée sur l'ordinateur ; le plan doit survivre au premier
débordement ; la séance de travail doit être protégée ; la semaine doit pouvoir être relue. C'est
l'hypothèse `R3` du programme de recherche : la valeur de POuxis tient à la boucle, pas à une
fonction isolée. Si un maillon manque, la boucle casse et l'outil est abandonné (`H3c` : une boîte
de réception qui grossit sans être triée annonce l'abandon).

### Indispensable, enchantement, plus tard

| Catégorie         | Critère                                                                 | Fonctions                                                                                 |
| ----------------- | ----------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| **Indispensable** | Sans elle, un maillon de la boucle ou le socle multi-appareil casse.    | 1.1, 1.2, 1.6, 1.7, 1.8, 1.9, 1.10, 2.1, 2.6, 2.9, 2.11, 2.14, 3.1, 3.11, 5.14, 6.11, 7.9 |
| **Enchantement**  | Coût faible, différencie POuxis, ne rallonge pas le parcours principal. | 1.14 (barre de progression), 2.15 (limite de charge, en avertissement doux)               |
| **Juste après**   | Renforce la confiance ou la profondeur ; prévu en 0.2.                  | 1.11, 1.13, 1.15, 2.3, 2.4, 2.12, 3.5, 3.14, 3.15, 5.1, 5.11, 7.4, 7.10…                  |
| **Plus tard**     | Collaboration, IA générative, services tiers, canvas haute performance. | Modules 4 (en grande partie) et 6, 1.12, 2.10, 5.9…                                       |
| **Recherche**     | Faisabilité, éthique ou légalité non établies.                          | 5.7, 6.9, 7.1                                                                             |

### Ce qui est coupé du MVP, et pourquoi

| Coupé                                       | Raison                                                                                                                   |
| ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| Canvas infini (module 4)                    | Deuxième modèle mental (spatial) à apprendre ; la boucle n'en dépend pas. Le moteur de graphe avance en parallèle.       |
| Collaboration (module 6, sauf 6.11)         | Le MVP est solo (`PP5` en priorité basse). Le multi-utilisateur chiffré exige un partage de clés non trivial (6.7).      |
| IA générative (2.2 version LLM, 4.8, 6.12)  | Incompatible avec « aucune donnée en clair hors de l'appareil » sans modèle local. 2.2 démarre avec des gabarits locaux. |
| Recherche sémantique (3.2)                  | Exige un modèle d'embeddings embarqué (taille, batterie). La recherche lexicale suffit au MVP.                           |
| Parser vocal (2.7)                          | La transcription sur l'appareil n'est pas uniforme entre plateformes ; le nettoyage textuel est prêt, pas la dictée.     |
| Hyperfocus OS (1.11)                        | Aucune API publique sous Windows, iOS et macOS (§ 5) : livré en 0.2 avec des solutions de repli documentées.             |
| Fonctions de bien-être mesurées (7.3, 2.3)  | Risque `R4` : peuvent culpabiliser. Arrivent en 0.2/0.3, désactivées par défaut, après tests avec `PP4`.                 |
| Services tiers (1.12, 2.10, 5.9, 7.6 météo) | Appels réseau sortants, clés d'API, coûts récurrents : contraires au principe 2 au stade MVP.                            |

---

## 3. Les phases

Chaque phase a un **objectif**, des **critères de sortie** (tous requis) et des **métriques de
succès**. Les seuils sont des **cibles provisoires** fixées par l'équipe, à recalibrer avec les
données de recherche ; ce ne sont pas des références sectorielles. Conformément au plan
d'analytique locale ([`MVP_SPEC.md` § 6](./MVP_SPEC.md#6-plan-danalytique-locale)), aucune
métrique n'est collectée à distance : elles sont mesurées dans les cohortes de recherche
(consentement explicite) ou via des rapports locaux que la personne choisit de partager.

### MVP 0.1 — « La boucle »

**Objectif.** Une personne seule boucle Capturer → Planifier → Se concentrer → Faire le bilan
pendant deux semaines, sur un ordinateur et un téléphone synchronisés, sans connexion
obligatoire.

**Critères de sortie.**

- Tous les critères d'acceptation de [`MVP_SPEC.md`](./MVP_SPEC.md) passent, en tests
  automatisés pour la logique et en recette manuelle pour les parcours.
- Synchronisation chiffrée de bout en bout entre au moins un client de bureau (macOS, Windows ou
  Linux) et un client mobile (iOS ou Android, en bêta), avec convergence vérifiée après des
  modifications hors-ligne concurrentes.
- Audit d'accessibilité WCAG 2.2 AA des quatre parcours de la boucle, sans non-conformité bloquante.
- Interface complète en français et en anglais (aucune clé manquante, vérifiée par le typage).
- Export complet (6.11) réimportable sans perte (test aller-retour).
- Budgets de performance du `MVP_SPEC.md` § 5 tenus sur les appareils de référence.

**Métriques de succès (cohorte de recherche, journal de 14 jours).** Reprises du seuil de `R3` :
≥ 50 % des participant·es bouclent au moins 4 jours sur 7 en semaine 2 et font au moins 1 bilan
sur 2. Suivi complémentaire : délai médian capture → planification ; part des plans acceptés sans
modification (`R1`) ; taille de la boîte de réception à J7 et J14.

### 0.2 — « Confiance et profondeur »

**Objectif.** Rendre le plan digne de confiance (explications, zones protégées, maker schedule) et
approfondir chaque maillon (édition Markdown, liens, Kanban, Eisenhower), ajouter le premier
outil d'idéation, les coffres chiffrés et le client CLI.

**Critères de sortie.** Décision `R1` prise (routage par défaut ou en suggestion) et appliquée ;
1.11 disponible sur au moins macOS et Linux GNOME, avec repli documenté ailleurs ; coffres
chiffrés relus par une personne extérieure compétente en cryptographie ; CLI publiée avec sa
documentation ; thème E-Ink validé sur au moins une liseuse réelle.

**Métriques de succès.** Score de confiance moyen ≥ 5/7 (échelle de Jian, Bisantz & Drury,
2000, seuil de `R1`) ; routage encore actif à J14 chez ≥ 60 % de la cohorte (seuil de `R1`) ;
première contribution externe fusionnée sur le dépôt.

### 0.3 — « Penser en graphes »

**Objectif.** Ouvrir l'espace spatial : canvas (rendu Canvas 2D/SVG, sans WebGL à ce stade),
mise en page automatique, transmutation liste → arbre, organigramme temporel ; enrichir les
bilans (heatmap d'énergie, séries bienveillantes, culs-de-sac) ; recherche sémantique locale.

**Critères de sortie.** Canvas utilisable au clavier (WCAG 2.1.1) et avec une alternative textuelle
(4.15) ; 60 images/s à 1 000 nœuds sur l'ordinateur de référence ; modèle d'embeddings embarqué
optionnel, téléchargé à la demande et supprimable ; tests de concept `R6` (idéation) menés.

**Métriques de succès.** Résultats du test F5 et du Creativity Support Index (prévus dans
`USER_RESEARCH.md`, `R6`) ; part des sessions où le canvas est rouvert après la première
découverte.

### 1.0 — « Stable et publique »

**Objectif.** Version publique dans les magasins d'applications, avec compatibilité ascendante des
données garantie, extensibilité (webhooks, extensions) et performance canvas élevée.

**Critères de sortie.** Format de données et protocole de synchronisation versionnés et gelés
(migrations testées) ; revue de sécurité indépendante du chiffrement et du relais ; audit
d'accessibilité complet ; documentation utilisateur FR/EN ; builds signés pour les cinq
plateformes ; politique de confidentialité et conditions publiées (voir `docs/legal/` quand il
existera) ; procédure de signalement de vulnérabilités opérationnelle.

**Métriques de succès.** Rétention d'usage à 8 semaines dans les cohortes longitudinales (phase 5
du programme de recherche) ; taux de crash déclaré nul en bloquant sur les parcours de la boucle ;
délai de traitement des signalements de sécurité.

### 2.0+ — « Collaboration et écosystème »

**Objectif.** Petites équipes (`PP5`) : partage chiffré multi-utilisateur, commentaires, présence,
boîte de réception d'équipe, SSO, galerie de modèles, IA optionnelle (modèle local ou clé
fournie par la personne).

**Critères d'entrée.** 1.0 stable ; modèle de partage de clés multi-utilisateur conçu et relu ;
modèle de financement du relais hébergé décidé (auto-hébergement toujours possible).

### Recherche

Fonctions dont la faisabilité, l'éthique ou la légalité ne sont pas établies. Elles ne seront
planifiées qu'après une note d'analyse (gabarit [`FEATURE_TEMPLATE.md`](./FEATURE_TEMPLATE.md),
section « Vie privée et cadre juridique ») et, le cas échéant, un avis juridique.

---

## 4. Tableau des 100 fonctionnalités

**Légende.**

- **Phase** : `0.1` (MVP), `0.2`, `0.3`, `1.0`, `2.0+`, `Recherche`.
- **Complexité** : `S` (quelques jours), `M` (une à deux semaines), `L` (plusieurs semaines),
  `XL` (projet en soi, plusieurs mois ou chantier transverse). Estimations pour une personne,
  indicatives.
- **Dépendances** : identifiants de fonctions, ou socle (`store`, `relais`, `éditeur`, `canvas`,
  `LLM` = modèle de langage local ou fourni par la personne, `STT` = transcription vocale).
- **Plateforme** : contraintes détaillées au § 5. « Toutes » = iOS, Android, macOS, Windows, Linux.
- **Vie privée / juridique** : 🔒 données sensibles ou personnelles particulières ; ⚖️ cadre
  juridique spécifique à analyser ; 🌐 appel réseau ou service tiers. Détails au § 6.
- **Statut** : `Sprint 1 — en cours` (travail moteur `@pouxis/core` ou plateforme Tauri en cours ;
  l'interface suit au sprint 2), `Sprint 2 — prévu` (vues de l'application), `À planifier`,
  `Exploration`.

### Module 1 — Moteur temporel et calendrier

| ID   | Fonctionnalité                    | Phase | Cplx | Dépendances      | Plateforme                | Vie privée / jur.            | Statut              |
| ---- | --------------------------------- | ----- | ---- | ---------------- | ------------------------- | ---------------------------- | ------------------- |
| 1.1  | Routage dynamique des tâches      | 0.1   | L    | 1.6, 1.10, 2.1   | Toutes                    | —                            | Sprint 1 — en cours |
| 1.2  | Propagation des retards           | 0.1   | M    | 1.1              | Toutes                    | —                            | Sprint 1 — en cours |
| 1.3  | Heatmap d'énergie                 | 0.3   | M    | 2.6 (historique) | Toutes                    | 🔒 (inférence locale)        | Sprint 1 — en cours |
| 1.4  | Vue temporelle en spirale         | 2.0+  | L    | canvas           | Toutes ; a11y à concevoir | —                            | Exploration         |
| 1.5  | Multi-fuseaux des collaborateurs  | 2.0+  | M    | comptes, 6.7     | Toutes                    | 🔒 (disponibilités d'autrui) | À planifier         |
| 1.6  | Time-blocking avec buffers        | 0.1   | S    | —                | Toutes                    | —                            | Sprint 1 — en cours |
| 1.7  | Synchronisation CRDT              | 0.1   | XL   | 3.1, relais      | Toutes                    | 🔒 (E2EE requis)             | Sprint 1 — en cours |
| 1.8  | Analyseur de langage naturel      | 0.1   | L    | —                | Toutes                    | —                            | Sprint 1 — en cours |
| 1.9  | Snapshot prévu / réalisé          | 0.1   | M    | 1.1              | Toutes                    | —                            | Sprint 1 — en cours |
| 1.10 | Tâches flottantes                 | 0.1   | M    | 1.1              | Toutes                    | —                            | Sprint 1 — en cours |
| 1.11 | Hyperfocus « Ne pas déranger » OS | 0.2   | M    | 2.6              | Partielle (§ 5)           | —                            | Sprint 1 — en cours |
| 1.12 | Estimations de trajet             | 2.0+  | L    | 🌐 API trafic    | Toutes                    | 🔒 🌐 (localisation)         | À planifier         |
| 1.13 | Liens profonds d'événements       | 0.2   | S    | —                | Schéma d'URL par OS       | —                            | Sprint 1 — en cours |
| 1.14 | Barre de progression temporelle   | 0.1   | S    | —                | Toutes                    | —                            | Sprint 1 — en cours |
| 1.15 | Protection de la maker schedule   | 0.2   | M    | 1.1              | Toutes                    | —                            | Sprint 1 — en cours |

### Module 2 — Exécution et tâches

| ID   | Fonctionnalité                      | Phase | Cplx | Dépendances            | Plateforme                               | Vie privée / jur.                        | Statut              |
| ---- | ----------------------------------- | ----- | ---- | ---------------------- | ---------------------------------------- | ---------------------------------------- | ------------------- |
| 2.1  | Graphe de dépendances               | 0.1   | M    | —                      | Toutes                                   | —                                        | Sprint 1 — en cours |
| 2.2  | Décomposition en sous-tâches        | 0.2   | M    | gabarits ; LLM en 2.0+ | Toutes                                   | 🌐 si LLM distant                        | Sprint 1 — en cours |
| 2.3  | Usure des tâches (decay)            | 0.2   | S    | —                      | Toutes                                   | — (risque `R4`)                          | Sprint 1 — en cours |
| 2.4  | Matrice d'Eisenhower calculée       | 0.2   | S    | —                      | Toutes                                   | —                                        | Sprint 1 — en cours |
| 2.5  | Tags géolocalisés                   | 1.0   | L    | géorepérage natif      | Mobile surtout ; plugins natifs requis   | 🔒 ⚖️ (localisation)                     | À planifier         |
| 2.6  | Pomodoro intégré par tâche          | 0.1   | M    | —                      | Toutes                                   | —                                        | Sprint 1 — en cours |
| 2.7  | Parser vocal et auto-catégorisation | 0.3   | L    | 1.8, STT local         | STT natif hétérogène                     | 🔒 (voix)                                | Sprint 1 — en cours |
| 2.8  | Champs à formules                   | 0.3   | M    | —                      | Toutes                                   | —                                        | Sprint 1 — en cours |
| 2.9  | Récurrence cron / littérale         | 0.1   | L    | —                      | Toutes                                   | —                                        | Sprint 1 — en cours |
| 2.10 | Extraction de tâches depuis le mail | 2.0+  | L    | serveur de réception   | Serveur                                  | 🔒 🌐 ⚖️ (contenu de courriels en clair) | À planifier         |
| 2.11 | Raccourci de capture universelle    | 0.1   | M    | 1.8                    | Bureau ; mobile via widget/partage (0.3) | —                                        | Sprint 1 — en cours |
| 2.12 | Générateur de vues Kanban           | 0.2   | M    | —                      | Toutes                                   | —                                        | Sprint 1 — en cours |
| 2.13 | Délégation avec webhook             | 1.0   | M    | 6.1                    | Toutes                                   | 🌐 (données vers tiers)                  | À planifier         |
| 2.14 | Mode « Focus unique »               | 0.1   | S    | 2.6                    | Toutes                                   | —                                        | Sprint 2 — prévu    |
| 2.15 | Limiteur de charge (WIP)            | 0.1   | S    | —                      | Toutes                                   | — (risque `R4`)                          | Sprint 1 — en cours |

### Module 3 — Stockage, fichiers et multi-plateforme

| ID   | Fonctionnalité                     | Phase | Cplx | Dépendances                            | Plateforme                               | Vie privée / jur.              | Statut              |
| ---- | ---------------------------------- | ----- | ---- | -------------------------------------- | ---------------------------------------- | ------------------------------ | ------------------- |
| 3.1  | Architecture local-first           | 0.1   | XL   | `store`                                | Toutes                                   | —                              | Sprint 1 — en cours |
| 3.2  | Recherche sémantique               | 0.3   | L    | recherche lexicale (0.1), modèle local | Taille du modèle sur mobile              | —                              | Sprint 1 — en cours |
| 3.3  | Versioning par bloc                | 0.3   | L    | 1.7, éditeur                           | Toutes                                   | —                              | Sprint 1 — en cours |
| 3.4  | OCR côté client                    | 1.0   | L    | 3.2                                    | OCR natif hétérogène                     | —                              | À planifier         |
| 3.5  | Coffres chiffrés (E2EE)            | 0.2   | L    | crypto                                 | Toutes                                   | ⚖️ (export de crypto, § 6)     | Sprint 1 — en cours |
| 3.6  | Compression asymétrique des assets | 1.0   | M    | 1.7                                    | Toutes                                   | —                              | À planifier         |
| 3.7  | Aperçus universels (WASM)          | 2.0+  | XL   | —                                      | Toutes                                   | — (sécurité des parseurs)      | À planifier         |
| 3.8  | Indexation des disques locaux      | 1.0   | M    | 3.2                                    | Bureau uniquement (bacs à sable mobiles) | 🔒 (accès au disque)           | À planifier         |
| 3.9  | Nettoyage automatique (archivage)  | 0.3   | S    | 5.15                                   | Toutes                                   | —                              | Sprint 1 — en cours |
| 3.10 | Partage granulaire par lien        | 1.0   | L    | 3.5, relais                            | Toutes                                   | 🔒 ⚖️ (hébergement de contenu) | Sprint 1 — en cours |
| 3.11 | Synchronisation basse bande        | 0.1   | M    | 1.7                                    | Toutes                                   | —                              | Sprint 1 — en cours |
| 3.12 | Share sheets et glisser-déposer OS | 0.3   | M    | 2.11                                   | Extensions natives mobiles requises      | —                              | À planifier         |
| 3.13 | Métadonnées audio (BPM, ID3)       | 2.0+  | M    | 3.2                                    | Toutes                                   | —                              | À planifier         |
| 3.14 | Backlinks de fichiers              | 0.2   | M    | —                                      | Toutes                                   | —                              | Sprint 1 — en cours |
| 3.15 | Client CLI                         | 0.2   | M    | 6.11                                   | Bureau (Node ≥ 22.18)                    | —                              | Sprint 1 — en cours |

### Module 4 — Organigrammes, graphes et spatialisation

| ID   | Fonctionnalité                          | Phase | Cplx | Dépendances  | Plateforme                        | Vie privée / jur.               | Statut              |
| ---- | --------------------------------------- | ----- | ---- | ------------ | --------------------------------- | ------------------------------- | ------------------- |
| 4.1  | Canvas infini WebGL (10 000 nœuds)      | 1.0   | XL   | canvas (0.3) | GPU et WebView variables          | —                               | À planifier         |
| 4.2  | Layout force-directed                   | 0.3   | M    | —            | Toutes                            | —                               | Sprint 1 — en cours |
| 4.3  | Transmutation liste → arbre             | 0.3   | M    | 2.1          | Toutes                            | —                               | Sprint 1 — en cours |
| 4.4  | Nœuds enrichis (vidéo, code, iFrame)    | 2.0+  | L    | canvas       | Toutes                            | 🌐 (contenus tiers, CSP)        | À planifier         |
| 4.5  | Organigramme temporel                   | 0.3   | M    | 4.2          | Toutes                            | —                               | Sprint 1 — en cours |
| 4.6  | Stylet (Pencil API)                     | 2.0+  | L    | canvas       | iPad, Windows Ink, Android stylet | —                               | À planifier         |
| 4.7  | Logique conditionnelle des flux         | 1.0   | M    | 2.1          | Toutes                            | —                               | Sprint 1 — en cours |
| 4.8  | Génération de squelette par IA          | 2.0+  | L    | LLM          | Toutes                            | 🌐 si LLM distant               | À planifier         |
| 4.9  | Collapsibilité granulaire               | 0.3   | S    | —            | Toutes                            | —                               | Sprint 1 — en cours |
| 4.10 | Présentation à caméra dynamique         | 1.0   | M    | canvas       | Toutes                            | — (`prefers-reduced-motion`)    | À planifier         |
| 4.11 | Exportation multi-formats               | 0.3   | M    | —            | Toutes                            | —                               | Sprint 1 — en cours |
| 4.12 | Templates UML, BPMN, architecture cloud | 2.0+  | M    | canvas       | Toutes                            | ⚖️ (licences d'icônes, marques) | À planifier         |
| 4.13 | Minimap radar                           | 0.3   | S    | canvas       | Toutes                            | —                               | Sprint 1 — en cours |
| 4.14 | Multi-curseurs temps réel               | 2.0+  | L    | 1.7, comptes | Toutes                            | 🔒 (présence)                   | À planifier         |
| 4.15 | Extraction graphe → texte               | 0.3   | S    | —            | Toutes                            | —                               | Sprint 1 — en cours |

### Module 5 — Idéation et outils créatifs

| ID   | Fonctionnalité                        | Phase     | Cplx | Dépendances    | Plateforme                                | Vie privée / jur.                           | Statut              |
| ---- | ------------------------------------- | --------- | ---- | -------------- | ----------------------------------------- | ------------------------------------------- | ------------------- |
| 5.1  | Moteur de sérendipité                 | 0.2       | M    | 3.14           | Toutes                                    | —                                           | Sprint 1 — en cours |
| 5.2  | Moodboard paramétrique (palette)      | 0.3       | M    | éditeur        | Toutes                                    | —                                           | Sprint 1 — en cours |
| 5.3  | Machine à écrire stricte              | 0.3       | S    | éditeur        | Toutes                                    | — (sortie toujours possible, a11y)          | À planifier         |
| 5.4  | Générateur de contraintes divergentes | 0.2       | S    | —              | Toutes                                    | —                                           | Sprint 1 — en cours |
| 5.5  | Journal de friction                   | 0.2       | S    | —              | Toutes                                    | —                                           | À planifier         |
| 5.6  | Scrapbook flottant (overlay OS)       | 0.3       | L    | —              | Bureau uniquement                         | —                                           | Sprint 1 — en cours |
| 5.7  | Tagging d'intonation vocale           | Recherche | XL   | 2.7            | Toutes                                    | 🔒 ⚖️ (AI Act, reconnaissance des émotions) | Exploration         |
| 5.8  | Bac à sable jetable                   | 0.3       | S    | 3.2            | Toutes                                    | —                                           | À planifier         |
| 5.9  | Banques d'assets intégrées            | 2.0+      | M    | 🌐 API tierces | Toutes                                    | 🌐 ⚖️ (licences, clés d'API)                | À planifier         |
| 5.10 | Cartes de méthodes (SCAMPER…)         | 0.3       | S    | —              | Toutes                                    | ⚖️ (marques de certaines méthodes)          | Sprint 1 — en cours |
| 5.11 | Éditeur Markdown hybride              | 0.2       | L    | —              | Toutes                                    | —                                           | À planifier         |
| 5.12 | Prompts visuels en arrière-plan       | 2.0+      | M    | 5.9            | Toutes                                    | ⚖️ (droits des images)                      | À planifier         |
| 5.13 | Ambiance sonore générative            | 0.3       | S    | —              | Toutes (lecture en arrière-plan variable) | —                                           | À planifier         |
| 5.14 | Brain dump ultra-rapide               | 0.1       | M    | 2.11           | Toutes ; < 50 ms seulement app résidente  | —                                           | Sprint 2 — prévu    |
| 5.15 | Détecteur de culs-de-sac              | 0.3       | S    | —              | Toutes                                    | —                                           | Sprint 1 — en cours |

### Module 6 — Collaboration et écosystème

| ID   | Fonctionnalité                        | Phase     | Cplx | Dépendances               | Plateforme                      | Vie privée / jur.                             | Statut              |
| ---- | ------------------------------------- | --------- | ---- | ------------------------- | ------------------------------- | --------------------------------------------- | ------------------- |
| 6.1  | Webhooks sortants                     | 1.0       | M    | —                         | Toutes                          | 🌐 (données vers tiers, secrets)              | À planifier         |
| 6.2  | API publique GraphQL                  | 2.0+      | L    | serveur                   | Serveur                         | 🔒 (exige un serveur ayant accès aux données) | À planifier         |
| 6.3  | Commandes « / » extensibles (plugins) | 1.0       | XL   | éditeur                   | Toutes                          | 🔒 (isolation du code tiers)                  | À planifier         |
| 6.4  | Commentaires par blocs                | 2.0+      | L    | comptes, 6.7              | Toutes                          | —                                             | À planifier         |
| 6.5  | Audit trail immuable                  | 1.0       | M    | crypto                    | Toutes                          | ⚖️ (journal de données personnelles)          | Sprint 1 — en cours |
| 6.6  | Statuts vidéo asynchrones             | 2.0+      | L    | stockage d'assets         | Permissions caméra/écran par OS | 🔒 (image, voix)                              | À planifier         |
| 6.7  | Permissions par héritage              | 2.0+      | XL   | comptes, crypto           | Toutes                          | 🔒 (partage de clés)                          | À planifier         |
| 6.8  | Boîte de réception d'équipe           | 2.0+      | L    | 6.4                       | Toutes                          | —                                             | À planifier         |
| 6.9  | Graphe de connaissances social        | Recherche | L    | comptes                   | Toutes                          | 🔒 ⚖️ (profilage de salarié·es)               | Exploration         |
| 6.10 | Sondages et votes pondérés            | 2.0+      | M    | comptes                   | Toutes                          | —                                             | À planifier         |
| 6.11 | Exportation standardisée (.zip)       | 0.1       | M    | —                         | Toutes                          | — (portabilité, RGPD art. 20)                 | Sprint 1 — en cours |
| 6.12 | Mentions contextualisées par IA       | 2.0+      | L    | LLM, 6.4                  | Toutes                          | 🌐 si LLM distant                             | À planifier         |
| 6.13 | Canaux vocaux éphémères               | 2.0+      | XL   | infrastructure temps réel | Toutes                          | 🔒 🌐 (voix, serveur média)                   | À planifier         |
| 6.14 | SSO (SAML / OAuth2)                   | 2.0+      | L    | comptes                   | Toutes                          | —                                             | À planifier         |
| 6.15 | Modèles d'espaces communautaires      | 2.0+      | M    | 6.11                      | Toutes                          | ⚖️ (licences, modération)                     | À planifier         |

### Module 7 — Interfaces, bien-être et télémétrie personnelle

| ID   | Fonctionnalité                       | Phase                       | Cplx | Dépendances       | Plateforme                            | Vie privée / jur.       | Statut              |
| ---- | ------------------------------------ | --------------------------- | ---- | ----------------- | ------------------------------------- | ----------------------- | ------------------- |
| 7.1  | Moteur d'interface Rust/WASM         | Recherche                   | XL   | —                 | Toutes                                | —                       | Exploration         |
| 7.2  | Équilibre création / organisation    | 0.2                         | M    | 2.6               | Toutes                                | 🔒 (inférence locale)   | Sprint 1 — en cours |
| 7.3  | Séries sans culpabilisation          | 0.3                         | S    | 2.6               | Toutes                                | — (risque `R4`, opt-in) | Sprint 1 — en cours |
| 7.4  | UI auto-fading (interface zen)       | 0.2                         | S    | —                 | Pointeur ; sans effet au tactile      | — (WCAG, désactivable)  | Sprint 1 — en cours |
| 7.5  | Arbre de compétences fractal         | 1.0                         | M    | 2.6, 4.2          | Toutes                                | —                       | Sprint 1 — en cours |
| 7.6  | Palette selon soleil / météo         | 0.3 (soleil) ; 2.0+ (météo) | M    | fuseau ; 🌐 météo | Toutes                                | 🔒 🌐 (localisation)    | Sprint 1 — en cours |
| 7.7  | Retour haptique                      | 0.2                         | S    | —                 | Mobile ; iOS/Android uniquement       | —                       | Sprint 1 — en cours |
| 7.8  | Remapping clavier absolu (JSON, Vim) | 1.0                         | M    | 2.11              | Bureau ; raccourcis réservés par l'OS | —                       | À planifier         |
| 7.9  | Bilan hebdomadaire automatisé        | 0.1                         | M    | 1.9, 2.6          | Toutes                                | —                       | Sprint 1 — en cours |
| 7.10 | Thème E-Ink                          | 0.2                         | S    | tokens            | Toutes ; liseuses Android surtout     | —                       | Sprint 1 — en cours |

### Récapitulatif par phase

| Phase     | Nombre | Fonctionnalités                                                                                                                         |
| --------- | ------ | --------------------------------------------------------------------------------------------------------------------------------------- |
| 0.1       | 19     | 1.1, 1.2, 1.6, 1.7, 1.8, 1.9, 1.10, 1.14, 2.1, 2.6, 2.9, 2.11, 2.14, 2.15, 3.1, 3.11, 5.14, 6.11, 7.9                                   |
| 0.2       | 18     | 1.11, 1.13, 1.15, 2.2, 2.3, 2.4, 2.12, 3.5, 3.14, 3.15, 5.1, 5.4, 5.5, 5.11, 7.2, 7.4, 7.7, 7.10                                        |
| 0.3       | 23     | 1.3, 2.7, 2.8, 3.2, 3.3, 3.9, 3.12, 4.2, 4.3, 4.5, 4.9, 4.11, 4.13, 4.15, 5.2, 5.3, 5.6, 5.8, 5.10, 5.13, 5.15, 7.3, 7.6 (volet soleil) |
| 1.0       | 14     | 2.5, 2.13, 3.4, 3.6, 3.8, 3.10, 4.1, 4.7, 4.10, 6.1, 6.3, 6.5, 7.5, 7.8                                                                 |
| 2.0+      | 23     | 1.4, 1.5, 1.12, 2.10, 3.7, 3.13, 4.4, 4.6, 4.8, 4.12, 4.14, 5.9, 5.12, 6.2, 6.4, 6.6, 6.7, 6.8, 6.10, 6.12, 6.13, 6.14, 6.15            |
| Recherche | 3      | 5.7, 6.9, 7.1                                                                                                                           |

Total : 100. 7.6 est scindée : volet « soleil » (calcul local) en 0.3, volet « météo » (service
tiers) en 2.0+.

---

## 5. Contraintes de plateforme

| ID     | Contrainte                                                                                                                                                                                                                                                                                                                                                                                                                  | Conséquence produit                                                                                                                                                                                                                            |
| ------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1.11   | Pas d'API publique pour activer « Ne pas déranger » sous **Windows** (Focus Assist ; `FocusSessionManager` est une fonctionnalité à accès limité) ni sous **macOS**. **iOS** ne permet pas à une app d'activer un mode Concentration (seuls les filtres de concentration via App Intents existent). **Android** le permet via `NotificationManager.setInterruptionFilter` avec l'autorisation `ACCESS_NOTIFICATION_POLICY`. | macOS : raccourcis Shortcuts installés par la personne ; Linux GNOME : `gsettings` ; Android : plugin Kotlin à écrire ; Windows et iOS : mode silencieux interne à l'app et guide de configuration. Voir `apps/pouxis/src-tauri/src/focus.rs`. |
| 2.11   | Les raccourcis globaux n'existent que sur ordinateur.                                                                                                                                                                                                                                                                                                                                                                       | Mobile : bouton central de capture, puis widget et extension de partage (3.12).                                                                                                                                                                |
| 3.8    | Les bacs à sable iOS et Android interdisent l'indexation libre du système de fichiers.                                                                                                                                                                                                                                                                                                                                      | Bureau uniquement ; sur mobile, import explicite par sélecteur de fichiers.                                                                                                                                                                    |
| 3.12   | Les feuilles de partage exigent une extension native (Share Extension iOS en Swift, filtre d'intention Android).                                                                                                                                                                                                                                                                                                            | Code natif hors de la WebView ; chantier mobile dédié en 0.3.                                                                                                                                                                                  |
| 4.6    | La pression et l'inclinaison du stylet passent par les Pointer Events ; leur exposition dépend de la WebView et du matériel (Apple Pencil, Windows Ink, stylets Android).                                                                                                                                                                                                                                                   | Test matériel réel indispensable ; repli sur tracé sans pression.                                                                                                                                                                              |
| 5.6    | Une fenêtre flottante persistante au-dessus des autres applications n'est pas proposée par iOS ; sur Android elle requiert une autorisation spéciale et sort du périmètre visé.                                                                                                                                                                                                                                             | Bureau uniquement (macOS, Windows, Linux).                                                                                                                                                                                                     |
| 5.14   | Un délai < 50 ms n'est atteignable qu'avec l'application déjà résidente en mémoire ; un démarrage à froid est borné par l'OS.                                                                                                                                                                                                                                                                                               | Budget mesuré depuis l'app résidente (raccourci global) ; démarrage à froid à budget séparé (`MVP_SPEC.md` § 5).                                                                                                                               |
| 7.4    | Le fondu au repos du pointeur n'a pas d'équivalent tactile.                                                                                                                                                                                                                                                                                                                                                                 | Sans effet au tactile ; désactivable ; jamais pendant le focus clavier.                                                                                                                                                                        |
| 7.7    | L'haptique n'existe que sur mobile ; elle doit respecter les réglages système.                                                                                                                                                                                                                                                                                                                                              | iOS et Android uniquement ; désactivable.                                                                                                                                                                                                      |
| 7.8    | Certains raccourcis sont réservés par l'OS (par exemple `Cmd+Q`, `Alt+F4`) ou par les technologies d'assistance.                                                                                                                                                                                                                                                                                                            | Validation des conflits dans le fichier de configuration.                                                                                                                                                                                      |
| Toutes | La distribution sur l'App Store et le Google Play exige des comptes développeur payants et des revues de conformité.                                                                                                                                                                                                                                                                                                        | Bêtas (TestFlight, piste de test interne) jusqu'à 1.0.                                                                                                                                                                                         |

---

## 6. Signalements vie privée et juridiques

Ces signalements identifient **où une analyse juridique est nécessaire** ; ils ne constituent pas
un avis juridique. Les références de textes sont à vérifier par une personne qualifiée avant toute
décision, et seront détaillées dans `docs/legal/` lorsque ce dossier existera.

| ID                    | Signalement                                                                                                                                                                                                                                                                                                                                                                                                                                                                       | Position par défaut                                                                                                                                             |
| --------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 5.7                   | **Règlement européen sur l'IA (UE) 2024/1689.** Déduire une émotion de la voix relève de la notion de « système de reconnaissance des émotions ». Ces systèmes sont interdits sur le lieu de travail et dans les établissements d'enseignement (art. 5, § 1, point f, sauf raisons médicales ou de sécurité), classés à haut risque ailleurs (annexe III) et soumis à des obligations de transparence (art. 50). POuxis cible précisément des usages professionnels et étudiants. | Phase « Recherche ». Aucune implémentation sans avis juridique écrit. Alternative à explorer : tag manuel « haute énergie » posé par la personne.               |
| 2.5, 1.12, 7.6        | **Localisation.** Donnée personnelle (RGPD) ; le géorepérage en arrière-plan est une autorisation sensible sur iOS et Android et fait l'objet d'une revue par les magasins.                                                                                                                                                                                                                                                                                                       | Traitement exclusivement sur l'appareil ; coordonnées jamais synchronisées en clair ; 7.6 « soleil » calculé à partir du fuseau horaire, sans géolocalisation.  |
| 6.9                   | **Profilage de salarié·es.** Une cartographie des compétences dérivée de l'activité constitue un profilage (RGPD, art. 4 et 22 ; art. 88 pour le contexte d'emploi) ; en France, l'information préalable des salarié·es sur tout dispositif de collecte s'applique (Code du travail, art. L1222-4) ; un système d'IA d'évaluation des comportements au travail relève de l'annexe III du règlement IA.                                                                            | Phase « Recherche ». Si poursuivie : déclaratif uniquement (compétences saisies par la personne), jamais inféré, jamais visible par un tiers sans consentement. |
| 2.10, 6.2             | **Données en clair côté serveur.** Recevoir des courriels ou exposer une API distante impose un serveur qui lit les données : POuxis deviendrait responsable de traitement pour ces contenus.                                                                                                                                                                                                                                                                                     | Repoussé à 2.0+ ; préférer une API locale (CLI, 3.15) et un relais qui ne voit que du chiffré.                                                                  |
| 3.5, 3.10             | **Cryptographie.** Les règles d'exportation des biens à double usage (règlement (UE) 2021/821) et les obligations déclaratives des magasins d'applications sur le chiffrement s'appliquent à la distribution.                                                                                                                                                                                                                                                                     | Primitives standard uniquement ; déclarations à préparer avant 1.0.                                                                                             |
| 3.10                  | **Hébergement de contenus partagés.** Un lien public fait du relais un hébergeur (règlement (UE) 2022/2065 sur les services numériques) : mécanisme de signalement requis.                                                                                                                                                                                                                                                                                                        | Contenu chiffré, clé dans le fragment d'URL ; procédure de signalement avant 1.0.                                                                               |
| 4.12, 5.9, 5.10, 5.12 | **Propriété intellectuelle.** Icônes d'architecture cloud, banques d'images et noms de méthodes déposés (certaines méthodes de créativité sont des marques) ont leurs propres licences.                                                                                                                                                                                                                                                                                           | Vérifier chaque licence et marque avant intégration ; noms génériques si doute.                                                                                 |
| 6.5                   | **Journal d'audit.** Un journal immuable contient des données personnelles ; il doit rester compatible avec le droit à l'effacement.                                                                                                                                                                                                                                                                                                                                              | Journal local et chiffré ; effacement par destruction de clé (« crypto-shredding ») à évaluer.                                                                  |
| 6.11                  | **Portabilité.** Aligné avec le droit à la portabilité (RGPD, art. 20).                                                                                                                                                                                                                                                                                                                                                                                                           | Livré dès le MVP, format JSON documenté.                                                                                                                        |

---

## 7. Sprint en cours

**Sprint 1 — moteur et plateforme** (en cours). Modules `@pouxis/core` et shell Tauri :

| Chantier                                       | Fonctionnalités                           |
| ---------------------------------------------- | ----------------------------------------- |
| `nlp`                                          | 1.8, 2.7 (nettoyage textuel)              |
| `recurrence`                                   | 2.9                                       |
| `scheduler`                                    | 1.1, 1.2, 1.6, 1.9, 1.10, 1.14, 1.15      |
| `tasks`                                        | 2.1, 2.2, 2.3, 2.4, 2.6, 2.8, 2.12, 2.15  |
| `sync`                                         | 1.7, 3.1, 3.3, 3.11                       |
| `insights`                                     | 1.3, 3.9, 5.15, 7.2, 7.3, 7.5, 7.9        |
| `ideation`                                     | 5.1, 5.2, 5.4, 5.10                       |
| `search`                                       | 3.2, 3.14                                 |
| `graph`                                        | 4.2, 4.3, 4.5, 4.7, 4.9, 4.11, 4.13, 4.15 |
| `crypto`                                       | 3.5, 3.10, 6.5                            |
| CLI                                            | 3.15, 6.11                                |
| Relais de synchronisation (`apps/sync-server`) | socle de 1.7 et 3.11                      |
| Tauri                                          | 1.11, 1.13, 2.11, 5.6, 7.7                |
| Design system                                  | 7.4, 7.6, 7.10                            |

**Sprint 2 — vues de l'application** (prévu) : Aujourd'hui, Tâches, Calendrier, Idées, Canvas,
Bilans, Réglages, branchées sur le store local-first ; en priorité les parcours de la boucle
(`MVP_SPEC.md`), dont 2.14 et 5.14.

Avancer un moteur au-delà de sa phase (par exemple 4.7 ou 7.5) est accepté quand il est déjà
couvert par un module en cours : le coût marginal est faible et l'interface reste, elle, à sa
phase.

---

## 8. Gouvernance de la feuille de route

- **Proposer une fonctionnalité** : ouvrir une discussion avec le gabarit
  [`FEATURE_TEMPLATE.md`](./FEATURE_TEMPLATE.md). Une fonction hors des 100 du brief doit montrer
  quelle fonction existante elle remplace ou quel maillon de la boucle elle renforce.
- **Changer de phase** : nécessite une justification (donnée de recherche, contrainte technique
  ou juridique) consignée dans le journal ci-dessous.
- **Revue** : à chaque fin de sprint, mise à jour des statuts ; à chaque fin de phase de
  recherche, révision des priorités.

### Journal des décisions

| Date       | Décision                                                                                     | Raison                                                                                                                                  |
| ---------- | -------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-11-04 | Première version : MVP centré sur la boucle (19 fonctions).                                  | Hypothèse `R3` ; top 10 de `PERSONAS.md` § 7.                                                                                           |
| 2026-11-04 | 2.15 livré en avertissement doux, pas en blocage.                                            | Risque `R4` : un blocage de l'interface peut culpabiliser ou exclure.                                                                   |
| 2026-11-04 | 5.7 et 6.9 placés en « Recherche ».                                                          | Règlement IA (art. 5 et annexe III) et RGPD (profilage).                                                                                |
| 2026-11-04 | 7.1 reformulé en question de recherche : mesurer avant de réécrire l'interface en Rust/WASM. | L'interface React actuelle n'a pas encore de mesure de latence qui justifie une réécriture ; Rust est déjà présent dans le shell Tauri. |
| 2026-11-04 | 2.2 démarre par des gabarits locaux ; l'IA générative est optionnelle et vient en 2.0+.      | Principe 2 (aucune donnée en clair hors de l'appareil par défaut).                                                                      |

---

## 9. Documents liés

- Recherche : [`USER_RESEARCH.md`](../research/USER_RESEARCH.md) (risques `R1`–`R7`, seuils de
  décision), [`PERSONAS.md`](../research/PERSONAS.md) (proto-personas, top 10 hypothétique).
- Architecture : `docs/architecture/` (en cours de rédaction) ; contrats du domaine dans
  `packages/core/src/model.ts`.
- Sécurité : [`SECURITY_ARCHITECTURE.md`](../security/SECURITY_ARCHITECTURE.md),
  [`THREAT_MODEL.md`](../security/THREAT_MODEL.md).
- Exploitation : [`RELEASE_CHECKLIST.md`](../operations/RELEASE_CHECKLIST.md),
  [`VERSIONING.md`](../operations/VERSIONING.md), [`CI_CD.md`](../operations/CI_CD.md).
- Juridique : `docs/legal/` (en cours de rédaction).
- Produit : [`MVP_SPEC.md`](./MVP_SPEC.md), [`RISKS.md`](./RISKS.md),
  [`FEATURE_TEMPLATE.md`](./FEATURE_TEMPLATE.md).

### Références

- Hick, W. E. (1952). On the rate of gain of information. _Quarterly Journal of Experimental
  Psychology_, 4(1), 11–26.
- Hyman, R. (1953). Stimulus information as a determinant of reaction time. _Journal of
  Experimental Psychology_, 45(3), 188–196.
- Jian, J.-Y., Bisantz, A. M., & Drury, C. G. (2000). Foundations for an empirically determined
  scale of trust in automated systems. _International Journal of Cognitive Ergonomics_, 4(1),
  53–71.
- Scheibehenne, B., Greifeneder, R., & Todd, P. M. (2010). Can there ever be too many options? A
  meta-analytic review of choice overload. _Journal of Consumer Research_, 37(3), 409–425.
- Règlement (UE) 2024/1689 du 13 juin 2024 établissant des règles harmonisées concernant
  l'intelligence artificielle.
