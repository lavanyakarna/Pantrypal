let shoppingList = JSON.parse(localStorage.getItem('shoppingList') || '[]');
let purchaseFrequency = JSON.parse(localStorage.getItem('purchaseFrequency') || '{}');
let lastAction = null;
let pendingSuggestion = null;

const micButton = document.getElementById('mic-button');
const micStatus = document.getElementById('mic-status');
const languageSelect = document.getElementById('language-select');
const transcriptDisplay = document.getElementById('transcript-display');
const errorBanner = document.getElementById('error-banner');
const undoButton = document.getElementById('undo-button');

if (!(window.SpeechRecognition || window.webkitSpeechRecognition)) {
  showError("Voice recognition isn't supported in this browser. Try Chrome or Edge.");
  micButton.disabled = true;
}

function createRecognition() {
  const rec = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
  rec.continuous = false;
  rec.interimResults = false;

  rec.onresult = async (event) => {
    const text = event.results[0][0].transcript;
    transcriptDisplay.textContent = `"${text}"`;
    micStatus.textContent = 'Processing...';
    micButton.classList.remove('listening');
    micButton.classList.add('processing');

    const commands = await parseCommand(text);
    commands.forEach(handleCommand);

    micStatus.textContent = 'Idle';
    micButton.classList.remove('processing');
  };

  rec.onerror = (event) => {
    micStatus.textContent = 'Idle';
    micButton.classList.remove('listening');
    if (event.error === 'no-speech') showError("Didn't catch that — try again.");
    else if (event.error === 'not-allowed') showError('Microphone permission denied. Enable it in browser settings.');
    else showError(`Voice error: ${event.error}`);
  };

  rec.onend = () => micButton.classList.remove('listening');

  return rec;
}

micButton.addEventListener('click', () => {
  const recognition = createRecognition();
  recognition.lang = languageSelect.value || 'en-US';
  micStatus.textContent = 'Listening...';
  micButton.classList.add('listening');
  hideError();
  try { recognition.start(); } catch (e) { console.error(e); }
});

undoButton.addEventListener('click', undoLast);

function showError(msg) { errorBanner.textContent = msg; errorBanner.style.display = 'block'; }
function hideError() { errorBanner.style.display = 'none'; }

function speak(text) {
  if (!window.speechSynthesis) return;
  window.speechSynthesis.speak(new SpeechSynthesisUtterance(text));
}

function handleCommand(cmd) {
  const { intent, item, quantity, unit, max_price, brand } = cmd;

  if (intent === 'confirm_yes' && pendingSuggestion) {
    addItem(pendingSuggestion.item, 1, null);
    pendingSuggestion = null;
    return;
  }
  if (intent === 'confirm_no' && pendingSuggestion) {
    speak('Okay, skipped.');
    pendingSuggestion = null;
    return;
  }
  if (intent === 'add_favorites') { addFavorites(); return; }
  if (!item && intent !== 'unknown') { showError("Couldn't figure out the item — try rephrasing."); return; }

  if (intent === 'add') addItem(item, quantity, unit);
  else if (intent === 'remove') removeItem(item);
  else if (intent === 'search') searchProducts(item, max_price, brand);
  else { showError('Didn\'t understand that. Try "add milk" or "remove bread".'); speak("Sorry, I didn't get that."); }
}

function categoryFor(item) {
  const key = Object.keys(CATEGORY_MAP).find(k => item.includes(k));
  return key ? CATEGORY_MAP[key] : 'Other';
}

function addItem(item, quantity, unit) {
  const existing = shoppingList.find(i => i.name === item);
  if (existing) existing.quantity = (existing.quantity || 1) + (quantity || 1);
  else shoppingList.push({ name: item, quantity: quantity || 1, unit: unit || null, category: categoryFor(item) });
  purchaseFrequency[item] = (purchaseFrequency[item] || 0) + 1;
  lastAction = { type: 'add', item };
  saveState(); renderList(); renderSuggestions(); renderFavorites();
  speak(`Added ${item}.`);
}

