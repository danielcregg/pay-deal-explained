import test from 'node:test';
import assert from 'node:assert/strict';
import { DEAL } from '../site/js/data.js';
import { model, sliderStart } from '../site/js/sections/flat-or-percent.js';

test('€58,000: flat sums win at two of five steps', () => {
  const m = model(58000, DEAL.steps, { includeLB: false });
  assert.deepEqual([m.flatCount, m.floorCount], [2, 5]);
  assert.deepEqual(m.rows.map((r) => r.tag), ['flat', null, 'flat', 'pct', null, 'pct', null, null, 'pct']);
  assert.deepEqual([m.rows[0].rule, m.rows[1].rule, m.rows[7].rule, m.rows[7].included], ['2% or €1,200', '1%', 'Local bargaining (1%)', false]);
  assert.ok(Math.abs(m.end - 63944.71) <= 0.01);
});

test('slider start is clamped and rounded (Review Focus 5)', () => {
  assert.deepEqual([sliderStart(28000), sliderStart(180000), sliderStart(89894)], [30000, 140000, 90000]);
});
