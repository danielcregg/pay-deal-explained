// The reader's selection (grade, point, contract, switches): parsing, validation,
// resolving it to the full-time salary the deal is applied to, and local storage.

import { SITE, INFLATION, DEAL } from './data.js';
import { longDate, eur } from './format.js';

export const STORAGE_KEY = 'pde:selection:v1';
export const PAY_MONTHS = ['2027-01', '2027-02', '2027-03'];
export const MIN_SALARY = 10000; // below any full-time yearly salary: catches "58" or "58.5"
export const MAX_SALARY = 500000;
export const MAX_HOURS = 2000;

/**
 * No job chosen: a salary on its own. The page opens this way, so that nothing on it
 * points at any one job, grade or point until the reader picks their own.
 */
export const ANY_JOB = Object.freeze({ id: 'any', name: 'Choose your job', short: 'public servant', low: null, hourly: false, caveat: null, lastDealLB: false, lastDealNote: null });

/** How the page opens: no job, and an example salary at the deal's threshold. */
export const DEFAULT_SELECTION = Object.freeze({
  touched: false,
  sector: ANY_JOB.id,      // an occupation: one of SCALES.sectors, or 'any' for none
  contract: 'full',        // 'full' | 'part' | 'hourly'
  gradeId: 'typed',        // a grade id, or 'typed' for a salary on its own
  pointIndex: 0,
  typed: DEAL.threshold,   // the example salary, until the reader chooses
  fte: 1,
  alScale: 'al-ne',
  hoursPerYear: 0,
  includeLB: SITE.includeLBDefault,
  includeOwed: SITE.includeOwedDefault, // count the 1% from September 2025 (the sector's `owed` entry)
  payMonth: '2027-01',
  incrementMonth: null,    // 1 to 12: the opening chart then adds a yearly increment in that month
  scenario: INFLATION.defaultScenario, // which inflation path the chart uses: one of INFLATION.scenarios, or 'own'
  pointMonth: null,        // 'YYYY-MM': the month in which the point above was chosen, so a later visit reads "the point you are on now" the same way
  remember: false,         // keep these choices on this device for the next visit: only if the reader asks
  ownRate: 3,              // % a year: the reader's own inflation figure, used when `scenario` is 'own'
});

/** Besides the published paths in INFLATION.scenarios, the reader can set one rate of their own for every year. */
export const OWN_PATH = 'own';
export const OWN_RATE = Object.freeze({ min: 0, max: 6, step: 0.1, start: 3 });

/**
 * The inflation path the reader has chosen for the charts (the Central Bank's forecast unless
 * they switch). Their own figure comes back in the same shape as a published path, worded as theirs.
 */
export function scenarioOf(sel, inflation) {
  if (sel.scenario === OWN_PATH) {
    const said = `${sel.ownRate.toFixed(1)}%`;
    return {
      id: OWN_PATH, kind: 'your own figure', label: 'Your own figure',
      rates: Object.fromEntries(Object.keys(inflation.rates).map((year) => [year, sel.ownRate])),
      phrase: `at your own figure (${said} a year)`,
      note: `Inflation here is ${said} a year, a figure of your own.`,
      sourceIds: [],
    };
  }
  return inflation.scenarios.find((s) => s.id === sel.scenario) ?? inflation.scenarios.find((s) => s.id === inflation.defaultScenario);
}

/** The month we are in, as 'YYYY-MM'. */
export function thisMonth(today = new Date()) {
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
}

/**
 * Lenient parsing of a typed salary. Strips € and spaces, and reads both ways of writing
 * numbers: 58,000.50 and 58.000,50. A separator still being typed at the end is ignored.
 * Errors carry a `code`: 'format', 'low' or 'high'.
 */
export function parseSalary(input) {
  let cleaned = String(input ?? '').replace(/[€\s]/g, '').replace(/[.,]$/, '');
  const lastDot = cleaned.lastIndexOf('.');
  const lastComma = cleaned.lastIndexOf(',');
  if (lastDot >= 0 && lastComma >= 0) {
    // Both are used: the later one is the decimal mark and the other groups thousands.
    const [group, decimal] = lastComma > lastDot ? ['.', ','] : [',', '.'];
    cleaned = cleaned.split(group).join('').replace(decimal, '.');
  } else if (lastComma >= 0) {
    if (/^\d{1,3}(,\d{3})+$/.test(cleaned)) cleaned = cleaned.replace(/,/g, ''); // 58,000
    else if (/^\d+,\d{1,2}$/.test(cleaned)) cleaned = cleaned.replace(',', '.'); // 58000,50
  } else if (/^\d{1,3}(\.\d{3})+$/.test(cleaned)) {
    cleaned = cleaned.replace(/\./g, ''); // 58.000
  }
  if (!/^\d+(\.\d+)?$/.test(cleaned)) {
    return { ok: false, code: 'format', error: 'Enter your full-time salary in euro, for example 58000.' };
  }
  const value = Number(cleaned);
  if (value < MIN_SALARY) return { ok: false, code: 'low', error: 'Enter a full-time yearly salary of at least €10,000, for example 58000.' };
  if (value > MAX_SALARY) return { ok: false, code: 'high', error: 'Enter a salary of €500,000 or less.' };
  return { ok: true, value };
}

