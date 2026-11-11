// Section 2: Pay vs prices. The reader's pay index against a price index (both 100 in
// July 2026), using the Central Bank's forecasts or a flat inflation figure of their own.

import { payIndexSeries, priceIndexSeries, monthsPricesAhead } from '../pay.js';
import { resolvePay, figuresFor } from '../selection.js';
import { pct, monthLabel } from '../format.js';
import { h } from '../dom.js';
import { svgEl, scaleLinear } from '../svg.js';
import { niceRange, createTooltip } from '../chart.js';

export function model(base, steps, inflation, { includeLB, flatRate = null }) {
  const span = { from: inflation.from, to: inflation.to };
  const pay = payIndexSeries(base, steps, { ...span, includeLB });
  const price = priceIndexSeries({ ...span, rates: inflation.rates, flatRate });
  const real = (pay[pay.length - 1].value / price[price.length - 1].value - 1) * 100;
  return { pay, price, real, ahead: monthsPricesAhead(pay, price) };
}

/** The readout, worded as a projection on the chosen inflation figures (not as a fact). */
export function readoutText(m, flatRate) {
  const lead = flatRate === null ? 'On these forecasts' : `If prices rose by ${flatRate.toFixed(1)}% a year`;
  return `${lead}, by March 2029 your pay would buy about ${pct(Math.abs(m.real))} ${m.real >= 0 ? 'more' : 'less'} than in July 2026. `
    + `Prices would be ahead of your pay in ${m.ahead.length} of the ${m.pay.length} months.`;
}

const one = (n) => n.toFixed(1);

function buildChart(m, width) {
  const W = Math.max(280, width);
  const H = 300;
  const narrow = W < 520;
  const margin = { top: 16, right: narrow ? 46 : 56, bottom: 34, left: 40 };
  const n = m.pay.length;
  const values = [...m.pay, ...m.price].map((p) => p.value);
  const { ticks } = niceRange(Math.min(100, ...values), Math.max(...values));
  const y = scaleLinear([ticks[0], ticks[ticks.length - 1]], [H - margin.bottom, margin.top]);
  const x = scaleLinear([0, n - 1], [margin.left, W - margin.right]);
  const half = (x(1) - x(0)) / 2;
  const ahead = new Set(m.ahead);

  const svg = svgEl('svg', {
    class: 'chart-svg pvp-svg', viewBox: `0 0 ${W} ${H}`, width: W, height: H, tabindex: 0, role: 'group',
    'aria-label': 'Pay and prices from July 2026 to March 2029. Use the left and right arrow keys to read each month.',
  });

  m.pay.forEach((p, i) => {
    if (ahead.has(p.month)) {
      svg.append(svgEl('rect', { class: 'ahead', x: Math.max(margin.left, x(i) - half), y: margin.top, width: half * 2, height: H - margin.bottom - margin.top }));
    }
  });
  for (const t of ticks) {
    svg.append(
      svgEl('line', { class: 'grid', x1: margin.left, x2: W - margin.right, y1: y(t), y2: y(t) }),
      svgEl('text', { class: 'axis-label', x: margin.left - 6, y: y(t) + 4, 'text-anchor': 'end' }, String(Math.round(t * 10) / 10)));
  }
  const yearMarks = [[0, narrow ? 'Jul' : 'Jul 2026', 'start'], [6, '2027', 'middle'], [18, '2028', 'middle'], [30, '2029', 'middle']];
  for (const [i, text, anchor] of yearMarks) {
    svg.append(svgEl('text', { class: 'axis-label', x: x(i), y: H - margin.bottom + 20, 'text-anchor': anchor }, text));
  }

  let payPath = `M${x(0)},${y(m.pay[0].value)}`;
  for (let i = 1; i < n; i++) payPath += `H${x(i)}V${y(m.pay[i].value)}`;
  const pricePath = m.price.map((p, i) => `${i ? 'L' : 'M'}${x(i)},${y(p.value)}`).join('');
  svg.append(
    svgEl('path', { class: 'line-price', d: pricePath }),
    svgEl('path', { class: 'line-pay', d: payPath }),
    svgEl('text', { class: 'end-label', x: x(n - 1) + 6, y: y(m.pay[n - 1].value) + 4 }, 'Pay'),
    svgEl('text', { class: 'end-label', x: x(n - 1) + 6, y: y(m.price[n - 1].value) + 4 }, 'Prices'));

  const cross = svgEl('line', { class: 'crosshair', y1: margin.top, y2: H - margin.bottom, visibility: 'hidden' });
  const dotPay = svgEl('circle', { class: 'dot-pay', r: 4.5, visibility: 'hidden' });
  const dotPrice = svgEl('circle', { class: 'dot-price', r: 4.5, visibility: 'hidden' });
  svg.append(cross, dotPrice, dotPay);

  const at = (i) => {
    cross.setAttribute('x1', x(i)); cross.setAttribute('x2', x(i));
    dotPay.setAttribute('cx', x(i)); dotPay.setAttribute('cy', y(m.pay[i].value));
    dotPrice.setAttribute('cx', x(i)); dotPrice.setAttribute('cy', y(m.price[i].value));
    for (const el of [cross, dotPay, dotPrice]) el.setAttribute('visibility', 'visible');
    return { x: x(i), y: Math.min(y(m.pay[i].value), y(m.price[i].value)) };
  };
  const hide = () => { for (const el of [cross, dotPay, dotPrice]) el.setAttribute('visibility', 'hidden'); };
  const indexAt = (clientX) => {
    const box = svg.getBoundingClientRect();
    const px = ((clientX - box.left) / box.width) * W;
    return Math.max(0, Math.min(n - 1, Math.round(((px - margin.left) / (W - margin.left - margin.right)) * (n - 1))));
  };
  return { svg, at, hide, indexAt, n };
}

