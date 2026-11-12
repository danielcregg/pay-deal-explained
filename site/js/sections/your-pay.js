// The reader's own pay, as parts of the one calculator at the top of the page (hero.js
// places them in its card): the less common cases, folded away under the four pickers; the
// figures in detail, under the chart; and the row that asks before anything is remembered.
// The sums are in `model`, which every part reads.

import { applySteps, finalSalary, summarise, backPay, owedBackPay, payAgainstPrices } from '../pay.js';
import { resolvePay, parseSalary, clampFte, clampHours, DEFAULT_SELECTION, forgetSelection, sectorOf, gradeOf, owedFor, scenarioOf } from '../selection.js';
import { eur, signedEur, pct, longDate, listSteps } from '../format.js';
import { h, setText } from '../dom.js';
import { countTo } from '../motion.js';

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
  // Two questions make four ways to count it: is the 1% due in 2029 counted, and is the
  // 1% still owed from the last agreement? Each is worked out from today's scale point so
  // the four compare like with like; the owed 1% comes first and the new rises build on it.
  const lbStep = steps.find((s) => s.kind === 'lb');
  const owed = owedFor(sel, data.SCALES);
  const sector = sectorOf(sel, data.SCALES);
  const today = pay.published;
  const scenario = (id, start, includeLB) => {
    const end = finalSalary(start, steps, { includeLB });
    return { id, end: end * factor, pct: (end / today - 1) * 100 };
  };
  const scenarios = [scenario('general', today, false), scenario('lb', today, true)];
  if (owed) {
    const lifted = today * (1 + owed.pct / 100);
    scenarios.push(scenario('owed', lifted, false), scenario('both', lifted, true));
  }
  const owedCounted = Boolean(owed && sel.includeOwed);
  const active = owedCounted ? (sel.includeLB ? 'both' : 'owed') : (sel.includeLB ? 'lb' : 'general');
  const counted = scenarios.find((s) => s.id === active);
  const notes = pay.unit === 'hour'
    ? [`Based on how hourly rates were set in the 2026 pay circulars (point 1 of the annual scale, ${eur(today)}, divided by ${data.SCALES.hourlyDivisor} hours), your hourly rate would follow point 1 and get the flat minimums too.`]
    : sel.contract === 'part'
      ? ['Part-time pay is assumed to be your full-time point times your share of full-time hours, so the flat minimums are pro-rated.']
      : [];
  // Something particular to the chosen grade, such as two official versions of its scale.
  const gradeNote = gradeOf(sel, data.SCALES)?.note;
  if (gradeNote) notes.push(gradeNote);
  if (owedCounted) {
    notes.push(`You are counting the ${owed.pct}% local bargaining from ${longDate(owed.since)}: it is added to today’s scale figure before the new rises, and its back pay from that date is added to the back pay above. ${owed.status}`);
  }
  return {
    scenarios,
    active,
    // What the panel shows: from today’s scale figure to the marked way of counting.
    shown: { from: today * factor, to: counted.end, pct: counted.pct },
    owed,
    owedCounted,
    lbStep,
    // What the shown rise is worth once prices have risen too (the price index ends above 100).
    real: ((1 + counted.pct / 100) * 100 / payAgainstPrices(base, steps, data.INFLATION, { includeLB: sel.includeLB, rates: scenarioOf(sel, data.INFLATION).rates }).price.at(-1).value - 1) * 100,
    prices: scenarioOf(sel, data.INFLATION),
    published: today * factor,
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
    backPayOwed: owedCounted && annualFactor !== 0
      ? owedBackPay(today, owed, data.PREVIOUS_DEAL.steps, { payMonth: sel.payMonth }).total * annualFactor
      : null,
    flatSteps,
    explanation: flatSteps.length
      ? `The flat minimum beat the percentage at ${listSteps(flatSteps)}, because your pay was below ${threshold} at the time.`
      : `All the rises are percentages for you: your salary is ${threshold} or more at every step.`,
    sector,
    caveat: `Gross pay ${sel.gradeId === 'typed' && sel.contract !== 'hourly' ? 'on this salary' : 'at your current scale point'}: before tax, USC, PRSI and pension, and without annual increments.`
      + (sector.caveat && sel.gradeId !== 'typed' ? ` ${sector.caveat}` : ''), // a typed salary is not from the job's scale
    notes,
  };
}

