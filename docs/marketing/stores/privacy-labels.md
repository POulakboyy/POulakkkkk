# Confidentialité — étiquette Apple, section « Sécurité des données » Google Play, déclaration Microsoft

> **Document de préparation, pas un avis juridique.** Il doit être validé par une personne
> qualifiée et aligné sur la politique de confidentialité publiée. Références internes :
> `docs/legal/PRIVACY_BY_DESIGN.md` (exigences et réglages par défaut) et
> `docs/legal/PRIVACY_POLICY_DRAFT.md` (brouillon de politique, non publié). En cas d'écart,
> ces documents prévalent ; les réponses ci-dessous reposent aussi sur les hypothèses H1 à H7,
> vérifiées dans le code lorsque c'était possible (4 novembre 2026).

## Faits et hypothèses

| #   | Fait ou hypothèse                                                                                                                                                                               | Statut                                                                                                                                                                                                                                |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| H1  | Les données (tâches, événements, notes, toiles) sont stockées et traitées sur l'appareil.                                                                                                       | Principe d'architecture (`CLAUDE.md`, brief 3.1) ; à vérifier dans le build.                                                                                                                                                          |
| H2  | Aucun compte : l'app est pleinement utilisable sans connexion.                                                                                                                                  | À vérifier dans le build.                                                                                                                                                                                                             |
| H3  | Aucun SDK d'analytique, de publicité, de rapport de plantage ni de télémétrie distante.                                                                                                         | Aucune dépendance de ce type trouvée dans `apps/pouxis/package.json` ni `src-tauri/Cargo.toml` ; à revérifier à chaque version.                                                                                                       |
| H4  | La synchronisation est **facultative** ; le contenu des enveloppes est chiffré sur l'appareil avec la clé de l'espace, que le relais ne détient pas.                                            | Primitive présente dans `packages/core/src/crypto/payload.ts` ; son branchement systématique avant envoi est **« à brancher »** (`PRIVACY_BY_DESIGN.md` § 5, exigence 1). Bloquant pour toute mention du chiffrement de bout en bout. |
| H5  | Le relais voit en clair des métadonnées de routage : identifiant d'espace, identifiant de nœud (appareil), horloge logique, taille approximative (rembourrage Padmé), jeton d'accès à l'espace. | Vérifié dans `payload.ts` et `apps/sync-server/src/token.ts`.                                                                                                                                                                         |
| H6  | Le relais ne journalise pas les adresses IP des clients.                                                                                                                                        | Vérifié dans `apps/sync-server/src/logger.ts`. Un proxy ou hébergeur placé devant le relais peut, lui, les journaliser : à contrôler.                                                                                                 |
| H7  | Connexions au relais chiffrées en transit (TLS/WSS).                                                                                                                                            | Hypothèse : à imposer dans la configuration de production.                                                                                                                                                                            |

Deux scénarios de distribution changent les réponses :

- **Scénario A — aucun relais exploité par l'éditeur** : l'utilisateur synchronise via un relais
  qu'il héberge lui-même, ou ne synchronise pas. L'éditeur ne reçoit aucune donnée.
- **Scénario B — relais hébergé par l'éditeur** proposé dans l'app. L'éditeur stocke des
  enveloppes chiffrées et les métadonnées H5.

## Fonctions facultatives qui modifient les réponses

`PRIVACY_BY_DESIGN.md` (§ 2 et § 3) et le brouillon de politique prévoient des traitements
désactivés par défaut. Apple comme Google exigent de déclarer aussi les données collectées de
façon **facultative** : « désactivé par défaut » ne dispense pas de la déclaration. Avant chaque
soumission, cocher les fonctions présentes dans le build et compléter les réponses en
conséquence.

