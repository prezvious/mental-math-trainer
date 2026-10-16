import Head from 'next/head';
import { useRouter } from 'next/router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import HotkeyHint from 'components/HotkeyHint.js';
import EndRoundDialog from 'components/EndRoundDialog.js';
import IconLabel from 'components/IconLabel.js';
import PageIntro from 'components/PageIntro.js';
import RoundSummaryPanel from 'components/RoundSummaryPanel.js';
import Keypad from 'components/mixed/Keypad.js';
import ProgressBar from 'components/mixed/ProgressBar.js';
import QuestionTimer from 'components/mixed/QuestionTimer.js';
import StackedProblem from 'components/mixed/StackedProblem.js';
import PlayCircleIcon from 'images/phosphor/play-circle-bold.svg';
import SquaresFourIcon from 'images/phosphor/squares-four.svg';
import { useActiveSession } from 'utils/activeSessionContext.js';
import {
  createMixedProblem,
  DIFFICULTY_LEVELS,
  getEnabledOperations,
  getDifficultyForOperation,
  MIXED_OPERATION_META,
  MIXED_OPERATIONS,
  pickRandomOperation,
  RUN_LENGTHS,
  sanitizeMixedSettings
} from 'utils/mixedDifficulty.js';
import { MixedTrainerProvider, useMixedTrainer } from 'utils/mixedTrainerContext.js';
import {
  buildMixedProgressLogRow,
  createMixedActiveRound,
  processMixedRoundSubmission,
  shouldAutoSubmitAnswer
} from 'utils/mixedTrainerRound.js';
import { MIXED_SUBMISSION_FEEDBACK_STATES } from 'utils/mixedTrainerPresentation.js';
import {
  computeRoundStats,
  parseIntegerInput
} from 'utils/mathEngine.js';
import {
  createProgressLogBuffer
} from 'utils/progressLogs.js';
import {
  ROUND_CONTROL_HOTKEY,
  formatHotkeyLabel,
  isShortcutEventEligible
} from 'utils/hotkeys.js';
import { getSupabaseRestConfig } from 'utils/supabaseClient.js';
import { finishGuestSession, recordGuestAttempt, startGuestSession, touchGuestSession } from 'utils/progressStorage.js';
import { useSupabaseAuth } from 'utils/supabaseAuthContext.js';

const PRIMARY_ACTION_HOTKEY = formatHotkeyLabel(ROUND_CONTROL_HOTKEY);
const DESKTOP_MIXED_INPUT_QUERY =
  '(min-width: 1080px) and (hover: hover) and (pointer: fine)';

function createSessionId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.floor(Math.random() * 16);
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function getPathnameFromUrl(url) {
  if (typeof window === 'undefined') {
    return url;
  }

  try {
    return new URL(url, window.location.origin).pathname;
  } catch (_error) {
    return url;
  }
}

function createRoundSummary(attempts, settings, userId, wasTerminated, sessionId) {
  return {
    ...computeRoundStats(attempts),
    attempts,
    settings,
    sessionId,
    ownerId: userId || null,
    finishedAt: new Date().toISOString(),
    wasTerminated,
    saveState: 'saving',
    saveError: ''
  };
}

function getSaveStatusMessage(lastRound) {
  if (lastRound.saveState === 'saving') {
    return lastRound.wasTerminated
      ? 'Ending session and saving progress...'
      : 'Saving this round...';
  }

  if (lastRound.saveState === 'saved') {
    return lastRound.wasTerminated
      ? 'Session ended early and progress was saved to your history.'
      : 'Round saved to your progress history.';
  }

  if (lastRound.saveState === 'device-saved') {
    return lastRound.wasTerminated
      ? 'Ended early. Submitted answers were saved on this device.'
      : 'Round saved on this device.';
  }

  if (lastRound.saveState === 'idle') {
    return lastRound.wasTerminated
      ? 'Session ended early. Sign in to store partial progress.'
      : 'Sign in to store completed rounds.';
  }

  if (lastRound.saveState === 'error') {
    return lastRound.wasTerminated
      ? `Could not save this ended session: ${lastRound.saveError}`
      : `Could not save this round: ${lastRound.saveError}`;
  }

  return '';
}

const DIFFICULTY_LABELS = {
  off: "Don't train",
  warmup: 'Warm up',
  easy: 'Easy',
  medium: 'Medium',
  hard: 'Hard',
  expert: 'Expert'
};

