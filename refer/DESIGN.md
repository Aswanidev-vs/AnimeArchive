# Anime Archive — Redesign Blueprint

> Spec for the standalone `refer/` UI. Brand-side: it describes the world the
> interface lives in, not just this build. The Nuxt app in `../` remains the
> source of truth; this folder is a self-contained proposal you can open by
> double-clicking `index.html`.

---

## 1. Objective

Turn "Anime Archive" from *a gallery of image cards* into **a darkroom wall you
can actually work in**.

The current app asks the user to admire 9 rectangles. This redesign asks the
user to **find one frame they half-remember** and to **correct the record** when
they got the episode number wrong. Everything below serves those two acts.

Success looks like:

- A user can locate a specific frame in under three seconds, by typing three
  characters of a title, an episode, or a tag.
- A user can fix a typo in a title, or remove a frame they regret, **without
  losing their place in the wall**.
- A user is never lied to about where their images are.

**Out of scope, deliberately:** accounts, sharing, sync, multi-user, a backend,
Cloudinary, a build step, a framework, TypeScript. `refer/` is a static
reference implementation. Anything requiring a server is a different document.

---

## 2. Product Context

**Product.** A single-user, local-only archive of *frames* — stills grabbed from
anime. Each frame carries a title, the series it came from, an episode label, a
timecode, tags, a free note, an intrinsic size, and a starred flag.

**The user.** One person, on their own machine, revisiting a personal collection.
Not browsing a catalogue — *re-reading their own notes*. This is the single most
important fact in this document: the user is **looking for something they already
half-own**, not discovering anything. The interface should feel like opening a
drawer, not like shopping.

**Ideologies preserved from the existing app** (these are load-bearing, not
decoration):

| Ideology | How it survives |
| --- | --- |
| "Title Sequence" edition — cinema, not a media library | Accession numbers, timecode burn-in, film-perforation footer, clapperboard shortcut sheet, 縦書き rail text |
| Night sky shell, ink-navy | Same `--wall-*` family, deepened |
| Woodblock print / hanko seal lineage | The seal, the angular `--cut` notches, near-square radii, halftone, the stamp on confirmation |
| Near-square, never pill | `--radius-frame: 2px`. Nothing in this spec is round |
| **Local-first, no server, no account** | Stated in the footer, in the upload flow, and on the storage meter. The UI never implies a cloud |
| Archive/curator language | "The wall", "on the wall", "accession", "the slate", "the press" |
| Literal, non-marketing copy | No "unleash", no "journey", no "seamlessly" |
| Bilingual micro-copy | Kanji as *labels*, never as decoration: 記録, 詳細, 推し, 録, 以上 |
| Token-driven | Every visual value is a CSS custom property in `css/tokens.css` |

**What is deliberately broken from the current app** — each of these is a
verified defect in the existing implementation, not a taste call:

1. **No edit. No delete.** A typo'd title is permanent. `FrameStorageAdapter`
   exposes `update()` and `remove()`; the UI uses neither.
2. **Filter state is lost** on every navigation, and cannot be linked to.
3. **Sort counts as a filter**, so a "Reset" button appears when nothing is
   filtered — and resetting reverts the sort the user just chose.
4. **Three names for one concept** — "Starred" (masthead), "Star" (dialog),
   "Favorites" (toolbar). Plus three different words in the ARIA labels.
5. **The star is hover-only**, so it is invisible to touch users and to keyboard
   users until focused.
6. **No `F` key**, despite starring being a primary action.
7. **Lightbox keys are bound to a non-focusable `<div>`** — it works by accident
   (focus lands on the close button and events bubble), and will swallow
   keystrokes the moment an input is added inside.
8. **The loupe caps at 62vh with no zoom**, while the cursor promises `zoom-in`.
9. **The progress bar is theatre** — the local adapter fires exactly one 100%
   tick, so the bar shows 0% then 100% and the "Archiving…" state may never paint.
10. **Silent image downgrade** — files over 400 KB are replaced by a generated
    SVG placeholder *without telling the user*, and the pixels do not survive a
    reload. This is the most dishonest thing in the current app.
