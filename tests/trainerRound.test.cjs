const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

let createActiveRound;
let processRoundSubmission;
let shouldAutoSubmitAnswer;

function createProblemStub(settingsOrOperation, leftDigits, rightDigits) {
  const settings =
    typeof settingsOrOperation === 'object'
      ? settingsOrOperation
      : {
          practiceMode: 'POSITIVE',
          operation: settingsOrOperation,
          leftDigits,
          rightDigits
        };

  return {
    practiceMode: settings.practiceMode,
    operation: settings.operation,
    leftOperand:
      settings.practiceMode === 'DECIMAL'
        ? `${settings.leftDigits}.${'1'.repeat(settings.leftDecimalDigits)}`
        : Number(`${settings.leftDigits}1`),
    rightOperand:
      settings.practiceMode === 'DECIMAL'
        ? `${settings.rightDigits}.${'1'.repeat(settings.rightDecimalDigits)}`
        : Number(`${settings.rightDigits}1`),
    correctAnswer: settings.practiceMode === 'DECIMAL' ? '11.1' : 11n
  };
}

test.before(async () => {
  const trainerRound = await import(
    pathToFileURL(path.resolve(__dirname, '../utils/trainerRound.js')).href
  );

  ({ createActiveRound, processRoundSubmission, shouldAutoSubmitAnswer } = trainerRound);
});

test('shouldAutoSubmitAnswer only returns an exact correct positive answer', () => {
  assert.equal(shouldAutoSubmitAnswer('42', 42n), 42n);
  assert.equal(shouldAutoSubmitAnswer('0042', 42n), 42n);
  assert.equal(shouldAutoSubmitAnswer('41', 42n), null);
  assert.equal(shouldAutoSubmitAnswer('', 42n), null);
  assert.equal(shouldAutoSubmitAnswer('abc', 42n), null);
});

test('shouldAutoSubmitAnswer normalizes decimal input variants before comparison', () => {
  const decimalProblem = {
    practiceMode: 'DECIMAL',
    correctAnswer: '0.58'
  };

  assert.equal(shouldAutoSubmitAnswer('0.58', decimalProblem), '0.58');
  assert.equal(shouldAutoSubmitAnswer('0,580', decimalProblem), '0.58');
  assert.equal(shouldAutoSubmitAnswer('00.5800', decimalProblem), '0.58');
  assert.equal(shouldAutoSubmitAnswer('0.581', decimalProblem), null);
  assert.equal(shouldAutoSubmitAnswer('0.', decimalProblem), null);
});

test('processRoundSubmission records an incorrect manual submit and advances', () => {
  const activeRound = createActiveRound(
    {
      practiceMode: 'POSITIVE',
      operation: 'ADDITION',
      leftDigits: 2,
      rightDigits: 1,
      leftDecimalDigits: 2,
      rightDecimalDigits: 2,
      roundSize: 3
    },
    {
      practiceMode: 'POSITIVE',
      operation: 'ADDITION',
      leftOperand: 14,
      rightOperand: 2,
      correctAnswer: 16n
    },
    1000,
    'session-incorrect'
  );

  const submission = processRoundSubmission(activeRound, 15n, 1450, null, createProblemStub);

  assert.equal(submission.ignored, false);
  assert.equal(submission.responseMs, 450);
  assert.equal(submission.attempt.isCorrect, false);
  assert.equal(submission.attempt.submittedAnswer, 15n);
  assert.equal(submission.isComplete, false);
  assert.equal(submission.nextActiveRound.questionId, 2);
  assert.equal(submission.nextActiveRound.attempts.length, 1);
  assert.equal(submission.nextActiveRound.questionStartedAt, 1450);
  assert.equal(submission.nextActiveRound.sessionId, 'session-incorrect');
});

