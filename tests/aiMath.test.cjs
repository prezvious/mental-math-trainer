const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

let solveAiExpression;

test.before(async () => {
  const aiMath = await import(
    pathToFileURL(path.resolve(__dirname, '../utils/aiMath.js')).href
  );

  ({ solveAiExpression } = aiMath);
});

test('solveAiExpression preserves exact huge integer arithmetic', () => {
  const result = solveAiExpression(
    '999999999999999999999999 * 999999999999999999999999'
  );

  assert.equal(result.kind, 'integer');
  assert.equal(
    result.exactText,
    '999999999999999999999998000000000000000000000001'
  );
});

test('solveAiExpression preserves exact fractions when possible', () => {
  const result = solveAiExpression('1 / 3 + 1 / 6');

  assert.equal(result.kind, 'fraction');
  assert.equal(result.exactText, '1/2');
  assert.equal(result.decimalText, '0.5');
});

test('solveAiExpression returns high-precision decimals for irrational results', () => {
  const result = solveAiExpression('sqrt(2)');

  assert.equal(result.kind, 'decimal');
  assert.match(result.exactText, /^1\.41421356/);
});

test('solveAiExpression allows approved calculator functions', () => {
  const result = solveAiExpression('round(log(100, 10) + abs(-4))');

  assert.equal(result.exactText, '6');
});

test('solveAiExpression rejects invalid syntax', () => {
  assert.throws(() => solveAiExpression('2 +'), /could not be parsed/i);
});

test('solveAiExpression rejects unsupported functions and symbols', () => {
  assert.throws(() => solveAiExpression('max(1, 2)'), /not allowed/i);
  assert.throws(() => solveAiExpression('x + 1'), /not allowed/i);
});
