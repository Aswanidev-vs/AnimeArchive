/**
 * store.js - the persistence port, mirroring services/storage/localAdapter.ts
 * with three deliberate changes (documented in refer/DESIGN.md):
 *
 *   1. A SEPARATE KEY (`anime-archive.refer.v1`). This prototype must never
 *      mutate the real app's data under `anime-archive.frames.v1`.
 *   2. HONEST DURABILITY. Uploads are re-encoded (canvas) to a dataURL that
 *      actually fits in localStorage, so images survive reloads instead of
 *      degrading to an SVG placeholder. When that is impossible the frame is
 *      kept as a session-only `blob:` URL and flagged `durable: false`.
 *   3. Human-readable failures: quota and decode errors surface as sentences
 *      the UI can show verbatim.
 *
 * Classic script (no ES modules) so the folder opens over file:// as-is.
 */
(function (global) {
  'use strict';

  var AA = global.AA || (global.AA = {});

  var KEY = 'anime-archive.refer.v1';
  var MAX_BYTES = 25 * 1024 * 1024; /* picker ceiling, same as the app */
  var INLINE_CAP = 400 * 1024; /* dataURL ceiling; localStorage is ~5MB */
  var SESSION_NOTE =
    'Image shown from this session only - it is not stored and will not return after the page is reloaded.';
  var ACCEPTED = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif'];

  /* -- helpers ------------------------------------------------------------ */

  function hasWindow() {
    return typeof window !== 'undefined';
  }

  function storage() {
    if (!hasWindow()) return null;
    try {
      return window.localStorage;
    } catch (e) {
      return null;
    }
  }

  function createFrameId() {
    var c = global.crypto;
    if (c && typeof c.randomUUID === 'function') return 'frame_' + c.randomUUID();
    if (c && typeof c.getRandomValues === 'function') {
      var bytes = new Uint8Array(16);
      c.getRandomValues(bytes);
      var hex = '';
      for (var i = 0; i < bytes.length; i++) {
        hex += bytes[i].toString(16).padStart(2, '0');
      }
      return 'frame_' + hex;
    }
    return 'frame_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 10);
  }

  /** Shape guard for untrusted JSON out of storage. */
  function normalise(value) {
    if (!value || typeof value !== 'object') return null;
    if (typeof value.id !== 'string' || !value.id) return null;
    var str = function (v, fallback) {
      return typeof v === 'string' ? v : fallback || '';
    };
    var num = function (v) {
      return typeof v === 'number' && isFinite(v) ? v : 0;
    };
    return {
      id: value.id,
      title: str(value.title),
      anime: str(value.anime),
      episode: str(value.episode),
      character: str(value.character),
      timestamp: str(value.timestamp),
      alt: str(value.alt),
      tags: Array.isArray(value.tags)
        ? value.tags.filter(function (t) {
            return typeof t === 'string' && t;
          })
        : [],
      note: str(value.note),
      favorite: value.favorite === true,
      width: num(value.width),
      height: num(value.height),
      src: str(value.src),
      capturedAt: str(value.capturedAt),
      createdAt: str(value.createdAt),
      source: ['fixture', 'local', 'cloudinary'].indexOf(value.source) !== -1
        ? value.source
        : 'local',
      durable: value.durable !== false,
    };
  }

  function readRaw() {
    var store = storage();
    if (!store) return null;
    try {
      return store.getItem(KEY);
    } catch (e) {
      return null;
    }
  }

  /** Read + validate. `null` = first run (distinct from stored-empty). */
  function readStored() {
    var raw = readRaw();
    if (raw === null) return null;
    try {
      var parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      return parsed.map(normalise).filter(Boolean);
    } catch (e) {
      return [];
    }
  }

  function writeStored(frames) {
    var store = storage();
    if (!store) {
      throw new Error(
        'This browser blocks local storage, so frames cannot be saved here. They will still be browsed this session.',
      );
    }
    try {
      store.setItem(KEY, JSON.stringify(frames));
    } catch (cause) {
      var name = cause && cause.name;
      if (name === 'QuotaExceededError' || name === 'NS_ERROR_DOM_QUOTA_REACHED') {
        throw new Error(
          "This browser's storage is full - the frame was not saved. Remove a few frames or export them first.",
        );
      }
      throw new Error('The frame could not be written to this browser: ' +
        ((cause && cause.message) || 'unknown error'));
    }
  }

  function seedFrames() {
    return (AA.data.FIXTURES || []).map(function (f) {
      return normalise(f);
    }).filter(Boolean);
  }

  /** First run only: seed the demo wall and persist it so stars survive. */
  function ensureSeeded() {
    var frames = readStored();
    if (frames !== null) return frames;
    var seeded = seedFrames();
    try {
      writeStored(seeded);
    } catch (e) {
      /* read-only storage: show the demos, just do not persist them */
    }
    return seeded;
  }

  /* -- file validation + durability ---------------------------------------- */

  function validateFile(file) {
    if (!file) return 'Choose an image first.';
    if (ACCEPTED.indexOf(file.type) === -1) {
      return 'Choose a JPEG, PNG, WebP, GIF, or AVIF image.';
    }
    if (file.size > MAX_BYTES) {
      return 'This frame is larger than 25 MB. Try a smaller export.';
    }
    return '';
  }

  function objectUrl(file) {
    return URL.createObjectURL(file);
  }

  function readImageSize(src) {
    return new Promise(function (resolve) {
      if (!hasWindow()) return resolve({ width: 0, height: 0 });
      var img = new Image();
      img.onload = function () {
        resolve({ width: img.naturalWidth, height: img.naturalHeight });
      };
      img.onerror = function () {
        resolve({ width: 0, height: 0 });
      };
      img.src = src;
    });
  }

  function blobToDataUrl(blob) {
    return new Promise(function (resolve, reject) {
      var reader = new FileReader();
      reader.onload = function () {
        resolve(String(reader.result));
      };
      reader.onerror = function () {
        reject(reader.error || new Error('FileReader failed.'));
      };
      reader.readAsDataURL(blob);
    });
  }

  function dataUrlBytes(dataUrl) {
    var i = dataUrl.indexOf(',');
    var b64 = i === -1 ? dataUrl : dataUrl.slice(i + 1);
    var padding = (b64.match(/={0,2}$/) || [''])[0].length;
    return Math.floor((b64.length * 3) / 4) - padding;
  }

  /**
   * Re-encode a file into a dataURL small enough to persist.
   * Two dimension tiers x four JPEG qualities; first hit wins. GIF is never
   * re-encoded (it would lose its animation) - it persists only if raw.
   */
  function encodeDurable(file, liveUrl) {
    return new Promise(function (resolve) {
      if (file.type === 'image/gif') {
        if (file.size <= INLINE_CAP) {
          blobToDataUrl(file).then(resolve, function () {
            resolve(null);
          });
        } else {
          resolve(null);
        }
        return;
      }

      var img = new Image();
      img.onerror = function () {
        resolve(null);
      };
      img.onload = function () {
        var qualities = [0.8, 0.65, 0.5, 0.4];
        var tiers = [{ max: 1600 }, { max: 1024 }];
        var canvas = document.createElement('canvas');
        var ctx = canvas.getContext('2d');
        if (!ctx) return resolve(null);

        function attempt(ti, qi) {
          if (ti >= tiers.length || qi >= qualities.length) return resolve(null);
          var scale = Math.min(1, tiers[ti].max / Math.max(img.naturalWidth, img.naturalHeight));
          canvas.width = Math.max(1, Math.round(img.naturalWidth * scale));
          canvas.height = Math.max(1, Math.round(img.naturalHeight * scale));
          ctx.fillStyle = '#000';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          var url = '';
          try {
            url = canvas.toDataURL('image/jpeg', qualities[qi]);
          } catch (e) {
            return resolve(null);
          }
          if (dataUrlBytes(url) <= INLINE_CAP) return resolve(url);
          attempt(ti, qi + 1);
        }

        attempt(0, 0);
      };
      img.src = liveUrl;
    });
  }

  /**
   * The best `src` this session/store can offer:
   *   raw dataURL (small file) -> survives reloads
   *   re-encoded dataURL       -> survives reloads
   *   blob: URL                -> session only, flagged `durable: false`
   */
  function persistableSrc(file, liveUrl) {
    if (file.size <= INLINE_CAP) {
      return blobToDataUrl(file).then(
        function (url) {
          return { src: url, durable: true };
        },
        function () {
          return { src: liveUrl, durable: false };
        },
      );
    }
    return encodeDurable(file, liveUrl).then(function (encoded) {
      if (encoded) return { src: encoded, durable: true };
      return { src: liveUrl, durable: false };
    });
  }

  /* -- the port ------------------------------------------------------------ */

  AA.store = {
    KEY: KEY,
    MAX_BYTES: MAX_BYTES,
    ACCEPTED: ACCEPTED,
    capabilities: { upload: true, update: true, delete: true, remote: false },

    list: function () {
      return Promise.resolve(ensureSeeded());
    },

    get: function (id) {
      var frames = ensureSeeded();
      for (var i = 0; i < frames.length; i++) {
        if (frames[i].id === id) return Promise.resolve(frames[i]);
      }
      return Promise.resolve(null);
    },

    /** Create from a validated file + metadata. Rejects with readable copy. */
    create: function (draft, file) {
      var frames = readStored();
      if (frames === null) frames = seedFrames();
      var id = createFrameId();
      var now = new Date().toISOString();
      var liveUrl = file ? objectUrl(file) : '';

      var prepare = file
        ? persistableSrc(file, liveUrl)
        : Promise.resolve({ src: draft.src || '', durable: true });

      return prepare.then(function (result) {
        var note = draft.note || '';
        if (file && !result.durable) {
          note = note ? note + ' ' + SESSION_NOTE : SESSION_NOTE;
        }
        var frame = {
          id: id,
          title: String(draft.title || '').trim(),
          anime: String(draft.anime || '').trim(),
          episode: draft.episode || '',
          character: draft.character || '',
          timestamp: draft.timestamp || '',
          alt: draft.alt || '',
          tags: (draft.tags || [])
            .map(function (t) {
              return String(t).trim().toLowerCase();
            })
            .filter(Boolean),
          note: note,
          favorite: false,
          width: draft.width || 0,
          height: draft.height || 0,
          src: result.src,
          capturedAt: draft.capturedAt || now,
          createdAt: now,
          source: 'local',
          durable: result.durable,
        };
        writeStored([frame].concat(frames));
        return frame;
      });
    },

    update: function (id, patch) {
      var frames = readStored();
      if (frames === null) frames = seedFrames();
      var index = -1;
      for (var i = 0; i < frames.length; i++) {
        if (frames[i].id === id) index = i;
      }
      if (index === -1) {
        return Promise.reject(new Error('No frame with id "' + id + '" exists in this browser.'));
      }
      var next = Object.assign({}, frames[index], patch, { id: frames[index].id });
      var out = frames.slice();
      out[index] = next;
      writeStored(out);
      return Promise.resolve(next);
    },

    remove: function (id) {
      var frames = readStored() || [];
      var remaining = frames.filter(function (f) {
        return f.id !== id;
      });
      if (remaining.length !== frames.length) writeStored(remaining);
      return Promise.resolve();
    },

    /** Rough usage meter for the upload page: stored KB vs the ~5MB budget. */
    usage: function () {
      var raw = readRaw();
      if (raw === null) return { kb: 0, budgetMb: 5 };
      return { kb: Math.round(raw.length / 1024), budgetMb: 5 };
    },

    reset: function () {
      try {
        storage().removeItem(KEY);
      } catch (e) {
        /* ignore */
      }
    },

    validateFile: validateFile,
    readImageSize: readImageSize,
    createFrameId: createFrameId,
  };
})(typeof window !== 'undefined' ? window : globalThis);

