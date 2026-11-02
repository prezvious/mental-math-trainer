const test = require('node:test');
const assert = require('node:assert/strict');
require('fake-indexeddb/auto');

let storage;
let database;
const requestResult = request => new Promise((resolve, reject) => {
  request.onsuccess = () => resolve(request.result);
  request.onerror = () => reject(request.error);
});
const complete = tx => new Promise((resolve, reject) => {
  tx.oncomplete = resolve;
  tx.onerror = () => reject(tx.error);
});
async function session(id, state = 'completed') {
  await storage.startGuestSession({ id, kind: 'trainer', settings: {}, requestedCount: 3 });
  await storage.recordGuestAttempt(id, 1, {
    operation: 'ADDITION', left_operand: '2', right_operand: '3',
    correct_answer: '5', submitted_answer: '5', response_ms: 100,
    is_correct: true, created_at: new Date().toISOString()
  });
  if (state !== 'active') await storage.finishGuestSession(id, state);
}
async function updateSession(id, patch) {
  const tx = database.transaction('sessions', 'readwrite');
  const done = complete(tx);
  const store = tx.objectStore('sessions');
  store.put({ ...await requestResult(store.get(id)), ...patch });
  await done;
}
async function all(name) {
  return requestResult(database.transaction(name).objectStore(name).getAll());
}

test.before(async () => {
  storage = await import('../utils/progressStorage.js');
  await storage.startGuestSession({ id: 'initialize', kind: 'trainer', settings: {}, requestedCount: 3 });
  database = await requestResult(indexedDB.open('mental-math-device-history'));
});
test.beforeEach(async () => {
  const tx = database.transaction(['sessions', 'attempts', 'accountQueue'], 'readwrite');
  const done = complete(tx);
  for (const name of ['sessions', 'attempts', 'accountQueue']) tx.objectStore(name).clear();
  await done;
});
test.after(() => database.close());

test('signed-in import offers recover abandoned rounds but exclude live and other-owner rounds', async () => {
  await session('abandoned', 'active');
  await updateSession('abandoned', { updatedAt: new Date(Date.now() - 600000).toISOString() });
  await session('live', 'active');
  await session('claimed');
  await storage.claimGuestSessionImport('claimed', 'other-account');
  const offer = await storage.getGuestHistoryForImport('account-a');
  assert.deepEqual(offer.sessions.map(entry => entry.id), ['abandoned']);
  assert.equal(offer.sessions[0].state, 'interrupted');
  assert.deepEqual(offer.attempts.map(entry => entry.sessionId), ['abandoned']);
});

test('successful import retires answer payloads without allowing reimport to another account', async () => {
  await session('imported');
  await storage.claimGuestSessionImport('imported', 'account-a');
  await storage.markGuestSessionImported('imported', 'account-a');
  assert.equal((await all('attempts')).length, 0);
  assert.equal((await all('sessions'))[0].importedTo, 'account-a');
  await assert.rejects(storage.claimGuestSessionImport('imported', 'account-b'));
  assert.equal((await storage.getGuestHistory()).sessions.length, 0);
});

test('retention removes expired imported sessions and legacy imported payloads', async () => {
  await session('expired');
  await updateSession('expired', {
    importedTo: 'account-a', importOwnerId: 'account-a',
    updatedAt: new Date(Date.now() - 100 * 86400000).toISOString()
  });
  await session('recent');
  await updateSession('recent', { importedTo: 'account-a', importOwnerId: 'account-a' });
  await storage.pruneGuestHistory();
  assert.deepEqual((await all('sessions')).map(entry => entry.id), ['recent']);
  assert.equal((await all('attempts')).length, 0);
});

test('retired import markers do not evict retained guest answers', async () => {
  await session('unimported');
  await updateSession('unimported', { updatedAt: new Date(Date.now() - 86400000).toISOString() });
  const tx = database.transaction('sessions', 'readwrite');
  const done = complete(tx);
  for (let index = 0; index < 101; index++) tx.objectStore('sessions').put({
    id: `marker-${index}`, owner: 'guest', kind: 'trainer', settings: {}, requestedCount: 3,
    startedAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    endedAt: new Date().toISOString(), state: 'completed', attemptCount: 1,
    importedTo: 'account-a', importOwnerId: 'account-a'
  });
  await done;
  await storage.pruneGuestHistory();
  const history = await storage.getGuestHistory();
  assert.deepEqual(history.sessions.map(entry => entry.id), ['unimported']);
  assert.equal(history.attempts.length, 1);
  assert.equal((await all('sessions')).filter(entry => entry.importedTo).length, 100);
});
