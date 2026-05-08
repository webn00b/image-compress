/// <reference lib="webworker" />

export async function decodeToImageData(buf: ArrayBuffer, mime: string): Promise<ImageData> {
  const isHeic = mime === 'image/heic' || mime === 'image/heif' || mime === '';
  if (isHeic) {
    try {
      return await decodeNative(buf, mime || 'image/heic');
    } catch {
      return await decodeHeic(buf);
    }
  }

  if (mime === 'image/avif') {
    try {
      return await decodeNative(buf, mime);
    } catch {
      const mod = await import('@jsquash/avif/decode');
      return await mod.default(buf);
    }
  }

  return await decodeNative(buf, mime);
}

async function decodeNative(buf: ArrayBuffer, mime: string): Promise<ImageData> {
  const blob = new Blob([buf], { type: mime });
  const bitmap = await createImageBitmap(blob);
  const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('Failed to acquire 2D context');
  ctx.drawImage(bitmap, 0, 0);
  bitmap.close();
  return ctx.getImageData(0, 0, canvas.width, canvas.height);
}

async function decodeHeic(buf: ArrayBuffer): Promise<ImageData> {
  const mod: any = await import('libheif-js');
  const libheif = mod.default ? mod.default() : mod();
  const decoder = new libheif.HeifDecoder();
  const images = decoder.decode(buf);
  if (!images || images.length === 0) throw new Error('HEIC: no images decoded');
  const first = images[0];
  const w = first.get_width();
  const h = first.get_height();
  const imageData = new ImageData(w, h);
  await new Promise<void>((resolve, reject) => {
    first.display(imageData, (data: ImageData | null) => {
      if (!data) reject(new Error('HEIC: display failed'));
      else resolve();
    });
  });
  return imageData;
}
