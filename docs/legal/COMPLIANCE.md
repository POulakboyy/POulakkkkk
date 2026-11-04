# Conformité réglementaire de POuxis

> **Ceci n'est pas un avis juridique — à faire valider par un·e avocat·e.** Analyse
> préparatoire fondée sur les textes cités ; les obligations évoluent et doivent être
> revérifiées avant chaque lancement de fonctionnalité.
>
> **Juridiction.** L'éditeur sera établi dans l'Union européenne, en **France ou en
> Belgique** (non décidé). Le droit de l'Union s'applique dans les deux cas ; les
> divergences nationales sont marquées ⚖️ **FR** / **BE**. Autorité de contrôle compétente :
> CNIL (FR) ou Autorité de protection des données (APD, BE).

État au 4 novembre 2026. Documents liés : [`PRIVACY_BY_DESIGN.md`](PRIVACY_BY_DESIGN.md),
[`DPIA_SCREENING.md`](DPIA_SCREENING.md), [`PRIVACY_POLICY_DRAFT.md`](PRIVACY_POLICY_DRAFT.md),
[`LICENSING.md`](LICENSING.md), `docs/security/SECURITY_ARCHITECTURE.md`,
`docs/product/ROADMAP.md`.

## 1. Synthèse

| Domaine                                      | Verdict                                           | Condition principale                                                                                                                                          |
| -------------------------------------------- | ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Cœur local-first (tâches, calendrier, notes) | **Feu vert**                                      | Traitement sur l'appareil ; l'éditeur n'accède pas au contenu.                                                                                                |
| Relais de synchronisation                    | **Feu vert sous conditions**                      | Contenu chiffré de bout en bout ; métadonnées minimisées ; durée de conservation à fixer ; contrat art. 28 pour les espaces d'équipe.                         |
| Télémétrie / analytique                      | **Désactivée par défaut**                         | Consentement préalable (ePrivacy art. 5(3)) ; aucune donnée de contenu.                                                                                       |
| IA optionnelle (2.2, 3.2, 4.8, 6.12)         | **Feu vert sous conditions**                      | Local par défaut ; fournisseur distant uniquement à l'initiative de la personne, avec information ; obligations de l'AI Act art. 50 sur les contenus générés. |
| Géolocalisation (2.5)                        | **Feu vert sous conditions**                      | Calcul sur l'appareil, coordonnées jamais synchronisées en clair, autorisation système explicite.                                                             |
| Ingestion d'e-mails (2.10)                   | **Revue requise avant développement**             | Le serveur lirait du contenu en clair : l'éditeur devient responsable de traitement.                                                                          |
| Tagging d'intonation vocale (5.7)            | **Ne pas développer en l'état — voir § 5**        | Interdit dans les usages professionnels et éducatifs (AI Act art. 5(1)(f)).                                                                                   |
| Journal d'audit (6.5) et graphe social (6.9) | **Revue requise** (surveillance des salarié·es)   | Information et proportionnalité ; 6.9 uniquement déclaratif.                                                                                                  |
| Accessibilité (EAA)                          | **Applicabilité limitée — voir § 9**              | WCAG 2.2 AA déjà visé ; le parcours d'achat est le point d'attention.                                                                                         |
| Cyber Resilience Act                         | **Applicable si POuxis est monétisé — voir § 10** | Signalement des vulnérabilités activement exploitées depuis le 11 septembre 2026.                                                                             |
| Licences des dépendances                     | **Feu vert**                                      | SBOM et notices tierces à chaque version.                                                                                                                     |

## 2. Rôles au sens du RGPD

Règlement (UE) 2016/679 (« RGPD »).

