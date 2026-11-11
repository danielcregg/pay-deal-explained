// The reader's selection (grade, point, contract, switches): parsing, validation,
// resolving it to the full-time salary the deal is applied to, and local storage.

import { SITE } from './data.js';
import { longDate } from './format.js';

export const STORAGE_KEY = 'pde:selection:v1';
export const PAY_MONTHS = ['2027-01', '2027-02', '2027-03'];
export const MIN_SALARY = 10000; // below any full-time yearly salary: catches "58" or "58.5"
export const MAX_SALARY = 500000;
export const MAX_HOURS = 2000;

export const DEFAULT_SELECTION = Object.freeze({
  touched: false,
  sector: 'tu',            // an occupation: one of SCALES.sectors
  contract: 'full',        // 'full' | 'part' | 'hourly'
  gradeId: 'lect',         // a grade id, or 'typed'
  pointIndex: 4,
  typed: null,
  fte: 1,
  alScale: 'al-ne',
  hoursPerYear: 0,
  includeLB: SITE.includeLBDefault,
  includeOwed: SITE.includeOwedDefault, // count the 1% from September 2025 (the sector's `owed` entry)
  payMonth: '2027-01',
  incrementMonth: null,    // 1 to 12: the opening chart then adds a yearly increment in that month (its Advanced panel)
});

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

/** The reader's occupation: its scales' source, caveats and anything particular to it. */
export const sectorOf = (sel, scales) => scales.sectors.find((s) => s.id === sel.sector) ?? scales.sectors[0];

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
    return { base: sel.typed * lift, published: sel.typed, factor: fte, annualFactor: fte, unit: 'year', label: 'Typed salary', isExample };
  }
  const grade = findGrade(scales, sel.gradeId);
  const point = grade.points[sel.pointIndex];
  const label = point.label.startsWith('Point') ? `${grade.name}, point ${sel.pointIndex + 1}` : `${grade.name}, ${midSentence(point.label)}`;
  return { base: point.value * lift, published: point.value, factor: fte, annualFactor: fte, unit: 'year', label, isExample };
}

/** The changes to make when the reader picks another job: its first grade and point, and nothing the job does not have. */
export function sectorPatch(sel, scales, sectorId) {
  const sector = scales.sectors.find((s) => s.id === sectorId);
  return {
    sector: sector.id,
    gradeId: gradesIn(scales, sector.id)[0].id,
    pointIndex: 0,
    contract: sel.contract === 'hourly' && !sector.hourly ? 'full' : sel.contract,
    includeOwed: sector.owed ? sel.includeOwed : false,
  };
}

/** The changes to make when the reader picks another grade: the same point number, where the new scale has one. */
export function gradePatch(sel, scales, gradeId) {
  const grade = findGrade(scales, gradeId);
  return { gradeId: grade.id, pointIndex: Math.min(sel.gradeId === 'typed' ? 0 : sel.pointIndex, grade.points.length - 1) };
}

/**
 * The reader's way up their scale, for the opening chart when it counts increments: the
 * points they can stand on (skipped points and long service increments are left out),
 * where they stand in the month `now`, and the month their increment falls in. Null when
 * no month is chosen or there is no scale to climb (an hourly rate, a typed salary).
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
    now,
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
  return Math.min(...grades.flatMap((g) => g.points.map((p) => p.value)));
}

/** The line each demo shows so readers know whose figures they are looking at. */
export function figuresFor(sel, scales) {
  const pay = resolvePay(sel, scales);
  const owedDef = owedFor(sel, scales);
  const owed = sel.includeOwed && owedDef ? `, with the ${owedDef.pct}% from ${longDate(owedDef.since.slice(0, 7))}` : '';
  if (pay.isExample) return `Example: ${pay.label}${owed}. Pick your own grade and point in section 1.`;
  const part = sel.contract === 'part' ? `, ${Math.round(sel.fte * 1000) / 10}% of full-time` : '';
  return `Showing: ${pay.label}${part}${owed}.`;
}

function isValid(sel, scales) {
  if (!['full', 'part', 'hourly'].includes(sel.contract)) return false;
  const sector = scales.sectors.find((s) => s.id === sel.sector);
  if (!sector || (sel.contract === 'hourly' && !sector.hourly)) return false;
  if (!PAY_MONTHS.includes(sel.payMonth)) return false;
  if (typeof sel.includeLB !== 'boolean' || typeof sel.includeOwed !== 'boolean') return false;
  if (sel.incrementMonth !== null && !(Number.isInteger(sel.incrementMonth) && sel.incrementMonth >= 1 && sel.incrementMonth <= 12)) return false;
  if (!(typeof sel.fte === 'number' && sel.fte >= 0.01 && sel.fte <= 1)) return false;
  if (!['al-ne', 'al-pre'].includes(sel.alScale)) return false;
  if (!(typeof sel.hoursPerYear === 'number' && sel.hoursPerYear >= 0 && sel.hoursPerYear <= MAX_HOURS)) return false;
  if (sel.gradeId === 'typed') return typeof sel.typed === 'number' && sel.typed >= MIN_SALARY && sel.typed <= MAX_SALARY;
  const grade = findGrade(scales, sel.gradeId);
  return Boolean(grade) && grade.sector === sel.sector && Number.isInteger(sel.pointIndex) && sel.pointIndex >= 0 && sel.pointIndex < grade.points.length;
}

/**
 * Rebuild a saved selection, or fall back to the example. Never throws. Only a selection
 * saved after the reader made a choice (`touched: true`, as saveSelection writes it) counts.
 */
export function restoreSelection(raw, scales) {
  if (!raw) return { ...DEFAULT_SELECTION };
  let parsed;
  try { parsed = JSON.parse(raw); } catch { return { ...DEFAULT_SELECTION }; }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return { ...DEFAULT_SELECTION };
  if (parsed.touched !== true) return { ...DEFAULT_SELECTION };
  const sel = Object.fromEntries(Object.keys(DEFAULT_SELECTION).map((k) => [k, k in parsed ? parsed[k] : DEFAULT_SELECTION[k]]));
  return isValid(sel, scales) ? { ...sel, touched: true } : { ...DEFAULT_SELECTION };
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
