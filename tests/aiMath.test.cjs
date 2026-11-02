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

test('scientific literals preserve exact integers, fractions, signs, and powers', () => {
  assert.equal(solveAiExpression('1e3 + 2').exactText, '1002');
  assert.equal(solveAiExpression('1e-8 * 1e-8').decimalText, '0.0000000000000001');
  assert.equal(solveAiExpression('-1.25E+2 / 5').exactText, '-25');
  assert.equal(solveAiExpression('2 ^ 1e1').exactText, '1024');
  assert.equal(solveAiExpression('1e-1 / 3').exactText, '1/30');
  assert.match(solveAiExpression('sqrt(1e2)').exactText, /^10$/);
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

test('terminating fractions retain every decimal place, including tiny products', () => {
  assert.equal(
    solveAiExpression('1.12345678 * 1.87654321').decimalText,
    '2.1082151922374638'
  );
  assert.equal(
    solveAiExpression('0.00000001 * 0.00000001').decimalText,
    '0.0000000000000001'
  );
  assert.equal(solveAiExpression('-1 / 8').decimalText, '-0.125');
  assert.match(solveAiExpression('1 / 3').decimalText, /\(3\)/);
});

test('supported unary plus evaluates in exact and function expressions', () => {
  assert.equal(solveAiExpression('+2').exactText, '2');
  assert.equal(solveAiExpression('2 + +3').exactText, '5');
  assert.equal(solveAiExpression('sqrt(+4)').exactText, '2');
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

test('solveAiExpression normalizes ln to the natural log implementation', () => {
  const result = solveAiExpression('ln(exp(2))');

  assert.equal(result.normalizedExpression, 'log(exp(2))');
  assert.equal(result.kind, 'decimal');
  assert.equal(result.exactText, '2');
});

test('solveAiExpression supports approved constants and helper functions', () => {
  const result = solveAiExpression(
    'sin(pi / 2) + cos(0) + tan(0) + floor(3.7) - ceil(3.2) + mod(7, 4)'
  );

  assert.equal(result.kind, 'decimal');
  assert.equal(result.exactText, '4');
});

test('solveAiExpression rejects invalid syntax', () => {
  assert.throws(() => solveAiExpression('2 +'), /could not be parsed/i);
});

test('solveAiExpression rejects unsupported functions and symbols', () => {
  assert.throws(() => solveAiExpression('max(1, 2)'), /not allowed/i);
  assert.throws(() => solveAiExpression('x + 1'), /not allowed/i);
});
