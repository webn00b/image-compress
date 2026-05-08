import type { OutputFormat, PngColors } from '../types';
import { encodeImageData } from './encode';

export interface TargetSizeResult {
  buffer: ArrayBuffer;
  quality: number;
}

export async function searchQualityForTargetSize(
  data: ImageData,
  format: OutputFormat,
  targetBytes: number,
  pngColors: PngColors,
  onIteration?: (i: number, total: number) => void,
): Promise<TargetSizeResult> {
  if (format === 'png') {
    const buffer = await encodeImageData(data, format, { quality: 100, pngColors });
    return { buffer, quality: 100 };
  }

  let lo = 5;
  let hi = 95;
  const maxIters = 8;
  let best: TargetSizeResult | null = null;
  let lastBelowMax: TargetSizeResult | null = null;

  for (let i = 0; i < maxIters; i++) {
    if (lo > hi) break;
    const q = Math.round((lo + hi) / 2);
    const buffer = await encodeImageData(data, format, { quality: q });
    onIteration?.(i + 1, maxIters);

    if (buffer.byteLength <= targetBytes) {
      if (!best || q > best.quality) best = { buffer, quality: q };
      lo = q + 1;
    } else {
      lastBelowMax = { buffer, quality: q };
      hi = q - 1;
    }
  }

  if (best) return best;
  if (lastBelowMax) return lastBelowMax;
  const fallback = await encodeImageData(data, format, { quality: 5 });
  return { buffer: fallback, quality: 5 };
}
