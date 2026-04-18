const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

let buildOperationBreakdown;
let buildProgressOverview;
let buildRecentAttempts;
let buildRecentSessions;
let createEmptyProgressDashboard;
let fetchProgressDashboardData;
let getSessionDigitsLabel;
let getSessionModeLabel;
let mergeProgressEntries;
let normalizeProgressDashboardPayload;
let RECENT_PROGRESS_WINDOW_DAYS;

test.before(async () => {
  const progressDashboard = await import(
    pathToFileURL(path.resolve(__dirname, '../utils/progressDashboard.js')).href
  );

  ({
    buildOperationBreakdown,
    buildProgressOverview,
    buildRecentAttempts,
    buildRecentSessions,
    createEmptyProgressDashboard,
    fetchProgressDashboardData,
    getSessionDigitsLabel,
    getSessionModeLabel,
    mergeProgressEntries,
    normalizeProgressDashboardPayload,
    RECENT_PROGRESS_WINDOW_DAYS
  } = progressDashboard);
});

test('mergeProgressEntries combines manual and ai data with source tags', () => {
  const manualLogs = [
    {
      id: 'm1',
      session_id: 'manual-session',
      question_index: 1,
      practice_mode: 'DECIMAL',
      operation: 'ADDITION',
      digits_left: 2,
      digits_right: 1,
      left_decimal_digits: 2,
      right_decimal_digits: 1,
      left_operand: '12.50',
      right_operand: '8.5',
      submitted_answer: '21',
      correct_answer: '21',
      is_correct: true,
      response_ms: 900,
      created_at: '2026-04-12T07:00:00.000Z'
    }
  ];
  const aiLogs = [
    {
      id: 'a1',
      session_id: 'ai-session',
      question_index: 1,
      source_kind: 'custom',
      operation_label: 'CUSTOM',
      prompt_text: 'sqrt(81)',
      normalized_expression: 'sqrt(81)',
      result_kind: 'decimal',
      result_exact_text: '9',
      result_decimal_text: '9',
      response_ms: 4,
      created_at: '2026-04-12T07:10:00.000Z'
    },
    {
      id: 'a2',
      session_id: 'ai-trainer-session',
      question_index: 1,
      source_kind: 'trainer',
      operation_label: 'MULTIPLICATION',
      prompt_text: '12 × 12',
      normalized_expression: '12 * 12',
      result_kind: 'integer',
      result_exact_text: '144',
      result_decimal_text: '144',
      response_ms: 5,
      created_at: '2026-04-12T07:05:00.000Z'
    }
  ];

  const entries = mergeProgressEntries(manualLogs, aiLogs);
  const overview = buildProgressOverview(entries);
  const recentSessions = buildRecentSessions(entries);
  const recentAttempts = buildRecentAttempts(entries, 2);
  const breakdown = buildOperationBreakdown(entries);

  assert.equal(entries.length, 3);
  assert.equal(entries[0].sourceMode, 'ai');
  assert.equal(overview.totalAttempts, 3);
  assert.equal(overview.correctAttempts, 3);
  assert.equal(getSessionModeLabel(recentSessions[0]), 'Custom Solver');
  assert.equal(getSessionDigitsLabel(recentSessions[0]), '—');
  assert.equal(recentAttempts[0].promptText, 'sqrt(81)');
  assert.equal(entries.at(-1).digitLabel, '2d/2dp × 1d/1dp');
  assert.equal(entries.at(-1).resultKind, 'decimal');
  assert.equal(
    breakdown.find((row) => row.operation === 'CUSTOM').attempts,
    1
  );
});

test('normalizeProgressDashboardPayload restores defaults and pads missing operations', () => {
  const dashboard = normalizeProgressDashboardPayload({
    overview: {
      totalAttempts: 4,
      correctAttempts: 3
    },
    operationBreakdown: [
      {
        operation: 'ADDITION',
        attempts: 4,
        correct: 3,
        accuracy: 75,
        averageResponseMs: 120,
        totalResponseMs: 480
      }
    ],
    recentSessions: [{ sessionKey: 'manual:1' }]
  });

  assert.equal(dashboard.overview.totalAttempts, 4);
  assert.equal(dashboard.overview.fastest, 0);
  assert.equal(dashboard.operationBreakdown.length >= 6, true);
  assert.equal(
    dashboard.operationBreakdown.find((row) => row.operation === 'ADDITION').attempts,
    4
  );
  assert.equal(
    dashboard.operationBreakdown.find((row) => row.operation === 'CUSTOM').attempts,
    0
  );
  assert.deepEqual(dashboard.recentSessions, [{ sessionKey: 'manual:1' }]);
  assert.deepEqual(dashboard.recentAttempts, []);
});

