// The "could go either way" choices as tick boxes that any chapter can show beside its
// chart: the 1% local bargaining due in 2029 and, where a job has one, a rise from the
// last agreement that has not been paid. Every copy reads and writes the same two flags
// in the store, so ticking one anywhere changes the whole page.

import { h } from './dom.js';
import { owedFor, scenarioOf } from './selection.js';
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
 * The inflation path as three buttons: the Central Bank's forecast, and a lower and a
 * higher illustration. Every copy reads and writes the same choice in the store.
 */
export function pricesSwitch(store, data, idPrefix) {
  const name = `${idPrefix}-prices`;
  const radios = data.INFLATION.scenarios.map((s) => h('input', { type: 'radio', name, value: s.id }));
  const el = h('fieldset', { class: 'seg prices-seg' },
    h('legend', {}, 'Inflation'),
    h('div', { class: 'seg-options' }, data.INFLATION.scenarios.map((s, i) => h('label', { class: 'pill' }, radios[i], h('span', {}, s.label)))));
  const sync = () => {
    const chosen = scenarioOf(store.get(), data.INFLATION).id;
    for (const r of radios) r.checked = r.value === chosen;
  };
  el.addEventListener('change', (e) => { if (radios.includes(e.target)) store.set({ scenario: e.target.value }); });
  store.subscribe(sync);
  sync();
  return el;
}
