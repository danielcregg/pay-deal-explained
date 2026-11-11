// Fixes from the third independent review: the opening chart, the generic default,
// remembering, and what the page says the proposed agreement says.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { installDom } from './helpers/dom.js';
import { readCss, ruleBody } from './helpers/css.js';
import * as data from '../site/js/data.js';
import { createStore } from '../site/js/state.js';
import { mountMine } from '../site/js/header.js';
import { DEFAULT_SELECTION } from '../site/js/selection.js';

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
