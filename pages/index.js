import Head from 'next/head';
import { useRouter } from 'next/router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import RoundSummaryPanel from 'components/RoundSummaryPanel.js';
import ProgressBar from 'components/mixed/ProgressBar.js';
import { useAccountPreferences } from 'utils/accountPreferencesContext.js';
import { useActiveSession } from 'utils/activeSessionContext.js';
import {
  AI_AUTO_CYCLE_TRANSITION_MS,
  buildAiCycleBlueprints,
  formatAiCycleBlueprintLabel
} from 'utils/aiCycle.js';
import { solveAiExpression } from 'utils/aiMath.js';
import {
  buildAiModeCustomLogRow,
  buildAiModeTrainerLogRow,
  createAiModeLogBuffer,
  persistAiModeLogBatches
} from 'utils/aiModeLogs.js';
import {
  advanceAiTrainerRound,
  solveTrainerProblem,
  TRAINER_INPUT_MODES
} from 'utils/aiTrainer.js';
import {
  computeRoundStats,
  createProblem,
  getOperationOptions,
  MAX_BASE,
  operationRequiresOrderedDigits,
  OPERATION_META,
  parseIntegerInput,
  resolveRoundSizeDraft,
  sanitizeSettings
} from 'utils/mathEngine.js';
import {
  buildProgressLogRow,
  createProgressLogBuffer
} from 'utils/progressLogs.js';
import { getSupabaseRestConfig } from 'utils/supabaseClient.js';
import { useSupabaseAuth } from 'utils/supabaseAuthContext.js';
import {
  createActiveRound,
  processRoundSubmission,
  shouldAutoSubmitAnswer
} from 'utils/trainerRound.js';
import { DIGIT_OPTIONS } from 'utils/utils.js';

