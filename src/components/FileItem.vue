<script setup lang="ts">
import { ref, computed } from 'vue';
import type { FileEntry } from '../types';
import { formatBytes, compressedFileName } from '../pipeline/format';
import BeforeAfterSlider from './BeforeAfterSlider.vue';
import StatsPanel from './StatsPanel.vue';

const props = defineProps<{ entry: FileEntry }>();
const emit = defineEmits<{ remove: [id: string]; reprocess: [id: string] }>();

const compareOpen = ref(false);

const savedPct = computed(() => {
  if (!props.entry.result) return 0;
  return (1 - props.entry.result.byteLength / props.entry.originalSize) * 100;
});

const downloadName = computed(() => {
  if (!props.entry.result) return props.entry.name;
  return compressedFileName(props.entry.name, props.entry.result.format);
});
</script>

<template>
  <li class="item" :class="{ done: entry.status === 'done', error: entry.status === 'error' }">
    <button
      class="thumb"
      type="button"
      :disabled="entry.status !== 'done'"
      :title="entry.status === 'done' ? 'Compare before/after' : ''"
      @click="entry.status === 'done' && (compareOpen = true)"
    >
      <img v-if="entry.thumbnailUrl" :src="entry.thumbnailUrl" :alt="entry.name" />
    </button>

    <div class="meta">
      <div class="head">
        <span class="name" :title="entry.name">{{ entry.name }}</span>
        <button class="x" type="button" aria-label="Remove" @click="emit('remove', entry.id)">×</button>
      </div>

      <div class="stats">
        <span class="dim">
          <template v-if="entry.originalWidth">
            {{ entry.originalWidth }}×{{ entry.originalHeight }}
            <template v-if="entry.result">
              → {{ entry.result.width }}×{{ entry.result.height }}
            </template>
          </template>
        </span>
        <span class="size">
          {{ formatBytes(entry.originalSize) }}
          <template v-if="entry.result">
            → <strong>{{ formatBytes(entry.result.byteLength) }}</strong>
            <span class="saved" :class="{ negative: savedPct < 0 }">
              {{ savedPct >= 0 ? '−' : '+' }}{{ Math.abs(savedPct).toFixed(0) }}%
            </span>
          </template>
        </span>
      </div>

      <div v-if="entry.status === 'processing' || entry.status === 'pending'" class="progress">
        <div class="bar">
          <div class="fill" :style="{ width: `${entry.progress * 100}%` }" />
        </div>
        <span class="stage">{{ entry.stage }}</span>
      </div>

      <div v-if="entry.error" class="error-msg">⚠ {{ entry.error }}</div>

      <ul v-if="entry.warnings.length" class="warnings">
        <li v-for="(w, i) in entry.warnings" :key="i">⚠ {{ w }}</li>
      </ul>

      <StatsPanel :entry="entry" />

      <div class="actions">
        <a
          v-if="entry.resultUrl"
          class="btn primary"
          :href="entry.resultUrl"
          :download="downloadName"
        >
          Download
        </a>
        <button
          v-if="entry.status === 'done' || entry.status === 'error'"
          class="btn ghost"
          type="button"
          @click="emit('reprocess', entry.id)"
        >
          Reprocess
        </button>
      </div>
    </div>

    <Teleport v-if="compareOpen && entry.thumbnailUrl && entry.resultUrl" to="body">
      <div class="modal" role="dialog" aria-modal="true" @click.self="compareOpen = false">
        <div class="modal-content">
          <div class="modal-head">
            <span>{{ entry.name }}</span>
            <button class="x" type="button" aria-label="Close" @click="compareOpen = false">×</button>
          </div>
          <BeforeAfterSlider :before="entry.thumbnailUrl" :after="entry.resultUrl" />
          <div class="modal-stats">
            <span>{{ formatBytes(entry.originalSize) }} → {{ formatBytes(entry.result!.byteLength) }}</span>
            <span class="saved">{{ savedPct.toFixed(1) }}% smaller</span>
          </div>
        </div>
      </div>
    </Teleport>
  </li>
</template>

<style scoped>
.item {
  display: grid;
  grid-template-columns: 88px 1fr;
  gap: 0.85rem;
  padding: 0.75rem;
  background: var(--c-surface);
  border: 1px solid var(--c-border);
  border-radius: 10px;
  align-items: start;
}
.item.error {
  border-color: var(--c-danger);
}
.thumb {
  position: relative;
  width: 88px;
  height: 88px;
  border-radius: 8px;
  overflow: hidden;
  background: var(--c-surface-2);
  border: none;
  padding: 0;
  cursor: pointer;
}
.thumb:disabled {
  cursor: default;
}
.thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.meta {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}
.head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.5rem;
}
.name {
  font-weight: 500;
  color: var(--c-text);
  font-size: 0.9rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.x {
  width: 24px;
  height: 24px;
  border-radius: 6px;
  border: 1px solid transparent;
  background: transparent;
  color: var(--c-text-2);
  cursor: pointer;
  font-size: 1.1rem;
  line-height: 1;
}
.x:hover {
  background: var(--c-surface-2);
  color: var(--c-text);
}
.stats {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem 0.9rem;
  font-size: 0.82rem;
  color: var(--c-text-2);
  font-variant-numeric: tabular-nums;
}
.size strong {
  color: var(--c-text);
}
.saved {
  color: var(--c-success);
  font-weight: 600;
  margin-left: 0.4rem;
}
.saved.negative {
  color: var(--c-danger);
}
.progress {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.78rem;
}
.bar {
  flex: 1;
  height: 4px;
  background: var(--c-surface-2);
  border-radius: 2px;
  overflow: hidden;
}
.fill {
  height: 100%;
  background: var(--c-accent);
  transition: width 120ms ease;
}
.stage {
  color: var(--c-text-3);
  min-width: 90px;
}
.error-msg {
  font-size: 0.8rem;
  color: var(--c-danger);
}
.warnings {
  list-style: none;
  padding: 0;
  margin: 0;
  font-size: 0.78rem;
  color: var(--c-warn);
}
.actions {
  display: flex;
  gap: 0.5rem;
  margin-top: 0.2rem;
  flex-wrap: wrap;
}
.btn {
  display: inline-flex;
  align-items: center;
  padding: 0.4rem 0.75rem;
  border-radius: 7px;
  font-size: 0.82rem;
  font-weight: 500;
  cursor: pointer;
  text-decoration: none;
  border: 1px solid transparent;
  transition: background 120ms ease, border-color 120ms ease;
}
.btn.primary {
  background: var(--c-accent);
  color: white;
}
.btn.primary:hover {
  filter: brightness(1.05);
}
.btn.ghost {
  background: transparent;
  color: var(--c-text);
  border-color: var(--c-border);
}
.btn.ghost:hover {
  background: var(--c-surface-2);
}
.modal {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
  padding: 1rem;
}
.modal-content {
  width: min(960px, 100%);
  max-height: 92vh;
  background: var(--c-surface);
  border-radius: 12px;
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}
.modal-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-weight: 600;
}
.modal-stats {
  display: flex;
  justify-content: space-between;
  font-size: 0.85rem;
  color: var(--c-text-2);
}
@media (max-width: 540px) {
  .item {
    grid-template-columns: 64px 1fr;
  }
  .thumb {
    width: 64px;
    height: 64px;
  }
}
</style>
