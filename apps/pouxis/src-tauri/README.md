# Shell natif POuxis (Tauri 2)

Ce dossier contient l’enveloppe native de POuxis pour macOS, Windows, Linux, iOS et Android.
L’interface est le client web de `apps/pouxis` (React + Vite) ; le code Rust ne fait que ce
que le navigateur ne peut pas faire : mode Concentration du système, liens `pouxis://`,
icône de barre des menus, raccourci global de capture et fenêtres flottantes.

## Prérequis

Commun à toutes les plateformes : Node ≥ 22.18, `npm install` à la racine du dépôt, Rust
stable ≥ 1.90 (`rustup`). La CLI Tauri est fournie par `@tauri-apps/cli` (pas d’installation
globale).

| Système               | Dépendances                                                                                                                                                                    |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| macOS ≥ 12            | Xcode Command Line Tools (`xcode-select --install`) ; Xcode complet pour iOS.                                                                                                  |
| Windows 10/11         | Microsoft C++ Build Tools (charge « Développement Desktop en C++ »). WebView2 est préinstallé sur Windows 11 ; l’installateur le télécharge sinon (`downloadBootstrapper`).    |
| Linux (Debian/Ubuntu) | `sudo apt install libwebkit2gtk-4.1-dev build-essential curl wget file libxdo-dev libssl-dev libayatana-appindicator3-dev librsvg2-dev`                                        |
| iOS                   | macOS, Xcode, `rustup target add aarch64-apple-ios aarch64-apple-ios-sim x86_64-apple-ios`, CocoaPods.                                                                         |
| Android               | Android Studio, SDK + NDK, `JAVA_HOME`, `ANDROID_HOME`, `NDK_HOME`, `rustup target add aarch64-linux-android armv7-linux-androideabi i686-linux-android x86_64-linux-android`. |

Référence officielle : <https://v2.tauri.app/start/prerequisites/>.

## Commandes

À lancer depuis la racine du dépôt :

```sh
npm run tauri dev -w @pouxis/app              # bureau, rechargement à chaud (Vite sur :1420)
npm run tauri build -w @pouxis/app            # installateurs du système courant

npm run tauri ios init -w @pouxis/app         # une fois : génère src-tauri/gen/apple
npm run tauri ios dev -w @pouxis/app          # simulateur ou appareil
npm run tauri ios build -w @pouxis/app

npm run tauri android init -w @pouxis/app     # une fois : génère src-tauri/gen/android
npm run tauri android dev -w @pouxis/app
npm run tauri android build -w @pouxis/app
```

Tests Rust (logique pure, exécutables sur n’importe quel hôte) :

```sh
cd apps/pouxis/src-tauri
cargo test
cargo clippy --all-targets
cargo fmt --check
```

### Icônes

Les icônes de `icons/` sont générées à partir de l’icône de marque, jamais dessinées à la
main :

```sh
cd apps/pouxis
npx tauri icon ../../docs/brand/assets/app-icon-1024.svg -o src-tauri/icons
```

Relancez cette commande après toute modification de `docs/brand/assets/app-icon-1024.svg`
(source vectorielle, préférée à l’export `app-icon-1024.png`, qui n’a pas de couche alpha).
Les projets iOS/Android générés par `ios init` / `android init` récupèrent ensuite les
icônes de `icons/ios` et `icons/android`.

## Architecture

| Fichier            | Rôle                                                                              |
| ------------------ | --------------------------------------------------------------------------------- |
| `src/lib.rs`       | Point d’entrée commun (`run`, `mobile_entry_point`), plugins, commandes.          |
| `src/focus.rs`     | Commandes `set_focus_mode` / `focus_mode_support` (fonction 1.11).                |
| `src/deep_link.rs` | Validation et file d’attente des liens `pouxis://` (fonction 1.13).               |
| `src/desktop.rs`   | Barre des menus, raccourci global, fenêtres `capture` et `scrapbook` (2.11, 5.6). |
| `src/events.rs`    | Noms d’événements et libellés de fenêtres, miroir de `src/platform/events.ts`.    |
| `capabilities/`    | Permissions accordées à chaque fenêtre (voir « Sécurité »).                       |

Côté interface, `src/platform/init.ts` détecte `__TAURI_INTERNALS__` et charge
`src/platform/tauri.ts` à la demande : la version web n’embarque aucun code Tauri.

### Liens profonds

