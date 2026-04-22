const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

let TRAINER_COMPLETION_STATES;
let TRAINER_FINISH_VIEWS;
let TRAINER_INPUT_MODES;
let getTrainerChromeState;
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
    getTrainerChromeState,
    getTrainerFinishView
  } = trainerPresentation);
});

test('idle trainer chrome shows hero, admin controls, and the blueprint panel', () => {
  const chromeState = getTrainerChromeState({
    activeRound: null,
    lastRound: null,
    aiTransitionState: null,
    hasAdminControl: true
  });

  assert.deepEqual(chromeState, {
    shouldHideTrainerPanels: false,
    shouldShowHeroPanel: true,
    shouldShowAdminControl: true,
    shouldShowBlueprintPanel: true,
    isFocusedArena: false
  });
});

test('active rounds hide trainer chrome and enable the focused arena layout', () => {
  const chromeState = getTrainerChromeState({
    activeRound: { sourceMode: TRAINER_INPUT_MODES.MANUAL },
    lastRound: null,
    aiTransitionState: null,
    hasAdminControl: true
  });

  assert.deepEqual(chromeState, {
    shouldHideTrainerPanels: true,
    shouldShowHeroPanel: false,
    shouldShowAdminControl: false,
    shouldShowBlueprintPanel: false,
    isFocusedArena: true
  });
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
  assert.deepEqual(
    getTrainerChromeState({
      activeRound: null,
      lastRound: {
        sourceMode: TRAINER_INPUT_MODES.MANUAL,
        completionState: TRAINER_COMPLETION_STATES.COMPLETED
      },
      aiTransitionState: null,
      hasAdminControl: true
    }),
    {
      shouldHideTrainerPanels: true,
      shouldShowHeroPanel: false,
      shouldShowAdminControl: false,
      shouldShowBlueprintPanel: false,
      isFocusedArena: false
    }
  );
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
  assert.deepEqual(
    getTrainerChromeState({
      activeRound: null,
      lastRound: {
        sourceMode: TRAINER_INPUT_MODES.AI,
        completionState: TRAINER_COMPLETION_STATES.COMPLETED
      },
      aiTransitionState: { durationMs: 2000 },
      hasAdminControl: true
    }),
    {
      shouldHideTrainerPanels: true,
      shouldShowHeroPanel: false,
      shouldShowAdminControl: false,
      shouldShowBlueprintPanel: false,
      isFocusedArena: false
    }
  );
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
