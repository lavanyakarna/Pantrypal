/* ============================================================
   parser.js — AI layer + multilingual intent parsing
   ------------------------------------------------------------
   Every LLM call goes through callLLM(). When the key moves to a
   serverless proxy, only that one function changes.
   ============================================================ */

const LOCAL_KEY = '';   // <-- paste your key here for local testing only // <-- PUT YOUR KEY BACK HERE
const GROQ_URL   = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODEL = 'openai/gpt-oss-120b';
const PROXY_URL  = '/api/parse';
const IS_LOCAL   = location.protocol === 'file:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1';
const USE_PROXY  = !IS_LOCAL;

const TIMEOUT_FAST = 4000;
const TIMEOUT_SLOW = 20000;

/* ---------- cache so repeats never hit the network ---------- */
const AI_CACHE_KEY = 'pantry.aiCache';
let aiCache = {};
try { aiCache = JSON.parse(localStorage.getItem(AI_CACHE_KEY) || '{}'); } catch { aiCache = {}; }

function cacheGet(key) { return aiCache[key]; }
function cacheSet(key, value) {
  aiCache[key] = value;
  const keys = Object.keys(aiCache);
  if (keys.length > 60) delete aiCache[keys[0]];
  try { localStorage.setItem(AI_CACHE_KEY, JSON.stringify(aiCache)); } catch {}
}

/* ============================================================
   THE SINGLE AI ENTRY POINT
   ============================================================ */
async function callLLM(systemPrompt, userText, { timeout = TIMEOUT_FAST, maxTokens = 400, json = true } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);

  try {
    const body = {
      model: GROQ_MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user',   content: userText }
      ],
      temperature: 0,
      max_tokens: maxTokens,
      reasoning_effort: 'low'
    };
    if (json) body.response_format = { type: 'json_object' };

    const res = await fetch(USE_PROXY ? PROXY_URL : GROQ_URL, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...(USE_PROXY ? {} : { 'Authorization': 'Bearer ' + LOCAL_KEY })
      },
      body: JSON.stringify(body)
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      throw new Error(`Groq ${res.status}: ${detail.slice(0, 200)}`);
    }

    const data = await res.json();
    const choice = data.choices && data.choices[0];
    if (choice && choice.finish_reason === 'length') {
      console.warn('[ai] response truncated — raise maxTokens');
    }
    const content = choice && choice.message && choice.message.content;
    if (!content) throw new Error('Empty response');
    return content.trim();
  } finally {
    clearTimeout(timer);
  }
}

