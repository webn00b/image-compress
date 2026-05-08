<script setup lang="ts">
import { computed } from 'vue';
import { useSettings, isLossless } from '../composables/useSettings';
import InfoTooltip from './InfoTooltip.vue';

const { settings } = useSettings();

const formats = [
  { value: 'webp', label: 'WebP', tip: 'Modern format with great quality-to-size ratio. Universally supported in browsers since 2020.' },
  { value: 'jpeg', label: 'JPEG', tip: 'Classic photo format. Lossy, no transparency. Best for photographic content when compatibility matters.' },
  { value: 'avif', label: 'AVIF', tip: 'Newest format, ~30% smaller than WebP at the same quality. Slower to encode (runs in worker). Excellent browser support in 2026.' },
  { value: 'png', label: 'PNG', tip: 'Lossless. Preserves transparency. Larger files. Quality slider has no effect.' },
] as const;

const qualityVisible = computed(() => !isLossless(settings.format));
const targetSizeAvailable = computed(() => !isLossless(settings.format));
const pngColorOptions = [
  { value: 0, label: 'Lossless' },
  { value: 256, label: '256' },
  { value: 128, label: '128' },
  { value: 64, label: '64' },
  { value: 32, label: '32' },
  { value: 16, label: '16' },
] as const;

const scaleFactors = [1.5, 2, 3, 4, 6, 8, 12, 16] as const;
</script>

<template>
  <div class="panel">
    <div class="row">
      <label>
        Format
        <InfoTooltip text="Output file format. WebP is a strong default. AVIF gives the smallest files but encodes slower." />
      </label>
      <div class="format-toggle">
        <button
          v-for="f in formats"
          :key="f.value"
          type="button"
          class="fbtn"
          :class="{ active: settings.format === f.value }"
          :title="f.tip"
          @click="settings.format = f.value"
        >
          {{ f.label }}
        </button>
      </div>
    </div>

    <div v-if="qualityVisible" class="row">
      <label>
        Quality
        <span class="value">{{ settings.quality }}</span>
        <InfoTooltip text="Lossy compression strength. 100 = best quality (largest), 0 = strongest compression (worst quality). Sweet spot for WebP/JPEG: 75–90." />
      </label>
      <input v-model.number="settings.quality" type="range" min="1" max="100" step="1" />
    </div>

    <div v-else class="row">
      <label>
        Colors
        <span class="value">
          {{ settings.pngColors === 0 ? 'Lossless' : settings.pngColors }}
        </span>
        <InfoTooltip text="PNG palette quantization. Lossless = full color, no loss. Pick a number to reduce to that many colors (lossy palette PNG, often 3–10× smaller). Great for screenshots, UI, and graphics." />
      </label>
      <div class="png-colors">
        <button
          v-for="opt in pngColorOptions"
          :key="opt.value"
          type="button"
          class="cbtn"
          :class="{ active: settings.pngColors === opt.value }"
          @click="settings.pngColors = opt.value"
        >
          {{ opt.label }}
        </button>
      </div>
      <p v-if="settings.pngColors > 0" class="row-note">
        Lossy: image will be quantized to {{ settings.pngColors }} colors. Best for graphics with limited palettes.
      </p>
    </div>

    <div class="row">
      <div class="row-head">
        <label>
          Resize
          <InfoTooltip text="Downscale the image. Aspect ratio is preserved. Uses Lanczos filtering (pica) for sharp downscaling. Choose between fixed max long-side or relative scale factor." />
        </label>
        <label class="toggle">
          <input v-model="settings.resizeEnabled" type="checkbox" />
          <span>{{ settings.resizeEnabled ? 'On' : 'Off' }}</span>
        </label>
      </div>

      <div v-if="settings.resizeEnabled" class="mode-toggle">
        <button
          type="button"
          class="mbtn"
          :class="{ active: settings.resizeMode === 'maxSide' }"
          @click="settings.resizeMode = 'maxSide'"
        >
          Max long side
        </button>
        <button
          type="button"
          class="mbtn"
          :class="{ active: settings.resizeMode === 'scale' }"
          @click="settings.resizeMode = 'scale'"
        >
          Scale down
        </button>
      </div>

      <div
        v-if="settings.resizeEnabled && settings.resizeMode === 'maxSide'"
        class="resize-input"
      >
        <input
          v-model.number="settings.maxSide"
          type="number"
          min="16"
          max="20000"
          step="1"
        />
        <span class="suffix">px (longest side)</span>
      </div>

      <div
        v-else-if="settings.resizeEnabled && settings.resizeMode === 'scale'"
        class="scale-grid"
      >
        <button
          v-for="f in scaleFactors"
          :key="f"
          type="button"
          class="cbtn"
          :class="{ active: settings.scaleFactor === f }"
          @click="settings.scaleFactor = f"
        >
          ×{{ f }}
        </button>
      </div>

      <p
        v-if="settings.resizeEnabled && settings.resizeMode === 'scale'"
        class="row-note quiet"
      >
        Each image is divided by ×{{ settings.scaleFactor }} on both sides
        (e.g. 4000×3000 → {{ Math.round(4000 / settings.scaleFactor) }}×{{ Math.round(3000 / settings.scaleFactor) }}).
      </p>
    </div>

    <div class="row" :class="{ unavailable: !targetSizeAvailable }">
      <div class="row-head">
        <label>
          Target file size
          <InfoTooltip text="Optional. Binary-search the quality value to land at or under this size. Up to 8 encoding attempts per image — slower than fixed quality." />
        </label>
        <label class="toggle" :class="{ disabled: !targetSizeAvailable }">
          <input v-model="settings.targetSizeEnabled" type="checkbox" :disabled="!targetSizeAvailable" />
          <span v-if="targetSizeAvailable">{{ settings.targetSizeEnabled ? 'On' : 'Off' }}</span>
          <span v-else class="na">N/A</span>
        </label>
      </div>
      <div
        v-if="targetSizeAvailable"
        class="resize-input"
        :class="{ disabled: !settings.targetSizeEnabled }"
      >
        <input
          v-model.number="settings.targetSizeKb"
          type="number"
          min="5"
          max="50000"
          step="10"
          :disabled="!settings.targetSizeEnabled"
        />
        <span class="suffix">KB</span>
      </div>
      <p v-else class="row-note">PNG is lossless — file size cannot be tuned via quality. Switch to WebP, JPEG or AVIF to use this option.</p>
    </div>

    <p class="meta-note">Metadata (EXIF, GPS, etc.) is removed during compression.</p>
  </div>
