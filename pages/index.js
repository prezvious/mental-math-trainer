import Head from 'next/head';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAccountPreferences } from 'utils/accountPreferencesContext';
import {
  computeRoundStats,
  createProblem,
  formatDuration,
  getOperationOptions,
  OPERATION_META,
  operationRequiresOrderedDigits,
  parseIntegerInput,
  sanitizeSettings
} from 'utils/mathEngine';
import {
  buildProgressLogRows,
  persistProgressLogBatches
} from 'utils/progressLogs';
import {
  createActiveRound,
  processRoundSubmission,
  shouldAutoSubmitAnswer
} from 'utils/trainerRound';
import { useSupabaseAuth } from 'utils/supabaseAuthContext';
import { DIGIT_OPTIONS } from 'utils/utils';

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

export default function TrainerPage() {
  const { client, user, isConfigured } = useSupabaseAuth();
  const { trainerSettings: settings, isLoadingPreferences, upsertPreferences } =
    useAccountPreferences();
  const [activeRound, setActiveRound] = useState(null);
  const [answerInput, setAnswerInput] = useState('');
  const [lastRound, setLastRound] = useState(null);
  const settingsFormRef = useRef(null);
  const answerInputRef = useRef(null);
  const handledQuestionIdRef = useRef(null);

  useEffect(() => {
    if (user) {
      return;
    }
    setActiveRound(null);
    setAnswerInput('');
    setLastRound(null);
    handledQuestionIdRef.current = null;
  }, [user]);

  useEffect(() => {
    if (!activeRound || !answerInputRef.current) {
      return;
    }

    answerInputRef.current.focus();
  }, [activeRound]);

  const beginRound = useCallback(() => {
    if (isLoadingPreferences) {
      return;
    }

    const sanitizedSettings = sanitizeSettings(settings);
    const firstProblem = createProblem(
      sanitizedSettings.operation,
      sanitizedSettings.leftDigits,
      sanitizedSettings.rightDigits
    );
    const questionStartedAt = Date.now();

    void upsertPreferences({ trainerSettings: sanitizedSettings });
    setLastRound(null);
    setAnswerInput('');
    handledQuestionIdRef.current = null;
    setActiveRound(
      createActiveRound(sanitizedSettings, firstProblem, questionStartedAt)
    );
  }, [isLoadingPreferences, settings, upsertPreferences]);

  const startRound = useCallback(
    (event) => {
      event.preventDefault();
      beginRound();
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
      beginRound();
    };

    window.addEventListener('keydown', handleStartShortcut);
    return () => window.removeEventListener('keydown', handleStartShortcut);
  }, [activeRound, beginRound, isLoadingPreferences, user]);

  const activeStats = useMemo(
    () => computeRoundStats(activeRound?.attempts || []),
    [activeRound]
  );
  const isOrderedDigitOperation = operationRequiresOrderedDigits(settings.operation);
  const availableRightDigits = isOrderedDigitOperation
    ? DIGIT_OPTIONS.filter((digits) => digits <= settings.leftDigits)
    : DIGIT_OPTIONS;

  const persistRound = async (attempts, roundSettings) => {
    if (!client || !user) {
      return;
    }

    setLastRound((summary) =>
      summary ? { ...summary, saveState: 'saving', saveError: '' } : summary
    );

    const sessionId = createSessionId();
    const rows = buildProgressLogRows(attempts, roundSettings, user.id, sessionId);

    try {
      await persistProgressLogBatches(client, rows);
    } catch (error) {
      setLastRound((summary) =>
        summary
          ? {
              ...summary,
              saveState: 'error',
              saveError: error?.message || 'Unable to save this round.'
            }
          : summary
      );
      return;
    }

    setLastRound((summary) =>
      summary ? { ...summary, saveState: 'saved', saveError: '' } : summary
    );
  };

  const submitAnswer = async (submittedAnswer, submittedAt = Date.now()) => {
    if (!activeRound) {
      return;
    }

    const roundSnapshot = activeRound;
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
    const { attempts, isComplete, nextActiveRound } = submission;

    if (isComplete) {
      setActiveRound(null);
      setAnswerInput('');
      setLastRound({
        ...computeRoundStats(attempts),
        attempts,
        settings: roundSnapshot.settings,
        finishedAt: new Date().toISOString(),
        saveState: user ? 'saving' : 'idle',
        saveError: ''
      });
      await persistRound(attempts, roundSnapshot.settings);
      return;
    }

    setAnswerInput('');
    setActiveRound(nextActiveRound);
  };

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

    if (!activeRound) {
      return;
    }

    const autoSubmittedAnswer = shouldAutoSubmitAnswer(
      nextValue,
      activeRound.currentProblem.correctAnswer
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

    const normalizedValue =
      ['leftDigits', 'rightDigits', 'roundSize'].includes(key) ? Number(value) : value;

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
                  value={settings.roundSize}
                  onChange={(event) => updateSetting('roundSize', event.target.value)}
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
              <p className='save-status'>
                {lastRound.saveState === 'saving' && 'Saving this round...'}
                {lastRound.saveState === 'saved' && 'Round saved to your progress history.'}
                {lastRound.saveState === 'idle' && 'Sign in to store completed rounds.'}
                {lastRound.saveState === 'error' &&
                  `Could not save this round: ${lastRound.saveError}`}
              </p>
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
