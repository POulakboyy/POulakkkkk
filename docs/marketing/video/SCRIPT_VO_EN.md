# Script voix off — anglais (film principal, 105 s)

> Version anglaise, à enregistrer par le fondateur (ou par une voix professionnelle si l'accent
> gêne la compréhension ; décision à prendre après une prise test). Les répliques sont
> **identiques** à `scenes[].vo.en` de [`shotlist.json`](./shotlist.json), qui fait foi.
> Les consignes de jeu sont en français pour l'équipe ; le texte à dire est en anglais.

## Intention

Même intention que la version française : raconter une journée, pas une liste de fonctions.
Anglais naturel et direct, contractions bienvenues (« it's », « you'd »), conformément à
`docs/design/UX_WRITING.md`. Les phrases anglaises sont plus courtes : profiter de la place pour
**ralentir**, pas pour ajouter des mots.

## Script

```text
[OPENING]                                                   h01 · 00:00.60 · window 4.3 s
Some mornings,
the day is full before it’s even begun.
[silence — 0.5 s]

[CONTEXT — one sentence]                                    h02 · 00:05.80 · window 5.5 s
So start by emptying it.
One sentence, the way you’d say it.

                                                            h03 · 00:12.80 · window 3.0 s
And it’s already there. On your phone, too.

[SPIRAL 1 — planning]                                       h04 · 00:16.75 · window 6.5 s
Everything else falls into place,
with room to breathe between meetings.
[slow down on “room to breathe”]

                                                            h05 · 00:24.25 · window 6.0 s
A task runs long? What comes next shifts.
Your meetings stay put.

                                                            h06 · 00:31.65 · window 2.4 s
And what’s done… is done.
[silence — the whole h07 card, 3.75 s]

[SPIRAL 2 — focus]                                          h08 · 00:39.35 · window 6.0 s
Planning isn’t the work.
[pause]
The work is this moment.

                                                            h09 · 00:46.55 · window 4.4 s
One task, one timer.
Nothing else asking for your attention.

[SPIRAL 3 — thinking]                                       h10 · 00:51.75 · window 5.2 s
Ideas never arrive on schedule.
So drop them here, as they come.

                                                            h11 · 00:58.10 · window 6.2 s
Then step back.
On the canvas, a list becomes a map.

                                                            h12 · 01:05.40 · window 5.2 s
And sometimes, POuxis brings together
two notes that had never met.
[silence — the whole h13 card, 3.75 s]

[SPIRAL 4 — looking back]                                   h14 · 01:15.40 · window 5.4 s
On Sunday, a review without judgement:
what moved, what’s stuck.

                                                            h15 · 01:21.55 · window 3.0 s
No signal? Everything keeps working.

                                                            h16 · 01:25.50 · window 6.2 s
iPhone, Android, Mac or Windows:
the same day, in sync.

                                                            h17 · 01:32.90 · window 4.4 s
Your data stays with you.
Take it with you whenever you like.

[OPEN ENDING]                                               h18 · 01:38.70 · window 3.2 s
POuxis.
[pause]
Your time, made clear.
[silence to black — about 3 s]
```

Note : la shotlist écrit « And what’s done is done. » ; la pause marquée « … » ici est une
consigne de jeu, le sous-titre reste sans points de suspension.

## Formats courts

| Format                     | Plan          | Réplique                       | Fenêtre |
| -------------------------- | ------------- | ------------------------------ | ------- |
| `cut-30-16x9`              | `h18-endcard` | POuxis. Your time, made clear. | 3.2 s   |
| `vertical-15-9x16`, `-30-` | `v05-endcard` | POuxis. Your time, made clear. | 2.1 s   |

Pas de voix off dans les aperçus App Store et Google Play.

## Variantes de secours

Voir `CREATIVE_BRIEF.md` §8 :

- **h11 (dependency graph)** : “Then step back. Each task waits for the one before it, without
  you keeping track.”
- **h12 (sorted brain dump)** : “And every line finds its place, whenever you’re ready to look.”

## Enregistrement

Mêmes conditions que la version française ; nommage `vo_en_h04_take2.wav`.