11. **Session-only detection is a substring match on the note**, so the dialog
    tests for adapter wording that doesn't match what's actually stored.
12. **Validation is one string above the preview** — no `aria-invalid`, no
    `aria-describedby`, and native `required` popups can pre-empt the custom copy.
13. **Two different empty-state visual languages** — a paper panel and a dark box.
14. **The count line duplicates the masthead chips** and announces via
    `role="status"` on *every keystroke*.
15. **Header tagline duplicates the masthead kicker.**
16. **Dialog omits the dimensions** it stores.
17. **Uniform grid on ragged cells** — `aspect-ratio: auto` inside a fixed
    `auto-fill` grid produces a wall with holes in it.
18. **No `srcset`/`sizes`** — lazy full-size images, 9 × ~230 KB and growing.
19. **Two divergent `Frame` shapes** in the codebase (storage vs fixtures:
    `series`/`anime`, `alt`/`note`, `addedAt`/`capturedAt`). This redesign has
    exactly one.

---

## 3. Visual Foundations

### 3.1 Concept — "The Darkroom Wall"

The organising idea is a **contact sheet in a darkroom**, not a neon anime app.

Frames are **mounted prints** pinned to a dark wall: each sits on a slightly
lighter paper plate with a hairline edge, carries an **accession number**
stamped in typewriter type, and lifts under a **raking lamplight** when you point
at it. The detail view is a **loupe** — you lift the print off the wall and
inspect it beside its **slate**, the label you'd find on a film can.

This is a deliberate move *away* from purple-blue neon glow and glassmorphism.
The palette gets darker and warmer; the accents get fewer and each one is given
exactly one job.

### 3.2 Colour

```css
/* Ground — the darkroom */
--wall-950: #070911;   /* page ground, the darkest value */
--wall-900: #0d1120;   /* panels, header glass */
--wall-800: #151b2e;   /* raised plates */
--wall-700: #222a42;   /* hairlines, borders */
--wall-600: #313b58;   /* disabled ink */

/* Paper — the physical stuff */
--paper-100: #f4efe4;  /* mount board, primary ink on dark */
--paper-200: #d6cfbe;  /* secondary ink, rules */
--paper-300: #9d9686;  /* tertiary ink, timestamps */
--ink-900:  #070911;   /* ink on paper */

/* Signal — three accents, three jobs, no more */
--sakura: #ff5d8f;     /* JOB: the collection's heartbeat — starred state, primary action */
--neon:   #5fd2f0;     /* JOB: the machine — focus rings, active filters, data, progress */
--sunset: #ffb347;     /* JOB: the lamp + the warning — raking light, not-durable notices */
```

**The three-job rule.** Each accent has exactly one meaning and is never
reused for decoration. If a new screen needs a fourth colour, that is a signal
the screen is doing two things.

**Lamp discipline.** The raking light on hover is **amber** (`--sunset`), never
white. A darkroom lamp is a warm sodium source; a white highlight would read as
a generic web hover and break the metaphor.

Contrast (all against `--wall-950` / `--wall-900`):

| Pair | Ratio | Verdict |
| --- | --- | --- |
| `--paper-100` on `--wall-950` | 16.4:1 | AAA |
| `--paper-300` on `--wall-900` | 6.2:1 | AA at all sizes |
| `--sakura` on `--wall-950` | 6.8:1 | AA at all sizes |
| `--neon` on `--wall-950` | 10.7:1 | AAA |
| `--sunset` on `--wall-950` | 10.0:1 | AAA |
| `--ink-900` on `--paper-100` | 16.4:1 | AAA (slate, stamps, plates) |

**Surface treatments** (no gradient hero anywhere in this build):

- **Grain** — inline SVG `feTurbulence`, `opacity: .05`, `mix-blend-mode: overlay`,
  fixed full-viewport, `aria-hidden`. Unchanged from the source app.
- **Halftone horizon** — 10 px dot grid, `rgba(246,241,231,.05)`, masked
  `linear-gradient(to top, #000, transparent)`, 34 vh at the foot of the page.
- **集中線 speed-lines** — `repeating-conic-gradient` from 210°, masked to a
  radial ellipse. Decorates the masthead rail and the empty state only.
