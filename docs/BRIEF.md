# Brief produit — POuxis

> Brief d'origine du fondateur, conservé tel quel. C'est la source de vérité de la vision ; la
> feuille de route (`docs/product/ROADMAP.md`) en dérive le phasage et le statut de chaque
> fonctionnalité.

POuxis est une application open source disponible sur iOS, macOS, Windows et Android. Totalement
synchronisée entre les différentes plateformes.

POuxis possède une multitude de fonctionnalités appuyées sur des études scientifiques afin
d'optimiser son utilisation et sa nécessité.

L'architecture d'un tel système nécessite de fusionner la structuration stricte des données
(graphes, bases relationnelles) et la fluidité des interfaces orientées « flow ». Voici 100
fonctionnalités pensées sous un angle d'ingénierie logicielle et de design d'interaction,
réparties par modules de l'application.

## 1. Moteur Temporel & Calendrier Quantique

1. **Routage dynamique des tâches** : l'algorithme place automatiquement les tâches dans le calendrier en fonction de la durée estimée et de la charge de travail actuelle.
2. **Propagation des retards** : si une tâche planifiée déborde de son créneau, le système décale automatiquement toutes les tâches subséquentes sans casser les rendez-vous fixes.
3. **Heatmap d'énergie** : visualisation des heures de haute productivité basée sur l'historique d'exécution des semaines précédentes.
4. **Vues temporelles non linéaires** : interface de calendrier en spirale continue pour visualiser le temps sans les coupures artificielles des « semaines » ou « mois ».
5. **Gestion multi-fuseaux algorithmique** : alignement visuel des disponibilités des collaborateurs internationaux sur le calendrier principal.
6. **Time-blocking avec « Buffers »** : insertion automatique d'espaces de transition (5 à 15 min) entre des réunions consécutives.
7. **Synchronisation CRDT** (Conflict-free Replicated Data Types) : mise à jour du calendrier en temps réel et hors-ligne, fusionnant les modifications à la reconnexion sans conflits.
8. **Analyseur de langage naturel (NLP)** : saisie type « Réunion projet X mardi prochain 14h-16h avec @paul » convertie instantanément en métadonnées d'événement.
9. **Snapshot de planification** : sauvegarde des versions du calendrier (ce qui était prévu en début de semaine vs. la réalité exécutée).
10. **Tâches flottantes** : tâches attachées à un jour mais sans heure précise, qui s'aimantent aux espaces vides de la journée.
11. **Mode « Hyperfocus » OS-level** : l'événement calendrier déclenche l'API « Ne pas déranger » d'iOS, macOS, Android et Windows.
12. **Estimations de trajet intégrées** : ajout dynamique du temps de déplacement basé sur des API de trafic pour les événements géolocalisés.
13. **Liens profonds d'événements** : chaque créneau de calendrier possède une URL unique permettant de l'ancrer dans des organigrammes ou des notes.
14. **Barre de progression temporelle absolue** : un filigrane visuel en arrière-plan qui indique l'avancement dans l'année, le trimestre ou le sprint en cours.
15. **Protection de la « Maker Schedule »** : l'algorithme refuse ou alerte si une réunion morcelle un bloc continu de 4 heures de travail profond.

## 2. Exécution & Tâches (To-Do List avancée)

