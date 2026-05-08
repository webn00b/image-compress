import { reactive, watch } from 'vue';
import type { Settings } from '../types';
import { PRESETS } from '../pipeline/presets';

const LOSSLESS_FORMATS = new Set<Settings['format']>(['png']);

const STORAGE_KEY = 'imgcompress.settings';

const DEFAULT_SETTINGS: Settings = {
  format: 'webp',
  quality: 85,
  resizeEnabled: true,
  resizeMode: 'scale',
  maxSide: 1920,
  scaleFactor: 2,
  targetSizeEnabled: false,
  targetSizeKb: 500,
  pngColors: 0,
};

function loadInitial(): Settings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<Settings>;
      return { ...DEFAULT_SETTINGS, ...parsed };
    }
  } catch {
    /* ignore */
  }
  return { ...DEFAULT_SETTINGS };
}

const settings = reactive<Settings>(loadInitial());

watch(
  () => settings.format,
  (f) => {
    if (LOSSLESS_FORMATS.has(f) && settings.targetSizeEnabled) {
      settings.targetSizeEnabled = false;
    }
  },
);

watch(
  settings,
  (s) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
    } catch {
      /* ignore */
    }
  },
  { deep: true },
);

export function useSettings() {
  const applyPreset = (id: string) => {
    const preset = PRESETS.find((p) => p.id === id);
    if (!preset) return;
    Object.assign(settings, preset.settings);
  };

  const reset = () => {
    Object.assign(settings, DEFAULT_SETTINGS);
  };

  return { settings, applyPreset, reset, presets: PRESETS };
}

export function isLossless(format: Settings['format']): boolean {
  return format === 'png';
}
