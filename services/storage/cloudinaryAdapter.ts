/**
 * Cloudinary adapter - PREPARED, NOT DEFAULT.
 *
 * This adapter uploads frame files directly to Cloudinary using an UNSIGNED
 * upload preset. It implements the same FrameStorageAdapter contract as
 * localAdapter.ts so gallery components and composables can swap storage
 * backends without changing a single line of UI code.
 *
 * HONEST LIMITATIONS - READ BEFORE USING:
 * =========================================
 *
 * 1. UNSIGNED UPLOADS ARE PUBLIC.
 *    Any file pushed through an unsigned upload preset becomes publicly
 *    addressable on Cloudinary's CDN. Anyone with the public_id can fetch
 *    the bytes. This adapter does NOT secure the data - it simply moves
 *    bytes to a CDN. Treat every uploaded frame as publicly readable.
 *    The UI must say so; this adapter cannot enforce privacy.
 *
 * 2. NO LISTING OR RETRIEVAL API FROM THE BROWSER.
 *    Cloudinary's unsigned preset has no authenticated listing endpoint.
 *    list() returns [] and get() returns null. The gallery CANNOT discover
 *    Cloudinary-hosted frames without a backend API that queries Cloudinary
 *    server-side. This adapter alone is not a storage solution - it is an
 *    upload path.
 *
 * 3. NO UPDATE OR DELETE FROM THE BROWSER.
 *    Without a signed backend API, update() and remove() are unavailable
 *    from client code. They reject with a descriptive error.
 *
 * 4. THIS IS A PLACEHOLDER UNTIL A BACKEND EXISTS.
 *    The intended evolution is: backend generates signed upload parameters
 *    (or handles uploads via a server-side proxy), and a future version of
 *    this adapter reads signed URLs from that backend. The FrameStorageAdapter
 *    contract is designed so that swap requires changing only this file.
 *
 * CONFIGURATION - NEVER HARDCODE SECRETS:
 * =========================================
 *   NUXT_PUBLIC_CLOUDINARY_CLOUD_NAME   - your Cloudinary cloud name
 *   NUXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET - an UNSIGNED (public) upload preset
 *   NUXT_PUBLIC_CLOUDINARY_FOLDER         - destination folder (default: 'anime-archive')
 *
 * These are read from import.meta.env (Vite/Nuxt expose NUXT_PUBLIC_* env
 * vars to both server and client bundles). Empty strings mean the adapter
 * cannot upload - it will reject with a clear error.
 *
 * SSR BEHAVIOR:
 * =============
 *   list()  -> resolves []  (no Cloudinary access on the server)
 *   get()   -> resolves null (no Cloudinary access on the server)
 *   create()-> rejects      (no File/Blob/FormData on the server)
 *   update()-> rejects      (no backend API on the server)
 *   remove()-> rejects      (no backend API on the server)
 */

import type {
  Frame,
  FrameDraft,
  FrameId,
  FrameStorageAdapter,
  FrameStorageCapabilities,
  UploadProgress,
} from './types'

/* ------------------------------------------------------------------ */
/* Types                                                              */
/* ------------------------------------------------------------------ */

export interface CloudinaryXhr {
  upload: { addEventListener: (event: string, listener: EventListener) => void }
  addEventListener: (event: string, listener: EventListener) => void
  open: (method: string, url: string) => void
  send: (body: FormData) => void
  abort: () => void
  status: number
  statusText: string
  responseText: string
}

export interface CloudinaryXhrFactory {
  (): CloudinaryXhr
}

/* ------------------------------------------------------------------ */
/* Config                                                             */
/* ------------------------------------------------------------------ */

function cloudinaryConfig(): { cloudName: string; uploadPreset: string; folder: string } {
  const env =
    (typeof import.meta !== 'undefined'
      ? (import.meta as { env?: Record<string, string> }).env
      : {}) ?? {}
  return {
    cloudName: env.VITE_CLOUDINARY_CLOUD_NAME ?? env.NUXT_PUBLIC_CLOUDINARY_CLOUD_NAME ?? '',
    uploadPreset: env.VITE_CLOUDINARY_UPLOAD_PRESET ?? env.NUXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET ?? '',
    folder: env.VITE_CLOUDINARY_FOLDER ?? env.NUXT_PUBLIC_CLOUDINARY_FOLDER ?? 'anime-archive',
  }
}