/** Hours taught in a year → a whole number from 0 to 2,000. Invalid input means none. */
export function clampHours(input) {
  const n = Number(String(input ?? '').trim());
  if (!Number.isFinite(n) || n <= 0) return 0;
  return Math.min(MAX_HOURS, Math.round(n));
}

/**
 * A share of full-time → a fraction from 0.01 to 1. Accepts a percentage (50) or an
 * FTE fraction (0.5); anything up to 1 is read as a fraction. Invalid input means full-time.
 */
export function clampFte(input) {
  const text = String(input ?? '').replace('%', '').trim();
  const n = Number(text);
  if (text === '' || !Number.isFinite(n)) return 1;
  if (n > 0 && n <= 1) return Math.max(0.01, n);
  return Math.min(100, Math.max(1, n)) / 100;
}

const findGrade = (scales, id) => scales.grades.find((g) => g.id === id);
/** 'Single rate' → 'single rate' for use inside a sentence; 'LSI 1' is left alone. */
const midSentence = (label) => (/^[A-Z][a-z]/.test(label) ? label[0].toLowerCase() + label.slice(1) : label);

/** The grade the reader chose, or null for a typed salary or an hourly rate. */
export function gradeOf(sel, scales) {
  if (sel.contract === 'hourly' || sel.gradeId === 'typed') return null;
  return findGrade(scales, sel.gradeId) ?? null;
}

/** The reader's occupation: its scales' source, caveats and anything particular to it. With none chosen, a neutral stand-in. */
export const sectorOf = (sel, scales) => scales.sectors.find((s) => s.id === sel.sector) ?? ANY_JOB;

/** The grades of one occupation. */
export const gradesIn = (scales, sectorId) => scales.grades.filter((g) => g.sector === sectorId);

/** A rise due to the reader's occupation but not in its pay figures (the 1% of September 2025, for lecturers and gardaí), or null. */
export const owedFor = (sel, scales) => sectorOf(sel, scales).owed ?? null;

/**
 * The full-time annual salary the deal is applied to (`base`), and how to turn engine
 * euros into what the reader sees (`factor`) and into their actual annual pay (`annualFactor`).
 */
export function resolvePay(sel, scales) {
  const isExample = !sel.touched;
  // When the reader counts the 1% owed from the last agreement, it lifts the starting point.
  // `published` is always the figure in today's scale.
  const owed = owedFor(sel, scales);
  const lift = sel.includeOwed && owed ? 1 + owed.pct / 100 : 1;
  if (sel.contract === 'hourly') {
    const grade = findGrade(scales, sel.alScale) ?? findGrade(scales, 'al-ne');
    const hours = Math.max(0, Number(sel.hoursPerYear) || 0);
    return {
      base: grade.points[0].value * lift,
      published: grade.points[0].value,
      factor: 1 / scales.hourlyDivisor,
      annualFactor: hours / scales.hourlyDivisor,
      unit: 'hour',
      label: `Hourly-paid ${grade.name}`,
      isExample,
    };
  }
  const fte = sel.contract === 'part' ? sel.fte : 1;
  if (sel.gradeId === 'typed') {
    // Untouched, a typed salary is the page's own example; once the reader types one, it is theirs.
    const label = isExample ? `a salary of ${eur(sel.typed)}` : 'Typed salary';
    return { base: sel.typed * lift, published: sel.typed, factor: fte, annualFactor: fte, unit: 'year', label, isExample };
  }
  const grade = findGrade(scales, sel.gradeId);
  const point = grade.points[sel.pointIndex];
  const label = point.label.startsWith('Point') ? `${grade.name}, point ${sel.pointIndex + 1}` : `${grade.name}, ${midSentence(point.label)}`;
  return { base: point.value * lift, published: point.value, factor: fte, annualFactor: fte, unit: 'year', label, isExample };
}

