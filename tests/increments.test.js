// Yearly increments in the opening chart: an advanced option that adds the reader's
// own move up the scale to the deal's rises. Everything else on the page leaves them out.
import test from 'node:test';
import assert from 'node:assert/strict';
import { installDom } from './helpers/dom.js';
import * as data from '../site/js/data.js';
import { positionIn, careerEvents, finalSalary } from '../site/js/pay.js';
import { restoreSelection, careerOf, gradePatch, thisMonth } from '../site/js/selection.js';
import { LECTURER_EXAMPLE as D0 } from './helpers/selections.js';
import { mineText } from '../site/js/header.js';
import { createStore } from '../site/js/state.js';
import * as hero from '../site/js/sections/hero.js';
import * as yourPay from '../site/js/sections/your-pay.js';

const document = installDom();
const { SCALES, DEAL } = data;
const near = (a, b, t = 0.01) => assert.ok(Math.abs(a - b) <= t, `${a} ≉ ${b}`);
const lecturer = SCALES.grades.find((g) => g.id === 'lect').points.map((p) => p.value);
const NOW = '2026-11';

test('increments: the point held in any month follows from the point held now', () => {
  const at = (month, patch = {}) => positionIn(month, { pos: 4, count: 11, incrementMonth: 9, now: NOW, ...patch });
  assert.deepEqual(['2026-07', '2026-08', '2026-09', '2026-11'].map((m) => at(m)), [3, 3, 4, 4]); // this September's is behind us
  assert.deepEqual(['2027-08', '2027-09', '2028-09', '2029-03'].map((m) => at(m)), [4, 5, 6, 6]);
  // an increment that falls in the month we are in has already happened
  assert.deepEqual([at('2026-10', { incrementMonth: 11 }), at('2026-11', { incrementMonth: 11 }), at('2027-11', { incrementMonth: 11 })], [3, 4, 5]);
  // one still to come this year
  assert.deepEqual([at('2026-07', { incrementMonth: 12 }), at('2026-12', { incrementMonth: 12 })], [4, 5]);
});

test('increments: the scale has a top and a bottom', () => {
  const at = (month, pos) => positionIn(month, { pos, count: 11, incrementMonth: 9, now: NOW });
  assert.equal(at('2029-03', 9), 10, 'one more step, then the top');
  assert.equal(at('2029-03', 10), 10);
  assert.equal(at('2026-07', 10), 10, 'someone at the top is taken to have been there already');
  assert.equal(at('2026-07', 0), 0, 'nothing below the first point');
});

test('increments: pay through the deal is each point’s own figure after the rises so far', () => {
  const path = careerEvents(lecturer, DEAL.steps, { pos: 4, incrementMonth: 9, now: NOW, from: '2026-07', to: '2029-03', includeLB: false });
  assert.deepEqual(path.start, { pos: 3, salary: 86936 });
  assert.deepEqual(path.events.map((e) => `${e.date} ${e.kind}`), [
    '2026-09-01 increment', '2026-09-01 general', '2027-04-01 general', '2027-08-01 general', '2027-09-01 increment',
    '2027-11-01 general', '2028-03-01 general', '2028-06-01 general', '2028-09-01 increment', '2028-10-01 general', '2029-03-02 general',
  ]);
  const [inc1, rise1] = path.events;
  assert.deepEqual([inc1.pos, inc1.before, inc1.after], [4, 86936, 89894], 'the increment comes first, at the scale as it stood');
  near(rise1.after, 89894 * 1.02);
  // September 2027: point 6 as revised by the three rises before it
  const inc2 = path.events[4];
  assert.equal(inc2.pos, 5);
  near(inc2.after, 92865 * 1.02 * 1.01 * 1.01);
  // the end is point 7 with every rise applied: the same as the deal alone would give that point
  near(path.events.at(-1).after, finalSalary(95852, DEAL.steps, { includeLB: false }));
  near(path.events.at(-1).after, 105601.31, 0.02);
  for (const e of path.events) assert.ok(e.after > e.before, `${e.date} goes up`);
});