/**
 * Build a Cloudinary adapter with explicit config (useful in tests).
 *
 * @param options - Cloudinary credentials and optional XHR factory
 *   for testing. cloudName and uploadPreset must be non-empty for
 *   create() to succeed.
 * @returns A FrameStorageAdapter that uploads to Cloudinary.
 */
export function createCloudinaryAdapter(options?: {
  cloudName: string
  uploadPreset: string
  folder?: string
  xhr?: CloudinaryXhrFactory
}): FrameStorageAdapter {
  const cloudName = options?.cloudName ?? cloudinaryConfig().cloudName
  const uploadPreset = options?.uploadPreset ?? cloudinaryConfig().uploadPreset
  const folder = options?.folder ?? cloudinaryConfig().folder
  const createXhr = options?.xhr ?? (() => new XMLHttpRequest() as unknown as CloudinaryXhr)

  /**
   * Upload a file to Cloudinary via unsigned preset.
   * Uses XMLHttpRequest for upload progress events (fetch does not expose
   * upload progress in all browsers).
   */
  function uploadFile(
    file: File | Blob,
    onProgress?: (progress: UploadProgress) => void,
  ): Promise<{ publicId: string; url: string; width: number; height: number }> {
    return new Promise((resolve, reject) => {
      const xhr = createXhr()
      const formData = new FormData()
      formData.append('file', file)
      formData.append('upload_preset', uploadPreset)
      if (folder) {
        formData.append('folder', folder)
      }

      xhr.upload.addEventListener('progress', (event) => {
        // The XHR typings surface a plain Event; upload progress is always a
        // ProgressEvent at runtime, so narrow it before reading its fields.
        const progress = event as ProgressEvent
        if (progress.lengthComputable && onProgress) {
          onProgress({
            loaded: progress.loaded,
            total: progress.total,
            percent: Math.round((progress.loaded / progress.total) * 100),
          })
        }
      })

      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const response = JSON.parse(xhr.responseText) as {
              public_id?: string
              secure_url?: string
              url?: string
              width?: number
              height?: number
            }
            if (!response.public_id) {
              reject(new Error('Cloudinary upload succeeded but returned no public_id.'))
              return
            }
            resolve({
              publicId: response.public_id,
              url: response.secure_url || response.url || '',
              width: response.width ?? 0,
              height: response.height ?? 0,
            })
          } catch {
            reject(new Error('Cloudinary upload returned an unparseable response.'))
          }
        } else {
          // Always keep the HTTP status in the message, even when Cloudinary
          // supplies its own error text - callers match on the status code.
          let message = `Cloudinary upload failed (HTTP ${xhr.status})`
          try {
            const body = JSON.parse(xhr.responseText) as { message?: string }
            if (body.message) message = `Cloudinary upload failed: ${body.message} (HTTP ${xhr.status})`
          } catch {
            // Fall back to status text
          }
          reject(new Error(`${message} - ${xhr.statusText || 'unknown error'}`))
        }
      })

      xhr.addEventListener('error', () => {
        reject(new Error('Cloudinary upload failed - check network connectivity and Cloudinary configuration.'))
      })

      xhr.addEventListener('abort', () => {
        reject(new Error('Cloudinary upload was aborted.'))
      })

      xhr.open('POST', `https://api.cloudinary.com/v1_1/${cloudName}/upload`)
      xhr.send(formData)
    })
  }

  /* ---------------------------------------------------------------- */
  /* Adapter object                                                    */
  /* ---------------------------------------------------------------- */

  const CAPABILITIES: FrameStorageCapabilities = {
    upload: true,
    // No authenticated API from the browser: cannot patch Cloudinary resources.
    update: false,
    // No authenticated API from the browser: cannot delete Cloudinary resources.
    delete: false,
    // Data leaves the browser and becomes publicly accessible via unsigned upload.
    remote: true,
  }

  return {
    id: 'cloudinary',
    label: 'Cloudinary (unsigned upload)',
    capabilities: CAPABILITIES,

    /**
     * Cloudinary's unsigned preset has no listing endpoint.
     * Returns [] honestly - frames cannot be discovered without a backend.
     */
    async list(): Promise<Frame[]> {
      return []
    },

    /**
     * Cloudinary's unsigned preset has no retrieval endpoint.
     * Returns null honestly - individual frames cannot be looked up without a backend.
     */
    async get(_id: FrameId): Promise<Frame | null> {
      return null
    },

    /**
     * Upload a file to Cloudinary via unsigned preset and return a Frame.
     *
     * @param draft - Ignored for Cloudinary (metadata is NOT sent to Cloudinary;
     *   it is recorded locally in the returned Frame).
     * @param file - REQUIRED. The File/Blob to upload. Without bytes there is
     *   nothing to push to Cloudinary.
     * @param onProgress - Receives real upload progress ticks.
     * @throws {Error} If cloudName or uploadPreset are not configured.
     * @throws {Error} If no file is provided.
     * @throws {Error} If the upload fails (network, config, or Cloudinary error).
     *
     * NOTE: The uploaded file is PUBLIC. Anyone with the public_id can access it.
     */
    async create(
      _draft: FrameDraft,
      file?: File | Blob,
      onProgress?: (progress: UploadProgress) => void,
    ): Promise<Frame> {
      if (!cloudName || !uploadPreset) {
        throw new Error(
          'Cloudinary adapter: cannot upload. NUXT_PUBLIC_CLOUDINARY_CLOUD_NAME and ' +
            'NUXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET must be set. ' +
            'Remember: unsigned uploads are public - do not use a preset that ' +
            'grants write access to sensitive data.',
        )
      }

      if (!file) {
        throw new Error(
          'Cloudinary adapter.create() requires a File/Blob to upload. ' +
            'Cloudinary is a byte-upload path, not a URL-backed store. ' +
            'Provide a file or use a different adapter.',
        )
      }

      const now = new Date().toISOString()
      const uploaded = await uploadFile(file, onProgress)

      const frame: Frame = {
        id: `cloudinary_${uploaded.publicId.replace(/[^a-zA-Z0-9_\-]/g, '_')}`,
        // Metadata is NOT sent to Cloudinary (unsigned presets carry no
        // context fields) - it is recorded locally in the returned Frame.
        title: _draft.title.trim(),
        anime: _draft.anime.trim(),
        episode: _draft.episode,
        timestamp: _draft.timestamp,
        tags: [..._draft.tags],
        note: _draft.note,
        favorite: _draft.favorite === true,
        width: uploaded.width,
        height: uploaded.height,
        src: uploaded.url,
        capturedAt: '',
        createdAt: now,
        source: 'cloudinary',
      }

      return frame
    },

    /**
     * Rejects: Cloudinary resources cannot be patched from the browser
     * without a signed backend API.
     */
    async update(_id: FrameId, _patch: Partial<Frame>): Promise<Frame> {
      throw new Error(
        'Cloudinary adapter.update() is unavailable from the browser. ' +
          'Unsigned uploads have no update endpoint. A backend API is required to modify frames.',
      )
    },

    /**
     * Rejects: Cloudinary resources cannot be deleted from the browser
     * without a signed backend API.
     */
    async remove(_id: FrameId): Promise<void> {
      throw new Error(
        'Cloudinary adapter.remove() is unavailable from the browser. ' +
          'Unsigned uploads have no delete endpoint and are publicly accessible. ' +
          'A backend API is required to delete frames.',
      )
    },
  }
}

/**
 * Pre-configured instance reading from environment variables.
 * Use this for production; use createCloudinaryAdapter({...}) in tests.
 *
 * This is a NAMED export, not a default export - Cloudinary is prepared
 * but NOT the default storage backend.
 */
export const cloudinaryAdapter = createCloudinaryAdapter()