| Traitement                                                                                                                      | Rôle de l'éditeur                                                       | Fondement                                                                                                                                                                                                                                 |
| ------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Contenu stocké **uniquement sur l'appareil**                                                                                    | ni responsable, ni sous-traitant                                        | L'éditeur ne traite aucune donnée. Le considérant 18 rappelle que le RGPD reste applicable aux fournisseurs des moyens de traitement pour des activités personnelles : d'où les exigences de conception (art. 25) que l'éditeur s'impose. |
| Relais officiel, compte personnel : métadonnées (identifiants d'espace, horodatages logiques, tailles, adresse IP de connexion) | **responsable de traitement**                                           | Art. 4(7) ; base : exécution du contrat (art. 6(1)(b)).                                                                                                                                                                                   |
| Relais officiel, contenu chiffré de bout en bout                                                                                | responsable du stockage de données qu'il ne peut pas lire               | Voir § 2.1.                                                                                                                                                                                                                               |
| Espace d'équipe souscrit par une organisation                                                                                   | **sous-traitant** de l'organisation (art. 28)                           | L'organisation détermine les finalités (travail collaboratif) ; contrat de sous-traitance obligatoire.                                                                                                                                    |
| Relais auto-hébergé                                                                                                             | aucun                                                                   | L'exploitant est responsable de traitement.                                                                                                                                                                                               |
| Fournisseur d'IA distant choisi par la personne (clé d'API personnelle)                                                         | aucun, si la requête part directement de l'appareil vers le fournisseur | La personne contracte avec le fournisseur ; l'éditeur doit l'informer clairement (§ 6).                                                                                                                                                   |
| Fournisseur d'IA distant proposé par l'éditeur (clé de l'éditeur)                                                               | **responsable de traitement** ; le fournisseur est son sous-traitant    | Contrat art. 28, analyse de transfert (§ 3), information préalable.                                                                                                                                                                       |

### 2.1 Les données chiffrées sont-elles des données personnelles pour le relais ?

La CJUE a jugé que des données pseudonymisées ne constituent pas nécessairement, dans tous
les cas et pour toute personne, des données personnelles, l'identifiabilité s'appréciant
selon les circonstances de chaque traitement (CJUE, 4 septembre 2025, _EDPS c. SRB_,
C-413/23 P). Un contenu chiffré dont le relais ne détient pas la clé pourrait donc ne pas
être une donnée personnelle **pour le relais**. Position prudente retenue : **traiter le
contenu chiffré comme une donnée personnelle** (il reste lié à un compte, à une adresse IP,
et redevient lisible pour les appareils de la personne), et appliquer sécurité, durée de
conservation et droits (effacement) en conséquence.

## 3. RGPD — obligations clés

### 3.1 Bases légales (art. 6)

| Traitement                                                    | Base                                                                                                                     |
| ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| Compte, synchronisation, partage par lien (3.10)              | contrat — art. 6(1)(b)                                                                                                   |
| Sécurité du relais (limitation de débit, journaux techniques) | intérêt légitime — art. 6(1)(f)                                                                                          |
| Télémétrie produit, rapports de plantage                      | consentement — art. 6(1)(a), requis de toute façon par l'art. 5(3) ePrivacy                                              |
| Envoi à un fournisseur d'IA distant                           | contrat (fonction demandée explicitement) ; consentement si des catégories particulières peuvent être concernées (§ 3.2) |
| Signature DCO des contributions                               | intérêt légitime — art. 6(1)(f)                                                                                          |

### 3.2 Catégories particulières (art. 9) et inférences

L'art. 9(1) interdit, sauf exception de l'art. 9(2), le traitement des données concernant la
santé et des **données biométriques aux fins d'identifier une personne de manière unique**.

- **Voix.** Un enregistrement vocal n'est une donnée biométrique au sens du RGPD que s'il
  fait l'objet d'un « traitement technique spécifique » permettant ou confirmant
  l'identification unique (art. 4(14)). La transcription (2.7) ne vise pas l'identification ;
  l'analyse de l'intonation (5.7) non plus, mais **le règlement IA retient une définition
  plus large** (§ 5.1).
- **Santé.** Notes, journal de friction (5.5), bilan hebdomadaire (7.9), streaks (7.3) et
  métriques d'énergie (1.3) peuvent révéler des informations de santé (art. 4(15)), par
  exemple fatigue chronique ou rendez-vous médicaux. Tant que le traitement reste local,
  l'éditeur ne traite rien ; **toute inférence calculée côté serveur ou par un fournisseur
  d'IA** devrait être évitée ou fondée sur un consentement explicite (art. 9(2)(a)).
- **Règle de conception** : aucune fonction ne doit produire d'étiquette de santé, d'humeur
  ou d'état émotionnel attachée à une personne.

### 3.3 Protection des données dès la conception (art. 25)

Détaillée dans [`PRIVACY_BY_DESIGN.md`](PRIVACY_BY_DESIGN.md). Points opposables :
chiffrement de bout en bout du contenu synchronisé, réglages par défaut les plus protecteurs
(art. 25(2)), télémétrie et IA distante désactivées par défaut, export complet (6.11) qui
facilite la portabilité (art. 20).

### 3.4 Sous-traitance (art. 28)

À conclure avant le lancement :

1. **Hébergeur du relais** (contrat art. 28 avec l'éditeur ; localisation UE de préférence).
2. **Organisations clientes des espaces d'équipe** : l'éditeur leur propose un accord de
   sous-traitance couvrant les éléments de l'art. 28(3) : objet et durée, nature et finalité,
   types de données, catégories de personnes, instructions documentées, confidentialité,
   sécurité (art. 32), sous-traitants ultérieurs avec droit d'opposition, assistance pour les
   droits et les violations, suppression ou restitution en fin de contrat, audits.
3. **Fournisseur d'IA** si l'éditeur en propose un avec sa propre clé.

### 3.5 Analyse d'impact (art. 35)

Pré-évaluation dans [`DPIA_SCREENING.md`](DPIA_SCREENING.md). Conclusion : pas d'AIPD
obligatoire pour le socle local-first et le relais chiffré ; AIPD **requise** avant 2.10,
6.5 en contexte d'entreprise, 6.9 et tout traitement d'IA distant à grande échelle.

### 3.6 Transferts hors de l'EEE (chapitre V)

- **Relais officiel** : hébergement dans l'EEE recommandé, ce qui évite tout transfert.
- **Fournisseurs d'IA ou de services établis aux États-Unis** : la décision d'adéquation
  « EU-US Data Privacy Framework » du 10 juillet 2023 couvre les entreprises certifiées ;
  sa validité a été confirmée par le Tribunal de l'Union le 3 septembre 2025 (_Latombe c.
  Commission_, T-553/23). Un pourvoi devant la Cour de justice reste possible : à
  surveiller. À défaut de certification : clauses contractuelles types (décision
  d'exécution (UE) 2021/914) et analyse d'impact du transfert.
- **Envoi direct depuis l'appareil vers un fournisseur choisi par la personne** : ce n'est
  pas un transfert de l'éditeur, mais l'écran de configuration doit indiquer le pays de
  traitement annoncé par le fournisseur.

### 3.7 Autres obligations

- **Registre des traitements (art. 30)** : à tenir dès le lancement du relais ; l'exemption
  des structures de moins de 250 salarié·es ne s'applique pas aux traitements non
  occasionnels.
- **Délégué·e à la protection des données (art. 37)** : non obligatoire a priori (pas de
  suivi régulier et systématique à grande échelle, pas de traitement à grande échelle de
  catégories particulières) ; à réévaluer si 2.10 ou l'IA distante sont lancées.
- **Violations de données (art. 33-34)** : notification à l'autorité sous 72 heures ;
  procédure dans `SECURITY.md` à compléter (demande à l'équipe sécurité).
- **Droits des personnes (art. 12-22)** : réponse sous un mois ; l'export (6.11) et la
  suppression de compte dans l'application couvrent accès, portabilité et effacement.
- **Mineur·e·s (art. 8)** — voir § 8.

## 4. Directive ePrivacy : stockage sur l'appareil et télémétrie

La directive 2002/58/CE, art. 5(3), impose le consentement pour stocker ou lire des
informations sur l'équipement terminal, sauf si c'est **strictement nécessaire** au service
demandé expressément. Transpositions : ⚖️ **FR** loi n° 78-17 du 6 janvier 1978, art. 82 ;
**BE** loi du 30 juillet 2018 relative à la protection des personnes physiques à l'égard des
traitements de données à caractère personnel, art. 10/2. Les lignes directrices 2/2023 du
CEPD précisent que l'article couvre aussi les techniques de suivi autres que les cookies (SDK
mobiles, identifiants, pixels).

| Stockage ou lecture sur l'appareil                                      | Consentement ?                                                                                                                                                                                  |
| ----------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Base locale (IndexedDB, SQLite), clés enveloppées, préférences, session | non — strictement nécessaire                                                                                                                                                                    |
| Identifiant d'installation pour la synchronisation                      | non — strictement nécessaire à la synchronisation demandée                                                                                                                                      |
| Rapports de plantage envoyés automatiquement                            | **oui**                                                                                                                                                                                         |
| Mesure d'audience, analytique produit, SDK tiers                        | **oui** ; à défaut, ne pas en intégrer                                                                                                                                                          |
| Site web (`website/`) : mesure d'audience                               | **oui**, sauf outil configuré pour l'exemption de la CNIL ⚖️ FR (mesure d'audience strictement limitée) ; ⚖️ BE : aucune exemption équivalente identifiée à ce jour, à vérifier auprès de l'APD |

**Exigence** : l'application ne contient aucun SDK d'analytique ou de publicité ; la
télémétrie éventuelle est opt-in, désactivable aussi simplement qu'activée, et décrite dans
la politique de confidentialité.

## 5. Règlement IA (UE) 2024/1689 — tagging d'intonation vocale (5.7)

### 5.1 Qualification

- Art. 3, point 39 : un « système de reconnaissance des émotions » est un système d'IA
  « permettant la reconnaissance ou la déduction des émotions ou des intentions de personnes
  physiques sur la base de leurs données biométriques ».
- Art. 3, point 34 : les « données biométriques » au sens du règlement résultent d'un
  traitement technique spécifique des caractéristiques physiques, physiologiques ou
  **comportementales** d'une personne. Contrairement au RGPD, **la finalité
  d'identification n'est pas requise** : les caractéristiques acoustiques de la voix
  analysées pour en déduire un état entrent dans la définition.
- Le considérant 18 cite parmi les émotions visées l'**excitation** et la satisfaction ; il
  exclut les états physiques (douleur, fatigue) et la simple détection d'expressions
  manifestes (par exemple une voix forte ou un chuchotement) lorsqu'elle ne sert pas à
  déduire une émotion.
- La fonction 5.7 (« l'IA détecte l'enthousiasme de la voix pour marquer l'idée “Haute
  énergie” ») **déduit une émotion à partir de données biométriques** : c'est un système de
  reconnaissance des émotions.

### 5.2 Interdiction (art. 5(1)(f))

Sont interdites la mise sur le marché, la mise en service à cette fin spécifique et
l'utilisation de systèmes d'IA pour inférer les émotions d'une personne physique **sur le
lieu de travail et dans les établissements d'enseignement**, sauf raisons médicales ou de
sécurité. Applicable depuis le **2 février 2025** (art. 113(a)).

POuxis est un outil de productivité destiné notamment aux usages professionnels et étudiants.
L'éditeur, en tant que **fournisseur**, mettrait sur le marché un système dont l'usage au
travail est prévisible. L'exclusion des usages « purement personnels et non
professionnels » de l'art. 2(10) ne vise que les obligations des **déployeurs** personnes
physiques ; elle ne couvre ni le fournisseur, ni l'usage d'une personne qui note des idées
pour son travail, ni le déploiement par une organisation dans un espace d'équipe.

Hors interdiction, un système de reconnaissance des émotions relève des systèmes **à haut
risque** (annexe III, point 1 c), dont les obligations s'appliquent, après l'accord
politique de 2026 sur l'« omnibus numérique » relatif à l'IA, à partir du
**2 décembre 2027** ⚖️ (date à confirmer à la publication de l'acte modificatif au Journal
officiel). Ses déployeurs doivent en outre informer les personnes exposées (art. 50(3)).

### 5.3 Recommandation

**Ne pas développer la détection automatique d'émotion dans la voix.** Le gain fonctionnel
(un tag) est sans commune mesure avec l'exposition : pratique interdite passible de
l'amende la plus élevée du règlement (art. 99(3)), conformité « haut risque » ailleurs, et
risque de réputation pour un produit fondé sur la confiance.

Alternatives conformes, par ordre de préférence :

1. **Tag manuel « Haute énergie »** posé d'un geste après l'enregistrement (proposé par la
   feuille de route).
2. **Indicateurs physiques non émotionnels**, calculés sur l'appareil et présentés comme
   tels : débit de parole, durée, volume moyen (« mémo rapide », « long mémo »). Le
   considérant 18 exclut la simple détection d'une voix forte lorsqu'elle ne sert pas à
   déduire une émotion : le libellé ne doit jamais évoquer un état (« enthousiaste »,
   « motivé ») et la fonction ne doit pas être présentée comme mesurant l'énergie de la
   personne.
3. **Analyse lexicale du texte transcrit** à la demande de la personne (« marquer les idées
   contenant “génial”, “urgent” ») : fondée sur le contenu choisi par la personne, non sur
   ses données biométriques.

Le statut de 5.7 dans la feuille de route doit passer de « Recherche » à **« Abandonné au
profit de l'alternative 1 »** (demande à l'équipe produit).

### 5.4 Contenus générés par IA (art. 50)

Applicable depuis le **2 août 2026** ; l'omnibus prévoit un délai jusqu'au 2 décembre 2026
pour les seuls systèmes déjà sur le marché au titre de l'art. 50(2) ⚖️ (date issue de l'accord
politique, à confirmer à la publication de l'acte modificatif au Journal officiel).

- **Fournisseurs** de systèmes générant du texte, de l'audio, des images ou de la vidéo
  synthétiques : marquage dans un format lisible par machine et détectable (art. 50(2)).
  POuxis n'est **fournisseur** d'un tel système que s'il intègre ou entraîne son propre
  modèle ; s'il appelle un modèle tiers, le marquage incombe en premier lieu à ce
  fournisseur, mais l'application doit **conserver** les métadonnées de provenance reçues.
- **Exigences pour l'interface** (bonnes pratiques alignées sur l'esprit de l'art. 50) :
  - toute sous-tâche (2.2), squelette d'organigramme (4.8) ou résumé (6.12) généré porte une
    marque visible « Généré par IA » et un champ de provenance dans le modèle de données
    (`origin: 'ai'`, fournisseur, date), conservé à l'export ;
  - le contenu généré n'est jamais inséré sans validation explicite de la personne ;
  - les résumés de 6.12 destinés à d'autres membres de l'équipe sont toujours signalés comme
    générés.
- **Interaction avec un système d'IA** (art. 50(1)) : si un assistant conversationnel est un
  jour proposé, il doit être identifié comme tel.

## 6. Fournisseurs d'IA optionnels

- Traitement **local par défaut** (modèle embarqué) pour 2.2, 3.2 et 2.7.
- Fournisseur distant : activation explicite par fonction, écran d'information avant le
  premier envoi (fournisseur, pays, durée de conservation annoncée, usage ou non pour
  l'entraînement), aperçu des données envoyées.
- **Coffres chiffrés (3.5) et bac à sable (5.8)** : jamais envoyés à un fournisseur distant.
- Contenu utilisateur traité comme donnée, jamais comme instruction (déjà exigé par
  `docs/security/SECURITY_ARCHITECTURE.md` § 7).

## 7. Fonctions sensibles

### 7.1 Géolocalisation (2.5)

- Donnée personnelle (art. 4(1) RGPD) ; un historique de positions est particulièrement
  révélateur.
- Exigences : géorepérage par les API natives, coordonnées des lieux stockées chiffrées et
  synchronisées uniquement sous forme chiffrée, **aucun historique de positions**,
  autorisation « en arrière-plan » demandée uniquement au moment où la personne active un
  tag géolocalisé, avec explication préalable.
- Magasins : la localisation en arrière-plan fait l'objet d'une revue spécifique sur Google
  Play et d'une justification obligatoire dans les chaînes d'autorisation iOS ; textes à
  préparer avec l'équipe produit.
- 7.6 (palette selon le soleil) se calcule à partir du fuseau horaire, sans localisation.

### 7.2 Ingestion d'e-mails (2.10)

Une adresse de réception (`inbox-xyz@…`) suppose un serveur qui **lit des courriels en
clair**, contenant des données de tiers (expéditeur·rice·s, personnes citées).

- L'éditeur devient **responsable de traitement** du contenu reçu (ou sous-traitant pour un
  espace d'équipe) ; les tiers doivent pouvoir être informés (art. 14, avec l'exception de
  l'art. 14(5)(b) à documenter).
- Exigences si la fonction est poursuivie : chiffrement du courriel **dès réception** avec la
  clé publique de l'espace puis effacement du clair, conservation du clair limitée au temps
  de traitement, aucune analyse de contenu côté serveur, pièces jointes neutralisées,
  désactivation et rotation de l'adresse en un geste.
- Alternative préférable : **import local** (partage depuis le client de messagerie vers
  POuxis via la feuille de partage, 3.12), sans serveur.
- AIPD requise avant développement.

### 7.3 Journal d'audit (6.5) et graphe de connaissances social (6.9) — surveillance des salarié·es

- Un journal « qui a modifié quoi et quand » dans un espace d'entreprise peut servir à
  évaluer l'activité des salarié·es. RGPD art. 88 (traitement dans le cadre de l'emploi) ;
  ⚖️ **FR** Code du travail, art. L1121-1 (proportionnalité), L1222-4 (information préalable
  du salarié sur tout dispositif de collecte), L2312-38 (information-consultation du CSE sur
  les moyens de contrôle de l'activité) ; ⚖️ **BE** convention collective de travail n° 81
  pour le contrôle des données de communications électroniques en réseau, et information des
  travailleur·euse·s : applicabilité à un journal d'outil collaboratif à faire confirmer.
- **6.5 — exigences** : finalité affichée (intégrité et conformité, non évaluation) ;
  `details` minimal ; durée de conservation paramétrable avec valeur par défaut courte ; pas
  de vue « activité par personne » ni de classement ; accès réservé à des rôles
  d'administration explicitement attribués ; page d'information visible par chaque membre.
  Le responsable de traitement est l'organisation cliente : fournir un modèle de notice
  d'information pour ses salarié·es.
- **6.9 — exigences** : compétences **déclarées** par la personne, jamais inférées de son
  activité (une inférence constituerait un profilage, art. 4(4) ; un système d'IA destiné à
  surveiller et évaluer le comportement au travail relève de l'annexe III, point 4 b, du
  règlement IA) ; visibilité opt-in ; aucune utilisation pour l'attribution automatique de
  tâches ou l'évaluation (art. 22).
- AIPD requise pour les deux en contexte d'entreprise.

## 8. Mineur·e·s

- RGPD art. 8 : pour les services de la société de l'information proposés directement à un
  enfant et fondés sur le consentement, l'âge du consentement numérique est fixé par chaque
  État membre (13 à 16 ans) : ⚖️ **FR** 15 ans (loi n° 78-17, art. 45) ; **BE** 13 ans (loi du
  30 juillet 2018, art. 7).
- POuxis n'est pas destiné spécifiquement aux enfants, mais touchera des élèves et
  étudiant·e·s. Le socle (local, base contractuelle) ne repose pas sur le consentement ; la
  télémétrie et l'IA distante oui : **les désactiver par défaut** suffit à éviter l'essentiel
  du sujet.
- Classification d'âge des magasins à déclarer avec exactitude (partage par lien, contenu
  utilisateur, galerie communautaire 6.15).
- La galerie communautaire (6.15) et les liens de partage publics (3.10) relèvent du
  règlement (UE) 2022/2065 (DSA) en tant que service d'hébergement : mécanisme de
  signalement (art. 16) et motivation des décisions de modération (art. 17).

## 9. Acte européen sur l'accessibilité (directive (UE) 2019/882)

- Applicable depuis le **28 juin 2025** aux produits et services listés à l'art. 2, parmi
  lesquels les **services de commerce électronique** (art. 2(2)(f)), définis comme les
  services fournis à distance, par voie électronique, sur demande individuelle d'un
  consommateur, **en vue de conclure un contrat de consommation** (art. 3(30)).
- Une application de productivité n'est **pas en soi** un service couvert. En revanche, le
  **parcours d'achat** d'un abonnement opéré par l'éditeur (site web ou écran d'achat hors
  magasin) peut relever du commerce électronique. Les achats intégrés via l'App Store ou
  Google Play sont opérés par ces magasins ; la répartition des obligations est à confirmer.
- Exemption des **microentreprises** fournissant des services (moins de 10 personnes et
  chiffre d'affaires annuel ou total du bilan n'excédant pas 2 millions d'euros, art. 4(5)) :
  l'éditeur en relèvera probablement au lancement.
- Recommandation : maintenir l'objectif WCAG 2.2 AA (déjà fixé par `CLAUDE.md`), qui
  dépasse le niveau de référence technique habituellement utilisé (norme EN 301 549), et
  publier une déclaration d'accessibilité.

## 10. Cyber Resilience Act (règlement (UE) 2024/2847)

- Obligations de signalement des vulnérabilités activement exploitées et des incidents
  graves applicables depuis le **11 septembre 2026** ; obligations principales à partir du
  **11 décembre 2027**.
- Un logiciel libre fourni hors de toute activité commerciale n'est pas visé ; s'il est mis
  à disposition **dans le cadre d'une activité commerciale** (abonnement, version payante,
  monétisation), l'éditeur est **fabricant** et soumis à l'ensemble des obligations. Un
  régime allégé existe pour les « gestionnaires de logiciels libres » (_open-source software
  stewards_).
- Actions : processus de divulgation coordonnée (`SECURITY.md`), capacité de signalement à
  l'ENISA et au CSIRT national sous 24 heures (alerte précoce) dès qu'une version payante
  existe, SBOM (§ 12), mises à jour de sécurité pendant la période de support déclarée.

## 11. Magasins d'applications : déclarations de confidentialité

| Exigence                             | Apple                                                                                                   | Google                                                                                |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| Fiche de confidentialité             | « App Privacy » dans App Store Connect                                                                  | section « Sécurité des données » (_Data safety_) dans la Play Console                 |
| Politique de confidentialité         | lien obligatoire (fiche et application)                                                                 | lien obligatoire                                                                      |
| Suppression de compte                | obligatoire dans l'application si la création de compte y est possible (Directives App Review 5.1.1(v)) | obligatoire dans l'application et via une page web                                    |
| Raisons d'utiliser les API sensibles | fichier _privacy manifest_ (`PrivacyInfo.xcprivacy`) et chaînes d'usage des autorisations               | déclaration des autorisations sensibles (localisation en arrière-plan, notifications) |

**Déclarations prévisionnelles** (à reconfirmer à chaque version, selon les définitions
alors en vigueur de chaque magasin) :

- contenu utilisateur : traité sur l'appareil ; synchronisé uniquement chiffré de bout en
  bout. ⚖️ Le traitement des données chiffrées de bout en bout dans ces formulaires dépend
  des définitions de chaque magasin : **à vérifier dans la documentation Apple et Google en
  vigueur** avant de déclarer « aucune donnée collectée » ;
- identifiants : identifiant de compte et d'espace (fonctionnement de l'application, non
  liés au suivi) ;
