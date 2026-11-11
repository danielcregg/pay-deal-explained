import test from 'node:test';
import assert from 'node:assert/strict';
import { DEAL, INFLATION } from '../site/js/data.js';
import { model } from '../site/js/sections/pay-vs-prices.js';

const near = (a, b, t = 0.01) => assert.ok(Math.abs(a - b) <= t, `${a} ≉ ${b}`);

test('real pay by March 2029 under forecasts and flat rates', () => {
  const m = model(100000, DEAL.steps, INFLATION, { includeLB: false });
  near(m.real, 2.52);
  assert.deepEqual(m.ahead, ['2026-07', '2026-08', '2027-02', '2027-03', '2027-06', '2027-07', '2027-10']);
  near(model(100000, DEAL.steps, INFLATION, { includeLB: true }).real, 3.54);
  near(model(100000, DEAL.steps, INFLATION, { includeLB: false, flatRate: 0 }).real, 10.17);
  near(model(100000, DEAL.steps, INFLATION, { includeLB: false, flatRate: 6 }).real, -6.14);
});
