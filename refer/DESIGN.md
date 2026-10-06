# Anime Archive — `refer/` static UI redesign

A standalone, framework-free redesign of the Anime Archive website (Nuxt 4 app at
the repository root). **It is a reference, not part of the app**: nothing here is
imported by Nuxt, and the Nuxt build ignores this folder.

## Run it

```bash
# easiest: open directly (no build, no server needed)
start G:\Bookmarker\AnimeArchive\refer\index.html

# or serve the folder
npx serve G:\Bookmarker\AnimeArchive\refer
```

Pages: `index.html` (the wall / gallery) · `upload.html` (catalog flow).
Fonts load from Google Fonts; offline, the stacks fall back to system
serif/sans/mono and the layout is unaffected.

---

## 1. What was analysed

| Area | Sources |
| --- | --- |
| App shell | `app.vue`, `layouts/default.vue`, `nuxt.config.ts`, `components/app/*` |
| Gallery | `pages/index.vue`, `components/gallery/*` (FrameCard, GalleryGrid, GalleryToolbar, FrameDialog, EmptyState) |
| Upload | `pages/upload.vue`, `components/upload/*` (Dropzone, Preview, Form) |
| State | `composables/useFrames.ts`, `composables/useUpload.ts` |
| Storage | `services/storage/{types,localAdapter,cloudinaryAdapter}.ts` |
| Design system | `assets/css/tokens.css`, `assets/css/base.css`, `README.md` |
| Data | `fixtures/frames.ts` (9 demo frames), `public/frames/*` |

### Findings that drove this redesign (evidence-based)

1. **Star buttons are hover-only** (`FrameCard.vue`: `.frame__fav { opacity: 0 }`
   until `.frame:hover`) — unreachable on touch devices.
2. **No active-filter summary.** Filters exist, but there is no chip/summary row;
   the Reset button appears/disappears, causing layout shift.
3. **Lightbox index drift.** `FrameDialog` is driven by an *index* into
   `filteredFrames`; re-filtering while it is open silently changes the frame shown.
4. **No counter, no announcements, no deep links** in the dialog: arrow-stepping
   changes content without any live region, and frames cannot be linked/shared.
