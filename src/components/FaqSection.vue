<script setup lang="ts">
import { ref } from 'vue';

interface QA {
  q: string;
  a: string;
}

const items: QA[] = [
  {
    q: 'Are my images uploaded to a server?',
    a: 'No. Image Compress runs entirely in your browser using WebAssembly. Files never leave your device — there is no server-side processing and no upload. You can verify this in DevTools → Network: no image data is sent.',
  },
  {
    q: 'Which formats are supported?',
    a: 'Input: JPEG, PNG, WebP, AVIF, and HEIC/HEIF (iPhone photos). Output: JPEG, WebP, AVIF, and PNG (with optional palette quantization for smaller files).',
  },
  {
    q: 'What is the difference between WebP and AVIF?',
    a: 'AVIF typically produces 20–40% smaller files than WebP at the same visual quality, but encoding is several times slower. WebP is faster, has been universally supported in browsers since 2020, and is a strong default for most cases.',
  },
  {
    q: 'Why did my PNG get bigger after compression?',
    a: 'Some PNGs are already heavily optimized (e.g. by oxipng or zopflipng) and use palette mode that simple re-encoding cannot match. Try the palette quantization option (Colors → 256/128/64) for a lossy palette PNG, or switch to lossy WebP/AVIF for screenshots and graphics — often 3–10× smaller.',
  },
  {
    q: 'Does it work offline?',
    a: 'Yes. After the first visit the encoders and the app are cached by the browser, and the app continues to work without an internet connection.',
  },
  {
    q: 'Is metadata (EXIF, GPS) removed?',
    a: 'Yes. Re-encoding always strips EXIF, GPS coordinates, and other metadata — there is no way to keep them with the current pipeline. Privacy by default.',
  },
  {
    q: 'How large of a batch can I process?',
    a: 'There is no hard limit, but practical limits depend on your RAM. Workers process files in parallel (up to 4 at a time depending on your CPU and memory). For very large batches, consider processing in smaller chunks.',
  },
  {
    q: 'What is "target file size"?',
    a: 'Optional binary search over the quality value to land at or just under your target size. Up to 8 encoding attempts per image — slower than fixed quality, but useful for hitting upload limits like 1 MB or 500 KB.',
  },
];

const open = ref<number | null>(0);
const toggle = (i: number) => {
  open.value = open.value === i ? null : i;
};
</script>

<template>
  <section class="faq" aria-labelledby="faq-title">
    <h2 id="faq-title">Frequently asked questions</h2>
    <ul class="qa">
      <li v-for="(item, i) in items" :key="i" :class="{ open: open === i }">
        <button
          type="button"
          class="q"
          :aria-expanded="open === i"
          :aria-controls="`faq-a-${i}`"
          @click="toggle(i)"
        >
          <span>{{ item.q }}</span>
          <span class="chev" aria-hidden="true">▾</span>
        </button>
        <div
          v-show="open === i"
          :id="`faq-a-${i}`"
          class="a"
          role="region"
        >
          {{ item.a }}
        </div>
      </li>
    </ul>
  </section>
</template>

<style scoped>
.faq {
  margin-top: 1rem;
  padding: 1.25rem;
  background: var(--c-surface);
  border: 1px solid var(--c-border);
  border-radius: 12px;
}
h2 {
  margin: 0 0 0.75rem;
  font-size: 1.05rem;
  font-weight: 600;
  color: var(--c-text);
}
.qa {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}
.qa li {
  border-bottom: 1px solid var(--c-border);
}
.qa li:last-child {
  border-bottom: none;
}
.q {
  width: 100%;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 0;
  background: transparent;
  border: none;
  color: var(--c-text);
  text-align: left;
  font-size: 0.92rem;
  font-weight: 500;
  cursor: pointer;
}
.q:hover {
  color: var(--c-accent);
}
.chev {
  color: var(--c-text-3);
  transition: transform 180ms ease;
  flex-shrink: 0;
}
.qa li.open .chev {
  transform: rotate(180deg);
  color: var(--c-accent);
}
.a {
  padding: 0 0 0.85rem;
  font-size: 0.85rem;
  color: var(--c-text-2);
  line-height: 1.55;
  max-width: 60ch;
}
</style>
