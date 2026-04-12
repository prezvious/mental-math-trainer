const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

let ADMIN_EMAILS;
let isAdminEmail;
let normalizeEmail;

test.before(async () => {
  const adminAccess = await import(
    pathToFileURL(path.resolve(__dirname, '../utils/adminAccess.js')).href
  );

  ({ ADMIN_EMAILS, isAdminEmail, normalizeEmail } = adminAccess);
});

test('normalizeEmail trims and lowercases email addresses', () => {
  assert.equal(normalizeEmail('  SAXUMFLUENS@GMAIL.COM  '), 'saxumfluens@gmail.com');
  assert.equal(normalizeEmail(null), '');
});

test('isAdminEmail only allows the exact configured admin emails', () => {
  assert.deepEqual(ADMIN_EMAILS, [
    'saxumfluens@gmail.com',
    'mezmaids@gmail.com',
    'archivesnbt@gmail.com'
  ]);
  assert.equal(isAdminEmail('mezmaids@gmail.com'), true);
  assert.equal(isAdminEmail('MezMaids@gmail.com'), true);
  assert.equal(isAdminEmail('not-admin@gmail.com'), false);
});
