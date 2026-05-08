<script setup lang="ts">
import { useQueue } from './composables/useQueue';
import DropZone from './components/DropZone.vue';
import SettingsPanel from './components/SettingsPanel.vue';
import PresetPicker from './components/PresetPicker.vue';
import FileList from './components/FileList.vue';
import ThemeToggle from './components/ThemeToggle.vue';
import FaqSection from './components/FaqSection.vue';

const { add } = useQueue();

const onFiles = (files: FileList | File[]) => {
  add(files);
};
</script>

<template>
  <div class="app">
    <header class="topbar">
      <div class="brand">
        <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true">
          <path
            d="M12 2L2 7v10l10 5 10-5V7l-10-5zm0 2.236L19.5 8 12 11.764 4.5 8 12 4.236zM4 9.618l7 3.5v7.764l-7-3.5V9.618zm9 11.264v-7.764l7-3.5v7.764l-7 3.5z"
            fill="currentColor"
          />
        </svg>
        <span>Image Compress</span>
      </div>
      <ThemeToggle />
    </header>

    <main class="main">
      <DropZone @files="onFiles" />

      <section class="card">
        <h3 class="card-title">Presets</h3>
        <PresetPicker />
      </section>

      <section class="card">
        <h3 class="card-title">Compression settings</h3>
        <SettingsPanel />
      </section>

      <FileList />

      <FaqSection />
    </main>

    <footer class="foot">
      <span>All processing is local — files never leave your browser.</span>
    </footer>
  </div>
</template>

<style scoped>
.app {
  max-width: 920px;
  margin: 0 auto;
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  min-height: 100vh;
}
.topbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem 0;
}
.brand {
  display: flex;
  align-items: center;
  gap: 0.55rem;
  font-weight: 600;
  font-size: 1.05rem;
  color: var(--c-text);
}
.brand svg {
  color: var(--c-accent);
}
.main {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  flex: 1;
}
.card {
  background: var(--c-surface);
  border: 1px solid var(--c-border);
  border-radius: 12px;
  padding: 1rem;
}
.card-title {
  margin: 0 0 0.75rem;
  font-size: 0.78rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--c-text-3);
}
.foot {
  text-align: center;
  font-size: 0.78rem;
  color: var(--c-text-3);
  padding: 0.5rem 0 1rem;
}
@media (min-width: 720px) {
  .app {
    padding: 1.5rem;
  }
}
</style>
