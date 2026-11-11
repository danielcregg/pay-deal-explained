// Section 2: The nine pay rises. An animated staircase of the reader's total gain:
// each bar is the gain so far, its cap the new rise (teal = percentage, amber = the
// flat minimum, hatched = local bargaining that may not reach you).

import { applySteps, finalSalary } from '../pay.js';
import { resolvePay } from '../selection.js';
import { eur, signedEur, pct, longDate, monthLabel } from '../format.js';
import { h } from '../dom.js';
import { svgEl, scaleLinear } from '../svg.js';
import { niceTicks, roundedTopPath, axisMoney, createTooltip } from '../chart.js';
import { prefersReducedMotion, onFirstView, replayTransition } from '../motion.js';
import { ruleText } from './flat-or-percent.js';

export function model(base, steps, { includeLB }) {
  let cumulative = 0;
  const bars = applySteps(base, steps, { includeLB }).map((r) => {
    cumulative += r.rise;
    const kind = r.step.kind === 'lb' ? (r.included ? 'lb' : 'lb-possible') : (r.flat ? 'flat' : 'pct');
    return { n: r.n, step: r.step, month: r.step.date.slice(0, 7), rise: r.rise, cumulative, potential: r.potential, kind };
  });
  return { bars, total: cumulative, totalWithLB: finalSalary(base, steps, { includeLB: true }) - base };
}

const GAP = 2;

function buildChart(m, { width, factor, unit }) {
  const W = Math.max(280, width);
  const H = 290;
  const margin = { top: 30, right: 10, bottom: 46, left: unit === 'hour' ? 46 : 52 };
  const plotW = W - margin.left - margin.right;
  const plotBottom = H - margin.bottom;
  const tops = m.bars.map((b) => (b.cumulative + (b.kind === 'lb-possible' ? b.potential : 0)) * factor);
  const { ticks } = niceTicks(Math.max(...tops) * 1.04);
  const yTop = ticks[ticks.length - 1];
  const y = scaleLinear([0, yTop], [plotBottom, margin.top]);
  const band = plotW / m.bars.length;
  const barW = Math.min(24, band * 0.62);
  const money = (n) => eur(n, { cents: unit === 'hour' });

  const svg = svgEl('svg', { class: 'chart-svg', viewBox: `0 0 ${W} ${H}`, width: W, height: H, role: 'group', 'aria-label': 'Your total gain after each rise' }, [
    svgEl('defs', {}, svgEl('pattern', { id: 'hatch-stairs', width: 5, height: 5, patternUnits: 'userSpaceOnUse', patternTransform: 'rotate(45)' },
      svgEl('line', { class: 'hatch-line', x1: 0, y1: 0, x2: 0, y2: 5 }))),
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
    if (before > 0) parts.push(svgEl('rect', { class: 'bar-earlier', x, y: y(before), width: barW, height: plotBottom - y(before) }));
    if (b.kind === 'lb-possible') {
      const capTop = y(before + b.potential * factor);
      parts.push(svgEl('path', { class: 'bar-possible', d: roundedTopPath(x, capTop, barW, capFloor - capTop) }));
    } else {
      parts.push(svgEl('path', { class: `bar-${b.kind === 'lb' ? 'pct' : b.kind}`, d: roundedTopPath(x, y(top), barW, capFloor - y(top)) }));
    }
    const words = b.kind === 'lb-possible'
      ? `${longDate(b.step.date)}: local bargaining, worth ${signedEur(b.potential * factor, { cents: unit === 'hour' })} if it reaches you as a rise. Not counted.`
      : `${longDate(b.step.date)}: ${ruleText(b.step)}${b.kind === 'flat' ? ', the minimum applies' : ''}. ${signedEur(b.rise * factor, { cents: unit === 'hour' })}; total gain ${money(top)}.`;
    const grow = svgEl('g', { class: 'bar-grow', style: `transition-delay:${(i * 0.2).toFixed(1)}s` }, parts);
    const hit = svgEl('rect', { class: 'hit', x: cx - band / 2, y: margin.top, width: band, height: plotBottom - margin.top });
    const g = svgEl('g', { class: 'bar', tabindex: 0, role: 'img', 'aria-label': words }, [hit, grow]);
    const [month, year] = monthLabel(b.month).split(' ');
    svg.append(g,
      svgEl('text', { class: 'axis-label', x: cx, y: plotBottom + 18, 'text-anchor': 'middle' }, month),
      svgEl('text', { class: 'axis-label', x: cx, y: plotBottom + 33, 'text-anchor': 'middle' }, `’${year.slice(2)}`));
    return { g, cx, top: Math.min(y(top), b.kind === 'lb-possible' ? y(before + b.potential * factor) : y(top)), b, before, words };
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
  const legend = h('ul', { class: 'legend' },
    h('li', {}, h('span', { class: 'swatch pct' }), 'Percentage rise'),
    h('li', {}, h('span', { class: 'swatch flat' }), 'Flat minimum (when bigger)'),
    h('li', {}, h('span', { class: 'swatch possible' }), 'Local bargaining, if it reaches you'),
    h('li', {}, h('span', { class: 'swatch earlier' }), 'Rises so far'));
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
  root.append(h('div', { class: 'plate' }, legend, wrap, h('div', { class: 'chart-foot' }, result, replay), details));

  const tip = createTooltip(wrap);
  const motion = !prefersReducedMotion();
  let revealed = !motion;
  let lastWidth = -1;

  const draw = (force = false) => {
    const width = Math.round(wrap.clientWidth || 640);
    if (!force && Math.abs(width - lastWidth) < 2) return;
    lastWidth = width;
    const sel = store.get();
    const pay = resolvePay(sel, data.SCALES);
    const m = model(pay.base, steps, { includeLB: sel.includeLB });
    const { svg, bars } = buildChart(m, { width, factor: pay.factor, unit: pay.unit });
    if (!revealed) svg.classList.add('pre');
    for (const node of [...wrap.childNodes]) if (node.nodeName.toLowerCase() === 'svg') node.remove();
    wrap.prepend(svg);
    tip.hide();

    for (const { g, cx, top, words } of bars) {
      const show = () => tip.show(words.split('. ').filter(Boolean), cx, top);
      g.addEventListener('pointerenter', show);
      g.addEventListener('focus', show);
      g.addEventListener('pointerleave', () => tip.hide());
      g.addEventListener('blur', () => tip.hide());
    }

    const u = pay.unit;
    const money = (n) => eur(n, { cents: u === 'hour' });
    const per = u === 'hour' ? ' an hour' : ' a year';
    const now = pay.base * pay.factor;
    const end = (pay.base + m.total) * pay.factor;
    result.textContent = `By March 2029: ${money(end)}${per}, up ${money(end - now)} (${pct((m.total / pay.base) * 100)}).`
      + (sel.includeLB ? '' : ` Counting local bargaining: ${money((pay.base + m.totalWithLB) * pay.factor)}.`);

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
  if (typeof ResizeObserver !== 'undefined') new ResizeObserver(() => draw()).observe(wrap);
}
