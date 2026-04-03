import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAccountPreferences } from 'utils/accountPreferencesContext.js';
import { useActiveSession } from 'utils/activeSessionContext.js';
import {
  computeRoundStats,
  createProblem,
  formatDuration,
  getOperationOptions,
  OPERATION_META,
  operationRequiresOrderedDigits,
  parseIntegerInput,
  resolveRoundSizeDraft,
  sanitizeSettings
} from 'utils/mathEngine.js';
import {
  buildProgressLogRow,
  createProgressLogBuffer
} from 'utils/progressLogs.js';
import {
  createActiveRound,
  processRoundSubmission,
  shouldAutoSubmitAnswer
} from 'utils/trainerRound.js';
import { getSupabaseRestConfig } from 'utils/supabaseClient.js';
import { useSupabaseAuth } from 'utils/supabaseAuthContext.js';
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

function createRoundSummary(attempts, settings, userId, wasTerminated) {
  return {
    ...computeRoundStats(attempts),
    attempts,
    settings,
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

export default function TrainerPage() {
  const router = useRouter();
  const { client, session, user, isConfigured } = useSupabaseAuth();
  const { registerActiveSessionTerminator } = useActiveSession();
  const { trainerSettings: settings, isLoadingPreferences, upsertPreferences } =
    useAccountPreferences();
  const [activeRound, setActiveRound] = useState(null);
  const [answerInput, setAnswerInput] = useState('');
  const [lastRound, setLastRound] = useState(null);
  const [roundSizeDraft, setRoundSizeDraft] = useState(() => String(settings.roundSize));
  const settingsFormRef = useRef(null);
  const answerInputRef = useRef(null);
  const handledQuestionIdRef = useRef(null);
  const activeRoundRef = useRef(activeRound);
  const clientRef = useRef(client);
  const accessTokenRef = useRef(session?.access_token ?? null);
  const isMountedRef = useRef(false);
  const terminationPromiseRef = useRef(null);
  const terminateSessionRef = useRef(async () => ({ handled: false }));
  const userId = user?.id ?? null;

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
    setRoundSizeDraft(String(settings.roundSize));
  }, [settings.roundSize]);

  useEffect(() => {
    if (user) {
      return;
    }

    progressBuffer.clear();
    setActiveRound(null);
    setAnswerInput('');
    setLastRound(null);
    handledQuestionIdRef.current = null;
  }, [progressBuffer, user]);

  useEffect(() => {
    if (!activeRound || !answerInputRef.current) {
      return;
    }

    answerInputRef.current.focus();
  }, [activeRound]);

  const activeStats = useMemo(
    () => computeRoundStats(activeRound?.attempts || []),
    [activeRound]
  );
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

  const finalizeRound = useCallback(
    async (attempts, roundSettings, { wasTerminated, keepalive = false }) => {
      handledQuestionIdRef.current = null;
      setActiveRound(null);
      setAnswerInput('');

      const summary = createRoundSummary(attempts, roundSettings, userId, wasTerminated);
      if (isMountedRef.current) {
        setLastRound(summary);
      }

      if (!userId || !clientRef.current) {
        return;
      }

      try {
        await persistQueuedProgress({ keepalive });
        markSummarySaved();
      } catch (error) {
        markSummaryError(
          error,
          wasTerminated ? 'Unable to save this ended session.' : 'Unable to save this round.'
        );
      }
    },
    [markSummaryError, markSummarySaved, persistQueuedProgress, userId]
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
          keepalive
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

  const beginRound = useCallback(async () => {
    if (isLoadingPreferences) {
      return;
    }

    if (activeRoundRef.current) {
      await terminateActiveRound('restart');
    }

    const sanitizedSettings = commitRoundSizeDraft();
    const firstProblem = createProblem(
      sanitizedSettings.operation,
      sanitizedSettings.leftDigits,
      sanitizedSettings.rightDigits
    );
    const questionStartedAt = Date.now();
    const sessionId = createSessionId();

    void upsertPreferences({ trainerSettings: sanitizedSettings });
    setLastRound(null);
    setAnswerInput('');
    handledQuestionIdRef.current = null;
    setActiveRound(
      createActiveRound(
        sanitizedSettings,
        firstProblem,
        questionStartedAt,
        sessionId
      )
    );
  }, [
    commitRoundSizeDraft,
    isLoadingPreferences,
    terminateActiveRound,
    upsertPreferences
  ]);

  const startRound = useCallback(
    (event) => {
      event.preventDefault();
      void beginRound();
    },
    [beginRound]
  );

  useEffect(() => {
    if (!user || activeRound || isLoadingPreferences || typeof window === 'undefined') {
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

      event.preventDefault();
      void beginRound();
    };

    window.addEventListener('keydown', handleStartShortcut);
    return () => window.removeEventListener('keydown', handleStartShortcut);
  }, [activeRound, beginRound, isLoadingPreferences, user]);

  useEffect(() => {
    if (!activeRound || typeof window === 'undefined') {
      return undefined;
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        void terminateActiveRound('visibilitychange', { keepalive: true });
      }
    };

    const handlePageHide = () => {
      void terminateActiveRound('pagehide', { keepalive: true });
    };

    const handleRouteChangeStart = (url) => {
      if (getPathnameFromUrl(url) !== router.pathname) {
        void terminateActiveRound('route-change');
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('pagehide', handlePageHide);
    router.events.on('routeChangeStart', handleRouteChangeStart);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('pagehide', handlePageHide);
      router.events.off('routeChangeStart', handleRouteChangeStart);
    };
  }, [activeRound, router.events, router.pathname, terminateActiveRound]);

  const submitAnswer = useCallback(
    async (submittedAnswer, submittedAt = Date.now()) => {
      const roundSnapshot = activeRoundRef.current;
      if (!roundSnapshot) {
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
          wasTerminated: false
        });
        return;
      }

      setAnswerInput('');
      setActiveRound(nextActiveRound);
    },
    [finalizeRound, progressBuffer, userId]
  );

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
    if (!roundSnapshot) {
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

    const normalizedValue = ['leftDigits', 'rightDigits'].includes(key) ? Number(value) : value;

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

  return (
    <>
      <Head>
        <title>Mental Math Studio</title>
        <meta
          name='description'
          content='A redesigned mental math trainer with account login, timed rounds, and progress tracking.'
        />
      </Head>
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

      {!user && (
        <section className='guest-layout appear-up'>
          <article className='feature-card'>
            <h2>Train With Intent</h2>
            <p>
              Pick operation, digit lengths, and round size. The system generates
              clean drills with exact timing per response.
            </p>
          </article>
          <article className='feature-card'>
            <h2>Track Real Progress</h2>
            <p>
              Every submitted answer is saved to your account so you can inspect
              accuracy, pacing, and session history.
            </p>
          </article>
          <article className='feature-card'>
            <h2>Start Now</h2>
            <p>Create an account to keep data synced across devices.</p>
            <div className='inline-actions'>
              <Link href='/signup' className='button button-strong'>
                Sign up
              </Link>
              <Link href='/login' className='button button-quiet'>
                Log in
              </Link>
            </div>
          </article>
        </section>
      )}

      {user && (
        <>
          <section className='trainer-layout appear-up'>
            <article className='panel paper-panel'>
              <h2>Round Blueprint</h2>
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

                <button
                  type='submit'
                  className='button button-strong button-full'
                  aria-keyshortcuts='Enter'
                  disabled={isLoadingPreferences}
                >
                  {isLoadingPreferences
                    ? 'Loading blueprint...'
                    : activeRound
                      ? 'Restart round'
                      : 'Start round'}
                </button>
              </form>
            </article>

            <article className='panel chalk-panel'>
              <h2>Live Arena</h2>
              {activeRound ? (
                <>
                  <div className='progress-meta'>
                    <p>
                      Question {activeRound.attempts.length + 1} / {activeRound.settings.roundSize}
                    </p>
                    <p>
                      Correct so far: {activeStats.correct}/{activeStats.total}
                    </p>
                  </div>
                  <div className='progress-track' aria-hidden='true'>
                    <span
                      style={{
                        width: `${(activeRound.attempts.length / activeRound.settings.roundSize) * 100}%`
                      }}
                    />
                  </div>
                  <p className='problem-line'>
                    <span>{activeRound.currentProblem.leftOperand}</span>
                    <span>{OPERATION_META[activeRound.currentProblem.operation].symbol}</span>
                    <span>{activeRound.currentProblem.rightOperand}</span>
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
              ) : (
                <p className='placeholder-text'>
                  Start a round to receive timed questions. Each submission is
                  tracked, scored, and ready for review.
                </p>
              )}
            </article>
          </section>

          {lastRound && (
            <section className='summary-panel appear-up'>
              <h2>Latest Round Summary</h2>
              <div className='summary-grid'>
                <article>
                  <h3>Accuracy</h3>
                  <p>{lastRound.accuracy.toFixed(1)}%</p>
                </article>
                <article>
                  <h3>Correct Answers</h3>
                  <p>
                    {lastRound.correct}/{lastRound.total}
                  </p>
                </article>
                <article>
                  <h3>Avg Response</h3>
                  <p>{formatDuration(lastRound.averageResponseMs)}</p>
                </article>
                <article>
                  <h3>Total Time</h3>
                  <p>{formatDuration(lastRound.totalResponseMs)}</p>
                </article>
              </div>
              <p className='save-status'>{getSaveStatusMessage(lastRound)}</p>
              <Link href='/stats' className='button button-quiet'>
                Open progress dashboard
              </Link>
            </section>
          )}
        </>
      )}
    </>
  );
}
