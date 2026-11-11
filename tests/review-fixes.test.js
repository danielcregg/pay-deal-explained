// Regression tests for the final review's findings (see the ledger's "Final:" lines).
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as data from '../site/js/data.js';
import { clampFte, figuresFor } from '../site/js/selection.js';
import { LECTURER_EXAMPLE as D0 } from './helpers/selections.js';
import { model as yourPay } from '../site/js/sections/your-pay.js';
import { model as backPay } from '../site/js/sections/back-pay.js';
import { model as payVsPrices, readoutText } from '../site/js/sections/pay-vs-prices.js';
import { model as stairs, summaryNumbers } from '../site/js/sections/staircase.js';
import { LECTURER_NOTE } from '../site/js/sections/flat-or-percent.js';
import { splitRounded, roundedGain } from '../site/js/format.js';
import { resolvePay } from '../site/js/selection.js';

const read = (p) => readFileSync(new URL(`../site/${p}`, import.meta.url), 'utf8');

test('F1: the main result says gross and no increments', () => {
  const m = yourPay(D0, data);
  assert.match(m.caveat, /gross/i);
  assert.match(m.caveat, /increments/i);
});

test('F2: figures outside section 1 say whose they are', () => {
  assert.equal(figuresFor(D0, data.SCALES), 'Example: Lecturer, point 5. Pick your own job, grade and point at the top of the page.');
  assert.equal(figuresFor({ ...D0, touched: true, gradeId: 'al-ne', pointIndex: 0 }, data.SCALES), 'Showing: Assistant Lecturer (joined 2011 or later), point 1.');
  assert.equal(figuresFor({ ...D0, touched: true, contract: 'part', fte: 0.5 }, data.SCALES), 'Showing: Lecturer, point 5, 50% of full-time.');
});

test('F3: part-time and hourly results are labelled as assumptions', () => {
  assert.match(yourPay({ ...D0, contract: 'hourly' }, data).notes.join(' '), /Based on how hourly rates were set in the 2026 pay circulars/);
  assert.match(yourPay({ ...D0, contract: 'part', fte: 0.5 }, data).notes.join(' '), /assumed/i);
  assert.deepEqual(yourPay(D0, data).notes, []);
  assert.doesNotMatch(read('js/sections/your-pay.js'), /so it gets the flat minimums too/);
  assert.match(LECTURER_NOTE, /going by how hourly rates were set/);
});

test('F4: hourly back pay discloses the even-spread assumption', () => {
  assert.match(backPay({ ...D0, contract: 'hourly', hoursPerYear: 315 }, data).note, /spread evenly/);
  assert.equal(backPay(D0, data).note, null);
  assert.ok(data.ASSUMPTIONS.some((a) => /spread evenly/.test(a)));
});

test('F5: the compounding demo explains the headline, not "your pay"', () => {
  assert.doesNotMatch(read('js/sections/compounding.js'), /What your pay actually gains/);
  assert.doesNotMatch(read('index.html'), /Your pay grows by a little more/);
});

test('F6: pay vs prices is framed neutrally and as a projection', () => {
  const m = payVsPrices(100000, data.DEAL.steps, data.INFLATION, { includeLB: false });
  assert.match(readoutText(m, null), /^On the Central Bank’s forecasts, by March 2029 your pay would buy about 2\.5% more than in July 2026\./);
  const m6 = payVsPrices(100000, data.DEAL.steps, data.INFLATION, { includeLB: false, flatRate: 6 });
  assert.match(readoutText(m6, 6), /^If prices rose by 6\.0% a year, by March 2029 your pay would buy about 6\.1% less/);
  assert.doesNotMatch(read('index.html'), /only helps/);
  assert.match(read('js/sections/pay-vs-prices.js'), /1 July 2026 = 100/);
});

test('F7: the glossary makes no unsourced claim about how ratification works', () => {
  const ratification = data.GLOSSARY.find((g) => g.id === 'ratification').text;
  assert.doesNotMatch(ratification, /combined|meets to/);
});

test('F8: on-screen sums add up', () => {
  const four = splitRounded(Array(4).fill(599.29 / 4));
  assert.equal(four.reduce((a, b) => a + b, 0), 599);
  assert.ok(four.every((v) => v === 149 || v === 150));
  assert.equal(splitRounded(Array(6).fill(898.94 / 6)).reduce((a, b) => a + b, 0), 899);
  assert.equal(roundedGain(100.6, 200.4), 99);
  for (let pctFte = 1; pctFte <= 100; pctFte++) {
    const sel = { ...D0, touched: true, contract: 'part', fte: pctFte / 100 };
    const one = yourPay(sel, data);
    const pay = resolvePay(sel, data.SCALES);
    const two = summaryNumbers(pay, stairs(pay.base, data.DEAL.steps, { includeLB: false }));
    assert.equal(two.gain, roundedGain(one.now, one.endGeneral), `FTE ${pctFte}%`);
  }
});

test('F11: FTE typed as a fraction (0.5) means half-time', () => {
  assert.deepEqual([clampFte('0.5'), clampFte(0.25), clampFte(1), clampFte('50')], [0.5, 0.25, 1, 0.5]);
});

test('F12: section intros describe what is actually shown', () => {
  const html = read('index.html');
  assert.doesNotMatch(html, /your salary climbing/);
  const anyConfirmed = data.BEYOND_PAY.some((b) => b.status === 'known');
  if (!anyConfirmed) assert.doesNotMatch(html.split('id="beyond-pay-h"')[1].split('</p>')[0], /confirmed/i);
});
