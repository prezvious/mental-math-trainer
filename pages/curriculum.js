import Head from 'next/head';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import IconLabel from 'components/IconLabel.js';
import ChartLineUpIcon from 'images/phosphor/chart-line-up.svg';
import FunctionIcon from 'images/phosphor/function.svg';
import ListChecksIcon from 'images/phosphor/list-checks.svg';
import {
  CURRICULUM_CHAPTERS,
  checkCurriculumAnswer,
  computeCurriculumSessionStats,
  createCurriculumQuestion,
  formatCurriculumAnswer
} from 'utils/curriculumPractice.js';
import { OPERATION_META } from 'utils/mathEngine.js';

const ALL_CHAPTERS_VALUE = 'all';

function getSelectedChapter(chapterId) {
  if (chapterId === ALL_CHAPTERS_VALUE) {
    return null;
  }

  return (
    CURRICULUM_CHAPTERS.find((chapter) => chapter.id === chapterId) || null
  );
}

function getSessionAccuracy(stats) {
  if (!stats.answered) {
    return 0;
  }

  return Math.round((stats.correct / stats.answered) * 100);
}

function getResultCopy(status) {
  if (status === 'correct') {
    return 'Correct. The answer and method are shown below for review.';
  }

  if (status === 'skipped') {
    return 'Skipped. The answer and method are shown below.';
  }

  return 'Not quite. The answer and method are shown below.';
}

function getResultTone(status) {
  if (status === 'correct') {
    return 'success';
  }

  if (status === 'skipped') {
    return 'neutral';
  }

  return 'warning';
}

