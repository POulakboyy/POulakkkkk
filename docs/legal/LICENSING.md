# Licences de POuxis — analyse et recommandation

> **Ceci n'est pas un avis juridique — à faire valider par un·e avocat·e.** Ce document
> rassemble des faits vérifiés et une analyse pour préparer une décision ; il ne remplace pas
> la consultation d'un·e professionnel·le du droit de la propriété intellectuelle.
>
> **Juridiction.** L'entité qui publiera POuxis n'est pas encore fixée (France ou Belgique).
> Les licences étudiées ici sont internationales ; les points où le droit national compte
> (titularité des droits, marques, droit d'auteur sur le code généré par IA) sont signalés
> par ⚖️.

État au 4 novembre 2026. Fichiers concernés : [`LICENSE`](../../LICENSE),
[`NOTICE`](../../NOTICE), [`TRADEMARK_POLICY.md`](TRADEMARK_POLICY.md).

## 1. Résumé de la décision

| Partie du dépôt                     | Licence recommandée                                                          | Raison principale                                                                                                                 |
| ----------------------------------- | ---------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `packages/core` (`@pouxis/core`)    | **MPL-2.0**                                                                  | Réutilisable par les plugins (6.3) et des clients tiers sans contaminer leur code ; les modifications du moteur restent ouvertes. |
| `apps/pouxis` (client, shell Tauri) | **AGPL-3.0-or-later** + permission additionnelle « magasins d'applications » | Copyleft fort sur le produit, y compris s'il est hébergé comme service web ; distribution App Store sécurisée.                    |
| `apps/sync-server` (relais)         | **AGPL-3.0-or-later**                                                        | La clause réseau (art. 13) empêche un hébergeur de proposer un relais modifié fermé.                                              |
| `apps/cli`                          | **AGPL-3.0-or-later**                                                        | Cohérence avec les applications ; aucun besoin de réutilisation propriétaire identifié.                                           |
| `docs/`, textes du site             | **CC-BY-4.0**                                                                | Documentation réutilisable avec attribution.                                                                                      |
| Nom et logos « POuxis »             | **Hors licence** — [politique de marque](TRADEMARK_POLICY.md)                | La licence logicielle ne doit pas permettre à un fork de se présenter comme POuxis.                                               |
| Contributions                       | **DCO 1.1** (`Signed-off-by`), pas de CLA                                    | Friction minimale ; « inbound = outbound » suffit au schéma retenu.                                                               |

Le fichier `LICENSE` racine contient le texte intégral et non modifié de l'AGPL-3.0, tel que
publié par la FSF sur `https://www.gnu.org/licenses/agpl-3.0.txt` (récupéré le
4 novembre 2026). La répartition par répertoire et la permission additionnelle figurent dans
`NOTICE`. Le texte intégral de la MPL-2.0 est conservé dans
[`licenses/MPL-2.0.txt`](licenses/MPL-2.0.txt) (copie du texte officiel de Mozilla), à copier
dans `packages/core/LICENSE`.

## 2. Contraintes propres à POuxis

1. **Distribution par les magasins** : iOS et macOS (App Store), Android (Google Play),
   Windows (Microsoft Store ou installeur direct).
2. **Serveur de synchronisation hébergeable** : le relais (`apps/sync-server`) peut être
   exploité par le projet, par des organisations ou par des particuliers.
3. **Moteur réutilisé par des plugins** (6.3, « Commandes extensibles ») et potentiellement
   par des clients tiers (6.2 API, 3.15 CLI).
4. **Attirer des contributions** sans formalités dissuasives.
5. **Modèle économique ouvert** : un éventuel « open core » (fonctions équipe/entreprise
   payantes) n'est pas décidé ; le schéma doit le permettre sans l'imposer.
6. **Protection du nom** « POuxis » contre les copies trompeuses.

## 3. Comparaison des licences

| Critère                                   | AGPL-3.0                                 | GPL-3.0                                  | MPL-2.0                                     | Apache-2.0                           | MIT     |
| ----------------------------------------- | ---------------------------------------- | ---------------------------------------- | ------------------------------------------- | ------------------------------------ | ------- |
| Type de copyleft                          | fort + réseau                            | fort                                     | faible, **par fichier**                     | aucun                                | aucun   |
| Service hébergé modifié → source due      | **oui** (art. 13)                        | non                                      | non                                         | non                                  | non     |
| Compatibilité App Store (voir § 4)        | incertaine sans permission additionnelle | incertaine sans permission additionnelle | bonne (précédent VLC)                       | bonne                                | bonne   |
| Plugins propriétaires utilisant le moteur | risqué (œuvre dérivée ?)                 | risqué                                   | **oui**, seuls les fichiers MPL restent MPL | oui                                  | oui     |
| Licence de brevets explicite              | oui (art. 11)                            | oui (art. 11)                            | oui (art. 2.1 b)                            | oui (art. 3) + clause de résiliation | non     |
| Combinable dans une œuvre (A)GPL          | —                                        | oui (art. 13 AGPL)                       | oui, via « Secondary Licenses » (art. 3.3)  | oui avec GPL-3.0                     | oui     |
| Protection contre un concurrent fermé     | maximale                                 | élevée (sauf SaaS)                       | moyenne (fichiers du moteur seulement)      | nulle                                | nulle   |
| Droits de marque                          | peuvent être exclus (art. 7 e)           | idem                                     | exclus (art. 2.3)                           | exclus (art. 6)                      | silence |

### Lecture critique

- **MIT / Apache-2.0** maximisent l'adoption mais permettent une reprise fermée intégrale,
  y compris un service hébergé concurrent sans retour au projet. Inadaptées au produit ;
  Apache-2.0 reste le bon choix pour un futur SDK de plugins (types et utilitaires), grâce à
  sa licence de brevets.
- **GPL-3.0** protège le client distribué, mais pas un client web ou un relais hébergé.
- **AGPL-3.0** couvre précisément le risque « hébergeur » (relais et client web servis à
  distance). Son inconvénient pour un moteur réutilisable est l'incertitude sur le statut des
  plugins : un plugin qui importe le moteur pourrait être considéré comme une œuvre dérivée,
  ce qui dissuade l'écosystème.
- **MPL-2.0** limite le copyleft aux fichiers MPL eux-mêmes (art. 1.10 et 3.3) : un plugin ou
  un client tiers peut utiliser `@pouxis/core` sous n'importe quelle licence, mais toute
  modification des fichiers du moteur doit être publiée. Elle est compatible avec l'AGPL
  (art. 3.3, la MPL désignant la GPL et l'AGPL comme « Secondary Licenses »), ce qui permet
  d'embarquer le moteur dans les applications AGPL. **Condition** : ne jamais ajouter la
  mention « Incompatible With Secondary Licenses » (Exhibit B).

## 4. Licences GPL et magasins d'applications : faits établis

### 4.1 Historique

- **29 octobre 2010** — la FSF publie « VLC developer takes a stand against DRM enforcement
  in Apple's App Store » : selon elle, les _Usage Rules_ de l'App Store contredisent les
  conditions de la GNU GPL et de l'AGPL (restrictions supplémentaires, interdites par
  l'art. 10 de la GPLv3 et par l'art. 6 de la GPLv2).
  Source : `https://www.fsf.org/blogs/licensing/vlc-enforcement`.
- **Janvier 2011** — l'application VLC pour iOS (alors sous GPLv2) est retirée de l'App Store
  à la suite de la plainte d'un des développeurs historiques de VLC, Rémi Denis-Courmont.
- **18 juillet 2013** — VLC revient sur l'App Store. VLC pour iOS 2.0 est publié sous double
  licence **MPL-2.0 et GPLv2 (ou ultérieure)** ; VideoLAN précise que « la MPLv2 est
  applicable pour la distribution sur l'App Store ». Source : Ars Technica, « VLC media
  player returns to the iOS App Store after 30-month hiatus », 18 juillet 2013.

### 4.2 Situation actuelle

- Aucune décision de justice connue de nous ne tranche la compatibilité des licences GPL avec
  les conditions des magasins. Le risque est **contractuel et pratique** : un·e titulaire de
  droits sur une partie du code peut demander le retrait de l'application (scénario VLC).
- Des applications sous licence GNU sont publiées sur l'App Store par les titulaires de
  leurs droits. Exemples dont le dépôt public déclare la licence (vérifié le 4 novembre 2026) : Signal iOS (`signalapp/Signal-iOS`, AGPLv3), Element X iOS
  (`element-hq/element-x-ios`, AGPLv3), Nextcloud iOS (`nextcloud/ios`, GPLv3), Mastodon iOS
  (`mastodon/mastodon-ios`, GPLv3). Un·e titulaire de droits n'est pas lié·e par sa propre
  licence : le risque naît du code **de tiers** (contributions, dépendances GPL) dont les
  auteur·rice·s n'ont pas consenti à cette distribution.
- Dans l'Union européenne, le règlement sur les marchés numériques (DMA, règlement
  (UE) 2022/1925) a conduit Apple à ouvrir iOS à des magasins alternatifs et à la
  distribution web ; ce canal réduit la dépendance à l'App Store sans supprimer la question
  pour l'App Store lui-même. ⚖️ Les conditions d'Apple évoluent : à revérifier avant chaque
  première soumission.
