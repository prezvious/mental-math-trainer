const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

let createProblem;
let buildDirectExponentiationOperandPool;
let sanitizeSettings;
let resolveRoundSizeDraft;
let MAX_DIGITS;
let MAX_ROUND_SIZE;
let MIN_ROUND_SIZE;
let PRACTICE_MODES;

function toScaledValue(text) {
  const stringValue = String(text);
  const [wholePart, fractionPart = ''] = stringValue.split('.');
  return {
    numerator: BigInt(`${wholePart}${fractionPart}`),
    scale: fractionPart.length
  };
}

function pow10(exponent) {
  return 10n ** BigInt(exponent);
}

function expectDecimalOperandFormat(text, wholeDigits, decimalDigits) {
  const stringValue = String(text);
  assert.match(stringValue, /^\d+\.\d+$/);

  const [wholePart, fractionPart] = stringValue.split('.');
  assert.equal(wholePart.length, wholeDigits);
  assert.equal(fractionPart.length, decimalDigits);
  assert.notEqual(Number(fractionPart), 0);
}

function assertExactDecimalDivision(problem) {
  const left = toScaledValue(problem.leftOperand);
  const right = toScaledValue(problem.rightOperand);
  const answer = toScaledValue(problem.correctAnswer);

  assert.match(problem.correctAnswer, /^\d+(?:\.\d+)?$/);
  assert.equal(
    left.numerator * pow10(right.scale + answer.scale),
    right.numerator * answer.numerator * pow10(left.scale)
  );
}

test.before(async () => {
  const mathEngine = await import(
    pathToFileURL(path.resolve(__dirname, '../utils/mathEngine.js')).href
  );

  ({
    createProblem,
    buildDirectExponentiationOperandPool,
    sanitizeSettings,
    resolveRoundSizeDraft,
    MAX_DIGITS,
    MAX_ROUND_SIZE,
    MIN_ROUND_SIZE,
    PRACTICE_MODES
  } = mathEngine);
});

test('sanitizeSettings clamps digit counts and round size within allowed bounds', () => {
  const settings = sanitizeSettings({
    practiceMode: PRACTICE_MODES.POSITIVE,
    operation: 'MULTIPLICATION',
    leftDigits: 0,
    rightDigits: 99,
    leftDecimalDigits: 0,
    rightDecimalDigits: 99,
    roundSize: 99999
  });

  assert.equal(settings.practiceMode, PRACTICE_MODES.POSITIVE);
  assert.equal(settings.leftDigits, 1);
  assert.equal(settings.rightDigits, MAX_DIGITS);
  assert.equal(settings.leftDecimalDigits, 1);
  assert.equal(settings.rightDecimalDigits, MAX_DIGITS);
  assert.equal(MAX_ROUND_SIZE, 10000);
  assert.equal(settings.roundSize, MAX_ROUND_SIZE);

  const minimumSettings = sanitizeSettings({
    practiceMode: PRACTICE_MODES.DECIMAL,
    operation: 'ADDITION',
    leftDigits: 4,
    rightDigits: 2,
    roundSize: 0
  });

  assert.equal(minimumSettings.roundSize, MIN_ROUND_SIZE);
});

test('sanitizeSettings caps rightDigits for subtraction and division and blocks decimal exponentiation', () => {
  const subtractionSettings = sanitizeSettings({
    practiceMode: PRACTICE_MODES.DECIMAL,
    operation: 'SUBTRACTION',
    leftDigits: 3,
    rightDigits: 8,
    roundSize: 10
  });
  const divisionSettings = sanitizeSettings({
    practiceMode: PRACTICE_MODES.DECIMAL,
    operation: 'DIVISION',
    leftDigits: 1,
    rightDigits: 4,
    roundSize: 10
  });
  const exponentiationSettings = sanitizeSettings({
    practiceMode: PRACTICE_MODES.DECIMAL,
    operation: 'EXPONENTIATION'
  });

  assert.equal(subtractionSettings.rightDigits, 3);
  assert.equal(divisionSettings.rightDigits, 1);
  assert.equal(exponentiationSettings.operation, 'MULTIPLICATION');
});

test('sanitizeSettings remaps legacy SQUARES operation to EXPONENTIATION', () => {
  const settings = sanitizeSettings({
    practiceMode: PRACTICE_MODES.POSITIVE,
    operation: 'SQUARES',
    leftDigits: 2,
    rightDigits: 2,
    roundSize: 10
  });

  assert.equal(settings.operation, 'EXPONENTIATION');
});

