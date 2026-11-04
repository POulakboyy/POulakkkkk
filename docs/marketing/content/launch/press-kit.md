# Dossier de presse — POuxis

> Une page. Tout ce qui figure ici doit rester vrai le jour de la diffusion : relire contre le
> [registre des affirmations](../../stores/claims-register.md) et la feuille de route. Aucun
> chiffre d'utilisateurs, de téléchargements ou d'étoiles n'est mentionné tant qu'il n'est pas
> mesuré et daté.

## En une phrase

POuxis est une application open source qui réunit agenda, tâches et idées, fonctionne d'abord
sans connexion et synchronise vos appareils avec un chiffrement de bout en bout.

## En un paragraphe

POuxis part d'un constat simple : une journée est souvent dispersée entre plusieurs applications
qui réclament chacune de l'attention. L'application réunit l'agenda, les tâches et les idées
autour d'une boucle — capturer, planifier, se concentrer, faire le bilan. On écrit « Réunion
projet mardi 14 h-16 h », l'événement est créé et les tâches se placent dans les créneaux libres,
autour des rendez-vous fixes. Les données sont stockées sur l'appareil ; la synchronisation est
facultative et passe par un relais qui ne peut pas lire le contenu. Le code est public.

## Faits

| Élément     | Détail                                                                                                                    |
| ----------- | ------------------------------------------------------------------------------------------------------------------------- |
| Nom         | POuxis (graphie invariable, sans article)                                                                                 |
| Créateur    | {{NOM DU FONDATEUR}}, créateur de la chaîne YouTube K13 Studios                                                           |
| Plateformes | macOS, Windows, Linux ; iOS et Android en bêta <!-- ajuster le jour J -->                                                 |
| Prix        | Gratuit <!-- confirmer le modèle économique avant diffusion -->                                                           |
| Licences    | Moteur `@pouxis/core` : MPL-2.0 · applications et relais : AGPL-3.0-or-later · documentation : CC-BY-4.0                  |
| Données     | Stockées sur l'appareil ; aucune collecte par défaut ; synchronisation chiffrée de bout en bout (AES-256-GCM côté client) |
| Technique   | Moteur TypeScript sans dépendance ; interface React ; coque native Tauri 2 ; relais Node auto-hébergeable                 |
| Langues     | Français, anglais                                                                                                         |
| Code source | {{GITHUB_URL}}                                                                                                            |
| Site        | {{SITE_URL}}                                                                                                              |

## Ce qui distingue POuxis

1. **Local d'abord.** L'application s'ouvre et fonctionne sans réseau ; la synchronisation est un
   service, pas une condition.
2. **Ouvert et vérifiable.** Le code, les décisions d'architecture et les choix de licence sont
   publics.
3. **Sans culpabilité.** Pas de badges anxiogènes ; des séries qui se mettent en pause au lieu de
   retomber à zéro (dans le moteur, interface à venir).
4. **Honnête sur la recherche.** Les fonctions inspirées de travaux publiés citent leurs sources
   et leurs limites dans un document public ; POuxis ne présente rien comme « prouvé ».

## Citation du fondateur

> « J'avais sept applications pour une seule journée, et chacune voulait être le centre. Je
> voulais un outil qui m'aide à organiser mon temps sans me faire sentir que je n'en fais jamais
> assez. Je le construis en public, et le code est ouvert, parce qu'un outil qui touche à votre
> temps doit pouvoir être vérifié. »

> Citation proposée : le fondateur la valide ou la réécrit avant toute diffusion.

## Ce que POuxis ne fait pas (encore)

Pas de fonction d'intelligence artificielle, pas de collaboration en équipe, pas de version web
distribuée. La première version couvre 19 des 100 idées du brief d'origine.

## Ressources

- Logos (SVG, PNG) : `docs/brand/assets/`, `docs/brand/png/` — usage selon la
  [politique de marque](../../../legal/TRADEMARK_POLICY.md).
- Captures d'écran : jeu des stores (`docs/marketing/stores/screenshots.md`).
- Vidéo de présentation : `docs/marketing/video/`.
- Base scientifique : `docs/research/SCIENTIFIC_BASIS.md`.

## Contact presse

{{PRESS_EMAIL}} — réponse sous quelques jours ouvrés.