- diagnostics : uniquement si la personne active les rapports de plantage ;
- **aucun suivi** (_tracking_) au sens d'Apple, aucun partage avec des courtiers ou des
  réseaux publicitaires.

## 12. Licences des dépendances

- Inventaire npm au 4 novembre 2026 (`node_modules`, champ `license`) : MIT, Apache-2.0,
  ISC, BSD-2-Clause, BSD-3-Clause, MIT-0, CC0-1.0, BlueOak-1.0.0, MPL-2.0
  (`lightningcss`, outil de compilation non embarqué). **Aucune licence GPL/LGPL/AGPL** hors
  paquets POuxis. Les crates Rust du shell Tauri restent à inventorier.
- À chaque version :
  1. **SBOM** au format SPDX ou CycloneDX pour l'application (npm + Cargo) et le relais ;
  2. **fichier de notices tierces** (texte de licence et mentions de copyright de chaque
     composant embarqué), accessible depuis l'écran « À propos » — exigé par MIT, BSD et
     Apache-2.0 (art. 4, y compris les fichiers `NOTICE` des dépendances) ;
  3. **liste d'autorisation** des licences en CI : MIT, ISC, BSD-2/3-Clause, Apache-2.0,
     MPL-2.0, 0BSD, CC0-1.0, Unicode-3.0 ; toute autre licence bloque la fusion jusqu'à
     revue ; GPL/LGPL/AGPL tierces refusées dans le client (voir `LICENSING.md` § 4.3).
