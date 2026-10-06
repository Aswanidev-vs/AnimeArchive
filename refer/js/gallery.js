/**
 * gallery.js - the wall: state, filters, contact-sheet render, lightbox.
 *
 * Improvements over pages/index.vue + components/gallery/*:
 *   - id-based lightbox selection (no index drift when filters change);
 *   - removable filter chips + a Reset that never shifts the layout;
 *   - always-visible star buttons (the source app's were hover-only);
 *   - live counter announcements, `#frame=` deep links, filmstrip nav;
 *   - one unified state-panel language (loading/error/empty/no-match);
 *   - surfaced `capturedAt`/`character` fields the source app drops.
 */
(function (global) {
  'use strict';

  var AA = global.AA;
  var el = AA.el;
  var clear = AA.clear;
  var fmt = AA.fmt;
  var store = AA.store;

  var DEFAULTS = { query: '', anime: '', favoritesOnly: false, sort: 'newest' };

  var state = {
    frames: [],
    filters: Object.assign({}, DEFAULTS),
    selectedId: null,
    lastFocus: null,
    loadError: '',
    ready: false,
  };

  var dom = {};

  /* -- filtering (same semantics as useFrames.ts) -------------------------- */

  function filtered() {
    var f = state.filters;
    var needle = f.query.trim().toLowerCase();

    var result = state.frames.filter(function (frame) {
      if (f.favoritesOnly && !frame.favorite) return false;
      if (f.anime && frame.anime !== f.anime) return false;
      if (!needle) return true;
      var haystack = [frame.title, frame.anime, frame.episode, frame.character,
        frame.note].concat(frame.tags).join(' ').toLowerCase();
      return haystack.indexOf(needle) !== -1;
    });

    var stamp = function (a, b) {
      return (b.createdAt || b.capturedAt || '').localeCompare(a.createdAt || a.capturedAt || '');
    };
    var copy = result.slice();
    if (f.sort === 'newest') copy.sort(stamp);
    else if (f.sort === 'oldest') copy.sort(function (a, b) { return stamp(b, a); });
    else if (f.sort === 'title') {
      copy.sort(function (a, b) { return a.title.localeCompare(b.title) || stamp(a, b); });
    } else if (f.sort === 'anime') {
      copy.sort(function (a, b) { return a.anime.localeCompare(b.anime) || stamp(a, b); });
    }
    return copy;
  }

  function hasActiveFilters() {
    var f = state.filters;
    return f.query.trim() !== '' || f.anime !== '' || f.favoritesOnly || f.sort !== DEFAULTS.sort;
  }

  function uniqueAnimes() {
    var seen = {};
    state.frames.forEach(function (frame) {
      if (frame.anime) seen[frame.anime] = true;
    });
    return Object.keys(seen).sort(function (a, b) { return a.localeCompare(b); });
  }

  /* -- accessibility helpers ------------------------------------------------ */

  function prefersReducedMotion() {
    return global.matchMedia && global.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  function countUp(node, to) {
    var from = parseInt(node.textContent, 10) || 0;
    if (prefersReducedMotion() || from === to) {
      node.textContent = fmt.pad3(to);
      return;
    }
    var start = performance.now();
    var dur = 500;
    function tick(now) {
      var t = Math.min(1, (now - start) / dur);
      var eased = 1 - Math.pow(1 - t, 3);
      node.textContent = fmt.pad3(Math.round(from + (to - from) * eased));
      if (t < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }

  /* -- rendering ------------------------------------------------------------ */

  function renderStats() {
    var animes = uniqueAnimes();
    var starred = state.frames.filter(function (f) { return f.favorite; }).length;
    countUp(dom.statFrames, state.frames.length);
    countUp(dom.statSeries, animes.length);
    countUp(dom.statStarred, starred);
  }

  function renderSeriesSelect() {
    var select = dom.series;
    var current = state.filters.anime;
    clear(select);
    var all = el('option', { text: 'All series', attrs: { value: '' } });
    select.appendChild(all);
    uniqueAnimes().forEach(function (name) {
      var opt = el('option', { text: name, attrs: { value: name } });
      if (name === current) opt.selected = true;
      select.appendChild(opt);
    });
    select.value = current;
  }

  function chip(label, className, onRemove) {
    var remove = el('button', {
      className: 'chip__x',
      text: '\u00d7',
      attrs: { type: 'button', 'aria-label': 'Remove filter: ' + label },
    });
    remove.addEventListener('click', onRemove);
    var node = el('span', { className: 'chip' + (className ? ' ' + className : '') }, [
      el('span', { text: label }),
      remove,
    ]);
    return node;
  }

  function renderChips() {
    var box = clear(dom.chips);
    var f = state.filters;
    if (f.query.trim()) {
      box.appendChild(chip('Search: \u201c' + f.query.trim() + '\u201d', '', function () {
        f.query = '';
        dom.search.value = '';
        render();
      }));
    }
    if (f.anime) {
      box.appendChild(chip('Series: ' + f.anime, '', function () {
        f.anime = '';
        dom.series.value = '';
        render();
      }));
    }
    if (f.favoritesOnly) {
      box.appendChild(chip('Starred only', 'chip--fav', function () {
        f.favoritesOnly = false;
        dom.favBtn.setAttribute('aria-pressed', 'false');
        render();
      }));
    }
    if (f.sort !== DEFAULTS.sort) {
      var labels = { oldest: 'Oldest first', title: 'By title', anime: 'By series' };
      box.appendChild(chip('Sort: ' + labels[f.sort], '', function () {
        f.sort = DEFAULTS.sort;
        dom.sort.value = DEFAULTS.sort;
        render();
      }));
    }
  }

  /** Honest placeholder for a src that no longer resolves (dead blob:). */
  function placeholderSrc(id) {
    var svg = [
      '<svg xmlns="http://www.w3.org/2000/svg" width="320" height="180" viewBox="0 0 320 180" role="img" aria-label="Frame image not stored">',
      '<defs><linearGradient id="a" x1="0" y1="0" x2="1" y2="1">',
      '<stop offset="0" stop-color="#1b2242"/><stop offset="1" stop-color="#0b0e1a"/>',
      '</linearGradient></defs>',
      '<rect width="320" height="180" fill="url(#a)"/>',
      '<rect x="8.5" y="8.5" width="303" height="163" fill="none" stroke="rgba(246,241,231,0.14)"/>',
      '<polygon points="311,8 311,32 287,8" fill="#ff5d8f"/>',
      '<text x="20" y="96" fill="#ffb347" font-family="monospace" font-size="12">SESSION ONLY</text>',
      '<text x="20" y="118" fill="#f6f1e7" font-family="monospace" font-size="11">',
      String(id).slice(0, 28),
      '</text></svg>',
    ].join('');
    return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  }

  function guardImage(img, id) {
    img.addEventListener('error', function () {
      if (img.dataset.fallback === '1') return;
      img.dataset.fallback = '1';
      img.src = placeholderSrc(id);
    });
  }

  function starLabel(frame) {
    return (frame.favorite ? 'Remove \u201c' : 'Star \u201c') + frame.title + '\u201d';
  }

  function buildCard(frame, position, accIndex) {
    var mount = el('div', { className: 'frame__mount' });
    mount.appendChild(el('span', { className: 'frame__acc', text: fmt.accession(frame, accIndex) }));

    var fav = el('button', {
      className: 'frame__fav',
      html: AA.icons.star,
      attrs: {
        type: 'button',
        'aria-pressed': frame.favorite ? 'true' : 'false',
        'aria-label': starLabel(frame),
        'data-id': frame.id,
      },
    });

    var img = el('img', {
      attrs: {
        src: frame.src,
        alt: frame.alt || frame.title,
        loading: 'lazy',
        decoding: 'async',
        width: frame.width || 1600,
        height: frame.height || 900,
      },
    });
    guardImage(img, frame.id);

    var open = el('button', {
      className: 'frame__open',
      attrs: {
        type: 'button',
        'data-open': frame.id,
        'aria-label': 'Open \u201c' + frame.title + '\u201d full size',
      },
    }, [img, el('span', { className: 'frame__glint', attrs: { 'aria-hidden': 'true' } })]);

    if (frame.timestamp) {
      open.appendChild(el('span', { className: 'frame__tc', text: frame.timestamp }));
    }

    mount.appendChild(open);
    mount.appendChild(fav);

    var edge = el('div', { className: 'frame__edge' }, [
      el('span', { className: 'frame__series', text: frame.anime || 'Unfiled' }),
      frame.episode ? el('span', { className: 'frame__ep', text: frame.episode }) : null,
    ]);

    var fig = el('figure', {
      className: 'frame',
      attrs: { 'data-id': frame.id },
    }, [mount, edge, el('figcaption', { className: 'frame__title', text: frame.title })]);
    fig.style.setProperty('--i', Math.min(position, 10));

    return el('li', { className: 'grid__cell' }, [fig]);
  }

  function statePanel(opts) {
    var actions = el('div', { className: 'state__actions' }, opts.actions || []);
    return el('section', {
      className: 'state' + (opts.paper ? ' state--paper' : ''),
      attrs: { role: opts.alert ? 'alert' : 'status', 'aria-live': 'polite' },
    }, [
      el('h2', { className: 'state__title', text: opts.title }),
      el('p', { className: 'state__text', text: opts.text }),
      (opts.actions && opts.actions.length) ? actions : null,
      opts.mark ? el('span', {
        className: 'state__mark',
        text: opts.mark,
        attrs: { 'aria-hidden': 'true' },
      }) : null,
    ]);
  }

  function renderGrid(list) {
    var grid = clear(dom.grid);
    var accIndex = {};
    state.frames.forEach(function (frame, i) {
      accIndex[frame.id] = i;
    });
    var frag = document.createDocumentFragment();
    list.forEach(function (frame, i) {
      frag.appendChild(buildCard(frame, i, accIndex[frame.id] != null ? accIndex[frame.id] : i));
    });
    grid.appendChild(frag);
  }

  function renderStates(list) {
    var wrap = clear(dom.states);
    dom.grid.hidden = true;

    if (state.loadError) {
      var retry = el('button', {
        className: 'btn btn--quiet',
        text: 'Try again',
        attrs: { type: 'button' },
      });
      retry.addEventListener('click', load);
      wrap.appendChild(statePanel({
        title: 'The wall could not be read',
        text: state.loadError,
        alert: true,
        actions: [retry],
      }));
      return;
    }

    if (state.frames.length === 0) {
      var cta = el('a', {
        className: 'btn btn--ink',
        text: 'Add the first frame',
        attrs: { href: 'upload.html' },
      });
      wrap.appendChild(statePanel({
        paper: true,
        title: 'The wall is bare',
        text: 'Nothing has been archived yet. Add the first frame to start the collection.',
        actions: [cta],
        mark: '\u7a7a',
      }));
      return;
    }

    if (list.length === 0) {
      var clearBtn = el('button', {
        className: 'btn btn--ink-quiet',
        text: 'Clear filters',
        attrs: { type: 'button' },
      });
      clearBtn.addEventListener('click', resetFilters);
      wrap.appendChild(statePanel({
        paper: true,
        title: 'Nothing matches',
        text: 'No frames match the current search and filters. Loosen them and look again.',
        actions: [clearBtn],
        mark: '\u7a7a',
      }));
      return;
    }

    dom.grid.hidden = false;
    renderGrid(list);
  }

  function render() {
    var list = filtered();

    renderStats();
    renderSeriesSelect();
    renderChips();

    clear(dom.count);
    dom.count.appendChild(el('b', { text: String(list.length) }));
    dom.count.appendChild(document.createTextNode(
      ' of ' + state.frames.length + ' frames shown',
    ));

    dom.reset.disabled = !hasActiveFilters();
    renderStates(list);

    /* Keep the lightbox honest: close it if its frame left the exhibition. */
    if (state.selectedId && !list.some(function (f) { return f.id === state.selectedId; })) {
      closeLightbox({ keepHash: false, silent: true });
    } else if (state.selectedId) {
      renderDialog();
    }
  }

  /* -- stars ---------------------------------------------------------------- */

  function toggleStar(id) {
    var frame = state.frames.find(function (f) {
      return f.id === id;
    });
    if (!frame) return Promise.resolve();

    /* Optimistic flip for instant feedback; roll back on failure. */
    var before = frame.favorite;
    frame.favorite = !before;
    render();

    return store.update(id, { favorite: frame.favorite }).then(
      function () {
        var btn = document.querySelector('.frame__fav[data-id="' + id + '"]');
        if (btn) {
          btn.classList.add('is-popping');
          setTimeout(function () {
            btn.classList.remove('is-popping');
          }, 450);
        }
      },
      function (cause) {
        frame.favorite = before;
        state.loadError = cause && cause.message
          ? cause.message
          : 'The favorite state could not be saved.';
        render();
      },
    );
  }

  function resetFilters() {
    state.filters = Object.assign({}, DEFAULTS);
    dom.search.value = '';
    dom.series.value = '';
    dom.sort.value = DEFAULTS.sort;
    dom.favBtn.setAttribute('aria-pressed', 'false');
    render();
    dom.search.focus();
  }

  /* -- lightbox -------------------------------------------------------------- */

  function findFrame(id) {
    return state.frames.find(function (f) {
      return f.id === id;
    });
  }

  function metaPair(key, value) {
    return el('div', { className: 'lb__pair' }, [
      el('dt', { className: 'lb__key', text: key }),
      el('dd', { className: 'lb__val', text: value }),
    ]);
  }

  function renderStrip(list, activeId) {
    var strip = clear(dom.lbStrip);
    list.forEach(function (frame) {
      var img = el('img', {
        attrs: { src: frame.src, alt: '', loading: 'lazy' },
      });
      guardImage(img, frame.id);
      var cell = el('button', {
        className: 'strip__cell',
        attrs: {
          type: 'button',
          'data-strip': frame.id,
          'aria-label': 'View \u201c' + frame.title + '\u201d',
          'aria-current': frame.id === activeId ? 'true' : 'false',
          title: frame.title,
        },
      }, [img]);
      strip.appendChild(cell);
      if (frame.id === activeId) {
        requestAnimationFrame(function () {
          cell.scrollIntoView({ block: 'nearest', inline: 'center' });
        });
      }
    });
  }

  function renderDialog() {
    var list = filtered();
    var index = list.findIndex(function (f) {
      return f.id === state.selectedId;
    });
    if (index === -1) return closeLightbox({ keepHash: false, silent: true });

    var frame = list[index];
    var total = list.length;

    dom.lbAcc.textContent = fmt.accession(frame, state.frames.indexOf(frame));
    dom.lbCounter.textContent = fmt.pad3(index + 1) + ' / ' + fmt.pad3(total);

    dom.lbImg.src = frame.src;
    dom.lbImg.alt = frame.alt || frame.title;
    dom.lbTc.hidden = !frame.timestamp;
    dom.lbTc.textContent = frame.timestamp || '';

    dom.lbTitle.textContent = frame.title;
    dom.lbFav.setAttribute('aria-pressed', frame.favorite ? 'true' : 'false');
    dom.lbFav.setAttribute('aria-label', starLabel(frame));
    var favText = dom.lbFav.querySelector('span');
    if (favText) favText.textContent = frame.favorite ? 'Starred' : 'Star';

    var pairs = clear(dom.lbMeta);
    pairs.appendChild(metaPair('Series', frame.anime || 'Unfiled'));
    if (frame.episode) pairs.appendChild(metaPair('Episode', frame.episode));
    if (frame.character) pairs.appendChild(metaPair('Character', frame.character));
    if (frame.timestamp) pairs.appendChild(metaPair('Timecode', frame.timestamp));
    pairs.appendChild(metaPair('Dimensions',
      frame.width && frame.height ? frame.width + ' \u00d7 ' + frame.height + ' px' : 'Unknown'));
    pairs.appendChild(metaPair('Captured', fmt.formatDate(frame.capturedAt)));
    pairs.appendChild(metaPair('Added', fmt.formatDate(frame.createdAt)));
    pairs.appendChild(metaPair('Source',
      frame.source === 'fixture' ? 'Bundled demo' : 'This browser'));

    var tags = clear(dom.lbTags);
    tags.hidden = frame.tags.length === 0;
    frame.tags.forEach(function (tag) {
      tags.appendChild(el('li', { className: 'tag', text: tag }));
    });

    dom.lbNote.hidden = !frame.note;
    dom.lbNote.textContent = frame.note || '';
    dom.lbWarn.hidden = frame.durable !== false;

    renderStrip(list, frame.id);
  }

  function hashFor(id) {
    return '#frame=' + encodeURIComponent(id);
  }

  function parseHash() {
    var match = /^#frame=(.+)$/.exec(global.location.hash || '');
    return match ? decodeURIComponent(match[1]) : null;
  }

  function openLightbox(id, opts) {
    opts = opts || {};
    var list = filtered();
    if (!list.some(function (f) { return f.id === id; })) return; /* not exhibited */

    var opening = state.selectedId === null;
    if (opening) state.lastFocus = document.activeElement;
    state.selectedId = id;

    dom.lightbox.hidden = false;
    document.body.style.overflow = 'hidden';
    renderDialog();

    if (!opts.silentHistory) {
      if (opening) history.pushState({ frame: id }, '', hashFor(id));
      else history.replaceState({ frame: id }, '', hashFor(id));
    }

    if (opening && !opts.silentFocus) {
      dom.lbClose.focus();
    }
  }

  function closeLightbox(opts) {
    opts = opts || {};
    if (state.selectedId === null) return;
    state.selectedId = null;
    dom.lightbox.hidden = true;
    document.body.style.overflow = '';

    if (!opts.keepHash && global.location.hash) {
      history.replaceState(null, '', global.location.pathname + global.location.search);
    }
    if (!opts.silent && state.lastFocus && document.contains(state.lastFocus)) {
      state.lastFocus.focus();
    }
    state.lastFocus = null;
  }

  function step(delta) {
    var list = filtered();
    if (list.length < 2) return;
    var index = list.findIndex(function (f) {
      return f.id === state.selectedId;
    });
    if (index === -1) return;
    var next = list[(index + delta + list.length) % list.length];
    openLightbox(next.id);
  }

  /** Focus trap for the dialog: Tab wraps inside the panel. */
  function trapTab(event) {
    if (event.key !== 'Tab' || state.selectedId === null) return;
    var panel = dom.lbPanel;
    var focusable = panel.querySelectorAll(
      'button:not([disabled]):not([hidden]), a[href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    );
    if (!focusable.length) return;
    var first = focusable[0];
    var last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    } else if (!panel.contains(document.activeElement)) {
      event.preventDefault();
      first.focus();
    }
  }

  /* -- events ---------------------------------------------------------------- */

  function bindEvents() {
    var searchTimer = null;
    dom.search.addEventListener('input', function () {
      clearTimeout(searchTimer);
      searchTimer = setTimeout(function () {
        state.filters.query = dom.search.value;
        render();
      }, 120);
    });

    dom.series.addEventListener('change', function () {
      state.filters.anime = dom.series.value;
      render();
    });

    dom.sort.addEventListener('change', function () {
      state.filters.sort = dom.sort.value;
      render();
    });

    dom.favBtn.addEventListener('click', function () {
      state.filters.favoritesOnly = !state.filters.favoritesOnly;
      dom.favBtn.setAttribute('aria-pressed', String(state.filters.favoritesOnly));
      render();
    });

    dom.reset.addEventListener('click', resetFilters);

    dom.grid.addEventListener('click', function (event) {
      var openBtn = event.target.closest('[data-open]');
      if (openBtn) {
        openLightbox(openBtn.getAttribute('data-open'));
        return;
      }
      var favBtn = event.target.closest('.frame__fav');
      if (favBtn) toggleStar(favBtn.getAttribute('data-id'));
    });

    dom.lbClose.addEventListener('click', function () {
      closeLightbox();
    });
    dom.backdrop.addEventListener('click', function () {
      closeLightbox();
    });
    dom.lbPrev.addEventListener('click', function () {
      step(-1);
    });
    dom.lbNext.addEventListener('click', function () {
      step(1);
    });
    dom.lbFav.addEventListener('click', function () {
      if (state.selectedId) toggleStar(state.selectedId);
    });
    dom.lbStrip.addEventListener('click', function (event) {
      var cell = event.target.closest('[data-strip]');
      if (cell) openLightbox(cell.getAttribute('data-strip'));
    });

    document.addEventListener('keydown', function (event) {
      var typing = /^(INPUT|TEXTAREA|SELECT)$/.test(
        (document.activeElement && document.activeElement.tagName) || '',
      );

      if (state.selectedId !== null) {
        if (event.key === 'Escape') {
          event.preventDefault();
          closeLightbox();
        } else if (event.key === 'ArrowLeft') {
          event.preventDefault();
          step(-1);
        } else if (event.key === 'ArrowRight') {
          event.preventDefault();
          step(1);
        } else if (event.key === 'Home') {
          event.preventDefault();
          var list = filtered();
          if (list.length) openLightbox(list[0].id);
        } else if (event.key === 'End') {
          event.preventDefault();
          var items = filtered();
          if (items.length) openLightbox(items[items.length - 1].id);
        } else {
          trapTab(event);
        }
        return;
      }

      if (event.key === '/' && !typing) {
        event.preventDefault();
        dom.search.focus();
        dom.search.select();
      }
    });

    /* Browser Back closes the lightbox; a hash on load opens it. */
    global.addEventListener('popstate', function () {
      var id = parseHash();
      if (id && findFrame(id)) {
        openLightbox(id, { silentHistory: true });
      } else {
        closeLightbox({ keepHash: true });
      }
    });
  }

  /* -- boot ------------------------------------------------------------------ */

  function load() {
    state.loadError = '';
    return store.list().then(
      function (frames) {
        state.frames = frames;
        state.ready = true;
        render();
        var deepLink = parseHash();
        if (deepLink && findFrame(deepLink)) {
          openLightbox(deepLink, { silentHistory: true, silentFocus: true });
        }
      },
      function (cause) {
        state.frames = [];
        state.loadError = cause && cause.message
          ? cause.message
          : 'The archive could not be read.';
        render();
      },
    );
  }

  function init() {
    dom = {
      statFrames: document.getElementById('stat-frames'),
      statSeries: document.getElementById('stat-series'),
      statStarred: document.getElementById('stat-starred'),
      search: document.getElementById('gallery-search'),
      series: document.getElementById('gallery-series'),
      sort: document.getElementById('gallery-sort'),
      favBtn: document.getElementById('gallery-fav'),
      reset: document.getElementById('gallery-reset'),
      chips: document.getElementById('gallery-chips'),
      count: document.getElementById('gallery-count'),
      states: document.getElementById('gallery-states'),
      grid: document.getElementById('gallery-grid'),
      lightbox: document.getElementById('lightbox'),
      backdrop: document.getElementById('lightbox-backdrop'),
      lbPanel: document.getElementById('lightbox-panel'),
      lbClose: document.getElementById('lb-close'),
      lbPrev: document.getElementById('lb-prev'),
      lbNext: document.getElementById('lb-next'),
      lbAcc: document.getElementById('lb-acc'),
      lbCounter: document.getElementById('lb-counter'),
      lbImg: document.getElementById('lb-img'),
      lbTc: document.getElementById('lb-tc'),
      lbTitle: document.getElementById('lb-title'),
      lbFav: document.getElementById('lb-fav'),
      lbMeta: document.getElementById('lb-meta'),
      lbTags: document.getElementById('lb-tags'),
      lbNote: document.getElementById('lb-note'),
      lbWarn: document.getElementById('lb-warn'),
      lbStrip: document.getElementById('lb-strip'),
    };

    bindEvents();
    load();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})(typeof window !== 'undefined' ? window : globalThis);
