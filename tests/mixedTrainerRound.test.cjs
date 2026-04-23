const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

let buildMixedProgressLogRows;
let createMixedActiveRound;
let processMixedRoundSubmission;
let shouldAutoSubmitAnswer;

const ADDITION_ONLY_SETTINGS = {
  exponentiationDifficulty: 'off',
  multiplicationDifficulty: 'off',
  additionDifficulty: 'warmup',
  subtractionDifficulty: 'off',
  divisionDifficulty: 'off',
  roundSize: 3,
  rtlInput: false,
  hideTimer: false
};

const EXPONENTIATION_ONLY_SETTINGS = {
  exponentiationDifficulty: 'warmup',
  multiplicationDifficulty: 'off',
  additionDifficulty: 'off',
  subtractionDifficulty: 'off',
  divisionDifficulty: 'off',
  roundSize: 3,
  rtlInput: false,
  hideTimer: false
};

const SUBTRACTION_ONLY_SETTINGS = {
  exponentiationDifficulty: 'off',
  multiplicationDifficulty: 'off',
  additionDifficulty: 'off',
  subtractionDifficulty: 'warmup',
  divisionDifficulty: 'off',
  roundSize: 3,
  rtlInput: false,
  hideTimer: false
};

const DIVISION_ONLY_SETTINGS = {
  exponentiationDifficulty: 'off',
  multiplicationDifficulty: 'off',
  additionDifficulty: 'off',
  subtractionDifficulty: 'off',
  divisionDifficulty: 'warmup',
  roundSize: 3,
  rtlInput: false,
  hideTimer: false
};

const ADDITION_AND_EXPONENTIATION_SETTINGS = {
  exponentiationDifficulty: 'warmup',
  multiplicationDifficulty: 'off',
  additionDifficulty: 'warmup',
  subtractionDifficulty: 'off',
  divisionDifficulty: 'off',
  roundSize: 3,
  rtlInput: false,
  hideTimer: false
};

test.before(async () => {
  const mixedTrainerRound = await import(
    pathToFileURL(path.resolve(__dirname, '../utils/mixedTrainerRound.js')).href
  );

  ({
    buildMixedProgressLogRows,
    createMixedActiveRound,
    processMixedRoundSubmission,
    shouldAutoSubmitAnswer
  } = mixedTrainerRound);
});

test('processMixedRoundSubmission records a correct answer and advances', () => {
  const activeRound = createMixedActiveRound(
    ADDITION_ONLY_SETTINGS,
    {
      operation: 'ADDITION',
      leftOperand: 4,
      rightOperand: 5,
      correctAnswer: 9n,
      digitsLeft: 1,
      digitsRight: 1
    },
    1000,
    'mixed-session-1'
  );

  const submission = processMixedRoundSubmission(activeRound, 9n, 1425, null);

  assert.equal(submission.ignored, false);
  assert.equal(submission.responseMs, 425);
  assert.equal(submission.attempt.isCorrect, true);
  assert.equal(submission.attempt.digitsLeft, 1);
  assert.equal(submission.isComplete, false);
  assert.equal(submission.nextActiveRound.questionId, 2);
  assert.equal(submission.nextActiveRound.attempts.length, 1);
  assert.equal(submission.nextActiveRound.currentProblem.operation, 'ADDITION');
  assert.equal(submission.nextActiveRound.currentProblem.digitsLeft, 1);
  assert.equal(submission.nextActiveRound.currentProblem.digitsRight, 1);
  assert.equal(submission.nextActiveRound.sessionId, 'mixed-session-1');
});

