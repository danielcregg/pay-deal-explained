// Occupations ("sectors"): each has its own pay scales, source and caveats.
import test from 'node:test';
import assert from 'node:assert/strict';
import * as data from '../site/js/data.js';
import { finalSalary } from '../site/js/pay.js';
import { DEFAULT_SELECTION as D0, restoreSelection, resolvePay, owedFor, gradesIn, sectorOf, lowestScalePoint } from '../site/js/selection.js';
import { model as vsLastDeal } from '../site/js/sections/vs-last-deal.js';
import { flatNote } from '../site/js/sections/flat-or-percent.js';

const { SCALES, DEAL, PREVIOUS_DEAL } = data;
const grade = (id) => SCALES.grades.find((g) => g.id === id);
const vals = (id) => grade(id).points.map((p) => p.value);
const sector = (id) => SCALES.sectors.find((s) => s.id === id);
const risePct = (salary, steps, includeLB) => (finalSalary(salary, steps, { includeLB }) / salary - 1) * 100;

test('sectors: every grade belongs to one, and each sector names its source', () => {
  const ids = SCALES.sectors.map((s) => s.id);
  assert.ok(ids.includes('tu'));
  assert.equal(new Set(ids).size, ids.length, 'sector ids are unique');
  for (const g of SCALES.grades) assert.ok(ids.includes(g.sector), `${g.id} has sector ${g.sector}`);
  for (const s of SCALES.sectors) {
    assert.ok(gradesIn(SCALES, s.id).length > 0, `${s.id} has grades`);
    assert.ok(data.SOURCES.some((src) => src.id === s.sourceId), `${s.id} has a listed source`);
    assert.ok(s.name && s.short && s.low && s.effective, `${s.id} has a name, a short name, a low-point label and a date`);
    assert.equal(typeof s.hourly, 'boolean', `${s.id} says whether it has hourly-paid contracts`);
    assert.equal(typeof s.lastDealLB, 'boolean', `${s.id} says whether the 2025 1% is in its scale`);
    if (s.lowGrade) assert.equal(grade(s.lowGrade).sector, s.id, `${s.id} low point comes from its own grade`);
    for (const id of s.sourceIds ?? []) assert.ok(data.SOURCES.some((src) => src.id === id), `${s.id} cites ${id}`);
    for (const id of s.owed?.sourceIds ?? []) assert.ok(data.SOURCES.some((src) => src.id === id), `${s.id} cites ${id}`);
  }
  assert.equal(new Set(SCALES.grades.map((g) => g.id)).size, SCALES.grades.length, 'grade ids are unique');
  for (const g of SCALES.grades) {
    assert.ok(g.points.length > 0 && g.points.every((p) => Number.isInteger(p.value) && p.value > 20000 && p.value < 250000), `${g.id} points`);
    g.points.forEach((p, i, a) => i && assert.ok(p.value >= a[i - 1].value, `${g.id} never goes down`));
    assert.equal(new Set(g.points.map((p) => p.label)).size, g.points.length, `${g.id} point labels are unique`);
  }
});

test('sectors: the default is the TU lecturer, and choices saved before sectors existed still load', () => {
  assert.equal(D0.sector, 'tu');
  assert.equal(sectorOf(D0, SCALES).id, 'tu');
  assert.equal(SCALES.sectors[0].id, 'tu', 'the lecturer stays first in the list');
  const old = JSON.stringify({ touched: true, contract: 'full', gradeId: 'al-ne', pointIndex: 0, typed: null, fte: 1, alScale: 'al-ne', hoursPerYear: 0, includeLB: false, payMonth: '2027-01' });
  const restored = restoreSelection(old, SCALES);
  assert.deepEqual([restored.sector, restored.gradeId, restored.touched, restored.includeOwed], ['tu', 'al-ne', true, false]);
});

test('sectors: the 1% from September 2025 can be counted by lecturers and gardaí, where it is not in the pay figures', () => {
  assert.equal(owedFor(D0, SCALES).since, '2025-09-01');
  assert.equal(lowestScalePoint(SCALES, 'tu'), 47572);
  assert.deepEqual(SCALES.sectors.filter((s) => s.owed).map((s) => s.id), ['tu', 'garda']);
  for (const s of SCALES.sectors.filter((x) => x.owed)) {
    assert.deepEqual([s.owed.pct, s.owed.since, s.lastDealLB], [1, '2025-09-01', false], s.id);
    assert.ok(s.owed.note.length > 60 && s.owed.status.length > 20, `${s.id} says where it stands`);
    assert.doesNotMatch(`${s.owed.note} ${s.owed.status}`, /will be paid|is owed/, `${s.id} does not call it settled`);
  }
  assert.match(sector('garda').owed.status, /GRA/);
});

