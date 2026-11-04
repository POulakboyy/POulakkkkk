# Rédaction de l’interface (UX writing)

Ce document fixe la voix de POuxis, les règles de rédaction des textes de l’interface et la
manière d’ajouter des clés de traduction. Il s’applique à tous les textes visibles ou lus par un
lecteur d’écran : boutons, titres, messages, notifications, états vides, libellés d’accessibilité.

Code : `apps/pouxis/src/i18n/` — `fr/` est canonique, `en/` en est le miroir exact.

---

## 1. Principes

1. **Clair** — dire exactement ce qui se passe, avec les mots de la personne, pas ceux du code
   (« Tâches flottantes », pas « tâches non planifiées sans `scheduled` »).
2. **Court** — le moins de mots possible pour le sens complet. Un bouton : un verbe et un objet.
3. **Cohérent** — un concept, un mot, partout (voir le glossaire, §4).
4. **Utile** — chaque texte aide à décider ou à agir ; sinon, il disparaît.
5. **Humain et bienveillant** — jamais de reproche, jamais de pression, jamais d’alarme inutile.

### Une voix informative, jamais contrôlante

POuxis s’adresse à des personnes qui créent et qui cherchent à se concentrer. La théorie de
l’autodétermination (Deci et Ryan) distingue les retours _informatifs_, qui soutiennent le
sentiment d’autonomie et de compétence, des retours _contrôlants_, qui mettent la pression. Nous
écrivons toujours dans le premier registre :

- on **décrit** un état, on ne le **juge** pas : « Reportée 3 fois », pas « Vous repoussez encore » ;
- on **propose** des options, la personne **choisit** : « Que voulez-vous en faire ? » ;
- le repos et l’inaction sont légitimes : « Rien de coché ? Une semaine de réflexion ou de repos
  compte aussi. » ;
- aucun vocabulaire d’échec : pas de « en retard », « manqué », « échec », « raté ». Une tâche dont
  la date est passée est **à replanifier** ; une série interrompue **recommence**, et « ce qui a
  été fait reste fait ».

Ces interdits sont vérifiés automatiquement par `dictionaries.test.ts`.

### Tutoiement ou vouvoiement : **vous**

POuxis vouvoie. Raisons :

- **Public large et professionnel** : l’app sert aussi au travail (réunions, délégation, équipes) ;
  le vouvoiement ne heurte personne, le tutoiement si.
- **Ton calme** : la chaleur vient du choix des mots et du rythme, pas de la familiarité. Un
  « vous » simple et direct reste chaleureux (« Le reste de la journée vous appartient. »).
- **Cohérence avec les systèmes** : iOS, macOS, Android et Windows vouvoient en français ; les
  boîtes de dialogue natives (autorisations, Ne pas déranger) côtoient nos textes.
- **Stabilité** : passer du « vous » au « tu » plus tard est simple ; l’inverse donne l’impression
  d’un recul.

Règles : « vous » dans les phrases ; impératif à la 2ᵉ personne du pluriel dans les consignes
(« Glissez une tâche ici ») ; infinitif sur les boutons (« Ajouter une tâche »). Les libellés
écrits du point de vue de la personne utilisent « je/mon » seulement quand elle parle
(« Je travaille de 9:00 à 18:00 », « Exporter mes données »).

En anglais : « you », ton naturel et direct, contractions bienvenues (« can’t », « you’re »),
majuscule en début de libellé seulement (_sentence case_).

---

## 2. Matrice de ton

