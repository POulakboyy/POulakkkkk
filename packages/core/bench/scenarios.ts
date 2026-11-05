/**
 * Benchmark scenarios shared by the vitest bench files (`*.bench.ts`) and the plain Node
 * runner (`run.ts`). A scenario prepares its data once in `setup` and returns the function
 * that is timed; that function must be repeatable (it may not consume its input).
 */
import { DEFAULT_PREFS, type Task, type UserPrefs } from '../src/model.ts';
import { DAY, HOUR, startOfDay, startOfWeek } from '../src/time.ts';
import * as graph from '../src/graph/index.ts';
import * as insights from '../src/insights/index.ts';
import * as nlp from '../src/nlp/index.ts';
import * as recurrence from '../src/recurrence/index.ts';
import * as scheduler from '../src/scheduler/index.ts';
import * as search from '../src/search/index.ts';
import * as sync from '../src/sync/index.ts';
import * as tasks from '../src/tasks/index.ts';
import {
  CAPTURE_LINES,
  NOW,
  ZONE,
  makeEvents,
  makeGraph,
  makeRoutableTasks,
  makeSearchDocs,
  makeTasks,
  makeYearOfLogs,
} from './fixtures.ts';

export type Group =
  'tasks' | 'scheduler' | 'recurrence' | 'nlp' | 'search' | 'graph' | 'sync' | 'insights';

export interface Scenario {
  group: Group;
  /** Stable identifier, used in result files and comparisons. */
  name: string;
  /** Prepares the data (not timed) and returns the timed function. */
  setup: () => () => unknown;
  /** Median time a run must stay under on the reference machine (see BENCHMARKS.md). */
  budgetMs?: number;
  /** Heavy scenarios: fewer samples so a full run stays within a few minutes. */
  heavy?: boolean;
}

const PREFS: UserPrefs = { ...DEFAULT_PREFS, timeZone: ZONE };

/** Memoises a fixture so scenarios sharing it build it once per process. */
function once<T>(make: () => T): () => T {
  let value: T | undefined;
  let made = false;
  return () => {
    if (!made) {
      value = make();
      made = true;
    }
    return value as T;
  };
}

const tasks10k = once(() => makeTasks(10_000));
const tasks100k = once(() => makeTasks(100_000));
const year = once(() => makeYearOfLogs());
const docs50k = once(() => makeSearchDocs(50_000));

/* ------------------------------------------------------------------------------------------ */
/* Tasks                                                                                       */
/* ------------------------------------------------------------------------------------------ */

function taskScenarios(size: string, data: () => Task[], budgetScale: number): Scenario[] {
  const last = (list: Task[]) => (list[list.length - 1] as Task).id;
  return [
    {
      group: 'tasks',
      name: `tasks.topoOrder ${size}`,
      budgetMs: 40 * budgetScale,
      setup: () => {
        const list = data();
        return () => tasks.topoOrder(list);
      },
    },
    {
      group: 'tasks',
      name: `tasks.detectCycles ${size}`,
      budgetMs: 60 * budgetScale,
      setup: () => {
        const list = data();
        return () => tasks.detectCycles(list);
      },
    },
    {
      group: 'tasks',
      name: `tasks.actionable ${size}`,
      budgetMs: 15 * budgetScale,
      setup: () => {
        const list = data();
        return () => tasks.actionable(list);
      },
    },
    {
      group: 'tasks',
      name: `tasks.unlockedBy ${size}`,
      budgetMs: 15 * budgetScale,
      setup: () => {
        const list = data();
        return () => tasks.unlockedBy('t0', list);
      },
    },
    {
      group: 'tasks',
      name: `tasks.wouldCreateCycle (worst case) ${size}`,
      budgetMs: 30 * budgetScale,
      setup: () => {
        const list = data();
        // Linking the first task to the last forces a walk of the whole ancestry.
        const toId = last(list);
        return () => tasks.wouldCreateCycle(list, 'missing', toId);
      },
    },
    {
      group: 'tasks',
      name: `tasks.decay (all tasks) ${size}`,
      budgetMs: 10 * budgetScale,
      setup: () => {
        const list = data();
        return () => list.map((t) => tasks.decay(t, PREFS, NOW));
      },
    },
    {
      group: 'tasks',
      name: `tasks.wipStatus ${size}`,
      budgetMs: 10 * budgetScale,
      setup: () => {
        const list = data();
        return () => tasks.wipStatus(list, NOW, PREFS, ZONE);
      },
    },
  ];
}

