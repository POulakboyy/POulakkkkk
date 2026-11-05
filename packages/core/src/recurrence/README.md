# recurrence

Recurrence engine (feature 2.9). Three syntaxes compile to one `RecurrenceRule` AST
(`types.ts`, RFC 5545 semantics plus holiday exclusion and cron's OR day matching), expanded in
an explicit IANA zone through `time.ts`.

```ts
import { recurrence } from '@pouxis/core';

const rule = recurrence.parseRule('le 3ème mardi ouvré de chaque mois à 10h');
recurrence.occurrences(rule!, { from, to, timeZone: 'Europe/Paris', holidays: ['2025-11-11'] });
recurrence.next(rule!, Date.now(), { timeZone: 'Europe/Paris' });
recurrence.toRRule(rule!); // null: holiday exclusion has no RRULE equivalent
recurrence.describe(rule!, 'en'); // "every month on the third business Tuesday at 10:00 AM"
```

## API

| Function                                       | Purpose                                                                       |
| ---------------------------------------------- | ----------------------------------------------------------------------------- |
| `parseRule(text, { locale? })`                 | Auto-detects RRULE (`FREQ=`), cron (5 fields / `@daily`…), literal FR/EN.     |
| `parseRRule`, `parseCron`, `parseLiteral`      | Single-syntax parsers. All return `null` unless the whole text is understood. |
| `occurrences(rule, opts)`                      | Instants in `[from, to)`, ascending, at most `limit` (default 10 000).        |
| `next(rule, after, opts)`                      | First instant strictly after `after`, or `null`.                              |
| `toRRule(rule)`                                | RRULE value without the `RRULE:` prefix, or `null` when inexpressible.        |
| `describe(rule, locale = 'fr', { timeZone? })` | Human-readable French / English sentence.                                     |

`OccurrenceOptions`: `from`, `to` (may be `Infinity`), `timeZone`, `dtstart?`, `limit?`,
`holidays?` (local `YYYY-MM-DD`; malformed dates throw `RangeError`).

## Semantics

- **Series start.** `dtstart` anchors `interval` phases and `count`, and supplies what a rule
  leaves unspecified (time of day, weekday, day of month), as DTSTART does in RFC 5545. It
  defaults to local midnight of `from`: pass it for any rule with an interval, a count or no
  explicit time. `dtstart` itself is only emitted if it matches the rule.
- **DST.** Rules are expanded in wall-clock time; 09:00 stays 09:00. A time skipped by
  spring-forward moves to the next valid instant (02:30 → 03:30); a repeated fall-back time
  resolves to its first instant, once (RFC 5545). Hourly/minutely rules step in wall-clock time
  but emit both instants of a repeated hour, so no real hour is skipped or doubled.
- **Missing days.** `BYMONTHDAY=31` skips short months, 29 February only occurs in leap years.
- **Termination.** Calendar patterns repeat every 400 Gregorian years: after a full cycle of
  empty periods expansion stops, so impossible rules (30 February) return `[]` / `null`.
- **`until`.** Inclusive. A local date without time includes the whole day; without a year
  ("jusqu'au 31 décembre") it is the first such date on or after the series start.

### Working days ("ouvré")

"jours ouvrés", "business day", "working day" mean Monday–Friday **and** not in `holidays`
(`excludeHolidays: true`). Holidays are removed from each period before `BYSETPOS`, so
"le 3ème mardi ouvré" is the third non-holiday Tuesday of the month and "le 2e jour ouvré du
mois" the second non-holiday weekday. "every weekday", "en semaine", "du lundi au vendredi"
mean Monday–Friday only. The engine ships no holiday calendar: callers pass the dates.

### Literal phrases

Understood (FR and EN, accents and case ignored): daily/weekly/monthly/yearly/hourly/minutely
units with intervals ("tous les 2 jours", "un mardi sur deux", "every other week",
"tous les quinze jours" = every two weeks); weekday lists and ranges ("lundi et jeudi",
"mon-fri"); month days ("le 1er et le 15", "the last day"); ordinal weekdays ("le dernier
vendredi", "the second Tuesday"); working-day positions; dates ("le 1er mars", "March 1st");
months ("le dernier dimanche de mars"); times ("à 9h30", "at 9pm", "midi"); end clauses
("10 fois", "for 10 times", "jusqu'au 31/12/2026", "until Dec 31"). Numeric dates follow
`locale` (`fr` = day/month, `en` = month/day; guessed from the text otherwise).

Not supported (the parser returns `null`): exceptions ("sauf…"), start clauses ("à partir
de…"), several times that share neither their hour nor their minute ("9h30 et 14h"), times on
hourly/minutely rules, `count` together with `until`.

### Cron

`minute hour day-of-month month day-of-week`: lists, ranges, steps, names, `7` = Sunday, `L`
(last day of month), `5L` (last Friday), `2#3` (third Tuesday), `@yearly`/`@monthly`/
`@weekly`/`@daily`/`@hourly`. When both day fields are restricted a day matches either
(Vixie cron, `dayMatch: 'any'`). No seconds field.

### RRULE subset

FREQ (YEARLY…MINUTELY), INTERVAL, BYDAY (ordinals), BYMONTHDAY (negatives), BYMONTH, BYHOUR,
BYMINUTE, BYSETPOS, COUNT, UNTIL (`YYYYMMDD`, floating or `Z` date-time), WKST. Any other
part (SECONDLY, BYSECOND, BYYEARDAY, BYWEEKNO…) makes `parseRRule` return `null`.

## Performance

UTC offsets are sampled once per UTC day during an expansion (`offsets.ts`) instead of three
`Intl` calls per occurrence; the exact offset is still computed on days with a DST change.
Figures and budgets: `docs/performance/BENCHMARKS.md`.
