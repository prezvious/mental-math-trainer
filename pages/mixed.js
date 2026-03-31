import Head from 'next/head';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Keypad from 'components/mixed/Keypad';
import ProgressBar from 'components/mixed/ProgressBar';
import QuestionTimer from 'components/mixed/QuestionTimer';
import StackedProblem from 'components/mixed/StackedProblem';
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
} from 'utils/mixedDifficulty';
import { MixedTrainerProvider, useMixedTrainer } from 'utils/mixedTrainerContext';
import {
  buildMixedProgressLogRows,
  createMixedActiveRound,
  processMixedRoundSubmission,
  shouldAutoSubmitAnswer
} from 'utils/mixedTrainerRound';
import { persistProgressLogBatches } from 'utils/progressLogs';
import { computeRoundStats, formatDuration } from 'utils/mathEngine';
import { useSupabaseAuth } from 'utils/supabaseAuthContext';

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

const DIFFICULTY_LABELS = {
  off: "Don't train",
  warmup: 'Warm up',
  easy: 'Easy',
  medium: 'Medium',
  hard: 'Hard',
  expert: 'Expert'
};

const OPERATION_SETTING_KEYS = {
  SQUARES: 'squaresDifficulty',
  MULTIPLICATION: 'multiplicationDifficulty',
  ADDITION: 'additionDifficulty',
  SUBTRACTION: 'subtractionDifficulty',
  DIVISION: 'divisionDifficulty'
};

const CORRECT_FLASH_MS = 400;

