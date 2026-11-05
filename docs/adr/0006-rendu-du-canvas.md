# 0006 — Chemin de rendu du canvas infini

- **Statut** : proposé
- **Date** : 2026-11-04
- **Décideurs** : équipe cœur POuxis, design
- **Liens** : `packages/core/src/graph/`, `apps/pouxis/src/views/canvas/`, ARCHITECTURE § 12.4

## Contexte et problème

Le module 4 vise un canvas infini fluide (4.1 : objectif de 10 000 nœuds à 120 i/s sur écrans à
haute fréquence, 60 i/s ailleurs), avec layout force-directed (4.2), minimap (4.13), stylet (4.6),
présentation (4.10) et export SVG/PNG/PDF (4.11). Il doit rester accessible (WCAG 2.2 AA) et
fonctionner sur cinq moteurs de WebView différents (ADR 0001).

## Options considérées

1. **SVG/DOM uniquement**.
2. **Canvas 2D**.
3. **WebGL 2**, puis **WebGPU** quand il est disponible dans les WebView cibles.
4. **Hybride** : DOM/SVG sous un seuil de nœuds visibles, GPU au-delà, géométrie et index
   spatial communs dans le core.

## Décision proposée

**Option 4.** Le core fournit la géométrie, le quadtree (culling par viewport et hit test
logarithmique), la simulation de forces pas à pas et les layouts ; le renderer ne fait que
dessiner les nœuds visibles. Le premier renderer est SVG/DOM (accessibilité native, export SVG
direct). Un renderer WebGL 2 est ajouté derrière la même interface quand une mesure sur appareil
de référence montre que le budget de trame est dépassé ; WebGPU est une optimisation ultérieure,
jamais une exigence. Dans tous les cas, un **arbre d'accessibilité DOM** (liste navigable des
nœuds visibles et de leurs liens) double le rendu GPU, et l'extraction graphe → texte (4.15)
fournit l'alternative textuelle.

## Conséquences

- **Positives** : livrable tôt, accessible ; montée en charge sans changer le modèle ni le core ;
  simulation déplaçable en worker.
- **Négatives** : deux renderers à maintenir ; parité visuelle à tester ; les nœuds enrichis (4.4 :
  vidéo, code, iFrame) restent en DOM superposé même en mode GPU.
- L'objectif 10 000 nœuds / 120 i/s est une **cible**, à valider par un banc de mesure ; il ne
  doit pas être annoncé avant mesure.
