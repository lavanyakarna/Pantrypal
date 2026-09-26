/* ============================================================
   app.js — state, safe rendering, voice engine, AI wiring
   ============================================================ */

const STORE = 'pantry.v2';

const defaultState = {
  items: [], frequency: {}, history: [], lang: 'en', theme: 'light'
};

function loadState() {
  try {
    const raw = localStorage.getItem(STORE);
    if (!raw) return { ...defaultState };
    const parsed = JSON.parse(raw);
    return {
      items:     Array.isArray(parsed.items) ? parsed.items : [],
      frequency: parsed.frequency && typeof parsed.frequency === 'object' ? parsed.frequency : {},
      history:   Array.isArray(parsed.history) ? parsed.history : [],
      lang:      LANGUAGES[parsed.lang] ? parsed.lang : 'en',
      theme:     parsed.theme === 'dark' ? 'dark' : 'light'
    };
  } catch (err) {
    console.warn('[state] corrupt save, starting fresh:', err.message);
    return { ...defaultState };
  }
}

let state = loadState();
let undoStack = [];
let pendingSuggestion = null;
let activeFilter = 'all';
let recipeDraft = null;
let listFilter = 'all';   /* all | todo | done */

function save() {
  try { localStorage.setItem(STORE, JSON.stringify(state)); }
  catch (err) { console.warn('[state] save failed:', err.message); }
}

function snapshot() {
  undoStack.push(JSON.stringify({ items: state.items, frequency: state.frequency }));
  if (undoStack.length > 25) undoStack.shift();
}

function t(key, ...args) {
  const pack = STRINGS[state.lang] || STRINGS.en;
  const fn = pack[key] || STRINGS.en[key];
  return typeof fn === 'function' ? fn(...args) : '';
}

function ui(key) {
  const pack = UI_TEXT[state.lang] || UI_TEXT.en;
  return pack[key] || UI_TEXT.en[key] || '';
}

function labelFor(name, display) {
  if (display) return display;
  if (state.lang === 'hi' && HINDI_LABELS[name]) return HINDI_LABELS[name];
  return name;
}

const uid = () => Math.random().toString(36).slice(2, 10);

/* ============================================================
   DOM
   ============================================================ */
const $ = (id) => document.getElementById(id);

const el = {
  srLive: $('sr-live'), sidebar: $('sidebar'), menuToggle: $('menu-toggle'),
  navCount: $('nav-count'),
  langSelect: $('language-select'),
  langPill: $('lang-pill'),
  themeToggle: $('theme-toggle'),
  viewTitle: $('view-title'), viewSub: $('view-subtitle'),
  summaryBtn: $('summary-btn'), undoBtn: $('undo-btn'), clearBtn: $('clear-btn'),
  statItems: $('stat-items'), statDone: $('stat-done'), statCats: $('stat-cats'), statCost: $('stat-cost'),
  aiSummary: $('ai-summary'), aiSummaryTx: $('ai-summary-text'), aiInsightTx: $('ai-insight-text'),
  aiMissing: $('ai-missing'), summaryClose: $('summary-close'),
  list: $('shopping-list'), listEmpty: $('list-empty'),
  catalogSearch: $('catalog-search'), filters: $('category-filters'),
  resultsHead: $('results-heading'), results: $('search-results'),
  suggestions: $('suggestions-panel'), favorites: $('favorites-panel'), history: $('history-panel'),
  transcript: $('transcript'), textForm: $('text-form'), textInput: $('text-input'),
  micBtn: $('mic-btn'), micStatus: $('mic-status'),
  modal: $('recipe-modal'), recipeTitle: $('recipe-title'), recipeSub: $('recipe-sub'),
  recipeItems: $('recipe-items'), recipeAdd: $('recipe-add'), toasts: $('toasts')
};

function node(tag, className, text) {
  const n = document.createElement(tag);
  if (className) n.className = className;
  if (text !== undefined && text !== null) n.textContent = String(text);
  return n;
}

function photoTile(className, src, label) {
  const wrap = node('div', `photo ${className}`);
  wrap.dataset.letter = (label || '?').trim().charAt(0);
  const img = document.createElement('img');
  img.loading = 'lazy'; img.decoding = 'async'; img.alt = '';
  img.addEventListener('load', () => {
    wrap.classList.remove('is-failed', 'is-pending');
    wrap.classList.add('is-loaded');
  });
  img.addEventListener('error', () => {
    wrap.classList.remove('is-loaded');
    wrap.classList.add('is-failed');
  });
  wrap.appendChild(img);
  if (src) img.src = src;
  else wrap.classList.add('is-pending');
  return wrap;
}

function catLabel(id) {
  const safe = CATEGORIES[id] ? id : DEFAULT_CATEGORY;
  const pack = (typeof CATEGORY_LABELS !== 'undefined') ? CATEGORY_LABELS[state.lang] : null;
  return (pack && pack[safe]) || CATEGORIES[safe].label;
}
function shopText(key) {
  if (typeof SHOP_TEXT === 'undefined') return '';
  const pack = SHOP_TEXT[state.lang] || SHOP_TEXT.en;
  return pack[key] || SHOP_TEXT.en[key];
}
function priceOf(item) {
  const match = CATALOG.find(p => p.name.toLowerCase().includes(item.name));
  return match ? match.price * (item.qty || 1) : 0;
}

function catVars(node_, categoryId) {
  const c = CATEGORIES[categoryId] ? categoryId : DEFAULT_CATEGORY;
  node_.style.setProperty('--cat', `var(--${CATEGORIES[c].accent})`);
  node_.style.setProperty('--cat-sub', `var(--${CATEGORIES[c].accent}-sub)`);
}

/* ============================================================
   PHOTO LOOKUP — catalog match, then live Openverse search
   ============================================================ */
const PHOTO_CACHE_KEY = 'pantry.photos.v2';
let photoCache = {};
try { photoCache = JSON.parse(localStorage.getItem(PHOTO_CACHE_KEY)) || {}; }
catch (e) { photoCache = {}; }

