/** One spark of a picture firework: where it ends up (relative to the burst centre) and its colour. */
export interface ShapePoint {
  dx: number;
  dy: number;
  color: string;
}

/**
 * Turn a small picture with a transparent background (e.g. the 32×32 4EVE logo) into firework points:
 * every solid pixel becomes one spark, keeping the picture's own colour. Runs once; the result is reused.
 */
export async function loadShape(src: string, maxSide = 40): Promise<ShapePoint[]> {
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
      if (d[i] > 225 && d[i + 1] > 225 && d[i + 2] > 225) continue; // white background counts as empty too
      pts.push({ dx: x, dy: y, color: `rgb(${d[i]},${d[i + 1]},${d[i + 2]})` });
    }
  }
  if (!pts.length) return pts;

  // Centre on the solid part only, so empty margins in the file don't shift the burst.
  const xs = pts.map((p) => p.dx);
  const ys = pts.map((p) => p.dy);
  const cx = (Math.min(...xs) + Math.max(...xs)) / 2;
  const cy = (Math.min(...ys) + Math.max(...ys)) / 2;
  return pts.map((p) => ({ ...p, dx: p.dx - cx, dy: p.dy - cy }));
}