| Situation                      | Ton                      | Exemple FR                                                                         | Exemple EN                                                          |
| ------------------------------ | ------------------------ | ---------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| Succès courant                 | Sobre, factuel           | « Tâche terminée »                                                                 | “Task done”                                                         |
| Succès marquant                | Chaleureux, sans emphase | « Tout est fait. Le reste de la journée vous appartient. »                         | “All done. The rest of the day is yours.”                           |
| Information                    | Neutre, précis           | « Placée à 14:30 »                                                                 | “Placed at 2:30 PM”                                                 |
| Proposition                    | Ouvert, une question     | « Elle dépasse son créneau de 15 min. Décaler la suite ? »                         | “It’s 15 min past its slot. Shift what comes next?”                 |
| Limite choisie par la personne | Rappel, pas interdiction | « C’est la limite que vous avez choisie. »                                         | “That’s the limit you set.”                                         |
| Erreur                         | Rassurant, puis action   | « Synchronisation en pause : le serveur ne répond pas. Nouvel essai automatique. » | “Sync paused: the server isn’t responding. Retrying automatically.” |
| Action irréversible            | Grave, explicite         | « Supprimer toutes les données de cet appareil ? C’est irréversible. »             | “Delete all data on this device? This can’t be undone.”             |
| État vide                      | Invitant, sans pression  | « Une journée ouverte. Rien n’est prévu pour l’instant. »                          | “An open day. Nothing planned yet.”                                 |

Pas de point d’exclamation dans l’interface, sauf citation. Pas d’émoji dans les textes système.

---

## 3. Typographie

### Français

- **Apostrophe typographique** `’` (jamais `'`), **guillemets** `« … »` (jamais `"`), **points de
  suspension** `…` (un seul caractère).
- **Espaces insécables** : elles sont ajoutées automatiquement au chargement des dictionnaires par
  `typography.ts` — tapez des espaces normales :
  - espace insécable (U+00A0) avant `:` et à l’intérieur de `« »` ;
  - espace fine insécable (U+202F) avant `;`, `!`, `?` (convention de l’Imprimerie nationale,
    la même que celle qu’utilise `Intl` dans « 42 % ») ;
  - dans toutes les langues, le séparateur `·` reste collé au mot qui le précède.
    Les valeurs interpolées (titres de tâches…) ne sont jamais modifiées.
- **Heures** : `14:30` (format produit par `Intl`), durées `1 h 30`, `45 min` — toujours via
  `useFormat()`, jamais concaténées à la main.
- **Majuscules** : seulement en début de libellé et pour les noms propres. Pas de Majuscule À
  Chaque Mot. Les noms de fonctions système gardent leur graphie (« Ne pas déranger »).
- Accord : les statuts qualifient « tâche » et sont au féminin (« Terminée », « Archivée »).

### Anglais

- Apostrophe `’`, guillemets `“ ”`, _sentence case_, virgule de série (« a, b, and c », fournie par
  `Intl.ListFormat`).
- Orthographe américaine (« organize », « color ») ; les formats de date et d’heure suivent la
  région du système (`en-GB` obtient 24 h).

---

## 4. Glossaire FR / EN

| Concept                       | Français                     | English                  | À éviter                             |
| ----------------------------- | ---------------------------- | ------------------------ | ------------------------------------ |
| Écran du jour                 | Aujourd’hui                  | Today                    | Dashboard                            |
| Liste à trier                 | Boîte de réception / À trier | Inbox / To sort          | Backlog                              |
| Capturer                      | Capturer                     | Capture                  | Saisir, Input                        |
| Tâche sans heure fixe         | Tâche flottante              | Floating task            | Non planifiée                        |
| Créneau                       | Créneau                      | Slot / Time slot         | Plage horaire (pour une tâche)       |
| Espace entre réunions         | Transition                   | Breather                 | Buffer, Tampon                       |
| Travail profond protégé       | Plage de création            | Maker block / maker time | Bloc maker                           |
| Décaler la suite              | Décaler                      | Shift                    | Propager (trop technique)            |
| Tâche dont la date est passée | À replanifier                | To reschedule            | En retard, Overdue                   |
| Tâche souvent reportée        | Reportée N fois              | Postponed N times        | Usée, Pourrie, Decay                 |
| Limite de priorités           | Priorités par jour           | Priorities per day       | WIP                                  |
| Dépendance                    | Attend / Débloque            | Waiting on / Unlocks     | Bloquée par                          |
| Type de travail               | Création / Organisation      | Creating / Organizing    | Maker / Manager                      |
| Séance de concentration       | Focus (session de focus)     | Focus (session)          | Pomodoro (sauf réglage dédié)        |
| Mode plein écran une tâche    | Focus unique                 | Single focus             | Mode zen (réservé à l’interface zen) |
| Interface qui s’efface        | Interface zen                | Zen interface            | Auto-fading                          |
| Canvas                        | Toile                        | Canvas                   | Board, Canevas                       |
| Élément de toile              | Nœud / Lien                  | Node / Link              | Bulle, Edge                          |
| Bilan                         | Bilan                        | Insights                 | Analytics, Statistiques              |
| Jour de repos couvert         | Joker                        | Joker                    | Gel, Freeze                          |
| Notes abandonnées             | Pistes en sommeil            | Dormant threads          | Dead ends, Impasses                  |
| Brouillon jetable             | Bac à sable                  | Sandbox                  | Corbeille                            |
| Vider sa tête                 | Vider sa tête                | Brain dump               | Déverser                             |
| Photo du planning             | Prévu et réalisé             | Planned vs actual        | Snapshot                             |
| Synchronisation               | Synchronisation              | Sync                     | Cloud                                |
| Thème soleil                  | Suivre le soleil             | Follow the sun           | Daylight                             |
| Thème liseuse                 | Encre électronique           | E-ink                    | —                                    |