| Fonction (si livrée)                                           | Apple — type de données à ajouter                                                            | Google — type à ajouter                                            | Remarque                                                                                                           |
| -------------------------------------------------------------- | -------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------ |
| Rapports de plantage (opt-in, sans contenu, 90 jours proposés) | Diagnostics → Données de plantage ; non lié à l'identité ; finalité Fonctionnalités          | Infos et performances de l'app → Journaux de plantage ; facultatif | Fait basculer le scénario A en « données collectées ».                                                             |
| Statistiques d'usage (opt-in)                                  | Données d'utilisation → Interactions avec le produit ; Analytique                            | Activité dans les apps → Interactions ; Analyse                    | Ne pas lier à l'identité ; aucun pistage.                                                                          |
| Comptes hébergés (adresse e-mail)                              | Coordonnées → Adresse e-mail ; liée à l'identité ; Fonctionnalités                           | Infos personnelles → Adresse e-mail                                | Revoir alors « sans compte » en « sans compte obligatoire » dans toutes les fiches.                                |
| IA distante (opt-in, fonction par fonction)                    | Contenu utilisateur → Autre contenu ; partagé avec le fournisseur ; Fonctionnalités          | Messages / Autre contenu ; **partagé** avec un tiers               | Le texte envoyé n'est pas chiffré de bout en bout : aucune exemption. Interdit dans les fiches tant que non livré. |
| Liens de partage                                               | À qualifier : clé dans le fragment d'URL, non transmise au serveur                           | À qualifier (exemption E2EE possible si l'éditeur n'a pas la clé)  | Faire valider le mécanisme réel avant de répondre.                                                                 |
| Webhooks                                                       | Aucune collecte par l'éditeur si l'envoi va directement de l'appareil au destinataire choisi | Idem ; sinon « partage » vers le destinataire                      | À vérifier dans l'implémentation.                                                                                  |

## Apple — App Privacy (« Confidentialité de l'app »)

Définition retenue (Apple, App Privacy Details) : « collecter » signifie transmettre des données
hors de l'appareil d'une façon qui permet à l'éditeur ou à ses partenaires d'y accéder plus
longtemps que nécessaire pour traiter la requête en temps réel. Les données traitées uniquement
sur l'appareil ne sont pas collectées ; une adresse IP ou un jeton envoyés sans être conservés
n'ont pas à être déclarés.

**Scénario A** — réponse : _« Nous ne collectons pas de données depuis cette app »_ →
étiquette **« Données non collectées »**.

**Scénario B** — réponse proposée (à valider) :

| Type de données                                                                                            | Collecté                                                                                                                                           | Lié à l'identité   | Pistage | Finalité                 |
| ---------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------ | ------- | ------------------------ |
| Identifiants → ID de l'appareil (identifiant de nœud aléatoire, sans lien avec l'identifiant publicitaire) | Oui, si l'utilisateur active la synchronisation                                                                                                    | Non (aucun compte) | Non     | Fonctionnalités de l'app |
| Contenu utilisateur (enveloppes chiffrées de bout en bout)                                                 | À trancher juridiquement : le contenu est illisible par l'éditeur ; Apple ne prévoit pas d'exemption explicite pour le chiffrement de bout en bout | Non                | Non     | Fonctionnalités de l'app |

Aucun pistage : pas d'App Tracking Transparency à demander.

Source : <https://developer.apple.com/app-store/app-privacy-details/>

## Google Play — section « Sécurité des données »

Définitions retenues (Play Console, Data safety) : « collecter » signifie transmettre des données
hors de l'appareil ; le traitement uniquement sur l'appareil et le traitement éphémère (en
mémoire, le temps de la requête) ne sont pas à déclarer ; **les données envoyées hors de
l'appareil mais illisibles par quiconque autre que l'expéditeur et le destinataire grâce au
chiffrement de bout en bout n'ont pas à être déclarées** (aucun intermédiaire, éditeur compris,
ne doit détenir les clés). Le formulaire doit être rempli même si aucune donnée n'est collectée.

