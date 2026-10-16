const DATABASE_NAME = 'mental-math-device-history';
const DATABASE_VERSION = 2;
const SESSION_STORE = 'sessions';
const ATTEMPT_STORE = 'attempts';
const ACCOUNT_QUEUE_STORE = 'accountQueue';
const DAY_MS = 24 * 60 * 60 * 1000;
export const DEVICE_HISTORY_DAYS = 90;
export const DEVICE_HISTORY_SESSION_LIMIT = 100;
export const DEVICE_HISTORY_ATTEMPT_LIMIT = 10000;

let databasePromise;

function requestResult(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('Device history request failed.'));
  });
}

function transactionComplete(transaction) {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onabort = () => reject(transaction.error || new Error('Device history transaction failed.'));
    transaction.onerror = () => reject(transaction.error || new Error('Device history transaction failed.'));
  });
}

function openDatabase() {
  if (typeof indexedDB === 'undefined') {
    return Promise.reject(new Error('Device history is unavailable in this browser.'));
  }
  if (!databasePromise) {
    databasePromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);
      request.onupgradeneeded = () => {
        const database = request.result;
        if (!database.objectStoreNames.contains(SESSION_STORE)) {
          database.createObjectStore(SESSION_STORE, { keyPath: 'id' });
        }
        if (!database.objectStoreNames.contains(ATTEMPT_STORE)) {
          const attempts = database.createObjectStore(ATTEMPT_STORE, { keyPath: 'key' });
          attempts.createIndex('sessionId', 'sessionId', { unique: false });
        }
        if (!database.objectStoreNames.contains(ACCOUNT_QUEUE_STORE)) {
          const queue = database.createObjectStore(ACCOUNT_QUEUE_STORE, { keyPath: 'key' });
          queue.createIndex('userId', 'userId', { unique: false });
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error || new Error('Could not open device history.'));
      request.onblocked = () => reject(new Error('Close other open tabs and try again.'));
    }).catch((error) => {
      databasePromise = null;
      throw error;
    });
  }
  return databasePromise;
}

function serializeValue(value) {
  if (typeof value === 'bigint') return value.toString();
  if (Array.isArray(value)) return value.map(serializeValue);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, serializeValue(entry)]));
  }
  return value;
}

export async function startGuestSession({ id, kind, settings, requestedCount, startedAt = new Date().toISOString() }) {
  const database = await openDatabase();
  const transaction = database.transaction(SESSION_STORE, 'readwrite');
  const done = transactionComplete(transaction);
  const sessions = transaction.objectStore(SESSION_STORE);
  const existing = await requestResult(sessions.get(id));
  if (!existing) {
    sessions.put({
      id, owner: 'guest', kind, settings: serializeValue(settings), requestedCount,
      startedAt, updatedAt: startedAt, endedAt: null, state: 'active', importedTo: null,
      importOwnerId: null,
      attemptCount: 0
    });
  } else if (existing.owner === 'guest' && !existing.importedTo) {
    sessions.put({ ...existing, state: 'active', endedAt: null, updatedAt: new Date().toISOString() });
  } else {
    await done;
    throw new Error('This session can no longer be saved as guest history.');
  }
  await done;
}

export async function recordGuestAttempt(sessionId, questionIndex, row) {
  const database = await openDatabase();
  const transaction = database.transaction([SESSION_STORE, ATTEMPT_STORE], 'readwrite');
  const done = transactionComplete(transaction);
  const sessions = transaction.objectStore(SESSION_STORE);
  const attempts = transaction.objectStore(ATTEMPT_STORE);
  const session = await requestResult(sessions.get(sessionId));
  if (!session || session.owner !== 'guest' || session.importedTo) {
    await done;
    throw new Error('This guest session is no longer available.');
  }
  const key = `${sessionId}:${questionIndex}`;
  const existing = await requestResult(attempts.get(key));
  if (!existing) {
    attempts.put({
      key, sessionId, questionIndex,
      row: serializeValue({
        ...row,
        user_id: null,
        session_id: sessionId,
        question_index: questionIndex,
        practice_mode: row.practice_mode || 'POSITIVE',
        left_decimal_digits: row.left_decimal_digits ?? 0,
        right_decimal_digits: row.right_decimal_digits ?? 0,
        left_operand: String(row.left_operand),
        right_operand: String(row.right_operand),
        correct_answer: String(row.correct_answer),
        submitted_answer: String(row.submitted_answer)
      }),
      createdAt: row.created_at || new Date().toISOString()
    });
    sessions.put({
      ...session,
      attemptCount: session.attemptCount + 1,
      updatedAt: new Date().toISOString()
    });
  }
  await done;
}

