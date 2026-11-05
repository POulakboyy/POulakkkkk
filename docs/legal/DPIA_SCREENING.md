# Pré-évaluation de l'analyse d'impact (AIPD / DPIA)

> **Ceci n'est pas un avis juridique — à faire valider par un·e avocat·e.** Ce document
> détermine si une analyse d'impact relative à la protection des données (RGPD art. 35) est
> requise ; il ne constitue pas lui-même une AIPD.

État au 4 novembre 2026. Responsable de la pré-évaluation : [À COMPLÉTER].

## 1. Méthode

1. **Art. 35(3) RGPD** : cas où l'AIPD est toujours requise — (a) évaluation systématique et
   approfondie fondée sur un traitement automatisé, y compris le profilage, servant de base à
   des décisions produisant des effets juridiques ou significatifs ; (b) traitement à grande
   échelle de catégories particulières (art. 9) ; (c) surveillance systématique à grande
   échelle d'une zone accessible au public.
2. **Critères du CEPD** (lignes directrices WP248 rév. 01, reprises par le CEPD) : une AIPD
   est en principe requise lorsque **deux critères ou plus** sont réunis parmi les neuf
   suivants : C1 évaluation ou notation ; C2 décision automatisée à effet juridique ou
   similaire ; C3 surveillance systématique ; C4 données sensibles ou à caractère hautement
   personnel ; C5 grande échelle ; C6 croisement de jeux de données ; C7 personnes
   vulnérables (dont salarié·es et mineur·e·s) ; C8 usage innovant ou nouvelle solution
   technologique ; C9 traitement qui empêche d'exercer un droit ou de bénéficier d'un
   service.
3. **Listes nationales** ⚖️ des types d'opérations exigeant une AIPD : **FR** liste publiée
   par la CNIL ; **BE** liste adoptée par l'APD. À consulter dans leur version en vigueur
   selon le siège retenu.

Seuls les traitements **effectués par l'éditeur** (ou pour son compte) sont évalués. Les
traitements purement locaux, auxquels l'éditeur n'a pas accès, n'en relèvent pas ; leur
conception est encadrée par [`PRIVACY_BY_DESIGN.md`](PRIVACY_BY_DESIGN.md).

## 2. Résultats

| Traitement                                                | Critères réunis                                                         | Art. 35(3)                        | AIPD                                                                                   | Commentaire                                                                                                     |
| --------------------------------------------------------- | ----------------------------------------------------------------------- | --------------------------------- | -------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| Relais de synchronisation (contenu chiffré + métadonnées) | C5 possible                                                             | non                               | **non requise**                                                                        | Contenu illisible ; métadonnées minimales ; pas d'IP journalisée. Documenter cette conclusion dans le registre. |
| Liens de partage (3.10)                                   | —                                                                       | non                               | **non requise**                                                                        | Chiffré avec la clé du lien, expiration obligatoire.                                                            |
| Comptes, support, signatures DCO                          | —                                                                       | non                               | **non requise**                                                                        | Traitements courants.                                                                                           |
| Rapports de plantage opt-in                               | —                                                                       | non                               | **non requise**                                                                        | Sans contenu, consentement.                                                                                     |
| IA distante fournie par l'éditeur (2.2, 4.8, 6.12)        | C4 (contenu personnel), C8 (technologie nouvelle), C5 si adoption large | non                               | **requise si lancée**                                                                  | Transfert probable hors EEE ; contenu potentiellement sensible.                                                 |
| IA distante avec la clé personnelle de l'utilisateur·rice | —                                                                       | non                               | **non requise** (éditeur non responsable)                                              | Information préalable obligatoire dans l'interface.                                                             |
| Ingestion d'e-mails (2.10)                                | C4, C5, C6 (contenu de tiers croisé avec les tâches), C8                | non                               | **requise**                                                                            | Contenu en clair côté serveur, données de tiers non informés.                                                   |
| Journal d'audit en espace d'entreprise (6.5)              | C3, C7 (salarié·es)                                                     | non                               | **requise**, par l'organisation cliente avec l'assistance de l'éditeur (art. 28(3)(f)) | L'organisation est responsable de traitement ; fournir un modèle d'AIPD.                                        |
| Graphe de connaissances social (6.9)                      | C1, C3 si inféré, C7                                                    | (a) si utilisé pour des décisions | **requise**                                                                            | Conception déclarative obligatoire (`COMPLIANCE.md` § 7.3).                                                     |
| Tagging d'intonation vocale (5.7)                         | C1, C4, C7, C8                                                          | —                                 | **sans objet** : fonction à ne pas développer                                          | Pratique interdite au travail et dans l'éducation (AI Act art. 5(1)(f)).                                        |
| Géolocalisation (2.5)                                     | C4 (localisation) — traitement local                                    | non                               | **non requise** tant que le calcul reste sur l'appareil                                | À réévaluer si des positions étaient un jour transmises.                                                        |
| Webhooks (6.1), SSO (6.14)                                | —                                                                       | non                               | **non requise**                                                                        | Configuration explicite ; transferts à documenter par l'organisation.                                           |

## 3. Conditions de validité des conclusions « non requise »

Ces conclusions supposent que les engagements suivants restent vrais ; toute évolution
contraire impose une nouvelle pré-évaluation :

1. Le contenu synchronisé est chiffré sur l'appareil avant tout envoi.
2. Le relais ne journalise ni adresse IP ni contenu.
3. Aucune inférence (émotion, santé, performance) n'est calculée hors de l'appareil.
4. La télémétrie reste opt-in et sans contenu.
5. Aucune position géographique n'est transmise.

## 4. Suite

| Action                                                              | Échéance                                                                             |
| ------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| Inscrire cette pré-évaluation au registre des traitements (art. 30) | avant l'ouverture du relais public                                                   |
| AIPD complète pour 2.10                                             | avant tout développement                                                             |
| Modèle d'AIPD pour les organisations clientes (6.5, 6.9)            | avant la version 1.0                                                                 |
| AIPD pour l'IA distante fournie par l'éditeur                       | avant son lancement                                                                  |
| Revue annuelle de cette pré-évaluation                              | chaque année et à chaque nouvelle fonction marquée 🔒 ou ⚖️ dans la feuille de route |
