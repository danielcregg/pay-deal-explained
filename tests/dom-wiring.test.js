// Wiring tests: the site's real render code run against a tiny fake DOM
// (tests/helpers/dom.js), for behaviour the pure-function tests cannot see.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { installDom, Document } from './helpers/dom.js';
import * as data from '../site/js/data.js';
import { createStore } from '../site/js/state.js';
import { DEFAULT_SELECTION } from '../site/js/selection.js';
import * as staircase from '../site/js/sections/staircase.js';
import { enhanceTerms } from '../site/js/sections/glossary.js';
import { presentKeyAction } from '../site/js/present.js';

const document = installDom();
const key = (k) => ({ type: 'keydown', key: k, bubbles: true });

function mountStaircase() {
  const root = document.createElement('div');
  document.body.append(root);
  const store = createStore({ ...DEFAULT_SELECTION });
  staircase.render(root, { store, data });
  return { store, bars: () => root.querySelectorAll('g.bar') };
}

test('M9: the staircase has one tab stop, which follows focus and the arrow keys', () => {
  const { bars } = mountStaircase();
  const stops = () => bars().map((b) => b.getAttribute('tabindex')).join(',');
  assert.equal(stops(), '0,-1,-1,-1,-1,-1,-1,-1,-1');

  bars()[5].focus(); // as a mouse click on the bar would
  assert.equal(stops(), '-1,-1,-1,-1,-1,0,-1,-1,-1');

  const right = key('ArrowRight');
  bars()[5].dispatchEvent(right);
  assert.equal(document.activeElement, bars()[6]);
  assert.equal(right.defaultPrevented, true);
  assert.equal(stops(), '-1,-1,-1,-1,-1,-1,0,-1,-1');

  const pageDown = key('PageDown');
  bars()[6].dispatchEvent(pageDown);
  assert.equal(pageDown.defaultPrevented, false, 'a key the chart does not use is left for Present mode');
  assert.deepEqual(presentKeyAction(pageDown, 2, 11, false), { to: 3 });
});

test('M8: the local-bargaining bar is hatched while possible and striped once counted', () => {
  const { bars, store } = mountStaircase();
  const cap = () => bars()[7].querySelector('path').getAttribute('class');
  assert.equal(cap(), 'bar-possible');
  store.set({ includeLB: true });
  assert.equal(cap(), 'bar-lb');
});

test('M3: Esc closes a visible glossary pop-up and is used up; a hidden pop-up does not swallow it', () => {
  const section = document.createElement('section');
  const term = document.createElement('span');
  term.setAttribute('data-term', 'compounding');
  term.textContent = 'compounding';
  section.append(term);
  document.body.append(section);
  enhanceTerms(document, data.GLOSSARY);
  const button = section.querySelector('button.term');

  button.click();
  assert.equal(button.getAttribute('aria-expanded'), 'true');
  const esc = key('Escape');
  button.dispatchEvent(esc);
  assert.deepEqual([button.getAttribute('aria-expanded'), esc.defaultPrevented], ['false', true]);
  assert.equal(presentKeyAction(esc, 3, 11, false), null, 'Present mode leaves a handled Esc alone');

  button.click();
  section.hidden = true; // the reader moved to another chapter with the pop-up still open
  const later = key('Escape');
  document.body.dispatchEvent(later);
  assert.deepEqual([button.getAttribute('aria-expanded'), later.defaultPrevented], ['false', false]);
  assert.deepEqual(presentKeyAction(later, 3, 11, false), { exit: true });
});

// ---- M13: the inline fallback script in index.html, run as written ----

const html = readFileSync(new URL('../site/index.html', import.meta.url), 'utf8');
const inlineScript = html.match(/<script>([\s\S]*?)<\/script>/)?.[1] ?? '';

/** A page with three sections; `filled` says which of them the modules rendered. */
function loadPage(filled) {
  const doc = new Document();
  const main = doc.createElement('main');
  const noscript = doc.createElement('noscript');
  noscript.append('<div class="noscript"><p><strong>Status.</strong></p><table><tr><td>1 September 2026</td></tr></table><p>Turn on JavaScript to use the calculator and demos.</p></div>');
  const first = doc.createElement('section');
  first.id = 'your-pay';
  main.append(noscript, first);
  doc.body.append(main);
  const mounts = filled.map((isFilled, i) => {
    const mount = doc.createElement('div');
    mount.className = 'chapter-body';
    mount.setAttribute('data-mount', `m${i}`);
    if (isFilled) mount.append(doc.createElement('div'));
    (i === 0 ? first : main).append(mount);
    return mount;
  });
  new Function('document', inlineScript)(doc);
  doc.dispatchEvent({ type: 'DOMContentLoaded' });
  const notes = mounts.map((m) => m.querySelectorAll('p.note').length);
  return { box: doc.querySelector('.load-failed'), notes };
}

test('M13: a page whose demos all rendered shows no load-failure message', () => {
  const { box, notes } = loadPage([true, true, true]);
  assert.equal(box, null);
  assert.deepEqual(notes, [0, 0, 0]);
});

test('M13: if nothing rendered, the page says so and shows the key facts', () => {
  const { box, notes } = loadPage([false, false, false]);
  assert.ok(box, 'a load-failure box');
  assert.match(box.innerHTML, /role="alert"[^>]*>The calculator and demos did not load/);
  assert.match(box.innerHTML, /<table>/);
  assert.doesNotMatch(box.innerHTML, /Turn on JavaScript/);
  assert.deepEqual(notes, [1, 1, 1]);
});

test('M13: one section that failed to render gets a note, without the page-wide message', () => {
  const { box, notes } = loadPage([true, false, true]);
  assert.equal(box, null);
  assert.deepEqual(notes, [0, 1, 0]);
});
