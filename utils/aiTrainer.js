import { solveAiExpression } from './aiMath.js';

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