test('increments: flat sums apply to the point you are on at the time, and local bargaining follows its switch', () => {
  // Assistant Lecturer point 1 (€47,572), increment each January: point 2 from January 2027.
  const al = SCALES.grades.find((g) => g.id === 'al-ne').points.map((p) => p.value);
  const path = careerEvents(al, DEAL.steps, { pos: 0, incrementMonth: 1, now: NOW, from: '2026-07', to: '2029-03', includeLB: false });
  assert.deepEqual(path.start, { pos: 0, salary: 47572 });
  assert.equal(path.events[0].after, 47572 + 1200, 'the first rise is the €1,200 minimum');
  assert.deepEqual([path.events[1].kind, path.events[1].date, path.events[1].after], ['increment', '2027-01-01', 50099 + 1200]);
  const withLB = careerEvents(al, DEAL.steps, { pos: 0, incrementMonth: 1, now: NOW, from: '2026-07', to: '2029-03', includeLB: true });
  assert.equal(withLB.events.filter((e) => e.kind === 'lb').length, 1);
  assert.equal(path.events.filter((e) => e.kind === 'lb').length, 0);
  assert.ok(withLB.events.at(-1).after > path.events.at(-1).after);
});

test('increments: off by default, saved with the other choices, and only a month from 1 to 12 is accepted', () => {
  assert.equal(D0.incrementMonth, null);
  const saved = (patch) => JSON.stringify({ ...D0, touched: true, remember: true, ...patch });
  assert.equal(restoreSelection(saved({ incrementMonth: 9 }), SCALES).incrementMonth, 9);
  assert.equal(restoreSelection(saved({}), SCALES).incrementMonth, null);
  for (const bad of [0, 13, 2.5, '9', true]) assert.equal(restoreSelection(saved({ incrementMonth: bad }), SCALES).touched, false, String(bad));
  const old = JSON.stringify({ touched: true, remember: true, sector: 'tu', contract: 'full', gradeId: 'lect', pointIndex: 2, typed: null, fte: 1, alScale: 'al-ne', hoursPerYear: 0, includeLB: false, payMonth: '2027-01' });
  assert.deepEqual([restoreSelection(old, SCALES).pointIndex, restoreSelection(old, SCALES).incrementMonth], [2, null], 'a save without the field takes the default');
});

test('increments: the way up a scale leaves out skipped points and long service increments', () => {
  const sel = (patch) => ({ ...D0, touched: true, incrementMonth: 9, ...patch });
  assert.equal(careerOf({ ...D0 }, SCALES, NOW), null, 'not counted unless a month is chosen');
  const lect = careerOf(sel({}), SCALES, NOW);
  assert.deepEqual([lect.values.length, lect.pos, lect.incrementMonth, lect.now, lect.labels[lect.pos]], [11, 4, 9, NOW, 'Point 5']);

  const teacher = careerOf(sel({ sector: 'primary', gradeId: 'pt-new', pointIndex: 4 }), SCALES, NOW);
  assert.equal(teacher.values.length, 24, 'points 4, 8 and 12 are passed over');
  assert.deepEqual([teacher.pos, teacher.values[teacher.pos - 1], teacher.values[teacher.pos]], [3, 49409, 51510]); // point 3, then point 5

  const nurse = careerOf(sel({ sector: 'nurse', gradeId: 'nm-staff', pointIndex: 11 }), SCALES, NOW);
  assert.deepEqual([nurse.values.length, nurse.pos, nurse.values[0], nurse.values[1]], [11, 10, 38166, 41175], 'the long service increment is not on the way up, and point 2 is skipped');
  const onLsi = careerOf(sel({ sector: 'nurse', gradeId: 'nm-staff', pointIndex: 12 }), SCALES, NOW);
  assert.deepEqual([onLsi.values, onLsi.pos], [[56592], 0], 'on it already: nowhere further to go');
  const manager = careerOf(sel({ sector: 'nurse', gradeId: 'cnm1', pointIndex: 1 }), SCALES, NOW);
  assert.deepEqual([manager.pos, manager.values[0]], [0, 58828], 'point 1 is skipped, so point 2 is the first step');

  // the 1% from September 2025, when counted, lifts every point
  const lifted = careerOf(sel({ includeOwed: true }), SCALES, NOW);
  near(lifted.values[4], 89894 * 1.01);
  // nothing to climb: an hourly rate, a typed salary, a single-rate grade
  assert.equal(careerOf(sel({ contract: 'hourly' }), SCALES, NOW), null);
  assert.equal(careerOf(sel({ gradeId: 'typed', typed: 70000 }), SCALES, NOW), null);
  assert.deepEqual(careerOf(sel({ sector: 'nurse', gradeId: 'nm-staff-senior', pointIndex: 0 }), SCALES, NOW).values, [59278]);
});

