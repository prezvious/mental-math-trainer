const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

let getStackedProblemClassNames;
let MIXED_SUBMISSION_FEEDBACK_STATES;

test.before(async () => {
  const mixedTrainerPresentation = await import(
    pathToFileURL(path.resolve(__dirname, '../utils/mixedTrainerPresentation.js')).href
  );

  ({ getStackedProblemClassNames, MIXED_SUBMISSION_FEEDBACK_STATES } =
    mixedTrainerPresentation);
});

test('StackedProblem feedback mapping keeps the container neutral for visible correct answers', () => {
  const classNames = getStackedProblemClassNames(
    MIXED_SUBMISSION_FEEDBACK_STATES.CORRECT,
    {
      showAnswerDisplay: true
    }
  );

  assert.equal(classNames.problemClassName, 'stacked-problem');
  assert.equal(classNames.answerClassName, 'stacked-problem-answer correct-flash');
});

test('StackedProblem feedback mapping adds incorrect flash classes for hidden answer displays', () => {
  const classNames = getStackedProblemClassNames(
    MIXED_SUBMISSION_FEEDBACK_STATES.INCORRECT,
    {
      showAnswerDisplay: false
    }
  );

  assert.equal(classNames.problemClassName, 'stacked-problem is-incorrect-flash');
  assert.equal(classNames.answerClassName, 'stacked-problem-answer incorrect-flash');
});

test('StackedProblem feedback mapping falls back to idle for unknown states', () => {
  const classNames = getStackedProblemClassNames('not-a-real-state');

  assert.equal(classNames.feedbackState, MIXED_SUBMISSION_FEEDBACK_STATES.IDLE);
  assert.equal(classNames.problemClassName, 'stacked-problem');
  assert.equal(classNames.answerClassName, 'stacked-problem-answer');
});
