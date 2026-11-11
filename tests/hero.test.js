import test from 'node:test';
import assert from 'node:assert/strict';
import { axisLabels } from '../site/js/sections/hero.js';

test('ruler axis labels do not overlap on a phone or a desktop', () => {
  for (const W of [288, 960]) {
    const labels = axisLabels(W, 33);
    const boxes = labels.map((l) => {
      const w = l.text.length * 7; // generous width estimate for 12px text
      const left = l.anchor === 'start' ? l.x : l.x - w / 2;
      return [left, left + w];
    });
    for (let i = 1; i < boxes.length; i++) {
      assert.ok(boxes[i][0] >= boxes[i - 1][1], `${W}px: "${labels[i - 1].text}" overlaps "${labels[i].text}"`);
    }
  }
});