- **Google Play** n'impose pas de règles d'usage comparables ; la distribution de logiciels
  GPL y est courante. L'installeur direct (APK, F-Droid, `.msi`, `.dmg`) ne pose aucune
  difficulté de licence.

### 4.3 Conséquence pour POuxis

Le client reste sous AGPL-3.0, avec une **permission additionnelle** au sens de l'art. 7 de
l'AGPLv3 (texte dans [`NOTICE`](../../NOTICE)) qui autorise la distribution par un magasin
d'applications à condition que le code source correspondant reste disponible gratuitement.
L'art. 7 permet expressément d'ajouter des permissions ; elles se propagent aux
contributions dès lors que chaque contribution est publiée « sous la licence du fichier »,
permission comprise (§ 7).

Règles qui en découlent :

1. **Aucune dépendance sous GPL/AGPL sans exception équivalente** dans le binaire distribué
   par un magasin. L'inventaire des dépendances npm au 4 novembre 2026 ne contient aucune
   licence GPL/LGPL/AGPL autre que les paquets POuxis eux-mêmes ; `lightningcss` (MPL-2.0)
   n'est utilisé qu'à la compilation.
2. Le moteur sous MPL-2.0 n'a pas besoin de cette permission.
3. L'écran « À propos » affiche les mentions légales appropriées (art. 5 d AGPL) et un lien
   vers le code source (art. 13 pour le client web).

