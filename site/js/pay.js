// Pure pay maths for the explainer. No data or DOM imports: callers pass the steps in.
//
// A step is { id, date: 'YYYY-MM-DD', pct, min, kind: 'general' | 'lb' }.
// Each step gives `max(salary × pct / 100, min)` on the salary as already raised by
// earlier steps. Local bargaining ('lb') steps count only when includeLB is true;
// otherwise they are reported as a possible step with a `potential` value.

/** Apply steps in order to a full-time annual salary. Steps dated after `upTo` are left out. */
export function applySteps(start, steps, { includeLB = false, upTo } = {}) {
  const rows = [];
  let salary = start;
  steps.forEach((step, i) => {
    if (upTo && step.date > upTo) return;
    const pctRise = (salary * step.pct) / 100;
    if (step.kind === 'lb' && !includeLB) {
      rows.push({ n: i + 1, step, before: salary, rise: 0, after: salary, flat: false, included: false, potential: pctRise });
      return;
    }
    const flat = step.min > pctRise;
    const rise = flat ? step.min : pctRise;
    rows.push({ n: i + 1, step, before: salary, rise, after: salary + rise, flat, included: true, potential: rise });
    salary += rise;
  });
  return rows;
}

export function finalSalary(start, steps, opts) {
  const rows = applySteps(start, steps, opts);
  return rows.length ? rows[rows.length - 1].after : start;
}

export function summarise(start, steps, opts) {
  const rows = applySteps(start, steps, opts);
  const end = rows.length ? rows[rows.length - 1].after : start;
  return {
    start,
    end,
    euro: end - start,
    pct: (end / start - 1) * 100,
    flatSteps: rows.filter((r) => r.flat).map((r) => r.n),
    floorSteps: rows.filter((r) => r.included && r.step.min > 0).map((r) => r.n),
  };
}

const counted = (steps, includeLB) => steps.filter((s) => includeLB || s.kind !== 'lb');

/** Product of (1 + pct/100) over the counted steps, ignoring minimums. */
export function compoundFactor(steps, { includeLB = false } = {}) {
  return counted(steps, includeLB).reduce((f, s) => f * (1 + s.pct / 100), 1);
}

/** Simple sum of the counted percentages: the "headline" figure. */
export function headlinePct(steps, { includeLB = false } = {}) {
  return counted(steps, includeLB).reduce((sum, s) => sum + s.pct, 0);
}

/** Salary at which the minimum and the percentage give the same rise. */
export function thresholdOf(step) {
  return step.min ? (step.min * 100) / step.pct : null;
}

// ---- months ----

const toIndex = (ym) => {
  const [y, m] = ym.split('-').map(Number);
  return y * 12 + (m - 1);
};
const fromIndex = (t) => `${Math.floor(t / 12)}-${String((t % 12) + 1).padStart(2, '0')}`;

/** Every 'YYYY-MM' from `from` to `to`, inclusive. */
export function monthsBetween(from, to) {
  const out = [];
  for (let t = toIndex(from); t <= toIndex(to); t++) out.push(fromIndex(t));
  return out;
}

// ---- increments ----
// Only the opening chart counts these, and only when the reader asks. Everywhere else
// the site shows what the deal adds to one scale point.

/** How many of the months after `a`, up to and including `b`, are calendar month `month` (1 to 12). */
const incrementsIn = (a, b, month) => monthsBetween(a, b).slice(1).filter((ym) => Number(ym.slice(5)) === month).length;

/**
 * The position on a scale (0 is the first of `count`) held in `month`, by someone who
 * holds `pos` in the month `now` and moves up one position on the 1st of calendar month
 * `incrementMonth` each year until they reach the top. Months are 'YYYY-MM'. Someone at
 * the top now is taken to have been there already: there is no telling when they arrived.
 */
export function positionIn(month, { pos, count, incrementMonth, now }) {
  const top = count - 1;
  const moved = month >= now
    ? incrementsIn(now, month, incrementMonth)
    : pos >= top ? 0 : -incrementsIn(month, now, incrementMonth);
  return Math.max(0, Math.min(top, pos + moved));
}

/**
 * Pay through an agreement for someone who also moves up their scale each year.
 * `values` are the scale's figures when the agreement starts, one for each position.
 * Each position's figure is revised by every rise so far, so an increment lands on the
 * new position's figure as it then stands. Returns the pay in the month `from` and every
 * change after it, in date order; an increment on the same date as a rise comes first.
 */
