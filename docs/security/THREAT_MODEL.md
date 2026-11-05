# Modèle de menaces de POuxis

> Statut : version 0.1. Méthode : STRIDE par composant, notation qualitative du risque.
> Document compagnon : [architecture de sécurité](./SECURITY_ARCHITECTURE.md).
> À réviser à chaque nouvelle surface exposée (serveur, intégration, plugin, fonction IA).

## 1. Périmètre et hypothèses

**Actifs à protéger**, par ordre de sensibilité : contenu des coffres chiffrés (3.5), contenu
utilisateur synchronisé, secrets (phrase secrète, clé de récupération, secrets de liens),
intégrité de l'historique (journal d'audit 6.5), disponibilité des données locales.

**Acteurs malveillants considérés**

| Acteur                             | Capacités supposées                                                                     |
| ---------------------------------- | --------------------------------------------------------------------------------------- |
| A1 — Attaquant réseau              | observe et modifie le trafic (Wi-Fi public, proxy)                                      |
| A2 — Opérateur ou intrus du relais | lit et modifie tout ce que stocke ou relaie le serveur, rejoue, supprime, réordonne     |
| A3 — Destinataire ou fuite de lien | détient une URL de partage (transférée, indexée, historique de navigateur)              |
| A4 — Code tiers dans le client     | plugin (6.3), dépendance compromise, contenu injecté (XSS), contenu soumis à une IA     |
| A5 — Accès physique                | appareil volé ou laissé déverrouillé, sauvegarde de l'appareil                          |
| A6 — Expéditeur externe            | envoie des e-mails à l'adresse d'ingestion (2.10), appelle les API publiques (6.1, 6.2) |

**Hors périmètre** : appareil entièrement compromis (logiciel espion avec privilèges système),
attaques matérielles par canal auxiliaire, contrainte exercée sur l'utilisateur.

**Hypothèses** : WebCrypto de la plateforme correct ; TLS valide entre client et relais ; le
système d'exploitation isole les applications.

## 2. Échelle de risque

Risque = vraisemblance × impact, chacun noté **Faible / Moyen / Élevé**.
Le risque indiqué est le **risque résiduel** compte tenu des mesures _implémentées_.
**État** : ✅ implémenté et testé · 🟡 partiel · ⏳ prévu.

## 3. Analyse STRIDE par composant

### 3.1 Clients (web, iOS, Android, macOS, Windows, Linux)

| STRIDE | Menace                                                                         | Risque | Mesures                                                                                                                                                                                          | État                                      | Module responsable                 |
| ------ | ------------------------------------------------------------------------------ | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------- | ---------------------------------- |
| I      | Lecture du stockage local sur un appareil volé (A5)                            | Moyen  | Collections sensibles chiffrées `pxv1` sous la clé de coffre ; clé non extractible, jamais persistée en clair ; verrouillage automatique du coffre                                               | 🟡 primitives ✅, intégration au store ⏳ | `core/crypto`, `app/store`         |
| I      | XSS exfiltrant du texte clair ou utilisant la clé ouverte (A4)                 | Élevé  | React échappe par défaut ; pas de `dangerouslySetInnerHTML` sur du contenu utilisateur ; CSP stricte (`tauri.conf.json`, `style-src 'unsafe-inline'` à résorber) ; rendu Markdown assaini (5.11) | 🟡                                        | `app`, `views/*`                   |
| T      | Altération de données locales par un autre processus                           | Faible | AEAD : toute altération d'un enregistrement chiffré est détectée (`decrypt-failed`)                                                                                                              | ✅                                        | `core/crypto`                      |
| I      | Phrase secrète faible attaquée hors ligne après fuite de l'en-tête             | Moyen  | PBKDF2 600 000 itérations, minimum 15 caractères, migration Argon2id prévue (ADR-SEC-001)                                                                                                        | 🟡                                        | `core/crypto`                      |
| D      | Perte définitive d'un coffre (phrase oubliée)                                  | Moyen  | Clé de récupération imprimable avec somme de contrôle ; changement de phrase secrète par la clé de récupération                                                                                  | ✅                                        | `core/crypto`, interface coffre ⏳ |
| I      | Fuite de texte clair dans les journaux, la télémétrie ou les rapports d'erreur | Moyen  | Erreurs `CryptoError` sans contenu ; aucune télémétrie distante par défaut                                                                                                                       | 🟡                                        | tous                               |

