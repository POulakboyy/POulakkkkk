# Fiches des stores et ASO — POuxis

Textes de présentation (français et anglais) pour l'App Store (iPhone, iPad), le Mac App Store,
Google Play, le Microsoft Store et, en option, Flathub ; questionnaires de classification et de
confidentialité ; plan des captures et des vidéos ; notes pour les équipes de revue.

## Contenu

| Fichier                               | Rôle                                                                                                                  |
| ------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| `LIMITS.md`                           | Limites de champs et règles éditoriales vérifiées dans la documentation officielle (sources et date de consultation). |
| `listings/apple-ios.{fr,en}.md`       | Nom, sous-titre, texte promotionnel, mots-clés, description, modèle de nouveautés — iPhone et iPad.                   |
| `listings/apple-macos.{fr,en}.md`     | Texte promotionnel, mots-clés et description de la plateforme macOS.                                                  |
| `listings/google-play.{fr,en}.md`     | Titre, description courte, description complète.                                                                      |
| `listings/microsoft-store.{fr,en}.md` | Description courte, description, fonctionnalités, légendes de captures, titre de bande-annonce.                       |
| `listings/flathub.md`                 | Nom, résumé, description et légendes AppStream (facultatif).                                                          |
| `aso-keywords.md`                     | Méthode de recherche de mots-clés, grille de sélection, jeux retenus.                                                 |
| `categories.md`                       | Catégories par store et justification.                                                                                |
| `age-rating.md`                       | Réponses aux questionnaires Apple et IARC.                                                                            |
| `privacy-labels.md`                   | Étiquette Apple, section « Sécurité des données » Google Play, déclaration Microsoft, points de conformité.           |
| `screenshots.md`                      | Histoire des captures, écrans à montrer, légendes de 3 à 5 mots par plateforme (téléphone, tablette, bureau).         |
| `video-specs.md`                      | Spécifications vérifiées des vidéos par store.                                                                        |
| `app-review-notes.md`                 | Notes pour Apple App Review, accès à l'app Google Play, notes de certification Microsoft.                             |
| `urls.md`                             | URL d'assistance, marketing et confidentialité à créer.                                                               |
| `claims-register.md`                  | Registre des affirmations : chaque capacité annoncée doit être vérifiée dans le build soumis.                         |
| `check-limits.mjs`                    | Validation automatique de tous les champs.                                                                            |

## Vérifier les textes

```sh
node docs/marketing/stores/check-limits.mjs              # erreurs et avertissements seulement
node docs/marketing/stores/check-limits.mjs --verbose    # chaque champ avec son décompte
node docs/marketing/stores/check-limits.mjs --self-test  # tests internes du script, puis validation
```

Le script (Node ≥ 22, sans dépendance) lit les blocs `<!-- field: … -->` de tous les fichiers
Markdown du dossier et vérifie : longueur en caractères (points de code après NFC) ou en octets
(mots-clés et notes Apple) ; nombre et longueur des éléments de liste ; 3 à 5 mots par légende ;
règles strictes de Google Play (ni majuscules d'insistance, ni ponctuation répétée, ni
« nouveau », ni saut de ligne) ; mots-clés Apple (pas d'espace inutile, pas de doublon, chaque
terme > 2 caractères, pas de nom de l'app, avertissement en cas de redite du nom ou du
sous-titre) ; absence d'allégations invérifiables (« n° 1 », « meilleur », chiffres
d'utilisateurs, avis), d'appels à l'action, d'émojis, de noms de produits tiers, de marqueurs
inachevés et, dans les champs Apple, de mention d'une autre plateforme ; présence des champs
obligatoires et parité entre les versions française et anglaise. Code de sortie 1 en cas
d'erreur.

## Positionnement et ton

**Promesse** : _une journée qui se planifie seule, une concentration protégée, des idées qui
restent à vous._ La confidentialité locale n'est pas un argument technique de fin de page : elle
figure dès la première phrase de chaque description, car c'est le différenciateur que les
concurrents installés ne peuvent pas reprendre sans refondre leur architecture.

Ton (d'après la charte d'écriture UX) : clair, bref, concret, chaleureux sans familiarité.

