'use client';

/**
 * Cloudinary's free tier rejects uploads over 10 MB, and a phone photo
 * routinely exceeds that — scripts/import-news-events.ts already hit this
 * and works around it server-side with sharp (resize to 2400px, re-encode
 * at quality 82). ImageUploader's files never touch our server — the
 * browser posts straight to Cloudinary — so the same fix has to run here,
 * on canvas, before the upload starts.
 */
const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

// Each pass is a little smaller/lower-quality than the last, in case one
// pass isn't enough for an unusually dense image (e.g. a scanned poster).
const PASSES: { maxDimension: number; quality: number }[] = [
  { maxDimension: 2400, quality: 0.82 },
  { maxDimension: 1800, quality: 0.72 },
  { maxDimension: 1400, quality: 0.62 },
];

async function drawToJpegBlob(
  bitmap: ImageBitmap,
  maxDimension: number,
  quality: number,
): Promise<Blob | null> {
  const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  ctx.drawImage(bitmap, 0, 0, width, height);

  return new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality));
}

/**
 * Resize + re-encode a file that's over Cloudinary's limit. Returns the
 * original file untouched if it's already small enough, isn't a raster
 * image (SVG has no pixels to resample; PDFs aren't handled here at all),
 * or if compression didn't actually help.
 */
export async function compressImageIfNeeded(file: File): Promise<File> {
  if (file.size <= MAX_UPLOAD_BYTES) return file;
  if (!file.type.startsWith('image/') || file.type === 'image/svg+xml') return file;

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    return file;
  }

  try {
    let best: Blob | null = null;
    for (const pass of PASSES) {
      const blob = await drawToJpegBlob(bitmap, pass.maxDimension, pass.quality);
      if (!blob) continue;
      best = blob;
      if (blob.size <= MAX_UPLOAD_BYTES) break;
    }

    if (!best || best.size >= file.size) return file;

    const newName = file.name.replace(/\.[^.]+$/, '') + '.jpg';
    return new File([best], newName, { type: 'image/jpeg' });
  } finally {
    bitmap.close?.();
  }
}
