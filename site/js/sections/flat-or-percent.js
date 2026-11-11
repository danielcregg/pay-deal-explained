// Section 3: Flat sum or percentage? A salary slider and a live table showing which
// rule applies at each step, with the €60,000 threshold marked.

import { applySteps, finalSalary } from '../pay.js';
import { resolvePay, sectorOf, gradesIn } from '../selection.js';
import { eur, signedEur, pct, longDate } from '../format.js';
import { h, setText } from '../dom.js';
import { DEAL } from '../data.js';

export const SLIDER = { min: 30000, max: 140000, step: 500 };

/** Who gets which rule, with the hourly-paid case worded as the inference it is. */
export const LECTURER_NOTE = `Everyone on the Lecturer and Senior Lecturer scales is above ${eur(DEAL.threshold)} at every step, so all their rises are percentages. `
  + 'Assistant Lecturers on the lower points get the flat sums, and, going by how hourly rates were set in the 2026 pay circulars, so would hourly-paid staff.';

/** Who gets the flat sums in the reader's job, read off its own scale points. */
export function flatNote(sector, data) {
  if (sector.id === 'tu') return LECTURER_NOTE;
  const threshold = eur(data.DEAL.threshold);
  if (sector.id === 'any') return `Any salary below ${threshold} gets at least the first flat sum. At ${threshold} or more, every rise is a percentage.`;
  const values = gradesIn(data.SCALES, sector.id).flatMap((g) => g.points.map((p) => p.value));
  const below = values.filter((v) => v < data.DEAL.threshold);
  if (below.length === 0) return `For a ${sector.short}, every scale point is above ${threshold}, so all the rises are percentages.`;
  if (below.length === values.length) return `For a ${sector.short}, every scale point is below ${threshold} today, so each gets at least the first flat sum.`;
  return `For a ${sector.short}, scale points up to ${eur(Math.max(...below))} are below ${threshold} today, so they get at least the first flat sum. Points above that get percentages at every step.`;
}

/** Where the slider starts for a given salary: rounded to €500 and kept in range. */
export function sliderStart(salary) {
  const rounded = Math.round(salary / SLIDER.step) * SLIDER.step;
  return Math.min(SLIDER.max, Math.max(SLIDER.min, rounded));
}

/** '2% or €1,200', '1%', or 'Local bargaining (1%)'. */
export function ruleText(step) {
  if (step.kind === 'lb') return `Local bargaining (${step.pct}%)`;
  return step.min ? `${step.pct}% or ${eur(step.min)}` : `${step.pct}%`;
}

export function model(salary, steps, { includeLB }) {
  const rows = applySteps(salary, steps, { includeLB }).map((r) => ({
    n: r.n,
    date: r.step.date,
    rule: ruleText(r.step),
    rise: r.rise,
    potential: r.potential,
    included: r.included,
    tag: r.included && r.step.min > 0 ? (r.flat ? 'flat' : 'pct') : null,
  }));
  const end = finalSalary(salary, steps, { includeLB });
  return {
    rows,
    end,
    pct: (end / salary - 1) * 100,
    flatCount: rows.filter((r) => r.tag === 'flat').length,
    floorCount: rows.filter((r) => r.tag !== null).length,
  };
}

const th = (text, cls) => h('th', { scope: 'col', class: cls }, text);

