# PantryPal 🛒

**Voice-first grocery list assistant for Indian kitchens.**
Speak naturally in English or Hindi — PantryPal turns it into a structured, categorised shopping list with quantities and ₹ prices.

🔗 **Live:** https://pantrypalvoice.netlify.app

---

## The problem

Grocery apps make you type. Typing is the worst possible interface for the moment you actually think of an item — hands wet at the sink, mid-recipe, halfway out the door. So most people fall back to a Notes file that's an unsorted mess of *"milk, eggs, that thing for Sunday."*

Three failures:

1. **Capture friction** — type the item, pick a category, set a quantity. Five taps for one item.
2. **No structure** — a flat list isn't grouped by aisle, so you walk the store twice.
3. **Language gap** — an Indian user thinks *"दो किलो प्याज"* but is forced to type "2kg onion".

PantryPal: say *"add milk, two dozen eggs and some onions"* — or *"दूध और दो अंडे जोड़ो"* — and get three correctly categorised, correctly quantified line items.

---

## Features

|                                            |                                                                                |
| ------------------------------------------ | ------------------------------------------------------------------------------ |
| 🎤 **Voice capture**                       | Continuous speech recognition with live interim transcript                     |
| 🧠 **LLM intent parsing**                  | Groq `gpt-oss-120b` extracts action, item, quantity, unit, category            |
| 🔁 **Regex fallback**                      | Deterministic parser takes over when AI is slow or unreachable                 |
| 🍛 **Recipe decomposition**                | *"cook biryani for 4 people"* → ~12 scaled ingredients in one tap              |
| 🛍️ **Shop mode**                          | Dedicated checkout screen — running ₹ total, aisle grouping, tick-off progress |
| 📦 **Indian catalog**                      | 38 real SKUs: Amul, Everest, India Gate, Kurkure, Thums Up, Surf Excel, Lijjat |
| 🖼️ **Live product photos**                | Openverse API lookup at runtime, cached in localStorage                        |
| 🌐 **Multilingual**                        | Full UI translation — English, हिन्दी, Español, Français                       |
| 🔄 **Smart substitutes**                   | *"instead of butter?"* → ranked alternatives                                   |
| 📊 **Insights**                            | Category breakdown, spend estimate, seasonal suggestions                       |
| ↩️ **Undo, favourites, search, dark mode** |                                                                                |

---

## Architecture

```text
Browser
│
├─ Web Speech API ──► transcript
│
├─ parser.js ──► POST /api/parse
│   │
│   ▼
│   Netlify Function (netlify/functions/parse.js)
│   │   Authorization: Bearer $GROQ_API_KEY
│   ▼
│   Groq API
│
├─ regex fallback
│  (if AI fails, times out, or is unavailable)
│
└─ localStorage
   ├─ list state
   ├─ AI cache
   ├─ photo cache
   └─ preferences
```

**No framework. No bundler. No `npm install`.** Six static files plus one serverless function.

### Files

| File                         | Purpose                                                  |
| ---------------------------- | -------------------------------------------------------- |
| `index.html`                 | Single-page shell — nav, views, dock, modals             |
| `app.js`                     | State, rendering, speech wiring, event handling          |
| `parser.js`                  | AI layer, intent parsing, regex fallback, response cache |
| `data.js`                    | Catalog, categories, keywords, translations, substitutes |
| `style.css`                  | Design tokens, layout, animation                         |
| `netlify/functions/parse.js` | Serverless proxy — keeps the API key server-side         |

---

## Tech stack

**Frontend:** Vanilla JavaScript (ES6), HTML5, CSS3
**Voice:** Web Speech API (`SpeechRecognition`)
**AI:** Groq API — `openai/gpt-oss-120b`
**Backend:** Netlify Functions (Node)
**Storage:** localStorage
**Images:** Openverse API
**Hosting:** Netlify — continuous deployment from `main`
**Type:** Fraunces (display) + DM Sans (body)

---

## Engineering notes

### Graceful degradation as architecture

Three independent tiers: **LLM parse → regex parse → manual text entry.** Each is functional on its own. The list never stops working because an API is down. AI is an enhancement layer, not a dependency.

### The API key never reaches the browser

The first version embedded the Groq key in `parser.js` — which is publicly readable on any static host. It was rotated and the app re-architected around a Netlify Function that reads `process.env.GROQ_API_KEY`. The client posts to `/api/parse`; the key exists only in Netlify's environment.

`parser.js` detects `localhost` vs production and switches endpoints automatically, so local development still works without a proxy.

### Response caching

Identical utterances hit a localStorage cache rather than the network — 60 entries, FIFO eviction. Repeat queries resolve instantly and API spend drops.

### Dual timeouts

4s for simple parses, 20s for recipe decomposition. A single global timeout either kills valid long requests or makes short ones feel broken.

### Language-agnostic data model

Every item carries an **English canonical name** for logic plus a **`display` field** for rendering. This prevents the classic bug where switching to Hindi creates a duplicate entry for an item already on the list.

### Accessibility

`aria-live` region announces every list change to screen readers. Interactive tiles carry `role="button"`, `tabIndex`, and Enter/Space handlers. Full keyboard navigation.

---

## Running locally

```bash
git clone https://github.com/lavanyakarna/Pantrypal.git
cd Pantrypal
npx serve .
```

Open the printed URL — **not** **`file://`**. A real HTTP origin is required for the browser to remember microphone permission.

Without an API key the app runs fine on the regex parser. To enable AI locally, paste a [**Groq key**](https://console.groq.com/keys) into **`LOCAL_KEY`** at the top of **`parser.js`**.

> ⚠️ **Clear `LOCAL_KEY` before committing. In production the key comes from Netlify, never from source.**

### Testing

```bash
node --test parser.test.mjs
```

30 tests, no dependencies, no network. The suite loads the real `data.js` and `parser.js` into a sandboxed VM with a `fetch` that always rejects, so it exercises the shipped code and proves the regex tier works with the AI layer completely unavailable.

Coverage: add / remove / search intents, quantity and unit extraction, number words, price ceilings in `rs` and `INR`, recipe and substitute detection, command-shape contract, Devanagari and romanised Hindi, and malformed input.

### Deploying

Push to **`main`**. Netlify builds and publishes automatically. The only required configuration is the **`GROQ_API_KEY`** environment variable in the Netlify dashboard.

---

## Try saying

| **English**                  | **हिन्दी**                       |
| ---------------------------- | -------------------------------- |
| "add milk, bread and 2 eggs" | "दूध और दो अंडे जोड़ो"           |
| "cook biryani for 4 people"  | "प्याज हटाओ"                     |
| "toothpaste under ₹100"      | "सौ रुपये से कम में साबुन दिखाओ" |
| "instead of butter?"         | "doodh aur chawal add karo"      |

---

## Known limitations

* **No backend** — localStorage means no cross-device sync or multi-user support
* **Web Speech API is Chrome-centric** — degraded on Safari and Firefox
* **Static catalog** — no live inventory or real-time pricing
* **Keyword-based category matching** — unrecognised items land in "Other"

### Next

User accounts with a real backend -> live grocery pricing API -> test coverage for the AI layer.

---

## Credits

Built by [**Lavanya Karna**](https://github.com/lavanyakarna).
Product photography via [**Openverse**](https://openverse.org/) (openly licensed).
Inference by [**Groq**](https://groq.com/](https://groq.com/).

---


