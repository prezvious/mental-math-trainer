import { OPERATION_META, PRACTICE_MODES } from './mathEngine.js';

export const PROGRESS_SOURCE_LABELS = Object.freeze({
  manual: 'Manual',
  ai: 'AI MODE'
});
export const PROGRESS_DASHBOARD_RPC = 'get_progress_dashboard_data';
export const DEFAULT_RECENT_SESSION_LIMIT = 8;
export const DEFAULT_RECENT_ATTEMPT_LIMIT = 12;
export const RECENT_PROGRESS_WINDOW_DAYS = 90;

const LEGACY_OPERATION_ALIASES = Object.freeze({
  SQUARES: 'EXPONENTIATION'
});
const OPERATION_BREAKDOWN_ORDER = [...Object.keys(OPERATION_META), 'CUSTOM'];
const OPERATION_BREAKDOWN_DEFAULTS = Object.freeze({
  attempts: 0,
  correct: 0,
  accuracy: 0,
  averageResponseMs: 0,
  totalResponseMs: 0
});

function normalizeOperationValue(operation) {
  if (typeof operation !== 'string') {
    return operation;
  }

  return LEGACY_OPERATION_ALIASES[operation] || operation;
}

function normalizeOperationMetrics(row = {}) {
  const attempts = Number(row.attempts) || 0;
  const correct = Number(row.correct) || 0;
  const totalResponseMs = Number(row.totalResponseMs) || 0;

  return {
    attempts,
    correct,
    totalResponseMs,
    accuracy: attempts ? (correct / attempts) * 100 : 0,
    averageResponseMs: attempts ? Math.round(totalResponseMs / attempts) : 0
  };
}

export function getOperationDisplayLabel(operation) {
  const normalizedOperation = normalizeOperationValue(operation);

  if (normalizedOperation === 'CUSTOM') {
    return 'Custom';
  }

  return OPERATION_META[normalizedOperation]?.label || normalizedOperation;
}

export function createEmptyProgressDashboard() {
  return {
    overview: {
      totalAttempts: 0,
      correctAttempts: 0,
      accuracy: 0,
      averageResponseMs: 0,
      totalResponseMs: 0,
      fastest: 0
    },
    operationBreakdown: OPERATION_BREAKDOWN_ORDER.map((operation) => ({
      operation,
      ...OPERATION_BREAKDOWN_DEFAULTS
    })),
    recentSessions: [],
    recentAttempts: []
  };
}

function normalizeOperationBreakdown(rows) {
  const byOperation = new Map();
  for (const row of Array.isArray(rows) ? rows : []) {
    const operation = normalizeOperationValue(row?.operation);
    if (!operation) {
      continue;
    }

    const current = byOperation.get(operation);
    const normalizedRow = normalizeOperationMetrics(row);
    if (!current) {
      byOperation.set(operation, {
        operation,
        ...normalizedRow
      });
      continue;
    }

    byOperation.set(operation, {
      operation,
      ...normalizeOperationMetrics({
        attempts: current.attempts + normalizedRow.attempts,
        correct: current.correct + normalizedRow.correct,
        totalResponseMs: current.totalResponseMs + normalizedRow.totalResponseMs
      })
    });
  }

  const knownRows = OPERATION_BREAKDOWN_ORDER.map((operation) => {
    const row = byOperation.get(operation);
    byOperation.delete(operation);
    return {
      operation,
      ...OPERATION_BREAKDOWN_DEFAULTS,
      ...(row || {})
    };
  });

  const unexpectedRows = [...byOperation.values()]
    .sort((rowA, rowB) => rowA.operation.localeCompare(rowB.operation))
    .map((row) => ({
      operation: row.operation,
      ...OPERATION_BREAKDOWN_DEFAULTS,
      ...row
    }));

  return [...knownRows, ...unexpectedRows];
}

export function normalizeProgressDashboardPayload(payload) {
  const emptyDashboard = createEmptyProgressDashboard();

  return {
    overview: {
      ...emptyDashboard.overview,
      ...(payload?.overview || {})
    },
    operationBreakdown: normalizeOperationBreakdown(payload?.operationBreakdown),
    recentSessions: Array.isArray(payload?.recentSessions) ? payload.recentSessions : [],
    recentAttempts: Array.isArray(payload?.recentAttempts) ? payload.recentAttempts : []
  };
}

export async function fetchProgressDashboardData(
  client,
  {
    sessionLimit = DEFAULT_RECENT_SESSION_LIMIT,
    attemptLimit = DEFAULT_RECENT_ATTEMPT_LIMIT
  } = {}
) {
  const { data, error } = await client.rpc(PROGRESS_DASHBOARD_RPC, {
    session_limit: sessionLimit,
    attempt_limit: attemptLimit
  });

  if (error) {
    throw error;
  }

  return normalizeProgressDashboardPayload(data);
}

function formatManualPrompt(entry) {
  const operation = normalizeOperationValue(entry.operation);
  if (operation === 'EXPONENTIATION') {
    return `${entry.left_operand} ^ ${entry.right_operand}`;
  }

  return `${entry.left_operand} ${OPERATION_META[operation]?.symbol || '?'} ${entry.right_operand}`;
}

function formatManualDigitLabel(entry) {
  if (normalizeOperationValue(entry.operation) === 'EXPONENTIATION') {
    return null;
  }

  if (entry.practice_mode === PRACTICE_MODES.DECIMAL) {
    return `${entry.digits_left}d/${entry.left_decimal_digits}dp \u00D7 ${entry.digits_right}d/${entry.right_decimal_digits}dp`;
  }

  return `${entry.digits_left}x${entry.digits_right}`;
}

