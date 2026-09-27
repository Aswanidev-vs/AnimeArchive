/* ============================================================
   Anime Archive — app
   ------------------------------------------------------------
   Bootstrap and the things every view shares: state, routing,
   the global keyboard, the storage meter, the shortcut sheet.
   ============================================================ */
(function (AA) {
  'use strict';

  var qs = AA.util.qs, qsa = AA.util.qsa;

  var ROUTES = ['wall', 'press'];
  var LOCAL_CAP = 5 * 1024 * 1024;   /* the real per-origin localStorage ceiling */
  var toastTimer;

  var SHORTCUTS = [
    ['/', 'Focus search'],
    ['← →', 'Previous / next frame'],
    ['F', 'Star or unstar'],
    ['E', 'Edit the record'],
    ['Del', 'Remove the frame'],
    ['+ −', 'Zoom in / out'],
    ['0', 'Fit to the stage'],
    ['Esc', 'Close'],
    ['?', 'This sheet']
  ];

  var app = {
    state: { q: '', series: '', starred: false, sort: 'newest', view: 'wall' },
    route: 'wall',
    frames: [],
    visible: [],
    loading: true,
    error: null
  };

  /* ── State ───────────────────────────────────────────────── */

  function load() {
    try {
      app.frames = AA.store.list();
      app.error = null;
    } catch (e) {
      app.frames = [];
      app.error = 'This browser is blocking local storage, so the archive cannot be read. ' +
        'Private and incognito windows often do this.';
    }
    app.loading = false;
    AA.wall.draw();
    updateMeter();
  }

  app.load = load;
  app.rerender = load;

  app.open = function (id) {
    var frame = AA.store.get(id);
    if (frame) AA.lightbox.open(frame);
  };

  app.toast = function (message) {
    var el = qs('#toast');
    el.textContent = message;
    el.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { el.hidden = true; }, 3600);
  };

  /* ── Routing ─────────────────────────────────────────────── */

  function routeFromHash() {
    var hash = location.hash.replace('#', '');
    return ROUTES.indexOf(hash) > -1 ? hash : 'wall';
  }

  app.goto = function (route, replace) {
    if (ROUTES.indexOf(route) < 0) route = 'wall';
    app.route = route;
    document.documentElement.dataset.view = route;

    qsa('[data-view-panel]').forEach(function (panel) {
      panel.hidden = panel.dataset.viewPanel !== route;
    });
    qsa('[data-nav]').forEach(function (link) {
      var on = link.dataset.nav === route;
      link.classList.toggle('is-current', on);
      if (on) link.setAttribute('aria-current', 'page');
      else link.removeAttribute('aria-current');
    });

    if (location.hash !== '#' + route) {
      history[replace ? 'replaceState' : 'pushState'](null, '', '#' + route);
    }
    window.scrollTo({ top: 0, behavior: 'instant' in window ? 'instant' : 'auto' });
  };

  /* ── Storage meter ───────────────────────────────────────── */

  function updateMeter() {
    var meter = qs('#meter');
    if (!meter) return;
    var used = AA.store.used();
    var pct = AA.util.clamp((used / LOCAL_CAP) * 100, 0, 100);

    meter.hidden = used === 0;
    qs('#meter-fill').style.width = pct + '%';
    qs('#meter-fill').classList.toggle('is-warn', pct >= 80);
    qs('#meter-val').textContent = AA.util.bytes(used) + ' of ~5 MB';
  }

  /* ── Shortcut sheet ──────────────────────────────────────── */

  function buildSheet() {
    var grid = qs('#sheet-grid');
    var frag = document.createDocumentFragment();
    SHORTCUTS.forEach(function (row) {
      var item = document.createElement('div');
      item.className = 'sheet__row';
      var key = document.createElement('kbd');
      key.className = 'sheet__key';
      key.textContent = row[0];
      var label = document.createElement('span');
      label.className = 'sheet__label';
      label.textContent = row[1];
      item.append(key, label);
      frag.appendChild(item);
    });
    grid.replaceChildren(frag);
  }

  function setSheet(open) {
    var sheet = qs('#sheet');
    sheet.hidden = !open;
    document.body.style.overflow = open ? 'hidden' : '';
    if (open) qs('.sheet__inner').focus();
  }

  /* ── Global keyboard ─────────────────────────────────────── */

  function bindKeys() {
    document.addEventListener('keydown', function (e) {
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      var typing = /^(input|textarea|select)$/i.test(e.target.tagName);

      if (e.key === 'Escape') {
        if (!qs('#sheet').hidden) { setSheet(false); return; }
        if (AA.lightbox.isOpen()) return;   /* the loupe owns Escape while open */
        if (typing || e.target === qs('#q')) qs('#q').blur();
        return;
      }

      if (typing || e.metaKey) return;

      if (e.key === '/') {
        e.preventDefault();
        app.goto('wall');
        qs('#q').focus();
        qs('#q').select();
      } else if (e.key === '?') {
        e.preventDefault();
        setSheet(qs('#sheet').hidden);
      }
    });
  }

  /* ── Boot ────────────────────────────────────────────────── */

  function boot() {
    buildSheet();

    qsa('[data-nav]').forEach(function (link) {
      link.addEventListener('click', function (e) {
        e.preventDefault();
        app.goto(link.dataset.nav);
      });
    });

    qsa('[data-act="add"]').forEach(function (btn) {
      btn.addEventListener('click', function () { app.goto('press'); });
    });

    qs('[data-act="retry"]').addEventListener('click', load);
    qs('#open-sheet').addEventListener('click', function () { setSheet(true); });
    qsa('[data-sheet-close]').forEach(function (el) {
      el.addEventListener('click', function () { setSheet(false); });
    });

    bindKeys();
    AA.wall.init();
    AA.lightbox.init();
    AA.catalog.init();

    window.addEventListener('popstate', function () { app.goto(routeFromHash(), true); });
    window.addEventListener('hashchange', function () {
      if (routeFromHash() !== app.route) app.goto(routeFromHash(), true);
    });
    window.addEventListener('storage', function (e) { if (e.key === AA.store.key) load(); });

    app.goto(routeFromHash(), true);
    load();
  }

  AA.app = app;
  document.readyState === 'loading'
    ? document.addEventListener('DOMContentLoaded', boot)
    : boot();
})(window.AA = window.AA || {});
