// The opening: "Your pay against prices, month by month". It is the first thing on the
// page: pick a job, grade, point and (if wanted) the month of the yearly increment, and
// the chart is drawn for that pay. Pay rises in steps, prices creep up every month, and
// a play head sweeps across the deal's 33 months. Press play, drag along the chart or use
// the slider. The four key figures beside it count up once.
//
// The chart is drawn complete, so it never depends on the animation having run
// (print, background tabs, reduced motion). The first time it is seen, it replays from
// the start.

import { applySteps, priceIndexSeries, careerEvents, positionIn } from '../pay.js';
import { resolvePay, figuresFor, lowestScalePoint, sectorOf, gradesIn, gradeOf, careerOf, scenarioOf, sectorPatch, gradePatch, thisMonth, ANY_JOB } from '../selection.js';
import { eur, pct } from '../format.js';
import { svgEl, scaleLinear } from '../svg.js';
import { h } from '../dom.js';
import { niceRange, labelSize } from '../chart.js';
import { prefersReducedMotion, onFirstView } from '../motion.js';
import { extrasSwitches, pricesSwitch } from '../switches.js';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const DURATION = 7000; // ms for the play head to cross the chart

/** Fractional months from the start of month `startYm` to `date`. */
export function monthOffset(date, startYm) {
  const [y, m, d] = date.split('-').map(Number);
  const [sy, sm] = startYm.split('-').map(Number);
  const daysInMonth = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return (y - sy) * 12 + (m - sm) + (d - 1) / daysInMonth;
}

/**
 * The race for one salary: each counted rise as a step (`at` months after the deal's
 * start, with the pay index before and after), and the price index at the start and at
 * the end of each month. Both indices are 100 on 1 July 2026.
 *
 * Prices are always compared with the deal's rises alone, on the salary given. With a
 * `career` (see careerOf) the reader's own pay, increments and all, is added as `own`:
 * a second series measured from their pay on 1 July 2026. Increments are normal pay
 * progression, so they are shown but never counted against prices.
 */
export function model(base, data, { includeLB, career = null, rates = data.INFLATION.rates }) {
  const { DEAL, INFLATION } = data;
  const start = DEAL.start.slice(0, 7);
  const steps = applySteps(base, DEAL.steps, { includeLB }).filter((r) => r.included).map((r) => ({
    at: monthOffset(r.step.date, start),
    before: (r.before / base) * 100,
    after: (r.after / base) * 100,
    pct: r.step.pct,
    rise: r.rise,
    flat: r.flat,
    kind: r.step.kind,
  }));
  const price = [100, ...priceIndexSeries({ from: INFLATION.from, to: INFLATION.to, rates }).map((p) => p.value)];
  const m = { months: DEAL.months, start, steps, price, base };
  if (career) {
    const path = careerEvents(career.values, DEAL.steps, { ...career, from: start, to: DEAL.end.slice(0, 7), includeLB });
    const first = path.start.salary;
    m.own = {
      first, // their pay on 1 July 2026, in euro
      startLabel: career.labels[path.start.pos],
      steps: path.events.map((e) => ({
        at: monthOffset(e.date, start),
        before: (e.before / first) * 100,
        after: (e.after / first) * 100,
        kind: e.kind,
        label: career.labels[e.pos],
      })),
    };
  }
  return m;
}

/**
 * Pay and price indices `t` months in, and what pay then buys compared with the start (%).
 * "Pay" is the deal's rises alone. A whole number of months is the end of a month, so a
 * rise dated the 1st of the next month is not in it yet (the same convention as chapter 2).
 * With increments added, `own` is the reader's own pay index and `label` the point held.
 */
export function stateAt(m, t) {
  let pay = 100;
  for (const s of m.steps) if (s.at < t) pay = s.after;
  const i = Math.min(m.months - 1, Math.floor(t));
  const price = m.price[i] + (m.price[i + 1] - m.price[i]) * Math.min(1, t - i);
  const state = { pay, price, real: (pay / price - 1) * 100 };
  if (m.own) {
    state.own = 100;
    state.label = m.own.startLabel;
    for (const s of m.own.steps) if (s.at < t) { state.own = s.after; state.label = s.label; }
  }
  return state;
}

