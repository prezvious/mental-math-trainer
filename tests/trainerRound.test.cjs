const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

let createActiveRound;
let processRoundSubmission;
let shouldAutoSubmitAnswer;

function createProblemStub(operation, leftDigits, rightDigits) {
  return {
    operation,
    leftOperand: Number(`${leftDigits}1`),
    rightOperand: Number(`${rightDigits}1`),
    correctAnswer: 11n
  };
}

test.before(async () => {
  const trainerRound = await import(
    pathToFileURL(path.resolve(__dirname, '../utils/trainerRound.js')).href
  );

  ({ createActiveRound, processRoundSubmission, shouldAutoSubmitAnswer } = trainerRound);
});

test('shouldAutoSubmitAnswer only returns an exact correct integer answer', () => {
  assert.equal(shouldAutoSubmitAnswer('42', 42n), 42n);
  assert.equal(shouldAutoSubmitAnswer('0042', 42n), 42n);
  assert.equal(shouldAutoSubmitAnswer('41', 42n), null);
  assert.equal(shouldAutoSubmitAnswer('', 42n), null);
  assert.equal(shouldAutoSubmitAnswer('abc', 42n), null);
});

test('processRoundSubmission records an incorrect manual submit and advances', () => {
  const activeRound = createActiveRound(
    {
      operation: 'ADDITION',
      leftDigits: 2,
      rightDigits: 1,
      roundSize: 3
    },
    {
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
      operation: 'MULTIPLICATION',
      leftDigits: 2,
      rightDigits: 2,
      roundSize: 4
    },
    {
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
      operation: 'DIVISION',
      leftDigits: 2,
      rightDigits: 1,
      roundSize: 2
    },
    attempts: [
      {
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
      operation: 'SUBTRACTION',
      leftDigits: 3,
      rightDigits: 2,
      roundSize: 5
    },
    {
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
