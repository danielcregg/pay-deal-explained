import test from 'node:test';
import assert from 'node:assert/strict';
import { TIMELINE } from '../site/js/data.js';
import { model } from '../site/js/sections/timeline.js';

const stateOn = (today, date) => model(TIMELINE, today).find((e) => e.date === date).state;

test('the now marker follows the date', () => {
  assert.deepEqual([stateOn('2026-11-11', '2026-11-11'), stateOn('2026-11-11', '2026-12-07'), stateOn('2026-11-11', '2026-06-30')], ['now', 'future', 'past']);
  assert.equal(stateOn('2026-12-08', '2026-12-07'), 'now');
  assert.ok(model(TIMELINE, '2025-01-01').every((e) => e.state === 'future'));
});
