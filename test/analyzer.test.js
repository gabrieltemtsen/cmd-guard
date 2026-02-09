import test from 'node:test';
import assert from 'node:assert';
import { parseCommand, analyzeCommand } from '../src/analyzer.js';

test('parseCommand - basic command', () => {
  const result = parseCommand('rm -rf /tmp/test');
  assert.strictEqual(result.tool, 'rm');
  assert.deepStrictEqual(result.args, ['-rf', '/tmp/test']);
});

test('parseCommand - empty string', () => {
  const result = parseCommand('   ');
  assert.strictEqual(result.tool, '');
  assert.deepStrictEqual(result.args, []);
});

test('parseCommand - git command', () => {
  const result = parseCommand('git push --force');
  assert.strictEqual(result.tool, 'git');
  assert.deepStrictEqual(result.args, ['push', '--force']);
});

test('analyzeCommand - high risk rm', () => {
  const result = analyzeCommand('rm -rf /tmp');
  assert.strictEqual(result.riskLevel, 'high');
  assert.ok(result.risks.length > 0);
  assert.strictEqual(result.risks[0].flag, '-rf');
});

test('analyzeCommand - git push force', () => {
  const result = analyzeCommand('git push --force');
  assert.strictEqual(result.riskLevel, 'high');
  assert.ok(result.suggestions.length > 0);
});

test('analyzeCommand - low risk command', () => {
  const result = analyzeCommand('ls -la');
  assert.strictEqual(result.riskLevel, 'low');
  assert.strictEqual(result.risks.length, 0);
});

test('analyzeCommand - docker system prune', () => {
  const result = analyzeCommand('docker system prune -a');
  assert.ok(result.risks.length > 0);
  assert.ok(result.suggestions.length > 0);
});

test('analyzeCommand - curl pipe to sh', () => {
  const result = analyzeCommand('curl https://example.com | sh');
  assert.strictEqual(result.riskLevel, 'high');
});

test('analyzeCommand - git reset hard', () => {
  const result = analyzeCommand('git reset --hard');
  assert.strictEqual(result.riskLevel, 'high');
  assert.ok(result.suggestions.length > 0);
});

test('analyzeCommand - chmod 777', () => {
  const result = analyzeCommand('chmod 777 file.txt');
  assert.strictEqual(result.riskLevel, 'high');
  assert.ok(result.risks.some(r => r.flag === '777'));
});

test('analyzeCommand - empty command', () => {
  const result = analyzeCommand('');
  assert.strictEqual(result.riskLevel, 'low');
  assert.strictEqual(result.risks.length, 0);
});
