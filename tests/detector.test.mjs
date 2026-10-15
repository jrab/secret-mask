import assert from 'node:assert/strict';
import test from 'node:test';
import { findSecrets, maskSlice, maskText } from '../src/detector.ts';

test('provider tokens and authorization headers are masked', () => {
  const tokens = [
    'sk-' + 'x'.repeat(32), 'sk-proj-' + 'x'.repeat(60), 'sk-ant-api03-' + 'x'.repeat(60),
    'ghp_' + 'x'.repeat(36), 'github_pat_' + 'x'.repeat(40),
    'xoxb-' + '1'.repeat(12) + '-' + 'x'.repeat(24),
    'AKIA' + 'X'.repeat(16), 'sk_live_' + 'x'.repeat(24), 'AIza' + 'x'.repeat(35),
    'eyJhbGciOiJIUzI1NiJ9.' + 'x'.repeat(16) + '.' + 'y'.repeat(24),
  ];
  for (const token of tokens) {
    assert.equal(maskText(`Before ${token} after`), 'Before **** after');
    assert.equal(maskText(`Authorization: Bearer ${token}`), 'Authorization: Bearer ****');
  }
});

test('assignments preserve labels, quotes, punctuation, and ordinary prose', () => {
  for (const label of ['api_key', 'OPENAI_API_KEY', 'AWS_SECRET_ACCESS_KEY', 'client-secret', 'password', 'TOKEN']) {
    assert.equal(maskText(`"${label}": "synthetic-value",`), `"${label}": "****",`);
    assert.equal(maskText(`${label}=short`), `${label}=****`);
  }
  assert.equal(maskText('This is an ordinary note about token budgets.'), 'This is an ordinary note about token budgets.');
  assert.equal(maskText('api_key=****'), 'api_key=****');
  assert.equal(maskText('api_key=\nordinary prose'), 'api_key=\nordinary prose');
});

test('private-key blocks and incomplete blocks are hidden including their newlines', () => {
  const start = '-----BEGIN PRIVATE KEY-----';
  const end = '-----END PRIVATE KEY-----';
  assert.equal(maskText(`before\n${start}\nSYNTHETIC\n${end}\nafter`), 'before\n****\nafter');
  assert.equal(maskText(`${start}\nSYNTHETIC`), '****');
});

test('overlapping detectors produce one stable replacement without retaining secrets in results', () => {
  const source = 'api_key=' + 'sk-' + 'x'.repeat(32);
  assert.deepEqual(findSecrets(source), [{ from: 8, to: source.length }]);
  assert.equal(maskText(source), 'api_key=****');
  assert.equal(maskText(source), 'api_key=****');
});

test('masking across rendered text-node boundaries keeps one placeholder', () => {
  const first = 'api_key=sk-';
  const second = 'x'.repeat(32);
  const ranges = findSecrets(first + second);
  assert.equal(maskSlice(first, 0, ranges) + maskSlice(second, first.length, ranges), 'api_key=****');
});