test('processMixedRoundSubmission avoids repeating arithmetic prompts while unseen ones remain', () => {
  const originalRandom = Math.random;
  const sequence = [0, 0, 0, 0, 0.2];
  let index = 0;
  Math.random = () => sequence[index++] ?? 0;

  try {
    const activeRound = createMixedActiveRound(
      ADDITION_ONLY_SETTINGS,
      {
        operation: 'ADDITION',
        leftOperand: 2,
        rightOperand: 2,
        correctAnswer: 4n,
        digitsLeft: 1,
        digitsRight: 1
      },
      500,
      'mixed-session-addition-unique'
    );

    const submission = processMixedRoundSubmission(activeRound, 4n, 900, null);

    assert.equal(submission.ignored, false);
    assert.equal(submission.nextActiveRound.currentProblem.operation, 'ADDITION');
    assert.equal(submission.nextActiveRound.currentProblem.leftOperand, 2);
    assert.equal(submission.nextActiveRound.currentProblem.rightOperand, 3);
  assert.equal(submission.nextActiveRound.currentProblem.correctAnswer, 5n);
  } finally {
    Math.random = originalRandom;
  }
});

test('processMixedRoundSubmission finds the last unseen addition prompt exactly', () => {
  const originalRandom = Math.random;
  Math.random = () => 0;

  try {
    const attempts = [];

    for (let leftOperand = 2; leftOperand <= 9; leftOperand += 1) {
      for (let rightOperand = 2; rightOperand <= 9; rightOperand += 1) {
        if (
          (leftOperand === 2 && rightOperand === 2) ||
          (leftOperand === 9 && rightOperand === 9)
        ) {
          continue;
        }

        const correctAnswer = BigInt(leftOperand + rightOperand);
        attempts.push({
          operation: 'ADDITION',
          leftOperand,
          rightOperand,
          correctAnswer,
          submittedAnswer: correctAnswer,
          isCorrect: true,
          responseMs: 100,
          digitsLeft: 1,
          digitsRight: 1,
          createdAt: '2026-04-23T00:00:00.000Z'
        });
      }
    }

    const activeRound = {
      settings: {
        ...ADDITION_ONLY_SETTINGS,
        roundSize: attempts.length + 2
      },
      attempts,
      currentProblem: {
        operation: 'ADDITION',
        leftOperand: 2,
        rightOperand: 2,
        correctAnswer: 4n,
        digitsLeft: 1,
        digitsRight: 1
      },
      questionStartedAt: 500,
      questionId: attempts.length + 1,
      sessionId: 'mixed-session-addition-last-unseen'
    };

    const submission = processMixedRoundSubmission(activeRound, 4n, 900, null);

    assert.equal(submission.ignored, false);
    assert.equal(submission.nextActiveRound.currentProblem.operation, 'ADDITION');
    assert.equal(submission.nextActiveRound.currentProblem.leftOperand, 9);
    assert.equal(submission.nextActiveRound.currentProblem.rightOperand, 9);
    assert.equal(submission.nextActiveRound.currentProblem.correctAnswer, 18n);
  } finally {
    Math.random = originalRandom;
  }
});

test('processMixedRoundSubmission de-dupes across enabled mixed operations', () => {
  const originalRandom = Math.random;
  let callCount = 0;
  Math.random = () => {
    callCount += 1;
    if (callCount === 1) {
      return 0.999999;
    }

    return 0;
  };

  try {
    const activeRound = {
      settings: ADDITION_AND_EXPONENTIATION_SETTINGS,
      attempts: [
        {
          operation: 'ADDITION',
          leftOperand: 2,
          rightOperand: 2,
          correctAnswer: 4n,
          submittedAnswer: 4n,
          isCorrect: true,
          responseMs: 250,
          digitsLeft: 1,
          digitsRight: 1,
          createdAt: '2026-04-23T00:00:00.000Z'
        }
      ],
      currentProblem: {
        operation: 'EXPONENTIATION',
        leftOperand: 2,
        rightOperand: 2,
        correctAnswer: 4n,
        digitsLeft: 1,
        digitsRight: 1
      },
      questionStartedAt: 500,
      questionId: 2,
      sessionId: 'mixed-session-cross-operation'
    };

    const submission = processMixedRoundSubmission(activeRound, 4n, 900, null);

    assert.equal(submission.ignored, false);
    assert.deepEqual(submission.nextActiveRound.currentProblem, {
      operation: 'ADDITION',
      leftOperand: 2,
      rightOperand: 3,
      correctAnswer: 5n,
      digitsLeft: 1,
      digitsRight: 1
    });
  } finally {
    Math.random = originalRandom;
  }
});

