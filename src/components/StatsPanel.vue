<script setup lang="ts">
import { computed } from 'vue';
import type { FileEntry } from '../types';
import { formatBytes } from '../pipeline/format';

const props = defineProps<{ entry: FileEntry }>();

const formatLabel = (f: string) => f.toUpperCase();

const sizeChange = computed(() => {
  if (!props.entry.result) return null;
  const before = props.entry.originalSize;
  const after = props.entry.result.byteLength;
  const delta = before - after;
  const pct = (delta / before) * 100;
  return {
    before,
    after,
    delta,
    pct,
    grew: delta < 0,
  };
});

const sourceFormat = computed(() => {
  const m = props.entry.mime;
  if (m === 'image/jpeg') return 'jpeg';
  if (m === 'image/png') return 'png';
  if (m === 'image/webp') return 'webp';
  if (m === 'image/avif') return 'avif';
  if (m === 'image/heic' || m === 'image/heif') return 'heic';
  return 'unknown';
});

const verdict = computed(() => {
  const c = sizeChange.value;
  if (!c) return null;
  if (c.pct >= 50) return { tone: 'great', label: 'Great compression', detail: '' };
  if (c.pct >= 20) return { tone: 'good', label: 'Good compression', detail: '' };
  if (c.pct >= 0) return { tone: 'ok', label: 'Slightly smaller', detail: '' };

  const src = sourceFormat.value;
  const out = props.entry.result?.format ?? '';
  let detail = '';

  if (src === 'png' && out === 'png') {
    if (props.entry.settingsUsed?.pngColors && props.entry.settingsUsed.pngColors > 0) {
      detail = `Even with palette quantization (${props.entry.settingsUsed.pngColors} colors), the source PNG is denser than the re-encode. The original was likely already a low-color palette PNG with stronger compression (zopfli). Try fewer colors or switch to lossy WebP/AVIF.`;
    } else {
      detail = 'Your PNG is likely already optimized (e.g. by oxipng/zopflipng). Re-encoding rarely improves a well-optimized lossless file. Try palette quantization (Colors → 256/128/64) for a lossy PNG, or lossy WebP/AVIF.';
    }
  } else if (src === 'png' && (out === 'webp' || out === 'avif' || out === 'jpeg')) {
    detail = 'PNG compresses non-photographic content (screenshots, UI, line-art) extremely well. Lossy formats can grow such files. Keep PNG output, or lower the quality below ~75 if you must use a lossy format.';
  } else if (src === 'jpeg' && out === 'jpeg') {
    detail = 'Quality is likely close to or above the source. Lower the quality slider, or switch to WebP/AVIF for better ratio.';
  } else if (src === 'webp' && out === 'webp') {
    detail = 'Source is already WebP. Re-encoding at similar quality cannot beat the original — try AVIF, or lower quality, or skip files already in your target format.';
  } else if (src === 'avif') {
    detail = 'AVIF is usually the most compact format. Re-encoding to anything else (or to AVIF at similar quality) tends to grow the file.';
  } else {
    detail = 'For this image the chosen format/quality could not improve on the original. Try a different format or lower quality.';
  }

  return { tone: 'bad', label: 'Output is larger than the original', detail };
});

const settingsUsed = computed(() => props.entry.settingsUsed);

const resizeApplied = computed(() => {
  if (!settingsUsed.value || !props.entry.result) return null;
  if (!settingsUsed.value.resizeEnabled) return 'off';
  if (settingsUsed.value.resizeMode === 'scale') {
    return settingsUsed.value.scaleFactor > 1 ? 'applied' : 'skipped';
  }
  const origW = props.entry.originalWidth ?? 0;
  const origH = props.entry.originalHeight ?? 0;
  const longest = Math.max(origW, origH);
  if (longest <= settingsUsed.value.maxSide) return 'skipped';
  return 'applied';
});

const targetSizeStatus = computed(() => {
  if (!settingsUsed.value || !props.entry.result) return null;
  if (!settingsUsed.value.targetSizeEnabled) return null;
  const targetBytes = settingsUsed.value.targetSizeKb * 1024;
  const hit = props.entry.result.byteLength <= targetBytes;
  return { targetBytes, hit };
});
</script>

