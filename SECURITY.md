# Politique de sécurité

_English summary below._

POuxis protège des données personnelles et professionnelles sensibles. Nous traitons chaque
signalement de vulnérabilité avec sérieux et vous remercions de nous aider à garder
l'application sûre.

## Versions prises en charge

POuxis est en développement actif (pré-1.0). Seule la dernière version publiée et la branche
`main` reçoivent des correctifs de sécurité.

| Version                      | Correctifs de sécurité |
| ---------------------------- | ---------------------- |
| `main` (développement)       | ✅                     |
| Dernière version 0.x publiée | ✅                     |
| Versions 0.x antérieures     | ❌ — mettez à jour     |

À partir de la 1.0, la version majeure courante et la précédente seront prises en charge
pendant au moins six mois après la sortie d'une nouvelle majeure.

## Signaler une vulnérabilité

**N'ouvrez pas d'issue publique.** Utilisez le signalement privé de GitHub :

1. Rendez-vous sur l'onglet **Security** du dépôt
   [`POulakboyy/POulakkkkk`](https://github.com/POulakboyy/POulakkkkk/security/advisories/new) ;
2. cliquez sur **Report a vulnerability** (GitHub Security Advisories) ;
3. décrivez le problème, la version ou le commit concerné, les étapes de reproduction, l'impact
   estimé et, si possible, une preuve de concept minimale.

Vous pouvez écrire en français ou en anglais. Ne joignez jamais de données personnelles réelles.

## Délais d'engagement

Délais visés (jours calendaires), à compter de la réception :

| Étape                                        | Délai                                                     |
| -------------------------------------------- | --------------------------------------------------------- |
| Accusé de réception                          | 3 jours                                                   |
| Première évaluation (validité, gravité CVSS) | 7 jours                                                   |
| Correctif — gravité critique                 | 14 jours                                                  |
| Correctif — gravité élevée                   | 30 jours                                                  |
| Correctif — gravité moyenne ou faible        | 90 jours                                                  |
| Divulgation publique coordonnée              | au plus tard 90 jours, ou dès la publication du correctif |

Nous vous tenons informé à chaque étape, vous créditons dans l'avis publié (sauf si vous
préférez l'anonymat) et demandons un identifiant CVE lorsque c'est pertinent.

## Périmètre

**Dans le périmètre**

- le moteur `packages/core`, en particulier `src/crypto` (coffres chiffrés, liens de partage,
  journal d'audit) ;
- le client `apps/pouxis` (web et shell Tauri : IPC, capacités, stockage local) ;
- le relais `apps/sync-server` et l'outil `apps/cli` ;
- le site `website/` lorsqu'il permet d'attaquer les utilisateurs de l'application.

Exemples de problèmes recherchés : contournement du chiffrement de bout en bout, fuite de clé ou
de texte clair, falsification d'un jeton de partage ou d'un journal d'audit, élévation de
privilèges via l'IPC Tauri, XSS, injection, accès non autorisé à un espace de synchronisation.

**Hors périmètre**

- attaques nécessitant un appareil déjà compromis (logiciel espion, accès root) ;
- ingénierie sociale, attaques physiques, déni de service volumétrique ;
- rapports automatisés sans démonstration d'impact (en-têtes manquants sans scénario, versions
  de dépendances sans exploitabilité) ;
- vulnérabilités de services tiers (signalez-les à leurs éditeurs) ;
- instances auto-hébergées mal configurées par leurs opérateurs.

Le modèle de menaces ([`docs/security/THREAT_MODEL.md`](docs/security/THREAT_MODEL.md)) et
l'architecture de sécurité
([`docs/security/SECURITY_ARCHITECTURE.md`](docs/security/SECURITY_ARCHITECTURE.md)) décrivent
les garanties attendues et les limites connues. La dernière revue de sécurité est consignée dans
[`docs/security/REVIEW-2026-11.md`](docs/security/REVIEW-2026-11.md).

## Sphère de sécurité (_safe harbour_)

Nous considérons comme autorisée toute recherche menée de bonne foi dans le respect de cette
politique, et ne lancerons aucune action contre vous à ce titre, à condition que vous :

- ne testiez que sur vos propres comptes, données et instances ;
- n'accédiez pas aux données d'autrui, ne les modifiiez ni ne les supprimiez, et arrêtiez dès
  que vous rencontrez des données qui ne sont pas les vôtres ;
- ne dégradiez pas le service pour les autres utilisateurs ;
- nous laissiez un délai raisonnable pour corriger avant toute divulgation.

Si une action en justice était engagée par un tiers contre vous pour une recherche conforme à
cette politique, nous ferions savoir qu'elle était autorisée. Ce projet ne propose pas de
programme de primes.

---

## English summary

- **Supported versions:** `main` and the latest published 0.x release.
- **Reporting:** do **not** open a public issue. Use GitHub's private vulnerability reporting:
  _Security → Report a vulnerability_ on
  [`POulakboyy/POulakkkkk`](https://github.com/POulakboyy/POulakkkkk/security/advisories/new).
  French or English is fine.
- **Targets:** acknowledgement within 3 days, triage within 7 days, fix within 14 / 30 / 90
  days for critical / high / medium-low severity, coordinated disclosure within 90 days.
- **Scope:** `packages/core` (notably `src/crypto`), `apps/pouxis` (web and Tauri shell),
  `apps/sync-server`, `apps/cli`. Out of scope: compromised devices, social engineering,
  volumetric DoS, third-party services, scanner output without demonstrated impact.
- **Safe harbour:** good-faith research that follows this policy is authorized; we will not
  pursue legal action. Only test your own accounts and data. No bug bounty.
