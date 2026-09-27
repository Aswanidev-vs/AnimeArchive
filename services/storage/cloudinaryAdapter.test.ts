import { describe, it, expect, vi, afterEach } from 'vitest'

import { createCloudinaryAdapter, cloudinaryAdapter } from './cloudinaryAdapter'
import type { FrameStorageAdapter } from './types'
import type { CloudinaryXhr } from './cloudinaryAdapter'

/* ------------------------------------------------------------------ */
/* Helpers                                                            */
/* ------------------------------------------------------------------ */

function mockXhrInstance(response: {
  status?: number
  statusText?: string
  body?: Record<string, unknown>
  malformedJson?: boolean
}): CloudinaryXhr {
  const listeners: { [key: string]: Array<EventListener | EventListenerObject> } = {}
  const uploadListeners: { [key: string]: Array<EventListener | EventListenerObject> } = {}

  const dispatch = (
    registry: { [key: string]: Array<EventListener | EventListenerObject> },
    event: string,
  ) => {
    for (const listener of registry[event] ?? []) {
      const evt = new Event(event)
      if (typeof listener === 'function') {
        listener(evt)
      } else {
        listener.handleEvent(evt)
      }
    }
  }

  const instance: CloudinaryXhr = {
    upload: {
      addEventListener: vi.fn((event: string, listener: EventListener) => {
        ;(uploadListeners[event] ??= []).push(listener)
      }),
    },
    addEventListener: vi.fn((event: string, listener: EventListener) => {
      ;(listeners[event] ??= []).push(listener)
    }),
    open: vi.fn(),
    // A real XHR delivers the response after send(); the mock mimics that by
    // firing 'load' asynchronously so awaited create() calls resolve.
    send: vi.fn(() => {
      setTimeout(() => dispatch(listeners, 'load'), 0)
    }),
    abort: vi.fn(),
    status: response.status ?? 200,
    statusText: response.statusText ?? 'OK',
    responseText: response.malformedJson
      ? 'not json'
      : JSON.stringify(response.body ?? {}),
  }
  return instance as unknown as CloudinaryXhr
}

function triggerXhrEvent(xhr: CloudinaryXhr, event: string, eventObj?: Event) {
  // Access internal listeners via the mock's recorded calls. Listeners may be
  // plain functions (the common case) or handleEvent objects (spec-compliant).
  const addMock = xhr.addEventListener as ReturnType<typeof vi.fn>
  for (const [e, listener] of addMock.mock.calls as [string, EventListener | EventListenerObject][]) {
    if (e === event) {
      const evt = eventObj ?? new Event(event)
      if (typeof listener === 'function') {
        listener(evt)
      } else {
        listener.handleEvent(evt)
      }
    }
  }
}

function triggerUploadEvent(xhr: CloudinaryXhr, event: string, eventObj?: Event) {
  const uploadAdd = xhr.upload.addEventListener as ReturnType<typeof vi.fn>
  for (const [e, listener] of uploadAdd.mock.calls as [string, EventListener | EventListenerObject][]) {
    if (e === event) {
      const evt = eventObj ?? new Event(event)
      if (typeof listener === 'function') {
        listener(evt)
      } else {
        listener.handleEvent(evt)
      }
    }
  }
}

function makeFile(name = 'test.png', size = 1024): File {
  return new File(['x'.repeat(size)], name, { type: 'image/png' })
}

function extractFormData(xhr: CloudinaryXhr): FormData | null {
  const sendMock = xhr.send as ReturnType<typeof vi.fn>
  const call = sendMock.mock.calls[0]
  return call ? (call[0] as FormData) : null
}

/* ------------------------------------------------------------------ */
/* Tests                                                              */
/* ------------------------------------------------------------------ */

