# Politique de confidentialité de POuxis — projet

> **Ceci n'est pas un avis juridique — à faire valider par un·e avocat·e.** Projet de texte
> destiné au public. Les éléments entre crochets `[…]` sont à compléter ; ne pas publier
> avant validation et complétion. Les durées marquées « (proposition) » doivent être
> confirmées par l'équipe produit et refléter le comportement réel du logiciel.

**Version :** [numéro] — **En vigueur le :** [date]

## En bref

- Vos tâches, notes, événements et idées sont **stockés sur votre appareil**.
- Si vous activez la synchronisation, ils sont **chiffrés sur votre appareil** avant
  d'être envoyés. Nous ne détenons pas vos clés : **nous ne pouvons pas lire votre
  contenu**.
- **Pas de publicité, pas de revente de données, pas de traceurs publicitaires.**
- Les statistiques d'usage, les rapports de plantage et l'IA en ligne sont **désactivés
  tant que vous ne les activez pas**.
- Vous pouvez **tout exporter** et **tout supprimer** depuis l'application.

## 1. Qui sommes-nous ?

Le responsable du traitement est :

- **[Nom légal de l'éditeur]**, [forme juridique], [adresse du siège], [numéro
  d'immatriculation : SIREN (France) ou numéro BCE (Belgique)].
- Contact pour la protection des données : [adresse e-mail dédiée].
- [Le cas échéant : délégué·e à la protection des données — coordonnées.]

Si vous utilisez POuxis dans un **espace d'équipe** fourni par votre employeur ou votre
établissement, c'est cette organisation qui est responsable des données de l'espace ; nous
agissons pour son compte. Adressez-lui d'abord vos questions.

Si vous utilisez un **serveur de synchronisation auto-hébergé**, son exploitant est
responsable de ce serveur ; cette politique ne couvre que nos propres services.

## 2. Ce que nous ne voyons jamais

Le contenu que vous créez dans POuxis (tâches, notes, événements, pièces jointes, mémos
vocaux, coffres chiffrés) reste sur vos appareils ou circule chiffré de bout en bout. Nous
n'y avons pas accès, et nous ne pouvons pas le récupérer pour vous si vous perdez à la fois
votre phrase secrète et votre clé de récupération.

## 3. Les données que nous traitons, pourquoi et sur quelle base

| Données                                                                                                         | Pourquoi                                                    | Base légale (RGPD)                                    | Durée de conservation                                                                                   |
| --------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------- | ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| Adresse e-mail du compte [si des comptes hébergés existent]                                                     | créer et gérer votre compte, vous contacter pour le service | exécution du contrat (art. 6(1)(b))                   | durée du compte + 30 jours (proposition)                                                                |
| Contenu synchronisé, **chiffré** (illisible pour nous)                                                          | synchroniser vos appareils                                  | exécution du contrat (art. 6(1)(b))                   | tant que la synchronisation est active ; effacé sous 30 jours après suppression du compte (proposition) |
| Données techniques de synchronisation : identifiants d'espace et d'enveloppe, horodatages, taille approximative | ordonner et livrer vos modifications                        | exécution du contrat (art. 6(1)(b))                   | comme le contenu synchronisé                                                                            |
| Adresse IP au moment de la connexion                                                                            | sécurité et limitation des abus                             | intérêt légitime (art. 6(1)(f)) : protéger le service | utilisée en mémoire, **non enregistrée** dans nos journaux                                              |
| Contenu d'un lien de partage, **chiffré**                                                                       | permettre la consultation par les personnes ayant le lien   | exécution du contrat (art. 6(1)(b))                   | jusqu'à expiration du lien (au plus 365 jours)                                                          |
| Rapports de plantage (sans contenu) — **si vous les activez**                                                   | corriger les erreurs                                        | consentement (art. 6(1)(a))                           | 90 jours (proposition)                                                                                  |
| Statistiques d'usage — **si vous les activez** [à supprimer si aucune n'existe]                                 | comprendre l'usage des fonctions                            | consentement (art. 6(1)(a))                           | [durée]                                                                                                 |
| Nom et adresse figurant dans la signature de vos contributions au code (`Signed-off-by`)                        | documenter l'origine du code open source                    | intérêt légitime (art. 6(1)(f))                       | indéfiniment, dans l'historique public du dépôt                                                         |
| Échanges avec le support                                                                                        | répondre à vos demandes                                     | exécution du contrat ou intérêt légitime              | 2 ans après le dernier échange (proposition)                                                            |

Nous ne prenons **aucune décision automatisée** produisant des effets juridiques à votre
égard et nous ne déduisons **ni vos émotions, ni votre état de santé, ni votre performance**.

## 4. Fonctions qui restent sur votre appareil

Ces fonctions fonctionnent localement ; nous ne recevons aucune donnée :

