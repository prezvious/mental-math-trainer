const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

let buildAiModeCustomLogRow;
let buildAiModeTrainerLogRow;
let advanceAiTrainerRound;
let createActiveRound;
let processRoundSubmission;
let solveTrainerProblem;

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
        ? `${settings.leftDigits}.${'2'.repeat(settings.leftDecimalDigits)}`
        : Number(`${settings.leftDigits}2`),
    rightOperand:
      settings.practiceMode === 'DECIMAL'
        ? `${settings.rightDigits}.${'3'.repeat(settings.rightDecimalDigits)}`
        : Number(`${settings.rightDigits}3`),
    correctAnswer: settings.practiceMode === 'DECIMAL' ? '25.5' : 25n
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
  ({ advanceAiTrainerRound, solveTrainerProblem } = aiTrainer);
  ({ createActiveRound, processRoundSubmission } = trainerRound);
});

test('solveTrainerProblem auto-solves a generated question and produces an AI trainer log row', () => {
  const problem = {
    practiceMode: 'POSITIVE',
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
      practiceMode: 'POSITIVE',
      operation: 'MULTIPLICATION',
      leftDigits: 3,
      rightDigits: 2,
      leftDecimalDigits: 2,
      rightDecimalDigits: 2,
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

test('solveTrainerProblem normalizes terminating decimal results for decimal practice mode', () => {
  const problem = {
    practiceMode: 'DECIMAL',
    operation: 'DIVISION',
    leftOperand: '1.750',
    rightOperand: '2.50',
    correctAnswer: '0.7'
  };

  const solved = solveTrainerProblem(problem, {
    solveExpression: () => ({
      normalizedExpression: '1.750 / 2.50',
      kind: 'fraction',
      exactText: '7/10',
      decimalText: '0.7'
    }),
    performanceNow: (() => {
      const values = [100, 104];
      return () => values.shift();
    })()
  });

  assert.equal(solved.submittedAnswer, '0.7');
  assert.equal(solved.resultKind, 'decimal');
  assert.equal(solved.resultExactText, '0.7');
  assert.equal(solved.resultDecimalText, '0.7');
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

test('advanceAiTrainerRound progresses multiple AI questions in one batch', () => {
  const activeRound = {
    ...createActiveRound(
      {
        practiceMode: 'POSITIVE',
        operation: 'ADDITION',
        leftDigits: 2,
        rightDigits: 2,
        leftDecimalDigits: 2,
        rightDecimalDigits: 2,
        roundSize: 4
      },
      {
        practiceMode: 'POSITIVE',
        operation: 'ADDITION',
        leftOperand: 11,
        rightOperand: 12,
        correctAnswer: 23n
      },
      1000,
      'session-batch'
    ),
    sourceMode: 'ai'
  };

  let invocationCount = 0;
  const result = advanceAiTrainerRound(activeRound, null, {
    maxSteps: 3,
    solveProblem: (problem) => {
      invocationCount += 1;
      return {
        promptText: `${problem.leftOperand} + ${problem.rightOperand}`,
        normalizedExpression: `${problem.leftOperand} + ${problem.rightOperand}`,
        resultKind: 'integer',
        resultExactText: String(problem.correctAnswer),
        resultDecimalText: String(problem.correctAnswer),
        submittedAnswer: problem.correctAnswer,
        responseMs: 5
      };
    },
    processSubmission: (roundSnapshot, submittedAnswer, submittedAt, handledQuestionId) =>
      processRoundSubmission(
        roundSnapshot,
        submittedAnswer,
        submittedAt,
        handledQuestionId,
        () => ({
          practiceMode: 'POSITIVE',
          operation: 'ADDITION',
          leftOperand: 20 + invocationCount,
          rightOperand: 3,
          correctAnswer: BigInt(23 + invocationCount)
        })
      )
  });

  assert.equal(result.isComplete, false);
  assert.equal(result.solvedSteps.length, 3);
  assert.equal(result.handledQuestionId, 3);
  assert.equal(result.attempts.length, 3);
  assert.equal(result.nextActiveRound.questionId, 4);
  assert.equal(result.nextActiveRound.attempts.length, 3);
});
