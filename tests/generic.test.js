// The page opens generic: no job, grade or point is shown until the reader picks their
// own. Until then every chapter works from an example salary.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { installDom } from './helpers/dom.js';
import * as data from '../site/js/data.js';
import { finalSalary } from '../site/js/pay.js';
import { DEFAULT_SELECTION, ANY_JOB, restoreSelection, resolvePay, figuresFor, sectorOf, owedFor, sectorPatch, lowestScalePoint } from '../site/js/selection.js';
import { createStore } from '../site/js/state.js';
import { mineText } from '../site/js/header.js';
import * as hero from '../site/js/sections/hero.js';
import * as yourPay from '../site/js/sections/your-pay.js';
import * as vsLastDeal from '../site/js/sections/vs-last-deal.js';
import * as flat from '../site/js/sections/flat-or-percent.js';
import * as backPay from '../site/js/sections/back-pay.js';

const document = installDom();
const { SCALES, DEAL } = data;
const html = readFileSync(new URL('../site/index.html', import.meta.url), 'utf8');
const NOW = '2026-11';

function mount(mod, selection = {}) {
  const root = document.createElement('div');
  document.body.append(root);
  const store = createStore({ ...DEFAULT_SELECTION, ...selection });
  mod.render(root, { store, data, now: NOW });
  const pick = (id, value) => { const el = root.querySelector(id); el.value = String(value); el.dispatchEvent({ type: 'change', bubbles: true }); };
  return { root, store, pick };
}

test('the default: no job, grade or point, and an example salary at the deal’s threshold', () => {
  assert.deepEqual([DEFAULT_SELECTION.sector, DEFAULT_SELECTION.gradeId, DEFAULT_SELECTION.typed, DEFAULT_SELECTION.touched], ['any', 'typed', 60000, false]);
  assert.equal(DEFAULT_SELECTION.typed, DEAL.threshold);
  assert.equal(sectorOf(DEFAULT_SELECTION, SCALES), ANY_JOB);
  assert.equal(owedFor(DEFAULT_SELECTION, SCALES), null, 'no job, so no job’s 1% from 2025');
  assert.deepEqual([ANY_JOB.hourly, ANY_JOB.caveat, ANY_JOB.low], [false, null, null]);
  assert.equal(lowestScalePoint(SCALES, 'any'), null);
  const pay = resolvePay(DEFAULT_SELECTION, SCALES);
  assert.deepEqual([pay.base, pay.published, pay.unit, pay.label, pay.isExample], [60000, 60000, 'year', 'a salary of €60,000', true]);
  assert.equal(figuresFor(DEFAULT_SELECTION, SCALES), 'Example: a salary of €60,000. Pick your own job, grade and point at the top of the page.');
  assert.deepEqual(mineText(DEFAULT_SELECTION, data), { label: 'Example: a salary of €60,000', figure: '€66,103', tail: 'by 2029', go: 'Choose yours' });
});

test('saved choices: none means the generic page; older ones still load as a lecturer’s', () => {
  assert.deepEqual(restoreSelection(null, SCALES), { ...DEFAULT_SELECTION });
  assert.deepEqual(restoreSelection('{"touched":false}', SCALES), { ...DEFAULT_SELECTION });
  const before = JSON.stringify({ touched: true, contract: 'full', gradeId: 'al-ne', pointIndex: 0, typed: null, fte: 1, alScale: 'al-ne', hoursPerYear: 0, includeLB: false, payMonth: '2027-01' });
  assert.deepEqual([restoreSelection(before, SCALES).sector, restoreSelection(before, SCALES).gradeId], ['tu', 'al-ne'], 'saved before jobs existed');
  const saved = (patch) => JSON.stringify({ ...DEFAULT_SELECTION, touched: true, ...patch });
  assert.deepEqual([restoreSelection(saved({ typed: 52000 }), SCALES).sector, restoreSelection(saved({ typed: 52000 }), SCALES).typed], ['any', 52000], 'a salary with no job is a valid choice');
  assert.equal(restoreSelection(saved({ gradeId: 'lect', pointIndex: 2 }), SCALES).touched, false, 'a grade needs a job');
  assert.equal(restoreSelection(saved({ contract: 'hourly' }), SCALES).touched, false, 'so does an hourly rate');
});