test('teachers: the four scales match Circulars 0055/2026 and 0074/2026', () => {
  assert.deepEqual(gradesIn(SCALES, 'primary').map((g) => g.id), ['pt-new', 'pt-pre2011']);
  assert.deepEqual(gradesIn(SCALES, 'postprimary').map((g) => g.id), ['ppt-new', 'ppt-pre2011']);
  assert.deepEqual(vals('pt-new'), [45833, 47503, 49409, 50280, 51510, 53015, 54742, 56534, 58051, 60785, 62495, 64537, 66567, 68618,
    70329, 72596, 72596, 72596, 75721, 75721, 75721, 75721, 79854, 79854, 79854, 79854, 84412]);
  assert.deepEqual(vals('pt-pre2011'), [43774, 44644, 45868, 47097, 49002, 50237, 51476, 54669, 56327, 58341, 60362, 62407, 64118, 66386,
    66386, 66386, 69511, 69511, 69511, 69511, 73644, 73644, 73644, 73644, 78205]);
  assert.deepEqual(vals('ppt-new'), [47886, 49578, 51515, 52407, 53668, 55226, 57023, 58862, 60406, 63177, 64907, 66980, 69040, 71114,
    72850, 75149, 75149, 75149, 78316, 78316, 78316, 78316, 82501, 82501, 82501, 82501, 87128]);
  assert.deepEqual(vals('ppt-pre2011'), [44359, 45240, 46480, 47727, 49658, 50908, 52169, 55407, 57087, 59128, 61177, 63249, 64983, 67283,
    67283, 67283, 70451, 70451, 70451, 70451, 74638, 74638, 74638, 74638, 79261]);
  for (const id of ['pt-new', 'ppt-new']) {
    const marked = grade(id).points.map((p, i) => (/skipped/.test(p.label) ? i + 1 : 0)).filter(Boolean);
    assert.deepEqual(marked, [4, 8, 12], `${id}: the points new entrants skip are labelled`);
    assert.equal(grade(id).points[4].label, 'Point 5');
  }
  assert.deepEqual([sector('primary').sourceId, sector('postprimary').sourceId], ['circular-0055-2026', 'circular-0074-2026']);
  assert.deepEqual([sector('primary').effective, sector('postprimary').effective], ['2026-06-01', '2026-06-01']);
});

test('teachers: the two sectors keep a steady gap, which a mistyped figure would break', () => {
  // The post-primary scales have run a little above the primary ones since 2022, and
  // Circular 0074/2026 added 1% from 1 September 2025. For teachers who started in 2011
  // or later the post-primary scale also has the PME allowance built in.
  vals('pt-pre2011').forEach((p, i) => {
    const ratio = vals('ppt-pre2011')[i] / p;
    assert.ok(ratio > 1.0125 && ratio < 1.0145, `before 2011, point ${i + 1}: ${ratio.toFixed(4)}`);
  });
  vals('pt-new').forEach((p, i) => {
    const gap = vals('ppt-new')[i] - p;
    assert.ok(gap > 2000 && gap < 2800, `2011 or later, point ${i + 1}: ${gap}`);
  });
});

test('teachers: the low point is where new teachers start, and it reproduces the published example', () => {
  assert.deepEqual([lowestScalePoint(SCALES, 'primary'), lowestScalePoint(SCALES, 'postprimary')], [45833, 47886]);
  assert.match(sector('primary').low, /new primary teachers/);
  const published = (role) => DEAL.publishedExamples.find((e) => e.role === role).pct;
  assert.equal(Math.round(risePct(45833, DEAL.steps, true) * 10) / 10, published('Primary teacher'));
  // The reported secondary figure matches the scale before Circular 0074/2026 added the 1%.
  assert.equal(Math.round(risePct(47417, DEAL.steps, true) * 10) / 10, published('Secondary teacher'));
});

