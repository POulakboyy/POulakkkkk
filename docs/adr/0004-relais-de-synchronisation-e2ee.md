# 0004 — Serveur de synchronisation : relais aveugle chiffré de bout en bout

- **Statut** : accepté
- **Date** : 2026-11-04
- **Décideurs** : équipe cœur POuxis
- **Liens** : `apps/sync-server/`, `packages/core/src/sync/protocol.ts`, `packages/core/src/crypto/payload.ts`, `docs/security/SECURITY_ARCHITECTURE.md`, `docs/security/THREAT_MODEL.md` § 3.3

## Contexte et problème

Les appareils d'une même personne doivent converger (1.7) sans connexion directe entre eux
(NAT, mobiles en arrière-plan). POuxis promet que personne d'autre, y compris l'opérateur du
serveur, ne peut lire le contenu. Le serveur doit être auto-hébergeable simplement.

## Facteurs de décision

- Confidentialité du contenu face à l'opérateur et en cas de fuite du serveur.
- Simplicité d'exploitation (un conteneur, un volume).
- Fiabilité : ordre, durabilité, reprise après coupure.
- Minimisation des métadonnées.

## Options considérées

1. **Relais aveugle** : journal append-only par espace d'enveloppes chiffrées, le serveur ne fait
   qu'ordonner, stocker et diffuser.
2. **Serveur applicatif** qui déchiffre, fusionne et sert une API (type backend SaaS).
3. **Pair à pair** (WebRTC ou réseau local) sans serveur.

## Décision

**Option 1.** Le relais (`apps/sync-server`) accepte des enveloppes `{id, hlc, node, payload}`,
attribue un `seq` dense par espace, persiste dans un journal JSONL (`fdatasync` configurable,
récupération d'une dernière ligne tronquée), diffuse aux sessions vivantes et sert le rattrapage
depuis un curseur. `payload` est chiffré par le client (`crypto.encryptPayload`, AES-256-GCM,
AAD = espace, id, HLC, nœud, bourrage Padmé). L'accès est contrôlé par des jetons d'espace
HMAC-SHA256 vérifiés en temps constant avant tout parsing, avec rotation des secrets.

## Analyse

| Critère                                   | Relais aveugle                   | Serveur applicatif          | Pair à pair                       |
| ----------------------------------------- | -------------------------------- | --------------------------- | --------------------------------- |
| Confidentialité                           | Contenu illisible par le serveur | Serveur de confiance        | Bonne, mais signalisation requise |
| Exploitation                              | Très simple                      | Base de données, migrations | Pas de serveur… sauf STUN/TURN    |
| Appareils rarement en ligne en même temps | Le journal fait tampon           | Oui                         | Échec fréquent                    |
| Fonctions serveur (recherche, webhooks)   | Impossibles dans le relais       | Faciles                     | Impossibles                       |

## Conséquences

- **Positives** : une fuite du serveur n'expose que des métadonnées S1 (id, HLC, nœud, taille
  arrondie, heure) ; un relais tiers ou communautaire est utilisable sans confiance ; un seul
  conteneur Docker suffit.
- **Négatives** : aucune fonction serveur ne peut lire les données ; webhooks (6.1), GraphQL
  (6.2) et ingestion d'e-mails (2.10) exigent un **compagnon optionnel** qui détient une clé de
  l'espace (ARCHITECTURE § 12.2), consciemment hors de la garantie E2EE.
- Les métadonnées résiduelles (rythme d'activité, nombre d'appareils) sont visibles : rétention
  courte des journaux serveur, bourrage des tailles.
- La perte de toutes les clés d'un espace rend les données du relais irrécupérables : clé de
  récupération imprimable (`crypto/recovery`) et export local (6.11).
- La compaction du journal (instantané chiffré produit par un client, puis troncature) est à
  concevoir.

## Compatibilité

Le protocole est versionné par chemin (`/v1/sync`) ; `core/sync/protocol.ts` et
`sync-server/src/protocol.ts` sont deux implémentations du même contrat, testées des deux côtés.
