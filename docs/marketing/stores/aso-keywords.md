# ASO — méthode de recherche et jeux de mots-clés

## Diagnostic

- **Marque inconnue** : personne ne cherche encore « POuxis ». Le trafic de recherche viendra
  uniquement des termes génériques placés dans le nom, le sous-titre et les mots-clés (Apple), ou
  dans le titre et les descriptions (Google Play).
- **Périmètre très large** (agenda, tâches, toile, idéation, bilan) : le risque est une fiche
  « fourre-tout » qui ne se classe sur rien. Le positionnement retenu est **la journée planifiée
  sans effort + la confidentialité locale** ; la toile et l'idéation viennent en second.
- **Concurrence dense** sur « todo », « planner », « calendar » : ces têtes de requête sont
  gardées pour la pertinence, mais les gains réalistes viendront de requêtes plus spécifiques
  (« planificateur », « pomodoro », « kanban », « offline », « carte mentale »).
- **Aucune donnée de volume n'a été mesurée.** Les tableaux ci-dessous contiennent des colonnes
  à remplir ; aucune estimation chiffrée n'est inventée.

## Ce que chaque store indexe (vérifié)

- **Apple** : l'app est trouvable par son nom et par le nom de l'éditeur ; les mots-clés
  (100 octets) complètent. Il est inutile de répéter le nom ou l'éditeur dans les mots-clés, et
  interdit d'y mettre des noms d'autres apps ou sociétés. La description sert aux résultats des
  moteurs de recherche web. Source : `LIMITS.md`.
- **Google Play** : pas de champ mots-clés. Le guide Microsoft et les règles Play convergent :
  employer les mots-clés naturellement dans le texte, sans liste ni répétition (les « blocs de
  mots » sont une violation citée par la politique Métadonnées).
- **Microsoft Store** : la documentation actuelle recommande d'utiliser les mots-clés
  naturellement dans la description ; aucun champ de termes de recherche n'y est décrit.

Hypothèse non vérifiée (pratique répandue, non documentée officiellement) : Apple indexe aussi le
sous-titre. Elle justifie de ne pas dupliquer les mots du sous-titre dans les mots-clés ;
`check-limits.mjs` signale ces doublons par un avertissement.

## Méthode (à refaire à chaque version majeure)

1. **Graines** : extraire le vocabulaire des tâches à accomplir (« planifier ma journée »,
   « noter une idée », « me concentrer ») depuis `docs/BRIEF.md` et
   `docs/research/PERSONAS.md`, dans les mots des utilisateurs plutôt que dans ceux de l'équipe.
2. **Expansion** : pour chaque graine, relever les suggestions d'autocomplétion de la recherche
   de l'App Store et de Google Play, **sur un appareil réglé dans la langue et le pays cibles**
   (France pour `fr`, États-Unis pour `en`), compte neutre, historique vide.
3. **Popularité** : relever l'indice de popularité de recherche dans Apple Search Ads (console
   annonceur) pour chaque terme candidat ; pour Google Play, s'appuyer sur la présence en
   autocomplétion et, plus tard, sur le rapport d'acquisition « Recherche » de la Play Console.