- Commencer par ce que la personne obtient, puis dire comment (« Écrivez comme vous parlez :
  … devient un événement daté »), jamais l'inverse.
- Un exemple réel vaut mieux qu'un adjectif : pas de « puissant », « intelligent »,
  « révolutionnaire ».
- Vocabulaire stable, identique à l'interface : Aujourd'hui, Tâches, Calendrier, **Toile**,
  Idées, **Bilan**, Capturer, mode Focus (voir `apps/pouxis/src/i18n/fr/nav.ts`).
- Vouvoiement en français ; tutoiement exclu.
- Pas de majuscules d'insistance, pas d'émoji, pas de point d'exclamation.

Notes de localisation : les sections reposent sur des verbes (« Planifier », « Avancer »,
« Penser », « Comprendre ») faciles à traduire ; éviter les jeux de mots. Prévoir 20 à 30 %
d'expansion pour les langues futures : les champs français les plus serrés sont le nom Apple
(29/30) et le titre et la description courte Google Play (30/30 et 80/80). En anglais
britannique, adapter « organize/organizer » et « color ».

## Schémas observés dans les fiches de référence

Structure relevée le 4 novembre 2026 sur trois fiches de productivité de référence
(App Store US : Structured, Things 3 ; Google Play US : Todoist). Seule la structure
est reprise, jamais le texte.

1. **Nom + descripteur** : marque suivie de deux ou trois mots de catégorie (« planificateur »,
   « tâches », « calendrier ») — repris pour POuxis.
2. **Ouverture** : une phrase de bénéfice, puis une phrase de différenciation — repris.
3. **Sections thématiques** nommées par un bénéfice, suivies de listes à puces courtes — repris.
4. **Plateformes et synchronisation** mentionnées explicitement — repris (sans nommer d'autres
   plateformes sur Apple).
5. **Tarifs et abonnements** détaillés dans la description — à ajouter quand le modèle
   économique sera arrêté (Microsoft le recommande aussi).
6. **Preuve sociale** (notes, nombre d'utilisateurs, récompenses, citations de presse) — **non
   repris** : POuxis n'en a pas, et toute preuve sociale devra être réelle, attribuée et datée.
   Google Play l'interdit en outre dans la description courte, les visuels et les captures.

## Diagnostic marketing (critique)

- ✅ **Forces réelles** : confidentialité locale ; chiffrement de bout en bout prévu (primitives
  dans `core/crypto`, branchement à faire) ; planification automatique concrète et démontrable en une
  capture ; code ouvert.
- ⚠️ **Risques critiques** : périmètre très large (le brief compte 100 fonctions) — une fiche qui
  les énumère toutes ne convainc personne ; marque sans notoriété ni preuve sociale ; modèle
  économique non défini, ce qui empêche toute mention tarifaire et l'emploi de « gratuit ».
- ❌ **Failles à corriger avant soumission** : politique de confidentialité non publiée (brouillon
  dans `docs/legal/`), aucune URL d'assistance, dépôt public à ouvrir (licence AGPL-3.0-or-later
  présente), vues de l'app encore en construction.
- 🔄 **Recommandations** : (1) n'annoncer que les fonctions cochées dans `claims-register.md` ;
  (2) tester en priorité, via les pages produit personnalisées ou tests A/B des stores, deux
  angles d'ouverture : « journée planifiée » contre « idées privées » ; (3) revoir mots-clés et
  textes promotionnels chaque trimestre à partir des impressions par terme.

**À ne pas faire** : citer des études ou des chiffres non vérifiés ; promettre le « Ne pas
déranger » système ; employer des noms de concurrents (même en comparaison) ; écrire « aucune
donnée ne quitte votre appareil » alors qu'une synchronisation existe.

## Avant chaque soumission

1. Cocher les lignes de `claims-register.md` dans le build soumis ; retirer les phrases non
   tenues.
2. Revérifier les pages citées dans `LIMITS.md` (les règles évoluent).
3. Renseigner les URL de `urls.md` et les `{{PLACEHOLDERS}}` de `app-review-notes.md`.
4. Valider `privacy-labels.md` et `age-rating.md` avec une personne qualifiée.
5. Lancer `node docs/marketing/stores/check-limits.mjs` : zéro erreur.
