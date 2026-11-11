// Section 3: The nine pay rises. An animated staircase of the reader's total gain:
// each bar is the gain so far, its cap the new rise (teal = percentage, amber = the
// flat minimum, hatched = local bargaining that may not reach you, striped teal =
// local bargaining counted as a rise). The chart is one tab stop; the arrow keys
// move between its bars.

import { applySteps, finalSalary } from '../pay.js';
import { resolvePay, figuresFor } from '../selection.js';
import { eur, signedEur, pct, longDate, monthLabel, roundedGain } from '../format.js';
import { h } from '../dom.js';
import { svgEl, scaleLinear } from '../svg.js';
import { niceTicks, roundedTopPath, axisMoney, createTooltip, labelSize, axisRows } from '../chart.js';
import { prefersReducedMotion, onFirstView, replayTransition } from '../motion.js';
import { ruleText } from './flat-or-percent.js';

export function model(base, steps, { includeLB }) {
  let cumulative = 0;
  const bars = applySteps(base, steps, { includeLB }).map((r) => {
    cumulative += r.rise;
    const kind = r.step.kind === 'lb' ? (r.included ? 'lb' : 'lb-possible') : (r.flat ? 'flat' : 'pct');
    return { n: r.n, step: r.step, month: r.step.date.slice(0, 7), rise: r.rise, cumulative, potential: r.potential, kind };
  });
  const endWithLB = finalSalary(base, steps, { includeLB: true });
  return {
    bars,
    total: cumulative,
    totalWithLB: endWithLB - base,
    endSalary: finalSalary(base, steps, { includeLB }),
    endWithLB,
  };
}

/** The figures the summary line shows, rounded the same way as section 1 so they agree. */
export function summaryNumbers(pay, m) {
  const now = pay.base * pay.factor;
  const end = m.endSalary * pay.factor;
  return {
    now,
    end,
    endWithLB: m.endWithLB * pay.factor,
    gain: roundedGain(now, end, { cents: pay.unit === 'hour' }),
    pct: (m.endSalary / pay.base - 1) * 100,
  };
}

const CAP_CLASS = { pct: 'bar-pct', flat: 'bar-flat', lb: 'bar-lb', 'lb-possible': 'bar-possible' };

/** The CSS class for a bar's cap, by kind. */
export const barClass = (kind) => CAP_CLASS[kind];

/** Legend entries: local bargaining shows as counted or as possible, following the switch. */
export function legendItems(includeLB) {
  return [
    { kind: 'pct', text: 'Percentage rise' },
    { kind: 'flat', text: 'Flat minimum (when bigger)' },
    includeLB
      ? { kind: 'lb', text: 'Local bargaining, counted as a rise' }
      : { kind: 'possible', text: 'Local bargaining, if it reaches you' },
    { kind: 'earlier', text: 'Rises so far' },
  ];
}

/** Which bar a key moves focus to, or null when the key is not the chart's. */
export function nextBar(current, key, count) {
  switch (key) {
    case 'ArrowRight': return Math.min(count - 1, current + 1);
    case 'ArrowLeft': return Math.max(0, current - 1);
    case 'Home': return 0;
    case 'End': return count - 1;
    default: return null;
  }
}

const GAP = 2;