test('final question completion returns no nextActiveRound', () => {
  const activeRound = {
    settings: {
      ...ADDITION_ONLY_SETTINGS,
      roundSize: 2
    },
    attempts: [
      {
        operation: 'ADDITION',
        leftOperand: 2,
        rightOperand: 3,
        correctAnswer: 5n,
        submittedAnswer: 5n,
        isCorrect: true,
        responseMs: 250,
        digitsLeft: 1,
        digitsRight: 1,
        createdAt: '2026-03-31T00:00:00.000Z'
      }
    ],
    currentProblem: {
      operation: 'ADDITION',
      leftOperand: 8,
      rightOperand: 1,
      correctAnswer: 9n,
      digitsLeft: 1,
      digitsRight: 1
    },
    questionStartedAt: 2000,
    questionId: 2,
    sessionId: 'mixed-session-final'
  };

  const submission = processMixedRoundSubmission(activeRound, 9n, 2550, null);

  assert.equal(submission.isComplete, true);
  assert.equal(submission.nextActiveRound, null);
  assert.equal(submission.attempts.length, 2);
  assert.equal(submission.attempt.responseMs, 550);
});

test('processMixedRoundSubmission records incorrect answers without prestarting the next timer', () => {
  const activeRound = createMixedActiveRound(
    ADDITION_ONLY_SETTINGS,
    {
      operation: 'ADDITION',
      leftOperand: 6,
      rightOperand: 4,
      correctAnswer: 10n,
      digitsLeft: 1,
      digitsRight: 1
    },
    1000,
    'mixed-session-wrong-answer'
  );

  const submission = processMixedRoundSubmission(activeRound, 9n, 1450, null);

  assert.equal(submission.ignored, false);
  assert.equal(submission.attempt.isCorrect, false);
  assert.equal(submission.attempt.submittedAnswer, 9n);
  assert.equal(submission.responseMs, 450);
  assert.equal(submission.nextActiveRound.questionStartedAt, null);
});

test('processMixedRoundSubmission finds the last unseen subtraction prompt exactly', () => {
  const originalRandom = Math.random;
  Math.random = () => 0;

  try {
    const attempts = [];

    for (let leftOperand = 2; leftOperand <= 9; leftOperand += 1) {
      for (let rightOperand = 1; rightOperand < leftOperand; rightOperand += 1) {
        if (
          (leftOperand === 2 && rightOperand === 1) ||
          (leftOperand === 9 && rightOperand === 8)
        ) {
          continue;
        }

        const correctAnswer = BigInt(leftOperand - rightOperand);
        attempts.push({
          operation: 'SUBTRACTION',
          leftOperand,
          rightOperand,
          correctAnswer,
          submittedAnswer: correctAnswer,
          isCorrect: true,
          responseMs: 100,
          digitsLeft: 1,
          digitsRight: 1,
          createdAt: '2026-04-23T00:00:00.000Z'
        });
      }
    }

    const activeRound = {
      settings: {
        ...SUBTRACTION_ONLY_SETTINGS,
        roundSize: attempts.length + 2
      },
      attempts,
      currentProblem: {
        operation: 'SUBTRACTION',
        leftOperand: 2,
        rightOperand: 1,
        correctAnswer: 1n,
        digitsLeft: 1,
        digitsRight: 1
      },
      questionStartedAt: 500,
      questionId: attempts.length + 1,
      sessionId: 'mixed-session-subtraction-last-unseen'
    };

    const submission = processMixedRoundSubmission(activeRound, 1n, 900, null);

    assert.equal(submission.ignored, false);
    assert.equal(submission.nextActiveRound.currentProblem.operation, 'SUBTRACTION');
    assert.equal(submission.nextActiveRound.currentProblem.leftOperand, 9);
    assert.equal(submission.nextActiveRound.currentProblem.rightOperand, 8);
    assert.equal(submission.nextActiveRound.currentProblem.correctAnswer, 1n);
  } finally {
    Math.random = originalRandom;
  }
});

