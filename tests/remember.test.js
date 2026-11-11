// The reader's job, grade and point are kept for a later visit only if they ask. Left to
// itself the page opens generic every time, so it never shows anyone's level unasked.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { installDom } from './helpers/dom.js';
import * as data from '../site/js/data.js';
import { DEFAULT_SELECTION, STORAGE_KEY, restoreSelection, persistSelection, rememberChoices } from '../site/js/selection.js';
import { createStore } from '../site/js/state.js';
import * as yourPay from '../site/js/sections/your-pay.js';

const document = installDom();
const { SCALES } = data;
const mine = { ...DEFAULT_SELECTION, touched: true, sector: 'tu', gradeId: 'lect', pointIndex: 5, typed: null };

/** A stand-in for the browser's storage, so saving can be watched. */
function withStorage(run) {
  const kept = new Map();
  const before = globalThis.localStorage;
  globalThis.localStorage = { getItem: (k) => (kept.has(k) ? kept.get(k) : null), setItem: (k, v) => kept.set(k, String(v)), removeItem: (k) => kept.delete(k) };
  try { return run(kept); } finally { globalThis.localStorage = before; }
}

test('remembering is off unless the reader asks, and only an asked-for save is brought back', () => {
  assert.equal(DEFAULT_SELECTION.remember, false);
  assert.deepEqual(restoreSelection(JSON.stringify(mine), SCALES), { ...DEFAULT_SELECTION }, 'saved, but never asked to be kept');
  const kept = restoreSelection(JSON.stringify({ ...mine, remember: true }), SCALES);
  assert.deepEqual([kept.gradeId, kept.pointIndex, kept.touched, kept.remember], ['lect', 5, true, true]);
  assert.equal(restoreSelection(JSON.stringify({ ...mine, remember: 'yes' }), SCALES).touched, false);
  const ticked = restoreSelection(JSON.stringify({ ...DEFAULT_SELECTION, remember: true, scenario: 'higher' }), SCALES);
  assert.deepEqual([ticked.remember, ticked.touched, ticked.scenario, ticked.sector], [true, false, 'higher', 'any'], 'the tick is kept with whatever has been set so far, and the pay stays the example');
});

test('saving: choices are written only while remembering is on, and wiped as soon as it is not', () => {
  withStorage((kept) => {
    persistSelection(mine);
    assert.equal(kept.has(STORAGE_KEY), false, 'not asked: nothing is written');
    persistSelection({ ...mine, remember: true });
    assert.equal(JSON.parse(kept.get(STORAGE_KEY)).pointIndex, 5);
    persistSelection({ ...mine, remember: false });
    assert.equal(kept.has(STORAGE_KEY), false, 'switched off: what was saved is removed');
    persistSelection({ ...DEFAULT_SELECTION, remember: true });
    assert.equal(JSON.parse(kept.get(STORAGE_KEY)).remember, true, 'ticked before anything is chosen: the tick is kept');
    kept.set(STORAGE_KEY, JSON.stringify(mine)); // left behind by an earlier version of the site
    persistSelection({ ...DEFAULT_SELECTION });
    assert.equal(kept.has(STORAGE_KEY), false, 'an old save is cleared when the page opens');
  });
});

test('chapter 1: a tick box asks before anything is kept, and clearing forgets it', () => {
  const root = document.createElement('div');
  document.body.append(root);
  const store = createStore({ ...mine });
  yourPay.render(root, { store, data, now: '2026-11' });
  const box = root.querySelector('#pp-remember');
  assert.equal(box.checked, false);
  assert.equal(box.closest('label').textContent, 'Remember my choices on this device');
  assert.match(root.querySelector('.privacy').textContent, /^Your choices are not saved or sent anywhere/);
  box.checked = true;
  box.dispatchEvent({ type: 'change', bubbles: true });
  assert.equal(store.get().remember, true);
  [...root.querySelectorAll('button')].find((b) => b.textContent === 'Clear my choices').click();
  assert.deepEqual([store.get().remember, store.get().touched, box.checked], [false, false, false]);
});

