/**
 * Canvas2D cannot read CSS variables, so the design tokens are resolved once per theme change
 * and handed to the renderer as plain strings.
 */
export interface CanvasTheme {
  bg: string;
  surface: string;
  surface2: string;
  ink: string;
  ink2: string;
  ink3: string;
  line: string;
  lineStrong: string;
  accent: string;
  accentSoft: string;
  accentStrong: string;
  create: string;
  success: string;
  warning: string;
  /** `--cat-1` … `--cat-8` (soft fills). */
  cats: string[];
  /** `--viz-1` … `--viz-8` (saturated marks: dots, ink). */
  viz: string[];
  font: string;
  /** Durations in ms. */
  durBase: number;
  durSlow: number;
  durSlower: number;
  dark: boolean;
}

export const FALLBACK_THEME: CanvasTheme = {
  bg: '#f6f4ef',
  surface: '#ffffff',
  surface2: '#f0ede6',
  ink: '#1c1b18',
  ink2: '#4f4b44',
  ink3: '#656156',
  line: '#e6e2d8',
  lineStrong: '#d3cec2',
  accent: '#ff8f70',
  accentSoft: '#ffe5dc',
  accentStrong: '#a83c1f',
  create: '#344ce5',
  success: '#007144',
  warning: '#8b5600',
  cats: ['#ffd8cc', '#ffe7b8', '#d9f0d3', '#cfe8f2', '#dcdcfb', '#f3d9ef', '#e9e2d4', '#d6e6e1'],
  viz: ['#e2603f', '#c98a00', '#3f9a54', '#2f8bb3', '#5a5ad6', '#b04fa2', '#7d7464', '#3d8f7f'],
  font: 'system-ui, sans-serif',
  durBase: 220,
  durSlow: 320,
  durSlower: 480,
  dark: false,
};

/** Parses `220ms` / `0.22s` into milliseconds. */
export function parseDuration(value: string, fallback: number): number {
  const v = value.trim();
  const ms = /^(-?[\d.]+)ms$/.exec(v);
  if (ms) return Number(ms[1]);
  const s = /^(-?[\d.]+)s$/.exec(v);
  if (s) return Number(s[1]) * 1000;
  return fallback;
}

/** Relative luminance check, enough to know whether the background is dark. */
export function isDarkColor(color: string): boolean {
  const hex = /^#([\da-f]{6})$/i.exec(color.trim());
  if (!hex) return false;
  const n = parseInt(hex[1] as string, 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return 0.2126 * r + 0.7152 * g + 0.0722 * b < 128;
}

export function readTheme(element: Element): CanvasTheme {
  const style = getComputedStyle(element);
  const get = (name: string, fallback: string) => style.getPropertyValue(name).trim() || fallback;
  const f = FALLBACK_THEME;
  const bg = get('--bg', f.bg);
  return {
    bg,
    surface: get('--surface', f.surface),
    surface2: get('--surface-2', f.surface2),
    ink: get('--ink', f.ink),
    ink2: get('--ink-2', f.ink2),
    ink3: get('--ink-3', f.ink3),
    line: get('--line', f.line),
    lineStrong: get('--line-strong', f.lineStrong),
    accent: get('--accent', f.accent),
    accentSoft: get('--accent-soft', f.accentSoft),
    accentStrong: get('--accent-strong', f.accentStrong),
    create: get('--create', f.create),
    success: get('--success', f.success),
    warning: get('--warning', f.warning),
    cats: f.cats.map((c, i) => get(`--cat-${i + 1}`, c)),
    viz: f.viz.map((c, i) => get(`--viz-${i + 1}`, c)),
    font: get('--font-sans', f.font),
    durBase: parseDuration(get('--dur-base', ''), f.durBase),
    durSlow: parseDuration(get('--dur-slow', ''), f.durSlow),
    durSlower: parseDuration(get('--dur-slower', ''), f.durSlower),
    dark: isDarkColor(bg),
  };
}
