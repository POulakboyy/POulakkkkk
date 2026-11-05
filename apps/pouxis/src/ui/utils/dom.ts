/** Elements that can receive keyboard focus by default. */
const FOCUSABLE = [
  'a[href]',
  'area[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  'iframe',
  'audio[controls]',
  'video[controls]',
  'summary',
  '[contenteditable]:not([contenteditable="false"])',
  '[tabindex]',
].join(',');

/** Tabbable descendants of `root`, in DOM order (hidden, inert and `tabindex="-1"` excluded). */
export function getTabbable(root: HTMLElement): HTMLElement[] {
  const nodes = Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE));
  return nodes.filter(
    (el) => el.tabIndex >= 0 && !el.closest('[hidden], [inert]') && !isDisplayNone(el, root),
  );
}

function isDisplayNone(el: HTMLElement, root: HTMLElement): boolean {
  let node: HTMLElement | null = el;
  while (node && node !== root) {
    if (node.style.display === 'none') return true;
    node = node.parentElement;
  }
  return false;
}

/** Focuses without scrolling the page (overlays position themselves). */
export function focusElement(el: HTMLElement | null | undefined): void {
  if (!el) return;
  try {
    el.focus({ preventScroll: true });
  } catch {
    el.focus();
  }
}

/** True when the event target is a text-entry control where shortcuts must not fire. */
export function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  if (target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement) return true;
  if (target instanceof HTMLInputElement) {
    return !['checkbox', 'radio', 'button', 'submit', 'reset', 'range', 'color', 'file'].includes(
      target.type,
    );
  }
  return false;
}

/** Longest CSS animation/transition (duration + delay) currently applied to `el`, in ms. */
export function getMaxMotionMs(el: Element): number {
  if (typeof getComputedStyle !== 'function') return 0;
  const cs = getComputedStyle(el);
  const animations = cs.animationName && cs.animationName !== 'none';
  const a = animations ? maxOfLists(cs.animationDuration, cs.animationDelay) : 0;
  const t = maxOfLists(cs.transitionDuration, cs.transitionDelay);
  return Math.max(a, t);
}

function parseTime(value: string): number {
  const v = value.trim();
  if (!v) return 0;
  const n = Number.parseFloat(v);
  if (Number.isNaN(n)) return 0;
  return v.endsWith('ms') ? n : n * 1000;
}

function maxOfLists(durations: string | undefined, delays: string | undefined): number {
  if (!durations) return 0;
  const ds = durations.split(',');
  const ls = (delays ?? '').split(',');
  let max = 0;
  ds.forEach((d, i) => {
    max = Math.max(max, parseTime(d) + parseTime(ls[i] ?? ls[0] ?? '0'));
  });
  return max;
}

/** Whether the platform uses ⌘ as the primary modifier (macOS, iOS, iPadOS). */
export function isApplePlatform(): boolean {
  if (typeof navigator === 'undefined') return false;
  const nav = navigator as Navigator & { userAgentData?: { platform?: string } };
  const p = nav.userAgentData?.platform ?? navigator.platform ?? '';
  return /mac|iphone|ipad|ipod/i.test(p) || /Mac OS X|iPhone|iPad/.test(navigator.userAgent);
}

/** Reads the writing direction of `el` (for swipe gestures and positioning). */
export function isRtl(el: Element | null): boolean {
  if (!el || typeof getComputedStyle !== 'function') return false;
  return getComputedStyle(el).direction === 'rtl';
}