test('the race with increments: prices are compared with the deal alone, and your own pay is a second line', () => {
  const career = careerOf({ ...D0, touched: true, incrementMonth: 9 }, SCALES, NOW);
  const m = hero.model(89894, data, { includeLB: false, career });
  const plain = hero.model(89894, data, { includeLB: false });
  // the comparison with prices is exactly the one made without increments
  assert.equal(m.base, 89894);
  assert.deepEqual(m.steps, plain.steps);
  assert.equal(m.steps.filter((s) => s.kind === 'increment').length, 0);
  for (const t of [0, 3, 12, 20, 33]) {
    const [a, b] = [hero.stateAt(m, t), hero.stateAt(plain, t)];
    assert.deepEqual([a.pay, a.price, a.real], [b.pay, b.price, b.real], `month ${t}`);
  }
  assert.equal(hero.monthsBehind(m), hero.monthsBehind(plain));
  // the reader's own pay, with increments, runs beside it
  assert.equal(m.own.first, 86936, 'July 2026 was on point 4');
  assert.equal(m.own.steps.filter((s) => s.kind === 'increment').length, 3);
  const end = hero.stateAt(m, 33);
  near(end.own, (105601.31 / 86936) * 100, 0.001);
  near(end.pay, 110.17);
  assert.equal(end.label, 'Point 7');
  assert.equal(hero.stateAt(m, 12).label, 'Point 5');
  assert.equal(hero.stateAt(m, 0).label, 'Point 4');
  near(hero.payThen(m, 12), 89894 * 1.02 * 1.01, 0.01);
  near(hero.payThen(m, 33), 105601.31, 0.01);
  // without a career there is no second line, and pay in euro is the deal on the chosen point
  assert.equal(plain.own, undefined);
  assert.deepEqual([hero.stateAt(plain, 33).own, hero.stateAt(plain, 33).label], [undefined, undefined]);
  near(hero.payThen(plain, 33), 99037.31, 0.01);
});

function mountRace(selection) {
  const root = document.createElement('div');
  const form = document.createElement('div');
  document.body.append(root, form);
  const store = createStore({ ...D0, ...selection });
  hero.render(root, { store, data, now: NOW });
  yourPay.render(form, { store, data, now: NOW });
  const tiles = () => root.querySelectorAll('.race-tile b').map((b) => b.textContent);
  const pick = (id, value) => { const el = root.querySelector(id); el.value = String(value); el.dispatchEvent({ type: 'change', bubbles: true }); };
  return { root, form, store, tiles, pick };
}

