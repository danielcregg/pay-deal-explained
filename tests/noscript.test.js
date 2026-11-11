import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { SITE, DEAL } from '../site/js/data.js';
import { longDate, eur } from '../site/js/format.js';

const html = readFileSync(new URL('../site/index.html', import.meta.url), 'utf8');
const block = html.split('<noscript>')[1]?.split('</noscript>')[0] ?? '';

/** The table's rows as [date, rise, minimum], in order. */
const tableRows = (b) => [...b.matchAll(/<tr><td>(.*?)<\/td><td>(.*?)<\/td><td>(.*?)<\/td><\/tr>/g)].map((m) => m.slice(1));

/** What the rows should say, from data.js. */
const expectedRows = DEAL.steps.map((s) => [
  longDate(s.date),
  s.kind === 'lb' ? `Local bargaining (${s.pct}%)` : `${s.pct}%`,
  s.min ? eur(s.min) : '—',
]);

/** Do the noscript facts match data.js, row by row and in order? */
function matchesData(b) {
  return b.includes(SITE.status.line) && JSON.stringify(tableRows(b)) === JSON.stringify(expectedRows);
}

test('noscript facts match data.js', () => {
  assert.deepEqual(tableRows(block), expectedRows);
  assert.ok(matchesData(block));
});

test('M12: a changed percentage or a reordered row in the noscript table is caught', () => {
  const changed = block.replace('<td>1 April 2027</td><td>1%</td>', '<td>1 April 2027</td><td>1.5%</td>');
  const rowsOf = (b) => b.match(/<tr><td>[^<]*<\/td>.*?<\/tr>/g);
  const [r1, r2] = rowsOf(block);
  const reordered = block.replace(r1, '@@').replace(r2, r1).replace('@@', r2);
  for (const mutated of [changed, reordered]) {
    assert.notEqual(mutated, block);
    assert.equal(matchesData(mutated), false);
  }
});
