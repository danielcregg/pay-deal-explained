import test from 'node:test';
import assert from 'node:assert/strict';
import * as D from '../site/js/data.js';
const g = (id) => D.SCALES.grades.find((x) => x.id === id);
const vals = (id) => g(id).points.map((p) => p.value);

test('draft deal steps match the reported schedule', () => {
  assert.deepEqual(D.DEAL.steps.map((s) => [s.date, s.pct, s.min, s.kind]), [
    ['2026-09-01', 2, 1200, 'general'], ['2027-04-01', 1, 0, 'general'],
    ['2027-08-01', 1, 600, 'general'], ['2027-11-01', 1.5, 900, 'general'],
    ['2028-03-01', 1, 0, 'general'], ['2028-06-01', 1, 600, 'general'],
    ['2028-10-01', 1, 0, 'general'], ['2029-03-01', 1, 0, 'lb'],
    ['2029-03-02', 1.25, 750, 'general']]);
  assert.deepEqual([D.DEAL.start, D.DEAL.end, D.DEAL.months, D.DEAL.costBn, D.DEAL.threshold],
    ['2026-07-01', '2029-03-31', 33, 5.2, 60000]);
});

test('previous deal steps match the official 2024–2026 text', () => {
  assert.deepEqual(D.PREVIOUS_DEAL.steps.map((s) => [s.date, s.pct, s.min, s.kind]), [
    ['2024-01-01', 2.25, 1125, 'general'], ['2024-06-01', 1, 0, 'general'],
    ['2024-10-01', 1, 500, 'general'], ['2025-03-01', 2, 1000, 'general'],
    ['2025-08-01', 1, 0, 'general'], ['2025-09-01', 1, 0, 'lb'],
    ['2026-02-01', 1, 500, 'general'], ['2026-06-01', 1, 0, 'general']]);
  assert.deepEqual([D.PREVIOUS_DEAL.months, D.PREVIOUS_DEAL.costBn, D.PREVIOUS_DEAL.threshold], [30, 3.6, 50000]);
});

test('percentages add up to the headlines', () => {
  const sum = (deal, kind) => deal.steps.filter((s) => s.kind === kind).reduce((a, s) => a + s.pct, 0);
  assert.deepEqual([sum(D.DEAL, 'general'), sum(D.DEAL, 'lb'), D.DEAL.headlinePct], [9.75, 1, 10.75]);
  assert.deepEqual([sum(D.PREVIOUS_DEAL, 'general'), sum(D.PREVIOUS_DEAL, 'lb'), D.PREVIOUS_DEAL.headlinePct], [9.25, 1, 10.25]);
});

test('every minimum breaks even exactly at its deal threshold', () => {
  for (const s of D.DEAL.steps.filter((s) => s.min)) assert.equal((s.min * 100) / s.pct, 60000);
  for (const s of D.PREVIOUS_DEAL.steps.filter((s) => s.min)) assert.equal((s.min * 100) / s.pct, 50000);
});

