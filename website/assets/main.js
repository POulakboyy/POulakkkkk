// POuxis landing page — progressive enhancement only. The page is complete without this file.
(() => {
  'use strict';

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  // Placeholder download badges: keep them focusable for screen readers, but inert.
  document.querySelectorAll('a[aria-disabled="true"]').forEach((link) => {
    link.addEventListener('click', (event) => event.preventDefault());
  });

  /**
   * Scroll reveals. Only elements that start below the fold are hidden, so the first frame is
   * always complete; everything uses transform/opacity and is skipped under reduced motion.
   */
  function setUpReveals() {
    if (reduceMotion.matches || !('IntersectionObserver' in window)) return;
    const targets = [...document.querySelectorAll('[data-reveal]')];
    const fold = window.innerHeight * 0.92;
    const pending = targets.filter((el) => el.getBoundingClientRect().top > fold);
    if (pending.length === 0) return;

    for (const el of pending) {
      const siblings = [...(el.parentElement?.children ?? [])].filter((s) =>
        s.hasAttribute('data-reveal'),
      );
      el.style.setProperty('--i', String(Math.min(siblings.indexOf(el), 5)));
      el.classList.add('is-pending');
    }
    document.documentElement.classList.add('reveal-ready');

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          entry.target.classList.remove('is-pending');
          observer.unobserve(entry.target);
        }
      },
      { rootMargin: '0px 0px -8% 0px', threshold: 0.08 },
    );
    pending.forEach((el) => observer.observe(el));
  }

  /** Formats a number of seconds as m:ss. */
  function formatClock(totalSeconds) {
    const s = Math.max(0, Math.round(totalSeconds));
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  }

  /** Focus mini-player in the app mock: a 25-minute session that ticks while visible. */
  function setUpPlayer() {
    const player = document.querySelector('[data-player]');
    if (!player) return;
    const total = Number(player.dataset.total) || 1500;
    const bar = player.querySelector('[data-bar]');
    const elapsedEl = player.querySelector('[data-elapsed]');
    const remainingEl = player.querySelector('[data-remaining]');
    let elapsed = Number(player.dataset.start) || 0;

    const render = () => {
      bar?.style.setProperty('--p', (elapsed / total).toFixed(4));
      if (elapsedEl) elapsedEl.textContent = formatClock(elapsed);
      if (remainingEl) remainingEl.textContent = `−${formatClock(total - elapsed)}`;
    };

    render();
    window.setInterval(() => {
      if (document.hidden) return;
      elapsed = elapsed >= total ? 0 : elapsed + 1;
      render();
    }, 1000);
  }

  setUpReveals();
  setUpPlayer();
})();
