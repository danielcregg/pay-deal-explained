// The second pay-against-prices chart is folded into the opening one: an inflation figure
// of the reader's own, the numbers month by month and what other forecasters say all sit
// under the opening chart, and the chapter that held them is gone.
import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { installDom } from './helpers/dom.js';
import { readCss } from './helpers/css.js';
import * as data from '../site/js/data.js';
import { payAgainstPrices } from '../site/js/pay.js';
import { DEFAULT_SELECTION, OWN_PATH, OWN_RATE, scenarioOf, restoreSelection } from '../site/js/selection.js';
import { createStore } from '../site/js/state.js';
import * as hero from '../site/js/sections/hero.js';
import * as yourPay from '../site/js/sections/your-pay.js';

const document = installDom();
const { INFLATION, SCALES, DEAL } = data;
const read = (path) => readFileSync(new URL(`../site/${path}`, import.meta.url), 'utf8');
const html = read('index.html');
const lecturer = { ...DEFAULT_SELECTION, touched: true, sector: 'tu', gradeId: 'lect', pointIndex: 4, typed: null };
const near = (a, b, t = 0.01) => assert.ok(Math.abs(a - b) <= t, `${a} ≉ ${b}`);

function mount(mod, selection = {}) {
  const root = document.createElement('div');
  document.body.append(root);
  const store = createStore({ ...DEFAULT_SELECTION, ...selection });
  mod.render(root, { store, data, now: '2026-11' });
  const radio = (name, value) => {
    const all = root.querySelectorAll(`input[name="${name}"]`);
    const el = all.find((r) => r.value === value);
    for (const r of all) r.checked = r === el;
    el.dispatchEvent({ type: 'change', bubbles: true });
  };
  const slide = (id, value) => { const el = root.querySelector(id); el.value = String(value); el.dispatchEvent({ type: 'input', bubbles: true }); };
  const checked = (name) => root.querySelectorAll(`input[name="${name}"]`).filter((r) => r.checked).map((r) => r.value);
  return { root, store, radio, slide, checked };
}

// ---------- an inflation figure of the reader's own ----------

test('a figure of your own is a fourth inflation path: one rate for every year, said to be yours', () => {
  assert.equal(OWN_PATH, 'own');
  assert.deepEqual([OWN_RATE.min, OWN_RATE.max, OWN_RATE.start], [0, 6, 3]);
  assert.equal(DEFAULT_SELECTION.ownRate, 3);
  const own = scenarioOf({ ...DEFAULT_SELECTION, scenario: 'own', ownRate: 4.5 }, INFLATION);
  assert.deepEqual([own.id, own.kind, own.label], ['own', 'your own figure', 'Your own figure']);
  assert.deepEqual(own.rates, { 2026: 4.5, 2027: 4.5, 2028: 4.5, 2029: 4.5 }, 'a rate for every year the Central Bank’s path has');
  assert.equal('lead' in own, false, 'no opening words for a sentence the page no longer has');
  assert.ok(INFLATION.scenarios.every((s) => !('lead' in s)));
  assert.equal(own.phrase, 'at your own figure (4.5% a year)');
  assert.equal(own.note, 'Inflation here is 4.5% a year, a figure of your own.');
  assert.equal(scenarioOf({ ...DEFAULT_SELECTION, scenario: 'central', ownRate: 4.5 }, INFLATION).id, 'central', 'the figure waits until it is chosen');
});

test('your own figure is remembered with the other choices, and a figure out of range goes back to the start', () => {
  const saved = (patch) => JSON.stringify({ ...lecturer, remember: true, ...patch });
  const kept = restoreSelection(saved({ scenario: 'own', ownRate: 5.2 }), SCALES);
  assert.deepEqual([kept.scenario, kept.ownRate, kept.gradeId], ['own', 5.2, 'lect']);
  for (const bad of [-1, 6.5, '4', null]) {
    const odd = restoreSelection(saved({ scenario: 'own', ownRate: bad }), SCALES);
    assert.deepEqual([odd.scenario, odd.ownRate, odd.gradeId], ['own', 3, 'lect'], String(bad));
  }
});

test('the same sums as before: pay against prices at 0%, at 6% and on the Central Bank’s path', () => {
  const m = payAgainstPrices(100000, DEAL.steps, INFLATION, { includeLB: false });
  near(m.real, 2.52);
  assert.equal(m.ahead.length, 7);
  near(payAgainstPrices(100000, DEAL.steps, INFLATION, { includeLB: false, flatRate: 0 }).real, 10.17);
  near(payAgainstPrices(100000, DEAL.steps, INFLATION, { includeLB: false, flatRate: 6 }).real, -6.14);
  // a figure of your own goes through the opening chart's own sums and gives the same answers
  const own = (rate) => hero.stateAt(hero.model(100000, data, { includeLB: false, rates: scenarioOf({ scenario: 'own', ownRate: rate }, INFLATION).rates }), 33);
  near(own(0).real, 10.17);
  near(own(6).real, -6.14);
});

