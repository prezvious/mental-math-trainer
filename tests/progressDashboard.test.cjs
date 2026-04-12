const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

let buildOperationBreakdown;
let buildProgressOverview;
let buildRecentAttempts;
let buildRecentSessions;
let getSessionDigitsLabel;
let getSessionModeLabel;
let mergeProgressEntries;

test.before(async () => {
  const progressDashboard = await import(
    pathToFileURL(path.resolve(__dirname, '../utils/progressDashboard.js')).href
  );

  ({
    buildOperationBreakdown,
    buildProgressOverview,
    buildRecentAttempts,
    buildRecentSessions,
    getSessionDigitsLabel,
    getSessionModeLabel,
    mergeProgressEntries
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
