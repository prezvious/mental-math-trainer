const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

let buildMixedProgressLogRows;
let createMixedActiveRound;
let processMixedRoundSubmission;

const ADDITION_ONLY_SETTINGS = {
  squaresDifficulty: 'off',
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
    processMixedRoundSubmission
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
    1000
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
    questionId: 2
  };

  const submission = processMixedRoundSubmission(activeRound, 9n, 2550, null);

  assert.equal(submission.isComplete, true);
  assert.equal(submission.nextActiveRound, null);
  assert.equal(submission.attempts.length, 2);
  assert.equal(submission.attempt.responseMs, 550);
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
    500
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

test('buildMixedProgressLogRows preserves per-attempt operation metadata', () => {
  const rows = buildMixedProgressLogRows(
    [
      {
        operation: 'SQUARES',
        leftOperand: 12,
        rightOperand: 12,
        correctAnswer: 144n,
        submittedAnswer: 144n,
        isCorrect: true,
        responseMs: 300,
        digitsLeft: 2,
        digitsRight: 2
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
      operation: 'SQUARES',
      digits_left: 2,
      digits_right: 2,
      left_operand: 12,
      right_operand: 12,
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