function buildChart(m, { width, factor, unit, active, text = 12 }) {
  const W = Math.max(280, width);
  const axis = axisRows(text, [1.35], 1.1); // the month, with the year a full line below
  const H = 244 + axis.margin;
  const margin = { top: 30, right: 10, bottom: axis.margin, left: Math.round((unit === 'hour' ? 46 : 52) * (text / 12)) };
  const plotW = W - margin.left - margin.right;
  const plotBottom = H - margin.bottom;
  const tops = m.bars.map((b) => (b.cumulative + (b.kind === 'lb-possible' ? b.potential : 0)) * factor);
  const { ticks } = niceTicks(Math.max(...tops) * 1.04);
  const yTop = ticks[ticks.length - 1];
  const y = scaleLinear([0, yTop], [plotBottom, margin.top]);
  const band = plotW / m.bars.length;
  const barW = Math.min(24, band * 0.62);
  const money = (n) => eur(n, { cents: unit === 'hour' });

  const svg = svgEl('svg', {
    class: 'chart-svg', viewBox: `0 0 ${W} ${H}`, width: W, height: H, role: 'group',
    'aria-label': 'Your total gain after each rise. Use the left and right arrow keys to move between the rises.',
  }, [
    svgEl('defs', {}, [
      svgEl('pattern', { id: 'hatch-stairs', width: 5, height: 5, patternUnits: 'userSpaceOnUse', patternTransform: 'rotate(45)' },
        svgEl('line', { class: 'hatch-line', x1: 0, y1: 0, x2: 0, y2: 5 })),
      svgEl('pattern', { id: 'lb-stairs', width: 5, height: 5, patternUnits: 'userSpaceOnUse', patternTransform: 'rotate(45)' }, [
        svgEl('rect', { class: 'lb-ground', width: 5, height: 5 }),
        svgEl('line', { class: 'lb-stripe', x1: 0, y1: 0, x2: 0, y2: 5 }),
      ]),
    ]),
  ]);

  for (const t of ticks) {
    svg.append(
      svgEl('line', { class: 'grid', x1: margin.left, x2: W - margin.right, y1: y(t), y2: y(t) }),
      svgEl('text', { class: 'axis-label', x: margin.left - 8, y: y(t) + 4, 'text-anchor': 'end' }, axisMoney(t, yTop)));
  }

  const bars = m.bars.map((b, i) => {
    const cx = margin.left + band * (i + 0.5);
    const x = cx - barW / 2;
    const before = (b.cumulative - b.rise) * factor;
    const top = b.cumulative * factor;
    const capFloor = before > 0 ? y(before) - GAP : plotBottom;
    const parts = [];
    // Inset by half the 1px edge so the stroke stays inside the bar.
    if (before > 0) parts.push(svgEl('rect', { class: 'bar-earlier', x: x + 0.5, y: y(before) + 0.5, width: barW - 1, height: Math.max(0, plotBottom - y(before) - 1) }));
    const capTop = b.kind === 'lb-possible' ? y(before + b.potential * factor) : y(top);
    parts.push(svgEl('path', { class: barClass(b.kind), d: roundedTopPath(x, capTop, barW, capFloor - capTop) }));
    const words = b.kind === 'lb-possible'
      ? `${longDate(b.step.date)}: local bargaining, worth ${signedEur(b.potential * factor, { cents: unit === 'hour' })} if it reaches you as a rise. Not counted.`
      : `${longDate(b.step.date)}: ${ruleText(b.step)}${b.kind === 'flat' ? ', the minimum applies' : ''}. ${signedEur(b.rise * factor, { cents: unit === 'hour' })}; total gain ${money(top)}.`;
    const grow = svgEl('g', { class: 'bar-grow', style: `transition-delay:${(i * 0.2).toFixed(1)}s` }, parts);
    const hit = svgEl('rect', { class: 'hit', x: cx - band / 2, y: margin.top, width: band, height: plotBottom - margin.top });
    const g = svgEl('g', { class: 'bar', tabindex: i === active ? 0 : -1, role: 'img', 'aria-label': words }, [hit, grow]);
    const [month, year] = monthLabel(b.month).split(' ');
    svg.append(g,
      svgEl('text', { class: 'axis-label', x: cx, y: plotBottom + axis.rows[0], 'text-anchor': 'middle' }, month),
      svgEl('text', { class: 'axis-label', x: cx, y: plotBottom + axis.rows[1], 'text-anchor': 'middle' }, `’${year.slice(2)}`));
    return { g, cx, top: Math.min(y(top), capTop), b, before, words };
  });

  svg.append(svgEl('line', { class: 'baseline', x1: margin.left, x2: W - margin.right, y1: plotBottom, y2: plotBottom }));

  // Direct label: the final total only.
  const last = bars[bars.length - 1];
  const finalLabel = `+${money(m.total * factor)}`;
  const anchorEnd = last.cx + finalLabel.length * 4 > W - 2;
  svg.append(svgEl('text', { class: 'value-label', x: anchorEnd ? W - 2 : last.cx, y: last.top - 8, 'text-anchor': anchorEnd ? 'end' : 'middle' }, finalLabel));
  return { svg, bars };
}

