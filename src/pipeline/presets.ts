import type { PresetDef } from '../types';

export const PRESETS: PresetDef[] = [
  {
    id: 'web',
    label: 'Web',
    description: '1920px · WebP 85',
    settings: { format: 'webp', quality: 85, resizeEnabled: true, maxSide: 1920, targetSizeEnabled: false },
  },
  {
    id: 'avatar',
    label: 'Avatar',
    description: '400px · WebP 80',
    settings: { format: 'webp', quality: 80, resizeEnabled: true, maxSide: 400, targetSizeEnabled: false },
  },
  {
    id: 'thumbnail',
    label: 'Thumbnail',
    description: '200px · WebP 75',
    settings: { format: 'webp', quality: 75, resizeEnabled: true, maxSide: 200, targetSizeEnabled: false },
  },
  {
    id: 'max',
    label: 'Max quality',
    description: 'No resize · WebP 95',
    settings: { format: 'webp', quality: 95, resizeEnabled: false, targetSizeEnabled: false },
  },
];