test('the race: the pickers set job, grade, point and increment month, and the figures follow', () => {
  const { root, form, store, tiles, pick } = mountRace({});
  const picker = root.querySelector('.race-picker');
  assert.ok(picker, 'the pickers are on the chart');
  assert.equal(picker.closest('details'), null, 'in the open, not folded away');
  assert.deepEqual(picker.querySelectorAll('label').map((l) => l.textContent), ['Your job', 'Grade', 'Point you are on now', 'Increment month']);
  assert.deepEqual(root.querySelectorAll('#race-inc option').map((o) => o.textContent).slice(0, 3), ['None (optional)', 'January', 'February']);
  assert.deepEqual(tiles().slice(0, 2), ['€99,037', '+10.2%']);
  assert.equal(root.querySelector('.race-split').hidden, true);
  assert.equal(root.querySelector('.race-inc-note').hidden, true, 'nothing to explain until a month is chosen');

  pick('#race-inc', 9);
  assert.deepEqual([store.get().incrementMonth, store.get().touched], [9, true]);
  assert.deepEqual(tiles().slice(0, 2), ['€105,601', '+10.2%'], 'your pay with increments, and what the deal adds');
  assert.equal(root.querySelector('.race-split').hidden, false);
  assert.match(root.querySelector('.race-split').textContent, /^With your increments, your own pay is up \+21\.5% \(point 4 to point 7\)\./);
  assert.match(root.querySelector('.race-monthly').textContent, /^about €8,800 a month, on point 7$/);
  const note = root.querySelector('.race-inc-note');
  assert.equal(note.hidden, false);
  assert.match(note.textContent, /one point each September, working from the point you are on now \(November 2026\)/);
  assert.match(root.querySelector('.race-source').textContent, /Your increments \(one point each September\) are shown but not counted against prices/);
  assert.equal(root.querySelectorAll('.race-inc-mark').length, 3, 'each increment is marked on the line');
  assert.equal(root.querySelector('.race-key-inc').hidden, false, 'and the key says what the mark is');

  const scrub = root.querySelector('input.race-scrub');
  scrub.value = '12';
  scrub.dispatchEvent({ type: 'input', bubbles: true });
  assert.equal(root.querySelector('.race-when').textContent, 'In June 2027');
  assert.equal(tiles()[0], '€92,609');
  assert.match(root.querySelector('.race-monthly').textContent, /on point 5$/);
  assert.match(scrub.getAttribute('aria-valuetext'), /point 5/);

  pick('#race-point', 9); // point 10: one step from the top
  assert.equal(store.get().pointIndex, 9);
  assert.equal(form.querySelector('#pp-point').value, '9', 'section 1 shows the same point');
  pick('#race-grade', 'sl1');
  assert.deepEqual([store.get().gradeId, form.querySelector('#pp-grade').value], ['sl1', 'sl1']);
  pick('#race-job', 'primary');
  assert.deepEqual([store.get().sector, store.get().gradeId, store.get().pointIndex], ['primary', 'pt-new', 0]);
  assert.deepEqual([form.querySelector('#pp-sector').value, form.querySelector('#pp-grade').value], ['primary', 'pt-new']);
  assert.deepEqual(root.querySelectorAll('#race-grade option').map((o) => o.getAttribute('value')), ['pt-new', 'pt-pre2011']);

  pick('#race-inc', '');
  assert.equal(store.get().incrementMonth, null);
  assert.equal(root.querySelector('.race-split').hidden, true);
  assert.equal(root.querySelectorAll('.race-inc-mark').length, 0);
  assert.equal(root.querySelector('.race-key-inc').hidden, true);
});

test('the race: a saved increment month is counted from the start, and the lowest-point view ignores it', () => {
  const { root, tiles } = mountRace({ touched: true, incrementMonth: 9 });
  assert.equal(root.querySelector('#race-inc').value, '9');
  assert.equal(root.querySelector('.race-inc-note').hidden, false);
  assert.deepEqual(tiles().slice(0, 2), ['€105,601', '+10.2%']);
  const [, lowest] = root.querySelectorAll('.race-picks button');
  lowest.click();
  assert.deepEqual(tiles().slice(0, 2), ['€53,136', '+11.7%']);
  assert.equal(root.querySelector('.race-split').hidden, true);
});

test('the race: where increments cannot apply, the note says why', () => {
  const top = mountRace({ touched: true, incrementMonth: 9, pointIndex: 10 });
  assert.match(top.root.querySelector('.race-inc-note').textContent, /top of this scale/);
  assert.deepEqual(top.tiles().slice(0, 2), ['€118,684', '+10.2%']);
  const hourly = mountRace({ touched: true, incrementMonth: 9, contract: 'hourly' });
  assert.match(hourly.root.querySelector('.race-inc-note').textContent, /need a grade and scale point/);
  assert.equal(hourly.root.querySelector('.race-split').hidden, true);
  assert.equal(hourly.root.querySelector('#race-grade').value, '', 'no grade is shown as chosen for an hourly rate');
});

test('copy: the page still says increments are left out everywhere but the opening chart', () => {
  assert.ok(data.ASSUMPTIONS.some((a) => /increments are not included/i.test(a) && /opening chart/.test(a)));
  assert.match(data.GLOSSARY.find((g) => g.id === 'increment').text, /opening chart/);
});

test('the grade lists hold options and groups only, with no stray text', () => {
  const { root, form, pick } = mountRace({});
  const strays = (select) => select.childNodes.filter((n) => n.nodeName === '#text').map((n) => n.textContent);
  for (const job of ['tu', 'primary', 'nurse', 'garda']) {
    pick('#race-job', job);
    assert.deepEqual(strays(root.querySelector('#race-grade')), [], `chart, ${job}`);
    assert.deepEqual(strays(form.querySelector('#pp-grade')), [], `section 1, ${job}`);
  }
});