| Question                                                                          | Scénario A | Scénario B                                                                                                                                                 |
| --------------------------------------------------------------------------------- | ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| L'app collecte-t-elle ou partage-t-elle des types de données utilisateur requis ? | **Non**    | **Oui**                                                                                                                                                    |
| Types collectés                                                                   | —          | Identifiants de l'appareil ou autres (identifiant de nœud, jeton d'espace). Contenu : non déclaré au titre de l'exemption « chiffrement de bout en bout ». |
| Données partagées avec des tiers                                                  | —          | Non (un hébergeur agissant pour le compte de l'éditeur est un prestataire, pas un tiers)                                                                   |
| Collecte facultative ?                                                            | —          | Oui : uniquement si la synchronisation est activée                                                                                                         |
| Finalité                                                                          | —          | Fonctionnalités de l'app                                                                                                                                   |
| Chiffrées en transit                                                              | —          | Oui (sous réserve de H7)                                                                                                                                   |
| Moyen de demander la suppression                                                  | —          | Oui : suppression de l'espace depuis l'app (à livrer) et adresse de contact                                                                                |

Source : <https://support.google.com/googleplay/android-developer/answer/10787469>

## Microsoft Store — propriétés de l'app

Partner Center demande si l'app accède à des informations personnelles, les collecte ou les
transmet ; si oui, une URL de politique de confidentialité valide est obligatoire, et Microsoft
peut l'exiger de toute façon selon les capacités déclarées dans le paquet.

- Scénario A : « Non », mais **fournir quand même l'URL** de la politique de confidentialité
  (cohérence entre stores, et capacités réseau déclarées par l'app).
- Scénario B : « Oui » et URL obligatoire.

Source : <https://learn.microsoft.com/en-us/windows/apps/publish/publish-your-app/msix/enter-app-properties>

## Cohérence avec la copie des fiches

Les fiches affirment « vos données restent sur votre appareil », « sans compte », « sans
publicité » et « le serveur relais ne voit jamais le contenu ». Ces phrases ne sont exactes
que si H1 à H4 sont vraies dans le build soumis. En scénario B, la formulation « le serveur
relais ne voit jamais le contenu » reste exacte (H4) ; ne jamais écrire « aucune donnée ne
quitte votre appareil » dès qu'une synchronisation existe.

## Points de conformité à faire valider

| Sujet                                                                                       | Gravité                                          | Action                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| ------------------------------------------------------------------------------------------- | ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Politique de confidentialité non publiée (brouillon : `docs/legal/PRIVACY_POLICY_DRAFT.md`) | Élevée (bloquante pour Apple, Google, Microsoft) | Finaliser et publier la politique (scénarios A/B, fonctions facultatives ci-dessus, RGPD : base légale, droits, conservation des enveloppes), puis renseigner l'URL dans `urls.md`.                                                                                                                                                                                                                                                                                 |
| Statut RGPD des métadonnées H5 (identifiants pseudonymes)                                   | Moyenne                                          | Faire qualifier par un juriste : données personnelles pseudonymes ou non ; durée de conservation ; registre des traitements.                                                                                                                                                                                                                                                                                                                                        |
| Contrôle des exportations et déclaration française de moyens de cryptologie                 | Moyenne                                          | Apple rappelle que la France contrôle l'import/export d'apps de chiffrement (notamment « stockage sécurisé » et « communications sécurisées ») ; les coffres et la synchronisation chiffrée sont concernés. Faire vérifier auprès de l'ANSSI et renseigner la conformité d'exportation dans App Store Connect (`ITSAppUsesNonExemptEncryption`). Source : <https://developer.apple.com/help/app-store-connect/manage-app-information/overview-of-export-compliance> |
| Suppression des données côté relais                                                         | Moyenne (scénario B)                             | Livrer une suppression d'espace qui efface aussi les enveloppes stockées.                                                                                                                                                                                                                                                                                                                                                                                           |
