/* ============================================================
   Anime Archive — the press
   ------------------------------------------------------------
   Dropzone, live preview, field-scoped validation, the staged
   write. Classic script (no ES module) so the folder opens over
   file:// like the rest of the app.
   ============================================================ */
(function (AA) {
  'use strict';

  var el = {};
  var state = { file: null, url: null, width: 0, height: 0, grid: false, busy: false, read: 0 };

  var MAX_LABEL = (AA.store.maxBytes / (1024 * 1024)) + ' MB';
  var EXT_RE = /\.(jpe?g|png|webp|gif|avif)$/i;
  var IDLE_READOUT = 'No frame selected.';
  var NO_FRAME = 'Choose a frame to continue.';
  var READY = 'Ready to set on the wall.';
  var NOT_DURABLE = 'Kept as a placeholder — this browser had no room left for the pixels.';

  /* Stages 1–3 can each finish inside a single paint on a warm cache, so a
     label would be announced and gone. Hold the stage for a beat so it is
     read; the encode is the genuinely slow step and never waits on this. */
  var STAGE_FLOOR = 90;

  function need(sel, root) {
    var node = (root || document).querySelector(sel);
    if (!node) throw new Error('catalog: "' + sel + '" is missing from index.html');
    return node;
  }

  /* ── Arrival, and what counts as a frame ───────────────────── */

  function fileProblem(f) {
    if (!f) return 'Nothing arrived with the drop. Choose a single image file.';
    if (!f.type && f.size === 0 && !EXT_RE.test(f.name)) {
      return 'That is a folder, not an image. Drop a single image file.';
    }
    /* Some browsers report no MIME type for a file read from disk, so the
       extension has to be allowed to stand in for it. */
    var ok = AA.store.types.indexOf(f.type) !== -1 || (!f.type && EXT_RE.test(f.name));
    if (!ok) return 'Choose a JPEG, PNG, WebP, GIF, or AVIF image.';
    if (f.size > AA.store.maxBytes) {
      return 'This frame is larger than ' + MAX_LABEL + '. Try a smaller export.';
    }
    return '';
  }

  async function take(file) {
    if (state.busy) return;

    var problem = fileProblem(file);
    if (problem) {
      /* Clearing the input also means the same file can be re-picked after
         a fix, which the browser otherwise refuses to fire a change for. */
      clearSelection();
      fail(problem);
      return;
    }

    var read = ++state.read;
    var pv;
    try {
      pv = await AA.store.preview(file);
    } catch (e) {
      if (read !== state.read) return;
      clearSelection();
      fail('This file could not be decoded as an image. Try exporting it again.');
      return;
    }
    if (read !== state.read) { URL.revokeObjectURL(pv.url); return; }

    release();
    state.file = file;
    state.url = pv.url;
    state.width = pv.width;
    state.height = pv.height;

    el.preview.src = pv.url;
    el.preview.hidden = false;
    el.drop.hidden = true;
    el.scan.hidden = false;
    el.gridlines.hidden = !state.grid;
    setReadout(file.name + ' — ' + AA.util.bytes(file.size) + ' — ' + pv.width + ' × ' + pv.height + ' px', false);
    describe();
    updateSubmit();
  }

  /* ── Readout, errors, the alt text ─────────────────────────── */

  function setReadout(text, bad) {
    el.readout.textContent = text;
    el.readout.classList.toggle('is-error', !!bad);
  }

  function fail(msg) {
    setReadout(msg, true);
    AA.app.toast(msg);
  }

  function describe() {
    el.preview.alt = AA.store.altOf({
      title: el.title.value.trim() || (state.file ? state.file.name : 'an untitled frame'),
      series: el.series.value.trim(),
      episode: el.episode.value.trim()
    });
  }

  /* ── Field-scoped errors ───────────────────────────────────── */

  function fieldError(input, err, msg) {
    input.setAttribute('aria-invalid', 'true');
    input.setAttribute('aria-describedby', err.id);
    err.textContent = msg;
    err.hidden = false;
  }

  function clearFieldError(input, err) {
    input.removeAttribute('aria-invalid');
    err.textContent = '';
    err.hidden = true;
  }

  function clearIfInvalid(input, err) {
    if (input.getAttribute('aria-invalid') === 'true') clearFieldError(input, err);
  }

  /* Permissive on purpose: only bare digits are shaped, so mm:ss, hh:mm:ss
     and any note the user typed in place of a timecode all survive. */
  function padTimecode(raw) {
    var v = (raw || '').trim();
    if (!/^\d{1,6}$/.test(v)) return raw;
    var d = v.padStart(6, '0');
    return d.slice(0, 2) + ':' + d.slice(2, 4) + ':' + d.slice(4, 6);
  }

  function parseTags(raw) {
    var out = [], seen = Object.create(null);
    (raw || '').split(',').forEach(function (t) {
      var tag = t.trim();
      if (!tag) return;
      var k = tag.toLowerCase();
      if (seen[k]) return;
      seen[k] = 1;
      out.push(tag);
    });
    return out;
  }

  /* ── Why the primary action is unavailable ─────────────────── */

  function updateSubmit() {
    var want = [];
    if (!el.title.value.trim()) want.push('a title');
    if (!el.series.value.trim()) want.push('a series');
    /* Only the frame gates the button — a missing title must be able to
       produce its own field error, which a disabled button can never show. */
    var ready = !!state.file && !state.busy;

    el.submit.disabled = !ready;
    el.submit.classList.toggle('is-ok', ready);
    el.reason.textContent = !ready ? NO_FRAME
      : want.length ? 'Still needs ' + want.join(' and ') + '.'
      : READY;
  }

  function setBusy(b) {
    state.busy = b;
    el.reset.disabled = b;
    el.cancel.disabled = b;
    updateSubmit();
  }

  /* ── The write ─────────────────────────────────────────────── */

  function setProgress(pct, label) {
    el.fill.style.width = pct + '%';
    el.bar.setAttribute('aria-valuenow', String(pct));
    el.label.textContent = label;
  }

  function wait(ms) {
    return new Promise(function (r) { setTimeout(r, ms); });
  }

  function nextPaint() {
    return new Promise(function (r) {
      requestAnimationFrame(function () { requestAnimationFrame(r); });
    });
  }

  /* The label is painted before the work starts, so "Fitting to 1920 px"
     is on screen while the canvas is grinding, not after it. */
  async function stage(pct, label, work, holdMs) {
    var t0 = performance.now();
    setProgress(pct, label);
    await nextPaint();
    var out = work ? await work() : undefined;
    if (holdMs) {
      var spent = performance.now() - t0;
      if (spent < holdMs) await wait(holdMs - spent);
    }
    return out;
  }

  /* The preview already decoded this file once, but the file is re-opened
     here so a broken export is learned about before the encode rather than
     after it. encode() has its own decode and reports failure honestly, so
     a miss here is not fatal to the write. */
  async function reread() {
    try {
      var pv = await AA.store.preview(state.file);
      if (pv.url) URL.revokeObjectURL(pv.url);
      if (pv.width) { state.width = pv.width; state.height = pv.height; }
    } catch (e) { /* carried by encode() */ }
  }

  async function archive() {
    if (state.busy || !state.file) return;

    var blank = [];
    if (el.title.value.trim()) {
      clearFieldError(el.title, el.errTitle);
    } else {
      fieldError(el.title, el.errTitle, 'Give the frame a title so you can find it again.');
      blank.push(el.title);
    }
    if (el.series.value.trim()) {
      clearFieldError(el.series, el.errSeries);
    } else {
      fieldError(el.series, el.errSeries, 'Name the series it came from.');
      blank.push(el.series);
    }
    if (blank.length) { blank[0].focus(); return; }

    setBusy(true);
    el.progress.hidden = false;
    var made;
    try {
      await stage(10, 'Preparing frame', null, STAGE_FLOOR);
      await stage(30, 'Reading the image', reread, STAGE_FLOOR);
      var enc = await stage(60, 'Fitting to 1920 px', function () {
        return AA.store.encode(state.file);
      }, STAGE_FLOOR);
      made = await stage(85, 'Writing to this browser', function () {
        return AA.store.create({
          title: el.title.value,
          series: el.series.value,
          episode: el.episode.value,
          timecode: el.timecode.value,
          tags: parseTags(el.tags.value),
          note: el.note.value,
          starred: false,
          /* encode() reports 0×0 when it could not decode the source at all;
             the live dimensions keep the mount and the slate honest. */
          width: enc.width || state.width,
          height: enc.height || state.height,
          src: enc.src,
          durable: enc.durable
        });
      }, 0);
    } catch (e) {
      made = { error: 'This frame could not be read. Try a different export.' };
    }

    if (made.error) {
      el.progress.hidden = true;
      setBusy(false);
      fail(made.error);
      return;
    }

    await stage(100, 'Stamping', null, 0);
    succeed(made.frame);
  }

  function succeed(frame) {
    var title = el.title.value.trim();
    el.doneBody.textContent = frame.durable
      ? '"' + title + '" is now on the wall, in this browser.'
      : '"' + title + '" is on the wall, but only as a placeholder — this browser had no room left for the pixels.';
    if (!frame.durable) AA.app.toast(NOT_DURABLE);

    el.progress.hidden = true;
    el.form.hidden = true;
    el.acts.hidden = true;
    el.done.hidden = false;
    setBusy(false);

    AA.app.rerender();
    el.again.focus();
  }

  /* ── Teardown ──────────────────────────────────────────────── */

  /* The object URL holds the whole file for the page's lifetime; without
     the revoke every pick leaks a blob. */
  function release() {
    state.read++;
    if (state.url) { URL.revokeObjectURL(state.url); state.url = null; }
  }

  function clearSelection() {
    release();
    state.file = null;
    state.width = 0;
    state.height = 0;
    el.file.value = '';
    el.preview.hidden = true;
    el.preview.removeAttribute('src');
    el.preview.alt = '';
    el.scan.hidden = true;
    el.drop.hidden = false;
    el.gridlines.hidden = !state.grid;
    updateSubmit();
  }

  function reset(back) {
    clearSelection();
    [el.title, el.series, el.episode, el.tags, el.timecode, el.note].forEach(function (f) { f.value = ''; });
    clearFieldError(el.title, el.errTitle);
    clearFieldError(el.series, el.errSeries);
    setReadout(IDLE_READOUT, false);
    el.progress.hidden = true;
    el.form.hidden = false;
    el.acts.hidden = false;
    el.done.hidden = true;
    el.doneBody.textContent = '';
    setBusy(false);
    /* Coming back from the stamp, focus would otherwise land on a control
       that has just been hidden. */
    if (back) el.browse.focus();
  }

  /* ── Wiring ────────────────────────────────────────────────── */

  function bind() {
    el.browse.addEventListener('click', function () { el.file.click(); });
    el.dropzone.addEventListener('click', function (e) {
      if (e.target !== el.browse) el.file.click();
    });
    el.dropzone.addEventListener('keydown', function (e) {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      /* The browse button activates itself on these keys — forwarding too
         would open two file dialogs for one press. */
      if (e.target === el.browse) return;
      e.preventDefault();
      el.browse.click();
    });

    /* Counting enter/leave: moving the pointer across the dropzone's own
       children fires pairs of events, and a boolean would flicker. */
    var depth = 0;
    el.dropzone.addEventListener('dragenter', function (e) {
      e.preventDefault();
      depth++;
      el.dropzone.classList.add('is-over');
    });
    el.dropzone.addEventListener('dragover', function (e) {
      e.preventDefault();
      el.dropzone.classList.add('is-over');
    });
    el.dropzone.addEventListener('dragleave', function (e) {
      e.preventDefault();
      if (--depth > 0) return;
      depth = 0;
      el.dropzone.classList.remove('is-over');
    });
    el.dropzone.addEventListener('drop', function (e) {
      e.preventDefault();
      depth = 0;
      el.dropzone.classList.remove('is-over');
      take(e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0]);
    });

    el.file.addEventListener('change', function () { take(el.file.files[0]); });

    document.addEventListener('paste', function (e) {
      if (document.documentElement.dataset.view !== 'press') return;
      var items = e.clipboardData && e.clipboardData.items;
      if (!items) return;
      for (var i = 0; i < items.length; i++) {
        if (items[i].kind !== 'file') continue;
        e.preventDefault();
        take(items[i].getAsFile());
        return;
      }
    });

    el.gridToggle.addEventListener('click', function () {
      state.grid = !state.grid;
      el.gridToggle.setAttribute('aria-pressed', String(state.grid));
      el.gridlines.hidden = !state.grid;
    });

    el.form.addEventListener('input', function (e) {
      if (e.target === el.title) clearIfInvalid(el.title, el.errTitle);
      else if (e.target === el.series) clearIfInvalid(el.series, el.errSeries);
      updateSubmit();
      describe();
    });
    el.timecode.addEventListener('blur', function () {
      el.timecode.value = padTimecode(el.timecode.value);
    });

    el.form.addEventListener('submit', function (e) { e.preventDefault(); archive(); });
    el.submit.addEventListener('click', function () { archive(); });
    el.reset.addEventListener('click', function () { reset(false); });
    el.again.addEventListener('click', function () { reset(true); });

    /* The picker and the validator must agree on what is acceptable. */
    el.file.accept = AA.store.types.join(',');
  }

  function init() {
    el.dropzone = need('#dropzone');
    el.drop = need('#drop');
    el.browse = need('#browse');
    el.file = need('#file');
    el.preview = need('#preview');
    el.scan = need('#scan');
    el.gridlines = need('#gridlines');
    el.gridToggle = need('#grid-toggle');
    el.readout = need('#readout');

    el.form = need('#form');
    el.acts = need('.press__acts');
    el.title = need('#f-title');
    el.series = need('#f-series');
    el.episode = need('#f-episode');
    el.tags = need('#f-tags');
    el.timecode = need('#f-timecode');
    el.note = need('#f-note');
    el.errTitle = need('#e-title');
    el.errSeries = need('#e-series');

    el.submit = need('#submit');
    el.reason = need('#submit-reason');
    el.reset = need('#reset');
    el.cancel = need('.press__acts [data-nav="wall"]');

    el.progress = need('#progress');
    el.bar = need('.progress__bar', el.progress);
    el.fill = need('#progress-fill', el.progress);
    el.label = need('#progress-label', el.progress);

    el.done = need('#done');
    el.doneBody = need('#done-body');
    el.again = need('#again');

    el.timecode.title = 'mm:ss or hh:mm:ss. Bare digits are padded to HH:MM:SS when you leave the field.';

    bind();
    updateSubmit();
  }

  AA.catalog = { init: init };
})(window.AA = window.AA || {});
