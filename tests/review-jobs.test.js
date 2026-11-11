// Fixes from the independent review of the new jobs, and the facts taken from the
// published text of the proposed agreement.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { installDom } from './helpers/dom.js';
import * as data from '../site/js/data.js';
import { sectorPatch, figuresFor } from '../site/js/selection.js';
import { LECTURER_EXAMPLE as D0 } from './helpers/selections.js';
import { createStore } from '../site/js/state.js';
import * as yourPay from '../site/js/sections/your-pay.js';
import * as vsLastDeal from '../site/js/sections/vs-last-deal.js';
import * as flat from '../site/js/sections/flat-or-percent.js';
import * as hero from '../site/js/sections/hero.js';

const document = installDom();
const { SCALES, DEAL } = data;
const sector = (id) => SCALES.sectors.find((s) => s.id === id);
const grade = (id) => SCALES.grades.find((g) => g.id === id);
const vals = (id) => grade(id).points.map((p) => p.value);
const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');

function mount(mod, selection) {
  const root = document.createElement('div');
  document.body.append(root);
  const store = createStore({ ...D0, ...selection });
  mod.render(root, { store, data, now: '2026-11' });
  return { root, store };
}

test('changing job: the 1% switch is reset, a typed salary is kept, and an hourly rate becomes full-time where there is none', () => {
  const lecturer = { ...D0, touched: true, includeOwed: true };
  assert.equal(sectorPatch(lecturer, SCALES, 'garda').includeOwed, false, 'counting it for lecturers says nothing about gardaí');
  assert.equal(sectorPatch(lecturer, SCALES, 'primary').includeOwed, false);
  const typed = { ...D0, touched: true, gradeId: 'typed', typed: 52000 };
  assert.deepEqual([sectorPatch(typed, SCALES, 'nurse').gradeId, sectorPatch(typed, SCALES, 'nurse').sector], ['typed', 'nurse']);
  assert.equal(sectorPatch({ ...D0, contract: 'hourly' }, SCALES, 'primary').contract, 'full');
  assert.equal(sectorPatch({ ...D0, contract: 'part' }, SCALES, 'primary').contract, 'part');
});

test('your pay: the contract buttons follow a job change away from hourly-paid, and back', () => {
  const { root, store } = mount(yourPay, { touched: true, contract: 'hourly' });
  const checked = () => root.querySelectorAll('input[name="pp-contract"]').filter((r) => r.checked).map((r) => r.value);
  const jobs = root.querySelector('#pp-sector');
  const choose = (id) => { jobs.value = id; jobs.dispatchEvent({ type: 'change', bubbles: true }); };
  assert.deepEqual(checked(), ['hourly']);
  choose('primary');
  assert.deepEqual([store.get().contract, checked()], ['full', ['full']]);
  assert.equal(root.querySelector('.pay-big .from').textContent, '€45,833');
  choose('tu');
  assert.deepEqual(checked(), ['full'], 'back as a lecturer, still full-time until hourly is picked again');
});

test('your pay: a typed salary survives a job change and does not borrow the job’s caveat about its scale', () => {
  const { root, store } = mount(yourPay, { touched: true, gradeId: 'typed', typed: 52000 });
  const jobs = root.querySelector('#pp-sector');
  jobs.value = 'garda';
  jobs.dispatchEvent({ type: 'change', bubbles: true });
  assert.deepEqual([store.get().sector, store.get().gradeId, store.get().typed], ['garda', 'typed', 52000]);
  assert.equal(root.querySelector('.pay-big .from').textContent, '€52,000');
  assert.doesNotMatch(root.querySelector('.pay-caveat').textContent, /An Garda Síochána’s table/);
  assert.match(root.querySelector('.pay-caveat').textContent, /^Gross pay at your current scale point/);
});

