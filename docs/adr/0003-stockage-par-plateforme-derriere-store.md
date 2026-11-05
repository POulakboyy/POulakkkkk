# 0003 — Stockage local par plateforme, derrière l'interface `Store`

- **Statut** : accepté (implémentation provisoire en place, cible prévue)
- **Date** : 2026-11-04
- **Décideurs** : équipe cœur POuxis
- **Liens** : `apps/pouxis/src/store/`, `apps/cli/src/store/`, ADR 0002

## Contexte et problème

La fonction 3.1 (local-first) promet une latence de lecture nulle et un fonctionnement complet
hors ligne. Les plateformes offrent des moteurs de stockage différents : IndexedDB dans le
navigateur et les WebView, SQLite accessible depuis Rust dans le shell Tauri, fichiers dans
Node. Les vues ne doivent dépendre d'aucun d'eux.

## Facteurs de décision

- Lectures synchrones depuis l'interface (budget < 50 ms par interaction).
- Durabilité (pas de perte après fermeture brutale), quotas, éviction par l'OS.
- Une seule API pour toutes les vues ; implémentation remplaçable.
- Persistance des ops et des HLC de la réplique (ADR 0002), pas seulement de l'état.

## Options considérées

1. **Interface `Store` unique, moteur par plateforme** : mémoire + IndexedDB sur le web,
   SQLite via une commande Tauri sur le natif, fichier JSON pour la CLI.
2. **IndexedDB partout** (y compris dans les WebView natives).
3. **SQLite partout** via WASM (OPFS sur le web).

## Décision

**Option 1.** Le contrat est `Store` (`src/store/types.ts`) : lectures **synchrones** depuis un
état en mémoire (référentiellement stable tant que la collection ne change pas), écritures
appliquées immédiatement en mémoire puis persistées en arrière-plan, abonnement unique
(`subscribe`). L'état en mémoire est celui de la réplique CRDT ; la persistance stocke ses ops.

| Plateforme      | Moteur                                                                  | Statut        |
| --------------- | ----------------------------------------------------------------------- | ------------- |
| Toutes (actuel) | `memory.ts` : `Map` en mémoire + `localStorage` (`pouxis:v0`)           | 🚧 provisoire |
| Web             | IndexedDB (journal d'ops + instantanés)                                 | 🗓️            |
| Natif (Tauri)   | SQLite côté Rust, mode WAL, via commandes IPC dédiées                   | 🗓️            |
| CLI             | `$POUXIS_HOME/data.json`, écriture atomique, verrou, révision optimiste | ✅            |

## Conséquences

- **Positives** : les vues n'ont jamais à changer ; tests de vues sur un store mémoire ;
  chaque moteur peut être optimisé pour sa plateforme (SQLite natif évite les évictions de
  stockage des WebView mobiles).
- **Négatives** : deux implémentations de persistance à maintenir et à tester contre la même
  suite de conformité ; l'état complet doit tenir en mémoire (acceptable pour un usage
  personnel ; à surveiller pour les grosses bases, pièces jointes exclues de l'état).
- L'option 3 (SQLite WASM + OPFS) reste une alternative si IndexedDB pose des problèmes de
  performance ou de fiabilité mesurés.

## Plan

1. Brancher `Store` sur `sync.createReplica` (état = réplique, `ReplicaChange` → notification).
2. Adaptateur IndexedDB avec suite de conformité partagée.
3. Adaptateur SQLite natif derrière la même suite.
4. Migration unique depuis `localStorage` au premier lancement.