const roundFor = (n, unit) => (unit === 'hour' ? Math.round(n * 100) / 100 : Math.round(n));
const money = (n, unit) => eur(n, { cents: unit === 'hour' });

function pill(name, value, text) {
  return h('label', { class: 'pill' },
    h('input', { type: 'radio', name, value }),
    h('span', {}, text));
}

/**
 * The less common cases, folded away under the four pickers: part-time, hourly-paid, and a
 * salary typed in for a job that is not listed. They write to the same store as the pickers.
 */
export function payExtras(store, data) {
  const { SCALES } = data;
  const hourlyPill = pill('pp-contract', 'hourly', 'Hourly-paid');
  hourlyPill.classList.add('pill-hourly');
  const contract = h('fieldset', { class: 'seg' },
    h('legend', {}, 'Your contract'),
    h('div', { class: 'seg-options' },
      pill('pp-contract', 'full', 'Full-time'),
      pill('pp-contract', 'part', 'Part-time'),
      hourlyPill));

  const fteInput = h('input', { id: 'pp-fte', type: 'number', min: 0.01, max: 100, step: 'any', inputmode: 'decimal' });
  const fteField = h('div', { class: 'field' },
    h('label', { for: 'pp-fte' }, 'Your hours as a percentage of full-time (or as FTE, such as 0.5)'), fteInput);

  const alScale = h('fieldset', { class: 'seg' },
    h('legend', {}, 'Assistant Lecturer scale'),
    h('div', { class: 'seg-options' },
      pill('pp-alscale', 'al-ne', 'Joined 2011 or later'),
      pill('pp-alscale', 'al-pre', 'Joined before 2011')));

  const hoursInput = h('input', { id: 'pp-hours', type: 'number', min: 0, max: 2000, step: 1, inputmode: 'numeric' });
  const hoursField = h('div', { class: 'field' },
    h('label', { for: 'pp-hours' }, 'Hours you teach in a year (optional, for yearly totals and back pay)'), hoursInput);

  const typedInput = h('input', { id: 'pp-typed', type: 'text', inputmode: 'decimal', autocomplete: 'off', 'aria-describedby': 'pp-typed-error' });
  const typedError = h('p', { class: 'field-error', id: 'pp-typed-error', role: 'alert' });
  const typedField = h('div', { class: 'field' },
    h('label', { for: 'pp-typed' }, 'Not listed? Type your full-time salary (€ a year)'), typedInput, typedError);

  const form = h('form', { class: 'pay-form', novalidate: true, onsubmit: (e) => e.preventDefault() },
    contract, fteField, alScale, hoursField, typedField);
  const el = h('details', { class: 'data race-extra' }, h('summary', {}, 'Part-time, hourly-paid or not listed?'), form);

  // The box holds a salary only when the figures use one the reader typed: never the page's example.
  const typedOf = (sel) => (sel.gradeId === 'typed' && sel.touched ? String(Math.round(sel.typed * 100) / 100) : '');
  const sync = (sel) => {
    const hourly = sel.contract === 'hourly';
    for (const r of form.querySelectorAll('input[name="pp-contract"]')) r.checked = r.value === sel.contract;
    for (const r of form.querySelectorAll('input[name="pp-alscale"]')) r.checked = r.value === sel.alScale;
    hourlyPill.hidden = !sectorOf(sel, SCALES).hourly; // only some jobs have hourly-paid contracts
    fteField.hidden = sel.contract !== 'part';
    alScale.hidden = !hourly;
    hoursField.hidden = !hourly;
    typedField.hidden = hourly; // an hourly rate comes from the scale
    // The boxes follow the store (the pickers above can change what they mean), except one being typed in.
    const active = document.activeElement;
    if (active !== typedInput) typedInput.value = typedOf(sel);
    if (active !== fteInput) fteInput.value = String(Math.round(sel.fte * 1000) / 10);
    if (active !== hoursInput) hoursInput.value = sel.hoursPerYear ? String(sel.hoursPerYear) : '';
  };

  // Part-time, hours and the scale for an hourly rate change how the pay is counted, not whose
  // pay it is: on the example salary they leave it an example.
  form.addEventListener('change', (e) => {
    const t = e.target;
    if (t.name === 'pp-contract') store.set({ contract: t.value });
    else if (t.name === 'pp-alscale') store.set({ alScale: t.value });
  });
  typedInput.addEventListener('input', () => {
    const r = parseSalary(typedInput.value);
    // A salary of the reader's own takes the place of a grade and point. The job, if one is chosen, stays.
    if (r.ok) { typedError.textContent = ''; store.set({ gradeId: 'typed', typed: r.value, pointIndex: 0, touched: true }); }
    // "Too low" waits for blur: every salary is too low while its first digits are typed.
    else if (r.code !== 'low' && typedInput.value.trim() !== '') typedError.textContent = r.error;
    else typedError.textContent = '';
  });
  typedInput.addEventListener('blur', () => {
    if (typedInput.value.trim() === '') { typedError.textContent = ''; typedInput.value = typedOf(store.get()); return; }
    const r = parseSalary(typedInput.value);
    typedError.textContent = r.ok ? '' : r.error;
  });
  fteInput.addEventListener('input', () => store.set({ fte: clampFte(fteInput.value) }));
  fteInput.addEventListener('blur', () => { fteInput.value = String(Math.round(store.get().fte * 1000) / 10); });
  hoursInput.addEventListener('input', () => store.set({ hoursPerYear: clampHours(hoursInput.value) }));
  hoursInput.addEventListener('blur', () => {
    const used = store.get().hoursPerYear;
    hoursInput.value = used ? String(used) : '';
  });

  // Open when it holds something that changes the figures, so a returning reader can see why.
  const first = store.get();
  if (first.contract !== 'full' || typedOf(first)) el.setAttribute('open', '');
  store.subscribe((sel, meta) => {
    if (meta?.reset) typedError.textContent = '';
    sync(sel);
  });
  sync(first);
  return el;
}