/** Where the play head is, in words. */
export function whenText(t, startYm, months) {
  const [y, m] = startYm.split('-').map(Number);
  if (t <= 0) return `Starting line: 1 ${MONTHS[m - 1]} ${y}`;
  const index = (m - 1) + Math.min(months, Math.ceil(t)) - 1; // the month `t` falls in, or has just completed
  const name = `${MONTHS[index % 12]} ${y + Math.floor(index / 12)}`;
  return t >= months ? `By the end of ${name}` : `In ${name}`;
}

/** How many of the months end with prices above pay (the same count as chapter 2 makes). */
export function monthsBehind(m) {
  let count = 0;
  for (let t = 1; t <= m.months; t++) {
    const s = stateAt(m, t);
    if (s.price > s.pay) count++;
  }
  return count;
}

/** The yearly salary in force `t` months in, in euro: the reader's own, with increments where they are added. */
export function payThen(m, t) {
  const s = stateAt(m, t);
  return m.own ? (s.own / 100) * m.own.first : (s.pay / 100) * m.base;
}

/** '3.4% in 2026, 3.1% in 2027 and 2% in 2028, with 2029 assumed at 2%'. */
export function forecastText(inflation) {
  const years = Object.keys(inflation.rates).map(Number).sort();
  const say = (year) => `${inflation.rates[year]}% in ${year}`;
  const forecast = years.filter((year) => !inflation.assumedYears.includes(year)).map(say);
  const assumed = years.filter((year) => inflation.assumedYears.includes(year)).map((year) => `${year} assumed at ${inflation.rates[year]}%`);
  const list = forecast.length > 1 ? `${forecast.slice(0, -1).join(', ')} and ${forecast[forecast.length - 1]}` : forecast.join('');
  return assumed.length ? `${list}, with ${assumed.join(' and ')}` : list;
}

const signed = (n) => `${n < 0 ? '−' : '+'}${pct(Math.abs(n))}`;