Termes de marque : **POuxis** (P et O majuscules), invariable.

---

## 5. Motifs de micro-texte

### Annuler plutôt que confirmer

On agit tout de suite et on propose **Annuler** dans une notification (`common.undo`), à la
manière de Spark : terminer, archiver, supprimer une tâche, retirer une transition… Une boîte de
confirmation n’est utilisée que pour une action **irréversible et massive** (supprimer toutes les
données d’un appareil). Dans ce cas :

- le titre est la question précise : « Supprimer toutes les données de cet appareil ? » ;
- le corps dit la conséquence : « … C’est irréversible. » ;
- les boutons nomment les actions : « Tout supprimer » / « Garder mes données » — jamais
  « OK » / « Annuler » ;
- jamais « Êtes-vous sûr ? ».

### Boutons et appels à l’action

Verbe à l’infinitif + objet : « Ajouter une tâche », « Copier le lien du créneau ». Le libellé
annonce le résultat : « Décaler la suite », pas « Valider ».

### Messages d’erreur

Ce qui se passe → pourquoi (si utile) → que faire. Dire quand les données sont en sécurité.
Jamais de faute rejetée sur la personne, jamais de code brut dans le titre (le code va dans
« Détails techniques ») :

> « Impossible de joindre {host}. Vérifiez l’adresse et votre connexion. »

Erreurs de formulaire : dire ce qui est attendu, avec un exemple (« Entrez une heure, par exemple
14:30 »), pas « Saisie invalide ».

### États vides

Ce que c’est → pourquoi c’est vide → comment commencer, avec une action. Un état vide peut aussi
valoriser l’espace libre : « Gardez de l’espace : c’est aussi un choix. »

### Notifications (toasts)

Participe passé, sans sujet : « Tâche archivée », « 3 tâches décalées de 15 min ». Toujours
associées à **Annuler** quand l’action est réversible.

### Propositions de l’app

L’app suggère, la personne décide. Toujours une option « laisser tel quel » :
`overrun.keep` « Laisser tel quel », `maker.keep` « Garder cet horaire », `decay.keep`.

### Autorisations

Écran d’amorce **avant** la demande du système : un bénéfice concret, la portée exacte
(« Votre position reste sur l’appareil »), un bouton « Autoriser … » et toujours « Pas
maintenant ». En cas de refus, expliquer où changer d’avis, sans insister.

---

## 6. Accessibilité des textes

- Les libellés `aria-label` décrivent la **fonction**, pas l’apparence, et ne répètent pas le rôle
  (« Fermer la boîte de dialogue », pas « Bouton croix »). Ils vivent dans `a11y.*` ou dans des
  clés `…A11y` à côté du texte visible.
- Une information portée par la couleur (usure d’une tâche, heatmap, palette) a toujours un
  équivalent textuel (`decay.a11y`, `insights.energy.cellA11y`, `common.colors.*`).
