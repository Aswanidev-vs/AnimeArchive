/**
 * Local (browser) storage adapter - the DEFAULT adapter.
 *
 * WHAT THIS IS, HONESTLY
 * ---------------------------------------------------------------------------
 * Frames live in this browser's `localStorage` under the key below. Nothing is
 * uploaded, nothing is synced, and nothing is backed up. Clearing site data,
 * using a different browser/profile, or opening the site in private mode where
 * storage is blocked/evicted means the frames are gone. The UI must never
 * imply durability beyond that, so callers get `capabilities.remote === false`.
 *
 * OBJECT URLs DO NOT SURVIVE A RELOAD - NOT A BUG, A LIMIT
 * ---------------------------------------------------------------------------
 * A freshly uploaded file has no server to live on, so its only renderable
 * source is `URL.createObjectURL(file)`, which yields a `blob:` URL that is
 * invalidated when the document that created it goes away. Persisting that
 * string would guarantee a broken image on the next visit.
 *
 * So `create()` does this instead:
 *   1. always   - keeps the live `blob:` URL for the current session;
 *   2. <=400KB  - also stores a small dataURL thumbnail, which DOES survive a
 *                 reload (`MAX_INLINE_THUMB_BYTES`);
 *   3. >400KB   - substitutes a deterministic inline SVG placeholder so the
 *                 card still renders as an intentional archive entry rather
 *                 than a broken/empty <img>.
 * In cases 2 and 3 the honest per-frame `src` survives reload; in case 1 it
 * only lasts until the tab closes, which is exactly what the upload flow's
 * copy tells the visitor.
 *
 * SSR SAFETY
 * ---------------------------------------------------------------------------
 * Nuxt renders this app on the server, where `window`/`localStorage` do not
 * exist. `list()` and `get()` therefore resolve to [] / null instead of
 * throwing (a throw during render takes the whole page down). Mutating calls
 * reject with a descriptive error, because silently pretending to save on the
 * server would be worse than failing loudly.
 */

import { fixtureFrames } from '../../fixtures/frames'
import {
  createFrameId,
  type Frame,
  type FrameDraft,
  type FrameId,
  type FrameStorageAdapter,
  type FrameStorageCapabilities,
  type UploadProgress,
} from './types'

/** Versioned key: bump the suffix if the stored shape ever changes. */
export const LOCAL_STORAGE_KEY = 'anime-archive.frames.v1'

/**
 * Files at or below this size also get a durable dataURL thumbnail.
 * localStorage is ~5MB per origin and counts UTF-16 code units, so an inline
 * base64 copy of anything big would evict the whole archive. 400KB of JPEG-ish
 * bytes becomes ~533KB of base64 text, which is a sane ceiling.
 */
export const MAX_INLINE_THUMB_BYTES = 400 * 1024

/** Appended when a frame's `src` could not be made durable. */
export const SESSION_ONLY_SRC_NOTE =
  'Image shown from this session only - it is not stored and will not return after the page is reloaded.'

/**
 * Deterministic, dependency-free placeholder for a frame whose bytes cannot be
 * stored. It is an inline SVG data URI, so it renders as a real image (never a
 * broken icon) and needs no network request. Deterministic = same id always
 * produces the same baked-in caption, which keeps SSR and hydration identical.
 *
 * Colours mirror assets/css/tokens.css (night backdrop, sakura notch, sunset
 * warning text) and the SVG values are written inline because an <img> data URI
 * cannot inherit CSS custom properties.
 */
export function placeholderSrc(id: FrameId): string {
  const svg = [
    '<svg xmlns="http://www.w3.org/2000/svg" width="320" height="180" viewBox="0 0 320 180" role="img" aria-label="Frame image not stored">',
    '<defs><linearGradient id="a" x1="0" y1="0" x2="1" y2="1">',
    '<stop offset="0" stop-color="#1b2242"/><stop offset="1" stop-color="#0b0e1a"/>',
    '</linearGradient></defs>',
    '<rect width="320" height="180" fill="url(#a)"/>',
    '<rect x="8.5" y="8.5" width="303" height="163" fill="none" stroke="rgba(246,241,231,0.14)"/>',
    '<polygon points="311,8 311,32 287,8" fill="#ff5d8f"/>',
    '<text x="20" y="96" fill="#ffb347" font-family="monospace" font-size="12">NOT STORED</text>',
    `<text x="20" y="118" fill="#f6f1e7" font-family="monospace" font-size="11">${id}</text>`,
    '</svg>',
  ].join('')

  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
}