test('TU scales from Circular 002/2026 (1 June 2026)', () => {
  assert.deepEqual(D.SCALES.grades.filter((x) => x.sector === 'tu').map((x) => x.id), ['al-ne', 'al-pre', 'lect', 'sl1', 'sl2', 'sl3', 'ct', 'ls1', 'ls2']);
  assert.deepEqual(D.SCALES.grades.filter((x) => x.sector === 'tu').map((x) => x.group), ['current', 'current', 'current', 'current', 'current', 'current', 'legacy', 'legacy', 'legacy']);
  assert.deepEqual(vals('al-ne'), [47572, 50099, 52181, 54097, 56109, 57728, 59383, 61045, 62717, 64372]);
  assert.deepEqual(vals('al-pre'), [52181, 54097, 56109, 57728, 59383, 61045, 62717, 64372]);
  assert.deepEqual(vals('lect'), [69625, 72831, 84009, 86936, 89894, 92865, 95852, 98817, 101780, 104757, 107727]);
  assert.deepEqual(vals('sl1'), [94736, 97963, 101175, 104409, 107625, 110838, 114068, 117279]);
  assert.deepEqual(vals('sl2'), [97917, 100997, 104070, 107149, 110230, 113304, 116378, 119458, 122529, 125890]);
  assert.deepEqual(vals('sl3'), [105346, 109042, 112741, 116441, 120140, 123838, 127814, 131543, 135494]);
  assert.deepEqual(vals('ct'), [49046, 50945, 52876, 54847, 56912, 58971, 61050, 63154, 65827, 67975, 70126, 72943, 75760, 77976, 82943, 83943]);
  assert.deepEqual(vals('ls1'), [61991, 64939, 67351, 69796, 72859, 82064, 83471, 86138, 88849, 91566, 94290]);
  assert.deepEqual(vals('ls2'), [69625, 72831, 84009, 86936, 89894, 92865, 95852, 98817, 101780, 104757, 107727, 110594, 113460]);
  assert.deepEqual(g('ls2').points.slice(-2).map((p) => p.label), ['LSI 1', 'LSI 2']);
  assert.equal(g('lect').points[4].label, 'Point 5');
  for (const gr of D.SCALES.grades) gr.points.forEach((p, i, a) => i && assert.ok(p.value > a[i - 1].value, gr.id));
});

test('hourly rates equal point 1 ÷ 630 to the cent', () => {
  assert.equal(D.SCALES.hourlyDivisor, 630);
  assert.deepEqual([g('al-ne').hourly, g('al-pre').hourly], [75.51, 82.83]);
  for (const id of ['al-ne', 'al-pre']) assert.equal(Math.round((vals(id)[0] / 630) * 100) / 100, g(id).hourly);
});

test('inflation inputs, settings and union links', () => {
  assert.deepEqual(D.INFLATION.rates, { 2026: 3.4, 2027: 3.1, 2028: 2, 2029: 2 });
  assert.deepEqual([D.INFLATION.from, D.INFLATION.to, D.INFLATION.assumedYears], ['2026-07', '2029-03', [2029]]);
  assert.equal(D.SITE.includeLBDefault, false);
  assert.deepEqual(D.UNION_LINKS.map((u) => u.name), ['TUI', 'ICTU Public Services Committee']);
});

test('glossary, timeline and beyond-pay content is complete', () => {
  assert.deepEqual(D.GLOSSARY.map((x) => x.id), ['general-round', 'local-bargaining', 'lower-pay-threshold', 'minimum-payment', 'compounding', 'back-pay', 'review-clause', 'ballot', 'ratification', 'wrc', 'ictu-psc', 'increment', 'scale-point']);
  for (const x of D.GLOSSARY) assert.ok(x.text.length > 20, x.id);
  const dates = D.TIMELINE.map((e) => e.date);
  assert.deepEqual([...dates].sort(), dates);
  for (const d of ['2026-06-30', '2026-09-30', '2026-10-14', '2026-10-21', '2026-11-08', '2026-11-11', '2026-12-07']) assert.ok(dates.includes(d), d);
  assert.deepEqual(D.BEYOND_PAY.map((b) => b.id), ['local-bargaining', 'review-clause', 'ai-hybrid', 'education', 'reform']);
  for (const b of D.BEYOND_PAY) assert.ok(['known', 'reported', 'not-yet-published'].includes(b.status));
});

test('every referenced source exists', () => {
  const ids = new Set(D.SOURCES.map((s) => s.id));
  assert.equal(ids.size, D.SOURCES.length);
  const used = [...D.DEAL.sourceIds, ...D.PREVIOUS_DEAL.sourceIds, D.SCALES.sourceId, D.INFLATION.sourceId,
    ...D.TIMELINE.map((e) => e.sourceId), ...D.BEYOND_PAY.flatMap((b) => b.sourceIds)];
  for (const id of used) assert.ok(ids.has(id), id);
  for (const s of D.SOURCES) assert.ok(s.url === null || s.url.startsWith('https://'), s.id);
});
