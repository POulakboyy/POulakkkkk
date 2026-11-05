# 0002 — Convergence : HLC maison, LWW par champ et CRDT de blocs

- **Statut** : accepté
- **Date** : 2026-11-04
- **Décideurs** : équipe cœur POuxis
- **Liens** : `packages/core/src/sync/`, `docs/architecture/ARCHITECTURE.md` § 7, ADR 0004, ADR 0005

## Contexte et problème

Les fonctions 1.7 (sync CRDT hors-ligne), 3.3 (versioning par bloc) et 3.11 (sync basse bande
passante) exigent que des appareils modifiant les mêmes données hors ligne convergent sans
intervention, avec un historique restaurable par bloc, des échanges compacts et un relais qui ne
voit que du chiffré (ADR 0004). Le core doit rester sans dépendance (ADR 0005).

La quasi-totalité des données POuxis sont des **enregistrements à champs** (tâches, événements,
préférences) ; le texte long vit dans des **notes découpées en blocs** (paragraphes, titres,
cases à cocher). L'édition collaborative simultanée d'un même paragraphe n'est pas un usage du
MVP (une personne, plusieurs appareils).

## Facteurs de décision

- Simplicité de raisonnement et de test (propriétés de jointure vérifiables).
- Zéro dépendance, code auditable.
- Compatibilité avec un relais aveugle et le chiffrement par enveloppe.
- Taille des échanges sur réseau lent.
- Granularité de fusion adaptée aux données réelles.

## Options considérées

1. **Maison** : Hybrid Logical Clock (Kulkarni et al., 2014), registres LWW **par champ**,
   tombstones d'enregistrement, blocs = enregistrements ordonnés par index fractionnaires.
2. **Automerge** : CRDT JSON complet, cœur Rust compilé en WASM.
3. **Yjs** : CRDT de séquences optimisé pour l'édition de texte collaborative.

## Décision

**Option 1.** Chaque champ de chaque enregistrement est un registre LWW ordonné par HLC
(chaîne de largeur fixe : la comparaison de chaînes est l'ordre total) ; une suppression est un
tombstone qui l'emporte sur toute écriture ; un document est un ensemble de blocs, chacun étant
un enregistrement avec `pos` fractionnaire ; un bloc conserve l'historique de ses versions.

## Analyse des options

| Critère                         | Maison (HLC + LWW + blocs)                          | Automerge                        | Yjs                                            |
| ------------------------------- | --------------------------------------------------- | -------------------------------- | ---------------------------------------------- |
| Dépendances                     | Aucune                                              | Binaire WASM                     | Bibliothèque JS                                |
| Fusion de texte concurrente     | Dernière version du bloc gagne, historique conservé | Fusion caractère par caractère   | Fusion caractère par caractère, très optimisée |
| Modèle de données               | Correspond aux enregistrements du domaine           | Documents JSON génériques        | Types partagés (Y.Map, Y.Text…)                |
| Croissance des métadonnées      | Une HLC par champ + historique borné des blocs      | Historique complet (compactable) | Métadonnées par élément de séquence            |
| Intégration avec relais aveugle | Ops simples à chiffrer par lot                      | Possible (changements binaires)  | Possible (mises à jour binaires)               |
| Raisonnement et audit           | Petit, propriétés testables                         | Grand code base                  | Grand code base                                |

## Conséquences

- **Positives** : `apply` idempotent, commutatif et associatif ; codec compact par tables
  d'interning (3.11) ; outbox coalescée par champ ; aucune dépendance ; fusion fine (cocher une
  case pendant l'édition de son texte ailleurs fusionne).
- **Négatives** : deux éditions concurrentes **du même bloc** ne fusionnent pas
  caractère par caractère ; la plus récente gagne et l'autre reste dans l'historique du bloc.
  Les horloges physiques très décalées sont bornées par `maxDriftMs` (24 h par défaut).
- Les invariants métier (chevauchements, cycles de dépendances) sont vérifiés après fusion par le
  moteur, pas par le CRDT.

## Quand passer à Yjs ou Automerge

Réévaluer dès qu'**une** de ces conditions est vraie :

- la co-édition **simultanée** d'un même bloc par plusieurs personnes devient un usage visé
  (commentaires par blocs 6.4 en direct, multi-curseurs 4.14 sur du texte) ;
- les retours montrent des pertes perçues dues au « dernier gagnant » au niveau bloc, malgré
  l'historique ;
- un type de contenu exige une séquence fusionnable fine (listes longues réordonnées en
  concurrence, tableaux).

Dans ce cas, la piste préférée est d'utiliser un CRDT de texte **à l'intérieur du champ `text`
d'un bloc**, en conservant le modèle LWW pour les enregistrements : le changement reste local au
module `sync/blocks`, et les vues ne le voient pas (contrat `Store`).
