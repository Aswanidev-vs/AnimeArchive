/* ============================================================
   Anime Archive — wall
   ------------------------------------------------------------
   The wall itself: control bar, active-filter chips, status
   line, the empty/loading/error states, and the grid of
   mounted prints (masonry + the raking lamp).

   Also owns the filter half of the URL contract, so a wall can
   be linked to and Back leaves the page instead of walking
   through keystrokes.

   Classic script (no ES module) so the folder opens over file://.
   ============================================================ */
(function (AA) {
  'use strict';

  /* #status is aria-live: announcing "Showing 4 of 9" on every
     keystroke makes the wall unusable with a screen reader, so
     every write is debounced (DESIGN.md §4). */
  var STATUS_MS = 400;
  var QUERY_MS = 200;

  /* --dur-reveal cascade, capped so the last card on a long wall
     is never far behind the first (DESIGN.md §3.6). */
  var REVEAL_CAP = 8;
  var REVEAL_STEP = 45;

  /* Only used when the grid exposes no fixed track height. */
  var ROW_UNIT = 8;
  var CHROME_FALLBACK = 120;

  var IMG_W = 1600, IMG_H = 900;
  var SORTS = ['newest', 'oldest', 'title', 'series'];
  var VIEWS = ['wall', 'series'];

  var UNTITLED = 'Untitled frame';
  var NOT_DURABLE = 'The pixels of this frame will not survive a reload.';

  var dom = {};
  var grids = new Map();
  var seriesSeen = null;
  var qTimer = 0, statusTimer = 0, qDirty = false, rafId = 0, ro = null;

  /* ── helpers ───────────────────────────────────────────── */

  function make(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  /* "series" and "starred" are both invariant, so only this one takes
     an s — a generic pluraliser gets "seriess" wrong. */
  function frames(n) { return n + (n === 1 ? ' frame' : ' frames'); }

  function cmp(a, b) { return a < b ? -1 : a > b ? 1 : 0; }

  function byAccession(a, b) {
    return cmp(String(a.accession || ''), String(b.accession || ''));
  }

  function prepare(frames) {
    return frames.map(function (f) {
      var text = [f.title, f.series, f.episode, f.note, (f.tags || []).join(' ')]
        .join(' ').toLowerCase();
      var ratio = (f.width > 0 && f.height > 0) ? f.height / f.width : IMG_H / IMG_W;
      return { f: f, text: text, ratio: ratio };
    });
  }

  /* starred → exact series → substring of title + series + episode
     + note + tags. */
  function pick(rows, starred, series, needle) {
    var out = [];
    for (var i = 0; i < rows.length; i++) {
      var f = rows[i].f;
      if (starred && !f.starred) continue;
      if (series && (f.series || '') !== series) continue;
      if (needle && rows[i].text.indexOf(needle) === -1) continue;
      out.push(rows[i]);
    }
    return out;
  }

  function order(rows, sort) {
    var out = rows.slice();
    if (sort === 'title') {
      out.sort(function (a, b) {
        return (a.f.title || '').localeCompare(b.f.title || '') || byAccession(a.f, b.f);
      });
    } else if (sort === 'series') {
      out.sort(function (a, b) {
        var sa = a.f.series || '', sb = b.f.series || '';
        if (!sa !== !sb) return sa ? -1 : 1;
        return cmp(sa, sb) || cmp(b.f.addedAt, a.f.addedAt) || byAccession(a.f, b.f);
      });
    } else {
      var dir = sort === 'oldest' ? 1 : -1;
      out.sort(function (a, b) {
        return cmp(a.f.addedAt, b.f.addedAt) * dir || byAccession(a.f, b.f);
      });
    }
    return out;
  }

  function groupBySeries(rows) {
    var byName = new Map();
    rows.forEach(function (r) {
      var name = r.f.series || '';
      if (!byName.has(name)) byName.set(name, []);
      byName.get(name).push(r);
    });
    var names = [];
    byName.forEach(function (v, k) { if (k) names.push(k); });
    names.sort(function (a, b) { return a.localeCompare(b); });
    var out = names.map(function (n) { return { name: n, rows: byName.get(n) }; });
    if (byName.has('')) out.push({ name: 'Unsorted', rows: byName.get('') });
    return out;
  }

  /* ── status line ───────────────────────────────────────── */

  function sayStatus(n, total) {
    if (statusTimer) { clearTimeout(statusTimer); statusTimer = 0; }
    statusTimer = setTimeout(function () {
      statusTimer = 0;
      dom.status.textContent = 'Showing ' + n + ' of ' + frames(total);
    }, STATUS_MS);
  }

  function silenceStatus() {
    if (statusTimer) { clearTimeout(statusTimer); statusTimer = 0; }
    dom.status.textContent = '';
  }

  /* ── controls ──────────────────────────────────────────── */

  function drawControls(state) {
    /* Mid-word the input owns its own text: a redraw from any other
       source (a star toggle) must not swallow the keystrokes. */
    if (!qDirty && dom.q.value !== (state.q || '')) dom.q.value = state.q || '';
    if (dom.sort.value !== state.sort) dom.sort.value = state.sort;

    var list = AA.store.series();
    if (!seriesSeen || seriesSeen.length !== list.length ||
        list.some(function (s, i) { return seriesSeen[i] !== s; })) {
      var frag = document.createDocumentFragment();
      var allOpt = make('option', null, 'All series');
      allOpt.value = '';
      frag.appendChild(allOpt);
      list.forEach(function (s) {
        var o = make('option', null, s);
        o.value = s;
        frag.appendChild(o);
      });
      dom.series.replaceChildren(frag);
      seriesSeen = list;
    }
    var want = list.indexOf(state.series) === -1 ? '' : state.series;
    if (dom.series.value !== want) dom.series.value = want;

    var on = !!state.starred;
    dom.starred.setAttribute('aria-pressed', on ? 'true' : 'false');
    dom.starred.classList.toggle('is-on', on);
    dom.viewBtns.forEach(function (b) {
      b.classList.toggle('is-on', b.dataset.viewBtn === state.view);
    });
  }

  function drawTally(all) {
    if (!all.length) { dom.tally.textContent = ''; return; }
    var starred = 0, seen = new Set();
    all.forEach(function (f) {
      if (f.series) seen.add(f.series);
      if (f.starred) starred++;
    });
    /* "series" and "starred" are both invariant; only "frame" takes an s. */
    dom.tally.textContent = [
      frames(all.length), seen.size + ' series', starred + ' starred'
    ].join(' · ');
  }

  /* Only q, series and starred are filters. Sort is ordering, so it
     never earns a chip and never triggers a "reset" (DESIGN.md §2,
     defect 3). */
  function drawChips(rows, state, needle) {
    var frag = document.createDocumentFragment();
    function add(kind, label, count) {
      var chip = make('span', 'chip');
      chip.dataset.kind = kind;
      chip.appendChild(document.createTextNode(label + ' '));
      chip.appendChild(make('span', 'tally', String(count)));
      var x = make('button', null, '×');
      x.type = 'button';
      x.setAttribute('aria-label', 'Clear the ' + kind + ' filter');
      chip.appendChild(x);
      frag.appendChild(chip);
    }
    if (needle) {
      add('q', 'Search: ' + (state.q || '').trim(), pick(rows, state.starred, state.series || '', '').length);
    }
    if (state.series) {
      add('series', state.series, pick(rows, state.starred, '', needle).length);
    }
    if (state.starred) {
      add('starred', 'Starred', pick(rows, false, state.series || '', needle).length);
    }
    dom.chips.replaceChildren(frag);
  }

  /* app.js binds [data-nav] once at boot, so a button created here
     would never be reached; the href does the routing (app.js picks
     the route up from the hash). */
  function addFrameLink() {
    var a = make('a', 'btn btn--primary', 'Add the first frame');
    a.href = '#press';
    a.dataset.nav = 'press';
    return a;
  }

  function clearFiltersButton() {
    var b = make('button', 'btn btn--ghost', 'Clear filters');
    b.type = 'button';
    b.dataset.act = 'clear-filters';
    return b;
  }

  function drawState(mode) {
    dom.stateLoading.hidden = mode !== 'loading';
    dom.stateError.hidden = mode !== 'error';
    dom.stateEmpty.hidden = mode !== 'bare' && mode !== 'nomatch';

    if (mode === 'error') {
      dom.stateErrorBody.textContent = String(AA.app.error || '');
    } else if (mode === 'bare') {
      dom.stateEmptyTitle.textContent = 'The wall is bare.';
      dom.stateEmptyBody.textContent =
        'Nothing has been archived yet. Add the first frame to start the collection.';
      dom.stateEmptyActs.replaceChildren(addFrameLink());
    } else if (mode === 'nomatch') {
      dom.stateEmptyTitle.textContent = 'Nothing on the wall matches.';
      dom.stateEmptyBody.textContent =
        'No frames match the search and filters. Loosen them and look again.';
      dom.stateEmptyActs.replaceChildren(clearFiltersButton());
    }
  }

  function modeOf(all, shown) {
    if (AA.app.loading) return 'loading';
    if (AA.app.error) return 'error';
    if (!all.length) return 'bare';
    if (!shown.length) return 'nomatch';
    return 'grid';
  }

  /* ── the mounts ────────────────────────────────────────── */

  function buildMount(f, index) {
    var title = f.title || UNTITLED;
    var mount = make('article', 'mount');
    mount.dataset.id = f.id;
    if (f.starred) mount.classList.add('is-starred');
    mount.style.animationDelay = (Math.min(index, REVEAL_CAP) * REVEAL_STEP) + 'ms';

    mount.appendChild(make('span', 'mount__accession', f.accession || ''));

    /* Always visible: a hover-gated star is invisible to touch users
       and to anyone tabbing the wall (DESIGN.md §2, defect 5). */
    var star = make('button', f.starred ? 'mount__star is-on' : 'mount__star', '★');
    star.type = 'button';
    star.setAttribute('aria-pressed', f.starred ? 'true' : 'false');
    star.setAttribute('aria-label', (f.starred ? 'Unstar ' : 'Star ') + title);
    mount.appendChild(star);

    var open = make('button', 'mount__open');
    open.type = 'button';
    open.setAttribute('aria-label', 'Open frame: ' + title);

    var frame = make('span', 'mount__frame');
    var img = document.createElement('img');
    /* Empty alt: the open button already carries the accessible name,
       so prose here would announce the same frame twice — the caption
       below is where the description belongs. */
    img.alt = '';
    img.loading = 'lazy';
    img.decoding = 'async';
    img.width = f.width > 0 ? f.width : IMG_W;
    img.height = f.height > 0 ? f.height : IMG_H;
    img.src = f.src || AA.store.placeholder;
    img.onerror = function () {
      img.onerror = null;
      img.src = AA.store.placeholder;
    };
    frame.appendChild(img);
    open.appendChild(frame);

    var lamp = make('span', 'mount__lamp');
    lamp.setAttribute('aria-hidden', 'true');
    open.appendChild(lamp);
    mount.appendChild(open);

    var card = make('div', 'card');
    if (!f.durable) card.classList.add('is-volatile');
    card.appendChild(make('h3', 'card__title', title));
    var meta = make('p', 'card__meta');
    if (f.series) meta.appendChild(make('span', 'card__series', f.series));
    if (f.episode) meta.appendChild(make('span', 'card__ep', f.episode));
    if (f.timecode) meta.appendChild(make('span', 'card__tc', f.timecode));
    if (meta.childNodes.length) card.appendChild(meta);
    /* Said out loud, not left to a hover tooltip (DESIGN.md §5). */
    if (!f.durable) card.appendChild(make('p', 'card__warn', NOT_DURABLE));
    mount.appendChild(card);

    return { mount: mount, img: img };
  }

  function buildHang(rows, start) {
    var grid = make('div', 'hang');
    var frag = document.createDocumentFragment();
    var records = [];
    rows.forEach(function (r, i) {
      var built = buildMount(r.f, start + i);
      frag.appendChild(built.mount);
      records.push({ mount: built.mount, img: built.img, ratio: r.ratio });
    });
    grid.appendChild(frag);
    grids.set(grid, { grid: grid, records: records });
    return grid;
  }

  /* ── masonry ───────────────────────────────────────────── */

  /* A ragged wall in a fixed auto-fill grid leaves holes, so every
     mount is told how many fixed-height rows it spans. The row unit
     and the row gap are read from the grid's own computed style, so
     this follows the stylesheet instead of guessing at it. */
  function measure(entry) {
    var grid = entry.grid;
    if (!grid.isConnected || !entry.records.length) return;

    var cs = getComputedStyle(grid);
    var unit = parseFloat(cs.gridAutoRows);
    if (!(unit > 0)) unit = ROW_UNIT;
    var gap = parseFloat(cs.rowGap);
    if (!(gap >= 0)) gap = 0;
    var colW = parseFloat(String(cs.gridTemplateColumns).split(' ')[0]);
    if (!(colW > 0)) colW = entry.records[0].mount.offsetWidth;

    var rows = [];
    for (var i = 0; i < entry.records.length; i++) {
      var rec = entry.records[i];
      var imgH = rec.img ? rec.img.clientHeight : 0;
      if (!(imgH > 0)) imgH = colW * rec.ratio;
      var box = rec.mount.clientHeight;
      if (!(box > 0)) box = imgH + CHROME_FALLBACK;
      /* Snap to a 4px multiple so sub-pixel jitter on resize cannot
         flip a span back and forth. */
      var need = Math.ceil((Math.max(box, imgH) + gap) / 4) * 4;
      rows.push('span ' + Math.max(1, Math.ceil(need / unit)));
    }

    for (i = 0; i < entry.records.length; i++) {
      var mount = entry.records[i].mount;
      if (mount.style.gridRow !== rows[i]) mount.style.gridRow = rows[i];
    }
  }

  function layout() {
    grids.forEach(function (entry) { measure(entry); });
  }

  function onGridResize() {
    if (rafId) return;
    rafId = requestAnimationFrame(function () {
      rafId = 0;
      layout();
    });
  }

  function unhookGrids() {
    grids.forEach(function (entry, grid) { ro.unobserve(grid); });
    grids.clear();
  }

  /* ── draw ──────────────────────────────────────────────── */

  function drawGrid(rows, state) {
    unhookGrids();
    var frag = document.createDocumentFragment();
    if (state.view === 'series') {
      var index = 0;
      groupBySeries(rows).forEach(function (group) {
        var reel = make('section', 'reel');
        var head = make('h2', 'reel__head', group.name + ' ');
        head.appendChild(make('span', 'tally', String(group.rows.length)));
        reel.appendChild(head);
        reel.appendChild(buildHang(group.rows, index));
        index += group.rows.length;
        frag.appendChild(reel);
      });
    } else {
      var wall = make('section', 'reel');
      wall.appendChild(buildHang(rows, 0));
      frag.appendChild(wall);
    }
    dom.reels.replaceChildren(frag);

    /* Measure before the browser paints, or the wall flashes as a
       row of holes before the spans land. */
    layout();
    grids.forEach(function (entry, grid) { ro.observe(grid); });
  }

  function clearGrid() {
    unhookGrids();
    dom.reels.replaceChildren();
  }

  function draw() {
    var state = AA.app.state;
    var all = AA.app.frames || [];
    var rows = prepare(all);
    var needle = String(state.q || '').trim().toLowerCase();
    var shown = order(pick(rows, !!state.starred, state.series || '', needle), state.sort);
    var mode = modeOf(all, shown);

    /* The loupe walks this list, so prev/next stay inside the active
       filter rather than drifting to frames the user filtered out. */
    AA.app.visible = shown;

    if (!AA.app.loading && !AA.app.error) drawTally(all);
    drawControls(state);
    drawChips(rows, state, needle);
    drawState(mode);

    if (mode === 'grid') {
      drawGrid(shown, state);
      sayStatus(shown.length, all.length);
    } else {
      clearGrid();
      silenceStatus();
    }
  }
  /* ── URL state ─────────────────────────────────────────── */

  function readUrl() {
    var p = new URLSearchParams(window.location.search);
    var s = AA.app.state;
    s.q = p.get('q') || '';
    var series = p.get('series') || '';
    s.series = series && AA.store.series().indexOf(series) !== -1 ? series : '';
    s.starred = p.get('star') === '1';
    var sort = p.get('sort');
    if (sort && SORTS.indexOf(sort) !== -1) s.sort = sort;
    var view = p.get('view');
    if (view && VIEWS.indexOf(view) !== -1) s.view = view;
  }

  function writeUrl() {
    var s = AA.app.state;
    var p = new URLSearchParams();
    if (s.q) p.set('q', s.q);
    if (s.series) p.set('series', s.series);
    if (s.starred) p.set('star', '1');
    if (s.sort && s.sort !== 'newest') p.set('sort', s.sort);
    if (s.view && s.view !== 'wall') p.set('view', s.view);
    var qs = p.toString();
    var url = window.location.pathname + (qs ? '?' + qs : '') + window.location.hash;
    /* replaceState, never pushState: Back should leave the archive,
       not step through keystrokes. Some engines refuse history writes
       on a file:// origin, and a linkable wall is a convenience, not a
       contract — a refusal must not take the control down with it. */
    try { window.history.replaceState(null, '', url); }
    catch (e) { /* history unavailable on this origin */ }
  }

  function commit() {
    writeUrl();
    AA.app.rerender();
  }

  function setQ(value) {
    if (qTimer) { clearTimeout(qTimer); qTimer = 0; }
    qDirty = false;
    AA.app.state.q = value;
    dom.q.value = value;
    commit();
  }

  function clearFilters() {
    setQ('');
    AA.app.state.series = '';
    AA.app.state.starred = false;
    commit();
  }

  function toggleStar(mount) {
    var frame = AA.store.get(mount.dataset.id);
    if (!frame) { AA.app.toast('That frame is no longer on the wall.'); return; }
    var res = AA.store.update(frame.id, { starred: !frame.starred });
    if (res.error) { AA.app.toast(res.error); return; }

    /* The redraw replaces every card, so a keyboard user's focus would drop
       to <body> and strand them at the top of the page. Put it back on the
       same control. If a filter hid the card, it is genuinely gone and the
       guard lets focus fall where it may. */
    var id = mount.dataset.id;
    AA.app.rerender();
    var again = document.querySelector('.mount[data-id="' + id + '"] .mount__star');
    if (again) again.focus();
  }

  /* ── events ────────────────────────────────────────────── */

  function onQuery() {
    qDirty = true;
    if (qTimer) clearTimeout(qTimer);
    qTimer = setTimeout(function () {
      qTimer = 0;
      qDirty = false;
      AA.app.state.q = dom.q.value;
      commit();
    }, QUERY_MS);
  }

  function onReelsClick(event) {
    var el = event.target;
    var star = el.closest('.mount__star');
    if (star) {
      event.preventDefault();
      toggleStar(star.closest('.mount'));
      return;
    }
    var open = el.closest('.mount__open');
    if (open) AA.app.open(open.closest('.mount').dataset.id);
  }

  function onChipsClick(event) {
    var x = event.target.closest('button');
    if (!x) return;
    var chip = x.closest('.chip');
    if (!chip) return;
    var kind = chip.dataset.kind;
    if (kind === 'q') setQ('');
    else if (kind === 'series') { AA.app.state.series = ''; commit(); }
    else if (kind === 'starred') { AA.app.state.starred = false; commit(); }
  }

  function onEmptyActsClick(event) {
    if (event.target.closest('[data-act="clear-filters"]')) clearFilters();
  }

  /* One delegated handler for the whole wall: the lamp is two custom
     properties, so CSS does the rest. */
  function onLamp(event) {
    var mount = event.target.closest('.mount');
    if (!mount) return;
    var r = mount.getBoundingClientRect();
    mount.style.setProperty('--mx', (event.clientX - r.left).toFixed(1) + 'px');
    mount.style.setProperty('--my', (event.clientY - r.top).toFixed(1) + 'px');
  }

  function wire() {
    dom.q.addEventListener('input', onQuery);
    dom.series.addEventListener('change', function () {
      AA.app.state.series = dom.series.value;
      commit();
    });
    dom.sort.addEventListener('change', function () {
      AA.app.state.sort = dom.sort.value;
      commit();
    });
    dom.starred.addEventListener('click', function () {
      AA.app.state.starred = !AA.app.state.starred;
      commit();
    });
    dom.viewBtns.forEach(function (btn) {
      btn.addEventListener('click', function () {
        AA.app.state.view = btn.dataset.viewBtn;
        commit();
      });
    });

    dom.reels.addEventListener('click', onReelsClick);
    dom.chips.addEventListener('click', onChipsClick);
    dom.stateEmptyActs.addEventListener('click', onEmptyActsClick);

    /* A touch wall has no pointer to rake the light with. */
    if (!window.matchMedia('(hover: none)').matches) {
      dom.reels.addEventListener('pointerover', onLamp, { passive: true });
      dom.reels.addEventListener('pointermove', onLamp, { passive: true });
    }
  }

  /* ── boot ──────────────────────────────────────────────── */

  function cacheDom() {
    var want = {
      tally: 'tally', q: 'q', series: 'series', sort: 'sort', starred: 'starred',
      chips: 'chips', status: 'status', reels: 'reels',
      stateLoading: 'state-loading', stateError: 'state-error',
      stateErrorBody: 'state-error-body', stateEmpty: 'state-empty',
      stateEmptyTitle: 'state-empty-title', stateEmptyBody: 'state-empty-body',
      stateEmptyActs: 'state-empty-acts'
    };
    var missing = [];
    Object.keys(want).forEach(function (key) {
      var node = document.getElementById(want[key]);
      if (!node) missing.push('#' + want[key]);
      dom[key] = node;
    });
    dom.viewBtns = AA.util.qsa('[data-view-btn]');
    if (!dom.viewBtns.length) missing.push('[data-view-btn]');
    if (missing.length) {
      throw new Error('wall.js: index.html is missing ' + missing.join(', '));
    }
  }

  function init() {
    if (!AA.store || !AA.app || !AA.app.state) {
      throw new Error('wall.js: AA.store and AA.app.state must exist before init().');
    }
    cacheDom();
    readUrl();
    wire();
    ro = new ResizeObserver(onGridResize);
  }

  AA.wall = { init: init, draw: draw };
})((window.AA = window.AA || {}));
