# Vidéos de présentation — spécifications par store

Relevé du 4 novembre 2026 ; sources dans `LIMITS.md`. Un seul montage maître (16:9 et 9:16) peut
servir tous les stores, mais **Apple refuse les vidéos qui ne sont pas des captures de l'app**
(2.3.4) : pas de séquence tournée, de personnage ni de main.

|                  | Apple (App Preview)                                                                                                                                     | Google Play                                                                 | Microsoft Store (trailer)                                                                       |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| Nombre           | 3 max. par taille d'écran et par langue                                                                                                                 | 1                                                                           | plusieurs bandes-annonces possibles                                                             |
| Durée            | 15 à 30 s                                                                                                                                               | courte recommandée (lecture complète possible)                              | 60 s ou moins recommandé                                                                        |
| Format           | H.264 (.mov, .m4v, .mp4) ou ProRes 422 HQ (.mov)                                                                                                        | URL YouTube (vidéo, pas playlist ni chaîne ; sans timecode)                 | MP4 ou MOV, < 2 Go                                                                              |
| Débit / codec    | H.264 : 10–12 Mbit/s cible, progressif, jusqu'au profil High niveau 4.0                                                                                 | — (YouTube)                                                                 | cadence et définition identiques à la source                                                    |
| Cadence          | 30 i/s max.                                                                                                                                             | —                                                                           | identique à la source                                                                           |
| Audio            | Stéréo, AAC 256 kbit/s, 44,1 ou 48 kHz, toutes pistes activées                                                                                          | publicités désactivées, pas de monétisation                                 | sous-titres WebVTT < 50 Mo ; audiodescription MP3 < 500 Mo                                      |
| Résolutions      | iPhone (Dynamic Island, Face ID) : 886 × 1920 portrait ou 1920 × 886 paysage ; iPad : 1200 × 1600 ou 1600 × 1200 ; Mac : 1920 × 1080 paysage uniquement | orientation au choix, sans bandes noires latérales en portrait              | 1920 × 1080                                                                                     |
| Taille max.      | 500 Mo                                                                                                                                                  | —                                                                           | 2 Go                                                                                            |
| Image d'affiche  | 5 s par défaut, réglable                                                                                                                                | miniature YouTube                                                           | PNG 1920 × 1080 obligatoire, + image « Super hero art » 16:9 pour un affichage en tête de fiche |
| Visibilité       | —                                                                                                                                                       | publique ou non répertoriée, sans restriction d'âge, intégrable             | titre ≤ 255 caractères (`ms.trailerTitle`)                                                      |
| Contenu interdit | autre chose que des captures de l'app                                                                                                                   | mains sur l'appareil, classement, prix, appel à l'action (« Download now ») | classification par âge dans la vidéo                                                            |

Recommandations communes :

- Les trois premières secondes montrent le bénéfice principal (journée planifiée en une
  phrase) : sur Apple et Google Play, la vidéo démarre souvent sans le son.
- Texte à l'écran lisible sans le son, affiché assez longtemps ; sous-titres fournis.
- Mouvements lents et sans clignotement (au plus 3 flashs par seconde, WCAG 2.3.1) ;
  produire aussi une version sans transitions rapides pour respecter l'esprit de
  `prefers-reduced-motion`.
- Mêmes données fictives que les captures ; une version par langue (interface, sous-titres).
- Exports conseillés depuis le montage maître (ffmpeg, libx264) : 886 × 1920 et 1920 × 886 à
  30 i/s pour l'iPhone, 1200 × 1600 pour l'iPad, 1920 × 1080 pour le Mac, Windows et YouTube.