1. **Graphe de dépendances asynchrone** : la tâche B ne s'affiche dans la vue du jour que lorsque la tâche A est marquée comme terminée.
2. **Décomposition IA (Subtasking)** : un clic pour transformer « Créer un MVP » en 15 sous-tâches ordonnées.
3. **Usure de la tâche (Task Decay)** : modification de la couleur (vers le gris ou le rouge) des tâches reportées plus de 3 fois.
4. **Matrice d'Eisenhower calculée** : placement automatique des tâches dans une grille Urgence/Importance basée sur la deadline et les tags.
5. **Tags géolocalisés** : déclenchement de la notification de la liste « Courses » ou « Matériel à récupérer » à l'approche des coordonnées GPS définies.
6. **Pomodoro intégré par tâche** : le minuteur enregistre le temps directement dans la base de données de la tâche pour analyse post-mortem.
7. **Parser vocal avec auto-catégorisation** : l'audio enregistré en marchant est transcrit, nettoyé de ses hésitations, et converti en « actionable item ».
8. **Champs de métadonnées programmables** : ajout de colonnes acceptant des formules mathématiques (ex : `Temps estimé * Taux horaire`).
9. **Récurrence avec syntaxe cron/littérale** : support des règles complexes type « le 3ème mardi ouvré de chaque mois ».
10. **Extraction de To-Do depuis le mail** : redirection de courriels vers une adresse dédiée (ex : `inbox-xyz@app.com`) convertis en tâches.
11. **Raccourci de capture universelle** : une combinaison clavier (ex : `Cmd+Shift+Space`) ouvre une ligne de commande par-dessus n'importe quel logiciel pour injecter une tâche.
12. **Générateur de vues Kanban** : transformation dynamique de n'importe quelle liste hiérarchique en tableau de bord type Trello.
13. **Délégation avec Webhook** : assigner une tâche déclenche un événement externe (envoi d'un Slack ou d'un email au collaborateur externe).
14. **Mode « Focus Unique »** : masque tout le système pour n'afficher qu'une seule tâche en plein écran, typographie maximale.
15. **Limiteur de charge cognitive (WIP Limit)** : blocage de l'UI si l'utilisateur tente d'ajouter une 6ème tâche prioritaire dans sa journée.

## 3. Stockage, Fichiers & Multi-plateforme

1. **Architecture « Local-First »** : base de données SQLite/Realm stockée sur l'appareil pour une latence de 0 ms, synchronisée en tâche de fond.
2. **Recherche sémantique vectorielle** : un moteur IA local retrouve un PDF ou une note en tapant un concept (« document sur la croissance ») même si les mots précis n'y sont pas.
3. **Versioning granulaire par bloc** : historique des modifications au niveau du paragraphe, permettant de restaurer un seul morceau de texte.
4. **OCR client-side** : indexation immédiate du texte contenu dans toute image ou PDF importé (sur téléphone et desktop).
5. **Vaults chiffrés (E2EE)** : dossiers protégés par une clé symétrique non stockée sur le serveur pour les documents ultra-sensibles.
6. **Compression asymétrique des assets** : stockage des versions basse résolution pour le mobile et RAW/haute fidélité pour le client desktop.
7. **Aperçus natifs universels** : moteur de rendu WebAssembly pour afficher des fichiers 3D (OBJ), vecteurs (SVG) ou code source (avec coloration) sans logiciel tiers.
8. **Indexation des disques locaux** : création de pointeurs virtuels dans l'app vers des fichiers physiques du PC (évite la duplication des gros fichiers).
9. **Nettoyage automatique (Garbage Collection)** : politique d'archivage des brouillons sans interaction depuis plus de 2 ans.
10. **Partage granulaire par lien** : création d'URL avec dates d'expiration, mots de passe, et option « lecture seule » ou « commentaires autorisés ».
11. **Synchronisation « Low-Bandwidth »** : protocole léger n'échangeant que les deltas textuels (patchs) sur les connexions Edge/3G instables.
12. **APIs d'OS natives pour Drag & Drop** : support des « Share Sheets » iOS/Android et du glisser-déposer profond sous Windows/macOS.
13. **Extraction automatique de métadonnées** : les fichiers audio voient leurs tags (BPM, ID3) transformés en filtres de recherche.
14. **Backlinking de fichiers** : panneau latéral montrant toutes les notes, tâches ou événements où le fichier courant a été cité.
15. **Client CLI** : interaction avec le stockage et les tâches depuis le terminal pour les développeurs.

## 4. Organigrammes, Graphes & Spatialisation

