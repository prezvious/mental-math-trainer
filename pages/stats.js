import Head from 'next/head';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { formatDuration, OPERATION_META } from 'utils/mathEngine.js';
import { fetchAllProgressLogs } from 'utils/progressLogs.js';
import { useSupabaseAuth } from 'utils/supabaseAuthContext.js';

function formatTimestamp(isoDate) {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  }).format(new Date(isoDate));
}

export default function StatsPage() {
  const { client, user, isConfigured } = useSupabaseAuth();
  const userId = user?.id ?? null;
  const [logs, setLogs] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const loadLogs = useCallback(async () => {
    if (!client || !userId) {
      return;
    }

    setIsLoading(true);
    setErrorMessage('');

    try {
      const data = await fetchAllProgressLogs(client, userId);
      setLogs(data);
      setIsLoading(false);
    } catch (error) {
      setLogs([]);
      setErrorMessage(error?.message || 'Could not load progress data.');
      setIsLoading(false);
    }
  }, [client, userId]);

  useEffect(() => {
    if (!userId) {
      setLogs([]);
      setIsLoading(false);
      return;
    }
    loadLogs();
  }, [loadLogs, userId]);

  const overview = useMemo(() => {
    const totalAttempts = logs.length;
    const correctAttempts = logs.filter((entry) => entry.is_correct).length;
    const totalResponseMs = logs.reduce((sum, entry) => sum + entry.response_ms, 0);
    const averageResponseMs = totalAttempts
      ? Math.round(totalResponseMs / totalAttempts)
      : 0;
    const accuracy = totalAttempts ? (correctAttempts / totalAttempts) * 100 : 0;
    const fastest = logs.length
      ? logs.reduce(
          (minValue, entry) => Math.min(minValue, entry.response_ms),
          Number.POSITIVE_INFINITY
        )
      : 0;

    return {
      totalAttempts,
      correctAttempts,
      accuracy,
      averageResponseMs,
      totalResponseMs,
      fastest
    };
  }, [logs]);

  const operationBreakdown = useMemo(() => {
    const grouped = {};
    for (const [operation] of Object.entries(OPERATION_META)) {
      grouped[operation] = { attempts: 0, correct: 0, totalResponseMs: 0 };
    }

    logs.forEach((entry) => {
      if (!grouped[entry.operation]) {
        grouped[entry.operation] = { attempts: 0, correct: 0, totalResponseMs: 0 };
      }
      grouped[entry.operation].attempts += 1;
      grouped[entry.operation].totalResponseMs += entry.response_ms;
      if (entry.is_correct) {
        grouped[entry.operation].correct += 1;
      }
    });

    return Object.entries(grouped).map(([operation, values]) => ({
      operation,
      ...values,
      accuracy: values.attempts ? (values.correct / values.attempts) * 100 : 0,
      averageResponseMs: values.attempts
        ? Math.round(values.totalResponseMs / values.attempts)
        : 0
    }));
  }, [logs]);

  const recentSessions = useMemo(() => {
    const bySession = new Map();

    logs.forEach((entry) => {
      const key = entry.session_id;
      const existing = bySession.get(key) || {
        sessionId: key,
        operations: new Set(),
        digitPairs: new Set(),
        attempts: 0,
        correct: 0,
        totalResponseMs: 0,
        latestCreatedAt: entry.created_at
      };

      existing.operations.add(entry.operation);
      existing.digitPairs.add(`${entry.digits_left}x${entry.digits_right}`);
      existing.attempts += 1;
      existing.totalResponseMs += entry.response_ms;
      if (entry.is_correct) {
        existing.correct += 1;
      }
      if (new Date(entry.created_at).getTime() > new Date(existing.latestCreatedAt).getTime()) {
        existing.latestCreatedAt = entry.created_at;
      }

      bySession.set(key, existing);
    });

    return [...bySession.values()]
      .sort(
        (sessionA, sessionB) =>
          new Date(sessionB.latestCreatedAt).getTime() -
          new Date(sessionA.latestCreatedAt).getTime()
      )
      .slice(0, 8);
  }, [logs]);

  const recentAttempts = useMemo(() => logs.slice(0, 12), [logs]);

  const handleReset = async () => {
    if (!client || !userId || isResetting) {
      return;
    }
    const shouldReset = window.confirm(
      'Delete all stored progress logs for your account? This cannot be undone.'
    );
    if (!shouldReset) {
      return;
    }

    setIsResetting(true);
    setErrorMessage('');
    const { error } = await client.from('progress_logs').delete().eq('user_id', userId);
    setIsResetting(false);

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    setLogs([]);
  };

  return (
    <>
      <Head>
        <title>Progress Dashboard | Mental Math Studio</title>
        <meta
          name='description'
          content='Explore your mental math progress analytics, recent sessions, and speed trends.'
        />
      </Head>

      <section className='hero-panel appear-up'>
        <p className='hero-tag'>Progress Dashboard</p>
        <h1>Session Analytics</h1>
        <p>
          Review every submission, including speed, correctness, and operation-level
          consistency.
        </p>
      </section>

      {!isConfigured && (
        <section className='panel warning-panel appear-up'>
          <h2>Account Setup Missing</h2>
          <p>
            Progress data is unavailable until account features are configured.
          </p>
        </section>
      )}

      {!user && (
        <section className='panel paper-panel appear-up'>
          <h2>Log In Required</h2>
          <p>Sign in to view your personal progress and session analytics.</p>
          <div className='inline-actions'>
            <Link href='/login' className='button button-strong'>
              Log in
            </Link>
            <Link href='/signup' className='button button-quiet'>
              Sign up
            </Link>
          </div>
        </section>
      )}

      {user && (
        <>
          <section className='stats-actions appear-up'>
            <button
              type='button'
              onClick={loadLogs}
              className='button button-quiet'
              disabled={isLoading}
            >
              {isLoading ? 'Refreshing...' : 'Refresh data'}
            </button>
            <button
              type='button'
              onClick={handleReset}
              className='button button-danger'
              disabled={isResetting}
            >
              {isResetting ? 'Resetting...' : 'Reset all progress'}
            </button>
          </section>

          {errorMessage && (
            <section className='panel warning-panel appear-up'>
              <h2>Request Failed</h2>
              <p>{errorMessage}</p>
            </section>
          )}

          {isLoading && (
            <section className='panel paper-panel appear-up'>
              <h2>Loading progress data...</h2>
            </section>
          )}

          {!isLoading && !errorMessage && logs.length === 0 && (
            <section className='panel paper-panel appear-up'>
              <h2>No Records Yet</h2>
              <p>
                Complete a training round from the trainer page. Every submitted
                answer will appear here.
              </p>
              <Link href='/' className='button button-strong'>
                Open trainer
              </Link>
            </section>
          )}

          {!isLoading && !errorMessage && logs.length > 0 && (
            <>
              <section className='summary-panel appear-up'>
                <h2>Overall Performance</h2>
                <div className='summary-grid'>
                  <article>
                    <h3>Total Attempts</h3>
                    <p>{overview.totalAttempts}</p>
                  </article>
                  <article>
                    <h3>Accuracy</h3>
                    <p>{overview.accuracy.toFixed(1)}%</p>
                  </article>
                  <article>
                    <h3>Avg Response</h3>
                    <p>{formatDuration(overview.averageResponseMs)}</p>
                  </article>
                  <article>
                    <h3>Fastest Answer</h3>
                    <p>{formatDuration(overview.fastest)}</p>
                  </article>
                </div>
              </section>

              <section className='panel paper-panel appear-up'>
                <h2>Operation Breakdown</h2>
                <div className='operation-grid'>
                  {operationBreakdown.map((row) => (
                    <article key={row.operation} className='operation-card'>
                      <h3>{OPERATION_META[row.operation]?.label || row.operation}</h3>
                      <p>Attempts: {row.attempts}</p>
                      <p>Accuracy: {row.accuracy.toFixed(1)}%</p>
                      <p>Avg speed: {formatDuration(row.averageResponseMs)}</p>
                    </article>
                  ))}
                </div>
              </section>

              <section className='panel chalk-panel appear-up'>
                <h2>Recent Sessions</h2>
                <div className='table-wrap'>
                  <table>
                    <thead>
                      <tr>
                        <th>When</th>
                        <th>Mode</th>
                        <th>Digits</th>
                        <th>Score</th>
                        <th>Avg Speed</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentSessions.map((session) => {
                        const isMixed = session.operations.size > 1;
                        const modeLabel = isMixed
                          ? 'Mixed'
                          : OPERATION_META[session.operations.values().next().value]?.label || session.operations.values().next().value;
                        const digitsLabel = isMixed
                          ? 'Varies'
                          : session.digitPairs.values().next().value;
                        return (
                          <tr key={session.sessionId}>
                            <td>{formatTimestamp(session.latestCreatedAt)}</td>
                            <td>{modeLabel}</td>
                            <td>{digitsLabel}</td>
                            <td>
                              {session.correct}/{session.attempts}
                            </td>
                            <td>{formatDuration(session.totalResponseMs / session.attempts)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </section>

              <section className='panel paper-panel appear-up'>
                <h2>Recent Attempts</h2>
                <ul className='attempt-list'>
                  {recentAttempts.map((entry) => {
                    const operation = OPERATION_META[entry.operation]?.symbol || '?';
                    return (
                      <li key={entry.id}>
                        <div className='attempt-equation'>
                          {entry.operation === 'EXPONENTIATION'
                            ? <>{entry.left_operand}<sup>{entry.right_operand}</sup></>
                            : <>{entry.left_operand} {operation} {entry.right_operand}</>
                          }
                        </div>
                        <div className='attempt-result'>
                          <span className={entry.is_correct ? 'good' : 'bad'}>
                            {entry.is_correct ? 'Correct' : 'Incorrect'}
                          </span>
                          <span>{formatDuration(entry.response_ms)}</span>
                          <span>{formatTimestamp(entry.created_at)}</span>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </section>
            </>
          )}
        </>
      )}
    </>
  );
}
