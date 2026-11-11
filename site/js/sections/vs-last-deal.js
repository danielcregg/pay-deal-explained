// Section 7: This deal vs the last one. Both agreements applied to the same salary,
// side by side, with how pay builds up month by month from each deal's start.
// Deliberately no single "pace" figure and no verdict (spec §4, rule 9).

import { finalSalary, payIndexSeries } from '../pay.js';
import { resolvePay, figuresFor, lowestScalePoint } from '../selection.js';
import { eur, pct, longDate } from '../format.js';
import { h } from '../dom.js';
import { svgEl, scaleLinear } from '../svg.js';
import { niceRange, createTooltip, labelSize, axisRows } from '../chart.js';

export function model(base, data, { includeLB }) {
  const both = [data.PREVIOUS_DEAL, data.DEAL];
  const lowSalary = lowestScalePoint(data.SCALES);
  const deals = both.map((d) => {
    const end = finalSalary(base, d.steps, { includeLB });
    return {
      id: d.id, name: d.name, start: d.start, end: d.end, months: d.months, stepCount: d.steps.length,
      headline: d.headlinePct, compoundedPct: (end / base - 1) * 100, endSalary: end,
      threshold: d.threshold, lowPct: (finalSalary(lowSalary, d.steps, { includeLB }) / lowSalary - 1) * 100,
      costBn: d.costBn, reviewClause: d.reviewClause,
    };
  });
  const series = (d) => [
    { m: 0, value: 100 },
    ...payIndexSeries(base, d.steps, { from: d.start.slice(0, 7), to: d.end.slice(0, 7), includeLB })
      .map((p, i) => ({ m: i + 1, value: p.value })),
  ];
  return { deals, lowSalary, series: { previous: series(data.PREVIOUS_DEAL), draft: series(data.DEAL) } };
}

const one = (n) => n.toFixed(1);

function stepPath(points, x, y) {
  let d = `M${x(points[0].m)},${y(points[0].value)}`;
  for (let i = 1; i < points.length; i++) d += `H${x(points[i].m)}V${y(points[i].value)}`;
  return d;
}

