import JSZip from 'jszip';
import { compressedFileName } from '../pipeline/format';
import type { FileEntry } from '../types';

export async function buildZip(entries: FileEntry[], onProgress?: (pct: number) => void): Promise<Blob> {
  const zip = new JSZip();
  for (const entry of entries) {
    if (!entry.result) continue;
    const name = compressedFileName(entry.name, entry.result.format);
    zip.file(name, entry.result.blob);
  }
  return zip.generateAsync({ type: 'blob', compression: 'STORE' }, (meta) => {
    onProgress?.(meta.percent);
  });
}
