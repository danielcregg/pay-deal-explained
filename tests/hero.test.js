import test from 'node:test';
import assert from 'node:assert/strict';
import * as data from '../site/js/data.js';
import { monthOffset, model, stateAt, whenText, forecastText, payThen } from '../site/js/sections/hero.js';

const near = (a, b, t = 0.01) => assert.ok(Math.abs(a - b) <= t, `${a} ≉ ${b}`);

test('months into the deal', () => {
  assert.equal(monthOffset('2026-09-01', '2026-07'), 2);
  near(monthOffset('2029-03-02', '2026-07'), 32 + 1 / 31, 1e-9);
});

test('the race: pay steps against the price curve, for a salary of €60,000 or more', () => {
  const m = model(89894, data, { includeLB: false });
  assert.equal(m.months, 33);
  assert.equal(m.steps.length, 8); // local bargaining is not counted
  assert.deepEqual(m.steps.slice(0, 3).map((s) => s.at), [2, 9, 13]);
  assert.equal(m.price.length, 34); // 1 July 2026, then the end of each month
  const start = stateAt(m, 0);
  assert.deepEqual([start.pay, start.price, start.real], [100, 100, 0]);
  const autumn = stateAt(m, 15.5); // three rises in, before the 1.5%
  near(autumn.pay, 104.05);
  assert.ok(autumn.price > autumn.pay, 'prices are ahead in October 2027');
  const end = stateAt(m, 33);
  near(end.pay, 110.17); near(end.price, 107.47); near(end.real, 2.52);
});

test('the race: the flat minimums lift the lowest lecturing point further', () => {
  const m = model(47572, data, { includeLB: false });
  near(stateAt(m, 33).pay, 111.70);
  assert.equal(m.steps[0].flat, true);
});

test('the race: counting local bargaining adds its step on 1 March 2029', () => {
  const m = model(89894, data, { includeLB: true });
  assert.equal(m.steps.length, 9);
  near(stateAt(m, 33).pay, 111.27);
});

test('the race: the play head names the month it is in, and the forecasts are spelled out', () => {
  assert.equal(whenText(0, '2026-07', 33), 'Starting line: 1 July 2026');
  assert.equal(whenText(2.5, '2026-07', 33), 'In September 2026');
  assert.equal(whenText(12, '2026-07', 33), 'In June 2027'); // a whole month on the slider: the month just completed
  assert.equal(whenText(32, '2026-07', 33), 'In February 2029');
  assert.equal(whenText(33, '2026-07', 33), 'By the end of March 2029');
  assert.equal(forecastText(data.INFLATION), '3.4% in 2026, 3.1% in 2027 and 2% in 2028, with 2029 assumed at 2%');
});

test('the race: pay in euro at any month', () => {
  const m = model(107727, data, { includeLB: false });
  assert.equal(m.base, 107727);
  near(payThen(m, 0), 107727);
  near(payThen(m, 12), 110980.36); // June 2027: after the 2% of September 2026 and the 1% of April 2027
  near(payThen(m, 33), 118684.14);
});
