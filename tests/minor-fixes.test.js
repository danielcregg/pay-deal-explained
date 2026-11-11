// Regression tests for the 14 minor issues deferred by the final review (M1–M14).
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { SCALES, SITE } from '../site/js/data.js';
import { DEFAULT_SELECTION, parseSalary, clampHours, restoreSelection } from '../site/js/selection.js';
import { createStore } from '../site/js/state.js';
import { longDate, shortDate } from '../site/js/format.js';
import { presentKeyAction } from '../site/js/present.js';
import * as data from '../site/js/data.js';
import { barClass, legendItems, nextBar } from '../site/js/sections/staircase.js';
import { model as vsModel } from '../site/js/sections/vs-last-deal.js';
import { syncHeaderHeight } from '../site/js/header.js';
import { axisRows } from '../site/js/chart.js';
import { readCss, ruleBody, tokens, themes, contrast } from './helpers/css.js';

const read = (p) => readFileSync(new URL(`../site/${p}`, import.meta.url), 'utf8');
const html = read('index.html');
const attr = (tag, name) => tag.match(new RegExp(`${name}="([^"]*)"`))?.[1];

test('M1: the header shows the last-updated date, and every written copy matches data.js', () => {
  assert.equal(shortDate('2026-11-11'), '11 Nov 2026');
  const header = html.split('<header')[1].split('</header>')[0];
  const time = header.match(/<time[^>]*data-bind="updated-short"[^>]*>([^<]*)<\/time>/);
  assert.ok(time, 'a <time data-bind="updated-short"> in the header');
  assert.equal(time[1], shortDate(SITE.lastUpdated));
  assert.equal(attr(time[0], 'datetime'), SITE.lastUpdated);
  const footer = html.split('<footer')[1].split('</footer>')[0];
  assert.equal(footer.match(/data-bind="last-updated">([^<]*)</)?.[1], longDate(SITE.lastUpdated));
});

// M13 (load failure) is tested in dom-wiring.test.js, which runs the inline script as written.

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

test('M2: Present mode is high contrast, with chart text big enough for a projector', () => {
  const base = themes(readCss('base.css'));
  const present = readCss('present.css');
  const own = tokens(ruleBody(present, 'body.present'));
  const ownDark = tokens(ruleBody(ruleBody(present, '@media (prefers-color-scheme: dark)') ?? '', 'body.present'));
  for (const [mode, t] of [['light', { ...base.light, ...own }], ['dark', { ...base.dark, ...own, ...ownDark }]]) {
    for (const bg of ['--paper', '--card']) {
      assert.ok(contrast(t['--muted'], t[bg]) >= 7, `${mode}: --muted on ${bg} is ${contrast(t['--muted'], t[bg]).toFixed(2)}:1, want 7:1`);
    }
    assert.ok(contrast(t['--mark-earlier-edge'], t['--card']) >= 4.5, `${mode}: --mark-earlier-edge on --card`);
    for (const cap of ['--mark-pct', '--mark-flat']) assert.ok(contrast(t['--mark-earlier'], t[cap]) >= 2, `${mode}: --mark-earlier vs ${cap}`);
  }
  const px = (cls) => Math.max(0, ...[...present.matchAll(new RegExp(`body\\.present[^{}]*\\.${cls}\\b[^{}]*\\{[^}]*font-size:\\s*(\\d+)px`, 'g'))].map((m) => Number(m[1])));
  for (const cls of ['value-label', 'end-label']) assert.ok(px(cls) >= 16, `${cls}: ${px(cls)}px in Present mode`);
  // Axis labels take their size from --chart-text, which the charts also read to space their rows.
  assert.equal(base.light['--chart-text'], '12px');
  assert.ok(parseFloat(own['--chart-text']) >= 16, `--chart-text in Present mode: ${own['--chart-text']}`);
  assert.match(ruleBody(readCss('demos.css'), '.chart-svg .axis-label'), /var\(--chart-text\)/);
});

test('M3: Esc that closed a glossary pop-up does not also exit Present mode', () => {
  const key = (k, extra = {}) => ({ key: k, defaultPrevented: false, altKey: false, ctrlKey: false, metaKey: false, ...extra });
  assert.equal(presentKeyAction(key('Escape', { defaultPrevented: true }), 3, 11, false), null);
  assert.deepEqual(presentKeyAction(key('Escape'), 3, 11, false), { exit: true });
  assert.deepEqual(presentKeyAction(key('ArrowRight'), 3, 11, false), { to: 4 });
  assert.equal(presentKeyAction(key('ArrowRight', { ctrlKey: true }), 3, 11, false), null);
  assert.equal(presentKeyAction(key('ArrowRight'), 3, 11, true), null);
  assert.equal(presentKeyAction(key('ArrowRight'), 11, 11, false), null);
});