test('processMixedRoundSubmission finds the last unseen division prompt exactly', () => {
  const originalRandom = Math.random;
  Math.random = () => 0;

  try {
    const attempts = [
      [6, 2],
      [8, 2],
      [6, 3],
      [8, 4]
    ].map(([leftOperand, rightOperand]) => ({
      operation: 'DIVISION',
      leftOperand,
      rightOperand,
      correctAnswer: BigInt(leftOperand / rightOperand),
      submittedAnswer: BigInt(leftOperand / rightOperand),
      isCorrect: true,
      responseMs: 100,
      digitsLeft: 1,
      digitsRight: 1,
      createdAt: '2026-04-23T00:00:00.000Z'
    }));

    const activeRound = {
      settings: {
        ...DIVISION_ONLY_SETTINGS,
        roundSize: attempts.length + 2
      },
      attempts,
      currentProblem: {
        operation: 'DIVISION',
        leftOperand: 4,
        rightOperand: 2,
        correctAnswer: 2n,
        digitsLeft: 1,
        digitsRight: 1
      },
      questionStartedAt: 500,
      questionId: attempts.length + 1,
      sessionId: 'mixed-session-division-last-unseen'
    };

    const submission = processMixedRoundSubmission(activeRound, 2n, 900, null);

    assert.equal(submission.ignored, false);
    assert.equal(submission.nextActiveRound.currentProblem.operation, 'DIVISION');
    assert.equal(submission.nextActiveRound.currentProblem.leftOperand, 9);
    assert.equal(submission.nextActiveRound.currentProblem.rightOperand, 3);
    assert.equal(submission.nextActiveRound.currentProblem.correctAnswer, 3n);
  } finally {
    Math.random = originalRandom;
  }
});

test('processMixedRoundSubmission finds the last unseen warmup exponent prompt exactly', () => {
  const originalRandom = Math.random;
  Math.random = () => 0;

  try {
    const attempts = [];

    for (let base = 2; base <= 30; base += 1) {
      for (let exponent = 2; exponent <= 5; exponent += 1) {
        if (
          (base === 2 && exponent === 2) ||
          (base === 30 && exponent === 5)
        ) {
          continue;
        }

        const correctAnswer = BigInt(base) ** BigInt(exponent);
        attempts.push({
          operation: 'EXPONENTIATION',
          leftOperand: base,
          rightOperand: exponent,
          correctAnswer,
          submittedAnswer: correctAnswer,
          isCorrect: true,
          responseMs: 100,
          digitsLeft: String(base).length,
          digitsRight: 1,
          createdAt: '2026-04-23T00:00:00.000Z'
        });
      }
    }

    const activeRound = {
      settings: {
        ...EXPONENTIATION_ONLY_SETTINGS,
        roundSize: attempts.length + 2
      },
      attempts,
      currentProblem: {
        operation: 'EXPONENTIATION',
        leftOperand: 2,
        rightOperand: 2,
        correctAnswer: 4n,
        digitsLeft: 1,
        digitsRight: 1
      },
      questionStartedAt: 500,
      questionId: attempts.length + 1,
      sessionId: 'mixed-session-exponent-last-unseen'
    };

    const submission = processMixedRoundSubmission(activeRound, 4n, 900, null);

    assert.equal(submission.ignored, false);
    assert.equal(submission.nextActiveRound.currentProblem.leftOperand, 30);
    assert.equal(submission.nextActiveRound.currentProblem.rightOperand, 5);
    assert.equal(submission.nextActiveRound.currentProblem.correctAnswer, 24300000n);
  } finally {
    Math.random = originalRandom;
  }
});

