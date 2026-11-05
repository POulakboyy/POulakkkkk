# `nlp` — capture-line parser (FR + EN)

Features 1.8, 2.7 (text side) and 2.11. Pure, deterministic, zero dependencies; every relative
expression is resolved against `ctx.now` in the explicit IANA zone `ctx.timeZone`.

```ts
import { nlp } from '@pouxis/core';

const r = nlp.parse('Réunion projet X mardi prochain 14h-16h avec @paul', {
  now: Date.now(),
  timeZone: 'Europe/Paris',
  locale: 'fr', // optional; only orders numeric dates (fr 12/03 = 12 March, en = 3 December)
});
// r.kind 'event', r.title 'Réunion projet X', r.start/r.end Tue 14:00–16:00, r.attendees ['paul']
```

## API

| Export                                    | Purpose                                                            |
| ----------------------------------------- | ------------------------------------------------------------------ |
| `parse(input, ctx): ParseResult`          | One capture line → task or event.                                  |
| `cleanTranscript(text, locale?)`          | Removes fillers (euh, hum, bah, ben, um, uh, er…) and stutters.    |
| `splitActions(text, locale?)`             | Cleans, then splits a dictation into actionable items for `parse`. |
| `inferMode(title): WorkMode \| undefined` | `create` / `organize` from the opening verb.                       |

`ParseContext`: `now`, `timeZone`, `locale?` (`'fr'` default), `defaultEventMin?` (60).

`ParseResult` fields (absent when not found): `kind`, `title`, `start`, `end`, `durationMin`,
`allDay`, `partOfDay`, `attendees[]`, `tags[]`, `priority` (1–3), `estimateMin`, `deadline`,
`recurrence` (source phrase, for `recurrence/`), `location`, `mode`, `tokens[]`, `confidence`.

`tokens` are `{ type, start, end, text, value? }` UTF-16 spans of the original input, for live
highlighting. Types: `date`, `time`, `duration`, `deadline`, `recurrence`, `attendee`, `tag`,
`priority`, `location`. Each kind keeps its first occurrence; later duplicates stay in the title.

## Semantics

- **Event vs task** — an event when there is a time of day (or "dans 2h"), a meeting word
  (réunion, rdv, call, meeting, visio, appel, déjeuner avec, lunch with…), or attendees — unless an
  action verb opens the line ("Relancer @paul" stays a task). Otherwise a task.
- **Dates** — a date without a time sets `allDay: true` and `start` = local midnight (map it to
  `Task.floatingDay`). An all-day event ends at the next midnight.
- **Weekdays** — "mardi", "ce mardi", "this tuesday": next occurrence, today included; if it is
  today and the given time has passed, a week later. "mardi prochain", "next tuesday": strictly
  after today.
- **Day numbers** — "le 12", "12 mars", "March 12", "12/03": next occurrence, today included; an
  explicit year is used as is. 29 February waits for a leap year. "3/4" (two single digits, no
  article) is left alone as a fraction.
- **Offsets** — "dans 3 jours", "in 2 weeks", "3 days from now". French idioms: "dans huit jours"
  = 7 days, "dans quinze jours" = 14. "dans 2h" / "in 30 min" is an exact instant.
- **Periods** — "la semaine prochaine": Monday of next week; "le mois prochain": the 1st;
  "fin de semaine": Friday (Sunday on a weekend); "fin du mois": last day; "ce week-end": the
  coming Saturday (today on a Sunday).
- **Times** — 14h, 14h30, 14:30, 2pm, 2:30pm, midi, noon, minuit (= end of the day), "15 heures",
  "8h du soir". Without a date: today, or tomorrow once passed. After "ce soir"/"demain soir"
  (afternoon/evening/night) a morning-looking hour moves to the afternoon ("ce soir 8h" = 20:00).
  "at 3" guesses 15:00 (1–6 → pm) with lower confidence.
- **"Nh" ambiguity** — without a prefix, N ≤ 4 is a duration ("2h", "1h30"), N ≥ 5 a time
  ("14h"). "à/at/vers" force a time, "pendant/for/environ/~" a duration; right after a late part of
  the day ("vendredi après-midi 3h") it is a time.
- **Ranges** — "14h-16h", "de 14h à 16h", "entre 9h et 10h", "from 2 to 4pm", "2-4pm"; a meridiem
  on one side is shared. An end before the start is the next day.
- **Durations** — events: `durationMin` (default `defaultEventMin`); tasks: `estimateMin`.
  "30min", "2h", "1h30", "~45 min", "1,5 h", "une demi-heure", "half an hour".
- **Deadlines** — "avant/before X" is exclusive (midnight starting X); "d'ici", "pour", "by", "due",
  "au plus tard" are inclusive (end of X). With a time, that exact instant ("avant 18h").
  "pour 2h" stays a duration.
- **Recurrence** — "tous les mardis", "chaque mois", "une semaine sur deux", "le 1er de chaque
  mois", "du lundi au vendredi", "every other day", "on mondays", "daily", "hebdo"… kept as source
  text. Named weekdays anchor `start` when no date is given.
- **Priority** — `!`/`!!`/`!!!`, `p1` (high) … `p3`, urgent/asap (3), prioritaire (2), priorité
  basse (1). "important(e)" (2) only as the first or last word.
- **Location** — conservative: "chez …", or "à/au/aux/at" + capitalised words ("au Café de Flore",
  "at Blue Bottle"). Dropped when an action verb opens the line ("Répondre à Jean").
- **Confidence** — 1 when nothing was guessed; lowered for an implicit-locale numeric date, a bare
  "at 3", a weekday/day-number mismatch, a location, and halved for an empty title.

## Performance

One left-to-right pass of sticky regexes tried only at word boundaries, without nested
quantifiers. About 10–50 µs per typical line on a laptop-class CPU; a 15 000-character adversarial
line takes a few milliseconds.

## Files

`parse.ts` (scanner + assembly), `datetime.ts`, `entities.ts`, `classify.ts`, `voice.ts`,
`lexicon.ts` (vocabulary), `calendar.ts` (zone-free calendar maths), `text.ts` (index-aligned
folding), `types.ts` (public types), `internal.ts`.
