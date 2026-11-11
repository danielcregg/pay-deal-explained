import test from 'node:test';
import assert from 'node:assert/strict';
import { niceTicks, roundedTopPath, axisMoney } from '../site/js/chart.js';

test('nice axis ticks cover the maximum with clean steps', () => {
  assert.deepEqual(niceTicks(10700), { step: 2500, ticks: [0, 2500, 5000, 7500, 10000, 12500] });
  assert.deepEqual(niceTicks(6700), { step: 2000, ticks: [0, 2000, 4000, 6000, 8000] });
  assert.deepEqual(niceTicks(9.3), { step: 2, ticks: [0, 2, 4, 6, 8, 10] });
});

test('bars get a 4px rounded data-end and a square base', () => {
  assert.equal(roundedTopPath(0, 10, 20, 30), 'M0,40V14A4,4 0 0 1 4,10H16A4,4 0 0 1 20,14V40Z');
  assert.equal(roundedTopPath(0, 10, 20, 2), 'M0,12V12A2,2 0 0 1 2,10H18A2,2 0 0 1 20,12V12Z');
  assert.equal(roundedTopPath(0, 0, 10, 0), '');
});

test('axis money labels: full under 10,000, compact on an axis that reaches it', () => {
  assert.deepEqual([0, 2000, 8000].map((v) => axisMoney(v, 8000)), ['€0', '€2,000', '€8,000']);
  assert.deepEqual([2500, 10000, 12500].map((v) => axisMoney(v, 12500)), ['€2.5k', '€10k', '€12.5k']);
});

test('index axes get a clean range around the data', async () => {
  const { niceRange } = await import('../site/js/chart.js');
  assert.deepEqual(niceRange(99.5, 110.5), { step: 2.5, ticks: [97.5, 100, 102.5, 105, 107.5, 110, 112.5] });
  assert.deepEqual(niceRange(100, 117.4), { step: 5, ticks: [100, 105, 110, 115, 120] });
});
