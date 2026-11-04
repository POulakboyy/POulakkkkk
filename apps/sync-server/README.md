# Relais de synchronisation POuxis

`@pouxis/sync-server` est le relais qui permet à vos appareils POuxis (iOS, Android, macOS,
Windows, Linux) d'échanger leurs modifications. Il est volontairement **simple et aveugle** :
il **ordonne** et **diffuse** des enveloppes opaques, sans jamais les interpréter. Les données
restent sur vos appareils ; le relais n'en garde qu'un journal chiffré côté client, qu'un
appareil peut rejouer pour rattraper son retard.

- Node.js ≥ 22.18 exécute directement les sources TypeScript (pas d'étape de compilation).
- Une seule dépendance d'exécution : [`ws`](https://github.com/websockets/ws).
- Licence : AGPL-3.0-or-later.

## Sommaire

1. [Architecture](#architecture)
2. [Protocole](#protocole)
3. [Jetons d'accès](#jetons-daccès)
4. [Ce que le serveur voit — et ne voit pas](#ce-que-le-serveur-voit--et-ne-voit-pas)
5. [Configuration](#configuration)
6. [Déploiement](#déploiement)
7. [Exploitation](#exploitation)
8. [Développement](#développement)

## Architecture

```
  appareil A ─┐                      ┌──────────────────────────────────────┐
              │  WebSocket /v1/sync  │  server.ts   HTTP, upgrade, Origin,   │
  appareil B ─┼─────────────────────▶│              taille de trame, ping    │
              │   (TLS au proxy)     │  relay.ts    sessions, espaces,       │
  appareil C ─┘                      │              ordre, diffusion         │
                                     │  token.ts    jetons HMAC-SHA256       │
                                     │  storage/    journal append-only      │
                                     └──────────────┬───────────────────────┘
                                                    ▼
                                    data/spaces/<sha256(espace)>.jsonl
```

| Module              | Rôle                                                                           |
| ------------------- | ------------------------------------------------------------------------------ |
| `src/protocol.ts`   | Contrat du protocole et validation stricte de chaque message entrant.          |
| `src/relay.ts`      | Cœur indépendant du transport : sessions, espaces, ordre et diffusion.         |
| `src/server.ts`     | Serveur HTTP + WebSocket, `/healthz`, `/metrics`, arrêt progressif.            |
| `src/token.ts`      | Signature et vérification des jetons ; outil de création en ligne de commande. |
| `src/storage/`      | Interface `Storage` ; implémentations mémoire et fichier (JSONL).              |
| `src/rate-limit.ts` | Seau à jetons (limitation de débit par connexion).                             |
| `src/logger.ts`     | Journaux JSON structurés, avec masquage des champs sensibles.                  |
| `src/metrics.ts`    | Métriques au format texte Prometheus, sans donnée personnelle.                 |
| `src/config.ts`     | Lecture et validation des variables d'environnement.                           |

### Espaces et journal

Un **espace** regroupe les appareils qui synchronisent les mêmes données (par exemple
tous les appareils d'une personne). Chaque espace possède un **journal en ajout seul** :
chaque enveloppe acceptée reçoit un numéro `seq` strictement croissant et dense (1, 2, 3…).
Le **curseur** transmis aux clients vaut `String(seq)` ; `'0'` désigne le début du journal.

Garanties :

- **Ordre total par espace** : les ajouts sont sérialisés, et chaque appareil reçoit les
  enveloppes dans l'ordre du journal, une seule fois.
- **Idempotence** : une enveloppe dont l'`id` est déjà présent n'est pas stockée à nouveau.
  Un client peut donc renvoyer sans risque ce qui n'a pas été acquitté.
- **Durabilité avant acquittement** : avec `POUXIS_FSYNC=always` (par défaut), l'`ack`
  n'est envoyé qu'après `fdatasync` sur disque.
- **Reprise sûre** : tout curseur reçu du serveur peut être conservé ; reprendre avec
  `since = curseur` ne fait jamais sauter une enveloppe.

### Stockage

- `memory` : pour les tests et le développement ; les données disparaissent à l'arrêt.
- `file` (par défaut) : un fichier JSONL par espace, nommé par le SHA-256 de l'identifiant
  d'espace (aucune traversée de chemin possible, aucun identifiant en clair sur le disque).
  Fichiers créés en mode `0600`, répertoire en `0700`.

À l'ouverture d'un journal, le serveur relit et vérifie chaque ligne (`seq` dense, `id`
unique). Une **dernière ligne tronquée** (coupure de courant pendant une écriture) est
supprimée automatiquement et l'événement est journalisé (`storage.recovered_torn_tail`).
Une ligne invalide **au milieu** du fichier n'est jamais effacée en silence : l'espace
devient indisponible (`unavailable`) et l'opérateur doit intervenir.

Politiques `POUXIS_FSYNC` :

| Valeur     | Comportement                                                                                                                                                      |
| ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `always`   | `fdatasync` avant chaque acquittement. Aucune perte d'une enveloppe acquittée.                                                                                    |
| `interval` | `fdatasync` périodique (`POUXIS_FSYNC_INTERVAL_MS`). Une panne peut perdre les dernières enveloppes acquittées ; les clients les renverront s'ils les conservent. |
| `never`    | Laisse le système d'exploitation décider. Réservé aux tests.                                                                                                      |

Les identifiants d'enveloppe et les positions des lignes de chaque espace ouvert sont
gardés en mémoire ; les contenus sont relus sur disque à la demande. Un espace inutilisé
est refermé après `POUXIS_SPACE_IDLE_MS`.

## Protocole

Messages JSON en trames **texte** sur une connexion WebSocket à `/v1/sync`. Les trames
binaires sont refusées. Le contrat de référence est [`src/protocol.ts`](src/protocol.ts).

```ts
type Envelope = { id: string; hlc: string; node: string; payload: string };

// client → serveur
{ t: 'hello'; space: string; node: string; since: string | null; token: string }
{ t: 'push'; envelopes: Envelope[] }

// serveur → client
{ t: 'welcome'; cursor: string }
{ t: 'ack'; ids: string[]; cursor: string }
{ t: 'ops'; envelopes: (Envelope & { seq: number })[]; cursor: string }
{ t: 'error'; code: string; message: string }
```

Déroulement :

1. Le client ouvre la connexion et envoie `hello` dans les `POUXIS_HELLO_TIMEOUT_MS`.
   `since` vaut `null` pour une première synchronisation, sinon le dernier curseur reçu.
2. Le serveur vérifie le jeton, puis répond `welcome`.
3. Le serveur envoie l'**historique manquant** par pages (`ops`), en attendant que chaque
   page soit transmise avant d'envoyer la suivante.
4. Une fois à jour, le client reçoit **en direct** les enveloppes poussées par les
   **autres** appareils. Il ne reçoit jamais en retour ce qu'il vient de pousser.
5. Chaque `push` reçoit un `ack` qui liste les `id` acceptés (nouveaux ou déjà présents).

Règles de validation (toute violation ferme la connexion avec `bad_message`) :

- objets aux clés **exactes** : un champ inconnu ou manquant est refusé ;
- `space`, `node`, `id`, `hlc` : ASCII imprimable sans espace, 1 à 128 caractères ;
- `payload` : chaîne d'au plus 256 Kio (UTF-8) par défaut ;
- au plus 500 enveloppes par `push` ; trame d'au plus 1 Mio (fermeture `1009` au-delà) ;
- `since` : `null` ou entier décimal sans zéro initial.

Codes d'erreur :

| Code             | Signification                                                                   | Connexion |
| ---------------- | ------------------------------------------------------------------------------- | --------- |
| `bad_message`    | JSON invalide ou schéma non respecté.                                           | fermée    |
| `protocol`       | Message hors séquence (`push` avant `hello`, second `hello`, délai dépassé).    | fermée    |
| `unauthorized`   | Jeton absent, invalide, expiré, ou non valable pour cet espace ou cet appareil. | fermée    |
| `rate_limited`   | Débit dépassé : la trame est ignorée. Fermeture après des dépassements répétés. | ouverte   |
| `space_full`     | Trop de connexions sur cet espace. Réessayer plus tard.                         | fermée    |
| `bad_cursor`     | `since` dépasse le journal (serveur restauré) : resynchroniser avec `null`.     | fermée    |
| `quota_exceeded` | Quota de stockage de l'espace atteint : rien n'a été stocké.                    | ouverte   |
| `slow_consumer`  | Le client lit trop lentement. Se reconnecter avec son dernier curseur.          | fermée    |
| `unavailable`    | Stockage momentanément indisponible. Réessayer avec un délai croissant.         | fermée    |
| `internal`       | Erreur inattendue du serveur.                                                   | fermée    |

## Jetons d'accès

Un jeton autorise **un espace**, jusqu'à une **date d'expiration**, et éventuellement pour
**un seul appareil** (`node`). Format : `base64url(revendications JSON) "." base64url(HMAC-SHA256)`,
signé avec `POUXIS_SYNC_SECRET`. La signature est vérifiée en temps constant **avant**
toute lecture des revendications.

Créer un jeton (sur une machine qui connaît le secret) :

```sh
POUXIS_SYNC_SECRET=… node src/token.ts --space <id-espace> [--node <id-appareil>] [--ttl 30d]
# conteneur :
docker compose exec sync node src/token.ts --space <id-espace> --ttl 90d
```

`--ttl` accepte `3600`, `90s`, `15m`, `12h`, `30d` (30 jours par défaut).

**Rotation du secret** : placez l'ancien secret dans `POUXIS_SYNC_SECRET_PREVIOUS` et le
nouveau dans `POUXIS_SYNC_SECRET`. Les deux sont acceptés ; seul le nouveau signe. Retirez
l'ancien quand tous les jetons émis avec lui ont expiré.

> Le jeton est un secret au porteur : transmettez-le uniquement sur TLS (`wss://`) et ne le
> placez jamais dans une URL.

## Ce que le serveur voit — et ne voit pas

POuxis est conçu pour que les enveloppes soient **chiffrées de bout en bout** sur les
appareils : `payload` est alors un texte chiffré dont le relais ne possède pas la clé.
Le relais ne déchiffre rien et n'a besoin d'aucune clé de contenu. Si un client envoie des
`payload` non chiffrés, le relais les stocke tels quels : le chiffrement relève du client.

| Le serveur **voit**                                                                            | Le serveur **ne voit pas**                                                         |
| ---------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| L'identifiant d'espace et l'identifiant d'appareil (`node`)                                    | Le contenu des tâches, notes, événements, idées                                    |
| Pour chaque enveloppe : `id`, `hlc` (horloge logique, donc un horodatage approximatif), `node` | Les clés de chiffrement                                                            |
| La taille de chaque `payload`, le nombre et le rythme des modifications                        | Les titres, noms de fichiers ou types d'objets (s'ils sont dans `payload` chiffré) |
| L'adresse IP et l'heure de connexion (au niveau réseau)                                        |                                                                                    |

Ces métadonnées révèlent notamment **quand** et **combien** vous modifiez vos données.
Hébergez votre propre relais si cela vous importe.

Mesures de confidentialité du serveur :

- les journaux d'exploitation ne contiennent **jamais** `payload`, jetons ni secrets
  (masquage systématique de ces champs) ;
- les identifiants d'espace et d'appareil n'y figurent que sous forme d'**empreinte**
  courte à sens unique (SHA-256 tronqué), les adresses IP n'y figurent pas ;
- `/metrics` ne publie que des totaux agrégés, sans identifiant ;
- les noms de fichiers sur disque sont des empreintes SHA-256 des identifiants d'espace.

Les fichiers de données contiennent, eux, les enveloppes complètes : protégez le volume
`/data` comme une sauvegarde chiffrée.

## Configuration

Toutes les variables sont facultatives sauf `POUXIS_SYNC_SECRET`. Une valeur invalide
empêche le démarrage, avec la liste de **toutes** les erreurs.

| Variable                           | Défaut               | Description                                                                                                                                                   |
| ---------------------------------- | -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `POUXIS_SYNC_SECRET`               | —                    | Secret HMAC des jetons, ≥ 32 caractères. **Obligatoire**, sauf si `NODE_ENV=development` (un secret public non sûr est alors utilisé, avec un avertissement). |
| `POUXIS_SYNC_SECRET_PREVIOUS`      | —                    | Ancien secret encore accepté (rotation).                                                                                                                      |
| `NODE_ENV`                         | —                    | `development` assouplit l'exigence de secret.                                                                                                                 |
| `HOST`                             | `127.0.0.1`          | Adresse d'écoute (`0.0.0.0` dans l'image Docker).                                                                                                             |
| `PORT`                             | `8787`               | Port HTTP/WebSocket.                                                                                                                                          |
| `POUXIS_STORAGE`                   | `file`               | `file` ou `memory`.                                                                                                                                           |
| `POUXIS_DATA_DIR`                  | `./data`             | Répertoire des journaux (`/data` dans l'image).                                                                                                               |
| `POUXIS_FSYNC`                     | `always`             | `always`, `interval` ou `never`.                                                                                                                              |
| `POUXIS_FSYNC_INTERVAL_MS`         | `1000`               | Période de synchronisation disque en mode `interval`.                                                                                                         |
| `POUXIS_ALLOWED_ORIGINS`           | _(toutes)_           | Liste d'origines navigateur autorisées, séparées par des virgules (`*` = toutes).                                                                             |
| `POUXIS_MAX_FRAME_BYTES`           | `1048576` (1 Mio)    | Taille maximale d'une trame WebSocket.                                                                                                                        |
| `POUXIS_MAX_PAYLOAD_BYTES`         | `262144` (256 Kio)   | Taille maximale d'un `payload` (< taille de trame).                                                                                                           |
| `POUXIS_MAX_ENVELOPES_PER_PUSH`    | `500`                | Enveloppes par `push`.                                                                                                                                        |
| `POUXIS_MAX_CONNECTIONS`           | `10000`              | Connexions simultanées sur le serveur.                                                                                                                        |
| `POUXIS_MAX_CONNECTIONS_PER_SPACE` | `64`                 | Connexions simultanées par espace.                                                                                                                            |
| `POUXIS_MAX_SPACE_BYTES`           | `1073741824` (1 Gio) | Quota de stockage par espace ; `0` = illimité.                                                                                                                |
| `POUXIS_RATE_MESSAGES_PER_SEC`     | `20`                 | Débit soutenu de trames par connexion.                                                                                                                        |
| `POUXIS_RATE_MESSAGES_BURST`       | `60`                 | Rafale de trames autorisée.                                                                                                                                   |
| `POUXIS_RATE_BYTES_PER_SEC`        | `1048576`            | Débit soutenu en octets par connexion.                                                                                                                        |
| `POUXIS_RATE_BYTES_BURST`          | 4 × taille de trame  | Rafale en octets (≥ taille de trame).                                                                                                                         |
| `POUXIS_RATE_MAX_STRIKES`          | `10`                 | Dépassements consécutifs avant fermeture.                                                                                                                     |
| `POUXIS_HEARTBEAT_MS`              | `30000`              | Intervalle des `ping` ; sans `pong` au tour suivant, la connexion est coupée.                                                                                 |
| `POUXIS_HELLO_TIMEOUT_MS`          | `10000`              | Délai pour envoyer `hello`.                                                                                                                                   |
| `POUXIS_SHUTDOWN_TIMEOUT_MS`       | `10000`              | Durée maximale de l'arrêt progressif.                                                                                                                         |
| `POUXIS_SPACE_IDLE_MS`             | `30000`              | Délai avant fermeture d'un espace sans connexion.                                                                                                             |
| `POUXIS_BACKLOG_PAGE_SIZE`         | `500`                | Enveloppes par page d'historique.                                                                                                                             |
| `POUXIS_BACKLOG_PAGE_BYTES`        | `524288`             | Taille visée d'une page d'historique.                                                                                                                         |
| `POUXIS_MAX_BUFFERED_BYTES`        | `8388608`            | Tampon d'envoi au-delà duquel un client lent est déconnecté.                                                                                                  |
| `POUXIS_METRICS_TOKEN`             | —                    | Si défini, `/metrics` exige `Authorization: Bearer <jeton>`.                                                                                                  |
| `POUXIS_LOG_LEVEL`                 | `info`               | `debug`, `info`, `warn` ou `error`.                                                                                                                           |

## Déploiement

### Docker

L'image (`node:22-alpine`) s'exécute sous l'utilisateur non privilégié `node`. Le code est
en lecture seule ; seul le volume `/data` est inscriptible.

```sh
cd apps/sync-server
export POUXIS_SYNC_SECRET="$(openssl rand -base64 48)"   # à conserver précieusement
docker compose up -d --build
curl http://127.0.0.1:8787/healthz                         # {"status":"ok"}
```

[`compose.yaml`](compose.yaml) active `read_only`, retire toutes les capacités Linux
(`cap_drop: [ALL]`), interdit l'élévation de privilèges et n'expose le port que sur
`127.0.0.1`. Sans Compose :

```sh
docker build -t pouxis-sync apps/sync-server
docker run -d --name pouxis-sync --read-only --cap-drop ALL \
  --security-opt no-new-privileges:true \
  -e POUXIS_SYNC_SECRET -v pouxis-sync-data:/data -p 127.0.0.1:8787:8787 pouxis-sync
```

Pour des constructions reproductibles, épinglez l'image de base par empreinte
(`node:22-alpine@sha256:…`).

### TLS et proxy inverse

Le relais parle HTTP en clair : placez-le derrière un proxy inverse qui termine TLS
(Caddy, nginx, Traefik…) et transmet les en-têtes `Upgrade`/`Connection`. Exemple Caddy :

```
sync.example.org {
  reverse_proxy 127.0.0.1:8787
}
```

Les clients se connectent alors à `wss://sync.example.org/v1/sync`. Pour un client web,
renseignez `POUXIS_ALLOWED_ORIGINS` avec l'origine exacte de l'application ; les
applications natives n'envoient en général pas d'en-tête `Origin` et sont acceptées.

### Sans conteneur

```sh
NODE_ENV=production HOST=127.0.0.1 POUXIS_SYNC_SECRET=… POUXIS_DATA_DIR=/var/lib/pouxis-sync \
  node apps/sync-server/src/index.ts
```

Lancez `node` directement (pas via `npm`) pour que `SIGTERM` atteigne le processus.

## Exploitation

- **`GET /healthz`** : `200 {"status":"ok"}`, ou `503 {"status":"draining"}` pendant l'arrêt.
- **`GET /metrics`** : compteurs et jauges Prometheus (`pouxis_sync_*`) : connexions,
  messages, octets, enveloppes stockées/dupliquées/diffusées, échecs d'authentification,
  erreurs de protocole, limitations de débit, trames trop grandes, clients lents, erreurs
  de stockage, quotas. Aucun identifiant d'espace, d'appareil ni adresse IP.
- **Journaux** : une ligne JSON par événement sur la sortie standard
  (`{"ts":…,"level":…,"msg":…}`), prête pour `docker logs`, journald ou Loki.
- **Arrêt progressif** (`SIGTERM`/`SIGINT`) : refus des nouvelles connexions, traitement des
  messages en cours, fermeture des connexions avec le code `1001`, écriture sur disque puis
  sortie, en `POUXIS_SHUTDOWN_TIMEOUT_MS` au plus. Un second signal force la sortie.
- **Sauvegarde** : copiez le volume `/data` (fichiers en ajout seul ; une copie à chaud est
  cohérente ligne à ligne, une éventuelle dernière ligne partielle est réparée au
  redémarrage). Après la restauration d'une sauvegarde plus ancienne, les clients en avance
  reçoivent `bad_cursor` et se resynchronisent.
- **Corruption** : si un journal est refusé (`space.open_failed` / `StorageCorruptError`),
  le fichier n'a pas été modifié ; examinez la ligne signalée avant toute réparation.

## Développement

```sh
npm test -w @pouxis/sync-server        # tests (unitaires et d'intégration)
npm run typecheck -w @pouxis/sync-server
NODE_ENV=development POUXIS_STORAGE=memory npm start -w @pouxis/sync-server
```

Les tests d'intégration démarrent un vrai serveur sur un port éphémère et utilisent de
vrais clients WebSocket : convergence de deux appareils, idempotence, pagination de
l'historique, persistance après redémarrage, authentification, trames trop grandes,
limitation de débit, quotas, origines, arrêt progressif et absence de données sensibles
dans les journaux.
