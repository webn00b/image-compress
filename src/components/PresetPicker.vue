<script setup lang="ts">
import { useSettings } from '../composables/useSettings';

const { applyPreset, presets } = useSettings();
</script>

<template>
  <div class="presets">
    <button
      v-for="p in presets"
      :key="p.id"
      type="button"
      class="preset"
      @click="applyPreset(p.id)"
    >
      <span class="label">{{ p.label }}</span>
      <span class="desc">{{ p.description }}</span>
    </button>
  </div>
</template>

<style scoped>
.presets {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 0.5rem;
}
@media (min-width: 640px) {
  .presets {
    grid-template-columns: repeat(4, 1fr);
  }
}
.preset {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  text-align: left;
  padding: 0.65rem 0.75rem;
  border-radius: 8px;
  border: 1px solid var(--c-border);
  background: var(--c-surface);
  color: var(--c-text);
  cursor: pointer;
  transition: border-color 120ms ease, background 120ms ease;
}
.preset:hover {
  border-color: var(--c-accent);
  background: var(--c-accent-bg);
}
.label {
  font-size: 0.9rem;
  font-weight: 600;
}
.desc {
  font-size: 0.78rem;
  color: var(--c-text-2);
  margin-top: 2px;
}
</style>
