# Image Compress

A free, fully client-side image compressor that runs entirely in your browser.
Files **never leave your device** — there is no server, no upload, no tracking.

Compress JPEG, PNG, WebP, AVIF, and HEIC images in batches with quality control,
high-quality Lanczos resize, target file size, palette quantization for PNG,
and a side-by-side before/after comparison.

> Powered by WebAssembly codecs from the [Squoosh](https://squoosh.app/) project,
> running in Web Workers for a smooth UI.

---

## Features

- **Drag & drop batch upload** — process many files in parallel.
- **Input formats:** JPEG, PNG, WebP, AVIF, HEIC/HEIF (iPhone photos).
- **Output formats:** JPEG, WebP, AVIF, PNG.
- **Quality slider** (1–100) and optional **target file size** in KB
  (binary search over quality, up to 8 attempts per file).
- **Two resize modes:**
  - *Max long side* — cap the longest side to N pixels (different sources, same output cap).
  - *Scale down* — divide both sides by a factor (×1.5 to ×16).
  - High-quality Lanczos filtering via [pica](https://github.com/nodeca/pica).
- **PNG palette quantization** — turn lossless PNGs into much smaller lossy palette PNGs (256, 128, 64, 32, 16 colors) using [UPNG.js](https://github.com/photopea/UPNG.js).
- **Before/after comparison slider** with a draggable divider.
- **Stats panel** per file showing chosen settings, actual result, duration, and a context-aware verdict.
- **ZIP download** of all compressed files via [JSZip](https://stuk.github.io/jszip/).
- **Built-in presets:** Web (1920px · WebP 85), Avatar (400px · WebP 80),
  Thumbnail (200px · WebP 75), Max quality (no resize · WebP 95).
- **Light / dark theme** with system preference detection and persistence.
- **Smart warnings** for risky combinations (e.g. double JPEG re-compression).
- **Memory-safe pipeline** — pixel data lives only in workers, transferred via
  `Comlink.transfer()`, never structured-cloned.
- **Offline-ready** — works without internet after the first load.
- **Fully accessible** keyboard navigation, ARIA labels, mobile-friendly layout.

---

## Privacy

Everything runs in your browser via WebAssembly:

1. Files are read directly from the local file system (`File` / `Blob`).
2. Decoding, resizing, and encoding all happen in **Web Workers** within the same browser tab.
3. Nothing is ever sent over the network.

You can verify this in DevTools → Network: no image bytes leave the device.

---

## Quick start

### Requirements

- **Node.js ≥ 20.19** (or ≥ 22.12) — required by Vite 7 and `vue-tsc`.
- npm 10+.

### Install and run

```bash
npm install
npm run dev
```

Vite will print the local URL (port auto-selected if `5173` is busy).

### Production build

```bash
npm run build
npm run preview
```

Output goes to `dist/`. The whole app is static — drop it on any CDN
(Cloudflare Pages, Netlify, Vercel, GitHub Pages, S3, etc.).

### Type-check

```bash
npm run typecheck
```

---

## Tech stack

| Concern | Library |
|---|---|
| UI framework | [Vue 3](https://vuejs.org/) (Composition API) |
| Build tool | [Vite 7](https://vitejs.dev/) |
| Language | TypeScript 5 |
| Worker RPC | [Comlink](https://github.com/GoogleChromeLabs/comlink) |
| JPEG / WebP / AVIF / PNG codecs | [@jsquash](https://github.com/jamsinclair/jSquash) (WASM) |
| HEIC decode | [libheif-js](https://github.com/catdad-experiments/libheif-js) (lazy-loaded) |
| Resize | [pica 9](https://github.com/nodeca/pica) (Lanczos, OffscreenCanvas) |
| PNG palette quantization | [UPNG.js](https://github.com/photopea/UPNG.js) |
| ZIP archives | [JSZip](https://stuk.github.io/jszip/) |

---

## Project structure

```
image-compress/
├── index.html                       # Crawler-visible SEO content + Vue mount point
├── public/                          # Static assets (favicons, manifest, robots, sitemap)
├── src/
│   ├── main.ts                      # Vue entry
│   ├── App.vue                      # Layout
│   ├── style.css                    # CSS variables, themes, global styles
│   ├── types.ts                     # Settings, FileEntry, ProcessTask*
│   ├── components/
│   │   ├── DropZone.vue             # Drag & drop + file picker
│   │   ├── SettingsPanel.vue        # Format, quality, resize, target size, PNG colors
│   │   ├── PresetPicker.vue         # 4 quick presets
│   │   ├── FileList.vue             # Batch controls, total stats, ZIP download
│   │   ├── FileItem.vue             # One file row + before/after modal
│   │   ├── StatsPanel.vue           # "Settings used → Result" panel per file
│   │   ├── BeforeAfterSlider.vue    # Draggable comparison slider
│   │   ├── FaqSection.vue           # User- and crawler-visible FAQ
│   │   ├── ThemeToggle.vue
│   │   └── InfoTooltip.vue
│   ├── composables/
│   │   ├── useTheme.ts              # localStorage + prefers-color-scheme
│   │   ├── useSettings.ts           # Reactive settings, presets, persistence
│   │   └── useQueue.ts              # File queue, dispatcher, totals
│   ├── pipeline/
│   │   ├── pool.ts                  # Comlink-backed worker pool
│   │   ├── decode.ts                # createImageBitmap → ImageData; @jsquash / libheif fallback
│   │   ├── encode.ts                # Format dispatcher (jpeg/webp/avif/png + UPNG)
│   │   ├── resize.ts                # pica + step-down fallback (OffscreenCanvas)
│   │   ├── targetSize.ts            # Binary search over quality
│   │   ├── presets.ts
│   │   ├── doubleJpeg.ts            # Warning detection
│   │   └── format.ts                # bytes / percent helpers
│   ├── workers/
│   │   └── pipeline.worker.ts       # Comlink-exposed pipeline (decode → resize → encode)
│   └── lib/
│       └── zip.ts                   # JSZip wrapper
├── vite.config.ts
├── tsconfig.json
└── package.json
```

---

## How it works

The compression pipeline runs entirely inside Web Workers:

```
File (in main thread)
   │
   ▼  ArrayBuffer transferred to worker
┌─────────────────────────── Worker pool (Comlink) ───────────────────────────┐
│                                                                              │
│  decode()       — createImageBitmap (native fast path) for JPEG/PNG/WebP     │
│                   @jsquash/avif/decode for AVIF                              │
│                   libheif-js (lazy import) for HEIC/HEIF                     │
│       │                                                                      │
│       ▼                                                                      │
│  resize()       — pica (Lanczos) on OffscreenCanvas, with a drawImage        │
│                   step-down fallback if pica fails                           │
│       │                                                                      │
│       ▼                                                                      │
│  encode()       — @jsquash/{jpeg,webp,avif,png} (lossy/lossless)             │
│                   UPNG.js for PNG with palette quantization                  │
│                   targetSize.ts wraps the encoder with a binary search       │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
   │
   ▼  ArrayBuffer transferred back, wrapped in a Blob
Result (preview, download)
```

The pool size is computed at startup as
`min(navigator.hardwareConcurrency, 4, floor(deviceMemory / 0.5))`.
This keeps memory under control on lower-spec devices: each in-flight 24 MP
image holds ~96 MB of RGBA pixel data inside the worker.

`@jsquash` codecs are imported via subpath dynamic imports
(`await import('@jsquash/jpeg/encode')`) so unused codecs are not loaded into
the worker bundle. AVIF, HEIC, and UPNG only load when actually needed.

---

## Configuration

All user settings persist in `localStorage` under `imgcompress.settings`.
Theme preference under `imgcompress.theme`.

To reset, open DevTools → Application → Local Storage and delete the keys,
or reset to defaults via the in-app preset buttons.

---

## SEO / Deployment

Before going live, replace the placeholder domain in:

- `index.html` (canonical, og:url, og:image, twitter:image, JSON-LD `url`)
- `public/robots.txt` (sitemap line)
- `public/sitemap.xml`

Quick `sed` replacement after picking a domain:

```bash
grep -rl 'your-domain.example' index.html public/ \
  | xargs sed -i '' 's|https://your-domain.example|https://YOUR-DOMAIN|g'
```

You should also generate a real `og-image.png` (1200×630) and place it at
`public/og-image.png` so social-network previews look good.

---

## Contributing

1. Fork the repo.
2. Create a feature branch: `git checkout -b feature/your-thing`.
3. Run `npm run typecheck` and `npm run build` before committing.
4. Open a PR with a clear description of the change.

---

## License

MIT
