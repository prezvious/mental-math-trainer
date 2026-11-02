const test = require('node:test');
const assert = require('node:assert/strict');
const React = require('react');
const { create, act } = require('react-test-renderer');
const { loadModule } = require('./helpers/renderPage.cjs');

async function fixture(t, kind) {
  const preferences = await import('../utils/accountPreferences.js');
  const sync = await import('../utils/accountPreferenceSync.js');
  const mixedPreferences = await import('../utils/mixedTrainerPreferences.js');
  const mixed = await import('../utils/mixedDifficulty.js');
  let auth = { user: { id: 'account-a' }, isLoading: false };
  let value;
  let onChange;
  const requests = [];
  const saved = new Map();
  const initialRow = owner => kind === 'mixed'
    ? mixedPreferences.buildMixedPreferencesRow(owner, { ...mixed.DEFAULT_MIXED_SETTINGS, roundSize: 7 })
    : { ...preferences.buildUserPreferencesRow(owner, preferences.createDefaultAccountPreferences()),
        revision: 1, updated_at: '2099-01-01T00:00:00Z' };
  auth.client = {
    from: () => ({
      select: () => ({ eq: (_column, owner) => ({ maybeSingle: async () => ({ data: initialRow(owner), error: null }) }) }),
      upsert: row => {
        let resolve;
        const promise = new Promise(done => { resolve = done; }).then(result => {
          if (result.error) return { data: null, error: result.error };
          const data = { ...row, revision: (saved.get(row.user_id)?.revision || 1) + 1, updated_at: '2026-11-02T00:00:00Z' };
          saved.set(row.user_id, data);
          return { data, error: null };
        });
        requests.push({ row, resolve });
        promise.select = () => ({ single: () => promise });
        return promise;
      }
    })
  };
  const dependencies = {
    './accountPreferences.js': preferences,
    './accountPreferenceSync.js': { ...sync, subscribeToAccountPreferenceChanges: (_client, _owner, callback) => { onChange = callback; return () => {}; } },
    './mixedDifficulty.js': mixed,
    './mixedTrainerPreferences.js': mixedPreferences,
    './supabaseAuthContext.js': { useSupabaseAuth: () => auth }
  };
  const filename = kind === 'mixed' ? 'utils/mixedTrainerContext.js' : 'utils/accountPreferencesContext.js';
  const { exports } = loadModule(filename, dependencies);
  const Provider = exports[kind === 'mixed' ? 'MixedTrainerProvider' : 'AccountPreferencesProvider'];
  const usePreferences = exports[kind === 'mixed' ? 'useMixedTrainer' : 'useAccountPreferences'];
  function Probe() { value = usePreferences(); return null; }
  const tree = () => React.createElement(Provider, null, React.createElement(Probe));
  let renderer;
  await act(async () => { renderer = create(tree()); });
  t.after(async () => {
    await act(async () => renderer.unmount());
    for (const request of requests) request.resolve({ error: null });
  });
  t.mock.method(console, 'error', () => {});
  return {
    requests, saved, initialRow,
    value: () => value,
    async changeAccount(owner) {
      auth = { ...auth, user: { id: owner } };
      await act(async () => renderer.update(tree()));
    },
    async enqueue(patch) {
      let pending;
      await act(async () => {
        pending = value[kind === 'mixed' ? 'upsertMixedSettings' : 'upsertPreferences'](patch);
        await Promise.resolve();
      });
      return { pending };
    },
    async resolve(index, error = null) {
      await act(async () => { requests[index].resolve({ error }); await Promise.resolve(); });
    },
    async emit(row) { await act(async () => onChange(row)); }
  };
}

for (const kind of ['mixed', 'account']) {
  for (const failed of [false, true]) {
    test(`${kind} saves from a previous account cannot overwrite the new account after ${failed ? 'failure' : 'success'}`, async t => {
      const app = await fixture(t, kind);
      const patch = count => kind === 'mixed' ? { roundSize: count } : { trainerSettings: { roundSize: count } };
      const a = await app.enqueue(patch(21));
      await app.changeAccount('account-b');
      const b = await app.enqueue(patch(55));
      const c = await app.enqueue(patch(111));
      await app.resolve(0, failed ? new Error('Delayed account-a failure') : null);
      await app.resolve(1);
      for (let index = 2; index < app.requests.length; index++) await app.resolve(index);
      await Promise.all([a.pending, b.pending, c.pending]);
      const saved = app.saved.get('account-b');
      assert.equal(kind === 'mixed' ? saved.round_size : saved.trainer_round_size, 111);
      assert.equal(kind === 'mixed' ? app.value().mixedSettings.roundSize : app.value().trainerSettings.roundSize, 111);
      assert.deepEqual(app.requests.slice(1).map(request => request.row.user_id), ['account-b', 'account-b']);
    });
  }
}

test('database revision accepts a later preference update despite a backwards client timestamp', async t => {
  const app = await fixture(t, 'account');
  await app.emit({ ...app.initialRow('account-a'), revision: 2, updated_at: '2026-11-02T00:00:00Z', display_mode: 'dark' });
  assert.equal(app.value().displayMode, 'dark');
  await app.emit({ ...app.initialRow('account-a'), revision: 1, display_mode: 'light' });
  assert.equal(app.value().displayMode, 'dark');
});

test('save acknowledgements and realtime echoes preserve a newer optimistic preference edit', async t => {
  const app = await fixture(t, 'account');
  const first = await app.enqueue({ displayMode: 'dark' });
  const second = await app.enqueue({ displayMode: 'light' });
  await app.emit({ ...app.initialRow('account-a'), revision: 2, display_mode: 'dark' });
  assert.equal(app.value().displayMode, 'light');
  await app.resolve(0);
  assert.equal(app.value().displayMode, 'light');
  await app.resolve(1);
  await Promise.all([first.pending, second.pending]);
  assert.equal(app.saved.get('account-a').display_mode, 'light');
  await app.emit({ ...app.initialRow('account-a'), revision: 2, display_mode: 'dark' });
  assert.equal(app.value().displayMode, 'light');
});
