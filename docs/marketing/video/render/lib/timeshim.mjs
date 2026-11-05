// Virtual clock injected into every document before its scripts run. It starts at the fixture
// time and can be slowed down: the screencast cannot deliver 30 frames/s in headless Chromium, so
// scenes are filmed at 1/N speed (JS time here, CSS time via Animation.setPlaybackRate) and the
// frame timestamps are divided by N afterwards. Everything time-based in the app (Date, timers,
// requestAnimationFrame, performance.now) sees one consistent, slowed timeline.

/** Init script source; `epochMs` is the virtual wall-clock time at load. */
export function timeShimSource(epochMs) {
  return `(() => {
  const perf = performance;
  const realPerf = perf.now.bind(perf);
  const RealDate = Date;
  const realSetTimeout = setTimeout.bind(window);
  const realSetInterval = setInterval.bind(window);
  const realRaf = requestAnimationFrame.bind(window);
  let rate = 1;
  let realAnchor = realPerf();
  let virtAnchor = realAnchor;
  const offset = ${Number(epochMs)} - realAnchor;
  const virt = (real = realPerf()) => virtAnchor + (real - realAnchor) * rate;
  const epoch = () => virt() + offset;
  window.__videoSetRate = (r) => { const now = realPerf(); virtAnchor = virt(now); realAnchor = now; rate = r; };
  perf.now = () => virt();
  function FakeDate(...args) {
    if (!new.target) return new RealDate(epoch()).toString();
    return args.length ? new RealDate(...args) : new RealDate(epoch());
  }
  FakeDate.prototype = RealDate.prototype;
  FakeDate.now = epoch;
  FakeDate.parse = RealDate.parse;
  FakeDate.UTC = RealDate.UTC;
  window.Date = FakeDate;
  window.setTimeout = (fn, ms = 0, ...a) => realSetTimeout(fn, (Number(ms) || 0) / rate, ...a);
  window.setInterval = (fn, ms = 0, ...a) => realSetInterval(fn, (Number(ms) || 0) / rate, ...a);
  window.requestAnimationFrame = (cb) => realRaf((ts) => cb(virt(ts)));
})();`;
}
