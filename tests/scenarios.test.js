// Inflation scenarios: the Central Bank's forecast by default, with a lower and a higher
// path as labelled illustrations, switched from either pay-against-prices chart.
import test from 'node:test';
import assert from 'node:assert/strict';
import { installDom } from './helpers/dom.js';
import * as data from '../site/js/data.js';
import { restoreSelection, scenarioOf } from '../site/js/selection.js';
import { LECTURER_EXAMPLE as D0 } from './helpers/selections.js';
import { createStore } from '../site/js/state.js';
import * as hero from '../site/js/sections/hero.js';
import * as yourPay from '../site/js/sections/your-pay.js';
import * as payVsPrices from '../site/js/sections/pay-vs-prices.js';

const document = installDom();
const { INFLATION, SCALES, DEAL } = data;
const near = (a, b, t = 0.01) => assert.ok(Math.abs(a - b) <= t, `${a} ≉ ${b}`);
const scenario = (id) => INFLATION.scenarios.find((s) => s.id === id);
const source = (id) => data.SOURCES.find((s) => s.id === id);

test('scenarios: the Central Bank forecast is the default, with a lower and a higher illustration', () => {
  assert.deepEqual(INFLATION.scenarios.map((s) => s.id), ['lower', 'central', 'higher']);
  assert.equal(INFLATION.defaultScenario, 'central');
  assert.deepEqual(scenario('central').rates, { 2026: 3.4, 2027: 3.1, 2028: 2, 2029: 2 });
  assert.deepEqual(scenario('central').rates, INFLATION.rates);
  assert.deepEqual(scenario('lower').rates, { 2026: 3.4, 2027: 2, 2028: 2, 2029: 2 });
  assert.deepEqual(scenario('higher').rates, { 2026: 4, 2027: 4, 2028: 4, 2029: 4 });
  assert.deepEqual(INFLATION.scenarios.map((s) => s.label), ['Optimistic: 2%', 'Central Bank', 'Pessimistic: 4%']);
  for (const id of ['lower', 'higher']) assert.match(scenario(id).note, /an illustration, not a forecast/, `${id} is not passed off as a forecast`);
  assert.doesNotMatch(scenario('central').note, /illustration/);
  assert.match(scenario('central').note, /2029 assumed at 2%/);
  for (const s of INFLATION.scenarios) {
    assert.ok(s.lead && s.phrase && s.note, `${s.id} has its wording`);
    for (const id of s.sourceIds) assert.ok(source(id), `${s.id} cites ${id}`);
  }
  assert.equal(INFLATION.current, 4);
  assert.match(source('cso-hicp-oct2026').title, /October 2026/);
  assert.equal(INFLATION.sourceId, 'cbi-qb3-2026', 'the forecasts are cited to the Central Bank itself');
});

test('scenarios: what other institutions forecast is listed, with its source', () => {
  const rows = Object.fromEntries(INFLATION.others.map((o) => [o.who, o]));
  assert.deepEqual(Object.keys(rows), ['IMF', 'ESRI', 'European Commission']);
  assert.deepEqual(rows.IMF.rates, { 2026: 3.4, 2027: 2.8, 2028: 1.9, 2029: 2 });
  assert.deepEqual(rows.ESRI.rates, { 2026: 3.6, 2027: 3.3 });
  assert.deepEqual(rows['European Commission'].rates, { 2026: 3.5, 2027: 2.6 });
  for (const o of INFLATION.others) assert.ok(source(o.sourceId)?.url.startsWith('https://'), o.who);
  assert.match(rows.ESRI.what, /CPI/);
});

test('scenarios: the choice is saved with the others, and an unknown one falls back to the Central Bank', () => {
  assert.equal(D0.scenario, 'central');
  assert.equal(scenarioOf(D0, INFLATION).id, 'central');
  const saved = (patch) => JSON.stringify({ ...D0, touched: true, remember: true, ...patch });
  assert.equal(restoreSelection(saved({ scenario: 'higher' }), SCALES).scenario, 'higher');
  const odd = restoreSelection(saved({ scenario: 'doom' }), SCALES);
  assert.deepEqual([odd.scenario, odd.touched, odd.gradeId], ['central', true, D0.gradeId], 'the rest of what was remembered is kept');
  const old = JSON.stringify({ touched: true, remember: true, sector: 'tu', contract: 'full', gradeId: 'lect', pointIndex: 2, typed: null, fte: 1, alScale: 'al-ne', hoursPerYear: 0, includeLB: false, payMonth: '2027-01' });
  assert.equal(restoreSelection(old, SCALES).scenario, 'central');
});

test('scenarios: prices by March 2029, and what a salary of €60,000 or more then buys', () => {
  const end = (id) => hero.stateAt(hero.model(89894, data, { includeLB: false, rates: scenario(id).rates }), 33);
  near(end('lower').price, 100 * 1.034 ** 0.5 * 1.02 ** 2.25, 1e-9);
  near(end('central').price, 107.47);
  near(end('higher').price, 100 * 1.04 ** 2.75, 1e-9);
  near(end('lower').real, 3.62);
  near(end('central').real, 2.52);
  near(end('higher').real, -1.09);
  const behind = (id) => hero.monthsBehind(hero.model(89894, data, { includeLB: false, rates: scenario(id).rates }));
  assert.ok(behind('lower') < behind('central') && behind('central') < behind('higher'), `${behind('lower')} < ${behind('central')} < ${behind('higher')}`);
  assert.equal(behind('central'), 7);
  // chapter 2 works from the same rates
  near(payVsPrices.model(89894, DEAL.steps, INFLATION, { includeLB: false, rates: scenario('higher').rates }).real, -1.09);
});

