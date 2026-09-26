/* ============================================================
   parser.test.mjs — regex parser test suite
   Run:  node --test parser.test.mjs
   ============================================================ */

import { test, describe, before } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

let P;   // the parser's global scope

before(() => {
  // data.js and parser.js are browser scripts sharing one scope.
  // Concatenate them so parser.js can see data.js's consts.
  const source = readFileSync('data.js', 'utf8') + '\n' + readFileSync('parser.js', 'utf8');

  const sandbox = {
    console,
    location: { protocol: 'http:', hostname: 'localhost' },
    localStorage: {
      _s: {},
      getItem(k) { return this._s[k] ?? null; },
      setItem(k, v) { this._s[k] = String(v); },
      removeItem(k) { delete this._s[k]; }
    },
    fetch: () => Promise.reject(new Error('network disabled in tests')),
    setTimeout, clearTimeout,
    AbortController
  };
  sandbox.window = sandbox;
  sandbox.globalThis = sandbox;

  P = vm.createContext(sandbox);
  vm.runInContext(source, P, { filename: 'pantrypal-bundle.js' });
});

/* ---------- helpers ---------- */
const names = (cmds) => cmds.map(c => (c.item || c.query || '').toLowerCase());
const hasItem = (cmds, word) => names(cmds).some(n => n.includes(word));

/* ============================================================ */

describe('parseWithRegex — add', () => {

  test('splits a compound add into separate commands', () => {
    const r = P.parseWithRegex('add milk and 2 eggs');
    assert.equal(r.length, 2);
    assert.ok(r.every(c => c.intent === 'add'));
    assert.ok(hasItem(r, 'milk'));
    assert.ok(hasItem(r, 'egg'));
  });

  test('extracts a numeric quantity', () => {
    const r = P.parseWithRegex('add 3 tomatoes');
    assert.equal(r.length, 1);
    assert.equal(r[0].quantity, 3);
    assert.ok(r[0].item.includes('tomato'));
  });

  test('understands number words', () => {
    const r = P.parseWithRegex('add two onions');
    assert.equal(r[0].quantity, 2);
  });

  test('handles comma-separated lists', () => {
    const r = P.parseWithRegex('add rice, sugar, salt');
    assert.equal(r.length, 3);
  });

  test('accepts alternative add verbs', () => {
    for (const phrase of ['buy bread', 'i need bread', 'get bread', 'pick up bread']) {
      const r = P.parseWithRegex(phrase);
      assert.equal(r[0].intent, 'add', `failed on: ${phrase}`);
    }
  });

  test('returns the canonical command shape', () => {
    const r = P.parseWithRegex('add milk');
    for (const k of ['intent','item','display','quantity','unit','max_price','brand','query','servings']) {
      assert.ok(k in r[0], 'missing field: ' + k);
    }
  });

  test('normalises plurals to singular', () => {
    const r = P.parseWithRegex('add eggs');
    assert.equal(r[0].item, 'egg');
  });
});

describe('parseWithRegex — remove', () => {

  test('recognises remove intent', () => {
    const r = P.parseWithRegex('remove onion');
    assert.equal(r[0].intent, 'remove');
    assert.ok(r[0].item.includes('onion'));
  });

  test('accepts alternative remove verbs', () => {
    for (const phrase of ['delete milk', 'take off milk', "i don't need milk"]) {
      const r = P.parseWithRegex(phrase);
      assert.equal(r[0].intent, 'remove', `failed on: ${phrase}`);
    }
  });
});

describe('parseWithRegex — search', () => {

  test('recognises search intent', () => {
    const r = P.parseWithRegex('find toothpaste');
    assert.equal(r[0].intent, 'search');
  });

  test('extracts a price ceiling', () => {
    const r = P.parseWithRegex('show me toothpaste under 100');
    assert.equal(r[0].intent, 'search');
    assert.equal(r[0].max_price, 100);
  });

  test('handles the rupee symbol', () => {
    const r = P.parseWithRegex('find soap under ₹50');
    assert.equal(r[0].max_price, 50);
  });
});

describe('parseWithRegex — recipe & substitute', () => {

  test('detects a recipe request with servings', () => {
    const r = P.parseWithRegex('i want to cook biryani for 4 people');
    assert.equal(r[0].intent, 'recipe');
    assert.equal(r[0].servings, 4);
  });

  test('detects a substitute request', () => {
    const r = P.parseWithRegex('instead of butter');
    assert.equal(r[0].intent, 'substitute');
    assert.ok(r[0].item.includes('butter'));
  });

  test('detects check-off', () => {
    const r = P.parseWithRegex('got the milk');
    assert.equal(r[0].intent, 'check_off');
  });
});

describe('parseWithRegex — robustness', () => {

  test('empty input does not throw', () => {
    assert.doesNotThrow(() => P.parseWithRegex(''));
  });

  test('gibberish does not throw', () => {
    assert.doesNotThrow(() => P.parseWithRegex('asdkjh qwe zxc'));
  });

  test('trailing punctuation is stripped', () => {
    const r = P.parseWithRegex('add milk!');
    assert.ok(r[0].item.includes('milk'));
    assert.ok(!r[0].item.includes('!'));
  });

  test('is case-insensitive', () => {
    const r = P.parseWithRegex('ADD MILK');
    assert.equal(r[0].intent, 'add');
  });
});

describe('Hindi parsing', () => {

  test('detects Devanagari input', () => {
    assert.equal(P.hasHindi('दूध और दो अंडे जोड़ो'), true);
  });

  test('detects romanised Hindi', () => {
    assert.equal(P.hasHindi('doodh aur chawal add karo'), true);
  });

  test('does not misfire on plain English', () => {
    assert.equal(P.hasHindi('add milk and bread'), false);
  });

  test('parses a Devanagari add command', () => {
    const r = P.parseHindi('दूध और दो अंडे जोड़ो');
    assert.ok(r.length >= 1);
    assert.equal(r[0].intent, 'add');
  });

  test('parses a Devanagari remove command', () => {
    const r = P.parseHindi('प्याज हटाओ');
    assert.equal(r[0].intent, 'remove');
  });

  test('parses a Hindi price search', () => {
    const r = P.parseHindi('सौ रुपये से कम में साबुन दिखाओ');
    assert.equal(r[0].intent, 'search');
  });
});

describe('utilities', () => {

  test('normalizeItem lowercases and trims', () => {
    assert.equal(P.normalizeItem('  MILK  '), 'milk');
  });

  test('resolveCategory maps a known item', () => {
    assert.ok(P.resolveCategory('milk'));
  });

  test('resolveCategory falls back for unknown items', () => {
    assert.ok(P.resolveCategory('zzzznotathing'));
  });

  test('extractJSON strips markdown fences', () => {
    const out = P.extractJSON('```json\n{"a":1}\n```');
        assert.equal(JSON.stringify(out), '{"a":1}');
  });

  test('aiAvailable returns a boolean', () => {
    assert.equal(typeof P.aiAvailable(), 'boolean');
  });
});
