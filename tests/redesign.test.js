// The redesign: a navy opening, colour-coded chapters, pay against prices up front.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { readCss, themes, contrast } from './helpers/css.js';

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
