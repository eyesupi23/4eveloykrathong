import type { KrathongConfig } from '../types';
import { BASES, FLOWERS } from './data';
import { drawDecoration } from './decorations';

/** Logical pixel size of a krathong sprite; scaled up with image-rendering: pixelated. */
export const SPRITE_W = 48;
export const SPRITE_H = 46;

/** Sprites are rendered at this multiple so an uploaded photo can show more detail than the pixel art around it. */
const RENDER_SCALE = 6; // photo area = 16 × 6 = 96 px, matching PHOTO_SIZE in pixelate.ts

type Frames = [string, string];

function hash(x: number, y: number): number {
  let h = Math.imul(x, 374761393) + Math.imul(y, 668265263);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
}

/** Nearest bloom centre on a staggered grid (rows 3 px apart, blooms 4 px apart, alternate rows shifted 2 px). */
function nearestFlower(x: number, y: number, top: number): { d: number; id: number } {
  let best = { d: Infinity, id: 0 };
  const r0 = Math.round((y - top) / 3);
  for (let r = r0 - 1; r <= r0 + 1; r++) {
    const fy = top + 1 + r * 3;
    const shift = (((r % 2) + 2) % 2) * 2;
    const k0 = Math.round((x - shift) / 4);
    for (let k = k0 - 1; k <= k0 + 1; k++) {
      const d = Math.abs(x - (shift + k * 4)) + Math.abs(y - fy);
      if (d < best.d) best = { d, id: r * 31 + k };
    }
  }
  return best;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function draw(ctx: CanvasRenderingContext2D, cfg: KrathongConfig, frame: 0 | 1, img: HTMLImageElement | null) {
  const base = BASES[cfg.base];
  const fl = FLOWERS[cfg.flower];
  ctx.setTransform(RENDER_SCALE, 0, 0, RENDER_SCALE, 0, 0);
  ctx.clearRect(0, 0, SPRITE_W, SPRITE_H);
  const px = (x: number, y: number, c: string) => {
    ctx.fillStyle = c;
    ctx.fillRect(x, y, 1, 1);
  };
  const rect = (x: number, y: number, w: number, h: number, c: string) => {
    ctx.fillStyle = c;
    ctx.fillRect(x, y, w, h);
  };

  // Picture on a stick (behind the flowers)
  if (img) {
    rect(12, 17, 2, 13, '#6b4423');
    rect(13, 17, 1, 13, '#8a5a32');
    rect(4, 0, 18, 18, '#ffd166');
    rect(4, 17, 18, 1, '#c98a1e');
    rect(21, 0, 1, 18, '#c98a1e');
    // New uploads are 96 px and fill the area 1:1. Older 32 px ones are scaled up blocky, not blurry.
    ctx.imageSmoothingEnabled = img.naturalWidth >= 16 * RENDER_SCALE;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, 5, 1, 16, 16);
    ctx.imageSmoothingEnabled = false;
  }

  // Incense sticks with glowing tips and drifting smoke
  for (const x of [35, 37, 39]) {
    rect(x, 16, 1, 12, '#8a4b2a');
    px(x, 15, '#ff4d3d');
  }
  const smoke = frame === 0
    ? [[36, 12], [35, 9], [38, 11], [39, 7]]
    : [[35, 12], [36, 9], [39, 11], [38, 7]];
  smoke.forEach(([x, y], i) => px(x, y, i % 2 ? '#6a70a8' : '#9298c8'));

  // Candle and flame
  rect(29, 18, 3, 10, '#f4e9c8');
  rect(31, 18, 1, 10, '#d8c89a');
  px(30, 17, '#3a2a1a');
  const flame = frame === 0
    ? [[29, 16, '#ff9b2f'], [30, 16, '#ffbf3c'], [31, 16, '#ff9b2f'], [30, 15, '#ffe066'], [29, 15, '#ff9b2f'], [30, 14, '#ffe066'], [30, 13, '#fff6dc']]
    : [[29, 16, '#ff9b2f'], [30, 16, '#ffbf3c'], [31, 16, '#ff9b2f'], [30, 15, '#ffe066'], [31, 15, '#ff9b2f'], [31, 14, '#ffe066'], [31, 13, '#fff6dc']];
  flame.forEach(([x, y, c]) => px(x as number, y as number, c as string));

  // Flower dome
  const cx = 24;
  const cy = 34;
  const rx = 16.5;
  const ry = 10;
  const inside = (x: number, y: number) => y <= cy && ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1;
  for (let y = cy - ry; y <= cy; y++) {
    for (let x = cx - Math.ceil(rx); x <= cx + Math.ceil(rx); x++) {
      if (!inside(x, y)) continue;
      const edge = !inside(x - 1, y) || !inside(x + 1, y) || !inside(x, y - 1);
      let c: string;
      if (edge) c = fl.dark;
      else {
        // Packed little flowers instead of random grain: each is a plus-shaped bloom
        // (centre + 4 petals) on a staggered grid, with the deeper colour showing between them.
        const f = nearestFlower(x, y, cy - ry);
        if (f.d === 0) c = fl.center;
        else if (f.d === 1) c = f.id % 3 === 0 ? fl.c : fl.a;
        else c = fl.b;
      }
      px(x, y, c);
    }
  }

  // Ornament sitting on the dome, between the picture stick and the candle
  drawDecoration(ctx, cfg.flower, 15, 18);

  // Folded-leaf points (บายศรี) around the rim
  for (let cxp = 5; cxp <= 43; cxp += 6) {
    for (let row = 0; row < 4; row++) {
      const y = 32 + row;
      for (let dx = -row; dx <= row; dx++) {
        px(cxp + dx, y, dx === -row ? base.dark : dx === row ? base.light : base.rim);
      }
    }
  }

  // Body: a deep, straight-sided drum (like a slice of banana trunk) instead of a shallow dish,
  // wrapped in two rows of folded-leaf petals (กลีบใบตอง) pointing down.
  const rows: [number, number][] = [
    [3, 44], [4, 43], [5, 42], [5, 42], [5, 42], [5, 42], [5, 42], [5, 42], [6, 41], [8, 39],
  ];
  rows.forEach(([x0, x1], i) => {
    const y = 36 + i;
    const last = i === rows.length - 1;
    for (let x = x0; x <= x1; x++) {
      let c = base.body;
      if (i === 0) c = base.light; // rim
      else if (x === x0 || x === x1 || last) c = base.dark;
      else if (x === x0 + 1) c = base.fold; // rounded shading on the left side
      else if (base.pattern === 'fold' && i >= 1 && i <= 8) {
        const row = i <= 4 ? 0 : 1;
        const ly = i - (row ? 5 : 1); // 0..3 down each petal
        const k = (((x - 2 - row * 3) % 6) + 6) % 6; // position within a 6-px petal
        const dx = Math.abs(k - 3);
        const half = 3 - ly;
        if (dx === half) c = base.dark; // petal outline
        else if (dx < half) c = ly === 0 ? base.light : base.rim; // petal face
        else c = base.fold; // shadow between petals
      } else if (base.pattern === 'dots' && hash(x, y) > 0.8) c = base.fold;
      else if (base.pattern === 'dots' && (i === 4 || i === 5)) c = base.light; // toasted band
      px(x, y, c);
    }
  });
}

const cache = new Map<string, Promise<Frames>>();

/** Render both animation frames of a krathong as PNG data URLs (cached). */
export function krathongFrames(cfg: KrathongConfig): Promise<Frames> {
  const key = `${cfg.base}|${cfg.flower}|${cfg.image ?? ''}`;
  const hit = cache.get(key);
  if (hit) return hit;

  const job = (async () => {
    const img = cfg.image ? await loadImage(cfg.image) : null;
    const canvas = document.createElement('canvas');
    canvas.width = SPRITE_W * RENDER_SCALE;
    canvas.height = SPRITE_H * RENDER_SCALE;
    const ctx = canvas.getContext('2d')!;
    draw(ctx, cfg, 0, img);
    const a = canvas.toDataURL();
    draw(ctx, cfg, 1, img);
    const b = canvas.toDataURL();
    return [a, b] as Frames;
  })();
  cache.set(key, job);
  return job;
}