## 5. Serveur de synchronisation et clause réseau

L'art. 13 de l'AGPLv3 impose à quiconque **modifie** le programme et le rend accessible à
distance d'offrir le code source correspondant à ses utilisateur·rice·s. Pour le relais :

- un hébergeur qui exploite une version modifiée doit publier ses modifications ;
- une organisation qui exploite la version officielle **non modifiée** n'a pas d'obligation
  supplémentaire (art. 13 ne vise que les versions modifiées) ;
- **à implémenter** : le relais doit exposer un lien vers sa source (par exemple un en-tête
  ou une route `/source`) pour que les forks héritent d'un mécanisme conforme
  (demande à l'équipe `apps/sync-server`).

## 6. Plugins (6.3) et moteur réutilisable

Avec `@pouxis/core` sous MPL-2.0 :

- un plugin peut importer le moteur et rester sous la licence de son choix ;
- s'il copie ou modifie des fichiers du moteur, ces fichiers restent sous MPL-2.0 et leur
  source doit être fournie (art. 3.1 et 3.2) ;
- le futur SDK de plugins (types, manifeste, utilitaires) devrait être publié sous
  **Apache-2.0** pour lever toute hésitation des auteur·rice·s de plugins ;
- les plugins exécutés par l'application dans un bac à sable (iframe ou Worker, voir
  `docs/security/SECURITY_ARCHITECTURE.md` § 7) communiquent par messages ; ce mode
  d'intégration renforce leur indépendance vis-à-vis de l'application AGPL.

## 7. Contributions : DCO plutôt que CLA