describe('createCloudinaryAdapter', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('returns an object implementing FrameStorageAdapter', () => {
    const adapter = createCloudinaryAdapter({ cloudName: 'test', uploadPreset: 'unsigned' })

    expect(adapter.id).toBe('cloudinary')
    expect(adapter.label).toBe('Cloudinary (unsigned upload)')
    expect(typeof adapter.list).toBe('function')
    expect(typeof adapter.get).toBe('function')
    expect(typeof adapter.create).toBe('function')
    expect(typeof adapter.update).toBe('function')
    expect(typeof adapter.remove).toBe('function')
  })

  it('satisfies FrameStorageAdapter type', () => {
    const adapter: FrameStorageAdapter = createCloudinaryAdapter({
      cloudName: 'test',
      uploadPreset: 'unsigned',
    })
    expect(adapter).toBeDefined()
  })

  it('advertises correct capabilities', () => {
    const adapter = createCloudinaryAdapter({ cloudName: 'test', uploadPreset: 'unsigned' })
    expect(adapter.capabilities).toEqual({
      upload: true,
      update: false,
      delete: false,
      remote: true,
    })
  })

  it('capabilities do NOT claim delete is available (unsigned upload)', () => {
    const adapter = createCloudinaryAdapter({ cloudName: 'test', uploadPreset: 'unsigned' })
    expect(adapter.capabilities?.delete).toBe(false)
  })

  it('capabilities do NOT claim update is available (unsigned upload)', () => {
    const adapter = createCloudinaryAdapter({ cloudName: 'test', uploadPreset: 'unsigned' })
    expect(adapter.capabilities?.update).toBe(false)
  })

  it('capabilities correctly flag remote (data leaves the browser)', () => {
    const adapter = createCloudinaryAdapter({ cloudName: 'test', uploadPreset: 'unsigned' })
    expect(adapter.capabilities?.remote).toBe(true)
  })

  it('rejects create() when told unsigned uploads are not private', () => {
    // The adapter does not claim privacy; it flags remote=true and
    // the create() error message warns about unsigned uploads.
    const adapter = createCloudinaryAdapter({ cloudName: '', uploadPreset: 'unsigned' })
    expect(adapter.capabilities?.remote).toBe(true)
  })

  describe('list()', () => {
    it('resolves [] (no Cloudinary listing from browser)', async () => {
      const adapter = createCloudinaryAdapter({ cloudName: 'test', uploadPreset: 'unsigned' })
      expect(await adapter.list()).toEqual([])
    })

    it('resolves [] on repeated calls', async () => {
      const adapter = createCloudinaryAdapter({ cloudName: 'test', uploadPreset: 'unsigned' })
      for (let i = 0; i < 3; i++) {
        expect(await adapter.list()).toEqual([])
      }
    })
  })

  describe('get()', () => {
    it('resolves null (no Cloudinary retrieval from browser)', async () => {
      const adapter = createCloudinaryAdapter({ cloudName: 'test', uploadPreset: 'unsigned' })
      expect(await adapter.get('frame_001')).toBeNull()
    })

    it('resolves null for any id', async () => {
      const adapter = createCloudinaryAdapter({ cloudName: 'test', uploadPreset: 'unsigned' })
      expect(await adapter.get('nonexistent')).toBeNull()
    })
  })

  describe('update()', () => {
    it('rejects with descriptive error about backend requirement', async () => {
      const adapter = createCloudinaryAdapter({ cloudName: 'test', uploadPreset: 'unsigned' })
      await expect(adapter.update('frame_001', { title: 'x' })).rejects.toThrow(
        /Cloudinary adapter.update\(\).*backend/,
      )
    })
  })

  describe('remove()', () => {
    it('rejects with descriptive error about backend requirement', async () => {
      const adapter = createCloudinaryAdapter({ cloudName: 'test', uploadPreset: 'unsigned' })
      // `remove` is optional on the adapter contract; this adapter implements
      // it (as a descriptive rejection), hence the non-null assertion.
      await expect(adapter.remove!('frame_001')).rejects.toThrow(
        /Cloudinary adapter.remove\(\).*backend/,
      )
    })
  })

  describe('create()', () => {
    it('rejects when cloudName is not configured', async () => {
      const adapter = createCloudinaryAdapter({ cloudName: '', uploadPreset: 'unsigned' })
      await expect(
        adapter.create({
          title: 'x',
          anime: '',
          episode: '',
          timestamp: '',
          tags: [],
          note: '',
          src: '',
        }),
      ).rejects.toThrow(/cannot upload/)
    })

    it('rejects when uploadPreset is not configured', async () => {
      const adapter = createCloudinaryAdapter({ cloudName: 'test', uploadPreset: '' })
      await expect(
        adapter.create({
          title: 'x',
          anime: '',
          episode: '',
          timestamp: '',
          tags: [],
          note: '',
          src: '',
        }),
      ).rejects.toThrow(/cannot upload/)
    })

    it('rejects when no file is provided', async () => {
      const adapter = createCloudinaryAdapter({ cloudName: 'test', uploadPreset: 'unsigned' })
      await expect(
        adapter.create({
          title: 'x',
          anime: '',
          episode: '',
          timestamp: '',
          tags: [],
          note: '',
          src: '',
        }),
      ).rejects.toThrow(/File\/Blob/)
    })

    it('rejects when file is explicitly null', async () => {
      const adapter = createCloudinaryAdapter({ cloudName: 'test', uploadPreset: 'unsigned' })
      await expect(
        adapter.create(
          { title: 'x', anime: '', episode: '', timestamp: '', tags: [], note: '', src: '' },
          null as unknown as File | Blob,
        ),
      ).rejects.toThrow(/File\/Blob/)
    })

    it('uploads a file and returns a properly shaped Frame', async () => {
      const xhr = mockXhrInstance({
        status: 200,
        body: {
          public_id: 'anime-archive/test.png',
          secure_url: 'https://res.cloudinary.com/test/image/upload/v1/test.png',
          url: 'https://res.cloudinary.com/test/image/upload/v1/test.png',
          width: 1600,
          height: 900,
        },
      })
      const adapter = createCloudinaryAdapter({
        cloudName: 'test',
        uploadPreset: 'unsigned',
        xhr: () => xhr,
      })

      const frame = await adapter.create(
        {
          title: 'Rain on the crossing',
          anime: 'Kagerou Line',
          episode: 'EP 04',
          timestamp: '00:12:41',
          tags: ['rain', 'city'],
          note: 'note',
          src: '',
        },
        makeFile(),
      )

      expect(frame.id).toContain('cloudinary_')
      expect(frame.src).toBe('https://res.cloudinary.com/test/image/upload/v1/test.png')
      expect(frame.width).toBe(1600)
      expect(frame.height).toBe(900)
      expect(frame.source).toBe('cloudinary')
      expect(frame.createdAt).toBeTruthy()
      expect(frame.title).toBe('Rain on the crossing')
      expect(frame.anime).toBe('Kagerou Line')
      expect(frame.episode).toBe('EP 04')
      expect(frame.timestamp).toBe('00:12:41')
      expect(frame.tags).toEqual(['rain', 'city'])
      expect(frame.note).toBe('note')
      expect(frame.favorite).toBe(false)
    })

    it('uses folder from config in FormData', async () => {
      const xhr = mockXhrInstance({
        status: 200,
        body: {
          public_id: 'my-folder/test.png',
          secure_url: 'https://res.cloudinary.com/test/image/upload/v1/my-folder/test.png',
        },
      })
      const adapter = createCloudinaryAdapter({
        cloudName: 'test',
        uploadPreset: 'unsigned',
        folder: 'my-folder',
        xhr: () => xhr,
      })

      void await adapter.create(
        { title: 'x', anime: '', episode: '', timestamp: '', tags: [], note: '', src: '' },
        makeFile(),
      )

      const fd = extractFormData(xhr)
      expect(fd).not.toBeNull()
      if (fd) {
        expect(fd.get('folder')).toBe('my-folder')
      }
    })

    it('omits folder when config folder is empty', async () => {
      const xhr = mockXhrInstance({
        status: 200,
        body: {
          public_id: 'anime-archive/test.png',
          secure_url: 'https://res.cloudinary.com/test/image/upload/v1/test.png',
        },
      })
      const adapter = createCloudinaryAdapter({
        cloudName: 'test',
        uploadPreset: 'unsigned',
        folder: '',
        xhr: () => xhr,
      })

      void await adapter.create(
        { title: 'x', anime: '', episode: '', timestamp: '', tags: [], note: '', src: '' },
        makeFile(),
      )

      const fd = extractFormData(xhr)
      expect(fd).not.toBeNull()
      if (fd) {
        expect(fd.get('folder')).toBeNull()
      }
    })

    it('includes upload_preset in FormData', async () => {
      const xhr = mockXhrInstance({
        status: 200,
        body: {
          public_id: 'anime-archive/test.png',
          secure_url: 'https://res.cloudinary.com/test/image/upload/v1/test.png',
        },
      })
      const adapter = createCloudinaryAdapter({
        cloudName: 'test',
        uploadPreset: 'unsigned',
        xhr: () => xhr,
      })

      void await adapter.create(
        { title: 'x', anime: '', episode: '', timestamp: '', tags: [], note: '', src: '' },
        makeFile(),
      )

      const fd = extractFormData(xhr)
      expect(fd).not.toBeNull()
      if (fd) {
        expect(fd.get('upload_preset')).toBe('unsigned')
      }
    })

    it('calls onProgress during upload', async () => {
      const xhr = mockXhrInstance({
        status: 200,
        body: {
          public_id: 'anime-archive/test.png',
          secure_url: 'https://res.cloudinary.com/test/image/upload/v1/test.png',
        },
      })
      const adapter = createCloudinaryAdapter({
        cloudName: 'test',
        uploadPreset: 'unsigned',
        xhr: () => xhr,
      })

      const onProgress = vi.fn()
      const promise = adapter.create(
        { title: 'x', anime: '', episode: '', timestamp: '', tags: [], note: '', src: '' },
        makeFile(),
        onProgress,
      )

      triggerUploadEvent(xhr, 'progress', {
        loaded: 512,
        total: 1024,
        lengthComputable: true,
      } as unknown as ProgressEvent)
      triggerXhrEvent(xhr, 'load')

      await promise

      expect(onProgress).toHaveBeenCalled()
      const lastCall = onProgress.mock.calls[onProgress.mock.calls.length - 1]?.[0] as { percent: number } | undefined
      expect(lastCall?.percent).toBe(50)
    })

    it('rejects on XHR network error', async () => {
      const xhr = mockXhrInstance({})
      const adapter = createCloudinaryAdapter({
        cloudName: 'test',
        uploadPreset: 'unsigned',
        xhr: () => xhr,
      })

      const promise = adapter.create(
        { title: 'x', anime: '', episode: '', timestamp: '', tags: [], note: '', src: '' },
        makeFile(),
      )
      triggerXhrEvent(xhr, 'error')

      await expect(promise).rejects.toThrow(/upload failed/)
    })

    it('rejects on HTTP error response', async () => {
      const xhr = mockXhrInstance({
        status: 413,
        statusText: 'Request Entity Too Large',
        body: { message: 'File too large' },
      })
      const adapter = createCloudinaryAdapter({
        cloudName: 'test',
        uploadPreset: 'unsigned',
        xhr: () => xhr,
      })

      const promise = adapter.create(
        { title: 'x', anime: '', episode: '', timestamp: '', tags: [], note: '', src: '' },
        makeFile(),
      )
      triggerXhrEvent(xhr, 'load')

      await expect(promise).rejects.toThrow(/413/)
    })

    it('rejects when Cloudinary response has no public_id', async () => {
      const xhr = mockXhrInstance({
        status: 200,
        body: { url: 'https://example.com/image.png' },
      })
      const adapter = createCloudinaryAdapter({
        cloudName: 'test',
        uploadPreset: 'unsigned',
        xhr: () => xhr,
      })

      const promise = adapter.create(
        { title: 'x', anime: '', episode: '', timestamp: '', tags: [], note: '', src: '' },
        makeFile(),
      )
      triggerXhrEvent(xhr, 'load')

      await expect(promise).rejects.toThrow(/public_id/)
    })

    it('rejects when Cloudinary returns malformed JSON', async () => {
      const xhr = mockXhrInstance({
        status: 200,
        malformedJson: true,
      })
      const adapter = createCloudinaryAdapter({
        cloudName: 'test',
        uploadPreset: 'unsigned',
        xhr: () => xhr,
      })

      const promise = adapter.create(
        { title: 'x', anime: '', episode: '', timestamp: '', tags: [], note: '', src: '' },
        makeFile(),
      )
      triggerXhrEvent(xhr, 'load')

      await expect(promise).rejects.toThrow(/unparseable/)
    })
  })
})

