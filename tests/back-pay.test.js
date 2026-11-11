import test from 'node:test';
import assert from 'node:assert/strict';
import * as data from '../site/js/data.js';
import { owedFor } from '../site/js/selection.js';
import { LECTURER_EXAMPLE as D0 } from './helpers/selections.js';
import { owedBackPay } from '../site/js/pay.js';
import { model } from '../site/js/sections/back-pay.js';
import { model as yourPay } from '../site/js/sections/your-pay.js';

const near = (a, b, t = 0.01) => assert.ok(Math.abs(a - b) <= t, `${a} ≉ ${b}`);
const TOP = { ...D0, touched: true, gradeId: 'lect', pointIndex: 10 };

test('back pay by pay month, part-time and hourly (Review Focus 2)', () => {
  const m = model(D0, data);
  assert.deepEqual(m.items.map((i) => i.month), ['2026-09', '2026-10', '2026-11', '2026-12']);
  near(m.total, 599.29);
  near(model({ ...D0, payMonth: '2027-03' }, data).total, 898.94);
  near(model({ ...D0, contract: 'part', fte: 0.5 }, data).total, 299.65);
  assert.deepEqual([model({ ...D0, contract: 'hourly', hoursPerYear: 0 }, data).needsHours, model({ ...D0, contract: 'hourly', hoursPerYear: 0 }, data).total], [true, 0]);
  near(model({ ...D0, contract: 'hourly', alScale: 'al-ne', hoursPerYear: 315 }, data).total, 200);
});

test('back pay for the 1% owed since September 2025 is 1% of the pay in force each month', () => {
  const owed = owedFor(D0, data.SCALES);
  const past = data.PREVIOUS_DEAL.steps;
  const r = owedBackPay(107727, owed, past, { payMonth: '2027-01' });
  assert.equal(r.items.length, 16); // September 2025 to December 2026
  assert.deepEqual([r.items[0].month, r.items.at(-1).month], ['2025-09', '2026-12']);
  near(r.items[0].amount, 88.00); // €105,604.35 a year then: today's point before the 1% rises of February and June 2026
  near(r.items[5].amount, 88.88); // February 2026: €106,660.40
  near(r.items.at(-1).amount, 89.77); // €107,727 from June 2026
  near(r.total, 1423.96);
  near(owedBackPay(107727, owed, past, { payMonth: '2027-03' }).total, 1423.96 + 2 * 89.7725);
  // Below €50,000 the February 2026 rise was the €500 minimum, so it is undone as €500.
  near(owedBackPay(47572, owed, past, { payMonth: '2027-01' }).items[0].amount, (47572 / 1.01 - 500) / 100 / 12);
});

test('the back pay chapter adds the 2025 back pay only when the owed 1% is counted', () => {
  assert.equal(model(TOP, data).owed, null);
  const m = model({ ...TOP, includeOwed: true }, data);
  near(m.total, 725.36); // this deal's first rise, worked out on the lifted starting point
  near(m.owed.total, 1423.96);
  assert.equal(m.owed.items.length, 16);
  near(m.grandTotal, 2149.32);
  near(model({ ...TOP, includeOwed: true, contract: 'part', fte: 0.5 }, data).owed.total, 711.98);
});

test('section 1 reports both parts of the back pay when the owed 1% is counted', () => {
  assert.equal(yourPay(TOP, data).backPayOwed, null);
  near(yourPay({ ...TOP, includeOwed: true }, data).backPayOwed, 1423.96);
});