1. **Moteur WebGL pour canvas infini** : rendu graphique à 120 fps permettant d'afficher plus de 10 000 nœuds simultanément sans perte de fluidité.
2. **Algorithme de layout auto-équilibré** : application de forces physiques (« force-directed graph ») pour démêler automatiquement les organigrammes complexes.
3. **Transmutation de données** : glisser une liste de tâches dans le canvas la convertit automatiquement en arbre fonctionnel.
4. **Nœuds interactifs enrichis** : intégration de lecteurs vidéo, blocs de code interactifs ou iFrames directement au sein des bulles de l'organigramme.
5. **Organigramme temporel** : l'axe X du graphe agit comme une timeline ; déplacer un nœud vers la droite change sa date d'échéance.
6. **Support stylets et tablettes (Pencil API)** : dessin vectoriel libre lissé automatiquement et convertible en formes géométriques.
7. **Logique conditionnelle des flux** : connexions programmables (« si nœud A validé, débloquer chemin vers nœud B »).
8. **Génération de squelette par IA** : saisir « Structure organisationnelle startup e-commerce » pour obtenir un organigramme pré-rempli.
9. **Collapsibilité granulaire** : possibilité de replier des branches entières d'un mind-map pour masquer la complexité lors de présentations.
10. **Mode présentation à caméra dynamique** : définition d'un parcours (waypoints) de nœud en nœud fluide (façon Prezi).
11. **Exportation multi-formats** : génération de fichiers SVG, PDF, PNG transparents, ou représentation Markdown (OPML).
12. **Templates de standards d'ingénierie** : bibliothèques intégrées pour la modélisation UML, BPMN, ou architecture AWS.
13. **Minimap radar** : vue satellite persistante en bas de l'écran pour naviguer dans les toiles géantes.
14. **Multi-curseurs en temps réel** : présence visuelle des collaborateurs avec leurs mouvements de souris adoucis par interpolation.
15. **Extraction texte/graphe** : conversion instantanée d'un dessin d'organigramme en un sommaire textuel hiérarchique classique.

## 5. Moteur d'Idéation & Outils Créatifs

