import { TRAINER_INPUT_MODES } from './aiTrainer.js';

export const TRAINER_COMPLETION_STATES = Object.freeze({
  COMPLETED: 'completed',
  ERROR: 'error'
});

export const TRAINER_FINISH_VIEWS = Object.freeze({
  NONE: 'none',
  MANUAL_SUMMARY: 'manual-summary',
  AI_ACTIONS: 'ai-actions',
  AI_ERROR_SUMMARY: 'ai-error-summary',
  AI_TRANSITION: 'ai-transition'
});

export function getTrainerFinishView({
  user,
  activeRound,
  lastRound,
  aiTransitionState
}) {
  if (activeRound) {
    return TRAINER_FINISH_VIEWS.NONE;
  }

  if (
    user &&
    aiTransitionState &&
    lastRound?.sourceMode === TRAINER_INPUT_MODES.AI
  ) {
    return TRAINER_FINISH_VIEWS.AI_TRANSITION;
  }

  if (!lastRound || aiTransitionState) {
    return TRAINER_FINISH_VIEWS.NONE;
  }

  if (lastRound.sourceMode === TRAINER_INPUT_MODES.MANUAL) {
    return TRAINER_FINISH_VIEWS.MANUAL_SUMMARY;
  }

  if (user && lastRound.sourceMode === TRAINER_INPUT_MODES.AI) {
    return lastRound.completionState === TRAINER_COMPLETION_STATES.ERROR
      ? TRAINER_FINISH_VIEWS.AI_ERROR_SUMMARY
      : TRAINER_FINISH_VIEWS.AI_ACTIONS;
  }

  return TRAINER_FINISH_VIEWS.NONE;
}