/**
 * The changes to make when the reader picks another job: its first grade and point, and
 * nothing that belonged to the old job (its increment month, its 1% from 2025). A salary the reader typed is theirs, so it stays; the
 * page's own example salary does not. Picking "no job" keeps the salary on its own.
 */
export function sectorPatch(sel, scales, sectorId) {
  if (sectorId === ANY_JOB.id) {
    return {
      sector: ANY_JOB.id,
      gradeId: 'typed',
      typed: resolvePay({ ...sel, includeOwed: false }, scales).published,
      pointIndex: 0,
      contract: sel.contract === 'hourly' ? 'full' : sel.contract,
      includeOwed: false,
      incrementMonth: null,
    };
  }
  const sector = scales.sectors.find((s) => s.id === sectorId);
  return {
    sector: sector.id,
    gradeId: sel.gradeId === 'typed' && sel.touched ? 'typed' : gradesIn(scales, sector.id)[0].id,
    pointIndex: 0,
    contract: sel.contract === 'hourly' && !sector.hourly ? 'full' : sel.contract,
    includeOwed: false, // counting the 1% from 2025 in one job says nothing about another
    incrementMonth: null, // nor does the month of its increment
  };
}

/** The changes to make when the reader picks another grade: the same point number, where the new scale has one. */
export function gradePatch(sel, scales, gradeId) {
  const grade = findGrade(scales, gradeId);
  // A typed salary or an hourly rate has no point of its own to carry over.
  const fresh = sel.gradeId === 'typed' || sel.contract === 'hourly';
  return { gradeId: grade.id, pointIndex: fresh ? 0 : Math.min(sel.pointIndex, grade.points.length - 1) };
}

/**
 * The reader's way up their scale, for the opening chart when it counts increments: the
 * points they can stand on (skipped points and long service increments are left out),
 * where they stood in the month the point was chosen (or `now`, for a choice saved without
 * one), and the month their increment falls in. Null when no month is chosen or there is
 * no scale to climb (an hourly rate, a typed salary).
 */
export function careerOf(sel, scales, now) {
  if (!sel.incrementMonth) return null;
  const grade = gradeOf(sel, scales);
  if (!grade) return null;
  const pay = resolvePay(sel, scales);
  const lift = pay.base / pay.published; // the 1% from September 2025, when counted, lifts every point
  const own = grade.points[sel.pointIndex];
  // A long service increment needs years at the top, so it is neither climbed to nor climbed from.
  const steps = own.lsi ? [own] : grade.points.filter((p) => p === own || (!p.skipped && !p.lsi));
  return {
    values: steps.map((p) => p.value * lift),
    labels: steps.map((p) => p.label),
    pos: steps.indexOf(own),
    incrementMonth: sel.incrementMonth,
    now: sel.pointMonth ?? now,
    skips: grade.points.some((p) => p.skipped), // points on this scale that are passed over
    lsiAbove: !own.lsi && grade.points.some((p) => p.lsi), // a long service increment beyond the top, which is not climbed to
  };
}

/**
 * The low point of a job's scales, where the flat minimums count most: the lowest point of
 * all, or of the grade the job names (`lowGrade`) where older scales start below the point
 * new staff start on.
 */
export function lowestScalePoint(scales, sectorId = scales.sectors[0].id) {
  const sector = scales.sectors.find((s) => s.id === sectorId);
  const grades = gradesIn(scales, sectorId).filter((g) => !sector?.lowGrade || g.id === sector.lowGrade);
  if (grades.length === 0) return null; // no job chosen: no scale to take a low point from
  return Math.min(...grades.flatMap((g) => g.points.map((p) => p.value)));
}

/** The line each demo shows so readers know whose figures they are looking at. */
export function figuresFor(sel, scales) {
  const pay = resolvePay(sel, scales);
  const owedDef = owedFor(sel, scales);
  const owed = sel.includeOwed && owedDef ? `, with the ${owedDef.pct}% from ${longDate(owedDef.since.slice(0, 7))}` : '';
  if (pay.isExample) return `Example: ${pay.label}${owed}. Pick your own job, grade and point at the top of the page.`;
  const part = sel.contract === 'part' ? `, ${Math.round(sel.fte * 1000) / 10}% of full-time` : '';
  return `Showing: ${pay.label}${part}${owed}.`;
}

/**
 * The settings around the pay itself. A remembered one that no longer makes sense (a path
 * that was renamed, a pay month that has passed) goes back to its default without costing
 * the reader their job, grade and point.
 */
