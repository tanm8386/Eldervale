import { HAIR_COLORS, SKIN_COLORS, OUTFIT_COLORS } from '../../shared/data.js';
import type { Appearance, AssetMeta, ClassId } from '../types';

const rgb = (hex: string) => [
  parseInt(hex.slice(1, 3), 16),
  parseInt(hex.slice(3, 5), 16),
  parseInt(hex.slice(5, 7), 16),
];
const adjusted = (hex: string, factor: number, offset = 0) =>
  rgb(hex).map((v) => Math.max(0, Math.min(255, Math.round(v * factor + offset))));

export class Art {
  images = new Map<string, HTMLImageElement>();
  meta: Record<string, AssetMeta> = {};
  characters = new Map<string, HTMLCanvasElement>();

  async load(onProgress: (fraction: number) => void) {
    const response = await fetch('/assets/manifest.json');
    if (!response.ok) throw new Error('The art collection could not be loaded. Please refresh.');
    this.meta = (await response.json()).assets;
    const names = Object.keys(this.meta);
    let complete = 0;
    await Promise.all(
      names.map(async (name) => {
        const image = new Image();
        image.src = `/assets/${name}.png`;
        await image.decode();
        this.images.set(name, image);
        onProgress(++complete / names.length);
      }),
    );
  }

  draw(ctx: CanvasRenderingContext2D, name: string, x: number, y: number, frame = 0, scale = 1) {
    const img = this.images.get(name),
      meta = this.meta[name];
    if (!img || !meta) return;
    const f = Math.abs(Math.floor(frame)) % meta.frames;
    ctx.drawImage(
      img,
      (f % meta.columns) * meta.w,
      Math.floor(f / meta.columns) * meta.h,
      meta.w,
      meta.h,
      Math.round(x),
      Math.round(y),
      meta.w * scale,
      meta.h * scale,
    );
  }

  avatar(classId: ClassId, appearance: Appearance) {
    const key = `${classId}-${appearance.style}-${appearance.skin}-${appearance.hair}-${appearance.outfit}`;
    const cached = this.characters.get(key);
    if (cached) return cached;
    const img = this.images.get(`${classId}-${appearance.style}`);
    if (!img) return null;
    const canvas = document.createElement('canvas');
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
    ctx.drawImage(img, 0, 0);
    const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const skin = SKIN_COLORS[appearance.skin] || SKIN_COLORS[0];
    const hair = HAIR_COLORS[appearance.hair] || HAIR_COLORS[0];
    const cloth = OUTFIT_COLORS[appearance.outfit] || OUTFIT_COLORS[0];
    const entries: [string, number[]][] = [
      ['#e8bc94', rgb(skin)],
      ['#f3d7b0', adjusted(skin, 0.83, 48)],
      ['#b88062', adjusted(skin, 0.75, -2)],
      ['#87603e', rgb(hair)],
      ['#b08a5b', adjusted(hair, 1.16, 22)],
      ['#594431', adjusted(hair, 0.68, 2)],
      ['#73916a', rgb(cloth)],
      ['#a0b181', adjusted(cloth, 1.05, 29)],
      ['#4a6950', adjusted(cloth, 0.71)],
    ];
    const replacements = new Map(
      entries.map(([hex, color]) => {
        const [r, g, b] = rgb(hex);
        return [r * 65536 + g * 256 + b, color];
      }),
    );
    for (let i = 0; i < pixels.data.length; i += 4) {
      const color = replacements.get(
        pixels.data[i] * 65536 + pixels.data[i + 1] * 256 + pixels.data[i + 2],
      );
      if (color) {
        pixels.data[i] = color[0];
        pixels.data[i + 1] = color[1];
        pixels.data[i + 2] = color[2];
      }
    }
    ctx.putImageData(pixels, 0, 0);
    this.characters.set(key, canvas);
    return canvas;
  }

  drawAvatar(
    ctx: CanvasRenderingContext2D,
    classId: ClassId,
    appearance: Appearance,
    x: number,
    y: number,
    direction = 0,
    action = 0,
    frame = 0,
    scale = 1,
  ) {
    const img = this.avatar(classId, appearance);
    if (!img) return;
    const w = appearance.body === 1 ? 30 : 32;
    ctx.drawImage(
      img,
      (Math.floor(frame) % 8) * 32,
      (action * 4 + direction) * 40,
      32,
      40,
      Math.round(x - (w / 2) * scale),
      Math.round(y - 38 * scale),
      w * scale,
      40 * scale,
    );
  }
}

export const art = new Art();
