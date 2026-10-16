import Head from 'next/head';
import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import IconLabel from 'components/IconLabel.js';
import PageIntro from 'components/PageIntro.js';
import ArrowsClockwiseIcon from 'images/phosphor/arrows-clockwise.svg';
import ChartLineUpIcon from 'images/phosphor/chart-line-up.svg';
import FunctionIcon from 'images/phosphor/function.svg';
import HouseIcon from 'images/phosphor/house.svg';
import ListChecksIcon from 'images/phosphor/list-checks.svg';
import TimerIcon from 'images/phosphor/timer.svg';
import { AI_MODE_LOG_TABLE } from 'utils/aiModeLogs.js';
import { persistProgressLogBatches } from 'utils/progressLogs.js';
import { formatDuration } from 'utils/mathEngine.js';
import {
  createEmptyProgressDashboard,
  buildGuestProgressDashboard,
  fetchProgressDashboardData,
  getOperationDisplayLabel,
  PROGRESS_SOURCE_LABELS,
  RECENT_PROGRESS_WINDOW_DAYS
} from 'utils/progressDashboard.js';
import { acknowledgeAccountProgressRows, claimGuestSessionImport, clearGuestHistory, clearPendingAccountProgressRows, getGuestHistory, getPendingAccountProgressRows, markGuestSessionImported, recoverInterruptedGuestSessions, DEVICE_HISTORY_DAYS } from 'utils/progressStorage.js';
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
  const { client, user, isConfigured, isLoading: isCheckingAccount, isAdmin } = useSupabaseAuth();
  const userId = user?.id ?? null;
  const [dashboardData, setDashboardData] = useState(createEmptyProgressDashboard);
  const [isLoading, setIsLoading] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [importOffer, setImportOffer] = useState(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importDismissed, setImportDismissed] = useState(false);
  const loadSequenceRef = useRef(0);
  const currentUserIdRef = useRef(userId);
  currentUserIdRef.current = userId;

  const replayAccountQueue = useCallback(async () => {
    if (!client || !userId) return;
    let pending;
    try {
      pending = await getPendingAccountProgressRows(userId);
    } catch (_error) {
      return;
    }
    for (let offset = 0; offset < pending.length; offset += 500) {
      const { data, error } = await client.auth.getUser();
      if (error || data?.user?.id !== userId || currentUserIdRef.current !== userId) {
        throw new Error('Pending account progress was not synced because the account changed.');
      }
      const batch = pending.slice(offset, offset + 500);
      await persistProgressLogBatches(client, batch, 500);
      await acknowledgeAccountProgressRows(batch);
    }
  }, [client, userId]);

  const loadLogs = useCallback(async () => {
    const sequence = ++loadSequenceRef.current;
    setIsLoading(true);
    setErrorMessage('');

    try {
      if (!userId) await recoverInterruptedGuestSessions();
      if (userId && client) await replayAccountQueue();
      const nextDashboardData = userId && client
        ? await fetchProgressDashboardData(client)
        : buildGuestProgressDashboard(await getGuestHistory());
      if (sequence !== loadSequenceRef.current) return;
      setDashboardData(nextDashboardData);
      setIsLoading(false);
    } catch (error) {
      if (sequence !== loadSequenceRef.current) return;
      setDashboardData(createEmptyProgressDashboard());
      setErrorMessage(error?.message || 'Could not load progress data.');
      setIsLoading(false);
    }
  }, [client, replayAccountQueue, userId]);

  useEffect(() => {
    if (isCheckingAccount) return undefined;
    void loadLogs();
    return () => { loadSequenceRef.current += 1; };
  }, [isCheckingAccount, loadLogs]);

  useEffect(() => {
    if (!userId) {
      setImportOffer(null);
      setImportDismissed(false);
      return undefined;
    }
    let cancelled = false;
    getGuestHistory().then((history) => {
      if (!cancelled) {
        const sessions = history.sessions.filter((entry) => entry.state !== 'active' && entry.attemptCount > 0 &&
          (!entry.importOwnerId || entry.importOwnerId === userId));
        const ids = new Set(sessions.map((entry) => entry.id));
        setImportOffer({ sessions, attempts: history.attempts.filter((entry) => ids.has(entry.sessionId)) });
      }
    }).catch(() => { if (!cancelled) setImportOffer(null); });
    return () => { cancelled = true; };
  }, [userId]);

  const { overview, operationBreakdown, recentSessions, recentAttempts } = dashboardData;

  const handleClearGuestHistory = async () => {
    if (!window.confirm('Clear saved device history? This does not change your theme or trainer settings.')) return;
    setIsResetting(true);
    try {
      await clearGuestHistory();
      await loadLogs();
    } catch (error) {
      setErrorMessage(error?.message || 'Could not clear device history.');
    } finally {
      setIsResetting(false);
    }
  };

  const handleImport = async () => {
    if (!client || !userId || !importOffer || isImporting) return;
    const owner = userId;
    setIsImporting(true);
    setErrorMessage('');
    const importWork = async () => {
      for (const session of importOffer.sessions) {
        const freshHistory = await getGuestHistory();
        if (!freshHistory.sessions.some((entry) => entry.id === session.id && !entry.importedTo)) {
          continue;
        }
        await claimGuestSessionImport(session.id, owner);
        const source = freshHistory.attempts.filter((attempt) => attempt.sessionId === session.id)
          .sort((a, b) => a.questionIndex - b.questionIndex);
        for (let offset = 0; offset < source.length; offset += 500) {
          const { data, error } = await client.auth.getUser();
          if (error || data?.user?.id !== owner || currentUserIdRef.current !== owner) {
            throw new Error('Import stopped because the account changed. Sign in to the original account and retry.');
          }
          const rows = source.slice(offset, offset + 500).map((attempt) => ({
            ...attempt.row,
            user_id: owner,
            created_at: attempt.createdAt
          }));
          await persistProgressLogBatches(client, rows, 500);
        }
        if (currentUserIdRef.current !== owner) throw new Error('Import stopped because the account changed.');
        await markGuestSessionImported(session.id, owner);
      }
    };
    try {
      if (navigator.locks?.request) {
        await navigator.locks.request('mental-math-guest-import', importWork);
      } else {
        await importWork();
      }
      setImportOffer(null);
      await loadLogs();
    } catch (error) {
      setErrorMessage(error?.message || 'Import failed. Device history is still available to retry.');
    } finally {
      setIsImporting(false);
    }
  };

  const handleReset = async () => {
    if (!client || !userId || isResetting || isImporting || isLoading) {
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

    try {
      await clearPendingAccountProgressRows(userId);
    } catch (error) {
      setIsResetting(false);
      setErrorMessage(error?.message || 'Could not clear pending account progress.');
      return;
    }

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

    setDashboardData(createEmptyProgressDashboard());
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

      <PageIntro title='Progress' description={`Recent ${RECENT_PROGRESS_WINDOW_DAYS}-day history · ${user ? 'Account' : 'This device'}`} />

      {isCheckingAccount && <section className='panel paper-panel empty-state-panel' role='status'>Checking your account…</section>}

      {!isCheckingAccount && (
        <>
          {user && importOffer?.attempts.length > 0 && !importDismissed && (
            <section className='panel paper-panel appear-up import-offer'>
              <h2>Save this device history to your account?</h2>
              <p>{importOffer.sessions.length} {importOffer.sessions.length === 1 ? 'session' : 'sessions'} and {importOffer.attempts.length} submitted answers can be imported to {user.email}. Nothing is uploaded until you choose Import.</p>
              <div className='inline-actions'>
                <button type='button' className='button button-strong' onClick={() => void handleImport()} disabled={isImporting}>
                  {isImporting ? 'Importing…' : 'Import history'}
                </button>
                <button type='button' className='button button-quiet' onClick={() => setImportDismissed(true)} disabled={isImporting}>Not now</button>
              </div>
            </section>
          )}
          <section className='stats-actions appear-up'>
            <button
              type='button'
              onClick={loadLogs}
              className='button button-quiet'
              disabled={isLoading}
            >
              <IconLabel icon={ArrowsClockwiseIcon} className='icon-label-button'>
                {isLoading ? 'Refreshing...' : 'Refresh data'}
              </IconLabel>
            </button>
            <button
              type='button'
              onClick={user ? handleReset : handleClearGuestHistory}
              className='button button-danger'
              disabled={isResetting || isImporting || isLoading}
            >
              {isResetting ? 'Clearing...' : user ? 'Reset account progress' : 'Clear device history'}
            </button>
          </section>

          {!user && !isLoading && !errorMessage && (
            <p className='save-status'>Saved on this device · Last {DEVICE_HISTORY_DAYS} days, up to 100 sessions or 10,000 attempts. Clearing browser data removes this history. {isConfigured && <Link href='/login' className='text-link'>Log in to sync it</Link>}</p>
          )}

          {errorMessage && (
            <section className='panel warning-panel appear-up empty-state-panel'>
              <p className='panel-kicker'>Request failed</p>
              <h2>Dashboard data could not load</h2>
              <p>{errorMessage}</p>
            </section>
          )}

          {isLoading && (
            <section className='panel paper-panel appear-up empty-state-panel'>
              <p className='panel-kicker'>Loading</p>
              <h2>Building your latest dashboard snapshot</h2>
            </section>
          )}

          {!isLoading && !errorMessage && overview.totalAttempts === 0 && (
            <section className='panel paper-panel appear-up empty-state-panel'>
                <p className='panel-kicker'>No history yet</p>
              <h2>Start a round to build your history</h2>
              <p>
                Submitted answers from Trainer and Mixed rounds will appear here.
              </p>
              <div className='inline-actions'>
                <Link href='/' className='button button-strong'>
                  <IconLabel icon={HouseIcon} className='icon-label-button'>
                    Open trainer
                  </IconLabel>
                </Link>
                <Link href='/mixed' className='button button-quiet'>
                  Train mixed mode
                </Link>
              </div>
            </section>
          )}

          {!isLoading && !errorMessage && overview.totalAttempts > 0 && (
            <>
              <section className='summary-panel appear-up summary-panel-dashboard'>
                <div className='panel-title-row'>
                  <h2>
                    <IconLabel icon={ChartLineUpIcon} className='icon-label-heading'>
                      Overall Performance
                    </IconLabel>
                  </h2>
                </div>
                <p className='section-intro'>
                  A quick read on volume, accuracy, and response speed.
                </p>
                <div className='summary-grid'>
                  <article>
                    <h3>Total Attempts</h3>
                    <p className='summary-metric-value'>{overview.totalAttempts}</p>
                  </article>
                  <article>
                    <h3>Accuracy</h3>
                    <p className='summary-metric-value'>{overview.accuracy.toFixed(1)}%</p>
                  </article>
                  <article>
                    <h3>Avg Response</h3>
                    <p className='summary-metric-value'>
                      {formatDuration(overview.averageResponseMs)}
                    </p>
                  </article>
                  <article>
                    <h3>Fastest Answer</h3>
                    <p className='summary-metric-value'>{formatDuration(overview.fastest)}</p>
                  </article>
                </div>
              </section>

              <section className='panel paper-panel appear-up dashboard-section'>
                <div className='panel-title-row'>
                  <h2>
                    <IconLabel icon={FunctionIcon} className='icon-label-heading'>
                      Operation Breakdown
                    </IconLabel>
                  </h2>
                </div>
                <p className='section-intro'>
                  Compare how each operation behaves before you choose the next repetition block.
                </p>
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

              <section className='panel chalk-panel appear-up dashboard-section'>
                <div className='panel-title-row'>
                  <h2>
                    <IconLabel icon={TimerIcon} className='icon-label-heading'>
                      Recent Sessions
                    </IconLabel>
                  </h2>
                </div>
                <p className='section-intro'>
                  Showing sessions from the last {RECENT_PROGRESS_WINDOW_DAYS} days.
                </p>
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
                        {!user && <th>Round</th>}
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
                          <td>{session.modeLabel}</td>
                          <td>{session.digitsLabel}</td>
                          <td>
                            {session.correct}/{session.attempts}
                          </td>
                          <td>{formatDuration(session.averageResponseMs)}</td>
                          {!user && <td>{session.state === 'ended' ? 'Ended early' :
                            session.state === 'interrupted' ? 'Interrupted' :
                            session.state === 'completed' ? 'Completed' : 'In progress'}</td>}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>

              <section className='panel paper-panel appear-up dashboard-section'>
                <div className='panel-title-row'>
                  <h2>
                    <IconLabel icon={ListChecksIcon} className='icon-label-heading'>
                      Recent Attempts
                    </IconLabel>
                  </h2>
                </div>
                <p className='section-intro'>
                  Showing attempts from the last {RECENT_PROGRESS_WINDOW_DAYS} days.
                </p>
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
