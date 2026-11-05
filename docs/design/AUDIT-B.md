# Audit B — accessibilité et design : Toile, Idées, Bilan, Réglages, barre de commande, introduction

**Référentiel :** WCAG 2.2 niveau AA, plus les règles du dépôt (cibles tactiles ≥ 44 px, animations
limitées à `transform`/`opacity` et compatibles `prefers-reduced-motion`).
**Date :** 5 novembre 2026 · **Périmètre :** `views/canvas`, `views/ideas`, `views/insights`,
`views/settings`, `features/command`, `features/onboarding` et leurs fichiers i18n.
L'audit A (agent voisin) couvre Aujourd'hui, Tâches, Calendrier, Focus, `src/ui` et `src/design`.

## 1. Méthode

| Étape                  | Outil                                                                   | Couverture                                                                                                                                                                                                 |
| ---------------------- | ----------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Captures               | Playwright + Chromium, `reducedMotion: 'reduce'`, locale `fr-FR`        | 15 états × 1440×900 et 390×844 × clair et sombre (60 captures) : Toile, Idées (Notes, Atelier, Journal, Bac à sable), Bilan, Réglages, barre de commande (capture et palette `/`), introduction (4 écrans) |
| Sonde DOM automatique  | script maison exécuté dans la page                                      | taille de chaque élément interactif visible, présence d'un nom accessible, contraste de chaque nœud texte contre son fond composé (alpha compris)                                                          |
| Contraste hors DOM     | calcul WCAG sur les jetons (`tokens.css`, `engine/theme.ts`)            | texte dessiné dans le `<canvas>` de la Toile, indicateurs de focus                                                                                                                                         |
| Palette des graphiques | `validate_palette.js` (skill dataviz), `--pairs all`, clair puis sombre | séries du graphique Création / organisation                                                                                                                                                                |
| Clavier                | scripts Playwright                                                      | navigation au clavier dans la Toile et annonce vocale, piège de focus et restitution du focus dans la barre de commande, groupe de choix de l'introduction                                                 |
| Reflow                 | viewport 320×640 (équivalent 400 % sur 1280 px)                         | débordement horizontal de chaque vue                                                                                                                                                                       |

Limites : pas de test avec un lecteur d'écran réel (VoiceOver, NVDA, TalkBack). Les annonces ont
été vérifiées via le contenu des régions `aria-live`, pas à l'oreille. La sonde automatique ne voit
pas le texte dessiné dans un `<canvas>` ; il a été calculé à partir des jetons.

## 2. Synthèse

|                                        | Critique | Majeur | Mineur |
| -------------------------------------- | -------- | ------ | ------ |
| Trouvés                                | 1        | 8      | 11     |
| Corrigés dans ce lot                   | 1        | 8      | 8      |
| Ouverts (hors périmètre ou à arbitrer) | 0        | 0      | 3      |

Aucun nom accessible manquant ni contraste de texte insuffisant n'a été détecté par la sonde dans
les vues du périmètre (les trois alertes relevées sur les captures de la barre de commande
concernent la vue Aujourd'hui assombrie derrière le voile, et un champ dont le texte est
volontairement transparent pour laisser voir la surbrillance des jetons : faux positifs).

## 3. Constats et corrections

### Perceptible

