<script setup lang="ts">
import { ref } from 'vue';
import { useQueue } from '../composables/useQueue';
import { useSettings } from '../composables/useSettings';
import { formatBytes } from '../pipeline/format';
import { buildZip } from '../lib/zip';
import FileItem from './FileItem.vue';

const { entries, totals, overallProgress, processAll, remove, clear, reprocess } = useQueue();
const { settings } = useSettings();

const isProcessing = ref(false);
const isZipping = ref(false);
const zipProgress = ref(0);

const onProcess = async () => {
  if (isProcessing.value) return;
  isProcessing.value = true;
  try {
    await processAll(settings);
  } finally {
    isProcessing.value = false;
  }
};

const onDownloadZip = async () => {
  if (isZipping.value) return;
  const done = entries.value.filter((e) => e.status === 'done');
  if (done.length === 0) return;
  isZipping.value = true;
  zipProgress.value = 0;
  try {
    const blob = await buildZip(done, (pct) => (zipProgress.value = pct));
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'images_compressed.zip';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  } finally {
    isZipping.value = false;
  }
};
</script>

<template>
  <section v-if="entries.length > 0" class="filelist">
    <header class="head">
      <div class="head-stats">
        <strong>{{ totals.total }}</strong> file{{ totals.total === 1 ? '' : 's' }}
        <template v-if="totals.done > 0">
          ·
          <span class="ok">
            saved {{ formatBytes(totals.saved) }} ({{ totals.pct.toFixed(1) }}%)
          </span>
        </template>
        <template v-else>
          · {{ formatBytes(totals.original) }} total
        </template>
      </div>
      <div class="head-actions">
        <button
          class="btn primary"
          type="button"
          :disabled="isProcessing || (totals.pending === 0 && totals.errored === 0)"
          @click="onProcess"
        >
          {{ isProcessing ? 'Compressing…' : `Compress ${totals.pending + totals.errored} file${totals.pending + totals.errored === 1 ? '' : 's'}` }}
        </button>
        <button
          class="btn"
          type="button"
          :disabled="isZipping || totals.done === 0"
          @click="onDownloadZip"
        >
          {{ isZipping ? `ZIP ${zipProgress.toFixed(0)}%` : 'Download ZIP' }}
        </button>
        <button class="btn ghost" type="button" @click="clear">Clear</button>
      </div>
    </header>

    <div v-if="isProcessing" class="overall">
      <div class="bar">
        <div class="fill" :style="{ width: `${overallProgress * 100}%` }" />
      </div>
      <span class="pct">{{ Math.round(overallProgress * 100) }}%</span>
    </div>

    <ul class="list">
      <FileItem
        v-for="entry in entries"
        :key="entry.id"
        :entry="entry"
        @remove="remove"
        @reprocess="reprocess($event, settings)"
      />
    </ul>
  </section>
</template>

<style scoped>
.filelist {
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
}
.head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.75rem;
  flex-wrap: wrap;
}
.head-stats {
  font-size: 0.9rem;
  color: var(--c-text-2);
}
.head-stats strong {
  color: var(--c-text);
}
.ok {
  color: var(--c-success);
  font-weight: 500;
}
.head-actions {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}
.btn {
  padding: 0.5rem 0.9rem;
  border-radius: 8px;
  font-size: 0.88rem;
  font-weight: 500;
  cursor: pointer;
  border: 1px solid var(--c-border);
  background: var(--c-surface);
  color: var(--c-text);
}
.btn:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}
.btn.primary {
  background: var(--c-accent);
  border-color: var(--c-accent);
  color: white;
}
.btn.primary:hover:not(:disabled) {
  filter: brightness(1.05);
}
.btn.ghost {
  background: transparent;
  border-color: transparent;
  color: var(--c-text-2);
}
.btn.ghost:hover {
  color: var(--c-text);
  background: var(--c-surface-2);
}
.overall {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  font-size: 0.82rem;
}
.overall .bar {
  flex: 1;
  height: 6px;
  border-radius: 3px;
  background: var(--c-surface-2);
  overflow: hidden;
}
.overall .fill {
  height: 100%;
  background: var(--c-accent);
  transition: width 150ms ease;
}
.pct {
  font-variant-numeric: tabular-nums;
  min-width: 36px;
  text-align: right;
  color: var(--c-text-2);
}
.list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}
</style>
