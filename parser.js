const GROQ_API_KEY = 'YOUR_GROQ_API_KEY_HERE'; // paste your key here in VS Code only, never in chat
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';

const SYSTEM_PROMPT = `You are an intent parser for a voice shopping list app.
Given a spoken sentence, return ONLY a JSON object, no markdown fences, no other text.
The sentence may contain MULTIPLE commands (e.g. "add milk, bread and eggs").

Schema:
{"commands":[{"intent":"add"|"remove"|"search"|"confirm_yes"|"confirm_no"|"add_favorites"|"unknown","item":string|null,"quantity":number|null,"unit":string|null,"max_price":number|null,"brand":string|null}]}

Rules:
- Split multi-item sentences into separate command objects, all same intent.
- "yes"/"yeah"/"sure"/"add it"/"okay" alone -> confirm_yes, item null
- "no"/"nope"/"don't"/"cancel" alone -> confirm_no, item null
- "add my favorites" / "add favorites" -> add_favorites, item null
- A phrase with an item and "under/below [number]" but NO leading verb (e.g. "rice under 50") is still a search intent, not unknown.
- No match -> one command, intent unknown

Examples:
"add milk, bread and 2 eggs" -> {"commands":[{"intent":"add","item":"milk","quantity":null,"unit":null,"max_price":null,"brand":null},{"intent":"add","item":"bread","quantity":null,"unit":null,"max_price":null,"brand":null},{"intent":"add","item":"eggs","quantity":2,"unit":null,"max_price":null,"brand":null}]}
"remove bread" -> {"commands":[{"intent":"remove","item":"bread","quantity":null,"unit":null,"max_price":null,"brand":null}]}
"find toothpaste under 300 rupees" -> {"commands":[{"intent":"search","item":"toothpaste","quantity":null,"unit":null,"max_price":300,"brand":null}]}
"rice under 50" -> {"commands":[{"intent":"search","item":"rice","quantity":null,"unit":null,"max_price":50,"brand":null}]}
"yes" -> {"commands":[{"intent":"confirm_yes","item":null,"quantity":null,"unit":null,"max_price":null,"brand":null}]}`;

async function parseWithGroq(text) {
  const response = await fetch(GROQ_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${GROQ_API_KEY}` },
    body: JSON.stringify({
      model: 'openai/gpt-oss-120b',
      messages: [{ role: 'system', content: SYSTEM_PROMPT }, { role: 'user', content: text }],
      temperature: 0,
      max_tokens: 300
    })
  });
  if (!response.ok) throw new Error(`Groq API error: ${response.status}`);
  const data = await response.json();
  const cleaned = data.choices[0].message.content.trim().replace(/```json|```/g, '').trim();
  return JSON.parse(cleaned).commands;
}

function emptyCmd(intent) {
  return { intent, item: null, quantity: null, unit: null, max_price: null, brand: null };
}

function parseWithRegex(text) {
  const t = text.toLowerCase().trim();
  if (/^(yes|yeah|sure|yep|add it|okay|ok)$/.test(t)) return [emptyCmd('confirm_yes')];
  if (/^(no|nope|don'?t|cancel)$/.test(t)) return [emptyCmd('confirm_no')];
  if (/^(add (my )?favorites|add all favorites)$/.test(t)) return [emptyCmd('add_favorites')];

  const addPatterns = /^(add|i need|i want to buy|i want|buy|get|put)\s+/;
  const removePatterns = /^(remove|delete|take off|i don'?t need)\s+/;
  const searchPatterns = /^(find|search for|look for|show me)\s+/;

  let intent = 'unknown';
  let rest = t;
  if (addPatterns.test(t)) { intent = 'add'; rest = t.replace(addPatterns, ''); }
  else if (removePatterns.test(t)) { intent = 'remove'; rest = t.replace(removePatterns, ''); }
  else if (searchPatterns.test(t)) { intent = 'search'; rest = t.replace(searchPatterns, ''); }
  else if (/under\s*\d|below\s*\d/.test(t)) { intent = 'search'; rest = t; }
  else return [emptyCmd('unknown')];

  rest = rest.replace(/(from my list|to my list|to the list)/g, '').trim();

  if (intent === 'search') {
    let max_price = null;
    const priceMatch = rest.match(/under\s*(?:rs\.?|₹|rupees)?\s*(\d+)|below\s*(?:rs\.?|₹|rupees)?\s*(\d+)/i);
    if (priceMatch) { max_price = parseInt(priceMatch[1] || priceMatch[2], 10); rest = rest.replace(priceMatch[0], '').trim(); }
    return [{ intent, item: rest || null, quantity: null, unit: null, max_price, brand: null }];
  }

  const chunks = rest.split(/,| and /).map(c => c.trim()).filter(Boolean);
  return chunks.map(chunk => {
    let quantity = null, unit = null;
    const qtyMatch = chunk.match(/(\d+)\s*(kg|kgs|liters?|l|bottles?|dozen|pieces?|packs?)?/);
    if (qtyMatch) {
      quantity = parseInt(qtyMatch[1], 10);
      unit = qtyMatch[2] || null;
      chunk = chunk.replace(qtyMatch[0], '').replace(/^(of)\s+/, '').trim();
    }
    return { intent, item: chunk || null, quantity, unit, max_price: null, brand: null };
  });
}

async function parseCommand(text) {
  try {
    const commands = await parseWithGroq(text);
    return commands.map(c => ({ ...c, source: 'groq' }));
  } catch (err) {
    console.warn('Groq failed, using regex fallback:', err.message);
    return parseWithRegex(text).map(c => ({ ...c, source: 'regex' }));
  }
}