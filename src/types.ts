export type OutputFormat = 'jpeg' | 'webp' | 'avif' | 'png';

export type PngColors = 0 | 16 | 32 | 64 | 128 | 256;

export type ResizeMode = 'maxSide' | 'scale';

export interface Settings {
  format: OutputFormat;
  quality: number;
  resizeEnabled: boolean;
  resizeMode: ResizeMode;
  maxSide: number;
  scaleFactor: number;
  targetSizeEnabled: boolean;
  targetSizeKb: number;
  pngColors: PngColors;
}

export interface PresetDef {
  id: string;
  label: string;
  description: string;
  settings: Partial<Settings>;
}

export type FileStatus = 'pending' | 'processing' | 'done' | 'error';

export interface CompressionResult {
  blob: Blob;
  width: number;
  height: number;
  byteLength: number;
  format: OutputFormat;
  quality: number;
  pngColors?: PngColors;
}

export interface FileEntry {
  id: string;
  file: File;
  name: string;
  mime: string;
  originalSize: number;
  originalWidth: number | null;
  originalHeight: number | null;
  status: FileStatus;
  progress: number;
  stage: string;
  result: CompressionResult | null;
  resultUrl: string | null;
  thumbnailUrl: string | null;
  error: string | null;
  warnings: string[];
  settingsUsed: Settings | null;
  durationMs: number | null;
}

export interface ProcessTaskInput {
  buffer: ArrayBuffer;
  mime: string;
  settings: Settings;
}

export interface ProcessTaskOutput {
  buffer: ArrayBuffer;
  width: number;
  height: number;
  format: OutputFormat;
  quality: number;
  outputMime: string;
  pngColors?: PngColors;
}