1. **Random Connector (« Moteur de Sérendipité »)** : l'algorithme confronte deux notes de la base n'ayant aucun lien direct pour forcer une nouvelle association d'idées.
2. **Moodboard paramétrique** : extraction et génération d'une palette hexadécimale basée sur les images glissées dans une note.
3. **Mode « Machine à écrire stricte »** : désactivation du bouton Retour/Effacer pour empêcher l'autocensure lors des phases de premier brouillon.
4. **Générateur de contraintes divergentes** : bouton injectant des défis aléatoires dans un brief (ex : « Et si l'utilisateur était aveugle ? », « Faire ça en moitié moins de temps »).
5. **Journal de friction** : interface ultra-rapide pour capturer ce qui bloque techniquement ou créativement l'avancée, séparant la frustration du travail productif.
6. **Scrapbook flottant (overlay OS)** : zone de dépôt persistante sur le bureau pour jeter des assets sans avoir l'application complète ouverte.
7. **Tagging d'intonation vocale** : lors des mémos vocaux, l'IA détecte l'enthousiasme de la voix pour marquer automatiquement l'idée avec un tag « Haute énergie ».
8. **Espace « Bac à sable » (Sandbox)** : section dont les données ne polluent pas la recherche universelle, dédiée au brouillon jetable à détruire en fin de session.
9. **Intégration native de banques d'assets** : connexions API directes (Unsplash, Iconify, Google Fonts) avec glisser-déposer sans passer par le navigateur.
10. **Cartes de méthodes d'innovation interactives** : widgets guidant l'utilisateur à travers des protocoles comme SCAMPER ou la méthode des 6 chapeaux.
11. **Éditeur Markdown hybride** : rendu WYSIWYG en temps réel des balises (comme Typora ou Obsidian) pour un formatage propre et sans distraction.
12. **Système de « prompts » visuels** : affichage d'images conceptuelles abstraites en arrière-plan transparent pour stimuler la pensée divergente.
13. **Ambiance sonore générative** : synthèse de bruit blanc, brun, ou d'environnements (café, forêt) intégrée pour isoler l'utilisateur.
14. **Brain Dump ultra-rapide** : fenêtre de texte pur s'ouvrant en < 50 ms depuis n'importe quel écran, vidée dans l'inbox à la fermeture.
15. **Détecteur de « Dead Ends »** : signalement des documents ou concepts entamés et jamais modifiés depuis leur création.

## 6. Collaboration & Écosystème Connecté

1. **Webhooks sortants** : déclenchement d'automatisations REST sur Make ou Zapier à la création, modification ou complétion d'un nœud ou d'une tâche.
2. **API publique GraphQL** : exposition sécurisée d'un endpoint pour permettre la création de scripts ou de clients personnalisés.
3. **Commandes extensibles (« / »)** : moteur de plugins permettant à la communauté d'ajouter des widgets ou blocs via une architecture JavaScript/TypeScript.
4. **Commentaires par blocs** : fil de discussion sur une phrase précise, un pixel d'image ou un nœud d'organigramme.
5. **Audit trail immuable** : journal d'activité enregistrant qui a modifié quoi et quand, critique pour la conformité en entreprise.
6. **Statuts vidéo asynchrones** : enregistrement rapide de l'écran et de la webcam (max 2 min) attachable à une tâche pour éviter une réunion.
7. **Permissions par héritage relationnel** : un utilisateur accède à un fichier car il est assigné à la tâche parente.
8. **Boîte de réception d'équipe unifiée** : agrégateur de toutes les mentions, modifications et demandes de validation avec actions rapides (Approuver/Rejeter).
9. **Graphe de connaissances social** : vue réseau montrant quels membres de l'équipe ont des compétences superposées selon les projets réalisés.
10. **Sondages et votes pondérés** : prise de décision asynchrone intégrée dans la définition d'un projet ou d'une fonctionnalité.
11. **Exportation standardisée (anti vendor lock-in)** : bouton unique générant un `.zip` contenant toutes les données en JSON propre et dossiers physiques.
12. **Mentions contextualisées par IA** : un ping @collaborateur génère un micro-résumé de l'historique du bloc.
13. **Canaux vocaux éphémères (« Walkie-Talkie »)** : salons audio persistants attachés à un projet pour la communication ad hoc.
14. **Authentification SSO (SAML/OAuth2)** : intégration Okta/Google Workspace pour le déploiement en entreprise.
15. **Modèles d'espaces de travail communautaires** : galerie permettant d'importer le workflow complet (tags, dossiers, organigrammes) d'un autre créateur.

## 7. Interfaces, Bien-être & Télémétrie Personnelle

1. **Moteur d'interface Rust/WASM** : architecture front-end compilée assurant une latence d'interaction quasi nulle.
2. **Métriques d'équilibre Création/Organisation** : dashboard quantifiant le ratio de temps passé à « planifier » par rapport au temps passé à « produire des livrables ».
3. **Streaks sans culpabilisation** : suivi des jours consécutifs de création, avec un système de « joker » basé sur le temps de récupération.
4. **UI auto-fading (Interface Zen)** : barres d'outils, menus et ascenseurs perdent leur opacité après 3 secondes d'immobilité de la souris.
5. **Arbre de compétences personnel fractal** : visualisation des domaines d'expertise sous forme d'arbre génératif dont les branches croissent selon les projets achevés.
6. **Design systémique par le temps/météo** : la palette s'adapte à la position du soleil (dark mode progressif) ou à la météo locale.
7. **Retour haptique** : APIs vibratoires sur mobile pour générer des textures physiques lors de la suppression de tâches ou de la liaison de nœuds.
8. **Remapping clavier absolu** : fichier de configuration JSON permettant de modifier 100 % des raccourcis, compatible Vim.
9. **Bilan de santé hebdomadaire automatisé** : rapport chiffré le dimanche soir des « Victoires de la semaine » et des « Points de blocage récurrents ».
10. **Thème « E-Ink »** : mode fort contraste, anti-aliasing désactivé, noir et blanc pur pour les tablettes à encre électronique (Onyx Boox, reMarkable).

## Interface

Minimaliste, inspirée de : **Claude**, **Klarna**, **Musique (iOS)**, **Eyeye**, **Tiimo**, **Airbnb**,
le **web design** éditorial, **Instagram** et **Spark**. Accompagnée d'animations fluides, simples et
optimisées. L'application doit être ergonomique et respecter les conclusions des études sur les
interfaces qui favorisent la créativité et la concentration.