function savePhotoCache() {
  try { localStorage.setItem(PHOTO_CACHE_KEY, JSON.stringify(photoCache)); } catch (e) {}
}

/* Fallback product-type word per category, used when no hint is given. */
const TYPE_HINTS = {
  personal: 'toiletry product', dairy: 'dairy product', produce: 'fresh vegetable',
  bakery: 'bread', meat: 'raw meat', pantry: 'food ingredient', frozen: 'frozen food',
  snacks: 'snack food', beverages: 'drink', household: 'cleaning product',
  other: 'grocery product'
};

/* Reuse a verified catalog photo when the name clearly overlaps. */
function trustedPhoto(name) {
  const words = String(name || '').toLowerCase().match(/[a-z]{4,}/g) || [];
  if (!words.length) return '';
  let best = null, bestScore = 0;
  CATALOG.forEach(p => {
    const hay = (p.name + ' ' + p.brand).toLowerCase();
    let score = 0;
    words.forEach(w => { if (hay.includes(w)) score += w.length; });
    if (score > bestScore) { bestScore = score; best = p; }
  });
  return bestScore >= 4 && best ? best.photo : '';
}

async function openverseSearch(query) {
  const url = 'https://api.openverse.org/v1/images/?page_size=1&mature=false&q='
            + encodeURIComponent(query);
  const res = await fetch(url);
  if (!res.ok) throw new Error('openverse ' + res.status);
  const data = await res.json();
  const hit = (data.results || [])[0];
  return hit ? (hit.thumbnail || hit.url) : '';
}

/* `hint` is the product type word ("soap", "toothpaste"). It is what
   stops a brand name like "Lux" from returning a photo of a lamp. */
async function findPhoto(name, categoryId, hint) {
  const local = trustedPhoto(name);
  if (local) return local;

  const cat = categoryId || resolveCategory(name);
  const typeWord = String(hint || TYPE_HINTS[cat] || '').trim();
  const key = (String(name || '') + '|' + typeWord).toLowerCase().trim();
  if (photoCache[key]) return photoCache[key];

  const attempts = [];
  if (typeWord) attempts.push(`${name} ${typeWord}`, typeWord);
  else attempts.push(name);

  for (const q of attempts) {
    try {
      const src = await openverseSearch(q);
      if (src) { photoCache[key] = src; savePhotoCache(); return src; }
    } catch (err) { /* try the next phrasing */ }
  }
  return '';
}

/* ONE definition only — a second one would silently override this. */
function fillPhoto(tile, name, categoryId, hint) {
  findPhoto(name, categoryId, hint).then(src => {
    if (!src) return;
    const img = tile.querySelector('img');
    if (!img) return;
    tile.classList.remove('is-failed', 'is-pending');
    img.src = src;
  }).catch(() => {});
}

/* ============================================================
   FEEDBACK
   ============================================================ */
function toast(message, kind = '') {
  const box = node('div', 'toast' + (kind ? ` toast-${kind}` : ''), message);
  el.toasts.appendChild(box);
  setTimeout(() => {
    box.classList.add('is-out');
    setTimeout(() => box.remove(), 240);
  }, 3400);
}

function announce(message) { el.srLive.textContent = message; }

function speak(text) {
  if (!window.speechSynthesis || !text) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = LANGUAGES[state.lang].lang;
  u.rate = 1.05;
  window.speechSynthesis.speak(u);
}

function respond(text, kind = '') { toast(text, kind); announce(text); speak(text); }

/* ============================================================
   LIST OPERATIONS
   ============================================================ */
function findItem(name) {
  const n = normalizeItem(name);
  return state.items.find(i => i.name === n);
}

function addItem(rawName, qty = 1, unit = null, opts = {}) {
  const name = normalizeItem(rawName);
  if (!name) return null;

  const existing = state.items.find(i => i.name === name);
  if (existing) {
    existing.qty += (qty || 1);
    if (unit && !existing.unit) existing.unit = unit;
    if (opts.display && !existing.display) existing.display = opts.display;
    existing.done = false;
  } else {
    state.items.push({
      id: uid(), name,
      display: opts.display || null,
      qty: qty || 1,
      unit: unit || null,
      category: resolveCategory(name),
      done: false,
      addedAt: Date.now()
    });
  }
  save();
  if (!opts.silent) { render(); respond(t('added', labelFor(name, opts.display))); }
  return name;
}

function removeItem(id) {
  const item = state.items.find(i => i.id === id);
  if (!item) return;
  snapshot();
  state.items = state.items.filter(i => i.id !== id);
  save(); render();
  respond(t('removed', labelFor(item.name, item.display)));
}

function removeByName(rawName, display) {
  const item = findItem(rawName);
  if (!item) { respond(t('notOnList', display || normalizeItem(rawName)), 'error'); return; }
  removeItem(item.id);
}

function setQty(id, delta) {
  const item = state.items.find(i => i.id === id);
  if (!item) return;
  item.qty += delta;
  if (item.qty <= 0) state.items = state.items.filter(i => i.id !== id);
  save(); render();
}

function toggleDone(id, spoken = false) {
  const item = state.items.find(i => i.id === id);
  if (!item) return;
  item.done = !item.done;
  if (item.done) state.frequency[item.name] = (state.frequency[item.name] || 0) + 1;
  else state.frequency[item.name] = Math.max(0, (state.frequency[item.name] || 1) - 1);
  save(); render();
  if (spoken) respond(t('checkedOff', labelFor(item.name, item.display)));
}

function clearList() {
  if (!state.items.length) { toast(t('empty')); return; }
  snapshot();
  const done = state.items.filter(i => i.done).map(i => i.name);
  if (done.length) {
    state.history.unshift({ date: Date.now(), items: done });
    state.history = state.history.slice(0, 12);
  }
  state.items = [];
  save(); render();
  respond(t('cleared'));
}

function undo() {
  if (!undoStack.length) return;
  const prev = JSON.parse(undoStack.pop());
  state.items = prev.items;
  state.frequency = prev.frequency;
  save(); render();
  respond(t('undone'));
}

function topFavorites(n = 8) {
  return Object.entries(state.frequency)
    .filter(([, count]) => count > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, n);
}