/** The nine bundled fixtures, mapped into the archive's own `Frame` vocabulary. */
function seedFrames(): Frame[] {
  return fixtureFrames.map((fixture) => ({
    id: fixture.id,
    title: fixture.title,
    // fixtures/frames.ts calls this field `series`; the storage contract calls
    // it `anime`. Mapping here keeps the fixture file untouched and gives the
    // UI a single field name to render.
    anime: fixture.series,
    episode: fixture.episode,
    timestamp: fixture.timestamp,
    tags: [...fixture.tags],
    // The fixture's `alt` text is the closest honest equivalent of a note; the
    // archive's note field is free-form and starts empty unless we seed it.
    note: fixture.alt,
    favorite: false,
    width: fixture.width,
    height: fixture.height,
    src: fixture.src,
    capturedAt: '',
    source: 'fixture',
  }))
}


/** True only where a real DOM with web storage exists (i.e. never during SSR). */
function hasWindow(): boolean {
  return typeof window !== 'undefined'
}

/**
 * Reach `localStorage` without ever touching it at module scope.
 *
 * Access is attempted only inside functions AND inside try/catch: Safari in
 * private mode throws on *read* of `window.localStorage`, and some embedded
 * webviews expose the property but throw on write. Both cases degrade to null
 * (read-only archive) instead of crashing the page.
 */
function storage(): Storage | null {
  if (!hasWindow()) {
    return null
  }

  try {
    return window.localStorage
  } catch {
    return null
  }
}

/** Read + validate the stored array. Never throws; unknown shapes yield []. */
function readStored(): Frame[] | null {
  const store = storage()
  if (!store) {
    return null
  }

  let raw: string | null = null
  try {
    raw = store.getItem(LOCAL_STORAGE_KEY)
  } catch {
    return null
  }

  // Absent key means "first run" - distinct from "stored empty archive", which
  // must NOT be re-seeded (see list()).
  if (raw === null) {
    return null
  }

  try {
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) {
      return []
    }
    return parsed.filter(isFrameLike).map(normaliseFrame)
  } catch {
    // Corrupt or partially-written JSON: treat as an empty archive rather than
    // throwing, but do not silently reseed over the user's bytes.
    return []
  }
}

/** Shape guard used when reading untrusted JSON back out of storage. */
function isFrameLike(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && typeof (value as { id?: unknown }).id === 'string'
}

/** Coerce a loosely-typed stored record into the strict `Frame` contract. */
function normaliseFrame(record: Record<string, unknown>): Frame {
  const tags: unknown = record.tags
  return {
    id: String(record.id),
    title: typeof record.title === 'string' ? record.title : '',
    anime: typeof record.anime === 'string' ? record.anime : '',
    episode: typeof record.episode === 'string' ? record.episode : '',
    timestamp: typeof record.timestamp === 'string' ? record.timestamp : '',
    tags: Array.isArray(tags) ? tags.filter((tag): tag is string => typeof tag === 'string') : [],
    note: typeof record.note === 'string' ? record.note : '',
    favorite: record.favorite === true,
    width: typeof record.width === 'number' && Number.isFinite(record.width) ? record.width : 0,
    height: typeof record.height === 'number' && Number.isFinite(record.height) ? record.height : 0,
    src: typeof record.src === 'string' ? record.src : '',
    capturedAt: typeof record.capturedAt === 'string' ? record.capturedAt : '',
    createdAt: typeof record.createdAt === 'string' ? record.createdAt : undefined,
    source:
      record.source === 'fixture' || record.source === 'local' || record.source === 'cloudinary'
        ? record.source
        : undefined,
  }
}

