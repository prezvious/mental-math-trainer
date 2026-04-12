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
    normalizeProgressDashboardPayload
  } = progressDashboard);
});

test('mergeProgressEntries combines manual and ai data with source tags', () => {
  const manualLogs = [
    {
      id: 'm1',
      session_id: 'manual-session',
      question_index: 1,
      operation: 'ADDITION',
      digits_left: 2,
      digits_right: 2,
      left_operand: 12,
      right_operand: 8,
      submitted_answer: '20',
      correct_answer: '20',
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
