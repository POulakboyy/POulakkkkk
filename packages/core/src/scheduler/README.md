# `scheduler` — scheduling engine

Pure, deterministic functions over `Task`, `CalendarEvent` and `UserPrefs`. No I/O, no clock:
`now` is always a parameter, and every wall-clock computation uses an explicit IANA zone
(`prefs.timeZone` or a `timeZone` argument). DST days have their real length (23 h / 25 h).

```ts
import { scheduler } from '@pouxis/core';
const { placements, unplaced, warnings } = scheduler.route({ tasks, events, prefs, range, now });
```

| Function                                                                         | Feature | Returns                                                                     |
| -------------------------------------------------------------------------------- | ------- | --------------------------------------------------------------------------- |
| `route({ tasks, events, prefs, range, now, energyProfile?, options? })`          | 1.1     | `{ placements, unplaced, warnings }`                                        |
| `magnetize({ day, tasks, events, prefs, now?, energyProfile?, options? })`       | 1.10    | `{ suggestions, unplaced, warnings }`                                       |
| `propagateDelay({ items, overrunId, newEnd, prefs, timeZone, mode? })`           | 1.2     | `{ moves, overflow, conflicts }`                                            |
| `insertBuffers(events, prefs, { kinds? })`                                       | 1.6     | `EventDraft[]` (kind `buffer`)                                              |
| `checkMakerSchedule({ events, candidate, prefs, timeZone })`                     | 1.15    | `{ ok, code, fragmented?, largestBlockBefore, largestBlockAfter, message }` |
| `largestFocusBlock({ events, day, prefs, timeZone })`                            | 1.15    | `{ minutes, block? }`                                                       |
| `suggestAlternatives({ …MakerCheckInput, now?, limit?, stepMin?, searchDays? })` | 1.15    | `Interval[]`                                                                |
| `snapshot(items, takenAt)` / `compareSnapshots(planned, actual)`                 | 1.9     | `PlanSnapshot` / `SnapshotDiff`                                             |
| `progress(now, period, timeZone, { weekStartsOn? })` / `periodBounds(...)`       | 1.14    | `0..1` / `Interval`                                                         |

Helpers: `bufferLengthMs(bufferMin)`, `formatDuration(minutes, locale)`. All types are
exported from `types.ts`.

## `route` rules

- Candidates: `todo`/`doing`, not pinned, not floating, not time-blocked by an event
  (`event.taskId`), not a parent of open subtasks, no slot (unless `options.replan`), and
  every dependency done — otherwise `unplaced` with reason `blocked`.
- Order: earliest deadline, then priority, then age, then id (total order → deterministic).
- Each task takes the earliest free slot inside working hours, after `now`, avoiding events
  and slots of other scheduled tasks; placements never overlap each other. Default estimate
  30 min; starts snap to a `granularityMin` (5) grid on the local clock.
- `energyProfile` (24 values, e.g. from `insights`): high-energy and creative tasks take the
  best-matching slot of the earliest day they fit, low-energy tasks the lowest, never at the
  expense of their deadline. `insightOffPeak` (opt-in) sends insight work (`mode: 'create'`
  without `energy: 'high'`) off-peak — Wieth & Zacks (2011), _Thinking & Reasoning_ 17(4).
- `split`: a task that does not fit whole, or would miss its deadline whole, is spread over
  the earliest gaps in chunks of at least 25 min (`minChunkMin`), never leaving a shorter rest.
- `dailyCapMin`: focused work per local day (task slots + `focus` events). Days already above
  the cap get an `overload` warning; tasks blocked only by the cap are `over-capacity`.
- Re-routing is idempotent: applying the placements and routing again places nothing new;
  `replan` on the applied result gives the same placements.

## Other behaviours

- `magnetize`: floating tasks of a day (`floatingDay`) snap into its gaps — also on a day off.
  Nothing existing moves.
- `propagateDelay`: fixed events and pinned tasks never move; movable items of the same local
  day jump after them. `shift` keeps gaps, `push` lets free time absorb the delay. `overflow`
  lists items now ending after working hours; `conflicts` the fixed items the overrun covers.
- `insertBuffers`: after a meeting followed by another within the buffer length; 5–15 min,
  shortened before fixed events, dropped under 5 min, idempotent. A buffer may overlap a
  non-fixed event: make room with `propagateDelay`.
- Maker guard: `focus` events do not split a free block; flags a candidate that leaves no
  free block of `prefs.makerBlockMin`. Messages follow `prefs.locale`.
- `compareSnapshots`: added/removed/moved items, tasks completed by the end of their planned
  slot, slips (`completed-late`, `not-done`, `dropped`) once the slot is over, and planning
  accuracy `estimated / logged` over completed tasks (below 1 = the planning fallacy, Buehler,
  Griffin & Ross, 1994, _Journal of Personality and Social Psychology_ 67(3)).

## Tests

`cd packages/core && npx vitest run src/scheduler` — examples, DST days (Europe/Paris), and
seeded property tests (no overlaps, within working hours, after `now`, deterministic,
idempotent re-route).