/** Lowercase, de-duplicate and trim tags so tag filtering actually matches. */
function normaliseTags(tags: string[]): string[] {
  const seen = new Set<string>()
  for (const tag of tags) {
    const clean = tag.trim().toLowerCase().replace(/^#/, '')
    if (clean) {
      seen.add(clean)
    }
  }
  return [...seen]
}

/** Apply a patch without letting `undefined` overwrite a real stored value. */
function mergeFrame(frame: Frame, patch: Partial<Frame>): Frame {
  const next: Frame = { ...frame }

  for (const key of Object.keys(patch) as (keyof Frame)[]) {
    const value = patch[key]
    if (value === undefined) {
      continue
    }
    // Single well-understood cast: `key` and `value` come from the same object,
    // so the assignment is sound, but TypeScript cannot prove it for a union key.
    ;(next as unknown as Record<string, unknown>)[key] = value
  }

  return next
}


/** Write the whole archive back. Throws a descriptive error when it cannot. */
function writeStored(frames: Frame[]): void {
  if (!hasWindow()) {
    throw new Error(
      'localAdapter cannot save frames on the server (no window). Local frames live in the visitor’s browser, so writes only happen on the client.',
    )
  }

  const store = storage()
  if (!store) {
    throw new Error(
      'localAdapter could not access window.localStorage. It is blocked or unavailable - common in Safari private browsing and locked-down webviews. Frames can be browsed but not saved.',
    )
  }

  try {
    store.setItem(LOCAL_STORAGE_KEY, JSON.stringify(frames))
  } catch (cause) {
    throw new Error(
      'localAdapter could not write to localStorage (quota exceeded or storage disabled). Remove some uploaded frames and try again.',
      { cause },
    )
  }
}

/** Read the archive for a mutation, seeding ONLY when the key is absent. */
function readForMutation(): Frame[] {
  const stored = readStored()
  if (stored !== null) {
    return stored
  }

  const seeded = seedFrames()
  // Persist the seed immediately so fixture ids stay stable across reloads; if
  // writing fails, the in-memory read still works for this session.
  writeStored(seeded)
  return seeded
}

/**
 * Ensure the archive is initialised, seeding from the bundled fixtures only on
 * a genuine first run. Safe to call during SSR (returns [] there).
 *
 * @returns The frames that are now in storage, which may legitimately be empty.
 */
export function ensureSeeded(): Frame[] {
  if (!hasWindow()) {
    return []
  }

  const stored = readStored()
  if (stored !== null) {
    return stored
  }

  const seeded = seedFrames()
  try {
    writeStored(seeded)
  } catch {
    // Read-only storage (private mode / blocked): the archive still renders for
    // this session, it just cannot remember anything. Never fatal.
  }
  return seeded
}

/** Remove every stored frame. Destructive; powers the archive reset action. */
export function clearStoredFrames(): void {
  if (!hasWindow()) {
    throw new Error('localAdapter cannot clear frames on the server (no window).')
  }

  const store = storage()
  if (!store) {
    throw new Error('localAdapter could not access window.localStorage to clear frames.')
  }

  try {
    store.removeItem(LOCAL_STORAGE_KEY)
  } catch (cause) {
    throw new Error('localAdapter could not clear localStorage.', { cause })
  }
}

/**
 * Read intrinsic image dimensions in the browser. Returns `{ width: 0,
 * height: 0 }` during SSR or when the browser refuses to decode the bytes,
 * because a frame with unknown dimensions is better than a failed upload.
 *
 * @param src - A URL the browser can load (blob:, data: or same-origin path).
 */
export function readImageSize(src: string): Promise<{ width: number; height: number }> {
  if (!hasWindow()) {
    return Promise.resolve({ width: 0, height: 0 })
  }

  return new Promise((resolve) => {
    const image = new Image()
    image.onload = () => resolve({ width: image.naturalWidth, height: image.naturalHeight })
    image.onerror = () => resolve({ width: 0, height: 0 })
    image.src = src
  })
}

/**
 * Build the most durable `src` this adapter can offer for an uploaded file.
 *
 * See the object-URL note at the top of this file: `blob:` URLs die with the
 * document, so anything we intend to persist must be inlined instead.
 *
 * @param file - The uploaded File/Blob.
 * @param objectUrl - A live `blob:` URL for the current session.
 * @param id - The frame id, used to make the fallback placeholder deterministic.
 * @returns The stored src plus whether it will survive a reload.
 */
export async function inlineOrPlaceholder(
  file: File | Blob,
  objectUrl: string,
  id: FrameId,
): Promise<{ src: string; durable: boolean }> {
  if (file.size > MAX_INLINE_THUMB_BYTES) {
    return { src: placeholderSrc(id), durable: true }
  }

  try {
    const dataUrl = await blobToDataUrl(file)
    return { src: dataUrl, durable: true }
  } catch {
    // FileReader can fail on locked-down storage or a revoked blob. Fall back
    // to the session-only object URL so the image at least renders now.
    return { src: objectUrl, durable: false }
  }
}

/** Base64-encode a Blob via FileReader; rejects only on a genuine browser error. */
function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    if (typeof FileReader === 'undefined') {
      reject(new Error('FileReader is unavailable in this environment.'))
      return
    }

    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result)
      } else {
        reject(new Error('FileReader did not produce a data URL string.'))
      }
    }
    reader.onerror = () => reject(reader.error ?? new Error('FileReader failed to read the blob.'))
    reader.readAsDataURL(blob)
  })
}

