export const AUTH_LOGIN_HANDOFF_STORAGE_KEY = 'mathtrainer:auth-login-handoff';
export const AUTH_LOGIN_HANDOFF_REASONS = Object.freeze({
  DUPLICATE_SIGNUP: 'duplicate-signup'
});

function resolveSessionStorage(storage) {
  if (storage) {
    return storage;
  }

  if (typeof window === 'undefined' || !window.sessionStorage) {
    return null;
  }

  return window.sessionStorage;
}

function sanitizeAuthLoginHandoff(input = {}) {
  const email = typeof input.email === 'string' ? input.email.trim() : '';
  if (!email) {
    return null;
  }

  if (input.reason !== AUTH_LOGIN_HANDOFF_REASONS.DUPLICATE_SIGNUP) {
    return null;
  }

  return {
    email,
    reason: AUTH_LOGIN_HANDOFF_REASONS.DUPLICATE_SIGNUP
  };
}

export function storeAuthLoginHandoff(
  email,
  storage = null,
  reason = AUTH_LOGIN_HANDOFF_REASONS.DUPLICATE_SIGNUP
) {
  const target = resolveSessionStorage(storage);
  const payload = sanitizeAuthLoginHandoff({ email, reason });
  if (!target || !payload) {
    return false;
  }

  try {
    target.setItem(AUTH_LOGIN_HANDOFF_STORAGE_KEY, JSON.stringify(payload));
    return true;
  } catch (_error) {
    return false;
  }
}

export function consumeAuthLoginHandoff(storage = null) {
  const target = resolveSessionStorage(storage);
  if (!target) {
    return null;
  }

  let rawValue = null;
  try {
    rawValue = target.getItem(AUTH_LOGIN_HANDOFF_STORAGE_KEY);
  } catch (_error) {
    return null;
  }

  if (!rawValue) {
    return null;
  }

  try {
    target.removeItem(AUTH_LOGIN_HANDOFF_STORAGE_KEY);
  } catch (_error) {}

  try {
    return sanitizeAuthLoginHandoff(JSON.parse(rawValue));
  } catch (_error) {
    return null;
  }
}