function mountAll(selection = {}) {
  const [opening, form, two] = [0, 1, 2].map(() => { const el = document.createElement('div'); document.body.append(el); return el; });
  const store = createStore({ ...D0, ...selection });
  hero.render(opening, { store, data, now: '2026-11' });
  yourPay.render(form, { store, data, now: '2026-11' });
  payVsPrices.render(two, { store, data });
  const pick = (root, name, value) => {
    const radio = root.querySelectorAll(`input[name="${name}"]`).find((r) => r.value === value);
    for (const r of root.querySelectorAll(`input[name="${name}"]`)) r.checked = r === radio;
    radio.dispatchEvent({ type: 'change', bubbles: true });
  };
  const checked = (root, name) => root.querySelectorAll(`input[name="${name}"]`).filter((r) => r.checked).map((r) => r.value);
  return { opening, form, two, store, pick, checked };
}

test('the main chart: three buttons switch the inflation path, and every figure follows', () => {
  const { opening, form, two, store, pick, checked } = mountAll();
  const tiles = () => opening.querySelectorAll('.race-tile b').map((b) => b.textContent);
  const buttons = opening.querySelectorAll('.race-options input[name="race-prices"]');
  assert.deepEqual(buttons.map((r) => r.value), ['lower', 'central', 'higher']);
  assert.deepEqual(opening.querySelectorAll('.race-options .prices-seg .pill').map((p) => p.textContent), ['Optimistic: 2%', 'Central Bank', 'Pessimistic: 4%']);
  assert.deepEqual(checked(opening, 'race-prices'), ['central']);
  assert.deepEqual(tiles().slice(2), ['+7.5%', '2.5% more']);
  assert.match(opening.querySelector('.race-source').textContent, /^Prices follow the Central Bank of Ireland’s forecasts/);

  pick(opening, 'race-prices', 'higher');
  assert.equal(store.get().scenario, 'higher');
  assert.equal(store.get().touched, false, 'a way of looking at it, not a choice about the reader');
  assert.deepEqual(tiles(), ['€99,037', '+10.2%', '+11.4%', '1.1% less']);
  assert.match(opening.querySelector('.race-source').textContent, /an illustration, not a forecast: prices keep rising by 4% a year/);
  const behind = hero.monthsBehind(hero.model(89894, data, { includeLB: false, rates: scenario('higher').rates }));
  assert.equal(opening.querySelector('.race-legend').textContent, `Prices are ahead of pay in ${behind} of the 33 months`);
  // the same choice shows in chapter 2 and in the pay panel
  assert.deepEqual(checked(two, 'pvp-mode'), ['higher']);
  assert.match(two.querySelector('.pvp-readout').textContent, /^If prices kept rising by 4% a year, by March 2029 your pay would buy about 1\.1% less than in July 2026\./);
  assert.match(form.querySelector('.pay-real').textContent, /^After inflation on the pessimistic path \(4% a year\), that would buy about 1\.1% less than in July 2026/);

  pick(two, 'pvp-mode', 'lower');
  assert.equal(store.get().scenario, 'lower');
  assert.deepEqual(checked(opening, 'race-prices'), ['lower']);
  assert.deepEqual(tiles().slice(2), ['+6.3%', '3.6% more']);
  assert.match(form.querySelector('.pay-real').textContent, /^After inflation on the optimistic path \(2% a year from 2027\), that would buy about 3\.6% more/);
});

test('chapter 2: your own figure is still there, and the other forecasts are listed', () => {
  const { two, store, pick, checked } = mountAll();
  assert.deepEqual(two.querySelectorAll('input[name="pvp-mode"]').map((r) => r.value), ['lower', 'central', 'higher', 'own']);
  assert.deepEqual(checked(two, 'pvp-mode'), ['central']);
  const slider = two.querySelector('#pvp-rate').closest('.field');
  assert.equal(slider.hidden, true);
  pick(two, 'pvp-mode', 'own');
  assert.equal(slider.hidden, false);
  assert.equal(store.get().scenario, 'central', 'trying a figure does not change the saved path');
  assert.match(two.querySelector('.pvp-readout').textContent, /^If prices rose by 3\.0% a year/);
  pick(two, 'pvp-mode', 'higher');
  assert.equal(slider.hidden, true);
  assert.equal(store.get().scenario, 'higher');
  const rows = two.querySelectorAll('.pvp-others tbody tr').map((tr) => tr.querySelectorAll('th, td').map((c) => c.textContent));
  assert.deepEqual(rows[0], ['Central Bank of Ireland, September 2026', '3.4%', '3.1%', '2.0%', 'not given']);
  assert.deepEqual(rows[1], ['IMF, World Economic Outlook, October 2026', '3.4%', '2.8%', '1.9%', '2.0%']);
  assert.equal(rows.length, 4);
  assert.match(two.querySelector('.pvp-others').textContent, /sit close together/);
  assert.match(two.textContent, /Prices rose 4\.0% in the year to October 2026/);
  assert.doesNotMatch(two.textContent, /as reported by RTÉ/);
});

test('copy: the assumptions name the forecast’s own source and say what the other two paths are', () => {
  assert.ok(data.ASSUMPTIONS.some((a) => /Central Bank of Ireland’s forecasts for 2026 to 2028 \(Quarterly Bulletin, September 2026\)/.test(a) && /illustrations, not forecasts/.test(a)));
  assert.ok(!data.ASSUMPTIONS.some((a) => /as reported by RTÉ/.test(a)));
});
