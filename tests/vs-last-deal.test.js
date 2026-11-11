import test from 'node:test';
import assert from 'node:assert/strict';
import * as data from '../site/js/data.js';
import { model } from '../site/js/sections/vs-last-deal.js';

const near = (a, b, t = 0.01) => assert.ok(Math.abs(a - b) <= t, `${a} ≉ ${b}`);

test('side by side for the example lecturer', () => {
  const off = model(89894, data, { includeLB: false });
  const on = model(89894, data, { includeLB: true });
  assert.deepEqual(off.deals.map((d) => [d.months, d.stepCount, d.headline, d.threshold]), [[30, 8, 10.25, 50000], [33, 9, 10.75, 60000]]);
  near(off.deals[0].compoundedPct, 9.62); near(off.deals[1].compoundedPct, 10.17);
  near(on.deals[0].compoundedPct, 10.71); near(on.deals[1].compoundedPct, 11.27);
  assert.deepEqual([off.series.previous.length, off.series.draft.length, off.series.previous[0].value], [31, 34, 100]);
  near(off.series.previous[1].value, 102.25); near(off.series.previous.at(-1).value, 109.6151, 1e-4);
  near(off.series.draft.at(-1).value, 110.1712, 1e-4);
  assert.ok(!('annualised' in off.deals[0]));
});

test('each deal counts its own local bargaining', () => {
  const m = model(89894, data, { includeLB: false, includePrevLB: true });
  near(m.deals[0].compoundedPct, 10.71); near(m.deals[1].compoundedPct, 10.17);
  const n = model(89894, data, { includeLB: true, includePrevLB: false });
  near(n.deals[0].compoundedPct, 9.62); near(n.deals[1].compoundedPct, 11.27);
});
