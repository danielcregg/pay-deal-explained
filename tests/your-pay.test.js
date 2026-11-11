import test from 'node:test';
import assert from 'node:assert/strict';
import * as data from '../site/js/data.js';
import { DEFAULT_SELECTION as D0 } from '../site/js/selection.js';
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
  assert.deepEqual(m.scenarios.map((s) => s.id), ['general', 'lb', 'owed']);
  near(m.scenarios[0].end, 118684.14); // the eight general rises
  near(m.scenarios[1].end, 119870.98); // plus the 1% local bargaining due on 1 March 2029
  near(m.scenarios[2].end, 121069.69); // plus the 1% owed since 1 September 2025, with the rises built on it
  near(m.scenarios[2].pct, 12.39);
  assert.match(m.scenarios[2].label, /1 September 2025/);
  assert.match(m.scenarioNote, /1 June 2026/);
  const paid = { ...data, PREVIOUS_DEAL: { ...data.PREVIOUS_DEAL, lbOutstanding: false } };
  assert.deepEqual(model(D0, paid).scenarios.map((s) => s.id), ['general', 'lb']);
});

test('assistant lecturer, typed, part-time and hourly', () => {
  assert.deepEqual(model({ ...D0, gradeId: 'al-ne', pointIndex: 0 }, data).flatSteps, [1, 3, 4, 6, 9]);
  assert.match(model({ ...D0, gradeId: 'typed', typed: 58000 }, data).explanation, /steps 1 and 3/);
  near(model({ ...D0, contract: 'part', fte: 0.5 }, data).endGeneral, 49518.65);
  const h = model({ ...D0, contract: 'hourly', alScale: 'al-ne', hoursPerYear: 0 }, data);
  near(h.now, 75.5111, 1e-4); near(h.endGeneral, 84.3428, 1e-4);
  assert.deepEqual([h.unit, h.backPay], ['hour', null]);
});