function buildChart(m, width, text, compact) {
  const W = Math.max(280, width);
  const narrow = W < 520;
  // Present mode on a short screen: with increments the tiles and the note run longer, so the chart gives way.
  const H = compact ? (m.own ? 160 : 196) : narrow ? 250 : W < 760 ? 264 : 310; // shorter beside the headline, so it is on the first screen
  const k = text / 12;
  const margin = { top: 16, right: Math.round(58 * k), bottom: Math.round(30 * k), left: Math.round(38 * k) };
  const N = m.months;
  const ownSteps = m.own ? m.own.steps : [];
  const top = Math.max(m.steps.length ? m.steps[m.steps.length - 1].after : 100, m.price[N], ownSteps.length ? ownSteps[ownSteps.length - 1].after : 100);
  const { ticks } = niceRange(100, top + 0.6);
  const x = scaleLinear([0, N], [margin.left, W - margin.right]);
  const y = scaleLinear([ticks[0], ticks[ticks.length - 1]], [H - margin.bottom, margin.top]);
  const r = (n) => Math.round(n * 100) / 100;

  let payLine = `M${r(x(0))},${r(y(100))}`;
  for (const s of m.steps) payLine += `H${r(x(s.at))}V${r(y(s.after))}`;
  payLine += `H${r(x(N))}`;
  const priceLine = m.price.map((v, i) => `${i ? 'L' : 'M'}${r(x(i))},${r(y(v))}`).join('');
  const below = `V${H - margin.bottom}H${r(x(0))}Z`;
  const above = `V${margin.top}H${r(x(0))}Z`;

  // The reader's own pay with increments: a second, dashed line. It is not part of the comparison with prices.
  let ownLine = `M${r(x(0))},${r(y(100))}`;
  for (const s of ownSteps) ownLine += `H${r(x(s.at))}V${r(y(s.after))}`;
  ownLine += `H${r(x(N))}`;
  // A move between two points on the same figure changes nothing, so it gets no mark.
  const marks = ownSteps.filter((s) => s.kind === 'increment' && s.after > s.before).map((s) => {
    const [cx, cy] = [r(x(s.at)), r(y(s.after))];
    return svgEl('path', { class: 'race-inc-mark', d: `M${cx},${cy - 5.5}L${cx + 5.5},${cy}L${cx},${cy + 5.5}L${cx - 5.5},${cy}Z` });
  });
  const seen = svgEl('rect', { x: 0, y: 0, width: W, height: H });
  const svg = svgEl('svg', { class: 'chart-svg race-svg', viewBox: `0 0 ${W} ${H}`, width: W, height: H, role: 'img' }, [
    svgEl('defs', {}, [
      svgEl('clipPath', { id: 'race-above-price' }, svgEl('path', { d: priceLine + above })),
      svgEl('clipPath', { id: 'race-above-pay' }, svgEl('path', { d: payLine + above })),
      svgEl('clipPath', { id: 'race-seen' }, seen),
    ]),
  ]);
  for (const tick of ticks) {
    svg.append(
      svgEl('line', { class: 'grid', x1: margin.left, x2: W - margin.right, y1: y(tick), y2: y(tick) }),
      svgEl('text', { class: 'axis-label', x: margin.left - 6, y: y(tick) + 4, 'text-anchor': 'end' }, String(tick)));
  }
  for (const [at, label, anchor] of [[0, narrow ? 'Jul' : 'Jul 2026', 'start'], [6, '2027', 'middle'], [18, '2028', 'middle'], [30, '2029', 'middle']]) {
    svg.append(svgEl('text', { class: 'axis-label', x: x(at), y: H - margin.bottom + Math.round(text * 1.6), 'text-anchor': anchor }, label));
  }
  // Everything the play head has passed: who is ahead (shaded), then the two lines.
  svg.append(svgEl('g', { 'clip-path': 'url(#race-seen)' }, [
    svgEl('path', { class: 'race-pay-ahead', d: payLine + below, 'clip-path': 'url(#race-above-price)' }),
    svgEl('path', { class: 'race-price-ahead', d: priceLine + below, 'clip-path': 'url(#race-above-pay)' }),
    svgEl('path', { class: 'line-price', d: priceLine }),
    svgEl('path', { class: 'line-pay', d: payLine }),
    ...(m.own ? [svgEl('path', { class: 'line-own', d: ownLine })] : []),
    ...marks,
  ]));
  const head = svgEl('line', { class: 'race-head', y1: margin.top, y2: H - margin.bottom });
  const dotPrice = svgEl('circle', { class: 'dot-price', r: 5.5 });
  const dotPay = svgEl('circle', { class: 'dot-pay', r: 5.5 });
  const labelPay = svgEl('text', { class: 'end-label race-label-pay' }, m.own ? 'Deal' : 'Pay');
  const labelPrice = svgEl('text', { class: 'end-label race-label-price' }, 'Prices');
  const dotOwn = m.own ? svgEl('circle', { class: 'dot-own', r: 5.5 }) : null;
  const labelOwn = m.own ? svgEl('text', { class: 'end-label race-label-own' }, 'You') : null;
  svg.append(head, dotPrice, dotPay, labelPay, labelPrice);
  if (m.own) svg.append(dotOwn, labelOwn);

  const place = (t, s) => {
    const px = r(x(t));
    seen.setAttribute('width', px);
    head.setAttribute('x1', px); head.setAttribute('x2', px);
    dotPay.setAttribute('cx', px); dotPay.setAttribute('cy', r(y(s.pay)));
    dotPrice.setAttribute('cx', px); dotPrice.setAttribute('cy', r(y(s.price)));
    // One label above the higher dot and one below the lower, kept inside the plot.
    const payOnTop = s.pay >= s.price;
    const lower = Math.min(r(Math.max(y(s.pay), y(s.price))) + 15, H - margin.bottom - 4);
    const upper = Math.min(r(Math.min(y(s.pay), y(s.price))) - 6, lower - 15);
    labelPay.setAttribute('x', px + 9); labelPay.setAttribute('y', payOnTop ? upper : lower);
    labelPrice.setAttribute('x', px + 9); labelPrice.setAttribute('y', payOnTop ? lower : upper);
    if (m.own) {
      // The reader's own line is never below the deal's; its label sits clear above the other two.
      dotOwn.setAttribute('cx', px); dotOwn.setAttribute('cy', r(y(s.own)));
      labelOwn.setAttribute('x', px + 9);
      labelOwn.setAttribute('y', Math.max(text, Math.min(r(y(s.own)) - 6, upper - 15)));
    }
  };
  const timeAt = (clientX) => {
    const box = svg.getBoundingClientRect();
    const px = ((clientX - box.left) / box.width) * W;
    return Math.max(0, Math.min(N, Math.round(((px - margin.left) / (W - margin.left - margin.right)) * N)));
  };
  return { svg, place, timeAt };
}