export async function finishGuestSession(sessionId, state) {
  const database = await openDatabase();
  const transaction = database.transaction(SESSION_STORE, 'readwrite');
  const done = transactionComplete(transaction);
  const sessions = transaction.objectStore(SESSION_STORE);
  const session = await requestResult(sessions.get(sessionId));
  if (session) {
    if (session.attemptCount === 0) {
      sessions.delete(sessionId);
    } else {
      const endedAt = new Date().toISOString();
      sessions.put({ ...session, state, endedAt, updatedAt: endedAt });
    }
  }
  await done;
  await pruneGuestHistory();
}

export async function getGuestHistory() {
  const database = await openDatabase();
  const transaction = database.transaction([SESSION_STORE, ATTEMPT_STORE], 'readonly');
  const done = transactionComplete(transaction);
  const [sessions, attempts] = await Promise.all([
    requestResult(transaction.objectStore(SESSION_STORE).getAll()),
    requestResult(transaction.objectStore(ATTEMPT_STORE).getAll())
  ]);
  await done;
  const cutoff = Date.now() - DEVICE_HISTORY_DAYS * DAY_MS;
  const eligible = sessions.filter((session) => session.owner === 'guest' && !session.importedTo &&
    new Date(session.updatedAt).getTime() >= cutoff);
  const ids = new Set(eligible.map((session) => session.id));
  return {
    sessions: eligible,
    attempts: attempts.filter((attempt) => ids.has(attempt.sessionId) &&
      new Date(attempt.createdAt).getTime() >= cutoff)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  };
}

export async function touchGuestSession(sessionId) {
  const database = await openDatabase();
  const transaction = database.transaction(SESSION_STORE, 'readwrite');
  const done = transactionComplete(transaction);
  const sessions = transaction.objectStore(SESSION_STORE);
  const session = await requestResult(sessions.get(sessionId));
  if (session?.state === 'active') {
    sessions.put({ ...session, updatedAt: new Date().toISOString() });
  }
  await done;
}

export async function recoverInterruptedGuestSessions() {
  const database = await openDatabase();
  const transaction = database.transaction(SESSION_STORE, 'readwrite');
  const done = transactionComplete(transaction);
  const sessions = transaction.objectStore(SESSION_STORE);
  const all = await requestResult(sessions.getAll());
  // A generous lease avoids treating a backgrounded practice tab as abandoned.
  const cutoff = Date.now() - 5 * 60 * 1000;
  for (const session of all) {
    if (session.owner === 'guest' && session.state === 'active' &&
      new Date(session.updatedAt).getTime() < cutoff) {
      if (session.attemptCount === 0) sessions.delete(session.id);
      else sessions.put({ ...session, state: 'interrupted', endedAt: session.updatedAt });
    }
  }
  await done;
  await pruneGuestHistory();
}

async function deleteSessions(sessionIds) {
  if (!sessionIds.length) return;
  const database = await openDatabase();
  const transaction = database.transaction([SESSION_STORE, ATTEMPT_STORE], 'readwrite');
  const done = transactionComplete(transaction);
  const sessions = transaction.objectStore(SESSION_STORE);
  const attempts = transaction.objectStore(ATTEMPT_STORE);
  for (const id of sessionIds) {
    sessions.delete(id);
    const keys = await requestResult(attempts.index('sessionId').getAllKeys(id));
    for (const key of keys) attempts.delete(key);
  }
  await done;
}

