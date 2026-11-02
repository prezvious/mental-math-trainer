function resolveStorage(storage) {
  if (storage) {
    return storage;
  }

  try {
    return typeof window === 'undefined' ? null : window.localStorage;
  } catch (_error) {
    return null;
  }
}

export function readStorageJson(key, storage = null) {
  const target = resolveStorage(storage);
  if (!target) {
    return null;
  }

  try {
    const raw = target.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch (_error) {
    return null;
  }
}

export function writeStorageJson(key, value, storage = null) {
  const target = resolveStorage(storage);
  if (!target) {
    return false;
  }

  try {
    target.setItem(key, JSON.stringify(value));
    return true;
  } catch (_error) {
    return false;
  }
}
