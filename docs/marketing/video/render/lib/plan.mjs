// Pure planning of a format: which clip to film for each sequence item, how long, and how the
// clips are joined. Programme time follows build.mjs: scene i starts at the sum of the previous
// durations, so the generated SRT files line up with the picture.

/** ffmpeg xfade transition for each shotlist transition; null = hard cut. */
const XFADE = { dissolve: 'fade', 'push-left': 'slideleft', 'fade-to-paper': 'paper' };

export function xfadeKind(transition) {
  return transition && transition.durationMs > 0 ? (XFADE[transition.type] ?? null) : null;
}

/** Stage geometry of a format: CSS size of the page and device scale factor of the capture. */
export function stageGeometry(format) {
  const out = deliverable(format);
  if (format.viewport) {
    // Store formats film the bare app at its real viewport, captured at native pixel density.
    const { width, height } = format.viewport;
    return { css: { width, height }, dsf: out.width / width, out };
  }
  // Framed formats: the page is the final frame; 2x density keeps camera close-ups sharp.
  return { css: { width: out.width, height: out.height }, dsf: 2, out };
}

/** First deliverable at ≤ 30 fps (the committed encodes). */
export function deliverable(format) {
  const d = format.deliverables.find((x) => (x.fps ?? 30) <= 30) ?? format.deliverables[0];
  return { width: d.width, height: d.height, fps: Math.min(30, d.fps ?? 30) };
}

/**
 * Clips to film for a format. A dissolve/push of D ms shows the next scene D ms early, so the next
 * clip gets D ms of pre-roll; a fade-to-paper of D ms ends the outgoing clip D/2 early and pre-rolls
 * the incoming one by D/2, with a paper-coloured clip of D ms in between.
 */
export function clipPlan(doc, formatId) {
  const format = doc.formats.find((f) => f.id === formatId);
  if (!format) throw new Error(`unknown format: ${formatId}`);
  const scenes = new Map(doc.scenes.map((s) => [s.id, s]));
  let startMs = 0;
  let incoming = null;
  const clips = format.sequence.map((item, i) => {
    const scene = scenes.get(item.scene);
    if (!scene) throw new Error(`${formatId}: unknown scene ${item.scene}`);
    const inMs = item.inMs ?? 0;
    const last = i === format.sequence.length - 1;
    const outgoing = last ? null : scene.transition;
    const outKind = xfadeKind(outgoing);
    const preMs = incoming ? (incoming.kind === 'paper' ? incoming.durationMs / 2 : incoming.durationMs) : 0;
    const cutMs = outKind === 'paper' ? outgoing.durationMs / 2 : 0;
    const clip = {
      index: i,
      sceneId: scene.id,
      scene,
      startMs,
      inMs,
      durationMs: item.durationMs,
      preMs,
      /** Scene-time window to cut from the recording. */
      fromMs: inMs - preMs,
      toMs: inMs + item.durationMs - cutMs,
      transitionIn: incoming,
      transitionOut: outKind ? { kind: outKind, durationMs: outgoing.durationMs, type: outgoing.type } : null,
    };
    incoming = clip.transitionOut;
    startMs += item.durationMs;
    return clip;
  });
  return { format, clips, totalMs: startMs };
}

/** Longest scene time a recording must cover for one scene across all its clips. */
export function recordWindow(clips) {
  return {
    leadMs: Math.max(0, ...clips.map((c) => -c.fromMs)),
    untilMs: Math.max(...clips.map((c) => c.toMs)),
  };
}

const sec = (ms) => (ms / 1000).toFixed(3);

/**
 * Segments to join in order: film clips plus paper clips for fade-to-paper. Each segment knows the
 * xfade that brings it in (`join`), its length, and where it starts in programme time.
 */
export function segments(plan) {
  const out = [];
  for (const c of plan.clips) {
    const tIn = c.transitionIn;
    if (tIn?.kind === 'paper') {
      // Paper sits over [T − D, T]: A blends into it over D/2, it blends into B over D/2.
      out.push({ type: 'paper', lengthMs: tIn.durationMs, join: { kind: 'fade', durationMs: tIn.durationMs / 2 } });
      out.push({ type: 'clip', clip: c, lengthMs: c.toMs - c.fromMs, join: { kind: 'fade', durationMs: tIn.durationMs / 2 } });
    } else {
      const join = tIn ? { kind: tIn.kind, durationMs: tIn.durationMs } : { kind: 'cut', durationMs: 0 };
      out.push({ type: 'clip', clip: c, lengthMs: c.toMs - c.fromMs, join });
    }
  }
  out[0].join = { kind: 'cut', durationMs: 0 };
  return out;
}

/**
 * filter_complex joining `segs` (inputs [0:v], [1:v]… in order). Cuts use concat, transitions
 * xfade at offset = current length − overlap. Returns the graph, final label and total length.
 */
export function joinGraph(segs, { fps }) {
  const parts = [];
  for (let i = 0; i < segs.length; i += 1) {
    parts.push(`[${i}:v]settb=1/${fps * 1000},fps=${fps},format=yuv420p,setpts=PTS-STARTPTS[s${i}]`);
  }
  let label = 's0';
  let lengthMs = segs[0].lengthMs;
  for (let i = 1; i < segs.length; i += 1) {
    const { kind, durationMs } = segs[i].join;
    const next = `j${i}`;
    if (kind === 'cut' || durationMs === 0) {
      parts.push(`[${label}][s${i}]concat=n=2:v=1:a=0[${next}]`);
      lengthMs += segs[i].lengthMs;
    } else {
      const offset = lengthMs - durationMs;
      parts.push(`[${label}][s${i}]xfade=transition=${kind}:duration=${sec(durationMs)}:offset=${sec(offset)}[${next}]`);
      lengthMs += segs[i].lengthMs - durationMs;
    }
    label = next;
  }
  return { graph: parts.join(';'), label, lengthMs };
}

/**
 * Concat-demuxer list turning timestamped frames into a clip of [fromMs, toMs] (scene time).
 * `frames`: [{ file, t }] sorted by t (ms, scene time). The last frame before `fromMs` opens the clip.
 */
export function frameList(frames, fromMs, toMs) {
  const firstIdx = Math.max(0, frames.findLastIndex((f) => f.t <= fromMs));
  const picked = frames.slice(firstIdx).filter((f, i) => i === 0 || (f.t > fromMs && f.t < toMs));
  if (picked.length === 0) throw new Error('no frames in window');
  const lines = ['ffconcat version 1.0'];
  picked.forEach((f, i) => {
    const start = Math.max(f.t, fromMs);
    const end = i + 1 < picked.length ? picked[i + 1].t : toMs;
    lines.push(`file '${f.file}'`, `duration ${sec(Math.max(1, end - start))}`);
  });
  // The demuxer ignores the last duration unless the final file is repeated.
  lines.push(`file '${picked.at(-1).file}'`);
  return lines.join('\n') + '\n';
}

/** Caption timing inside a clip, in scene time: in after 250 ms, out 450 ms before the cut. */
export function captionTiming(clip) {
  return { captionInMs: clip.inMs + 250, captionOutMs: clip.inMs + clip.durationMs - 450 };
}