4. **Difficulté** : noter de 1 à 5 la force des dix premiers résultats (notoriété, nombre
   d'évaluations visibles, adéquation exacte au terme).
5. **Pertinence** : noter de 1 à 5 l'adéquation avec ce que le build livré fait **réellement**
   (registre `claims-register.md`). Un terme non tenu par l'app est éliminé, quelle que soit sa
   popularité.
6. **Sélection** : garder les termes pertinence ≥ 4, puis arbitrer popularité/difficulté ; ne
   jamais employer de marque tierce.
7. **Mesure** : après publication, suivre les impressions par terme (App Store Connect :
   source « Recherche dans l'App Store » ; Play Console : acquisition par recherche) et remplacer
   chaque trimestre les mots-clés sans impression. Un seul champ modifié à la fois pour pouvoir
   attribuer l'effet.

## Grille de sélection (à compléter)

| Terme (fr)    | Terme (en)   | Pertinence (1-5) | Popularité ASA | Difficulté (1-5) | Retenu                           |
| ------------- | ------------ | ---------------- | -------------- | ---------------- | -------------------------------- |
| agenda        | calendar     | 5                | à mesurer      | à mesurer        | nom/sous-titre fr ; mots-clés en |
| tâches        | tasks        | 5                | à mesurer      | à mesurer        | nom                              |
| idées         | ideas        | 4                | à mesurer      | à mesurer        | nom                              |
| focus         | focus        | 5                | à mesurer      | à mesurer        | sous-titre                       |
| carte mentale | mind map     | 4                | à mesurer      | à mesurer        | sous-titre                       |
| planificateur | planner      | 5                | à mesurer      | à mesurer        | mots-clés fr ; sous-titre en     |
| todo / to-do  | todo         | 5                | à mesurer      | à mesurer        | mots-clés                        |
| calendrier    | calendar     | 5                | à mesurer      | à mesurer        | mots-clés fr                     |
| pomodoro      | pomodoro     | 4                | à mesurer      | à mesurer        | mots-clés                        |
| kanban        | kanban       | 4                | à mesurer      | à mesurer        | mots-clés                        |
| notes         | notes        | 3                | à mesurer      | à mesurer        | mots-clés                        |
| organisation  | organizer    | 4                | à mesurer      | à mesurer        | mots-clés                        |
| planning      | schedule     | 4                | à mesurer      | à mesurer        | mots-clés                        |
| productivité  | productivity | 4                | à mesurer      | à mesurer        | mots-clés                        |
| mindmap       | brainstorm   | 4                | à mesurer      | à mesurer        | mots-clés                        |
| hors-ligne    | offline      | 4                | à mesurer      | à mesurer        | mots-clés (mac fr, en)           |
| minuteur      | timer        | 3                | à mesurer      | à mesurer        | mots-clés en                     |
| liste         | list         | 3                | à mesurer      | à mesurer        | mots-clés en                     |

Écartés volontairement : noms de produits concurrents (interdits), « TDAH »/« ADHD » (allégation
de santé que l'app ne peut pas étayer et qui ferait basculer la classification d'âge Apple vers
« santé et bien-être »), « gratuit »/« free » (modèle économique non arrêté ; information
tarifaire interdite dans les métadonnées Apple et la description courte Play), « IA »/« AI »
(aucune fonction d'IA n'est dans le périmètre de la 1.0 ; voir le registre).

## Jeux retenus

| Store                | Champ              | fr                                                                                           | en                                          |
| -------------------- | ------------------ | -------------------------------------------------------------------------------------------- | ------------------------------------------- |
| Apple (iOS et macOS) | Nom                | POuxis : temps, tâches, idées                                                                | POuxis: Time, Tasks & Ideas                 |
| Apple (iOS et macOS) | Sous-titre         | Agenda, focus, carte mentale                                                                 | Planner, focus & mind map                   |
| Apple iOS            | Mots-clés          | voir `listings/apple-ios.fr.md` (95 octets)                                                  | voir `listings/apple-ios.en.md` (97 octets) |
| Apple macOS          | Mots-clés          | `hors-ligne` remplace `planning` (97 octets)                                                 | identiques à iOS                            |
| Google Play          | Titre              | POuxis : agenda, tâches, idées                                                               | POuxis: Planner, Tasks, Ideas               |
| Google Play          | Description courte | journée, concentration, idées                                                                | day, focus, ideas, own device               |
| Microsoft Store      | Description        | termes « agenda », « tâches », « Kanban », « Pomodoro », « hors ligne » placés naturellement | idem en anglais                             |

Les mots-clés Apple sont séparés par des virgules **sans espace** (chaque espace coûte un
octet) ; les lettres accentuées coûtent deux octets, d'où le choix de formes courtes.

## À ne pas faire

- Répéter un même terme dans le nom, le sous-titre et les mots-clés : c'est de la place perdue.
- Changer nom, sous-titre et mots-clés en même temps : l'effet devient impossible à attribuer.
- Écrire la description Google Play comme une liste de mots-clés : violation de la politique
  Métadonnées.
- Promettre une fonction absente du build pour capter une requête : rejet en revue et avis
  négatifs.
