// The opening: "Your pay against prices, month by month". Pay rises in steps, prices
// creep up every month, and a play head sweeps across the deal's 33 months. Press play,
// drag along the chart or use the slider. The four key figures above it count up once.
//
// The chart is drawn complete, so it never depends on the animation having run
// (print, background tabs, reduced motion). The first time it is seen, it replays from
// the start.

import { applySteps, priceIndexSeries } from '../pay.js';
import { resolvePay, figuresFor, lowestScalePoint, sectorOf } from '../selection.js';
import { eur, pct } from '../format.js';
import { svgEl, scaleLinear } from '../svg.js';
import { h } from '../dom.js';
import { niceRange, labelSize } from '../chart.js';
import { prefersReducedMotion, onFirstView } from '../motion.js';
import { extrasSwitches } from '../switches.js';

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
 */
export function model(base, data, { includeLB }) {
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
  const price = [100, ...priceIndexSeries({ from: INFLATION.from, to: INFLATION.to, rates: INFLATION.rates }).map((p) => p.value)];
  return { months: DEAL.months, start, steps, price, base };
}

/**
 * Pay and price indices `t` months in, and what pay then buys compared with the start (%).
 * A whole number of months is the end of a month, so a rise dated the 1st of the next
 * month is not in it yet (the same convention as chapter 2).
 */
export function stateAt(m, t) {
  let pay = 100;
  for (const s of m.steps) if (s.at < t) pay = s.after;
  const i = Math.min(m.months - 1, Math.floor(t));
  const price = m.price[i] + (m.price[i + 1] - m.price[i]) * Math.min(1, t - i);
  return { pay, price, real: (pay / price - 1) * 100 };
}

/** Where the play head is, in words. */
export function whenText(t, startYm, months) {
  const [y, m] = startYm.split('-').map(Number);
  if (t <= 0) return `Starting line: 1 ${MONTHS[m - 1]} ${y}`;
  const index = (m - 1) + Math.min(months, Math.ceil(t)) - 1; // the month `t` falls in, or has just completed
  const name = `${MONTHS[index % 12]} ${y + Math.floor(index / 12)}`;
  return t >= months ? `By the end of ${name}` : `In ${name}`;
}

/** The yearly salary in force `t` months in, in euro. */
export function payThen(m, t) {
  return (stateAt(m, t).pay / 100) * m.base;
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
  const H = compact ? 196 : narrow ? 250 : 310;
  const k = text / 12;
  const margin = { top: 16, right: Math.round(58 * k), bottom: Math.round(30 * k), left: Math.round(38 * k) };
  const N = m.months;
  const top = Math.max(m.steps.length ? m.steps[m.steps.length - 1].after : 100, m.price[N]);
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
  ]));
  const head = svgEl('line', { class: 'race-head', y1: margin.top, y2: H - margin.bottom });
  const dotPrice = svgEl('circle', { class: 'dot-price', r: 5.5 });
  const dotPay = svgEl('circle', { class: 'dot-pay', r: 5.5 });
  const labelPay = svgEl('text', { class: 'end-label race-label-pay' }, 'Pay');
  const labelPrice = svgEl('text', { class: 'end-label race-label-price' }, 'Prices');
  svg.append(head, dotPrice, dotPay, labelPay, labelPrice);

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
  };
  const timeAt = (clientX) => {
    const box = svg.getBoundingClientRect();
    const px = ((clientX - box.left) / box.width) * W;
    return Math.max(0, Math.min(N, Math.round(((px - margin.left) / (W - margin.left - margin.right)) * N)));
  };
  return { svg, place, timeAt };
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

