const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

let buildAiModeCustomLogRow;
let buildAiModeTrainerLogRow;
let createActiveRound;
let processRoundSubmission;
let solveTrainerProblem;

function createProblemStub(operation, leftDigits, rightDigits) {
  return {
    operation,
    leftOperand: Number(`${leftDigits}2`),
    rightOperand: Number(`${rightDigits}3`),
    correctAnswer: 25n
  };
}

test.before(async () => {
  const aiModeLogs = await import(
    pathToFileURL(path.resolve(__dirname, '../utils/aiModeLogs.js')).href
  );
  const aiTrainer = await import(
    pathToFileURL(path.resolve(__dirname, '../utils/aiTrainer.js')).href
  );
  const trainerRound = await import(
    pathToFileURL(path.resolve(__dirname, '../utils/trainerRound.js')).href
  );

  ({ buildAiModeCustomLogRow, buildAiModeTrainerLogRow } = aiModeLogs);
  ({ solveTrainerProblem } = aiTrainer);
  ({ createActiveRound, processRoundSubmission } = trainerRound);
});

test('solveTrainerProblem auto-solves a generated question and produces an AI trainer log row', () => {
  const problem = {
    operation: 'MULTIPLICATION',
    leftOperand: 123456789,
    rightOperand: 12,
    correctAnswer: 1481481468n
  };

  const solved = solveTrainerProblem(problem, {
    performanceNow: (() => {
      const values = [10, 18];
      return () => values.shift();
    })()
  });

  assert.equal(solved.submittedAnswer, 1481481468n);
  assert.equal(solved.responseMs, 8);
  assert.equal(solved.promptText, '123456789 × 12');

  const activeRound = createActiveRound(
    {
      operation: 'MULTIPLICATION',
      leftDigits: 3,
      rightDigits: 2,
      roundSize: 2
    },
    problem,
    1000,
    'session-ai'
  );

  const submission = processRoundSubmission(
    activeRound,
    solved.submittedAnswer,
    1008,
    null,
    createProblemStub
  );

  assert.equal(submission.attempt.isCorrect, true);
  const row = buildAiModeTrainerLogRow(
    problem,
    solved,
    'user-1',
    'session-ai',
    1,
    submission.attempt.createdAt
  );

  assert.equal(row.source_kind, 'trainer');
  assert.equal(row.operation_label, 'MULTIPLICATION');
  assert.equal(row.prompt_text, '123456789 × 12');
  assert.equal(row.normalized_expression, '123456789 * 12');
});

test('buildAiModeCustomLogRow stores custom solves as one-question custom sessions', () => {
  const row = buildAiModeCustomLogRow(
    {
      normalizedExpression: '1 / 3',
      kind: 'fraction',
      exactText: '1/3',
      decimalText: '0.(3)',
      responseMs: 4
    },
    '1/3',
    'user-1',
    'session-custom'
  );

  assert.equal(row.source_kind, 'custom');
  assert.equal(row.operation_label, 'CUSTOM');
  assert.equal(row.question_index, 1);
  assert.equal(row.result_exact_text, '1/3');
});
