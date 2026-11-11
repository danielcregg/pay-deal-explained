// Regression tests for the 14 minor issues deferred by the final review (M1–M14).
import test from 'node:test';
import assert from 'node:assert/strict';
import { SCALES } from '../site/js/data.js';
import { DEFAULT_SELECTION, parseSalary, clampHours, restoreSelection } from '../site/js/selection.js';
import { createStore } from '../site/js/state.js';

test('M4: a typed salary has a plausibility floor, and 58.000 means €58,000', () => {
  assert.deepEqual(parseSalary('58.000'), { ok: true, value: 58000 });
  assert.deepEqual(parseSalary('47.572'), { ok: true, value: 47572 });
  assert.deepEqual(parseSalary('10000'), { ok: true, value: 10000 });
  for (const low of ['58', '9999', '58.5', '0']) {
    const r = parseSalary(low);
    assert.deepEqual([r.ok, r.code], [false, 'low'], low);
    assert.match(r.error, /at least €10,000/, low);
  }
  assert.equal(parseSalary('abc').code, 'format');
  assert.equal(parseSalary('2,000,000').code, 'high');
});

test('M5: hours are whole numbers from 0 to 2,000, so the field can show what is used', () => {
  assert.deepEqual(['3000', '12.6', '-5', '', 'abc', '315', 2000.4].map(clampHours), [2000, 13, 0, 0, 0, 315, 2000]);
});

test('M6: only a selection the reader saved counts as their own', () => {
  assert.deepEqual(restoreSelection('{}', SCALES), DEFAULT_SELECTION);
  assert.deepEqual(restoreSelection('{"gradeId":"al-ne","pointIndex":0}', SCALES), DEFAULT_SELECTION);
  const saved = restoreSelection(JSON.stringify({ ...DEFAULT_SELECTION, touched: true, gradeId: 'al-ne', pointIndex: 0 }), SCALES);
  assert.deepEqual([saved.gradeId, saved.touched], ['al-ne', true]);
});

test('M11: one failing subscriber does not stop the others', () => {
  const errors = [];
  const s = createStore({ a: 1 }, { onError: (err) => errors.push(err.message) });
  const seen = [];
  s.subscribe(() => { throw new Error('boom'); });
  s.subscribe((st) => seen.push(st.a));
  s.set({ a: 2 });
  assert.deepEqual([seen, errors], [[2], ['boom']]);
});
