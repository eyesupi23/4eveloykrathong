/** Upload size in pixels. Must match the picture area in sprite.ts (16 logical px × RENDER_SCALE). */
export const PHOTO_SIZE = 96;

/** Must stay under the database limit on the image column (20000 characters). */
const MAX_CHARS = 19000;

/**
 * Crop an uploaded photo to a square and shrink it to PHOTO_SIZE, sharp enough to recognise faces
 * on the krathong. Saved as JPEG so it stays small (a PNG this size would be too big for the database).
 */
export async function pixelateImage(file: File, size = PHOTO_SIZE): Promise<string> {
  if (!file.type.startsWith('image/')) throw new Error('ไฟล์นี้ไม่ใช่รูปภาพ');
  const bmp = await createImageBitmap(file);
  const side = Math.min(bmp.width, bmp.height);
  const sx = (bmp.width - side) / 2;
  const sy = (bmp.height - side) / 2;

  // Two-step downscale averages colours better than one big jump.
  const mid = document.createElement('canvas');
  mid.width = mid.height = size * 2;
  const mctx = mid.getContext('2d')!;
  mctx.imageSmoothingQuality = 'high';
  mctx.drawImage(bmp, sx, sy, side, side, 0, 0, mid.width, mid.height);
  bmp.close();

  const out = document.createElement('canvas');
  out.width = out.height = size;
  const ctx = out.getContext('2d')!;
  // JPEG has no transparency: put see-through parts (e.g. PNG stickers) on white instead of black.
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, size, size);
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(mid, 0, 0, size, size);

  // Highest quality that fits the database limit.
  for (const q of [0.88, 0.8, 0.7, 0.6, 0.5]) {
    const url = out.toDataURL('image/jpeg', q);
    if (url.length <= MAX_CHARS) return url;
  }
  return out.toDataURL('image/jpeg', 0.4);
}