| #   | Constat                                                                                                                                                                                                                                                                                                       | Critère                        | Gravité                                                                 | Correction                                                                                                                                                                                                        |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------ | ----------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| P1  | Toile : le texte des nœuds verrouillés était dessiné avec une opacité de 0,6, soit **4,47:1** en clair (sous 4,5:1) et nettement moins pour un libellé gris.                                                                                                                                                  | 1.4.3                          | Majeur                                                                  | Seule la boîte s'efface ; le libellé est dessiné à pleine opacité en `--ink-2` (8,67:1 en clair, 8,43:1 en sombre). `engine/render.ts`                                                                            |
| P2  | Bilan : dans le graphique Création / organisation, « Réunions » (`--viz-7`, violet) et « Création » (`--viz-1`, bleu) sont adjacents dès qu'une journée n'a pas d'organisation. En sombre, l'écart perçu tombe à **ΔE 1,9** en protanopie (valeur limite visée : 8) et 9,8 en vision normale (plancher : 15). | 1.4.1, 1.4.11                  | **Critique** pour les personnes concernées : deux séries indiscernables | « Réunions » passe sur `--viz-3` (vert). Validation sur toutes les paires : pire écart protan/deutan **ΔE 9,4** en clair comme en sombre, vision normale ≥ 20,9. Légende et tableau inchangés. `BalanceChart.tsx` |
| P3  | Bilan : la jauge « Justesse du plan » n'avait aucune graduation lisible ; seul le texte au-dessus donnait le sens.                                                                                                                                                                                            | 1.3.1 (bonne pratique dataviz) | Mineur                                                                  | Axe visible « plus court · prévu · plus long » sous la jauge (masqué aux lecteurs d'écran, la phrase dit déjà la valeur). `WeeklyReview.tsx`                                                                      |
| P4  | Bac à sable : l'indicateur de focus (bordure couleur d'accent) n'atteignait que **2,23:1** sur le papier.                                                                                                                                                                                                     | 1.4.11                         | Majeur                                                                  | Bordure pleine en `--focus-ring` (5,77:1). `Sandbox.module.css`                                                                                                                                                   |
| P5  | Introduction, étape 4 à 390×844 : le bouton « Ouvrir ma journée » sortait de l'écran.                                                                                                                                                                                                                         | 1.4.10                         | Majeur                                                                  | Pied d'actions collant en bas sur téléphone, avec fondu vers le fond. `Onboarding.module.css`                                                                                                                     |
| P6  | Introduction à 320 px : l'en-tête débordait de 7 px (libellé « Passer l'introduction » non sécable).                                                                                                                                                                                                          | 1.4.10                         | Mineur                                                                  | Grille `minmax(0, 1fr)`, le libellé peut passer sur deux lignes.                                                                                                                                                  |

### Utilisable

| #   | Constat                                                                                                                                                                                     | Critère                                                 | Gravité | Correction                                                                                                                                                                                       |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| U1  | Toile : les flèches déplacent bien la sélection d'un nœud à l'autre, mais rien n'était annoncé (`role="application"`) : un utilisateur de lecteur d'écran naviguait à l'aveugle.            | 4.1.3, 2.1.1                                            | Majeur  | Région `aria-live="polite"` qui lit le nœud atteint : libellé, « terminée », « verrouillée », éléments repliés ; plusieurs nœuds sont comptés. `a11y.ts` (testé), `Workspace.tsx`                |
| U2  | Toile : avec un nœud sélectionné, Tab ajoute un enfant ; la manière de sortir de la toile n'était documentée nulle part.                                                                    | 2.1.2                                                   | Majeur  | L'aide clavier (liée par `aria-describedby`) précise désormais « Échap : désélectionner, puis Tab pour quitter la toile » et signale la vue Plan comme alternative en liste. Vérifié au clavier. |
| U3  | Introduction : le groupe « À quel moment êtes-vous le plus vif ? » (`role="radiogroup"`) exigeait une tabulation par option et ignorait les flèches, contrairement au modèle radio attendu. | 2.1.1, 4.1.2                                            | Majeur  | Un seul arrêt de tabulation (tabindex itinérant) ; les flèches déplacent et sélectionnent. Test ajouté.                                                                                          |
| U4  | Réglages : les liens de la table des matières mesuraient 36 px de haut, et rien n'indiquait la section en cours de lecture.                                                                 | 2.5.8 (règle projet 44 px), 2.4.8 (AAA, bonne pratique) | Mineur  | Hauteur `--tap-min` ; `aria-current="location"` sur la section visible (IntersectionObserver), avec un état visuel discret. Test ajouté.                                                         |
| U5  | Barre de commande : bouton d'envoi de 40×40 px.                                                                                                                                             | règle projet 44 px                                      | Mineur  | Taille `--tap-min`.                                                                                                                                                                              |
| U6  | Introduction : le curseur clignotant de l'exemple clignotait indéfiniment.                                                                                                                  | 2.2.2                                                   | Mineur  | S'arrête après 8 cycles (moins de 4 s).                                                                                                                                                          |

### Compréhensible et robuste

| #   | Constat                                                                                                                                    | Critère   | Gravité | Correction                                                                                     |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------ | --------- | ------- | ---------------------------------------------------------------------------------------------- |
| C1  | Introduction : la liste des points de progression portait un `aria-label` mais contenait quatre éléments vides, lus « liste, 4 éléments ». | 1.3.1     | Mineur  | Points décoratifs (`aria-hidden`) ; l'information est déjà donnée par « Étape n sur 4 ».       |
| C2  | Notes : « Choisissez une note à gauche » repose sur une position à l'écran.                                                                | 1.3.3     | Mineur  | « Choisissez une note dans la liste, ou créez-en une. » (EN : « Pick a note from the list… »). |
| C3  | Barre de commande : dans le pied, « / pour les commandes » n'utilisait pas la touche stylée comme les autres raccourcis.                   | cohérence | Mineur  | Rendu avec `<Kbd keys="/">`.                                                                   |

