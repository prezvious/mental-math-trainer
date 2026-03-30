const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

let buildProgressLogRows;
let fetchAllProgressLogs;
let persistProgressLogBatches;

function createAttempt(index) {
  return {
    operation: 'ADDITION',
    leftOperand: index + 10,
    rightOperand: index + 1,
    correctAnswer: BigInt(index + 11),
    submittedAnswer: BigInt(index + 11),
    isCorrect: true,
    responseMs: 100 + index
  };
}

function createInsertClient(failOnCall = null) {
  const insertCalls = [];

  return {
    insertCalls,
    from(table) {
      assert.equal(table, 'progress_logs');
      return {
        async insert(rows) {
          insertCalls.push(rows);
          if (failOnCall && insertCalls.length === failOnCall) {
            return { error: new Error(`insert failed on call ${failOnCall}`) };
          }
          return { error: null };
        }
      };
    }
  };
}

function createFetchClient(pages, failOnStart = null) {
  const calls = [];

  return {
    calls,
    from(table) {
      assert.equal(table, 'progress_logs');

      const query = {
        selectFields: '',
        userId: null,
        select(fields) {
          this.selectFields = fields;
          return this;
        },
        eq(column, value) {
          assert.equal(column, 'user_id');
          this.userId = value;
          return this;
        },
        order(column, options) {
          assert.equal(column, 'created_at');
          assert.deepEqual(options, { ascending: false });
          return this;
        },
        async range(start, end) {
          calls.push({ start, end, userId: this.userId, selectFields: this.selectFields });
          if (failOnStart !== null && start === failOnStart) {
            return { data: null, error: new Error('fetch failed') };
          }

          const pageIndex = start / 1000;
          return { data: pages[pageIndex] || [], error: null };
        }
      };

      return query;
    }
  };
}

test.before(async () => {
  const progressLogs = await import(
    pathToFileURL(path.resolve(__dirname, '../utils/progressLogs.js')).href
  );

  ({
    buildProgressLogRows,
    fetchAllProgressLogs,
    persistProgressLogBatches
  } = progressLogs);
});

test('persistProgressLogBatches splits a 10,000-question session into 500-row inserts', async () => {
  const attempts = Array.from({ length: 10000 }, (_, index) => createAttempt(index));
  const rows = buildProgressLogRows(
    attempts,
    { leftDigits: 2, rightDigits: 2 },
    'user-123',
    'session-123'
  );
  const client = createInsertClient();

  await persistProgressLogBatches(client, rows);

  assert.equal(client.insertCalls.length, 20);
  assert.equal(client.insertCalls[0].length, 500);
  assert.equal(client.insertCalls.at(-1).length, 500);
  assert.equal(client.insertCalls[0][0].question_index, 1);
  assert.equal(client.insertCalls.at(-1).at(-1).question_index, 10000);
  assert.equal(client.insertCalls.at(-1).at(-1).session_id, 'session-123');
});

test('persistProgressLogBatches stops and surfaces the first insert failure', async () => {
  const rows = buildProgressLogRows(
    Array.from({ length: 1000 }, (_, index) => createAttempt(index)),
    { leftDigits: 2, rightDigits: 1 },
    'user-123',
    'session-456'
  );
  const client = createInsertClient(2);

  await assert.rejects(
    persistProgressLogBatches(client, rows, 500),
    /insert failed on call 2/
  );
  assert.equal(client.insertCalls.length, 2);
});

test('fetchAllProgressLogs keeps paginating until the final partial page', async () => {
  const pages = [
    Array.from({ length: 1000 }, (_, index) => ({ id: `row-${index}` })),
    Array.from({ length: 1000 }, (_, index) => ({ id: `row-${1000 + index}` })),
    Array.from({ length: 250 }, (_, index) => ({ id: `row-${2000 + index}` }))
  ];
  const client = createFetchClient(pages);

  const rows = await fetchAllProgressLogs(client, 'user-123');

  assert.equal(rows.length, 2250);
  assert.deepEqual(
    client.calls.map((call) => [call.start, call.end]),
    [
      [0, 999],
      [1000, 1999],
      [2000, 2999]
    ]
  );
});

test('fetchAllProgressLogs surfaces page fetch failures', async () => {
  const client = createFetchClient([Array.from({ length: 1000 }, () => ({}))], 1000);

  await assert.rejects(fetchAllProgressLogs(client, 'user-123'), /fetch failed/);
});
