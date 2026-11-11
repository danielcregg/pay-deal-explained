import test from 'node:test';
import assert from 'node:assert/strict';
import { eur, signedEur, pct, longDate, monthLabel, listSteps } from '../site/js/format.js';

test('formatting', () => {
  assert.deepEqual([eur(1200), eur(99037.31), eur(75.5111, { cents: true }), signedEur(1797.88)], ['€1,200', '€99,037', '€75.51', '+€1,798']);
  assert.deepEqual([pct(11.2729), pct(10.1712, 2), longDate('2029-03-02'), monthLabel('2026-09')], ['11.3%', '10.17%', '2 March 2029', 'Sep 2026']);
  assert.deepEqual([listSteps([1]), listSteps([1, 3]), listSteps([1, 3, 4, 6, 9])], ['step 1', 'steps 1 and 3', 'steps 1, 3, 4, 6 and 9']);
});
