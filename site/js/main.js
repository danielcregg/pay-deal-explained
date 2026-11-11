// Boot: bind site-wide text from data.js, then render each registered section
// into its [data-mount] element. One failing section never stops the others.

import * as data from './data.js';
import { createStore } from './state.js';
import { longDate } from './format.js';
import * as hero from './sections/hero.js';

const SECTIONS = [
  ['top', hero],
];

const store = createStore({});
const ctx = { store, data };

function bindText() {
  const values = {
    'status-chip': data.SITE.status.chip,
    'status-line': data.SITE.status.line,
    'last-updated': longDate(data.SITE.lastUpdated),
  };
  for (const el of document.querySelectorAll('[data-bind]')) {
    if (el.dataset.bind in values) el.textContent = values[el.dataset.bind];
  }
}

bindText();
for (const [id, mod] of SECTIONS) {
  const root = document.querySelector(`[data-mount="${id}"]`);
  if (!root) continue;
  try {
    mod.render(root, ctx);
  } catch (err) {
    console.error(`Section "${id}" failed to render`, err);
  }
}