- `pouxis://event/<id>` ouvre l’événement, `pouxis://task/<id>` ouvre la tâche.
- L’identifiant n’accepte que `[A-Za-z0-9_-]` (128 caractères au plus) ; tout autre lien est
  ignoré sans être journalisé (son contenu est contrôlé par un tiers).
- L’URL transmise à l’interface est reconstruite à partir des éléments validés ; les
  paramètres de requête et les fragments sont ignorés.
- Un lien reçu avant que l’interface n’écoute (démarrage à froid) est mis en file
  (16 au maximum) puis livré par `deep_link_take_pending`.
- Windows et Linux : un second lancement transmet le lien à l’instance déjà ouverte
  (`tauri-plugin-single-instance`). En développement et pour les AppImage, le schéma est
  enregistré au démarrage ; les paquets `.deb`, `.rpm`, `.msi` et NSIS l’enregistrent à
  l’installation.

### Capture rapide et scrapbook (bureau)

- `Cmd/Ctrl + Maj + Espace` affiche ou masque une petite fenêtre sans bordure, toujours au
  premier plan, qui charge `index.html#/capture`. Elle se masque dès qu’elle perd le focus.
  L’événement `pouxis:capture-shown` lui demande de réinitialiser et focaliser son champ.
- Si le raccourci est déjà pris par une autre application, l’échec est journalisé et
  l’application démarre quand même ; la capture reste accessible depuis la barre des menus.
- La fenêtre `scrapbook` (`index.html#/scrapbook`) reçoit les fichiers déposés comme des
  événements HTML5 `drop` ordinaires (objets `File`) : le gestionnaire natif de Tauri y est
  désactivé, si bien qu’aucune fenêtre n’a besoin d’un accès au système de fichiers.
- Barre des menus : « Capture rapide », « Aujourd’hui », « Quitter POuxis ». Les libellés
  suivent `LC_ALL` / `LC_MESSAGES` / `LANG` (français si la locale commence par `fr`,
  anglais sinon), car le menu est construit avant le chargement de l’interface.

## Mode Concentration du système (1.11)

`set_focus_mode(on)` renvoie toujours `{ applied, method, reason }` : `applied` n’est vrai que
si le réglage du système a réellement changé. Sinon, l’interface bascule sur son propre mode
calme (notifications internes suspendues) et explique la raison.

| Système       | Méthode                 | Détails                                                                                                                                                                                                                                                                                                                                                                                            |
| ------------- | ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| macOS 12+     | `macos-shortcuts`       | macOS n’offre pas d’API publique pour la Concentration. POuxis exécute deux raccourcis que l’utilisateur crée une fois dans l’app Raccourcis : **« POuxis Focus On »** (action « Activer/désactiver Concentration » → activer) et **« POuxis Focus Off »** (→ désactiver), via `/usr/bin/shortcuts`. Raisons possibles : `shortcut-missing`, `shortcuts-cli-missing`, `command-failed`, `timeout`. |
| Linux (GNOME) | `gnome-gsettings`       | Bascule `org.gnome.desktop.notifications show-banners` et restaure la valeur d’origine à la sortie. Autres bureaux : `desktop-not-gnome`.                                                                                                                                                                                                                                                          |
| Windows       | aucune                  | L’Assistant de concentration n’a pas d’API publique (`FocusSessionManager` est une fonctionnalité à accès limité) : `no-public-api`.                                                                                                                                                                                                                                                               |
| iOS           | aucune                  | Une app ne peut pas activer la Concentration (`os-restricted`). Piste : une extension App Intents « Focus Filter » en Swift, qui permet à POuxis d’adapter son contenu quand l’utilisateur active une Concentration.                                                                                                                                                                               |
| Android       | aucune (pour l’instant) | Possible avec un plugin Kotlin appelant `NotificationManager.setInterruptionFilter` après obtention de l’accès « Ne pas déranger » (`ACCESS_NOTIFICATION_POLICY`) : `needs-native-plugin`.                                                                                                                                                                                                         |

Les commandes externes sont lancées sans shell, avec des arguments fixes, une sortie bornée
(1 Mio) et un délai maximal (5 s pour les lectures, 15 s pour l’exécution d’un raccourci).

## Matrice des capacités