/* ============================================================
   RENDER — list
   ============================================================ */
function estimateTotal() {
  let total = 0;
  state.items.forEach(item => {
    const match = CATALOG.find(p => p.name.toLowerCase().includes(item.name));
    if (match) total += match.price * (item.qty || 1);
  });
  return Math.round(total);
}

function svgNS(d, size = 14) {
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('width', size); svg.setAttribute('height', size);
  svg.setAttribute('fill', 'none'); svg.setAttribute('stroke', 'currentColor');
  svg.setAttribute('stroke-width', '3');
  svg.setAttribute('stroke-linecap', 'round'); svg.setAttribute('stroke-linejoin', 'round');
  const path = document.createElementNS(ns, 'path');
  path.setAttribute('d', d);
  svg.appendChild(path);
  return svg;
}
const tick  = () => svgNS('M20 6 9 17l-5-5', 13);
const cross = () => svgNS('M18 6 6 18M6 6l12 12', 15);

function renderList() {
  el.list.textContent = '';
  const items = state.items.filter(i =>
    listFilter === 'done' ? i.done :
    listFilter === 'todo' ? !i.done : true);

  el.listEmpty.hidden = items.length > 0;
  el.list.hidden = items.length === 0;

  const groups = {};
  items.forEach(i => { (groups[i.category] ||= []).push(i); });
  const order = Object.keys(CATEGORIES).filter(c => groups[c]);

  order.forEach(catId => {
    const group = node('div', 'group');
    catVars(group, catId);

    const head = node('div', 'group-head');
    const headInner = node('div', 'group-head-inner');
    headInner.appendChild(node('span', 'group-title', catLabel(catId)));
    headInner.appendChild(node('span', 'group-count', `${groups[catId].length}`));
    head.appendChild(headInner);
    group.appendChild(head);

    groups[catId].forEach(item => {
      const row = node('div', 'item' + (item.done ? ' is-done' : ''));
      if (Date.now() - item.addedAt < 900) row.classList.add('is-new');

      const check = node('button', 'item-check');
      check.type = 'button';
      check.setAttribute('aria-label', `Mark ${item.name} as bought`);
      check.setAttribute('aria-pressed', String(item.done));
      check.appendChild(tick());
      check.addEventListener('click', () => toggleDone(item.id));
      row.appendChild(check);

      const iTile = photoTile('item-photo', photoFor(item.name, item.category), item.name);
      row.appendChild(iTile);

      const body = node('div', 'item-body');
      body.appendChild(node('span', 'item-name', labelFor(item.name, item.display)));
      if (item.unit) body.appendChild(node('span', 'item-meta', `${item.qty} ${item.unit}`));
      row.appendChild(body);

      const qty = node('div', 'qty');
      const minus = node('button', 'qty-btn', '−');
      minus.type = 'button';
      minus.setAttribute('aria-label', `Decrease ${item.name}`);
      minus.addEventListener('click', () => setQty(item.id, -1));
      const value = node('span', 'qty-value', item.unit ? `${item.qty}${item.unit}` : item.qty);
      const plus = node('button', 'qty-btn', '+');
      plus.type = 'button';
      plus.setAttribute('aria-label', `Increase ${item.name}`);
      plus.addEventListener('click', () => setQty(item.id, 1));
      qty.append(minus, value, plus);
      row.appendChild(qty);

      const del = node('button', 'item-remove');
      del.type = 'button';
      del.setAttribute('aria-label', `Remove ${item.name}`);
      del.appendChild(cross());
      del.addEventListener('click', () => removeItem(item.id));
      row.appendChild(del);

      group.appendChild(row);
    });

    el.list.appendChild(group);
  });
}

/* ============================================================
   RENDER — stats, suggestions, favourites, history
   ============================================================ */
function renderStats() {
  const total = state.items.length;
  const done = state.items.filter(i => i.done).length;
  const cats = new Set(state.items.map(i => i.category)).size;

  el.statItems.textContent = total;
  el.statDone.textContent  = done;
  el.statCats.textContent  = cats;
  el.statCost.textContent  = '₹' + estimateTotal();
  el.navCount.textContent  = total;

  const tileEls = document.querySelectorAll('#stats-row .stat');
  const hints = [
    listFilter === 'todo' ? 'Showing only items still to buy' : 'Show only items still to buy',
    listFilter === 'done' ? 'Showing only bought items' : 'Show only bought items',
    'Browse the full catalog',
    'Start shopping mode'
  ];
  tileEls.forEach((tile, i) => {
    tile.title = hints[i];
    tile.classList.toggle('is-active',
      (i === 0 && listFilter === 'todo') || (i === 1 && listFilter === 'done'));
  });

  el.undoBtn.disabled = undoStack.length === 0;
  el.summaryBtn.disabled = total === 0;

  if (currentView === 'list') {
    el.viewSub.textContent = total
      ? `${total} · ${done} ✓ · ₹${estimateTotal()}`
      : ui('emptyTitle');
  }
}

