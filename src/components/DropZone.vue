<script setup lang="ts">
import { ref } from 'vue';

const emit = defineEmits<{ files: [files: FileList | File[]] }>();

const dragOver = ref(false);

const onDrop = (e: DragEvent) => {
  e.preventDefault();
  dragOver.value = false;
  if (e.dataTransfer?.files?.length) {
    emit('files', e.dataTransfer.files);
  }
};

const onDragOver = (e: DragEvent) => {
  e.preventDefault();
  dragOver.value = true;
};

const onDragLeave = () => {
  dragOver.value = false;
};

const onPick = (e: Event) => {
  const target = e.target as HTMLInputElement;
  if (target.files?.length) {
    emit('files', target.files);
    target.value = '';
  }
};
</script>

<template>
  <label
    class="dropzone"
    :class="{ active: dragOver }"
    @drop="onDrop"
    @dragover="onDragOver"
    @dragenter="onDragOver"
    @dragleave="onDragLeave"
  >
    <input
      type="file"
      multiple
      accept="image/jpeg,image/png,image/webp,image/avif,image/heic,image/heif,.heic,.heif"
      @change="onPick"
    />
    <div class="content">
      <svg viewBox="0 0 24 24" width="44" height="44" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">
        <path d="M12 16V4m0 0l-4 4m4-4l4 4" stroke-linecap="round" stroke-linejoin="round" />
        <path d="M3 16v3a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-3" stroke-linecap="round" />
      </svg>
      <h2>Drop images here</h2>
      <p class="hint">JPEG · PNG · WebP · AVIF · HEIC — batch supported</p>
      <p class="cta">or click to choose files</p>
      <p class="privacy">Files never leave your browser. 100% local.</p>
    </div>
  </label>
</template>

<style scoped>
.dropzone {
  display: block;
  border: 2px dashed var(--c-border);
  border-radius: 14px;
  padding: 2.5rem 1.5rem;
  text-align: center;
  cursor: pointer;
  transition: border-color 150ms ease, background 150ms ease;
  background: var(--c-surface);
}
.dropzone.active {
  border-color: var(--c-accent);
  background: var(--c-accent-bg);
}
.dropzone input {
  display: none;
}
.content {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  align-items: center;
  color: var(--c-text);
}
.content svg {
  color: var(--c-accent);
}
h2 {
  margin: 0.5rem 0 0;
  font-size: 1.15rem;
  font-weight: 600;
}
.hint {
  color: var(--c-text-2);
  font-size: 0.9rem;
  margin: 0;
}
.cta {
  margin: 0;
  color: var(--c-accent);
  font-weight: 500;
  font-size: 0.9rem;
}
.privacy {
  margin: 0.75rem 0 0;
  font-size: 0.8rem;
  color: var(--c-text-3);
}
</style>
