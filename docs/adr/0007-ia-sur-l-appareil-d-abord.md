# 0007 — IA sur l'appareil d'abord, cloud sur consentement explicite

- **Statut** : accepté (principe) ; implémentations prévues
- **Date** : 2026-11-04
- **Décideurs** : équipe cœur POuxis
- **Liens** : `packages/core/src/search/hybrid.ts` (`Embedder`), `docs/security/THREAT_MODEL.md` § 3.10, ARCHITECTURE § 12.3

## Contexte et problème

Plusieurs fonctions s'appuient sur des modèles : recherche sémantique (3.2), OCR (3.4),
transcription vocale (2.7), décomposition (2.2), squelette de graphe (4.8), mentions résumées
(6.12). Les données concernées sont du contenu S2 (notes, tâches, voix). La promesse de POuxis
est la confidentialité et le fonctionnement hors ligne.

## Options considérées

1. **Sur l'appareil d'abord** ; cloud uniquement sur opt-in par fonction.
2. **Cloud par défaut** avec un fournisseur de LLM.
3. **Pas d'IA**.

## Décision

**Option 1.**

- Les fonctions sont conçues pour **fonctionner sans modèle** : la recherche hybride retombe
  exactement sur la recherche lexicale sans `Embedder` ; la décomposition (2.2) a une heuristique
  et des modèles de sous-tâches dans `tasks/decompose`.
- Les modèles locaux sont des **plug-ins** derrière des interfaces du core (`Embedder`, à venir :
  `Transcriber`, `Ocr`, `TextModel`), fournis par l'app selon la plateforme : ONNX Runtime Web
  (WebGPU, repli WASM) pour les embeddings, API natives d'OCR quand elles existent, whisper.cpp en
  sidecar Tauri sur bureau.
- Un appel cloud n'a lieu qu'après **consentement explicite par fonction**, avec clé fournie par
  la personne, aperçu des données envoyées, et jamais pour un coffre chiffré (3.5).
- Le contenu fourni à un modèle est traité comme **non fiable** : les sorties sont des
  propositions à valider, jamais des actions automatiques (injection de prompt, THREAT_MODEL § 3.10).

## Conséquences

- **Positives** : vie privée par défaut, hors ligne, aucun coût d'inférence serveur.
- **Négatives** : qualité limitée par la taille des modèles locaux ; téléchargement de modèles
  (taille, stockage, mise à jour) ; disparités matérielles fortes, surtout sur mobile.
- Les fonctions dont la légalité n'est pas établie (5.7 reconnaissance d'émotions dans la voix,
  règlement (UE) 2024/1689) restent en phase « Recherche » quelle que soit l'option technique.