test('teachers: no hourly-paid option, and each sector says how the last deal’s 1% was used', () => {
  for (const id of ['primary', 'postprimary']) {
    assert.equal(sector(id).hourly, false);
    assert.match(sector(id).caveat, /allowances/);
    assert.ok(sector(id).lastDealNote.length > 40, `${id} explains the 2025 1%`);
  }
  assert.deepEqual(SCALES.sectors.filter((s) => s.lastDealLB).map((s) => s.id), ['postprimary'], 'only the post-primary scale has it built in');
  for (const s of SCALES.sectors) assert.ok(s.lastDealNote.length > 40, `${s.id} explains the 2025 1%`);
  assert.match(sector('primary').lastDealNote, /allowances/);
  assert.match(sector('postprimary').lastDealNote, /0074\/2026/);
  assert.match(sector('tu').lastDealNote, /still being sought by TUI/);
  const saved = (patch) => JSON.stringify({ ...D0, touched: true, sector: 'primary', gradeId: 'pt-new', pointIndex: 0, ...patch });
  assert.equal(restoreSelection(saved({}), SCALES).gradeId, 'pt-new');
  assert.equal(restoreSelection(saved({ contract: 'hourly' }), SCALES).sector, 'tu', 'an hourly-paid teacher is not a valid choice');
  assert.equal(restoreSelection(saved({ gradeId: 'lect' }), SCALES).sector, 'tu', 'a grade from another job is not a valid choice');
});

test('teachers: a chosen point resolves to its scale figure, with no lift for the 2025 1%', () => {
  const sel = { ...D0, touched: true, sector: 'postprimary', gradeId: 'ppt-new', pointIndex: 9, includeOwed: true };
  const pay = resolvePay(sel, SCALES);
  assert.deepEqual([pay.base, pay.published, pay.unit, pay.label], [63177, 63177, 'year', 'Post-primary teacher (started in 2011 or later), point 10']);
  assert.equal(Math.round(finalSalary(pay.base, DEAL.steps, { includeLB: false })), 69603);
});

test('nurses and midwives: the scales match the HSE consolidated scales of 1 June 2026, version 4', () => {
  assert.deepEqual(gradesIn(SCALES, 'nurse').map((g) => g.id),
    ['nm-enhanced', 'nm-enhanced-c10', 'nm-enhanced-senior', 'nm-staff', 'nm-staff-senior', 'cnm1', 'cnm2', 'cnm3']);
  assert.deepEqual(vals('nm-staff'), [38166, 40158, 41175, 42519, 44213, 45907, 47591, 49049, 50509, 51973, 53466, 54956, 56592]);
  assert.deepEqual(vals('nm-enhanced'), [44832, 46217, 48775, 50141, 51194, 52364, 53944, 55522, 57903, 60194]);
  assert.deepEqual(vals('nm-enhanced-c10'), [43888, 45259, 47792, 49145, 50185, 51333, 52881, 54428, 56762, 59008]);
  assert.deepEqual([vals('nm-staff-senior'), vals('nm-enhanced-senior')], [[59278], [62047]]);
  assert.deepEqual(vals('cnm1'), [57780, 58828, 60306, 61810, 63305, 64809, 66484, 68046, 70087]);
  assert.deepEqual(vals('cnm2'), [62699, 63737, 64615, 66048, 67633, 69189, 70745, 72497, 74123, 76921, 79227]);
  assert.deepEqual(vals('cnm3'), [72146, 73573, 77183, 78603, 80031, 81478]);
  for (const id of ['nm-staff', 'nm-enhanced', 'nm-enhanced-c10', 'cnm1', 'cnm2']) {
    const last = grade(id).points.at(-1);
    assert.deepEqual([last.label, last.lsi], ['Long service increment', true], id);
  }
  for (const id of ['cnm1', 'cnm2']) assert.equal(grade(id).points[0].skipped, true, `${id}: point 1 is skipped since September 2025`);
  assert.equal(lowestScalePoint(SCALES, 'nurse'), 38166);
  assert.equal(sector('nurse').owed ?? null, null);
});

test('nurses and midwives: the two official versions of the Enhanced scale are both offered, and explained', () => {
  // The HSE's figures are the circular's with the rises of February and June 2026 applied again.
  const feb = PREVIOUS_DEAL.steps.find((s) => s.id === 'p6');
  const june = PREVIOUS_DEAL.steps.find((s) => s.id === 'p7');
  const rise = (salary, step) => salary + Math.max((salary * step.pct) / 100, step.min);
  vals('nm-enhanced-c10').forEach((c, i) => {
    const again = rise(rise(c, feb), june);
    assert.ok(Math.abs(again - vals('nm-enhanced')[i]) <= 1, `point ${i + 1}: ${vals('nm-enhanced')[i]} against ${again.toFixed(2)}`);
  });
  for (const id of ['nm-enhanced', 'nm-enhanced-c10']) {
    assert.match(grade(id).note, /Two official documents/);
    assert.match(grade(id).note, /Circular 10\/2026/);
  }
  // The 13.3% reported for an Enhanced nurse is what the HSE's starting figure gives.
  const published = DEAL.publishedExamples.find((e) => e.role === 'Enhanced nurse').pct;
  assert.equal(Math.round(risePct(44832, DEAL.steps, true) * 10) / 10, published);
  assert.notEqual(Math.round(risePct(43888, DEAL.steps, true) * 10) / 10, published);
});