- Polices et icônes : vérifier la licence de chaque fichier embarqué (OFL pour les polices
  libres, avec ses conditions de nom réservé).

## 13. Registre des risques

Méthode : gravité (1-5) × probabilité (1-5). Vert 1-4, jaune 5-9, orange 10-15, rouge 16-25.

| ID   | Risque                                                                 | G   | P   | Score | Niveau | Atténuation                                                               | Résiduel  |
| ---- | ---------------------------------------------------------------------- | --- | --- | ----- | ------ | ------------------------------------------------------------------------- | --------- |
| R-01 | Lancement de 5.7 (inférence d'émotion) utilisé au travail ou à l'école | 5   | 4   | 20    | rouge  | Abandon ; alternative manuelle (§ 5.3)                                    | 1 · vert  |
| R-02 | 2.10 : courriels en clair sur le serveur, fuite ou usage détourné      | 4   | 3   | 12    | orange | Import local ; à défaut chiffrement à réception + AIPD                    | 6 · jaune |
| R-03 | 6.5 / 6.9 utilisés pour surveiller des salarié·es                      | 4   | 3   | 12    | orange | Conception non évaluative, déclaratif, notice, AIPD                       | 6 · jaune |
| R-04 | Retrait d'un magasin sur plainte d'un·e titulaire de code GPL tiers    | 3   | 2   | 6     | jaune  | Permission additionnelle, aucune dépendance GPL, DCO                      | 3 · vert  |
| R-05 | Télémétrie ou SDK tiers sans consentement (ePrivacy)                   | 3   | 2   | 6     | jaune  | Aucun SDK ; opt-in ; revue des dépendances                                | 2 · vert  |
| R-06 | Contenu généré par IA non signalé (art. 50)                            | 3   | 3   | 9     | jaune  | Marque visible + champ de provenance                                      | 3 · vert  |
| R-07 | Fiche de confidentialité inexacte (magasins)                           | 3   | 3   | 9     | jaune  | Revue à chaque version, check-list de publication                         | 3 · vert  |
| R-08 | Obligations CRA non anticipées en cas de monétisation                  | 3   | 3   | 9     | jaune  | Processus de signalement, SBOM, support déclaré                           | 3 · vert  |
| R-09 | Conservation indéfinie des enveloppes chiffrées sur le relais          | 2   | 4   | 8     | jaune  | Politique de conservation et de compactage (`PRIVACY_BY_DESIGN.md` § 2.2) | 2 · vert  |
| R-10 | Protection limitée du code généré par IA (titularité)                  | 2   | 3   | 6     | jaune  | Documentation des contributions humaines ; avis spécialisé                | 4 · vert  |

## 14. Validations nécessaires

| Qui                                     | Pourquoi                                                                  | Statut     |
| --------------------------------------- | ------------------------------------------------------------------------- | ---------- |
| Avocat·e RGPD (FR ou BE selon le siège) | Rôles, contrat art. 28, AIPD 2.10/6.5/6.9, politique de confidentialité   | à demander |
| Avocat·e propriété intellectuelle       | Schéma de licences, permission magasins, titularité du code généré par IA | à demander |
| Conseil en propriété industrielle       | Recherche d'antériorité et dépôt de la marque                             | à demander |
| Avocat·e droit du travail               | Notice type pour les organisations clientes (6.5, 6.9)                    | avant 1.0  |

## Références

- Règlement (UE) 2016/679 (RGPD), notamment art. 4, 6, 8, 9, 14, 22, 25, 28, 30, 33-37,
  44-49, 88 et considérant 18.
- Directive 2002/58/CE (« vie privée et communications électroniques »), art. 5(3) ;
  CEPD, lignes directrices 2/2023 sur le champ technique de l'art. 5(3).
- Règlement (UE) 2024/1689 (règlement sur l'IA), art. 2(10), 3(34), 3(39), 5(1)(f), 50, 99,
  113, considérant 18, annexe III — texte EUR-Lex CELEX 32024R1689.
- Règlement (UE) 2024/2847 (Cyber Resilience Act).
- Directive (UE) 2019/882 (acte européen sur l'accessibilité), art. 2, 3(30), 4(5).
- Règlement (UE) 2022/2065 (DSA), art. 16-17.
- Décision d'exécution (UE) 2021/914 (clauses contractuelles types).
- CJUE, 4 septembre 2025, _EDPS c. SRB_, C-413/23 P ; Tribunal de l'UE, 3 septembre 2025,
  _Latombe c. Commission_, T-553/23.
- ⚖️ FR : loi n° 78-17 du 6 janvier 1978, art. 45 et 82 ; Code du travail, art. L1121-1,
  L1222-4, L2312-38.
- ⚖️ BE : loi du 30 juillet 2018 relative à la protection des personnes physiques à l'égard
  des traitements de données à caractère personnel, art. 7 et 10/2 ; CCT n° 81.
