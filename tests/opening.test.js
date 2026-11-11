// The opening: the pay-against-prices chart comes first, with the pickers on it.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { installDom } from './helpers/dom.js';
import { readCss } from './helpers/css.js';
import * as data from '../site/js/data.js';
import { careerOf } from '../site/js/selection.js';
import { LECTURER_EXAMPLE as D0 } from './helpers/selections.js';
import { createStore } from '../site/js/state.js';
import * as hero from '../site/js/sections/hero.js';
import { model as payVsPrices } from '../site/js/sections/pay-vs-prices.js';

const document = installDom();
const html = readFileSync(new URL('../site/index.html', import.meta.url), 'utf8');
const NOW = '2026-11';

function mount(selection = {}) {
  const root = document.createElement('div');
  document.body.append(root);
  const store = createStore({ ...D0, ...selection });
  hero.render(root, { store, data, now: NOW });
  return { root, store };
}

test('the page opens with the headline, then the chart, then the four facts', () => {
  const band = html.slice(html.indexOf('<div class="hero-band">'), html.indexOf('</section>', html.indexOf('<div class="hero-band">')));
  const at = (needle) => { const i = band.indexOf(needle); assert.ok(i >= 0, `${needle} is in the opening band`); return i; };
  assert.ok(at('class="hero-text"') < at('data-mount="top"'), 'the headline comes before the chart');
  assert.ok(at('data-mount="top"') < at('class="hero-facts"'), 'the chart comes before the four facts');
  assert.ok(at('id="top-h"') < at('data-mount="top"'));
  assert.doesNotMatch(html, /Work out your own pay/, 'no button sending readers elsewhere: the chart is the calculator');
  assert.match(band, /Pick your job and grade/);
});

test('the opening sits headline and chart side by side on a wide screen, and stacks them on a narrow one', () => {
  const css = readCss('base.css');
  const wide = css.slice(css.indexOf('@media (min-width: 1040px)', css.indexOf('.hero-inner')));
  assert.match(wide.slice(0, 900), /\.hero-inner\s*\{[^}]*grid-template-columns/);
  assert.match(wide.slice(0, 900), /grid-template-areas:\s*"text race"\s*"facts race"/);
  assert.doesNotMatch(css, /\.race\s*\{[^}]*margin-top:\s*clamp\(-/, 'the card no longer hangs off the bottom of the band');
});

test('the pickers: one under another on a phone, four across only where each has room for a point and its salary', () => {
  const css = readCss('demos.css');
  assert.match(css, /@media \(max-width: 479px\)\s*\{\s*\.race-picker\s*\{\s*grid-template-columns:\s*minmax\(0, 1fr\);/, 'two across, a phone cuts "Staff Nurse or Midwife" and "Point 5 (€44,213)" short');
  assert.match(css, /@media \(min-width: 800px\) and \(max-width: 1039px\), \(min-width: 1280px\)\s*\{\s*\.race-picker\s*\{\s*grid-template-columns:\s*repeat\(4,/);
  assert.doesNotMatch(css, /\(min-width: 700px\) and \(max-width: 1039px\)[^{]*\{\s*\.race-picker/, 'at 700px four across leaves each list under 140px');
});

test('the chart card: pickers first, then the figures and the chart, with the options under it', () => {
  const { root } = mount();
  const order = root.children.map((el) => el.className.split(' ')[0] || el.localName);
  const pos = (name) => { const i = order.indexOf(name); assert.ok(i >= 0, `${name} is in the card: ${order.join(', ')}`); return i; };
  assert.equal(order[0], 'h2');
  assert.ok(pos('race-picker') < pos('race-tiles'));
  assert.ok(pos('race-tiles') < pos('chart-wrap'));
  assert.ok(pos('chart-wrap') < pos('race-options'));
  assert.ok(pos('race-options') < pos('note'), 'the source note comes last');
  assert.ok(root.querySelector('.race-options #race-lb'), 'the tick boxes are among the options');
  assert.ok(root.querySelector('.race-options .race-picks'), 'and so is the lowest-point comparison');
});

test('the chart card says whose figures it shows only when the pickers do not say it all', () => {
  const example = mount();
  const line = example.root.querySelector('.context-line');
  assert.deepEqual([line.hidden, line.textContent], [false, 'Example: Lecturer, point 5. Choose your own job, grade and point above.']);
  const link = example.root.querySelector('.race-options .race-more a');
  assert.deepEqual([link.getAttribute('href'), link.textContent], ['#your-pay', 'Part-time, hourly-paid or not listed? Use the full calculator']);

  const own = mount({ touched: true });
  assert.equal(own.root.querySelector('.context-line').hidden, true, 'a full-time grade and point: the pickers already say it');
  own.store.set({ contract: 'part', fte: 0.5 });
  const partLine = own.root.querySelector('.context-line');
  assert.deepEqual([partLine.hidden, partLine.textContent], [false, 'Showing: Lecturer, point 5, 50% of full-time.']);
  assert.equal(own.root.querySelector('.race-tile.euro b').textContent, '€49,519');
  own.store.set({ contract: 'full', includeOwed: true });
  assert.match(own.root.querySelector('.context-line').textContent, /with the 1% from September 2025/);
  own.store.set({ includeOwed: false, gradeId: 'typed', typed: 70000 });
  assert.deepEqual([own.root.querySelector('.context-line').hidden, own.root.querySelector('.context-line').textContent], [false, 'Showing: Typed salary.']);
});

test('the chart counts the months when prices are ahead of pay, as chapter 2 does', () => {
  const plain = hero.model(89894, data, { includeLB: false });
  const chapter2 = payVsPrices(89894, data.DEAL.steps, data.INFLATION, { includeLB: false });
  assert.equal(hero.monthsBehind(plain), chapter2.ahead.length);
  assert.equal(hero.monthsBehind(plain), 7);
  const { root, store } = mount();
  assert.equal(root.querySelector('.race-legend').textContent, 'Prices are ahead of pay in 7 of the 33 months');
  store.set({ includeLB: true });
  assert.equal(hero.monthsBehind(hero.model(89894, data, { includeLB: true })), 7, 'the 2029 1% comes too late to change it');
  // increments are normal progression: adding them does not change the count
  const career = careerOf({ ...D0, touched: true, incrementMonth: 9 }, data.SCALES, NOW);
  assert.equal(hero.monthsBehind(hero.model(89894, data, { includeLB: false, career })), 7);
  store.set({ touched: true, incrementMonth: 9 });
  assert.match(root.querySelector('.race-legend').textContent, /^Prices are ahead of the deal’s rises in 7 of the 33 months/);
  assert.match(root.querySelector('svg').getAttribute('aria-label'), /Prices are ahead of the deal’s rises in 7 of the 33 months\./);
});