function buildChart(m, width, text = 12) {
  const W = Math.max(280, width);
  const axis = axisRows(text, [1.65], 0.5); // the month numbers, with the axis title under them
  const H = 236 + axis.margin;
  const k = text / 12;
  const margin = { top: 14, right: Math.round(64 * k), bottom: axis.margin, left: Math.round(40 * k) };
  const maxM = Math.max(m.series.previous.length, m.series.draft.length) - 1;
  const values = [...m.series.previous, ...m.series.draft].map((p) => p.value);
  const { ticks } = niceRange(100, Math.max(...values));
  const y = scaleLinear([ticks[0], ticks[ticks.length - 1]], [H - margin.bottom, margin.top]);
  const x = scaleLinear([0, maxM], [margin.left, W - margin.right]);

  const svg = svgEl('svg', {
    class: 'chart-svg vs-svg', viewBox: `0 0 ${W} ${H}`, width: W, height: H, tabindex: 0, role: 'group',
    'aria-label': 'How pay builds up under each deal, by months since the deal began. Use the left and right arrow keys to read each month.',
  });
  for (const t of ticks) {
    svg.append(
      svgEl('line', { class: 'grid', x1: margin.left, x2: W - margin.right, y1: y(t), y2: y(t) }),
      svgEl('text', { class: 'axis-label', x: margin.left - 6, y: y(t) + 4, 'text-anchor': 'end' }, String(Math.round(t * 10) / 10)));
  }
  for (const month of [0, 6, 12, 18, 24, 30]) {
    svg.append(svgEl('text', { class: 'axis-label', x: x(month), y: H - margin.bottom + axis.rows[0], 'text-anchor': 'middle' }, String(month)));
  }
  svg.append(svgEl('text', { class: 'axis-label', x: (margin.left + W - margin.right) / 2, y: H - margin.bottom + axis.rows[1], 'text-anchor': 'middle' }, 'Months since the deal began'));

  const prev = m.series.previous;
  const draft = m.series.draft;
  svg.append(
    svgEl('path', { class: 'line-prev', d: stepPath(prev, x, y) }),
    svgEl('path', { class: 'line-pay', d: stepPath(draft, x, y) }),
    // The draft's line runs on past month 30, so the 2024–26 label sits above its own line end.
    svgEl('text', { class: 'end-label', x: x(prev[prev.length - 1].m) - 4, y: y(prev[prev.length - 1].value) - 8, 'text-anchor': 'end' }, '2024–26'),
    svgEl('text', { class: 'end-label', x: x(draft[draft.length - 1].m) + 6, y: y(draft[draft.length - 1].value) + 4 }, '2026–29'));

  const cross = svgEl('line', { class: 'crosshair', y1: margin.top, y2: H - margin.bottom, visibility: 'hidden' });
  const dotPrev = svgEl('circle', { class: 'dot-prev', r: 4.5, visibility: 'hidden' });
  const dotDraft = svgEl('circle', { class: 'dot-pay', r: 4.5, visibility: 'hidden' });
  svg.append(cross, dotPrev, dotDraft);

  const at = (month) => {
    cross.setAttribute('x1', x(month)); cross.setAttribute('x2', x(month)); cross.setAttribute('visibility', 'visible');
    const p = prev[month];
    const d = draft[month];
    for (const [dot, pt] of [[dotPrev, p], [dotDraft, d]]) {
      if (pt) { dot.setAttribute('cx', x(month)); dot.setAttribute('cy', y(pt.value)); dot.setAttribute('visibility', 'visible'); }
      else dot.setAttribute('visibility', 'hidden');
    }
    return { x: x(month), y: Math.min(...[p, d].filter(Boolean).map((pt) => y(pt.value))), p, d };
  };
  const hide = () => { for (const el of [cross, dotPrev, dotDraft]) el.setAttribute('visibility', 'hidden'); };
  const monthAt = (clientX) => {
    const box = svg.getBoundingClientRect();
    const px = ((clientX - box.left) / box.width) * W;
    return Math.max(0, Math.min(maxM, Math.round(((px - margin.left) / (W - margin.left - margin.right)) * maxM)));
  };
  return { svg, at, hide, monthAt, maxM };
}

function card(deal, accent, lowSalary, note) {
  return h('article', { class: `vs-card ${accent}` },
    h('h3', {}, deal.name),
    h('p', { class: 'vs-period' }, `${longDate(deal.start)} to ${longDate(deal.end)}`),
    h('dl', { class: 'vs-facts' },
      h('div', {}, h('dt', {}, 'Length'), h('dd', {}, `${deal.months} months`)),
      h('div', {}, h('dt', {}, 'Pay rises'), h('dd', {}, `${deal.stepCount}, including local bargaining`)),
      h('div', {}, h('dt', {}, 'Headline'), h('dd', {}, `${deal.headline}%`)),
      h('div', { class: 'vs-yours' }, h('dt', {}, 'For your salary'), h('dd', {}, `+${pct(deal.compoundedPct)}`)),
      h('div', {}, h('dt', {}, 'Minimum payments apply below'), h('dd', {}, eur(deal.threshold))),
      h('div', {}, h('dt', {}, `For a ${eur(lowSalary)} salary, today’s lowest lecturing point`), h('dd', {}, `+${pct(deal.lowPct)}`)),
      h('div', {}, h('dt', {}, 'Cost'), h('dd', {}, `€${deal.costBn}bn`)),
      h('div', {}, h('dt', {}, 'Review clause'), h('dd', {}, deal.reviewClause))),
    note ? h('p', { class: 'note' }, note) : null);
}

