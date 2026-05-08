/// <reference lib="webworker" />
import type { OutputFormat, PngColors } from '../types';

export interface EncodeOptions {
  quality: number;
  pngColors?: PngColors;
}

export async function encodeImageData(
  data: ImageData,
  format: OutputFormat,
  opts: EncodeOptions,
): Promise<ArrayBuffer> {
  switch (format) {
    case 'jpeg': {
      const mod = await import('@jsquash/jpeg/encode');
      return mod.default(data, { quality: opts.quality });
    }
    case 'webp': {
      const mod = await import('@jsquash/webp/encode');
      return mod.default(data, { quality: opts.quality });
    }
    case 'avif': {
      const mod = await import('@jsquash/avif/encode');
      return mod.default(data, { quality: opts.quality, speed: 6 });
    }
    case 'png': {
      const colors = opts.pngColors ?? 0;
      if (colors > 0) {
        const UPNG = (await import('upng-js')).default;
        return UPNG.encode([data.data.buffer as ArrayBuffer], data.width, data.height, colors);
      }
      const mod = await import('@jsquash/png/encode');
      return mod.default(data);
    }
  }
}