test('processMixedRoundSubmission repeats exponentiation only after the mixed pool is exhausted', () => {
  const originalRandom = Math.random;
  Math.random = () => 0;

  try {
    const attempts = [];

    for (let base = 2; base <= 30; base += 1) {
      for (let exponent = 2; exponent <= 5; exponent += 1) {
        if (base === 30 && exponent === 5) {
          continue;
        }

        const correctAnswer = BigInt(base) ** BigInt(exponent);
        attempts.push({
          operation: 'EXPONENTIATION',
          leftOperand: base,
          rightOperand: exponent,
          correctAnswer,
          submittedAnswer: correctAnswer,
          isCorrect: true,
          responseMs: 100,
          digitsLeft: String(base).length,
          digitsRight: 1,
          createdAt: '2026-04-23T00:00:00.000Z'
        });
      }
    }

    const activeRound = {
      settings: {
        ...EXPONENTIATION_ONLY_SETTINGS,
        roundSize: attempts.length + 2
      },
      attempts,
      currentProblem: {
        operation: 'EXPONENTIATION',
        leftOperand: 30,
        rightOperand: 5,
        correctAnswer: 24300000n,
        digitsLeft: 2,
        digitsRight: 1
      },
      questionStartedAt: 500,
      questionId: attempts.length + 1,
      sessionId: 'mixed-session-exponentiation-fallback'
    };

    const submission = processMixedRoundSubmission(activeRound, 24300000n, 900, null);

    assert.equal(submission.ignored, false);
    assert.equal(submission.isComplete, false);
    assert.equal(submission.nextActiveRound.currentProblem.leftOperand, 2);
    assert.equal(submission.nextActiveRound.currentProblem.rightOperand, 2);
    assert.equal(submission.nextActiveRound.currentProblem.correctAnswer, 4n);
  } finally {
    Math.random = originalRandom;
  }
});

test('duplicate submissions for the same question are ignored', () => {
  const activeRound = createMixedActiveRound(
    ADDITION_ONLY_SETTINGS,
    {
      operation: 'ADDITION',
      leftOperand: 7,
      rightOperand: 2,
      correctAnswer: 9n,
      digitsLeft: 1,
      digitsRight: 1
    },
    500,
    'mixed-session-dedupe'
  );

  const firstSubmission = processMixedRoundSubmission(activeRound, 9n, 900, null);
  const duplicateSubmission = processMixedRoundSubmission(
    activeRound,
    9n,
    901,
    firstSubmission.handledQuestionId
  );

  assert.equal(firstSubmission.ignored, false);
  assert.equal(duplicateSubmission.ignored, true);
  assert.equal(duplicateSubmission.handledQuestionId, firstSubmission.handledQuestionId);
});

test('shouldAutoSubmitAnswer only triggers on exact correct integer input', () => {
  assert.equal(shouldAutoSubmitAnswer('42', 42n), 42n);
  assert.equal(shouldAutoSubmitAnswer(' 42 ', 42n), 42n);
  assert.equal(shouldAutoSubmitAnswer('41', 42n), null);
  assert.equal(shouldAutoSubmitAnswer('', 42n), null);
  assert.equal(shouldAutoSubmitAnswer('-', 42n), null);
});

test('buildMixedProgressLogRows preserves per-attempt operation metadata', () => {
  const rows = buildMixedProgressLogRows(
    [
      {
        operation: 'EXPONENTIATION',
        leftOperand: 12,
        rightOperand: 2,
        correctAnswer: 144n,
        submittedAnswer: 144n,
        isCorrect: true,
        responseMs: 300,
        digitsLeft: 2,
        digitsRight: 1
      },
      {
        operation: 'MULTIPLICATION',
        leftOperand: 24,
        rightOperand: 3,
        correctAnswer: 72n,
        submittedAnswer: 72n,
        isCorrect: true,
        responseMs: 410,
        digitsLeft: 2,
        digitsRight: 1
      }
    ],
    'user-123',
    'session-123'
  );

  assert.deepEqual(rows, [
    {
      user_id: 'user-123',
      session_id: 'session-123',
      question_index: 1,
      operation: 'EXPONENTIATION',
      digits_left: 2,
      digits_right: 1,
      left_operand: 12,
      right_operand: 2,
      correct_answer: '144',
      submitted_answer: '144',
      is_correct: true,
      response_ms: 300
    },
    {
      user_id: 'user-123',
      session_id: 'session-123',
      question_index: 2,
      operation: 'MULTIPLICATION',
      digits_left: 2,
      digits_right: 1,
      left_operand: 24,
      right_operand: 3,
      correct_answer: '72',
      submitted_answer: '72',
      is_correct: true,
      response_ms: 410
    }
  ]);
});
