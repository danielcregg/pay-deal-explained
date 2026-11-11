import test from 'node:test';
import assert from 'node:assert/strict';
import { scaleLinear } from '../site/js/svg.js';

test('linear scale maps and inverts direction', () => {
  const y = scaleLinear([100, 110], [200, 0]);
  assert.deepEqual([y(100), y(105), y(110)], [200, 100, 0]);
});