### 3.2 Shell Tauri 2 : IPC et capacités

| STRIDE | Menace                                                                | Risque | Mesures                                                                                                                                 | État                                                                                                                | Module responsable |
| ------ | --------------------------------------------------------------------- | ------ | --------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- | ------------------ |
| E      | Du JavaScript injecté appelle des commandes natives (fichiers, shell) | Élevé  | Fichiers de capacités Tauri 2 par fenêtre, au minimum nécessaire ; aucune permission `shell`/`fs` globale ; arguments validés côté Rust | 🟡 (`src-tauri/capabilities/` : permissions explicites par plateforme, sans `shell`/`fs` ; à revoir à chaque ajout) | `src-tauri`        |
| S      | Une page distante chargée dans la WebView obtient l'accès IPC         | Élevé  | Aucune origine distante autorisée dans les capacités ; navigation externe ouverte dans le navigateur système                            | ⏳                                                                                                                  | `src-tauri`        |
| I      | Secrets d'appareil (jetons de sync) stockés en clair                  | Moyen  | Trousseau du système (Keychain, Keystore, Credential Manager, Secret Service)                                                           | ⏳                                                                                                                  | `platform`         |
| T      | Mise à jour applicative piégée                                        | Élevé  | Mises à jour signées (updater Tauri à clé publique épinglée)                                                                            | ⏳                                                                                                                  | `src-tauri`, CI    |

### 3.3 Relais de synchronisation et métadonnées

| STRIDE | Menace                                                                          | Risque | Mesures                                                                                                                                                            | État                                                           | Module responsable           |
| ------ | ------------------------------------------------------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------- | ---------------------------- |
| I      | Le relais lit le contenu (A2)                                                   | Faible | `encryptPayload` : la charge utile est chiffrée de bout en bout ; le relais ne détient aucune clé                                                                  | ✅ chiffrement systématique par le client (`store/syncing.ts`) | `core/crypto`, `core/sync`   |
| T      | Le relais modifie, rejoue ou déplace une enveloppe dans un autre espace         | Faible | AAD = espace, id, HLC, nœud : toute substitution échoue au déchiffrement ; opérations idempotentes sur l'id                                                        | ✅                                                             | `core/crypto`, `core/sync`   |
| R / T  | Le relais supprime ou retient des enveloppes                                    | Moyen  | Détection partielle par les curseurs ; journal d'audit avec points de contrôle signés pour les espaces d'équipe                                                    | 🟡                                                             | `core/sync`, `core/crypto`   |
| I      | Analyse des métadonnées : qui synchronise quand, quelle taille, quels appareils | Moyen  | Bourrage Padmé des charges utiles ; identifiants opaques ; rétention courte des journaux serveur ; pas de nom ni d'e-mail côté relais                              | 🟡                                                             | `core/crypto`, `sync-server` |
| S      | Usurpation d'un espace par un client non autorisé                               | Moyen  | Jetons d'espace HMAC-SHA256 à expiration, liés optionnellement à un nœud, vérifiés en temps constant ; une connexion ne peut pousser que pour son nœud authentifié | ✅                                                             | `sync-server`                |
| D      | Saturation du relais                                                            | Moyen  | Limites de taille de trame et de charge utile, limitation de débit par connexion, plafond de connexions par adresse (revue 2026-11)                                | ✅                                                             | `sync-server`                |
| T      | Interception réseau (A1)                                                        | Faible | TLS obligatoire (`wss://`) ; le contenu reste chiffré même si TLS est contourné                                                                                    | 🟡                                                             | déploiement                  |

