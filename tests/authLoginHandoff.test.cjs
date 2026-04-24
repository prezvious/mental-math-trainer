const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

let AUTH_LOGIN_HANDOFF_REASONS;
let AUTH_LOGIN_HANDOFF_STORAGE_KEY;
let consumeAuthLoginHandoff;
let storeAuthLoginHandoff;

function createStorageMock(seed = {}) {
  const store = new Map(Object.entries(seed));

  return {
    getItem(key) {
      return store.has(key) ? store.get(key) : null;
    },
    setItem(key, value) {
      store.set(key, value);
    },
    removeItem(key) {
      store.delete(key);
    }
  };
}

test.before(async () => {
  const authLoginHandoff = await import(
    pathToFileURL(path.resolve(__dirname, '../utils/authLoginHandoff.js')).href
  );

  ({
    AUTH_LOGIN_HANDOFF_REASONS,
    AUTH_LOGIN_HANDOFF_STORAGE_KEY,
    consumeAuthLoginHandoff,
    storeAuthLoginHandoff
  } = authLoginHandoff);
});

test('storeAuthLoginHandoff persists the duplicate signup handoff payload', () => {
  const storage = createStorageMock();

  const stored = storeAuthLoginHandoff(
    '  learner@example.com  ',
    storage,
    AUTH_LOGIN_HANDOFF_REASONS.DUPLICATE_SIGNUP
  );

  assert.equal(stored, true);
  assert.equal(
    storage.getItem(AUTH_LOGIN_HANDOFF_STORAGE_KEY),
    JSON.stringify({
      email: 'learner@example.com',
      reason: AUTH_LOGIN_HANDOFF_REASONS.DUPLICATE_SIGNUP
    })
  );
});

test('consumeAuthLoginHandoff returns the payload once and clears storage', () => {
  const storage = createStorageMock({
    [AUTH_LOGIN_HANDOFF_STORAGE_KEY]: JSON.stringify({
      email: 'learner@example.com',
      reason: AUTH_LOGIN_HANDOFF_REASONS.DUPLICATE_SIGNUP
    })
  });

  const firstRead = consumeAuthLoginHandoff(storage);
  const secondRead = consumeAuthLoginHandoff(storage);

  assert.deepEqual(firstRead, {
    email: 'learner@example.com',
    reason: AUTH_LOGIN_HANDOFF_REASONS.DUPLICATE_SIGNUP
  });
  assert.equal(secondRead, null);
});

test('consumeAuthLoginHandoff ignores malformed stored payloads', () => {
  const malformedStorage = createStorageMock({
    [AUTH_LOGIN_HANDOFF_STORAGE_KEY]: '{not valid json'
  });
  const invalidPayloadStorage = createStorageMock({
    [AUTH_LOGIN_HANDOFF_STORAGE_KEY]: JSON.stringify({
      email: '',
      reason: 'unsupported'
    })
  });

  assert.equal(consumeAuthLoginHandoff(malformedStorage), null);
  assert.equal(malformedStorage.getItem(AUTH_LOGIN_HANDOFF_STORAGE_KEY), null);
  assert.equal(consumeAuthLoginHandoff(invalidPayloadStorage), null);
  assert.equal(invalidPayloadStorage.getItem(AUTH_LOGIN_HANDOFF_STORAGE_KEY), null);
});
