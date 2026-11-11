// Hero: the "deal ruler" (the rises drawn to scale across the deal's term) and the
// four key figures, which count up once on load.

import { svgEl } from '../svg.js';
import { h, clear } from '../dom.js';
import { prefersReducedMotion, replayTransition } from '../motion.js';
import { longDate } from '../format.js';

/** Fractional months from the start of month `startYm` to `date`. */
export function monthOffset(date, startYm) {
  const [y, m, d] = date.split('-').map(Number);
  const [sy, sm] = startYm.split('-').map(Number);
  const daysInMonth = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return (y - sy) * 12 + (m - sm) + (d - 1) / daysInMonth;
}

/** Start and year labels along the ruler's axis, as { text, x, anchor }. */
export function axisLabels(W, months) {
  const pad = 8;
  const x = (m) => pad + (m / months) * (W - 2 * pad);
  return [
    { text: W < 520 ? 'Jul' : 'Jul 2026', x: x(0), anchor: 'start' },
    ...[['2027', 6], ['2028', 18], ['2029', 30]].map(([text, m]) => ({ text, x: x(m), anchor: 'middle' })),
  ];
}

function buildRuler(deal, width) {
  const W = Math.max(280, width);
  const H = 132;
  const base = 96;
  const pad = 8;
  const narrow = W < 520;
  const barW = narrow ? 8 : 12;
  const perPct = 30; // px of bar height per 1%
  const start = deal.start.slice(0, 7);
  const x = (months) => pad + (months / deal.months) * (W - 2 * pad);

  const steps = deal.steps.map((s, i) => ({ ...s, i, cx: x(monthOffset(s.date, start)) }));
  // The two March 2029 rises are a day apart: nudge them apart so both bars show.
  for (let i = 1; i < steps.length; i++) {
    if (steps[i].cx - steps[i - 1].cx < barW + 2) {
      const mid = (steps[i].cx + steps[i - 1].cx) / 2;
      steps[i - 1].cx = mid - barW / 2 - 1;
      steps[i].cx = mid + barW / 2 + 1;
    }
  }

  const summary = steps
    .map((s) => (s.kind === 'lb' ? `local bargaining of ${s.pct}% on ${longDate(s.date)}` : `${s.pct}% on ${longDate(s.date)}`))
    .join(', ');
  const svg = svgEl('svg', {
    class: 'ruler-svg', viewBox: `0 0 ${W} ${H}`, width: W, height: H, role: 'img', 'aria-labelledby': 'ruler-title',
  }, [
    svgEl('title', { id: 'ruler-title' }, `Nine pay rises between July 2026 and March 2029: ${summary}.`),
    svgEl('defs', {}, svgEl('pattern', {
      id: 'hatch-ruler', width: 5, height: 5, patternUnits: 'userSpaceOnUse', patternTransform: 'rotate(45)',
    }, svgEl('line', { class: 'hatch-line', x1: 0, y1: 0, x2: 0, y2: 5 }))),
    svgEl('line', { class: 'ruler-axis', x1: x(0), x2: x(deal.months), y1: base, y2: base }),
  ]);

  for (const label of axisLabels(W, deal.months)) {
    if (label.anchor === 'middle') {
      svg.append(svgEl('line', { class: 'ruler-tick', x1: label.x, x2: label.x, y1: base, y2: base + 7 }));
    }
    svg.append(svgEl('text', { class: 'ruler-year', x: label.x, y: base + 22, 'text-anchor': label.anchor }, label.text));
  }

  for (const s of steps) {
    const hgt = s.pct * perPct;
    svg.append(svgEl('rect', {
      class: `ruler-bar${s.kind === 'lb' ? ' lb' : ''}`, x: s.cx - barW / 2, y: base - hgt, width: barW, height: hgt,
      style: `transition-delay:${(s.i * 0.12).toFixed(2)}s`,
    }));
    if (s.kind === 'lb') continue; // the hatching and the caption identify it
    const label = `${s.pct}%`;
    const halfText = label.length * 3.6;
    let lx = s.cx;
    let anchor = 'middle';
    if (lx + halfText > W - 2) { lx = W - 2; anchor = 'end'; }
    svg.append(svgEl('text', {
      class: 'ruler-pct', x: lx, y: base - hgt - 7, 'text-anchor': anchor,
      style: `transition-delay:${(s.i * 0.12 + 0.25).toFixed(2)}s`,
    }, label));
  }
  return svg;
}

function countUp(el) {
  const target = Number(el.dataset.count);
  const format = el.dataset.format;
  const finalText = el.textContent;
  const show = (v) => (format === 'pct2' ? `${v.toFixed(2)}%` : format === 'eurk' ? `€${Math.round(v / 1000)}k` : String(Math.round(v)));
  const t0 = performance.now();
  const duration = 1100;
  const tick = (t) => {
    const p = Math.min(1, (t - t0) / duration);
    const eased = 1 - Math.pow(1 - p, 3);
    el.textContent = p < 1 ? show(target * eased) : finalText;
    if (p < 1) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

export function render(root, { data }) {
  const animate = !prefersReducedMotion();
  const caption = h('p', { class: 'ruler-caption' },
    `Each bar is one rise, drawn to scale across the ${data.DEAL.months} months. The hatched bar is local bargaining: 1% that may not reach you as a pay rise.`);
  let lastWidth = -1;

  const draw = (withMotion) => {
    const width = Math.round(root.clientWidth || 720);
    if (Math.abs(width - lastWidth) < 2) return;
    lastWidth = width;
    const svg = buildRuler(data.DEAL, width);
    clear(root).append(svg, caption);
    if (withMotion) replayTransition(svg);
  };

  draw(animate);
  if (animate) document.querySelectorAll('.hero-facts [data-count]').forEach(countUp);
  if (typeof ResizeObserver !== 'undefined') new ResizeObserver(() => draw(false)).observe(root);
}
