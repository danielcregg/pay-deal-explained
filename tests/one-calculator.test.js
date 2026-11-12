// One calculator, and it is the first thing on the page. What used to be chapter 1, "Your
// pay", is part of the opening chart's card: the less common cases fold out under the four
// pickers, and the figures in detail sit under the chart. The prices line is the inflation line.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { installDom } from './helpers/dom.js';
import { readCss } from './helpers/css.js';
import * as data from '../site/js/data.js';
import { eur } from '../site/js/format.js';
import { DEFAULT_SELECTION } from '../site/js/selection.js';
import { createStore } from '../site/js/state.js';
import * as hero from '../site/js/sections/hero.js';
import { model as payModel } from '../site/js/sections/your-pay.js';

const document = installDom();
const read = (path) => readFileSync(new URL(`../site/${path}`, import.meta.url), 'utf8');
const html = read('index.html');
const lecturer = { ...DEFAULT_SELECTION, touched: true, sector: 'tu', gradeId: 'lect', pointIndex: 4, typed: null };

function mount(selection = {}) {
  const root = document.createElement('div');
  document.body.append(root);
  const store = createStore({ ...DEFAULT_SELECTION, ...selection });
  hero.render(root, { store, data, now: '2026-11' });
  const fire = (el, type = 'change') => el.dispatchEvent({ type, bubbles: true });
  const pick = (id, value) => { const el = root.querySelector(id); el.value = String(value); fire(el); };
  const radio = (name, value) => {
    const all = root.querySelectorAll(`input[name="${name}"]`);
    const el = all.find((r) => r.value === value);
    for (const r of all) r.checked = r === el;
    fire(el);
  };
  const type = (id, value) => { const el = root.querySelector(id); el.focus(); el.value = String(value); fire(el, 'input'); };
  const text = (selector) => root.querySelector(selector).textContent;
  return { root, store, pick, radio, type, text };
}

// ---------- one calculator ----------

test('the page has one calculator, at the top: the "Your pay" chapter is gone and nine chapters follow', () => {
  assert.doesNotMatch(html, /id="your-pay"|data-mount="your-pay"/);
  const chapters = [...html.matchAll(/<section class="chapter" id="([\w-]+)" data-chapter="(\d+)"/g)].map((m) => [m[1], Number(m[2])]);
  assert.deepEqual(chapters, [['nine-rises', 1], ['flat-or-percent', 2], ['compounding', 3], ['back-pay', 4],
    ['vs-last-deal', 5], ['beyond-pay', 6], ['timeline', 7], ['glossary', 8], ['sources', 9]]);
  assert.match(html, /<a class="skip-link" href="#top">Skip to the pay calculator<\/a>/);
  assert.doesNotMatch(read('js/main.js'), /your-pay|yourPay/, 'the opening places its parts itself');
});

