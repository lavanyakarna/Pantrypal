# PantryPal — Voice-Controlled Grocery Shopping Assistant

A hands-free grocery list manager you talk to. Built for the Unthinkable Solutions technical assessment.

**Live app:** https://pantrypalvoice.netlify.app/
**Repository:** https://github.com/lavanyakarna/Pantrypal

---

## Overview

PantryPal lets users manage a grocery list entirely by voice. Tap the mic and speak naturally — the app parses intent, updates the list, and responds out loud.

**Example commands:**
- `"Add milk, bread and 2 eggs"` — adds multiple items in one sentence, auto-categorized into Dairy, Bakery, etc.
- `"Remove bread"` — removes an item
- `"Find toothpaste under 100 rupees"` — searches a product catalog with price filtering
- `"Add my favorites"` — re-adds top 5 most-purchased items

**Additional features:**
- Smart suggestions — substitutes, seasonal items, and "running low" nudges based on purchase history, which the user can accept or decline by saying **"yes"** or **"no"** (a conversational loop, not a one-shot command)
- Text-to-speech responses confirming every action
- Multilingual voice input (English, Hindi, Spanish, French)
- Undo for the last add/remove
- Fully offline list management — only intent parsing needs internet

---

## Architecture

**No backend, no database, no build tools.** Plain HTML/CSS/JavaScript, deployed on GitHub Pages.

This was a deliberate choice for the assessment's time scope: the smallest architecture that could deliver every required feature honestly, rather than over-engineering infrastructure the app doesn't need.

| Layer | Choice | Why |
|---|---|---|
| Voice input | Browser-native Web Speech API | Free, zero setup, built-in multilingual support |
| Intent parsing | Groq API (`openai/gpt-oss-120b`), structured JSON output | Understands natural phrasing variation ("I need milk" / "get me some milk") that pure regex can't |
| Fallback parsing | Hand-written regex | Keeps the app working if the AI call fails |
| Storage | Browser localStorage | Per-user by device, no accounts needed for this scope |
| Suggestions | Rule-based (dictionaries + frequency counter) | Real ML recommendations need usage data at scale this demo doesn't have |

**The regex fallback isn't theoretical** — mid-build, Groq deprecated the model I was originally using (`llama-3.3-70b-versatile`) with no warning. The app degraded gracefully to regex parsing and kept functioning while I migrated to the current model. That's the exact failure mode this fallback was built to handle, and it happened for real during development.

---

## What I tested

I ran roughly 30 varied voice commands spanning every supported intent: simple adds, multi-item adds, quantities, removes, price-filtered searches, and deliberately casual phrasings. Most parsed correctly on the first pass. Two real gaps found and fixed during testing:

1. **Bare "item + price" phrases with no leading verb** (e.g. `"rice under 50"`) weren't recognized as search intent — fixed by adding an explicit rule and example to both the Groq parsing prompt and the regex fallback.
2. **Searches outside the 10-product mock catalog** correctly return "no matching products" — expected behavior given the catalog's intentionally small demo scope, not a parsing failure.

---

## Known limitations

- **Browser support:** Web Speech API works in Chrome and Edge only — not Firefox or Safari.
- **Network-dependent recognition:** Chrome streams audio to Google's speech servers rather than processing on-device, so recognition reliability can vary with connection quality.
- **Client-side API key:** the Groq key is called directly from the browser in this demo. A production version would proxy calls through a lightweight backend to avoid exposing it.
- **Mock catalog:** search covers 10 representative products, not a real product database.
- **English-first NLU:** multilingual support covers voice *transcription* (the browser recognizes Hindi/Spanish/French speech), but intent-parsing examples are English-first — a production version would need language-specific parsing examples for full multilingual command understanding.

---

## Tech stack

- HTML / CSS / vanilla JavaScript — no frameworks, no build step
- Web Speech API (input) + Web Speech Synthesis API (output)
- Groq API (`openai/gpt-oss-120b`) for intent parsing, with regex fallback
- Browser localStorage for persistence
- GitHub Pages for hosting

## Running locally

1. Clone this repo
2. Get a free Groq API key at [console.groq.com](https://console.groq.com) and paste it into `parser.js` (top of file)
3. Open `index.html` in Chrome or Edge — no install, no build step required

---

## Approach write-up (200 words)

PantryPal is a voice-controlled grocery shopping list built for this assessment. Users speak naturally — "add milk, bread and 2 eggs," "find toothpaste under 100 rupees," "remove bread" — and the app parses intent, categorizes items, and responds with text-to-speech.

I chose a backend-free architecture: browser-native Web Speech API for voice input (free, zero setup, multilingual), Groq's LLM API for structured intent parsing (handles natural phrasing variation better than regex alone), and localStorage for persistence. A hand-written regex parser serves as a fallback if the AI call fails — this proved genuinely useful mid-build when Groq deprecated my original model with no warning, and the app kept working without interruption.

Smart suggestions (substitutes, seasonal items, "running low" nudges based on purchase frequency) are rule-based rather than ML-driven, since meaningful learned recommendations need real usage data at scale that a single demo session doesn't have — a deliberate scope decision, not an oversight.

I tested roughly 30 varied voice commands across all supported intents, found and fixed two real parsing gaps, and documented remaining limitations (Chrome/Edge-only speech support, network-dependent recognition, client-side API key exposure, English-first NLU) honestly rather than hiding them.