function createSessionId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }

  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (character) => {
    const random = Math.floor(Math.random() * 16);
    const value = character === 'x' ? random : (random & 0x3) | 0x8;
    return value.toString(16);
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

function getPerformanceNow() {
  return typeof performance !== 'undefined' && typeof performance.now === 'function'
    ? performance.now()
    : Date.now();
}

function createRoundSummary(
  attempts,
  settings,
  userId,
  wasTerminated,
  sourceMode,
  meta = {}
) {
  return {
    ...computeRoundStats(attempts),
    attempts,
    settings,
    sourceMode,
    aiAutoCycle: Boolean(meta.aiAutoCycle),
    blueprintLabel: meta.blueprintLabel || '',
    finishedAt: new Date().toISOString(),
    wasTerminated,
    saveState: userId ? 'saving' : 'idle',
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

const DEFAULT_SOLVER_STATE = Object.freeze({
  status: 'idle',
  error: '',
  result: null
});
const AI_SOLVE_BATCH_SIZE = 25;

export default function TrainerPage() {
  const router = useRouter();
  const { client, session, user, isConfigured, isAdmin } = useSupabaseAuth();
  const { registerActiveSessionTerminator } = useActiveSession();
  const { trainerSettings: settings, isLoadingPreferences, upsertPreferences } =
    useAccountPreferences();
  const [activeRound, setActiveRound] = useState(null);
  const [answerInput, setAnswerInput] = useState('');
  const [lastRound, setLastRound] = useState(null);
  const [roundSizeDraft, setRoundSizeDraft] = useState(() => String(settings.roundSize));
  const [trainerInputMode, setTrainerInputMode] = useState(TRAINER_INPUT_MODES.MANUAL);
  const [customExpression, setCustomExpression] = useState('');
  const [customSolverState, setCustomSolverState] = useState(DEFAULT_SOLVER_STATE);
  const [aiAutoCycleEnabled, setAiAutoCycleEnabled] = useState(false);
  const [aiCycleStopRequested, setAiCycleStopRequested] = useState(false);
  const [aiCycleBlueprints, setAiCycleBlueprints] = useState([]);
  const [aiCycleCursor, setAiCycleCursor] = useState(0);
  const [aiTransitionState, setAiTransitionState] = useState(null);
  const settingsFormRef = useRef(null);
  const customSolverFormRef = useRef(null);
  const answerInputRef = useRef(null);
  const handledQuestionIdRef = useRef(null);
  const activeRoundRef = useRef(activeRound);
  const clientRef = useRef(client);
  const accessTokenRef = useRef(session?.access_token ?? null);
  const isMountedRef = useRef(false);
  const terminationPromiseRef = useRef(null);
  const terminateSessionRef = useRef(async () => ({ handled: false }));
  const aiSolveLockRef = useRef(false);
  const aiAutoCycleEnabledRef = useRef(aiAutoCycleEnabled);
  const aiCycleStopRequestedRef = useRef(aiCycleStopRequested);
  const aiCycleBlueprintsRef = useRef(aiCycleBlueprints);
  const userId = user?.id ?? null;
  const previousUserIdRef = useRef(userId);
  const isAiMode = isAdmin && trainerInputMode === TRAINER_INPUT_MODES.AI;

  const progressBuffer = useMemo(
    () =>
      createProgressLogBuffer({
        getClient: () => clientRef.current,
        getAccessToken: () => accessTokenRef.current,
        getRestConfig: getSupabaseRestConfig
      }),
    []
  );

  const aiModeBuffer = useMemo(
    () =>
      createAiModeLogBuffer({
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
      progressBuffer.dispose();
      aiModeBuffer.dispose();
    };
  }, [aiModeBuffer, progressBuffer]);

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
    aiAutoCycleEnabledRef.current = aiAutoCycleEnabled;
  }, [aiAutoCycleEnabled]);

  useEffect(() => {
    aiCycleStopRequestedRef.current = aiCycleStopRequested;
  }, [aiCycleStopRequested]);

  useEffect(() => {
    aiCycleBlueprintsRef.current = aiCycleBlueprints;
  }, [aiCycleBlueprints]);

  useEffect(() => {
    setRoundSizeDraft(String(settings.roundSize));
  }, [settings.roundSize]);

  useEffect(() => {
    if (isAdmin) {
      return;
    }

    setTrainerInputMode(TRAINER_INPUT_MODES.MANUAL);
  }, [isAdmin]);

  useEffect(() => {
    const previousUserId = previousUserIdRef.current;
    previousUserIdRef.current = userId;

    if (previousUserId === null || previousUserId === userId) {
      return;
    }

    progressBuffer.clear();
    aiModeBuffer.clear();
    setActiveRound(null);
    setAnswerInput('');
    setLastRound(null);
    setCustomExpression('');
    setCustomSolverState(DEFAULT_SOLVER_STATE);
    setAiAutoCycleEnabled(false);
    setAiCycleStopRequested(false);
    setAiCycleBlueprints([]);
    setAiCycleCursor(0);
    setAiTransitionState(null);
    handledQuestionIdRef.current = null;
    aiSolveLockRef.current = false;
  }, [aiModeBuffer, progressBuffer, userId]);

  useEffect(() => {
    if (!activeRound || activeRound.sourceMode === TRAINER_INPUT_MODES.AI || !answerInputRef.current) {
      return;
    }

    answerInputRef.current.focus();
  }, [activeRound]);

  const activeStats = useMemo(
    () => computeRoundStats(activeRound?.attempts || []),
    [activeRound]
  );
  const isExponentiation = settings.operation === 'EXPONENTIATION';
  const isOrderedDigitOperation = operationRequiresOrderedDigits(settings.operation);
  const availableRightDigits = isOrderedDigitOperation
    ? DIGIT_OPTIONS.filter((digits) => digits <= settings.leftDigits)
    : DIGIT_OPTIONS;

  const markSummarySaved = useCallback(() => {
    if (!isMountedRef.current) {
      return;
    }

    setLastRound((summary) =>
      summary ? { ...summary, saveState: 'saved', saveError: '' } : summary
    );
  }, []);

  const markSummaryError = useCallback((error, fallbackMessage) => {
    if (!isMountedRef.current) {
      return;
    }

    setLastRound((summary) =>
      summary
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

  const persistQueuedAiModeLogs = useCallback(
    async ({ keepalive = false } = {}) => {
      if (!userId || !clientRef.current) {
        return;
      }

      await aiModeBuffer.flush({ keepalive });
    },
    [aiModeBuffer, userId]
  );

  const finalizeRound = useCallback(
    async (
      attempts,
      roundSettings,
      {
        wasTerminated,
        keepalive = false,
        sourceMode = TRAINER_INPUT_MODES.MANUAL,
        aiAutoCycle = false,
        blueprintLabel = ''
      }
    ) => {
      handledQuestionIdRef.current = null;
      setActiveRound(null);
      setAnswerInput('');

      const summary = createRoundSummary(
        attempts,
        roundSettings,
        userId,
        wasTerminated,
        sourceMode,
        {
          aiAutoCycle,
          blueprintLabel
        }
      );
      if (isMountedRef.current) {
        setLastRound(summary);
      }

      if (!userId || !clientRef.current) {
        return;
      }

      try {
        if (sourceMode === TRAINER_INPUT_MODES.AI) {
          await persistQueuedAiModeLogs({ keepalive });
        } else {
          await persistQueuedProgress({ keepalive });
        }
        markSummarySaved();
      } catch (error) {
        markSummaryError(
          error,
          wasTerminated ? 'Unable to save this ended session.' : 'Unable to save this round.'
        );
      }
    },
    [
      markSummaryError,
      markSummarySaved,
      persistQueuedAiModeLogs,
      persistQueuedProgress,
      userId
    ]
  );

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
        if (!roundSnapshot.attempts.length) {
          handledQuestionIdRef.current = null;
          if (isMountedRef.current) {
            setActiveRound(null);
            setAnswerInput('');
          }
          return { handled: true, saved: false };
        }

        await finalizeRound(roundSnapshot.attempts, roundSnapshot.settings, {
          wasTerminated: true,
          keepalive,
          sourceMode: roundSnapshot.sourceMode || TRAINER_INPUT_MODES.MANUAL
        });

        return { handled: true, saved: true };
      })().finally(() => {
        if (terminationPromiseRef.current === promise) {
          terminationPromiseRef.current = null;
        }
      });

      terminationPromiseRef.current = promise;
      return promise;
    },
    [finalizeRound]
  );

  useEffect(() => {
    terminateSessionRef.current = terminateActiveRound;
  }, [terminateActiveRound]);

  useEffect(
    () =>
      registerActiveSessionTerminator((reason) => terminateSessionRef.current(reason)),
    [registerActiveSessionTerminator]
  );

  const commitRoundSizeDraft = useCallback(() => {
    const {
      nextSettings,
      nextRoundSizeDraft,
      didChange
    } = resolveRoundSizeDraft(settings, roundSizeDraft);

    setRoundSizeDraft(nextRoundSizeDraft);

    if (didChange) {
      void upsertPreferences({ trainerSettings: nextSettings });
    }

    return nextSettings;
  }, [roundSizeDraft, settings, upsertPreferences]);

  const startRoundWithSettings = useCallback(
    async (
      roundSettings,
      {
        sourceMode,
        aiAutoCycleRound = false,
        nextCycleCursor = null,
        persistSettings = false
      }
    ) => {
      if (isLoadingPreferences) {
        return;
      }

      if (activeRoundRef.current) {
        await terminateActiveRound('restart');
      }

      const sanitizedSettings = sanitizeSettings(roundSettings);
      const firstProblem = createProblem(
        sanitizedSettings.operation,
        sanitizedSettings.leftDigits,
        sanitizedSettings.rightDigits,
        sanitizedSettings.maxBase
      );
      const questionStartedAt = Date.now();
      const sessionId = createSessionId();

      if (persistSettings) {
        void upsertPreferences({ trainerSettings: sanitizedSettings });
      }

      setRoundSizeDraft(String(sanitizedSettings.roundSize));
      setLastRound(null);
      setAiTransitionState(null);
      setAnswerInput('');
      handledQuestionIdRef.current = null;
      setActiveRound({
        ...createActiveRound(
          sanitizedSettings,
          firstProblem,
          questionStartedAt,
          sessionId
        ),
        sourceMode,
        aiAutoCycleRound,
        aiCycleCursor: nextCycleCursor
      });
    },
    [isLoadingPreferences, terminateActiveRound, upsertPreferences]
  );

  const beginRound = useCallback(async () => {
    if (isLoadingPreferences) {
      return;
    }

    const sourceMode = isAiMode ? TRAINER_INPUT_MODES.AI : TRAINER_INPUT_MODES.MANUAL;
    const sanitizedSettings = commitRoundSizeDraft();
    await startRoundWithSettings(sanitizedSettings, {
      sourceMode,
      persistSettings: true
    });
  }, [
    commitRoundSizeDraft,
    isAiMode,
    isLoadingPreferences,
    startRoundWithSettings
  ]);

  const startRound = useCallback(
    (event) => {
      event.preventDefault();
      void beginRound();
    },
    [beginRound]
  );

  const startAiAutoCycle = useCallback(async () => {
    if (!isAiMode) {
      return;
    }

    const cycleSeedSettings = commitRoundSizeDraft();
    const blueprints = buildAiCycleBlueprints(cycleSeedSettings);
    if (!blueprints.length) {
      return;
    }

    setAiCycleBlueprints(blueprints);
    setAiCycleCursor(0);
    setAiAutoCycleEnabled(true);
    setAiCycleStopRequested(false);
    setAiTransitionState(null);

    await startRoundWithSettings(blueprints[0], {
      sourceMode: TRAINER_INPUT_MODES.AI,
      aiAutoCycleRound: true,
      nextCycleCursor: 0
    });
  }, [commitRoundSizeDraft, isAiMode, startRoundWithSettings]);

  const handleStopAiCycle = useCallback(() => {
    setAiAutoCycleEnabled(false);

    if (activeRoundRef.current?.sourceMode === TRAINER_INPUT_MODES.AI) {
      setAiCycleStopRequested(true);
      return;
    }

    setAiCycleStopRequested(false);
    setAiTransitionState(null);
  }, []);

  const handleCustomizeBlueprint = useCallback(() => {
    setLastRound(null);
    setAiTransitionState(null);
    setAiAutoCycleEnabled(false);
    setAiCycleStopRequested(false);
    setAiCycleBlueprints([]);
    setAiCycleCursor(0);
    setCustomExpression('');
    setCustomSolverState(DEFAULT_SOLVER_STATE);
  }, []);

  const handleStartAgain = useCallback(async () => {
    if (!lastRound) {
      return;
    }

    if (lastRound.sourceMode === TRAINER_INPUT_MODES.AI && lastRound.aiAutoCycle) {
      await startAiAutoCycle();
      return;
    }

    await startRoundWithSettings(lastRound.settings, {
      sourceMode: lastRound.sourceMode,
      persistSettings: true
    });
  }, [lastRound, startAiAutoCycle, startRoundWithSettings]);

  useEffect(() => {
    if (
      activeRound ||
      lastRound ||
      aiTransitionState ||
      isLoadingPreferences ||
      typeof window === 'undefined'
    ) {
      return undefined;
    }

    const handleStartShortcut = (event) => {
      if (
        event.defaultPrevented ||
        event.key !== 'Enter' ||
        event.repeat ||
        event.isComposing ||
        event.altKey ||
        event.ctrlKey ||
        event.metaKey ||
        event.shiftKey
      ) {
        return;
      }

      const target = event.target;
      if (
        target instanceof HTMLSelectElement ||
        target instanceof HTMLButtonElement ||
        target instanceof HTMLAnchorElement
      ) {
        return;
      }

      if (
        target instanceof HTMLElement &&
        (target.isContentEditable || target.tagName === 'TEXTAREA')
      ) {
        return;
      }

      if (
        settingsFormRef.current &&
        target instanceof Node &&
        settingsFormRef.current.contains(target)
      ) {
        return;
      }

      if (
        customSolverFormRef.current &&
        target instanceof Node &&
        customSolverFormRef.current.contains(target)
      ) {
        return;
      }

      event.preventDefault();
      void beginRound();
    };

    window.addEventListener('keydown', handleStartShortcut);
    return () => window.removeEventListener('keydown', handleStartShortcut);
  }, [activeRound, aiTransitionState, beginRound, isLoadingPreferences, lastRound]);

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
    router.events.on('routeChangeStart', handleRouteChangeStart);

    return () => {
      window.removeEventListener('pagehide', handlePageHide);
      router.events.off('routeChangeStart', handleRouteChangeStart);
    };
  }, [activeRound, router.events, router.pathname, terminateActiveRound]);

  const submitAnswer = useCallback(
    async (submittedAnswer, submittedAt = Date.now()) => {
      const roundSnapshot = activeRoundRef.current;
      if (!roundSnapshot || roundSnapshot.sourceMode === TRAINER_INPUT_MODES.AI) {
        return;
      }

      const submission = processRoundSubmission(
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
          buildProgressLogRow(
            submission.attempt,
            roundSnapshot.settings,
            userId,
            roundSnapshot.sessionId,
            submission.attempts.length
          )
        );
      }

      const { attempts, isComplete, nextActiveRound } = submission;

      if (isComplete) {
        await finalizeRound(attempts, roundSnapshot.settings, {
          wasTerminated: false,
          sourceMode: TRAINER_INPUT_MODES.MANUAL
        });
        return;
      }

      setAnswerInput('');
      setActiveRound({
        ...nextActiveRound,
        sourceMode: TRAINER_INPUT_MODES.MANUAL
      });
    },
    [finalizeRound, progressBuffer, userId]
  );

  useEffect(() => {
    if (
      !activeRound ||
      activeRound.sourceMode !== TRAINER_INPUT_MODES.AI ||
      aiSolveLockRef.current
    ) {
      return undefined;
    }

    aiSolveLockRef.current = true;
    let isCancelled = false;
    let timeoutId = null;

    const solveCurrentBatch = async () => {
      try {
        const roundSnapshot = activeRoundRef.current;
        if (!roundSnapshot || roundSnapshot.sourceMode !== TRAINER_INPUT_MODES.AI) {
          return;
        }

        const batchResult = advanceAiTrainerRound(
          roundSnapshot,
          handledQuestionIdRef.current,
          {
            maxSteps: AI_SOLVE_BATCH_SIZE,
            solveProblem: solveTrainerProblem,
            processSubmission: processRoundSubmission
          }
        );

        handledQuestionIdRef.current = batchResult.handledQuestionId;

        if (userId && batchResult.solvedSteps.length) {
          for (const step of batchResult.solvedSteps) {
            aiModeBuffer.enqueue(
              buildAiModeTrainerLogRow(
                step.problem,
                step.solvedProblem,
                userId,
                roundSnapshot.sessionId,
                step.submission.attempts.length,
                step.submission.attempt.createdAt
              )
            );
          }
        }

        if (batchResult.isComplete) {
          await finalizeRound(batchResult.attempts, roundSnapshot.settings, {
            wasTerminated: false,
            sourceMode: TRAINER_INPUT_MODES.AI,
            aiAutoCycle: Boolean(roundSnapshot.aiAutoCycleRound),
            blueprintLabel: formatAiCycleBlueprintLabel(roundSnapshot.settings)
          });

          if (
            roundSnapshot.aiAutoCycleRound &&
            aiAutoCycleEnabledRef.current &&
            !aiCycleStopRequestedRef.current &&
            aiCycleBlueprintsRef.current.length
          ) {
            const nextIndex =
              ((roundSnapshot.aiCycleCursor ?? 0) + 1) % aiCycleBlueprintsRef.current.length;

            setAiCycleCursor(nextIndex);
            setAiTransitionState({
              startedAt: Date.now(),
              durationMs: AI_AUTO_CYCLE_TRANSITION_MS,
              nextIndex,
              nextSettings: aiCycleBlueprintsRef.current[nextIndex],
              nextBlueprintLabel: formatAiCycleBlueprintLabel(
                aiCycleBlueprintsRef.current[nextIndex]
              )
            });
          } else if (roundSnapshot.aiAutoCycleRound) {
            setAiTransitionState(null);
            setAiCycleStopRequested(false);
          }

          return;
        }

        if (!isCancelled && batchResult.nextActiveRound) {
          setActiveRound(batchResult.nextActiveRound);
        }
      } catch (error) {
        const roundSnapshot = activeRoundRef.current;
        handledQuestionIdRef.current = null;
        setActiveRound(null);
        setAnswerInput('');

        if (isMountedRef.current && roundSnapshot) {
          setLastRound({
            ...createRoundSummary(
              roundSnapshot.attempts,
              roundSnapshot.settings,
              userId,
              false,
              TRAINER_INPUT_MODES.AI,
              {
                aiAutoCycle: Boolean(roundSnapshot.aiAutoCycleRound),
                blueprintLabel: formatAiCycleBlueprintLabel(roundSnapshot.settings)
              }
            ),
            saveState: 'error',
            saveError: error?.message || 'AI MODE could not solve this round.'
          });
        }
      } finally {
        aiSolveLockRef.current = false;
      }
    };

    timeoutId = window.setTimeout(() => {
      void solveCurrentBatch();
    }, 0);

    return () => {
      isCancelled = true;
      if (timeoutId !== null) {
        window.clearTimeout(timeoutId);
      }
      aiSolveLockRef.current = false;
    };
  }, [activeRound, aiModeBuffer, finalizeRound, userId]);

  useEffect(() => {
    if (
      !aiTransitionState ||
      activeRound ||
      !aiAutoCycleEnabled ||
      aiCycleStopRequested
    ) {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => {
      void startRoundWithSettings(aiTransitionState.nextSettings, {
        sourceMode: TRAINER_INPUT_MODES.AI,
        aiAutoCycleRound: true,
        nextCycleCursor: aiTransitionState.nextIndex
      });
    }, aiTransitionState.durationMs);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [
    activeRound,
    aiAutoCycleEnabled,
    aiCycleStopRequested,
    aiTransitionState,
    startRoundWithSettings
  ]);

  const handleAnswerSubmit = async (event) => {
    event.preventDefault();

    const submittedAnswer = parseIntegerInput(answerInputRef.current?.value ?? answerInput);
    if (submittedAnswer === null) {
      return;
    }

    await submitAnswer(submittedAnswer, Date.now());
  };

  const handleAnswerChange = (event) => {
    const nextValue = event.target.value;
    setAnswerInput(nextValue);

    const roundSnapshot = activeRoundRef.current;
    if (!roundSnapshot || roundSnapshot.sourceMode === TRAINER_INPUT_MODES.AI) {
      return;
    }

    const autoSubmittedAnswer = shouldAutoSubmitAnswer(
      nextValue,
      roundSnapshot.currentProblem.correctAnswer
    );
    if (autoSubmittedAnswer === null) {
      return;
    }

    void submitAnswer(autoSubmittedAnswer, Date.now());
  };

  const updateSetting = (key, value) => {
    if (isLoadingPreferences) {
      return;
    }

    if (key === 'roundSize') {
      setRoundSizeDraft(value);
      return;
    }

    const normalizedValue = ['leftDigits', 'rightDigits', 'maxBase'].includes(key)
      ? Number(value)
      : value;

    const nextSettings = {
      ...settings,
      [key]: normalizedValue
    };
    const nextOperation = key === 'operation' ? normalizedValue : settings.operation;

    if (operationRequiresOrderedDigits(nextOperation)) {
      nextSettings.rightDigits = Math.min(
        Number(nextSettings.rightDigits),
        Number(nextSettings.leftDigits)
      );
    }

    void upsertPreferences({ trainerSettings: sanitizeSettings(nextSettings) });
  };

  const handleModeChange = (nextMode) => {
    if (activeRound) {
      return;
    }

    setTrainerInputMode(nextMode);
    setLastRound(null);
    setAiTransitionState(null);
    setAiAutoCycleEnabled(false);
    setAiCycleStopRequested(false);
    setAiCycleBlueprints([]);
    setAiCycleCursor(0);
    setCustomExpression('');
    setCustomSolverState(DEFAULT_SOLVER_STATE);
  };

  const handleCustomSolve = async (event) => {
    event.preventDefault();

    if (!isAdmin || !userId || !clientRef.current) {
      setCustomSolverState({
        status: 'error',
        error: 'AI MODE is available only to signed-in admin accounts.',
        result: null
      });
      return;
    }

    const promptText = customExpression.trim();
    if (!promptText) {
      setCustomSolverState({
        status: 'error',
        error: 'Enter a mathematical expression to solve.',
        result: null
      });
      return;
    }

    setCustomSolverState({
      status: 'working',
      error: '',
      result: null
    });

    try {
      const startedAt = getPerformanceNow();
      const solvedExpression = solveAiExpression(promptText);
      const responseMs = Math.max(1, Math.round(getPerformanceNow() - startedAt));
      const persistedResult = {
        ...solvedExpression,
        responseMs,
        promptText
      };

      await persistAiModeLogBatches(clientRef.current, [
        buildAiModeCustomLogRow(
          persistedResult,
          promptText,
          userId,
          createSessionId()
        )
      ]);

      setCustomSolverState({
        status: 'success',
        error: '',
        result: persistedResult
      });
    } catch (error) {
      setCustomSolverState({
        status: 'error',
        error: error?.message || 'The expression could not be solved.',
        result: null
      });
    }
  };

  const isAiTransitioning = Boolean(
    user &&
    !activeRound &&
    aiTransitionState &&
    lastRound?.sourceMode === TRAINER_INPUT_MODES.AI
  );
  const isTrainerFinishState = Boolean(
    !activeRound &&
    lastRound &&
    !aiTransitionState
  );
  const isManualTrainerFinishState =
    isTrainerFinishState && lastRound.sourceMode === TRAINER_INPUT_MODES.MANUAL;
  const isAiTrainerFinishState = Boolean(
    user && isTrainerFinishState && lastRound.sourceMode === TRAINER_INPUT_MODES.AI
  );
  const shouldHideTrainerPanels = Boolean(
    !activeRound &&
    (lastRound || aiTransitionState)
  );
  const shouldShowHeroPanel = !shouldHideTrainerPanels;
  const shouldShowAdminControl = user && isAdmin && !shouldHideTrainerPanels;
  const shouldShowBlueprintPanel =
    !activeRound && !lastRound && !aiTransitionState;
  const activeAiQuestionLabel = activeRound
    ? `Questions ${activeRound.attempts.length + 1} / ${activeRound.settings.roundSize}`
    : '';

  const renderAutoCycleToggle = () => (
    <div className='toggle-row trainer-toggle-row'>
      <span>Auto Cycle</span>
      <button
        type='button'
        role='switch'
        aria-checked={aiAutoCycleEnabled}
        className={`toggle-switch${aiAutoCycleEnabled ? ' is-active' : ''}`}
        onClick={() => {
          if (aiAutoCycleEnabled) {
            handleStopAiCycle();
            return;
          }

          void startAiAutoCycle();
        }}
      >
        <span className='toggle-switch-thumb' />
      </button>
    </div>
  );

  const renderAiCalculatorPanel = (copy) => (
    <article className='panel chalk-panel finish-secondary-panel'>
      <div className='panel-title-row'>
        <h2>Live Arena</h2>
        <span className='mode-pill mode-pill-ai'>AI MODE</span>
      </div>
      {renderAutoCycleToggle()}
      <div className='solver-shell'>
        {copy && <p className='placeholder-text'>{copy}</p>}
        <form
          ref={customSolverFormRef}
          className='answer-form solver-form'
          onSubmit={handleCustomSolve}
        >
          <label htmlFor='custom-expression'>Custom solver</label>
          <input
            id='custom-expression'
            type='text'
            autoComplete='off'
            value={customExpression}
            onChange={(event) => {
              setCustomExpression(event.target.value);
              if (customSolverState.status !== 'idle') {
                setCustomSolverState(DEFAULT_SOLVER_STATE);
              }
            }}
            placeholder='sqrt(144) + log(100, 10)'
          />
          <button
            type='submit'
            className='button button-strong button-full'
            disabled={customSolverState.status === 'working'}
          >
            {customSolverState.status === 'working'
              ? 'Solving...'
              : 'Solve expression'}
          </button>
        </form>

        {customSolverState.error && (
          <p className='feedback warning'>{customSolverState.error}</p>
        )}

        {customSolverState.result && (
          <section className='solver-result'>
            <div className='solver-result-head'>
              <span className='mode-pill mode-pill-ai'>AI MODE</span>
              <span className='solver-latency'>
                {customSolverState.result.responseMs}ms
              </span>
            </div>
            <p className='solver-expression'>
              {customSolverState.result.normalizedExpression}
            </p>
            <div className='solver-grid'>
              <article>
                <h3>Exact</h3>
                <p>{customSolverState.result.exactText}</p>
              </article>
              <article>
                <h3>Decimal</h3>
                <p>{customSolverState.result.decimalText}</p>
              </article>
              <article>
                <h3>Kind</h3>
                <p>{customSolverState.result.kind}</p>
              </article>
            </div>
          </section>
        )}
      </div>
    </article>
  );

  return (
    <>
      <Head>
        <title>Mental Math Studio</title>
        <meta
          name='description'
          content='A redesigned mental math trainer with account login, timed rounds, and progress tracking.'
        />
      </Head>
      {shouldShowHeroPanel && (
        <section className='hero-panel appear-up'>
          <p className='hero-tag'>Discipline Through Numbers</p>
          <h1>Mental Math Studio</h1>
          <p>
            Sprint through targeted arithmetic rounds, keep every attempt, and track
            your long-term speed over time.
          </p>
          {!isConfigured && (
            <p className='inline-warning'>
              Account features are not configured yet, so saved progress is currently
              unavailable.
            </p>
          )}
        </section>
      )}

      {shouldShowAdminControl && (
        <section className='panel paper-panel mode-panel appear-up'>
          <div className='mode-panel-head'>
            <div>
              <p className='hero-tag'>Admin Control</p>
              <h2>Input Mode</h2>
            </div>
            <div className='mode-toggle' role='tablist' aria-label='Trainer mode'>
              <button
                type='button'
                role='tab'
                aria-selected={trainerInputMode === TRAINER_INPUT_MODES.MANUAL}
                className={`mode-toggle-button${trainerInputMode === TRAINER_INPUT_MODES.MANUAL ? ' is-active' : ''}`}
                onClick={() => handleModeChange(TRAINER_INPUT_MODES.MANUAL)}
                disabled={Boolean(activeRound)}
              >
                Manual
              </button>
              <button
                type='button'
                role='tab'
                aria-selected={trainerInputMode === TRAINER_INPUT_MODES.AI}
                className={`mode-toggle-button${trainerInputMode === TRAINER_INPUT_MODES.AI ? ' is-active' : ''}`}
                onClick={() => handleModeChange(TRAINER_INPUT_MODES.AI)}
                disabled={Boolean(activeRound)}
              >
                AI MODE
              </button>
            </div>
          </div>
          <p className='mode-panel-copy'>
            {isAiMode
              ? 'AI MODE solves trainer questions with the local math engine and stores every custom solve in the admin history.'
              : 'Manual mode preserves the existing human-input flow with the same blueprint and progress tracking.'}
          </p>
        </section>
      )}

      <>
          {(shouldShowBlueprintPanel || activeRound) && (
            <section className={`trainer-layout appear-up${activeRound ? ' arena-active' : ''}`}>
              {shouldShowBlueprintPanel && (
                <article className='panel paper-panel'>
                  <div className='panel-title-row'>
                    <h2>Round Blueprint</h2>
                    {isAiMode && <span className='mode-pill mode-pill-ai'>AI MODE</span>}
                  </div>
                  <form
                    ref={settingsFormRef}
                    className='settings-form'
                    onSubmit={startRound}
                  >
                    <label htmlFor='operation'>Operation</label>
                    <select
                      id='operation'
                      value={settings.operation}
                      onChange={(event) => updateSetting('operation', event.target.value)}
                      disabled={isLoadingPreferences}
                    >
                      {getOperationOptions().map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>

                    {isExponentiation ? (
                      <>
                        <label htmlFor='maxBase'>Maximum base ({settings.maxBase})</label>
                        <input
                          id='maxBase'
                          type='range'
                          min='2'
                          max={MAX_BASE}
                          value={settings.maxBase}
                          onChange={(event) => updateSetting('maxBase', event.target.value)}
                          disabled={isLoadingPreferences}
                        />
                      </>
                    ) : (
                      <>
                        <label htmlFor='leftDigits'>Left number digits</label>
                        <select
                          id='leftDigits'
                          value={settings.leftDigits}
                          onChange={(event) => updateSetting('leftDigits', event.target.value)}
                          disabled={isLoadingPreferences}
                        >
                          {DIGIT_OPTIONS.map((digits) => (
                            <option key={digits} value={digits}>
                              {`${digits} digit${digits === 1 ? '' : 's'}`}
                            </option>
                          ))}
                        </select>

                        <label htmlFor='rightDigits'>Right number digits</label>
                        <select
                          id='rightDigits'
                          value={settings.rightDigits}
                          onChange={(event) => updateSetting('rightDigits', event.target.value)}
                          disabled={isLoadingPreferences}
                        >
                          {availableRightDigits.map((digits) => (
                            <option key={digits} value={digits}>
                              {`${digits} digit${digits === 1 ? '' : 's'}`}
                            </option>
                          ))}
                        </select>
                      </>
                    )}

                    <label htmlFor='roundSize'>Questions per round</label>
                    <input
                      id='roundSize'
                      type='number'
                      min='3'
                      max='10000'
                      value={roundSizeDraft}
                      onChange={(event) => updateSetting('roundSize', event.target.value)}
                      onBlur={commitRoundSizeDraft}
                      disabled={isLoadingPreferences}
                    />

                    {isAiMode && renderAutoCycleToggle()}

                    <button
                      type='submit'
                      className='button button-strong button-full'
                      aria-keyshortcuts='Enter'
                      disabled={isLoadingPreferences}
                    >
                      {isLoadingPreferences
                        ? 'Loading blueprint...'
                        : isAiMode
                        ? 'Start AI round'
                        : 'Start round'}
                    </button>
                  </form>
                </article>
              )}

              <article className='panel chalk-panel'>
                <div className='panel-title-row'>
                  <h2>Live Arena</h2>
                  <div className='panel-header-actions'>
                    {activeRound?.sourceMode === TRAINER_INPUT_MODES.AI && (
                      <span className='mode-pill mode-pill-ai'>AI MODE</span>
                    )}
                    {(aiAutoCycleEnabled || aiCycleStopRequested) &&
                      activeRound?.sourceMode === TRAINER_INPUT_MODES.AI && (
                        <button
                          type='button'
                          className='button button-danger button-inline'
                          onClick={handleStopAiCycle}
                          disabled={aiCycleStopRequested}
                        >
                          {aiCycleStopRequested ? 'Stopping...' : 'Stop'}
                        </button>
                      )}
                  </div>
                </div>
                {activeRound ? (
                  activeRound.sourceMode === TRAINER_INPUT_MODES.AI ? (
                    <ProgressBar
                      current={activeRound.attempts.length}
                      total={activeRound.settings.roundSize}
                      label={activeAiQuestionLabel}
                    />
                  ) : (
                    <>
                      <ProgressBar
                        current={activeRound.attempts.length}
                        total={activeRound.settings.roundSize}
                        secondaryLabel={`Correct so far: ${activeStats.correct}/${activeStats.total}`}
                      />
                      <p className='problem-line'>
                        {activeRound.currentProblem.operation === 'EXPONENTIATION' ? (
                          <>
                            <span>{activeRound.currentProblem.leftOperand}</span>
                            <sup className='problem-exponent'>
                              {activeRound.currentProblem.rightOperand}
                            </sup>
                          </>
                        ) : (
                          <>
                            <span>{activeRound.currentProblem.leftOperand}</span>
                            <span>{OPERATION_META[activeRound.currentProblem.operation].symbol}</span>
                            <span>{activeRound.currentProblem.rightOperand}</span>
                          </>
                        )}
                      </p>
                      <form className='answer-form' onSubmit={handleAnswerSubmit}>
                        <label htmlFor='answerInput'>Your answer</label>
                        <input
                          ref={answerInputRef}
                          id='answerInput'
                          type='text'
                          inputMode='numeric'
                          autoComplete='off'
                          value={answerInput}
                          onChange={handleAnswerChange}
                          placeholder='Type integer answer'
                        />
                        <button type='submit' className='button button-strong button-full'>
                          Submit answer
                        </button>
                      </form>
                    </>
                  )
                ) : isAiMode ? (
                  <div className='solver-shell'>
                    <p className='placeholder-text'>
                      Start an AI round to auto-solve generated questions, or use the custom
                      solver below for calculator-style expressions.
                    </p>
                    <form
                      ref={customSolverFormRef}
                      className='answer-form solver-form'
                      onSubmit={handleCustomSolve}
                    >
                      <label htmlFor='custom-expression'>Custom solver</label>
                      <input
                        id='custom-expression'
                        type='text'
                        autoComplete='off'
                        value={customExpression}
                        onChange={(event) => {
                          setCustomExpression(event.target.value);
                          if (customSolverState.status !== 'idle') {
                            setCustomSolverState(DEFAULT_SOLVER_STATE);
                          }
                        }}
                        placeholder='sqrt(144) + log(100, 10)'
                      />
                      <button
                        type='submit'
                        className='button button-strong button-full'
                        disabled={customSolverState.status === 'working'}
                      >
                        {customSolverState.status === 'working'
                          ? 'Solving...'
                          : 'Solve expression'}
                      </button>
                    </form>

                    {customSolverState.error && (
                      <p className='feedback warning'>{customSolverState.error}</p>
                    )}

                    {customSolverState.result && (
                      <section className='solver-result'>
                        <div className='solver-result-head'>
                          <span className='mode-pill mode-pill-ai'>AI MODE</span>
                          <span className='solver-latency'>
                            {customSolverState.result.responseMs}ms
                          </span>
                        </div>
                        <p className='solver-expression'>
                          {customSolverState.result.normalizedExpression}
                        </p>
                        <div className='solver-grid'>
                          <article>
                            <h3>Exact</h3>
                            <p>{customSolverState.result.exactText}</p>
                          </article>
                          <article>
                            <h3>Decimal</h3>
                            <p>{customSolverState.result.decimalText}</p>
                          </article>
                          <article>
                            <h3>Kind</h3>
                            <p>{customSolverState.result.kind}</p>
                          </article>
                        </div>
                      </section>
                    )}
                  </div>
                ) : (
                  <p className='placeholder-text'>
                    Start a round to receive timed questions. Each submission is
                    tracked, scored, and ready for review.
                  </p>
                )}
              </article>
            </section>
          )}

          {isAiTransitioning && lastRound && (
            <section className='finish-state-shell finish-state-shell-split'>
              <RoundSummaryPanel
                title='Round Summary'
                badgeLabel='AI MODE'
                badgeClassName='mode-pill-ai'
                round={lastRound}
                saveStatus={getSaveStatusMessage(lastRound)}
              />
              <article className='panel chalk-panel finish-secondary-panel ai-transition-panel appear-up'>
                <div className='panel-title-row'>
                  <h2>Auto Cycle</h2>
                  <span className='mode-pill mode-pill-ai'>Next Blueprint</span>
                </div>
                <p className='placeholder-text'>
                  Preparing {aiTransitionState.nextBlueprintLabel}
                </p>
                <ProgressBar
                  label='Moving to the next round'
                  secondaryLabel={aiTransitionState.nextBlueprintLabel}
                  progressValue={0}
                  animatedDurationMs={aiTransitionState.durationMs}
                />
                <div className='summary-actions summary-actions-left'>
                  <button
                    type='button'
                    className='button button-danger'
                    onClick={handleStopAiCycle}
                  >
                    Stop
                  </button>
                </div>
              </article>
            </section>
          )}

          {isManualTrainerFinishState && (
            <section className='finish-state-shell finish-state-shell-centered'>
              <RoundSummaryPanel
                title='Round Summary'
                badgeLabel='Manual'
                badgeClassName='mode-pill-manual'
                round={lastRound}
                saveStatus={getSaveStatusMessage(lastRound)}
                primaryAction={{ label: 'Start Again', onClick: () => void handleStartAgain() }}
                secondaryAction={{
                  label: 'Customize the blueprint',
                  onClick: handleCustomizeBlueprint
                }}
                className='summary-panel-centered'
              />
            </section>
          )}

          {isAiTrainerFinishState && (
            <section className='finish-state-shell finish-state-shell-split'>
              <RoundSummaryPanel
                title='Round Summary'
                badgeLabel='AI MODE'
                badgeClassName='mode-pill-ai'
                round={lastRound}
                saveStatus={getSaveStatusMessage(lastRound)}
                primaryAction={{ label: 'Start Again', onClick: () => void handleStartAgain() }}
                secondaryAction={{
                  label: 'Customize the blueprint',
                  onClick: handleCustomizeBlueprint
                }}
              />
              {renderAiCalculatorPanel(
                'Use Live Arena as a calculator, or restart the same mode when you are ready.'
              )}
            </section>
          )}
      </>
    </>
  );
}