/** Capability flags the gallery reads to decide which controls to render. */
const CAPABILITIES: FrameStorageCapabilities = {
  upload: true,
  update: true,
  delete: true,
  // NOT remote: nothing leaves this browser, so the UI must say so.
  remote: false,
}

/**
 * The default adapter: a browser-local archive.
 *
 * Read paths never reject (SSR-safe, private-mode-safe). Write paths reject
 * with a descriptive Error when storage is unavailable, and every write is
 * wrapped so a full quota surfaces as a readable message rather than a raw
 * DOMException.
 */
export const localAdapter: FrameStorageAdapter = {
  id: 'local',
  label: 'This browser',
  capabilities: CAPABILITIES,

  /**
   * All stored frames, seeding from the bundled fixtures on first run only.
   *
   * Resolves [] during SSR instead of throwing: a rejected promise here would
   * fire during the server render and blank the page.
   */
  async list(): Promise<Frame[]> {
    if (!hasWindow()) {
      return []
    }
    return ensureSeeded()
  },

  /** A single frame, or null when the id is unknown (never rejects for that). */
  async get(id: FrameId): Promise<Frame | null> {
    if (!hasWindow()) {
      return null
    }
    const frames = ensureSeeded()
    return frames.find((frame) => frame.id === id) ?? null
  },

  /**
   * Create a frame, optionally from an uploaded File/Blob.
   *
   * @param draft - User-supplied metadata; `src` is ignored when `file` is given.
   * @param file - The uploaded bytes, when this frame came from a file picker.
   * @param onProgress - Receives a single 100% tick; there is no network hop to
   *   report real progress for, so we do not pretend there is a slow upload.
   */
  async create(
    draft: FrameDraft,
    file?: File | Blob,
    onProgress?: (progress: UploadProgress) => void,
  ): Promise<Frame> {
    const frames = readForMutation()
    const id = createFrameId()
    const now = new Date().toISOString()

    let src = draft.src
    let note = draft.note

    if (file) {
      const liveUrl = hasWindow() && typeof URL !== 'undefined' ? URL.createObjectURL(file) : ''
      const stored = await inlineOrPlaceholder(file, liveUrl, id)
      src = stored.src
      if (!stored.durable) {
        // Say it in the record itself so the dialog can warn the visitor: this
        // image will be missing tomorrow and that is a storage limit, not a bug.
        note = note ? `${note} ${SESSION_ONLY_SRC_NOTE}` : SESSION_ONLY_SRC_NOTE
      }
    }

    const frame: Frame = {
      id,
      title: draft.title.trim(),
      anime: draft.anime.trim(),
      episode: draft.episode,
      timestamp: draft.timestamp,
      tags: normaliseTags(draft.tags),
      note,
      favorite: draft.favorite === true,
      width: draft.width ?? 0,
      height: draft.height ?? 0,
      src,
      capturedAt: draft.capturedAt || now,
      createdAt: now,
      source: 'local',
    }

    writeStored([frame, ...frames])

    onProgress?.({ loaded: file?.size ?? 0, total: file?.size ?? 0, percent: 100 })
    return frame
  },

  /** Patch a stored frame; rejects when the id is unknown. */
  async update(id: FrameId, patch: Partial<Frame>): Promise<Frame> {
    const frames = readForMutation()
    const index = frames.findIndex((frame) => frame.id === id)

    if (index === -1) {
      throw new Error(`localAdapter.update: no frame with id "${id}" exists in this browser.`)
    }

    const current = frames[index]
    if (!current) {
      throw new Error(`localAdapter.update: stored frame "${id}" could not be read back.`)
    }

    // `id` is intentionally patchable-but-stable: we keep the original id so
    // favorites and dialog state cannot be orphaned by a rename.
    const next = mergeFrame(current, { ...patch, id: current.id })
    const updated = [...frames]
    updated[index] = next
    writeStored(updated)
    return next
  },

  /** Delete a stored frame. Deleting an unknown id is a no-op, not an error. */
  async remove(id: FrameId): Promise<void> {
    const frames = readForMutation()
    const remaining = frames.filter((frame) => frame.id !== id)

    if (remaining.length !== frames.length) {
      writeStored(remaining)
    }
  },
}

export default localAdapter

