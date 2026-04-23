const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

let createMixedProblem;
let DEFAULT_MIXED_SETTINGS;
let buildMixedExponentiationOperandPool;
let getEnabledOperations;
let sanitizeMixedSettings;

test.before(async () => {
  const mixedDifficulty = await import(
    pathToFileURL(path.resolve(__dirname, '../utils/mixedDifficulty.js')).href
  );

  ({
    buildMixedExponentiationOperandPool,
    createMixedProblem,
    DEFAULT_MIXED_SETTINGS,
    getEnabledOperations,
    sanitizeMixedSettings
  } = mixedDifficulty);
});

test('sanitizeMixedSettings falls back to defaults and normalizes boolean inputs', () => {
  const settings = sanitizeMixedSettings({
    exponentiationDifficulty: 'invalid',
    multiplicationDifficulty: 'expert',
    additionDifficulty: 'off',
    subtractionDifficulty: 'medium',
    divisionDifficulty: 'nope',
    roundSize: '55',
    rtlInput: 'false',
    hideTimer: 'true'
  });

  assert.deepEqual(settings, {
    ...DEFAULT_MIXED_SETTINGS,
    multiplicationDifficulty: 'expert',
    additionDifficulty: 'off',
    subtractionDifficulty: 'medium',
    roundSize: 55,
    rtlInput: false,
    hideTimer: true
  });
});

test('getEnabledOperations only returns operations that are not off', () => {
  const enabledOperations = getEnabledOperations({
    ...DEFAULT_MIXED_SETTINGS,
    exponentiationDifficulty: 'off',
    multiplicationDifficulty: 'hard',
    additionDifficulty: 'off',
    subtractionDifficulty: 'easy',
    divisionDifficulty: 'off'
  });

  assert.deepEqual(enabledOperations, ['MULTIPLICATION', 'SUBTRACTION']);
});

test('createMixedProblem keeps exponentiation within each mixed difficulty band', () => {
  const originalRandom = Math.random;

  try {
    const cases = [
      { difficulty: 'warmup', min: 2, max: 30 },
      { difficulty: 'easy', min: 2, max: 80 },
      { difficulty: 'medium', min: 10, max: 140 },
      { difficulty: 'hard', min: 20, max: 200 }
    ];

    for (const { difficulty, min, max } of cases) {
      Math.random = () => 0;
      const minimumProblem = createMixedProblem('EXPONENTIATION', difficulty);

      assert.equal(minimumProblem.operation, 'EXPONENTIATION');
      assert.equal(minimumProblem.leftOperand, min);
      assert.equal(minimumProblem.rightOperand, 2);
      assert.equal(minimumProblem.correctAnswer, BigInt(min) ** 2n);
      assert.equal(minimumProblem.digitsLeft, String(min).length);
      assert.equal(minimumProblem.digitsRight, 1);

      Math.random = () => 0.999999;
      const maximumProblem = createMixedProblem('EXPONENTIATION', difficulty);

      assert.equal(maximumProblem.leftOperand, max);
      assert.equal(maximumProblem.rightOperand, 5);
      assert.equal(maximumProblem.correctAnswer, BigInt(max) ** 5n);
      assert.equal(maximumProblem.digitsLeft, String(max).length);
      assert.equal(maximumProblem.digitsRight, 1);
    }
  } finally {
    Math.random = originalRandom;
  }
});

test('buildMixedExponentiationOperandPool gives warmup enough prompts for a 111-question round', () => {
  const pool = buildMixedExponentiationOperandPool('warmup');

  assert.equal(pool.length >= 111, true);
  assert.equal(pool.every(([base]) => base >= 2 && base <= 30), true);
  assert.equal(pool.every(([, exponent]) => exponent >= 2 && exponent <= 5), true);
});

test('createMixedProblem can reach 200^5 without exceeding the hard cap', () => {
  const originalRandom = Math.random;
  Math.random = () => 0.999999;

  try {
    const problem = createMixedProblem('EXPONENTIATION', 'hard');

    assert.equal(problem.leftOperand, 200);
    assert.equal(problem.rightOperand, 5);
    assert.equal(problem.correctAnswer, 320000000000n);
  } finally {
    Math.random = originalRandom;
  }
});

test('createMixedProblem maps arithmetic difficulties to digit counts', () => {
  const problem = createMixedProblem('MULTIPLICATION', 'hard');

  assert.equal(problem.operation, 'MULTIPLICATION');
  assert.equal(problem.digitsLeft, 3);
  assert.equal(problem.digitsRight, 2);
  assert.equal(String(problem.leftOperand).length, 3);
  assert.equal(String(problem.rightOperand).length, 2);
});