test('the race: an increment in the month we are in is taken as paid, and the note says so', () => {
  const { root, tiles, pick } = mountRace({ touched: true });
  pick('#race-inc', 11); // now is November 2026
  assert.match(root.querySelector('.race-inc-note').textContent, /This month’s increment is taken as already paid, so choose the point you are on after it\./);
  const scrub = root.querySelector('input.race-scrub');
  const euroAt = (t) => { scrub.value = String(t); scrub.dispatchEvent({ type: 'input', bubbles: true }); return tiles()[0]; };
  assert.deepEqual([euroAt(4), euroAt(5)], ['€88,675', '€91,692'], 'October 2026 on point 4, November on point 5, each with the September rise');
  pick('#race-inc', 9);
  assert.doesNotMatch(root.querySelector('.race-inc-note').textContent, /This month/);
});

test('copy: the assumptions say how increments are counted when they are added', () => {
  const line = data.ASSUMPTIONS.find((a) => /1st of the month you choose/.test(a));
  assert.ok(line, 'an assumption about the date');
  assert.match(line, /Skipped points are passed over/);
  assert.match(line, /long service increments and promotions/i);
});

// ---- from the independent review of this feature ----

test('increments: the month a point was chosen in is kept, so a later visit reads the same career', () => {
  assert.equal(D0.pointMonth, null);
  const saved = (patch) => JSON.stringify({ ...D0, touched: true, remember: true, ...patch });
  assert.equal(restoreSelection(saved({ pointMonth: '2026-11' }), SCALES).pointMonth, '2026-11');
  for (const bad of ['2026-13', '2026-1', 'November', 202611]) assert.equal(restoreSelection(saved({ pointMonth: bad }), SCALES).touched, false, String(bad));
  // Lecturer point 4 chosen in November 2026, increment each December.
  const sel = { ...D0, touched: true, pointIndex: 3, incrementMonth: 12, pointMonth: '2026-11' };
  const path = (c) => careerEvents(c.values, DEAL.steps, { ...c, from: '2026-07', to: '2029-03', includeLB: false });
  const inNovember = path(careerOf(sel, SCALES, '2026-11'));
  const inDecember = path(careerOf(sel, SCALES, '2026-12')); // the same saved choice, opened a month later
  assert.deepEqual(inDecember, inNovember);
  assert.deepEqual([inNovember.start.pos, inNovember.events.at(-1).pos], [3, 6]);
  // with no month kept (a choice saved before this), the device's month is all there is
  assert.equal(path(careerOf({ ...sel, pointMonth: null }, SCALES, '2026-12')).start.pos, 2);
  assert.equal(thisMonth(new Date(2029, 9, 15)), '2029-10', 'the real month, even after the agreement ends');
});

test('the race: choosing a point stamps the month, from the chart and from section 1', () => {
  const { root, form, store, pick } = mountRace({});
  pick('#race-point', 6);
  assert.deepEqual([store.get().pointIndex, store.get().pointMonth], [6, NOW]);
  store.set({ pointMonth: '2026-08' });
  const point = form.querySelector('#pp-point');
  point.value = '2';
  point.dispatchEvent({ type: 'change', bubbles: true });
  assert.deepEqual([store.get().pointIndex, store.get().pointMonth], [2, NOW]);
  assert.equal(root.querySelector('#race-point').value, '2', 'the chart shows the point chosen in section 1');
  // the lists are refilled, not just the value
  pick('#race-grade', 'sl1');
  const points = root.querySelectorAll('#race-point option').map((o) => o.textContent);
  assert.deepEqual([points.length, points[0]], [8, 'Point 1 (€94,736)']);
  assert.equal(form.querySelectorAll('#pp-point option').length, 8);
});

test('the race: a point chosen in an earlier month is described that way', () => {
  const { root } = mountRace({ touched: true, incrementMonth: 9, pointMonth: '2026-08' });
  // on point 5 in August 2026: point 6 from September 2026, so the chart starts on point 5
  assert.match(root.querySelector('.race-inc-note').textContent, /working from the point you gave \(August 2026\)/);
  const scrub = root.querySelector('input.race-scrub');
  scrub.value = '0';
  scrub.dispatchEvent({ type: 'input', bubbles: true });
  assert.equal(root.querySelector('.race-tile.euro b').textContent, '€89,894');
});