5. **`role="search"` wraps sort/favourites controls**, which are not search.
6. **Stored data is never surfaced.** `capturedAt`, `createdAt`, `source`, and the
   fixtures' `character` field are persisted (or available) but rendered nowhere
   (fixtures' `character` is actually *dropped* during adapter mapping).
7. **Three parallel state-panel languages** (dashed neon loading/error boxes vs
   manga-paper empty state vs CTA styles) with contrast floors below WCAG AA
   (paper text at `opacity: .45–.6`).
8. **Upload has no per-field validation** — one global error string, native
   `required` bypassed silently by JS checks, no focus management.
9. **No way to change the chosen file** after selection (dropzone disappears);
   file name/size are never shown; the 25 MB limit is stated but never reconciled
   with the actual file.
10. **The progress bar lies locally** — `localAdapter.create()` emits a single
    100 % tick, so the bar jumps from "Preparing" to done.
11. **Success panel is not announced** (no `role="status"`, no focus move).
12. **>400 KB uploads degrade to an SVG placeholder**, so the picture you picked
    is not the picture you get after reload — honest, but avoidable (see §5).

---

## 2. Design direction — "Frame Registry"

The wall is treated as a **film-archive registry**: every print carries an
accession number, metadata reads like a lab ledger, and the lightbox is a
projection booth with a filmstrip.

**Kept from the app (brand contract):** every token in `tokens.css` keeps its
name and value — `--wall-950/900/800`, `--paper-*`, `--sakura #ff5d8f`,
`--neon #59e0ff`, `--sunset #ffb347`, `--radius-frame: 2px` (never pill),
`--cut/--cut-lg` notches, Shippori Mincho B1 + Zen Kaku Gothic New, the kanji
marks (記録, 推し, 録, 以上), grain, speed lines, perforation strip, hanko stamp.

**Added by this pass:**

| Token / motif | Purpose |
| --- | --- |
| `--font-data: IBM Plex Mono` | the *registry voice*: accession numbers (`AA-001`), timecodes, counters, uppercase micro-labels with 0.16em tracking |
| `--wall-1000`, `--panel`, `--lamp` | deeper ground, unified panel surface, raking-light hover |
| `--paper-dim` / `--ink-dim` | AA-contrast floors for muted text (replaces `opacity: .45`) |
| Dotted-leader **stat ledger** | Frames/Series/Starred as a tabular registry, not chips |
| **Film-edge strip** on cards | series (neon) + episode (sakura), like edge codes on 35 mm |
| **Filmstrip** in the lightbox | thumbnails of the *filtered* exhibition, active cell centred |
| Sprocket `perf` divider | between masthead and toolbar |
| Accession numbers | stable per record; shown on cards and in the dialog |


---

## 3. File map

```
refer/
├── index.html          the wall: masthead ledger, toolbar, chips, states, grid, lightbox
├── upload.html         catalog flow: dropzone, preview monitor, slate, write status, stamp
├── css/
│   ├── tokens.css      design tokens (app contract + additions above)
│   ├── base.css        reset, element defaults, shared keyframes, utilities, reduced motion
│   ├── shell.css       night sky, header, footer, button system
│   ├── gallery.css     ledger, toolbar, chips, state panels, contact-sheet cards, lightbox
│   └── upload.css      dropzone, monitor, filebar, slate form, write bar, hanko panel
├── js/
│   ├── data.js         unified frame model + the 9 fixture frames
│   ├── store.js        FrameStorageAdapter analogue over localStorage
│   ├── shell.js        DOM builder (XSS-safe), icons, formatters, nav/year boot
│   ├── gallery.js      filters, grid render, stars, lightbox, hash sync, keys
│   └── upload.js       file lifecycle, validation, tags, write status, confirmation
├── assets/             logo + favicon + frames/frame_001…009.png (self-contained)
└── DESIGN.md           this document
```

Classic `<script>` tags (an `AA` global, no ES modules) because `file://` blocks
module imports — the folder must open with double-click.

## 4. Data model

One vocabulary (the storage contract's), plus two honest additions:

```js
{
  id, title, anime, episode, character, timestamp, alt,
  tags: string[], note, favorite,
  width, height, src,
  capturedAt, createdAt, source,   // 'fixture' | 'local'
  durable: boolean                 // ADDITION: will `src` survive a reload?
}
```

- Fixtures map `series → anime`, keep `alt` as alt text (the app pours it into
  `note`), and keep `character` (the app drops it).
- **Storage key: `anime-archive.refer.v1`** — deliberately *not* the app's
  `anime-archive.frames.v1`, so the prototype can never corrupt real data.
  First read seeds the 9 demo frames and persists them (so stars survive).
- Search haystack: title, anime, episode, character, note, tags (the app omits
  `character`). Sort semantics are identical to `useFrames.ts`, with stable
  tie-breaks so undated fixtures keep wall order.

## 5. Upload durability pipeline (improvement over the app)

| Case | Result |
| --- | --- |
| file ≤ 400 KB | raw dataURL — survives reload, byte-identical |
| file > 400 KB | canvas re-encode (max 1600 px, JPEG 0.8→0.4, then 1024 px tier) until ≤ 400 KB — **the image persists** |
| re-encode impossible (e.g. huge GIF, canvas failure) | session-only `blob:` URL + `durable: false` + the honest note in the record + a warning badge in the dialog + a `SESSION ONLY` placeholder after reload |
| quota exceeded | human-readable rejection, shown inline; nothing is silently lost |

Validation matches the app: JPEG/PNG/WebP/GIF/AVIF, 25 MB max — but errors are
now **per-field**, focus moves to the first invalid control, and the chosen
file's name/size/dimensions are always visible with a **Change image** action.

## 6. Feature parity and deltas

**Parity:** search (title/series/episode/note/tags), series filter, starred-only,
4 sorts, reset, result count, empty/no-match states, lightbox with prev/next and
keyboard (Esc/←/→/Home/End), star toggling from card and dialog, dropzone with
drag + browse, live preview with dimensions, numbered form fields, hanko success
panel, localStorage persistence with fixture seeding, footer honesty copy.

**Additions:** filter chips, `/` to focus search, filmstrip navigation,
`#frame=<id>` deep links + Back-button support, live counter announcements,
focus trap + focus restore, storage meter, paste-to-upload, per-field errors,
change-file affordance, count-up stats, `character`/date metadata display,
dead-image fallback.

**Omitted on purpose:** Cloudinary (the reference is browser-local; the adapter
surface in `store.js` is where a remote implementation would plug in), edit/delete
inside the dialog (the source app has no delete either — noted as a candidate),
and tests (the Nuxt app's Vitest suite covers the components themselves).

## 7. Accessibility floor

- Landmarks: skip link, header/nav/main/footer, `role="search"` only on search.
- `aria-pressed` toggles, `aria-current` nav, `aria-required` + `aria-invalid` +
  `aria-describedby` on fields, `role="alert"` on errors, `role="status"` on
  counts/counter/success.
- 40–44 px minimum hit targets; star visible at 0.75 opacity without hover.
- Focus visible everywhere (`--focus-ring: --neon`), trapped in the dialog and
  restored to the opener on close.
- `prefers-reduced-motion` neutralises every keyframe and the count-ups.
- Decorative layers (`sky`, `speedlines`, `perf`, `grain`, `scan`) are
  `aria-hidden` and click-through.

## 8. Known limitations

- Google Fonts need network; offline falls back to system stacks (layout-safe).
- Session-only uploads show a placeholder after reload by design (honesty, not a
  bug) — re-select the file or shrink it below the encode threshold.
- The storage meter measures the JSON payload, not the browser's true quota
  (~5 MB per origin is an estimate, not a queried value).
- No automated browser test: verification is `node --check` on every script, an
  ID/asset cross-check between HTML and JS, and a happy-dom smoke run of both
  pages (see the task log).
