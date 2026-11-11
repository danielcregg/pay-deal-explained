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

test('M13: if the modules fail to load, the page says so instead of leaving the demos blank', () => {
  const inline = html.match(/<script>([\s\S]*?)<\/script>/);
  assert.ok(inline, 'an inline (non-module) fallback script');
  assert.match(inline[1], /DOMContentLoaded/);
  assert.match(inline[1], /data-started/);
  assert.match(inline[1], /did not load/);
  assert.match(read('js/main.js'), /document\.documentElement\.setAttribute\('data-started', ''\)/);
});

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
  for (const cls of ['axis-label', 'value-label', 'end-label', 'ruler-year', 'ruler-pct']) assert.ok(px(cls) >= 16, `${cls}: ${px(cls)}px in Present mode`);
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

test('M10: each deal shows its largest single rise at a low salary (spec §4, rule 9)', () => {
  const near = (a, b) => assert.ok(Math.abs(a - b) < 1e-3, `${a} ≉ ${b}`);
  const m = vsModel(89894, data, { includeLB: false });
  assert.equal(m.lowSalary, 47572);
  const [prev, draft] = m.deals.map((d) => d.largestLow);
  near(prev.pct, 2.3648); assert.deepEqual([prev.date, prev.amount, prev.flat], ['2024-01-01', 1125, true]);
  near(draft.pct, 2.5225); assert.deepEqual([draft.date, draft.amount, draft.flat], ['2026-09-01', 1200, true]);
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
