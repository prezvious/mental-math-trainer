export const MIXED_SUBMISSION_FEEDBACK_STATES = Object.freeze({
  IDLE: 'idle',
  CORRECT: 'correct',
  INCORRECT: 'incorrect'
});

export function sanitizeMixedSubmissionFeedbackState(feedbackState) {
  switch (feedbackState) {
    case MIXED_SUBMISSION_FEEDBACK_STATES.CORRECT:
    case MIXED_SUBMISSION_FEEDBACK_STATES.INCORRECT:
      return feedbackState;
    default:
      return MIXED_SUBMISSION_FEEDBACK_STATES.IDLE;
  }
}

export function getStackedProblemClassNames(
  feedbackState,
  { showAnswerDisplay = true } = {}
) {
  const normalizedFeedbackState = sanitizeMixedSubmissionFeedbackState(feedbackState);
  const problemClassNames = ['stacked-problem'];
  const answerClassNames = ['stacked-problem-answer'];

  if (normalizedFeedbackState === MIXED_SUBMISSION_FEEDBACK_STATES.CORRECT) {
    if (!showAnswerDisplay) {
      problemClassNames.push('is-correct-flash');
    }
    answerClassNames.push('correct-flash');
  }

  if (normalizedFeedbackState === MIXED_SUBMISSION_FEEDBACK_STATES.INCORRECT) {
    if (!showAnswerDisplay) {
      problemClassNames.push('is-incorrect-flash');
    }
    answerClassNames.push('incorrect-flash');
  }

  return {
    feedbackState: normalizedFeedbackState,
    problemClassName: problemClassNames.join(' '),
    answerClassName: answerClassNames.join(' ')
  };
}
