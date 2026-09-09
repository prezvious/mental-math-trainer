export const GLOBAL_HOTKEY_ACTIONS = Object.freeze({
  TRAINER: 'trainer',
  MIXED: 'mixed',
  PROGRESS: 'progress',
  THEME: 'theme',
  LOGIN: 'login',
  SIGNUP: 'signup',
  LOGOUT: 'logout'
});

export const ROUND_CONTROL_HOTKEY = 'Enter';

const HOTKEY_GROUPS = Object.freeze([
  Object.freeze({ id: 'navigation', label: 'Navigation' }),
  Object.freeze({ id: 'appearance', label: 'Appearance' }),
  Object.freeze({ id: 'account', label: 'Account' }),
  Object.freeze({ id: 'round-control', label: 'Round Control' })
]);

export const HOTKEY_DEFINITIONS = Object.freeze([
  Object.freeze({
    action: GLOBAL_HOTKEY_ACTIONS.TRAINER,
    key: 'r',
    group: 'navigation',
    label: 'Open Trainer',
    availability: 'always',
    scope: 'global'
  }),
  Object.freeze({
    action: GLOBAL_HOTKEY_ACTIONS.MIXED,
    key: 'm',
    group: 'navigation',
    label: 'Open Mixed',
    availability: 'always',
    scope: 'global'
  }),
  Object.freeze({
    action: GLOBAL_HOTKEY_ACTIONS.PROGRESS,
    key: 'p',
    group: 'navigation',
    label: 'Open Progress',
    availability: 'always',
    scope: 'global'
  }),
  Object.freeze({
    action: GLOBAL_HOTKEY_ACTIONS.THEME,
    key: 't',
    group: 'appearance',
    label: 'Cycle theme',
    availability: 'always',
    scope: 'global'
  }),
  Object.freeze({
    action: GLOBAL_HOTKEY_ACTIONS.LOGIN,
    key: 'i',
    group: 'account',
    label: 'Open Log in',
    availability: 'signed-out',
    scope: 'global'
  }),
  Object.freeze({
    action: GLOBAL_HOTKEY_ACTIONS.SIGNUP,
    key: 'u',
    group: 'account',
    label: 'Open Sign up',
    availability: 'signed-out',
    scope: 'global'
  }),
  Object.freeze({
    action: GLOBAL_HOTKEY_ACTIONS.LOGOUT,
    key: 'o',
    group: 'account',
    label: 'Log out',
    availability: 'signed-in',
    scope: 'global'
  }),
  Object.freeze({
    action: 'round-primary',
    key: ROUND_CONTROL_HOTKEY,
    group: 'round-control',
    label: 'Primary round action',
    availability: 'trainer-idle',
    scope: 'page'
  })
]);

const GLOBAL_HOTKEY_DEFINITIONS = HOTKEY_DEFINITIONS.filter(
  (definition) => definition.scope === 'global'
);

export const GLOBAL_HOTKEY_KEYS = Object.freeze(
  Object.fromEntries(
    GLOBAL_HOTKEY_DEFINITIONS.map((definition) => [
      definition.action,
      definition.key
    ])
  )
);

export const HOTKEY_REFERENCE_GROUPS = Object.freeze(
  HOTKEY_GROUPS.map((group) =>
    Object.freeze({
      ...group,
      items: Object.freeze(
        HOTKEY_DEFINITIONS.filter(
          (definition) => definition.group === group.id
        ).map((definition) =>
          Object.freeze({
            action: definition.action,
            shortcut: definition.key,
            label: definition.label,
            availability: definition.availability
          })
        )
      )
    })
  )
);

const GLOBAL_HOTKEY_DEFINITION_BY_KEY = new Map(
  GLOBAL_HOTKEY_DEFINITIONS.map((definition) => [definition.key, definition])
);

const GLOBAL_HOTKEY_DEFINITION_BY_ACTION = new Map(
  GLOBAL_HOTKEY_DEFINITIONS.map((definition) => [definition.action, definition])
);

const INTERACTIVE_TAG_NAMES = new Set([
  'input',
  'textarea',
  'select',
  'button',
  'a'
]);

function normalizeKey(key) {
  return typeof key === 'string' ? key.trim().toLowerCase() : '';
}

export function formatHotkeyLabel(shortcut) {
  if (typeof shortcut !== 'string') {
    return '';
  }

  const trimmedShortcut = shortcut.trim();
  if (!trimmedShortcut) {
    return '';
  }

  return trimmedShortcut.length === 1
    ? trimmedShortcut.toUpperCase()
    : trimmedShortcut;
}

export function getGlobalHotkeyAction(key) {
  const normalizedKey = normalizeKey(key);

  return GLOBAL_HOTKEY_DEFINITION_BY_KEY.get(normalizedKey)?.action || null;
}

export function getGlobalHotkeyLabel(action) {
  return formatHotkeyLabel(GLOBAL_HOTKEY_KEYS[action]);
}

export function isGlobalHotkeyAvailable(
  action,
  { isAuthenticated = false } = {}
) {
  const definition = GLOBAL_HOTKEY_DEFINITION_BY_ACTION.get(action);
  if (!definition) {
    return false;
  }

  if (definition.availability === 'signed-in') {
    return isAuthenticated;
  }

  if (definition.availability === 'signed-out') {
    return !isAuthenticated;
  }

  return true;
}

export function isInteractiveHotkeyTarget(target) {
  if (!target || typeof target !== 'object') {
    return false;
  }

  const tagName =
    typeof target.tagName === 'string'
      ? target.tagName.trim().toLowerCase()
      : '';

  if (INTERACTIVE_TAG_NAMES.has(tagName)) {
    return true;
  }

  return Boolean(target.isContentEditable);
}

export function isShortcutEventEligible(
  event,
  { blockedContainers = [] } = {}
) {
  if (
    !event ||
    event.defaultPrevented ||
    event.repeat ||
    event.isComposing ||
    event.altKey ||
    event.ctrlKey ||
    event.metaKey ||
    event.shiftKey
  ) {
    return false;
  }

  const target = event.target;
  if (isInteractiveHotkeyTarget(target)) {
    return false;
  }

  return !blockedContainers.some(
    (container) =>
      container &&
      target &&
      typeof container.contains === 'function' &&
      container.contains(target)
  );
}

export function getNextThemeKey(currentThemeKey, themeOptions = []) {
  if (!Array.isArray(themeOptions) || themeOptions.length === 0) {
    return currentThemeKey;
  }

  const currentIndex = themeOptions.findIndex(
    (theme) => theme.key === currentThemeKey
  );
  const nextIndex =
    currentIndex === -1 ? 0 : (currentIndex + 1) % themeOptions.length;

  return themeOptions[nextIndex].key;
}