test('the race: the note fits the case when no increment is added', () => {
  const note = (selection) => mountRace({ touched: true, incrementMonth: 9, ...selection }).root.querySelector('.race-inc-note');
  const top = note({ pointIndex: 10 });
  assert.match(top.textContent, /^You are at the top of this scale, so no increments are added\. The chart takes you to have been on this point since before July 2026\.$/);
  assert.equal(top.getAttribute('aria-live'), 'polite');
  const nurse = note({ sector: 'nurse', gradeId: 'nm-staff', pointIndex: 11 });
  assert.match(nurse.textContent, /top of this scale/);
  assert.match(nurse.textContent, /The long service increment above it is not added, because it depends on your years at the top\.$/);
  assert.match(note({ sector: 'nurse', gradeId: 'nm-staff', pointIndex: 12 }).textContent, /top of this scale/);
  // Assistant Lecturer point 1 chosen in November 2028 with an October increment: none falls in the chart's months
  const late = note({ gradeId: 'al-ne', pointIndex: 0, incrementMonth: 10, pointMonth: '2028-11' });
  assert.equal(late.textContent, 'No increment falls between July 2026 and March 2029 for the point and month you chose.');
  const hourly = note({ contract: 'hourly' });
  assert.match(hourly.textContent, /Choosing a grade above switches you from an hourly rate to a salary\./);
  // skipped points are mentioned where the scale has them
  assert.match(note({ sector: 'primary', gradeId: 'pt-new', pointIndex: 2 }).textContent, /one point each September \(skipped points are passed over\)/);
  assert.doesNotMatch(note({}).textContent, /skipped/);
});

test('the race: the lowest-point view says increments are not part of it', () => {
  const { root } = mountRace({ touched: true, incrementMonth: 9 });
  root.querySelectorAll('.race-picks button')[1].click();
  assert.equal(root.querySelector('.race-inc-note').textContent, 'Increments are not added to this comparison: it follows one scale point.');
  assert.equal(root.querySelector('.race-key-inc').hidden, true);
});

test('the race: with increments on, the tiles still compare the deal with prices, and say so', () => {
  const { root } = mountRace({ touched: true, incrementMonth: 9 });
  const labels = () => root.querySelectorAll('.race-tile small').map((s) => s.textContent);
  const tiles = () => root.querySelectorAll('.race-tile b').map((b) => b.textContent);
  assert.deepEqual(tiles(), ['€105,601', '+10.2%', '+7.5%', '2.5% more']);
  assert.deepEqual(labels(), ['Yearly pay, before tax', 'The deal adds', 'Prices are up', 'So pay buys']);
  const real = root.querySelector('.race-tile.real');
  assert.deepEqual([real.querySelector('.race-real-note').hidden, real.querySelector('.race-real-note').textContent], [false, 'increments not counted']);
  assert.equal(root.querySelector('.race-split').textContent,
    'With your increments, your own pay is up +21.5% (point 4 to point 7). Increments are normal progression, so they are not counted against prices.');
  assert.equal(root.querySelector('.race-legend li').textContent, 'Prices are ahead of the deal’s rises in 7 of the 33 months');
  assert.match(root.querySelector('.race-legend').textContent, /Your pay with increments, not counted against prices/);
  assert.match(root.querySelector('.race-source').textContent, /Your increments \(one point each September\) are shown but not counted against prices; the rest of the page shows the deal on its own\./);
  const label = root.querySelector('svg').getAttribute('aria-label');
  assert.match(label, /By the end, the deal’s rises add 10\.2% and prices are up 7\.5%\./);
  assert.match(label, /With your increments, your own pay is up 21\.5%, which is not counted against prices\.$/);
  assert.equal(root.querySelectorAll('path.line-own').length, 1, 'a second line for the reader’s own pay');
  assert.equal(mineText({ ...D0, touched: true, incrementMonth: 9 }, data).tail, 'by 2029, before increments');
  assert.equal(mineText({ ...D0, touched: true, incrementMonth: 9, pointIndex: 10 }, data).tail, 'by 2029', 'nothing to add at the top');

  const plain = mountRace({ touched: true });
  assert.deepEqual(plain.root.querySelectorAll('.race-tile small').map((s) => s.textContent), ['Yearly pay, before tax', 'Pay is up', 'Prices are up', 'So pay buys']);
  assert.equal(plain.root.querySelector('.race-real-note').hidden, true);
  assert.equal(plain.root.querySelectorAll('path.line-own').length, 0);
  assert.equal(plain.root.querySelector('.race-legend li').textContent, 'Prices are ahead of pay in 7 of the 33 months');
  assert.doesNotMatch(plain.root.querySelector('svg').getAttribute('aria-label'), /increments/);
});

