/**
 * Crop an uploaded photo to a square, shrink it to 32×32 and slightly reduce the colours,
 * so it keeps a light pixel-art feel while staying recognisable on the krathong.
 */
export async function pixelateImage(file: File, size = 32): Promise<string> {
  if (!file.type.startsWith('image/')) throw new Error('ไฟล์นี้ไม่ใช่รูปภาพ');
  const bmp = await createImageBitmap(file);
  const side = Math.min(bmp.width, bmp.height);
  const sx = (bmp.width - side) / 2;
  const sy = (bmp.height - side) / 2;

  // Two-step downscale averages colours better than one big jump.
  const mid = document.createElement('canvas');
  mid.width = mid.height = size * 4;
  const mctx = mid.getContext('2d')!;
  mctx.imageSmoothingQuality = 'high';
  mctx.drawImage(bmp, sx, sy, side, side, 0, 0, mid.width, mid.height);
  bmp.close();

  const out = document.createElement('canvas');
  out.width = out.height = size;
  const ctx = out.getContext('2d')!;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(mid, 0, 0, size, size);

  const data = ctx.getImageData(0, 0, size, size);
  const d = data.data;
  for (let i = 0; i < d.length; i += 4) {
    // Gentle posterize (~16 levels per channel) instead of a harsh 6-level palette.
    for (let c = 0; c < 3; c++) d[i + c] = Math.min(255, Math.round(d[i + c] / 17) * 17);
    d[i + 3] = d[i + 3] < 128 ? 0 : 255;
  }
  ctx.putImageData(data, 0, 0);
  return out.toDataURL('image/png');
}
