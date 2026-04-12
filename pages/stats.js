import Head from 'next/head';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AI_MODE_LOG_TABLE,
  fetchAllAiModeLogs
} from 'utils/aiModeLogs.js';
import { formatDuration } from 'utils/mathEngine.js';
import { fetchAllProgressLogs } from 'utils/progressLogs.js';
import {
  buildOperationBreakdown,
  buildProgressOverview,
  buildRecentAttempts,
  buildRecentSessions,
  getOperationDisplayLabel,
  getSessionDigitsLabel,
  getSessionModeLabel,
  mergeProgressEntries,
  PROGRESS_SOURCE_LABELS
} from 'utils/progressDashboard.js';
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
  const { client, user, isConfigured, isAdmin } = useSupabaseAuth();
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
      const [manualLogs, aiLogs] = await Promise.all([
        fetchAllProgressLogs(client, userId),
        isAdmin ? fetchAllAiModeLogs(client, userId) : Promise.resolve([])
      ]);

      setLogs(mergeProgressEntries(manualLogs, aiLogs));
      setIsLoading(false);
    } catch (error) {
      setLogs([]);
      setErrorMessage(error?.message || 'Could not load progress data.');
      setIsLoading(false);
    }
  }, [client, isAdmin, userId]);

  useEffect(() => {
    if (!userId) {
      setLogs([]);
      setIsLoading(false);
      return;
    }

    loadLogs();
  }, [loadLogs, userId]);

  const overview = useMemo(() => buildProgressOverview(logs), [logs]);
  const operationBreakdown = useMemo(() => buildOperationBreakdown(logs), [logs]);
  const recentSessions = useMemo(() => buildRecentSessions(logs), [logs]);
  const recentAttempts = useMemo(() => buildRecentAttempts(logs), [logs]);

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

    const [manualResponse, aiResponse] = await Promise.all([
      client.from('progress_logs').delete().eq('user_id', userId),
      isAdmin
        ? client.from(AI_MODE_LOG_TABLE).delete().eq('user_id', userId)
        : Promise.resolve({ error: null })
    ]);

    setIsResetting(false);

    const resetError = manualResponse.error || aiResponse.error;
    if (resetError) {
      setErrorMessage(resetError.message);
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
                Complete a training round from the trainer page. Manual attempts and
                AI MODE activity will appear here.
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
                      <h3>{getOperationDisplayLabel(row.operation)}</h3>
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
                        <th>Source</th>
                        <th>Mode</th>
                        <th>Digits</th>
                        <th>Score</th>
                        <th>Avg Speed</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentSessions.map((session) => (
                        <tr key={session.sessionKey}>
                          <td>{formatTimestamp(session.latestCreatedAt)}</td>
                          <td>
                            <span className={`mode-pill mode-pill-${session.sourceMode}`}>
                              {PROGRESS_SOURCE_LABELS[session.sourceMode]}
                            </span>
                          </td>
                          <td>{getSessionModeLabel(session)}</td>
                          <td>{getSessionDigitsLabel(session)}</td>
                          <td>
                            {session.correct}/{session.attempts}
                          </td>
                          <td>{formatDuration(session.totalResponseMs / session.attempts)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>

              <section className='panel paper-panel appear-up'>
                <h2>Recent Attempts</h2>
                <ul className='attempt-list'>
                  {recentAttempts.map((entry) => (
                    <li key={entry.id}>
                      <div className='attempt-equation'>{entry.promptText}</div>
                      <div className='attempt-result'>
                        <span className={`mode-pill mode-pill-${entry.sourceMode}`}>
                          {PROGRESS_SOURCE_LABELS[entry.sourceMode]}
                        </span>
                        <span className={entry.isCorrect ? 'good' : 'bad'}>
                          {entry.sourceMode === 'ai'
                            ? entry.sourceKind === 'custom'
                              ? 'Solved'
                              : 'Auto-solved'
                            : entry.isCorrect
                            ? 'Correct'
                            : 'Incorrect'}
                        </span>
                        {entry.sourceMode === 'ai' && (
                          <span className='attempt-answer'>{entry.resultExactText}</span>
                        )}
                        {entry.sourceMode === 'ai' && entry.resultKind === 'fraction' && (
                          <span className='attempt-answer'>{entry.resultDecimalText}</span>
                        )}
                        <span>{formatDuration(entry.responseMs)}</span>
                        <span>{formatTimestamp(entry.createdAt)}</span>
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            </>
          )}
        </>
      )}
    </>
  );
}
