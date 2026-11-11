// Section 1: Your pay. Pick a grade and point (or type a salary), full-time, part-time
// or hourly, and see what the draft deal adds. The choice then flows into every demo.

import { applySteps, finalSalary, summarise, backPay, owedBackPay } from '../pay.js';
import { resolvePay, parseSalary, clampFte, clampHours, DEFAULT_SELECTION, forgetSelection, sectorOf, gradesIn, gradeOf, owedFor, scenarioOf, sectorPatch, gradePatch, thisMonth } from '../selection.js';
import { eur, signedEur, pct, longDate, listSteps } from '../format.js';
import { h } from '../dom.js';
import { countTo } from '../motion.js';
import { model as payVsPrices } from './pay-vs-prices.js';

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
    real: ((1 + counted.pct / 100) * 100 / payVsPrices(base, steps, data.INFLATION, { includeLB: sel.includeLB, rates: scenarioOf(sel, data.INFLATION).rates }).price.at(-1).value - 1) * 100,
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
      : `All the rises are percentages for you: your salary is above ${threshold} at every step.`,
    sector,
    caveat: 'Gross pay at your current scale point: before tax, USC, PRSI and pension, and without annual increments.'
      + (sector.caveat && sel.gradeId !== 'typed' ? ` ${sector.caveat}` : ''), // a typed salary is not from the job's scale
    notes,
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