<template>
  <div v-if="entry.result && entry.settingsUsed" class="stats">
    <div class="grid">
      <section class="col">
        <header class="col-head">
          <span class="dot in"></span>
          <h4>Settings used</h4>
        </header>
        <dl>
          <div class="row">
            <dt>Format</dt>
            <dd>
              <span class="badge">{{ formatLabel(entry.settingsUsed.format) }}</span>
            </dd>
          </div>
          <div v-if="entry.settingsUsed.format !== 'png'" class="row">
            <dt>Quality</dt>
            <dd>
              <span class="num">{{ entry.settingsUsed.quality }}</span>
              <span class="sub">/ 100</span>
            </dd>
          </div>
          <div v-else class="row">
            <dt>Colors</dt>
            <dd>
              <span v-if="entry.settingsUsed.pngColors === 0" class="num">Lossless</span>
              <template v-else>
                <span class="num">{{ entry.settingsUsed.pngColors }}</span>
                <span class="sub">colors (lossy)</span>
              </template>
            </dd>
          </div>
          <div class="row">
            <dt>Resize</dt>
            <dd v-if="!entry.settingsUsed.resizeEnabled" class="muted">Off</dd>
            <dd v-else-if="entry.settingsUsed.resizeMode === 'scale'">
              <span class="num">×{{ entry.settingsUsed.scaleFactor }}</span>
              <span class="sub">scale down</span>
            </dd>
            <dd v-else>
              <span class="num">{{ entry.settingsUsed.maxSide }}px</span>
              <span class="sub">long side</span>
            </dd>
          </div>
          <div class="row">
            <dt>Target size</dt>
            <dd v-if="!entry.settingsUsed.targetSizeEnabled" class="muted">Off</dd>
            <dd v-else>
              <span class="num">{{ entry.settingsUsed.targetSizeKb }} KB</span>
            </dd>
          </div>
        </dl>
      </section>

      <div class="arrow" aria-hidden="true">→</div>

      <section class="col">
        <header class="col-head">
          <span class="dot out" :class="`tone-${verdict?.tone}`"></span>
          <h4>Result</h4>
        </header>
        <dl>
          <div class="row">
            <dt>Format</dt>
            <dd>
              <span class="badge">{{ formatLabel(entry.result.format) }}</span>
            </dd>
          </div>
          <div v-if="entry.result.format !== 'png'" class="row">
            <dt>Quality</dt>
            <dd>
              <span class="num">{{ entry.result.quality }}</span>
              <span v-if="entry.settingsUsed.targetSizeEnabled && entry.result.quality !== entry.settingsUsed.quality" class="sub">
                (auto)
              </span>
            </dd>
          </div>
          <div v-else class="row">
            <dt>Colors</dt>
            <dd>
              <span v-if="!entry.result.pngColors" class="num">Lossless</span>
              <template v-else>
                <span class="num">{{ entry.result.pngColors }}</span>
                <span class="sub">palette</span>
              </template>
            </dd>
          </div>
          <div class="row">
            <dt>Pixels</dt>
            <dd>
              <span class="num">{{ entry.result.width }} × {{ entry.result.height }}</span>
              <span
                v-if="entry.originalWidth && (entry.result.width !== entry.originalWidth || entry.result.height !== entry.originalHeight)"
                class="sub"
              >
                from {{ entry.originalWidth }} × {{ entry.originalHeight }}
              </span>
              <span v-else-if="resizeApplied === 'skipped'" class="sub">resize skipped (already small enough)</span>
            </dd>
          </div>
          <div class="row">
            <dt>Size</dt>
            <dd>
              <span class="num">{{ formatBytes(entry.result.byteLength) }}</span>
              <span class="sub">from {{ formatBytes(entry.originalSize) }}</span>
            </dd>
          </div>
          <div v-if="targetSizeStatus" class="row">
            <dt>Target hit</dt>
            <dd>
              <span class="num" :class="{ ok: targetSizeStatus.hit, fail: !targetSizeStatus.hit }">
                {{ targetSizeStatus.hit ? 'Yes' : 'No' }}
              </span>
              <span class="sub">≤ {{ formatBytes(targetSizeStatus.targetBytes) }}</span>
            </dd>
          </div>
          <div v-if="entry.durationMs != null" class="row">
            <dt>Duration</dt>
            <dd>
              <span class="num">{{ (entry.durationMs / 1000).toFixed(2) }}s</span>
            </dd>
          </div>
        </dl>
      </section>
    </div>

    <footer v-if="verdict && sizeChange" class="verdict" :class="`tone-${verdict.tone}`">
      <div class="verdict-text">
        <span class="verdict-label">{{ verdict.label }}</span>
        <span v-if="!sizeChange.grew" class="verdict-numbers">
          Saved {{ formatBytes(sizeChange.delta) }} ({{ sizeChange.pct.toFixed(1) }}%)
        </span>
        <span v-else class="verdict-numbers">
          Grew by {{ formatBytes(-sizeChange.delta) }} ({{ Math.abs(sizeChange.pct).toFixed(1) }}%)
        </span>
      </div>
      <p v-if="verdict.detail" class="verdict-tip">{{ verdict.detail }}</p>
      <div class="bar">
        <div class="bar-fill" :style="{ width: `${Math.max(0, Math.min(100, sizeChange.pct))}%` }"></div>
      </div>
    </footer>
  </div>