function renderSuggestions() {
  el.suggestions.textContent = '';
  pendingSuggestion = null;
  const cards = [];

  Object.entries(state.frequency)
    .filter(([name, count]) => count >= 2 && !state.items.some(i => i.name === name))
    .sort((a, b) => b[1] - a[1]).slice(0, 3)
    .forEach(([name, count]) => {
      cards.push({ kind: 'Running low', text: `You've bought ${labelFor(name)} ${count} times. Add it again?`, item: name, actionable: true });
    });

  state.items.slice(0, 6).forEach(i => {
    if (SUBSTITUTES[i.name]) {
      cards.push({ kind: 'Substitute', text: `Swap ${labelFor(i.name, i.display)} for ${SUBSTITUTES[i.name]}?`, item: i.name, ai: true });
    }
  });

  (SEASONAL_BY_MONTH[new Date().getMonth()] || []).forEach(s => {
    if (!state.items.some(i => i.name === normalizeItem(s))) {
      cards.push({ kind: 'In season', text: `${s} are in season right now.`, item: s, actionable: true });
    }
  });

  if (!cards.length) {
    el.suggestions.appendChild(node('p', 'muted-note', 'Check a few items off your list and suggestions will appear here.'));
    return;
  }

  cards.slice(0, 6).forEach(card => {
    const box = node('div', 'suggestion');
    const isPending = card.actionable && !pendingSuggestion;
    if (isPending) { pendingSuggestion = { item: card.item }; box.classList.add('is-pending'); }

    box.appendChild(node('span', 'suggestion-kind', isPending ? `${card.kind} · "${state.lang === 'hi' ? 'हाँ' : 'yes'}"` : card.kind));
    box.appendChild(node('p', 'suggestion-text', card.text));

    const actions = node('div', 'suggestion-actions');
    if (card.ai) {
      const askBtn = node('button', 'btn btn-ai', '✨ Ask AI');
      askBtn.type = 'button';
      askBtn.addEventListener('click', () => showSubstitutes(card.item));
      actions.appendChild(askBtn);
    } else {
      const yes = node('button', 'btn btn-primary', 'Add');
      yes.type = 'button';
      yes.addEventListener('click', () => { snapshot(); addItem(card.item); });
      const no = node('button', 'btn btn-ghost', 'Dismiss');
      no.type = 'button';
      no.addEventListener('click', () => box.remove());
      actions.append(yes, no);
    }
    box.appendChild(actions);
    el.suggestions.appendChild(box);
  });
}

function renderFavorites() {
  el.favorites.textContent = '';
  const favs = topFavorites(8);
  if (!favs.length) {
    el.favorites.appendChild(node('p', 'muted-note', 'No purchase history yet — check items off as you buy them.'));
    return;
  }
  favs.forEach(([name, count]) => {
    const chip = node('button', 'chip');
    chip.type = 'button';
    catVars(chip, resolveCategory(name));
    chip.appendChild(photoTile('chip-photo', photoFor(name, resolveCategory(name)), name));
    chip.appendChild(node('span', null, labelFor(name)));
    chip.appendChild(node('span', 'chip-count', count));
    chip.addEventListener('click', () => { snapshot(); addItem(name); });
    el.favorites.appendChild(chip);
  });
}

function renderHistory() {
  el.history.textContent = '';
  if (!state.history.length) {
    el.history.appendChild(node('p', 'muted-note', 'Completed trips will appear here. Check items off, then clear the list.'));
    return;
  }
  state.history.forEach(trip => {
    const row = node('div', 'history-entry');
    row.appendChild(node('span', 'history-date',
      new Date(trip.date).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })));
    row.appendChild(node('span', 'history-items', trip.items.map(n => labelFor(n)).join(', ')));
    row.appendChild(node('span', 'history-count', `${trip.items.length}`));
    el.history.appendChild(row);
  });
}

/* ============================================================
   RENDER — discover
   ============================================================ */
function renderFilters() {
  el.filters.textContent = '';
  const all = node('button', 'filter-chip' + (activeFilter === 'all' ? ' is-active' : ''), ui('all') || 'All');
  all.type = 'button';
  all.addEventListener('click', () => { activeFilter = 'all'; renderFilters(); renderCatalog(); });
  el.filters.appendChild(all);

  Object.keys(CATEGORIES).forEach(id => {
    if (id === 'other' || !CATALOG.some(p => p.category === id)) return;
    const chip = node('button', 'filter-chip' + (activeFilter === id ? ' is-active' : ''), catLabel(id));
    chip.type = 'button';
    catVars(chip, id);
    chip.addEventListener('click', () => { activeFilter = id; renderFilters(); renderCatalog(); });
    el.filters.appendChild(chip);
  });
}

function renderCatalog(list = null, headingText = null) {
  const query = el.catalogSearch.value.trim().toLowerCase();
  let products = list || CATALOG;

  if (!list) {
    if (activeFilter !== 'all') products = products.filter(p => p.category === activeFilter);
    if (query) products = products.filter(p =>
      p.name.toLowerCase().includes(query) || p.brand.toLowerCase().includes(query));
  }

  el.resultsHead.textContent = headingText || (query ? `“${query}”` : ui('allProducts'));
  el.results.textContent = '';

  if (!products.length) {
    el.results.appendChild(node('p', 'muted-note', t('noResults')));
    return;
  }

  products.forEach(p => {
    const card = node('div', 'product-card');
    catVars(card, p.category);
    card.tabIndex = 0;
    card.setAttribute('role', 'button');
    card.addEventListener('click', () => openProduct(p));
    card.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openProduct(p); }
    });

    card.appendChild(node('span', 'product-tag', catLabel(p.category)));
    card.appendChild(photoTile('product-photo', p.photo, p.name));

    const info = node('div', 'product-info');
    info.appendChild(node('span', 'product-name', p.name));
    info.appendChild(node('span', 'product-brand', p.brand));

    const foot = node('div', 'product-foot');
    foot.appendChild(node('span', 'product-price', `₹${p.price}`));

    const add = node('button', 'product-add', '+');
    add.type = 'button';
    add.setAttribute('aria-label', `Add ${p.name} to list`);
    add.addEventListener('click', (e) => {
      e.stopPropagation();
      snapshot();
      addItem(p.name.replace(/\s*\d+\s*(kg|g|l|ml|x\d+).*$/i, '').trim());
      add.classList.add('is-added');
      add.textContent = '✓';
      setTimeout(() => { add.classList.remove('is-added'); add.textContent = '+'; }, 1400);
    });
    foot.appendChild(add);
    info.appendChild(foot);
    card.appendChild(info);

    el.results.appendChild(card);
  });
}

/* ============================================================
   PRODUCT DETAIL
   ============================================================ */
let pdProduct = null;
let pdQty = 1;
let pdWired = false;

function pdBaseName(name) {
  return String(name || '').replace(/\s*\d+\s*(kg|g|l|ml|x\d+).*$/i, '').trim();
}

