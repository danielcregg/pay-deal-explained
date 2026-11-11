// Occupations ("sectors"): each has its own pay scales, source and caveats.
import test from 'node:test';
import assert from 'node:assert/strict';
import * as data from '../site/js/data.js';
import { DEFAULT_SELECTION as D0, restoreSelection, owedFor, gradesIn, sectorOf, lowestScalePoint } from '../site/js/selection.js';

const { SCALES } = data;

test('sectors: every grade belongs to one, and each sector names its source', () => {
  const ids = SCALES.sectors.map((s) => s.id);
  assert.ok(ids.includes('tu'));
  for (const g of SCALES.grades) assert.ok(ids.includes(g.sector), `${g.id} has sector ${g.sector}`);
  for (const s of SCALES.sectors) {
    assert.ok(gradesIn(SCALES, s.id).length > 0, `${s.id} has grades`);
    assert.ok(data.SOURCES.some((src) => src.id === s.sourceId), `${s.id} has a listed source`);
    assert.ok(s.name && s.low && s.effective, `${s.id} has a name, a low-point label and a date`);
  }
  assert.equal(new Set(SCALES.grades.map((g) => g.id)).size, SCALES.grades.length, 'grade ids are unique');
  for (const g of SCALES.grades) {
    assert.ok(g.points.length > 0 && g.points.every((p) => Number.isInteger(p.value) && p.value > 20000 && p.value < 250000), `${g.id} points`);
  }
});

test('sectors: the default is the TU lecturer, and choices saved before sectors existed still load', () => {
  assert.equal(D0.sector, 'tu');
  assert.equal(sectorOf(D0, SCALES).id, 'tu');
  const old = JSON.stringify({ touched: true, contract: 'full', gradeId: 'al-ne', pointIndex: 0, typed: null, fte: 1, alScale: 'al-ne', hoursPerYear: 0, includeLB: false, payMonth: '2027-01' });
  const restored = restoreSelection(old, SCALES);
  assert.deepEqual([restored.sector, restored.gradeId, restored.touched, restored.includeOwed], ['tu', 'al-ne', true, false]);
});

test('sectors: the 1% owed since 2025 belongs to the TU scales', () => {
  assert.equal(owedFor(D0, SCALES).since, '2025-09-01');
  assert.equal(lowestScalePoint(SCALES, 'tu'), 47572);
});