### 3.4 Gestion des clés et récupération

| STRIDE | Menace                                                                   | Risque | Mesures                                                                                                                                              | État | Module responsable          |
| ------ | ------------------------------------------------------------------------ | ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------- | ---- | --------------------------- |
| T      | En-tête de coffre falsifié pour affaiblir la dérivation (itérations à 1) | Faible | `parseVaultHeader` refuse toute valeur hors [600 000 ; 10 000 000] avant calcul                                                                      | ✅   | `core/crypto`               |
| S      | Substitution d'une clé enveloppée connue de l'attaquant                  | Faible | Enveloppement AES-GCM authentifié, AAD = vaultId + paramètres du slot                                                                                | ✅   | `core/crypto`               |
| D      | En-tête forgé avec un coût énorme pour bloquer le client                 | Faible | Plafond de 10 000 000 itérations                                                                                                                     | ✅   | `core/crypto`               |
| I      | Clé de récupération photographiée ou stockée dans le cloud               | Moyen  | Affichée une seule fois, jamais stockée par POuxis ; rotation (`rotateRecoveryKey`) ; conseils d'impression dans l'interface                         | 🟡   | `core/crypto`, interface ⏳ |
| I      | Réutilisation d'IV GCM                                                   | Faible | IV aléatoire de 96 bits à chaque chiffrement ; volumes très inférieurs à la limite de 2³² par clé                                                    | ✅   | `core/crypto`               |
| E      | Ancien appareil conservant l'accès après changement de phrase secrète    | Moyen  | Le changement de phrase ne révoque pas une clé déjà ouverte : prévoir une rotation de la clé de coffre (rechiffrement) pour la révocation d'appareil | ⏳   | `core/crypto`, `core/sync`  |

### 3.5 Liens de partage (3.10)

| STRIDE | Menace                                                                         | Risque | Mesures                                                                                                                       | État                         | Module responsable                |
| ------ | ------------------------------------------------------------------------------ | ------ | ----------------------------------------------------------------------------------------------------------------------------- | ---------------------------- | --------------------------------- |
| I      | Le serveur de partage lit le contenu partagé                                   | Faible | Clé de contenu dérivée du secret placé dans le fragment, jamais transmis                                                      | ✅                           | `core/crypto`                     |
| I      | Fuite de l'URL (A3) : historique, transfert, aperçu de lien par une messagerie | Moyen  | Expiration obligatoire ≤ 365 jours ; mot de passe optionnel ; révocation par id de lien ; `Referrer-Policy: no-referrer`      | 🟡 primitives ✅, serveur ⏳ | `core/crypto`, serveur de partage |
| E      | Élévation de `read` à `comment`, prolongation de l'expiration                  | Faible | Claims signés HMAC-SHA256 ; vérification de la permission, de la ressource et de la fenêtre de validité                       | ✅                           | `core/crypto`                     |
| S      | Signataire distant renvoyant un jeton plus permissif                           | Faible | Le client compare les claims signés à ceux demandés (seule une expiration plus courte est admise)                             | ✅                           | `core/crypto`                     |
| I      | Force brute du mot de passe d'un lien                                          | Moyen  | PBKDF2 600 000 ; preuve vérifiée par le serveur en temps constant ; limitation de débit par lien et par client ; 404 uniforme | 🟡 limitation ⏳             | `core/crypto`, serveur            |
| I      | Fuite du stockage serveur + URL : force brute hors ligne du mot de passe       | Moyen  | Coût PBKDF2 par essai ; risque documenté (voir architecture §5)                                                               | 🟡                           | `core/crypto`                     |
| R      | Énumération de liens existants                                                 | Faible | Ids de 128 bits aléatoires ; réponses 404 identiques pour toutes les causes d'échec                                           | 🟡                           | serveur                           |

