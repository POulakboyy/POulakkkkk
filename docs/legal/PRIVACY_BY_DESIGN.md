# Protection des données dès la conception (RGPD art. 25)

> **Ceci n'est pas un avis juridique — à faire valider par un·e avocat·e.** Ce document fixe
> des exigences de conception ; il est opposable aux équipes du projet, pas aux tiers.

État au 4 novembre 2026. Complète [`COMPLIANCE.md`](COMPLIANCE.md) et
`docs/security/SECURITY_ARCHITECTURE.md` (classes S0 à S3, hiérarchie de clés). En cas de
divergence sur un point cryptographique, l'architecture de sécurité prévaut.

## 1. Principes

1. **Le contenu ne quitte l'appareil que chiffré** (AES-256-GCM `pxv1`, clés détenues
   uniquement par les appareils de la personne).
2. **Réglages par défaut les plus protecteurs** (art. 25(2)) : aucune télémétrie, aucune IA
   distante, aucun partage, synchronisation désactivée tant qu'aucun compte n'est créé.
3. **Minimisation** (art. 5(1)(c)) : le relais ne reçoit que ce qui est nécessaire pour
   ordonner et livrer des enveloppes.
4. **Aucune inférence sur la personne** : pas d'étiquette d'émotion, de santé, de
   performance ni de profil calculé à son insu.
5. **Réversibilité** : export complet (6.11), suppression locale immédiate, suppression du
   compte et des données du relais depuis l'application.

## 2. Inventaire des données

Légende — **Accès** : qui peut lire la donnée en clair.

### 2.1 Sur l'appareil

