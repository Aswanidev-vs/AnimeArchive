/* ============================================================
   Anime Archive — store
   ------------------------------------------------------------
   Frame model, localStorage adapter, fixtures, quota policy.

   One Frame shape replaces the source app's two divergent ones
   (storage vs fixtures: series/anime, alt/note, addedAt/capturedAt).
   `durable` is a real boolean the UI branches on — the source app
   inferred it by substring-matching adapter wording in the note.

   Classic script (no ES module) so the folder opens over file://.
   ============================================================ */
(function (AA) {
  'use strict';

  var KEY = 'anime-archive.refer.v1';
  var MAX_BYTES = 25 * 1024 * 1024;
  var TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif'];
  var LONG_EDGE = 1920;
  var STEPS = [
    { q: 0.82, edge: 1920 },
    { q: 0.72, edge: 1440 },
    { q: 0.62, edge: 1200 }
  ];

  var util = {
    qs: function (sel, root) { return (root || document).querySelector(sel); },
    qsa: function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); },
    clamp: function (n, lo, hi) { return Math.min(hi, Math.max(lo, n)); },
    bytes: function (n) {
      if (!n) return '0 B';
      var u = ['B', 'KB', 'MB', 'GB'], i = Math.floor(Math.log(n) / Math.log(1024));
      return (n / Math.pow(1024, i)).toFixed(i ? 1 : 0) + ' ' + u[i];
    },
    date: function (ts) {
      return new Date(ts).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
    },
    escapeRe: function (s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
  };

  /* ── Fixtures: the 9 bundled demo stills ─────────────────── */

  var FIXTURES = [
    { f: 'frame_001', t: 'Rain on the crossing',   s: 'Kagerou Line',   e: 'EP 04', c: 'Aoi',  k: '00:12:41', g: ['rain', 'city', 'dusk', 'wide'] },
    { f: 'frame_002', t: 'Convenience store glow', s: 'Kagerou Line',  e: 'EP 04', c: 'Ren',  k: '00:15:03', g: ['interior', 'night', 'neon', 'close'] },
    { f: 'frame_003', t: 'Rooftop before the bell', s: 'Kagerou Line', e: 'EP 07', c: 'Aoi',  k: '00:06:22', g: ['rooftop', 'morning', 'sky', 'wide'] },
    { f: 'frame_004', t: 'Train window, moving light', s: 'Kagerou Line', e: 'EP 07', c: 'Ren', k: '00:18:55', g: ['train', 'interior', 'motion', 'medium'] },
    { f: 'frame_005', t: 'Stairwell, red lantern', s: 'Yomawari Notes', e: 'EP 02', c: 'Mika',  k: '00:09:17', g: ['interior', 'lantern', 'stairs', 'close'] },
    { f: 'frame_006', t: 'Festival crowd, held still', s: 'Yomawari Notes', e: 'EP 05', c: 'Mika', k: '00:14:48', g: ['festival', 'crowd', 'night', 'wide'] },
    { f: 'frame_007', t: 'Kitchen, two cups',     s: 'Yomawari Notes', e: 'EP 05', c: 'Mika',  k: '00:21:02', g: ['interior', 'kitchen', 'quiet', 'medium'] },
    { f: 'frame_008', t: 'Shoreline, last train',  s: 'Higan Shore',   e: 'EP 11', c: 'Souta', k: '00:19:36', g: ['sea', 'night', 'bridge', 'wide'] },
    { f: 'frame_009', t: 'Empty classroom, window seat', s: 'Higan Shore', e: 'EP 11', c: 'Souta', k: '00:23:10', g: ['classroom', 'afternoon', 'empty', 'medium'] }
  ];

  function fixtureFrames() {
    return FIXTURES.map(function (x, i) {
      return {
        id: 'fx_' + x.f,
        accession: accession(i + 1),
        title: x.t,
        series: x.s,
        episode: x.e,
        timecode: x.k,
        tags: x.g.slice(),
        note: '',
        starred: i === 0 || i === 4,
        width: 1600,
        height: 900,
        src: 'assets/frames/' + x.f + '.png',
        durable: true,
        addedAt: Date.parse('2026-09-01T12:00:00Z') + i * 86400000,
        source: 'fixture'
      };
    });
  }

  function accession(n) { return 'AA-' + String(n).padStart(3, '0'); }

  function altOf(f) {
    return 'Frame of ' + (f.title || 'an untitled frame') +
      (f.series ? ' from ' + f.series : '') +
      (f.episode ? ', ' + f.episode : '') + '.';
  }

  /* ── Persistence ─────────────────────────────────────────── */

  function read() {
    var raw = localStorage.getItem(KEY);
    if (raw === null) { seed(); raw = localStorage.getItem(KEY); }
    if (!raw) return [];
    var parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  }

  function write(frames) {
    try {
      localStorage.setItem(KEY, JSON.stringify(frames));
      return null;
    } catch (e) {
      return e && e.name === 'QuotaExceededError'
        ? 'This browser is out of storage. The archive is capped at roughly 5 MB — remove a large frame, or catalog fewer large ones.'
        : 'The archive could not be written to this browser.';
    }
  }

  function seed() {
    var frames = fixtureFrames();
    try { localStorage.setItem(KEY, JSON.stringify(frames)); } catch (e) { /* private mode */ }
    return frames;
  }

  var api = {
    key: KEY,
    maxBytes: MAX_BYTES,
    types: TYPES,
    altOf: altOf,
    accession: accession,

    list: function () {
      var frames = read();
      return frames.sort(function (a, b) { return b.addedAt - a.addedAt; });
    },

    get: function (id) {
      return read().filter(function (f) { return f.id === id; })[0] || null;
    },

    series: function () {
      var seen = {}, out = [];
      read().forEach(function (f) {
        if (f.series && !seen[f.series]) { seen[f.series] = 1; out.push(f.series); }
      });
      return out.sort(function (a, b) { return a.localeCompare(b); });
    },

    /* Next accession continues past the highest one already issued, so
       deleting a frame never reissues a number that was on the wall. */
    nextAccession: function () {
      var highest = 0;
      read().forEach(function (f) {
        var n = parseInt(String(f.accession || '').replace(/\D/g, ''), 10);
        if (n > highest) highest = n;
      });
      return accession(highest + 1);
    },

    create: function (draft) {
      var frames = read();
      var frame = {
        id: 'fr_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
        accession: api.nextAccession(),
        title: draft.title.trim(),
        series: draft.series.trim(),
        episode: (draft.episode || '').trim(),
        timecode: (draft.timecode || '').trim(),
        tags: (draft.tags || []).filter(Boolean),
        note: (draft.note || '').trim(),
        starred: !!draft.starred,
        width: draft.width || 0,
        height: draft.height || 0,
        src: draft.src,
        durable: !!draft.durable,
        addedAt: draft.addedAt || Date.now(),
        source: 'local'
      };
      var err = write(frames.concat([frame]));
      return err ? { error: err } : { frame: frame };
    },

    update: function (id, patch) {
      var frames = read(), found = false;
      frames = frames.map(function (f) {
        if (f.id !== id) return f;
        found = true;
        var next = {};
        Object.keys(f).forEach(function (k) { next[k] = f[k]; });
        ['title', 'series', 'episode', 'timecode', 'note'].forEach(function (k) {
          if (patch[k] !== undefined) next[k] = String(patch[k]).trim();
        });
        if (patch.tags !== undefined) next.tags = patch.tags.filter(Boolean);
        if (patch.starred !== undefined) next.starred = !!patch.starred;
        return next;
      });
      if (!found) return { error: 'That frame is no longer on the wall.' };
      var err = write(frames);
      return err ? { error: err } : { frame: frames.filter(function (f) { return f.id === id; })[0] };
    },

    remove: function (id) {
      var frames = read().filter(function (f) { return f.id !== id; });
      var err = write(frames);
      return err ? { error: err } : { ok: true };
    },

    /* ── Quota policy ──────────────────────────────────────
       The source app silently replaced anything over 400 KB with a
       generated SVG placeholder. Here: downscale, re-encode, and only
       then fall back — and when we do fall back, `durable` goes false so
       the wall can say so out loud. */

    encode: function (file) {
      return new Promise(function (resolve) {
        var objectUrl = URL.createObjectURL(file);
        var img = new Image();
        img.onload = function () {
          var w = img.naturalWidth, h = img.naturalHeight;
          var step = function (i) {
            if (i >= STEPS.length) {
              URL.revokeObjectURL(objectUrl);
              resolve({ src: PLACEHOLDER, width: w, height: h, durable: false, bytes: 0 });
              return;
            }
            var spec = STEPS[i];
            var scale = Math.min(1, spec.edge / Math.max(w, h));
            var cw = Math.max(1, Math.round(w * scale));
            var ch = Math.max(1, Math.round(h * scale));
            var canvas = document.createElement('canvas');
            canvas.width = cw; canvas.height = ch;
            var ctx = canvas.getContext('2d');
            ctx.imageSmoothingQuality = 'high';
            ctx.drawImage(img, 0, 0, cw, ch);
            var out;
            try { out = canvas.toDataURL('image/jpeg', spec.q); }
            catch (e) { out = ''; }
            var bytes = out ? Math.round((out.length - out.indexOf(',') - 1) * 0.75) : Infinity;
            if (out && bytes < 1.2 * 1024 * 1024) {
              URL.revokeObjectURL(objectUrl);
              resolve({ src: out, width: cw, height: ch, durable: true, bytes: bytes });
            } else {
              step(i + 1);
            }
          };
          step(0);
        };
        img.onerror = function () {
          URL.revokeObjectURL(objectUrl);
          resolve({ src: PLACEHOLDER, width: 0, height: 0, durable: false, bytes: 0 });
        };
        img.src = objectUrl;
      });
    },

    /* Raw live preview of the picked file, before any downscale. */
    preview: function (file) {
      return new Promise(function (resolve, reject) {
        var url = URL.createObjectURL(file);
        var img = new Image();
        img.onload = function () { resolve({ url: url, width: img.naturalWidth, height: img.naturalHeight }); };
        img.onerror = function () { URL.revokeObjectURL(url); reject(new Error('decode')); };
        img.src = url;
      });
    },

    used: function () {
      try { return new Blob([localStorage.getItem(KEY) || '']).size; }
      catch (e) { return 0; }
    },

    reset: function () { localStorage.removeItem(KEY); return api.list(); }
  };

  /* A visible, honest stand-in: the mount renders, the record is intact,
     the pixels are gone. */
  var PLACEHOLDER = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="900">' +
    '<rect width="1600" height="900" fill="#151b2e"/>' +
    '<g stroke="#222a42" stroke-width="2">' +
    '<path d="M0 225h1600M0 450h1600M0 675h1600M400 0v900M800 0v900M1200 0v900"/></g>' +
    '<text x="800" y="440" fill="#9d9686" font-family="monospace" font-size="34" ' +
    'letter-spacing="6" text-anchor="middle">PLACEHOLDER</text>' +
    '<text x="800" y="490" fill="#313b58" font-family="monospace" font-size="22" ' +
    'letter-spacing="4" text-anchor="middle">PIXELS NOT STORED</text></svg>'
  );

  api.placeholder = PLACEHOLDER;

  AA.util = util;
  AA.store = api;
})(window.AA = window.AA || {});