- **Raking light** — `radial-gradient` positioned at `var(--mx) var(--my)`,
  amber, `0 → 14%` peak, `pointer-events: none`, `aria-hidden`. The pointer
  writes two custom properties; CSS does the rest. No per-frame JS.

### 3.3 Type

Three registers, and the split is **semantic, not decorative**.

| Register | Face | Weights | Carries |
| --- | --- | --- | --- |
| **Display** | `Shippori Mincho B1` | 500, 600, 700 | Title cards, frame titles, the masthead. Human, curated, literary |
| **Body** | `Zen Kaku Gothic New` | 400, 500, 700 | Notes, descriptions, prose |
| **Lab** | `Courier Prime` | 400, 700 | Accession numbers, timecodes, field numbers, the slate, the storage meter, shortcuts. Machine record |

```css
--font-display: 'Shippori Mincho B1', 'Hiragino Mincho ProN', 'Yu Mincho', serif;
--font-body:    'Zen Kaku Gothic New', 'Hiragino Kaku Gothic ProN', 'Segoe UI', system-ui, sans-serif;
--font-lab:     'Courier Prime', 'SFMono-Regular', Menlo, Consolas, monospace;
```

`Shippori Mincho B1` and `Zen Kaku Gothic New` are **retained from the source
app** — they are the brand's typeface, and changing them would break the stated
ideology. `Courier Prime` is **new**, and it is the overhaul's typographic
signature: the current app uses the OS mono, which is anonymous. A typewriter
face is the voice of production paperwork — a slate, a camera report, a
catalogue card. It is also the clearest possible rejection of the
Inter-plus-Inter-tight default.

**The scale is unchanged** and stays contractual, per the source repo's own
note: `--step-1…8` = `12, 14, 16, 18, 24, 32, 48, 72px`.
`--step-1` (12px) is the floor. Nothing smaller is permitted.

**Lab-register treatment:** `text-transform: uppercase; letter-spacing: .14em;
font-weight: 700`. Kanji labels: `Shippori Mincho B1`, `letter-spacing: .35em`.

### 3.4 Space & shape

- **Spacing:** unchanged, `--space-1…10` = `4, 8, 12, 16, 24, 32, 48, 64, 96, 128px`.
- **Radii:** `--radius-frame: 2px`, `--radius-plate: 3px`. Nothing is ever a pill,
  never `16px`, never a circle. (The seal is a disc because a *hanko* is a disc —
  that is the one exception and it is load-bearing.)
- **Notches:** `--cut: 14px`, `--cut-lg: 22px`, applied as `clip-path` polygons.
  Used on the primary action and the confirmation stamp only — a notch on every
  element would be wallpaper, not a signature.
- **Hairlines:** 1px `--wall-700`. Divided lines are `--wall-700`; *rules on
  paper* are `rgba(7,9,17,.16)`. The same 1px means "physical edge" in both worlds.

### 3.5 Elevation

Three levels, and they read as *distance from the wall*, not as blur:

| Level | Meaning | Treatment |
| --- | --- | --- |
| 0 | Flat against the wall | `--wall-900`, 1px `--wall-700` |
| 1 | Mounted on the wall | `--wall-800` plate + `0 1px 0 rgba(244,239,228,.04)` top highlight |
| 2 | Lifted by hand (hover) | Level 1 + `translateY(-3px)` + `0 14px 30px -12px rgba(0,0,0,.7)` |

The top highlight in level 1 is a **1px inset light line** — it is what makes a
surface read as a physical board rather than a div.

### 3.6 Motion

| Token | Value | Used by |
| --- | --- | --- |
| `--ease-frame` | `cubic-bezier(.2,.8,.2,1)` | Hover, colour, border |
| `--ease-snap` | `cubic-bezier(.16,1,.3,1)` | The stamp, the FLIP loupe |
| `--dur-fast` / `--dur-base` / `--dur-slow` | `150` / `220` / `320ms` | — |
| `--dur-reveal` | `650ms` | Card mount-in |

