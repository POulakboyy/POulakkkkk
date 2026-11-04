/** Pure keyboard maths for roving-tabindex widgets (Tabs, SegmentedControl, Menu). */

export interface RovingOptions {
  orientation?: 'horizontal' | 'vertical' | 'both';
  /** Wrap from last to first and back. Default `true`. */
  loop?: boolean;
  /** Right-to-left: ArrowLeft moves forward. */
  rtl?: boolean;
  /** Items that cannot receive focus. */
  isDisabled?: (index: number) => boolean;
}

/**
 * The index focus moves to for `key`, or `null` when the key is not a navigation key.
 * Skips disabled items; returns `current` when nothing else is enabled.
 */
export function nextRovingIndex(
  current: number,
  key: string,
  count: number,
  {
    orientation = 'horizontal',
    loop = true,
    rtl = false,
    isDisabled = () => false,
  }: RovingOptions = {},
): number | null {
  if (count <= 0) return null;
  const horizontal = orientation !== 'vertical';
  const vertical = orientation !== 'horizontal';
  let step: 1 | -1;
  let from = current;
  switch (key) {
    case 'ArrowRight':
      if (!horizontal) return null;
      step = rtl ? -1 : 1;
      break;
    case 'ArrowLeft':
      if (!horizontal) return null;
      step = rtl ? 1 : -1;
      break;
    case 'ArrowDown':
      if (!vertical) return null;
      step = 1;
      break;
    case 'ArrowUp':
      if (!vertical) return null;
      step = -1;
      break;
    case 'Home':
      step = 1;
      from = -1;
      break;
    case 'End':
      step = -1;
      from = count;
      break;
    default:
      return null;
  }
  const unbounded = key === 'Home' || key === 'End';
  let i = from;
  for (let n = 0; n < count; n++) {
    i += step;
    if (i < 0 || i >= count) {
      if (!loop || unbounded) return current;
      i = (i + count) % count;
    }
    if (!isDisabled(i)) return i;
  }
  return current;
}

/**
 * Typeahead: index of the first item after `current` whose label starts with `query`
 * (case- and accent-insensitive), wrapping around; `null` when none matches.
 */
export function typeaheadIndex(
  labels: readonly string[],
  query: string,
  current: number,
  isDisabled: (index: number) => boolean = () => false,
): number | null {
  const q = normalize(query);
  if (!q) return null;
  const count = labels.length;
  // A repeated single letter cycles through matches; otherwise prefer the current item.
  const repeated = q.length > 1 && [...q].every((c) => c === q[0]);
  const needle = repeated ? q[0]! : q;
  const startOffset = needle.length === 1 ? 1 : 0;
  for (let n = 0; n < count; n++) {
    const i = (current + startOffset + n + count) % count;
    if (!isDisabled(i) && normalize(labels[i] ?? '').startsWith(needle)) return i;
  }
  return null;
}

function normalize(s: string): string {
  return s
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim();
}
