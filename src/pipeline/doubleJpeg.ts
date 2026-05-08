import type { Settings } from '../types';

export function detectDoubleJpegRisk(sourceMime: string, settings: Settings): string | null {
  if (sourceMime !== 'image/jpeg') return null;
  if (settings.format !== 'jpeg') return null;
  if (settings.quality >= 95) return null;
  return 'Source is already JPEG. Re-encoding to JPEG with quality below 95 may introduce visible artifacts. Consider WebP or higher quality.';
}