function wireProductModal() {
  if (pdWired) return;
  pdWired = true;

  document.querySelectorAll('[data-close-product]')
    .forEach(b => b.addEventListener('click', closeProduct));

  $('pd-minus').addEventListener('click', () => {
    pdQty = Math.max(1, pdQty - 1);
    $('pd-qty').textContent = pdQty;
  });
  $('pd-plus').addEventListener('click', () => {
    pdQty = Math.min(99, pdQty + 1);
    $('pd-qty').textContent = pdQty;
  });

  $('pd-add').addEventListener('click', () => {
    if (!pdProduct) return;
    snapshot();
    addItem(pdBaseName(pdProduct.name), pdQty);
    closeProduct();
  });

  $('pd-sub').addEventListener('click', () => {
    if (!pdProduct) return;
    const n = pdBaseName(pdProduct.name);
    closeProduct();
    showSubstitutes(n);
  });

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeProduct();
  });
}

function closeProduct() {
  const m = $('product-modal');
  if (m) m.hidden = true;
  pdProduct = null;
}

function openProduct(p) {
  const m = $('product-modal');
  if (!m || !p) return;
  wireProductModal();

  const hint = p.hint || '';

  /* upgrade a bare name into the real catalog entry when we have one */
  if (!p.id) {
    const n = String(p.name || '').toLowerCase();
    const hit = CATALOG.find(c => c.name.toLowerCase().includes(n) ||
                                  n.includes(pdBaseName(c.name).toLowerCase()));
    if (hit) p = { ...hit, why: p.why, hint };
  }

  const cat = p.category || resolveCategory(pdBaseName(p.name));
  pdProduct = { ...p, category: cat };
  pdQty = 1;
  $('pd-qty').textContent = '1';

  catVars(m.querySelector('.pd-card'), cat);

  const media = $('pd-media');
  media.textContent = '';
  const pdTile = photoTile('pd-photo', p.photo || trustedPhoto(p.name), p.name);
  if (!p.photo) fillPhoto(pdTile, p.name, cat, hint);
  media.appendChild(pdTile);

  $('pd-tag').textContent  = catLabel(cat);
  $('pd-name').textContent = p.name;

  const brandLine = $('pd-brand');
  brandLine.textContent = p.why || p.brand || '';
  brandLine.hidden = !brandLine.textContent;

  const priceLine = $('pd-price');
  if (p.price) { priceLine.textContent = '₹' + p.price; priceLine.hidden = false; }
  else { priceLine.hidden = true; }

  const specs = $('pd-specs');
  specs.textContent = '';
  const rows = [['Category', catLabel(cat)]];
  if (p.brand) rows.unshift(['Brand', p.brand]);
  if (p.price) rows.push(['Price', '₹' + p.price]);
  if (p.id)    rows.push(['Product code', p.id.toUpperCase()]);
  if (!p.id)   rows.push(['Source', 'AI suggestion']);
  rows.forEach(([k, v]) => {
    specs.appendChild(node('dt', null, k));
    specs.appendChild(node('dd', null, v));
  });

  const owned = state.items.find(i => i.name === normalizeItem(pdBaseName(p.name)));
  const badge = $('pd-inlist');
  if (owned) {
    badge.hidden = false;
    badge.textContent = `✓ Already on your list — ${owned.qty} in basket`;
  } else {
    badge.hidden = true;
  }

  m.hidden = false;
}

/* ============================================================
   RENDER — shop
   ============================================================ */
function renderShop() {
  const box = $('shop-list');
  if (!box) return;
  box.textContent = '';

  const items = state.items;
  const done = items.filter(i => i.done).length;
  const pct = items.length ? Math.round((done / items.length) * 100) : 0;

  const bar = $('shop-bar');
  if (bar) bar.style.width = pct + '%';
  const ptext = $('shop-progress-text');
  if (ptext) ptext.textContent = items.length
    ? `${done}/${items.length} ${shopText('progress')} · ${items.length - done} ${shopText('remaining')}`
    : shopText('empty');
  const tl = $('shop-total-label');
  if (tl) tl.textContent = shopText('total');
  const tv = $('shop-total-value');
  if (tv) tv.textContent = '₹' + estimateTotal();

  const btn = $('shop-complete');
  if (btn) {
    btn.textContent = (done === items.length && items.length) ? shopText('done') : shopText('complete');
    btn.disabled = items.length === 0;
  }

  const sorted = items.slice().sort((a, b) => Number(a.done) - Number(b.done));
  sorted.forEach(item => {
    const row = node('div', 'shop-row' + (item.done ? ' is-done' : ''));
    catVars(row, item.category);
    const tick_ = node('div', 'shop-tick');
    tick_.appendChild(tick());
    row.appendChild(tick_);
    row.appendChild(photoTile('shop-photo', photoFor(item.name, item.category), item.name));
    const body = node('div', 'shop-body');
    body.appendChild(node('span', 'shop-name', labelFor(item.name, item.display)));
    body.appendChild(node('span', 'shop-meta',
      `${catLabel(item.category)} · ${item.qty}${item.unit ? ' ' + item.unit : ''}`));
    row.appendChild(body);
    const p = priceOf(item);
    if (p) row.appendChild(node('span', 'shop-price', '₹' + p));
    row.addEventListener('click', () => toggleDone(item.id));
    box.appendChild(row);
  });
}

function completeTrip() {
  if (!state.items.length) return;
  snapshot();
  const bought = state.items.filter(i => i.done).map(i => i.name);
  if (bought.length) {
    state.history.unshift({ date: Date.now(), items: bought });
    state.history = state.history.slice(0, 12);
  }
  state.items = state.items.filter(i => !i.done);
  save(); render(); setView('list');
  respond(shopText('tripSaved'));
}

function render() {
  renderList(); renderStats(); renderSuggestions();
  renderFavorites(); renderHistory(); renderShop();
}

/* ============================================================
   VIEWS
   ============================================================ */
let currentView = 'list';
const VIEW_META = {
  list:     { title: 'My List',       sub: '' },
  shop:     { title: 'Shopping mode', sub: '' },
  discover: { title: 'Discover',      sub: '' },
  insights: { title: 'Insights',      sub: '' }
};

