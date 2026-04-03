const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

let createProblem;
let sanitizeSettings;
let resolveRoundSizeDraft;
let MAX_DIGITS;
let MAX_ROUND_SIZE;
let MIN_ROUND_SIZE;

test.before(async () => {
  const mathEngine = await import(
    pathToFileURL(path.resolve(__dirname, '../utils/mathEngine.js')).href
  );

  ({
    createProblem,
    sanitizeSettings,
    resolveRoundSizeDraft,
    MAX_DIGITS,
    MAX_ROUND_SIZE,
    MIN_ROUND_SIZE
  } = mathEngine);
});

test('sanitizeSettings clamps digit counts and round size within allowed bounds', () => {
  const settings = sanitizeSettings({
    operation: 'MULTIPLICATION',
    leftDigits: 0,
    rightDigits: 99,
    roundSize: 99999
  });

  assert.equal(settings.leftDigits, 1);
  assert.equal(settings.rightDigits, MAX_DIGITS);
  assert.equal(MAX_ROUND_SIZE, 10000);
  assert.equal(settings.roundSize, MAX_ROUND_SIZE);

  const minimumSettings = sanitizeSettings({
    operation: 'ADDITION',
    leftDigits: 4,
    rightDigits: 2,
    roundSize: 0
  });

  assert.equal(minimumSettings.roundSize, MIN_ROUND_SIZE);
});

test('sanitizeSettings caps rightDigits for subtraction and division', () => {
  const subtractionSettings = sanitizeSettings({
    operation: 'SUBTRACTION',
    leftDigits: 3,
    rightDigits: 8,
    roundSize: 10
  });
  const divisionSettings = sanitizeSettings({
    operation: 'DIVISION',
    leftDigits: 1,
    rightDigits: 4,
    roundSize: 10
  });

  assert.equal(subtractionSettings.rightDigits, 3);
  assert.equal(divisionSettings.rightDigits, 1);
});

test('resolveRoundSizeDraft restores invalid drafts and clamps oversized values', () => {
  const currentSettings = {
    operation: 'ADDITION',
    leftDigits: 2,
    rightDigits: 2,
    roundSize: 21
  };

  assert.deepEqual(resolveRoundSizeDraft(currentSettings, ''), {
    nextSettings: currentSettings,
    nextRoundSizeDraft: '21',
    didChange: false
  });

  assert.deepEqual(resolveRoundSizeDraft(currentSettings, '99999'), {
    nextSettings: {
      ...currentSettings,
      roundSize: MAX_ROUND_SIZE
    },
    nextRoundSizeDraft: String(MAX_ROUND_SIZE),
    didChange: true
  });
});

test('createProblem supports the requested edge digit combinations', () => {
  const edgeDigitPairs = [
    [1, 1],
    [2, 1],
    [8, 1],
    [8, 8]
  ];
  const operations = ['ADDITION', 'SUBTRACTION', 'MULTIPLICATION', 'DIVISION'];

  for (const operation of operations) {
    for (const [leftDigits, rightDigits] of edgeDigitPairs) {
      const problem = createProblem(operation, leftDigits, rightDigits);

      assert.equal(String(problem.leftOperand).length, leftDigits);
      assert.equal(String(problem.rightOperand).length, rightDigits);
    }
  }
});

test('subtraction problems stay non-negative across all valid digit combinations', () => {
  for (let leftDigits = 1; leftDigits <= MAX_DIGITS; leftDigits += 1) {
    for (let rightDigits = 1; rightDigits <= leftDigits; rightDigits += 1) {
      for (let sample = 0; sample < 50; sample += 1) {
        const problem = createProblem('SUBTRACTION', leftDigits, rightDigits);

        assert.ok(
          BigInt(problem.leftOperand) >= BigInt(problem.rightOperand),
          `${leftDigits}x${rightDigits} subtraction generated a negative result`
        );
        assert.equal(String(problem.leftOperand).length, leftDigits);
        assert.equal(String(problem.rightOperand).length, rightDigits);
      }
    }
  }
});

test('division problems always divide evenly across all valid digit combinations', () => {
  for (let leftDigits = 1; leftDigits <= MAX_DIGITS; leftDigits += 1) {
    for (let rightDigits = 1; rightDigits <= leftDigits; rightDigits += 1) {
      for (let sample = 0; sample < 50; sample += 1) {
        const problem = createProblem('DIVISION', leftDigits, rightDigits);

        assert.notEqual(problem.rightOperand, 0);
        assert.equal(problem.leftOperand % problem.rightOperand, 0);
        assert.equal(String(problem.leftOperand).length, leftDigits);
        assert.equal(String(problem.rightOperand).length, rightDigits);
      }
    }
  }
});
