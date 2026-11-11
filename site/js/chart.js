// Shared chart pieces: nice axis ticks, bar shapes, axis labels and a hover tooltip.

import { eur } from './format.js';
import { h } from './dom.js';

/** Clean ticks from 0 that cover `max`, about `target` intervals (step of 1, 2, 2.5 or 5 × 10ⁿ). */
export function niceTicks(max, target = 5) {
  if (!(max > 0)) return { step: 1, ticks: [0, 1] };
  const raw = max / target;
  const magnitude = Math.pow(10, Math.floor(Math.log10(raw)));
  const nice = [1, 2, 2.5, 5, 10].find((c) => c >= raw / magnitude - 1e-9);
  const step = nice * magnitude;
  const ticks = [];
  for (let i = 0; i * step < max + step - 1e-9; i++) ticks.push(Math.round(i * step * 1e6) / 1e6);
  return { step, ticks };
}

/** Clean ticks spanning [lo, hi] for axes that don't start at zero (e.g. an index around 100). */
export function niceRange(lo, hi, target = 5) {
  const raw = (hi - lo) / target;
  const magnitude = Math.pow(10, Math.floor(Math.log10(raw)));
  const nice = [1, 2, 2.5, 5, 10].find((c) => c >= raw / magnitude - 1e-9);
  const step = nice * magnitude;
  const first = Math.floor(lo / step + 1e-9);
  const last = Math.ceil(hi / step - 1e-9);
  const ticks = [];
  for (let i = first; i <= last; i++) ticks.push(Math.round(i * step * 1e6) / 1e6);
  return { step, ticks };
}

const r2 = (n) => Math.round(n * 100) / 100;

/** A bar from (x, y) down to y + hgt: 4px rounded data-end on top, square at the baseline. */
export function roundedTopPath(x, y, w, hgt, r = 4) {
  if (!(hgt > 0) || !(w > 0)) return '';
  const rr = Math.min(r, hgt, w / 2);
  return `M${r2(x)},${r2(y + hgt)}V${r2(y + rr)}A${r2(rr)},${r2(rr)} 0 0 1 ${r2(x + rr)},${r2(y)}`
    + `H${r2(x + w - rr)}A${r2(rr)},${r2(rr)} 0 0 1 ${r2(x + w)},${r2(y + rr)}V${r2(y + hgt)}Z`;
}

/** Axis labels: in full under 10,000; compact (€2.5k) on an axis that reaches it. */
export function axisMoney(v, axisMax) {
  if (v === 0) return '€0';
  if (axisMax >= 10000) return `€${Number((v / 1000).toFixed(1))}k`;
  return Number.isInteger(v) ? eur(v) : eur(v, { cents: true });
}

/** A visual-only tooltip inside a position:relative wrapper (values also live in the table view). */
export function createTooltip(wrap) {
  const tip = h('div', { class: 'tip', 'aria-hidden': 'true', hidden: true });
  wrap.append(tip);
  return {
    show(lines, x, y) {
      tip.replaceChildren(...lines.map((line, i) => h(i === 0 ? 'strong' : 'span', {}, line)));
      tip.hidden = false;
      const maxLeft = wrap.clientWidth - tip.offsetWidth - 4;
      tip.style.left = `${Math.max(4, Math.min(x - tip.offsetWidth / 2, maxLeft))}px`;
      tip.style.top = `${Math.max(0, y - tip.offsetHeight - 10)}px`;
    },
    hide() { tip.hidden = true; },
  };
}