/* ------------------------------------------------------------------------------------------ */
/* Scheduler                                                                                   */
/* ------------------------------------------------------------------------------------------ */

function routeScenario(
  name: string,
  days: number,
  events: number,
  count: number,
  budgetMs: number,
): Scenario {
  return {
    group: 'scheduler',
    name,
    budgetMs,
    setup: () => {
      const start = startOfDay(NOW, ZONE);
      const input = {
        tasks: makeRoutableTasks(count),
        events: makeEvents(events, start, days),
        prefs: PREFS,
        range: { start, end: start + days * DAY },
        now: NOW,
        energyProfile: insights.circadianPrior('intermediate'),
        options: { split: true, dailyCapMin: 360 },
      };
      return () => scheduler.route(input);
    },
  };
}

const schedulerScenarios: Scenario[] = [
  routeScenario('scheduler.route week (100 events, 60 tasks)', 7, 100, 60, 50),
  routeScenario('scheduler.route month (500 events, 200 tasks)', 31, 500, 200, 250),
  routeScenario('scheduler.route month (500 events, 1000 tasks)', 31, 500, 1_000, 1_000),
  {
    group: 'scheduler',
    name: 'scheduler.magnetize day (20 events, 200 floating tasks)',
    budgetMs: 20,
    setup: () => {
      const day = startOfDay(NOW, ZONE);
      const floating = makeRoutableTasks(200).map((t) => ({ ...t, floatingDay: day }));
      const input = {
        day: NOW,
        tasks: floating,
        events: makeEvents(20, day, 1),
        prefs: PREFS,
        now: NOW,
      };
      return () => scheduler.magnetize(input);
    },
  },
];

/* ------------------------------------------------------------------------------------------ */
/* Recurrence                                                                                  */
/* ------------------------------------------------------------------------------------------ */

function expandScenario(name: string, text: string, budgetMs: number, limit = 100_000): Scenario {
  return {
    group: 'recurrence',
    name,
    budgetMs,
    setup: () => {
      const rule = recurrence.parseRule(text);
      if (!rule) throw new Error(`unparsable rule: ${text}`);
      const from = startOfDay(NOW, ZONE);
      const opts = { from, to: from + 3653 * DAY, timeZone: ZONE, dtstart: from, limit };
      return () => recurrence.occurrences(rule, opts);
    },
  };
}

const recurrenceScenarios: Scenario[] = [
  expandScenario('recurrence.occurrences daily × 10 years', 'FREQ=DAILY;BYHOUR=9;BYMINUTE=0', 30),
  expandScenario('recurrence.occurrences weekly MO,WE,FR × 10 years', '0 9 * * 1,3,5', 30),
  expandScenario(
    'recurrence.occurrences monthly 3rd Tuesday × 10 years',
    'FREQ=MONTHLY;BYDAY=3TU;BYHOUR=10;BYMINUTE=0',
    10,
  ),
  expandScenario('recurrence.occurrences hourly 9–17 weekdays × 10 years', '0 9-17 * * 1-5', 300),
  {
    group: 'recurrence',
    name: 'recurrence.parseRule × 1000 (literal, cron, RRULE)',
    budgetMs: 50,
    setup: () => {
      const texts = [
        'tous les lundis à 9h',
        '0 9 * * 1-5',
        'FREQ=WEEKLY;BYDAY=MO,TH',
        'every 2 weeks on friday',
      ];
      return () => {
        for (let i = 0; i < 1000; i++) recurrence.parseRule(texts[i % texts.length] as string);
      };
    },
  },
];

/* ------------------------------------------------------------------------------------------ */
/* NLP                                                                                         */
/* ------------------------------------------------------------------------------------------ */

const nlpScenarios: Scenario[] = [
  {
    group: 'nlp',
    name: 'nlp.parse × 1000 capture lines',
    budgetMs: 100,
    setup: () => {
      const ctx = { now: NOW, timeZone: ZONE, locale: 'fr' as const };
      return () => {
        for (let i = 0; i < 1000; i++)
          nlp.parse(CAPTURE_LINES[i % CAPTURE_LINES.length] as string, ctx);
      };
    },
  },
];

