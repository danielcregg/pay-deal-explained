// Section 1: Your pay. Pick a grade and point (or type a salary), full-time, part-time
// or hourly, and see what the draft deal adds. The choice then flows into every demo.

import { applySteps, finalSalary, summarise, backPay } from '../pay.js';
import { resolvePay, parseSalary, clampFte, DEFAULT_SELECTION, forgetSelection } from '../selection.js';
import { eur, signedEur, pct, longDate, listSteps } from '../format.js';
import { h } from '../dom.js';

/** Everything "Your pay" shows, as plain numbers and text. */
export function model(sel, data) {
  const pay = resolvePay(sel, data.SCALES);
  const steps = data.DEAL.steps;
  const { base, factor, annualFactor } = pay;
  const endGeneral = finalSalary(base, steps, { includeLB: false });
  const endWithLB = finalSalary(base, steps, { includeLB: true });
  const first = applySteps(base, steps, { includeLB: sel.includeLB })[0];
  const { flatSteps } = summarise(base, steps, { includeLB: sel.includeLB });
  const arrears = backPay(base, steps, { payMonth: sel.payMonth, includeLB: sel.includeLB }).total;
  const threshold = eur(data.DEAL.threshold);
  return {
    unit: pay.unit,
    label: pay.label,
    isExample: pay.isExample,
    now: base * factor,
    endGeneral: endGeneral * factor,
    endWithLB: endWithLB * factor,
    pctGeneral: (endGeneral / base - 1) * 100,
    pctWithLB: (endWithLB / base - 1) * 100,
    firstRise: { date: first.step.date, amount: first.rise * factor },
    backPay: annualFactor === 0 ? null : arrears * annualFactor,
    flatSteps,
    explanation: flatSteps.length
      ? `The flat minimum beat the percentage at ${listSteps(flatSteps)}, because your pay was below ${threshold} at the time.`
      : `All the rises are percentages for you: your salary is above ${threshold} at every step.`,
  };
}

const roundFor = (n, unit) => (unit === 'hour' ? Math.round(n * 100) / 100 : Math.round(n));
const money = (n, unit) => eur(n, { cents: unit === 'hour' });
const fteText = (fte) => `${Math.round(fte * 1000) / 10}%`;

function pill(name, value, text) {
  return h('label', { class: 'pill' },
    h('input', { type: 'radio', name, value }),
    h('span', {}, text));
}

