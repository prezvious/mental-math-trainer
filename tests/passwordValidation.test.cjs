const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

let getPasswordRuleIndicator;

test.before(async () => {
  const passwordValidation = await import(
    pathToFileURL(path.resolve(__dirname, '../utils/passwordValidation.js')).href
  );

  ({ getPasswordRuleIndicator } = passwordValidation);
});

test('getPasswordRuleIndicator returns distinct pass and fail glyphs', () => {
  assert.equal(getPasswordRuleIndicator(true), '\u2713');
  assert.equal(getPasswordRuleIndicator(false), '\u25cb');
});
