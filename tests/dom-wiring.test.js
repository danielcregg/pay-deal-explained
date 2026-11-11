// Wiring tests: the site's real render code run against a tiny fake DOM
// (tests/helpers/dom.js), for behaviour the pure-function tests cannot see.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { installDom, Document, setReducedMotion } from './helpers/dom.js';
import * as data from '../site/js/data.js';
import { createStore } from '../site/js/state.js';
import { DEFAULT_SELECTION } from '../site/js/selection.js';
import * as staircase from '../site/js/sections/staircase.js';
import * as hero from '../site/js/sections/hero.js';
import * as yourPay from '../site/js/sections/your-pay.js';
import * as backPay from '../site/js/sections/back-pay.js';
import { enhanceTerms } from '../site/js/sections/glossary.js';
import { presentKeyAction } from '../site/js/present.js';
import { countTo } from '../site/js/motion.js';
import * as vsLastDeal from '../site/js/sections/vs-last-deal.js';

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

test('the race: the tiles show the end state, follow the slider, and the chips switch salary', () => {
  const root = document.createElement('div');
  document.body.append(root);
  const store = createStore({ ...DEFAULT_SELECTION });
  hero.render(root, { store, data });
  const tiles = () => root.querySelectorAll('.race-tile b').map((b) => b.textContent);
  const scrubTo = (value) => { const s = root.querySelector('input.race-scrub'); s.value = String(value); s.dispatchEvent({ type: 'input', bubbles: true }); };
  assert.deepEqual(tiles(), ['+10.2%', '+7.5%', '2.5% more']);

  scrubTo(15.5);
  assert.equal(root.querySelector('.race-when').textContent, 'By October 2027');
  assert.equal(tiles()[0], '+4.1%');
  assert.match(tiles()[2], /less$/);

  const [mine, lowest] = root.querySelectorAll('.race-picks button');
  assert.equal(mine.textContent, 'Example: Lecturer, point 5');
  lowest.click();
  scrubTo(33);
  assert.equal(tiles()[0], '+11.7%');

  store.set({ touched: true, gradeId: 'al-ne', pointIndex: 0 }); // the reader is on the lowest point already
  assert.equal(root.querySelector('.race-picks').hidden, true);
});

test('your pay: counting the 1% from 2025 moves the figure and the marked cell, and they agree', () => {
  const root = document.createElement('div');
  document.body.append(root);
  const store = createStore({ ...DEFAULT_SELECTION, touched: true, gradeId: 'lect', pointIndex: 10 });
  yourPay.render(root, { store, data });
  const text = (selector) => root.querySelector(selector).textContent;
  assert.equal(text('.pay-big .to'), '€118,684');
  assert.match(text('.pay-ways-table td.on'), /^€118,684 \+10\.2%/);
  assert.match(text('.pay-gain'), /\(\+10\.2%\)/);
  assert.match(text('.pay-real'), /^After forecast inflation \(2029 assumed at 2%\), that would buy about 2\.5% more than in July 2026/);

  const owed = root.querySelector('#pp-owed');
  owed.checked = true;
  owed.dispatchEvent({ type: 'change', bubbles: true });
  assert.equal(text('.pay-big .from'), '€107,727', 'the panel still starts from today’s scale figure');
  assert.equal(text('.pay-big .to'), '€119,871');
  assert.match(text('.pay-gain'), /^\+€12,144 a year \(\+11\.3%\)/);
  assert.match(text('.pay-ways-table td.on'), /^€119,871 \+11\.3%/);
  assert.match(text('.pay-label'), /with the 1% from September 2025$/);
  assert.equal(root.querySelectorAll('.pay-ways-table td.on').length, 1);
});

test('back pay: its checkbox for the 1% owed since 2025 and the one in section 1 are the same choice', () => {
  const one = document.createElement('div');
  const six = document.createElement('div');
  document.body.append(one, six);
  const store = createStore({ ...DEFAULT_SELECTION, touched: true, gradeId: 'lect', pointIndex: 10 });
  yourPay.render(one, { store, data });
  backPay.render(six, { store, data });
  assert.equal(six.querySelector('.bp-owed').hidden, true);

  const box = six.querySelector('#bp-owed');
  box.checked = true;
  box.dispatchEvent({ type: 'change', bubbles: true });
  assert.equal(store.get().includeOwed, true);
  assert.equal(one.querySelector('#pp-owed').checked, true, 'section 1 shows the same choice');
  assert.match(six.querySelector('.bp-owed').textContent, /about €1,424. .* about €2,149 before tax/);

  const first = one.querySelector('#pp-owed');
  first.checked = false;
  first.dispatchEvent({ type: 'change', bubbles: true });
  assert.equal(six.querySelector('#bp-owed').checked, false);
  assert.equal(six.querySelector('.bp-owed').hidden, true);
});