export function careerEvents(values, steps, { pos, incrementMonth, now, from, to, includeLB = false }) {
  const where = (month) => positionIn(month, { pos, count: values.length, incrementMonth, now });
  const rises = counted(steps, includeLB);
  // ladder[position][n]: that position's figure after the first n counted rises
  const ladder = values.map((v) => [v, ...applySteps(v, rises, { includeLB: true }).map((r) => r.after)]);
  const dates = [
    ...rises.map((s, i) => ({ date: s.date, kind: s.kind, done: i + 1 })),
    ...monthsBetween(from, to).slice(1).filter((ym) => Number(ym.slice(5)) === incrementMonth).map((ym) => ({ date: `${ym}-01`, kind: 'increment' })),
  ].sort((a, b) => (a.date === b.date ? (a.kind === 'increment' ? -1 : 1) : a.date < b.date ? -1 : 1));
  let at = where(from);
  let done = 0;
  let salary = ladder[at][0];
  const start = { pos: at, salary };
  const events = [];
  for (const d of dates) {
    if (d.kind === 'increment') {
      const next = where(d.date.slice(0, 7));
      if (next === at) continue; // already at the top
      at = next;
    } else done = d.done;
    const before = salary;
    salary = ladder[at][done];
    events.push({ date: d.date, kind: d.kind, pos: at, before, after: salary });
  }
  return { start, events };
}

/** 'YYYY-MM' → the last day of that month as 'YYYY-MM-DD'. */
export function lastDayOf(ym) {
  const [y, m] = ym.split('-').map(Number);
  return `${ym}-${String(new Date(Date.UTC(y, m, 0)).getUTCDate()).padStart(2, '0')}`;
}

/**
 * Arrears owed when rises are first paid in `payMonth`: each counted step dated before
 * that month accrues rise ÷ 12 for every month from its own month up to `payMonth`.
 */
export function backPay(start, steps, { payMonth = '2027-01', includeLB = false } = {}) {
  const payFirst = `${payMonth}-01`;
  const byMonth = new Map();
  for (const r of applySteps(start, steps, { includeLB })) {
    if (!r.included || r.step.date >= payFirst) continue;
    for (const month of monthsBetween(r.step.date.slice(0, 7), fromIndex(toIndex(payMonth) - 1))) {
      byMonth.set(month, (byMonth.get(month) ?? 0) + r.rise / 12);
    }
  }
  const items = [...byMonth.keys()].sort().map((month) => ({ month, amount: byMonth.get(month) }));
  return { items, total: items.reduce((sum, i) => sum + i.amount, 0) };
}

/** The pay before a rise, given the pay after it: undoes the minimum where it applied. */
function before(after, step) {
  if (step.min && after - step.min < thresholdOf(step)) return after - step.min;
  return after / (1 + step.pct / 100);
}

/**
 * Back pay for a rise that was due earlier and is not in the scales yet (the 1% owed
 * since 1 September 2025): `owed.pct` of the pay in force in each month from
 * `owed.since` up to the month before `payMonth`. The pay in force is found by undoing,
 * from today's figure, the general rises in `pastSteps` dated after `owed.since`.
 */
export function owedBackPay(today, owed, pastSteps, { payMonth = '2027-01' } = {}) {
  const levels = []; // { from: 'YYYY-MM', salary }, oldest first
  let salary = today;
  const since = pastSteps.filter((s) => s.kind !== 'lb' && s.date > owed.since).sort((a, b) => (a.date < b.date ? 1 : -1));
  for (const step of since) {
    levels.unshift({ from: step.date.slice(0, 7), salary });
    salary = before(salary, step);
  }
  levels.unshift({ from: owed.since.slice(0, 7), salary });
  const items = monthsBetween(owed.since.slice(0, 7), fromIndex(toIndex(payMonth) - 1)).map((month) => {
    const level = levels.filter((l) => l.from <= month).pop();
    return { month, amount: (level.salary * owed.pct) / 100 / 12 };
  });
  return { items, total: items.reduce((sum, i) => sum + i.amount, 0) };
}

/** Pay index (start = 100) using the salary in effect on the last day of each month. */
export function payIndexSeries(start, steps, { from, to, includeLB = false }) {
  return monthsBetween(from, to).map((month) => ({
    month,
    value: (finalSalary(start, steps, { includeLB, upTo: lastDayOf(month) }) * 100) / start,
  }));
}

/** Price index (100 before `from`), compounding each month at the year's rate, or at `flatRate`. */
export function priceIndexSeries({ from, to, rates = {}, flatRate = null }) {
  let value = 100;
  return monthsBetween(from, to).map((month) => {
    const year = Number(month.slice(0, 4));
    const rate = typeof flatRate === 'number' ? flatRate : rates[year];
    if (typeof rate !== 'number') throw new Error(`No inflation rate for ${year}`);
    value *= Math.pow(1 + rate / 100, 1 / 12);
    return { month, value };
  });
}

/** Months in which the price index is above the pay index. Series must be aligned by month. */
export function monthsPricesAhead(pay, price) {
  return pay.filter((p, i) => price[i].value > p.value).map((p) => p.month);
}