export function render(root, { store, data }) {
  const steps = data.DEAL.steps;
  const legend = h('ul', { class: 'legend' });
  const wrap = h('div', { class: 'chart-wrap' });
  const result = h('p', { class: 'chart-result' });
  const replay = h('button', { type: 'button', class: 'button-quiet' }, 'Replay');
  const tbody = h('tbody');
  const details = h('details', { class: 'data' },
    h('summary', {}, 'Show the numbers as a table'),
    h('div', { class: 'table-scroll' }, h('table', {},
      h('thead', {}, h('tr', {}, h('th', { scope: 'col' }, 'Date'), h('th', { scope: 'col' }, 'Rule'),
        h('th', { scope: 'col', class: 'r' }, 'This rise'), h('th', { scope: 'col', class: 'r' }, 'Total gain so far'))),
      tbody)));
  const context = h('p', { class: 'context-line' });
  root.append(h('div', { class: 'plate' }, context, legend, wrap, h('div', { class: 'chart-foot' }, result, replay), details));

  const tip = createTooltip(wrap);
  const motion = !prefersReducedMotion();
  let revealed = !motion;
  let lastWidth = -1;
  let active = 0; // the bar that takes the chart's single tab stop

  const draw = (force = false) => {
    const width = Math.round(wrap.clientWidth || 640);
    if (!force && Math.abs(width - lastWidth) < 2) return;
    lastWidth = width;
    const sel = store.get();
    const pay = resolvePay(sel, data.SCALES);
    const m = model(pay.base, steps, { includeLB: sel.includeLB });
    legend.replaceChildren(...legendItems(sel.includeLB).map((item) =>
      h('li', {}, h('span', { class: `swatch ${item.kind}` }), item.text)));
    const { svg, bars } = buildChart(m, { width, factor: pay.factor, unit: pay.unit, active, text: labelSize(wrap) });
    if (!revealed) svg.classList.add('pre');
    const hadFocus = wrap.contains(document.activeElement);
    for (const node of [...wrap.childNodes]) if (node.nodeName.toLowerCase() === 'svg') node.remove();
    wrap.prepend(svg);
    tip.hide();

    // The arrow keys the chart uses are marked handled; any other key is left alone.
    svg.addEventListener('keydown', (e) => {
      const from = bars.findIndex((bar) => bar.g === e.target);
      const to = from < 0 ? null : nextBar(from, e.key, bars.length);
      if (to === null) return;
      e.preventDefault();
      bars[to].g.focus();
    });

    bars.forEach(({ g, cx, top, words }, i) => {
      const show = () => tip.show(words.split('. ').filter(Boolean), cx, top);
      // Whichever bar has focus (by key or by click) becomes the chart's one tab stop.
      g.addEventListener('focus', () => {
        active = i;
        bars.forEach((bar, n) => bar.g.setAttribute('tabindex', n === i ? '0' : '-1'));
      });
      g.addEventListener('pointerenter', show);
      g.addEventListener('focus', show);
      g.addEventListener('pointerleave', () => tip.hide());
      g.addEventListener('blur', () => tip.hide());
    });
    if (hadFocus) bars[active].g.focus(); // a redraw keeps the reader's place

    const u = pay.unit;
    const money = (n) => eur(n, { cents: u === 'hour' });
    const per = u === 'hour' ? ' an hour' : ' a year';
    const s = summaryNumbers(pay, m);
    context.textContent = figuresFor(sel, data.SCALES);
    result.textContent = `By March 2029: ${money(s.end)}${per}, up ${money(s.gain)} (${pct(s.pct)}).`
      + (sel.includeLB ? '' : ` Counting local bargaining: ${money(s.endWithLB)}.`);

    tbody.replaceChildren(...m.bars.map((b) => h('tr', { class: b.kind === 'lb-possible' ? 'muted' : '' },
      h('td', {}, longDate(b.step.date)),
      h('td', {}, ruleText(b.step) + (b.kind === 'flat' ? ': minimum applies' : '')),
      h('td', { class: 'r' }, b.kind === 'lb-possible' ? `${signedEur(b.potential * pay.factor, { cents: u === 'hour' })} if counted` : signedEur(b.rise * pay.factor, { cents: u === 'hour' })),
      h('td', { class: 'r' }, money(b.cumulative * pay.factor)))));
  };

  const play = () => {
    const svg = wrap.querySelector('svg');
    if (!svg || !motion) return;
    revealed = true;
    replayTransition(svg);
  };

  draw(true);
  if (!revealed) onFirstView(wrap, play);
  replay.hidden = !motion;
  replay.addEventListener('click', play);
  store.subscribe(() => draw(true));
  document.addEventListener('presentchange', () => draw(true)); // the label size changes
  if (typeof ResizeObserver !== 'undefined') new ResizeObserver(() => draw()).observe(wrap);
}