test('processRoundSubmission records a correct submit and advances', () => {
  const activeRound = createActiveRound(
    {
      practiceMode: 'POSITIVE',
      operation: 'MULTIPLICATION',
      leftDigits: 2,
      rightDigits: 2,
      leftDecimalDigits: 2,
      rightDecimalDigits: 2,
      roundSize: 4
    },
    {
      practiceMode: 'POSITIVE',
      operation: 'MULTIPLICATION',
      leftOperand: 12,
      rightOperand: 12,
      correctAnswer: 144n
    },
    500,
    'session-correct'
  );

  const submission = processRoundSubmission(activeRound, 144n, 900, null, createProblemStub);

  assert.equal(submission.attempt.isCorrect, true);
  assert.equal(submission.attempt.responseMs, 400);
  assert.equal(submission.isComplete, false);
  assert.equal(submission.nextActiveRound.questionId, 2);
  assert.equal(submission.nextActiveRound.sessionId, 'session-correct');
});

test('final question completion returns no nextActiveRound', () => {
  const activeRound = {
      settings: {
        practiceMode: 'POSITIVE',
        operation: 'DIVISION',
        leftDigits: 2,
        rightDigits: 1,
        leftDecimalDigits: 2,
        rightDecimalDigits: 2,
        roundSize: 2
      },
      attempts: [
        {
          practiceMode: 'POSITIVE',
          operation: 'DIVISION',
          leftOperand: 81,
          rightOperand: 9,
        correctAnswer: 9n,
        submittedAnswer: 9n,
        isCorrect: true,
        responseMs: 300,
        createdAt: '2026-03-28T00:00:00.000Z'
      }
    ],
      currentProblem: {
        practiceMode: 'POSITIVE',
        operation: 'DIVISION',
        leftOperand: 84,
        rightOperand: 7,
      correctAnswer: 12n
    },
    questionStartedAt: 2000,
    questionId: 2,
    sessionId: 'session-final'
  };

  const submission = processRoundSubmission(activeRound, 12n, 2600, null, createProblemStub);

  assert.equal(submission.isComplete, true);
  assert.equal(submission.nextActiveRound, null);
  assert.equal(submission.attempts.length, 2);
  assert.equal(submission.attempt.isCorrect, true);
});

test('duplicate submissions for the same question are ignored', () => {
  const activeRound = createActiveRound(
    {
      practiceMode: 'POSITIVE',
      operation: 'SUBTRACTION',
      leftDigits: 3,
      rightDigits: 2,
      leftDecimalDigits: 2,
      rightDecimalDigits: 2,
      roundSize: 5
    },
    {
      practiceMode: 'POSITIVE',
      operation: 'SUBTRACTION',
      leftOperand: 305,
      rightOperand: 14,
      correctAnswer: 291n
    },
    1200,
    'session-dedupe'
  );

  const firstSubmission = processRoundSubmission(
    activeRound,
    291n,
    1800,
    null,
    createProblemStub
  );
  const duplicateSubmission = processRoundSubmission(
    activeRound,
    291n,
    1801,
    firstSubmission.handledQuestionId,
    createProblemStub
  );

  assert.equal(firstSubmission.ignored, false);
  assert.equal(duplicateSubmission.ignored, true);
  assert.equal(duplicateSubmission.handledQuestionId, firstSubmission.handledQuestionId);
});

test('processRoundSubmission records decimal manual answers and advances with decimal settings', () => {
  const activeRound = createActiveRound(
    {
      practiceMode: 'DECIMAL',
      operation: 'ADDITION',
      leftDigits: 2,
      rightDigits: 1,
      leftDecimalDigits: 2,
      rightDecimalDigits: 1,
      roundSize: 2
    },
    {
      practiceMode: 'DECIMAL',
      operation: 'ADDITION',
      leftOperand: '12.50',
      rightOperand: '1.25',
      correctAnswer: '13.75'
    },
    1500,
    'session-decimal'
  );

  const submission = processRoundSubmission(
    activeRound,
    '13.75',
    1900,
    null,
    createProblemStub
  );

  assert.equal(submission.ignored, false);
  assert.equal(submission.attempt.isCorrect, true);
  assert.equal(submission.attempt.correctAnswer, '13.75');
  assert.equal(submission.attempt.submittedAnswer, '13.75');
  assert.equal(submission.nextActiveRound.currentProblem.practiceMode, 'DECIMAL');
});