const OPERATION_SETTING_KEYS = {
  EXPONENTIATION: 'exponentiationDifficulty',
  MULTIPLICATION: 'multiplicationDifficulty',
  ADDITION: 'additionDifficulty',
  SUBTRACTION: 'subtractionDifficulty',
  DIVISION: 'divisionDifficulty'
};

const SUBMISSION_FEEDBACK_MS = 400;

function MixedTrainerContent() {
  const router = useRouter();
  const { client, session, user } = useSupabaseAuth();
  const { registerActiveSessionTerminator, registerActiveSessionExitHandler, requestActiveSessionExit } = useActiveSession();
  const { mixedSettings: settings, isLoadingMixedSettings, upsertMixedSettings } =
    useMixedTrainer();

  const [activeRound, setActiveRound] = useState(null);
  const [endDialogOpen, setEndDialogOpen] = useState(false);
  const [isEndingRound, setIsEndingRound] = useState(false);
  const [answerInput, setAnswerInput] = useState('');
  const [submissionFeedbackState, setSubmissionFeedbackState] = useState(
    MIXED_SUBMISSION_FEEDBACK_STATES.IDLE
  );
  const [lastRound, setLastRound] = useState(null);
  const [isDesktopMixedInput, setIsDesktopMixedInput] = useState(false);
  const handledQuestionIdRef = useRef(null);
  const answerInputRef = useRef(null);
  const hiddenInputRef = useRef(null);
  const flashTimeoutRef = useRef(null);
  const feedbackDueAtRef = useRef(0);
  const feedbackRemainingRef = useRef(0);
  const advanceFeedbackRef = useRef(null);
  const exitPromiseRef = useRef(null);
  const resolveExitRef = useRef(null);
  const dialogStartedAtRef = useRef(0);
  const pendingAdvanceRef = useRef(null);
  const activeRoundRef = useRef(activeRound);
  const clientRef = useRef(client);
  const accessTokenRef = useRef(session?.access_token ?? null);
  const isMountedRef = useRef(false);
  const terminationPromiseRef = useRef(null);
  const guestCheckpointRef = useRef(Promise.resolve());
  const guestSaveErrorRef = useRef(null);
  const terminateSessionRef = useRef(async () => ({ handled: false }));
  const userId = user?.id ?? null;
  const previousUserIdRef = useRef(userId);
  const progressBuffer = useMemo(
    () =>
      createProgressLogBuffer({
        getClient: () => clientRef.current,
        getAccessToken: () => accessTokenRef.current,
        getRestConfig: getSupabaseRestConfig
      }),
    []
  );

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (flashTimeoutRef.current) {
        clearTimeout(flashTimeoutRef.current);
      }
      progressBuffer.dispose();
    };
  }, [progressBuffer]);

  useEffect(() => {
    clientRef.current = client;
  }, [client]);

  useEffect(() => {
    accessTokenRef.current = session?.access_token ?? null;
  }, [session]);

  useEffect(() => {
    activeRoundRef.current = activeRound;
  }, [activeRound]);

  useEffect(() => {
    if (!activeRound?.sessionId || userId) return undefined;
    const interval = window.setInterval(() => { void touchGuestSession(activeRound.sessionId).catch(() => {}); }, 20000);
    return () => window.clearInterval(interval);
  }, [activeRound?.sessionId, userId]);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return undefined;
    }

    const mediaQuery = window.matchMedia(DESKTOP_MIXED_INPUT_QUERY);
    const syncDesktopMixedInput = () => {
      setIsDesktopMixedInput(mediaQuery.matches);
    };

    syncDesktopMixedInput();

    if (typeof mediaQuery.addEventListener === 'function') {
      mediaQuery.addEventListener('change', syncDesktopMixedInput);
      return () => mediaQuery.removeEventListener('change', syncDesktopMixedInput);
    }

    mediaQuery.addListener(syncDesktopMixedInput);
    return () => mediaQuery.removeListener(syncDesktopMixedInput);
  }, []);

  useEffect(() => {
    const previousUserId = previousUserIdRef.current;
    previousUserIdRef.current = userId;

    if (previousUserId === null || previousUserId === userId) {
      return;
    }

    progressBuffer.clear();
    pendingAdvanceRef.current = null;
    setActiveRound(null);
    setAnswerInput('');
    setSubmissionFeedbackState(MIXED_SUBMISSION_FEEDBACK_STATES.IDLE);
    setLastRound(null);
    handledQuestionIdRef.current = null;
  }, [progressBuffer, userId]);

  useEffect(() => {
    if (!activeRound) {
      return;
    }

    const targetInput = isDesktopMixedInput ? answerInputRef.current : hiddenInputRef.current;
    targetInput?.focus();
  }, [activeRound, activeRound?.questionId, isDesktopMixedInput]);

  const enabledOperations = useMemo(
    () => getEnabledOperations(settings),
    [settings]
  );
  const canStart = enabledOperations.length > 0;
  const isSubmissionFeedbackActive =
    submissionFeedbackState !== MIXED_SUBMISSION_FEEDBACK_STATES.IDLE;

  const markSummarySaved = useCallback((sessionId) => {
    if (!isMountedRef.current) {
      return;
    }

    setLastRound((summary) =>
      summary?.sessionId === sessionId ? { ...summary, saveState: 'saved', saveError: '' } : summary
    );
  }, []);

  const markSummaryError = useCallback((sessionId, error, fallbackMessage) => {
    if (!isMountedRef.current) {
      return;
    }

    setLastRound((summary) =>
      summary?.sessionId === sessionId
        ? {
            ...summary,
            saveState: 'error',
            saveError: error?.message || fallbackMessage
          }
        : summary
    );
  }, []);

  const persistQueuedProgress = useCallback(
    async ({ keepalive = false } = {}) => {
      if (!userId || !clientRef.current) {
        return;
      }

      await progressBuffer.flush({ keepalive });
    },
    [progressBuffer, userId]
  );

  const finalizeRound = useCallback(
    async (attempts, { wasTerminated, keepalive = false }) => {
      handledQuestionIdRef.current = null;
      pendingAdvanceRef.current = null;
      const finishingRound = activeRoundRef.current;
      const finishingSessionId = finishingRound?.sessionId;
      activeRoundRef.current = null;
      setActiveRound(null);
      setAnswerInput('');
      setSubmissionFeedbackState(MIXED_SUBMISSION_FEEDBACK_STATES.IDLE);

      const summary = createRoundSummary(attempts, finishingRound?.settings, userId, wasTerminated, finishingSessionId);
      if (isMountedRef.current) {
        setLastRound(summary);
      }

      if (!userId || !clientRef.current) {
        try {
          await guestCheckpointRef.current;
          if (guestSaveErrorRef.current) throw guestSaveErrorRef.current;
          if (finishingSessionId) {
            await finishGuestSession(finishingSessionId, wasTerminated ? 'ended' : 'completed');
          }
          if (isMountedRef.current) {
            setLastRound((current) => current?.sessionId === finishingSessionId ? { ...current, saveState: 'device-saved' } : current);
          }
          return { saved: true, error: null };
        } catch (error) {
          markSummaryError(finishingSessionId, error, 'History could not be saved on this device.');
          return { saved: false, error };
        }
      }

      try {
        await persistQueuedProgress({ keepalive });
        markSummarySaved(finishingSessionId);
        return { saved: true, error: null };
      } catch (error) {
        markSummaryError(
          finishingSessionId,
          error,
          wasTerminated ? 'Unable to save this ended session.' : 'Unable to save this round.'
        );
        return { saved: false, error };
      }
    },
    [markSummaryError, markSummarySaved, persistQueuedProgress, userId]
  );

  const getTerminationAttempts = useCallback(() => {
    const roundSnapshot = activeRoundRef.current;
    if (!roundSnapshot) {
      return [];
    }

    if (
      pendingAdvanceRef.current &&
      pendingAdvanceRef.current.handledQuestionId === roundSnapshot.questionId
    ) {
      return pendingAdvanceRef.current.attempts;
    }

    return roundSnapshot.attempts;
  }, []);

  const terminateActiveRound = useCallback(
    async (_reason, { keepalive = false } = {}) => {
      const roundSnapshot = activeRoundRef.current;
      if (!roundSnapshot) {
        return { handled: false };
      }

      if (terminationPromiseRef.current) {
        return terminationPromiseRef.current;
      }

      const promise = (async () => {
        if (flashTimeoutRef.current) {
          clearTimeout(flashTimeoutRef.current);
          flashTimeoutRef.current = null;
        }

        const attempts = getTerminationAttempts();
        if (!attempts.length) {
          handledQuestionIdRef.current = null;
          pendingAdvanceRef.current = null;
          activeRoundRef.current = null;
          if (isMountedRef.current) {
            setActiveRound(null);
            setAnswerInput('');
            setSubmissionFeedbackState(MIXED_SUBMISSION_FEEDBACK_STATES.IDLE);
          }
          if (!userId) {
            try {
              await guestCheckpointRef.current;
              await finishGuestSession(roundSnapshot.sessionId, 'ended');
            } catch (_error) {
              // No submitted answers need saving.
            }
          }
          return { handled: true, saved: false };
        }

        const persistenceResult = await finalizeRound(attempts, {
          wasTerminated: true,
          keepalive
        });

        return {
          handled: true,
          saved: Boolean(persistenceResult?.saved),
          error: persistenceResult?.error ?? null
        };
      })().finally(() => {
        if (terminationPromiseRef.current === promise) {
          terminationPromiseRef.current = null;
        }
      });

      terminationPromiseRef.current = promise;
      return promise;
    },
    [finalizeRound, getTerminationAttempts, userId]
  );

  useEffect(() => {
    terminateSessionRef.current = terminateActiveRound;
  }, [terminateActiveRound]);

  useEffect(
    () =>
      registerActiveSessionTerminator((reason) => terminateSessionRef.current(reason)),
    [registerActiveSessionTerminator]
  );

  const requestRoundExit = useCallback(() => {
    if (!activeRoundRef.current) return Promise.resolve(true);
    if (exitPromiseRef.current) return exitPromiseRef.current;
    dialogStartedAtRef.current = Date.now();
    if (flashTimeoutRef.current) {
      feedbackRemainingRef.current = Math.max(0, feedbackDueAtRef.current - Date.now());
      clearTimeout(flashTimeoutRef.current);
      flashTimeoutRef.current = null;
    }
    exitPromiseRef.current = new Promise((resolve) => { resolveExitRef.current = resolve; });
    setEndDialogOpen(true);
    return exitPromiseRef.current;
  }, []);

  useEffect(() => {
    if (!activeRound) return undefined;
    return registerActiveSessionExitHandler(requestRoundExit);
  }, [activeRound, registerActiveSessionExitHandler, requestRoundExit]);

  const closeEndDialog = useCallback((confirmed) => {
    if (!confirmed && activeRoundRef.current) {
      const pausedMs = Date.now() - dialogStartedAtRef.current;
      const nextRound = {
        ...activeRoundRef.current,
        questionStartedAt: activeRoundRef.current.questionStartedAt + pausedMs
      };
      activeRoundRef.current = nextRound;
      setActiveRound(nextRound);
      if (pendingAdvanceRef.current) {
        const pending = pendingAdvanceRef.current;
        feedbackDueAtRef.current = Date.now() + feedbackRemainingRef.current;
        flashTimeoutRef.current = setTimeout(() => {
          flashTimeoutRef.current = null;
          void advanceFeedbackRef.current?.(pending);
        }, feedbackRemainingRef.current);
      }
      queueMicrotask(() => (isDesktopMixedInput ? answerInputRef.current : hiddenInputRef.current)?.focus());
    }
    setEndDialogOpen(false);
    setIsEndingRound(false);
    resolveExitRef.current?.(confirmed);
    resolveExitRef.current = null;
    exitPromiseRef.current = null;
  }, [isDesktopMixedInput]);

  const confirmEndRound = useCallback(async () => {
    if (isEndingRound) return;
    setIsEndingRound(true);
    const result = await terminateActiveRound('confirmed-end');
    closeEndDialog(!result.error);
  }, [closeEndDialog, isEndingRound, terminateActiveRound]);

  const beginRound = useCallback(() => {
    if (isLoadingMixedSettings || !canStart) {
      return;
    }

    pendingAdvanceRef.current = null;

    const sanitized = sanitizeMixedSettings(settings);
    const enabled = getEnabledOperations(sanitized);
    const firstOp = pickRandomOperation(enabled);
    const firstDifficulty = getDifficultyForOperation(sanitized, firstOp);
    const firstProblem = createMixedProblem(firstOp, firstDifficulty);
    const questionStartedAt = Date.now();
    const sessionId = createSessionId();

    if (!userId) {
      guestSaveErrorRef.current = null;
      guestCheckpointRef.current = startGuestSession({
        id: sessionId,
        kind: 'mixed',
        settings: sanitized,
        requestedCount: sanitized.roundSize
      }).catch((error) => {
        guestSaveErrorRef.current = error;
      });
    }

    void upsertMixedSettings(sanitized);
    setLastRound(null);
    setAnswerInput('');
    setSubmissionFeedbackState(MIXED_SUBMISSION_FEEDBACK_STATES.IDLE);
    handledQuestionIdRef.current = null;
    const nextRound = createMixedActiveRound(sanitized, firstProblem, questionStartedAt, sessionId);
    activeRoundRef.current = nextRound;
    setActiveRound(nextRound);
  }, [canStart, isLoadingMixedSettings, settings, upsertMixedSettings, userId]);

  const startRound = useCallback(
    (event) => {
      event.preventDefault();
      beginRound();
    },
    [beginRound]
  );

  const handleCustomizeBlueprint = useCallback(() => {
    setLastRound(null);
  }, []);

  const handleStartAgain = useCallback(() => {
    setLastRound(null);
    beginRound();
  }, [beginRound]);

  const retryRoundSave = useCallback(async () => {
    const summary = lastRound;
    if (!summary?.sessionId || summary.saveState !== 'error') return;
    if (summary.ownerId && summary.ownerId !== userId) return;
    setLastRound((current) => current?.sessionId === summary.sessionId
      ? { ...current, saveState: 'saving', saveError: '' } : current);
    try {
      if (summary.ownerId) {
        await persistQueuedProgress();
        markSummarySaved(summary.sessionId);
      } else {
        await startGuestSession({
          id: summary.sessionId, kind: 'mixed', settings: summary.settings,
          requestedCount: summary.settings.roundSize
        });
        for (let index = 0; index < summary.attempts.length; index += 1) {
          const row = buildMixedProgressLogRow(summary.attempts[index], null,
            summary.sessionId, index + 1);
          await recordGuestAttempt(summary.sessionId, index + 1, row);
        }
        await finishGuestSession(summary.sessionId, summary.wasTerminated ? 'ended' : 'completed');
        guestSaveErrorRef.current = null;
        setLastRound((current) => current?.sessionId === summary.sessionId
          ? { ...current, saveState: 'device-saved', saveError: '' } : current);
      }
    } catch (error) {
      markSummaryError(summary.sessionId, error, 'Could not save this round.');
    }
  }, [lastRound, markSummaryError, markSummarySaved, persistQueuedProgress, userId]);

  const handlePrimaryRoundAction = useCallback(() => {
    if (lastRound) {
      handleStartAgain();
      return;
    }

    beginRound();
  }, [beginRound, handleStartAgain, lastRound]);

  useEffect(() => {
    if (
      activeRound ||
      isLoadingMixedSettings ||
      typeof window === 'undefined'
    ) {
      return undefined;
    }

    const handleStartShortcut = (event) => {
      if (event.key !== 'Enter') {
        return;
      }

      if (!isShortcutEventEligible(event)) {
        return;
      }

      event.preventDefault();
      handlePrimaryRoundAction();
    };

    window.addEventListener('keydown', handleStartShortcut);
    return () => window.removeEventListener('keydown', handleStartShortcut);
  }, [activeRound, handlePrimaryRoundAction, isLoadingMixedSettings]);

  useEffect(() => {
    if (!activeRound || typeof window === 'undefined') {
      return undefined;
    }

    const handlePageHide = () => {
      void terminateActiveRound('pagehide', { keepalive: true });
    };

    const handleRouteChangeStart = (url) => {
      if (getPathnameFromUrl(url) !== router.pathname) {
        void terminateActiveRound('route-change');
      }
    };

    window.addEventListener('pagehide', handlePageHide);
    const handleBeforeUnload = (event) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    router.events.on('routeChangeStart', handleRouteChangeStart);

    return () => {
      window.removeEventListener('pagehide', handlePageHide);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      router.events.off('routeChangeStart', handleRouteChangeStart);
    };
  }, [activeRound, router.events, router.pathname, terminateActiveRound]);

  const advanceAfterSubmissionFeedback = useCallback(
    async (submission) => {
      pendingAdvanceRef.current = null;

      const { attempts, isComplete, nextActiveRound } = submission;

      if (isComplete) {
        await finalizeRound(attempts, { wasTerminated: false });
        return;
      }

      setAnswerInput('');
      setSubmissionFeedbackState(MIXED_SUBMISSION_FEEDBACK_STATES.IDLE);
      const nextRound = {
        ...nextActiveRound,
        questionStartedAt: Date.now()
      };
      activeRoundRef.current = nextRound;
      setActiveRound(nextRound);
    },
    [finalizeRound]
  );

  useEffect(() => { advanceFeedbackRef.current = advanceAfterSubmissionFeedback; }, [advanceAfterSubmissionFeedback]);

  const submitAnswer = useCallback(
    (submittedAnswer, submittedAt = Date.now()) => {
      const roundSnapshot = activeRoundRef.current;
      if (!roundSnapshot || isSubmissionFeedbackActive || endDialogOpen) {
        return;
      }

      const submission = processMixedRoundSubmission(
        roundSnapshot,
        submittedAnswer,
        submittedAt,
        handledQuestionIdRef.current
      );

      if (submission.ignored) {
        return;
      }

      handledQuestionIdRef.current = submission.handledQuestionId;

      if (userId) {
        progressBuffer.enqueue(
          buildMixedProgressLogRow(
            submission.attempt,
            userId,
            roundSnapshot.sessionId,
            submission.attempts.length
          )
        );
      } else {
        const row = buildMixedProgressLogRow(
          submission.attempt,
          null,
          roundSnapshot.sessionId,
          submission.attempts.length
        );
        guestCheckpointRef.current = guestCheckpointRef.current.then(() =>
          recordGuestAttempt(roundSnapshot.sessionId, submission.attempts.length, row)
        ).catch((error) => {
          guestSaveErrorRef.current = error;
        });
      }

      pendingAdvanceRef.current = submission;
      setSubmissionFeedbackState(
        submission.attempt.isCorrect
          ? MIXED_SUBMISSION_FEEDBACK_STATES.CORRECT
          : MIXED_SUBMISSION_FEEDBACK_STATES.INCORRECT
      );

      if (flashTimeoutRef.current) {
        clearTimeout(flashTimeoutRef.current);
      }

      flashTimeoutRef.current = setTimeout(() => {
        flashTimeoutRef.current = null;
        void advanceAfterSubmissionFeedback(submission);
      }, SUBMISSION_FEEDBACK_MS);
      feedbackDueAtRef.current = Date.now() + SUBMISSION_FEEDBACK_MS;
    },
    [advanceAfterSubmissionFeedback, endDialogOpen, isSubmissionFeedbackActive, progressBuffer, userId]
  );

  const submitCurrentInput = useCallback(() => {
    const parsedAnswer = parseIntegerInput(answerInput);
    if (parsedAnswer === null) {
      return;
    }

    submitAnswer(parsedAnswer, Date.now());
  }, [answerInput, submitAnswer]);

  const handleAnswerSubmit = useCallback(
    (event) => {
      event.preventDefault();
      submitCurrentInput();
    },
    [submitCurrentInput]
  );

  const processInput = useCallback(
    (nextValue) => {
      const roundSnapshot = activeRoundRef.current;
      if (!roundSnapshot || isSubmissionFeedbackActive) {
        return;
      }

      setAnswerInput(nextValue);

      const autoSubmitted = shouldAutoSubmitAnswer(
        nextValue,
        roundSnapshot.currentProblem.correctAnswer
      );
      if (autoSubmitted !== null) {
        submitAnswer(autoSubmitted, Date.now());
      }
    },
    [isSubmissionFeedbackActive, submitAnswer]
  );

  const handleDigit = useCallback(
    (digit) => {
      if (isSubmissionFeedbackActive) return;
      const next = settings.rtlInput ? digit + answerInput : answerInput + digit;
      processInput(next);
    },
    [answerInput, isSubmissionFeedbackActive, processInput, settings.rtlInput]
  );

  const handleDelete = useCallback(() => {
    if (isSubmissionFeedbackActive || !answerInput) return;
    const next = settings.rtlInput ? answerInput.slice(1) : answerInput.slice(0, -1);
    processInput(next);
  }, [answerInput, isSubmissionFeedbackActive, processInput, settings.rtlInput]);

  const handleClear = useCallback(() => {
    if (isSubmissionFeedbackActive) return;
    processInput('');
  }, [isSubmissionFeedbackActive, processInput]);

  const restoreHiddenInputFocus = useCallback(() => {
    hiddenInputRef.current?.focus();
  }, []);

  const handleDesktopAnswerPaste = useCallback(
    (event) => {
      if (!isDesktopMixedInput || isSubmissionFeedbackActive) {
        return;
      }

      const pastedDigits = event.clipboardData?.getData('text')?.replace(/\D+/g, '') ?? '';
      if (!pastedDigits) {
        return;
      }

      event.preventDefault();
      processInput(pastedDigits);
    },
    [isDesktopMixedInput, isSubmissionFeedbackActive, processInput]
  );

  const handleKeyDown = useCallback(
    (event) => {
      if (isSubmissionFeedbackActive) {
        event.preventDefault();
        return;
      }

      if (event.key >= '0' && event.key <= '9') {
        event.preventDefault();
        handleDigit(event.key);
        return;
      }

      if (event.key === 'Backspace') {
        event.preventDefault();
        handleDelete();
        return;
      }

      if (event.key === 'Delete' || event.key === 'Escape') {
        event.preventDefault();
        handleClear();
        return;
      }

      if (event.key === 'Enter') {
        event.preventDefault();
        submitCurrentInput();
      }
    },
    [handleClear, handleDelete, handleDigit, isSubmissionFeedbackActive, submitCurrentInput]
  );

  const updateSetting = (key, value) => {
    if (isLoadingMixedSettings) {
      return;
    }

    let normalizedValue = value;
    if (key === 'roundSize') {
      normalizedValue = Number(value);
    } else if (key === 'rtlInput' || key === 'hideTimer') {
      normalizedValue = value === true || value === 'true';
    }

    void upsertMixedSettings({ [key]: normalizedValue });
  };

  const isMixedFinishState = Boolean(!activeRound && lastRound);
  const shouldShowHeroPanel = !activeRound && !lastRound;
  const shouldShowMixedConfig = !activeRound && !lastRound;

  return (
    <>
      <Head>
        <title>Mixed Trainer - Mental Math Studio</title>
        <meta
          name='description'
          content='Mixed arithmetic drill with configurable operations and difficulty levels.'
        />
      </Head>

      <div className={`trainer-page-shell mixed-page-shell${activeRound ? ' is-round-active' : ''}`}>
        {shouldShowHeroPanel && (
          <PageIntro title='Mixed Trainer' description='Choose operations and start a round.' />
        )}
        {!shouldShowHeroPanel && <h1 className='visually-hidden'>Mixed round</h1>}

        {shouldShowMixedConfig && (
          <section className='mixed-config-layout appear-up'>
            <article className='panel paper-panel mixed-setup-panel'>
              <div className='panel-title-row'>
                <div>
                  <p className='panel-kicker'>Blueprint</p>
                  <h2>
                    <IconLabel icon={SquaresFourIcon} className='icon-label-heading'>
                      Your Selection
                    </IconLabel>
                  </h2>
                </div>
              </div>
              <form className='settings-form mixed-settings-form' onSubmit={startRound}>
                <button
                  type='submit'
                  className='button button-strong button-full setup-start-action'
                  aria-keyshortcuts={PRIMARY_ACTION_HOTKEY}
                  disabled={isLoadingMixedSettings || !canStart}
                >
                  <IconLabel icon={PlayCircleIcon} className='icon-label-button'>
                    {isLoadingMixedSettings ? 'Loading...' : !canStart ? 'Enable at least one operation' : 'Start Mixed Training'}
                  </IconLabel>
                </button>
                {MIXED_OPERATIONS.map((op) => {
                  const meta = MIXED_OPERATION_META[op];
                  const settingKey = OPERATION_SETTING_KEYS[op];
                  const levels = DIFFICULTY_LEVELS[op];
                  const currentValue = settings[settingKey];

                  return (
                    <div key={op} className='mixed-config-row'>
                      <label htmlFor={`mixed-${op}`}>{meta.configLabel}</label>
                      <select
                        id={`mixed-${op}`}
                        value={currentValue}
                        onChange={(event) => updateSetting(settingKey, event.target.value)}
                        disabled={isLoadingMixedSettings}
                      >
                        {levels.map((level) => (
                          <option key={level} value={level}>
                            {DIFFICULTY_LABELS[level]}
                          </option>
                        ))}
                      </select>
                    </div>
                  );
                })}

                <div className='mixed-config-row'>
                  <label htmlFor='mixed-roundSize'>#</label>
                  <select
                    id='mixed-roundSize'
                    value={settings.roundSize}
                    onChange={(event) => updateSetting('roundSize', event.target.value)}
                    disabled={isLoadingMixedSettings}
                  >
                    {RUN_LENGTHS.map((count) => (
                      <option key={count} value={count}>
                        {count}
                      </option>
                    ))}
                  </select>
                </div>

                <div className='mixed-toggle-grid'>
                  <div className='toggle-row'>
                    <span>Right-to-left</span>
                    <button
                      type='button'
                      role='switch'
                      aria-checked={settings.rtlInput}
                      className={`toggle-switch${settings.rtlInput ? ' is-active' : ''}`}
                      onClick={() => updateSetting('rtlInput', !settings.rtlInput)}
                      disabled={isLoadingMixedSettings}
                    >
                      <span className='toggle-switch-thumb' />
                    </button>
                  </div>

                  <div className='toggle-row'>
                    <span>Hide Timer</span>
                    <button
                      type='button'
                      role='switch'
                      aria-checked={settings.hideTimer}
                      className={`toggle-switch${settings.hideTimer ? ' is-active' : ''}`}
                      onClick={() => updateSetting('hideTimer', !settings.hideTimer)}
                      disabled={isLoadingMixedSettings}
                    >
                      <span className='toggle-switch-thumb' />
                    </button>
                  </div>
                </div>

              </form>
            </article>
          </section>
        )}

        {activeRound && (
          <section className='mixed-solving-layout appear-up'>
            <article className='panel chalk-panel mixed-solving-panel mixed-solving-stage'>
              <div className='mixed-solving-head'>
                <div>
                  <h2>
                    <IconLabel icon={SquaresFourIcon} className='icon-label-heading'>
                      Mixed round
                    </IconLabel>
                  </h2>
                </div>
                <button type='button' className='button button-danger button-inline mixed-end-action'
                  onClick={() => void requestActiveSessionExit('end-round')}>
                  End round
                </button>
                <QuestionTimer
                  startedAt={activeRound.questionStartedAt}
                  hidden={activeRound.settings.hideTimer}
                  frozen={isSubmissionFeedbackActive || endDialogOpen}
                />
              </div>
              <div className='mixed-progress-region'>
                <ProgressBar
                  current={activeRound.attempts.length}
                  total={activeRound.settings.roundSize}
                />
              </div>
              <div className='mixed-problem-region'>
                <StackedProblem
                  problem={activeRound.currentProblem}
                  answerDisplay={answerInput}
                  feedbackState={submissionFeedbackState}
                  showAnswerDisplay={!isDesktopMixedInput}
                />
              </div>
              <div className='mixed-input-region'>
              {isDesktopMixedInput ? (
                <form className='answer-form answer-form-inline mixed-answer-form' onSubmit={handleAnswerSubmit}>
                  <label htmlFor='mixedAnswerInput'>Your answer</label>
                  <input
                    ref={answerInputRef}
                    id='mixedAnswerInput'
                    className='mixed-answer-input'
                    type='text'
                    inputMode='numeric'
                    autoComplete='off'
                    value={answerInput}
                    onKeyDown={handleKeyDown}
                    onPaste={handleDesktopAnswerPaste}
                    placeholder='Type answer'
                    aria-label='Answer input'
                    readOnly
                  />
                  <button
                    type='submit'
                    className='button button-strong button-full'
                    disabled={isSubmissionFeedbackActive || endDialogOpen}
                  >
                    Submit answer
                  </button>
                </form>
              ) : (
                <>
                  <input
                    ref={hiddenInputRef}
                    className='mixed-hidden-input'
                    type='text'
                    inputMode='none'
                    autoComplete='off'
                    value=''
                    onChange={() => {}}
                    onKeyDown={handleKeyDown}
                    aria-label='Answer input'
                    tabIndex={0}
                  />
                  <Keypad
                    onDigit={handleDigit}
                    onClear={handleClear}
                    onDelete={handleDelete}
                    onSubmit={submitCurrentInput}
                    onPointerAction={restoreHiddenInputFocus}
                    disabled={isSubmissionFeedbackActive || endDialogOpen}
                  />
                </>
              )}
              </div>
            </article>
          </section>
        )}

        {isMixedFinishState && (
          <section className='finish-state-shell finish-state-shell-centered'>
            <RoundSummaryPanel
              title='Round Summary'
              badgeLabel='Mixed'
              badgeClassName='mode-pill-manual'
              round={lastRound}
              saveStatus={getSaveStatusMessage(lastRound)}
              retryAction={lastRound?.saveState === 'error' && lastRound?.sessionId
                ? { label: 'Retry save', onClick: () => void retryRoundSave() } : null}
              primaryAction={{ label: 'Start Again', onClick: handleStartAgain }}
              secondaryAction={{
                label: 'Change round setup',
                onClick: handleCustomizeBlueprint
              }}
              className='summary-panel-centered'
            />
          </section>
        )}
        {endDialogOpen && (
          <EndRoundDialog count={pendingAdvanceRef.current?.attempts.length || activeRound?.attempts.length || 0}
            isEnding={isEndingRound} onCancel={() => closeEndDialog(false)}
            onConfirm={() => void confirmEndRound()} />
        )}
      </div>
    </>
  );
}

export default function MixedTrainerPage() {
  return (
    <MixedTrainerProvider>
      <MixedTrainerContent />
    </MixedTrainerProvider>
  );
}
