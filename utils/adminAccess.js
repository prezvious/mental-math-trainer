export const ADMIN_EMAILS = Object.freeze([
  'saxumfluens@gmail.com',
  'mezmaids@gmail.com',
  'archivesnbt@gmail.com'
]);

const ADMIN_EMAIL_SET = new Set(ADMIN_EMAILS);

export function normalizeEmail(email = '') {
  return typeof email === 'string' ? email.trim().toLowerCase() : '';
}

export function isAdminEmail(email) {
  return ADMIN_EMAIL_SET.has(normalizeEmail(email));
}