**Keyframes** — the source app's vocabulary is preserved and extended, not
replaced: `glint`, `star-pop`, `scan-y`, `stamp-in`, `twinkle` all carry over
with their original behaviour.

Added:

- `mount-in` — the card reveal. `opacity 0, translateY(10px) scale(.985)` →
  rest, `--dur-reveal --ease-snap`.
- `raking` — the amber lamp bloom, 700ms, fired on pointer-enter.
- `paper-lift` — the mount's top highlight brightening on hover.

**Two JS-driven motions**, both gated on `prefers-reduced-motion`:

- **The FLIP loupe.** Opening the detail view animates the clicked card's image
  from its exact on-wall rect into the loupe's rect; closing plays it in reverse.
  This is the single memorable moment of the interface and the reason the app
  should feel physical.
- **The stamp.** `stamp-in` — `rotate(-6deg) scale(1.6)` → `scale(.94)` → rest.

**The stagger is real.** The source app clamps its reveal delay at index 5, so a
40-frame wall reveals in six batches. Here the delay is `min(index, 8) * 45ms` —
enough to read as a cascade, capped so the last card is never more than 360 ms
behind the first.

### 3.7 The four signature moves

1. **Mounted prints.** Image inset on a paper plate with an accession number
   stamped in typewriter type. Not a card with a caption; a print on a mount.
2. **Raking lamplight.** Pointer-tracked amber bloom plus a 3 px lift.
3. **The FLIP loupe.** The frame physically comes off the wall.
4. **The slate.** The detail panel is a film-can label: ruled, monospace,
   accession number at 24px, and **editable in place**.

---

## 4. Accessibility

These are floors, not aspirations. A build that violates them is wrong.

- **Focus** — `:focus-visible { outline: 2px solid var(--neon); outline-offset:
  2px; }` on every interactive element. Never removed, never replaced by a
  `box-shadow` the user cannot see in forced-colors mode.
- **Skip link** — "Skip to the wall" → `#wall`, visually hidden until focused.
- **Loupe** — `role="dialog"`, `aria-modal="true"`, `aria-labelledby` pointing
  at the title. Focus moves to the close button on open, is **trapped** by a
  real `Tab` cycle handler, and **restored** to the originating card on close.
  The background gets `inert`. *The source app binds keys to a non-focusable
  `<div>`; this binds to the dialog itself and honours `Tab` inside inputs.*
- **Keyboard map** (documented in the in-app clapperboard, `?`):

  | Key | Action | Scope |
  | --- | --- | --- |
  | `/` | Focus search | Wall |
  | `Esc` | Close loupe / clear search | Both |
  | `←` `→` | Previous / next frame | Loupe |
  | `F` | Toggle starred | Loupe |
  | `E` | Edit in the loupe | Loupe |
  | `Del` | Remove (with confirm) | Loupe |
  | `+` `−` `0` | Zoom in / out / fit | Loupe |
  | `?` | Shortcuts | Global |

- **Live regions** — the result count is `aria-live="polite"` but **debounced to
  400 ms**, so it does not announce on every keystroke. Errors are `role="alert"`.
- **Every star** is `<button aria-pressed>` with a label naming the frame:
  `Star AA-004 Rain on the crossing`. One word, everywhere: **starred**.
- **Form errors are field-scoped** — `aria-invalid="true"` plus
  `aria-describedby` pointing at the message rendered directly beneath that
  field. `novalidate` on the form so the browser's bubble cannot pre-empt the
  custom copy.
- **Disabled submit states explain themselves.** The primary action is never
  disabled without adjacent text saying why (`Choose a frame to continue`).
- **Touch** — every hover-revealed control is permanently visible at
  `(hover: none)`. The star is **always visible**, not hover-gated.
- **`prefers-reduced-motion`** — a global block zeroes all animation and
  transition durations, and the FLIP transition and loupe zoom both check
  `matchMedia('(prefers-reduced-motion: reduce)')` before animating.
- **Decorative layers** (`grain`, `halftone`, `speed-lines`, stars, lamp) are
  `aria-hidden="true"` and `pointer-events: none`.