export function render(root, { store, data }) {
  const N = data.DEAL.months;
  const motion = !prefersReducedMotion();
  const band = typeof root.closest === 'function' ? root.closest('.hero')?.querySelector('.hero-band') : null;
  if (band) band.prepend(weave());

  const context = h('p', { class: 'context-line' });
  const mine = h('button', { type: 'button', 'aria-pressed': 'true' });
  const lowest = h('button', { type: 'button', 'aria-pressed': 'false' });
  const picks = h('div', { class: 'race-picks', role: 'group', 'aria-label': 'Whose pay' }, mine, lowest);
  const when = h('p', { class: 'race-when' });
  const euroLabel = h('small');
  const euroOut = h('b');
  const monthly = h('span', { class: 'race-monthly' });
  const payOut = h('b');
  const priceOut = h('b');
  const realOut = h('b');
  const tiles = h('div', { class: 'race-tiles' },
    h('div', { class: 'race-tile euro' }, euroLabel, euroOut, monthly),
    h('div', { class: 'race-tile pay' }, h('small', {}, 'Pay is up'), payOut),
    h('div', { class: 'race-tile price' }, h('small', {}, 'Prices are up'), priceOut),
    h('div', { class: 'race-tile real' }, h('small', {}, 'So pay buys'), realOut));
  const wrap = h('div', { class: 'chart-wrap' });
  const playBtn = h('button', { type: 'button', class: 'race-play', 'aria-label': 'Play' }, '▶');
  const scrub = h('input', { type: 'range', class: 'race-scrub', min: 0, max: N, step: 1, value: N, 'aria-label': 'Month, from July 2026 to March 2029' });
  const source = h('p', { class: 'note race-source' });

  root.append(
    h('h2', { id: 'race-h' }, 'Your pay against prices, month by month'),
    h('p', { class: 'race-sub' }, 'Press play, or slide to any month to see your pay then. Pay rises in steps; prices creep up every month.'),
    context, picks, extrasSwitches(store, data, 'race'), when, tiles,
    h('div', { class: 'race-controls' }, playBtn, scrub), // beside the figures it changes
    wrap,
    source);

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
    const euro = (s.pay / 100) * m.base * money.factor;
    const hourly = money.unit === 'hour';
    euroLabel.textContent = hourly ? 'Hourly rate then' : 'Yearly pay then';
    euroOut.textContent = eur(euro, { cents: hourly });
    monthly.textContent = hourly ? 'before tax' : `about ${eur(euro / 12)} a month before tax`;
    payOut.textContent = signed(s.pay - 100);
    priceOut.textContent = signed(s.price - 100);
    realOut.textContent = `${pct(Math.abs(s.real))} ${s.real >= 0 ? 'more' : 'less'}`;
    scrub.value = String(t);
    scrub.setAttribute('aria-valuetext', `${label}: ${euroOut.textContent} ${hourly ? 'an hour' : 'a year'}, pay ${signed(s.pay - 100)}, prices ${signed(s.price - 100)}`);
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
    lowest.textContent = `The ${sector.low} (${eur(low)})`;
    const sameAsLowest = pay.published === low;
    if (sameAsLowest) who = 'mine';
    // The lowest point gets the same treatment as the reader's own: lifted if they count the 1% from 2025.
    const base = who === 'low' ? low * (pay.base / pay.published) : pay.base;
    money = who === 'low' ? { factor: 1, unit: 'year' } : { factor: pay.factor, unit: pay.unit };
    m = model(base, data, { includeLB: sel.includeLB });
    // On a projector screen the whole opening has to fit: a shorter chart in Present mode.
    const compact = document.body.classList.contains('present') && window.innerHeight < 900;
    chart = buildChart(m, width, labelSize(wrap), compact);

    context.textContent = figuresFor(sel, data.SCALES);
    mine.textContent = pay.isExample ? `Example: ${pay.label}` : pay.label;
    mine.setAttribute('aria-pressed', String(who === 'mine'));
    lowest.setAttribute('aria-pressed', String(who === 'low'));
    picks.hidden = sameAsLowest;
    context.hidden = who === 'low';
    const end = stateAt(m, N);
    chart.svg.setAttribute('aria-label', `Pay and prices from July 2026 to March 2029. By the end, pay is up ${pct(end.pay - 100)} and prices are up ${pct(end.price - 100)}.`);
    source.replaceChildren(
      `Prices follow the Central Bank’s forecasts as reported by RTÉ: ${forecastText(data.INFLATION)}. `
      + `Gross pay; local bargaining is ${sel.includeLB ? 'counted' : 'not counted'}. A projection, not a promise. `,
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
  store.subscribe(() => draw(true));
  document.addEventListener('presentchange', () => draw(true));
  if (typeof ResizeObserver !== 'undefined') new ResizeObserver(() => draw()).observe(wrap);
  if (motion) {
    document.querySelectorAll('.hero-facts [data-count]').forEach(countUp);
    onFirstView(wrap, () => { t = 0; play(); });
  }
}
