const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

let getSystemDarkModeQuery;
let getSystemPrefersDark;
let subscribeToSystemDarkMode;
let SYSTEM_DARK_MODE_QUERY;

test.before(async () => {
  const displayModeHook = await import(
    pathToFileURL(path.resolve(__dirname, '../utils/useResolvedDisplayMode.js'))
      .href
  );

  ({
    getSystemDarkModeQuery,
    getSystemPrefersDark,
    subscribeToSystemDarkMode,
    SYSTEM_DARK_MODE_QUERY
  } = displayModeHook);
});

function withMockWindow(mockWindow, callback) {
  const hadWindow = Object.hasOwn(globalThis, 'window');
  const previousWindow = globalThis.window;
  globalThis.window = mockWindow;

  try {
    callback();
  } finally {
    if (hadWindow) {
      globalThis.window = previousWindow;
    } else {
      delete globalThis.window;
    }
  }
}

test('system mode helpers fall back safely without matchMedia', () => {
  withMockWindow({}, () => {
    assert.equal(getSystemDarkModeQuery(), null);
    assert.equal(getSystemPrefersDark(), false);
    assert.doesNotThrow(() => subscribeToSystemDarkMode(() => {})());
  });
});

test('system mode subscription reacts through the modern media-query API', () => {
  const listeners = new Set();
  const mediaQuery = {
    matches: true,
    addEventListener(type, listener) {
      assert.equal(type, 'change');
      listeners.add(listener);
    },
    removeEventListener(type, listener) {
      assert.equal(type, 'change');
      listeners.delete(listener);
    }
  };

  withMockWindow(
    {
      matchMedia(query) {
        assert.equal(query, SYSTEM_DARK_MODE_QUERY);
        return mediaQuery;
      }
    },
    () => {
      let changes = 0;
      const listener = () => {
        changes += 1;
      };
      assert.equal(getSystemPrefersDark(), true);

      const unsubscribe = subscribeToSystemDarkMode(listener);
      assert.equal(listeners.size, 1);
      for (const callback of listeners) {
        callback();
      }
      assert.equal(changes, 1);

      unsubscribe();
      assert.equal(listeners.size, 0);
    }
  );
});

test('system mode subscription supports legacy media-query listeners', () => {
  const listeners = new Set();
  const mediaQuery = {
    matches: false,
    addListener(listener) {
      listeners.add(listener);
    },
    removeListener(listener) {
      listeners.delete(listener);
    }
  };

  withMockWindow(
    {
      matchMedia() {
        return mediaQuery;
      }
    },
    () => {
      const unsubscribe = subscribeToSystemDarkMode(() => {});
      assert.equal(listeners.size, 1);
      unsubscribe();
      assert.equal(listeners.size, 0);
    }
  );
});
