# 0001 — Shell multiplateforme : Tauri 2

- **Statut** : accepté
- **Date** : 2026-11-04
- **Décideurs** : équipe cœur POuxis
- **Liens** : `apps/pouxis/src-tauri/`, `docs/architecture/ARCHITECTURE.md` § 4, ADR 0005, ADR 0009

## Contexte et problème

POuxis doit être publié sur iOS, Android, macOS, Windows et Linux, avec une seule équipe réduite,
une latence d'interaction perçue comme instantanée, un démarrage à froid ≤ 1,5 s sur bureau, une
empreinte mémoire ≤ 200 Mo au repos et un accès aux capacités natives (Ne pas déranger 1.11,
raccourci global 2.11, haptique 7.7, liens profonds 1.13, fenêtre flottante 5.6). Le moteur de
domaine est en TypeScript (ADR 0005) et doit être partagé avec la CLI et le serveur.

## Facteurs de décision

- Un seul code d'interface pour cinq OS et le web.
- Réutilisation directe du core TypeScript, sans pont ni sérialisation.
- Empreinte disque et mémoire, temps de démarrage.
- Accès natif sûr et granulaire (moindre privilège).
- Licence libre, gouvernance ouverte, maturité mobile.

## Options considérées

1. **Tauri 2** (WebView système + cœur Rust, mobile depuis la v2)
2. **Electron** (Chromium et Node embarqués)
3. **React Native** (+ React Native Windows/macOS)
4. **Flutter** (Dart, moteur de rendu propre)
5. **Natif par plateforme** (SwiftUI, Kotlin/Compose, WinUI, GTK)

## Décision

**Tauri 2**, avec une interface React servie dans la WebView système et des capacités natives
écrites en Rust (ou en plugins Swift/Kotlin quand l'OS l'exige), exposées à l'interface derrière
l'interface TypeScript `Platform` (`src/platform/index.ts`).

## Analyse des options

| Critère                   | Tauri 2                                            | Electron                             | React Native                                            | Flutter               | Natif                   |
| ------------------------- | -------------------------------------------------- | ------------------------------------ | ------------------------------------------------------- | --------------------- | ----------------------- |
| iOS + Android + 3 bureaux | Oui (mobile depuis la v2)                          | Bureau seulement                     | Mobile ; bureau par forks Microsoft, Linux non officiel | Oui                   | Oui, cinq bases de code |
| Réutilisation du core TS  | Directe                                            | Directe                              | Directe (Hermes)                                        | Non (Dart) ou pont JS | Non ou pont JS          |
| Empreinte                 | WebView de l'OS, binaire léger                     | Chromium + Node par app              | Moyenne                                                 | Moteur embarqué       | Minimale                |
| Sécurité du pont natif    | Capacités déclaratives par fenêtre                 | Isolation à configurer soigneusement | Modules natifs sans permissions fines                   | Canaux de plateforme  | Natif                   |
| Rendu identique partout   | Non : WebKit, WebView2, WebKitGTK, Android WebView | Oui (Chromium)                       | Composants natifs                                       | Oui                   | Non                     |
| Complexité pour l'équipe  | Faible à moyenne (Rust ponctuel)                   | Faible                               | Moyenne                                                 | Moyenne (Dart)        | Très élevée             |

**Electron** est écarté faute de cible mobile, et parce qu'embarquer Chromium et Node va contre
le budget mémoire. **React Native** imposerait de réécrire l'interface pour le bureau sur des
forks inégalement maintenus, sans Linux officiel. **Flutter** obligerait à réécrire le moteur
en Dart ou à le faire tourner via un pont JS, perdant le partage avec la CLI et le relais.
**Le natif** multiplie le coût par cinq.

## Conséquences

- **Positives** : une seule interface web, le core importé tel quel, accès natif déclaratif
  (`capabilities/*.json`, `withGlobalTauri: false`, CSP), binaire léger, version web gratuite.
- **Négatives** : hétérogénéité des moteurs de rendu (WebKit sur Apple et Linux, Chromium sur
  Windows et Android) : tests visuels et fonctionnels requis sur chaque moteur, fonctionnalités
  web récentes (WebGPU notamment) à vérifier par plateforme.
- Certaines capacités n'ont **pas d'API publique** (Ne pas déranger sous Windows et iOS) : elles
  sont implémentées honnêtement avec repli interne (`focus.rs`), jamais simulées.
- Les extensions natives (Share Extension iOS, filtres d'intention Android, App Intents) restent
  du code Swift/Kotlin hors WebView.

## À réévaluer si

- une WebView cible empêche durablement de tenir les budgets de fluidité malgré les optimisations ;
- le support mobile de Tauri régresse ou n'est plus maintenu.