| Capacité                                        |         macOS         |        Windows        |                  Linux                   |          iOS          |      Android       |
| ----------------------------------------------- | :-------------------: | :-------------------: | :--------------------------------------: | :-------------------: | :----------------: |
| Notifications locales                           |          ✅           |          ✅           |                    ✅                    |          ✅           |         ✅         |
| Mode Concentration du système                   | ⚠️ raccourcis à créer | ❌ mode calme interne |           ⚠️ GNOME uniquement            | ❌ mode calme interne | ❌ plugin à écrire |
| Retour haptique                                 |          ❌           |          ❌           |                    ❌                    |   ✅ Taptic Engine    |     ✅ vibreur     |
| Raccourci global de capture                     |          ✅           |          ✅           | ⚠️ X11 ; non pris en charge sous Wayland |           —           |         —          |
| Fenêtre de capture flottante                    |          ✅           |          ✅           |                    ✅                    |           —           |         —          |
| Scrapbook (dépôt de fichiers)                   |          ✅           |          ✅           |                    ✅                    |           —           |         —          |
| Icône de barre des menus                        |          ✅           |          ✅           |   ⚠️ requiert libayatana-appindicator    |           —           |         —          |
| Liens `pouxis://`                               |          ✅           |          ✅           |                    ✅                    |          ✅           |         ✅         |
| Mémorisation de la taille/position des fenêtres |          ✅           |          ✅           |                    ✅                    |           —           |         —          |

Légende : ✅ pris en charge, ⚠️ partiel ou sous condition, ❌ impossible ou non implémenté,
— sans objet.

## Sécurité

- **CSP stricte** (`tauri.conf.json`) : scripts uniquement depuis l’application, pas
  d’`eval`, pas d’iframe ni d’objet, `form-action 'none'`. `connect-src` autorise `https:` et
  `wss:` pour permettre la synchronisation vers un serveur auto-hébergé choisi par
  l’utilisateur ; HTTP en clair est refusé hors développement.
- **Moindre privilège** : `build.rs` déclare les commandes de l’application, si bien que
  chacune doit être accordée explicitement.
  - `default.json` (fenêtre `main`, toutes plateformes) : écoute d’événements,
    notifications, mode Concentration, file des liens profonds.
  - `desktop.json` (`main`, bureau) : raccourcis globaux définis par l’app, scrapbook.
  - `overlays.json` (`capture`, `scrapbook`, bureau) : écoute d’événements et
    `hide_overlay`, qui ne masque que ces deux fenêtres.
  - `mobile.json` (`main`, iOS/Android) : retours haptiques.
  - Aucune fenêtre n’a accès au système de fichiers, au shell ni à l’ouverture d’URL.

## Signature et notarisation

- **macOS** : certificat « Developer ID Application ». Variables :
  `APPLE_SIGNING_IDENTITY`, puis pour la notarisation soit `APPLE_ID`, `APPLE_PASSWORD`
  (mot de passe d’application) et `APPLE_TEAM_ID`, soit une clé App Store Connect
  (`APPLE_API_ISSUER`, `APPLE_API_KEY`, `APPLE_API_KEY_PATH`). `tauri build` signe, notarise
  et agrafe le ticket. Le Hardened Runtime est activé.
- **Windows** : certificat de signature de code (OV/EV ou Azure Trusted Signing), renseigné
  dans `bundle.windows` (`certificateThumbprint`, `digestAlgorithm`, `timestampUrl`) ou via
  `signCommand`. Sans signature, SmartScreen avertit l’utilisateur.
- **Linux** : les paquets `.deb` / `.rpm` peuvent être signés avec GPG ; l’AppImage peut
  l’être via `SIGN=1` et `APPIMAGETOOL_SIGN_PASSPHRASE`.
- **iOS** : compte Apple Developer, `bundle.iOS.developmentTeam` (ou
  `APPLE_DEVELOPMENT_TEAM`), profils de provisionnement gérés par Xcode.
- **Android** : keystore de publication référencé dans `gen/android/keystore.properties`
  (jamais commité) ; Play App Signing recommandé.

Détails : <https://v2.tauri.app/distribute/>.

## Limites connues

- Le mode Concentration iOS et Android nécessite des plugins natifs (Swift, Kotlin) non
  encore écrits.
- Les liens `https://` universels (Universal Links / App Links) ne sont pas configurés :
  seul le schéma `pouxis://` l’est.
- Sous Wayland, les raccourcis globaux ne sont pas disponibles ; la capture rapide reste
  accessible depuis la barre des menus.
- Fermer la fenêtre principale quitte l’application (y compris les fenêtres `capture` et
  `scrapbook`), afin qu’aucun processus ne reste actif sans fenêtre à afficher.