function setView(view) {
  if (!VIEW_META[view]) view = 'list';
  currentView = view;
  document.querySelectorAll('.view').forEach(v => v.classList.toggle('is-active', v.id === `view-${view}`));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.toggle('is-active', n.dataset.view === view));
  el.viewTitle.textContent = VIEW_META[view].title;
  el.viewSub.textContent = VIEW_META[view].sub || '';
  el.sidebar.classList.remove('is-open');
  renderStats();
  if (view === 'shop') renderShop();
}

/* ============================================================
   COMMAND HANDLING
   ============================================================ */
async function runCommands(commands) {
  const adds = commands.filter(c => c.intent === 'add' && c.item);

  if (adds.length) {
    snapshot();
    const unknown = adds.map(c => c.item).filter(n => resolveCategory(n) === DEFAULT_CATEGORY);
    let aiCats = {};
    if (unknown.length) aiCats = await aiCategorize(unknown);

    adds.forEach(c => {
      const name = addItem(c.item, c.quantity, c.unit, { silent: true, display: c.display });
      if (name && aiCats[name]) {
        const item = state.items.find(i => i.name === name);
        if (item) item.category = aiCats[name];
      }
    });
    save(); render();
    const names = adds.map(c => labelFor(c.item, c.display));
    respond(t('added', names.join(', ')));
  }

  for (const cmd of commands) {
    switch (cmd.intent) {
      case 'add': break;
      case 'remove': snapshot(); removeByName(cmd.item, cmd.display); break;
      case 'check_off': {
        const item = findItem(cmd.item);
        if (item) toggleDone(item.id, true);
        else respond(t('notOnList', cmd.display || cmd.item), 'error');
        break;
      }
      case 'clear_list': clearList(); break;
      case 'search': doSearch(cmd.item, cmd.max_price, cmd.brand); break;
      case 'add_favorites': {
        const favs = topFavorites(5);
        if (!favs.length) { respond('No favourites yet.', 'error'); break; }
        snapshot();
        favs.forEach(([name]) => addItem(name, 1, null, { silent: true }));
        save(); render();
        respond(t('added', favs.map(f => labelFor(f[0])).join(', ')));
        break;
      }
      case 'confirm_yes':
        if (pendingSuggestion) { snapshot(); addItem(pendingSuggestion.item); pendingSuggestion = null; }
        else respond(t('notUnderstood'), 'error');
        break;
      case 'confirm_no': pendingSuggestion = null; respond(t('skipped')); break;
      case 'recipe': await showRecipe(cmd.query, cmd.servings || 2); break;
      case 'substitute': await showSubstitutes(cmd.item); break;
      case 'summarize': await showSummary(); break;
      default: respond(t('notUnderstood'), 'error');
    }
  }
}

function doSearch(item, maxPrice, brand) {
  let results = CATALOG.slice();
  if (item)     results = results.filter(p => p.name.toLowerCase().includes(item) || p.category === resolveCategory(item));
  if (maxPrice) results = results.filter(p => p.price <= maxPrice);
  if (brand)    results = results.filter(p => p.brand.toLowerCase().includes(brand));

  setView('discover');
  const parts = [item || ''];
  if (maxPrice) parts.push(`< ₹${maxPrice}`);
  renderCatalog(results, `${results.length} · ${parts.join(' ')}`);
  respond(results.length ? t('found', results.length) : t('noResults'), results.length ? '' : 'error');
}

/* ============================================================
   AI FEATURES
   ============================================================ */
async function showRecipe(dish, servings) {
  if (!dish) { respond(t('notUnderstood'), 'error'); return; }
  toast(`✨ ${dish}…`, 'ai');
  try {
    const recipe = await aiGetRecipe(dish, servings);
    if (!recipe.ingredients.length) throw new Error('No ingredients');
    recipeDraft = recipe;

    el.recipeTitle.textContent = recipe.dish;
    el.recipeSub.textContent = `${recipe.ingredients.length} ingredients · serves ${recipe.servings}`;
    el.recipeItems.textContent = '';

    recipe.ingredients.forEach((ing, i) => {
      const cat = resolveCategory(ing.item);
      const row = node('label', 'recipe-row');
      catVars(row, cat);

      const box = document.createElement('input');
      box.type = 'checkbox'; box.checked = true; box.dataset.index = i;
      row.appendChild(box);
      const rTile = photoTile('recipe-photo', photoFor(ing.item, cat), ing.item);
      row.appendChild(rTile);
      row.appendChild(node('span', 'recipe-name', labelFor(ing.item)));
      row.appendChild(node('span', 'recipe-qty', ing.unit ? `${ing.quantity} ${ing.unit}` : `×${ing.quantity}`));
      el.recipeItems.appendChild(row);
    });

    el.modal.hidden = false;
    speak(`${recipe.ingredients.length} ingredients for ${recipe.dish}.`);
  } catch (err) {
    console.warn('[ai] recipe failed:', err.message);
    respond(aiAvailable() ? "Couldn't build that recipe." : 'Add a Groq API key to enable recipes.', 'error');
  }
}

function closeModal() { el.modal.hidden = true; recipeDraft = null; }

function addRecipeToList() {
  if (!recipeDraft) return;
  const picked = [];
  el.recipeItems.querySelectorAll('input[type="checkbox"]').forEach(box => {
    if (box.checked) picked.push(recipeDraft.ingredients[Number(box.dataset.index)]);
  });
  if (!picked.length) { closeModal(); return; }

  snapshot();
  picked.forEach(ing => addItem(ing.item, ing.quantity, ing.unit, { silent: true }));
  save(); render();
  const dish = recipeDraft.dish;
  closeModal();
  setView('list');
  respond(`${picked.length} ingredients · ${dish}`);
}

