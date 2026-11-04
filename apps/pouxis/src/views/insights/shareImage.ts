/**
 * Weekly review as a shareable image (7.9): a self-contained SVG poster, rasterised to PNG in
 * the browser and handed to the native share sheet when available, downloaded otherwise.
 * Nothing is uploaded anywhere.
 */

export const IMAGE_WIDTH = 1080;
export const IMAGE_HEIGHT = 1350;

export interface ReviewImage {
  eyebrow: string;
  title: string;
  stats: readonly { label: string; value: string }[];
  winsTitle: string;
  wins: readonly string[];
  /** Shown instead of the list when there are no wins. */
  winsEmpty: string;
  blockersTitle: string;
  blockers: readonly string[];
  footer: string;
  /** Mirrors the light / dark tokens (`--bg`, `--surface`, `--ink`, `--accent-strong`). */
  theme: 'light' | 'dark';
}

const PALETTE = {
  light: { bg: '#f6f4ef', card: '#ffffff', ink: '#1c1b18', ink2: '#4f4b44', accent: '#a83c1f' },
  dark: { bg: '#121211', card: '#1f1e1c', ink: '#f3f1ec', ink2: '#bdb8ad', accent: '#ffa58c' },
} as const;

const SERIF = "ui-serif, 'New York', Georgia, 'Times New Roman', serif";
const SANS = "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif";

export function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/** Cuts `text` to `max` characters on a word boundary when possible, with an ellipsis. */
export function truncate(text: string, max: number): string {
  const t = text.trim();
  if (t.length <= max) return t;
  const cut = t.slice(0, max - 1);
  const space = cut.lastIndexOf(' ');
  return `${(space > max * 0.6 ? cut.slice(0, space) : cut).trimEnd()}…`;
}

export function reviewImageSvg(r: ReviewImage): string {
  const c = PALETTE[r.theme];
  const pad = 88;
  const parts: string[] = [];
  const text = (x: number, y: number, s: string, attrs: string) =>
    parts.push(`<text x="${x}" y="${y}" ${attrs}>${escapeXml(s)}</text>`);

  parts.push(`<rect width="${IMAGE_WIDTH}" height="${IMAGE_HEIGHT}" fill="${c.bg}"/>`);
  text(pad, 150, r.eyebrow.toUpperCase(), `font-family="${SANS}" font-size="28" letter-spacing="3" font-weight="600" fill="${c.accent}"`);
  text(pad, 236, truncate(r.title, 32), `font-family="${SERIF}" font-size="76" fill="${c.ink}"`);

  // Stat tiles.
  const stats = r.stats.slice(0, 3);
  const gap = 24;
  const tileW = (IMAGE_WIDTH - pad * 2 - gap * (stats.length - 1)) / Math.max(1, stats.length);
  stats.forEach((s, i) => {
    const x = pad + i * (tileW + gap);
    parts.push(`<rect x="${x}" y="300" width="${tileW}" height="168" rx="28" fill="${c.card}"/>`);
    text(x + 32, 368, truncate(s.label, 18), `font-family="${SANS}" font-size="28" fill="${c.ink2}"`);
    text(x + 32, 432, truncate(s.value, 10), `font-family="${SERIF}" font-size="56" fill="${c.ink}"`);
  });

  // Wins, ascending: the biggest one closes the list and is accented.
  let y = 570;
  text(pad, y, r.winsTitle, `font-family="${SANS}" font-size="34" font-weight="600" fill="${c.ink}"`);
  y += 64;
  const wins = r.wins.slice(-6);
  if (wins.length === 0) {
    text(pad, y, truncate(r.winsEmpty, 52), `font-family="${SANS}" font-size="32" fill="${c.ink2}"`);
    y += 60;
  }
  wins.forEach((w, i) => {
    const last = i === wins.length - 1;
    parts.push(`<circle cx="${pad + 10}" cy="${y - 11}" r="${last ? 10 : 7}" fill="${last ? c.accent : c.ink2}"/>`);
    text(pad + 44, y, truncate(w, 46), `font-family="${SANS}" font-size="34" ${last ? 'font-weight="600"' : ''} fill="${c.ink}"`);
    y += 62;
  });

  if (r.blockers.length > 0) {
    y += 40;
    text(pad, y, r.blockersTitle, `font-family="${SANS}" font-size="34" font-weight="600" fill="${c.ink}"`);
    y += 64;
    for (const b of r.blockers.slice(0, 3)) {
      text(pad, y, `— ${truncate(b, 48)}`, `font-family="${SANS}" font-size="32" fill="${c.ink2}"`);
      y += 56;
    }
  }

  text(pad, IMAGE_HEIGHT - 80, r.footer, `font-family="${SANS}" font-size="26" fill="${c.ink2}"`);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${IMAGE_WIDTH}" height="${IMAGE_HEIGHT}" viewBox="0 0 ${IMAGE_WIDTH} ${IMAGE_HEIGHT}">${parts.join('')}</svg>`;
}

/** Rasterises an SVG string to a PNG blob (browser only). */
export async function svgToPng(svg: string): Promise<Blob> {
  const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
  try {
    const img = new Image();
    img.decoding = 'async';
    img.src = url;
    await img.decode();
    const canvas = document.createElement('canvas');
    canvas.width = IMAGE_WIDTH;
    canvas.height = IMAGE_HEIGHT;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D is unavailable');
    ctx.drawImage(img, 0, 0);
    return await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('PNG encoding failed'))), 'image/png'),
    );
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** `shared` when the native share sheet took it, `downloaded` otherwise. */
export async function shareImage(
  blob: Blob,
  filename: string,
  title: string,
): Promise<'shared' | 'downloaded'> {
  const file = new File([blob], filename, { type: 'image/png' });
  const nav = globalThis.navigator as Navigator | undefined;
  if (nav?.canShare?.({ files: [file] }) && nav.share) {
    await nav.share({ files: [file], title });
    return 'shared';
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return 'downloaded';
}