export function render(root, { store, data }) {
  const cards = h('div', { class: 'vs-cards' });
  const legend = h('ul', { class: 'legend' },
    h('li', {}, h('span', { class: 'swatch line prev' }), 'Public Service Agreement 2024–2026'),
    h('li', {}, h('span', { class: 'swatch line pay' }), 'Draft agreement 2026–2029'));
  const wrap = h('div', { class: 'chart-wrap' });
  const live = h('p', { class: 'visually-hidden', 'aria-live': 'polite' });
  const tbody = h('tbody');
  const details = h('details', { class: 'data' }, h('summary', {}, 'Show the numbers as a table'),
    h('div', { class: 'table-scroll' }, h('table', {},
      h('thead', {}, h('tr', {}, h('th', { scope: 'col' }, 'Months in'), h('th', { scope: 'col', class: 'r' }, '2024–26'), h('th', { scope: 'col', class: 'r' }, '2026–29'))),
      tbody)));
  const lbNote = h('p', { class: 'note' });

  const context = h('p', { class: 'context-line' });
  root.append(context, cards, h('div', { class: 'plate vs-chart' },
    h('h3', {}, 'How your pay builds up under each deal'),
    h('p', { class: 'note' }, 'The same starting salary run through both agreements, from each one’s first month. Index: pay at the start = 100.'),
    legend, wrap, live, lbNote, details));

  const tip = createTooltip(wrap);
  let chart = null;
  let m = null;
  let current = null;
  let lastWidth = -1;

  const showAt = (month) => {
    const p = chart.at(month);
    const lines = [`Month ${month}`, p.p ? `2024–26: ${one(p.p.value)}` : '2024–26: ended at month 30', `2026–29: ${one(p.d.value)}`];
    tip.show(lines, p.x, p.y);
    live.textContent = lines.join(', ');
  };

  const draw = (force = false) => {
    const width = Math.round(wrap.clientWidth || 640);
    if (!force && Math.abs(width - lastWidth) < 2) return;
    lastWidth = width;
    const sel = store.get();
    const base = resolvePay(sel, data.SCALES).base;
    m = model(base, data, { includeLB: sel.includeLB });
    context.textContent = figuresFor(sel, data.SCALES);
    cards.replaceChildren(card(m.deals[0], 'prev', m.lowSalary, data.PREVIOUS_DEAL.tuLbNote), card(m.deals[1], 'draft', m.lowSalary));
    lbNote.textContent = sel.includeLB
      ? 'Both deals include their 1% local bargaining as a rise for you.'
      : 'Local bargaining is left out of both deals. Switch it on in section 1 to include it.';

    chart = buildChart(m, width, labelSize(wrap));
    for (const node of [...wrap.childNodes]) if (node.nodeName.toLowerCase() === 'svg') node.remove();
    wrap.prepend(chart.svg);
    tip.hide();
    current = null;
    const svg = chart.svg;
    svg.addEventListener('pointermove', (e) => { current = chart.monthAt(e.clientX); showAt(current); });
    svg.addEventListener('pointerleave', () => { chart.hide(); tip.hide(); });
    svg.addEventListener('focus', () => { current = current ?? chart.maxM; showAt(current); });
    svg.addEventListener('blur', () => { chart.hide(); tip.hide(); });
    svg.addEventListener('keydown', (e) => {
      const moves = { ArrowLeft: -1, ArrowRight: 1, Home: -Infinity, End: Infinity };
      if (!(e.key in moves)) return;
      e.preventDefault();
      current = Math.max(0, Math.min(chart.maxM, (current ?? chart.maxM) + moves[e.key]));
      showAt(current);
    });

    tbody.replaceChildren(...m.series.draft.map((d, i) => h('tr', {},
      h('td', {}, String(d.m)),
      h('td', { class: 'r' }, m.series.previous[i] ? one(m.series.previous[i].value) : '—'),
      h('td', { class: 'r' }, one(d.value)))));
  };

  store.subscribe(() => draw(true));
  document.addEventListener('presentchange', () => draw(true)); // the label size changes
  draw(true);
  if (typeof ResizeObserver !== 'undefined') new ResizeObserver(() => draw()).observe(wrap);
}