test('gardaí: the GRA’s position is given for garda rank only, and in the GRA’s own terms', () => {
  const { owed, lastDealNote } = sector('garda');
  for (const text of [owed.status, owed.note, lastDealNote]) {
    assert.match(text, /garda rank/i);
    assert.match(text, /AGSI/, 'says nothing was found for sergeants and inspectors');
  }
  assert.match(owed.note, /all but one of its eight claims for the 1% due from 1 September 2025 had been rejected/);
  assert.match(owed.note, /24 November 2026/);
  assert.ok(owed.sourceIds.includes('psa-2026-text'));
  const tu = sector('tu').owed;
  assert.match(tu.note, /24 November 2026/);
  assert.ok(tu.sourceIds.includes('psa-2026-text'));
});

test('primary teachers: the allowances are described as what has been agreed so far, not as the whole instalment paid', () => {
  const note = sector('primary').lastDealNote;
  assert.match(note, /has been used so far for allowances/);
  assert.match(note, /some of the INTO’s claims/);
  assert.doesNotMatch(note, /was paid/);
  assert.ok(data.ASSUMPTIONS.some((a) => /primary teachers, nurses and midwives it has been used so far/.test(a)));
});

test('nurses: both versions of the Enhanced scale are named for what they are', () => {
  assert.match(grade('nm-enhanced').note, /Department of Health’s consolidated salary scales/);
  assert.match(grade('nm-enhanced').note, /differ by about 2%/);
  assert.doesNotMatch(grade('nm-enhanced').note, /lower/);
  assert.match(grade('nm-enhanced').name, /consolidated scales/);
  assert.match(data.SOURCES.find((s) => s.id === 'hse-scales-june-2026').publisher, /Department of Health/);
});

test('gardaí: the scales hang together as the official table does', () => {
  // In the official table the 2015 scale from point 3 is scale A from point 2, and each B scale runs a little under A.
  assert.deepEqual(vals('garda-2015').slice(2), vals('garda-a').slice(1, 19));
  for (const [b, a] of [['garda-b', 'garda-a'], ['sergeant-b', 'sergeant-a'], ['inspector-b', 'inspector-a']]) {
    vals(b).forEach((v, i) => {
      const ratio = v / vals(a)[i];
      assert.ok(ratio > 0.965 && ratio < 0.98, `${b} point ${i + 1}: ${ratio.toFixed(4)}`);
    });
  }
});

test('chapter 7: where the last deal’s 1% is in the scale, the draft is also given like for like', () => {
  const post = mount(vsLastDeal, { touched: true, sector: 'postprimary', gradeId: 'ppt-new', pointIndex: 9 });
  const yours = (root, which) => root.querySelector(`.vs-card.${which} .vs-yours dd`).textContent;
  assert.match(yours(post.root, 'prev'), /^\+10\.7%/);
  assert.match(yours(post.root, 'draft'), /^\+10\.2%/);
  assert.match(yours(post.root, 'draft'), /\+11\.3% counting its 1% local bargaining too, as the 2024–26 figure does/);
  assert.match(post.root.querySelector('.vs-card.prev .note').textContent, /section 4\.2\.4/);
  post.store.set({ includeLB: true });
  assert.equal(yours(post.root, 'draft'), '+11.3%', 'once both are counted there is one figure');
  // a job whose scale does not have the 1%: nothing extra, and the note is that job's own
  const primary = mount(vsLastDeal, { touched: true, sector: 'primary', gradeId: 'pt-new', pointIndex: 9 });
  assert.equal(yours(primary.root, 'draft'), '+10.2%');
  assert.match(primary.root.querySelector('.vs-card.prev .note').textContent, /INTO/);
  const lecturer = mount(vsLastDeal, {});
  assert.match(lecturer.root.querySelector('.vs-card.prev .note').textContent, /still being sought by TUI/);
  assert.match(lecturer.root.querySelector('.vs-card.prev').textContent, /today’s lowest lecturing point/);
});