test('normalizeProgressDashboardPayload folds legacy SQUARES into EXPONENTIATION and keeps unknown operations', () => {
  const dashboard = normalizeProgressDashboardPayload({
    operationBreakdown: [
      {
        operation: 'SQUARES',
        attempts: 2,
        correct: 2,
        accuracy: 100,
        averageResponseMs: 200,
        totalResponseMs: 400
      },
      {
        operation: 'EXPONENTIATION',
        attempts: 1,
        correct: 1,
        accuracy: 100,
        averageResponseMs: 100,
        totalResponseMs: 100
      },
      {
        operation: 'ROOTS',
        attempts: 3,
        correct: 2,
        accuracy: 66.7,
        averageResponseMs: 300,
        totalResponseMs: 900
      }
    ]
  });

  const exponentRow = dashboard.operationBreakdown.find(
    (row) => row.operation === 'EXPONENTIATION'
  );
  const customIndex = dashboard.operationBreakdown.findIndex(
    (row) => row.operation === 'CUSTOM'
  );
  const rootsIndex = dashboard.operationBreakdown.findIndex(
    (row) => row.operation === 'ROOTS'
  );

  assert.ok(exponentRow);
  assert.equal(exponentRow.attempts, 3);
  assert.equal(exponentRow.correct, 3);
  assert.equal(exponentRow.totalResponseMs, 500);
  assert.equal(exponentRow.averageResponseMs, 167);
  assert.equal(exponentRow.accuracy, 100);
  assert.ok(rootsIndex > customIndex);
  assert.equal(
    dashboard.operationBreakdown[rootsIndex].attempts,
    3
  );
});

test('mergeProgressEntries normalizes legacy SQUARES manual rows as EXPONENTIATION', () => {
  const manualLogs = [
    {
      id: 'm-square',
      session_id: 'manual-square-session',
      question_index: 1,
      practice_mode: 'POSITIVE',
      operation: 'SQUARES',
      digits_left: 2,
      digits_right: 1,
      left_decimal_digits: 0,
      right_decimal_digits: 0,
      left_operand: '12',
      right_operand: '2',
      submitted_answer: '144',
      correct_answer: '144',
      is_correct: true,
      response_ms: 1200,
      created_at: '2026-04-12T08:00:00.000Z'
    }
  ];

  const entries = mergeProgressEntries(manualLogs, []);

  assert.equal(entries.length, 1);
  assert.equal(entries[0].operation, 'EXPONENTIATION');
  assert.equal(entries[0].promptText, '12 ^ 2');
  assert.equal(entries[0].digitLabel, null);
});

test('recent dashboard window remains a labeled 90-day slice', () => {
  assert.equal(RECENT_PROGRESS_WINDOW_DAYS, 90);
});

test('fetchProgressDashboardData loads the compact dashboard payload via rpc', async () => {
  const rpcCalls = [];
  const emptyDashboard = createEmptyProgressDashboard();
  const client = {
    async rpc(name, args) {
      rpcCalls.push({ name, args });
      return {
        data: {
          overview: {
            totalAttempts: 2,
            correctAttempts: 2,
            accuracy: 100,
            averageResponseMs: 15,
            totalResponseMs: 30,
            fastest: 10
          },
          operationBreakdown: [
            {
              operation: 'CUSTOM',
              attempts: 2,
              correct: 2,
              accuracy: 100,
              averageResponseMs: 15,
              totalResponseMs: 30
            }
          ],
          recentSessions: [
            {
              sessionKey: 'ai:session-1',
              sessionId: 'session-1',
              sourceMode: 'ai',
              attempts: 2,
              correct: 2,
              totalResponseMs: 30,
              averageResponseMs: 15,
              latestCreatedAt: '2026-04-12T09:00:00.000Z',
              modeLabel: 'Custom Solver',
              digitsLabel: 'N/A'
            }
          ],
          recentAttempts: [
            {
              id: 'ai-a1',
              sourceMode: 'ai',
              sourceKind: 'custom',
              promptText: 'sqrt(81)',
              resultKind: 'decimal',
              resultExactText: '9',
              resultDecimalText: '9',
              isCorrect: true,
              responseMs: 4,
              createdAt: '2026-04-12T09:00:00.000Z'
            }
          ]
        },
        error: null
      };
    }
  };

  const dashboard = await fetchProgressDashboardData(client);

  assert.deepEqual(rpcCalls, [
    {
      name: 'get_progress_dashboard_data',
      args: {
        session_limit: 8,
        attempt_limit: 12
      }
    }
  ]);
  assert.equal(dashboard.overview.totalAttempts, 2);
  assert.equal(dashboard.recentSessions[0].modeLabel, 'Custom Solver');
  assert.equal(dashboard.recentAttempts[0].promptText, 'sqrt(81)');
  assert.equal(dashboard.operationBreakdown.length, emptyDashboard.operationBreakdown.length);
});