### 3.6 Journal d'audit (6.5)

| STRIDE | Menace                                                        | Risque | Mesures                                                                                        | État                             | Module responsable         |
| ------ | ------------------------------------------------------------- | ------ | ---------------------------------------------------------------------------------------------- | -------------------------------- | -------------------------- |
| T      | Modification, suppression, insertion ou permutation d'entrées | Faible | Chaîne SHA-256 sur JSON canonique ; `verifyAuditChain`                                         | ✅                               | `core/crypto`              |
| T      | Troncature de la fin de la chaîne                             | Moyen  | Points de contrôle ECDSA P-256 conservés hors de portée (relais, SIEM)                         | 🟡 primitives ✅, publication ⏳ | `core/crypto`              |
| R      | Un administrateur réécrit tout le journal et le resigne       | Moyen  | Clé de point de contrôle détenue par le rédacteur ; export vers un système tiers en ajout seul | ⏳                               | intégration entreprise     |
| I      | Le journal révèle des données personnelles                    | Moyen  | `details` minimal ; journal chiffré comme le reste du contenu                                  | 🟡                               | `core/crypto`, intégration |

### 3.7 Plugins et commandes « / » (6.3)

| STRIDE | Menace                                                                      | Risque | Mesures                                                                                                                                                                              | État | Module responsable     |
| ------ | --------------------------------------------------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---- | ---------------------- |
| E / I  | Un plugin lit tout l'espace, les clés ouvertes ou exfiltre des données (A4) | Élevé  | Exécution isolée (iframe `sandbox` ou Worker), API de messages à permissions déclarées et accordées par l'utilisateur, pas d'accès réseau par défaut, jamais d'accès aux `CryptoKey` | ⏳   | futur module `plugins` |
| T      | Plugin malveillant publié ou mis à jour                                     | Élevé  | Manifeste signé, version épinglée, avertissement à chaque nouvelle permission                                                                                                        | ⏳   | futur module `plugins` |

### 3.8 Webhooks sortants (6.1) et délégation (2.13)

| STRIDE | Menace                                                  | Risque | Mesures                                                                                                       | État | Module responsable          |
| ------ | ------------------------------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------- | ---- | --------------------------- |
| I      | Fuite de contenu vers un service tiers                  | Moyen  | Opt-in par espace, choix explicite des champs envoyés, contenu de coffre jamais inclus                        | ⏳   | futur module `integrations` |
| S      | Le destinataire ne peut pas authentifier l'émetteur     | Moyen  | Signature HMAC-SHA256 de chaque livraison avec horodatage (fenêtre anti-rejeu), secret par webhook            | ⏳   | futur module `integrations` |
| E      | SSRF : webhook pointé vers le réseau interne du serveur | Élevé  | HTTPS uniquement, résolution DNS puis blocage des plages privées, loopback et link-local, pas de redirections | ⏳   | serveur                     |

### 3.9 API publique GraphQL (6.2)

| STRIDE | Menace                                               | Risque | Mesures                                                                                                              | État | Module responsable  |
| ------ | ---------------------------------------------------- | ------ | -------------------------------------------------------------------------------------------------------------------- | ---- | ------------------- |
| S      | Vol ou réutilisation de jetons d'API                 | Moyen  | Jetons à portée et durée limitées, révocables, stockés hachés                                                        | ⏳   | futur serveur d'API |
| D      | Requêtes imbriquées coûteuses                        | Moyen  | Limites de profondeur et de complexité, pagination obligatoire, limitation de débit                                  | ⏳   | futur serveur d'API |
| I      | Divulgation du schéma ou de données d'autres espaces | Moyen  | Introspection désactivée en production ; autorisation par objet ; le serveur ne sert que du chiffré pour les coffres | ⏳   | futur serveur d'API |

