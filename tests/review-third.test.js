// Fixes from the third independent review: the opening chart, the generic default,
// remembering, and what the page says the proposed agreement says.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { installDom } from './helpers/dom.js';
import { readCss, ruleBody } from './helpers/css.js';
import * as data from '../site/js/data.js';
import { createStore } from '../site/js/state.js';
import { mountMine, mineText } from '../site/js/header.js';
import { finalSalary } from '../site/js/pay.js';
import { DEFAULT_SELECTION, sectorPatch } from '../site/js/selection.js';
import * as hero from '../site/js/sections/hero.js';
import * as yourPay from '../site/js/sections/your-pay.js';
import * as pvp from '../site/js/sections/pay-vs-prices.js';

const document = installDom();
const html = readFileSync(new URL('../site/index.html', import.meta.url), 'utf8');

// ---------- layout ----------

test('css: a rule that resizes the tiles for one screen width comes after the rule it changes', () => {
  const css = readCss('demos.css');
  const base = css.indexOf('.race-tile b {');
  assert.ok(base > 0, 'the base size of a tile’s figure');
  const wide = css.indexOf('.race-tile b { font-size: clamp(1.25rem');
  assert.ok(wide > base, 'beside the headline the figures are smaller: the rule has to come later to win');
  for (const narrow of ['@media (max-width: 639px)', '@media (max-width: 380px)']) {
    const at = css.indexOf(narrow, css.indexOf('.race-tiles {'));
    assert.ok(at > css.indexOf('.race-tile { border-radius'), `${narrow} comes after the tile’s base padding`);
    assert.ok(at > base, `${narrow} comes after the base size`);
  }
  // On a narrow phone the full-width euro tile keeps the larger figure: only the three small tiles shrink.
  const phone = ruleBody(css.slice(base), '@media (max-width: 380px)');
  assert.match(phone, /\.race-tile:not\(\.euro\) b\s*\{\s*font-size:\s*1rem;/);
  assert.doesNotMatch(phone, /\.race-tile b\s*\{/);
});

test('css: the like-for-like figure in chapter 7 reads as a note, not as a second headline figure', () => {
  const css = readCss('demos.css');
  assert.match(css, /\.vs-like\s*\{[^}]*display:\s*block;[^}]*font-weight:\s*400;/);
});

test('without JavaScript the opening is one column, since there is no chart to sit beside the headline', () => {
  const head = html.slice(0, html.indexOf('</head>'));
  const mark = head.indexOf("<script>document.documentElement.classList.add('js');</script>");
  assert.ok(mark > 0 && mark < head.indexOf('<link rel="stylesheet"'), 'the page says it has JavaScript before it is first drawn');
  assert.doesNotMatch(head, /<noscript>/, 'no <noscript> in the head: the load-failure message reads the first one on the page');
  const css = readCss('base.css');
  assert.match(css, /html:not\(\.js\) \.hero-inner\s*\{\s*grid-template-columns:\s*minmax\(0, 1fr\);\s*grid-template-areas:\s*"text"\s*"facts";/);
  assert.match(css, /html:not\(\.js\) \.race-wrap\s*\{\s*display:\s*none;/);
  assert.match(html, /if \(empty\.length === mounts\.length\) \{\s*document\.documentElement\.classList\.remove\('js'\);/, 'and takes it back if nothing loaded');
});

test('the header stays on one row: a long chip is cut short at its tail', () => {
  const el = document.createElement('a');
  const store = createStore({ ...DEFAULT_SELECTION });
  mountMine(el, store, data);
  assert.equal(el.querySelector('.mine-tail').textContent, 'by 2029');
  const css = readCss('base.css');
  const wide = css.slice(css.indexOf('@media (min-width: 1040px)', css.indexOf('.mine-label')));
  assert.match(wide.slice(0, 700), /\.site-header\s*\{\s*flex-wrap:\s*nowrap;/);
  assert.match(wide.slice(0, 700), /\.mine-tail\s*\{[^}]*text-overflow:\s*ellipsis;/);
});

// ---------- state ----------

const { SCALES, DEAL } = data;
const NOW = '2026-11';
const lecturer = { ...DEFAULT_SELECTION, touched: true, sector: 'tu', gradeId: 'lect', pointIndex: 4, typed: null };
const by2029 = (salary) => `€${Math.round(finalSalary(salary, DEAL.steps, { includeLB: false })).toLocaleString('en-IE')}`;

function mount(mod, selection = {}, now = NOW) {
  const root = document.createElement('div');
  document.body.append(root);
  const store = createStore({ ...DEFAULT_SELECTION, ...selection });
  mod.render(root, { store, data, now });
  const fire = (el, type = 'change') => el.dispatchEvent({ type, bubbles: true });
  const pick = (id, value) => { const el = root.querySelector(id); el.value = String(value); fire(el); };
  const radio = (name, value) => { const el = root.querySelectorAll(`input[name="${name}"]`).find((r) => r.value === value); el.checked = true; fire(el); };
  return { root, store, pick, radio, fire };
}

test('the store: clearing replaces everything and tells the sections it was a reset', () => {
  const store = createStore({ ...lecturer, scenario: 'higher' });
  const seen = [];
  store.subscribe((sel, meta) => seen.push([sel.sector, Boolean(meta?.reset)]));
  store.set({ pointIndex: 5 });
  store.reset({ ...DEFAULT_SELECTION });
  assert.deepEqual(seen, [['tu', false], ['any', true]]);
  assert.deepEqual(store.get(), { ...DEFAULT_SELECTION });
});

test('chapter 1: the salary box always shows the salary the figures use', () => {
  const { root, store, pick } = mount(yourPay);
  pick('#pp-sector', 'primary');
  pick('#pp-sector', 'any'); // back to no job: the point's salary stays, as a salary on its own
  assert.equal(store.get().typed, 45833);
  assert.equal(root.querySelector('.pay-big .from').textContent, '€45,833');
  assert.equal(root.querySelector('#pp-typed').value, '45833', 'not the 60000 it opened with');
  // the box is left alone while the reader is typing in it
  const box = root.querySelector('#pp-typed');
  box.focus();
  box.value = '52,000';
  box.dispatchEvent({ type: 'input', bubbles: true });
  assert.deepEqual([store.get().typed, box.value], [52000, '52,000']);
});

test('chapter 1: part-time, or a share of full time, on the example salary is still the example', () => {
  const { root, store, pick, radio } = mount(yourPay);
  radio('pp-contract', 'part');
  const fte = root.querySelector('#pp-fte');
  fte.value = '50';
  fte.dispatchEvent({ type: 'input', bubbles: true });
  assert.deepEqual([store.get().contract, store.get().fte, store.get().touched], ['part', 0.5, false]);
  assert.match(mineText(store.get(), data).label, /^Example: /);
  assert.equal(root.querySelector('.example-badge').hidden, false);
  pick('#pp-sector', 'nurse'); // so a job chosen next starts on its own scale, not on "a typed 60000"
  assert.deepEqual([store.get().gradeId, store.get().touched], ['nm-enhanced', true]);
});

test('the month a point was given moves only when the job, grade or point is chosen', () => {
  const given = { ...lecturer, pointMonth: '2026-08', incrementMonth: 12 };
  const top = mount(hero, given);
  top.pick('#race-inc', 9);
  assert.deepEqual([top.store.get().incrementMonth, top.store.get().pointMonth], [9, '2026-08'], 'a different increment month does not re-date the point');
  top.pick('#race-point', 5);
  assert.equal(top.store.get().pointMonth, NOW);

  const one = mount(yourPay, given);
  one.radio('pp-contract', 'part');
  const fte = one.root.querySelector('#pp-fte');
  fte.value = '80';
  fte.dispatchEvent({ type: 'input', bubbles: true });
  assert.deepEqual([one.store.get().fte, one.store.get().pointMonth], [0.8, '2026-08'], 'nor does anything else about the job');
  one.pick('#pp-point', 6);
  assert.equal(one.store.get().pointMonth, NOW);
  one.store.set({ pointMonth: '2026-08' });
  one.pick('#pp-grade', 'sl1');
  assert.equal(one.store.get().pointMonth, NOW, 'a new grade is a new statement of where the reader stands');
});

test('a new job starts without an increment month: the old job’s month says nothing about it', () => {
  assert.equal(sectorPatch({ ...lecturer, incrementMonth: 9 }, SCALES, 'garda').incrementMonth, null);
  const { store, pick } = mount(hero, { ...lecturer, incrementMonth: 9 });
  pick('#race-job', 'nurse');
  assert.deepEqual([store.get().sector, store.get().incrementMonth], ['nurse', null]);
});

test('the opening chart: choosing in the pickers leaves the lowest-point comparison', () => {
  const { root, pick } = mount(hero, lecturer);
  const euro = () => root.querySelector('.race-tile.euro b').textContent;
  const [, lowest] = root.querySelectorAll('.race-picks button');
  lowest.click();
  assert.deepEqual([euro(), lowest.getAttribute('aria-pressed')], [by2029(47572), 'true']);
  pick('#race-point', 9);
  assert.deepEqual([euro(), lowest.getAttribute('aria-pressed')], [by2029(SCALES.grades.find((g) => g.id === 'lect').points[9].value), 'false'],
    'the figures are for the point just chosen');
  lowest.click();
  document.dispatchEvent({ type: 'presentchange' }); // Present mode hides the two buttons and the line that names the comparison
  assert.equal(lowest.getAttribute('aria-pressed'), 'false', 'so it shows what the pickers say');
});

test('the opening chart: a half-made choice is dropped when the job is un-chosen or the choices are cleared', () => {
  const { root, store, pick } = mount(hero);
  const state = () => [root.querySelector('#race-job').value, root.querySelector('#race-grade').value, root.querySelector('#race-grade').disabled, root.querySelector('#race-point').disabled];
  pick('#race-job', 'nurse');
  pick('#race-grade', 'cnm2');
  assert.deepEqual(state(), ['nurse', 'cnm2', false, false]);
  store.reset({ ...DEFAULT_SELECTION }); // "Clear my choices" in chapter 1
  assert.deepEqual(state(), ['', '', true, true]);
  pick('#race-job', 'nurse');
  pick('#race-grade', 'cnm2');
  pick('#race-job', ''); // back to "Choose your job"
  assert.deepEqual(state(), ['', '', true, true], 'no grade without a job');
  assert.equal(store.get().touched, false);
});

test('chapter 1: "Clear my choices" is a reset, and the tick box follows the store', () => {
  const { root, store } = mount(yourPay, { ...lecturer, remember: true });
  const box = root.querySelector('#pp-remember');
  assert.equal(box.checked, true);
  store.set({ remember: false }); // another tab unticked it
  assert.equal(box.checked, false);
  let reset = false;
  store.subscribe((_sel, meta) => { reset = Boolean(meta?.reset); });
  root.querySelectorAll('button').find((b) => b.textContent === 'Clear my choices').click();
  assert.equal(reset, true);
  assert.deepEqual(store.get(), { ...DEFAULT_SELECTION });
});

test('chapter 2: a path chosen on the opening chart replaces a figure of your own, and clearing drops it', () => {
  const { root, store, radio } = mount(pvp);
  const checked = () => root.querySelectorAll('input[name="pvp-mode"]').filter((r) => r.checked).map((r) => r.value);
  const slider = root.querySelector('#pvp-rate');
  const own = () => { radio('pvp-mode', 'own'); slider.value = '5.5'; slider.dispatchEvent({ type: 'input', bubbles: true }); };
  own();
  assert.deepEqual(checked(), ['own']);
  assert.match(root.querySelector('.pvp-source').textContent, /^Prices here rise by 5\.5% a year/);
  store.set({ scenario: 'higher' }); // the pessimistic button on the opening chart
  assert.deepEqual([checked(), slider.closest('.field').hidden], [['higher'], true]);
  assert.match(root.querySelector('.pvp-source').textContent, /^Prices here are an illustration/);
  own();
  store.set({ includeLB: true }); // something else changing leaves the reader's own figure alone
  assert.deepEqual(checked(), ['own']);
  store.reset({ ...DEFAULT_SELECTION });
  assert.deepEqual([checked(), slider.closest('.field').hidden, slider.value], [['central'], true, '3']);
});
