# URL et coordonnées à renseigner

Aucune de ces adresses n'existe encore. Remplacer chaque `{{…}}` par une URL définitive en
HTTPS **avant** la première soumission ; une même URL peut servir tous les stores.

| Clé                        | Usage                             | Obligatoire pour                                                                                                                | Contenu minimal de la page                                                                                                                                                   |
| -------------------------- | --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `{{SUPPORT_URL}}`          | URL d'assistance                  | Apple (obligatoire), Microsoft (coordonnées d'assistance)                                                                       | De vraies coordonnées de contact (adresse e-mail, et selon le droit local adresse postale ou téléphone) : Apple l'exige. FAQ, signalement de bug, lien vers le dépôt public. |
| `{{MARKETING_URL}}`        | URL marketing                     | Apple (facultative), site web Google Play et Microsoft                                                                          | Page produit du site `website/`.                                                                                                                                             |
| `{{PRIVACY_POLICY_URL}}`   | Politique de confidentialité      | Apple iOS et macOS (obligatoire), Google Play (obligatoire), Microsoft (obligatoire si données personnelles, recommandée sinon) | Politique alignée sur `privacy-labels.md` (scénarios A/B).                                                                                                                   |
| `{{SUPPORT_EMAIL}}`        | Adresse e-mail de contact         | Google Play (obligatoire), Microsoft                                                                                            | Boîte surveillée, réponse sous quelques jours ouvrés.                                                                                                                        |
| `{{REVIEW_CONTACT_EMAIL}}` | Contact des équipes de revue      | Apple (App Review Information)                                                                                                  | Personne joignable pendant la revue.                                                                                                                                         |
| `{{REVIEW_RELAY_URL}}`     | Relais de synchronisation de test | Notes de revue                                                                                                                  | Relais dédié à la revue, données effacées après validation.                                                                                                                  |
| `{{SOURCE_CODE_URL}}`      | Dépôt public du code              | Description « code source ouvert », page d'assistance                                                                           | Dépôt public avec licence explicite.                                                                                                                                         |
| `{{LICENSE_URL}}`          | Licence                           | Flathub (`project_license`), conditions Microsoft (« Applicable license »)                                                      | Texte de la licence choisie.                                                                                                                                                 |

Proposition de structure (à valider avec le propriétaire de `website/`) :

- `https://<domaine>/support` (fr) et `https://<domaine>/en/support`
- `https://<domaine>/confidentialite` et `https://<domaine>/en/privacy`
- `https://<domaine>/` et `https://<domaine>/en/`

Les URL d'assistance et de confidentialité sont localisables dans App Store Connect : renseigner
la version française pour la fiche `fr-FR` et la version anglaise pour `en-US`.