| Critère                                      | DCO 1.1                                           | CLA (cession ou licence large)                        |
| -------------------------------------------- | ------------------------------------------------- | ----------------------------------------------------- |
| Friction pour les contributeur·rice·s        | faible (`git commit -s`)                          | élevée (signature, parfois validation de l'employeur) |
| Changement de licence ultérieur              | nécessite l'accord des auteur·rice·s concerné·e·s | possible unilatéralement                              |
| Double licence commerciale (open core fermé) | impossible sur le code des tiers                  | possible                                              |
| Perception par la communauté                 | neutre à positive                                 | souvent méfiante (asymétrie de droits)                |

**Recommandation : DCO 1.1.** Le schéma retenu (permission magasins incluse dans la licence
sortante) ne requiert pas de pouvoir relicencier. Un CLA ne deviendrait utile que si le
projet décidait de vendre une licence propriétaire du code communautaire, ce qui n'est pas
envisagé.

Texte du _Developer Certificate of Origin_ 1.1 (version reproduite dans la documentation du
noyau Linux, `Documentation/process/submitting-patches.rst`) :

```text
Developer's Certificate of Origin 1.1

By making a contribution to this project, I certify that:

(a) The contribution was created in whole or in part by me and I
    have the right to submit it under the open source license
    indicated in the file; or

(b) The contribution is based upon previous work that, to the best
    of my knowledge, is covered under an appropriate open source
    license and I have the right under that license to submit that
    work with modifications, whether created in whole or in part
    by me, under the same open source license (unless I am
    permitted to submit under a different license), as indicated
    in the file; or

(c) The contribution was provided directly to me by some other
    person who certified (a), (b) or (c) and I have not modified
    it.

(d) I understand and agree that this project and the contribution
    are public and that a record of the contribution (including all
    personal information I submit with it, including my sign-off) is
    maintained indefinitely and may be redistributed consistent with
    this project or the open source license(s) involved.
```

Points d'application :

- chaque commit porte `Signed-off-by: Nom <adresse>` ; une vérification automatique en CI
  bloque les pull requests non signées ;
- « la licence indiquée dans le fichier » s'entend de la licence du répertoire telle que
  décrite dans `NOTICE`, **permission additionnelle comprise** pour `apps/pouxis` ;
- le point (d) implique une conservation indéfinie du nom et de l'adresse : c'est un
  traitement de données personnelles à mentionner dans la politique de confidentialité
  (base légale : intérêt légitime à documenter l'origine du code, RGPD art. 6(1)(f)) ;
  une adresse « noreply » de la forge est acceptée.

## 8. Modèle « open core »

Le schéma est compatible avec un open core **sans CLA** si :

- les modules payants sont des œuvres distinctes, écrites par l'entité éditrice (ou par des
  prestataires qui lui cèdent leurs droits par contrat), et ne copient pas de code
  communautaire AGPL ;
- ou bien les fonctions payantes relèvent du **service** (hébergement du relais, support,
  SSO géré) plutôt que du code, ce qui ne pose aucune question de licence.

La seconde voie est la plus simple et la plus cohérente avec la promesse « local-first,
ouvert ». Un open core au sens strict (code fermé) devrait faire l'objet d'une décision
documentée avant l'arrivée des premières contributions externes sur les parties concernées.

## 9. Titularité et code généré par IA ⚖️

- L'historique Git montre qu'une grande partie du code est produite avec un assistant d'IA
  sous la direction du fondateur. En droit de l'Union, la protection par le droit d'auteur
  suppose une « création intellectuelle propre à son auteur » (CJUE, 16 juillet 2009,
  _Infopaq International_, C-5/08) : la part du code qui ne reflète pas de choix créatifs
  humains pourrait ne pas être protégeable. Conséquence : la licence reste valable pour le
  reste, mais sa force contraignante sur les parties non protégées serait limitée. À
  documenter (revue humaine, choix d'architecture) et à faire évaluer.
- **Relicencier `packages/core` maintenant**, tant que les contributions proviennent du seul
  titulaire actuel. Après l'arrivée de contributions externes sous AGPL, le passage à la
  MPL-2.0 exigerait l'accord de chaque auteur·rice.
- Le titulaire (personne physique ou entité) doit être nommé dans `NOTICE` ; le champ est
  laissé à compléter.

## 10. Actions

| #   | Action                                                                                                                            | Responsable                  |
| --- | --------------------------------------------------------------------------------------------------------------------------------- | ---------------------------- |
| 1   | Passer `packages/core/package.json` à `"license": "MPL-2.0"` et ajouter `packages/core/LICENSE` (copie de `licenses/MPL-2.0.txt`) | équipe `core`                |
| 2   | Ajouter `"license": "AGPL-3.0-or-later"` à `apps/pouxis/package.json` ; conserver `AGPL-3.0-or-later` dans `src-tauri/Cargo.toml` | équipe `app`                 |
| 3   | En-tête SPDX dans chaque fichier source (`// SPDX-License-Identifier: MPL-2.0` ou `AGPL-3.0-or-later`)                            | toutes les équipes           |
| 4   | Section « Licence » de `CONTRIBUTING.md` : DCO, licence par répertoire, permission magasins                                       | mainteneur·euse·s            |
| 5   | Vérification DCO en CI ; génération du SBOM et des notices tierces à chaque version                                               | équipe CI/CD                 |
| 6   | Lien « Code source » dans l'écran « À propos » et route source sur le relais                                                      | équipes `app`, `sync-server` |
| 7   | Compléter le titulaire dans `NOTICE` ; dépôt de la marque ([politique](TRADEMARK_POLICY.md))                                      | fondateur                    |

## Références

- GNU Affero General Public License v3, `https://www.gnu.org/licenses/agpl-3.0.txt`.
- Mozilla Public License 2.0, `https://www.mozilla.org/MPL/2.0/`.
- Developer Certificate of Origin 1.1, `https://developercertificate.org/`.
- FSF, « VLC developer takes a stand against DRM enforcement in Apple's App Store »,
  29 octobre 2010.
- Ars Technica, « VLC media player returns to the iOS App Store after 30-month hiatus »,
  18 juillet 2013.
- CJUE, 16 juillet 2009, _Infopaq International A/S c. Danske Dagblades Forening_, C-5/08.
- Règlement (UE) 2022/1925 (règlement sur les marchés numériques).
