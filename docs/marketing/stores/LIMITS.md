# Limites et règles vérifiées des fiches de store

Toutes les valeurs ci-dessous ont été relevées dans la documentation officielle **le 4 novembre
2026**. Elles alimentent `check-limits.mjs`. Avant chaque soumission, revérifier les pages :
les stores modifient leurs règles sans préavis.

Convention de comptage : sauf mention « octets », une limite est exprimée en **caractères**
(points de code Unicode après normalisation NFC). Apple exprime les **mots-clés** et les **notes
de revue** en **octets** : en UTF-8, une lettre accentuée (é, à, ç) compte pour 2 octets.

## Apple — App Store Connect (iPhone, iPad, Mac)

| Champ                               | Limite                          | Remarques                                                                                                                                     |
| ----------------------------------- | ------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| Nom (Name)                          | 2 à 30 caractères               | Localisable. Modifiable seulement avec une nouvelle version.                                                                                  |
| Sous-titre (Subtitle)               | 30 caractères                   | Affiché sous le nom.                                                                                                                          |
| Texte promotionnel                  | 170 caractères                  | Modifiable sans nouvelle soumission.                                                                                                          |
| Description                         | 4 000 caractères                | Texte brut, HTML non pris en charge. Utilisée pour les résultats des moteurs de recherche web.                                                |
| Mots-clés                           | 100 octets                      | Chaque mot-clé > 2 caractères. Ne pas répéter le nom de l'app ni celui de l'éditeur (déjà indexés). Noms d'autres apps ou sociétés interdits. |
| Nouveautés (What's New)             | 4 000 caractères                | Indisponible pour la première version, obligatoire ensuite.                                                                                   |
| URL d'assistance                    | —                               | Doit mener à de vraies coordonnées de contact. Obligatoire.                                                                                   |
| URL marketing                       | —                               | Facultative.                                                                                                                                  |
| URL de politique de confidentialité | —                               | Obligatoire pour iOS et macOS.                                                                                                                |
| Notes pour la revue (Notes)         | 4 000 octets                    | Toute langue.                                                                                                                                 |
| Captures d'écran                    | 1 à 10 par taille d'écran       | .jpeg, .jpg, .png.                                                                                                                            |
| Aperçus vidéo (App Previews)        | 3 max. par taille et par langue | Voir `video-specs.md`.                                                                                                                        |

Règles de contenu retenues (App Review Guidelines) :

- **2.3.3** — les captures montrent l'app en usage, pas seulement un écran titre, de connexion
  ou de démarrage.
- **2.3.4** — les aperçus vidéo n'utilisent que des captures vidéo de l'app elle-même.
- **2.3.7** — nom unique, mots-clés exacts ; pas de marques déposées, de noms d'apps populaires,
  d'informations tarifaires ni de termes hors sujet.
- **2.3.10** — pas de noms, icônes ou visuels d'autres plateformes mobiles ou d'autres places de
  marché dans l'app ou ses métadonnées.
- **2.1** — toute nouveauté est décrite précisément dans les notes pour la revue.
- Si l'app n'a pas de fonctionnalités significatives liées à un compte, elle doit être
  utilisable sans connexion (POuxis l'est par conception).

Sources :

- <https://developer.apple.com/help/app-store-connect/reference/app-information/app-information>
- <https://developer.apple.com/help/app-store-connect/reference/app-information/platform-version-information>
- <https://developer.apple.com/help/app-store-connect/reference/app-information/screenshot-specifications>
- <https://developer.apple.com/help/app-store-connect/reference/app-information/app-preview-specifications>
- <https://developer.apple.com/app-store/review/guidelines/>

## Google Play — Play Console

| Champ                                   | Limite                                                                       | Remarques                                                                                                                                                 |
| --------------------------------------- | ---------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Nom de l'app                            | 30 caractères                                                                | Un nom localisé par langue. Limites identiques pour caractères pleine et demi-chasse.                                                                     |
| Description courte                      | 80 caractères                                                                | Première ligne visible de la fiche.                                                                                                                       |
| Description complète                    | 4 000 caractères                                                             |                                                                                                                                                           |
| Adresse e-mail de contact               | —                                                                            | Obligatoire ; site web recommandé.                                                                                                                        |
| Icône                                   | 512 × 512 px, PNG 32 bits (alpha), 1 024 Ko max.                             | Ni badge ni texte suggérant un classement ou un prix.                                                                                                     |
| Image de présentation (feature graphic) | 1 024 × 500 px, JPEG ou PNG 24 bits sans alpha                               | Éviter les zones de recadrage ; éviter blanc pur, noir, gris foncé.                                                                                       |
| Captures d'écran                        | min. 2 au total ; JPEG ou PNG 24 bits ; côté 320 à 3 840 px ; ratio max. 2:1 | Pour les apps : au moins 4 captures ≥ 1 080 px (9:16 portrait ≥ 1 080 × 1 920). Texte d'accroche ≤ 20 % de l'image. Texte alternatif pour chaque capture. |
| Vidéo d'aperçu                          | 1 URL YouTube                                                                | Publique ou non répertoriée, publicités désactivées, sans restriction d'âge, sans paramètre (timecode).                                                   |
| Tags                                    | 5 max.                                                                       |                                                                                                                                                           |

Règles de contenu retenues (politique Métadonnées + guide des éléments de fiche) :

- Description courte : pas de mention de performance, de classement, de récompense, de
  témoignage, de prix ni de promotion (« Best », « #1 », « Top », « New », « Discount »,
  « Sale », « Million Downloads ») ; pas d'appel à l'action (« download now », « install now »,
  « try now ») ; pas d'émoji, de caractères spéciaux, de ponctuation répétée ni de retour à la
  ligne ; pas de majuscules d'insistance.
- Titre, icône, nom du développeur : pas d'émoji ni de majuscules intégrales (hors marque), pas
  d'indication de classement, de prix ou de programme Google Play.
- Violations courantes citées : témoignages non attribués, comparaisons de marques, blocs ou
  listes de mots-clés.
- Captures : pas de mains ni d'appareils, pas de badge de store, pas d'appel à l'action, barre
  d'état propre.

Sources :

- <https://support.google.com/googleplay/android-developer/answer/9859152>
- <https://support.google.com/googleplay/android-developer/answer/9866151>
- <https://support.google.com/googleplay/android-developer/answer/9898842>
- <https://support.google.com/googleplay/android-developer/answer/9859673>

## Microsoft Store — Partner Center (MSIX)

| Champ                                | Limite                                                                      | Remarques                                                                                                                                                    |
| ------------------------------------ | --------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Nom du produit                       | nom réservé                                                                 | Choisi parmi les noms réservés ; doit correspondre au manifeste du paquet.                                                                                   |
| Description                          | 10 000 caractères                                                           | Obligatoire, texte brut. Pas de HTML, de code ni d'URL.                                                                                                      |
| Nouveautés                           | 1 500 caractères                                                            | Laisser vide à la première soumission.                                                                                                                       |
| Fonctionnalités du produit           | 20 max., 200 caractères chacune                                             | Affichées en liste à puces : ne pas ajouter de puces.                                                                                                        |
| Description courte                   | 1 000 caractères                                                            | Seuls ~270 caractères affichés dans certaines vues. À défaut, le premier paragraphe (500 caractères) de la description est repris.                           |
| Titre court                          | 50 caractères                                                               | Surtout Xbox.                                                                                                                                                |
| Titre de tri / titre vocal           | 255 caractères                                                              | Facultatifs.                                                                                                                                                 |
| Configuration requise supplémentaire | 11 éléments max., 200 caractères chacun                                     |                                                                                                                                                              |
| Captures d'écran (bureau)            | 1 obligatoire, 10 max. ; PNG ≤ 50 Mo ; ≥ 1 366 × 768, jusqu'à 3 840 × 2 160 | Légende de 200 caractères max. par capture. 4 captures recommandées par famille d'appareils.                                                                 |
| Logo de vignette 1:1                 | 300 × 300 px                                                                | Facultatif.                                                                                                                                                  |
| Bandes-annonces                      | MP4 ou MOV, 1 920 × 1 080, < 2 Go, 60 s ou moins recommandé                 | Vignette PNG 1 920 × 1 080, titre ≤ 255 caractères, sous-titres WebVTT < 50 Mo. Affichées en tête de fiche seulement avec une image « Super hero art » 16:9. |
| Politique de confidentialité         | URL                                                                         | Obligatoire si l'app accède à des données personnelles, les collecte ou les transmet.                                                                        |

Point non confirmé : la page actuelle « Store listing info » ne décrit plus de champ « termes de
recherche ». Ne pas en préparer tant que Partner Center ne l'affiche pas.

Sources :

- <https://learn.microsoft.com/en-us/windows/apps/publish/publish-your-app/msix/add-and-edit-store-listing-info>
- <https://learn.microsoft.com/en-us/windows/apps/publish/publish-your-app/msix/screenshots-and-images>
- <https://learn.microsoft.com/en-us/windows/apps/publish/publish-your-app/msix/enter-app-properties>

## Flathub (Linux, facultatif)

| Champ            | Règle                                                                                                                                                      |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Nom              | Idéalement ≤ 15 caractères, obligatoirement < 20. Nom seul, sans descriptif.                                                                               |
| Résumé (summary) | Idéalement 10 à 25 caractères, 35 max. ; non technique ; casse de phrase ; sans point final ; ne répète pas le nom.                                        |
| Description      | 3 à 6 lignes d'environ 70 caractères (jusqu'à ~10 pour une grosse app) ; listes ≤ 10 éléments ; ne répète pas le résumé.                                   |
| Captures         | Fenêtre seule, contenu réaliste (pas d'état vide), à jour ; chaque capture a une légende d'une phrase, sans point final, ne commençant pas par un chiffre. |
| Notes de version | Pour chaque version, 2 à 3 phrases orientées utilisateur.                                                                                                  |

Source : <https://docs.flathub.org/docs/for-app-authors/metainfo-guidelines/quality-guidelines>
