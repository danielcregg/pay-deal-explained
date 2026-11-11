import test from 'node:test';
import assert from 'node:assert/strict';
import { SCALES } from '../site/js/data.js';
import { DEFAULT_SELECTION, parseSalary, clampFte, resolvePay, restoreSelection } from '../site/js/selection.js';

test('salary parsing is lenient but safe (Review Focus 1)', () => {
  assert.deepEqual(parseSalary('€58,000'), { ok: true, value: 58000 });
  assert.deepEqual(parseSalary(' 58000.50 '), { ok: true, value: 58000.5 });
  for (const bad of ['abc', '', '-5', '0', '2,000,000']) assert.equal(parseSalary(bad).ok, false, bad);
});

test('FTE is clamped to 1–100% (Review Focus 2)', () => {
  assert.deepEqual([clampFte(0), clampFte(150), clampFte('47.5'), clampFte('x')], [0.01, 1, 0.475, 1]);
});

test('saved selections are validated (Review Focus 3)', () => {
  for (const raw of [null, 'not json', '{"gradeId":"nope"}', '{"gradeId":"lect","pointIndex":99}', '{"contract":"weird"}'])
    assert.deepEqual(restoreSelection(raw, SCALES), DEFAULT_SELECTION, String(raw));
  const ok = restoreSelection(JSON.stringify({ ...DEFAULT_SELECTION, touched: true, gradeId: 'al-ne', pointIndex: 0 }), SCALES);
  assert.deepEqual([ok.gradeId, ok.touched], ['al-ne', true]);
});

test('resolvePay covers full-time, part-time, typed and hourly', () => {
  assert.deepEqual(resolvePay(DEFAULT_SELECTION, SCALES), { base: 89894, published: 89894, factor: 1, annualFactor: 1, unit: 'year', label: 'Lecturer, point 5', isExample: true });
  const pt = resolvePay({ ...DEFAULT_SELECTION, touched: true, contract: 'part', fte: 0.5 }, SCALES);
  assert.deepEqual([pt.base, pt.factor, pt.isExample], [89894, 0.5, false]);
  assert.equal(resolvePay({ ...DEFAULT_SELECTION, gradeId: 'typed', typed: 58000 }, SCALES).base, 58000);
  const h = resolvePay({ ...DEFAULT_SELECTION, contract: 'hourly', alScale: 'al-ne', hoursPerYear: 315 }, SCALES);
  assert.deepEqual([h.base, h.unit, h.factor, h.annualFactor], [47572, 'hour', 1 / 630, 0.5]);
});
