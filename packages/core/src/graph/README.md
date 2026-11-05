# `graph` — graph & canvas engine (4.1, 4.2, 4.3, 4.5, 4.7, 4.9, 4.11, 4.13, 4.15)

Pure functions over `Graph` values (`model.ts`). Nothing touches the DOM, so the renderer, the
CLI and the sync server share the same code. Inputs are never mutated; functions that "change"
a graph return a new value and return the **same reference** when nothing changed (cheap React
memoisation). Every function accepts a `GraphLike` (`{ nodes, edges }`), so fragments and
importer output work as well as stored records. Coordinates are world units (canvas pixels at
zoom 1); a node's `x`/`y` is its centre.

```ts
import { graph } from '@pouxis/core';
const laid = graph.layout(myGraph, { seed: 1 });
```

## Spatial index — `QuadTree` (4.1)

Point-region quadtree for viewport culling and hit testing with 10 000+ nodes.
`new QuadTree({ bounds?, capacity = 16, maxDepth = 32 })` or `QuadTree.from(graph.nodes)`.
`insert(id, x, y)`, `update` (O(depth) fast path while dragging inside a leaf), `remove`,
`queryRect(rect)` (borders included), `queryRadius(x, y, r)`, `nearest(x, y, maxDistance?,
accept?)` (`accept` skips hidden or locked nodes without rebuilding). The root grows on its own,
so the canvas is unbounded; `maxDepth` bounds recursion when points coincide.

## Force-directed layout — `createLayout`, `layout` (4.2)

Fruchterman–Reingold (repulsion `k²/d`, attraction `d²/k`) with a Barnes–Hut quadtree over
typed arrays rebuilt every step (O(n log n); `theta: 0` is exact). Linear gravity keeps
components together. Deterministic for a given graph and `seed`.

```ts
const sim = graph.createLayout(g, { seed, edgeLength: 120, pinned: ['root'] });
requestAnimationFrame(function frame() {
  sim.step(); // or step(n)
  draw(sim.positions); // Map<Id, Point>, updated in place
  if (!sim.settled) requestAnimationFrame(frame);
});
store.update(g.id, sim.apply(g));
```

`energy` (sum of squared moves of the last step), `settled`, `iteration`, `temperature`,
`setPosition` (drag), `pin`/`unpin`/`isPinned`, `reheat(t?)` after an edit. Pinned nodes never
move but still push and pull. Without `randomize`, current positions are kept and only nodes
sharing a spot (or with non-finite coordinates) are scattered. Measured on the dev container:
about 25 ms per step for 10 000 nodes / 12 000 edges.

## Trees — `buildHierarchy`, `treeLayout`, `tasksToGraph` (4.3)

`buildHierarchy(g, { includeFlowEdges? })` extracts a forest: `parentId` first, then the first
incoming structural edge; `on-complete` edges are ignored unless asked; candidates that would
close a cycle are skipped. Helpers: `preorder`, `descendantsOf`, `ancestorsOf`.

`treeLayout(g, rootId?)` / `treeLayout(g, options)` / `treePositions(g, options)`: Walker's tidy
tree in the linear-time form of Buchheim, Jünger & Leipert (2002). Options: `orientation`
(`vertical` org chart, `horizontal` mind map), `nodeSpacing`, `levelSpacing`,
`subtreeSeparation`, `origin`, `respectCollapsed` (hidden descendants move rigidly with their
collapsed ancestor). Iterative, so a 10 000-deep chain is fine.

`tasksToGraph(tasks, { includeDependencies?, layout? })`: subtasks become tree edges
(`tree:<parent>>child`), `dependsOn` becomes `on-complete` edges (`dep:<from>>to`); node ids are
task ids and `refId` points back to the task, so converting twice gives identical output.

## Timeline axis — `createTimeScale`, `dragToDue` (4.5)

`createTimeScale({ start, end, x0, x1, timeZone })` → `toX`, `toTime`, `ticks(count?)`. The scale
is linear (and extrapolated: the canvas is infinite); ticks are aligned on wall-clock boundaries
of the explicit IANA zone (local midnight across DST changes), with `major` flags.
`dragToDue(node, newX, scale, { snap?: ms | 'day' })` returns the node with its new `x` and
`due`; `placeOnTimeline(g, scale)` moves dated nodes onto the axis.

## Conditional flows — `unlockedNodes`, `lockedReason` (4.7)

An `on-complete` edge A → B locks B until A is done. "Done" ids match node ids or `refId`s (pass
completed task ids directly). `unlockedNodes(g, done)`, `lockedNodes(g, done)` (blockers per
node), `lockedReason(g, id, done)` → `{ nodeId, blockers: [{ id, label }] } | null`,
`unlockedBy(g, completedId, done)` for the "2 steps unlocked" toast. Locks are not transitive.

## Collapsing — `visibleSubgraph` (4.9)

`visibleSubgraph(g)` → `{ nodes, edges, hidden, hiddenCount }` without the descendants of
collapsed nodes (edges touching a hidden node are dropped; `hiddenCount` feeds the "+N" badge).
`toggleCollapsed`, `setCollapsed(g, ids, value)`, `expandAll`, `collapseToDepth(g, depth)`.

## Viewport & minimap (4.1, 4.13)

`Viewport = { x, y, zoom }`, `(x, y)` being the world point at the screen's top-left corner.
`worldToScreen`, `screenToWorld`, `visibleWorldRect(vp, size, margin?)` (culling rectangle for
`queryRect`), `zoomAround(vp, screenPoint, factor, limits?)` (pinch / wheel zoom towards the
pointer), `panBy`, `centerOn`, `clampZoom` (0.02–8 by default), `graphBounds(g, { nodeSize? })`,
`fitView(bounds, size, { padding?, minZoom?, maxZoom? })`, and
`minimapTransform(contentBounds, vp, screenSize, minimapSize)` → `{ scale, world, frame,
toMinimap, toWorld }` (the frame always stays inside the minimap).

## Import / export (4.11, 4.15)

- `toOutline(g, { title?, rootId?, doneIds?, respectCollapsed?, indent? })` — nested Markdown
  list; task nodes get `[x]`/`[ ]` when `doneIds` is given. `fromOutline(md, options)` reads
  `-`/`*`/`+`/`1.` lists at any indentation, nests them under ATX headings, joins indented
  continuation lines, skips fenced code and rules, and returns `checked` ids. Labels are
  flattened and leading markers escaped, so `fromOutline(toOutline(g))` keeps the tree.
- `toOPML(g, { title?, rootId?, respectCollapsed? })` / `fromOPML(xml, { maxNodes? })` — OPML 2.0.
  The reader is minimal and safe on untrusted files: no external resources, only the five
  predefined and numeric entities, DOCTYPE internal subsets rejected (no XXE or "billion
  laughs"), linear time, no recursion, node limit (50 000 by default). Errors are `OpmlError`.
- Importers share `TreeImportOptions`: `makeId(index)` (default `createId`), `kind` (default
  `idea`), `layout` (tidy-tree options or `false`; default horizontal mind map at the origin).
- `toSVG(g, { palette?, background?, title?, fontSize?, respectCollapsed?, … })` — standalone
  SVG, transparent unless `background` is set; `palette[color - 1]` fills nodes (defaults to the
  light `--cat-*` values); `on-complete` edges are dashed; every label and colour is XML-escaped.
  Box widths are estimated from the label length (no font metrics offline).

## Tests

`cd packages/core && npx vitest run src/graph` — includes soft performance checks at 10 000
nodes (quadtree build/queries, force steps) with generous bounds that only catch complexity
regressions.
