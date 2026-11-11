import test from 'node:test';
import assert from 'node:assert/strict';
import { DEAL } from '../site/js/data.js';
import { model } from '../site/js/sections/compounding.js';

const near = (a, b, t = 1e-4) => assert.ok(Math.abs(a - b) <= t, `${a} ≉ ${b}`);

test('headline sums vs compounded totals', () => {
  const m = model(DEAL.steps);
  assert.deepEqual([m.withLB.sum, m.general.sum], [10.75, 9.75]);
  near(m.withLB.compounded, 11.2729); near(m.general.compounded, 10.1712);
  near(m.withLB.blocks[0].add, 2); near(m.withLB.blocks[1].add, 1.02); near(m.withLB.blocks[8].total, 111.2729);
});
