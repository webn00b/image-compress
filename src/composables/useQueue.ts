import { ref, computed } from 'vue';
import type { FileEntry, Settings } from '../types';
import { getPool } from '../pipeline/pool';
import { detectDoubleJpegRisk } from '../pipeline/doubleJpeg';

const SUPPORTED_MIMES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/avif',
  'image/heic',
  'image/heif',
]);

function inferMime(file: File): string {
  if (file.type) return file.type;
  const name = file.name.toLowerCase();
  if (name.endsWith('.heic') || name.endsWith('.heif')) return 'image/heic';
  if (name.endsWith('.jpg') || name.endsWith('.jpeg')) return 'image/jpeg';
  if (name.endsWith('.png')) return 'image/png';
  if (name.endsWith('.webp')) return 'image/webp';
  if (name.endsWith('.avif')) return 'image/avif';
  return '';
}

async function readDimensions(file: File, mime: string): Promise<{ width: number; height: number } | null> {
  if (mime === 'image/heic' || mime === 'image/heif') return null;
  try {
    const bitmap = await createImageBitmap(file);
    const dims = { width: bitmap.width, height: bitmap.height };
    bitmap.close();
    return dims;
  } catch {
    return null;
  }
}

function makeId(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

const entries = ref<FileEntry[]>([]);

export function useQueue() {
  const totals = computed(() => {
    let original = 0;
    let compressed = 0;
    let done = 0;
    let processing = 0;
    let pending = 0;
    let errored = 0;
    for (const e of entries.value) {
      original += e.originalSize;
      if (e.result) compressed += e.result.byteLength;
      if (e.status === 'done') done++;
      else if (e.status === 'processing') processing++;
      else if (e.status === 'pending') pending++;
      else if (e.status === 'error') errored++;
    }
    return {
      original,
      compressed,
      saved: original - compressed,
      pct: original > 0 ? (1 - compressed / original) * 100 : 0,
      done,
      processing,
      pending,
      errored,
      total: entries.value.length,
    };
  });

  const overallProgress = computed(() => {
    if (entries.value.length === 0) return 0;
    const sum = entries.value.reduce((acc, e) => acc + (e.status === 'done' ? 1 : e.progress), 0);
    return sum / entries.value.length;
  });

  const add = async (files: FileList | File[]): Promise<void> => {
    const fileArr = Array.from(files);
    const newEntries: FileEntry[] = [];
    for (const file of fileArr) {
      const mime = inferMime(file);
      if (!SUPPORTED_MIMES.has(mime)) continue;
      const entry: FileEntry = {
        id: makeId(),
        file,
        name: file.name,
        mime,
        originalSize: file.size,
        originalWidth: null,
        originalHeight: null,
        status: 'pending',
        progress: 0,
        stage: 'Queued',
        result: null,
        resultUrl: null,
        thumbnailUrl: URL.createObjectURL(file),
        error: null,
        warnings: [],
        settingsUsed: null,
        durationMs: null,
      };
      newEntries.push(entry);
    }
    entries.value.push(...newEntries);
    for (const entry of newEntries) {
      readDimensions(entry.file, entry.mime).then((dims) => {
        if (dims) {
          entry.originalWidth = dims.width;
          entry.originalHeight = dims.height;
        }
      });
    }
  };

  const remove = (id: string): void => {
    const idx = entries.value.findIndex((e) => e.id === id);
    if (idx === -1) return;
    const e = entries.value[idx];
    if (e.thumbnailUrl) URL.revokeObjectURL(e.thumbnailUrl);
    if (e.resultUrl) URL.revokeObjectURL(e.resultUrl);
    entries.value.splice(idx, 1);
  };

  const clear = (): void => {
    for (const e of entries.value) {
      if (e.thumbnailUrl) URL.revokeObjectURL(e.thumbnailUrl);
      if (e.resultUrl) URL.revokeObjectURL(e.resultUrl);
    }
    entries.value = [];
  };

  const processOne = async (entry: FileEntry, settings: Settings): Promise<void> => {
    entry.status = 'processing';
    entry.progress = 0;
    entry.error = null;
    entry.stage = 'Reading';
    entry.warnings = [];
    entry.settingsUsed = { ...settings };
    entry.durationMs = null;
    const dblWarn = detectDoubleJpegRisk(entry.mime, settings);
    if (dblWarn) entry.warnings.push(dblWarn);

    const startedAt = performance.now();
    try {
      const buffer = await entry.file.arrayBuffer();
      const pool = getPool();
      const result = await pool.run(
        { buffer, mime: entry.mime, settings: { ...settings } },
        (progress, stage) => {
          entry.progress = progress;
          entry.stage = stage;
        },
      );
      const blob = new Blob([result.buffer], { type: result.outputMime });
      if (entry.resultUrl) URL.revokeObjectURL(entry.resultUrl);
      entry.result = {
        blob,
        width: result.width,
        height: result.height,
        byteLength: blob.size,
        format: result.format,
        quality: result.quality,
        pngColors: result.pngColors,
      };
      entry.resultUrl = URL.createObjectURL(blob);
      entry.status = 'done';
      entry.progress = 1;
      entry.stage = 'Done';
      entry.durationMs = performance.now() - startedAt;
    } catch (err) {
      entry.status = 'error';
      entry.error = err instanceof Error ? err.message : String(err);
      entry.stage = 'Error';
      entry.durationMs = performance.now() - startedAt;
    }
  };

  const processAll = async (settings: Settings): Promise<void> => {
    const pending = entries.value.filter((e) => e.status === 'pending' || e.status === 'error');
    await Promise.all(pending.map((e) => processOne(e, settings)));
  };

  const reprocess = async (id: string, settings: Settings): Promise<void> => {
    const entry = entries.value.find((e) => e.id === id);
    if (!entry) return;
    if (entry.resultUrl) {
      URL.revokeObjectURL(entry.resultUrl);
      entry.resultUrl = null;
    }
    entry.result = null;
    entry.status = 'pending';
    await processOne(entry, settings);
  };

  return { entries, totals, overallProgress, add, remove, clear, processAll, reprocess };
}