/* ------------------------------------------------------------------------------------------ */
/* Search                                                                                      */
/* ------------------------------------------------------------------------------------------ */

function builtIndex(): search.SearchIndex {
  const index = search.createSearchIndex();
  for (const doc of docs50k()) index.add(doc);
  return index;
}
const index50k = once(builtIndex);

const searchScenarios: Scenario[] = [
  {
    group: 'search',
    name: 'search.index build 50k docs',
    budgetMs: 4_000,
    heavy: true,
    setup: () => {
      docs50k();
      return builtIndex;
    },
  },
  {
    group: 'search',
    name: 'search.query 1 frequent term (50k docs)',
    budgetMs: 30,
    setup: () => {
      const index = index50k();
      return () => index.search('projet');
    },
  },
  {
    group: 'search',
    name: 'search.query 3 terms (50k docs)',
    budgetMs: 50,
    setup: () => {
      const index = index50k();
      return () => index.search('réunion client rapport');
    },
  },
  {
    group: 'search',
    name: 'search.query as-you-type prefix "conc" (50k docs)',
    budgetMs: 50,
    setup: () => {
      const index = index50k();
      return () => index.search('conc');
    },
  },
  {
    group: 'search',
    name: 'search.update 1 doc in a 50k index',
    budgetMs: 1,
    setup: () => {
      const index = index50k();
      const doc = docs50k()[123];
      if (!doc) throw new Error('missing doc');
      return () => index.update(doc);
    },
  },
];

/* ------------------------------------------------------------------------------------------ */
/* Graph                                                                                       */
/* ------------------------------------------------------------------------------------------ */

const graphScenarios: Scenario[] = [
  {
    group: 'graph',
    name: 'graph.layout 5k nodes (300 iterations)',
    budgetMs: 6_000,
    heavy: true,
    setup: () => {
      const g = makeGraph(5_000);
      return () => graph.layout(g, { iterations: 300, tolerance: 0 });
    },
  },
  {
    group: 'graph',
    name: 'graph.layout step 5k nodes (1 iteration)',
    budgetMs: 20,
    setup: () => {
      const engine = graph.createLayout(makeGraph(5_000), { iterations: 1_000_000, tolerance: 0 });
      return () => engine.step(1);
    },
  },
  {
    group: 'graph',
    name: 'graph.QuadTree query viewport (5k nodes)',
    budgetMs: 1,
    setup: () => {
      const g = makeGraph(5_000);
      const tree = new graph.QuadTree({ bounds: { x: 0, y: 0, width: 2000, height: 2000 } });
      for (const n of g.nodes) tree.insert(n.id, n.x, n.y);
      return () => tree.queryRect({ x: 500, y: 500, width: 400, height: 300 });
    },
  },
];

/* ------------------------------------------------------------------------------------------ */
/* Sync                                                                                        */
/* ------------------------------------------------------------------------------------------ */

const OPS = 100_000;
const FIELDS = ['title', 'status', 'priority', 'notes', 'tags'];

/** `OPS` ops written by `node`: 20k records × 5 fields, a few overwritten twice. */
function writeOps(node: string, wall: number): sync.Op[] {
  let t = wall;
  const replica = sync.createReplica({ nodeId: node, now: () => t++ });
  const ops: sync.Op[] = [];
  for (let i = 0; ops.length < OPS; i++) {
    const rec = i % 20_000;
    const field = FIELDS[Math.floor(i / 20_000) % FIELDS.length] as string;
    ops.push(...replica.change('tasks', `rec${rec}`, { [field]: `${node}-${i}` }));
  }
  return ops;
}

const opsA = once(() => writeOps('node-a', NOW));
const opsB = once(() => writeOps('node-b', NOW + 1));