function MixedTrainerContent() {
  const { client, user, isConfigured } = useSupabaseAuth();
  const { mixedSettings: settings, isLoadingMixedSettings, upsertMixedSettings } =
    useMixedTrainer();

  const [activeRound, setActiveRound] = useState(null);
  const [answerInput, setAnswerInput] = useState('');
  const [isCorrectFlash, setIsCorrectFlash] = useState(false);
  const [lastRound, setLastRound] = useState(null);
  const handledQuestionIdRef = useRef(null);
  const hiddenInputRef = useRef(null);
  const flashTimeoutRef = useRef(null);

  useEffect(() => {
    if (user) {
      return;
    }
    setActiveRound(null);
    setAnswerInput('');
    setIsCorrectFlash(false);
    setLastRound(null);
    handledQuestionIdRef.current = null;
  }, [user]);

  useEffect(() => {
    if (!activeRound || !hiddenInputRef.current) {
      return;
    }
    hiddenInputRef.current.focus();
  }, [activeRound, activeRound?.questionId]);

  useEffect(() => {
    return () => {
      if (flashTimeoutRef.current) {
        clearTimeout(flashTimeoutRef.current);
      }
    };
  }, []);

  const enabledOperations = useMemo(
    () => getEnabledOperations(settings),
    [settings]
  );
  const canStart = enabledOperations.length > 0;

  const beginRound = useCallback(() => {
    if (isLoadingMixedSettings || !canStart) {
      return;
    }

    const sanitized = sanitizeMixedSettings(settings);
    const enabled = getEnabledOperations(sanitized);
    const firstOp = pickRandomOperation(enabled);
    const firstDifficulty = getDifficultyForOperation(sanitized, firstOp);
    const firstProblem = createMixedProblem(firstOp, firstDifficulty);
    const questionStartedAt = Date.now();

    void upsertMixedSettings(sanitized);
    setLastRound(null);
    setAnswerInput('');
    setIsCorrectFlash(false);
    handledQuestionIdRef.current = null;
    setActiveRound(createMixedActiveRound(sanitized, firstProblem, questionStartedAt));
  }, [canStart, isLoadingMixedSettings, settings, upsertMixedSettings]);

  const startRound = useCallback(
    (event) => {
      event.preventDefault();
      beginRound();
    },
    [beginRound]
  );

  useEffect(() => {
    if (!user || activeRound || isLoadingMixedSettings || typeof window === 'undefined') {
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

      event.preventDefault();
      beginRound();
    };

    window.addEventListener('keydown', handleStartShortcut);
    return () => window.removeEventListener('keydown', handleStartShortcut);
  }, [activeRound, beginRound, isLoadingMixedSettings, user]);

  const persistRound = useCallback(
    async (attempts) => {
      if (!client || !user) {
        return;
      }

      setLastRound((summary) =>
        summary ? { ...summary, saveState: 'saving', saveError: '' } : summary
      );

      const sessionId = createSessionId();
      const rows = buildMixedProgressLogRows(attempts, user.id, sessionId);

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
    },
    [client, user]
  );

  const advanceAfterCorrect = useCallback(
    (submission) => {
      const { attempts, isComplete, nextActiveRound } = submission;

      if (isComplete) {
        setActiveRound(null);
        setAnswerInput('');
        setIsCorrectFlash(false);
        setLastRound({
          ...computeRoundStats(attempts),
          attempts,
          finishedAt: new Date().toISOString(),
          saveState: user ? 'saving' : 'idle',
          saveError: ''
        });
        void persistRound(attempts);
        return;
      }

      setAnswerInput('');
      setIsCorrectFlash(false);
      setActiveRound(nextActiveRound);
    },
    [persistRound, user]
  );

  const submitAnswer = useCallback(
    (submittedAnswer, submittedAt = Date.now()) => {
      if (!activeRound || isCorrectFlash) {
        return;
      }

      const submission = processMixedRoundSubmission(
        activeRound,
        submittedAnswer,
        submittedAt,
        handledQuestionIdRef.current
      );

      if (submission.ignored) {
        return;
      }

      handledQuestionIdRef.current = submission.handledQuestionId;
      setIsCorrectFlash(true);

      if (flashTimeoutRef.current) {
        clearTimeout(flashTimeoutRef.current);
      }

      flashTimeoutRef.current = setTimeout(() => {
        flashTimeoutRef.current = null;
        advanceAfterCorrect(submission);
      }, CORRECT_FLASH_MS);
    },
    [activeRound, advanceAfterCorrect, isCorrectFlash]
  );

  const processInput = useCallback(
    (nextValue) => {
      if (!activeRound || isCorrectFlash) {
        return;
      }

      setAnswerInput(nextValue);

      const autoSubmitted = shouldAutoSubmitAnswer(
        nextValue,
        activeRound.currentProblem.correctAnswer
      );
      if (autoSubmitted !== null) {
        submitAnswer(autoSubmitted, Date.now());
      }
    },
    [activeRound, isCorrectFlash, submitAnswer]
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
      }
    },
    [handleClear, handleDelete, handleDigit, isCorrectFlash]
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

  return (
    <>
      <Head>
        <title>Mixed Trainer - Mental Math Studio</title>
        <meta
          name='description'
          content='Mixed arithmetic drill with configurable operations and difficulty levels.'
        />
      </Head>

      <section className='hero-panel appear-up'>
        <p className='hero-tag'>Discipline Through Numbers</p>
        <h1>Mixed Trainer</h1>
        <p>
          Drill across multiple operations in a single run. Configure difficulty
          per operation, set your target count, and go.
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
            <h2>Mixed Drills</h2>
            <p>
              Choose which operations to train, set difficulty per type, and solve
              problems one at a time with instant feedback.
            </p>
          </article>
          <article className='feature-card'>
            <h2>Track Real Progress</h2>
            <p>
              Every answer is saved so you can review accuracy, pacing, and
              session history over time.
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

      {user && !activeRound && (
        <>
          <section className='mixed-config-layout appear-up'>
            <article className='panel paper-panel'>
              <h2>Your Selection</h2>
              <form className='settings-form' onSubmit={startRound}>
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

                <button
                  type='submit'
                  className='button button-strong button-full'
                  aria-keyshortcuts='Enter'
                  disabled={isLoadingMixedSettings || !canStart}
                >
                  {isLoadingMixedSettings
                    ? 'Loading...'
                    : !canStart
                      ? 'Enable at least one operation'
                      : 'Start Mixed Training'}
                </button>
              </form>
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

      {user && activeRound && (
        <section className='mixed-solving-layout appear-up'>
          <article className='panel chalk-panel mixed-solving-panel'>
            <ProgressBar
              current={activeRound.attempts.length}
              total={activeRound.settings.roundSize}
            />
            <QuestionTimer
              startedAt={activeRound.questionStartedAt}
              hidden={activeRound.settings.hideTimer}
              frozen={isCorrectFlash}
            />
            <StackedProblem
              problem={activeRound.currentProblem}
              answerDisplay={answerInput}
              isCorrect={isCorrectFlash}
            />
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
              disabled={isCorrectFlash}
            />
          </article>
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
