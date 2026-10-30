import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

test('dotenv is available as a runtime dependency', async () => {
    const manifest = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'));
    assert.ok(manifest.dependencies.dotenv);
    assert.deepEqual(require('dotenv').parse('SAHAN_TEST=value'), { SAHAN_TEST: 'value' });
});
