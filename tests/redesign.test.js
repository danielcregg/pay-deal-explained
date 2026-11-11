// The redesign: a navy opening, colour-coded chapters, pay against prices up front.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { readCss, themes, contrast } from './helpers/css.js';
import * as data from '../site/js/data.js';
import { DEFAULT_SELECTION as D0 } from '../site/js/selection.js';
import { mineText } from '../site/js/header.js';
import { currentChapter } from '../site/js/rail.js';

const html = readFileSync(new URL('../site/index.html', import.meta.url), 'utf8');
const FAMILIES = ['teal', 'coral', 'sky', 'amber', 'violet', 'slate'];
const ORDER = ['your-pay', 'pay-vs-prices', 'nine-rises', 'flat-or-percent', 'compounding', 'back-pay',
  'vs-last-deal', 'beyond-pay', 'timeline', 'glossary', 'sources'];

test('colour: text on the navy band, the gold button and every chapter colour meet AA in both themes', () => {
  for (const [mode, t] of Object.entries(themes(readCss('base.css')))) {
    const need = (fg, bg, ratio, what) => {
      assert.ok(fg && bg, `${mode}: ${what} is defined`);
      assert.ok(contrast(fg, bg) >= ratio, `${mode}: ${what} is ${contrast(fg, bg).toFixed(2)}:1, want ${ratio}:1`);
    };
    need(t['--on-navy'], t['--navy'], 7, 'text on navy');
    need(t['--on-navy-muted'], t['--navy'], 4.5, 'muted text on navy');
    need(t['--gold'], t['--navy'], 4.5, 'gold on navy');
    need(t['--on-gold'], t['--gold'], 4.5, 'text on gold');
    need(t['--teal-ink'], t['--teal-soft'], 4.5, 'pay tile');
    need(t['--red-ink'], t['--red-soft'], 4.5, 'prices tile');
    for (const f of FAMILIES) {
      need('#ffffff', t[`--fam-${f}`], 4.5, `white numeral on the ${f} chip`);
      need(t['--muted'], t[`--tint-${f}`], 4.5, `muted text on the ${f} band`);
      need(t['--ink'], t[`--tint-${f}`], 7, `text on the ${f} band`);
    }
  }
});

test('chapters: pay against prices moves up to second, and every chapter has a colour family', () => {
  const found = [...html.matchAll(/<section class="chapter" id="([\w-]+)" data-chapter="(\d+)" data-family="(\w+)"[^>]*>\s*<div class="chapter-head">\s*<span class="chapter-num" aria-hidden="true">(\d+)<\/span>/g)]
    .map((m) => ({ id: m[1], chapter: Number(m[2]), family: m[3], shown: Number(m[4]) }));
  assert.deepEqual(found.map((s) => s.id), ORDER);
  found.forEach((s, i) => {
    assert.equal(s.chapter, i + 1, `${s.id} data-chapter`);
    assert.equal(s.shown, i + 1, `${s.id} visible number`);
    assert.ok(FAMILIES.includes(s.family), `${s.id} family ${s.family}`);
  });
});

test('header: the chip carries the chosen pay, says what it counts, or invites a choice', () => {
  assert.deepEqual(mineText(D0, data), { label: 'Example: Lecturer, point 5', figure: '€99,037', tail: 'by 2029', go: 'Choose yours' });
  const top = { ...D0, touched: true, gradeId: 'lect', pointIndex: 10 };
  assert.deepEqual(mineText({ ...top, includeLB: true }, data),
    { label: 'Your pay: Lecturer, point 11', figure: '€119,871', tail: 'by 2029, with the 2029 1%', go: 'Change' });
  assert.equal(mineText({ ...top, includeOwed: true }, data).tail, 'by 2029, with the 2025 1%');
  assert.deepEqual([mineText({ ...top, includeOwed: true, includeLB: true }, data).figure, mineText({ ...top, includeOwed: true, includeLB: true }, data).tail],
    ['€121,070', 'by 2029, with both 1%s']);
  const hourly = mineText({ ...D0, touched: true, contract: 'hourly' }, data);
  assert.deepEqual([hourly.figure, hourly.tail], ['€84.34', 'an hour by 2029']);
});

test('rail: the current chapter is the last one whose top has passed the reading line', () => {
  assert.equal(currentChapter([-900, -200, 300, 900], 250), 1);
  assert.equal(currentChapter([120, 800, 1500], 250), 0);
  assert.equal(currentChapter([400, 900], 250), -1); // still above the first chapter
  assert.equal(currentChapter([-3000, -2000, -900], 250), 2);
});

test('copy: the 1% from 2025 is never stated as settled, and the 2029 assumption is named', () => {
  const read = (p) => readFileSync(new URL(`../site/${p}`, import.meta.url), 'utf8');
  const owed = data.SCALES.sectors.find((s) => s.id === 'tu').owed;
  assert.doesNotMatch(owed.note, /were paid/);
  assert.match(owed.note, /sanctioned/);
  assert.ok(owed.status, 'a plain statement of where it stands');
  for (const file of ['js/sections/your-pay.js', 'js/sections/back-pay.js', 'js/selection.js']) {
    assert.doesNotMatch(read(file), /owed since|pay scales yet/, `${file} says "owed" or "yet" to readers`);
  }
  assert.match(read('js/sections/your-pay.js'), /After forecast inflation \(/); // the wiring test checks the full sentence
});

test('colour: the faded "from" figure is gone, and the browser bar matches the navy header', () => {
  const demos = readCss('demos.css');
  assert.doesNotMatch(demos.slice(demos.indexOf('.pay-big .from'), demos.indexOf('.pay-big .per')), /opacity/);
  const navy = themes(readCss('base.css')).light['--navy'];
  const metas = [...html.matchAll(/<meta name="theme-color" content="([^"]+)"/g)].map((m) => m[1]);
  assert.ok(metas.length > 0 && metas.every((c) => c === navy), `theme-color ${metas}`);
});