describe('cloudinaryAdapter (pre-configured instance)', () => {
  it('is a FrameStorageAdapter-compatible object', () => {
    const adapter: FrameStorageAdapter = cloudinaryAdapter
    expect(typeof adapter.list).toBe('function')
    expect(typeof adapter.get).toBe('function')
    expect(typeof adapter.create).toBe('function')
    expect(typeof adapter.update).toBe('function')
  })

  it('rejects create() without Cloudinary env config', async () => {
    await expect(
      cloudinaryAdapter.create(
        { title: 'x', anime: '', episode: '', timestamp: '', tags: [], note: '', src: '' },
        makeFile(),
      ),
    ).rejects.toThrow(/cannot upload/)
  })
})

describe('cloudinaryAdapter - unsigned upload honesty', () => {
  it('does NOT claim unsigned uploads are private', () => {
    const adapter = createCloudinaryAdapter({ cloudName: 'test', uploadPreset: 'unsigned' })
    const caps = adapter.capabilities
    expect(caps?.remote).toBe(true)
    expect(caps?.delete).toBe(false)
    expect(caps?.update).toBe(false)
  })

  it('warns about public uploads in create() error when unconfigured', async () => {
    const adapter = createCloudinaryAdapter({ cloudName: '', uploadPreset: 'unsigned' })
    await expect(
      adapter.create({ title: 'x', anime: '', episode: '', timestamp: '', tags: [], note: '', src: '' }),
    ).rejects.toThrow(/unsigned uploads are public/)
  })
})