test('resolveRoundSizeDraft restores invalid drafts and clamps oversized values', () => {
  const currentSettings = {
    practiceMode: PRACTICE_MODES.POSITIVE,
    operation: 'ADDITION',
    leftDigits: 2,
    rightDigits: 2,
    leftDecimalDigits: 2,
    rightDecimalDigits: 2,
    maxBase: 10,
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

test('createProblem supports the requested positive edge digit combinations', () => {
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
      assert.equal(problem.practiceMode, PRACTICE_MODES.POSITIVE);
      assert.equal(typeof problem.correctAnswer, 'bigint');
    }
  }
});

test('buildDirectExponentiationOperandPool caps direct exponentiation at 20^5', () => {
  const pool = buildDirectExponentiationOperandPool(20);

  assert.equal(pool.every(([base]) => base >= 2 && base <= 20), true);
  assert.equal(pool.every(([, exponent]) => exponent >= 2 && exponent <= 5), true);
  assert.equal(
    pool.some(([base, exponent]) => base === 20 && exponent === 5),
    true
  );
  assert.equal(
    pool.some(([base, exponent]) => base === 2 && exponent === 20),
    false
  );
  assert.equal(
    pool.some(([base, exponent]) => base === 5 && exponent === 20),
    false
  );
  assert.equal(
    pool.some(([base, exponent]) => base === 20 && exponent === 20),
    false
  );
});

test('createProblem can generate 20^5 in direct exponentiation mode', () => {
  const originalRandom = Math.random;
  Math.random = () => 0.999999;

  try {
    const problem = createProblem({
      practiceMode: PRACTICE_MODES.POSITIVE,
      operation: 'EXPONENTIATION',
      maxBase: 20,
      roundSize: 10
    });

    assert.equal(problem.leftOperand, 20);
    assert.equal(problem.rightOperand, 5);
    assert.equal(problem.correctAnswer, 3200000n);
  } finally {
    Math.random = originalRandom;
  }
});

test('subtraction problems stay non-negative across all valid positive digit combinations', () => {
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

test('division problems always divide evenly across all valid positive digit combinations', () => {
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

test('decimal problems generate exact decimal operands and canonical answers across supported operations', () => {
  const decimalSettings = {
    practiceMode: PRACTICE_MODES.DECIMAL,
    leftDigits: 2,
    rightDigits: 1,
    leftDecimalDigits: 3,
    rightDecimalDigits: 2,
    roundSize: 10,
    maxBase: 10
  };

  for (const operation of ['ADDITION', 'SUBTRACTION', 'MULTIPLICATION', 'DIVISION']) {
    const problem = createProblem({
      ...decimalSettings,
      operation
    });

    expectDecimalOperandFormat(
      problem.leftOperand,
      decimalSettings.leftDigits,
      decimalSettings.leftDecimalDigits
    );
    expectDecimalOperandFormat(
      problem.rightOperand,
      decimalSettings.rightDigits,
      decimalSettings.rightDecimalDigits
    );
    assert.equal(problem.practiceMode, PRACTICE_MODES.DECIMAL);
    assert.match(problem.correctAnswer, /^\d+(?:\.\d+)?$/);
  }
});

test('decimal subtraction stays non-negative and exact across valid digit combinations', () => {
  for (let sample = 0; sample < 50; sample += 1) {
    const problem = createProblem({
      practiceMode: PRACTICE_MODES.DECIMAL,
      operation: 'SUBTRACTION',
      leftDigits: 2,
      rightDigits: 2,
      leftDecimalDigits: 3,
      rightDecimalDigits: 3,
      roundSize: 10
    });
    const left = toScaledValue(problem.leftOperand);
    const right = toScaledValue(problem.rightOperand);
    const answer = toScaledValue(problem.correctAnswer);

    const scale = Math.max(left.scale, right.scale, answer.scale);
    const leftAligned = left.numerator * pow10(scale - left.scale);
    const rightAligned = right.numerator * pow10(scale - right.scale);
    const answerAligned = answer.numerator * pow10(scale - answer.scale);

    assert.ok(leftAligned >= rightAligned);
    assert.equal(leftAligned - rightAligned, answerAligned);
  }
});

test('decimal division always resolves to an exact terminating decimal answer', () => {
  for (let sample = 0; sample < 50; sample += 1) {
    const problem = createProblem({
      practiceMode: PRACTICE_MODES.DECIMAL,
      operation: 'DIVISION',
      leftDigits: 1,
      rightDigits: 1,
      leftDecimalDigits: 3,
      rightDecimalDigits: 2,
      roundSize: 10
    });

    assertExactDecimalDivision(problem);
  }
});

test('decimal division generates for previously failing precision combinations', () => {
  const regressionSettings = [
    {
      leftDigits: 2,
      rightDigits: 2,
      leftDecimalDigits: 1,
      rightDecimalDigits: 2
    },
    {
      leftDigits: 1,
      rightDigits: 1,
      leftDecimalDigits: 1,
      rightDecimalDigits: 8
    }
  ];

  for (const settings of regressionSettings) {
    for (let sample = 0; sample < 10; sample += 1) {
      const problem = createProblem({
        practiceMode: PRACTICE_MODES.DECIMAL,
        operation: 'DIVISION',
        roundSize: 10,
        ...settings
      });

      expectDecimalOperandFormat(
        problem.leftOperand,
        settings.leftDigits,
        settings.leftDecimalDigits
      );
      expectDecimalOperandFormat(
        problem.rightOperand,
        settings.rightDigits,
        settings.rightDecimalDigits
      );
      assertExactDecimalDivision(problem);
    }
  }
});

test('decimal division generates exact answers across all supported digit combinations', () => {
  for (let leftDigits = 1; leftDigits <= MAX_DIGITS; leftDigits += 1) {
    for (let rightDigits = 1; rightDigits <= leftDigits; rightDigits += 1) {
      for (
        let leftDecimalDigits = 1;
        leftDecimalDigits <= MAX_DIGITS;
        leftDecimalDigits += 1
      ) {
        for (
          let rightDecimalDigits = 1;
          rightDecimalDigits <= MAX_DIGITS;
          rightDecimalDigits += 1
        ) {
          const problem = createProblem({
            practiceMode: PRACTICE_MODES.DECIMAL,
            operation: 'DIVISION',
            leftDigits,
            rightDigits,
            leftDecimalDigits,
            rightDecimalDigits,
            roundSize: 10
          });

          expectDecimalOperandFormat(
            problem.leftOperand,
            leftDigits,
            leftDecimalDigits
          );
          expectDecimalOperandFormat(
            problem.rightOperand,
            rightDigits,
            rightDecimalDigits
          );
          assertExactDecimalDivision(problem);
        }
      }
    }
  }
});
