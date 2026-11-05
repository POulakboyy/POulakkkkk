// SRT → ASS conversion so burned-in subtitles use brand colours and frame-relative sizes
// (libass would otherwise scale SRT styles against a 384×288 canvas).

/** "00:01:05,432" → 65432 ms. */
export function parseSrtTime(s) {
  const m = /^(\d+):(\d\d):(\d\d)[,.](\d{3})$/.exec(s.trim());
  if (!m) throw new Error(`bad SRT time: ${s}`);
  return ((+m[1] * 60 + +m[2]) * 60 + +m[3]) * 1000 + +m[4];
}

export function parseSrt(text) {
  return text
    .replace(/\r/g, '')
    .split(/\n{2,}/)
    .map((block) => block.trim().split('\n'))
    .filter((lines) => lines.length >= 3)
    .map(([, times, ...body]) => {
      const [a, b] = times.split('-->');
      return { start: parseSrtTime(a), end: parseSrtTime(b), text: body.join('\n') };
    });
}

/** 65432 → "0:01:05.43" (ASS centiseconds). */
export function assTime(ms) {
  const cs = Math.round(ms / 10);
  const h = Math.floor(cs / 360000);
  const m = Math.floor((cs % 360000) / 6000);
  const s = Math.floor((cs % 6000) / 100);
  const pad = (n) => String(n).padStart(2, '0');
  return `${h}:${pad(m)}:${pad(s)}.${pad(cs % 100)}`;
}

/** "#f6f4ef" + alpha 0–255 (0 = opaque) → "&H00EFF4F6" (ASS is AABBGGRR). */
export function assColour(hex, alpha = 0) {
  const m = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex.trim());
  if (!m) throw new Error(`colour must be #rrggbb: ${hex}`);
  const aa = alpha.toString(16).padStart(2, '0');
  return `&H${aa}${m[3]}${m[2]}${m[1]}`.toUpperCase();
}

/**
 * ASS document for `cues` on a `width`×`height` frame: ink on a paper box, bottom centre,
 * font size `sizeRatio` of the frame height.
 */
export function toAss(cues, { width, height, ink, paper, font = 'Inter', sizeRatio = 0.037 }) {
  const size = Math.round(height * sizeRatio);
  const margin = Math.round(height * 0.045);
  const style = [
    'Default',
    font,
    size,
    assColour(ink),
    assColour(ink),
    assColour(paper, 0x14),
    assColour(paper, 0x14),
    0,
    0,
    0,
    0,
    100,
    100,
    0,
    0,
    3,
    Math.round(size * 0.32),
    0,
    2,
    margin,
    margin,
    margin,
    1,
  ].join(',');
  const events = cues.map(
    (c) =>
      `Dialogue: 0,${assTime(c.start)},${assTime(c.end)},Default,,0,0,0,,${c.text.replaceAll('\n', '\\N')}`,
  );
  return [
    '[Script Info]',
    'ScriptType: v4.00+',
    `PlayResX: ${width}`,
    `PlayResY: ${height}`,
    'WrapStyle: 2',
    'ScaledBorderAndShadow: yes',
    '',
    '[V4+ Styles]',
    'Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding',
    `Style: ${style}`,
    '',
    '[Events]',
    'Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text',
    ...events,
    '',
  ].join('\n');
}