async function showSubstitutes(item) {
  if (!item) return;
  toast(`✨ ${item}…`, 'ai');
  try {
    const data = await aiGetSubstitutes(item);
    if (!data.options.length) throw new Error('none');

    setView('insights');
    el.suggestions.textContent = '';

    const head = node('div', 'suggestion is-heading');
    head.appendChild(node('span', 'suggestion-kind', `✨ Substitutes for ${labelFor(item)}`));
    el.suggestions.appendChild(head);

    /* the product type word of the thing being replaced — this is what
       makes "Lux" search as "Lux soap" instead of returning a lamp */
    const typeWord = pdBaseName(String(item)).split(/\s+/).pop().toLowerCase();

    data.options.forEach(opt => {
      const cat = resolveCategory(opt.name);
      const box = node('div', 'suggestion is-clickable');
      catVars(box, cat);
      box.tabIndex = 0;
      box.setAttribute('role', 'button');

      const open = () => openProduct({ name: opt.name, why: opt.why, category: cat, hint: typeWord });
      box.addEventListener('click', open);
      box.addEventListener('keydown', e => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); }
      });

      const top = node('div', 'suggestion-top');
      const sTile = photoTile('suggestion-photo', trustedPhoto(opt.name), opt.name);
      fillPhoto(sTile, opt.name, cat, typeWord);
      top.appendChild(sTile);
      const txt = node('div', 'suggestion-txt');
      txt.appendChild(node('span', 'suggestion-name', opt.name));
      txt.appendChild(node('p', 'suggestion-text', opt.why));
      top.appendChild(txt);
      box.appendChild(top);

      const actions = node('div', 'suggestion-actions');
      const add = node('button', 'btn btn-primary', 'Add this');
      add.type = 'button';
      add.addEventListener('click', (e) => {
        e.stopPropagation();
        snapshot();
        addItem(opt.name);
        setView('list');
      });
      const more = node('button', 'btn btn-ghost', 'View details');
      more.type = 'button';
      more.addEventListener('click', (e) => { e.stopPropagation(); open(); });
      actions.append(add, more);
      box.appendChild(actions);

      el.suggestions.appendChild(box);
    });
    speak(`Try ${data.options[0].name}.`);
  } catch (err) {
    respond(`No substitute found for ${item}.`, 'error');
  }
}

async function showSummary() {
  if (!state.items.length) { respond(t('empty'), 'error'); return; }
  el.summaryBtn.classList.add('is-busy');
  try {
    const data = await aiSummarizeList(state.items.map(i => i.name));
    el.aiSummaryTx.textContent = data.summary;
    el.aiInsightTx.textContent = data.insight;
    el.aiMissing.textContent = '';
    data.missing.forEach(m => {
      const chip = node('button', 'chip', `+ ${labelFor(m)}`);
      chip.type = 'button';
      chip.addEventListener('click', () => { snapshot(); addItem(m); });
      el.aiMissing.appendChild(chip);
    });
    el.aiSummary.hidden = false;
    setView('list');
    speak(data.summary);
  } catch (err) {
    respond(aiAvailable() ? "Couldn't summarise right now." : 'Add a Groq API key to enable AI summary.', 'error');
  } finally {
    el.summaryBtn.classList.remove('is-busy');
  }
}

/* ============================================================
   VOICE ENGINE
   ============================================================ */
const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
let recognition = null;
let isListening = false;

function setMicState(mode) {
  el.micBtn.classList.remove('is-listening', 'is-thinking');
  if (mode === 'listening') {
    el.micBtn.classList.add('is-listening');
    el.micBtn.setAttribute('aria-pressed', 'true');
    el.micStatus.textContent = t('listening');
  } else if (mode === 'thinking') {
    el.micBtn.classList.add('is-thinking');
    el.micStatus.textContent = t('thinking');
  } else {
    el.micBtn.setAttribute('aria-pressed', 'false');
    el.micStatus.textContent = SpeechRec ? ui('tapToSpeak') : ui('typeBelow');
  }
}

function showTranscript(text, interim = false) {
  el.transcript.textContent = text ? `“${text}”` : '';
  el.transcript.classList.toggle('is-visible', Boolean(text));
  el.transcript.classList.toggle('is-interim', interim);
}

function buildRecognition() {
  const rec = new SpeechRec();
  rec.continuous = false;
  rec.interimResults = true;
  rec.lang = LANGUAGES[state.lang].lang;

  rec.onresult = (event) => {
    let interim = '', final = '';
    for (let i = event.resultIndex; i < event.results.length; i++) {
      const chunk = event.results[i][0].transcript;
      if (event.results[i].isFinal) final += chunk; else interim += chunk;
    }
    if (interim) showTranscript(interim, true);
    if (final)   { showTranscript(final); handleInput(final); }
  };

  rec.onerror = (event) => {
    isListening = false; setMicState('idle');
    if (event.error === 'no-speech')        toast("Didn't catch that.", 'error');
    else if (event.error === 'not-allowed') toast('Microphone blocked.', 'error');
    else if (event.error !== 'aborted')     toast(`Voice error: ${event.error}`, 'error');
  };

  rec.onend = () => { isListening = false; if (!el.micBtn.classList.contains('is-thinking')) setMicState('idle'); };
  return rec;
}

function toggleMic() {
  if (!SpeechRec) { toast('Voice not supported — type instead.', 'error'); el.textInput.focus(); return; }
  if (isListening) { recognition && recognition.stop(); isListening = false; setMicState('idle'); return; }

  recognition = buildRecognition();
  isListening = true;
  setMicState('listening');
  try { recognition.start(); }
  catch (err) { isListening = false; setMicState('idle'); }
}

async function handleInput(text) {
  if (!text || !text.trim()) return;
  setMicState('thinking');
  try {
    const commands = await parseCommand(text);
    await runCommands(commands);
  } catch (err) {
    console.error('[app]', err);
    respond(t('notUnderstood'), 'error');
  } finally {
    setMicState('idle');
    setTimeout(() => showTranscript(''), 4000);
  }
}

/* ============================================================
   LANGUAGE
   ============================================================ */
function setLanguage(code) {
  if (!LANGUAGES[code]) return;
  state.lang = code;
  save();
  applyUILanguage();
  render();
  toast(`${LANGUAGES[code].label} ✓`);
}

function cycleLanguage() {
  const codes = Object.keys(LANGUAGES);
  const next = codes[(codes.indexOf(state.lang) + 1) % codes.length];
  setLanguage(next);
}

