// Yearly increments in the opening chart: an advanced option that adds the reader's
// own move up the scale to the deal's rises. Everything else on the page leaves them out.
import test from 'node:test';
import assert from 'node:assert/strict';
import { installDom } from './helpers/dom.js';
import * as data from '../site/js/data.js';
import { positionIn, careerEvents, finalSalary } from '../site/js/pay.js';
import { DEFAULT_SELECTION as D0, restoreSelection, careerOf } from '../site/js/selection.js';
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
  const saved = (patch) => JSON.stringify({ ...D0, touched: true, ...patch });
  assert.equal(restoreSelection(saved({ incrementMonth: 9 }), SCALES).incrementMonth, 9);
  assert.equal(restoreSelection(saved({}), SCALES).incrementMonth, null);
  for (const bad of [0, 13, 2.5, '9', true]) assert.equal(restoreSelection(saved({ incrementMonth: bad }), SCALES).touched, false, String(bad));
  const old = JSON.stringify({ touched: true, contract: 'full', gradeId: 'lect', pointIndex: 2, typed: null, fte: 1, alScale: 'al-ne', hoursPerYear: 0, includeLB: false, payMonth: '2027-01' });
  assert.deepEqual([restoreSelection(old, SCALES).pointIndex, restoreSelection(old, SCALES).incrementMonth], [2, null]);
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
  assert.deepEqual([nurse.values.length, nurse.pos], [12, 11], 'the long service increment is not on the way up');
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

test('the race with increments: the line starts on the earlier point and the tiles say what is deal and what is increment', () => {
  const career = careerOf({ ...D0, touched: true, incrementMonth: 9 }, SCALES, NOW);
  const m = hero.model(89894, data, { includeLB: false, career });
  assert.equal(m.base, 86936, 'July 2026 was on point 4');
  assert.equal(m.steps.filter((s) => s.kind === 'increment').length, 3);
  const end = hero.stateAt(m, 33);
  near(end.pay, (105601.31 / 86936) * 100, 0.001);
  near(end.deal, (finalSalary(86936, DEAL.steps, { includeLB: false }) / 86936) * 100, 0.001);
  assert.equal(end.label, 'Point 7');
  const june2027 = hero.stateAt(m, 12);
  assert.equal(june2027.label, 'Point 5');
  near(hero.payThen(m, 12), 89894 * 1.02 * 1.01, 0.01);
  assert.equal(hero.stateAt(m, 0).label, 'Point 4');
  // without a career the model is as before
  const plain = hero.model(89894, data, { includeLB: false });
  assert.equal(hero.stateAt(plain, 33).label, undefined);
  near(hero.stateAt(plain, 33).deal, hero.stateAt(plain, 33).pay);
});

function mountRace(selection) {
  const root = document.createElement('div');
  const form = document.createElement('div');
  document.body.append(root, form);
  const store = createStore({ ...D0, ...selection });
  hero.render(root, { store, data, now: NOW });
  yourPay.render(form, { store, data });
  const tiles = () => root.querySelectorAll('.race-tile b').map((b) => b.textContent);
  const pick = (id, value) => { const el = root.querySelector(id); el.value = String(value); el.dispatchEvent({ type: 'change', bubbles: true }); };
  return { root, form, store, tiles, pick };
}

test('the race: the advanced panel sets grade, point and increment month, and the figures follow', () => {
  const { root, form, store, tiles, pick } = mountRace({});
  const panel = root.querySelector('details.race-advanced');
  assert.ok(panel, 'there is an advanced panel');
  assert.equal(panel.hasAttribute('open'), false);
  assert.match(panel.querySelector('summary').textContent, /Advanced/);
  assert.deepEqual(root.querySelectorAll('#race-inc option').map((o) => o.textContent).slice(0, 3), ['Do not count increments', 'January', 'February']);
  assert.deepEqual(tiles().slice(0, 2), ['€99,037', '+10.2%']);
  assert.equal(root.querySelector('.race-split').hidden, true);

  pick('#race-inc', 9);
  assert.deepEqual([store.get().incrementMonth, store.get().touched], [9, true]);
  assert.deepEqual(tiles().slice(0, 2), ['€105,601', '+21.5%']);
  assert.equal(root.querySelector('.race-split').hidden, false);
  assert.equal(root.querySelector('.race-split').textContent, '+10.2% from the deal, +11.3% from increments');
  assert.match(root.querySelector('.race-monthly').textContent, /^about €8,800 a month before tax, on point 7$/);
  assert.match(root.querySelector('.race-adv-note').textContent, /one point each September, counting from the point you are on now \(November 2026\)/);
  assert.match(root.querySelector('.race-source').textContent, /Increments are counted/);
  assert.equal(root.querySelectorAll('.race-inc-mark').length, 3, 'each increment is marked on the line');

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
});

test('the race: a saved increment month opens the panel, and the lowest-point view ignores it', () => {
  const { root, tiles } = mountRace({ touched: true, incrementMonth: 9 });
  assert.equal(root.querySelector('details.race-advanced').hasAttribute('open'), true);
  assert.deepEqual(tiles().slice(0, 2), ['€105,601', '+21.5%']);
  const [, lowest] = root.querySelectorAll('.race-picks button');
  lowest.click();
  assert.deepEqual(tiles().slice(0, 2), ['€53,136', '+11.7%']);
  assert.equal(root.querySelector('.race-split').hidden, true);
});

test('the race: where increments cannot apply, the panel says why', () => {
  const top = mountRace({ touched: true, incrementMonth: 9, pointIndex: 10 });
  assert.match(top.root.querySelector('.race-adv-note').textContent, /top of this scale/);
  assert.deepEqual(top.tiles().slice(0, 2), ['€118,684', '+10.2%']);
  const hourly = mountRace({ touched: true, incrementMonth: 9, contract: 'hourly' });
  assert.match(hourly.root.querySelector('.race-adv-note').textContent, /need a grade and scale point/);
  assert.equal(hourly.root.querySelector('.race-split').hidden, true);
});

test('copy: the page still says increments are left out everywhere but the opening chart', () => {
  assert.ok(data.ASSUMPTIONS.some((a) => /increments are not included/i.test(a) && /opening chart/.test(a)));
  assert.match(data.GLOSSARY.find((g) => g.id === 'increment').text, /opening chart/);
});
