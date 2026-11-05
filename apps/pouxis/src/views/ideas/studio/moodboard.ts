/**
 * Moodboard session (5.2): dropped images stay in memory (object URLs) for the session only;
 * each one gets a palette from `ideation.extractPalette`.
 */
import { useSyncExternalStore } from 'react';
import { createId, ideation } from '@pouxis/core';

export interface MoodImage {
  id: string;
  name: string;
  url: string;
  /** `null` while decoding, `'error'` when the file could not be read. */
  palette: string[] | null | 'error';
}

/** Longest side, in px, of the copy sampled for the palette (keeps extraction instant). */
const SAMPLE_SIDE = 160;

let images: readonly MoodImage[] = [];
const listeners = new Set<() => void>();

function set(next: readonly MoodImage[]): void {
  images = next;
  for (const l of [...listeners]) l();
}

function patch(id: string, palette: MoodImage['palette']): void {
  set(images.map((img) => (img.id === id ? { ...img, palette } : img)));
}

export type Decoder = (file: File) => Promise<Uint8ClampedArray>;

/** Draws a downscaled copy of the image and returns its RGBA pixels. */
export const decodeImage: Decoder = async (file) => {
  const bitmap = await createImageBitmap(file);
  try {
    const scale = Math.min(1, SAMPLE_SIDE / Math.max(bitmap.width, bitmap.height, 1));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) throw new Error('2D canvas unavailable');
    ctx.drawImage(bitmap, 0, 0, width, height);
    return ctx.getImageData(0, 0, width, height).data;
  } finally {
    bitmap.close();
  }
};

export const moodboard = {
  images: (): readonly MoodImage[] => images,
  subscribe(listener: () => void): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  /** Adds the image files among `files` and extracts their palettes in the background. */
  async add(files: Iterable<File>, decode: Decoder = decodeImage): Promise<void> {
    const added: Array<{ image: MoodImage; file: File }> = [];
    for (const file of files) {
      if (!file.type.startsWith('image/')) continue;
      const image: MoodImage = {
        id: createId(),
        name: file.name,
        url: URL.createObjectURL(file),
        palette: null,
      };
      added.push({ image, file });
    }
    if (added.length === 0) return;
    set([...added.map((a) => a.image), ...images]);
    await Promise.all(
      added.map(async ({ image, file }) => {
        try {
          patch(image.id, ideation.extractPalette(await decode(file), { k: 5 }));
        } catch {
          patch(image.id, 'error');
        }
      }),
    );
  },
  remove(id: string): void {
    const doomed = images.find((img) => img.id === id);
    if (doomed) URL.revokeObjectURL(doomed.url);
    set(images.filter((img) => img.id !== id));
  },
  clear(): void {
    for (const img of images) URL.revokeObjectURL(img.url);
    set([]);
  },
};

export function useMoodboard(): readonly MoodImage[] {
  return useSyncExternalStore(moodboard.subscribe, moodboard.images, moodboard.images);
}

/** Every distinct colour of the board, most recent image first. */
export function boardPalette(list: readonly MoodImage[]): string[] {
  const out = new Set<string>();
  for (const img of list)
    if (Array.isArray(img.palette)) for (const hex of img.palette) out.add(hex);
  return [...out];
}
