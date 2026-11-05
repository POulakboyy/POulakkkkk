/** Pure summaries of the raw samples collected by `runtime.mjs` (unit-tested in Node). */

const FRAME_BUDGET_MS = 1000 / 60;

/** Percentile (nearest rank) of an unsorted list; 0 for an empty list. */
export function percentile(values, p) {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const rank = Math.min(sorted.length - 1, Math.max(0, Math.ceil((p / 100) * sorted.length) - 1));
  return sorted[rank];
}

const round1 = (n) => Math.round(n * 10) / 10;

/**
 * FPS and jank from requestAnimationFrame timestamps. A frame "drops" when it takes more than
 * 1.5 × the 60 Hz budget, i.e. at least one vsync was missed.
 */
export function summariseFrames(timestamps) {
  const deltas = [];
  for (let i = 1; i < timestamps.length; i++) deltas.push(timestamps[i] - timestamps[i - 1]);
  if (deltas.length === 0) return { fps: 0, p95FrameMs: 0, maxFrameMs: 0, dropped: 0, frames: 0 };
  const span = timestamps[timestamps.length - 1] - timestamps[0];
  return {
    fps: round1((deltas.length / span) * 1000),
    p95FrameMs: round1(percentile(deltas, 95)),
    maxFrameMs: round1(Math.max(...deltas)),
    dropped: deltas.filter((d) => d > FRAME_BUDGET_MS * 1.5).length,
    frames: deltas.length,
  };
}

/**
 * INP-like summary of Event Timing entries: entries sharing an `interactionId` form one
 * interaction whose latency is its longest entry. As in INP, the worst interaction counts,
 * ignoring one outlier per 50 interactions. Only entries above the observer's threshold arrive,
 * so `slowInteractions` counts interactions that took longer than one frame.
 */
export function summariseLatency(events) {
  const byInteraction = new Map();
  for (const e of events) {
    if (!e.id) continue;
    byInteraction.set(e.id, Math.max(byInteraction.get(e.id) ?? 0, e.duration));
  }
  const latencies = [...byInteraction.values()].sort((a, b) => b - a);
  const skip = Math.floor(latencies.length / 50);
  return {
    slowInteractions: latencies.length,
    inpLikeMs: Math.round(latencies[skip] ?? 0),
    worstMs: Math.round(latencies[0] ?? 0),
  };
}
