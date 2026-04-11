const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

let buildUserPreferencesRow;
let createDefaultAccountPreferences;
let mergeAccountPreferences;
let sanitizeAccountPreferences;
let DEFAULT_THEME_KEY;

test.before(async () => {
  const accountPreferences = await import(
    pathToFileURL(path.resolve(__dirname, '../utils/accountPreferences.js')).href
  );
  const themes = await import(
    pathToFileURL(path.resolve(__dirname, '../utils/themes.js')).href
  );

  ({
    buildUserPreferencesRow,
    createDefaultAccountPreferences,
    mergeAccountPreferences,
    sanitizeAccountPreferences
  } = accountPreferences);
  ({ DEFAULT_THEME_KEY } = themes);
});

test('sanitizeAccountPreferences falls back to defaults when the row is missing', () => {
  const preferences = sanitizeAccountPreferences();

  assert.deepEqual(preferences, createDefaultAccountPreferences());
});

test('sanitizeAccountPreferences clamps invalid trainer data and falls back to the default theme', () => {
  const preferences = sanitizeAccountPreferences({
    theme_key: 'not-a-real-theme',
    trainer_operation: 'DIVISION',
    trainer_left_digits: 2,
    trainer_right_digits: 8,
    trainer_round_size: 99999
  });

  assert.equal(preferences.themeKey, DEFAULT_THEME_KEY);
  assert.deepEqual(preferences.trainerSettings, {
    operation: 'DIVISION',
    leftDigits: 2,
    rightDigits: 2,
    maxBase: 10,
    roundSize: 10000
  });
});

test('mergeAccountPreferences preserves unrelated fields across partial updates', () => {
  const current = sanitizeAccountPreferences({
    theme_key: 'studio-vermouth',
    trainer_operation: 'ADDITION',
    trainer_left_digits: 3,
    trainer_right_digits: 2,
    trainer_round_size: 40
  });

  const themeUpdate = mergeAccountPreferences(current, {
    themeKey: 'paper-lantern'
  });
  assert.equal(themeUpdate.themeKey, 'paper-lantern');
  assert.deepEqual(themeUpdate.trainerSettings, current.trainerSettings);

  const trainerUpdate = mergeAccountPreferences(current, {
    trainerSettings: {
      operation: 'DIVISION',
      rightDigits: 8,
      roundSize: 10000
    }
  });
  assert.equal(trainerUpdate.themeKey, current.themeKey);
  assert.deepEqual(trainerUpdate.trainerSettings, {
    operation: 'DIVISION',
    leftDigits: 3,
    rightDigits: 3,
    maxBase: 10,
    roundSize: 10000
  });
});

test('buildUserPreferencesRow produces the expected database payload', () => {
  const row = buildUserPreferencesRow(
    'user-123',
    {
      themeKey: 'paper-lantern',
      trainerSettings: {
        operation: 'SUBTRACTION',
        leftDigits: 4,
        rightDigits: 2,
        roundSize: 250
      }
    },
    '2026-03-30T00:00:00.000Z'
  );

  assert.deepEqual(row, {
    user_id: 'user-123',
    theme_key: 'paper-lantern',
    trainer_operation: 'SUBTRACTION',
    trainer_left_digits: 4,
    trainer_right_digits: 2,
    trainer_max_base: 10,
    trainer_round_size: 250,
    updated_at: '2026-03-30T00:00:00.000Z'
  });
});