</template>

<style scoped>
.stats {
  border: 1px solid var(--c-border);
  border-radius: 10px;
  background: linear-gradient(135deg, var(--c-surface) 0%, var(--c-surface-2) 100%);
  overflow: hidden;
  margin-top: 0.5rem;
}
.grid {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  gap: 0.75rem;
  align-items: stretch;
  padding: 0.85rem 1rem 0.65rem;
}
.col {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  min-width: 0;
}
.col-head {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  padding-bottom: 0.4rem;
  border-bottom: 1px dashed var(--c-border);
}
.col-head h4 {
  margin: 0;
  font-size: 0.7rem;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--c-text-3);
}
.dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}
.dot.in {
  background: var(--c-text-3);
}
.dot.out.tone-great {
  background: var(--c-success);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--c-success) 22%, transparent);
}
.dot.out.tone-good {
  background: var(--c-success);
  opacity: 0.85;
}
.dot.out.tone-ok {
  background: var(--c-accent);
}
.dot.out.tone-bad {
  background: var(--c-danger);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--c-danger) 22%, transparent);
}
.arrow {
  align-self: center;
  font-size: 1.1rem;
  color: var(--c-text-3);
  font-weight: 300;
}
dl {
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}
.row {
  display: grid;
  grid-template-columns: 78px 1fr;
  gap: 0.5rem;
  align-items: baseline;
  font-size: 0.78rem;
}
dt {
  color: var(--c-text-3);
  font-weight: 500;
  letter-spacing: 0.02em;
}
dd {
  margin: 0;
  color: var(--c-text);
  font-variant-numeric: tabular-nums;
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 0.35rem;
  min-width: 0;
}
.num {
  font-weight: 600;
  color: var(--c-text);
}
.num.ok {
  color: var(--c-success);
}
.num.fail {
  color: var(--c-danger);
}
.sub {
  font-size: 0.72rem;
  color: var(--c-text-3);
  font-weight: 400;
}
.muted {
  color: var(--c-text-3);
}
.badge {
  display: inline-flex;
  align-items: center;
  padding: 0.1rem 0.45rem;
  background: var(--c-accent-bg);
  color: var(--c-accent);
  border-radius: 4px;
  font-weight: 600;
  font-size: 0.72rem;
  letter-spacing: 0.04em;
}
.verdict {
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
  padding: 0.6rem 1rem 0.7rem;
  border-top: 1px solid var(--c-border);
  background: var(--c-surface);
}
.verdict-text {
  display: flex;
  align-items: baseline;
  gap: 0.6rem;
  flex-wrap: wrap;
}
.verdict-label {
  font-size: 0.78rem;
  font-weight: 600;
}
.verdict-numbers {
  font-size: 0.74rem;
  color: var(--c-text-2);
  font-variant-numeric: tabular-nums;
}
.verdict-tip {
  margin: 0;
  font-size: 0.75rem;
  line-height: 1.45;
  color: var(--c-text-2);
  padding: 0.45rem 0.6rem;
  border-radius: 6px;
  background: var(--c-surface-2);
  border-left: 3px solid currentColor;
  opacity: 0.9;
}
.verdict.tone-bad .verdict-tip {
  border-left-color: var(--c-danger);
}
.verdict.tone-ok .verdict-tip {
  border-left-color: var(--c-accent);
}
.verdict.tone-great .verdict-label {
  color: var(--c-success);
}
.verdict.tone-good .verdict-label {
  color: var(--c-success);
}
.verdict.tone-ok .verdict-label {
  color: var(--c-accent);
}
.verdict.tone-bad .verdict-label {
  color: var(--c-danger);
}
.bar {
  height: 4px;
  background: var(--c-surface-2);
  border-radius: 2px;
  overflow: hidden;
  position: relative;
}
.bar-fill {
  height: 100%;
  border-radius: 2px;
  transition: width 280ms ease;
}
.tone-great .bar-fill {
  background: var(--c-success);
}
.tone-good .bar-fill {
  background: var(--c-success);
  opacity: 0.8;
}
.tone-ok .bar-fill {
  background: var(--c-accent);
}
.tone-bad .bar-fill {
  background: var(--c-danger);
  width: 100% !important;
  opacity: 0.5;
}

@media (max-width: 580px) {
  .grid {
    grid-template-columns: 1fr;
    gap: 0.6rem;
  }
  .arrow {
    transform: rotate(90deg);
    justify-self: start;
  }
  .row {
    grid-template-columns: 70px 1fr;
  }
}
</style>