export default function CurriculumPage() {
  const [chapterId, setChapterId] = useState(ALL_CHAPTERS_VALUE);
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [answerInput, setAnswerInput] = useState('');
  const [attempts, setAttempts] = useState([]);
  const [resultState, setResultState] = useState(null);
  const [formMessage, setFormMessage] = useState('');
  const seenQuestionKeysRef = useRef(new Set());
  const questionStartedAtRef = useRef(0);
  const answerInputRef = useRef(null);

  const sessionStats = useMemo(
    () => computeCurriculumSessionStats(attempts),
    [attempts]
  );
  const selectedChapter = useMemo(
    () => getSelectedChapter(chapterId),
    [chapterId]
  );
  const sessionAccuracy = useMemo(
    () => getSessionAccuracy(sessionStats),
    [sessionStats]
  );
  const chapterFocusLabel = selectedChapter
    ? `${selectedChapter.label}: ${selectedChapter.title}`
    : 'All chapters';
  const chapterFocusCopy = selectedChapter
    ? 'Locked to one arithmetic chapter for deliberate repetition.'
    : 'Mixing the included arithmetic chapters for a broader session.';
  const briefingMetrics = useMemo(
    () => [
      {
        label: 'Current focus',
        value: chapterFocusLabel,
        copy: chapterFocusCopy
      },
      {
        label: 'Session accuracy',
        value: `${sessionAccuracy}%`,
        copy: sessionStats.answered
          ? `${sessionStats.correct} correct out of ${sessionStats.answered} answered.`
          : 'Accuracy starts updating after the first checked answer.'
      },
      {
        label: 'Average response',
        value: `${sessionStats.averageResponseMs} ms`,
        copy: sessionStats.answered
          ? 'Measured from answered prompts in this tab only.'
          : 'Pace starts tracking after the first checked answer.'
      }
    ],
    [
      chapterFocusCopy,
      chapterFocusLabel,
      sessionAccuracy,
      sessionStats.answered,
      sessionStats.averageResponseMs,
      sessionStats.correct
    ]
  );
  const statsTiles = useMemo(
    () => [
      { label: 'Answered', value: sessionStats.answered },
      { label: 'Correct', value: sessionStats.correct },
      { label: 'Skipped', value: sessionStats.skipped },
      { label: 'Streak', value: sessionStats.streak },
      {
        label: 'Average response',
        value: `${sessionStats.averageResponseMs} ms`,
        wide: true
      }
    ],
    [sessionStats]
  );
  const questionMeta = useMemo(
    () => [
      {
        label: 'Accuracy',
        value: `${sessionAccuracy}%`
      },
      {
        label: 'Streak',
        value: sessionStats.streak
      },
      {
        label: 'Avg pace',
        value: `${sessionStats.averageResponseMs} ms`
      }
    ],
    [sessionAccuracy, sessionStats.averageResponseMs, sessionStats.streak]
  );

  const loadNextQuestion = useCallback((selectedChapterId) => {
    const nextQuestion = createCurriculumQuestion({
      chapterId: selectedChapterId,
      excludedKeys: seenQuestionKeysRef.current
    });

    seenQuestionKeysRef.current.add(nextQuestion.questionKey);
    questionStartedAtRef.current = Date.now();
    setCurrentQuestion(nextQuestion);
    setAnswerInput('');
    setResultState(null);
    setFormMessage('');
  }, []);

  useEffect(() => {
    loadNextQuestion(chapterId);
  }, [chapterId, loadNextQuestion]);

  useEffect(() => {
    if (currentQuestion && !resultState) {
      answerInputRef.current?.focus({ preventScroll: true });
    }
  }, [currentQuestion, resultState]);

  const handleAnswerSubmit = (event) => {
    event.preventDefault();

    if (!currentQuestion || resultState) {
      return;
    }

    const trimmedAnswer = answerInput.trim();
    if (!trimmedAnswer) {
      setFormMessage('Type an answer or skip this question.');
      return;
    }

    const responseMs = Date.now() - questionStartedAtRef.current;
    const isCorrect = checkCurriculumAnswer(currentQuestion, trimmedAnswer);

    setAttempts((previousAttempts) => [
      ...previousAttempts,
      {
        questionKey: currentQuestion.questionKey,
        skipped: false,
        isCorrect,
        responseMs
      }
    ]);
    setResultState({
      status: isCorrect ? 'correct' : 'incorrect'
    });
    setFormMessage('');
  };

  const handleSkip = () => {
    if (!currentQuestion || resultState) {
      return;
    }

    setAttempts((previousAttempts) => [
      ...previousAttempts,
      {
        questionKey: currentQuestion.questionKey,
        skipped: true,
        isCorrect: false,
        responseMs: Date.now() - questionStartedAtRef.current
      }
    ]);
    setResultState({
      status: 'skipped'
    });
    setFormMessage('');
  };

  const handleNextQuestion = () => {
    loadNextQuestion(chapterId);
  };

  return (
    <>
      <Head>
        <title>Curriculum Practice | Mental Math</title>
        <meta
          name='description'
          content='Practice the arithmetic curriculum chapters with the same equation-style questions as the main trainer.'
        />
      </Head>

      <div className='curriculum-page-shell'>
        <section className='panel curriculum-briefing appear-up'>
          <div className='curriculum-briefing-head'>
            <div className='curriculum-briefing-copy'>
              <p className='hero-tag'>Standalone Curriculum</p>
              <div className='curriculum-briefing-title-row'>
                <h1>Curriculum Practice</h1>
                <span className='mode-pill mode-pill-manual curriculum-session-pill'>
                  Session only
                </span>
              </div>
              <p className='curriculum-briefing-copyline'>
                Practice the arithmetic chapters only. Each prompt stays
                equation-first, and the full review stays inside the live
                session surface.
              </p>
            </div>

            <div className='curriculum-briefing-note'>
              <p className='curriculum-briefing-note-label'>Mode rules</p>
              <p className='curriculum-briefing-note-copy'>
                Chapters 0 through 4 only. Every prompt is a mental-calculation
                equation. Skipping reveals the answer and the method note for
                that chapter.
              </p>
            </div>
          </div>

          <div className='curriculum-briefing-grid'>
            {briefingMetrics.map((metric) => (
              <article key={metric.label} className='curriculum-briefing-card'>
                <h2>{metric.label}</h2>
                <p className='curriculum-briefing-value'>{metric.value}</p>
                <p className='curriculum-briefing-detail'>{metric.copy}</p>
              </article>
            ))}
          </div>
        </section>

        <section className='curriculum-dashboard'>
          <aside className='panel paper-panel curriculum-control-card appear-up curriculum-stagger-1'>
            <div className='curriculum-card-head'>
              <p className='panel-kicker'>Question Scope</p>
              <h2>
                <IconLabel icon={ListChecksIcon} className='icon-label-heading'>
                  Set the chapter
                </IconLabel>
              </h2>
              <p className='panel-copy'>
                Stay inside one arithmetic chapter or mix the included
                mental-calculation chapters.
              </p>
            </div>

            <div className='curriculum-filter-block'>
              <div className='curriculum-filter'>
                <label htmlFor='curriculum-chapter'>Chapter</label>
                <select
                  id='curriculum-chapter'
                  value={chapterId}
                  onChange={(event) => setChapterId(event.target.value)}
                >
                  <option value={ALL_CHAPTERS_VALUE}>All chapters</option>
                  {CURRICULUM_CHAPTERS.map((chapter) => (
                    <option key={chapter.id} value={chapter.id}>
                      {`${chapter.label}: ${chapter.title}`}
                    </option>
                  ))}
                </select>
              </div>

              <div className='curriculum-focus-card'>
                <p className='curriculum-focus-label'>Current focus</p>
                <p className='curriculum-focus-value'>{chapterFocusLabel}</p>
                <p className='curriculum-focus-copy'>{chapterFocusCopy}</p>
              </div>
            </div>
          </aside>

          <article className='panel chalk-panel curriculum-question-card appear-up curriculum-stagger-2'>
            {currentQuestion ? (
              <>
                <div className='curriculum-question-top'>
                  <div className='curriculum-question-title'>
                    <p className='panel-kicker'>
                      {`${currentQuestion.chapterLabel}: ${currentQuestion.chapterTitle}`}
                    </p>
                    <h2>
                      <IconLabel
                        icon={FunctionIcon}
                        className='icon-label-heading'
                      >
                        {currentQuestion.skill}
                      </IconLabel>
                    </h2>
                  </div>
                  <span className='mode-pill mode-pill-manual curriculum-question-pill'>
                    Session only
                  </span>
                </div>

                <div className='curriculum-question-meta'>
                  {questionMeta.map((item) => (
                    <article
                      key={item.label}
                      className='curriculum-question-meta-card'
                    >
                      <h3>{item.label}</h3>
                      <p>{item.value}</p>
                    </article>
                  ))}
                </div>

                <div className='curriculum-problem-stage'>
                  <p className='problem-line curriculum-problem-line'>
                    {currentQuestion.operation === 'EXPONENTIATION' ? (
                      <>
                        <span>{currentQuestion.leftOperand}</span>
                        <sup className='problem-exponent'>
                          {currentQuestion.rightOperand}
                        </sup>
                      </>
                    ) : (
                      <>
                        <span>{currentQuestion.leftOperand}</span>
                        <span>
                          {OPERATION_META[currentQuestion.operation].symbol}
                        </span>
                        <span>{currentQuestion.rightOperand}</span>
                      </>
                    )}
                  </p>
                </div>

                <div className='curriculum-response-shell'>
                  <form
                    className='answer-form curriculum-answer-form'
                    onSubmit={handleAnswerSubmit}
                  >
                    <label htmlFor='curriculum-answer'>Your answer</label>
                    <input
                      ref={answerInputRef}
                      id='curriculum-answer'
                      type='text'
                      inputMode='numeric'
                      autoComplete='off'
                      value={answerInput}
                      onChange={(event) => {
                        setAnswerInput(event.target.value);
                        if (formMessage) {
                          setFormMessage('');
                        }
                      }}
                      placeholder='Type integer answer'
                      disabled={Boolean(resultState)}
                    />

                    {formMessage ? (
                      <p className='feedback warning'>{formMessage}</p>
                    ) : null}

                    <div className='inline-actions curriculum-actions'>
                      {resultState ? (
                        <button
                          type='button'
                          className='button button-strong'
                          onClick={handleNextQuestion}
                        >
                          Next question
                        </button>
                      ) : (
                        <>
                          <button
                            type='submit'
                            className='button button-strong'
                          >
                            Check answer
                          </button>
                          <button
                            type='button'
                            className='button button-quiet'
                            onClick={handleSkip}
                          >
                            Skip question
                          </button>
                        </>
                      )}
                    </div>
                  </form>

                  {resultState ? (
                    <section className='curriculum-review-shell'>
                      <p
                        className={`feedback ${getResultTone(
                          resultState.status
                        )}`}
                      >
                        {getResultCopy(resultState.status)}
                      </p>
                      <div className='curriculum-review-grid'>
                        <article className='curriculum-review-card'>
                          <h3>Correct answer</h3>
                          <p className='curriculum-review-value'>
                            {formatCurriculumAnswer(currentQuestion)}
                          </p>
                        </article>
                        <article className='curriculum-review-card'>
                          <h3>Method</h3>
                          <p>{currentQuestion.methodNote}</p>
                        </article>
                      </div>
                    </section>
                  ) : (
                    <p className='curriculum-question-hint'>
                      Submit an answer or skip this prompt to reveal the answer
                      and the method note without leaving the live session
                      surface.
                    </p>
                  )}
                </div>
              </>
            ) : (
              <div className='curriculum-loading-shell'>
                <p className='panel-kicker'>Loading</p>
                <h2>Preparing the first prompt</h2>
                <p className='placeholder-text'>
                  Building a chapter question and opening the live practice
                  surface.
                </p>
              </div>
            )}
          </article>

          <aside
            className='panel paper-panel curriculum-stats-card appear-up curriculum-stagger-3'
            aria-label='Session stats'
          >
            <div className='curriculum-card-head'>
              <p className='panel-kicker'>Live session</p>
              <h2>
                <IconLabel
                  icon={ChartLineUpIcon}
                  className='icon-label-heading'
                >
                  Session Dashboard
                </IconLabel>
              </h2>
              <p className='panel-copy'>
                Track this tab only. Nothing from curriculum practice writes to
                saved progress.
              </p>
            </div>

            <div className='curriculum-stats-grid'>
              {statsTiles.map((tile) => (
                <article
                  key={tile.label}
                  className={`curriculum-stat-tile${
                    tile.wide ? ' curriculum-stat-tile-wide' : ''
                  }`.trim()}
                >
                  <h3>{tile.label}</h3>
                  <p className='curriculum-stat-value'>{tile.value}</p>
                </article>
              ))}
            </div>

            <p className='curriculum-stats-note'>
              This practice page is standalone for now. It does not write to
              saved progress.
            </p>
          </aside>
        </section>
      </div>
    </>
  );
}
