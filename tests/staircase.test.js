import test from 'node:test';
import assert from 'node:assert/strict';
import { DEAL } from '../site/js/data.js';
import { model } from '../site/js/sections/staircase.js';

const near = (a, b, t = 0.01) => assert.ok(Math.abs(a - b) <= t, `${a} ≉ ${b}`);

test('lecturer bars, local bargaining shown as possible', () => {
  const m = model(89894, DEAL.steps, { includeLB: false });
  assert.deepEqual(m.bars.map((b) => b.kind), ['pct', 'pct', 'pct', 'pct', 'pct', 'pct', 'pct', 'lb-possible', 'pct']);
  near(m.bars[7].potential, 978.15); near(m.total, 9143.31); near(m.totalWithLB, 10133.68);
  assert.equal(m.bars[0].month, '2026-09');
});

test('assistant lecturer bars show the flat minimums', () => {
  assert.deepEqual(model(47572, DEAL.steps, { includeLB: true }).bars.map((b) => b.kind),
    ['flat', 'pct', 'flat', 'flat', 'pct', 'flat', 'pct', 'lb', 'flat']);
});