export function normalizeManualProgressLogs(rows) {
  return rows.map((entry) => ({
    id: `manual-${entry.id}`,
    sourceMode: 'manual',
    sourceKind: 'trainer',
    sessionId: entry.session_id,
    questionIndex: entry.question_index,
    operation: normalizeOperationValue(entry.operation),
    operationLabel: normalizeOperationValue(entry.operation),
    digitLabel: formatManualDigitLabel(entry),
    promptText: formatManualPrompt(entry),
    normalizedExpression: formatManualPrompt(entry),
    resultKind:
      entry.practice_mode === PRACTICE_MODES.DECIMAL ? 'decimal' : 'integer',
    resultExactText: entry.correct_answer,
    resultDecimalText: entry.correct_answer,
    submittedAnswerText: entry.submitted_answer,
    correctAnswerText: entry.correct_answer,
    isCorrect: entry.is_correct,
    responseMs: entry.response_ms,
    createdAt: entry.created_at
  }));
}

export function normalizeAiModeLogs(rows) {
  return rows.map((entry) => ({
    id: `ai-${entry.id}`,
    sourceMode: 'ai',
    sourceKind: entry.source_kind,
    sessionId: entry.session_id,
    questionIndex: entry.question_index,
    operation: normalizeOperationValue(entry.operation_label),
    operationLabel: normalizeOperationValue(entry.operation_label),
    digitLabel: null,
    promptText: entry.prompt_text,
    normalizedExpression: entry.normalized_expression,
    resultKind: entry.result_kind,
    resultExactText: entry.result_exact_text,
    resultDecimalText: entry.result_decimal_text || entry.result_exact_text,
    submittedAnswerText: entry.result_exact_text,
    correctAnswerText: entry.result_exact_text,
    isCorrect: true,
    responseMs: entry.response_ms,
    createdAt: entry.created_at
  }));
}

export function mergeProgressEntries(manualRows, aiRows) {
  return [
    ...normalizeManualProgressLogs(manualRows),
    ...normalizeAiModeLogs(aiRows)
  ].sort((entryA, entryB) => new Date(entryB.createdAt).getTime() - new Date(entryA.createdAt).getTime());
}

export function buildProgressOverview(entries) {
  const totalAttempts = entries.length;
  const correctAttempts = entries.filter((entry) => entry.isCorrect).length;
  const totalResponseMs = entries.reduce((sum, entry) => sum + entry.responseMs, 0);
  const averageResponseMs = totalAttempts ? Math.round(totalResponseMs / totalAttempts) : 0;
  const accuracy = totalAttempts ? (correctAttempts / totalAttempts) * 100 : 0;
  const fastest = totalAttempts
    ? entries.reduce(
        (minValue, entry) => Math.min(minValue, entry.responseMs),
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
}

export function buildOperationBreakdown(entries) {
  const grouped = {};
  for (const operation of [...Object.keys(OPERATION_META), 'CUSTOM']) {
    grouped[operation] = { attempts: 0, correct: 0, totalResponseMs: 0 };
  }

  entries.forEach((entry) => {
    if (!grouped[entry.operation]) {
      grouped[entry.operation] = { attempts: 0, correct: 0, totalResponseMs: 0 };
    }

    grouped[entry.operation].attempts += 1;
    grouped[entry.operation].totalResponseMs += entry.responseMs;
    if (entry.isCorrect) {
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
}

export function buildRecentSessions(entries, limit = 8) {
  const bySession = new Map();

  entries.forEach((entry) => {
    const sessionKey = `${entry.sourceMode}:${entry.sessionId}`;
    const existing = bySession.get(sessionKey) || {
      sessionKey,
      sessionId: entry.sessionId,
      sourceMode: entry.sourceMode,
      sourceKinds: new Set(),
      operations: new Set(),
      digitLabels: new Set(),
      attempts: 0,
      correct: 0,
      totalResponseMs: 0,
      latestCreatedAt: entry.createdAt
    };

    existing.sourceKinds.add(entry.sourceKind);
    existing.operations.add(entry.operation);
    if (entry.digitLabel) {
      existing.digitLabels.add(entry.digitLabel);
    }
    existing.attempts += 1;
    existing.totalResponseMs += entry.responseMs;
    if (entry.isCorrect) {
      existing.correct += 1;
    }
    if (new Date(entry.createdAt).getTime() > new Date(existing.latestCreatedAt).getTime()) {
      existing.latestCreatedAt = entry.createdAt;
    }

    bySession.set(sessionKey, existing);
  });

  return [...bySession.values()]
    .sort(
      (sessionA, sessionB) =>
        new Date(sessionB.latestCreatedAt).getTime() -
        new Date(sessionA.latestCreatedAt).getTime()
    )
    .slice(0, limit);
}

export function buildRecentAttempts(entries, limit = 12) {
  return entries.slice(0, limit);
}

export function getSessionModeLabel(session) {
  if (session.sourceMode === 'ai') {
    if (session.sourceKinds.has('custom')) {
      return 'Custom Solver';
    }

    return getOperationDisplayLabel(session.operations.values().next().value);
  }

  if (session.operations.size > 1) {
    return 'Mixed';
  }

  return getOperationDisplayLabel(session.operations.values().next().value);
}

export function getSessionDigitsLabel(session) {
  if (session.sourceMode === 'ai') {
    return session.sourceKinds.has('custom') ? '—' : 'Auto';
  }

  return session.digitLabels.size > 1 ? 'Varies' : session.digitLabels.values().next().value;
}