test('the opening chart: four inflation buttons, and a slider for your own figure that moves every figure', () => {
  const { root, store, radio, slide, checked } = mount(hero, lecturer);
  const tiles = () => root.querySelectorAll('.race-tile b').map((b) => b.textContent);
  assert.deepEqual(root.querySelectorAll('.race-options input[name="race-prices"]').map((r) => r.value), ['lower', 'central', 'higher', 'own']);
  assert.deepEqual(root.querySelectorAll('.race-options .prices-seg .pill').map((p) => p.textContent), ['Optimistic: 2%', 'Central Bank', 'Pessimistic: 4%', 'Your own figure']);
  const field = root.querySelector('.prices-own');
  const slider = root.querySelector('#race-rate');
  assert.deepEqual([field.hidden, slider.getAttribute('min'), slider.getAttribute('max'), slider.getAttribute('step')], [true, '0', '6', '0.1']);

  radio('race-prices', 'own');
  assert.deepEqual([store.get().scenario, store.get().ownRate, store.get().touched], ['own', 3, true]);
  assert.deepEqual([field.hidden, slider.value, field.querySelector('label').textContent], [false, '3', 'Inflation: 3.0% a year']);
  assert.deepEqual(checked('race-prices'), ['own']);
  assert.equal(root.querySelector('.race-price-note').textContent, 'your own figure');
  assert.match(root.querySelector('.race-source').textContent, /^Inflation here is 3\.0% a year, a figure of your own\. Gross pay;/);

  slide('#race-rate', 6);
  assert.equal(store.get().ownRate, 6);
  assert.deepEqual(tiles().slice(1), ['+10.2%', '+17.4%', '6.1% less']);
  assert.equal(field.querySelector('label').textContent, 'Inflation: 6.0% a year');
  assert.match(root.querySelector('.race-legend li').textContent, /^Pay would be behind inflation in \d+ of the 33 months$/);
  assert.match(root.querySelector('.race-said').textContent, /inflation is 17\.4% at your own figure \(6\.0% a year\), so pay buys 6\.1% less\.$/);

  slide('#race-rate', 0);
  assert.deepEqual(tiles().slice(1), ['+10.2%', '+0.0%', '10.2% more']);
  assert.equal(root.querySelector('.race-legend li').textContent, 'Pay would never be behind inflation in these 33 months');

  radio('race-prices', 'central'); // back to a published path: the slider goes, the figure is kept for next time
  assert.deepEqual([store.get().scenario, store.get().ownRate, field.hidden], ['central', 0, true]);
  assert.deepEqual(tiles().slice(2), ['+7.5%', '2.5% more']);
});

// ---------- the numbers month by month ----------

test('the opening chart: every month’s pay in euro beside the two indices, in a table under the chart', () => {
  const { root, store } = mount(hero, { ...lecturer, pointIndex: 10 });
  const table = root.querySelector('.race-options details.race-months');
  assert.equal(table.querySelector('summary').textContent, 'Show the numbers month by month');
  const heads = () => table.querySelectorAll('thead th').map((th) => th.textContent);
  const row = (i) => table.querySelectorAll('tbody tr')[i].querySelectorAll('td').map((td) => td.textContent);
  assert.deepEqual(heads(), ['Month', 'Yearly pay', 'Pay index', 'Inflation index', 'Ahead']);
  assert.equal(table.querySelectorAll('tbody tr').length, 33);
  assert.deepEqual(row(0).slice(0, 3), ['Jul 2026', '€107,727', '100.0']);
  assert.deepEqual(row(11), ['Jun 2027', '€110,980', '103.0', '103.2', 'Inflation']);
  assert.deepEqual(row(32), ['Mar 2029', '€118,684', '110.2', '107.5', 'Pay']);
  assert.match(table.querySelector('.note').textContent, /1 July 2026 = 100/);
  // the count in the key is the count of rows marked "Prices"
  const ahead = table.querySelectorAll('tbody tr').filter((tr) => tr.querySelectorAll('td')[4].textContent === 'Inflation').length;
  assert.equal(root.querySelector('.race-legend li').textContent, `Pay is behind inflation in ${ahead} of the 33 months`);

  store.set({ contract: 'hourly' });
  assert.equal(heads()[1], 'Hourly rate');
  assert.deepEqual([row(0)[1], row(32)[1]], ['€75.51', '€84.34']);

  // with increments: the reader's own pay in euro, and the deal's index beside prices
  store.set({ contract: 'full', pointIndex: 4, incrementMonth: 9 });
  assert.deepEqual(heads(), ['Month', 'Your pay, with increments', 'Deal index', 'Inflation index', 'Ahead']);
  assert.deepEqual(row(32).slice(1, 3), ['€105,601', '110.2']);
  assert.equal(row(0)[1], '€86,936', 'July 2026: point 4, one below the point held in November, before that September’s increment');
});

