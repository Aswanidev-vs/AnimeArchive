/**
 * Storage boundary types - the ONLY vocabulary the gallery and the upload flow
 * are allowed to know about persistence.
 *
 * WHY this file exists at all:
 *   The gallery must never know how frames are stored. It talks to a
 *   `FrameStorageAdapter` and nothing else. localStorage, object URLs and
 *   Cloudinary are implementation details that live behind this contract, so a
 *   future backend could be dropped in without touching a single component.
 *
 * WHY there is no backend here:
 *   This is a purely client-side archive. Every adapter persists inside the
 *   visitor's own browser (localStorage) or uploads straight to a third-party
 *   CDN with an UNSIGNED preset. Nothing in this project protects the data:
 *   the remote adapter is not private, and the local adapter is readable by
 *   anyone with access to the machine/browser profile. That limitation is
 *   stated again, loudly, in cloudinaryAdapter.ts.
 *
 * This module is types-only plus one tiny id helper, which keeps it safe to
 * import from any context (SSR, client, tests) with zero side effects.
 */

/** Stable identity of a frame. Also used as the store / favorite key. */
export type FrameId = string

/**
 * A stored frame, in the archive's own vocabulary.
 *
 * Deliberately NOT the same shape as the fixtures in `fixtures/frames.ts`
 * (that file describes bundled demo stills); adapters map whatever they hold
 * into this shape so the UI has exactly one model to render.
 */
export interface Frame {
  /** Stable id, e.g. `frame_001` for fixtures or a generated uuid. */
  id: FrameId
  /** Caption shown on the card and in the detail dialog. */
  title: string
  /** Source series, e.g. "Kagerou Line". */
  anime: string
  /** Episode label, free-form ("EP 04"). Empty string when unknown. */
  episode: string
  /** Timestamp inside the episode ("00:12:41"). Empty string when unknown. */
  timestamp: string
  /** Search tags, lowercase, no leading '#'. */
  tags: string[]
  /** Free-form personal note. Empty string, never null, so inputs stay simple. */
  note: string
  /** Whether the visitor starred this frame. Persisted through the adapter. */
  favorite: boolean
  /** Intrinsic pixel width; 0 when unknown. */
  width: number
  /** Intrinsic pixel height; 0 when unknown. */
  height: number
  /**
   * Renderable source. Either a path served from `public/`
   * (`/frames/frame_001.png`), a Cloudinary delivery URL, or - for a freshly
   * uploaded local file - a `blob:` object URL that DOES NOT SURVIVE RELOAD.
   * See `localAdapter.ts` for how that case is handled honestly.
   */
  src: string
  /** When the frame was captured, ISO-8601 string. '' when unknown. */
  capturedAt: string
  /** When the record was written, ISO-8601 string. Optional for fixtures. */
  createdAt?: string
  /** Which adapter produced this record. Purely informational for the UI. */
  source?: 'fixture' | 'local' | 'cloudinary'
}

/**
 * The data the upload form (or an importer) supplies when creating a frame.
 * Everything the adapter can infer or default for itself is optional.
 */
export interface FrameDraft {
  title: string
  anime: string
  episode: string
  timestamp: string
  tags: string[]
  note: string
  /** Defaults to false. */
  favorite?: boolean
  /** Intrinsic dimensions; adapters fall back to 0 when unknown. */
  width?: number
  height?: number
  /**
   * Where the pixels live. For local uploads this is typically a `blob:` object
   * URL created by `useUpload`; it is a render hint, not a durable promise.
   */
  src: string
  /** ISO-8601 capture date. Defaults to the creation time. */
  capturedAt?: string
}

/** Sort modes offered by the gallery toolbar. */
export type FrameSort = 'newest' | 'oldest' | 'title' | 'anime'

/**
 * A query is always fully described, never partially trusted: the composable
 * normalises whatever the toolbar sets into this shape before filtering.
 */
export interface FrameQuery {
  /** Case-insensitive substring match across title / anime / note / tags. */
  search?: string
  /** Exact anime name filter. */
  anime?: string
  /** Tags matched with AND semantics (the frame must carry every tag). */
  tags?: string[]
  /** When true, only starred frames are returned. */
  favoritesOnly?: boolean
  /** Defaults to 'newest'. */
  sort?: FrameSort
}

/** One progress tick from an upload. `percent` is 0..100 and always finite. */
export interface UploadProgress {
  /** Bytes transferred so far. */
  loaded: number
  /** Total bytes, or 0 when the browser cannot determine it. */
  total: number
  /** Whole-number percentage, 0..100; 0 when `total` is unknown. */
  percent: number
}

/** What an adapter can actually do - the UI uses this to hide impossible actions. */
export interface FrameStorageCapabilities {
  /** create() accepts a File/Blob and pushes bytes somewhere. */
  upload: boolean
  /** update() patches an existing record. */
  update: boolean
  /** remove() exists and is implemented. */
  delete: boolean
  /** Data leaves the browser (Cloudinary) rather than staying local. */
  remote: boolean
}

/**
 * The persistence port. Every concrete store (localStorage today, a real
 * backend tomorrow) implements exactly this and nothing more.
 *
 * Contract notes that the gallery relies on:
 *  - `list()` NEVER throws for an empty/unavailable store; it resolves [].
 *  - `get()` resolves null instead of throwing for a missing id.
 *  - Methods that would mutate during SSR MAY reject - see `localAdapter.ts`.
 */
export interface FrameStorageAdapter {
  /** Stable machine id, e.g. 'local'. Used by `setAdapter()`. */
  readonly id: string
  /** Human-readable name for the adapter switcher UI. */
  readonly label: string
  /** All stored frames. Resolves [] rather than rejecting when unavailable. */
  list(): Promise<Frame[]>
  /** A single frame, or null when the id is unknown. */
  get(id: FrameId): Promise<Frame | null>
  /** Persist a new frame, optionally uploading `file` first. */
  create(
    draft: FrameDraft,
    file?: File | Blob,
    onProgress?: (progress: UploadProgress) => void,
  ): Promise<Frame>
  /** Patch an existing frame; rejects when the id is unknown. */
  update(id: FrameId, patch: Partial<Frame>): Promise<Frame>
  /** Optional: some adapters (read-only mirrors) genuinely cannot delete. */
  remove?(id: FrameId): Promise<void>
  /** Optional capability flags; absent means "assume none advertised". */
  capabilities?: FrameStorageCapabilities
}

/**
 * Create a collision-resistant frame id.
 *
 * `crypto.randomUUID` is unavailable on insecure origins and in older Safari,
 * so we fall back to `crypto.getRandomValues` and finally to Math.random.
 * The fallback is weaker, not cryptographic - ids here are just keys, never
 * secrets, so that is acceptable (and never used for authentication).
 *
 * @returns A new id string, prefixed `frame_` so ids stay greppable in storage.
 */
export function createFrameId(): string {
  const c: Crypto | undefined = typeof globalThis !== 'undefined' ? globalThis.crypto : undefined

  if (c && typeof c.randomUUID === 'function') {
    return `frame_${c.randomUUID()}`
  }

  if (c && typeof c.getRandomValues === 'function') {
    const bytes = c.getRandomValues(new Uint8Array(16))
    let hex = ''
    for (const byte of bytes) {
      hex += byte.toString(16).padStart(2, '0')
    }
    return `frame_${hex}`
  }

  return `frame_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`
}
