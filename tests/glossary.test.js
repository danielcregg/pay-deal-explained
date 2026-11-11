import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { GLOSSARY } from '../site/js/data.js';
import { termHref } from '../site/js/sections/glossary.js';

test('every data-term on the site has a glossary entry', () => {
  const root = new URL('../site/', import.meta.url);
  const files = ['index.html', ...readdirSync(new URL('js/sections/', root)).map((f) => `js/sections/${f}`)];
  const ids = new Set(GLOSSARY.map((g) => g.id));
  const used = files.flatMap((f) => [...readFileSync(new URL(f, root), 'utf8').matchAll(/data-term="([a-z-]+)"/g)].map((m) => m[1]));
  assert.ok(used.length >= 5);
  for (const id of used) assert.ok(ids.has(id), id);
  assert.equal(termHref('local-bargaining'), '#term-local-bargaining');
});