/** What the line under the pickers says once an increment month is chosen: what is added, or why nothing is. */
function incrementNote({ sel, career, climbs, who, now }) {
  if (!sel.incrementMonth) return '';
  if (who === 'low') return 'Increments are not added to this comparison: it follows one scale point.';
  if (!career) {
    return sel.contract === 'hourly'
      ? 'Increments need a grade and scale point. Choosing a grade above switches you from an hourly rate to a salary.'
      : 'Increments need a grade and scale point: choose them above.';
  }
  if (!climbs) {
    if (career.pos < career.values.length - 1) return 'No increment falls between July 2026 and March 2029 for the point and month you chose.';
    return 'You are at the top of this scale, so no increments are added. The chart takes you to have been on this point since before July 2026.'
      + (career.lsiAbove ? ' The long service increment above it is not added, because it depends on your years at the top.' : '');
  }
  const [year, month] = career.now.split('-').map(Number);
  return `The dashed line is your own pay: it adds one point each ${MONTHS[sel.incrementMonth - 1]}${career.skips ? ' (skipped points are passed over)' : ''}, `
    + `working from the point you ${career.now === now ? 'are on now' : 'gave'} (${MONTHS[month - 1]} ${year}), up to the top of the scale. `
    + 'Increments are normal pay progression, so only the deal’s rises are compared with prices. '
    + 'Long service increments and promotions are not included.'
    + (sel.incrementMonth === month ? ' This month’s increment is taken as already paid, so choose the point you are on after it.' : '');
}