function updateLangControl() {
  if (el.langPill) {
    const txt = el.langPill.querySelector('.lang-pill-text') || el.langPill;
    txt.textContent = LANGUAGES[state.lang].label;
  }
  if (el.langSelect) el.langSelect.value = state.lang;
}

function applyUILanguage() {
  const navLabels = {
    list: ui('myList'),
    shop: shopText('shop') || 'Shop',
    discover: ui('discover'),
    insights: ui('insights')
  };
  document.querySelectorAll('.nav-item').forEach(btn => {
    const key = btn.dataset.view;
    const span = btn.querySelector('span:not(.nav-badge)');
    if (span && navLabels[key]) span.textContent = navLabels[key];
  });

  VIEW_META.list.title     = ui('myList');
  VIEW_META.shop.title     = shopText('title') || 'Shopping mode';
  VIEW_META.shop.sub       = shopText('sub') || '';
  VIEW_META.discover.title = ui('discover');
  VIEW_META.insights.title = ui('insights');
  el.viewTitle.textContent = VIEW_META[currentView].title;
  el.viewSub.textContent   = VIEW_META[currentView].sub || '';

  const sideLabel = document.querySelector('.sidebar-label');
  if (sideLabel) sideLabel.textContent = ui('trySaying');
  const themeLabel = document.querySelector('.theme-label');
  if (themeLabel) themeLabel.textContent = ui('theme');

  const sBtn = document.querySelector('#summary-btn .btn-text');
  const uBtn = document.querySelector('#undo-btn .btn-text');
  const cBtn = document.querySelector('#clear-btn .btn-text');
  if (sBtn) sBtn.textContent = ui('aiSummary');
  if (uBtn) uBtn.textContent = ui('undo');
  if (cBtn) cBtn.textContent = ui('clear');

  const statLabels = [ui('items'), ui('checkedOff'), ui('categories'), ui('estTotal')];
  document.querySelectorAll('.stat-label').forEach((n, i) => {
    if (statLabels[i]) n.textContent = statLabels[i];
  });

  const et = document.querySelector('.empty-title');
  const ex = document.querySelector('.empty-text');
  if (et) et.textContent = ui('emptyTitle');
  if (ex) ex.textContent = ui('emptyText');

  if (el.textInput)     el.textInput.placeholder = ui('commandPlaceholder');
  if (el.catalogSearch) el.catalogSearch.placeholder = ui('filterPlaceholder');
  if (el.recipeAdd)     el.recipeAdd.textContent = ui('addSelected');

  const heads = document.querySelectorAll('#view-insights .section-heading');
  if (heads[0]) heads[0].textContent = ui('smartSuggestions');
  if (heads[1]) heads[1].textContent = ui('yourUsuals');
  if (heads[2]) heads[2].textContent = ui('history');

  const hintList = document.querySelector('.hint-list');
  if (hintList) {
    hintList.textContent = '';
    (HINTS[state.lang] || HINTS.en).forEach(h => {
      const li = document.createElement('li');
      const btn = node('button', 'hint', h.show);
      btn.type = 'button';
      btn.addEventListener('click', () => { showTranscript(h.say); handleInput(h.say); });
      li.appendChild(btn);
      hintList.appendChild(li);
    });
  }

  updateLangControl();
  document.documentElement.lang = state.lang;
  setMicState('idle');
  renderFilters();
  renderCatalog();
  renderShop();
}

/* ============================================================
   INIT
   ============================================================ */
function init() {
  document.documentElement.setAttribute('data-theme', state.theme);

  if (el.langSelect) {
    Object.entries(LANGUAGES).forEach(([code, meta]) => {
      const opt = document.createElement('option');
      opt.value = code; opt.textContent = meta.label;
      el.langSelect.appendChild(opt);
    });
    el.langSelect.value = state.lang;
    el.langSelect.addEventListener('change', () => setLanguage(el.langSelect.value));
  }
  if (el.langPill) el.langPill.addEventListener('click', cycleLanguage);

  if (el.themeToggle) el.themeToggle.addEventListener('click', () => {
    state.theme = state.theme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', state.theme);
    save();
  });

  document.querySelectorAll('.nav-item').forEach(btn => {
    btn.addEventListener('click', () => setView(btn.dataset.view));
  });
  if (el.menuToggle) el.menuToggle.addEventListener('click', () => el.sidebar.classList.toggle('is-open'));

  el.micBtn.addEventListener('click', toggleMic);
  el.textForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const value = el.textInput.value;
    el.textInput.value = '';
    showTranscript(value);
    handleInput(value);
  });

  el.undoBtn.addEventListener('click', undo);
  el.clearBtn.addEventListener('click', clearList);
  el.summaryBtn.addEventListener('click', showSummary);
  if (el.summaryClose) el.summaryClose.addEventListener('click', () => { el.aiSummary.hidden = true; });

  el.catalogSearch.addEventListener('input', () => renderCatalog());
  el.recipeAdd.addEventListener('click', addRecipeToList);
  document.querySelectorAll('[data-close-modal]').forEach(b => b.addEventListener('click', closeModal));
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { closeModal(); el.sidebar.classList.remove('is-open'); }
    if (e.key === '/' && document.activeElement !== el.textInput) { e.preventDefault(); el.textInput.focus(); }
  });

  /* stat tiles double as filters / shortcuts */
  const tiles = document.querySelectorAll('#stats-row .stat');
  const tileActions = [
    () => { listFilter = listFilter === 'all'  ? 'todo' : 'all';  render(); },
    () => { listFilter = listFilter === 'done' ? 'all'  : 'done'; render(); },
    () => setView('discover'),
    () => setView('shop')
  ];
  tiles.forEach((tile, i) => {
    tile.tabIndex = 0;
    tile.setAttribute('role', 'button');
    tile.addEventListener('click', tileActions[i]);
    tile.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); tileActions[i](); }
    });
  });

  const shopBtn = $('shop-complete');
  if (shopBtn) shopBtn.addEventListener('click', completeTrip);

  renderFilters();
  renderCatalog();
  render();
  setView('list');
  applyUILanguage();
}

init();