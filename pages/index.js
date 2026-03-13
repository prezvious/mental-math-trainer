import Head from 'next/head';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import {
  computeRoundStats,
  createProblem,
  formatDuration,
  getOperationOptions,
  OPERATION_META,
  parseIntegerInput,
  sanitizeSettings
} from 'utils/mathEngine';
import { useSupabaseAuth } from 'utils/supabaseAuthContext';

const DEFAULT_SETTINGS = {
  operation: 'MULTIPLICATION',
  leftDigits: 2,
  rightDigits: 2,
  roundSize: 10
};

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
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [activeRound, setActiveRound] = useState(null);
  const [answerInput, setAnswerInput] = useState('');
  const [feedback, setFeedback] = useState(null);
  const [lastRound, setLastRound] = useState(null);

  useEffect(() => {
    if (user) {
      return;
    }
    setActiveRound(null);
    setAnswerInput('');
    setLastRound(null);
    setFeedback(null);
  }, [user]);

  const activeStats = useMemo(
    () => computeRoundStats(activeRound?.attempts || []),
    [activeRound]
  );

  const startRound = (event) => {
    event.preventDefault();
    const sanitizedSettings = sanitizeSettings(settings);
    const firstProblem = createProblem(
      sanitizedSettings.operation,
      sanitizedSettings.leftDigits,
      sanitizedSettings.rightDigits
    );

    setSettings(sanitizedSettings);
    setLastRound(null);
    setFeedback(null);
    setAnswerInput('');
    setActiveRound({
      settings: sanitizedSettings,
      attempts: [],
      currentProblem: firstProblem,
      questionStartedAt: Date.now()
    });
  };

  const persistRound = async (attempts, roundSettings) => {
    if (!client || !user) {
      return;
    }

    setLastRound((summary) =>
      summary ? { ...summary, saveState: 'saving', saveError: '' } : summary
    );

    const sessionId = createSessionId();
    const rows = attempts.map((attempt, index) => ({
      user_id: user.id,
      session_id: sessionId,
      question_index: index + 1,
      operation: attempt.operation,
      digits_left: roundSettings.leftDigits,
      digits_right: roundSettings.rightDigits,
      left_operand: attempt.leftOperand,
      right_operand: attempt.rightOperand,
      correct_answer: attempt.correctAnswer.toString(),
      submitted_answer: attempt.submittedAnswer.toString(),
      is_correct: attempt.isCorrect,
      response_ms: attempt.responseMs
    }));

    const { error } = await client.from('progress_logs').insert(rows);

    if (error) {
      setLastRound((summary) =>
        summary
          ? { ...summary, saveState: 'error', saveError: error.message }
          : summary
      );
      return;
    }

    setLastRound((summary) =>
      summary ? { ...summary, saveState: 'saved', saveError: '' } : summary
    );
  };

  const handleAnswerSubmit = async (event) => {
    event.preventDefault();
    if (!activeRound) {
      return;
    }

    const submittedAnswer = parseIntegerInput(answerInput);
    if (submittedAnswer === null) {
      setFeedback({
        tone: 'warning',
        message: 'Enter a whole number before submitting.'
      });
      return;
    }

    const responseMs = Math.max(1, Date.now() - activeRound.questionStartedAt);
    const { currentProblem } = activeRound;
    const isCorrect = submittedAnswer === currentProblem.correctAnswer;
    const attempt = {
      operation: currentProblem.operation,
      leftOperand: currentProblem.leftOperand,
      rightOperand: currentProblem.rightOperand,
      correctAnswer: currentProblem.correctAnswer,
      submittedAnswer,
      isCorrect,
      responseMs,
      createdAt: new Date().toISOString()
    };

    const attempts = [...activeRound.attempts, attempt];
    const isComplete = attempts.length >= activeRound.settings.roundSize;

    if (isComplete) {
      setActiveRound(null);
      setAnswerInput('');
      setFeedback({
        tone: isCorrect ? 'success' : 'warning',
        message: isCorrect
          ? 'Round complete. Nice finish.'
          : `Round complete. Final correct answer was ${currentProblem.correctAnswer.toString()}.`
      });
      setLastRound({
        ...computeRoundStats(attempts),
        attempts,
        settings: activeRound.settings,
        finishedAt: new Date().toISOString(),
        saveState: user ? 'saving' : 'idle',
        saveError: ''
      });
      await persistRound(attempts, activeRound.settings);
      return;
    }

    const nextProblem = createProblem(
      activeRound.settings.operation,
      activeRound.settings.leftDigits,
      activeRound.settings.rightDigits
    );
    setActiveRound({
      ...activeRound,
      attempts,
      currentProblem: nextProblem,
      questionStartedAt: Date.now()
    });
    setAnswerInput('');
    setFeedback({
      tone: isCorrect ? 'success' : 'warning',
      message: isCorrect
        ? 'Correct. Next question loaded.'
        : `Answer recorded. Correct was ${currentProblem.correctAnswer.toString()}.`
    });
  };

  const updateSetting = (key, value) => {
    setSettings((currentSettings) => sanitizeSettings({ ...currentSettings, [key]: value }));
  };

  return (
    <>
      <Head>
        <title>Mental Math Studio</title>
        <meta
          name='description'
          content='A redesigned mental math trainer with Supabase login, signup, and progress tracking.'
        />
      </Head>
      <section className='hero-panel appear-up'>
        <p className='hero-tag'>Discipline Through Numbers</p>
        <h1>Mental Math Studio</h1>
        <p>
          Sprint through targeted arithmetic rounds, keep every attempt, and track
          your long-term speed inside Supabase.
        </p>
        {!isConfigured && (
          <p className='inline-warning'>
            Add <code>NEXT_PUBLIC_SUPABASE_URL</code> and{' '}
            <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code> to connect auth and progress
            tracking.
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
              Every answer is stored to your Supabase account so you can inspect
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
              <form className='settings-form' onSubmit={startRound}>
                <label htmlFor='operation'>Operation</label>
                <select
                  id='operation'
                  value={settings.operation}
                  onChange={(event) => updateSetting('operation', event.target.value)}
                >
                  {getOperationOptions().map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>

                <label htmlFor='leftDigits'>Left number digits</label>
                <input
                  id='leftDigits'
                  type='number'
                  min='1'
                  max='8'
                  value={settings.leftDigits}
                  onChange={(event) => updateSetting('leftDigits', event.target.value)}
                />

                <label htmlFor='rightDigits'>Right number digits</label>
                <input
                  id='rightDigits'
                  type='number'
                  min='1'
                  max='8'
                  value={settings.rightDigits}
                  onChange={(event) => updateSetting('rightDigits', event.target.value)}
                />

                <label htmlFor='roundSize'>Questions per round</label>
                <input
                  id='roundSize'
                  type='number'
                  min='3'
                  max='40'
                  value={settings.roundSize}
                  onChange={(event) => updateSetting('roundSize', event.target.value)}
                />

                <button type='submit' className='button button-strong button-full'>
                  {activeRound ? 'Restart round' : 'Start round'}
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
                      id='answerInput'
                      type='text'
                      inputMode='numeric'
                      autoComplete='off'
                      value={answerInput}
                      onChange={(event) => setAnswerInput(event.target.value)}
                      placeholder='Type integer answer'
                    />
                    <button type='submit' className='button button-strong button-full'>
                      Submit answer
                    </button>
                  </form>
                </>
              ) : (
                <p className='placeholder-text'>
                  Start a round to receive timed questions. Each submission is logged,
                  scored, and ready for analysis.
                </p>
              )}
              {feedback && <p className={`feedback ${feedback.tone}`}>{feedback.message}</p>}
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
                {lastRound.saveState === 'saving' && 'Saving this round to Supabase...'}
                {lastRound.saveState === 'saved' && 'Round saved to Supabase progress logs.'}
                {lastRound.saveState === 'idle' && 'Sign in to store rounds in Supabase.'}
                {lastRound.saveState === 'error' &&
                  `Supabase save failed: ${lastRound.saveError}`}
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
