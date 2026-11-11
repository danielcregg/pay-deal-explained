import test from 'node:test';
import assert from 'node:assert/strict';
import { nextChapter } from '../site/js/present.js';

test('keyboard navigation, ignored inside form controls (Review Focus 4)', () => {
  assert.deepEqual([nextChapter(0, 'ArrowRight', 11, false), nextChapter(11, 'ArrowRight', 11, false), nextChapter(5, ' ', 11, false), nextChapter(5, 'PageUp', 11, false)], [1, 11, 6, 4]);
  assert.deepEqual([nextChapter(5, 'Home', 11, false), nextChapter(5, 'End', 11, false), nextChapter(3, 'ArrowLeft', 11, true), nextChapter(3, 'x', 11, false)], [0, 11, 3, 3]);
});
