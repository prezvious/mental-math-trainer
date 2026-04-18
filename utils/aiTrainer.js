import { solveAiExpression } from './aiMath.js';
import { PRACTICE_MODES, parseTrainerAnswer } from './mathEngine.js';
import { processRoundSubmission } from './trainerRound.js';

export const TRAINER_INPUT_MODES = Object.freeze({
  MANUAL: 'manual',
  AI: 'ai'
});

const ASCII_OPERATOR_SYMBOLS = Object.freeze({
  ADDITION: '+',
  SUBTRACTION: '-',
  MULTIPLICATION: '*',
  DIVISION: '/',
  EXPONENTIATION: '^'
});

const DISPLAY_OPERATOR_SYMBOLS = Object.freeze({
  ADDITION: '+',
  SUBTRACTION: '-',
  MULTIPLICATION: '×',
  DIVISION: '÷',
  EXPONENTIATION: '^'
});

function defaultPerformanceNow() {
  return typeof performance !== 'undefined' && typeof performance.now === 'function'
    ? performance.now()
    : Date.now();
}

export function formatTrainerProblem(problem, { pretty = false } = {}) {
  const symbols = pretty ? DISPLAY_OPERATOR_SYMBOLS : ASCII_OPERATOR_SYMBOLS;

  if (problem.operation === 'EXPONENTIATION') {
    return `${problem.leftOperand} ${symbols.EXPONENTIATION} ${problem.rightOperand}`;
  }

  return `${problem.leftOperand} ${symbols[problem.operation]} ${problem.rightOperand}`;
}

export function solveTrainerProblem(
  problem,
  { solveExpression = solveAiExpression, performanceNow = defaultPerformanceNow } = {}
) {
  const promptText = formatTrainerProblem(problem, { pretty: true });
  const startedAt = performanceNow();
  const result = solveExpression(formatTrainerProblem(problem));
  const finishedAt = performanceNow();

  if (problem.practiceMode === PRACTICE_MODES.DECIMAL) {
    if (result.kind === 'fraction' && /[()]/.test(result.decimalText)) {
      throw new Error('AI MODE decimal trainer questions must resolve to terminating decimal answers.');
    }

    const submittedAnswer = parseTrainerAnswer(
      result.kind === 'fraction' ? result.decimalText : result.exactText,
      PRACTICE_MODES.DECIMAL
    );
    if (submittedAnswer === null) {
      throw new Error('AI MODE could not normalize the decimal trainer answer.');
    }

    return {
      promptText,
      normalizedExpression: result.normalizedExpression,
      resultKind: submittedAnswer.includes('.') ? 'decimal' : 'integer',
      resultExactText: submittedAnswer,
      resultDecimalText: submittedAnswer,
      submittedAnswer,
      responseMs: Math.max(1, Math.round(finishedAt - startedAt))
    };
  }

  if (result.kind !== 'integer') {
    throw new Error('AI MODE trainer questions must resolve to integer answers.');
  }

  return {
    promptText,
    normalizedExpression: result.normalizedExpression,
    resultKind: result.kind,
    resultExactText: result.exactText,
    resultDecimalText: result.decimalText,
    submittedAnswer: BigInt(result.exactText),
    responseMs: Math.max(1, Math.round(finishedAt - startedAt))
  };
}

export function advanceAiTrainerRound(
  activeRound,
  handledQuestionId = null,
  {
    maxSteps = 1,
    solveProblem = solveTrainerProblem,
    processSubmission = processRoundSubmission
  } = {}
) {
  if (!activeRound || activeRound.sourceMode !== TRAINER_INPUT_MODES.AI) {
    return {
      handledQuestionId,
      isComplete: false,
      attempts: activeRound?.attempts || [],
      nextActiveRound: activeRound,
      solvedSteps: []
    };
  }

  let nextHandledQuestionId = handledQuestionId;
  let workingRound = activeRound;
  const solvedSteps = [];

  for (let step = 0; step < maxSteps; step += 1) {
    const solvedProblem = solveProblem(workingRound.currentProblem);
    const submittedAt = workingRound.questionStartedAt + solvedProblem.responseMs;
    const submission = processSubmission(
      workingRound,
      solvedProblem.submittedAnswer,
      submittedAt,
      nextHandledQuestionId
    );

    if (submission.ignored) {
      return {
        handledQuestionId: nextHandledQuestionId,
        isComplete: false,
        attempts: workingRound.attempts,
        nextActiveRound: workingRound,
        solvedSteps
      };
    }

    nextHandledQuestionId = submission.handledQuestionId;
    solvedSteps.push({
      problem: workingRound.currentProblem,
      solvedProblem,
      submission
    });

    if (submission.isComplete) {
      return {
        handledQuestionId: nextHandledQuestionId,
        isComplete: true,
        attempts: submission.attempts,
        nextActiveRound: null,
        solvedSteps
      };
    }

    workingRound = {
      ...submission.nextActiveRound,
      sourceMode: TRAINER_INPUT_MODES.AI
    };
  }

  return {
    handledQuestionId: nextHandledQuestionId,
    isComplete: false,
    attempts: workingRound.attempts,
    nextActiveRound: workingRound,
    solvedSteps
  };
}