export function render(root, { store, data, now = thisMonth() }) {
  const { SCALES } = data;

  // ---- form ----
  const sectorSelect = h('select', { id: 'pp-sector' }, SCALES.sectors.map((s) => h('option', { value: s.id }, s.name)));
  const sectorField = h('div', { class: 'field', hidden: SCALES.sectors.length < 2 }, h('label', { for: 'pp-sector' }, 'Your job'), sectorSelect);

  const hourlyPill = pill('pp-contract', 'hourly', 'Hourly-paid');
  hourlyPill.classList.add('pill-hourly');
  const contract = h('fieldset', { class: 'seg' },
    h('legend', {}, 'Your contract'),
    h('div', { class: 'seg-options' },
      pill('pp-contract', 'full', 'Full-time'),
      pill('pp-contract', 'part', 'Part-time'),
      hourlyPill));

  // The grades on offer follow the job.
  const gradeSelect = h('select', { id: 'pp-grade' });
  const listed = { sector: null, grade: null }; // what the grade and point lists hold at the moment
  const fillGrades = (sectorId) => {
    listed.sector = sectorId;
    const option = (g) => h('option', { value: g.id }, g.name);
    const grades = gradesIn(SCALES, sectorId);
    const legacy = grades.filter((g) => g.group === 'legacy');
    gradeSelect.replaceChildren(
      h('optgroup', { label: legacy.length ? 'Current grades' : 'Grades' }, grades.filter((g) => g.group !== 'legacy').map(option)),
      ...(legacy.length ? [h('optgroup', { label: 'Other or legacy scales' }, legacy.map(option))] : []),
      h('optgroup', { label: 'Not listed?' }, h('option', { value: 'typed' }, 'Type my salary')));
  };
  const gradeField = h('div', { class: 'field' }, h('label', { for: 'pp-grade' }, 'Grade'), gradeSelect);

  const pointSelect = h('select', { id: 'pp-point' });
  const pointField = h('div', { class: 'field' }, h('label', { for: 'pp-point' }, 'Scale point'), pointSelect);

  const typedInput = h('input', { id: 'pp-typed', type: 'text', inputmode: 'decimal', autocomplete: 'off', 'aria-describedby': 'pp-typed-error' });
  const typedError = h('p', { class: 'field-error', id: 'pp-typed-error', role: 'alert' });
  const typedField = h('div', { class: 'field' },
    h('label', { for: 'pp-typed' }, 'Full-time salary (€ a year)'), typedInput, typedError);

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

  const lbBox = h('input', { id: 'pp-lb', type: 'checkbox' });
  const lbSwitch = h('label', { class: 'switch', for: 'pp-lb' }, lbBox,
    h('span', {}, 'Count local bargaining (1% on 1 March 2029) as a rise for me'));
  const owedBox = h('input', { id: 'pp-owed', type: 'checkbox' });
  const owedText = h('span');
  const owedSwitch = h('label', { class: 'switch switch-owed', for: 'pp-owed', hidden: true }, owedBox, owedText);

  const reset = h('button', { type: 'button', class: 'button-quiet' }, 'Clear my choices');
  const form = h('form', { class: 'plate pay-form', novalidate: true, onsubmit: (e) => e.preventDefault() },
    sectorField, contract, gradeField, pointField, typedField, fteField, alScale, hoursField, lbSwitch, owedSwitch,
    h('p', { class: 'privacy' }, 'Your choices stay on this device. ', reset));

  // ---- results ----
  const badge = h('p', { class: 'example-badge' }, 'Example: Lecturer, point 5. Pick your own job, grade and point.');
  const label = h('p', { class: 'pay-label' });
  const from = h('span', { class: 'from' });
  const to = h('span', { class: 'to' });
  const per = h('span', { class: 'per' });
  const big = h('p', { class: 'pay-big' }, from, h('span', { class: 'arrow', 'aria-hidden': 'true' }, ' → '),
    h('span', { class: 'visually-hidden' }, ' rising to '), to, per);
  const gain = h('p', { class: 'pay-gain', 'aria-live': 'polite' });
  const waysTitle = h('h3', { class: 'pay-ways-title' });
  const ways = h('div', { class: 'pay-ways' });
  const realLine = h('p', { class: 'pay-real' });
  const waysNote = h('p', { class: 'pay-ways-note' });
  const alt = h('div', { class: 'pay-alt' }, waysTitle, ways, waysNote);
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
  const results = h('div', { class: 'pay-result' },
    h('div', { class: 'pay-panel' }, badge, label, big, gain, realLine),
    h('div', { class: 'plate pay-detail' }, alt, caveat, facts, explain, notes));
  let shown = null; // the end figure on screen, so a change counts from it

  root.append(h('div', { class: 'pay-grid' }, form, results));

  // ---- syncing ----
  const fillPoints = (gradeId) => {
    listed.grade = gradeId;
    const grade = SCALES.grades.find((g) => g.id === gradeId);
    pointSelect.replaceChildren(...(grade ? grade.points : []).map((p, i) => h('option', { value: i }, `${p.label} (${eur(p.value)})`)));
  };

  const syncForm = (sel) => {
    for (const r of form.querySelectorAll('input[name="pp-contract"]')) r.checked = r.value === sel.contract;
    for (const r of form.querySelectorAll('input[name="pp-alscale"]')) r.checked = r.value === sel.alScale;
    sectorSelect.value = sel.sector;
    fillGrades(sel.sector);
    gradeSelect.value = sel.gradeId;
    fillPoints(sel.gradeId);
    if (sel.gradeId !== 'typed') pointSelect.value = String(sel.pointIndex);
    typedInput.value = sel.typed ? String(Math.round(sel.typed * 100) / 100) : '';
    fteInput.value = String(Math.round(sel.fte * 1000) / 10);
    hoursInput.value = sel.hoursPerYear ? String(sel.hoursPerYear) : '';
    lbBox.checked = sel.includeLB;
    owedBox.checked = sel.includeOwed;
    typedError.textContent = '';
  };

  const showFields = (sel) => {
    const hourly = sel.contract === 'hourly';
    // What only some jobs have: hourly-paid contracts, and a rise owed from the last agreement.
    hourlyPill.hidden = !sectorOf(sel, SCALES).hourly;
    const owedDef = owedFor(sel, SCALES);
    owedSwitch.hidden = !owedDef;
    owedText.textContent = owedDef
      ? `Count the ${owedDef.pct}% local bargaining from ${longDate(owedDef.since)}, with its back pay. ${owedDef.status}`
      : '';
    gradeField.hidden = hourly;
    pointField.hidden = hourly || sel.gradeId === 'typed';
    typedField.hidden = hourly || sel.gradeId !== 'typed';
    fteField.hidden = sel.contract !== 'part';
    alScale.hidden = !hourly;
    hoursField.hidden = !hourly;
  };

  const update = (sel) => {
    showFields(sel);
    // These can also be changed from other chapters, so they follow the store.
    lbBox.checked = sel.includeLB;
    owedBox.checked = sel.includeOwed;
    for (const r of form.querySelectorAll('input[name="pp-contract"]')) r.checked = r.value === sel.contract;
    if (listed.sector !== sel.sector) fillGrades(sel.sector);
    sectorSelect.value = sel.sector;
    gradeSelect.value = sel.gradeId;
    if (listed.grade !== sel.gradeId) fillPoints(sel.gradeId);
    if (sel.gradeId !== 'typed') pointSelect.value = String(sel.pointIndex);
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

    badge.hidden = !m.isExample;
    label.textContent = (sel.contract === 'part' ? `${m.label}, ${fteText(sel.fte)} of full-time` : m.label)
      + (m.owedCounted ? `, with the ${m.owed.pct}% from ${longDate(m.owed.since.slice(0, 7))}` : '');
    from.textContent = money(nowR, u);
    const startFrom = shown && shown.unit === u ? shown.value : endR;
    countTo(to, startFrom, endR, (v) => money(roundFor(v, u), u));
    shown = { unit: u, value: endR };
    realLine.replaceChildren(
      `After inflation ${m.prices.phrase}, that would buy about ${pct(Math.abs(m.real))} ${m.real >= 0 ? 'more' : 'less'} than in July 2026. `,
      h('a', { href: '#pay-vs-prices' }, 'See pay against prices'));
    per.textContent = u === 'hour' ? ' an hour' : '';
    gain.textContent = `${signedEur(endR - nowR, opts)}${perText} (+${pct(m.shown.pct)}) by March 2029, ${counting}.`;
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
      ? ['Add the hours you teach in a year to estimate it.']
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

  // ---- events ----
  // The month goes with the choice: "the point you are on" is then read the same way on a later visit.
  const set = (patch) => store.set({ ...patch, touched: true, pointMonth: now });
  form.addEventListener('change', (e) => {
    const t = e.target;
    if (t.name === 'pp-contract') set({ contract: t.value });
    else if (t.name === 'pp-alscale') set({ alScale: t.value });
    else if (t === lbBox) store.set({ includeLB: lbBox.checked });
    else if (t === owedBox) store.set({ includeOwed: owedBox.checked });
    else if (t === pointSelect) set({ pointIndex: Number(pointSelect.value) });
    else if (t === sectorSelect) {
      // A new job starts at the first point of its first grade; `update` then refills the lists.
      set(sectorPatch(store.get(), SCALES, sectorSelect.value));
    }
    else if (t === gradeSelect) {
      const sel = store.get();
      if (gradeSelect.value === 'typed') {
        const base = resolvePay(sel, SCALES).published;
        typedInput.value = String(base);
        set({ gradeId: 'typed', typed: base });
      } else {
        set(gradePatch(sel, SCALES, gradeSelect.value));
      }
    }
  });
  typedInput.addEventListener('input', () => {
    const r = parseSalary(typedInput.value);
    if (r.ok) { typedError.textContent = ''; set({ typed: r.value }); }
    // "Too low" waits for blur: every salary is too low while its first digits are typed.
    else if (r.code !== 'low' && typedInput.value.trim() !== '') typedError.textContent = r.error;
    else typedError.textContent = '';
  });
  typedInput.addEventListener('blur', () => {
    const r = parseSalary(typedInput.value);
    typedError.textContent = r.ok ? '' : r.error;
  });
  fteInput.addEventListener('input', () => set({ fte: clampFte(fteInput.value) }));
  fteInput.addEventListener('blur', () => { fteInput.value = String(Math.round(store.get().fte * 1000) / 10); });
  hoursInput.addEventListener('input', () => set({ hoursPerYear: clampHours(hoursInput.value) }));
  hoursInput.addEventListener('blur', () => {
    const used = store.get().hoursPerYear;
    hoursInput.value = used ? String(used) : '';
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