test('chapter 4: the note and the examples follow the job', () => {
  const { root, store } = mount(flat, {});
  assert.match(root.querySelector('.fp-who').textContent, /Assistant Lecturers on the lower points/);
  assert.match(root.querySelector('.examples').textContent, /alongside lecturer starting pay worked out on this site/);
  store.set({ touched: true, sector: 'postprimary', gradeId: 'ppt-new', pointIndex: 0 });
  assert.match(root.querySelector('.fp-who').textContent, /^For a post-primary teacher, /);
  assert.match(root.querySelector('.fp-example-note').textContent, /12\.7%/);
  store.set({ sector: 'nurse', gradeId: 'nm-staff', pointIndex: 0 });
  assert.equal(root.querySelector('.fp-example-note').hidden, true);
});

test('labels: a long service increment keeps its capitals as an abbreviation and loses them as words', () => {
  const label = (patch) => figuresFor({ ...D0, touched: true, ...patch }, SCALES);
  assert.equal(label({ gradeId: 'ls2', pointIndex: 11 }), 'Showing: Lecturer 2 (appointed before September 1998, with long service increments), LSI 1.');
  assert.equal(label({ sector: 'nurse', gradeId: 'nm-staff', pointIndex: 12 }), 'Showing: Staff Nurse or Midwife, long service increment.');
  assert.equal(figuresFor(D0, SCALES), 'Example: Lecturer, point 5. Pick your own job, grade and point at the top of the page.');
});

test('the opening chart names the low point of the chosen job', () => {
  const { root, store } = mount(hero, {});
  const lowest = () => root.querySelectorAll('.race-picks button')[1].textContent;
  assert.equal(lowest(), 'The lowest lecturing point (€47,572)');
  store.set({ touched: true, sector: 'nurse', gradeId: 'cnm2', pointIndex: 3 });
  assert.equal(lowest(), 'The starting point for new nurses and midwives (€44,832)');
  store.set({ sector: 'garda', gradeId: 'sergeant-a', pointIndex: 0 });
  assert.equal(lowest(), 'The starting point for new gardaí (€39,586)');
});

test('the published text of the proposed agreement is the source for the deal', () => {
  const source = data.SOURCES.find((s) => s.id === 'psa-2026-text');
  assert.ok(source && source.url.startsWith('https://www.asti.ie/'), 'the document is listed');
  assert.equal(DEAL.sourceIds[0], 'psa-2026-text');
  assert.match(data.ASSUMPTIONS[0], /proposed Public Service Agreement 2026–2029/);
  assert.match(data.ASSUMPTIONS[0], /section 3\.1\.2/);
  const everything = JSON.stringify([data.ASSUMPTIONS, data.BEYOND_PAY, data.GLOSSARY, DEAL.reviewClause]);
  assert.doesNotMatch(everything, /had not been published|has not been published|have not been published|will be in the official text/);
  assert.match(DEAL.reviewClause, /six weeks/);
  assert.match(data.GLOSSARY.find((g) => g.id === 'review-clause').text, /assumptions/);
  const beyond = Object.fromEntries(data.BEYOND_PAY.map((b) => [b.id, b]));
  for (const id of ['local-bargaining', 'review-clause', 'ai-hybrid', 'reform', 'coverage']) {
    assert.equal(beyond[id].status, 'known', id);
    assert.ok(beyond[id].sourceIds.includes('psa-2026-text'), id);
  }
  assert.match(beyond['local-bargaining'].text, /24 November 2026/);
  assert.match(beyond.coverage.text, /section 5\.7\.1/);
  assert.ok(data.TIMELINE.some((e) => e.date === '2026-11-24' && e.sourceId === 'psa-2026-text'));
});

test('nothing still speaks only to lecturers where every job reads it', () => {
  assert.ok(data.ASSUMPTIONS.some((a) => /^For hourly-paid lecturers, back pay assumes/.test(a)));
  assert.match(data.GLOSSARY.find((g) => g.id === 'scale-point').text, /gardaí/);
  assert.match(read('site/js/sections/your-pay.js'), /Pick your own job, grade and point/);
  assert.doesNotMatch(read('package.json'), /for TU lecturers/);
  assert.doesNotMatch(read('README.md'), /tuLbNote/);
});