test('the page forgets an unasked save when it opens, and saves through one gate', () => {
  const main = readFileSync(new URL('../site/js/main.js', import.meta.url), 'utf8');
  assert.match(main, /rememberChoices\(store\);/);
  assert.doesNotMatch(main, /saveSelection|persistSelection/);
  assert.match(readFileSync(new URL('../README.md', import.meta.url), 'utf8'), /only if you tick/);
});

test('remembering across two tabs: a tab that is not remembering leaves storage alone, and unticking in one unticks the other', () => {
  withStorage((kept) => {
    // tab A opened before anything was remembered
    const a = createStore({ ...DEFAULT_SELECTION });
    rememberChoices(a, null);
    // tab B: the reader ticks the box and chooses
    const b = createStore({ ...DEFAULT_SELECTION });
    let onStorage = null;
    rememberChoices(b, { addEventListener: (type, fn) => { if (type === 'storage') onStorage = fn; } });
    b.set({ ...mine, remember: true });
    assert.equal(JSON.parse(kept.get(STORAGE_KEY)).pointIndex, 5);
    a.set({ scenario: 'higher' }); // tab A changes something
    assert.equal(JSON.parse(kept.get(STORAGE_KEY)).pointIndex, 5, 'tab A was never asked to remember, so it removes nothing');
    // another tab unticks the box: this one hears of it and stops too
    kept.delete(STORAGE_KEY);
    onStorage({ key: 'something-else', newValue: null });
    assert.equal(b.get().remember, true);
    onStorage({ key: STORAGE_KEY, newValue: null });
    assert.equal(b.get().remember, false);
    b.set({ scenario: 'lower' });
    assert.equal(kept.has(STORAGE_KEY), false, 'and its next change does not save the choices again');
    // a save by another tab is not a reason to untick
    b.set({ remember: true });
    onStorage({ key: STORAGE_KEY, newValue: '{}' });
    assert.equal(b.get().remember, true);
    b.set({ remember: false });
    assert.equal(kept.has(STORAGE_KEY), false, 'unticking here removes the save');
  });
});

test('remembering: the page opening clears what an earlier version saved, and keeps what was asked for', () => {
  withStorage((kept) => {
    kept.set(STORAGE_KEY, JSON.stringify(mine)); // saved without asking
    rememberChoices(createStore(restoreSelection(kept.get(STORAGE_KEY), SCALES)), null);
    assert.equal(kept.has(STORAGE_KEY), false);
    kept.set(STORAGE_KEY, JSON.stringify({ ...mine, remember: true }));
    rememberChoices(createStore(restoreSelection(kept.get(STORAGE_KEY), SCALES)), null);
    assert.equal(JSON.parse(kept.get(STORAGE_KEY)).gradeId, 'lect');
  });
});

test('remembering: one field that no longer makes sense does not cost the reader the rest', () => {
  const saved = (patch) => JSON.stringify({ ...mine, remember: true, ...patch });
  const odd = restoreSelection(saved({ scenario: 'doom', payMonth: '2031-01', incrementMonth: 13, pointMonth: 'soon', fte: 7, alScale: 'x', hoursPerYear: -1, includeLB: 'yes', includeOwed: 1 }), SCALES);
  assert.deepEqual([odd.sector, odd.gradeId, odd.pointIndex, odd.touched, odd.remember], ['tu', 'lect', 5, true, true]);
  assert.deepEqual([odd.scenario, odd.payMonth, odd.incrementMonth, odd.pointMonth, odd.fte, odd.alScale, odd.hoursPerYear, odd.includeLB, odd.includeOwed],
    [DEFAULT_SELECTION.scenario, DEFAULT_SELECTION.payMonth, null, null, 1, 'al-ne', 0, DEFAULT_SELECTION.includeLB, DEFAULT_SELECTION.includeOwed]);
  // what says whose pay it is still has to be right
  assert.equal(restoreSelection(saved({ gradeId: 'no-such-grade' }), SCALES).touched, false);
  assert.equal(restoreSelection(saved({ pointIndex: 99 }), SCALES).touched, false);
  assert.equal(restoreSelection(saved({ contract: 'casual' }), SCALES).touched, false);
});
