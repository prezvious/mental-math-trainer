const test = require('node:test');
const assert = require('node:assert/strict');

test('denied localStorage getters fall back without crashing guest startup', async () => {
  const { readStorageJson, writeStorageJson } = await import('../utils/browserStorage.js');
  const { readGuestAccountPreferencesWithThemeRollout } = await import('../utils/accountPreferences.js');
  const previous = global.window;
  global.window = Object.defineProperty({}, 'localStorage', {
    get() { throw new DOMException('Storage denied', 'SecurityError'); }
  });
  try {
    assert.equal(readStorageJson('missing'), null);
    assert.equal(writeStorageJson('missing', {}), false);
    assert.equal(readGuestAccountPreferencesWithThemeRollout().themeKey, 'carbon-paper');
  } finally {
    if (previous === undefined) delete global.window;
    else global.window = previous;
  }
});
