export const DISPLAY_MODES = Object.freeze({
  LIGHT: 'light',
  DARK: 'dark',
  ADAPTIVE: 'adaptive'
});

export const DEFAULT_DISPLAY_MODE = DISPLAY_MODES.ADAPTIVE;

export const DISPLAY_MODE_OPTIONS = Object.freeze([
  Object.freeze({ value: DISPLAY_MODES.LIGHT, label: 'Light' }),
  Object.freeze({ value: DISPLAY_MODES.DARK, label: 'Dark' }),
  Object.freeze({ value: DISPLAY_MODES.ADAPTIVE, label: 'Adaptive' })
]);

const VALID_DISPLAY_MODES = new Set(Object.values(DISPLAY_MODES));

export function sanitizeDisplayMode(displayMode) {
  if (typeof displayMode !== 'string') {
    return DEFAULT_DISPLAY_MODE;
  }

  const normalizedMode = displayMode.trim().toLowerCase();
  return VALID_DISPLAY_MODES.has(normalizedMode)
    ? normalizedMode
    : DEFAULT_DISPLAY_MODE;
}

export function resolveDisplayMode(displayMode, prefersDark = false) {
  const sanitizedMode = sanitizeDisplayMode(displayMode);

  if (sanitizedMode === DISPLAY_MODES.ADAPTIVE) {
    return prefersDark ? DISPLAY_MODES.DARK : DISPLAY_MODES.LIGHT;
  }

  return sanitizedMode;
}