</template>

<style scoped>
.panel {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}
.row {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}
.row label {
  font-size: 0.85rem;
  color: var(--c-text-2);
  font-weight: 500;
  display: flex;
  align-items: center;
}
.row .value {
  margin-left: auto;
  color: var(--c-text);
  font-variant-numeric: tabular-nums;
  font-weight: 600;
}
.row-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.toggle {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  cursor: pointer;
  color: var(--c-text);
  font-size: 0.85rem;
}
.toggle input {
  accent-color: var(--c-accent);
}
.format-toggle {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 0.3rem;
}
.png-colors {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 0.3rem;
}
.mode-toggle {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 0.3rem;
}
.mbtn {
  padding: 0.4rem 0.5rem;
  border-radius: 6px;
  border: 1px solid var(--c-border);
  background: var(--c-surface);
  color: var(--c-text);
  cursor: pointer;
  font-size: 0.82rem;
  font-weight: 500;
}
.mbtn.active {
  background: var(--c-accent-bg);
  border-color: var(--c-accent);
  color: var(--c-accent);
}
.scale-grid {
  display: grid;
  grid-template-columns: repeat(8, 1fr);
  gap: 0.3rem;
}
.row-note.quiet {
  background: transparent;
  border: none;
  padding: 0;
  color: var(--c-text-3);
}
@media (max-width: 540px) {
  .scale-grid {
    grid-template-columns: repeat(4, 1fr);
  }
}
.cbtn {
  padding: 0.4rem 0.3rem;
  border-radius: 6px;
  border: 1px solid var(--c-border);
  background: var(--c-surface);
  color: var(--c-text);
  cursor: pointer;
  font-size: 0.8rem;
  font-weight: 500;
  font-variant-numeric: tabular-nums;
}
.cbtn.active {
  background: var(--c-accent);
  border-color: var(--c-accent);
  color: white;
}
@media (max-width: 480px) {
  .png-colors {
    grid-template-columns: repeat(3, 1fr);
  }
}
.fbtn {
  padding: 0.45rem 0.5rem;
  border-radius: 7px;
  border: 1px solid var(--c-border);
  background: var(--c-surface);
  color: var(--c-text);
  cursor: pointer;
  font-size: 0.85rem;
  font-weight: 500;
}
.fbtn.active {
  background: var(--c-accent);
  border-color: var(--c-accent);
  color: white;
}
input[type='range'] {
  width: 100%;
  accent-color: var(--c-accent);
}
.resize-input {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}
.resize-input.disabled {
  opacity: 0.55;
}
input[type='number'] {
  width: 100px;
  padding: 0.35rem 0.5rem;
  border-radius: 6px;
  border: 1px solid var(--c-border);
  background: var(--c-surface);
  color: var(--c-text);
  font-size: 0.9rem;
}
input[type='number']:focus {
  outline: none;
  border-color: var(--c-accent);
}
.suffix {
  font-size: 0.85rem;
  color: var(--c-text-2);
}
.meta-note {
  margin: 0;
  font-size: 0.78rem;
  color: var(--c-text-3);
}
.row.unavailable {
  opacity: 0.85;
}
.toggle.disabled {
  cursor: not-allowed;
  opacity: 0.6;
}
.na {
  font-size: 0.72rem;
  color: var(--c-text-3);
  letter-spacing: 0.04em;
  text-transform: uppercase;
}
.row-note {
  margin: 0.15rem 0 0;
  font-size: 0.75rem;
  color: var(--c-text-3);
  line-height: 1.4;
  padding: 0.4rem 0.55rem;
  border-radius: 6px;
  background: var(--c-surface-2);
  border-left: 3px solid var(--c-border);
}
</style>
