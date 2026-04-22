import Head from 'next/head';
import { useRouter } from 'next/router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import HotkeyHint from 'components/HotkeyHint.js';
import IconLabel from 'components/IconLabel.js';
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
import { useSupabaseAuth } from 'utils/supabaseAuthContext.js';

const PRIMARY_ACTION_HOTKEY = formatHotkeyLabel(ROUND_CONTROL_HOTKEY);

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

function createRoundSummary(attempts, userId, wasTerminated) {
  return {
    ...computeRoundStats(attempts),
    attempts,
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

const CORRECT_FLASH_MS = 400;

function MixedTrainerContent() {
  const router = useRouter();
  const { client, session, user, isConfigured } = useSupabaseAuth();
  const { registerActiveSessionTerminator } = useActiveSession();
  const { mixedSettings: settings, isLoadingMixedSettings, upsertMixedSettings } =
    useMixedTrainer();

  const [activeRound, setActiveRound] = useState(null);
  const [answerInput, setAnswerInput] = useState('');
  const [isCorrectFlash, setIsCorrectFlash] = useState(false);
  const [lastRound, setLastRound] = useState(null);
  const handledQuestionIdRef = useRef(null);
  const hiddenInputRef = useRef(null);
  const flashTimeoutRef = useRef(null);
  const pendingAdvanceRef = useRef(null);
  const activeRoundRef = useRef(activeRound);
  const clientRef = useRef(client);
  const accessTokenRef = useRef(session?.access_token ?? null);
  const isMountedRef = useRef(false);
  const terminationPromiseRef = useRef(null);
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
    const previousUserId = previousUserIdRef.current;
    previousUserIdRef.current = userId;

    if (previousUserId === null || previousUserId === userId) {
      return;
    }

    progressBuffer.clear();
    pendingAdvanceRef.current = null;
    setActiveRound(null);
    setAnswerInput('');
    setIsCorrectFlash(false);
    setLastRound(null);
    handledQuestionIdRef.current = null;
  }, [progressBuffer, userId]);

  useEffect(() => {
    if (!activeRound || !hiddenInputRef.current) {
      return;
    }
    hiddenInputRef.current.focus();
  }, [activeRound, activeRound?.questionId]);

  const enabledOperations = useMemo(
    () => getEnabledOperations(settings),
    [settings]
  );
  const canStart = enabledOperations.length > 0;

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

  const finalizeRound = useCallback(
    async (attempts, { wasTerminated, keepalive = false }) => {
      handledQuestionIdRef.current = null;
      pendingAdvanceRef.current = null;
      setActiveRound(null);
      setAnswerInput('');
      setIsCorrectFlash(false);

      const summary = createRoundSummary(attempts, userId, wasTerminated);
      if (isMountedRef.current) {
        setLastRound(summary);
      }

      if (!userId || !clientRef.current) {
        return { saved: false, error: null };
      }

      try {
        await persistQueuedProgress({ keepalive });
        markSummarySaved();
        return { saved: true, error: null };
      } catch (error) {
        markSummaryError(
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
          if (isMountedRef.current) {
            setActiveRound(null);
            setAnswerInput('');
            setIsCorrectFlash(false);
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
    [finalizeRound, getTerminationAttempts]
  );

  useEffect(() => {
    terminateSessionRef.current = terminateActiveRound;
  }, [terminateActiveRound]);

  useEffect(
    () =>
      registerActiveSessionTerminator((reason) => terminateSessionRef.current(reason)),
    [registerActiveSessionTerminator]
  );

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

    void upsertMixedSettings(sanitized);
    setLastRound(null);
    setAnswerInput('');
    setIsCorrectFlash(false);
    handledQuestionIdRef.current = null;
    setActiveRound(
      createMixedActiveRound(sanitized, firstProblem, questionStartedAt, sessionId)
    );
  }, [canStart, isLoadingMixedSettings, settings, upsertMixedSettings]);

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
    router.events.on('routeChangeStart', handleRouteChangeStart);

    return () => {
      window.removeEventListener('pagehide', handlePageHide);
      router.events.off('routeChangeStart', handleRouteChangeStart);
    };
  }, [activeRound, router.events, router.pathname, terminateActiveRound]);

  const advanceAfterCorrect = useCallback(
    async (submission) => {
      pendingAdvanceRef.current = null;

      const { attempts, isComplete, nextActiveRound } = submission;

      if (isComplete) {
        await finalizeRound(attempts, { wasTerminated: false });
        return;
      }

      setAnswerInput('');
      setIsCorrectFlash(false);
      setActiveRound({
        ...nextActiveRound,
        questionStartedAt: Date.now()
      });
    },
    [finalizeRound]
  );

  const submitAnswer = useCallback(
    (submittedAnswer, submittedAt = Date.now()) => {
      const roundSnapshot = activeRoundRef.current;
      if (!roundSnapshot || isCorrectFlash) {
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
      }

      pendingAdvanceRef.current = submission;
      setIsCorrectFlash(true);

      if (flashTimeoutRef.current) {
        clearTimeout(flashTimeoutRef.current);
      }

      flashTimeoutRef.current = setTimeout(() => {
        flashTimeoutRef.current = null;
        void advanceAfterCorrect(submission);
      }, CORRECT_FLASH_MS);
    },
    [advanceAfterCorrect, isCorrectFlash, progressBuffer, userId]
  );

  const submitCurrentInput = useCallback(() => {
    const parsedAnswer = parseIntegerInput(answerInput);
    if (parsedAnswer === null) {
      return;
    }

    submitAnswer(parsedAnswer, Date.now());
  }, [answerInput, submitAnswer]);

  const processInput = useCallback(
    (nextValue) => {
      const roundSnapshot = activeRoundRef.current;
      if (!roundSnapshot || isCorrectFlash) {
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
    [isCorrectFlash, submitAnswer]
  );

  const handleDigit = useCallback(
    (digit) => {
      if (isCorrectFlash) return;
      const next = settings.rtlInput ? digit + answerInput : answerInput + digit;
      processInput(next);
    },
    [answerInput, isCorrectFlash, processInput, settings.rtlInput]
  );

  const handleDelete = useCallback(() => {
    if (isCorrectFlash || !answerInput) return;
    const next = settings.rtlInput ? answerInput.slice(1) : answerInput.slice(0, -1);
    processInput(next);
  }, [answerInput, isCorrectFlash, processInput, settings.rtlInput]);

  const handleClear = useCallback(() => {
    if (isCorrectFlash) return;
    processInput('');
  }, [isCorrectFlash, processInput]);

  const restoreHiddenInputFocus = useCallback(() => {
    hiddenInputRef.current?.focus();
  }, []);

  const handleKeyDown = useCallback(
    (event) => {
      if (isCorrectFlash) {
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
    [handleClear, handleDelete, handleDigit, isCorrectFlash, submitCurrentInput]
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
  const shouldShowHeroPanel = !isMixedFinishState;
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

      {shouldShowHeroPanel && (
        <section className='hero-panel hero-panel-command appear-up'>
          <div className='hero-layout'>
            <div className='hero-copy'>
              <p className='hero-tag'>Discipline Through Numbers</p>
              <h1>Mixed Trainer</h1>
              <p>
                Drill across multiple operations in a single run. Configure difficulty
                per operation, set your target count, and go.
              </p>
            </div>
            <div className='hero-sidebar'>
              <p className='hero-sidebar-label'>How this stays sharp</p>
              <ul className='hero-checklist'>
                <li>Pick only the operations you want to rehearse.</li>
                <li>Keep each difficulty level deliberate.</li>
                <li>Run the keypad like a focused speed station.</li>
              </ul>
            </div>
          </div>
          {!isConfigured && (
            <p className='inline-warning'>
              Account features are not configured yet, so saved progress is currently
              unavailable.
            </p>
          )}
        </section>
      )}

      {shouldShowMixedConfig && (
        <>
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
              <p className='panel-copy'>
                Turn mixed mode into a deliberate control panel instead of a random drill.
              </p>
              <form className='settings-form mixed-settings-form' onSubmit={startRound}>
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

                <button
                  type='submit'
                  className='button button-strong button-full'
                  aria-keyshortcuts={PRIMARY_ACTION_HOTKEY}
                  disabled={isLoadingMixedSettings || !canStart}
                >
                  <span className='button-hotkey-label'>
                    <IconLabel icon={PlayCircleIcon} className='icon-label-button'>
                      {isLoadingMixedSettings
                        ? 'Loading...'
                        : !canStart
                          ? 'Enable at least one operation'
                          : 'Start Mixed Training'}
                    </IconLabel>
                    <HotkeyHint label={PRIMARY_ACTION_HOTKEY} />
                  </span>
                </button>
              </form>
            </article>
          </section>
        </>
      )}

      {activeRound && (
        <section className='mixed-solving-layout appear-up'>
          <article className='panel chalk-panel mixed-solving-panel mixed-solving-stage'>
            <div className='mixed-solving-head'>
              <div>
                <p className='panel-kicker'>Focused Run</p>
                <h2>
                  <IconLabel icon={SquaresFourIcon} className='icon-label-heading'>
                    Live Stack
                  </IconLabel>
                </h2>
              </div>
              <QuestionTimer
                startedAt={activeRound.questionStartedAt}
                hidden={activeRound.settings.hideTimer}
                frozen={isCorrectFlash}
              />
            </div>
            <ProgressBar
              current={activeRound.attempts.length}
              total={activeRound.settings.roundSize}
            />
            <StackedProblem
              problem={activeRound.currentProblem}
              answerDisplay={answerInput}
              isCorrect={isCorrectFlash}
            />
            <p className='mixed-solving-hint'>
              Type from the keyboard or drive the on-screen keypad.
            </p>
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
              disabled={isCorrectFlash}
            />
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
            primaryAction={{ label: 'Start Again', onClick: handleStartAgain }}
            secondaryAction={{
              label: 'Change round setup',
              onClick: handleCustomizeBlueprint
            }}
            className='summary-panel-centered'
          />
        </section>
      )}
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