const syncScenarios: Scenario[] = [
  {
    group: 'sync',
    name: 'sync.replica write 100k local ops',
    budgetMs: 1_500,
    heavy: true,
    setup: () => () => writeOps('node-w', NOW),
  },
  {
    group: 'sync',
    name: 'sync.replica apply 100k remote ops (fresh replica)',
    budgetMs: 1_500,
    heavy: true,
    setup: () => {
      const ops = opsA();
      return () => sync.createReplica({ nodeId: 'node-r', now: () => NOW }).apply(ops);
    },
  },
  {
    group: 'sync',
    name: 'sync.replica merge 2 × 100k concurrent ops',
    budgetMs: 3_000,
    heavy: true,
    setup: () => {
      const a = opsA();
      const b = opsB();
      return () => {
        const replica = sync.createReplica({ nodeId: 'node-m', now: () => NOW });
        replica.apply(a);
        replica.apply(b);
        return replica;
      };
    },
  },
  {
    group: 'sync',
    name: 'sync.replica opsSince (delta of 100k ops)',
    budgetMs: 500,
    heavy: true,
    setup: () => {
      const replica = sync.createReplica({ nodeId: 'node-s', now: () => NOW });
      replica.apply(opsA());
      return () => replica.opsSince({});
    },
  },
  {
    group: 'sync',
    name: 'sync.encodeBatch + decodeBatch 100k ops',
    budgetMs: 1_500,
    heavy: true,
    setup: () => {
      const ops = opsA();
      return () => sync.decodeBatch(sync.encodeBatch(ops));
    },
  },
  {
    group: 'sync',
    name: 'sync.hlc tick × 100k',
    budgetMs: 100,
    setup: () => () => {
      let t = NOW;
      const clock = sync.createHlc('node-h', () => t++);
      for (let i = 0; i < 100_000; i++) clock.tick();
    },
  },
  {
    group: 'sync',
    name: 'sync.hlc receive × 100k',
    budgetMs: 200,
    setup: () => {
      const remote = opsA().map((op) => op.hlc);
      return () => {
        const clock = sync.createHlc('node-h', () => NOW);
        for (const hlc of remote) clock.receive(hlc);
      };
    },
  },
];

/* ------------------------------------------------------------------------------------------ */
/* Insights                                                                                    */
/* ------------------------------------------------------------------------------------------ */

const insightScenarios: Scenario[] = [
  {
    group: 'insights',
    name: 'insights.energyHeatmap 52 weeks (2.9k tasks, ~5.8k logs)',
    budgetMs: 150,
    setup: () => {
      const { tasks: list } = year();
      return () => insights.energyHeatmap({ tasks: list, now: NOW, timeZone: ZONE, weeks: 52 });
    },
  },
  {
    group: 'insights',
    name: 'insights.balance 1 year',
    budgetMs: 150,
    setup: () => {
      const { tasks: list, events } = year();
      const range = { start: NOW - 365 * DAY, end: NOW };
      return () => insights.balance({ tasks: list, events, range, timeZone: ZONE });
    },
  },
  {
    group: 'insights',
    name: 'insights.activeDays + streak 1 year',
    budgetMs: 100,
    setup: () => {
      const { tasks: list } = year();
      const rules = { jokersPerWeek: 1, maxJokers: 3 };
      return () => {
        const days = insights.activeDays({ tasks: list, timeZone: ZONE });
        return insights.streak({ activeDays: days, today: '2026-11-02', rules });
      };
    },
  },
  {
    group: 'insights',
    name: 'insights.weeklyReview (1 year of history)',
    budgetMs: 100,
    setup: () => {
      const { tasks: list, events, journal } = year();
      const weekStart = startOfWeek(NOW - 7 * DAY, ZONE);
      return () =>
        insights.weeklyReview({
          tasks: list,
          events,
          journal,
          weekStart,
          timeZone: ZONE,
          now: NOW + HOUR,
        });
    },
  },
  {
    group: 'insights',
    name: 'insights.skillTree + deadEnds + archiveCandidates 1 year',
    budgetMs: 50,
    setup: () => {
      const { tasks: list } = year();
      return () => [
        insights.skillTree(list),
        insights.deadEnds(list, NOW),
        insights.archiveCandidates(list, NOW),
      ];
    },
  },
];

export const SCENARIOS: readonly Scenario[] = [
  ...taskScenarios('10k', tasks10k, 1),
  ...taskScenarios('100k', tasks100k, 10),
  ...schedulerScenarios,
  ...recurrenceScenarios,
  ...nlpScenarios,
  ...searchScenarios,
  ...graphScenarios,
  ...syncScenarios,
  ...insightScenarios,
];

export function scenariosOf(group: Group): Scenario[] {
  return SCENARIOS.filter((s) => s.group === group);
}
