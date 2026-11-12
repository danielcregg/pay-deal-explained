// Boot: bind site-wide text from data.js, then render each registered section
// into its [data-mount] element. One failing section never stops the others.

import * as data from './data.js';
import { createStore } from './state.js';
import { longDate, shortDate } from './format.js';
import { restoreSelection, loadSaved, rememberChoices } from './selection.js';
import { initPresent } from './present.js';
import { trackHeaderHeight, mountMine } from './header.js';
import { mountRail } from './rail.js';
import * as hero from './sections/hero.js';
import * as yourPay from './sections/your-pay.js';
import * as staircase from './sections/staircase.js';
import * as flatOrPercent from './sections/flat-or-percent.js';
import * as compounding from './sections/compounding.js';
import * as backPay from './sections/back-pay.js';
import * as vsLastDeal from './sections/vs-last-deal.js';
import * as beyondPay from './sections/beyond-pay.js';
import * as timeline from './sections/timeline.js';
import * as glossary from './sections/glossary.js';
import * as sources from './sections/sources.js';

const SECTIONS = [
  ['top', hero],
  ['your-pay', yourPay],
  ['nine-rises', staircase],
  ['flat-or-percent', flatOrPercent],
  ['compounding', compounding],
  ['back-pay', backPay],
  ['vs-last-deal', vsLastDeal],
  ['beyond-pay', beyondPay],
  ['timeline', timeline],
  ['glossary', glossary], // after the sections above: it enhances their [data-term]s
  ['sources', sources],
];

const store = createStore(restoreSelection(loadSaved(), data.SCALES));
// Choices are kept only for a reader who ticked "remember"; anything else found saved is removed.
rememberChoices(store);
const ctx = { store, data };

function bindText() {
  const values = {
    'status-chip': data.SITE.status.chip,
    'status-line': data.SITE.status.line,
    'last-updated': longDate(data.SITE.lastUpdated),
    'updated-short': shortDate(data.SITE.lastUpdated),
  };
  for (const el of document.querySelectorAll('[data-bind]')) {
    if (el.dataset.bind in values) el.textContent = values[el.dataset.bind];
    if (el.dataset.bind === 'updated-short') el.setAttribute('datetime', data.SITE.lastUpdated);
  }
}

bindText();
trackHeaderHeight();
for (const [id, mod] of SECTIONS) {
  const root = document.querySelector(`[data-mount="${id}"]`);
  if (!root) continue;
  try {
    mod.render(root, ctx);
  } catch (err) {
    console.error(`Section "${id}" failed to render`, err);
  }
}
mountMine(document.querySelector('[data-mount="mine"]'), store, data);
mountRail();
initPresent();
