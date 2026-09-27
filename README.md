<div align="center">

<img src="public/logo.png" alt="Anime Archive" width="96" height="96">

# Anime Archive

Browse, search, sort and favourite the frames you care about, and catalog new ones.
Everything stays on your machine unless you explicitly point uploads at Cloudinary.

</div>

---

## What it is

Anime Archive is a single-user frame archive. A *frame* is a still grabbed from an
anime — a title, the series it came from, an episode label, tags, a note, and whether
you starred it.

| Gallery | Detail | Upload |
| --- | --- | --- |
| Search across title, series, episode, note and tags; filter by series; favourites only; sort by newest / oldest / title / series | Lightbox with prev/next, favourite, tags, note and intrinsic dimensions. `Esc` closes, `←`/`→` step, backdrop click closes | Drag-and-drop or pick a file, preview with live dimensions, fill the form, watch the progress bar, get a stamped confirmation |

**There is no account and no server.** Frames live in the visitor's own browser
(`localStorage`, key `anime-archive.frames.v1`). Cloudinary is optional and off by
default — see [Configuration](#configuration).

---

## Quick start

Requires **Node 20+** (developed on Node 24).

```bash
npm install          # also runs `nuxt prepare` via postinstall
npm run dev          # http://localhost:3000
```

| Script | What it does |
| --- | --- |
| `npm run dev` | Dev server with HMR |
| `npm run build` | Production build to `.output/` |
| `npm run generate` | Static prerender to `.output/public` |
| `npm run preview` | Serve the production build |
| `npm test` | Vitest, single run |
| `npm run typecheck` | `vue-tsc` — see [Known issues](#known-issues) |

The gallery ships with **9 demo frames** in `public/frames/`, so there is something to
look at before you upload anything.

---

## Configuration

All configuration is optional; with no environment set, uploads stay in the browser.

```bash
# .env  — never commit this
NUXT_PUBLIC_CLOUDINARY_CLOUD_NAME=your-cloud
NUXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET=your-unsigned-preset
NUXT_PUBLIC_CLOUDINARY_FOLDER=anime-archive
```

> **Unsigned presets upload publicly.** An unsigned preset grants anyone write access
> to the cloud, and anything uploaded through it is publicly addressable. This project
> protects nothing. It is a personal archive, not a private vault — see
> [Privacy](#privacy).

Uploads are validated before anything leaves the browser: **JPEG, PNG, WebP, GIF or
AVIF**, **25 MB max**.

---

## Project structure

This project deliberately uses **root-level source directories** (`srcDir: '.'`) rather
than Nuxt 4's default `app/` convention, and `nuxt.config.ts` pins `srcDir` and every
`dir.*` key explicitly so the resolution can never be re-guessed by the framework.
See the long comment at the top of `nuxt.config.ts` for the reasoning.

```
.
├── app.vue                     root component: layout + page
├── nuxt.config.ts              config, design notes, asset pipeline pointer
├── assets/css/
│   ├── tokens.css              the design system — colours, type, spacing, motion
│   └── base.css                reset, focus ring, shared keyframes, grain
├── components/                 auto-imported by directory-prefixed name
│   ├── app/                    AppHeader, AppFooter
│   ├── gallery/                FrameCard, GalleryGrid, FrameDialog, GalleryToolbar, EmptyState
│   └── upload/                 UploadDropzone, UploadPreview, UploadForm
├── composables/
│   ├── useFrames.ts            gallery state: list, filters, derived exhibition
│   └── useUpload.ts            file selection, validation, preview, progress, submit
├── layouts/default.vue         night-sky shell: glows, stars, halftone horizon, grain
├── pages/
│   ├── index.vue               the gallery
│   └── upload.vue              the catalog flow
├── services/storage/           the persistence boundary (see below)
│   ├── types.ts                Frame, FrameDraft, FrameStorageAdapter — the only vocabulary
│   ├── localAdapter.ts         localStorage implementation
│   └── cloudinaryAdapter.ts    optional remote implementation
├── fixtures/frames.ts          the 9 bundled demo stills
├── public/
│   ├── frames/                 demo stills
│   └── logo.png, favicon.*     brand assets
├── scripts/build-logo.ps1      regenerates the brand assets from image-1.png
└── refer/                      standalone UI/UX redesign (static, not part of the app)
```

---

## Architecture

### The storage port

The gallery never knows where frames are stored. It talks to a `FrameStorageAdapter`
and nothing else:

```ts
interface FrameStorageAdapter {
  readonly id: string
  readonly label: string
  list(): Promise<Frame[]>
  get(id: FrameId): Promise<Frame | null>
  create(draft, file?, onProgress?): Promise<Frame>
  update(id, patch): Promise<Frame>
  remove?(id): Promise<void>
  readonly capabilities?: { upload, update, delete, remote }
}
```

Two implementations ship today — `localAdapter` (localStorage, the default) and
`cloudinaryAdapter` (remote, unsigned preset). Dropping in a real backend means writing
one more file and changing one default; no component changes.

The contract the UI relies on:

- `list()` **never throws** for an empty or unavailable store — it resolves `[]`.
- `get()` resolves `null` for a missing id rather than rejecting.
- Methods that would mutate during SSR **may reject**.
- `capabilities` lets the UI hide actions an adapter genuinely cannot perform.

### State

`useFrames()` owns the frame list and the filter controls and derives the exhibition the
grid renders. `useUpload()` owns file selection, validation, the object URL, progress
and submission. Components hold no storage knowledge of any kind.

Filters are `query`, `anime`, `favoritesOnly` and `sort`
(`newest | oldest | title | anime`); search matches title, series, episode, note and
tags, case-insensitively.

### Client-side rendering

The gallery renders **client-side only**. On the server `localStorage` is empty, so
Nuxt's SSR pass never sees a frame. This is why `features.inlineStyles` is `false` in
`nuxt.config.ts`: with inlining on, the styles of the client-only components are shipped
in neither the HTML nor the CSS bundle, and cards come out unstyled after hydration.

---

## Design system

Everything visual is driven by `assets/css/tokens.css`. Change the token, not the
component.

| Group | Tokens |
| --- | --- |
| Surfaces | `--wall-950` `#0b0e1a`, `--wall-900` `#111629`, `--wall-800` `#1b2242` |
| Paper | `--paper-100` `#f6f1e7`, `--paper-200` `#d8d2c6` |
| Accents | `--sakura` `#ff5d8f`, `--neon` `#59e0ff`, `--sunset` `#ffb347` |
| Type | `Shippori Mincho B1` (display) + `Zen Kaku Gothic New` (body), loaded from Google Fonts with `preconnect` and `display=swap` |
| Spacing | `--space-1…10`, a 4 → 128px scale |
| Motion | `--ease-frame`, `--ease-snap`, `--dur-fast/base/slow` |
| Shape | `--radius-frame: 2px` (deliberately near-square, never pill), `--cut` / `--cut-lg` angular notches via `clip-path` |

Shared keyframes live in `base.css`: `glint`, `star-pop`, `scan-y`, `stamp-in`
(the hanko press, used by both the upload confirmation and the header seal) and
`twinkle`. A global `prefers-reduced-motion` block neutralises all of them, and
`FrameDialog` gates its JS-driven `motion-v` animations on `useReducedMotion` too.

### Brand assets

The site mark is a torii/hinomaru woodblock seal. The source artwork is `image-1.png`
at the repository root; `public/` holds the derived, web-ready cuts:

| File | Size | Use |
| --- | --- | --- |
| `public/logo.png` | 128×128 | header seal |
| `public/favicon.png` | 64×64 | favicon |
| `public/favicon.ico` | 32×32 (DIB) | `/favicon.ico` fallback |
| `public/apple-touch-icon.png` | 180×180 | iOS home-screen tile |

`scripts/build-logo.ps1` regenerates all four. It **measures** the emblem's ring in the
source image rather than assuming it is centred, crops a square around it and masks it to
an anti-aliased transparent disc:

```bash
powershell -ExecutionPolicy Bypass -File scripts/build-logo.ps1
```

Replace `image-1.png` and re-run to re-cut every icon. Keep the source artwork in the
repository — the pipeline is not reproducible without it.

---

## Testing

```bash
npm test
```

49 tests across 5 files, using Vitest with `@vue/test-utils` and `happy-dom`:

| File | Covers |
| --- | --- |
| `services/storage/cloudinaryAdapter.test.ts` | the remote adapter's contract and failure modes |
| `components/upload/__tests__/UploadForm.test.ts` | field numbering, emitted patches and events |
| `components/gallery/__tests__/FrameCard.test.ts` | metadata rendering, timecode burn-in, favourite |
| `components/gallery/__tests__/FrameDialog.test.ts` | lightbox content, keyboard and nav |
| `components/gallery/__tests__/GalleryToolbar.test.ts` | search, filters, sort and reset |

---

## Performance notes

`nuxt.config.ts` sets `experimental.watcher: 'builder'`. This is not cosmetic. Because
the project pins `srcDir` to the repository root, Nuxt would otherwise select its
`chokidar-granular` watcher, which opens the project root with `ignoreInitial: false` and
`depth: 0` — so every top-level entry (`components`, `dist`, `node_modules`, …) fires an
`addDir` event, and each one re-runs app-structure invalidation and full template/type
regeneration before the dev server starts listening. Profiling put that at **~3.3s of an
~11.6s boot**. `'builder'` hands `builder:watch` to the Vite dev server's existing
watcher instead, and the boot-time cost drops to zero.

The `ignore` list additionally keeps two working-copy-only directories out of the scanners
and the watcher: `.mimocode` (a vendored toolchain shipping its own `node_modules`) and
`dist` (a Windows junction onto `.output/public`).

`parcel` was measured head-to-head against `'builder'` and lost on every pair, so it is
not used. The full numbers are recorded in `nuxt.config.ts`.

---

## Known issues

**`npm run typecheck` fails before it analyses anything.**

```
[Vue] Load plugin failed: vue-router/volar/sfc-route-blocks
[Vue] Failed to create plugin TypeError: plugin is not a function
```

`vue-router@4.6.4` ships a Volar 3 plugin, but `vue-tsc` / `@vue/language-core@2.2.12`
expects the Volar 2 signature. The crash happens during plugin construction, so no project
code is type-checked. Fix by moving `vue-tsc` to v3 (or pinning `vue-router` to a 4.5.x
that still ships the v2-compatible plugin). Until then, treat `npm test` and
`nuxt build` as the gates.

**A harmless dev warning on every dialog open.**

```
[Vue warn]: Extraneous non-props attributes (data-v-…) were passed to component but could
not be automatically inherited because component renders fragment or text or teleport
root nodes.
```

`pages/index.vue`'s scoped-style marker cascades into `FrameDialog` → `AnimatePresence` →
`TransitionGroup`, and `TransitionGroup` renders a `Fragment` because `motion-v` passes
`tag: undefined` when no `as` prop is set. Nothing is mis-styled — the marker belonged to
a wrapper element that does not exist. Silence it with `<AnimatePresence as="div">` at the
cost of one extra wrapper element.

**Locally uploaded images do not survive a reload.** Their `src` is a `blob:` object URL
that is revoked when the page unloads. The record and its metadata persist; the pixels do
not. Upload to Cloudinary if you want the images to persist.

**localStorage is small.** ~5 MB per origin, counted in UTF-16 code units, while a single
upload may be up to 25 MB — so a handful of large local uploads will exhaust it. The
adapter surfaces quota errors with a human-readable message. Private/incognito Safari and
locked-down webviews block storage entirely; frames can still be browsed, just not saved.

---
