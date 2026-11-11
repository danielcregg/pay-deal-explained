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

test('assistant lecturer, typed, part-time and hourly', () => {
  assert.deepEqual(model({ ...D0, gradeId: 'al-ne', pointIndex: 0 }, data).flatSteps, [1, 3, 4, 6, 9]);
  assert.match(model({ ...D0, gradeId: 'typed', typed: 58000 }, data).explanation, /steps 1 and 3/);
  near(model({ ...D0, contract: 'part', fte: 0.5 }, data).endGeneral, 49518.65);
  const h = model({ ...D0, contract: 'hourly', alScale: 'al-ne', hoursPerYear: 0 }, data);
  near(h.now, 75.5111, 1e-4); near(h.endGeneral, 84.3428, 1e-4);
  assert.deepEqual([h.unit, h.backPay], ['hour', null]);
});
