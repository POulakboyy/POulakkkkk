# insights

Personal insights computed locally from the user's own records. Pure functions, no I/O; every
date computation takes an explicit IANA `timeZone`.

| Function                                                                       | Feature | Returns                                                                                                                                                               |
| ------------------------------------------------------------------------------ | ------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `energyHeatmap({ tasks, now, timeZone, weeks = 4, chronotype?, prior?, … })`   | 1.3     | 7×24 `cells[weekday][hour]` (0 = Sunday) with `value` 0..1, `prior`, `observed`, `samples`, `exposure`, `confidence`, `enoughData`; plus `peak`, `dataWeight`, totals |
| `energyByHour(input)` / `energyProfile(input)`                                 | 1.3     | 24-hour pooled profile (optionally `days: [1..5]`); `energyProfile` returns the 24 values for `scheduler` (`RouteOptions.energyProfile`)                              |
| `circadianPrior(chronotype)`, `meqCategory(score)`, `chronotypeFromMeq(score)` | 1.3     | Prior curves (`morning` / `intermediate` / `evening`) and MEQ cut-offs of Horne & Östberg (1976). The curve shapes are product heuristics, not fitted data            |
| `balance({ tasks, events, range, timeZone })`                                  | 7.2     | `create` / `organize` / `meetings` minutes, `ratio` (creation share), `shares`, per-local-day `days`                                                                  |
| `streak({ activeDays, today, rules })`                                         | 7.3     | `current`, `best`, `jokersLeft`, `jokerDays`, `status` (`active` / `protected` / `paused`), `pausedSince`, `lastActiveDay`                                            |
| `activeDays({ tasks, timeZone, mode = 'create' })`                             | 7.3     | Local day keys with creative focus or completions, to feed `streak`                                                                                                   |
| `skillTree(tasks, { weightBy?, projectNames? })`, `flattenSkills(tree)`        | 7.5     | Weighted hierarchy of completed work by tag path (`design/typo`) or project                                                                                           |
| `weeklyReview({ tasks, events, journal, weekStart, timeZone, now? })`          | 7.9     | `wins` (ascending, ends on the biggest), recurring `blockers`, `slipped` tasks, `planning` accuracy, `suggestions`, `stats`                                           |
| `deadEnds(records, now, { idleDays = 30 })`                                    | 5.15    | Records never edited after their creation session, most idle first                                                                                                    |
| `archiveCandidates(records, now, { years = 2, timeZone? })`                    | 3.9     | Records without interaction for `years` calendar years (never archives by itself)                                                                                     |

## Models and rules

- **Energy.** Evidence = recency-weighted focus hours (half-life 2 weeks) + completions
  (0.25 h each), binned by local weekday × hour. A Gamma–Poisson credibility model shrinks the
  observed rate toward the chronotype prior: `rate = (α + X) / (β + E)`. `confidence = E / (E + β)`
  is the share of the estimate coming from the cell's own exposure; `enoughData` flags cells the
  UI can present as reliable (`minConfidence`, default 0.5). Slots before tracking started are
  unobserved, not idle. DST-aware.
- **Balance.** Executed focus logs only (attributed to the task `mode`), meetings from
  `kind: 'meeting'` events. No minute counted twice: overlapping creation and organisation logs
  split half/half, logged focus wins over a concurrent meeting.
- **Streaks.** Today is never a miss. A missed day consumes a joker if available
  (`jokersPerWeek` added at each week start, capped by `maxJokers`; with
  `earnJokerAfterRestDays = n`, a spent joker returns `n` days later). Without jokers the streak
  is paused, not lost: a comeback within `resumeWithinDays` (default 7) resumes it. Grounded in
  Lally et al. (2010): a single missed opportunity did not materially affect habit formation.
- **Weekly review.** Wins ordered by increasing significance to end on the peak (peak-end rule,
  Kahneman et al., 1993). Blockers: single-link clusters of `friction` entries over
  `lookbackWeeks` (default 4) by weighted Jaccard similarity of tags (weight 2) and keywords
  (weight 1); recurring = `minOccurrences` (default 2) entries with at least one this week.
  Suggestions are `{ kind, …numbers }`, worded by the UI, and only emitted above minimum sample
  sizes (3 estimates, 5 scheduled tasks, 2 tracked hours); at most three.
- **Lifecycle.** `done` / `archived` records and sandbox notes are never reported.
