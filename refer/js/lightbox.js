/* ============================================================
   Anime Archive — the loupe
   ------------------------------------------------------------
   The detail view: a FLIP in and out of the wall, zoom and pan,
   a real focus trap, the slate, in-place edit, delete with a
   confirm.

   Classic script (no ES module) so the folder opens over file://.
   ============================================================ */
(function (AA) {
  'use strict';

  var FLIP_MS = 420;
  var ZOOM_MS = 200;
  var MIN_ZOOM = 0.1;
  var MAX_ZOOM = 6;
  var FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), ' +
                  'select:not([disabled]), textarea:not([disabled]), ' +
                  '[tabindex]:not([tabindex="-1"])';

  var loupe, inner, stage, img, closeBtn, prevBtn, nextBtn, segBtns, oneBtn,
      accessionEl, titleEl, altEl, rowsEl, warnEl, starEl, actsEl,
      editForm, errEl, editBtn, deleteBtn, confirmBox, confirmTitle, keepBtn,
      fTitle, fSeries, fEpisode, fTimecode, fTags, fNote,
      background, reels, ready = false;

  var state = {
    open: false, frame: null, mode: 'fit', z: 1, x: 0, y: 0,
    origin: null, returnFocus: null, savedOverflow: '', anim: null, zoomAnim: null,
    locked: false
  };
  var cycle = 0;
  var drag = null;
  var draggedAt = 0;

  /* ── small helpers ───────────────────────────────────────── */

  function need(sel, root) {
    var el = AA.util.qs(sel, root);
    if (!el) throw new Error('lightbox.js: required element not found — ' + sel);
    return el;
  }

  function reduced() {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  function easeSnap() {
    var v = window.getComputedStyle(document.documentElement)
      .getPropertyValue('--ease-snap').trim();
    return v || 'cubic-bezier(.16, 1, .3, 1)';
  }

  /* A stylesheet that gives these panels a `display` would beat the UA
     `[hidden]` rule, so hiding pins display:none and showing clears it. */
  function setShown(el, on) {
    el.hidden = !on;
    el.style.display = on ? '' : 'none';
  }

  function visible() { return (AA.app && AA.app.visible) || []; }
  function rerender() { if (AA.app && AA.app.rerender) AA.app.rerender(); }
  function notify(msg) { if (AA.app && AA.app.toast) AA.app.toast(msg); }

  function cx(r) { return r.left + r.width / 2; }
  function cy(r) { return r.top + r.height / 2; }

  function pair(frag, term, value) {
    var dt = document.createElement('dt');
    dt.textContent = term;
    var dd = document.createElement('dd');
    if (value !== null) dd.textContent = value;
    frag.appendChild(dt);
    frag.appendChild(dd);
    return dd;
  }

  /* ── init ────────────────────────────────────────────────── */

  function init() {
    if (ready) return;
    ready = true;

    loupe = need('#loupe');
    inner = need('.loupe__inner', loupe);
    stage = need('#loupe-stage', inner);
    img = need('#loupe-img', stage);
    closeBtn = need('.loupe__bar [data-close]', loupe);
    prevBtn = need('[data-act="prev"]', loupe);
    nextBtn = need('[data-act="next"]', loupe);
    segBtns = AA.util.qsa('[data-zoom]', loupe);
    oneBtn = AA.util.qs('[data-zoom="one"]', loupe);

    accessionEl = need('#slate-accession', loupe);
    titleEl = need('#loupe-title', loupe);
    altEl = need('#slate-alt', loupe);
    rowsEl = need('#slate-rows', loupe);
    warnEl = need('#slate-warn', loupe);
    starEl = need('#slate-star', loupe);
    actsEl = need('.slate__acts', loupe);
    editBtn = need('[data-act="edit"]', actsEl);
    deleteBtn = need('[data-act="delete"]', actsEl);

    editForm = need('#slate-edit', loupe);
    errEl = need('#slate-err', loupe);
    fTitle = need('#s-title', editForm);
    fSeries = need('#s-series', editForm);
    fEpisode = need('#s-episode', editForm);
    fTimecode = need('#s-timecode', editForm);
    fTags = need('#s-tags', editForm);
    fNote = need('#s-note', editForm);

    confirmBox = need('#confirm', loupe);
    confirmTitle = need('#confirm-title', loupe);
    keepBtn = need('[data-act="delete-no"]', confirmBox);

    background = AA.util.qsa('.topbar, main, .foot');
    reels = AA.util.qs('#reels');

    fTitle.setAttribute('aria-describedby', 'slate-err');
    fSeries.setAttribute('aria-describedby', 'slate-err');
    errEl.setAttribute('role', 'alert');

    /* Listeners live on the loupe subtree, which is inert until it opens, so
       they cost nothing while closed and cannot accumulate over cycles. Only
       the document listener is per-open, and close() removes it. */
    loupe.addEventListener('click', onClick);
    inner.addEventListener('keydown', onKey);
    stage.addEventListener('wheel', onWheel, { passive: false });
    stage.addEventListener('pointerdown', onPointerDown);
    stage.addEventListener('pointermove', onPointerMove);
    stage.addEventListener('pointerup', onPointerUp);
    stage.addEventListener('pointercancel', onPointerUp);
    stage.addEventListener('dblclick', onDblClick);
    editForm.addEventListener('submit', onSubmit);
    window.addEventListener('resize', onResize);

    img.draggable = false;
  }

  /* ── open / close ────────────────────────────────────────── */

  function mountFor(id) {
    var mounts = AA.util.qsa('.mount', reels || document);
    for (var i = 0; i < mounts.length; i++) {
      if (mounts[i].getAttribute('data-id') === id) return mounts[i];
    }
    return null;
  }

  function originFor(id) {
    var mount = mountFor(id);
    if (!mount) return null;
    return AA.util.qs('.mount__frame', mount) ||
           AA.util.qs('.mount__open', mount) ||
           mount;
  }

  /* Any mutation (star, edit, filter) redraws the wall and detaches whatever
     opened the loupe, so fall back to the same card by id rather than
     dropping a keyboard user back on <body> with their place lost. */
  function restoreTarget() {
    var back = state.returnFocus;
    if (back && back.isConnected && typeof back.focus === 'function') return back;
    if (!state.frame) return null;
    var mount = mountFor(state.frame.id);
    return mount ? AA.util.qs('.mount__open', mount) : null;
  }

  function open(frame) {
    if (!frame || !frame.id) return;
    var f = AA.store.get(frame.id) || frame;
    if (state.open) { render(f); resetZoom(); reportOne(); return; }

    var origin = originFor(f.id);
    var from = origin ? origin.getBoundingClientRect() : null;

    if (state.anim) { state.anim.cancel(); state.anim = null; }
    cycle += 1;
    var token = cycle;

    state.open = true;
    state.origin = origin;
    state.returnFocus = document.activeElement;
    /* Only the first open of a cycle records the page's own overflow: a
       re-open while a close is still animating would otherwise capture the
       lock as the value to restore and leave the page unscrollable for good. */
    if (!state.locked) {
      state.savedOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      state.locked = true;
    }
    background.forEach(function (el) { el.inert = true; });
    /* Bubble phase, not capture: the dialog's own handler must run first and
       stop the event for keys it consumes, or it would never be reached. */
    document.addEventListener('keydown', onKey);

    setShown(loupe, true);
    render(f);
    resetZoom();
    reportOne();
    closeBtn.focus();

    var delta = flipDelta(from);
    if (!delta || reduced() || typeof loupe.animate !== 'function') return;

    /* The FLIP rides on the wrapper and the zoom lives on the image, so the
       two transforms can never fight. Both keyframes pin the origin to the
       box centre, which is the geometry flipDelta() was computed against. */
    loupe.classList.add('is-flipping');
    loupe.style.pointerEvents = 'none';
    state.anim = loupe.animate(
      [
        { transformOrigin: '50% 50%', transform: transformOf(delta) },
        { transformOrigin: '50% 50%', transform: 'none' }
      ],
      { duration: FLIP_MS, easing: easeSnap(), fill: 'none' }
    );
    state.anim.finished.then(function () {
      if (token !== cycle) return;
      state.anim = null;
      loupe.classList.remove('is-flipping');
      loupe.style.pointerEvents = '';
      loupe.style.transform = '';
      loupe.style.opacity = '';
    }, function () { /* cancelled by a fresh open or close */ });
  }

  function close() {
    if (!state.open) return;
    state.open = false;
    cycle += 1;
    var token = cycle;
    document.removeEventListener('keydown', onKey);
    if (state.anim) { state.anim.cancel(); state.anim = null; }
    if (state.zoomAnim) { state.zoomAnim.cancel(); state.zoomAnim = null; }

    resetZoom();
    var origin = originFor(state.frame ? state.frame.id : '') ||
                 (state.origin && state.origin.isConnected ? state.origin : null);
    var delta = flipDelta(origin ? origin.getBoundingClientRect() : null);

    function teardown() {
      if (token !== cycle) return;
      setShown(loupe, false);
      loupe.classList.remove('is-flipping');
      loupe.style.transform = '';
      loupe.style.opacity = '';
      loupe.style.pointerEvents = '';
      document.body.style.overflow = state.savedOverflow;
      state.locked = false;
      background.forEach(function (el) { el.inert = false; });
      var target = restoreTarget();
      state.returnFocus = null;
      state.origin = null;
      state.frame = null;
      drag = null;
      draggedAt = 0;
      /* Inert is lifted first: focus cannot enter a subtree that is still
         inert, and the card being returned to lives in <main>. */
      if (target) target.focus();
    }

    if (!delta || reduced() || typeof loupe.animate !== 'function') { teardown(); return; }

    loupe.classList.add('is-flipping');
    loupe.style.pointerEvents = 'none';
    state.anim = loupe.animate(
      [
        { transformOrigin: '50% 50%', transform: 'none' },
        { transformOrigin: '50% 50%', transform: transformOf(delta) }
      ],
      { duration: FLIP_MS, easing: easeSnap(), fill: 'none' }
    );
    state.anim.finished.then(teardown, teardown);
  }

  function isOpen() { return state.open; }

  function flipDelta(from) {
    if (!from || !from.width || !from.height) return null;
    var d = stage.getBoundingClientRect();
    var w = loupe.getBoundingClientRect();
    if (!d.width || !d.height || !w.width || !w.height) return null;
    /* Uniform and contained: the print must not look bigger on the wall than
       the mount it came off, and a non-uniform scale would squash the frame. */
    var s = Math.min(from.width / d.width, from.height / d.height);
    if (!isFinite(s) || s <= 0) return null;
    return {
      s: s,
      x: cx(from) - cx(w) - s * (cx(d) - cx(w)),
      y: cy(from) - cy(w) - s * (cy(d) - cy(w))
    };
  }

  function transformOf(d) {
    return 'translate(' + d.x + 'px,' + d.y + 'px) scale(' + d.s + ')';
  }

  /* ── the slate ───────────────────────────────────────────── */

  function render(f) {
    state.frame = f;
    var alt = AA.store.altOf(f);

    accessionEl.textContent = f.accession || '';
    titleEl.textContent = f.title || 'Untitled frame';
    altEl.textContent = alt;

    /* On a card the alt is empty because the caption beside it names the
       frame; here the image is the subject of the view, so it gets prose. */
    img.alt = alt;
    if (f.width && f.height) {
      img.setAttribute('width', f.width);
      img.setAttribute('height', f.height);
    } else {
      img.removeAttribute('width');
      img.removeAttribute('height');
    }
    img.onerror = onImgError;
    img.src = f.src;

    setShown(warnEl, !f.durable);

    var frag = document.createDocumentFragment();
    if (f.series) pair(frag, 'Series', f.series);
    if (f.episode) pair(frag, 'Episode', f.episode);
    if (f.timecode) pair(frag, 'Timecode', f.timecode);
    if (f.width && f.height) pair(frag, 'Dimensions', f.width + ' × ' + f.height + ' px');
    if (f.addedAt) pair(frag, 'Added', AA.util.date(f.addedAt));
    if (f.tags && f.tags.length) {
      var dd = pair(frag, 'Tags', null);
      f.tags.forEach(function (tag) {
        var chip = document.createElement('span');
        chip.className = 'slate__tag';
        chip.textContent = tag;
        dd.appendChild(chip);
      });
    }
    if (f.note) pair(frag, 'Note', f.note);
    rowsEl.replaceChildren(frag);

    setStar(!!f.starred);
    syncNav();
  }

  function onImgError() {
    img.onerror = null;
    img.src = AA.store.placeholder;
  }

  function setStar(on) {
    starEl.textContent = on ? 'Starred' : 'Star';
    starEl.setAttribute('aria-pressed', on ? 'true' : 'false');
  }

  function toggleStar() {
    var f = state.frame;
    if (!f) return;
    var res = AA.store.update(f.id, { starred: !f.starred });
    if (res.error) { notify(res.error); return; }
    state.frame = res.frame;
    setStar(!!res.frame.starred);
    rerender();
  }

  /* ── navigation ──────────────────────────────────────────── */

  /* The visible list is the wall's, and the wall may hand it over as plain
     frames or as its own row wrappers ({f, text, ratio}). A Frame has no `f`,
     so this is unambiguous; the loupe only ever needs the frame itself. */
  function frameOf(entry) {
    return entry && entry.f ? entry.f : entry;
  }

  function indexOf(f) {
    if (!f) return -1;
    var list = visible();
    for (var i = 0; i < list.length; i++) if (frameOf(list[i]).id === f.id) return i;
    return -1;
  }

  function syncNav() {
    var i = indexOf(state.frame);
    var list = visible();
    prevBtn.disabled = !(i > 0);
    nextBtn.disabled = !(i > -1 && i < list.length - 1);
    /* A disabled button drops focus to the body, which would strand the
       keyboard; hand it to the close button before that happens. */
    if (document.activeElement === prevBtn && prevBtn.disabled) closeBtn.focus();
    if (document.activeElement === nextBtn && nextBtn.disabled) closeBtn.focus();
  }

  function step(dir) {
    if (!state.frame) return;
    if (!AA.store.get(state.frame.id)) { close(); return; }
    var list = visible();
    var t = indexOf(state.frame) + dir;
    if (t < 0 || t >= list.length) return;
    var next = frameOf(list[t]);
    render(AA.store.get(next.id) || next);
    resetZoom();
    reportOne();
  }

  /* ── zoom and pan ────────────────────────────────────────── */

  function stageBox() {
    var r = stage.getBoundingClientRect();
    return { w: r.width, h: r.height };
  }

  function ratio() {
    var f = state.frame;
    var w = (f && f.width) || img.naturalWidth || 0;
    var h = (f && f.height) || img.naturalHeight || 0;
    return w && h ? w / h : 1.5;
  }

  /* The image as object-fit: contain renders it inside the stage at scale 1. */
  function shown(m) {
    var ar = ratio();
    if (ar > m.w / m.h) return { w: m.w, h: m.w / ar };
    return { w: m.h * ar, h: m.h };
  }

  function resetZoom() { setZoomMode('fit', false); }

  function setZoomMode(mode, animate) {
    state.mode = mode;
    var z = 1;
    if (mode !== 'fit' && state.frame) {
      var m = stageBox();
      var box = shown(m);
      z = mode === 'fill'
        ? Math.max(m.w / box.w, m.h / box.h)
        : Math.max(1, (state.frame.width || box.w) / box.w);
    }
    state.z = AA.util.clamp(z, MIN_ZOOM, MAX_ZOOM);
    state.x = 0;
    state.y = 0;
    segBtns.forEach(function (b) {
      b.classList.toggle('is-on', b.getAttribute('data-zoom') === mode);
    });
    apply(animate);
  }

  /* 1:1 is only honest while the frame is larger than the stage. Saying so in
     the button's name beats reporting a pixel ratio the label cannot show. */
  function reportOne() {
    if (!oneBtn) return;
    var m = stageBox();
    var box = shown(m);
    var natural = (state.frame && state.frame.width) || 0;
    var at1 = natural && box.w ? natural / box.w : 1;
    oneBtn.setAttribute('aria-label', at1 >= 1
      ? '1:1 — actual pixels'
      : '1:1 — actual pixels, but this frame is smaller than the stage, so it is shown fitted');
  }

  function freeZoom(animate) {
    state.mode = 'free';
    segBtns.forEach(function (b) { b.classList.remove('is-on'); });
    apply(animate);
  }

  function clampPan() {
    var m = stageBox();
    var box = shown(m);
    /* The transform is scale() then translate(), so a pan of x lands z·x on
       screen; the divisor keeps the clamp in transform units. */
    var maxX = Math.max(0, (box.w * state.z - m.w) / (2 * state.z));
    var maxY = Math.max(0, (box.h * state.z - m.h) / (2 * state.z));
    state.x = AA.util.clamp(state.x, -maxX, maxX);
    state.y = AA.util.clamp(state.y, -maxY, maxY);
  }

  function apply(animate) {
    var next = (state.z === 1 && !state.x && !state.y)
      ? 'none'
      : 'scale(' + state.z + ') translate(' + state.x + 'px,' + state.y + 'px)';
    if (state.zoomAnim) { state.zoomAnim.cancel(); state.zoomAnim = null; }
    if (animate && !reduced() && typeof img.animate === 'function') {
      var from = window.getComputedStyle(img).transform;
      img.style.transform = next;
      state.zoomAnim = img.animate(
        [{ transform: from }, { transform: next }],
        { duration: ZOOM_MS, easing: 'cubic-bezier(.2,.8,.2,1)' }
      );
      return;
    }
    img.style.transform = next;
  }

  function zoomBy(f) {
    var z = AA.util.clamp(state.z * f, MIN_ZOOM, MAX_ZOOM);
    if (z === state.z) return;
    state.z = z;
    clampPan();
    freeZoom(true);
  }

  function onWheel(e) {
    if (!state.open) return;
    e.preventDefault();
    var d = e.deltaY * (e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? 100 : 1);
    var r = stage.getBoundingClientRect();
    var dx = e.clientX - cx(r);
    var dy = e.clientY - cy(r);
    var z0 = state.z;
    var z1 = AA.util.clamp(z0 * Math.exp(-d * 0.0015), MIN_ZOOM, MAX_ZOOM);
    if (z1 === z0) return;
    /* Hold the point under the cursor still while the scale changes. */
    state.x = dx / z1 - (dx / z0 - state.x);
    state.y = dy / z1 - (dy / z0 - state.y);
    state.z = z1;
    clampPan();
    freeZoom(false);
  }

  function onPointerDown(e) {
    if (!state.open || e.button !== 0 || state.z <= 1) return;
    drag = { x: e.clientX, y: e.clientY, px: state.x, py: state.y, moved: 0 };
    if (stage.setPointerCapture) stage.setPointerCapture(e.pointerId);
    e.preventDefault();
  }

  function onPointerMove(e) {
    if (!drag) return;
    var dx = e.clientX - drag.x;
    var dy = e.clientY - drag.y;
    drag.moved = Math.max(drag.moved, Math.abs(dx) + Math.abs(dy));
    state.x = drag.px + dx / state.z;
    state.y = drag.py + dy / state.z;
    clampPan();
    apply(false);
  }

  function onPointerUp(e) {
    if (!drag) return;
    if (stage.releasePointerCapture) {
      try { stage.releasePointerCapture(e.pointerId); } catch (err) { /* already gone */ }
    }
    /* A pan that moved must not read as the first click of a double click. */
    if (drag.moved > 4) draggedAt = Date.now();
    drag = null;
  }

  function onDblClick(e) {
    if (!state.open || Date.now() - draggedAt < 300) return;
    setZoomMode(state.mode === 'one' ? 'fit' : 'one', true);
  }

  function onResize() {
    if (!state.open) return;
    if (state.mode === 'fill' || state.mode === 'one') setZoomMode(state.mode, false);
    else { clampPan(); apply(false); }
    reportOne();
  }

  /* ── edit ────────────────────────────────────────────────── */

  function enterEdit() {
    var f = state.frame;
    if (!f) return;
    fTitle.value = f.title || '';
    fSeries.value = f.series || '';
    fEpisode.value = f.episode || '';
    fTimecode.value = f.timecode || '';
    fTags.value = (f.tags || []).join(', ');
    fNote.value = f.note || '';
    clearError();
    setShown(rowsEl, false);
    setShown(actsEl, false);
    setShown(editForm, true);
    fTitle.focus();
  }

  function leaveEdit() {
    setShown(editForm, false);
    setShown(rowsEl, true);
    setShown(actsEl, true);
    clearError();
    editBtn.focus();
  }

  function clearError() {
    setShown(errEl, false);
    fTitle.removeAttribute('aria-invalid');
    fSeries.removeAttribute('aria-invalid');
  }

  function fieldError(input, message) {
    errEl.textContent = message;
    setShown(errEl, true);
    input.setAttribute('aria-invalid', 'true');
    input.focus();
  }

  function onSubmit(e) {
    e.preventDefault();
    var f = state.frame;
    if (!f) return;
    var title = fTitle.value.trim();
    var series = fSeries.value.trim();
    clearError();
    if (!title) { fieldError(fTitle, 'A frame needs a title.'); return; }
    if (!series) { fieldError(fSeries, 'A frame needs a series — the wall groups by it.'); return; }

    var res = AA.store.update(f.id, {
      title: title,
      series: series,
      episode: fEpisode.value.trim(),
      timecode: fTimecode.value.trim(),
      tags: fTags.value.split(',').map(function (t) { return t.trim(); }).filter(Boolean),
      note: fNote.value.trim()
    });
    if (res.error) { errEl.textContent = res.error; setShown(errEl, true); return; }
    leaveEdit();
    render(res.frame);
    rerender();
  }

  /* ── delete ──────────────────────────────────────────────── */

  function openConfirm() {
    var f = state.frame;
    if (!f) return;
    confirmTitle.textContent = 'Remove ' + (f.accession || 'this frame') + ' from the wall?';
    setShown(actsEl, false);
    setShown(confirmBox, true);
    keepBtn.focus();
  }

  function closeConfirm() {
    setShown(confirmBox, false);
    setShown(actsEl, true);
    deleteBtn.focus();
  }

  function doDelete() {
    var f = state.frame;
    if (!f) return;
    var res = AA.store.remove(f.id);
    if (res.error) { notify(res.error); return; }
    var accession = f.accession;
    close();
    rerender();
    notify(accession + ' removed from the wall.');
  }

  /* ── events ──────────────────────────────────────────────── */

  function onClick(e) {
    if (!state.open || !e.target || !e.target.closest) return;
    if (e.target.closest('[data-close]')) { close(); return; }
    var zoom = e.target.closest('[data-zoom]');
    if (zoom) { setZoomMode(zoom.getAttribute('data-zoom'), true); return; }
    var act = e.target.closest('[data-act]');
    if (!act) return;
    switch (act.getAttribute('data-act')) {
      case 'prev': step(-1); break;
      case 'next': step(1); break;
      case 'edit': enterEdit(); break;
      case 'edit-cancel': leaveEdit(); break;
      case 'star': toggleStar(); break;
      case 'delete': openConfirm(); break;
      case 'delete-yes': doDelete(); break;
      case 'delete-no': closeConfirm(); break;
    }
  }

  function isTyping(el) {
    if (!el || !el.tagName) return false;
    var t = el.tagName;
    return t === 'INPUT' || t === 'TEXTAREA' || t === 'SELECT' || el.isContentEditable === true;
  }

  function focusables() {
    return AA.util.qsa(FOCUSABLE, inner).filter(function (el) {
      return !el.disabled && !el.closest('[hidden]');
    });
  }

  function trapTab(e) {
    var list = focusables();
    if (!list.length) { e.preventDefault(); inner.focus(); return; }
    var i = list.indexOf(document.activeElement);
    var n = e.shiftKey
      ? (i <= 0 ? list.length - 1 : i - 1)
      : (i === -1 || i === list.length - 1 ? 0 : i + 1);
    list[n].focus();
    e.preventDefault();
    e.stopPropagation();
  }

  /* Bound to the dialog and, while open, to the document as a backstop for
     the moments focus is not inside it — a disabled nav button, a click on
     the scrim. Handled keys stop propagating so the two never both fire. */
  function onKey(e) {
    if (!state.open) return;
    if (e.key === 'Tab') { trapTab(e); return; }
    if (e.key === 'Escape') { onEscape(); consume(e); return; }
    if (e.altKey || e.ctrlKey || e.metaKey) return;
    /* Inside a field every remaining key is something the user is writing. */
    if (isTyping(e.target)) return;

    if (e.key === 'ArrowLeft') { step(-1); consume(e); return; }
    if (e.key === 'ArrowRight') { step(1); consume(e); return; }
    if (e.key === 'Delete' || e.key === 'Backspace') { openConfirm(); consume(e); return; }
    if (e.key === '+' || e.key === '=') { zoomBy(1.25); consume(e); return; }
    if (e.key === '-') { zoomBy(1 / 1.25); consume(e); return; }
    if (e.key === '0') { setZoomMode('fit', true); consume(e); return; }
    var k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    if (k === 'f') { toggleStar(); consume(e); return; }
    if (k === 'e') { enterEdit(); consume(e); return; }
  }

  function onEscape() {
    if (!confirmBox.hidden) { closeConfirm(); return; }
    if (!editForm.hidden) { leaveEdit(); return; }
    close();
  }

  function consume(e) {
    e.preventDefault();
    e.stopPropagation();
  }

  AA.lightbox = {
    init: init,
    open: open,
    close: close,
    isOpen: isOpen
  };
})(window.AA = window.AA || {});
