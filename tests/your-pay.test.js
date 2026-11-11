import test from 'node:test';
import assert from 'node:assert/strict';
import * as data from '../site/js/data.js';
import { DEFAULT_SELECTION as D0, resolvePay, figuresFor } from '../site/js/selection.js';
import { model } from '../site/js/sections/your-pay.js';

const near = (a, b, t = 0.01) => assert.ok(Math.abs(a - b) <= t, `${a} ≉ ${b}`);

test('example lecturer, local bargaining off by default', () => {
  const m = model(D0, data);
  near(m.now, 89894); near(m.endGeneral, 99037.31); near(m.endWithLB, 100027.68);
  near(m.pctGeneral, 10.17); near(m.pctWithLB, 11.27); near(m.firstRise.amount, 1797.88); near(m.backPay, 599.29);
  assert.deepEqual([m.isExample, m.flatSteps, m.firstRise.date], [true, [], '2026-09-01']);
  assert.match(m.explanation, /percentages/);
});

test('top of the Lecturer scale, counted three ways (the €119,000 and €121,000 question)', () => {
  const m = model({ ...D0, touched: true, gradeId: 'lect', pointIndex: 10 }, data);
  near(m.now, 107727);
  // Two questions, four answers: is the 1% due in 2029 counted, and the 1% owed since 2025?
  assert.deepEqual(m.scenarios.map((s) => s.id), ['general', 'lb', 'owed', 'both']);
  near(m.scenarios[0].end, 118684.14); // the eight general rises
  near(m.scenarios[1].end, 119870.98); // plus the 1% local bargaining due on 1 March 2029
  near(m.scenarios[2].end, 119870.98); // or plus the 1% owed since 1 September 2025 instead
  near(m.scenarios[3].end, 121069.69); // or both, with the new rises built on the owed 1%
  near(m.scenarios[3].pct, 12.39);
  assert.equal(m.active, 'general');
  assert.match(m.owed.note, /1 June 2026/);
  const paid = { ...data, SCALES: { ...data.SCALES, sectors: data.SCALES.sectors.map((s) => ({ ...s, owed: undefined })) } };
  assert.deepEqual(model(D0, paid).scenarios.map((s) => s.id), ['general', 'lb']);
});

test('counting the 1% owed since September 2025 lifts the starting point for the whole page', () => {
  const sel = { ...D0, touched: true, gradeId: 'lect', pointIndex: 10, includeOwed: true };
  const pay = resolvePay(sel, data.SCALES);
  assert.equal(pay.published, 107727);
  near(pay.base, 108804.27);
  const m = model(sel, data);
  near(m.published, 107727); near(m.now, 108804.27);
  near(m.endGeneral, 119870.98); near(m.endWithLB, 121069.69);
  assert.equal(m.active, 'owed');
  assert.equal(model({ ...sel, includeLB: true }, data).active, 'both');
  assert.equal(figuresFor(sel, data.SCALES), 'Showing: Lecturer, point 11, with the 1% owed since September 2025.');
});

test('the result says what the rise is worth after forecast inflation', () => {
  near(model(D0, data).real, 2.52);
  assert.ok(model({ ...D0, gradeId: 'al-ne', pointIndex: 0 }, data).real > 3.9, 'the flat minimums help the lowest point more');
});

test('assistant lecturer, typed, part-time and hourly', () => {
  assert.deepEqual(model({ ...D0, gradeId: 'al-ne', pointIndex: 0 }, data).flatSteps, [1, 3, 4, 6, 9]);
  assert.match(model({ ...D0, gradeId: 'typed', typed: 58000 }, data).explanation, /steps 1 and 3/);
  near(model({ ...D0, contract: 'part', fte: 0.5 }, data).endGeneral, 49518.65);
  const h = model({ ...D0, contract: 'hourly', alScale: 'al-ne', hoursPerYear: 0 }, data);
  near(h.now, 75.5111, 1e-4); near(h.endGeneral, 84.3428, 1e-4);
  assert.deepEqual([h.unit, h.backPay], ['hour', null]);
});
