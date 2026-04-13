const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

let TRAINER_COMPLETION_STATES;
let TRAINER_FINISH_VIEWS;
let TRAINER_INPUT_MODES;
let getTrainerFinishView;

test.before(async () => {
  const aiTrainer = await import(
    pathToFileURL(path.resolve(__dirname, '../utils/aiTrainer.js')).href
  );
  const trainerPresentation = await import(
    pathToFileURL(path.resolve(__dirname, '../utils/trainerPresentation.js')).href
  );

  ({ TRAINER_INPUT_MODES } = aiTrainer);
  ({
    TRAINER_COMPLETION_STATES,
    TRAINER_FINISH_VIEWS,
    getTrainerFinishView
  } = trainerPresentation);
});

test('manual completion stays on the summary view', () => {
  const finishView = getTrainerFinishView({
    user: { id: 'user-1' },
    activeRound: null,
    aiTransitionState: null,
    lastRound: {
      sourceMode: TRAINER_INPUT_MODES.MANUAL,
      completionState: TRAINER_COMPLETION_STATES.COMPLETED
    }
  });

  assert.equal(finishView, TRAINER_FINISH_VIEWS.MANUAL_SUMMARY);
});

test('successful AI completion uses the action panel instead of the summary', () => {
  const finishView = getTrainerFinishView({
    user: { id: 'user-1' },
    activeRound: null,
    aiTransitionState: null,
    lastRound: {
      sourceMode: TRAINER_INPUT_MODES.AI,
      completionState: TRAINER_COMPLETION_STATES.COMPLETED
    }
  });

  assert.equal(finishView, TRAINER_FINISH_VIEWS.AI_ACTIONS);
});

test('auto cycle transition keeps the dedicated transition view', () => {
  const finishView = getTrainerFinishView({
    user: { id: 'user-1' },
    activeRound: null,
    aiTransitionState: { durationMs: 2000 },
    lastRound: {
      sourceMode: TRAINER_INPUT_MODES.AI,
      completionState: TRAINER_COMPLETION_STATES.COMPLETED
    }
  });

  assert.equal(finishView, TRAINER_FINISH_VIEWS.AI_TRANSITION);
});

test('AI solve errors stay on the summary-based error path', () => {
  const finishView = getTrainerFinishView({
    user: { id: 'user-1' },
    activeRound: null,
    aiTransitionState: null,
    lastRound: {
      sourceMode: TRAINER_INPUT_MODES.AI,
      completionState: TRAINER_COMPLETION_STATES.ERROR
    }
  });

  assert.equal(finishView, TRAINER_FINISH_VIEWS.AI_ERROR_SUMMARY);
});