test('gardaí: the official table of 1 August 2025 with the two rises since', () => {
  assert.deepEqual(gradesIn(SCALES, 'garda').map((g) => g.id), ['garda-2015', 'garda-a', 'sergeant-a', 'inspector-a', 'garda-b', 'sergeant-b', 'inspector-b']);
  assert.deepEqual(gradesIn(SCALES, 'garda').filter((g) => g.group === 'legacy').map((g) => g.id), ['garda-b', 'sergeant-b', 'inspector-b']);
  const r = (value, times) => Array(times).fill(value);
  assert.deepEqual(vals('garda-2015'), [39586, 41363, 44672, 46462, 49093, 53098, 55859, 58437, ...r(60936, 5), ...r(63129, 6), 65595]);
  assert.deepEqual(vals('garda-a'), [41682, 44672, 46462, 49093, 53098, 55859, 58437, ...r(60936, 5), ...r(63129, 6), ...r(65595, 4)]);
  assert.deepEqual(vals('garda-b'), [40700, 43421, 45171, 47728, 51578, 54179, 56620, ...r(59026, 5), ...r(61130, 6), ...r(63520, 4)]);
  assert.deepEqual(vals('sergeant-a'), [66152, 67566, 69040, ...r(70650, 3), ...r(72282, 6), ...r(74937, 4)]);
  assert.deepEqual(vals('sergeant-b'), [64061, 65424, 66857, ...r(68404, 3), ...r(69979, 6), ...r(72551, 4)]);
  assert.deepEqual(vals('inspector-a'), [75300, 76450, 78349, ...r(80500, 3), 82661]);
  assert.deepEqual(vals('inspector-b'), [72903, 74014, 75855, ...r(77933, 3), 80019]);
  assert.match(sector('garda').caveat, /1 August 2025/);
  assert.match(sector('garda').caveat, /could not find/);
});

test('gardaí: the figures agree with what An Garda Síochána and the Government have published since', () => {
  // garda.ie, May 2026: point 1 was €39,194 and the point reached after 8 years €60,333 "as of 1st February 2026".
  const juneFrom = (feb) => Math.round(feb * 1.01);
  assert.equal(vals('garda-2015')[0], juneFrom(39194));
  assert.equal(vals('garda-2015')[8], juneFrom(60333));
  // The 14.6% reported for a garda on 11 November is what the starting point gives.
  const published = DEAL.publishedExamples.find((e) => e.role === 'Garda').pct;
  assert.equal(Math.round(risePct(lowestScalePoint(SCALES, 'garda'), DEAL.steps, true) * 10) / 10, published);
  assert.equal(lowestScalePoint(SCALES, 'garda'), 39586);
});

test('chapter 7: the last deal’s 1% is counted where it is in the scale', () => {
  const lowPct = (id) => {
    const s = sector(id);
    return vsLastDeal(60000, data, { includeLB: false, includePrevLB: Boolean(s.lastDealLB), sector: id }).deals[0].lowPct;
  };
  const without = risePct(45833, PREVIOUS_DEAL.steps, false);
  const withIt = risePct(47886, PREVIOUS_DEAL.steps, true);
  assert.ok(Math.abs(lowPct('primary') - without) < 1e-9);
  assert.ok(Math.abs(lowPct('postprimary') - withIt) < 1e-9);
});

test('chapter 4: each job gets a note on who gets the flat sums', () => {
  assert.match(flatNote(sector('tu'), data), /going by how hourly rates were set/);
  const primary = flatNote(sector('primary'), data);
  assert.match(primary, /^For a primary teacher, /);
  assert.match(flatNote(sector('nurse'), data), /€59,278/); // the senior staff nurse rate is the highest below the threshold
  assert.match(flatNote(sector('garda'), data), /^For a garda, scale points up to €59,026 /);
  assert.match(primary, /€58,341/); // the highest primary point below the €60,000 threshold
  assert.match(primary, /€60,000/);
});
