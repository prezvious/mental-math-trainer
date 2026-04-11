import { createProblem, parseIntegerInput } from './mathEngine.js';

export function createActiveRound(
  settings,
  currentProblem,
  questionStartedAt,
  sessionId = null
) {
  return {
    sessionId,
    settings,
    attempts: [],
    currentProblem,
    questionStartedAt,
    questionId: 1
  };
}

export function shouldAutoSubmitAnswer(inputValue, correctAnswer) {
  const parsedAnswer = parseIntegerInput(inputValue);
  return parsedAnswer !== null && parsedAnswer === correctAnswer ? parsedAnswer : null;
}

export function createAttempt(
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
    createdAt
  };
}

export function resolveRoundSubmission(
  activeRound,
  submittedAnswer,
  responseMs,
  nextQuestionStartedAt,
  createProblemImpl = createProblem,
  createdAt = new Date(nextQuestionStartedAt).toISOString()
) {
  const attempt = createAttempt(
    activeRound.currentProblem,
    submittedAnswer,
    responseMs,
    createdAt
  );
  const attempts = [...activeRound.attempts, attempt];
  const isComplete = attempts.length >= activeRound.settings.roundSize;

  if (isComplete) {
    return {
      attempt,
      attempts,
      isComplete,
      nextActiveRound: null
    };
  }

  const nextProblem = createProblemImpl(
    activeRound.settings.operation,
    activeRound.settings.leftDigits,
    activeRound.settings.rightDigits,
    activeRound.settings.maxBase
  );

    return {
      attempt,
      attempts,
      isComplete,
      nextActiveRound: {
        ...activeRound,
        sessionId: activeRound.sessionId,
        attempts,
        currentProblem: nextProblem,
        questionStartedAt: nextQuestionStartedAt,
      questionId: activeRound.questionId + 1
    }
  };
}

export function processRoundSubmission(
  activeRound,
  submittedAnswer,
  submittedAt,
  handledQuestionId,
  createProblemImpl = createProblem
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
    ...resolveRoundSubmission(
      activeRound,
      submittedAnswer,
      responseMs,
      submittedAt,
      createProblemImpl,
      new Date(submittedAt).toISOString()
    )
  };
}