/**
 * The figures in detail, under the chart: today's pay and where the deal takes it, the first
 * rise, back pay, and every way of counting side by side.
 */
export function payDetail(store, data) {
  const from = h('span', { class: 'from' });
  const to = h('span', { class: 'to' });
  const per = h('span', { class: 'per' });
  const big = h('p', { class: 'pay-big' }, from, h('span', { class: 'arrow', 'aria-hidden': 'true' }, ' → '),
    h('span', { class: 'visually-hidden' }, ' rising to '), to, per);
  const gain = h('p', { class: 'pay-gain', 'aria-live': 'polite' });
  const waysTitle = h('h4', { class: 'pay-ways-title' });
  const ways = h('div', { class: 'pay-ways' });
  const waysNote = h('p', { class: 'pay-ways-note' });
  const alt = h('div', { class: 'pay-alt' }, waysTitle, ways);
  const caveat = h('p', { class: 'pay-caveat' });
  const notes = h('ul', { class: 'pay-notes' });
  const firstDd = h('dd');
  const backDd = h('dd');
  const hoursDiv = h('div', {}, h('dt', {}, 'Over a year'), h('dd'));
  const facts = h('dl', { class: 'pay-facts' },
    h('div', {}, h('dt', {}, 'First rise'), firstDd),
    h('div', {}, h('dt', {}, 'Back pay'), backDd),
    hoursDiv);
  const explain = h('p', { class: 'pay-explain' });
  // The notes run long for some jobs: they fold away, so the figures stay together on a phone.
  const about = h('details', { class: 'data pay-about' }, h('summary', {}, 'About these figures'), waysNote, explain, caveat, notes);
  const el = h('div', { class: 'race-detail' }, h('h3', {}, 'Your pay in detail'), big, gain, facts, alt, about);
  let shown = null; // the end figure on screen, so a change counts from it

  const update = (sel) => {
    const m = model(sel, data);
    const u = m.unit;
    const perText = u === 'hour' ? ' an hour' : ' a year';
    const opts = { cents: u === 'hour' };
    const nowR = roundFor(m.shown.from, u);
    const endR = roundFor(m.shown.to, u);
    const counting = {
      general: 'from the general rises',
      lb: 'counting local bargaining as a 1% rise',
      owed: `counting the general rises and the 1% from ${m.owed ? longDate(m.owed.since.slice(0, 7)) : ''}`,
      both: 'counting the general rises and both local bargaining 1%s',
    }[m.active];

    from.textContent = money(nowR, u);
    const startFrom = shown && shown.unit === u ? shown.value : endR;
    countTo(to, startFrom, endR, (v) => money(roundFor(v, u), u));
    shown = { unit: u, value: endR };
    per.textContent = u === 'hour' ? ' an hour' : '';
    setText(gain, `${signedEur(endR - nowR, opts)}${perText} (+${pct(m.shown.pct)}) by March 2029, ${counting}.`);
    // Every way of counting, side by side; the one the big figure uses is marked.
    const cell = (id) => {
      const s = m.scenarios.find((x) => x.id === id);
      const on = id === m.active;
      return h('td', { class: on ? 'on' : '' }, `${money(roundFor(s.end, u), u)} `,
        h('span', { class: 'pay-ways-pct' }, `+${pct(s.pct)}`),
        on ? h('span', { class: 'visually-hidden' }, ' (the figure shown above)') : null);
    };
    const rows = [['The general rises', 'general', 'owed'], [`Plus the ${m.lbStep.pct}% local bargaining due on ${longDate(m.lbStep.date)}`, 'lb', 'both']];
    waysTitle.textContent = `By March 2029, counted ${m.owed ? 'four' : 'two'} ways`;
    ways.replaceChildren(h('div', { class: 'table-scroll' }, h('table', { class: 'pay-ways-table' },
      m.owed ? h('thead', {}, h('tr', {}, h('td', {}),
        h('th', { scope: 'col' }, `Without the ${m.owed.pct}% from ${longDate(m.owed.since.slice(0, 7))}`),
        h('th', { scope: 'col' }, 'With it, if it is paid'))) : null,
      h('tbody', {}, rows.map(([text, without, withOwed]) => h('tr', {},
        h('th', { scope: 'row' }, text), cell(without), m.owed ? cell(withOwed) : null))))));
    waysNote.hidden = !m.owed;
    waysNote.textContent = m.owed ? `${m.owed.note} Percentages are measured from today’s scale point.` : '';
    firstDd.textContent = `${signedEur(roundFor(m.firstRise.amount, u), opts)}${perText} from ${longDate(m.firstRise.date)}, backdated.`;
    backDd.replaceChildren(...(m.backPay === null
      ? ['Add the hours you teach in a year, under “Part-time, hourly-paid or not listed?”, to estimate it.']
      : [m.backPayOwed === null
        ? `About ${eur(m.backPay)} before tax, if the deal is accepted and first paid in ${longDate(sel.payMonth)}. `
        : `About ${eur(m.backPay + m.backPayOwed)} before tax if both are paid in ${longDate(sel.payMonth)}: ${eur(m.backPay)} from this deal and ${eur(m.backPayOwed)} for the ${m.owed.pct}% from ${longDate(m.owed.since.slice(0, 7))}. `,
        h('a', { href: '#back-pay' }, 'How it adds up')]));
    const hours = u === 'hour' ? sel.hoursPerYear : 0;
    hoursDiv.hidden = !hours;
    if (hours) {
      hoursDiv.querySelector('dd').textContent = `For ${hours} hours: ${eur(nowR * hours)} now, ${eur(endR * hours)} by March 2029, before tax.`;
    }
    explain.textContent = m.explanation;
    caveat.textContent = m.caveat;
    notes.hidden = m.notes.length === 0;
    notes.replaceChildren(...m.notes.map((n) => h('li', {}, n)));
  };

  store.subscribe(update);
  update(store.get());
  return el;
}

/** Nothing is kept between visits unless the reader ticks the box. "Clear my choices" starts the page again. */
export function rememberRow(store) {
  const rememberBox = h('input', { id: 'pp-remember', type: 'checkbox' });
  const reset = h('button', { type: 'button', class: 'button-quiet' }, 'Clear my choices');
  const el = h('div', { class: 'privacy' },
    h('p', {}, 'Your choices are not saved or sent anywhere unless you tick this box. If you do, they are kept on this device only, for your next visit.'),
    h('div', { class: 'privacy-row' },
      h('label', { class: 'switch', for: 'pp-remember' }, rememberBox, h('span', {}, 'Remember my choices on this device')),
      reset));
  rememberBox.addEventListener('change', () => store.set({ remember: rememberBox.checked }));
  reset.addEventListener('click', () => {
    forgetSelection();
    store.reset({ ...DEFAULT_SELECTION }); // a reset: every part drops what it holds itself
  });
  const sync = (sel) => { rememberBox.checked = sel.remember; }; // another tab may have unticked it
  store.subscribe(sync);
  sync(store.get());
  return el;
}