test('the race: the line about your own pay follows the slider', () => {
  // Lecturer point 1, January increment: point 1 until December 2026, point 2 from January 2027.
  const { root } = mountRace({ touched: true, pointIndex: 0, incrementMonth: 1 });
  const scrub = root.querySelector('input.race-scrub');
  const at = (t) => { scrub.value = String(t); scrub.dispatchEvent({ type: 'input', bubbles: true }); return root.querySelector('.race-split').textContent; };
  assert.match(at(4), /^With your increments, your own pay is up \+2\.0% \(still on point 1\)\. /);
  assert.match(at(10), /^With your increments, your own pay is up \+7\.8% \(point 1 to point 2\)\. /);
  assert.deepEqual(root.querySelectorAll('.race-tile b').map((b) => b.textContent).slice(1, 3), ['+3.0%', '+2.7%'], 'the deal and prices by the end of April 2027');
});

test('the race: the deal compared with prices is the deal on the point you chose, flat sums and all', () => {
  // Assistant Lecturer point 1 (€47,572), January increment: the flat sums make the deal worth 11.7% on this point.
  const career = careerOf({ ...D0, touched: true, gradeId: 'al-ne', pointIndex: 0, incrementMonth: 1 }, SCALES, NOW);
  const m = hero.model(47572, data, { includeLB: false, career });
  near(hero.stateAt(m, 33).pay, (finalSalary(47572, DEAL.steps, { includeLB: false }) / 47572) * 100, 1e-9);
  near(hero.stateAt(m, 33).pay, 111.696, 0.001);
  near(hero.stateAt(m, 3).pay, ((47572 + 1200) / 47572) * 100, 1e-9);
  assert.ok(hero.stateAt(m, 33).own > hero.stateAt(m, 33).pay, 'own pay, with three increments, is up by more');
  assert.equal(hero.stateAt(m, 33).label, 'Point 4');
});

test('the race: a move between two points on the same figure is not marked, and the key is not shown', () => {
  // A teacher who started in 2011 or later on point 20: points 19 to 22 all pay €75,721.
  const { root } = mountRace({ touched: true, sector: 'primary', gradeId: 'pt-new', pointIndex: 19, incrementMonth: 9 });
  assert.equal(root.querySelectorAll('.race-inc-mark').length, 0);
  assert.equal(root.querySelector('.race-key-inc').hidden, true);
  assert.match(root.querySelector('.race-split').textContent, /^With your increments, your own pay is up \+10\.2% \(point 19 to point 22\)\./, 'the same rise as the deal: these moves add nothing');
});

test('the race: an hourly-paid reader who picks a grade starts on its first point, as a salary', () => {
  assert.deepEqual(gradePatch({ ...D0, contract: 'hourly', pointIndex: 4 }, SCALES, 'al-ne'), { gradeId: 'al-ne', pointIndex: 0 });
  assert.equal(gradePatch({ ...D0, pointIndex: 4 }, SCALES, 'sl1').pointIndex, 4);
  const { store, pick } = mountRace({ touched: true, contract: 'hourly', pointIndex: 4 });
  pick('#race-grade', 'al-ne');
  assert.deepEqual([store.get().contract, store.get().gradeId, store.get().pointIndex], ['full', 'al-ne', 0]);
});

test('increments: two rises on the same date are both counted, whatever order the sort leaves them in', () => {
  const steps = [
    { id: 'a', date: '2026-09-01', pct: 1, min: 0, kind: 'general' },
    { id: 'b', date: '2026-09-01', pct: 2, min: 0, kind: 'lb' },
    { id: 'c', date: '2027-01-01', pct: 1, min: 0, kind: 'general' },
  ];
  const path = careerEvents([50000, 60000], steps, { pos: 0, incrementMonth: 9, now: '2026-07', from: '2026-07', to: '2027-03', includeLB: true });
  assert.deepEqual(path.events.map((e) => e.kind), ['increment', 'general', 'lb', 'general']);
  near(path.events.at(-1).after, 60000 * 1.01 * 1.02 * 1.01);
  for (const e of path.events) assert.ok(e.after > e.before, `${e.kind} on ${e.date} goes up`);
});

test('copy: the glossary keeps increments out of every figure but the opening chart’s', () => {
  const text = data.GLOSSARY.find((g) => g.id === 'increment').text;
  assert.match(text, /are not included in the figures on this site\. The one exception is the opening chart/);
});