// ---------- what other forecasters say ----------

test('the opening chart: what other forecasters say is listed under it, with October’s rate', () => {
  const { root } = mount(hero);
  const others = root.querySelector('.race-options details.race-others');
  assert.equal(others.querySelector('summary').textContent, 'What other forecasters say');
  const rows = others.querySelectorAll('tbody tr').map((tr) => tr.querySelectorAll('th, td').map((c) => c.textContent));
  assert.deepEqual(rows[0], ['Central Bank of Ireland, September 2026', '3.4%', '3.1%', '2.0%', 'not given']);
  assert.deepEqual(rows[1], ['IMF, World Economic Outlook, October 2026', '3.4%', '2.8%', '1.9%', '2.0%']);
  assert.equal(rows.length, 1 + INFLATION.others.length);
  assert.match(others.textContent, /sit close together/);
  assert.match(others.textContent, /Inflation was 4\.0% in the year to October 2026 \(CSO flash estimate\)/);
  assert.doesNotMatch(others.textContent, /as reported by RTÉ/);
});

// ---------- the chapter is gone ----------

test('the page has no second pay-against-prices chapter, and the chapters after it move up one', () => {
  assert.doesNotMatch(html, /pay-vs-prices/);
  assert.equal(existsSync(new URL('../site/js/sections/pay-vs-prices.js', import.meta.url)), false);
  assert.doesNotMatch(read('js/main.js'), /pay-vs-prices|payVsPrices/);
  const chapters = [...html.matchAll(/<section class="chapter" id="([\w-]+)" data-chapter="(\d+)"/g)].map((m) => [m[1], Number(m[2])]);
  assert.deepEqual(chapters, [['nine-rises', 1], ['flat-or-percent', 2], ['compounding', 3], ['back-pay', 4],
    ['vs-last-deal', 5], ['beyond-pay', 6], ['timeline', 7], ['glossary', 8], ['sources', 9]]);
});

test('nothing on the page still points at the chapter that is gone', () => {
  const dir = new URL('../site/js/sections/', import.meta.url);
  const sources = [read('js/main.js'), read('js/data.js'), read('js/selection.js'), read('js/switches.js'), read('js/header.js'),
    ...readdirSync(dir).map((f) => readFileSync(new URL(f, dir), 'utf8'))].join('\n');
  assert.doesNotMatch(sources, /#pay-vs-prices/);
  assert.doesNotMatch(sources, /chapter 2’s|as chapter 2|in chapter 2/i);
  const { root } = mount(hero);
  assert.equal(root.querySelector('.race-source a'), null, 'the note no longer sends readers to another chart for their own figure: it is under this one');
  assert.doesNotMatch(readCss('demos.css'), /\.pvp-/, 'and its styles go with it');
  assert.ok(data.ASSUMPTIONS.some((a) => /buttons under the opening chart are illustrations, not forecasts/.test(a)));
  assert.match(data.BEYOND_PAY.find((b) => b.id === 'reform').text, /^Chapter 2 of the agreement sets out/, 'the agreement’s own chapter 2 is named as that');
});

test('Present mode: the two tables under the chart are for reading, not for a slide', () => {
  assert.match(readCss('present.css'), /body\.present \.race-months,\s*body\.present \.race-others\s*\{\s*display:\s*none;/);
});

test('the slider moves the figures at once, even where animation frames never come (a tab in the background)', () => {
  const before = globalThis.requestAnimationFrame;
  globalThis.requestAnimationFrame = () => 0; // asked for, never run
  try {
    const { root, store, radio, slide } = mount(hero, lecturer);
    radio('race-prices', 'own');
    slide('#race-rate', 5);
    assert.equal(store.get().ownRate, 5);
    assert.equal(root.querySelectorAll('.race-tile b')[2].textContent, '+14.4%');
  } finally {
    globalThis.requestAnimationFrame = before;
  }
});

test('a wide table under the chart scrolls inside the card: it cannot push the options past the card’s edge', () => {
  const css = readCss('demos.css');
  assert.match(css, /\.race-options\s*\{[^}]*grid-template-columns:\s*minmax\(0, 1fr\);/,
    'a grid column sized by its content grows to the table’s width: 348px in a 311px card on a phone');
});