- **localisation** des tags géolocalisés : votre appareil compare votre position aux lieux
  que vous avez définis ; nous ne recevons ni votre position ni vos trajets ;
- **transcription vocale**, **recherche**, **reconnaissance de texte** dans les images ;
- **minuteur**, statistiques de temps et bilans hebdomadaires.

Les autorisations système (localisation, micro, notifications) ne sont demandées qu'au
moment où vous utilisez la fonction concernée. Vous pouvez les retirer à tout moment dans
les réglages de votre appareil.

## 5. Intelligence artificielle

- Par défaut, les fonctions d'IA fonctionnent **sur votre appareil**.
- Si vous activez un **fournisseur en ligne**, le texte nécessaire à votre demande lui est
  envoyé au moment où vous la faites. Avant l'activation, l'application affiche le nom du
  fournisseur, le pays de traitement, sa durée de conservation et s'il utilise les données
  pour entraîner ses modèles.
  - [Si vous utilisez **votre propre clé** : la relation est directe entre vous et le
    fournisseur, selon ses conditions.]
  - [Si vous utilisez **un fournisseur proposé par nous** : nom, pays, garanties de
    transfert — à compléter.]
- Le contenu de vos coffres chiffrés et de votre bac à sable n'est jamais envoyé.
- Les contenus générés par IA sont signalés comme tels dans l'application.

## 6. Avec qui vos données sont partagées

- **Hébergeur du serveur de synchronisation** : [nom, pays] — il ne voit que des données
  chiffrées et des données techniques.
- **[Prestataire d'e-mails transactionnels, le cas échéant]** : [nom, pays].
- **Fournisseur d'IA** que vous avez activé (section 5).
- Les **personnes à qui vous envoyez un lien de partage** ou que vous invitez dans un
  espace.
- Les autorités, uniquement si la loi nous y oblige ; nous ne pouvons transmettre que ce
  que nous détenons (pas votre contenu en clair).

Nous ne vendons ni ne louons aucune donnée.

## 7. Transferts hors de l'Union européenne

[Nos serveurs sont situés dans l'Union européenne.] Si un prestataire traite des données
hors de l'Espace économique européen, le transfert est encadré par une décision
d'adéquation de la Commission européenne ou par des clauses contractuelles types. [Liste des
prestataires concernés et garanties — à compléter.]

## 8. Sécurité

Chiffrement AES-256-GCM sur l'appareil, clés jamais transmises en clair, serveur qui ne
détient aucune clé de déchiffrement, journaux sans adresse IP ni contenu. Le code est
public et peut être audité : [lien vers le dépôt]. Signaler une vulnérabilité : voir
[`SECURITY.md`](../../SECURITY.md).

En cas de violation de données présentant un risque pour vous, nous prévenons l'autorité de
contrôle dans les 72 heures et vous informons dans les meilleurs délais lorsque la loi
l'exige.

## 9. Vos droits

Vous disposez des droits d'accès, de rectification, d'effacement, de limitation,
d'opposition et de portabilité (RGPD, art. 15 à 21), et du droit de retirer votre
consentement à tout moment, sans effet sur les traitements passés.

Dans l'application [chemins de menu à confirmer avec l'équipe UI] :

- **Exporter** toutes vos données : Réglages › Données › Exporter (archive `.zip` en JSON).
- **Supprimer** votre compte et les données du serveur : Réglages › Compte › Supprimer.
- **Modifier vos choix** (statistiques, rapports de plantage, IA) : Réglages ›
  Confidentialité.

Pour toute autre demande : [adresse e-mail]. Nous répondons dans un délai d'un mois,
prolongeable de deux mois pour les demandes complexes, avec information préalable.

Vous pouvez introduire une réclamation auprès de l'autorité de contrôle :

- [**France** : Commission nationale de l'informatique et des libertés (CNIL),
  `https://www.cnil.fr`]
- [**Belgique** : Autorité de protection des données (APD), `https://www.autoriteprotectiondonnees.be`]

(conserver l'autorité du pays du siège de l'éditeur ; vous pouvez aussi saisir celle de
votre pays de résidence).

## 10. Mineur·e·s

POuxis peut être utilisé par des élèves et des étudiant·e·s. Les fonctions qui reposent sur
le consentement (statistiques, rapports de plantage, IA en ligne) ne peuvent être activées
qu'à partir de [15 ans (France) / 13 ans (Belgique)] ou avec l'accord d'un titulaire de
l'autorité parentale.

## 11. Site web

[Décrire ici la mesure d'audience du site, s'il y en a une, et les cookies déposés. À défaut :
« Le site ne dépose aucun cookie et n'utilise aucun outil de mesure d'audience. »]

## 12. Modifications

Nous vous informerons dans l'application de toute modification importante avant son entrée
en vigueur. Les versions précédentes restent consultables dans l'historique du dépôt.
