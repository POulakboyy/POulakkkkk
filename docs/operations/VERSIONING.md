# Versionnage

POuxis suit le [versionnage sémantique 2.0.0](https://semver.org/lang/fr/) :
`MAJEURE.MINEURE.CORRECTIF`.

## Ce qui fait foi

La version publiée est celle de l'**application** : celle que Tauri inscrit dans les
installateurs, et dont le tag de release est dérivé (`v<version>`). Elle est lue, dans cet ordre
(le même que Tauri) :

1. `apps/pouxis/src-tauri/tauri.conf.json` → `version` (valeur littérale ou chemin vers un
   `package.json`) ;
2. `apps/pouxis/src-tauri/Cargo.toml` → `[package] version` ;
3. `apps/pouxis/package.json` → `version`.

Les manifestes du monorepo (`package.json` racine, `packages/core`, `apps/pouxis`,
`apps/sync-server`, `apps/cli`, `Cargo.toml`) **avancent ensemble** à la même version. Le script
[`.github/scripts/app-version.mjs`](../../.github/scripts/app-version.mjs) affiche un
avertissement en cas d'écart et refuse une release dont le tag ne correspond pas à la version.

```sh
node .github/scripts/app-version.mjs                     # {"version":"0.1.0","tag":"v0.1.0",…}
node .github/scripts/app-version.mjs --expect-tag v0.1.0  # échoue si le tag diffère
```

## Quand incrémenter quoi

| Changement                                                                                                                                       | Incrément     |
| ------------------------------------------------------------------------------------------------------------------------------------------------ | ------------- |
| Format de données local non migré automatiquement, protocole de sync incompatible, API publique de `@pouxis/core` cassée, fonctionnalité retirée | **MAJEURE**   |
| Nouvelle fonctionnalité compatible, nouvelle API, migration de données automatique                                                               | **MINEURE**   |
| Correction de bug, performance, traduction, sans changement de comportement attendu                                                              | **CORRECTIF** |

Tant que la version est en `0.x`, l'API n'est pas stabilisée : une version **mineure** peut
contenir des changements incompatibles, signalés dans les notes de version. C'est aussi pourquoi
l'image Docker du serveur ne reçoit pas de tag majeur seul (`0`) avant `1.0.0`.

Le protocole de synchronisation doit rester compatible entre un client et un serveur de même
version majeure.

## Préversions et contrainte Windows (MSI/WiX)

Une préversion SemVer s'écrit `1.2.0-<identifiant>`. **L'installateur MSI de Windows limite
fortement ce qui est accepté** :

- Le bundler de Tauri refuse les versions dont l'identifiant de préversion ou les métadonnées de
  build ne sont pas **purement numériques** : `1.2.0-beta.1` et `1.2.0+build.5` échouent pour la
  cible MSI, alors que `1.2.0-3` passe. La contrainte vient de WiX, qui n'accepte que des numéros
  ([tauri-apps/tauri#5286](https://github.com/tauri-apps/tauri/issues/5286) ; la prise en charge
  d'un quatrième champ numérique a été ajoutée par
  [tauri-apps/tauri#6096](https://github.com/tauri-apps/tauri/pull/6096)).
- La version MSI a la forme `majeure.mineure.correctif.build`, avec au maximum **255** pour la
  majeure et la mineure, et **65 535** pour le correctif et le build
  ([référence de configuration Tauri](https://v2.tauri.app/reference/config/), qui renvoie à la
  [documentation Microsoft `ProductVersion`](https://learn.microsoft.com/en-us/windows/win32/msi/productversion)).
  Elle peut être fixée séparément par `bundle.windows.wix.version` ; à défaut, elle est dérivée de
  la version de l'application.

Règle adoptée pour POuxis :

- Les préversions publiques utilisent un **identifiant numérique unique** : `0.4.0-1`, `0.4.0-2`…
  (la release GitHub est marquée « préversion » par le workflow).
- Les métadonnées de build (`+…`) sont interdites pour une release ; le script de version les
  rejette.
- Les tags de préversion respectent la même forme : `v0.4.0-1`.

## Tags et branches

- Un tag `vX.Y.Z` (ou `vX.Y.Z-N`) sur `main` déclenche la release de bureau et la publication de
  l'image du serveur.
- Les correctifs d'une version ancienne se font sur une branche `release/X.Y`, taguée depuis
  cette branche.
- Un tag publié n'est jamais déplacé ni réutilisé : une erreur se corrige par une nouvelle
  version de correctif.
