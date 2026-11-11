import test from 'node:test';
import assert from 'node:assert/strict';
import { DEAL, PREVIOUS_DEAL, INFLATION } from '../site/js/data.js';
import { applySteps, finalSalary, summarise, compoundFactor, headlinePct, thresholdOf, backPay,
  payIndexSeries, priceIndexSeries, monthsPricesAhead } from '../site/js/pay.js';
const near = (a, b, tol = 0.01) => assert.ok(Math.abs(a - b) <= tol, `${a} ≉ ${b}`);
const S = DEAL.steps;

test('reference salaries, with and without local bargaining', () => {
  near(finalSalary(89894, S, { includeLB: true }), 100027.68);
  near(finalSalary(89894, S), 99037.31);
  near(finalSalary(47572, S, { includeLB: true }), 53659.85);
  near(finalSalary(47572, S), 53135.99);
  near(finalSalary(58000, S, { includeLB: true }), 64584.15);
  near(finalSalary(58000, S), 63944.71);
  near(finalSalary(30000, S), 35031.54);
});

test('flat minimum vs percentage at each step', () => {
  assert.deepEqual(summarise(58000, S).flatSteps, [1, 3]);
  assert.deepEqual(summarise(58000, S).floorSteps, [1, 3, 4, 6, 9]);
  assert.deepEqual(summarise(47572, S).flatSteps, [1, 3, 4, 6, 9]);
  assert.deepEqual(summarise(89894, S).flatSteps, []);
  const r = applySteps(60000, S)[0];
  assert.deepEqual([r.rise, r.flat], [1200, false]);
});

test('excluded local bargaining is reported as a possible step', () => {
  const lb = applySteps(89894, S)[7];
  assert.deepEqual([lb.n, lb.included, lb.rise, lb.after === lb.before], [8, false, 0, true]);
  near(lb.potential, 978.15);
  assert.equal(applySteps(89894, S, { upTo: '2026-09-01' }).length, 1);
});

test('compounding and headline sums', () => {
  near(compoundFactor(S, { includeLB: true }), 1.112729, 1e-6);
  near(compoundFactor(S), 1.101712, 1e-6);
  near(compoundFactor(PREVIOUS_DEAL.steps), 1.096151, 1e-6);
  near(compoundFactor(PREVIOUS_DEAL.steps, { includeLB: true }), 1.107112, 1e-6);
  assert.deepEqual([headlinePct(S, { includeLB: true }), headlinePct(S)], [10.75, 9.75]);
  assert.deepEqual(S.map(thresholdOf), [60000, null, 60000, 60000, null, 60000, null, null, 60000]);
});

test('previous deal reproduces the 2026 circulars within €1', () => {
  const only = (date) => PREVIOUS_DEAL.steps.filter((s) => s.date === date);
  assert.equal(applySteps(46601, only('2026-02-01'))[0].rise, 500);
  near(applySteps(51153, only('2026-02-01'))[0].after, 51664, 1);
  near(applySteps(47101, only('2026-06-01'))[0].after, 47572, 1);
  near(finalSalary(89894, PREVIOUS_DEAL.steps), 98537.39);
  near(finalSalary(89894, PREVIOUS_DEAL.steps, { includeLB: true }), 99522.77);
});

test('back pay accrues from September to the pay month', () => {
  const jan = backPay(89894, S);
  assert.deepEqual(jan.items.map((i) => i.month), ['2026-09', '2026-10', '2026-11', '2026-12']);
  near(jan.total, 599.29);
  near(backPay(89894, S, { payMonth: '2027-02' }).total, 749.12);
  near(backPay(89894, S, { payMonth: '2027-03' }).total, 898.94);
  near(backPay(47572, S).total, 400);
});

test('pay vs prices from July 2026 to March 2029', () => {
  const span = { from: INFLATION.from, to: INFLATION.to };
  const pay = payIndexSeries(100000, S, span);
  const price = priceIndexSeries({ ...span, rates: INFLATION.rates });
  assert.equal(pay.length, 33);
  assert.deepEqual([pay[0].month, pay[0].value, pay[2].value], ['2026-07', 100, 102]);
  near(pay.at(-1).value, 110.1712, 1e-4);
  near(price.at(-1).value, 107.4655, 1e-4);
  assert.deepEqual(monthsPricesAhead(pay, price), ['2026-07', '2026-08', '2027-02', '2027-03', '2027-06', '2027-07', '2027-10']);
  assert.deepEqual(monthsPricesAhead(payIndexSeries(47572, S, span), price), ['2026-07', '2026-08']);
  near(payIndexSeries(100000, S, { ...span, includeLB: true }).at(-1).value, 111.2729, 1e-4);
  near(priceIndexSeries({ ...span, flatRate: 6 }).at(-1).value, 117.3792, 1e-4);
  near(priceIndexSeries({ ...span, flatRate: 0 }).at(-1).value, 100, 1e-9);
});