test('choosing a job: from the example it starts on the job’s first grade; a salary the reader typed is kept', () => {
  assert.deepEqual(sectorPatch(DEFAULT_SELECTION, SCALES, 'nurse'), { sector: 'nurse', gradeId: 'nm-enhanced', pointIndex: 0, contract: 'full', includeOwed: false });
  const typed = { ...DEFAULT_SELECTION, touched: true, typed: 52000 };
  assert.equal(sectorPatch(typed, SCALES, 'nurse').gradeId, 'typed');
  const lecturer = { ...DEFAULT_SELECTION, touched: true, sector: 'tu', gradeId: 'lect', pointIndex: 4, typed: null };
  assert.deepEqual(sectorPatch(lecturer, SCALES, 'any'), { sector: 'any', gradeId: 'typed', typed: 89894, pointIndex: 0, contract: 'full', includeOwed: false }, 'back to no job: the salary stays');
});

test('the opening chart starts generic: empty pickers, an example salary, nothing about any job', () => {
  const { root } = mount(hero);
  const options = (id) => root.querySelectorAll(`${id} option`).map((o) => o.textContent);
  const job = root.querySelector('#race-job');
  assert.equal(job.value, '');
  assert.deepEqual(options('#race-job').slice(0, 2), ['Choose your job', 'Lecturer (technological university or institute of technology)']);
  assert.deepEqual([root.querySelector('#race-grade').disabled, options('#race-grade')], [true, ['Choose your job first']]);
  assert.deepEqual([root.querySelector('#race-point').disabled, options('#race-point')], [true, ['Choose your grade first']]);
  assert.equal(root.querySelector('#race-inc').disabled, true, 'an increment needs a point to start from');
  assert.deepEqual(root.querySelectorAll('.race-picker label').map((l) => l.textContent), ['Your job', 'Grade', 'Point you are on now', 'Increment month']);
  assert.deepEqual(root.querySelectorAll('.race-tile b').map((b) => b.textContent), ['€66,103', '+10.2%', '+7.5%', '2.5% more']);
  const line = root.querySelector('.context-line');
  assert.deepEqual([line.hidden, line.textContent], [false, 'Example: a salary of €60,000. Choose your own job, grade and point above.']);
  assert.equal(root.querySelector('.race-picks').hidden, true, 'no lowest point to compare with until a job is chosen');
  assert.equal(root.querySelector('#race-owed').closest('label').hidden, true);
  assert.doesNotMatch(root.querySelector('.race-tiles').textContent + line.textContent + root.querySelector('.race-source').textContent, /Lecturer|lecturer|point \d/);
});

test('the opening chart: job, then grade, then point; the chart is drawn for them when all three are chosen', () => {
  const { root, store, pick } = mount(hero);
  const options = (id) => root.querySelectorAll(`${id} option`).map((o) => o.getAttribute('value'));
  const euro = () => root.querySelector('.race-tile.euro b').textContent;

  pick('#race-job', 'nurse');
  assert.equal(store.get().touched, false, 'nothing changes until the choice is complete');
  assert.equal(euro(), '€66,103');
  assert.deepEqual([root.querySelector('#race-job').value, root.querySelector('#race-grade').disabled], ['nurse', false]);
  assert.deepEqual(options('#race-grade').slice(0, 3), ['', 'nm-enhanced', 'nm-enhanced-c10']);
  assert.equal(root.querySelector('#race-grade option').textContent, 'Choose your grade');
  assert.equal(root.querySelector('#race-point').disabled, true);

  store.set({ scenario: 'higher' }); // something else on the page changes meanwhile
  assert.equal(root.querySelector('#race-job').value, 'nurse', 'the job being chosen is not lost');
  store.set({ scenario: 'central' });

  pick('#race-grade', 'nm-staff');
  assert.equal(store.get().touched, false);
  assert.deepEqual([root.querySelector('#race-point').disabled, root.querySelector('#race-point').value], [false, '']);
  assert.equal(root.querySelector('#race-point option').textContent, 'Choose your point');
  assert.equal(options('#race-point').length, 14);

  pick('#race-point', 4);
  const s = store.get();
  assert.deepEqual([s.sector, s.gradeId, s.pointIndex, s.contract, s.touched, s.pointMonth], ['nurse', 'nm-staff', 4, 'full', true, NOW]);
  assert.equal(euro(), `€${Math.round(finalSalary(44213, DEAL.steps, { includeLB: false })).toLocaleString('en-IE')}`);
  assert.equal(root.querySelector('#race-inc').disabled, false);
  assert.deepEqual(options('#race-job').includes(''), false, 'once a job is chosen the prompt is gone');
  assert.equal(root.querySelector('.race-picks').hidden, false);

  pick('#race-job', 'garda'); // after that, a change of job applies at once
  assert.deepEqual([store.get().sector, store.get().gradeId, store.get().pointIndex], ['garda', 'garda-2015', 0]);
  assert.equal(root.querySelector('#race-point').value, '0');
});

