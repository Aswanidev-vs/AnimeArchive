/**
 * Nuxt configuration - Anime Archive (frame archive)
 *
 * DIRECTORY CONVENTION DECISION (final, documented):
 * ---------------------------------------------------------------------------
 * This project uses ROOT-LEVEL source directories (srcDir: '.'), NOT Nuxt 4's
 * default `app/` directory convention.
 *
 * Why:
 *  1. The repository was pre-seeded with empty root-level `pages/`,
 *     `components/{app,gallery,upload}/`, `composables/`, `services/storage/`,
 *     `assets/css/`, `fixtures/` and `public/` directories. Those paths match
 *     the plan handed to every teammate, so keeping them avoids forcing a path
 *     change on all downstream (Wave 2) tasks.
 *  2. An EMPTY root-level `app/` directory previously existed. In Nuxt 4 the
 *     presence of `app/` makes the framework resolve srcDir to `app/`, so a
 *     root-level `pages/` would be silently ignored and the app would render
 *     with zero routes. That empty, ambiguous `app/` directory was therefore
 *     DELETED, and `srcDir` is pinned explicitly below so the resolution can
 *     never be guessed by the framework again.
 *  3. `dir.*` keys are spelled out explicitly (rather than left to defaults)
 *     so that adding a stray directory can never silently move the source root.
 *
 * Therefore: `app.vue` lives at the project ROOT and all source folders are
 * relative to the project root.
 * ---------------------------------------------------------------------------
 */
