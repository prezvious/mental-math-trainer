const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

let getAccountPreferencesRevision;
let shouldApplyAccountPreferencesRow;
let subscribeToAccountPreferenceChanges;

test.before(async () => {
  const preferenceSync = await import(
    pathToFileURL(path.resolve(__dirname, '../utils/accountPreferenceSync.js'))
      .href
  );

  ({
    getAccountPreferencesRevision,
    shouldApplyAccountPreferencesRow,
    subscribeToAccountPreferenceChanges
  } = preferenceSync);
});

test('preference revisions reject stale Supabase rows', () => {
  const latestRevision = getAccountPreferencesRevision({
    updated_at: '2026-09-09T02:00:00.000Z'
  });

  assert.equal(
    shouldApplyAccountPreferencesRow(
      { updated_at: '2026-09-09T01:59:59.999Z' },
      latestRevision
    ),
    false
  );
  assert.equal(
    shouldApplyAccountPreferencesRow(
      { updated_at: '2026-09-09T02:00:00.001Z' },
      latestRevision
    ),
    true
  );
  assert.equal(getAccountPreferencesRevision({ updated_at: 'invalid' }), 0);
});

test('signed-in preference subscription filters the user row and cleans up', () => {
  let channelName;
  let registration;
  let subscribed = false;
  let removedChannel;
  const receivedRows = [];
  const channel = {
    on(event, filter, callback) {
      registration = { event, filter, callback };
      return this;
    },
    subscribe() {
      subscribed = true;
      return this;
    }
  };
  const client = {
    channel(name) {
      channelName = name;
      return channel;
    },
    removeChannel(removed) {
      removedChannel = removed;
      return Promise.resolve('ok');
    }
  };

  const unsubscribe = subscribeToAccountPreferenceChanges(
    client,
    'user-123',
    (row) => receivedRows.push(row)
  );

  assert.equal(channelName, 'account-preferences:user-123');
  assert.equal(subscribed, true);
  assert.deepEqual(registration.filter, {
    event: '*',
    schema: 'public',
    table: 'user_preferences',
    filter: 'user_id=eq.user-123'
  });

  const ownRow = {
    user_id: 'user-123',
    theme_key: 'midnight-abacus',
    display_mode: 'adaptive'
  };
  registration.callback({ new: ownRow });
  registration.callback({ new: { ...ownRow, user_id: 'user-456' } });
  assert.deepEqual(receivedRows, [ownRow]);

  unsubscribe();
  assert.equal(removedChannel, channel);
});

test('Supabase migration publishes durable theme and mode preferences', () => {
  const migrationPath = path.resolve(
    __dirname,
    '../supabase/migrations/20260909000000_enable_user_preferences_realtime.sql'
  );
  const migration = fs.readFileSync(migrationPath, 'utf8');

  assert.match(migration, /alter column theme_key set not null/i);
  assert.match(
    migration,
    /alter publication supabase_realtime add table public\.user_preferences/i
  );
});
