<script setup lang="ts">
defineProps<{ text: string }>();
</script>

<template>
  <span class="info" tabindex="0">
    <span class="mark" aria-hidden="true">?</span>
    <span class="bubble" role="tooltip">{{ text }}</span>
  </span>
</template>

<style scoped>
.info {
  position: relative;
  display: inline-flex;
  vertical-align: middle;
  margin-left: 0.4em;
  outline: none;
}
.mark {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.05em;
  height: 1.05em;
  border-radius: 50%;
  background: var(--c-surface-2);
  color: var(--c-text-2);
  font-size: 0.7em;
  font-weight: 700;
  cursor: help;
  border: 1px solid var(--c-border);
}
.bubble {
  position: absolute;
  bottom: calc(100% + 6px);
  left: 50%;
  transform: translateX(-50%);
  background: var(--c-tooltip-bg);
  color: var(--c-tooltip-fg);
  padding: 0.5rem 0.65rem;
  border-radius: 6px;
  font-size: 0.8rem;
  line-height: 1.35;
  width: max-content;
  max-width: 240px;
  opacity: 0;
  pointer-events: none;
  transition: opacity 120ms ease;
  z-index: 30;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.18);
}
.info:hover .bubble,
.info:focus-visible .bubble {
  opacity: 1;
}
</style>
