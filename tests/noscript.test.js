import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { SITE, DEAL } from '../site/js/data.js';
import { longDate, eur } from '../site/js/format.js';

const html = readFileSync(new URL('../site/index.html', import.meta.url), 'utf8');
const block = html.split('<noscript>')[1]?.split('</noscript>')[0] ?? '';

test('noscript facts match data.js', () => {
  assert.ok(block.includes(SITE.status.line));
  for (const s of DEAL.steps) {
    assert.ok(block.includes(longDate(s.date)), s.date);
    assert.ok(block.includes(s.kind === 'lb' ? 'Local bargaining (1%)' : `${s.pct}%`), s.id);
    if (s.min) assert.ok(block.includes(eur(s.min)), s.id);
  }
});