export function render(root, { store, data }) {
  const steps = data.DEAL.steps;
  const threshold = data.DEAL.threshold;
  const thresholdPos = ((threshold - SLIDER.min) / (SLIDER.max - SLIDER.min)) * 100;

  const range = h('input', {
    type: 'range', id: 'fp-salary', class: 'fp-range', min: SLIDER.min, max: SLIDER.max, step: SLIDER.step,
    style: `--th:${thresholdPos.toFixed(2)}%`,
  });
  const out = h('output', { for: 'fp-salary', class: 'fp-value' });
  const scale = h('div', { class: 'fp-scale', 'aria-hidden': 'true' },
    h('span', { class: 'lo' }, '€30k'),
    h('span', { class: 'th', style: `left:${thresholdPos.toFixed(2)}%` }, `▲ ${eur(threshold / 1000)}k threshold`),
    h('span', { class: 'hi' }, '€140k'));
  const key = h('p', { class: 'fp-key' },
    h('span', { class: 'swatch flat' }), 'Below €60,000 the flat sum is bigger. ',
    h('span', { class: 'swatch pct' }), 'Above it, the percentage is.');
  const clampNote = h('p', { class: 'note', hidden: true });
  const summary = h('p', { class: 'fp-summary', 'aria-live': 'polite' });
  const tbody = h('tbody');
  const table = h('div', { class: 'table-scroll' },
    h('table', { class: 'fp-table' },
      h('caption', {}, 'Each rise at this salary'),
      h('thead', {}, h('tr', {}, th('Date'), th('Rule'), th('You get', 'r'), th('Which wins'))),
      tbody));

  // Published starting-pay examples. For a lecturer, lecturer starting pay is worked out the
  // same way and shown beside them; for anyone else that would name grades they did not choose.
  const lecturerRows = [
    { role: 'Assistant Lecturer, starting pay (calculated here)', base: data.SCALES.grades.find((g) => g.id === 'al-ne').points[0].value },
    { role: 'Lecturer, starting pay (calculated here)', base: data.SCALES.grades.find((g) => g.id === 'lect').points[0].value },
  ].map((r) => ({ role: r.role, pct: (finalSalary(r.base, steps, { includeLB: true }) / r.base - 1) * 100, ours: true }));
  const who = h('p', { class: 'note fp-who' });
  const exampleNote = h('p', { class: 'note fp-example-note', hidden: true });
  const exampleIntro = h('p', { class: 'note' });
  const bars = h('ul', { class: 'hbars' });
  let barsWithOurs = null;
  const drawExamples = (sector) => {
    const withOurs = sector.id === 'tu';
    if (barsWithOurs === withOurs) return;
    barsWithOurs = withOurs;
    const rows = [...data.DEAL.publishedExamples, ...(withOurs ? lecturerRows : [])].sort((a, b) => b.pct - a.pct);
    const maxPct = Math.max(...rows.map((r) => r.pct));
    exampleIntro.textContent = withOurs
      ? 'As reported on 11 November, alongside lecturer starting pay worked out on this site. All include local bargaining as a 1% rise, as the reported figures do.'
      : 'As reported on 11 November. All include local bargaining as a 1% rise.';
    bars.replaceChildren(...rows.map((r) => h('li', { class: r.ours ? 'ours' : '' },
      h('span', { class: 'hb-label' }, r.role),
      h('span', { class: 'hb-track' }, h('span', { class: 'hb-bar', style: `width:${((r.pct / maxPct) * 100).toFixed(1)}%` })),
      h('span', { class: 'hb-value' }, pct(r.pct)))));
  };
  const examples = h('div', { class: 'plate examples' },
    h('h3', {}, 'Rises in starting pay, highest first'), exampleIntro, bars, exampleNote, who);

  root.append(
    h('div', { class: 'plate fp' },
      h('label', { for: 'fp-salary', class: 'fp-label' }, 'Try a salary: ', out),
      range, scale, key, clampNote, summary, table),
    examples);

  const drawTable = () => {
    const sel = store.get();
    const salary = Number(range.value);
    out.textContent = eur(salary);
    range.setAttribute('aria-valuetext', eur(salary));
    const m = model(salary, steps, { includeLB: sel.includeLB });
    tbody.replaceChildren(...m.rows.map((r) => h('tr', { class: r.included ? '' : 'muted' },
      h('td', {}, longDate(r.date)),
      h('td', {}, r.rule),
      h('td', { class: 'r' }, r.included ? signedEur(r.rise) : `${signedEur(r.potential)} if counted`),
      h('td', {}, r.tag === 'flat'
        ? h('span', { class: 'tag flat' }, 'Flat sum')
        : r.tag === 'pct'
          ? h('span', { class: 'tag pct' }, 'Percentage')
          : h('span', { class: 'tag none' }, r.included ? 'No minimum' : 'Not counted')))));
    setText(summary, `Starting at ${eur(salary)}, you would reach ${eur(m.end)} by March 2029 (+${pct(m.pct)}). `
      + `The flat sum wins at ${m.flatCount} of the ${m.floorCount} steps that have one.`);
  };

  let lastBase = null;
  const syncToSelection = () => {
    const sel = store.get();
    const sector = sectorOf(sel, data.SCALES);
    who.textContent = flatNote(sector, data);
    drawExamples(sector);
    exampleNote.hidden = !sector.exampleNote;
    exampleNote.textContent = sector.exampleNote ?? '';
    const base = resolvePay(sel, data.SCALES).base;
    if (base !== lastBase) {
      lastBase = base;
      const start = sliderStart(base);
      range.value = String(start);
      clampNote.hidden = base >= SLIDER.min && base <= SLIDER.max;
      clampNote.textContent = `Your full-time salary (${eur(base)}) is outside this slider’s range, so it starts at ${eur(start)}.`;
    }
    drawTable();
  };

  range.addEventListener('input', drawTable);
  store.subscribe(syncToSelection);
  syncToSelection();
}