test('your pay: choosing another job swaps the grades and hides what does not apply to it', () => {
  const twoJobs = {
    ...data,
    SCALES: {
      ...data.SCALES,
      sectors: [...data.SCALES.sectors, { id: 'test', name: 'Test job', short: 'test job', low: 'lowest test point', effective: '2026-06-01', sourceId: 'circular-002-2026', hourly: false, caveat: 'Basic pay only.' }],
      grades: [...data.SCALES.grades, { id: 'test-a', sector: 'test', name: 'Test grade', group: 'current', points: [{ label: 'Point 1', value: 40000 }, { label: 'Point 2', value: 45000 }] }],
    },
  };
  const root = document.createElement('div');
  document.body.append(root);
  const store = createStore({ ...DEFAULT_SELECTION });
  yourPay.render(root, { store, data: twoJobs });
  const values = (selector) => root.querySelectorAll(selector).map((o) => o.getAttribute('value'));
  const owedSwitch = root.querySelector('label.switch-owed');
  assert.deepEqual(values('#pp-sector option'), ['tu', 'test']);
  assert.equal(owedSwitch.hidden, false, 'lecturers are offered the 1% owed since 2025');
  assert.equal(root.querySelector('label.pill-hourly').hidden, false);

  const jobs = root.querySelector('#pp-sector');
  jobs.value = 'test';
  jobs.dispatchEvent({ type: 'change', bubbles: true });
  const s = store.get();
  assert.deepEqual([s.sector, s.gradeId, s.pointIndex, s.touched], ['test', 'test-a', 0, true]);
  assert.deepEqual(values('#pp-grade option'), ['test-a', 'typed']);
  assert.equal(owedSwitch.hidden, true);
  assert.equal(root.querySelector('label.pill-hourly').hidden, true);
  assert.equal(root.querySelector('.pay-label').textContent, 'Test grade, point 1');
  assert.match(root.querySelector('.pay-caveat').textContent, /Basic pay only\.$/);
});

// ---- with motion on: the timed animations run and land on their final state ----

test('motion: a counted figure runs on a timer and lands exactly on its target', (t) => {
  t.mock.timers.enable({ apis: ['setInterval', 'Date'] });
  setReducedMotion(false);
  try {
    const el = document.createElement('span');
    el.textContent = '€100';
    countTo(el, 100, 200, (v) => `€${Math.round(v)}`);
    assert.equal(el.textContent, '€100', 'nothing moves until the first tick');
    t.mock.timers.tick(300);
    const midway = Number(el.textContent.slice(1));
    assert.ok(midway > 100 && midway < 200, `midway: ${el.textContent}`);
    t.mock.timers.tick(400);
    assert.equal(el.textContent, '€200');
    assert.equal(el.counting, null, 'the timer is cleared');
  } finally {
    setReducedMotion(true);
  }
});

test('motion: the race replays from the start when first seen, then stops at the end', (t) => {
  t.mock.timers.enable({ apis: ['setInterval', 'Date'] });
  setReducedMotion(false);
  try {
    const root = document.createElement('div');
    document.body.append(root);
    hero.render(root, { store: createStore({ ...DEFAULT_SELECTION }), data });
    const tiles = () => root.querySelectorAll('.race-tile b').map((b) => b.textContent);
    const button = root.querySelector('.race-play');
    assert.equal(button.getAttribute('aria-label'), 'Pause', 'it is playing');
    t.mock.timers.tick(3500);
    assert.notEqual(tiles()[0], '+10.2%', 'midway the pay tile has not reached the end');
    t.mock.timers.tick(4000);
    assert.deepEqual(tiles(), ['+10.2%', '+7.5%', '2.5% more']);
    assert.equal(button.getAttribute('aria-label'), 'Play', 'it stopped at the end');
    button.click();
    assert.equal(root.querySelector('.race-when').textContent, 'Starting line: 1 July 2026', 'Play after the end starts again');
    button.click();
    assert.equal(button.getAttribute('aria-label'), 'Play', 'a second press pauses');
  } finally {
    setReducedMotion(true);
  }
});

test('chapter 7: each deal counts its own local bargaining 1%, by its own switch', () => {
  const root = document.createElement('div');
  document.body.append(root);
  const store = createStore({ ...DEFAULT_SELECTION, touched: true, gradeId: 'lect', pointIndex: 10 });
  vsLastDeal.render(root, { store, data });
  const yours = () => root.querySelectorAll('.vs-yours dd').map((d) => d.textContent);
  assert.deepEqual(yours(), ['+9.6%', '+10.2%']);
  store.set({ includeOwed: true }); // the 1% from 2025 belongs to the last deal
  assert.deepEqual(yours(), ['+10.7%', '+10.2%']);
  store.set({ includeOwed: false, includeLB: true }); // the 1% of 2029 belongs to the draft
  assert.deepEqual(yours(), ['+9.6%', '+11.3%']);
  assert.doesNotMatch(root.querySelector('.context-line').textContent, /September 2025/, 'both deals start from today’s scale figure');
});