### Ouverts

| #   | Constat                                                                                                                                                                                                                                                                                           | Pourquoi ouvert                                                                             |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| O1  | Plusieurs primitives (`Pill`, `SegmentedControl`, `Button size="sm"`) mesurent visuellement 32 à 40 px. Elles étendent toutes leur zone de toucher à 44 px par un pseudo-élément, ce qui satisfait 2.5.8 et la règle du dépôt ; la sonde les signale quand même car elle mesure la boîte visible. | Comportement voulu des primitives (`src/ui`, hors périmètre).                               |
| O2  | Toile sur téléphone : à l'ouverture, une partie des nœuds est hors champ et le texte est petit, car la vue privilégie un zoom lisible plutôt que « tout afficher ». La touche 0 et le bouton « Tout afficher » restent disponibles, et la vue Plan offre une lecture en liste.                    | Arbitrage produit lisibilité contre vue d'ensemble ; à valider avec des tests utilisateurs. |
| O3  | Les champs `type="time"` affichent « 09:00 AM » dans Chromium sans interface en français : le format suit la langue du système, pas celle de l'application.                                                                                                                                       | Comportement du navigateur ; les shells natifs Tauri suivent la langue du système.          |

### Contre-vérification

Une seconde passe indépendante a relevé deux défauts supplémentaires, corrigés :

| #   | Constat                                                                                                                                                                                                                                                                          | Critère       | Gravité | Correction                                                                                                                                                                           |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| V1  | Réglages › Clavier : l'action « Vider sa tête » (raccourci Alt+D, ajouté depuis au clavier global) n'avait pas de libellé ; le tableau affichait la clé brute `settings.keyboard.actions.ideasBrainDump`, dont la longueur insécable faisait déborder la page de 84 px à 320 px. | 1.3.1, 1.4.10 | Majeur  | Libellé ajouté en français et en anglais, et test qui vérifie qu'à chaque action du clavier correspond un libellé dans les deux langues.                                             |
| V2  | Toile : sans sélection préalable, les flèches ne faisaient que déplacer la vue ; au clavier seul, il était impossible d'atteindre un nœud existant (seule la création restait possible).                                                                                         | 2.1.1         | Majeur  | Sans sélection, une flèche sélectionne le nœud le plus proche du centre de la vue (annoncé) ; Maj + flèches déplace la vue. Aide clavier mise à jour, fonction `nearestNode` testée. |

## 4. Contrastes vérifiés

| Élément                                   | Avant-plan                    | Fond                      | Rapport                     | Exigé        | Résultat                              |
| ----------------------------------------- | ----------------------------- | ------------------------- | --------------------------- | ------------ | ------------------------------------- |
| Libellé de nœud verrouillé (clair)        | `--ink-2` #4f4b44             | surface #ffffff           | 8,67:1                      | 4,5:1        | ✅ (avant : 4,47:1 ❌)                |
| Libellé de nœud verrouillé (sombre)       | `--ink-2` #bdb8ad             | surface #1f1e1c           | 8,43:1                      | 4,5:1        | ✅                                    |
| Focus du Bac à sable                      | `--focus-ring` #344ce5        | fond #f6f4ef              | 5,77:1                      | 3:1          | ✅ (avant : accent, 2,03 à 2,23:1 ❌) |
| Séries Création / organisation / réunions | `--viz-1/2/3`                 | surfaces claire et sombre | ≥ 3:1 chacune               | 3:1          | ✅ (validateur)                       |
| Texte des vues du périmètre (sonde)       | tous les nœuds texte visibles | fond composé              | aucune valeur sous le seuil | 4,5:1 ou 3:1 | ✅                                    |

## 5. Clavier

| Zone                          | Tab                                                                            | Entrée / Espace                                      | Échap                                                            | Flèches                                                                                                                               |
| ----------------------------- | ------------------------------------------------------------------------------ | ---------------------------------------------------- | ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| Toile (`role="application"`)  | entre, puis ajoute un enfant si un nœud est sélectionné                        | Entrée : nœud voisin ou nouveau nœud ; F2 : modifier | annule le geste et désélectionne ; Tab ressort alors de la toile | sans sélection : nœud le plus proche du centre ; puis nœud voisin dans la direction (annoncé) ; Maj + flèches : déplacement de la vue |
| Vue Plan de la Toile          | parcours des lignes                                                            | renommer, terminer                                   | —                                                                | —                                                                                                                                     |
| Barre de commande             | focus piégé dans la boîte (12 tabulations testées)                             | valider ; Maj+Entrée : nouvelle ligne                | ferme et rend le focus à l'élément d'origine (vérifié)           | parcours des résultats                                                                                                                |
| Introduction, choix du rythme | un seul arrêt                                                                  | sélectionne                                          | —                                                                | déplacent et sélectionnent (boucle)                                                                                                   |
| Bilan, graphiques             | carte de chaleur et colonnes focalisables, lecture dans une région `aria-live` | bouton « Afficher en tableau » (`aria-pressed`)      | —                                                                | —                                                                                                                                     |