- **Images** — every `<img>` carries real `alt` prose (the source fixtures ship
  good `alt` text; it is preserved verbatim). `loading="lazy"` +
  `decoding="async"` + `width`/`height` on every non-hero image, so CLS is zero.
  `srcset`/`sizes` serve a 480w and a 960w cut.
- **Colour is never the only signal** — starred frames get a star glyph *and* a
  grease-pencil ring *and* `aria-pressed`, not just pink.

---

## 5. Voice & Tone

The register is a **film lab's paperwork**: precise, unembellished, slightly
archaic where the metaphor earns it. It is never a marketing page.

**Bilingual pattern.** Kanji is a **label or a chapter mark**, never a
translation of the sentence next to it. `記録` sits above "The wall" as a
category, not a gloss. The kana `推し` appears once, on the starred filter.

**Voice rules:**

- Second person, present tense, short. "Choose a still." not "Let's get started!"
- Describe the *object*, not the *feeling*. "9 frames, 3 series, 2 starred."
- State consequences plainly, including unflattering ones: "The pixels of this
  frame will not survive a reload." Never bury it in a tooltip.
- The archive speaks about itself as an archive: accession numbers, the wall,
  the slate, the press.
- No emoji. Kanji and the torii seal are the entire iconographic vocabulary.

**Copy bank:**

| Context | Copy |
| --- | --- |
| Masthead | `The wall` · kicker `Private frame collection` |
| Empty (no frames) | "The wall is bare." / "Nothing has been archived yet. Add the first frame to start the collection." |
| Empty (no matches) | "Nothing on the wall matches." / "No frames match the search and filters. Loosen them and look again." |
| Load | "Hanging the frames…" |
| Error | "The archive could not be read." / "Try again" |
| Loupe eyebrow | `詳細` / "Frame detail" |
| Starred filter | `Starred` / 推し |
| Upload confirm | `録` / "Frame archived" / "'{title}' is now on the wall, in this browser." |
| Footer | "Stored in this browser only. Nothing is shared, synced, or uploaded." |
| Not durable | "This frame's pixels will not survive a reload." |
| Foot of page | `以上` / "End of episode" |

---

## 6. Implementation Practices

**Stack.** Vanilla HTML + CSS + modern JavaScript (async/await, optional
chaining, Web Animations — no transpilation). No framework, no build step, no
dependencies beyond three Google Fonts. `refer/` opens from `file://` by
double-clicking `index.html` — which is a hard constraint, and it dictates the
next point.

- **No ES modules.** `file://` blocks `import` under CORS. Scripts are classic
  `<script>` tags in dependency order, each an IIFE attaching to a single global
  `AA` namespace. This is the one place where idiom is sacrificed to the
  double-click requirement, and the reason is recorded in the code.

**Files.**

```
refer/
├── index.html          the DOM contract — every id and class lives here
├── DESIGN.md           this document
├── css/
│   ├── tokens.css      the whole visual system, as custom properties
│   ├── base.css        reset, globals, keyframes, a11y
│   ├── shell.css       darkroom ground, header, footer, overlays
│   ├── wall.css        toolbar, chips, masonry, mounted cards, states
│   └── catalog.css     the press, the slate, the loupe
├── js/
│   ├── store.js        Frame model, localStorage adapter, fixtures, quota policy
│   ├── wall.js         render, filter, sort, chip state, URL sync, card mount
│   ├── lightbox.js     the loupe: FLIP, zoom/pan, keyboard, edit, delete
│   ├── catalog.js      the press: dropzone, preview, validation, progress
│   └── app.js          bootstrap, view routing, global shortcuts, storage meter
└── assets/
    ├── logo.png
    └── frames/         the 9 demo stills
```

**Data.** One `Frame` shape, replacing the source app's two divergent ones:

```js
{ id, accession, title, series, episode, timecode, tags: [],
  note, starred, width, height, src, durable, addedAt, source }
```

`durable` is a **real boolean the UI branches on**. The source app inferred
durability by substring-matching the note for adapter wording that didn't match
what was stored. Here it is set at write time and displayed.

**Storage policy — and this is the important fix.** The source app silently
replaces any file over 400 KB with a generated SVG placeholder. Here:

