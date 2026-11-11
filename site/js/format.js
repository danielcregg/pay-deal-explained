// Formatting for euros, percentages and dates (Irish/UK style).

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const MINUS = '−';

const group = (digits) => digits.replace(/\B(?=(\d{3})+(?!\d))/g, ',');

/** €1,200 (whole euros) or €75.51 with { cents: true }. */
export function eur(n, { cents = false } = {}) {
  const abs = Math.abs(n);
  const body = cents
    ? (() => { const [i, d] = abs.toFixed(2).split('.'); return `${group(i)}.${d}`; })()
    : group(String(Math.round(abs)));
  const isZero = Number(body.replace(/,/g, '')) === 0;
  return `${n < 0 && !isZero ? MINUS : ''}€${body}`;
}

/** +€1,798 or −€250. */
export function signedEur(n, opts) {
  return `${n < 0 ? MINUS : '+'}${eur(Math.abs(n), opts)}`;
}

/** 11.3% (one decimal place by default). */
export function pct(n, dp = 1) {
  const body = Math.abs(n).toFixed(dp);
  return `${n < 0 && Number(body) !== 0 ? MINUS : ''}${body}%`;
}

/** '2029-03-02' → '2 March 2029'; '2026-09' → 'September 2026'; '2024' → '2024'. */
export function longDate(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  if (!m) return String(y);
  if (!d) return `${MONTHS[m - 1]} ${y}`;
  return `${d} ${MONTHS[m - 1]} ${y}`;
}

/** '2026-09' → 'Sep 2026'. */
export function monthLabel(ym) {
  const [y, m] = ym.split('-').map(Number);
  return `${MONTHS[m - 1].slice(0, 3)} ${y}`;
}

/**
 * Round a list of amounts to whole euros so the parts add up to the rounded total
 * (largest remainder first), e.g. four months of €149.82 → 150, 150, 150, 149 = €599.
 */
export function splitRounded(amounts) {
  const target = Math.round(amounts.reduce((a, b) => a + b, 0));
  const out = amounts.map(Math.floor);
  let remaining = target - out.reduce((a, b) => a + b, 0);
  const order = amounts.map((a, i) => [a - Math.floor(a), i]).sort((x, y) => y[0] - x[0] || x[1] - y[1]);
  for (const [, i] of order) {
    if (remaining <= 0) break;
    out[i] += 1;
    remaining -= 1;
  }
  return out;
}

/** The gain as shown on screen: rounded end minus rounded start, so the sum reads correctly. */
export function roundedGain(now, end, { cents = false } = {}) {
  const r = (n) => (cents ? Math.round(n * 100) / 100 : Math.round(n));
  return Math.round((r(end) - r(now)) * 100) / 100;
}

/** [1] → 'step 1'; [1, 3] → 'steps 1 and 3'; [1, 3, 4] → 'steps 1, 3 and 4'. */
export function listSteps(ns) {
  if (!ns.length) return '';
  if (ns.length === 1) return `step ${ns[0]}`;
  return `steps ${ns.slice(0, -1).join(', ')} and ${ns[ns.length - 1]}`;
}
