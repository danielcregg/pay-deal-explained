// Section 5: Your back pay. The months from September 2026 fill up one at a time, then
// arrive together as a lump sum in the month the rise is first paid.

import { applySteps, backPay } from '../pay.js';
import { resolvePay, figuresFor, PAY_MONTHS } from '../selection.js';
import { eur, longDate, monthLabel, splitRounded } from '../format.js';
import { h } from '../dom.js';
import { prefersReducedMotion, onFirstView, replayTransition } from '../motion.js';

/** Arrears owed for the reader, by month, in their actual pay (part-time and hourly scaled). */
export function model(sel, data) {
  const pay = resolvePay(sel, data.SCALES);
  const owed = backPay(pay.base, data.DEAL.steps, { payMonth: sel.payMonth, includeLB: sel.includeLB });
  const f = pay.annualFactor;
  return {
    items: owed.items.map((i) => ({ month: i.month, amount: i.amount * f })),
    total: owed.total * f,
    payMonth: sel.payMonth,
    needsHours: pay.unit === 'hour' && f === 0,
    note: pay.unit === 'hour' && f > 0
      ? 'This assumes your hours are spread evenly across the year. If you teach more of them between September and December, your back pay would be higher.'
      : null,
  };
}

export function render(root, { store, data }) {
  const monthSelect = h('select', { id: 'bp-month' },
    PAY_MONTHS.map((m) => h('option', { value: m }, longDate(m))));
  const intro = h('p', { class: 'prose' });
  const tiles = h('div', { class: 'bp-tiles' });
  const replay = h('button', { type: 'button', class: 'button-quiet' }, 'Replay');
  const note = h('p', { class: 'note' },
    'Gross, before tax, USC, PRSI and pension. Back pay is only paid if union members accept the deal. The first payment month is not yet known: January is the likeliest, as reported.');

  const context = h('p', { class: 'context-line' });
  const hourlyNote = h('p', { class: 'note', hidden: true });
  root.append(h('div', { class: 'plate' },
    context,
    intro,
    h('div', { class: 'field bp-field' }, h('label', { for: 'bp-month' }, 'If the rise is first paid in'), monthSelect),
    tiles,
    hourlyNote,
    h('div', { class: 'chart-foot' }, note, replay)));

  const motion = !prefersReducedMotion();
  let revealed = !motion;

  const draw = () => {
    const sel = store.get();
    monthSelect.value = sel.payMonth;
    const m = model(sel, data);
    const pay = resolvePay(sel, data.SCALES);
    const first = applySteps(pay.base, data.DEAL.steps, { includeLB: sel.includeLB })[0];
    const yearly = first.rise * pay.annualFactor;
    context.textContent = figuresFor(sel, data.SCALES);
    hourlyNote.hidden = !m.note;
    hourlyNote.textContent = m.note ?? '';

    if (m.needsHours) {
      intro.textContent = 'Add the hours you teach in a year in section 1 to estimate your back pay. Hourly rates are backdated too: the first rise applies from 1 September 2026.';
      tiles.replaceChildren();
      replay.hidden = true;
      return;
    }
    intro.textContent = `Your first rise (+${eur(yearly)} a year) is backdated to 1 September 2026. That is about ${eur(yearly / 12)} a month. `
      + `If the deal is accepted and the rise is first paid in ${longDate(sel.payMonth)}, the months before then arrive as one lump sum.`;

    const shown = splitRounded(m.items.map((item) => item.amount)); // tiles add up to the total
    tiles.replaceChildren(
      ...m.items.map((item, i) => h('div', { class: 'bp-tile', style: `--d:${(i * 0.35).toFixed(2)}s` },
        h('span', { class: 'bp-fill', 'aria-hidden': 'true' }),
        h('span', { class: 'bp-month' }, monthLabel(item.month)),
        h('span', { class: 'bp-amount' }, `+${eur(shown[i])}`))),
      h('div', { class: 'bp-total', style: `--d:${(m.items.length * 0.35 + 0.2).toFixed(2)}s` },
        h('span', { class: 'bp-month' }, `Paid in ${longDate(sel.payMonth)}`),
        h('span', { class: 'bp-sum' }, eur(m.total)),
        h('span', { class: 'bp-small' }, 'lump sum, before tax')));
    if (!revealed) tiles.classList.add('pre');
    replay.hidden = !motion;
  };

  const play = () => {
    if (!motion) return;
    revealed = true;
    replayTransition(tiles);
  };

  monthSelect.addEventListener('change', () => store.set({ payMonth: monthSelect.value }));
  replay.addEventListener('click', play);
  store.subscribe(draw);
  draw();
  if (!revealed) onFirstView(tiles, play);
}