const SETTINGS = {
  payMonth: (v) => PAY_MONTHS.includes(v),
  includeLB: (v) => typeof v === 'boolean',
  includeOwed: (v) => typeof v === 'boolean',
  incrementMonth: (v) => v === null || (Number.isInteger(v) && v >= 1 && v <= 12),
  scenario: (v) => v === OWN_PATH || INFLATION.scenarios.some((s) => s.id === v),
  ownRate: (v) => typeof v === 'number' && v >= OWN_RATE.min && v <= OWN_RATE.max,
  pointMonth: (v) => v === null || (typeof v === 'string' && /^\d{4}-(0[1-9]|1[0-2])$/.test(v)),
  fte: (v) => typeof v === 'number' && v >= 0.01 && v <= 1,
  alScale: (v) => ['al-ne', 'al-pre'].includes(v),
  hoursPerYear: (v) => typeof v === 'number' && v >= 0 && v <= MAX_HOURS,
};

function isValid(sel, scales) {
  if (typeof sel.touched !== 'boolean' || typeof sel.remember !== 'boolean') return false;
  if (!Object.entries(SETTINGS).every(([key, ok]) => ok(sel[key]))) return false;
  if (!['full', 'part', 'hourly'].includes(sel.contract)) return false;
  const sector = scales.sectors.find((s) => s.id === sel.sector);
  const noJob = sel.sector === ANY_JOB.id; // valid only with a salary on its own
  if (!sector && !noJob) return false;
  if (sel.contract === 'hourly' && !sector?.hourly) return false;
  if (sel.gradeId === 'typed') return typeof sel.typed === 'number' && sel.typed >= MIN_SALARY && sel.typed <= MAX_SALARY;
  if (noJob) return false;
  const grade = findGrade(scales, sel.gradeId);
  return Boolean(grade) && grade.sector === sel.sector && Number.isInteger(sel.pointIndex) && sel.pointIndex >= 0 && sel.pointIndex < grade.points.length;
}

/**
 * Rebuild a saved selection, or fall back to the example. Never throws. Only a selection
 * the reader asked to keep (`remember: true`) counts: anything else, including what earlier
 * versions of the page saved without asking, opens the page as it opens for everyone.
 */
export function restoreSelection(raw, scales) {
  if (!raw) return { ...DEFAULT_SELECTION };
  let parsed;
  try { parsed = JSON.parse(raw); } catch { return { ...DEFAULT_SELECTION }; }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return { ...DEFAULT_SELECTION };
  if (parsed.remember !== true) return { ...DEFAULT_SELECTION };
  const sel = Object.fromEntries(Object.keys(DEFAULT_SELECTION).map((k) => [k, k in parsed ? parsed[k] : DEFAULT_SELECTION[k]]));
  for (const [key, ok] of Object.entries(SETTINGS)) if (!ok(sel[key])) sel[key] = DEFAULT_SELECTION[key];
  return isValid(sel, scales) ? sel : { ...DEFAULT_SELECTION };
}

export function loadSaved() {
  try { return localStorage.getItem(STORAGE_KEY); } catch { return null; }
}

export function saveSelection(sel) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(sel)); } catch { /* storage unavailable: nothing to do */ }
}

export function forgetSelection() {
  try { localStorage.removeItem(STORAGE_KEY); } catch { /* storage unavailable: nothing to do */ }
}

/**
 * Keep the reader's choices for their next visit if they asked for that, and otherwise make
 * sure nothing is kept. The page calls this when it opens and after every change, so
 * unticking the box removes what was saved at once.
 */
export function persistSelection(sel) {
  if (sel.remember) saveSelection(sel);
  else forgetSelection();
}

/**
 * Keep a store's choices in step with this device's storage, for a reader who asked for that.
 * When the page opens, anything saved without being asked for is removed. After that a tab
 * that is not remembering leaves storage alone, so it cannot wipe what another tab keeps;
 * and when another tab unticks the box or clears its choices, this one stops remembering
 * too, or its next change would save them again.
 */
export function rememberChoices(store, target = globalThis.window) {
  let remembering = store.get().remember;
  persistSelection(store.get());
  store.subscribe((sel) => {
    if (sel.remember) saveSelection(sel);
    else if (remembering) forgetSelection();
    remembering = sel.remember;
  });
  target?.addEventListener?.('storage', (e) => {
    const ours = e.key === STORAGE_KEY || e.key === null; // null: the other tab cleared everything
    if (ours && e.newValue == null && store.get().remember) store.set({ remember: false });
  });
}