function removeItem(item) {
  const wasThere = shoppingList.find(i => i.name === item);
  shoppingList = shoppingList.filter(i => i.name !== item);
  lastAction = wasThere ? { type: 'remove', item: wasThere } : null;
  saveState(); renderList(); renderSuggestions();
  speak(`Removed ${item}.`);
}

function undoLast() {
  if (!lastAction) return;
  if (lastAction.type === 'add') shoppingList = shoppingList.filter(i => i.name !== lastAction.item);
  else if (lastAction.type === 'remove') shoppingList.push(lastAction.item);
  lastAction = null;
  saveState(); renderList(); renderSuggestions();
  speak('Undone.');
}

function addFavorites() {
  topFavorites().forEach(f => addItem(f, 1, null));
}

function topFavorites(n = 5) {
  return Object.entries(purchaseFrequency).sort((a, b) => b[1] - a[1]).slice(0, n).map(([name]) => name);
}

function saveState() {
  localStorage.setItem('shoppingList', JSON.stringify(shoppingList));
  localStorage.setItem('purchaseFrequency', JSON.stringify(purchaseFrequency));
}

function renderList() {
  const container = document.getElementById('shopping-list');
  container.innerHTML = '';
  const grouped = {};
  shoppingList.forEach(i => { (grouped[i.category] ??= []).push(i); });
  Object.keys(grouped).forEach(category => {
    const group = document.createElement('div');
    group.className = 'category-group';
    group.innerHTML = `<div class="category-title">${category}</div>`;
    grouped[category].forEach(i => {
      const row = document.createElement('div');
      row.className = 'list-item';
      row.innerHTML = `<span class="item-name">${i.name}</span><span class="item-qty">${i.quantity}${i.unit ? ' ' + i.unit : ''}</span><button class="remove-btn" onclick="removeItem('${i.name}')">✕</button>`;
      group.appendChild(row);
    });
    container.appendChild(group);
  });
}

function renderSuggestions() {
  const container = document.getElementById('suggestions-panel');
  container.innerHTML = '';
  pendingSuggestion = null;

  shoppingList.forEach(i => {
    if (SUBSTITUTES[i.name]) addChip(container, `Prefer a substitute for ${i.name}? Try ${SUBSTITUTES[i.name]}.`);
  });
  SEASONAL_BY_MONTH[new Date().getMonth()].forEach(s => addChip(container, `In season now: ${s}`));

  Object.keys(purchaseFrequency).forEach(item => {
    if (purchaseFrequency[item] >= 2 && !shoppingList.find(i => i.name === item)) {
      addChip(container, `Running low on ${item}? Say "yes" to add it.`);
      if (!pendingSuggestion) pendingSuggestion = { type: 'lowStock', item };
    }
  });
}

function addChip(container, text) {
  const chip = document.createElement('div');
  chip.className = 'suggestion-chip';
  chip.textContent = text;
  container.appendChild(chip);
}

function renderFavorites() {
  const container = document.getElementById('favorites-panel');
  container.innerHTML = '';
  topFavorites(5).forEach(name => {
    const chip = document.createElement('div');
    chip.className = 'favorite-chip';
    chip.textContent = name;
    chip.onclick = () => addItem(name, 1, null);
    container.appendChild(chip);
  });
}

function searchProducts(item, maxPrice, brand) {
  let results = MOCK_CATALOG.filter(p => p.name.toLowerCase().includes(item));
  if (maxPrice) results = results.filter(p => p.price <= maxPrice);
  if (brand) results = results.filter(p => p.brand.toLowerCase().includes(brand));
  const container = document.getElementById('search-results');
  container.innerHTML = '';
  if (results.length === 0) {
    container.innerHTML = '<div class="no-results">No matching products found.</div>';
    speak('No matching products found.');
    container.scrollIntoView({ behavior: 'smooth', block: 'start' });
    return;
  }
  results.forEach(p => {
    const card = document.createElement('div');
    card.className = 'product-card';
    card.innerHTML = `<div class="product-name">${p.name}</div><div class="product-brand">${p.brand}</div><div class="product-price">₹${p.price.toFixed(2)}</div>`;
    container.appendChild(card);
  });
  speak(`Found ${results.length} matching products.`);
  container.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

renderList(); renderSuggestions(); renderFavorites();