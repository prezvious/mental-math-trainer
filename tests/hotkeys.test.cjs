const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

let GLOBAL_HOTKEY_ACTIONS;
let GLOBAL_HOTKEY_KEYS;
let HOTKEY_DEFINITIONS;
let HOTKEY_REFERENCE_GROUPS;
let ROUND_CONTROL_HOTKEY;
let formatHotkeyLabel;
let getGlobalHotkeyAction;
let getGlobalHotkeyLabel;
let getNextThemeKey;
let isGlobalHotkeyAvailable;
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
    GLOBAL_HOTKEY_KEYS,
    HOTKEY_DEFINITIONS,
    HOTKEY_REFERENCE_GROUPS,
    ROUND_CONTROL_HOTKEY,
    formatHotkeyLabel,
    getGlobalHotkeyAction,
    getGlobalHotkeyLabel,
    getNextThemeKey,
    isGlobalHotkeyAvailable,
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

test('formatHotkeyLabel and getGlobalHotkeyLabel produce the visible keycap labels', () => {
  assert.equal(formatHotkeyLabel('r'), 'R');
  assert.equal(formatHotkeyLabel(' Enter '), 'Enter');
  assert.equal(formatHotkeyLabel(null), '');
  assert.equal(getGlobalHotkeyLabel(GLOBAL_HOTKEY_ACTIONS.THEME), 'T');
});

test('HOTKEY_REFERENCE_GROUPS exposes the full grouped shortcut reference', () => {
  assert.deepEqual(
    HOTKEY_REFERENCE_GROUPS.map((group) => group.label),
    ['Navigation', 'Appearance', 'Account', 'Round Control']
  );

  assert.deepEqual(
    HOTKEY_REFERENCE_GROUPS.flatMap((group) =>
      group.items.map((item) => formatHotkeyLabel(item.shortcut))
    ),
    ['R', 'M', 'P', 'T', 'I', 'U', 'O', 'Enter']
  );

  assert.equal(HOTKEY_DEFINITIONS.length, 8);
  assert.equal(
    HOTKEY_REFERENCE_GROUPS.flatMap((group) => group.items).length,
    HOTKEY_DEFINITIONS.length
  );
  assert.deepEqual(
    HOTKEY_REFERENCE_GROUPS.flatMap((group) =>
      group.items.map((item) => item.shortcut)
    ),
    HOTKEY_DEFINITIONS.map((definition) => definition.key)
  );
  assert.equal(
    HOTKEY_REFERENCE_GROUPS.find((group) => group.id === 'round-control')
      .items[0].shortcut,
    ROUND_CONTROL_HOTKEY
  );
});

test('global hotkey availability is derived from shortcut definitions', () => {
  assert.equal(isGlobalHotkeyAvailable(GLOBAL_HOTKEY_ACTIONS.LOGIN), true);
  assert.equal(
    isGlobalHotkeyAvailable(GLOBAL_HOTKEY_ACTIONS.LOGIN, {
      isAuthenticated: true
    }),
    false
  );
  assert.equal(isGlobalHotkeyAvailable(GLOBAL_HOTKEY_ACTIONS.LOGOUT), false);
  assert.equal(
    isGlobalHotkeyAvailable(GLOBAL_HOTKEY_ACTIONS.LOGOUT, {
      isAuthenticated: true
    }),
    true
  );
  assert.equal(isGlobalHotkeyAvailable('unknown'), false);
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
