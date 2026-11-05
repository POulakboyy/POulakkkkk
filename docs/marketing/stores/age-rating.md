# Classification par âge — réponses aux questionnaires

Les réponses supposent le périmètre de la 1.0 décrit dans `claims-register.md`. **Toute
fonction qui affiche le Web ouvert, permet d'échanger avec d'autres personnes ou aborde la
santé change la classification** : repasser ce document avant chaque version qui en ajoute une.

## Apple (App Store Connect, valeurs 4+, 9+, 13+, 16+, 18+)

Source : <https://developer.apple.com/help/app-store-connect/reference/app-information/age-ratings-values-and-definitions>
(consultée le 4 novembre 2026). La classification est définie au niveau de l'app et s'applique
à toutes les plateformes.

| Rubrique du questionnaire                                                | Réponse 1.0 | Commentaire                                                                                                                                                                                                                                                            |
| ------------------------------------------------------------------------ | ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Thèmes matures (grossièretés, humour cru, horreur, alcool/tabac/drogues) | Aucun       | Aucun contenu fourni par l'éditeur. Les contraintes créatives aléatoires sont rédigées par l'équipe : les relire pour qu'aucune n'aborde ces thèmes.                                                                                                                   |
| Médical ou bien-être (sujets santé et bien-être, informations médicales) | Non         | Ne pas présenter le Bilan, les séries ou le mode Focus comme un outil de santé (ni TDAH, ni anxiété, ni sommeil). « Sujets santé et bien-être » mènerait à 9+.                                                                                                         |
| Sexualité ou nudité                                                      | Aucune      |                                                                                                                                                                                                                                                                        |
| Violence (fantastique, réaliste, armes)                                  | Aucune      |                                                                                                                                                                                                                                                                        |
| Activités de hasard (concours, jeux d'argent simulés, coffres à butin)   | Aucune      | Le moteur de sérendipité tire des notes au hasard, sans enjeu ni récompense : ce n'est pas une activité de hasard au sens du questionnaire.                                                                                                                            |
| Accès Web illimité                                                       | **Non**     | Point de vigilance : la fonction « nœuds enrichis avec iFrames » (4.4 du brief) ou toute vue Web navigable ferait passer l'app à **16+**. Limiter les intégrations à une liste fermée de domaines ou les laisser hors de la 1.0.                                       |
| Contenu généré par les utilisateurs                                      | Non         | Les données de l'utilisateur ne sont visibles que par lui. Les liens de partage (3.10), s'ils sont livrés, rendent du contenu visible par des tiers : répondre Oui (reste compatible 4+ selon la définition Apple) et prévoir un moyen de signaler ou retirer un lien. |
| Messagerie et chat                                                       | Non         | Les commentaires et canaux vocaux du module 6 ne sont pas dans la 1.0.                                                                                                                                                                                                 |
| Réseaux sociaux                                                          | Non         |                                                                                                                                                                                                                                                                        |
| Publicité                                                                | Non         | Aucune publicité.                                                                                                                                                                                                                                                      |
| Contrôle parental / vérification de l'âge                                | Non         |                                                                                                                                                                                                                                                                        |

**Résultat attendu : 4+.** Le résultat définitif est calculé par App Store Connect à partir des
réponses ; ne pas l'annoncer avant validation.

## Google Play et Microsoft Store (questionnaire IARC)

Google Play impose le questionnaire de classification du contenu de la Play Console ; Microsoft
Store attribue aussi les classifications via un questionnaire dans Partner Center. Le libellé
exact des questions n'a pas été vérifié pour ce document : répondre dans la console avec les
mêmes faits que ci-dessus.

| Thème                                                                  | Réponse 1.0                                                  |
| ---------------------------------------------------------------------- | ------------------------------------------------------------ |
| Type d'app                                                             | Utilitaire / productivité (pas un jeu, pas un réseau social) |
| Violence, peur, sexualité, langage grossier, substances, jeux d'argent | Non                                                          |
| Les utilisateurs peuvent-ils interagir ou échanger du contenu ?        | Non (Oui si les liens de partage sont livrés)                |
| L'app partage-t-elle la position de l'utilisateur avec d'autres ?      | Non (les tags géolocalisés 2.5 ne sont pas dans la 1.0)      |
| Achats numériques                                                      | À déterminer avec le modèle économique                       |
| Accès non restreint à Internet                                         | Non (même remarque que pour Apple)                           |

**Résultat attendu** : classification la plus basse de chaque système (par ex. PEGI 3, ESRB
Everyone). Le certificat IARC fait foi ; ne rien afficher avant de l'avoir reçu.
