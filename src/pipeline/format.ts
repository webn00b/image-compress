export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export function formatPercent(saved: number, original: number): string {
  if (original <= 0) return '0%';
  const pct = (saved / original) * 100;
  return `${pct >= 0 ? '−' : '+'}${Math.abs(pct).toFixed(1)}%`;
}

export function mimeForFormat(format: 'jpeg' | 'webp' | 'avif' | 'png'): string {
  return `image/${format}`;
}

export function extForFormat(format: 'jpeg' | 'webp' | 'avif' | 'png'): string {
  return format === 'jpeg' ? 'jpg' : format;
}

export function compressedFileName(original: string, format: 'jpeg' | 'webp' | 'avif' | 'png'): string {
  const dot = original.lastIndexOf('.');
  const base = dot > 0 ? original.slice(0, dot) : original;
  return `${base}_compressed.${extForFormat(format)}`;
}
