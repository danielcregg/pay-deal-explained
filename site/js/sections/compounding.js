// Section 4: Why 10.75% comes to about 11.3%. Two bars of "gain on every €100":
// the percentages simply added up, and the rises applied to pay that has already risen.

import { compoundFactor, headlinePct } from '../pay.js';
import { longDate } from '../format.js';
import { h } from '../dom.js';
import { prefersReducedMotion, onFirstView, replayTransition } from '../motion.js';

function run(steps, includeLB) {
  let total = 100;
  const blocks = steps
    .filter((s) => includeLB || s.kind !== 'lb')
    .map((s, i) => {
      const add = (total * s.pct) / 100;
      total += add;
      return { n: i + 1, pct: s.pct, add, total, kind: s.kind, date: s.date };
    });
  return { sum: headlinePct(steps, { includeLB }), compounded: (compoundFactor(steps, { includeLB }) - 1) * 100, blocks };
}

/** On a base of 100, ignoring minimums: headline sums against compounded totals. */
export function model(steps) {
  const general = run(steps, false);
  return { withLB: run(steps, true), general: { sum: general.sum, compounded: general.compounded } };
}

const two = (n) => n.toFixed(2);

export function render(root, { data }) {
  const m = model(data.DEAL.steps);
  const { withLB, general } = m;
  const scaleMax = withLB.compounded * 1.06;
  const pctOf = (v) => `${((v / scaleMax) * 100).toFixed(3)}%`;

  const segments = (adds, kindOf) => adds.map((add, i) => h('span', {
    class: `cmp-seg${kindOf(i) === 'lb' ? ' lb' : ''}${i === adds.length - 1 ? ' last' : ''}`,
    style: `width:calc(${pctOf(add)} - 2px);transition-delay:${(i * 0.22).toFixed(2)}s`,
    title: `${longDate(withLB.blocks[i].date)}: +${two(add)}`,
  }));

  const simpleAdds = withLB.blocks.map((b) => b.pct);
  const compoundAdds = withLB.blocks.map((b) => b.add);
  const kindOf = (i) => withLB.blocks[i].kind;
  const extra = withLB.compounded - withLB.sum;

  const simpleValue = h('span', { class: 'cmp-value' }, `€${two(withLB.sum)}`);
  const compoundValue = h('span', { class: 'cmp-value' }, `€${two(withLB.compounded)}`);
  const bars = h('div', { class: 'cmp' },
    h('div', { class: 'cmp-row' },
      h('p', { class: 'cmp-label' }, 'Adding up the percentages'),
      h('div', { class: 'cmp-track' }, segments(simpleAdds, kindOf)),
      simpleValue),
    h('div', { class: 'cmp-row' },
      h('p', { class: 'cmp-label' }, 'What your pay actually gains'),
      h('div', { class: 'cmp-track' }, segments(compoundAdds, kindOf),
        h('span', { class: 'cmp-extra', style: `left:${pctOf(withLB.sum)};width:${pctOf(extra)}` })),
      compoundValue));

  const replay = h('button', { type: 'button', class: 'button-quiet' }, 'Replay');
  const table = h('details', { class: 'data' },
    h('summary', {}, 'Show the numbers as a table'),
    h('div', { class: 'table-scroll' }, h('table', {},
      h('thead', {}, h('tr', {}, h('th', { scope: 'col' }, 'Rise'), h('th', { scope: 'col', class: 'r' }, 'Added up'),
        h('th', { scope: 'col', class: 'r' }, 'On pay already raised'), h('th', { scope: 'col', class: 'r' }, 'Running total'))),
      h('tbody', {}, withLB.blocks.map((b) => h('tr', {},
        h('td', {}, `${longDate(b.date)}${b.kind === 'lb' ? ' (local bargaining)' : ''}`),
        h('td', { class: 'r' }, `+${two(b.pct)}`),
        h('td', { class: 'r' }, `+${two(b.add)}`),
        h('td', { class: 'r' }, `€${two(b.total)}`)))))));

  root.append(h('div', { class: 'plate' },
    h('p', { class: 'cmp-intro' }, 'On every €100 of starting pay:'),
    bars,
    h('p', { class: 'cmp-note' },
      `The second bar ends €${two(extra)} further along, because each rise is worked out on pay that has already gone up. `
      + `Without local bargaining the same thing happens: ${two(general.sum)}% added up becomes ${two(general.compounded)}%.`),
    h('div', { class: 'chart-foot' },
      h('ul', { class: 'legend' },
        h('li', {}, h('span', { class: 'swatch pct' }), 'A percentage rise'),
        h('li', {}, h('span', { class: 'swatch possible' }), 'Local bargaining'),
        h('li', {}, h('span', { class: 'swatch extra' }), 'The extra from compounding')),
      replay),
    table));

  const motion = !prefersReducedMotion();
  const countUp = (el, target) => {
    const t0 = performance.now();
    const duration = 9 * 220 + 400;
    const tick = (t) => {
      const p = Math.min(1, (t - t0) / duration);
      el.textContent = `€${two(target * p)}`;
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  };
  const play = () => {
    if (!motion) return;
    replayTransition(bars);
    countUp(simpleValue, withLB.sum);
    countUp(compoundValue, withLB.compounded);
  };
  if (motion) {
    bars.classList.add('pre');
    onFirstView(bars, play);
  }
  replay.hidden = !motion;
  replay.addEventListener('click', play);
}
