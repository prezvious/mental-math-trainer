import { useCallback, useSyncExternalStore } from 'react';
import {
  DISPLAY_MODES,
  resolveDisplayMode,
  sanitizeDisplayMode
} from './displayMode.js';

export const SYSTEM_DARK_MODE_QUERY = '(prefers-color-scheme: dark)';

export function getSystemDarkModeQuery() {
  if (
    typeof window === 'undefined' ||
    typeof window.matchMedia !== 'function'
  ) {
    return null;
  }

  return window.matchMedia(SYSTEM_DARK_MODE_QUERY);
}

export function getSystemPrefersDark() {
  return Boolean(getSystemDarkModeQuery()?.matches);
}

export function subscribeToSystemDarkMode(onStoreChange) {
  const mediaQuery = getSystemDarkModeQuery();
  if (!mediaQuery) {
    return () => {};
  }

  if (typeof mediaQuery.addEventListener === 'function') {
    mediaQuery.addEventListener('change', onStoreChange);
    return () => mediaQuery.removeEventListener('change', onStoreChange);
  }

  mediaQuery.addListener?.(onStoreChange);
  return () => mediaQuery.removeListener?.(onStoreChange);
}

export function useResolvedDisplayMode(displayMode) {
  const sanitizedMode = sanitizeDisplayMode(displayMode);

  const subscribe = useCallback(
    (onStoreChange) => {
      if (sanitizedMode !== DISPLAY_MODES.ADAPTIVE) {
        return () => {};
      }

      return subscribeToSystemDarkMode(onStoreChange);
    },
    [sanitizedMode]
  );

  const getSnapshot = useCallback(() => {
    if (sanitizedMode !== DISPLAY_MODES.ADAPTIVE) {
      return false;
    }

    return getSystemPrefersDark();
  }, [sanitizedMode]);

  const prefersDark = useSyncExternalStore(subscribe, getSnapshot, () => false);

  return resolveDisplayMode(sanitizedMode, prefersDark);
}