export function render(root, { store, data }) {
  const { SCALES } = data;
  const current = SCALES.grades.filter((g) => g.group === 'current');
  const legacy = SCALES.grades.filter((g) => g.group === 'legacy');

  // ---- form ----
  const contract = h('fieldset', { class: 'seg' },
    h('legend', {}, 'Your contract'),
    h('div', { class: 'seg-options' },
      pill('pp-contract', 'full', 'Full-time'),
      pill('pp-contract', 'part', 'Part-time'),
      pill('pp-contract', 'hourly', 'Hourly-paid')));

  const gradeSelect = h('select', { id: 'pp-grade' },
    h('optgroup', { label: 'Current grades' }, current.map((g) => h('option', { value: g.id }, g.name))),
    h('optgroup', { label: 'Other or legacy scales' }, legacy.map((g) => h('option', { value: g.id }, g.name))),
    h('optgroup', { label: 'Not listed?' }, h('option', { value: 'typed' }, 'Type my salary')));
  const gradeField = h('div', { class: 'field' }, h('label', { for: 'pp-grade' }, 'Grade'), gradeSelect);

  const pointSelect = h('select', { id: 'pp-point' });
  const pointField = h('div', { class: 'field' }, h('label', { for: 'pp-point' }, 'Scale point'), pointSelect);

  const typedInput = h('input', { id: 'pp-typed', type: 'text', inputmode: 'decimal', autocomplete: 'off', 'aria-describedby': 'pp-typed-error' });
  const typedError = h('p', { class: 'field-error', id: 'pp-typed-error', role: 'alert' });
  const typedField = h('div', { class: 'field' },
    h('label', { for: 'pp-typed' }, 'Full-time salary (€ a year)'), typedInput, typedError);

  const fteInput = h('input', { id: 'pp-fte', type: 'number', min: 1, max: 100, step: 0.5, inputmode: 'decimal' });
  const fteField = h('div', { class: 'field' },
    h('label', { for: 'pp-fte' }, 'Your hours as a percentage of full-time'), fteInput);

  const alScale = h('fieldset', { class: 'seg' },
    h('legend', {}, 'Assistant Lecturer scale'),
    h('div', { class: 'seg-options' },
      pill('pp-alscale', 'al-ne', 'Joined 2011 or later'),
      pill('pp-alscale', 'al-pre', 'Joined before 2011')));

  const hoursInput = h('input', { id: 'pp-hours', type: 'number', min: 0, max: 2000, step: 1, inputmode: 'numeric' });
  const hoursField = h('div', { class: 'field' },
    h('label', { for: 'pp-hours' }, 'Hours you teach in a year (optional, for yearly totals and back pay)'), hoursInput);

  const lbBox = h('input', { id: 'pp-lb', type: 'checkbox' });
  const lbSwitch = h('label', { class: 'switch', for: 'pp-lb' }, lbBox,
    h('span', {}, 'Count local bargaining (1% on 1 March 2029) as a rise for me'));

  const reset = h('button', { type: 'button', class: 'button-quiet' }, 'Clear my choices');
  const form = h('form', { class: 'plate pay-form', novalidate: true, onsubmit: (e) => e.preventDefault() },
    contract, gradeField, pointField, typedField, fteField, alScale, hoursField, lbSwitch,
    h('p', { class: 'privacy' }, 'Your choices stay on this device. ', reset));

  // ---- results ----
  const badge = h('p', { class: 'example-badge' }, 'Example: Lecturer, point 5. Pick your own grade and point.');
  const label = h('p', { class: 'pay-label' });
  const from = h('span', { class: 'from' });
  const to = h('span', { class: 'to' });
  const per = h('span', { class: 'per' });
  const big = h('p', { class: 'pay-big' }, from, h('span', { class: 'arrow', 'aria-hidden': 'true' }, ' → '),
    h('span', { class: 'visually-hidden' }, ' rising to '), to, per);
  const gain = h('p', { class: 'pay-gain' });
  const alt = h('p', { class: 'pay-alt' });
  const firstDd = h('dd');
  const backDd = h('dd');
  const hoursDiv = h('div', {}, h('dt', {}, 'Over a year'), h('dd'));
  const facts = h('dl', { class: 'pay-facts' },
    h('div', {}, h('dt', {}, 'First rise'), firstDd),
    h('div', {}, h('dt', {}, 'Back pay'), backDd),
    hoursDiv);
  const explain = h('p', { class: 'pay-explain' });
  const results = h('div', { class: 'plate pay-result', 'aria-live': 'polite' }, badge, label, big, gain, alt, facts, explain);

  root.append(h('div', { class: 'pay-grid' }, form, results));

  // ---- syncing ----
  const fillPoints = (gradeId) => {
    const grade = SCALES.grades.find((g) => g.id === gradeId);
    pointSelect.replaceChildren(...(grade ? grade.points : []).map((p, i) => h('option', { value: i }, `${p.label} (${eur(p.value)})`)));
  };

  const syncForm = (sel) => {
    for (const r of form.querySelectorAll('input[name="pp-contract"]')) r.checked = r.value === sel.contract;
    for (const r of form.querySelectorAll('input[name="pp-alscale"]')) r.checked = r.value === sel.alScale;
    gradeSelect.value = sel.gradeId;
    fillPoints(sel.gradeId);
    if (sel.gradeId !== 'typed') pointSelect.value = String(sel.pointIndex);
    typedInput.value = sel.typed ? String(Math.round(sel.typed * 100) / 100) : '';
    fteInput.value = String(Math.round(sel.fte * 1000) / 10);
    hoursInput.value = sel.hoursPerYear ? String(sel.hoursPerYear) : '';
    lbBox.checked = sel.includeLB;
    typedError.textContent = '';
  };

  const showFields = (sel) => {
    const hourly = sel.contract === 'hourly';
    gradeField.hidden = hourly;
    pointField.hidden = hourly || sel.gradeId === 'typed';
    typedField.hidden = hourly || sel.gradeId !== 'typed';
    fteField.hidden = sel.contract !== 'part';
    alScale.hidden = !hourly;
    hoursField.hidden = !hourly;
  };

  const update = (sel) => {
    showFields(sel);
    const m = model(sel, data);
    const u = m.unit;
    const perText = u === 'hour' ? ' an hour' : ' a year';
    const opts = { cents: u === 'hour' };
    const nowR = roundFor(m.now, u);
    const genR = roundFor(m.endGeneral, u);
    const lbR = roundFor(m.endWithLB, u);
    const endR = sel.includeLB ? lbR : genR;
    const endPct = sel.includeLB ? m.pctWithLB : m.pctGeneral;

    badge.hidden = !m.isExample;
    label.textContent = sel.contract === 'part' ? `${m.label}, ${fteText(sel.fte)} of full-time` : m.label;
    from.textContent = money(nowR, u);
    to.textContent = money(endR, u);
    per.textContent = u === 'hour' ? ' an hour' : '';
    gain.textContent = `${signedEur(endR - nowR, opts)}${perText} (+${pct(endPct)}) by March 2029, ${sel.includeLB ? 'counting local bargaining as a 1% rise' : 'from the general rises'}.`;
    alt.textContent = sel.includeLB
      ? `Without local bargaining: ${money(genR, u)} (+${pct(m.pctGeneral)}).`
      : `${signedEur(lbR - genR, opts)} more (${money(lbR, u)}, +${pct(m.pctWithLB)}) if local bargaining reaches you as a 1% rise.`;
    firstDd.textContent = `${signedEur(roundFor(m.firstRise.amount, u), opts)}${perText} from ${longDate(m.firstRise.date)}, backdated.`;
    backDd.replaceChildren(...(m.backPay === null
      ? ['Add the hours you teach in a year to estimate it.']
      : [`About ${eur(m.backPay)} before tax, if the deal is accepted and first paid in ${longDate(sel.payMonth)}. `,
        h('a', { href: '#back-pay' }, 'How it adds up')]));
    const hours = u === 'hour' ? sel.hoursPerYear : 0;
    hoursDiv.hidden = !hours;
    if (hours) {
      hoursDiv.querySelector('dd').textContent = `For ${hours} hours: ${eur(nowR * hours)} now, ${eur(endR * hours)} by March 2029, before tax.`;
    }
    const pointOne = SCALES.grades.find((g) => g.id === sel.alScale)?.points[0].value;
    explain.textContent = u === 'hour'
      ? `${m.explanation} Your hourly rate follows point 1 of the annual scale (${eur(pointOne)} ÷ ${SCALES.hourlyDivisor} hours), so it gets the flat minimums too.`
      : m.explanation;
  };

  // ---- events ----
  const set = (patch) => store.set({ ...patch, touched: true });
  form.addEventListener('change', (e) => {
    const t = e.target;
    if (t.name === 'pp-contract') set({ contract: t.value });
    else if (t.name === 'pp-alscale') set({ alScale: t.value });
    else if (t === lbBox) store.set({ includeLB: lbBox.checked });
    else if (t === pointSelect) set({ pointIndex: Number(pointSelect.value) });
    else if (t === gradeSelect) {
      const sel = store.get();
      if (gradeSelect.value === 'typed') {
        const base = resolvePay(sel, SCALES).base;
        typedInput.value = String(base);
        set({ gradeId: 'typed', typed: base });
      } else {
        const grade = SCALES.grades.find((g) => g.id === gradeSelect.value);
        const pointIndex = Math.min(sel.gradeId === 'typed' ? 0 : sel.pointIndex, grade.points.length - 1);
        fillPoints(grade.id);
        pointSelect.value = String(pointIndex);
        set({ gradeId: grade.id, pointIndex });
      }
    }
  });
  typedInput.addEventListener('input', () => {
    const r = parseSalary(typedInput.value);
    if (r.ok) { typedError.textContent = ''; set({ typed: r.value }); }
    else if (typedInput.value.trim() !== '') typedError.textContent = r.error;
  });
  typedInput.addEventListener('blur', () => {
    const r = parseSalary(typedInput.value);
    typedError.textContent = r.ok ? '' : r.error;
  });
  fteInput.addEventListener('input', () => set({ fte: clampFte(fteInput.value) }));
  fteInput.addEventListener('blur', () => { fteInput.value = String(Math.round(store.get().fte * 1000) / 10); });
  hoursInput.addEventListener('input', () => {
    const n = Number(hoursInput.value);
    set({ hoursPerYear: Number.isFinite(n) && n > 0 ? Math.min(2000, Math.round(n)) : 0 });
  });
  reset.addEventListener('click', () => {
    forgetSelection();
    store.set({ ...DEFAULT_SELECTION });
    syncForm(store.get());
  });

  syncForm(store.get());
  update(store.get());
  store.subscribe(update);
}
