const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

let GLOBAL_HOTKEY_ACTIONS;
let getGlobalHotkeyAction;
let getNextThemeKey;
let isShortcutEventEligible;

function createEvent(overrides = {}) {
  return {
    altKey: false,
    ctrlKey: false,
    defaultPrevented: false,
    isComposing: false,
    metaKey: false,
    repeat: false,
    shiftKey: false,
    target: { tagName: 'DIV', isContentEditable: false },
    ...overrides
  };
}

test.before(async () => {
  const hotkeys = await import(
    pathToFileURL(path.resolve(__dirname, '../utils/hotkeys.js')).href
  );

  ({
    GLOBAL_HOTKEY_ACTIONS,
    getGlobalHotkeyAction,
    getNextThemeKey,
    isShortcutEventEligible
  } = hotkeys);
});

test('getGlobalHotkeyAction resolves the configured plain-letter shortcuts', () => {
  assert.equal(getGlobalHotkeyAction('R'), GLOBAL_HOTKEY_ACTIONS.TRAINER);
  assert.equal(getGlobalHotkeyAction('m'), GLOBAL_HOTKEY_ACTIONS.MIXED);
  assert.equal(getGlobalHotkeyAction('P'), GLOBAL_HOTKEY_ACTIONS.PROGRESS);
  assert.equal(getGlobalHotkeyAction('t'), GLOBAL_HOTKEY_ACTIONS.THEME);
  assert.equal(getGlobalHotkeyAction('I'), GLOBAL_HOTKEY_ACTIONS.LOGIN);
  assert.equal(getGlobalHotkeyAction('u'), GLOBAL_HOTKEY_ACTIONS.SIGNUP);
  assert.equal(getGlobalHotkeyAction('O'), GLOBAL_HOTKEY_ACTIONS.LOGOUT);
  assert.equal(getGlobalHotkeyAction('x'), null);
});

test('isShortcutEventEligible blocks interactive targets and modified key presses', () => {
  assert.equal(
    isShortcutEventEligible(createEvent({ target: { tagName: 'INPUT' } })),
    false
  );
  assert.equal(
    isShortcutEventEligible(createEvent({ target: { tagName: 'A' } })),
    false
  );
  assert.equal(
    isShortcutEventEligible(
      createEvent({ target: { tagName: 'DIV', isContentEditable: true } })
    ),
    false
  );
  assert.equal(isShortcutEventEligible(createEvent({ shiftKey: true })), false);
  assert.equal(isShortcutEventEligible(createEvent({ metaKey: true })), false);
  assert.equal(isShortcutEventEligible(createEvent({ repeat: true })), false);
});

test('isShortcutEventEligible supports page-specific blocked containers', () => {
  const nestedTarget = { tagName: 'DIV', isContentEditable: false };
  const outsideTarget = { tagName: 'DIV', isContentEditable: false };
  const blockedContainer = {
    contains(candidate) {
      return candidate === nestedTarget;
    }
  };

  assert.equal(
    isShortcutEventEligible(createEvent({ target: nestedTarget }), {
      blockedContainers: [blockedContainer]
    }),
    false
  );
  assert.equal(
    isShortcutEventEligible(createEvent({ target: outsideTarget }), {
      blockedContainers: [blockedContainer]
    }),
    true
  );
});

test('getNextThemeKey wraps around the available theme options', () => {
  const themeOptions = [{ key: 'velvet' }, { key: 'paper' }, { key: 'sage' }];

  assert.equal(getNextThemeKey('velvet', themeOptions), 'paper');
  assert.equal(getNextThemeKey('sage', themeOptions), 'velvet');
  assert.equal(getNextThemeKey('unknown', themeOptions), 'velvet');
});
