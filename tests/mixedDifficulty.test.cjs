const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

let createMixedProblem;
let DEFAULT_MIXED_SETTINGS;
let getEnabledOperations;
let sanitizeMixedSettings;

test.before(async () => {
  const mixedDifficulty = await import(
    pathToFileURL(path.resolve(__dirname, '../utils/mixedDifficulty.js')).href
  );

  ({
    createMixedProblem,
    DEFAULT_MIXED_SETTINGS,
    getEnabledOperations,
    sanitizeMixedSettings
  } = mixedDifficulty);
});

test('sanitizeMixedSettings falls back to defaults and normalizes boolean inputs', () => {
  const settings = sanitizeMixedSettings({
    squaresDifficulty: 'invalid',
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
    squaresDifficulty: 'off',
    multiplicationDifficulty: 'hard',
    additionDifficulty: 'off',
    subtractionDifficulty: 'easy',
    divisionDifficulty: 'off'
  });

  assert.deepEqual(enabledOperations, ['MULTIPLICATION', 'SUBTRACTION']);
});

test('createMixedProblem generates squares with the configured range and metadata', () => {
  const originalRandom = Math.random;
  Math.random = () => 0;

  try {
    const problem = createMixedProblem('SQUARES', 'easy');

    assert.equal(problem.operation, 'SQUARES');
    assert.equal(problem.leftOperand, 2);
    assert.equal(problem.rightOperand, 2);
    assert.equal(problem.correctAnswer, 4n);
    assert.equal(problem.digitsLeft, 1);
    assert.equal(problem.digitsRight, 1);
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