export function render(root, { store, data }) {
  const steps = data.DEAL.steps;
  const inflation = data.INFLATION;
  const mode = { flat: false, rate: 3 };

  const pills = h('div', { class: 'seg-options' },
    h('label', { class: 'pill' }, h('input', { type: 'radio', name: 'pvp-mode', value: 'forecast', checked: true }), h('span', {}, 'Central Bank forecasts')),
    h('label', { class: 'pill' }, h('input', { type: 'radio', name: 'pvp-mode', value: 'flat' }), h('span', {}, 'Try your own figure')));
  const rateOut = h('output', { for: 'pvp-rate' }, '3.0%');
  const rate = h('input', { type: 'range', id: 'pvp-rate', class: 'pvp-range', min: 0, max: 6, step: 0.1, value: 3 });
  const rateField = h('div', { class: 'field', hidden: true }, h('label', { for: 'pvp-rate' }, 'Prices rise by ', rateOut, ' a year'), rate);
  const legend = h('ul', { class: 'legend' },
    h('li', {}, h('span', { class: 'swatch line pay' }), 'Your pay'),
    h('li', {}, h('span', { class: 'swatch line price' }), 'Prices'),
    h('li', {}, h('span', { class: 'swatch ahead' }), 'Months when prices were ahead'));
  const wrap = h('div', { class: 'chart-wrap' });
  const live = h('p', { class: 'visually-hidden', 'aria-live': 'polite' });
  const readout = h('p', { class: 'pvp-readout', 'aria-live': 'polite' });
  const source = h('p', { class: 'note' },
    'Forecasts: Central Bank of Ireland, as reported by RTÉ: 3.4% in 2026, 3.1% in 2027 and 2.0% in 2028. No forecast was reported for 2029, so this assumes 2.0%. Inflation is currently about 4%. Index: 1 July 2026 = 100; each month shows its end-of-month value.');
  const tbody = h('tbody');
  const details = h('details', { class: 'data' }, h('summary', {}, 'Show the numbers as a table'),
    h('div', { class: 'table-scroll' }, h('table', {},
      h('thead', {}, h('tr', {}, h('th', { scope: 'col' }, 'Month'), h('th', { scope: 'col', class: 'r' }, 'Your pay'),
        h('th', { scope: 'col', class: 'r' }, 'Prices'), h('th', { scope: 'col' }, 'Ahead'))),
      tbody)));

  const context = h('p', { class: 'context-line' });
  root.append(h('div', { class: 'plate' },
    context,
    h('fieldset', { class: 'seg' }, h('legend', {}, 'Prices'), pills), rateField,
    readout, legend, wrap, live, source, details));

  const tip = createTooltip(wrap);
  let chart = null;
  let current = null;
  let lastWidth = -1;
  let m = null;

  const showAt = (i) => {
    const p = chart.at(i);
    const pay = m.pay[i].value;
    const price = m.price[i].value;
    const lines = [monthLabel(m.pay[i].month), `Your pay ${one(pay)}`, `Prices ${one(price)}`, price > pay ? 'Prices ahead' : 'Pay ahead'];
    tip.show(lines, p.x, p.y);
    live.textContent = lines.join(', ');
  };

  const draw = (force = false) => {
    const width = Math.round(wrap.clientWidth || 640);
    if (!force && Math.abs(width - lastWidth) < 2) return;
    lastWidth = width;
    const sel = store.get();
    const base = resolvePay(sel, data.SCALES).base;
    m = model(base, steps, inflation, { includeLB: sel.includeLB, flatRate: mode.flat ? mode.rate : null });
    chart = buildChart(m, width);
    for (const node of [...wrap.childNodes]) if (node.nodeName.toLowerCase() === 'svg') node.remove();
    wrap.prepend(chart.svg);
    tip.hide();
    current = null;

    const svg = chart.svg;
    svg.addEventListener('pointermove', (e) => { current = chart.indexAt(e.clientX); showAt(current); });
    svg.addEventListener('pointerleave', () => { chart.hide(); tip.hide(); });
    svg.addEventListener('focus', () => { current = current ?? chart.n - 1; showAt(current); });
    svg.addEventListener('blur', () => { chart.hide(); tip.hide(); });
    svg.addEventListener('keydown', (e) => {
      const moves = { ArrowLeft: -1, ArrowRight: 1, Home: -Infinity, End: Infinity };
      if (!(e.key in moves)) return;
      e.preventDefault();
      current = Math.max(0, Math.min(chart.n - 1, (current ?? chart.n - 1) + moves[e.key]));
      showAt(current);
    });

    context.textContent = figuresFor(sel, data.SCALES);
    readout.textContent = readoutText(m, mode.flat ? mode.rate : null);
    const ahead = new Set(m.ahead);
    tbody.replaceChildren(...m.pay.map((p, i) => h('tr', {},
      h('td', {}, monthLabel(p.month)),
      h('td', { class: 'r' }, one(p.value)),
      h('td', { class: 'r' }, one(m.price[i].value)),
      h('td', {}, ahead.has(p.month) ? 'Prices' : 'Pay'))));
  };

  pills.addEventListener('change', (e) => {
    mode.flat = e.target.value === 'flat';
    rateField.hidden = !mode.flat;
    draw(true);
  });
  rate.addEventListener('input', () => {
    mode.rate = Number(rate.value);
    rateOut.textContent = `${mode.rate.toFixed(1)}%`;
    draw(true);
  });
  store.subscribe(() => draw(true));
  draw(true);
  if (typeof ResizeObserver !== 'undefined') new ResizeObserver(() => draw()).observe(wrap);
}
