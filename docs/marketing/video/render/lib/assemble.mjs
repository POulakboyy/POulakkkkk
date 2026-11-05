// ffmpeg / ffprobe steps: frames → clips, clips → programme, poster frames, validation.
import { execFileSync } from 'node:child_process';
import { statSync, writeFileSync } from 'node:fs';
import { FINAL_CRF, CLIP_CRF } from './config.mjs';
import { frameList, joinGraph } from './plan.mjs';

function ffmpeg(args) {
  execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', ...args], { stdio: ['ignore', 'inherit', 'inherit'] });
}

const sec = (ms) => (ms / 1000).toFixed(3);

/** Encodes scene-time window [fromMs, toMs] of `frames` into a constant-frame-rate clip. */
export function encodeClip(frames, { fromMs, toMs }, out, { width, height, fps }, listPath) {
  writeFileSync(listPath, frameList(frames, fromMs, toMs));
  ffmpeg([
    '-f', 'concat', '-safe', '0', '-i', listPath,
    '-vf', `fps=${fps},scale=${width}:${height}:flags=lanczos,format=yuv420p`,
    '-t', sec(toMs - fromMs),
    '-c:v', 'libx264', '-preset', 'veryfast', '-crf', String(CLIP_CRF), '-an', out,
  ]);
}

/** Solid paper-coloured clip (fade-to-paper transitions). */
export function encodePaper(colour, lengthMs, out, { width, height, fps }) {
  ffmpeg([
    '-f', 'lavfi', '-i', `color=c=${colour}:s=${width}x${height}:r=${fps}:d=${sec(lengthMs)}`,
    '-vf', 'format=yuv420p', '-c:v', 'libx264', '-preset', 'veryfast', '-crf', String(CLIP_CRF), out,
  ]);
}

/**
 * Joins segment files into the final H.264 file: xfade/concat graph, optional burned ASS
 * subtitles, a silent stereo AAC track (stores expect an audio track; music is not produced).
 */
export function encodeProgramme(segs, files, out, { fps, assPath }) {
  const { graph, label, lengthMs } = joinGraph(segs, { fps });
  const subs = assPath ? `;[${label}]subtitles=filename='${assPath.replaceAll("'", "\\'")}'[final]` : '';
  const vOut = assPath ? '[final]' : `[${label}]`;
  ffmpeg([
    ...files.flatMap((f) => ['-i', f]),
    '-f', 'lavfi', '-i', 'anullsrc=r=48000:cl=stereo',
    '-filter_complex', graph + subs,
    '-map', vOut, '-map', `${files.length}:a`,
    '-t', sec(lengthMs),
    '-c:v', 'libx264', '-preset', 'slow', '-crf', String(FINAL_CRF),
    '-profile:v', 'high', '-level:v', '4.0', '-pix_fmt', 'yuv420p', '-r', String(fps),
    '-c:a', 'aac', '-b:a', '256k', '-ar', '48000', '-ac', '2',
    '-movflags', '+faststart', out,
  ]);
  return lengthMs;
}

export function posterFrame(video, atMs, out) {
  ffmpeg(['-ss', sec(atMs), '-i', video, '-frames:v', '1', out]);
}

/** Duration, size, frame rate and codecs of a file, from ffprobe. */
export function probe(file) {
  const json = execFileSync(
    'ffprobe',
    ['-v', 'error', '-show_entries', 'format=duration:stream=codec_type,codec_name,width,height,r_frame_rate,profile,sample_rate,channels', '-of', 'json', file],
    { encoding: 'utf8' },
  );
  const data = JSON.parse(json);
  const v = data.streams.find((s) => s.codec_type === 'video');
  const a = data.streams.find((s) => s.codec_type === 'audio');
  const [num, den] = v.r_frame_rate.split('/').map(Number);
  return {
    durationS: Number(Number(data.format.duration).toFixed(3)),
    width: v.width,
    height: v.height,
    fps: Number((num / den).toFixed(3)),
    video: `${v.codec_name} ${v.profile}`,
    audio: a ? `${a.codec_name} ${a.sample_rate} Hz ${a.channels} ch` : 'none',
    bytes: statSync(file).size,
  };
}