Mouvement réduit : toutes les animations des fichiers du périmètre passent par les jetons
`--dur-*`, ramenés à 0 ms sous `prefers-reduced-motion` ; aucune transition de propriété de mise
en page n'a été trouvée.

## 6. Graphiques du Bilan

- **Forme.** Les choix tiennent : chiffres clés en tuiles, carte de chaleur pour l'énergie par
  jour et par heure (gradation à une seule teinte), barre empilée et colonnes pour la répartition,
  série de pastilles pour la régularité, arbre étiqueté pour les compétences.
- **Alternatives textuelles.** Chaque graphique a une phrase de synthèse en nom accessible ; la
  carte de chaleur, la répartition et l'arbre ont une vue tableau ; chaque jour de la série porte
  un libellé masqué visuellement. La légende de la série est masquée aux lecteurs d'écran, ce qui
  est correct puisque chaque pastille se décrit elle-même.
- **Couleur.** La palette a été recalculée sur toutes les paires (constat P2). L'identité n'est
  jamais portée par la couleur seule : légende, pourcentages et tableau accompagnent les barres.
- **Mise en page.** Le bouton « Afficher en tableau » passait sous le texte d'introduction, collé
  au bord gauche, dans les cartes étroites. Il reste désormais en haut à droite, aligné sur le bord
  de la carte. Sur téléphone, la marge intérieure des cartes passe de 32 à 24 px : l'ancienne
  occupait un cinquième de la largeur.

## 7. Critique de design

Références du brief : Claude (calme, typographie), Klarna (clarté), Apple Music iOS (feuilles,
hiérarchie), Tiimo (douceur), Airbnb (cartes), Instagram et Spark (gestes, tri rapide).

| Vue               | Ce qui fonctionne                                                                                                                        | Améliorations                                                                                                                                                                                            |
| ----------------- | ---------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Toile             | Fond pointillé discret, liens courbes, verrous lisibles, barre d'outils flottante et mini-carte façon outil créatif sérieux.             | Nœuds verrouillés plus lisibles (P1). Sur téléphone, deux rangées de commandes en haut prennent de la hauteur : à regrouper derrière « … » (piste, non faite).                                           |
| Idées             | En-tête éditorial (titre serif, sous-titre court), onglets clairs, Atelier en cartes comme Airbnb.                                       | Dans l'Atelier, deux boutons couleur d'accent se font concurrence sur le même écran (« Rapprocher deux idées », « Tirer une contrainte ») : à arbitrer, garder l'accent pour une seule action par écran. |
| Bilan             | Ton sans jugement, mention « Calculé sur cet appareil », chiffres serif lisibles.                                                        | Axe de la jauge (P3), palette (P2), alignement des en-têtes de cartes (§ 6).                                                                                                                             |
| Réglages          | Page unique façon Réglages iOS, aperçus de thème visuels.                                                                                | Section en cours signalée (U4).                                                                                                                                                                          |
| Barre de commande | Surbrillance en direct de la date, de l'heure et des étiquettes, aperçu de l'objet créé : le meilleur moment « Spark » de l'application. | Cohérence des raccourcis (C3).                                                                                                                                                                           |
| Introduction      | Quatre écrans, une idée par écran, tout est passable, autorisations demandées avec une raison et sans pression.                          | Courte et calme, conforme au brief ; corrections P5, P6, U3, U6, C1.                                                                                                                                     |

## 8. Fichiers modifiés

`views/canvas/a11y.ts` (nouveau) et `a11y.test.ts` (nouveau), `views/canvas/Workspace.tsx`,
`views/canvas/engine/render.ts`, `views/insights/BalanceChart.tsx`, `WeeklyReview.tsx`,
`Insights.module.css`, `views/settings/index.tsx`, `Settings.module.css`, `settings.test.tsx`,
`views/ideas/sandbox/Sandbox.module.css`, `features/command/CommandBar.tsx`,
`CommandBar.module.css`, `features/onboarding/Onboarding.tsx`, `Onboarding.module.css`,
`Onboarding.test.tsx`, `i18n/{fr,en}/{canvas,ideas,insights,command,settings}.ts`.
