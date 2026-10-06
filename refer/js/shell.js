/**
 * shell.js - shared DOM/format helpers + shell behaviours (nav state, year).
 *
 * Everything user-supplied goes through `el()` + `textContent`; `innerHTML`
 * is reserved for the trusted static SVG icon constants in AA.icons.
 */
(function (global) {
  'use strict';

  var AA = global.AA || (global.AA = {});

  /* -- tiny DOM builder ---------------------------------------------------- */

  function el(tag, opts, children) {
    var node = document.createElement(tag);
    opts = opts || {};
    if (opts.className) node.className = opts.className;
    if (opts.text != null) node.textContent = opts.text;
    if (opts.html != null) node.innerHTML = opts.html; /* trusted constants only */
    if (opts.attrs) {
      Object.keys(opts.attrs).forEach(function (name) {
        if (opts.attrs[name] !== null && opts.attrs[name] !== undefined) {
          node.setAttribute(name, opts.attrs[name]);
        }
      });
    }
    if (children) {
      children.forEach(function (child) {
        if (child) node.appendChild(child);
      });
    }
    return node;
  }

  function clear(node) {
    while (node.firstChild) node.removeChild(node.firstChild);
    return node;
  }

  /* -- trusted static markup ------------------------------------------------ */

  var STAR_PATH =
    'M12 2.6l2.9 5.9 6.5.95-4.7 4.6 1.1 6.45L12 17.45 6.2 20.5l1.1-6.45-4.7-4.6 6.5-.95z';

  var icons = {
    star:
      '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" ' +
      'stroke-width="1.6" stroke-linejoin="round"><path d="' + STAR_PATH + '"/></svg>',
    search:
      '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" ' +
      'stroke-width="2" stroke-linecap="round"><circle cx="10.5" cy="10.5" r="6.5"/>' +
      '<path d="M15.5 15.5 21 21"/></svg>',
    image:
      '<svg class="dz__icon" viewBox="0 0 48 48" aria-hidden="true" fill="none" ' +
      'stroke="currentColor" stroke-width="2"><rect x="5" y="9" width="38" height="30"/>' +
      '<path d="M5 31l10-9 7 6 8-9 13 12"/><circle cx="33" cy="17" r="3.5"/></svg>',
  };

  /* -- formatting ----------------------------------------------------------- */

  function pad3(n) {
    return String(n).padStart(3, '0');
  }

  /** Accession number from storage order: frame_001 -> AA-001, else AA-0NN. */
  function accession(frame, index) {
    var match = /^frame_(\d{1,6})$/.exec(frame.id);
    var n = match ? parseInt(match[1], 10) : index + 1;
    return 'AA-' + pad3(n);
  }

  function formatBytes(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(0) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }

  /** ISO date -> "12 Feb 2026"; '' or invalid -> 'Not recorded'. */
  function formatDate(iso) {
    if (!iso) return 'Not recorded';
    var d = new Date(iso);
    if (isNaN(d.getTime())) return 'Not recorded';
    return d.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }

  /* -- shell behaviours ----------------------------------------------------- */

  function initShell() {
    var page = document.body.getAttribute('data-page');
    if (page) {
      var link = document.querySelector('[data-nav="' + page + '"]');
      if (link) link.setAttribute('aria-current', 'page');
    }
    var year = document.getElementById('year');
    if (year) year.textContent = String(new Date().getFullYear());
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initShell);
  } else {
    initShell();
  }

  AA.el = el;
  AA.clear = clear;
  AA.icons = icons;
  AA.fmt = {
    pad3: pad3,
    accession: accession,
    formatBytes: formatBytes,
    formatDate: formatDate,
  };
})(typeof window !== 'undefined' ? window : globalThis);
