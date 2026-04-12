const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

let buildProgressLogRow;
let buildProgressLogRows;
let createProgressLogBuffer;
let fetchAllProgressLogs;
let persistProgressLogBatches;
let persistProgressLogRowsKeepalive;

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

function createUpsertClient(failOnCall = null) {
  const upsertCalls = [];

  return {
    upsertCalls,
    from(table) {
      assert.equal(table, 'progress_logs');
      return {
        async upsert(rows, options) {
          upsertCalls.push({ rows, options });
          if (failOnCall && upsertCalls.length === failOnCall) {
            return { error: new Error(`upsert failed on call ${failOnCall}`) };
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

function createTimeoutHarness() {
  let nextId = 1;
  const timers = new Map();

  return {
    pendingCount() {
      return timers.size;
    },
    runNext() {
      const nextEntry = timers.entries().next();
      if (nextEntry.done) {
        return false;
      }

      const [timerId, callback] = nextEntry.value;
      timers.delete(timerId);
      callback();
      return true;
    },
    setTimeout(callback) {
      const timerId = nextId;
      nextId += 1;
      timers.set(timerId, callback);
      return timerId;
    },
    clearTimeout(timerId) {
      timers.delete(timerId);
    }
  };
}

function createDeferred() {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });

  return { promise, resolve, reject };
}

test.before(async () => {
  const progressLogs = await import(
    pathToFileURL(path.resolve(__dirname, '../utils/progressLogs.js')).href
  );

  ({
    buildProgressLogRow,
    buildProgressLogRows,
    createProgressLogBuffer,
    fetchAllProgressLogs,
    persistProgressLogBatches,
    persistProgressLogRowsKeepalive
  } = progressLogs);
});

test('buildProgressLogRow maps one attempt into a persisted progress row', () => {
  const row = buildProgressLogRow(
    createAttempt(0),
    { leftDigits: 2, rightDigits: 1 },
    'user-123',
    'session-123',
    4
  );

  assert.deepEqual(row, {
    user_id: 'user-123',
    session_id: 'session-123',
    question_index: 4,
    operation: 'ADDITION',
    digits_left: 2,
    digits_right: 1,
    left_operand: 10,
    right_operand: 1,
    correct_answer: '11',
    submitted_answer: '11',
    is_correct: true,
    response_ms: 100
  });
});

test('persistProgressLogBatches splits a 10,000-question session into 500-row upserts', async () => {
  const attempts = Array.from({ length: 10000 }, (_, index) => createAttempt(index));
  const rows = buildProgressLogRows(
    attempts,
    { leftDigits: 2, rightDigits: 2 },
    'user-123',
    'session-123'
  );
  const client = createUpsertClient();

  await persistProgressLogBatches(client, rows);

  assert.equal(client.upsertCalls.length, 20);
  assert.equal(client.upsertCalls[0].rows.length, 500);
  assert.equal(client.upsertCalls.at(-1).rows.length, 500);
  assert.equal(client.upsertCalls[0].rows[0].question_index, 1);
  assert.equal(client.upsertCalls.at(-1).rows.at(-1).question_index, 10000);
  assert.equal(client.upsertCalls.at(-1).rows.at(-1).session_id, 'session-123');
  assert.deepEqual(client.upsertCalls[0].options, {
    onConflict: 'user_id,session_id,question_index',
    ignoreDuplicates: true
  });
});

test('persistProgressLogBatches stops and surfaces the first upsert failure', async () => {
  const rows = buildProgressLogRows(
    Array.from({ length: 1000 }, (_, index) => createAttempt(index)),
    { leftDigits: 2, rightDigits: 1 },
    'user-123',
    'session-456'
  );
  const client = createUpsertClient(2);

  await assert.rejects(
    persistProgressLogBatches(client, rows, 500),
    /upsert failed on call 2/
  );
  assert.equal(client.upsertCalls.length, 2);
});

test('persistProgressLogRowsKeepalive posts the buffered rows with keepalive enabled', async () => {
  const fetchCalls = [];

  const didFlush = await persistProgressLogRowsKeepalive(
    [buildProgressLogRow(createAttempt(0), { leftDigits: 2, rightDigits: 1 }, 'user-1', 'session-1', 1)],
    {
      accessToken: 'token-123',
      restConfig: {
        url: 'https://example.supabase.co',
        key: 'anon-key'
      },
      fetchImpl: async (url, options) => {
        fetchCalls.push({ url, options });
        return {
          ok: true,
          async text() {
            return '';
          }
        };
      }
    }
  );

  assert.equal(didFlush, true);
  assert.equal(fetchCalls.length, 1);
  assert.match(fetchCalls[0].url, /on_conflict=user_id%2Csession_id%2Cquestion_index/);
  assert.equal(fetchCalls[0].options.keepalive, true);
  assert.equal(fetchCalls[0].options.headers.Authorization, 'Bearer token-123');
  assert.equal(
    fetchCalls[0].options.headers.Prefer,
    'resolution=ignore-duplicates,return=minimal'
  );
});

test('createProgressLogBuffer flushes immediately at the queue threshold', async () => {
  const client = createUpsertClient();
  const timeoutHarness = createTimeoutHarness();
  const buffer = createProgressLogBuffer({
    getClient: () => client,
    flushSize: 2,
    flushDelayMs: 2000,
    setTimeoutImpl: timeoutHarness.setTimeout,
    clearTimeoutImpl: timeoutHarness.clearTimeout
  });

  buffer.enqueue(buildProgressLogRow(createAttempt(0), { leftDigits: 2, rightDigits: 1 }, 'user-1', 'session-1', 1));
  buffer.enqueue(buildProgressLogRow(createAttempt(1), { leftDigits: 2, rightDigits: 1 }, 'user-1', 'session-1', 2));

  await Promise.resolve();
  await Promise.resolve();

  assert.equal(client.upsertCalls.length, 1);
  assert.equal(client.upsertCalls[0].rows.length, 2);
  assert.equal(buffer.getPendingCount(), 0);
  assert.equal(timeoutHarness.pendingCount(), 0);
});

test('createProgressLogBuffer flushes buffered rows after the inactivity timer', async () => {
  const client = createUpsertClient();
  const timeoutHarness = createTimeoutHarness();
  const buffer = createProgressLogBuffer({
    getClient: () => client,
    flushSize: 10,
    flushDelayMs: 2000,
    setTimeoutImpl: timeoutHarness.setTimeout,
    clearTimeoutImpl: timeoutHarness.clearTimeout
  });

  buffer.enqueue(buildProgressLogRow(createAttempt(0), { leftDigits: 2, rightDigits: 1 }, 'user-1', 'session-1', 1));

  assert.equal(timeoutHarness.pendingCount(), 1);
  assert.equal(timeoutHarness.runNext(), true);
  await Promise.resolve();
  await Promise.resolve();

  assert.equal(client.upsertCalls.length, 1);
  assert.equal(client.upsertCalls[0].rows.length, 1);
  assert.equal(buffer.getPendingCount(), 0);
});

test('createProgressLogBuffer restores pending rows if a flush fails', async () => {
  const client = createUpsertClient(1);
  const buffer = createProgressLogBuffer({
    getClient: () => client,
    flushSize: 10,
    flushDelayMs: 2000
  });
  const row = buildProgressLogRow(
    createAttempt(0),
    { leftDigits: 2, rightDigits: 1 },
    'user-1',
    'session-1',
    1
  );

  buffer.enqueue(row);

  await assert.rejects(buffer.flush(), /upsert failed on call 1/);
  assert.equal(buffer.getPendingCount(), 1);
  assert.deepEqual(buffer.getPendingRows(), [row]);
});

test('createProgressLogBuffer triggers a keepalive flush before the regular upsert flush', async () => {
  const client = createUpsertClient();
  const keepaliveCalls = [];
  const buffer = createProgressLogBuffer({
    getClient: () => client,
    getAccessToken: () => 'token-123',
    getRestConfig: () => ({
      url: 'https://example.supabase.co',
      key: 'anon-key'
    }),
    fetchImpl: async (url, options) => {
      keepaliveCalls.push({ url, options });
      return {
        ok: true,
        async text() {
          return '';
        }
      };
    }
  });

  buffer.enqueue(buildProgressLogRow(createAttempt(0), { leftDigits: 2, rightDigits: 1 }, 'user-1', 'session-1', 1));
  await buffer.flush({ keepalive: true });

  assert.equal(keepaliveCalls.length, 1);
  assert.equal(client.upsertCalls.length, 1);
});

test('createProgressLogBuffer keepalive includes in-flight and pending rows during an active flush', async () => {
  const gate = createDeferred();
  let signalUpsertStarted;
  const upsertStarted = new Promise((resolve) => {
    signalUpsertStarted = resolve;
  });
  const upsertCalls = [];
  const keepaliveBodies = [];
  const client = {
    from(table) {
      assert.equal(table, 'progress_logs');
      return {
        async upsert(rows, options) {
          upsertCalls.push({ rows, options });
          signalUpsertStarted();
          await gate.promise;
          return { error: null };
        }
      };
    }
  };
  const buffer = createProgressLogBuffer({
    getClient: () => client,
    getAccessToken: () => 'token-123',
    getRestConfig: () => ({
      url: 'https://example.supabase.co',
      key: 'anon-key'
    }),
    fetchImpl: async (_url, options) => {
      keepaliveBodies.push(JSON.parse(options.body));
      return {
        ok: true,
        async text() {
          return '';
        }
      };
    }
  });
  const firstRow = buildProgressLogRow(
    createAttempt(0),
    { leftDigits: 2, rightDigits: 1 },
    'user-1',
    'session-1',
    1
  );
  const secondRow = buildProgressLogRow(
    createAttempt(1),
    { leftDigits: 2, rightDigits: 1 },
    'user-1',
    'session-1',
    2
  );

  buffer.enqueue(firstRow);
  const firstFlushPromise = buffer.flush();
  await upsertStarted;

  assert.deepEqual(buffer.getInFlightRows(), [firstRow]);

  buffer.enqueue(secondRow);
  const keepaliveFlushPromise = buffer.flush({ keepalive: true });

  await Promise.resolve();
  await Promise.resolve();

  assert.equal(keepaliveBodies.length, 1);
  assert.deepEqual(
    keepaliveBodies[0].map((row) => row.question_index),
    [1, 2]
  );

  gate.resolve();

  await firstFlushPromise;
  await keepaliveFlushPromise;

  assert.equal(upsertCalls.length, 2);
  assert.equal(buffer.getPendingCount(), 0);
  assert.deepEqual(buffer.getInFlightRows(), []);
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