function extractJSON(raw) {
  const cleaned = raw.replace(/```json|```/g, '').trim();
  const start = cleaned.search(/[{[]/);
  if (start === -1) throw new Error('No JSON found');
  const end = Math.max(cleaned.lastIndexOf('}'), cleaned.lastIndexOf(']'));
  return JSON.parse(cleaned.slice(start, end + 1));
}

function aiAvailable() {
  return USE_PROXY ? true : (Boolean(LOCAL_KEY) && !LOCAL_KEY.startsWith('YOUR_'));
}

/* ============================================================
   TEXT NORMALIZATION
   ============================================================ */
function normalizeItem(raw) {
  if (!raw) return '';
  let s = String(raw).toLowerCase().trim()
    .replace(/[.,!?;:"']/g, '')
    .replace(/\s+/g, ' ')
    .replace(/^(some|a|an|the|few|couple of)\s+/, '')
    .trim();

  if (PLURAL_FIXES[s]) return PLURAL_FIXES[s];

  const words = s.split(' ');
  const last = words[words.length - 1];
  if (PLURAL_FIXES[last]) {
    words[words.length - 1] = PLURAL_FIXES[last];
  } else if (last.length > 3 && last.endsWith('es') && /(sh|ch|x|s|z)es$/.test(last)) {
    words[words.length - 1] = last.slice(0, -2);
  } else if (last.length > 3 && last.endsWith('s') && !last.endsWith('ss')) {
    words[words.length - 1] = last.slice(0, -1);
  }
  return words.join(' ');
}

function normalizeUnit(raw) {
  if (!raw) return null;
  return UNIT_ALIASES[String(raw).toLowerCase().trim()] || null;
}

const SORTED_KEYWORDS = Object.keys(KEYWORDS).sort((a, b) => b.length - a.length);

function resolveCategory(itemName) {
  const name = normalizeItem(itemName);
  if (!name) return DEFAULT_CATEGORY;
  if (KEYWORDS[name]) return KEYWORDS[name];
  for (const key of SORTED_KEYWORDS) {
    const re = new RegExp(`\\b${key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`);
    if (re.test(name)) return KEYWORDS[key];
  }
  return DEFAULT_CATEGORY;
}

const NUMBER_WORDS = {
  one: 1, two: 2, three: 3, four: 4, five: 5, six: 6,
  seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12,
  half: 0.5, dozen: 12, couple: 2
};

/* ============================================================
   INTENT PARSING — multilingual prompt
   ============================================================ */
const SYSTEM_PROMPT = `You are an intent parser for a multilingual voice grocery app.
Users speak or type in English, Hindi (Devanagari), Hinglish (Hindi in Latin script), Spanish or French.
Return ONLY a JSON object. No markdown, no commentary.

Schema:
{"commands":[{"intent":INTENT,"item":string|null,"display":string|null,"quantity":number|null,"unit":string|null,"max_price":number|null,"brand":string|null,"query":string|null,"servings":number|null}]}

INTENT is one of:
"add" | "remove" | "search" | "check_off" | "clear_list" |
"confirm_yes" | "confirm_no" | "add_favorites" |
"recipe" | "substitute" | "summarize" | "unknown"

CRITICAL LANGUAGE RULE:
- "item" must ALWAYS be the simple ENGLISH grocery name, lowercase ("milk", "onion", "rice").
- "display" is the item written in the SAME language the user used ("दूध", "leche"). Use null if the user wrote English.

Rules:
- Split multi-item sentences into one command object per item.
- Hindi/Hinglish verbs: जोड़ो/डालो/चाहिए/लाओ/"add karo" -> add. हटाओ/निकालो/"hatao" -> remove. ढूंढो/दिखाओ/"dikhao" -> search.
- हाँ/"haan"/"theek hai" -> confirm_yes. नहीं/"nahi"/"mat" -> confirm_no.
- "सब हटाओ"/"clear karo" -> clear_list
- Item + "under/below/से कम <number>" -> search
- "ingredients for X"/"X बनानी है"/"recipe for X" -> recipe, dish name in "query" (English), servings if stated.
- "instead of X"/"X की जगह क्या" -> substitute
- "what's on my list"/"मेरी सूची में क्या है" -> summarize
- Anything else -> intent unknown

Examples:
"add milk, bread and 2 eggs" -> {"commands":[{"intent":"add","item":"milk","display":null,"quantity":null,"unit":null,"max_price":null,"brand":null,"query":null,"servings":null},{"intent":"add","item":"bread","display":null,"quantity":null,"unit":null,"max_price":null,"brand":null,"query":null,"servings":null},{"intent":"add","item":"egg","display":null,"quantity":2,"unit":null,"max_price":null,"brand":null,"query":null,"servings":null}]}
"दूध और दो अंडे जोड़ो" -> {"commands":[{"intent":"add","item":"milk","display":"दूध","quantity":null,"unit":null,"max_price":null,"brand":null,"query":null,"servings":null},{"intent":"add","item":"egg","display":"अंडे","quantity":2,"unit":null,"max_price":null,"brand":null,"query":null,"servings":null}]}
"doodh aur chawal add karo" -> {"commands":[{"intent":"add","item":"milk","display":"doodh","quantity":null,"unit":null,"max_price":null,"brand":null,"query":null,"servings":null},{"intent":"add","item":"rice","display":"chawal","quantity":null,"unit":null,"max_price":null,"brand":null,"query":null,"servings":null}]}
"मुझे चार लोगों के लिए बिरयानी बनानी है" -> {"commands":[{"intent":"recipe","item":null,"display":null,"quantity":null,"unit":null,"max_price":null,"brand":null,"query":"chicken biryani","servings":4}]}
"सौ रुपये से कम में साबुन दिखाओ" -> {"commands":[{"intent":"search","item":"soap","display":"साबुन","quantity":null,"unit":null,"max_price":100,"brand":null,"query":null,"servings":null}]}
"प्याज हटाओ" -> {"commands":[{"intent":"remove","item":"onion","display":"प्याज","quantity":null,"unit":null,"max_price":null,"brand":null,"query":null,"servings":null}]}`;

function emptyCmd(intent) {
  return {
    intent, item: null, display: null, quantity: null, unit: null,
    max_price: null, brand: null, query: null, servings: null
  };
}

function cleanCommand(c) {
  return {
    intent:    c.intent || 'unknown',
    item:      c.item ? normalizeItem(c.item) : null,
    display:   c.display ? String(c.display).trim() : null,
    quantity:  typeof c.quantity === 'number' ? c.quantity : null,
    unit:      normalizeUnit(c.unit),
    max_price: typeof c.max_price === 'number' ? c.max_price : null,
    brand:     c.brand ? String(c.brand).toLowerCase() : null,
    query:     c.query ? String(c.query).trim() : null,
    servings:  typeof c.servings === 'number' ? c.servings : null
  };
}

async function parseWithGroq(text) {
  const raw = await callLLM(SYSTEM_PROMPT, text, { timeout: TIMEOUT_FAST, maxTokens: 700 });
  const parsed = extractJSON(raw);
  if (!parsed.commands || !Array.isArray(parsed.commands)) throw new Error('Bad shape');
  return parsed.commands.map(cleanCommand);
}

/* ============================================================
   HINDI / HINGLISH OFFLINE PARSER — works with zero network
   ============================================================ */
const HINDI_ITEM_KEYS = Object.keys(HINDI_ITEMS).sort((a, b) => b.length - a.length);

function hasHindi(text) {
  if (/[\u0900-\u097F]/.test(text)) return true;
  const t = ' ' + text.toLowerCase() + ' ';
  const latinItems = HINDI_ITEM_KEYS.filter(k => !/[\u0900-\u097F]/.test(k));
  const latinVerbs = Object.values(HINDI_VERBS).flat().filter(v => !/[\u0900-\u097F]/.test(v));
  return latinItems.some(k => t.includes(' ' + k)) || latinVerbs.some(v => t.includes(' ' + v));
}

const HINDI_NUM = {
  'एक':1,'दो':2,'तीन':3,'चार':4,'पाँच':5,'पांच':5,'छह':6,'सात':7,'आठ':8,'नौ':9,'दस':10,
  'ek':1,'do':2,'teen':3,'char':4,'paanch':5,'chhe':6,'saat':7,'aath':8,'nau':9,'das':10
};

function parseHindi(raw) {
  const text = normalizeDigits(String(raw).toLowerCase().trim());
  const hit = (list) => list.some(v => text.includes(v));

  if (hit(HINDI_VERBS.yes) && text.split(/\s+/).length <= 3) return [emptyCmd('confirm_yes')];
  if (hit(HINDI_VERBS.no)  && text.split(/\s+/).length <= 3) return [emptyCmd('confirm_no')];
  if (hit(HINDI_VERBS.clear)) return [emptyCmd('clear_list')];

  let intent = 'add';
  if (hit(HINDI_VERBS.remove)) intent = 'remove';
  else if (hit(HINDI_VERBS.search)) intent = 'search';

  let maxPrice = null;
  const price = text.match(/(\d+)\s*(?:रुपये|रुपए|rupaye|rs\.?|₹)?\s*(?:से कम|se kam|under|below)/) ||
                text.match(/(?:under|below|से कम|se kam)\s*(?:रुपये|rs\.?|₹)?\s*(\d+)/);
  if (price) { maxPrice = parseInt(price[1], 10); if (intent === 'add') intent = 'search'; }

  const found = [];
  HINDI_ITEM_KEYS.forEach(key => {
    const at = text.indexOf(key);
    if (at !== -1 && !found.some(f => f.key.includes(key) || key.includes(f.key))) {
      found.push({ key, item: HINDI_ITEMS[key], index: at });
    }
  });
  if (!found.length) return [emptyCmd('unknown')];
  found.sort((a, b) => a.index - b.index);

  if (intent === 'search') {
    const cmd = emptyCmd('search');
    cmd.item = found[0].item;
    cmd.display = found[0].key;
    cmd.max_price = maxPrice;
    return [cmd];
  }

  return found.map(f => {
    const cmd = emptyCmd(intent);
    cmd.item = f.item;
    cmd.display = f.key;
    const before = text.slice(Math.max(0, f.index - 14), f.index).trim();
    const digit = before.match(/(\d+)\s*$/);
    if (digit) cmd.quantity = parseInt(digit[1], 10);
    else {
      const word = Object.keys(HINDI_NUM).find(w => before.endsWith(w));
      if (word) cmd.quantity = HINDI_NUM[word];
    }
    return cmd;
  });
}

/* ============================================================
   ENGLISH REGEX FALLBACK
   ============================================================ */
function parseWithRegex(text) {
  if (hasHindi(text)) return parseHindi(text);

  const t = text.toLowerCase().trim().replace(/[.!?]+$/, '');

  if (/^(yes|yeah|yep|sure|ok|okay|add it|do it)$/.test(t)) return [emptyCmd('confirm_yes')];
  if (/^(no|nope|nah|cancel|don'?t|skip)$/.test(t))          return [emptyCmd('confirm_no')];
  if (/^(add )?(my |all )?(favorites|favourites|usuals)$/.test(t)) return [emptyCmd('add_favorites')];
  if (/clear|empty|reset|start over/.test(t)) return [emptyCmd('clear_list')];
  if (/^(what'?s on my list|summar(y|ize)|read my list|how much)/.test(t)) return [emptyCmd('summarize')];

  const recipeMatch = t.match(/(?:ingredients for|recipe for|i want to (?:cook|make)|let'?s (?:cook|make)|how do i make)\s+(.+)/);
  if (recipeMatch) {
    const cmd = emptyCmd('recipe');
    let q = recipeMatch[1];
    const serv = q.match(/for\s+(\d+)\s*(?:people|persons|servings)?/);
    if (serv) { cmd.servings = parseInt(serv[1], 10); q = q.replace(serv[0], '').trim(); }
    cmd.query = q;
    return [cmd];
  }

  const subMatch = t.match(/(?:instead of|substitute for|alternative to|replace)\s+(.+)/);
  if (subMatch) {
    const cmd = emptyCmd('substitute');
    cmd.item = normalizeItem(subMatch[1]);
    return [cmd];
  }

  const checkMatch = t.match(/^(?:got|bought|check off|tick off|mark)\s+(?:the\s+)?(.+?)(?:\s+as\s+done)?$/);
  if (checkMatch) {
    const cmd = emptyCmd('check_off');
    cmd.item = normalizeItem(checkMatch[1]);
    return [cmd];
  }

  const addRe    = /^(add|i need|i want to buy|i want|buy|get|put|grab|pick up)\s+/;
  const removeRe = /^(remove|delete|take off|drop|i don'?t need)\s+/;
  const searchRe = /^(find|search for|look for|show me|search)\s+/;

  let intent = 'unknown';
  let rest = t;
  if (addRe.test(t))         { intent = 'add';    rest = t.replace(addRe, ''); }
  else if (removeRe.test(t)) { intent = 'remove'; rest = t.replace(removeRe, ''); }
  else if (searchRe.test(t)) { intent = 'search'; rest = t.replace(searchRe, ''); }
  else if (/(under|below|less than|cheaper than)\s*(rs\.?|₹|rupees)?\s*\d/.test(t)) { intent = 'search'; rest = t; }
  else return [emptyCmd('unknown')];

  rest = rest.replace(/\b(from|to)\s+(my|the)\s+list\b/g, '').trim();

  if (intent === 'search') {
    const cmd = emptyCmd('search');
    const priceMatch = rest.match(/(?:under|below|less than|cheaper than)\s*(?:rs\.?|₹|rupees)?\s*(\d+)/);
    if (priceMatch) {
      cmd.max_price = parseInt(priceMatch[1], 10);
      rest = rest.replace(priceMatch[0], '').trim();
    }
    rest = rest.replace(/\b(rupees|rs\.?|₹)\b/g, '').trim();
    cmd.item = normalizeItem(rest) || null;
    return [cmd];
  }

  const chunks = rest.split(/,|\band\b/).map(c => c.trim()).filter(Boolean);
  return chunks.map(chunk => {
    const cmd = emptyCmd(intent);
    let work = chunk;

    const numWord = work.match(new RegExp(`^(${Object.keys(NUMBER_WORDS).join('|')})\\b`));
    if (numWord) {
      cmd.quantity = NUMBER_WORDS[numWord[1]];
      work = work.replace(numWord[0], '').trim();
    }

    const qty = work.match(/^(\d+(?:\.\d+)?)\s*([a-z]+)?/);
    if (qty) {
      cmd.quantity = parseFloat(qty[1]);
      const maybeUnit = normalizeUnit(qty[2]);
      if (maybeUnit) { cmd.unit = maybeUnit; work = work.replace(qty[0], '').trim(); }
      else { work = work.replace(qty[1], '').trim(); }
    } else {
      const unitOnly = work.match(/^([a-z]+)\s+of\s+/);
      if (unitOnly && normalizeUnit(unitOnly[1])) {
        cmd.unit = normalizeUnit(unitOnly[1]);
        work = work.replace(unitOnly[0], '').trim();
      }
    }

    work = work.replace(/^of\s+/, '').trim();
    cmd.item = normalizeItem(work) || null;
    return cmd;
  }).filter(c => c.item);
}

/* Public entry point. Always resolves — never throws at the caller. */
async function parseCommand(text) {
  const key = 'parse:' + text.toLowerCase().trim();
  const cached = cacheGet(key);
  if (cached) return cached.map(c => ({ ...c, source: 'cache' }));

  if (aiAvailable()) {
    try {
      const commands = await parseWithGroq(text);
      if (commands.length) {
        cacheSet(key, commands);
        return commands.map(c => ({ ...c, source: 'ai' }));
      }
    } catch (err) {
      console.warn('[parser] AI unavailable, using regex:', err.name === 'AbortError' ? 'timeout' : err.message);
    }
  }
  return parseWithRegex(text).map(c => ({ ...c, source: 'regex' }));
}

/* ============================================================
   AI FEATURE 1 — Recipe to ingredient list
   ============================================================ */
const RECIPE_PROMPT = `You convert a dish name into a grocery shopping list.
Return ONLY JSON, no commentary:
{"dish":string,"servings":number,"ingredients":[{"item":string,"quantity":number,"unit":string|null}]}

Rules:
- "item" must be a simple ENGLISH grocery name, lowercase, no brand ("chicken", not "500g chicken breast").
- Scale quantities to the requested servings.
- Use units from: kg, g, L, ml, pack, dozen, pc, bunch, tin, can. Use null if not applicable.
- Skip water, salt and pepper unless central to the dish.
- Maximum 12 ingredients.`;

async function aiGetRecipe(dish, servings = 2) {
  const key = `recipe:${dish.toLowerCase()}:${servings}`;
  const cached = cacheGet(key);
  if (cached) return cached;
  if (!aiAvailable()) throw new Error('AI unavailable');

  const raw = await callLLM(RECIPE_PROMPT, `${dish} for ${servings} people`, {
    timeout: TIMEOUT_SLOW, maxTokens: 1200
  });
  const data = extractJSON(raw);
  const result = {
    dish: data.dish || dish,
    servings: data.servings || servings,
    ingredients: (data.ingredients || []).map(i => ({
      item: normalizeItem(i.item),
      quantity: typeof i.quantity === 'number' ? i.quantity : 1,
      unit: normalizeUnit(i.unit)
    })).filter(i => i.item)
  };
  cacheSet(key, result);
  return result;
}

/* ============================================================
   AI FEATURE 2 — Substitution reasoning
   ============================================================ */
const SUBSTITUTE_PROMPT = `You suggest grocery substitutes.
Return ONLY JSON: {"item":string,"options":[{"name":string,"why":string}]}
Give 2 or 3 options. "name" must be a simple English grocery name.
"why" must be under 12 words and practical. Indian kitchen context.`;

async function aiGetSubstitutes(item) {
  const key = `sub:${item.toLowerCase()}`;
  const cached = cacheGet(key);
  if (cached) return cached;

  if (!aiAvailable()) {
    const fallback = SUBSTITUTES[normalizeItem(item)];
    if (!fallback) throw new Error('No substitute known');
    return { item, options: [{ name: fallback, why: 'Common substitute' }] };
  }

  const raw = await callLLM(SUBSTITUTE_PROMPT, item, { timeout: TIMEOUT_FAST, maxTokens: 500 });
  const data = extractJSON(raw);
  const result = { item: data.item || item, options: (data.options || []).slice(0, 3) };
  cacheSet(key, result);
  return result;
}

/* ============================================================
   AI FEATURE 3 — Categorize items the keyword map misses
   ============================================================ */
const CATEGORIZE_PROMPT = `Assign each grocery item to exactly one category id.
Valid ids: produce, dairy, bakery, meat, pantry, frozen, snacks, beverages, personal, household, other.
Return ONLY JSON: {"results":[{"item":string,"category":string}]}`;

async function aiCategorize(items) {
  if (!items.length || !aiAvailable()) return {};
  const key = 'cat:' + items.slice().sort().join(',');
  const cached = cacheGet(key);
  if (cached) return cached;

  try {
    const raw = await callLLM(CATEGORIZE_PROMPT, items.join(', '), { timeout: TIMEOUT_FAST, maxTokens: 500 });
    const data = extractJSON(raw);
    const map = {};
    (data.results || []).forEach(r => {
      if (r.item && CATEGORIES[r.category]) map[normalizeItem(r.item)] = r.category;
    });
    cacheSet(key, map);
    return map;
  } catch (err) {
    console.warn('[ai] categorize failed:', err.message);
    return {};
  }
}

/* ============================================================
   AI FEATURE 4 — Conversational list summary
   ============================================================ */
const SUMMARY_PROMPT = `You are a friendly grocery assistant reviewing a shopping list.
Return ONLY JSON: {"summary":string,"insight":string,"missing":[string]}
- "summary": one sentence, max 18 words, describing the list.
- "insight": one useful observation (meal potential, nutrition gap, or budget note), max 18 words.
- "missing": 0-3 grocery items that would sensibly complete the list.
Indian household context. Be specific, never generic.`;

async function aiSummarizeList(items) {
  if (!items.length) throw new Error('Empty list');
  if (!aiAvailable()) throw new Error('AI unavailable');
  const raw = await callLLM(SUMMARY_PROMPT, items.join(', '), { timeout: TIMEOUT_FAST, maxTokens: 500 });
  const data = extractJSON(raw);
  return {
    summary: data.summary || '',
    insight: data.insight || '',
    missing: Array.isArray(data.missing) ? data.missing.slice(0, 3).map(normalizeItem) : []
  };
}
