import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const walk = (d) => readdirSync(d).flatMap((f) => (statSync(join(d, f)).isDirectory() ? walk(join(d, f)) : [statSync(join(d, f)).size]));

test('whole site is under 500 KB', () => {
  const total = walk(fileURLToPath(new URL('../site/', import.meta.url))).reduce((a, b) => a + b, 0);
  assert.ok(total < 500 * 1024, `${total} bytes`);
});