1. Draw the source to a canvas, downscale to max 1920 px on the long edge.
2. Encode as JPEG q0.82. If still over budget, step quality down and re-encode
   (q0.72, q0.62) and shrink the long edge by 15% each round.
3. If it still won't fit the remaining budget, store the **metadata plus a
   visible placeholder** — and say so, in the upload form and on the frame
   itself, with a `--sunset` "lamp" badge. No silent downgrade, ever.
4. A quota-exceeded write is caught, and reported as a human sentence, not a
   `QuotaExceededError`.

The consequence worth stating: **local uploads now survive a reload** for
anything under roughly 1.2 MB after downscaling. That is a real improvement on
the source app's documented "Known issues".

**URL state.** `?q=&series=&star=1&sort=&view=` is synced with
`history.replaceState` on change and read on load, so filters are linkable and
survive Back. Sort alone never shows the "Reset" control — that is the source
app's bug, fixed by separating *filters* from *ordering* in the state object.

**Rendering.** Cards are built with `DocumentFragment` + a single
`replaceChildren`, never by string concatenation into `innerHTML` (which is both
a correctness hazard and an XSS risk for user-authored titles and notes). No
virtualisation — nine frames does not need it, and a 200-frame archive is still
only a few hundred nodes.

**CSS.** Container queries for the cards, `@property`-free, one custom property
per design decision. All theming flows through `tokens.css`; the source app's
rule stands — *change the token, not the component*.

---

## 7. Anti-Patterns

Banned outright in this build:

| Pattern | Why |
| --- | --- |
| Purple/blue gradient hero with white sans | The exact AI median. The masthead is a rail and a wordmark, not a hero |
| `rounded-16px` + `box-shadow-sm` card grid ×6 | Cards are 2px-radius plates on a wall |
| Emoji as decoration | Kanji and the seal only |
| Three floating stat cards ("47% YoY") | Counts are one quiet line: `9 frames · 3 series · 2 starred` |
| Every action a filled primary button | Primary is one button per screen. Destructive is outlined and `--sunset`-bordered |
| Isometric 3D illustration | Not in a darkroom |
| Glassmorphism on everything | Glass is for the sticky header only, because the wall is behind it |
| Copy that says nothing | See §5 |
| Em-dash overuse | The source app's copy is fine; this one holds the same line |
| Hidden affordances | The star is always visible. Nothing important is hover-only |
| Silent failure | Every degradation is surfaced in the UI |

**Deliberate breaks**, documented so they don't read as mistakes:

- **No skeleton loaders.** The source app shows a text line. For a 9-frame
  local array the load is sub-millisecond; a skeleton would be a lie about
  latency. The text line remains, for the one case where it matters.
- **The header tagline is deleted**, not restyled — it duplicated the masthead
  kicker verbatim.
- **The count line is deleted**, replaced by the active-filter chips, which
  carry counts that were never shown before.

---

## 8. Decision-Making

Tie-breaks, in priority order:

1. **Honesty over polish.** If a pixel lies about where the data is, the pixel
   goes.
2. **Reachability over delight.** Every primary flow must complete on the
   keyboard alone. If a flourish blocks that, it is cut.
3. **The metaphor earns its cost.** The darkroom concept is allowed to be
   *slightly* less convenient than a plain grid — but only where the physical
   reading is what makes the state legible (the mount, the lamp, the slate).
4. **One accent, one job.** New colour is a bug.
5. **Prefer the smaller diff** when two options are otherwise equal.

---

## 9. Workflow

1. Build the spine: `index.html` (the DOM contract) → `tokens.css` → `base.css`
   → `store.js`. Every id and class is fixed here, before any leaf module.
2. Build leaves against that contract: `wall.js` ‖ `lightbox.js` ‖ `catalog.js`
   ‖ `wall.css` + `catalog.css`.
3. Wire `app.js`: bootstrap, view routing, global shortcuts, storage meter.
4. **Verify in a real browser** at three widths (1440 / 900 / 390) and run the
   golden path plus the keyboard-only path. Static reasoning is not verification.
5. Anti-slop pass against §7, then a scope-discipline pass — no dead code, no
   speculative abstraction, no unrequested features.