test('a salary typed with no job chosen: the chart shows it, and the pickers still ask for a job', () => {
  const { root } = mount(hero, { touched: true, typed: 52000 });
  assert.equal(root.querySelector('#race-job').value, '');
  assert.equal(root.querySelector('.context-line').textContent, 'Showing: Typed salary.');
  assert.equal(root.querySelector('.race-tile.euro b').textContent, `€${Math.round(finalSalary(52000, DEAL.steps, { includeLB: false })).toLocaleString('en-IE')}`);
});

test('chapter 1 opens on the example salary, with no job chosen and nothing that belongs to one job', () => {
  const { root, store } = mount(yourPay);
  const job = root.querySelector('#pp-sector');
  assert.deepEqual([job.value, root.querySelector('#pp-sector option').textContent], ['any', 'Choose your job']);
  assert.equal(root.querySelector('#pp-grade').value, 'typed');
  assert.equal(root.querySelector('#pp-typed').value, '60000');
  assert.equal(root.querySelector('.pay-label').textContent, 'A salary of €60,000');
  assert.equal(root.querySelector('.example-badge').textContent, 'Example: a salary of €60,000. Pick your own job, grade and point, or type your salary.');
  assert.deepEqual([root.querySelector('.pay-big .from').textContent, root.querySelector('.pay-big .to').textContent], ['€60,000', '€66,103']);
  assert.equal(root.querySelector('label.switch-owed').hidden, true);
  assert.equal(root.querySelector('label.pill-hourly').hidden, true);
  assert.equal(root.querySelector('.pay-caveat').textContent, 'Gross pay at your current scale point: before tax, USC, PRSI and pension, and without annual increments.');
  job.value = 'garda';
  job.dispatchEvent({ type: 'change', bubbles: true });
  assert.deepEqual([store.get().sector, store.get().gradeId, store.get().pointIndex, store.get().touched], ['garda', 'garda-2015', 0, true]);
  assert.equal(root.querySelector('.example-badge').hidden, true);
});

test('the other chapters work with no job chosen', () => {
  const seven = mount(vsLastDeal);
  assert.doesNotMatch(seven.root.textContent, /today’s|lecturing|NaN|undefined/);
  assert.equal(seven.root.querySelector('.vs-card.prev .note'), null);
  assert.match(seven.root.querySelector('.vs-card.draft .vs-yours dd').textContent, /^\+10\.2%$/);
  const four = mount(flat);
  assert.equal(four.root.querySelector('.fp-who').textContent, 'Any salary below €60,000 gets at least the first flat sum. At €60,000 or more, every rise is a percentage.');
  const six = mount(backPay);
  assert.doesNotMatch(six.root.textContent, /NaN|undefined/);
  assert.equal(six.root.querySelector('#bp-owed').closest('label').hidden, true);
});

test('the header chip leads to the pickers at the top of the page', () => {
  assert.match(html, /<a class="mine" href="#top" data-mount="mine" hidden><\/a>/);
});

test('copy: the page says it opens on an example salary', () => {
  assert.ok(data.ASSUMPTIONS.some((a) => /Until you choose a job, grade and point, every chapter shows an example salary of €60,000/.test(a)));
});