export default defineNuxtConfig({
  compatibilityDate: '2025-01-01',

  // Explicitly pin the root-level convention described above.
  srcDir: '.',
  dir: {
    app: '.',
    pages: 'pages',
    layouts: 'layouts',
    middleware: 'middleware',
    plugins: 'plugins',
    public: 'public',
    assets: 'assets',
  },

  ssr: true,
  devtools: { enabled: false },

  // DEV-STARTUP PROFILE (measured with Nuxt's own perf profiler):
  // `builder:watch` accounted for ~3.3s of an ~11.6s dev boot - the largest
  // phase after the Vite/Nitro bundle itself.
  //
  // Why: this project pins `srcDir` to the project root (see the header note),
  // and Nuxt picks `chokidar-granular` whenever `srcDir === rootDir`. That
  // watcher starts its top-level handles with `ignoreInitial: false` and
  // `depth: 0`, so every entry in the project root (`assets`, `components`,
  // `dist`, `node_modules`, the vendored `.mimocode`, ...) immediately emits an
  // `addDir` event. Each one goes through Nuxt's `builder:watch` hook, which
  // calls `invalidateAppStructure` + a full re-generation of the app templates
  // and types - at boot, before the dev server is even listening.
  //
  // `builder` hands `builder:watch` to the Vite dev server's existing chokidar
  // watcher instead of starting a second one
  // (`@nuxt/vite-builder` `setupWatcher`). That watcher already carries
  // `isIgnored` + the node_modules filter and only reports real changes, so the
  // boot-time event burst is gone and one less watcher runs for the whole
  // session. Nuxt makes this the default at `future.compatibilityVersion: 5`.
  //
  // `parcel` was measured against this and lost - see the note at the bottom.
  experimental: {
    watcher: 'builder',
  },

  // Nuxt's own default ignore list covers `.nuxt`, `.output`, `.git` and the
  // analyze dir, but not the two directories that only exist in this working
  // copy: `.mimocode` (a vendored toolchain that ships its own node_modules)
  // and `dist` (a Windows junction pointing at `.output/public`). Both were
  // therefore walked and watched as application source - `dist` even made the
  // file scanners visit the same build output twice.
  ignore: ['**/.mimocode', '**/.mimocode/**', '**/dist', '**/dist/**'],

  /*
   * WHY NOT `experimental.watcher: 'parcel'` (decided by measurement)
   * ------------------------------------------------------------------
   * Nuxt's docs list `parcel` as the option that "boosts performance in large
   * projects or on Windows", so it was tried head to head. `@parcel/watcher` is
   * kept in devDependencies so the option stays usable (Nuxt only declares it
   * as an OPTIONAL peer dep, which means `watcher: 'parcel'` silently degrades
   * to `chokidar-granular` - the slowest mode - when it is not installed).
   *
   * Interleaved A/B, cold `node_modules/.cache` + `.nuxt` before every run,
   * 3 pairs, parcel first in each pair (no `B1015` diagnostic in any parcel
   * run, i.e. it really was active, never a fallback):
   *
   *   pair   parcel    builder
   *   1      66.24s    47.28s     <- machine throttled, both inflated
   *   2      15.01s     8.26s
   *   3       7.71s     7.67s
   *
   * `builder` wins or ties every pair, so `parcel` is strictly extra cost here:
   * `createParcelWatcher()` opens ANOTHER watcher on the app root while Vite's
   * chokidar watcher keeps running anyway, whereas `builder` adds none. That
   * trade only pays off once a file tree is large enough for chokidar's
   * per-directory handles to dominate - this repo has ~15 source files.
   *
   * `watcher` is dev-only: nuxt/dist/index.mjs:8169 guards both
   * `builder.setupWatcher()` and `watch$1()` with `if (nuxt.options.dev)`, so
   * `nuxt build` / `nuxt generate` are unaffected (verified: build + preview).
   */

  features: {
    // Nuxt inlines the CSS of SSR-rendered components into the HTML and then
    // strips it from the client CSS bundle. This app renders its gallery
    // CLIENT-side only (frames live in localStorage, the server always sees an
    // empty list), so FrameCard, GalleryGrid, EmptyState and FrameDialog are
    // never part of the SSR pass - with inlining on, their styles are shipped
    // in neither the HTML nor the CSS bundle, leaving unstyled cards once
    // hydration loads the frames. Verified by grepping the `nuxt generate`
    // output for `frame__figure` / `empty__mark` / `dialog__panel`.
    inlineStyles: false,
  },

  css: ['~/assets/css/tokens.css', '~/assets/css/base.css'],

  modules: [],

  app: {
    head: {
      htmlAttrs: { lang: 'en' },
      title: 'Anime Archive - Frame Archive',
      meta: [
        { charset: 'utf-8' },
        {
          name: 'description',
          content:
            'Anime Archive is a personal frame archive: browse, search and favorite still frames from your collection, with optional Cloudinary-backed uploads.',
        },
        {
          name: 'viewport',
          content: 'width=device-width, initial-scale=1, viewport-fit=cover',
        },
      ],
      // Fonts over CDN: preconnect shaves DNS+TLS off the critical path, and
      // css2 with display=swap serves unicode-range-sliced Japanese subsets so
      // browsers only fetch the glyph chunks actually used (hybrid approach:
      // JS libs bundled + tree-shaken, static fonts served from Google's CDN).
      link: [
        { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
        { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
        {
          rel: 'stylesheet',
          href: 'https://fonts.googleapis.com/css2?family=Shippori+Mincho+B1:wght@500;600;700;800&family=Zen+Kaku+Gothic+New:wght@400;500;700&display=swap',
        },
        // Site mark: the torii/hinomaru emblem (source artwork: image-1.png at
        // the project root). `scripts/build-logo.ps1` measures the emblem's ring
        // and cuts it to a transparent disc, so these are all the same disc at
        // different sizes. `favicon.ico` exists because browsers still request
        // /favicon.ico even when a <link rel="icon"> is set.
        { rel: 'icon', href: '/favicon.ico', sizes: '32x32' },
        { rel: 'icon', type: 'image/png', sizes: '64x64', href: '/favicon.png' },
        { rel: 'apple-touch-icon', sizes: '180x180', href: '/apple-touch-icon.png' },
      ],
    },
  },

  // Cloudinary credentials are read from env vars and default to EMPTY strings.
  // Never hardcode secrets here. Override at build/run time with:
  //   NUXT_PUBLIC_CLOUDINARY_CLOUD_NAME
  //   NUXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET
  //   NUXT_PUBLIC_CLOUDINARY_FOLDER
  runtimeConfig: {
    public: {
      cloudinary: {
        cloudName: '',
        uploadPreset: '',
        folder: 'anime-archive',
      },
    },
  },
})
