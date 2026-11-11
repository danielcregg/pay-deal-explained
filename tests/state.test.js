import test from 'node:test';
import assert from 'node:assert/strict';
import { createStore } from '../site/js/state.js';

test('store merges patches and notifies subscribers until unsubscribed', () => {
  const s = createStore({ a: 1, b: 2 }); const seen = [];
  const off = s.subscribe((st) => seen.push(st.a));
  s.set({ a: 5 }); off(); s.set({ a: 9 });
  assert.deepEqual([seen, s.get()], [[5], { a: 9, b: 2 }]);
});