/** The four key figures count up once. Their final text is already in the page. */
function countUp(el) {
  const target = Number(el.dataset.count);
  const format = el.dataset.format;
  const finalText = el.textContent;
  const show = (v) => (format === 'pct2' ? `${v.toFixed(2)}%` : format === 'eurk' ? `€${Math.round(v / 1000)}k` : String(Math.round(v)));
  const t0 = performance.now();
  const duration = 1100;
  const tick = (now) => {
    const p = Math.min(1, (now - t0) / duration);
    el.textContent = p < 1 ? show(target * (1 - Math.pow(1 - p, 3))) : finalText;
    if (p < 1) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

/** Fine woven lines across the navy band, in the spirit of a banknote's engraving. */
function weave() {
  const lines = [];
  for (let i = 0; i < 16; i++) {
    let d = `M-20 ${40 + i * 38}`;
    for (let px = 0; px <= 1240; px += 155) d += ` q 38.75 ${i % 2 ? -26 : 26} 77.5 0 t 77.5 0`;
    lines.push(svgEl('path', { d }));
  }
  return svgEl('svg', { class: 'hero-weave', viewBox: '0 0 1200 600', preserveAspectRatio: 'xMidYMid slice', 'aria-hidden': 'true' }, lines);
}

export function render(root, { store, data, now = thisMonth() }) {
  const N = data.DEAL.months;
  const { SCALES } = data;
  const motion = !prefersReducedMotion();
  const band = typeof root.closest === 'function' ? root.closest('.hero')?.querySelector('.hero-band') : null;
  if (band) band.prepend(weave());

  // Who the chart is for: job, grade, the point held now and the month of the yearly increment.
  const option = (value, text) => h('option', { value }, text);
  const field = (id, label, control, hidden = false) => h('div', { class: 'field', hidden }, h('label', { for: id }, label), control);
  const jobSelect = h('select', { id: 'race-job' });
  const gradeSelect = h('select', { id: 'race-grade' });
  const pointSelect = h('select', { id: 'race-point' });
  const incSelect = h('select', { id: 'race-inc' }, option('', 'None (optional)'), MONTHS.map((name, i) => option(i + 1, name)));
  const picker = h('div', { class: 'race-picker', role: 'group', 'aria-label': 'Whose pay to show' },
    field('race-job', 'Your job', jobSelect, SCALES.sectors.length < 2),
    field('race-grade', 'Grade', gradeSelect),
    field('race-point', 'Point you are on now', pointSelect),
    field('race-inc', 'Increment month', incSelect));
  const context = h('p', { class: 'context-line' });
  const incNote = h('p', { class: 'race-inc-note note', hidden: true, 'aria-live': 'polite' });

  // Until a job is chosen the page shows an example salary, and the three pickers are
  // filled in one after the other: nothing changes until job, grade and point are all
  // chosen. `draft` holds the first two meanwhile. After that, each change applies at once.
  const draft = { sector: '', gradeId: '' };
  const noJob = (sel) => sel.sector === ANY_JOB.id;
  const listed = { jobs: null, grades: null, points: null }; // what the three lists hold at the moment
  const fill = (select, key, slot, options) => {
    if (listed[slot] === key) return;
    listed[slot] = key;
    select.replaceChildren(...options());
  };
  const syncPicker = (sel) => {
    const drafting = noJob(sel);
    if (!drafting) { draft.sector = ''; draft.gradeId = ''; }
    const sector = drafting ? draft.sector : sel.sector;
    const grade = drafting ? SCALES.grades.find((g) => g.id === draft.gradeId) ?? null : gradeOf(sel, SCALES);
    fill(jobSelect, drafting ? 'asking' : 'chosen', 'jobs',
      () => [...(drafting ? [option('', 'Choose your job')] : []), ...SCALES.sectors.map((s) => option(s.id, s.name))]);
    // A typed salary or an hourly rate has no grade here until one is chosen.
    fill(gradeSelect, `${sector}|${grade ? 'grade' : 'none'}`, 'grades',
      () => [...(grade ? [] : [option('', sector ? 'Choose your grade' : 'Choose your job first')]), ...gradesIn(SCALES, sector).map((g) => option(g.id, g.name))]);
    fill(pointSelect, `${grade ? grade.id : ''}|${drafting ? 'asking' : 'chosen'}`, 'points',
      () => [...(drafting || !grade ? [option('', grade ? 'Choose your point' : 'Choose your grade first')] : []), ...(grade ? grade.points : []).map((p, i) => option(i, `${p.label} (${eur(p.value)})`))]);
    jobSelect.value = sector;
    gradeSelect.value = grade ? grade.id : '';
    gradeSelect.disabled = !sector;
    pointSelect.value = grade && !drafting ? String(sel.pointIndex) : '';
    pointSelect.disabled = !grade;
    incSelect.value = sel.incrementMonth ? String(sel.incrementMonth) : '';
    incSelect.disabled = !gradeOf(sel, SCALES); // an increment needs a point to start from
  };
  // A choice of job, grade or point says where the reader stands this month. The month goes
  // with it, so "the point you are on now" means the same on a later visit; nothing else
  // re-dates it. Any choice here also brings the chart back from the lowest-point comparison.
  const backToMine = () => { who = 'mine'; };
  const choose = (patch) => { backToMine(); store.set({ ...patch, touched: true, pointMonth: now }); };
  jobSelect.addEventListener('change', () => {
    const sel = store.get();
    // Back to "Choose your job" drops the grade that went with the job.
    if (noJob(sel)) { draft.sector = jobSelect.value; draft.gradeId = ''; syncPicker(sel); return; }
    if (!jobSelect.value) return;
    choose(sectorPatch(sel, SCALES, jobSelect.value));
  });
  gradeSelect.addEventListener('change', () => {
    const sel = store.get();
    if (noJob(sel)) { draft.gradeId = gradeSelect.value; syncPicker(sel); return; }
    if (!gradeSelect.value) return;
    choose({ ...gradePatch(sel, SCALES, gradeSelect.value), contract: sel.contract === 'hourly' ? 'full' : sel.contract });
  });
  pointSelect.addEventListener('change', () => {
    const sel = store.get();
    if (pointSelect.value === '') return;
    const pointIndex = Number(pointSelect.value);
    if (noJob(sel)) choose({ sector: draft.sector, gradeId: draft.gradeId, pointIndex, typed: null, contract: sel.contract === 'hourly' ? 'full' : sel.contract, includeOwed: false });
    else choose({ pointIndex });
  });
  incSelect.addEventListener('change', () => { backToMine(); store.set({ incrementMonth: incSelect.value ? Number(incSelect.value) : null, touched: true }); });

  // The figures for the month the play head is on, the slider, and the chart.
  const when = h('p', { class: 'race-when' });
  const euroLabel = h('small');
  const euroOut = h('b');
  const monthly = h('span', { class: 'race-monthly' });
  const payLabel = h('small', {}, 'Pay is up');
  const payOut = h('b');
  // The reader's own pay with increments, apart from the deal: the figure follows the slider, the reason does not change.
  const splitOwn = h('span');
  const split = h('p', { class: 'race-split', hidden: true }, splitOwn, ' ',
    h('span', { class: 'race-split-why' }, 'Increments are normal progression, so they are not counted against prices.'));
  const priceOut = h('b');
  const realOut = h('b');
  const realNote = h('span', { class: 'race-real-note', hidden: true }, 'increments not counted'); // shown when the reader has added them
  const tiles = h('div', { class: 'race-tiles' },
    h('div', { class: 'race-tile euro' }, euroLabel, euroOut, monthly),
    h('div', { class: 'race-tile pay' }, payLabel, payOut),
    h('div', { class: 'race-tile price' }, h('small', {}, 'Prices are up'), priceOut),
    h('div', { class: 'race-tile real' }, h('small', {}, 'So pay buys'), realOut, realNote));
  const wrap = h('div', { class: 'chart-wrap' });
  const playBtn = h('button', { type: 'button', class: 'race-play', 'aria-label': 'Play' }, '▶');
  const scrub = h('input', { type: 'range', class: 'race-scrub', min: 0, max: N, step: 1, value: N, 'aria-label': 'Month, from July 2026 to March 2029' });
  const aheadText = h('span');
  const ownKey = h('li', { class: 'race-key-own', hidden: true });
  const incKey = h('li', { class: 'race-key-inc', hidden: true });
  const legend = h('ul', { class: 'legend race-legend' },
    h('li', {}, h('span', { class: 'swatch ahead' }), aheadText),
    ownKey, incKey);

  // What could go either way, and a comparison: under the chart, out of the way of the figures.
  const mine = h('button', { type: 'button', 'aria-pressed': 'true' });
  const lowest = h('button', { type: 'button', 'aria-pressed': 'false' });
  const picks = h('div', { class: 'race-picks', role: 'group', 'aria-label': 'Whose pay' }, mine, lowest);
  const options = h('div', { class: 'race-options' }, pricesSwitch(store, data, 'race'), extrasSwitches(store, data, 'race'), picks,
    h('p', { class: 'race-more' }, h('a', { href: '#your-pay' }, 'Part-time, hourly-paid or not listed? Use the full calculator')));
  const source = h('p', { class: 'note race-source' });

  root.append(
    h('h2', { id: 'race-h' }, 'Your pay against prices, month by month'),
    picker, context, incNote,
    h('div', { class: 'race-when-row' }, when, h('span', { class: 'race-hint' }, 'Press play, or slide to any month')),
    tiles, split,
    h('div', { class: 'race-controls' }, playBtn, scrub), // beside the figures it changes
    wrap, legend, options, source);

  const m0 = data.DEAL.start.slice(0, 7);
  let who = 'mine';
  let money = { factor: 1, unit: 'year' }; // how the index turns into the pay shown
  let t = N; // complete until it is first seen
  let timer = null;
  let m = null;
  let chart = null;
  let lastWidth = -1;

  const place = () => {
    const s = stateAt(m, t);
    chart.place(t, s);
    const label = whenText(t, m.start, N);
    when.textContent = label;
    // The euro figure is the reader's own pay (with increments, where added); the three beside it compare the deal with prices.
    const euro = (m.own ? (s.own / 100) * m.own.first : (s.pay / 100) * m.base) * money.factor;
    const hourly = money.unit === 'hour';
    euroLabel.textContent = hourly ? 'Hourly rate, before tax' : 'Yearly pay, before tax';
    euroOut.textContent = eur(euro, { cents: hourly });
    // With increments added, say which point the euro figure is for.
    const lower = (label) => `${label[0].toLowerCase()}${label.slice(1)}`;
    const onPoint = m.own ? `, on ${lower(s.label)}` : '';
    monthly.textContent = hourly ? '' : `about ${eur(euro / 12)} a month${onPoint}`; // one line in the tile
    // Increments are normal progression: shown beside the comparison, never part of it.
    payLabel.textContent = m.own ? 'The deal adds' : 'Pay is up';
    realNote.hidden = !m.own;
    split.hidden = !m.own;
    splitOwn.textContent = m.own
      ? `With your increments, your own pay is up ${signed(s.own - 100)} (${s.label === m.own.startLabel ? `still on ${lower(s.label)}` : `${lower(m.own.startLabel)} to ${lower(s.label)}`}).`
      : '';
    payOut.textContent = signed(s.pay - 100);
    priceOut.textContent = signed(s.price - 100);
    realOut.textContent = `${pct(Math.abs(s.real))} ${s.real >= 0 ? 'more' : 'less'}`;
    scrub.value = String(t);
    scrub.setAttribute('aria-valuetext', `${label}: ${euroOut.textContent} ${hourly ? 'an hour' : 'a year'}${onPoint}, ${m.own ? 'the deal adds' : 'pay'} ${signed(s.pay - 100)}, prices ${signed(s.price - 100)}`);
  };

  const stop = () => {
    if (timer) clearInterval(timer);
    timer = null;
    playBtn.textContent = '▶';
    playBtn.setAttribute('aria-label', 'Play');
  };
  const play = () => {
    stop();
    if (t >= N) t = 0;
    const t0 = Date.now() - (t / N) * DURATION;
    place(); // show the starting position at once, not on the first tick
    playBtn.textContent = '❚❚';
    playBtn.setAttribute('aria-label', 'Pause');
    // Timed, not frame-based: the chart finishes even where no frames are drawn.
    timer = setInterval(() => {
      t = Math.min(N, ((Date.now() - t0) / DURATION) * N);
      place();
      if (t >= N) stop();
    }, 40);
  };

  const draw = (force = false) => {
    const width = Math.round(wrap.clientWidth || 640);
    if (!force && Math.abs(width - lastWidth) < 2) return;
    lastWidth = width;
    const sel = store.get();
    const pay = resolvePay(sel, data.SCALES);
    const sector = sectorOf(sel, data.SCALES);
    const low = lowestScalePoint(data.SCALES, sector.id);
    lowest.textContent = low === null ? '' : `The ${sector.low} (${eur(low)})`;
    const sameAsLowest = low === null || pay.published === low; // no job chosen: no low point to compare with
    if (low === null) who = 'mine';
    if (sameAsLowest) who = 'mine';
    // The lowest point gets the same treatment as the reader's own: lifted if they count the 1% from 2025.
    const base = who === 'low' ? low * (pay.base / pay.published) : pay.base;
    money = who === 'low' ? { factor: 1, unit: 'year' } : { factor: pay.factor, unit: pay.unit };
    // Increments, when the reader has asked for them and has a scale left to climb in these months.
    syncPicker(sel);
    const career = careerOf(sel, SCALES, now);
    const place0 = (month) => positionIn(month, { ...career, count: career.values.length });
    const climbs = Boolean(career) && place0(m0) !== place0(data.DEAL.end.slice(0, 7));
    const counting = climbs && who === 'mine';
    const prices = scenarioOf(sel, data.INFLATION);
    m = model(base, data, { includeLB: sel.includeLB, career: counting ? career : null, rates: prices.rates });
    incNote.hidden = !sel.incrementMonth;
    incNote.textContent = incrementNote({ sel, career, climbs, who, now });
    // On a projector screen the whole opening has to fit: a shorter chart in Present mode.
    const compact = document.body.classList.contains('present') && window.innerHeight < 900;
    chart = buildChart(m, width, labelSize(wrap), compact);

    // Say whose figures these are when the pickers do not say it all: an example, or
    // something set in section 1 (part-time, an hourly rate, a typed salary, the 1% from 2025).
    const plain = !pay.isExample && Boolean(gradeOf(sel, SCALES)) && sel.contract === 'full' && pay.base === pay.published;
    context.textContent = pay.isExample ? `Example: ${pay.label}. Choose your own job, grade and point above.` : figuresFor(sel, data.SCALES);
    mine.textContent = pay.isExample ? `Example: ${pay.label}` : pay.label;
    mine.setAttribute('aria-pressed', String(who === 'mine'));
    lowest.setAttribute('aria-pressed', String(who === 'low'));
    picks.hidden = sameAsLowest;
    context.hidden = who === 'low' || plain;
    const end = stateAt(m, N);
    const behind = monthsBehind(m);
    const marked = Boolean(m.own) && m.own.steps.some((s) => s.kind === 'increment' && s.after > s.before);
    const against = m.own ? 'the deal’s rises' : 'pay';
    aheadText.textContent = behind === 0
      ? `Prices are never ahead of ${against} in these ${N} months`
      : `Prices are ahead of ${against} in ${behind} of the ${N} months`;
    ownKey.hidden = !m.own;
    ownKey.replaceChildren(...(m.own ? [h('span', { class: 'swatch line own' }), 'Your pay with increments'] : []));
    incKey.hidden = !marked;
    incKey.replaceChildren(...(marked ? [h('span', { class: 'race-key-mark', 'aria-hidden': 'true' }, '◆'), 'Your increment'] : []));
    chart.svg.setAttribute('aria-label', `Pay and prices from July 2026 to March 2029. By the end, ${m.own ? 'the deal’s rises add' : 'pay is up'} ${pct(end.pay - 100)} and prices are up ${pct(end.price - 100)}. ${aheadText.textContent}.`
      + (m.own ? ` With your increments, your own pay is up ${pct(end.own - 100)}, which is not counted against prices.` : ''));
    source.replaceChildren(
      `${prices.note} `
      + `Gross pay; local bargaining is ${sel.includeLB ? 'counted' : 'not counted'}. `
      + (counting ? 'The rest of the page shows the deal without your increments. ' : '')
      + 'A projection, not a promise. ',
      h('a', { href: '#pay-vs-prices' }, 'Try your own inflation figure'));

    for (const node of [...wrap.childNodes]) if (node.nodeName.toLowerCase() === 'svg') node.remove();
    wrap.prepend(chart.svg);
    // A mouse scrubs at once. A finger scrubs on a sideways drag or a tap, so that
    // swiping up or down past the chart scrolls the page and leaves it alone.
    const scrubTo = (e) => { stop(); t = chart.timeAt(e.clientX); place(); };
    let touch = null;
    chart.svg.addEventListener('pointerdown', (e) => {
      if (e.pointerType === 'touch') { touch = { x: e.clientX, y: e.clientY, dragging: false }; return; }
      chart.svg.setPointerCapture?.(e.pointerId);
      scrubTo(e);
    });
    chart.svg.addEventListener('pointermove', (e) => {
      if (e.pointerType !== 'touch') { if (e.buttons) scrubTo(e); return; }
      if (!touch) return;
      const dx = Math.abs(e.clientX - touch.x);
      if (!touch.dragging && dx > 8 && dx > Math.abs(e.clientY - touch.y)) touch.dragging = true;
      if (touch.dragging) scrubTo(e);
    });
    chart.svg.addEventListener('pointerup', (e) => {
      if (e.pointerType === 'touch' && touch && !touch.dragging && Math.abs(e.clientY - touch.y) < 8) scrubTo(e);
      touch = null;
    });
    chart.svg.addEventListener('pointercancel', () => { touch = null; });
    place();
  };

  playBtn.addEventListener('click', () => { if (timer) stop(); else play(); });
  scrub.addEventListener('input', () => { stop(); t = Math.round(Number(scrub.value)); place(); });
  mine.addEventListener('click', () => { who = 'mine'; draw(true); });
  lowest.addEventListener('click', () => { who = 'low'; draw(true); });

  draw(true);
  store.subscribe((_sel, meta) => {
    if (meta?.reset) { draft.sector = ''; draft.gradeId = ''; backToMine(); } // "Clear my choices": a half-made choice goes too
    draw(true);
  });
  // Present mode hides the two "whose pay" buttons and the line naming the comparison, so it shows what the pickers say.
  document.addEventListener('presentchange', () => { backToMine(); draw(true); });
  if (typeof ResizeObserver !== 'undefined') new ResizeObserver(() => draw()).observe(wrap);
  if (motion) {
    document.querySelectorAll('.hero-facts [data-count]').forEach(countUp);
    onFirstView(wrap, () => { t = 0; play(); });
  }
}
