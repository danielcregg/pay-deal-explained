import test from 'node:test';
import assert from 'node:assert/strict';
import * as data from '../site/js/data.js';
import { DEFAULT_SELECTION as D0 } from '../site/js/selection.js';
import { model } from '../site/js/sections/back-pay.js';

const near = (a, b, t = 0.01) => assert.ok(Math.abs(a - b) <= t, `${a} ≉ ${b}`);

test('back pay by pay month, part-time and hourly (Review Focus 2)', () => {
  const m = model(D0, data);
  assert.deepEqual(m.items.map((i) => i.month), ['2026-09', '2026-10', '2026-11', '2026-12']);
  near(m.total, 599.29);
  near(model({ ...D0, payMonth: '2027-03' }, data).total, 898.94);
  near(model({ ...D0, contract: 'part', fte: 0.5 }, data).total, 299.65);
  assert.deepEqual([model({ ...D0, contract: 'hourly', hoursPerYear: 0 }, data).needsHours, model({ ...D0, contract: 'hourly', hoursPerYear: 0 }, data).total], [true, 0]);
  near(model({ ...D0, contract: 'hourly', alScale: 'al-ne', hoursPerYear: 315 }, data).total, 200);
});
