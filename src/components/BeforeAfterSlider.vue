<script setup lang="ts">
import { ref, onUnmounted } from 'vue';

defineProps<{ before: string; after: string }>();

const pos = ref(50);
const root = ref<HTMLDivElement | null>(null);
let dragging = false;

const updateFromEvent = (clientX: number) => {
  if (!root.value) return;
  const rect = root.value.getBoundingClientRect();
  const x = ((clientX - rect.left) / rect.width) * 100;
  pos.value = Math.max(0, Math.min(100, x));
};

const onPointerDown = (e: PointerEvent) => {
  dragging = true;
  (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
  updateFromEvent(e.clientX);
};
const onPointerMove = (e: PointerEvent) => {
  if (!dragging) return;
  updateFromEvent(e.clientX);
};
const onPointerUp = (e: PointerEvent) => {
  dragging = false;
  (e.currentTarget as Element).releasePointerCapture?.(e.pointerId);
};

onUnmounted(() => {
  dragging = false;
});
</script>

<template>
  <div
    ref="root"
    class="ba"
    @pointerdown="onPointerDown"
    @pointermove="onPointerMove"
    @pointerup="onPointerUp"
    @pointercancel="onPointerUp"
  >
    <img :src="before" alt="Original" class="layer" draggable="false" />
    <img
      :src="after"
      alt="Compressed"
      class="layer top"
      draggable="false"
      :style="{ clipPath: `inset(0 ${100 - pos}% 0 0)` }"
    />
    <div class="divider" :style="{ left: `${pos}%` }">
      <div class="handle" aria-label="Drag to compare">
        <span>‹</span><span>›</span>
      </div>
    </div>
    <span class="tag left">Before</span>
    <span class="tag right">After</span>
  </div>
</template>

<style scoped>
.ba {
  position: relative;
  width: 100%;
  background: var(--c-surface-2);
  border-radius: 10px;
  overflow: hidden;
  user-select: none;
  touch-action: none;
  aspect-ratio: 16 / 10;
}
.layer {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: contain;
  pointer-events: none;
}
.layer.top {
  z-index: 2;
}
.divider {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 2px;
  background: white;
  z-index: 3;
  transform: translateX(-1px);
  pointer-events: none;
  box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.25);
}
.handle {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: white;
  color: #111;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  font-weight: 700;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
  pointer-events: auto;
}
.handle span {
  line-height: 1;
}
.tag {
  position: absolute;
  top: 8px;
  z-index: 3;
  background: rgba(0, 0, 0, 0.55);
  color: white;
  font-size: 0.7rem;
  padding: 0.15rem 0.45rem;
  border-radius: 4px;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  pointer-events: none;
}
.tag.left {
  left: 8px;
}
.tag.right {
  right: 8px;
}
</style>
