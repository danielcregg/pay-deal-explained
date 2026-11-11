// F10: figures written into the page outside data.js must stay in step with it.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DEAL, PREVIOUS_DEAL } from '../site/js/data.js';
import { compoundFactor } from '../site/js/pay.js';
import { eur, pct, longDate } from '../site/js/format.js';

const read = (p) => readFileSync(new URL(`../site/${p}`, import.meta.url), 'utf8');
const html = read('index.html');

test('hero, headings and intros match data.js', () => {
  const compounded = pct((compoundFactor(DEAL.steps, { includeLB: true }) - 1) * 100);
  for (const expected of [
    `${DEAL.headlinePct}% over ${DEAL.months} months`,
    `data-count="${DEAL.headlinePct}"`,
    `data-count="${DEAL.months}"`,
    `data-count="${DEAL.steps.length}"`,
    `data-count="${DEAL.threshold}"`,
    `€${DEAL.threshold / 1000}k`,
    `up from €${PREVIOUS_DEAL.threshold / 1000}k`,
    `Why ${DEAL.headlinePct}% comes to about ${compounded}`,
    `is ${eur(DEAL.threshold)}`,
    `backdated to ${longDate(DEAL.steps[0].date)}`,
  ]) assert.ok(html.includes(expected), expected);
});

test('the hero caption takes its numbers from data.js', () => {
  assert.doesNotMatch(read('js/sections/hero.js'), /across the 33 months/);
});
