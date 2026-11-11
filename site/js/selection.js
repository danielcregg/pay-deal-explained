// The reader's selection (grade, point, contract, switches): parsing, validation,
// resolving it to the full-time salary the deal is applied to, and local storage.

import { SITE } from './data.js';

export const STORAGE_KEY = 'pde:selection:v1';
export const PAY_MONTHS = ['2027-01', '2027-02', '2027-03'];
export const MAX_SALARY = 500000;

export const DEFAULT_SELECTION = Object.freeze({
  touched: false,
  contract: 'full',        // 'full' | 'part' | 'hourly'
  gradeId: 'lect',         // a grade id, or 'typed'
  pointIndex: 4,
  typed: null,
  fte: 1,
  alScale: 'al-ne',
  hoursPerYear: 0,
  includeLB: SITE.includeLBDefault,
  payMonth: '2027-01',
});

/** Lenient parsing of a typed salary: strips €, commas and spaces. */
export function parseSalary(input) {
  const cleaned = String(input ?? '').replace(/[€,\s ]/g, '');
  if (!/^\d+(\.\d+)?$/.test(cleaned)) {
    return { ok: false, error: 'Enter your full-time salary in euro, for example 58000.' };
  }
  const value = Number(cleaned);
  if (value <= 0) return { ok: false, error: 'Enter a salary above €0.' };
  if (value > MAX_SALARY) return { ok: false, error: 'Enter a salary of €500,000 or less.' };
  return { ok: true, value };
}

/** A percentage of full-time (1–100) → a fraction from 0.01 to 1. Invalid input means full-time. */
export function clampFte(input) {
  const text = String(input ?? '').replace('%', '').trim();
  const n = Number(text);
  if (text === '' || !Number.isFinite(n)) return 1;
  return Math.min(100, Math.max(1, n)) / 100;
}

const findGrade = (scales, id) => scales.grades.find((g) => g.id === id);

/**
 * The full-time annual salary the deal is applied to (`base`), and how to turn engine
 * euros into what the reader sees (`factor`) and into their actual annual pay (`annualFactor`).
 */
export function resolvePay(sel, scales) {
  const isExample = !sel.touched;
  if (sel.contract === 'hourly') {
    const grade = findGrade(scales, sel.alScale) ?? findGrade(scales, 'al-ne');
    const hours = Math.max(0, Number(sel.hoursPerYear) || 0);
    return {
      base: grade.points[0].value,
      factor: 1 / scales.hourlyDivisor,
      annualFactor: hours / scales.hourlyDivisor,
      unit: 'hour',
      label: `Hourly-paid ${grade.name}`,
      isExample,
    };
  }
  const fte = sel.contract === 'part' ? sel.fte : 1;
  if (sel.gradeId === 'typed') {
    return { base: sel.typed, factor: fte, annualFactor: fte, unit: 'year', label: 'Typed salary', isExample };
  }
  const grade = findGrade(scales, sel.gradeId);
  const point = grade.points[sel.pointIndex];
  const label = point.label.startsWith('Point') ? `${grade.name}, point ${sel.pointIndex + 1}` : `${grade.name}, ${point.label}`;
  return { base: point.value, factor: fte, annualFactor: fte, unit: 'year', label, isExample };
}

function isValid(sel, scales) {
  if (!['full', 'part', 'hourly'].includes(sel.contract)) return false;
  if (!PAY_MONTHS.includes(sel.payMonth)) return false;
  if (typeof sel.includeLB !== 'boolean') return false;
  if (!(typeof sel.fte === 'number' && sel.fte >= 0.01 && sel.fte <= 1)) return false;
  if (!['al-ne', 'al-pre'].includes(sel.alScale)) return false;
  if (!(typeof sel.hoursPerYear === 'number' && sel.hoursPerYear >= 0 && sel.hoursPerYear <= 2000)) return false;
  if (sel.gradeId === 'typed') return typeof sel.typed === 'number' && sel.typed > 0 && sel.typed <= MAX_SALARY;
  const grade = findGrade(scales, sel.gradeId);
  return Boolean(grade) && Number.isInteger(sel.pointIndex) && sel.pointIndex >= 0 && sel.pointIndex < grade.points.length;
}

/** Rebuild a saved selection, or fall back to the example. Never throws. */
export function restoreSelection(raw, scales) {
  if (!raw) return { ...DEFAULT_SELECTION };
  let parsed;
  try { parsed = JSON.parse(raw); } catch { return { ...DEFAULT_SELECTION }; }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return { ...DEFAULT_SELECTION };
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
