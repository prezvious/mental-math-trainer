import {
  createMixedProblem,
  getEnabledOperations,
  getDifficultyForOperation,
  pickRandomOperation
} from './mixedDifficulty.js';

export { shouldAutoSubmitAnswer } from './trainerRound.js';

export function createMixedActiveRound(
  settings,
  firstProblem,
  questionStartedAt,
  sessionId = null
) {
  return {
    sessionId,
    settings,
    attempts: [],
    currentProblem: firstProblem,
    questionStartedAt,
    questionId: 1
  };
}

function createMixedAttempt(
  currentProblem,
  submittedAnswer,
  responseMs,
  createdAt = new Date().toISOString()
) {
  return {
    operation: currentProblem.operation,
    leftOperand: currentProblem.leftOperand,
    rightOperand: currentProblem.rightOperand,
    correctAnswer: currentProblem.correctAnswer,
    submittedAnswer,
    isCorrect: submittedAnswer === currentProblem.correctAnswer,
    responseMs,
    digitsLeft: currentProblem.digitsLeft,
    digitsRight: currentProblem.digitsRight,
    createdAt
  };
}

function generateNextMixedProblem(settings) {
  const enabled = getEnabledOperations(settings);
  const operation = pickRandomOperation(enabled);
  const difficulty = getDifficultyForOperation(settings, operation);
  return createMixedProblem(operation, difficulty);
}

function resolveMixedRoundSubmission(
  activeRound,
  submittedAnswer,
  responseMs,
  nextQuestionStartedAt,
  createdAt = new Date(nextQuestionStartedAt).toISOString()
) {
  const attempt = createMixedAttempt(
    activeRound.currentProblem,
    submittedAnswer,
    responseMs,
    createdAt
  );
  const attempts = [...activeRound.attempts, attempt];
  const isComplete = attempts.length >= activeRound.settings.roundSize;

  if (isComplete) {
    return { attempt, attempts, isComplete, nextActiveRound: null };
  }

  const nextProblem = generateNextMixedProblem(activeRound.settings);

  return {
    attempt,
    attempts,
    isComplete,
    nextActiveRound: {
      ...activeRound,
      attempts,
      currentProblem: nextProblem,
      questionStartedAt: nextQuestionStartedAt,
      questionId: activeRound.questionId + 1
    }
  };
}

export function processMixedRoundSubmission(
  activeRound,
  submittedAnswer,
  submittedAt,
  handledQuestionId
) {
  if (!activeRound) {
    return { ignored: true, handledQuestionId };
  }

  const questionId = activeRound.questionId;
  if (handledQuestionId === questionId) {
    return { ignored: true, handledQuestionId };
  }

  const responseMs = Math.max(1, submittedAt - activeRound.questionStartedAt);
  return {
    ignored: false,
    handledQuestionId: questionId,
    responseMs,
    ...resolveMixedRoundSubmission(
      activeRound,
      submittedAnswer,
      responseMs,
      submittedAt,
      new Date(submittedAt).toISOString()
    )
  };
}

export function buildMixedProgressLogRows(attempts, userId, sessionId) {
  return attempts.map((attempt, index) =>
    buildMixedProgressLogRow(attempt, userId, sessionId, index + 1)
  );
}

export function buildMixedProgressLogRow(attempt, userId, sessionId, questionIndex) {
  return {
    user_id: userId,
    session_id: sessionId,
    question_index: questionIndex,
    operation: attempt.operation,
    digits_left: attempt.digitsLeft,
    digits_right: attempt.digitsRight,
    left_operand: attempt.leftOperand,
    right_operand: attempt.rightOperand,
    correct_answer: attempt.correctAnswer.toString(),
    submitted_answer: attempt.submittedAnswer.toString(),
    is_correct: attempt.isCorrect,
    response_ms: attempt.responseMs
  };
}
