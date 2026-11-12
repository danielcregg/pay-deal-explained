// Fixes from the third independent review: the opening chart, the generic default,
// remembering, and what the page says the proposed agreement says.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { installDom } from './helpers/dom.js';
import { readCss, ruleBody } from './helpers/css.js';
import * as data from '../site/js/data.js';
import { createStore } from '../site/js/state.js';
import { mountMine, mineText } from '../site/js/header.js';
import { finalSalary } from '../site/js/pay.js';
import { DEFAULT_SELECTION, sectorPatch } from '../site/js/selection.js';
import * as hero from '../site/js/sections/hero.js';
import * as yourPay from '../site/js/sections/your-pay.js';
import * as beyondPay from '../site/js/sections/beyond-pay.js';
import * as flat from '../site/js/sections/flat-or-percent.js';
import * as vsLastDeal from '../site/js/sections/vs-last-deal.js';

const document = installDom();
const html = readFileSync(new URL('../site/index.html', import.meta.url), 'utf8');

// ---------- layout ----------

test('css: a rule that resizes the tiles for one screen width comes after the rule it changes', () => {
  const css = readCss('demos.css');
  const base = css.indexOf('.race-tile b {');
  assert.ok(base > 0, 'the base size of a tile’s figure');
  const wide = css.indexOf('.race-tile b { font-size: clamp(1.25rem');
  assert.ok(wide > base, 'beside the headline the figures are smaller: the rule has to come later to win');
  for (const narrow of ['@media (max-width: 639px)', '@media (max-width: 380px)']) {
    const at = css.indexOf(narrow, css.indexOf('.race-tiles {'));
    assert.ok(at > css.indexOf('.race-tile { border-radius'), `${narrow} comes after the tile’s base padding`);
    assert.ok(at > base, `${narrow} comes after the base size`);
  }
  // On a narrow phone the full-width euro tile keeps the larger figure: only the three small tiles shrink.
  const phone = ruleBody(css.slice(base), '@media (max-width: 380px)');
  assert.match(phone, /\.race-tile:not\(\.euro\) b\s*\{\s*font-size:\s*1rem;/);
  assert.doesNotMatch(phone, /\.race-tile b\s*\{/);
});

test('css: the like-for-like figure in chapter 7 reads as a note, not as a second headline figure', () => {
  const css = readCss('demos.css');
  assert.match(css, /\.vs-like\s*\{[^}]*display:\s*block;[^}]*font-weight:\s*400;/);
});

test('without JavaScript the opening is one column, since there is no chart to sit beside the headline', () => {
  const head = html.slice(0, html.indexOf('</head>'));
  const mark = head.indexOf("<script>document.documentElement.classList.add('js');</script>");
  assert.ok(mark > 0 && mark < head.indexOf('<link rel="stylesheet"'), 'the page says it has JavaScript before it is first drawn');
  assert.doesNotMatch(head, /<noscript>/, 'no <noscript> in the head: the load-failure message reads the first one on the page');
  const css = readCss('base.css');
  assert.match(css, /html:not\(\.js\) \.hero-inner\s*\{\s*grid-template-columns:\s*minmax\(0, 1fr\);\s*grid-template-areas:\s*"text"\s*"facts";/);
  assert.match(css, /html:not\(\.js\) \.race-wrap\s*\{\s*display:\s*none;/);
  assert.match(html, /if \(empty\.length === mounts\.length\) \{\s*document\.documentElement\.classList\.remove\('js'\);/, 'and takes it back if nothing loaded');
});

test('the header stays on one row: a long chip is cut short at its tail', () => {
  const el = document.createElement('a');
  const store = createStore({ ...DEFAULT_SELECTION });
  mountMine(el, store, data);
  assert.equal(el.querySelector('.mine-tail').textContent, 'by 2029');
  const css = readCss('base.css');
  const wide = css.slice(css.indexOf('@media (min-width: 1040px)', css.indexOf('.mine-label')));
  assert.match(wide.slice(0, 700), /\.site-header\s*\{\s*flex-wrap:\s*nowrap;/);
  assert.match(wide.slice(0, 700), /\.mine-tail\s*\{[^}]*text-overflow:\s*ellipsis;/);
});

// ---------- state ----------

const { SCALES, DEAL } = data;
const NOW = '2026-11';
const lecturer = { ...DEFAULT_SELECTION, touched: true, sector: 'tu', gradeId: 'lect', pointIndex: 4, typed: null };
const by2029 = (salary) => `€${Math.round(finalSalary(salary, DEAL.steps, { includeLB: false })).toLocaleString('en-IE')}`;

function mount(mod, selection = {}, now = NOW) {
  const root = document.createElement('div');
  document.body.append(root);
  const store = createStore({ ...DEFAULT_SELECTION, ...selection });
  mod.render(root, { store, data, now });
  const fire = (el, type = 'change') => el.dispatchEvent({ type, bubbles: true });
  const pick = (id, value) => { const el = root.querySelector(id); el.value = String(value); fire(el); };
  const radio = (name, value) => { const el = root.querySelectorAll(`input[name="${name}"]`).find((r) => r.value === value); el.checked = true; fire(el); };
  return { root, store, pick, radio, fire };
}

test('the store: clearing replaces everything and tells the sections it was a reset', () => {
  const store = createStore({ ...lecturer, scenario: 'higher' });
  const seen = [];
  store.subscribe((sel, meta) => seen.push([sel.sector, Boolean(meta?.reset)]));
  store.set({ pointIndex: 5 });
  store.reset({ ...DEFAULT_SELECTION });
  assert.deepEqual(seen, [['tu', false], ['any', true]]);
  assert.deepEqual(store.get(), { ...DEFAULT_SELECTION });
});

test('chapter 1: the salary box always shows the salary the figures use', () => {
  const { root, store, pick } = mount(yourPay);
  pick('#pp-sector', 'primary');
  pick('#pp-sector', 'any'); // back to no job: the point's salary stays, as a salary on its own
  assert.equal(store.get().typed, 45833);
  assert.equal(root.querySelector('.pay-big .from').textContent, '€45,833');
  assert.equal(root.querySelector('#pp-typed').value, '45833', 'not the 60000 it opened with');
  // the box is left alone while the reader is typing in it
  const box = root.querySelector('#pp-typed');
  box.focus();
  box.value = '52,000';
  box.dispatchEvent({ type: 'input', bubbles: true });
  assert.deepEqual([store.get().typed, box.value], [52000, '52,000']);
});

test('chapter 1: part-time, or a share of full time, on the example salary is still the example', () => {
  const { root, store, pick, radio } = mount(yourPay);
  radio('pp-contract', 'part');
  const fte = root.querySelector('#pp-fte');
  fte.value = '50';
  fte.dispatchEvent({ type: 'input', bubbles: true });
  assert.deepEqual([store.get().contract, store.get().fte, store.get().touched], ['part', 0.5, false]);
  assert.match(mineText(store.get(), data).label, /^Example: /);
  assert.equal(root.querySelector('.example-badge').hidden, false);
  pick('#pp-sector', 'nurse'); // so a job chosen next starts on its own scale, not on "a typed 60000"
  assert.deepEqual([store.get().gradeId, store.get().touched], ['nm-enhanced', true]);
});

test('the month a point was given moves only when the job, grade or point is chosen', () => {
  const given = { ...lecturer, pointMonth: '2026-08', incrementMonth: 12 };
  const top = mount(hero, given);
  top.pick('#race-inc', 9);
  assert.deepEqual([top.store.get().incrementMonth, top.store.get().pointMonth], [9, '2026-08'], 'a different increment month does not re-date the point');
  top.pick('#race-point', 5);
  assert.equal(top.store.get().pointMonth, NOW);

  const one = mount(yourPay, given);
  one.radio('pp-contract', 'part');
  const fte = one.root.querySelector('#pp-fte');
  fte.value = '80';
  fte.dispatchEvent({ type: 'input', bubbles: true });
  assert.deepEqual([one.store.get().fte, one.store.get().pointMonth], [0.8, '2026-08'], 'nor does anything else about the job');
  one.pick('#pp-point', 6);
  assert.equal(one.store.get().pointMonth, NOW);
  one.store.set({ pointMonth: '2026-08' });
  one.pick('#pp-grade', 'sl1');
  assert.equal(one.store.get().pointMonth, NOW, 'a new grade is a new statement of where the reader stands');
});

test('a new job starts without an increment month: the old job’s month says nothing about it', () => {
  assert.equal(sectorPatch({ ...lecturer, incrementMonth: 9 }, SCALES, 'garda').incrementMonth, null);
  const { store, pick } = mount(hero, { ...lecturer, incrementMonth: 9 });
  pick('#race-job', 'nurse');
  assert.deepEqual([store.get().sector, store.get().incrementMonth], ['nurse', null]);
});

test('the opening chart: choosing in the pickers leaves the lowest-point comparison', () => {
  const { root, pick } = mount(hero, lecturer);
  const euro = () => root.querySelector('.race-tile.euro b').textContent;
  const [, lowest] = root.querySelectorAll('.race-picks button');
  lowest.click();
  assert.deepEqual([euro(), lowest.getAttribute('aria-pressed')], [by2029(47572), 'true']);
  pick('#race-point', 9);
  assert.deepEqual([euro(), lowest.getAttribute('aria-pressed')], [by2029(SCALES.grades.find((g) => g.id === 'lect').points[9].value), 'false'],
    'the figures are for the point just chosen');
  lowest.click();
  document.dispatchEvent({ type: 'presentchange' }); // Present mode hides the two buttons and the line that names the comparison
  assert.equal(lowest.getAttribute('aria-pressed'), 'false', 'so it shows what the pickers say');
});

test('the opening chart: a half-made choice is dropped when the job is un-chosen or the choices are cleared', () => {
  const { root, store, pick } = mount(hero);
  const state = () => [root.querySelector('#race-job').value, root.querySelector('#race-grade').value, root.querySelector('#race-grade').disabled, root.querySelector('#race-point').disabled];
  pick('#race-job', 'nurse');
  pick('#race-grade', 'cnm2');
  assert.deepEqual(state(), ['nurse', 'cnm2', false, false]);
  store.reset({ ...DEFAULT_SELECTION }); // "Clear my choices" in chapter 1
  assert.deepEqual(state(), ['', '', true, true]);
  pick('#race-job', 'nurse');
  pick('#race-grade', 'cnm2');
  pick('#race-job', ''); // back to "Choose your job"
  assert.deepEqual(state(), ['', '', true, true], 'no grade without a job');
  assert.equal(store.get().touched, false);
});

test('chapter 1: "Clear my choices" is a reset, and the tick box follows the store', () => {
  const { root, store } = mount(yourPay, { ...lecturer, remember: true });
  const box = root.querySelector('#pp-remember');
  assert.equal(box.checked, true);
  store.set({ remember: false }); // another tab unticked it
  assert.equal(box.checked, false);
  let reset = false;
  store.subscribe((_sel, meta) => { reset = Boolean(meta?.reset); });
  root.querySelectorAll('button').find((b) => b.textContent === 'Clear my choices').click();
  assert.equal(reset, true);
  assert.deepEqual(store.get(), { ...DEFAULT_SELECTION });
});

// ---------- what the page says ----------

const beyond = Object.fromEntries(data.BEYOND_PAY.map((b) => [b.id, b]));
const scenario = (id) => data.INFLATION.scenarios.find((s) => s.id === id);

test('chapter 8: what comes from the agreement’s text is marked as proposed, not as confirmed', () => {
  const { root } = mount(beyondPay);
  const badges = root.querySelectorAll('.badge.known').map((b) => b.textContent);
  assert.ok(badges.length >= 4);
  assert.deepEqual([...new Set(badges)], ['In the proposed text'], 'the agreement is not ratified until the ballots are counted');
  assert.doesNotMatch(root.textContent, /Confirmed/);
});

test('local bargaining: each statement is the text’s own, with its section', () => {
  const text = beyond['local-bargaining'].text;
  assert.match(text, /The proposed text calls it a payment of up to 1% of basic pay costs \(section 3\.1\.2\)/);
  assert.match(text, /not meant, as a rule, to deliver a general pay rise \(section 4\.1\.3\)/);
  assert.doesNotMatch(text, /calls it[^.]*used as each sector negotiates/, 'our own gloss is not put in the text’s mouth');
  // section 4.2.4: who may take a later 1% as a general rise
  assert.match(text, /Bargaining units that settled the first phase in the way that was envisaged \(the text’s Category One\) may opt to take either the second or the third 1% as a general pay rise; units whose first phase included a general rise \(Category Two\) will not have that option \(section 4\.2\.4\)/);
  assert.match(text, /The text says first-phase matters still outstanding \(the 1% due from 1 September 2025\) must be resolved by 24 November 2026 \(section 4\.2\.3\)/);
});

test('post-primary teachers: section 4.2.4 leaves their agreement untouched; it does not itself promise it', () => {
  const note = data.SCALES.sectors.find((s) => s.id === 'postprimary').lastDealNote;
  for (const text of [note, beyond.education.text]) {
    assert.match(text, /do(es)? not affect the full implementation of the post-primary teachers’ 3% local bargaining agreement/);
    assert.match(text, /senior cycle reform/);
    assert.doesNotMatch(text, /is to be implemented in full/);
    assert.match(text, /section 4\.2\.4/);
  }
});

test('artificial intelligence: the guidelines are named as the text names them, with what it says on redundancy', () => {
  const text = beyond['ai-hybrid'].text;
  assert.match(text, /the Guidelines for the Responsible Use of Artificial Intelligence in the Public Service/);
  assert.doesNotMatch(text, /national guidelines/);
  assert.match(text, /compulsory redundancy will not apply in the public service, save for the limited exceptions in earlier agreements \(section 2\.5\)/);
});

test('chapter 4: lecturer starting pay is worked out beside the reported figures only for a lecturer', () => {
  const { root, store } = mount(flat);
  const ours = () => root.querySelectorAll('.examples .hbars li').filter((li) => li.className === 'ours').map((li) => li.querySelector('.hb-label').textContent);
  const intro = () => root.querySelector('.examples .note').textContent;
  assert.deepEqual(ours(), [], 'no job chosen: no job’s grades are named');
  assert.equal(intro(), 'As reported on 11 November. All include local bargaining as a 1% rise.');
  assert.equal(root.querySelectorAll('.examples .hbars li').length, data.DEAL.publishedExamples.length);
  store.set({ ...lecturer });
  assert.deepEqual(ours(), ['Assistant Lecturer, starting pay (calculated here)', 'Lecturer, starting pay (calculated here)']);
  assert.match(intro(), /alongside lecturer starting pay worked out on this site/);
  store.set({ sector: 'garda', gradeId: 'garda-2015', pointIndex: 0 });
  assert.deepEqual(ours(), []);
});

test('inflation paths: each says whether it is a forecast or an illustration, wherever its figures are', () => {
  assert.deepEqual(data.INFLATION.scenarios.map((s) => s.kind), ['illustration', 'forecast', 'illustration']);
  for (const id of ['lower', 'higher']) assert.match(scenario(id).phrase, /, an illustration\)$/);
  const { root, store } = mount(hero, lecturer);
  const tile = () => root.querySelector('.race-tile.price .race-price-note').textContent;
  const key = () => root.querySelector('.race-legend li').textContent;
  assert.deepEqual([tile(), key()], ['forecast', 'Prices are ahead of pay in 7 of the 33 months']);
  store.set({ scenario: 'higher' });
  assert.deepEqual([tile(), key()], ['illustration', 'Prices would be ahead of pay in 29 of the 33 months']);
  assert.match(root.querySelector('svg').getAttribute('aria-label'), /Prices would be ahead of pay in 29 of the 33 months\./);
  store.set({ scenario: 'lower' });
  assert.deepEqual([tile(), key()], ['illustration', 'Prices would be ahead of pay in 4 of the 33 months']);
});

test('the Central Bank path’s note states the same rates the chart uses', () => {
  assert.ok(scenario('central').note.includes(hero.forecastText(data.INFLATION)), 'a change to the rates has to reach the sentence that quotes them');
  const rates = data.INFLATION.scenarios.map((s) => s.rates);
  assert.match(scenario('lower').note, new RegExp(`${rates[0][2026]}% for 2026, then ${rates[0][2027]}% a year`));
  assert.match(scenario('lower').phrase, new RegExp(`${rates[0][2027]}% a year from 2027`));
  assert.match(scenario('higher').note, new RegExp(`rising by ${rates[2][2027]}% a year`));
  assert.equal(rates[2][2026], data.INFLATION.current, 'the pessimistic path is "today’s rate goes on"');
  const assumption = data.ASSUMPTIONS.find((a) => /^Prices use the Central Bank/.test(a));
  assert.match(assumption, new RegExp(`${rates[0][2027]}% a year from 2027, and ${rates[2][2027]}% a year throughout`));
  assert.match(assumption, new RegExp(`with 2029 assumed to be ${data.INFLATION.rates[2029]}%`));
});

test('the opening chart’s note says which 1% is counted, where a job has two', () => {
  const { root, store } = mount(hero, lecturer);
  const note = () => root.querySelector('.race-source').textContent;
  assert.match(note(), /Gross pay; local bargaining is not counted\. /);
  store.set({ includeOwed: true });
  assert.match(note(), /Gross pay; the 1% from 1 September 2025 is counted, the 1% on 1 March 2029 is not\. /);
  store.set({ includeLB: true });
  assert.match(note(), /Gross pay; both local bargaining 1%s are counted\. /);
  store.set({ includeOwed: false });
  assert.match(note(), /Gross pay; the 1% on 1 March 2029 is counted, the 1% from 1 September 2025 is not\. /);
  store.set({ sector: 'primary', gradeId: 'pt-new', pointIndex: 0 }); // a job with one
  assert.match(note(), /Gross pay; local bargaining is counted\. /);
});

test('copy: a salary of exactly the threshold, a salary with no scale point, and an increment given in an earlier month', () => {
  const at = yourPay.model({ ...DEFAULT_SELECTION }, data);
  assert.equal(at.explanation, 'All the rises are percentages for you: your salary is €60,000 or more at every step.');
  assert.match(at.caveat, /^Gross pay on this salary: before tax/);
  assert.match(yourPay.model({ ...lecturer }, data).caveat, /^Gross pay at your current scale point: before tax/);
  // a point given in September with a September increment, read in November
  const earlier = mount(hero, { ...lecturer, incrementMonth: 9, pointMonth: '2026-09' });
  assert.match(earlier.root.querySelector('.race-inc-note').textContent, /The September 2026 increment is taken as already paid, so the point you gave is read as the one after it\.$/);
  assert.doesNotMatch(earlier.root.querySelector('.race-inc-note').textContent, /This month/);
  const thisMonth = mount(hero, { ...lecturer, incrementMonth: 11, pointMonth: NOW });
  assert.match(thisMonth.root.querySelector('.race-inc-note').textContent, /This month’s increment is taken as already paid, so choose the point you are on after it\.$/);
});

test('chapter 7 with no job chosen: the two deals’ 1% for local bargaining are counted or left out together', () => {
  const { root, store } = mount(vsLastDeal);
  const yours = (which) => root.querySelector(`.vs-card.${which} .vs-yours dd`).textContent;
  const pctOf = (deal, includeLB) => `+${((finalSalary(60000, deal.steps, { includeLB }) / 60000 - 1) * 100).toFixed(1)}%`;
  assert.deepEqual([yours('prev'), yours('draft')], [pctOf(data.PREVIOUS_DEAL, false), pctOf(data.DEAL, false)]);
  store.set({ includeLB: true });
  assert.deepEqual([yours('prev'), yours('draft')], [pctOf(data.PREVIOUS_DEAL, true), pctOf(data.DEAL, true)], 'like for like');
  assert.match(root.textContent, /With no job chosen, each deal’s 1% for local bargaining is treated the same way: both are counted\./);
});

// ---------- Present mode ----------

test('Present mode: the chart gives way on a short screen, and more so with increments', () => {
  assert.deepEqual([hero.chartHeight(400), hero.chartHeight(700), hero.chartHeight(900)], [250, 264, 310], 'on the page: by the card’s width');
  assert.equal(hero.chartHeight(700, { presentHeight: 1080 }), 264, 'a tall projector screen changes nothing');
  assert.deepEqual([hero.chartHeight(700, { presentHeight: 899 }), hero.chartHeight(700, { presentHeight: 899, own: true })], [196, 160]);
  assert.deepEqual([hero.chartHeight(700, { presentHeight: 720 }), hero.chartHeight(700, { presentHeight: 720, own: true })], [160, 136]);
});

test('Present mode: the tick boxes are hidden wherever the card would not fit with them', () => {
  const css = readCss('present.css');
  const short = ruleBody(css, '@media (max-height: 1059px)');
  assert.match(short ?? '', /body\.present \.race-options\s*\{\s*display:\s*none;/, 'at 900px tall the card ran 149px over with them');
  assert.equal(ruleBody(css, '@media (max-height: 820px)'), null);
  const shorter = ruleBody(css, '@media (max-height: 759px), (max-width: 1279px)');
  assert.match(shorter ?? '', /body\.present \.race-key-own,\s*body\.present \.race-key-inc\s*\{\s*display:\s*none;/, 'on a 720-line or a narrow screen the key keeps to one row: the line itself is labelled "You"');
});

test('Present mode: beside the headline the card is narrow from 1000px, so it takes the page’s narrow-card rules from there', () => {
  const css = readCss('present.css');
  const two = ruleBody(css, '@media (min-width: 1000px)');
  assert.match(two ?? '', /body\.present \.race-tile b\s*\{\s*font-size:\s*clamp\(1\.25rem/, 'figures that stay on one line');
  assert.match(css, /@media \(min-width: 1000px\) and \(max-width: 1039px\)\s*\{\s*body\.present \.race-picker\s*\{\s*grid-template-columns:\s*repeat\(2,/, 'and pickers two by two, not four at 114px each');
  const narrow = ruleBody(css, '@media (max-width: 1279px)');
  assert.match(narrow ?? '', /body\.present \.lede-about,\s*body\.present \.race h2\s*\{\s*display:\s*none;/, 'on a narrow screen both columns run long: what the headline already says gives way');
});

test('Present mode: whatever still runs over the screen comes off the chart, down to a height that can be read', () => {
  assert.equal(hero.fittedHeight(196, 0), 196);
  assert.equal(hero.fittedHeight(196, -40), 196);
  assert.equal(hero.fittedHeight(196, 30.2), 163, 'the overflow, rounded up, and two pixels for rounding in the layout');
  assert.equal(hero.fittedHeight(160, 90), 120, 'no shorter than that');
  assert.equal(hero.fittedHeight(110, 30), 110, 'a chart already shorter is left alone');
  assert.equal(hero.fittedHeight(196, NaN), 196, 'nothing to measure, nothing to do');
  const source = readFileSync(new URL('../site/js/sections/hero.js', import.meta.url), 'utf8');
  assert.match(source, /addEventListener\('resize'/, 'a window made shorter in Present mode is fitted again');
});

// ---------- screen readers ----------

test('live regions are written only when their words change, so the same thing is not announced twice', () => {
  const cases = [
    [yourPay, '.pay-gain', { includeLB: true }],
    [flat, '.fp-summary', { includeLB: true }],
    [hero, '.race-inc-note', { incrementMonth: 3 }],
  ];
  for (const [mod, selector, change] of cases) {
    const { root, store } = mount(mod, { ...lecturer, incrementMonth: 9 });
    const region = root.querySelector(selector);
    assert.equal(region.getAttribute('aria-live'), 'polite', selector);
    const before = region.childNodes[0];
    store.set({ remember: true }); // nothing these sentences say depends on it
    assert.ok(region.childNodes[0] === before, `${selector}: left alone`);
    store.set(change);
    assert.ok(region.childNodes[0] !== before, `${selector}: rewritten when its words change`);
  }
});

test('the opening chart tells a screen reader what it now shows, once for each change of choice', () => {
  const { root, store } = mount(hero);
  const said = root.querySelector('.race-said');
  assert.equal(said.getAttribute('aria-live'), 'polite');
  assert.equal(said.textContent, 'Example: a salary of €60,000. €66,103 a year by the end of March 2029: pay is up 10.2% and prices are up 7.5% on the Central Bank’s forecasts (2029 assumed at 2%), so pay buys 2.5% more.');
  store.set({ ...lecturer, incrementMonth: 9, scenario: 'higher' });
  assert.equal(said.textContent, 'Lecturer, point 5. €105,601 a year by the end of March 2029, with your increments: the deal adds 10.2% and prices are up 11.4% on the pessimistic path (4% a year, an illustration), so the deal’s rises buy 1.1% less.');
  const before = said.childNodes[0];
  const scrub = root.querySelector('input.race-scrub');
  scrub.value = '12';
  scrub.dispatchEvent({ type: 'input', bubbles: true });
  assert.ok(said.childNodes[0] === before, 'the slider moves the tiles, which say their own month; this sentence stays');
});

// ---------- the test DOM ----------

test('the stand-in select forgets its value when its options are replaced, as a browser does', () => {
  const select = document.createElement('select');
  const option = (value) => { const o = document.createElement('option'); o.setAttribute('value', value); return o; };
  select.append(option('a'), option('b'));
  select.value = 'b';
  select.replaceChildren(option('a'), option('b'), option('c'));
  assert.equal(select.value, 'a', 'new options: the first is selected until the code says otherwise');
});
