import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const checker = fileURLToPath(new URL('../scripts/check-release.mjs', import.meta.url));
const scratch = mkdtempSync(join(tmpdir(), 'plugin-release-'));

function check({ version = '0.1.0', packageVersion = version, minimum = '1.8.7',
  versions = { [version]: minimum }, tag = version } = {}) {
  const cwd = mkdtempSync(join(scratch, 'case-'));
  for (const [name, value] of Object.entries({
    'manifest.json': { version, minAppVersion: minimum },
    'package.json': { version: packageVersion },
    'versions.json': versions,
  })) writeFileSync(join(cwd, name), JSON.stringify(value));
  const result = spawnSync(process.execPath, [checker, ...(tag === null ? [] : [tag])], {
    cwd, encoding: 'utf8',
  });
  assert.ifError(result.error);
  return result;
}

test('release metadata agrees, with optional tag and older compatibility entries', () => {
  for (const options of [{}, { tag: null }, { versions: { '0.0.1': '1.7.0', '0.1.0': '1.8.7' } }]) {
    const result = check(options);
    assert.equal(result.status, 0, result.stderr);
  }
});

test('release checks reject version drift, invalid stable versions, and incorrect tags', () => {
  for (const options of [
    { packageVersion: '0.2.0' }, { versions: {} }, { versions: { '0.1.0': '1.7.0' } },
    { version: '0.1.0-beta.1' }, { version: '01.0.0' }, { minimum: 'latest' },
    { tag: 'v0.1.0' }, { tag: '0.2.0' },
  ]) {
    const result = check(options);
    assert.notEqual(result.status, 0, JSON.stringify(options));
    assert.ok(result.stderr.trim());
  }
});
