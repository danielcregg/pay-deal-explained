// The "could go either way" choices as tick boxes that any chapter can show beside its
// chart: the 1% local bargaining due in 2029 and, where a job has one, a rise from the
// last agreement that has not been paid. Every copy reads and writes the same two flags
// in the store, so ticking one anywhere changes the whole page.

import { h } from './dom.js';
import { owedFor, scenarioOf, OWN_PATH, OWN_RATE } from './selection.js';
import { longDate } from './format.js';

export function extrasSwitches(store, data, idPrefix) {
  const lbStep = data.DEAL.steps.find((s) => s.kind === 'lb');
  const lbBox = h('input', { id: `${idPrefix}-lb`, type: 'checkbox' });
  const owedBox = h('input', { id: `${idPrefix}-owed`, type: 'checkbox' });
  const owedText = h('span');
  const owedSwitch = h('label', { class: 'switch', for: `${idPrefix}-owed`, hidden: true }, owedBox, owedText);
  const el = h('div', { class: 'extras' },
    h('label', { class: 'switch', for: `${idPrefix}-lb` }, lbBox,
      h('span', {}, `Count the ${lbStep.pct}% local bargaining due on ${longDate(lbStep.date)} as a rise`)),
    owedSwitch);

  const sync = () => {
    const sel = store.get();
    const owed = owedFor(sel, data.SCALES);
    lbBox.checked = sel.includeLB;
    owedBox.checked = sel.includeOwed;
    owedSwitch.hidden = !owed;
    owedText.textContent = owed ? `Count the ${owed.pct}% local bargaining from ${longDate(owed.since)}. ${owed.status}` : '';
  };
  lbBox.addEventListener('change', () => store.set({ includeLB: lbBox.checked }));
  owedBox.addEventListener('change', () => store.set({ includeOwed: owedBox.checked }));
  store.subscribe(sync);
  sync();
  return el;
}

/**
 * The inflation path as four buttons: the Central Bank's forecast, a lower and a higher
 * illustration, and a figure of the reader's own with a slider for it. They read and write
 * the same choice in the store, so every figure on the page follows.
 */
export function pricesSwitch(store, data, idPrefix) {
  const name = `${idPrefix}-prices`;
  const paths = [...data.INFLATION.scenarios.map((s) => [s.id, s.label]), [OWN_PATH, 'Your own figure']];
  const radios = paths.map(([value]) => h('input', { type: 'radio', name, value }));
  const rateOut = h('output', { for: `${idPrefix}-rate` });
  const rate = h('input', { type: 'range', id: `${idPrefix}-rate`, class: 'prices-range', min: OWN_RATE.min, max: OWN_RATE.max, step: OWN_RATE.step });
  const rateField = h('div', { class: 'field prices-own', hidden: true }, h('label', { for: `${idPrefix}-rate` }, 'Inflation: ', rateOut, ' a year'), rate);
  const el = h('fieldset', { class: 'seg prices-seg' },
    h('legend', {}, 'Inflation'),
    h('div', { class: 'seg-options' }, paths.map(([, label], i) => h('label', { class: 'pill' }, radios[i], h('span', {}, label)))),
    rateField);
  const sync = () => {
    const sel = store.get();
    const chosen = scenarioOf(sel, data.INFLATION).id;
    for (const r of radios) r.checked = r.value === chosen;
    rateField.hidden = chosen !== OWN_PATH;
    rateOut.textContent = `${sel.ownRate.toFixed(1)}%`;
    rate.value = String(sel.ownRate);
  };
  el.addEventListener('change', (e) => { if (radios.includes(e.target)) store.set({ scenario: e.target.value }); });
  // Straight to the store: a browser already sends at most one `input` a frame while a slider is
  // dragged, and waiting for an animation frame would leave the figures behind where none comes.
  rate.addEventListener('input', () => store.set({ ownRate: Number(rate.value) }));
  store.subscribe(sync);
  sync();
  return el;
}
