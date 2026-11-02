const test = require('node:test');
const assert = require('node:assert/strict');
const React = require('react');
const { create, act } = require('react-test-renderer');
const { loadPage } = require('./helpers/renderPage.cjs');

async function renderShell(t, user = null) {
  const dependencies = {};
  for (const name of ['hotkeys', 'displayMode', 'interfaceStyle', 'themes']) dependencies[`utils/${name}.js`] = await import(`../utils/${name}.js`);
  const router = { pathname: '/', events: { on() {}, off() {} }, push: async () => {} };
  const calls = { exits: 0, signOuts: 0 };
  const session = { hasActiveSession: false, requestActiveSessionExit: async () => { calls.exits++; return false; } };
  dependencies['next/router'] = { useRouter: () => router };
  dependencies['next/link'] = { __esModule: true, default: props => React.createElement('a', props, props.children) };
  dependencies['components/InterfaceArtwork.js'] = { INTERFACE_ARTWORK: {} };
  dependencies['utils/supabaseAuthContext.js'] = { useSupabaseAuth: () => ({ user, isConfigured: true, signOut: async () => { calls.signOuts++; return { error: null }; } }) };
  dependencies['utils/accountPreferencesContext.js'] = { useAccountPreferences: () => ({ themeKey: 'carbon-paper', displayMode: 'light', interfaceStyle: 'studio', isLoadingPreferences: false, upsertPreferences: async () => ({ error: null }) }) };
  dependencies['utils/activeSessionContext.js'] = { useActiveSession: () => session };
  dependencies['utils/useResolvedDisplayMode.js'] = { useResolvedDisplayMode: () => 'light' };
  const { Page } = loadPage('components/SiteLayout.js', dependencies);
  let renderer;
  await act(async () => { renderer = create(React.createElement(Page)); });
  t.after(async () => { await act(async () => renderer.unmount()); });
  return { renderer, calls };
}

test('mobile Menu exposes training routes and guest account entry outside Utility', async t => {
  const { renderer } = await renderShell(t);
  const menu = renderer.root.findByType('details');
  assert.deepEqual(menu.findAllByType('a').map(link => link.props.href), ['/', '/mixed', '/stats', '/login', '/signup']);
  assert.equal(menu.findByType('nav').props['aria-label'], 'Mobile primary');
});

test('mobile logout uses the existing round-exit confirmation before signing out', async t => {
  const { renderer, calls } = await renderShell(t, { id: 'account-a', email: 'a@example.invalid' });
  const menu = renderer.root.findByType('details');
  const logout = menu.findAllByType('button').find(button => button.children.includes('Log out'));
  await act(async () => logout.props.onClick());
  assert.equal(calls.exits, 1);
  assert.equal(calls.signOuts, 0);
});