### 3.10 Fonctions IA et injection de prompt (2.2, 3.2, 4.8, 5.7, 6.12)

| STRIDE | Menace                                                                                                            | Risque | Mesures                                                                                                                                                                                                                                | État | Module responsable |
| ------ | ----------------------------------------------------------------------------------------------------------------- | ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---- | ------------------ |
| T / E  | Injection de prompt indirecte : une note, un e-mail ou un PDF contient des instructions exécutées par l'assistant | Élevé  | Le contenu utilisateur est passé comme donnée délimitée, jamais comme instruction ; l'IA propose, l'utilisateur valide ; aucune action à effet externe (webhook, partage, suppression) sans confirmation ; sorties validées par schéma | ⏳   | modules IA         |
| I      | Envoi de contenu de coffre à un modèle distant                                                                    | Élevé  | Traitement local par défaut ; fournisseur distant en opt-in explicite ; contenu de coffre exclu                                                                                                                                        | ⏳   | modules IA         |
| I      | Exfiltration via la sortie (liens ou images Markdown générés)                                                     | Moyen  | Pas de chargement automatique de ressources distantes dans les réponses ; liens affichés en clair                                                                                                                                      | ⏳   | `views/*`          |

### 3.11 Ingestion d'e-mails (2.10)

| STRIDE | Menace                                                  | Risque | Mesures                                                                                                             | État | Module responsable    |
| ------ | ------------------------------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------- | ---- | --------------------- |
| S      | Un tiers crée des tâches en usurpant l'utilisateur (A6) | Moyen  | Adresse dédiée contenant un jeton aléatoire révocable ; vérification SPF/DKIM/DMARC ; liste d'expéditeurs autorisés | ⏳   | futur module `ingest` |
| E      | Pièce jointe ou HTML malveillant                        | Moyen  | HTML converti en texte, pièces jointes jamais exécutées, aucun lien suivi automatiquement                           | ⏳   | futur module `ingest` |
| D      | Inondation de messages                                  | Faible | Quotas par adresse, suppression des doublons                                                                        | ⏳   | futur module `ingest` |

### 3.12 SSO SAML / OAuth2 (6.14)

| STRIDE | Menace                                        | Risque | Mesures                                                                                                                                              | État | Module responsable                |
| ------ | --------------------------------------------- | ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------- | ---- | --------------------------------- |
| S      | Assertion SAML forgée ou _signature wrapping_ | Élevé  | Bibliothèque SAML maintenue, signature d'assertion obligatoire, audience, destinataire et durée vérifiés, rejeu bloqué                               | ⏳   | futur serveur d'identité          |
| S      | Vol de code OAuth / CSRF de connexion         | Moyen  | OIDC avec PKCE (S256), `state` et `nonce`, redirections exactes                                                                                      | ⏳   | futur serveur d'identité          |
| I      | Le SSO donne accès au contenu chiffré         | Moyen  | Le SSO authentifie l'accès au relais, il ne remplace pas la phrase secrète du coffre ; séquestre de clés d'entreprise uniquement en opt-in explicite | ⏳   | `core/crypto`, serveur d'identité |

## 4. Risques prioritaires

1. **XSS et capacités Tauri** (3.1, 3.2) : CSP et fichiers de capacités minimaux avant toute
   version publique.
2. **Isolation des plugins** (3.7) : aucune exécution de plugin tiers sans bac à sable.
3. **Injection de prompt** (3.10) : confirmation humaine obligatoire avant toute action
   déclenchée par une IA.
4. **Branchement du chiffrement** dans `core/sync` et `app/store` pour que toute donnée qui
   quitte l'appareil soit `pxv1`.
5. **SSRF des webhooks** (3.8) dès l'ouverture de la fonctionnalité.

## 5. Révision

Ce modèle est revu à chaque version mineure et à chaque nouvelle surface exposée. Toute
vulnérabilité découverte se signale selon [`SECURITY.md`](../../SECURITY.md).