- Pour les lecteurs d’écran, les durées utilisent le style `long` de `formatDuration`
  (« 1 heure et 30 minutes ») ; les comptes à rebours utilisent `today.focus.remainingA11y`
  plutôt que `4:59`.
- Le glisser-déposer a des annonces clavier (`a11y.dragStart`, `dragMove`, `dragDrop`).
- Phrases courtes, une idée par phrase, vocabulaire courant ; pas d’abréviation non expliquée
  (sauf unités : min, h).
- Prévoir l’allongement : l’anglais est souvent plus court que le français ; tester les mises en
  page avec le français.

---

## 7. Syntaxe des messages (ICU allégé)

Implémentée sans dépendance dans `message.ts` :

| Syntaxe                                                         | Effet                                                                          |
| --------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| `{name}`                                                        | valeur telle quelle                                                            |
| `{n, number}`                                                   | nombre formaté selon la langue (`1 234`)                                       |
| `{n, plural, =0 {…} one {# …} other {# …}}`                     | pluriel selon `Intl.PluralRules` ; `=N` est prioritaire ; `#` = nombre formaté |
| `{n, selectordinal, one {#st} two {#nd} few {#rd} other {#th}}` | ordinaux                                                                       |
| `{x, select, a {…} b {…} other {…}}`                            | choix selon une valeur                                                         |

`other` est obligatoire. Pas d’`offset:` ni d’échappement par apostrophe (nos textes n’utilisent
que `’`). En français, `one` couvre 0 et 1 : prévoyez `=0` pour un texte spécifique (« Aucune
tâche »).

Valeurs dates/durées : passez des chaînes déjà formatées par `useFormat()` (`{duration}`,
`{time}`, `{when}`) — un dictionnaire ne formate jamais une date lui-même.

---

## 8. Ajouter ou modifier des clés

1. Écrire la clé en **français** dans `fr/<namespace>.ts`, dans un groupe sémantique
   (`tasks.decay.letGo`, pas `tasks.button3`). Commenter en anglais les variables non évidentes.
2. Ajouter la même clé dans `en/<namespace>.ts` (typé `typeof fr` : le compilateur signale toute
   clé manquante ou en trop).
3. Nouveau namespace : créer `fr/<ns>.ts` et `en/<ns>.ts`, puis l’enregistrer dans **les deux**
   `index.ts`.
4. Utiliser dans une vue : `const t = useT(); t('tasks.decay.letGo')` ; pour les nombres, dates et
   durées : `const f = useFormat(); t('today.summary.free', { duration: f.duration(90) })`.
5. Vérifier :

   ```sh
   cd apps/pouxis
   npx vitest run src/i18n      # parité fr/en, syntaxe, variables, règles de rédaction
   npx tsc --noEmit -p .
   ```

Les tests refusent : clés ou variables différentes entre langues, message mal formé, `'` ou `"`
ASCII, `...`, guillemets de la mauvaise langue, tutoiement, vocabulaire culpabilisant.

---

## 9. À faire / à ne pas faire

| ✅ À faire                                        | ❌ À éviter                                    |
| ------------------------------------------------- | ---------------------------------------------- |
| « À replanifier »                                 | « En retard »                                  |
| « Reportée 3 fois »                               | « Vous avez encore repoussé cette tâche »      |
| « Décaler la suite ? »                            | « Voulez-vous propager le retard ? »           |
| « Tâche supprimée · Annuler »                     | « Êtes-vous sûr de vouloir supprimer ? »       |
| « Synchronisation en pause »                      | « Erreur de synchronisation ! »                |
| « Entrez une heure, par exemple 14:30 »           | « Format invalide »                            |
| « Nouvelle série. Ce qui a été fait reste fait. » | « Vous avez perdu votre série »                |
| « Pas maintenant »                                | « Non merci, je préfère être moins productif » |
| `t('common.count.tasks', { count })`              | `` `${count} tâche(s)` ``                      |
| `f.duration(90)`                                  | `` `${h}h${m}` ``                              |