| Données                                                        | Stockage                                                                                    | Chiffrement                                                               | Conservation                                                                               | Accès                            |
| -------------------------------------------------------------- | ------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ | -------------------------------- |
| Tâches, événements, notes, idées, organigrammes                | base locale (IndexedDB dans le client web, base du shell natif — en cours d'implémentation) | chiffrement du stockage système ; collections sensibles en `pxv1` (prévu) | jusqu'à suppression par la personne ; corbeille 30 jours (à valider avec l'équipe produit) | la personne                      |
| Coffres chiffrés (3.5)                                         | base locale                                                                                 | `pxv1`, clé de coffre non extractible                                     | idem                                                                                       | la personne, coffre déverrouillé |
| Bac à sable (5.8)                                              | mémoire ou base locale isolée                                                               | idem contenu                                                              | **fin de session**, jamais synchronisé ni indexé                                           | la personne                      |
| Mémos vocaux (2.7) et transcriptions                           | fichiers locaux                                                                             | idem contenu                                                              | audio : supprimé après transcription sauf choix contraire ; texte : comme une note         | la personne                      |
| Lieux des tags géolocalisés (2.5)                              | base locale                                                                                 | `pxv1`                                                                    | jusqu'à suppression du tag ; **aucun historique de positions**                             | la personne                      |
| Sessions Pomodoro, temps passé, métriques (2.6, 1.3, 7.2, 7.9) | base locale                                                                                 | idem contenu                                                              | 24 mois glissants par défaut (proposition)                                                 | la personne                      |
| Index de recherche (3.2), OCR (3.4)                            | base locale                                                                                 | idem contenu                                                              | reconstruit à la demande                                                                   | la personne                      |
| Préférences, thème, raccourcis                                 | stockage local                                                                              | non (données non sensibles)                                               | jusqu'à réinitialisation                                                                   | la personne                      |
| Clés de coffre enveloppées, jetons d'espace                    | stockage local ; trousseau du système dans le shell natif (prévu)                           | enveloppées (`pxk1`) ; phrase secrète jamais persistée                    | jusqu'à déconnexion                                                                        | appareil                         |

### 2.2 Sur le relais de synchronisation

| Données                                                                                                                    | Stockage                      | Chiffrement                                            | Conservation                                                                                                                                                        | Accès                    |
| -------------------------------------------------------------------------------------------------------------------------- | ----------------------------- | ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------ |
| Enveloppes de contenu                                                                                                      | disque du relais              | chiffrées de bout en bout ; illisibles par l'opérateur | **à définir** : aujourd'hui sans limite ; cible : compactage + suppression des enveloppes supplantées, effacement complet sous 30 jours après suppression du compte | appareils de la personne |
| Métadonnées d'enveloppe : id d'espace, id d'enveloppe, horloge logique (HLC), id de nœud, taille arrondie (bourrage Padmé) | disque du relais              | non (nécessaires au routage)                           | comme les enveloppes                                                                                                                                                | opérateur du relais      |
| Jetons d'espace (HMAC, durée limitée)                                                                                      | vérifiés à la volée           | —                                                      | non conservés au-delà de la connexion                                                                                                                               | opérateur                |
| Adresse IP, heure de connexion                                                                                             | mémoire (limitation de débit) | —                                                      | **non journalisées** (`apps/sync-server/src/logger.ts`) ; compteurs de débit en mémoire seulement                                                                   | opérateur                |
| Compte (adresse e-mail, si comptes hébergés)                                                                               | base de l'éditeur (prévu)     | chiffrement au repos                                   | durée du compte + 30 jours                                                                                                                                          | éditeur (support)        |

### 2.3 Services optionnels

| Service                                   | Données envoyées                                                                                                | Déclenchement                                   | Conservation                                    | Accès                    |
| ----------------------------------------- | --------------------------------------------------------------------------------------------------------------- | ----------------------------------------------- | ----------------------------------------------- | ------------------------ |
| Fournisseur d'IA distant (2.2, 4.8, 6.12) | le texte strictement nécessaire à la requête (titre de tâche, bloc sélectionné) ; jamais coffres ni bac à sable | action explicite, fonction activée au préalable | selon le fournisseur, affichée avant activation | fournisseur              |
| Liens de partage (3.10)                   | contenu partagé, chiffré avec la clé du lien (fragment d'URL)                                                   | création du lien                                | expiration obligatoire, ≤ 365 jours             | détenteur·rice·s du lien |
| Webhooks (6.1)                            | charge définie par la personne                                                                                  | configuration explicite par espace              | selon le destinataire                           | destinataire             |
| Rapports de plantage                      | trace technique, version, plateforme — **sans contenu**                                                         | opt-in                                          | 90 jours (proposition)                          | éditeur                  |
| Ingestion d'e-mails (2.10)                | courriels complets                                                                                              | **non disponible** — voir `COMPLIANCE.md` § 7.2 | —                                               | —                        |

## 3. Réglages par défaut

| Réglage                            | Valeur par défaut                                            | Modifiable par                                                           |
| ---------------------------------- | ------------------------------------------------------------ | ------------------------------------------------------------------------ |
| Synchronisation                    | désactivée                                                   | la personne (création de compte ou appairage)                            |
| Télémétrie, rapports de plantage   | **désactivés**                                               | la personne                                                              |
| IA distante                        | **désactivée**, fonction par fonction                        | la personne ; jamais une administration d'équipe pour le compte d'autrui |
| Localisation                       | non demandée                                                 | demandée à l'activation d'un tag géolocalisé                             |
| Notifications                      | non demandées                                                | demandées au premier rappel                                              |
| Liens de partage                   | lecture seule, expiration 7 jours (proposition), ≤ 365 jours | créateur·rice du lien                                                    |
| Journal d'audit (espaces d'équipe) | conservation 90 jours (proposition), `details` minimal       | administration de l'espace, dans des bornes fixées par le produit        |
| Visibilité des compétences (6.9)   | privée                                                       | la personne                                                              |

## 4. Exigences d'interface pour les équipes UI

Ces exigences s'appliquent à `apps/pouxis/src/features` et `src/views`. Elles transcrivent
les conditions de validité du consentement (RGPD art. 4(11) et 7 ; CEPD, lignes
directrices 05/2020 sur le consentement).

### 4.1 Règles générales

1. **Pas de case précochée**, pas de consentement déduit du défilement ou de la poursuite de
   la navigation.
2. **Symétrie** : « Refuser » est aussi visible et aussi accessible que « Accepter » (même
   niveau visuel, même nombre de gestes). Pas de libellé culpabilisant.
3. **Granularité** : un interrupteur par finalité (télémétrie, rapports de plantage, IA
   distante par fonction). Jamais de consentement groupé avec l'acceptation des conditions.
4. **Retrait aussi simple que l'octroi** : chaque choix est modifiable dans
   Réglages › Confidentialité, accessible en deux gestes au plus depuis l'accueil.
5. **Juste à temps** : la demande apparaît au moment où la fonction est utilisée, pas
   pendant l'accueil.
6. **Preuve** : enregistrer localement la date, la version du texte affiché et le choix
   (art. 7(1)) ; synchronisé chiffré comme le reste.
7. **Accessibilité** : dialogues navigables au clavier, annoncés aux lecteurs d'écran
   (`role="dialog"`, `aria-modal`, focus piégé et restitué), cibles ≥ 44 px, textes en
   langage clair (niveau B1 visé).
8. **Clés i18n** dans un namespace dédié (`privacy`), `fr` canonique et `en` miroir.

### 4.2 Écrans requis

| Écran                                      | Contenu minimal                                                                                                                                                                                            |
| ------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Accueil — « Vos données restent ici »      | une phrase : contenu stocké sur l'appareil, synchronisation chiffrée de bout en bout, aucune publicité. Aucun choix demandé.                                                                               |
| Activation de l'IA distante (par fonction) | fournisseur, pays de traitement annoncé, usage pour l'entraînement (oui/non selon le fournisseur), conservation, **aperçu exact du texte envoyé**, boutons « Activer » / « Ne pas activer » de même poids. |
| Contenu généré par IA                      | badge « Généré par IA » persistant sur l'élément ; validation explicite avant insertion ; provenance visible dans le détail.                                                                               |
| Localisation (2.5)                         | écran explicatif **avant** la demande système : pourquoi, ce qui est stocké (le lieu, pas vos trajets), comment désactiver.                                                                                |
| Télémétrie (Réglages)                      | liste des champs envoyés, exemple de rapport, interrupteur désactivé par défaut.                                                                                                                           |
| Espace d'équipe — journal d'audit          | bandeau d'information pour chaque membre : ce qui est journalisé, qui y a accès, durée de conservation.                                                                                                    |
| Suppression du compte                      | dans l'application, en trois gestes au plus, avec export proposé avant et délai d'effacement annoncé.                                                                                                      |
| À propos                                   | version, licence AGPL-3.0, lien vers le code source, notices tierces, politique de confidentialité.                                                                                                        |

### 4.3 Interdits

- inférer ou afficher une émotion, une humeur, un état de santé ou un niveau de performance
  d'une personne (voir `COMPLIANCE.md` § 5 et § 7.3) ;
- classement ou comparaison d'activité entre membres d'une équipe ;
- SDK d'analytique, de publicité ou d'attribution ;
- envoi de contenu à un service tiers sans action explicite de la personne.

## 5. Exigences techniques

| #   | Exigence                                                                                                                             | Équipe                 | État                    |
| --- | ------------------------------------------------------------------------------------------------------------------------------------ | ---------------------- | ----------------------- |
| 1   | Chiffrement systématique des charges avant envoi au relais                                                                           | `core/sync`, `store`   | à brancher              |
| 2   | Politique de conservation du relais : compactage, suppression des enveloppes supplantées, purge d'un espace sur demande authentifiée | `sync-server`          | **manquant**            |
| 3   | Suppression de compte de bout en bout (appareils, relais, sauvegardes de l'éditeur)                                                  | `app`, `sync-server`   | prévu                   |
| 4   | Champ de provenance `origin` (humain / IA, fournisseur, date) conservé à l'export                                                    | `core`                 | à concevoir             |
| 5   | Bac à sable exclu de la recherche, de la synchronisation et de l'IA                                                                  | `core/search`, `store` | à vérifier              |
| 6   | Journal d'audit : `details` minimal, rétention bornée                                                                                | `core/crypto` (audit)  | primitives prêtes       |
| 7   | Aucune adresse IP ni contenu dans les journaux serveur                                                                               | `sync-server`          | **implémenté** (logger) |
| 8   | Registre local des consentements (date, version, choix)                                                                              | `app`                  | à faire                 |
