export const GLOBAL_HOTKEY_ACTIONS = Object.freeze({
  TRAINER: 'trainer',
  MIXED: 'mixed',
  PROGRESS: 'progress',
  THEME: 'theme',
  LOGIN: 'login',
  SIGNUP: 'signup',
  LOGOUT: 'logout'
});

export const GLOBAL_HOTKEY_KEYS = Object.freeze({
  [GLOBAL_HOTKEY_ACTIONS.TRAINER]: 'r',
  [GLOBAL_HOTKEY_ACTIONS.MIXED]: 'm',
  [GLOBAL_HOTKEY_ACTIONS.PROGRESS]: 'p',
  [GLOBAL_HOTKEY_ACTIONS.THEME]: 't',
  [GLOBAL_HOTKEY_ACTIONS.LOGIN]: 'i',
  [GLOBAL_HOTKEY_ACTIONS.SIGNUP]: 'u',
  [GLOBAL_HOTKEY_ACTIONS.LOGOUT]: 'o'
});

const INTERACTIVE_TAG_NAMES = new Set(['input', 'textarea', 'select', 'button', 'a']);

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

  return (
    Object.entries(GLOBAL_HOTKEY_KEYS).find(
      ([, shortcutKey]) => shortcutKey === normalizedKey
    )?.[0] || null
  );
}

export function getGlobalHotkeyLabel(action) {
  return formatHotkeyLabel(GLOBAL_HOTKEY_KEYS[action]);
}

export function isInteractiveHotkeyTarget(target) {
  if (!target || typeof target !== 'object') {
    return false;
  }

  const tagName =
    typeof target.tagName === 'string' ? target.tagName.trim().toLowerCase() : '';

  if (INTERACTIVE_TAG_NAMES.has(tagName)) {
    return true;
  }

  return Boolean(target.isContentEditable);
}

export function isShortcutEventEligible(event, { blockedContainers = [] } = {}) {
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

  const currentIndex = themeOptions.findIndex((theme) => theme.key === currentThemeKey);
  const nextIndex = currentIndex === -1 ? 0 : (currentIndex + 1) % themeOptions.length;

  return themeOptions[nextIndex].key;
}
