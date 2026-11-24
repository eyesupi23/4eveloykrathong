/** One spark of a picture firework: where it ends up (relative to the burst centre) and its colour. */
export interface ShapePoint {
  dx: number;
  dy: number;
  color: string;
}

/**
 * Turn a small picture with a transparent background (the 4EVE logo, or a round 32×32 face) into firework points:
 * every solid pixel becomes one spark, keeping the picture's own colour. Runs once; the result is reused.
 */
export interface Shape {
  points: ShapePoint[];
  /** Longest side of the picture in sparks, used to draw every picture at the same size on screen. */
  side: number;
}

export async function loadShape(
  src: string,
  { maxSide = 64, skipWhite = false, circle = false } = {},
): Promise<Shape> {
  const img = new Image();
  img.src = src;
  await img.decode();

  const k = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight));
  const w = Math.max(1, Math.round(img.naturalWidth * k));
  const h = Math.max(1, Math.round(img.naturalHeight * k));
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
  ctx.drawImage(img, 0, 0, w, h);
  const d = ctx.getImageData(0, 0, w, h).data;

  const pts: ShapePoint[] = [];
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      if (d[i + 3] < 128) continue; // transparent background
      // Optional round cut, so a square photo still bursts as a circle
      if (circle && (x + 0.5 - w / 2) ** 2 + (y + 0.5 - h / 2) ** 2 > (Math.min(w, h) / 2) ** 2) continue;
      // For logos on a white background, white counts as empty too (not for photos: faces have white bits)
      if (skipWhite && d[i] > 225 && d[i + 1] > 225 && d[i + 2] > 225) continue;
      pts.push({ dx: x, dy: y, color: `rgb(${d[i]},${d[i + 1]},${d[i + 2]})` });
    }
  }
  const side = Math.max(w, h);
  if (!pts.length) return { points: pts, side };

  // Centre on the solid part only, so empty margins in the file don't shift the burst.
  const xs = pts.map((p) => p.dx);
  const ys = pts.map((p) => p.dy);
  const cx = (Math.min(...xs) + Math.max(...xs)) / 2;
  const cy = (Math.min(...ys) + Math.max(...ys)) / 2;
  return { points: pts.map((p) => ({ ...p, dx: p.dx - cx, dy: p.dy - cy })), side };
}
