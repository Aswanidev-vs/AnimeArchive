/**
 * upload.js - the catalog flow: dropzone, preview, per-field validation,
 * honest write indicator, storage meter, hanko confirmation.
 *
 * Improvements over pages/upload.vue + components/upload/*:
 *   - per-field inline errors (aria-invalid + aria-describedby);
 *   - a "Change image" affordance + file name/size line after selecting;
 *   - paste-to-upload alongside drag + browse;
 *   - an INDETERMINATE write bar (a local write has no real percentage);
 *   - announced confirmation (role="status" + focus move on success);
 *   - live parsed tag chips and a storage usage meter.
 */
(function (global) {
  'use strict';

  var AA = global.AA;
  var el = AA.el;
  var clear = AA.clear;
  var fmt = AA.fmt;
  var store = AA.store;

  var state = {
    file: null,
    previewUrl: '',
    dimensions: { width: 0, height: 0 },
    writing: false,
    doneFrame: null,
    errors: { title: '', anime: '', file: '', save: '' },
  };

  var form = { title: '', anime: '', episode: '', tagsText: '', note: '' };
  var dom = {};

  /* -- file selection -------------------------------------------------------- */

  function setFileError(message) {
    state.errors.file = message || '';
    dom.dzError.textContent = state.errors.file;
    dom.dzError.hidden = !state.errors.file;
  }

  function selectFile(file) {
    var problem = store.validateFile(file);
    if (problem) {
      clearFile();
      setFileError(problem);
      return;
    }

    clearFile();
    state.file = file;
    state.previewUrl = URL.createObjectURL(file);
    setFileError('');

    dom.dz.hidden = true;
    dom.monitor.hidden = false;
    dom.filebar.hidden = false;
    dom.monitorImg.src = state.previewUrl;
    dom.monitorImg.alt = 'Preview of ' + file.name;
    dom.fileName.textContent = file.name;
    dom.fileSize.textContent = fmt.formatBytes(file.size);
    dom.submit.disabled = false;
    dom.why.hidden = true;

    store.readImageSize(state.previewUrl).then(function (size) {
      state.dimensions = size;
      renderCaption();
      renderFileMeta();
    });

    renderCaption();
    renderFileMeta();
    dom.monitorImg.focus && dom.monitorImg.focus();
  }

  function clearFile() {
    if (state.previewUrl) URL.revokeObjectURL(state.previewUrl);
    state.file = null;
    state.previewUrl = '';
    state.dimensions = { width: 0, height: 0 };
  }

  function clearAll() {
    clearFile();
    dom.monitorImg.removeAttribute('src');
    dom.dz.hidden = false;
    dom.monitor.hidden = true;
    dom.filebar.hidden = true;
    dom.submit.disabled = true;
    dom.why.hidden = false;
    dom.fileInput.value = '';
    setFileError('');
  }

  function renderFileMeta() {
    var dims = state.dimensions;
    dom.fileDims.textContent =
      dims.width && dims.height ? dims.width + ' \u00d7 ' + dims.height + ' px' : 'reading\u2026';
  }

  function renderCaption() {
    var dims = state.dimensions;
    clear(dom.caption);
    var title = form.title.trim() || (state.file ? state.file.name : 'Untitled frame');
    dom.caption.appendChild(el('span', { text: title }));
    dom.caption.appendChild(el('span', {
      className: form.anime ? '' : 'is-missing',
      text: form.anime || 'No series yet',
    }));
    if (form.episode) dom.caption.appendChild(el('span', { text: form.episode }));
    if (dims.width && dims.height) {
      dom.caption.appendChild(el('span', { text: dims.width + ' \u00d7 ' + dims.height + ' px' }));
    }
  }

  /* -- validation ------------------------------------------------------------ */

  function setFieldError(name, message) {
    state.errors[name] = message || '';
    var control = dom.fields[name];
    var err = dom.fieldErrs[name];
    if (!control || !err) return;
    err.textContent = message || '';
    if (message) {
      control.setAttribute('aria-invalid', 'true');
      control.setAttribute('aria-describedby', err.id);
    } else {
      control.removeAttribute('aria-invalid');
      control.removeAttribute('aria-describedby');
    }
  }

  function validateForm() {
    var firstInvalid = null;
    if (!form.title.trim()) {
      setFieldError('title', 'A title is required.');
      firstInvalid = dom.fields.title;
    } else {
      setFieldError('title', '');
    }
    if (!form.anime.trim()) {
      setFieldError('anime', 'A series is required - it is how the wall stays filed.');
      firstInvalid = firstInvalid || dom.fields.anime;
    } else {
      setFieldError('anime', '');
    }
    if (!state.file) {
      setFileError('Choose an image first.');
      firstInvalid = firstInvalid || dom.fileInput;
    }
    if (firstInvalid) {
      firstInvalid.focus();
      return false;
    }
    return true;
  }

  function parseTags(text) {
    return text
      .split(',')
      .map(function (t) {
        return t.trim().toLowerCase();
      })
      .filter(Boolean);
  }

  function renderTagChips() {
    var chips = clear(dom.tagChips);
    parseTags(form.tagsText).forEach(function (tag) {
      chips.appendChild(el('li', { className: 'tag', text: tag }));
    });
  }

  /* -- storage meter ---------------------------------------------------------- */

  function renderMeter() {
    var usage = store.usage();
    clear(dom.meter);
    dom.meter.appendChild(document.createTextNode('Browser storage '));
    dom.meter.appendChild(el('b', { text: usage.kb + ' KB' }));
    dom.meter.appendChild(document.createTextNode(
      ' of ~' + usage.budgetMb * 1024 + ' KB used by this archive',
    ));
  }

  /* -- submission ------------------------------------------------------------- */

  function setWriting(on) {
    state.writing = on;
    dom.write.hidden = !on;
    dom.submit.disabled = on || !state.file;
    if (on) dom.writeText.textContent = 'Writing to this browser\u2026';
  }

  function showDone(frame) {
    state.doneFrame = frame;
    dom.flow.hidden = true;
    dom.done.hidden = false;
    clear(dom.doneQuote);
    dom.doneQuote.appendChild(el('q', { text: frame.title }));
    renderMeter();
    dom.doneTitle.focus();
  }

  function submit(event) {
    event.preventDefault();
    if (state.writing || !validateForm()) return;

    var draft = {
      title: form.title.trim(),
      anime: form.anime.trim(),
      episode: form.episode.trim(),
      character: '',
      timestamp: '',
      alt: form.title.trim(),
      tags: parseTags(form.tagsText),
      note: form.note.trim(),
      width: state.dimensions.width,
      height: state.dimensions.height,
      src: state.previewUrl,
    };

    setWriting(true);
    dom.saveError.hidden = true;

    store.create(draft, state.file).then(
      function (frame) {
        setWriting(false);
        resetForm(false);
        clearAll();
        showDone(frame);
      },
      function (cause) {
        setWriting(false);
        dom.saveError.textContent = cause && cause.message
          ? cause.message
          : 'The frame could not be saved.';
        dom.saveError.hidden = false;
      },
    );
  }

  function resetForm(focusFirst) {
    form.title = '';
    form.anime = '';
    form.episode = '';
    form.tagsText = '';
    form.note = '';
    Object.keys(dom.fields).forEach(function (name) {
      if (dom.fields[name]) dom.fields[name].value = '';
      setFieldError(name, '');
    });
    renderTagChips();
    renderCaption();
    if (focusFirst) dom.fields.title.focus();
  }

  /* -- events ----------------------------------------------------------------- */

  function bindEvents() {
    /* browse */
    dom.browse.addEventListener('click', function () {
      dom.fileInput.click();
    });
    dom.fileInput.addEventListener('change', function () {
      if (dom.fileInput.files && dom.fileInput.files[0]) {
        selectFile(dom.fileInput.files[0]);
      }
    });
    dom.change.addEventListener('click', function () {
      dom.fileInput.click();
    });

    /* drag and drop - depth counter survives child-element crossings */
    var dragDepth = 0;
    dom.dz.addEventListener('dragenter', function (event) {
      event.preventDefault();
      dragDepth += 1;
      dom.dz.classList.add('is-over');
    });
    dom.dz.addEventListener('dragover', function (event) {
      event.preventDefault();
      if (event.dataTransfer) event.dataTransfer.dropEffect = 'copy';
    });
    dom.dz.addEventListener('dragleave', function () {
      dragDepth = Math.max(0, dragDepth - 1);
      if (dragDepth === 0) dom.dz.classList.remove('is-over');
    });
    dom.dz.addEventListener('drop', function (event) {
      event.preventDefault();
      dragDepth = 0;
      dom.dz.classList.remove('is-over');
      if (event.dataTransfer && event.dataTransfer.files[0]) {
        selectFile(event.dataTransfer.files[0]);
      }
    });

    /* paste an image anywhere on the page */
    document.addEventListener('paste', function (event) {
      if (!event.clipboardData || !event.clipboardData.files.length) return;
      var file = event.clipboardData.files[0];
      if (file.type.indexOf('image/') === 0) selectFile(file);
    });

    /* form fields */
    ['title', 'anime', 'episode', 'note'].forEach(function (name) {
      dom.fields[name].addEventListener('input', function () {
        form[name] = dom.fields[name].value;
        if (state.errors[name]) setFieldError(name, '');
        renderCaption();
      });
    });
    dom.fields.tagsText.addEventListener('input', function () {
      form.tagsText = dom.fields.tagsText.value;
      renderTagChips();
    });

    dom.form.addEventListener('submit', submit);

    dom.resetBtn.addEventListener('click', function () {
      resetForm(true);
    });
    dom.cancel.addEventListener('click', function (event) {
      event.preventDefault();
      global.location.href = 'index.html';
    });
    dom.doneBack.addEventListener('click', function (event) {
      event.preventDefault();
      global.location.href = 'index.html';
    });
    dom.doneAnother.addEventListener('click', function () {
      state.doneFrame = null;
      dom.done.hidden = true;
      dom.flow.hidden = false;
      renderMeter();
      dom.browse.focus();
    });
  }

  /* -- boot ------------------------------------------------------------------- */

  function init() {
    dom = {
      flow: document.getElementById('upload-form'),
      dz: document.getElementById('dropzone'),
      dzError: document.getElementById('dz-error'),
      fileInput: document.getElementById('file-input'),
      browse: document.getElementById('dz-browse'),
      change: document.getElementById('file-change'),
      monitor: document.getElementById('monitor'),
      monitorImg: document.getElementById('monitor-img'),
      caption: document.getElementById('monitor-caption'),
      filebar: document.getElementById('filebar'),
      fileName: document.getElementById('file-name'),
      fileSize: document.getElementById('file-size'),
      fileDims: document.getElementById('file-dims'),
      form: document.getElementById('upload-form'),
      fields: {
        title: document.getElementById('field-title'),
        anime: document.getElementById('field-anime'),
        episode: document.getElementById('field-episode'),
        tagsText: document.getElementById('field-tags'),
        note: document.getElementById('field-note'),
      },
      fieldErrs: {
        title: document.getElementById('err-title'),
        anime: document.getElementById('err-anime'),
        episode: document.getElementById('err-episode'),
        tagsText: document.getElementById('err-tags'),
        note: document.getElementById('err-note'),
      },
      tagChips: document.getElementById('tag-chips'),
      submit: document.getElementById('submit-btn'),
      why: document.getElementById('submit-why'),
      resetBtn: document.getElementById('reset-btn'),
      cancel: document.getElementById('cancel-btn'),
      write: document.getElementById('write-status'),
      writeText: document.getElementById('write-text'),
      saveError: document.getElementById('save-error'),
      meter: document.getElementById('storage-meter'),
      done: document.getElementById('upload-done'),
      doneTitle: document.getElementById('done-title'),
      doneQuote: document.getElementById('done-quote'),
      doneBack: document.getElementById('done-back'),
      doneAnother: document.getElementById('done-another'),
    };

    bindEvents();
    clearAll();
    renderMeter();
    renderTagChips();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})(typeof window !== 'undefined' ? window : globalThis);