test('nothing on the page still sends readers to a second calculator, or to "section 1"', () => {
  const dir = new URL('../site/js/sections/', import.meta.url);
  const sources = [read('js/main.js'), read('js/data.js'), read('js/selection.js'), read('js/switches.js'), read('js/header.js'),
    ...readdirSync(dir).map((f) => readFileSync(new URL(f, dir), 'utf8'))].join('\n');
  assert.doesNotMatch(sources, /#your-pay/);
  assert.doesNotMatch(sources, /section 1\b/i);
  assert.doesNotMatch(sources, /full calculator/);
});

test('the calculator: the four pickers, a fold-out for the less common cases, the figures, the chart, then the pay in detail', () => {
  const { root, text } = mount();
  const order = root.children.map((el) => el.className.split(' ').find((c) => c.startsWith('race-') || c === 'chart-wrap') ?? el.localName);
  const pos = (name) => { const i = order.indexOf(name); assert.ok(i >= 0, `${name} is in the card: ${order.join(', ')}`); return i; };
  assert.equal(order[0], 'h2');
  assert.ok(pos('race-picker') < pos('race-extra') && pos('race-extra') < pos('race-tiles'));
  assert.ok(pos('race-tiles') < pos('chart-wrap') && pos('chart-wrap') < pos('race-detail') && pos('race-detail') < pos('race-options'));

  // one set of pickers: the form the chapter had is not repeated
  for (const id of ['#pp-sector', '#pp-grade', '#pp-point', '#pp-lb', '#pp-owed']) assert.equal(root.querySelector(id), null, id);
  for (const gone of ['.pay-real', '.example-badge', '.pay-label', '.race-more']) assert.equal(root.querySelector(gone), null, gone);

  const extra = root.querySelector('details.race-extra');
  assert.equal(extra.querySelector('summary').textContent, 'Part-time, hourly-paid or not listed?');
  assert.equal(extra.hasAttribute('open'), false, 'folded away: job, grade and point are all most readers need');
  assert.deepEqual(extra.querySelectorAll('input[name="pp-contract"]').map((r) => r.value), ['full', 'part', 'hourly']);
  assert.equal(extra.querySelector('.pill-hourly').hidden, true, 'hourly-paid is offered only where the job has it');
  assert.equal(extra.querySelector('#pp-fte').closest('.field').hidden, true);
  assert.equal(extra.querySelector('label[for="pp-typed"]').textContent, 'Not listed? Type your full-time salary (€ a year)');
  assert.equal(extra.querySelector('#pp-typed').value, '', 'the example salary is not shown as something the reader typed');

  const detail = root.querySelector('.race-detail');
  assert.equal(detail.querySelector('h3').textContent, 'Your pay in detail');
  assert.deepEqual([text('.race-detail .pay-big .from'), text('.race-detail .pay-big .to')], ['€60,000', '€66,103']);
  assert.match(text('.race-detail .pay-gain'), /^\+€6,103 a year \(\+10\.2%\) by March 2029, from the general rises\.$/);
  assert.match(text('.race-detail .pay-facts'), /First rise.*Back pay/);
  assert.match(text('.race-detail .pay-ways-title'), /counted two ways/);

  const privacy = root.querySelector('.race-options .privacy');
  assert.equal(privacy.querySelector('#pp-remember').checked, false);
  assert.ok(root.querySelectorAll('button').some((b) => b.textContent === 'Clear my choices'));
});

test('part-time and hourly-paid are set in the fold-out, and the tiles and the detail follow', () => {
  const { root, store, radio, type, text } = mount(lecturer);
  const extra = root.querySelector('details.race-extra');
  assert.equal(extra.querySelector('.pill-hourly').hidden, false, 'lecturers can be hourly-paid');
  radio('pp-contract', 'part');
  assert.equal(extra.querySelector('#pp-fte').closest('.field').hidden, false);
  type('#pp-fte', 50);
  assert.deepEqual([store.get().contract, store.get().fte], ['part', 0.5]);
  assert.deepEqual([text('.pay-big .from'), text('.pay-big .to'), text('.race-tile.euro b')], ['€44,947', '€49,519', '€49,519']);
  assert.equal(text('.context-line'), 'Showing: Lecturer, point 5, 50% of full-time.');

  radio('pp-contract', 'hourly');
  const m = payModel(store.get(), data);
  assert.equal(m.unit, 'hour');
  assert.deepEqual([text('.pay-big .from'), text('.race-tile.euro small')], [eur(m.shown.from, { cents: true }), 'Hourly rate, before tax']);
  assert.equal(extra.querySelector('#pp-hours').closest('.field').hidden, false);
  assert.equal(extra.querySelector('#pp-typed').closest('.field').hidden, true, 'an hourly rate comes from the scale, not from a typed salary');

  // a reader who comes back part-time finds the fold-out open, so what changes the figures can be seen
  const back = mount({ ...lecturer, contract: 'part', fte: 0.5 });
  assert.equal(back.root.querySelector('details.race-extra').hasAttribute('open'), true);
});

test('a salary typed in the fold-out is used at once, with or without a job, and gives way to a grade chosen later', () => {
  const { root, store, pick, type, text } = mount();
  type('#pp-typed', '52,000');
  assert.deepEqual([store.get().gradeId, store.get().typed, store.get().touched, store.get().sector], ['typed', 52000, true, 'any']);
  assert.deepEqual([text('.pay-big .from'), text('.context-line')], ['€52,000', 'Showing: Typed salary.']);
  assert.equal(root.querySelector('#pp-typed').value, '52,000', 'left as typed while the reader is in the box');
  assert.equal(root.querySelector('#race-job').value, '', 'the pickers still ask for a job');

  pick('#race-job', 'garda');
  pick('#race-grade', 'garda-2015');
  pick('#race-point', 3);
  assert.deepEqual([store.get().sector, store.get().gradeId, store.get().pointIndex], ['garda', 'garda-2015', 3]);
  document.body.focus();
  store.set({ includeLB: store.get().includeLB }); // any later change
  assert.equal(root.querySelector('#pp-typed').value, '', 'the figures no longer use the typed salary, so the box is empty again');

  type('#pp-typed', '58000'); // not listed under this job: a salary of their own, and the job stays
  assert.deepEqual([store.get().sector, store.get().gradeId, store.get().typed], ['garda', 'typed', 58000]);
  assert.match(text('.pay-caveat'), /^Gross pay on this salary/);

  type('#pp-typed', '58');
  assert.equal(store.get().typed, 58000, 'a figure too low to be a salary changes nothing');
});

// ---------- the inflation line ----------

test('the prices line is the inflation line: the chart, the tile, the key, the table and the notes all say inflation', () => {
  const { root, store, radio, text } = mount(lecturer);
  assert.equal(text('h2'), 'Your pay against inflation, month by month');
  assert.equal(text('.race-label-price'), 'Inflation');
  assert.equal(text('.race-tile.price small'), 'Inflation');
  assert.equal(text('.race-legend li'), 'Pay is behind inflation in 7 of the 33 months');
  assert.match(root.querySelector('svg').getAttribute('aria-label'), /^Pay and inflation from July 2026 to March 2029\. By the end, pay is up 10\.2% and inflation is 7\.5%\. Pay is behind inflation in 7 of the 33 months\.$/);
  assert.match(text('.race-said'), /pay is up 10\.2% and inflation is 7\.5% on the Central Bank’s forecasts/);
  assert.match(text('.race-source'), /^Inflation follows the Central Bank of Ireland’s forecasts of September 2026/);
  assert.deepEqual(root.querySelectorAll('.race-months thead th').map((th) => th.textContent), ['Month', 'Yearly pay', 'Pay index', 'Inflation index', 'Ahead']);
  const ahead = root.querySelectorAll('.race-months tbody tr').map((tr) => tr.querySelectorAll('td')[4].textContent);
  assert.deepEqual([...new Set(ahead)].sort(), ['Inflation', 'Pay']);
  assert.match(root.querySelector('input.race-scrub').getAttribute('aria-valuetext'), /, pay \+10\.2%, inflation \+7\.5%$/);

  radio('race-prices', 'own');
  assert.equal(root.querySelector('.prices-own label').textContent, 'Inflation: 3.0% a year');
  assert.match(text('.race-source'), /^Inflation here is 3\.0% a year, a figure of your own\./);
  assert.equal(text('.race-legend li'), 'Pay would be behind inflation in 4 of the 33 months');
  store.set({ ownRate: 0 });
  assert.equal(text('.race-legend li'), 'Pay would never be behind inflation in these 33 months');
  store.set({ scenario: 'higher' });
  assert.match(text('.race-source'), /^Inflation here is an illustration, not a forecast: it stays at 4% a year, the rate in the year to October 2026 \(CSO flash estimate\)\./);

  // with increments the comparison is still the deal's, and it says so in the same word
  store.set({ scenario: 'central', incrementMonth: 9 });
  assert.equal(text('.race-legend li'), 'The deal’s rises are behind inflation in 7 of the 33 months');
  assert.equal(text('.race-split-why'), 'Increments are normal progression, so they are not counted against inflation.');
  assert.match(text('.race-inc-note'), /so only the deal’s rises are compared with inflation\./);

  // no "prices" left anywhere in the calculator, whichever path is chosen
  for (const scenario of ['lower', 'central', 'higher', 'own']) {
    store.set({ scenario });
    assert.doesNotMatch(root.textContent, /\bprices?\b/i, scenario);
  }
});

test('the notes on the page call it inflation too', () => {
  assert.ok(data.ASSUMPTIONS.some((a) => /^Inflation follows the Central Bank of Ireland’s forecasts for 2026 to 2028/.test(a)));
  assert.ok(data.ASSUMPTIONS.some((a) => /compared with inflation|against inflation/.test(a)));
  assert.match(data.GLOSSARY.find((g) => g.id === 'increment').text, /the deal’s rises alone are compared with inflation/);
});

// ---------- Present mode ----------

test('Present mode: the fold-out and the pay in detail are for reading, not for the slide', () => {
  assert.match(readCss('present.css'), /body\.present \.race-extra,\s*body\.present \.race-detail\s*\{\s*display:\s*none;/);
});
