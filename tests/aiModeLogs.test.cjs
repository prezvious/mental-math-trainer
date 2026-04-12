const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

let buildAiModeLogRow;
let createAiModeLogBuffer;
let persistAiModeLogBatches;
let persistAiModeLogRowsKeepalive;

function createAiRow(questionIndex) {
  return buildAiModeLogRow(
    {
      sourceKind: 'trainer',
      operationLabel: 'MULTIPLICATION',
      promptText: `${questionIndex} × 2`,
      normalizedExpression: `${questionIndex} * 2`,
      resultKind: 'integer',
      resultExactText: String(questionIndex * 2),
      resultDecimalText: String(questionIndex * 2),
      responseMs: 5
    },
    'user-1',
    'session-1',
    questionIndex,
    '2026-04-13T00:00:00.000Z'
  );
}

function createUpsertClient(failOnCall = null) {
  const upsertCalls = [];

  return {
    upsertCalls,
    from(table) {
      assert.equal(table, 'ai_mode_logs');
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
  const aiModeLogs = await import(
    pathToFileURL(path.resolve(__dirname, '../utils/aiModeLogs.js')).href
  );

  ({
    buildAiModeLogRow,
    createAiModeLogBuffer,
    persistAiModeLogBatches,
    persistAiModeLogRowsKeepalive
  } = aiModeLogs);
});

test('persistAiModeLogBatches uses duplicate-safe upserts', async () => {
  const rows = Array.from({ length: 1000 }, (_, index) => createAiRow(index + 1));
  const client = createUpsertClient();

  await persistAiModeLogBatches(client, rows, 500);

  assert.equal(client.upsertCalls.length, 2);
  assert.deepEqual(client.upsertCalls[0].options, {
    onConflict: 'user_id,session_id,question_index',
    ignoreDuplicates: true
  });
  assert.equal(client.upsertCalls[0].rows.length, 500);
  assert.equal(client.upsertCalls[1].rows[0].question_index, 501);
});

test('persistAiModeLogRowsKeepalive posts ignore-duplicate keepalive writes', async () => {
  const fetchCalls = [];

  const didFlush = await persistAiModeLogRowsKeepalive([createAiRow(1)], {
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
  });

  assert.equal(didFlush, true);
  assert.equal(fetchCalls.length, 1);
  assert.match(fetchCalls[0].url, /on_conflict=user_id%2Csession_id%2Cquestion_index/);
  assert.equal(fetchCalls[0].options.keepalive, true);
  assert.equal(
    fetchCalls[0].options.headers.Prefer,
    'resolution=ignore-duplicates,return=minimal'
  );
});

test('createAiModeLogBuffer triggers a keepalive flush before the regular upsert flush', async () => {
  const client = createUpsertClient();
  const keepaliveCalls = [];
  const buffer = createAiModeLogBuffer({
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

  buffer.enqueue(createAiRow(1));
  await buffer.flush({ keepalive: true });

  assert.equal(keepaliveCalls.length, 1);
  assert.equal(client.upsertCalls.length, 1);
});

test('createAiModeLogBuffer keepalive includes in-flight and pending rows during an active flush', async () => {
  const gate = createDeferred();
  let signalUpsertStarted;
  const upsertStarted = new Promise((resolve) => {
    signalUpsertStarted = resolve;
  });
  const upsertCalls = [];
  const keepaliveBodies = [];
  const client = {
    from(table) {
      assert.equal(table, 'ai_mode_logs');
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
  const buffer = createAiModeLogBuffer({
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
  const firstRow = createAiRow(1);
  const secondRow = createAiRow(2);

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