export async function pruneGuestHistory() {
  const database = await openDatabase();
  const transaction = database.transaction(SESSION_STORE, 'readonly');
  const done = transactionComplete(transaction);
  const all = await requestResult(transaction.objectStore(SESSION_STORE).getAll());
  await done;
  const cutoff = Date.now() - DEVICE_HISTORY_DAYS * DAY_MS;
  const inactive = all.filter((session) => session.owner === 'guest' && session.state !== 'active' && !session.importedTo)
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  let keptSessions = 0;
  let keptAttempts = 0;
  const expired = [];
  for (const session of inactive) {
    if (new Date(session.updatedAt).getTime() < cutoff ||
      keptSessions >= DEVICE_HISTORY_SESSION_LIMIT ||
      keptAttempts + session.attemptCount > DEVICE_HISTORY_ATTEMPT_LIMIT) {
      expired.push(session.id);
    } else {
      keptSessions += 1;
      keptAttempts += session.attemptCount;
    }
  }
  await deleteSessions(expired);
}

export async function clearGuestHistory() {
  const database = await openDatabase();
  const transaction = database.transaction(SESSION_STORE, 'readonly');
  const done = transactionComplete(transaction);
  const all = await requestResult(transaction.objectStore(SESSION_STORE).getAll());
  await done;
  await deleteSessions(all.filter((session) => session.owner === 'guest' && session.state !== 'active').map((session) => session.id));
}

export async function markGuestSessionImported(sessionId, userId) {
  const database = await openDatabase();
  const transaction = database.transaction(SESSION_STORE, 'readwrite');
  const done = transactionComplete(transaction);
  const sessions = transaction.objectStore(SESSION_STORE);
  const session = await requestResult(sessions.get(sessionId));
  if (session && !session.importedTo && session.importOwnerId === userId) {
    sessions.put({ ...session, importedTo: userId });
  }
  await done;
}

export async function claimGuestSessionImport(sessionId, userId) {
  const database = await openDatabase();
  const transaction = database.transaction(SESSION_STORE, 'readwrite');
  const done = transactionComplete(transaction);
  const sessions = transaction.objectStore(SESSION_STORE);
  const session = await requestResult(sessions.get(sessionId));
  if (!session || session.importedTo || (session.importOwnerId && session.importOwnerId !== userId)) {
    await done;
    throw new Error('This guest session is already assigned to another account.');
  }
  sessions.put({ ...session, importOwnerId: userId });
  await done;
}

function accountRowKey(row) {
  return `${row.user_id}:${row.session_id}:${row.question_index}`;
}

export async function queueAccountProgressRow(row) {
  if (!row.user_id) throw new Error('Account progress must have an owner.');
  const database = await openDatabase();
  const transaction = database.transaction(ACCOUNT_QUEUE_STORE, 'readwrite');
  const done = transactionComplete(transaction);
  transaction.objectStore(ACCOUNT_QUEUE_STORE).put({
    key: accountRowKey(row), userId: row.user_id, row: serializeValue(row)
  });
  await done;
}

export async function acknowledgeAccountProgressRows(rows) {
  if (!rows.length) return;
  const database = await openDatabase();
  const transaction = database.transaction(ACCOUNT_QUEUE_STORE, 'readwrite');
  const done = transactionComplete(transaction);
  const queue = transaction.objectStore(ACCOUNT_QUEUE_STORE);
  for (const row of rows) queue.delete(accountRowKey(row));
  await done;
}

export async function getPendingAccountProgressRows(userId) {
  const database = await openDatabase();
  const transaction = database.transaction(ACCOUNT_QUEUE_STORE, 'readonly');
  const done = transactionComplete(transaction);
  const entries = await requestResult(transaction.objectStore(ACCOUNT_QUEUE_STORE).index('userId').getAll(userId));
  await done;
  return entries.map((entry) => entry.row);
}

export async function clearPendingAccountProgressRows(userId) {
  const database = await openDatabase();
  const transaction = database.transaction(ACCOUNT_QUEUE_STORE, 'readwrite');
  const done = transactionComplete(transaction);
  const queue = transaction.objectStore(ACCOUNT_QUEUE_STORE);
  const keys = await requestResult(queue.index('userId').getAllKeys(userId));
  for (const key of keys) queue.delete(key);
  await done;
}