test('M8: counted local bargaining gets its own bar style and legend entry', () => {
  assert.deepEqual(['pct', 'flat', 'lb', 'lb-possible'].map(barClass), ['bar-pct', 'bar-flat', 'bar-lb', 'bar-possible']);
  const on = legendItems(true).map((i) => i.kind);
  const off = legendItems(false).map((i) => i.kind);
  assert.deepEqual([on.includes('lb'), on.includes('possible')], [true, false]);
  assert.deepEqual([off.includes('lb'), off.includes('possible')], [false, true]);
  assert.match(ruleBody(readCss('demos.css'), '.bar-lb'), /fill:\s*url\(#lb-stairs\)/);
});

test('M9: the staircase is one tab stop, and the arrow keys move between its bars', () => {
  const keys = ['ArrowRight', 'ArrowRight', 'ArrowLeft', 'ArrowLeft', 'Home', 'End', 'Tab', 'Enter'];
  const from = [0, 8, 3, 0, 4, 4, 4, 4];
  assert.deepEqual(keys.map((k, i) => nextBar(from[i], k, 9)), [1, 8, 2, 0, 0, 8, null, null]);
});

test('M10: each deal shows what it adds for a low salary (spec §4, rule 9)', () => {
  const near = (a, b) => assert.ok(Math.abs(a - b) < 0.01, `${a} ≉ ${b}`);
  const off = vsModel(89894, data, { includeLB: false });
  assert.equal(off.lowSalary, 47572);
  near(off.deals[0].lowPct, 9.77); near(off.deals[1].lowPct, 11.70);
  const on = vsModel(89894, data, { includeLB: true });
  near(on.deals[0].lowPct, 10.87); near(on.deals[1].lowPct, 12.80);
  assert.ok(!('largestLow' in off.deals[0]), 'no single-step figure dated to 2024');
});

test('M14: the "rises so far" grey has an edge at 3:1 or more, and its fill stays apart from the caps', () => {
  const t = themes(readCss('base.css'));
  for (const [mode, k] of Object.entries(t)) {
    assert.ok(k['--mark-earlier-edge'], `${mode}: --mark-earlier-edge is defined`);
    assert.ok(contrast(k['--mark-earlier-edge'], k['--card']) >= 3, `${mode}: edge ${contrast(k['--mark-earlier-edge'], k['--card']).toFixed(2)}:1`);
    for (const cap of ['--mark-pct', '--mark-flat']) assert.ok(contrast(k['--mark-earlier'], k[cap]) >= 2, `${mode}: fill vs ${cap}`);
  }
  const demos = readCss('demos.css');
  assert.match(ruleBody(demos, '.bar-earlier'), /stroke:\s*var\(--mark-earlier-edge\)/);
  assert.match(ruleBody(demos, '.swatch.earlier'), /var\(--mark-earlier-edge\)/);
  assert.match(ruleBody(demos, '.hb-bar'), /var\(--mark-earlier-edge\)/);
});

test('M7: links land below the sticky header, however many rows it wraps to', () => {
  const set = {};
  const doc = { querySelector: () => ({ offsetHeight: 89 }), documentElement: { style: { setProperty: (k, v) => { set[k] = v; } } } };
  assert.equal(syncHeaderHeight(doc), 89);
  assert.deepEqual(set, { '--header-h': '89px' });
  assert.match(ruleBody(readCss('base.css'), 'html'), /scroll-padding-top:\s*calc\(var\(--header-h/);
  for (const f of ['base.css', 'demos.css']) assert.doesNotMatch(readCss(f), /scroll-margin-top/, `${f} has a fixed offset`);
});

test('M2: rows of axis text keep their distance when Present mode enlarges them', () => {
  assert.deepEqual(axisRows(12, [1.35], 1.1), { rows: [18, 34], margin: 47 }); // the nine rises
  assert.deepEqual(axisRows(12, [1.65], 0.5), { rows: [18, 38], margin: 44 }); // section 7, as before
  for (const size of [12, 16, 20]) {
    const { rows, margin } = axisRows(size, [1.35], 1.1);
    assert.ok(rows[1] - rows[0] >= 1.33 * size, `${size}px: rows ${rows} are closer than one line of text`);
    assert.ok(margin - rows[1] >= size, `${size}px: margin ${margin}`);
  }
});

test('R5: Present mode keeps the nav bar borders and dots at 3:1 or more', () => {
  const base = themes(readCss('base.css'));
  const present = readCss('present.css');
  const light = tokens(ruleBody(present, 'body.present'))['--nav-dim'];
  const dark = tokens(ruleBody(ruleBody(present, '@media (prefers-color-scheme: dark)') ?? '', 'body.present'))['--nav-dim'];
  assert.ok(light && dark, '--nav-dim is defined for both themes');
  assert.ok(contrast(light, base.light['--ink']) >= 3, `light ${light}`);
  assert.ok(contrast(dark, base.dark['--ink']) >= 3, `dark ${dark}`);
  for (const rule of ['.present-nav button', '.present-dots span']) assert.doesNotMatch(ruleBody(present, rule), /--muted/, rule);
});

test('R6: a decimal comma or a trailing separator is read as it was meant', () => {
  const values = { '58.000,50': 58000.5, '58000,50': 58000.5, '58.000,00': 58000, '58,000.50': 58000.5, '58.000,': 58000, '58000.': 58000, '100,000': 100000, '€58,000': 58000 };
  for (const [typed, value] of Object.entries(values)) assert.deepEqual(parseSalary(typed), { ok: true, value }, typed);
  const codes = { '58,00': 'low', '1.234.567,89': 'high', '58,5,3': 'format', '5,8000': 'format', '58.5.3': 'format' };
  for (const [typed, code] of Object.entries(codes)) assert.equal(parseSalary(typed).code, code, typed);
});
