(() => {
  'use strict';
  if (typeof HTMLElement.prototype.hidePopover === 'function') {
    document.addEventListener('keydown', event => {
      if (event.key !== 'Escape') return;
      const help = document.querySelector('.help-popover:popover-open');
      if (!help) return;
      event.preventDefault();
      help.hidePopover();
    });
  }

  const dialog = document.querySelector('#shot-viewer');
  if (!dialog || typeof dialog.showModal !== 'function' || typeof apimWorkshopShots === 'undefined') return;

  const title = document.querySelector('#shot-title');
  const context = document.querySelector('#shot-context');
  const status = document.querySelector('#shot-status');
  const close = document.querySelector('#shot-close');
  const stage = document.querySelector('#shot-stage');
  const rail = stage.querySelector('.shot-rail');
  const frame = rail.querySelector('.shot-frame');
  const image = frame.querySelector('img');
  const message = stage.querySelector('.shot-message');
  const caption = document.querySelector('#shot-caption');
  const notes = document.querySelector('#shot-notes');
  const locationPanel = document.querySelector('#shot-location');
  const resourceLink = document.querySelector('#shot-resource');
  const menu = document.querySelector('#shot-menu');
  const where = document.querySelector('#shot-where');
  const expected = document.querySelector('#shot-expected');
  const evidence = document.querySelector('#shot-evidence');
  const reference = document.querySelector('#shot-reference');
  const implementation = document.querySelector('#shot-implementation');
  const prev = document.querySelector('#shot-prev');
  const next = document.querySelector('#shot-next');
  const zoom = document.querySelector('#shot-zoom');
  const zoomLabel = zoom.querySelector('span');
  const icons = document.querySelector('#shot-icons');
  let gallery;
  let index;
  let opener;
  let active;
  let zoomed;
  let galleryLabel;
  let markers = [];
  let pointerOnBackdrop = false;
  const links = new Map();
  const word = text => document.createTextNode(text);
  const groupName = group => group.dataset.gallery || group.closest('details')?.querySelector('summary')?.textContent.trim() || 'Panduan visual';

  function decorate(container, item) {
    return item.marks.map(([x, y, w, h], i) => {
      const mark = document.createElement('span');
      const number = document.createElement('span');
      mark.className = 'shot-mark';
      mark.setAttribute('aria-hidden', 'true');
      Object.assign(mark.style, { left: `${x}%`, top: `${y}%`, width: `${w}%`, height: `${h}%` });
      number.textContent = i + 1;
      mark.append(number);
      container.append(mark);
      return mark;
    });
  }

  function resizePhoto() {
    if (!dialog.open || !gallery) return;
    const item = gallery[index];
    const fit = Math.max(1, Math.min(stage.clientWidth - 56, (stage.clientHeight - 24) / (item.height / item.width), item.width));
    frame.style.width = `${zoomed ? Math.max(item.width, 2 * fit) : fit}px`;
  }

  function center(mark) {
    const limit = (n, max) => Math.max(0, Math.min(max, n));
    const x = frame.offsetLeft + mark.offsetLeft + mark.offsetWidth / 2;
    const y = frame.offsetTop + mark.offsetTop + mark.offsetHeight / 2;
    stage.scrollTo(limit(x - stage.clientWidth / 2, stage.scrollWidth - stage.clientWidth),
      limit(y - stage.clientHeight / 2, stage.scrollHeight - stage.clientHeight));
  }

  function setZoom(value) {
    zoomed = value;
    zoom.setAttribute('aria-pressed', String(value));
    zoomLabel.textContent = value ? 'Pas layar' : 'Perbesar';
    stage.classList.toggle('is-zoomed', value);
    resizePhoto();
    if (value && active >= 0) center(markers[active]);
    else stage.scrollTo(0, 0);
  }

  function select(indexToFocus) {
    active = active === indexToFocus ? -1 : indexToFocus;
    markers.forEach((mark, i) => {
      mark.classList.toggle('is-active', i === active);
      mark.classList.toggle('is-muted', active >= 0 && i !== active);
      notes.children[i].firstElementChild.setAttribute('aria-pressed', String(i === active));
    });
    if (zoomed && active >= 0) center(markers[active]);
  }

  function show() {
    const item = gallery[index];
    title.textContent = item.title;
    context.textContent = `${item.source} · ${galleryLabel || item.group} · ${index + 1} dari ${gallery.length}`;
    status.textContent = `Gambar ${index + 1} dari ${gallery.length}: ${item.title}`;
    caption.textContent = item.caption;
    caption.hidden = Boolean(item.location);
    locationPanel.hidden = !item.location;
    menu.replaceChildren();
    locationPanel.querySelector('details').open = false;
    if (item.location) {
      const location = item.location;
      resourceLink.textContent = location.resource;
      resourceLink.href = location.url;
      for (const step of location.menu) {
        const li = document.createElement('li');
        li.textContent = step;
        menu.append(li);
      }
      where.textContent = location.where;
      expected.textContent = location.expected;
      evidence.textContent = location.evidence ||
        `Jalur menu Microsoft Learn diperiksa ${location.checked}. Screenshot adalah bukti lab 19 November 2026, bukan tampilan live. Nama menu memakai bahasa Inggris.`;
      reference.textContent = location.referenceLabel || 'Microsoft Learn';
      reference.href = location.reference;
      implementation.hidden = !location.implementation;
      if (location.implementation) implementation.href = location.implementation;
      else implementation.removeAttribute('href');
    }
    stage.style.setProperty('--shot-ratio', item.height / item.width);
    stage.closest('.shot-body').scrollTop = 0;
    prev.setAttribute('aria-disabled', String(index === 0));
    next.setAttribute('aria-disabled', String(index === gallery.length - 1));
    active = -1;
    notes.replaceChildren();
    markers.forEach(mark => mark.remove());
    markers = decorate(frame, item);
    notes.hidden = item.marks.length === 0;
    item.marks.forEach(([, , , , detail], i) => {
      const li = document.createElement('li');
      const button = document.createElement('button');
      const number = document.createElement('span');
      button.type = 'button';
      button.setAttribute('aria-pressed', 'false');
      number.textContent = i + 1;
      button.append(number, word(detail));
      button.addEventListener('click', () => select(i));
      li.append(button);
      notes.append(li);
    });

    image.alt = item.alt;
    image.width = item.width;
    image.height = item.height;
    image.src = item.href;
    updateImageState();
    setZoom(false);
  }

  function updateImageState() {
    if (!gallery) return;
    const ready = image.complete && image.naturalWidth > 0;
    message.textContent = image.complete ? 'Gambar tidak bisa dibuka. Coba pilih gambar lain atau muat ulang panduan.' : 'Memuat gambar…';
    rail.hidden = !ready;
    message.hidden = ready;
    zoom.setAttribute('aria-disabled', String(!ready));
    if (ready) resizePhoto();
  }

  function open(items, start, button, label) {
    gallery = items;
    index = start;
    opener = button;
    galleryLabel = label;
    pointerOnBackdrop = false;
    show();
    dialog.showModal();
    resizePhoto();
    close.focus({ preventScroll: true });
  }

  function move(delta) {
    const newIndex = index + delta;
    if (newIndex < 0 || newIndex >= gallery.length) return;
    index = newIndex;
    show();
  }

  for (const group of document.querySelectorAll('[data-gallery]')) {
    const label = groupName(group);
    const items = [...group.querySelectorAll('figure')].flatMap(figure => {
      const anchor = figure.querySelector(':scope > a');
      const original = anchor?.querySelector('img');
      if (!original) return [];
      const entry = apimWorkshopShots[figure.dataset.shot || anchor.getAttribute('href').split('/').pop().split('.')[0]];
      if (!entry && !figure.dataset.diagram) return [];
      const shortTitle = entry?.title || figure.dataset.diagram;
      const width = Number(original.getAttribute('width'));
      const height = Number(original.getAttribute('height'));
      if (!width || !height) return [];
      const marks = entry ? entry.marks.map(([left, top, right, bottom, detail]) => [
        100 * (left - entry.crop[0]) / width, 100 * (top - entry.crop[1]) / height,
        100 * (right - left) / width, 100 * (bottom - top) / height, detail,
      ]) : [];
      const item = {
        anchor, figure, original, group: label, title: shortTitle,
        href: anchor.getAttribute('href'), alt: original.alt,
        width, height,
        caption: figure.querySelector('figcaption').textContent.trim().split(' · Sumber Draw.io')[0],
        source: figure.dataset.source || (figure.dataset.diagram ? 'Diagram arsitektur'
          : /\/(?:main|x|y)-browser\./.test(anchor.href) ? 'Web App · bukti lab' : 'Azure Portal · bukti lab'),
        marks, location: entry?.location,
      };
      return [item];
    });

    for (const [position, item] of items.entries()) {
      const { anchor, figure, original } = item;
      figure.classList.add('shot-card');
      anchor.classList.add('shot-trigger');
      anchor.setAttribute('role', 'button');
      anchor.setAttribute('aria-haspopup', 'dialog');
      const actionText = item.location ? 'Menu + screenshot' : 'Buka diagram';
      anchor.setAttribute('aria-label', `${actionText}: ${item.title}`);
      const preview = document.createElement('span');
      preview.className = 'shot-preview';
      const previewFrame = document.createElement('span');
      previewFrame.className = 'shot-frame';
      if (!figure.dataset.diagram) {
        const ratio = item.width / item.height;
        previewFrame.style.width = `${Math.min(100, 50 * ratio)}%`;
      }
      const action = document.createElement('span');
      action.className = 'shot-action';
      const actionLabel = document.createElement('span');
      actionLabel.append(icons.content.cloneNode(true), word(actionText));
      const count = document.createElement('span');
      count.className = 'shot-count';
      if (item.marks.length) count.textContent = `${item.marks.length} penanda`;
      action.append(actionLabel, count);
      previewFrame.append(original);
      decorate(previewFrame, item);
      preview.append(previewFrame);
      anchor.append(preview, action);
      anchor.addEventListener('click', (event) => {
        if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey || event.button !== 0) return;
        event.preventDefault();
        open(items, position, anchor);
      });
      anchor.addEventListener('keydown', (event) => {
        if (event.key !== ' ' || event.repeat) return;
        event.preventDefault();
        open(items, position, anchor);
      });
      if (figure.id) links.set(figure.id, item);
    }
  }

  for (const link of document.querySelectorAll('[data-open-shot]')) {
    if (!links.has(link.dataset.openShot)) continue;
    const { anchor, title: shortTitle } = links.get(link.dataset.openShot);
    link.setAttribute('aria-haspopup', 'dialog');
    link.setAttribute('aria-label', `Menu dan screenshot: ${shortTitle}`);
    link.addEventListener('click', (event) => {
      if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      anchor.click();
      opener = link;
    });
  }

  for (const link of document.querySelectorAll('[data-shot-sequence]')) {
    const items = link.dataset.shotSequence.trim().split(/\s+/).map(id => links.get(id));
    if (!items.length || items.some(item => !item)) continue;
    link.setAttribute('aria-haspopup', 'dialog');
    link.setAttribute('aria-label', `Menu dan screenshot: ${link.dataset.sequenceLabel}`);
    link.addEventListener('click', (event) => {
      if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      open(items, 0, link, link.dataset.sequenceLabel);
    });
  }

  image.addEventListener('load', updateImageState);
  image.addEventListener('error', updateImageState);
  close.addEventListener('click', () => dialog.close());
  prev.addEventListener('click', () => move(-1));
  next.addEventListener('click', () => move(1));
  zoom.addEventListener('click', () => {
    if (zoom.getAttribute('aria-disabled') === 'false') setZoom(!zoomed);
  });
  dialog.addEventListener('pointerdown', event => { pointerOnBackdrop = event.target === dialog; });
  dialog.addEventListener('click', event => {
    if (event.target === dialog && pointerOnBackdrop) dialog.close();
    pointerOnBackdrop = false;
  });
  dialog.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      dialog.close();
      return;
    }
    if (event.key === 'Tab') {
      const last = next;
      if (event.shiftKey && document.activeElement === close) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        close.focus();
      }
      return;
    }
    if (event.altKey || event.ctrlKey || event.metaKey || (event.target === stage && zoomed)) return;
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault();
      move(event.key === 'ArrowLeft' ? -1 : 1);
    }
  });
  dialog.addEventListener('close', () => {
    if (dialog.open) return;
    gallery = null;
    image.removeAttribute('src');
    const focused = document.activeElement;
    if (!focused || focused === document.body || dialog.contains(focused)) opener?.focus({ preventScroll: true });
    opener = null;
    pointerOnBackdrop = false;
  });
  if (typeof ResizeObserver === 'function') new ResizeObserver(resizePhoto).observe(stage);
  else window.addEventListener('resize', resizePhoto);

  const setupFlow = document.querySelector('#setup-flow');
  if (setupFlow) {
    const setupSteps = [
      { active: ['api'], related: [], path: 'APIM → API + operation', note: 'Buat alamat masuk dan operasi chat.' },
      { active: ['access'], related: ['api'], path: 'APIM / product + subscription → API X', note: 'Kaitkan API X ke product, lalu buat key untuk aksesnya.' },
      { active: ['identity', 'foundry'], related: [], path: 'Identity APIM → izin project Foundry', note: 'Nyalakan identity APIM; beri role pada scope project X.' },
      { active: ['policy'], related: ['foundry'], path: 'Inbound policy APIM → backend Foundry', note: 'Tentukan host, path project, dan deployment tujuan.' },
      { active: ['app'], related: ['api', 'access'], path: 'Web App → URL + key APIM', note: 'Ubah setting Web App saja, bukan APIM.' },
      { active: ['logs', 'foundry'], related: ['monitor'], path: 'Logger APIM + diagnostic Foundry → LAW', note: 'APIM lewat App Insights; log Foundry langsung ke LAW yang sama.' },
    ];
    const setupRows = [...document.querySelectorAll('#setup-apim .setup-table tbody tr')];
    const stepButtons = [...setupFlow.querySelectorAll('[data-setup-step]')];
    const setupParts = [...setupFlow.querySelectorAll('[data-setup-part]')];
    const previousSetup = setupFlow.querySelector('[data-setup-prev]');
    const nextSetup = setupFlow.querySelector('[data-setup-next]');
    const setupMenu = setupFlow.querySelector('[data-setup-menu]');
    const setupCount = setupFlow.querySelector('[data-setup-count]');
    const setupPath = setupFlow.querySelector('[data-setup-path]');
    const setupNote = setupFlow.querySelector('[data-setup-note]');
    let setupIndex = 0;

    function selectSetupStep(selected) {
      const focused = document.activeElement;
      setupIndex = selected;
      const step = setupSteps[selected];
      stepButtons.forEach((button, i) => button.setAttribute('aria-pressed', String(i === selected)));
      setupParts.forEach(part => {
        const name = part.dataset.setupPart;
        part.dataset.state = step.active.includes(name) ? 'active' : step.related.includes(name) ? 'related' : 'idle';
      });
      setupCount.textContent = `${selected + 1}/6`;
      setupPath.textContent = step.path;
      setupNote.textContent = step.note;
      previousSetup.disabled = selected === 0;
      nextSetup.disabled = selected === setupSteps.length - 1;
      setupMenu.setAttribute('aria-label', `Menu dan screenshot langkah ${selected + 1}`);
      if ((focused === previousSetup && previousSetup.disabled) || (focused === nextSetup && nextSetup.disabled)) {
        stepButtons[selected].focus({ preventScroll: true });
      }
    }

    stepButtons.forEach((button, i) => button.addEventListener('click', () => selectSetupStep(i)));
    setupRows.forEach((row, i) => row.addEventListener('click', event => {
      if (event.target.closest('a,button')) selectSetupStep(i);
    }));
    setupFlow.querySelector('.setup-flow-steps').addEventListener('keydown', event => {
      if (event.altKey || event.ctrlKey || event.metaKey) return;
      const selected = stepButtons.indexOf(event.target.closest('[data-setup-step]'));
      if (selected < 0) return;
      const targets = {
        ArrowLeft: Math.max(0, selected - 1), ArrowRight: Math.min(setupSteps.length - 1, selected + 1),
        Home: 0, End: setupSteps.length - 1,
      };
      if (!(event.key in targets)) return;
      event.preventDefault();
      selectSetupStep(targets[event.key]);
      stepButtons[setupIndex].focus();
    });
    previousSetup.addEventListener('click', () => selectSetupStep(setupIndex - 1));
    nextSetup.addEventListener('click', () => selectSetupStep(setupIndex + 1));
    setupMenu.addEventListener('click', () => {
      const source = setupRows[setupIndex].querySelector('[data-shot-sequence],[data-open-shot]');
      const ids = source.dataset.shotSequence ? source.dataset.shotSequence.trim().split(/\s+/) : [source.dataset.openShot];
      const items = ids.map(id => {
        const item = links.get(id);
        if (!item) throw new Error(`Screenshot langkah setup tidak ditemukan: ${id}`);
        return item;
      });
      open(items, 0, setupMenu, source.dataset.sequenceLabel || setupRows[setupIndex].querySelector('th').textContent.trim());
    });
    selectSetupStep(0);
    setupFlow.querySelectorAll('[data-setup-controls]').forEach(controls => { controls.hidden = false; });
  }
})();
