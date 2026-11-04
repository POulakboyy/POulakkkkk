# Secrets CI/CD

Inventaire des secrets utilisés par les workflows, où les créer et comment les faire tourner.
Aucun secret n'est écrit dans le dépôt : les workflows les lisent uniquement via
`${{ secrets.NOM }}`, et ne les exportent que s'ils sont définis.

Création : **Settings → Secrets and variables → Actions → New repository secret**. Pour limiter
l'exposition, placez les secrets de signature dans un **environnement** protégé (par exemple
`release`, avec relecteurs requis), puis déclarez `environment: release` sur les jobs concernés.

## Ordinateur — macOS (`release.yml`)

| Secret                       | Contenu                                                                               |
| ---------------------------- | ------------------------------------------------------------------------------------- |
| `APPLE_CERTIFICATE`          | Certificat **Developer ID Application** exporté en `.p12`, encodé en base64.          |
| `APPLE_CERTIFICATE_PASSWORD` | Mot de passe du `.p12`.                                                               |
| `APPLE_SIGNING_IDENTITY`     | Nom de l'identité, par ex. `Developer ID Application: Nom (TEAMID)`.                  |
| `APPLE_ID`                   | Identifiant Apple du compte développeur, pour la notarisation.                        |
| `APPLE_PASSWORD`             | **Mot de passe pour application** (appleid.apple.com), pas le mot de passe du compte. |
| `APPLE_TEAM_ID`              | Identifiant d'équipe (10 caractères) ; réutilisé pour iOS.                            |

```sh
base64 -i DeveloperID.p12 | pbcopy   # macOS : copie le certificat encodé
```

## Ordinateur — Windows (`release.yml`)

| Secret / variable                  | Contenu                                                                      |
| ---------------------------------- | ---------------------------------------------------------------------------- |
| `WINDOWS_CERTIFICATE`              | Certificat de signature de code (Authenticode) en `.pfx`, encodé en base64.  |
| `WINDOWS_CERTIFICATE_PASSWORD`     | Mot de passe du `.pfx`.                                                      |
| `WINDOWS_TIMESTAMP_URL` (variable) | URL d'horodatage de l'autorité ; par défaut `http://timestamp.digicert.com`. |

```powershell
[Convert]::ToBase64String([IO.File]::ReadAllBytes('signing.pfx')) | Set-Clipboard
```

Les certificats dont la clé est conservée sur un matériel (HSM, service cloud de signature) ne
s'exportent pas en `.pfx` : il faut alors une commande de signature personnalisée
(`bundle.windows.signCommand` dans la configuration Tauri) à la place de cette étape.

## Mises à jour intégrées (`release.yml`)

| Secret                               | Contenu                                                        |
| ------------------------------------ | -------------------------------------------------------------- |
| `TAURI_SIGNING_PRIVATE_KEY`          | Clé privée de signature des mises à jour (contenu du fichier). |
| `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` | Mot de passe de cette clé.                                     |

```sh
npm run tauri -w @pouxis/app -- signer generate -w ~/.tauri/pouxis.key
```

La **clé publique** correspondante va dans la configuration du module de mise à jour
(`plugins.updater.pubkey`) ; elle n'est pas secrète. **Perdre la clé privée empêche de livrer des
mises à jour aux installations existantes** : conservez-en une copie chiffrée hors de GitHub.

## Android (`mobile.yml`)

| Secret                 | Contenu                                                    |
| ---------------------- | ---------------------------------------------------------- |
| `ANDROID_KEY_BASE64`   | Keystore d'envoi (`upload-keystore.jks`) encodé en base64. |
| `ANDROID_KEY_ALIAS`    | Alias de la clé (par ex. `upload`).                        |
| `ANDROID_KEY_PASSWORD` | Mot de passe du keystore et de la clé.                     |

```sh
keytool -genkey -v -keystore upload-keystore.jks -keyalg RSA -keysize 2048 -validity 10000 -alias upload
base64 -i upload-keystore.jks
```

Avec la signature d'application par Google Play, ce keystore n'est que la **clé d'envoi** : elle
peut être réinitialisée auprès de Google en cas de perte.

## iOS (`mobile.yml`)

Signature manuelle :

| Secret                     | Contenu                                                           |
| -------------------------- | ----------------------------------------------------------------- |
| `IOS_CERTIFICATE`          | Certificat de distribution Apple en `.p12`, encodé en base64.     |
| `IOS_CERTIFICATE_PASSWORD` | Mot de passe du `.p12`.                                           |
| `IOS_MOBILE_PROVISION`     | Profil de provisionnement (`.mobileprovision`), encodé en base64. |

Ou signature automatique via une clé API App Store Connect :

| Secret             | Contenu                                                                                                                     |
| ------------------ | --------------------------------------------------------------------------------------------------------------------------- |
| `APPLE_API_ISSUER` | Identifiant de l'émetteur (Issuer ID).                                                                                      |
| `APPLE_API_KEY`    | Identifiant de la clé (Key ID).                                                                                             |
| `APPLE_API_KEY_P8` | Contenu du fichier `AuthKey_<KeyID>.p8` ; le workflow l'écrit dans un fichier temporaire et en déduit `APPLE_API_KEY_PATH`. |

`APPLE_TEAM_ID` (voir macOS) est transmis en `APPLE_DEVELOPMENT_TEAM`.

## Registre de conteneurs (`sync-server.yml`)

Aucun secret : l'image est poussée sur GHCR avec le `GITHUB_TOKEN` du workflow
(`packages: write`). Après la première publication, réglez la visibilité du paquet
(**Packages → pouxis-sync-server → Package settings**) et liez-le au dépôt.

## Rotation et incident

- **Calendrier** : notez la date d'expiration des certificats Apple et Windows dans le
  [RELEASE_CHECKLIST.md](RELEASE_CHECKLIST.md) et renouvelez-les au moins un mois avant.
- **Fuite suspectée** : révoquez immédiatement le certificat ou la clé chez l'émetteur (Apple
  Developer, autorité Windows, Google Play), supprimez le secret GitHub, générez-en un nouveau,
  puis consultez les journaux des workflows récents.
- **Changement de clé de mise à jour** : impossible sans casser les mises à jour automatiques ;
  les utilisateurs devront réinstaller manuellement. À éviter absolument.
