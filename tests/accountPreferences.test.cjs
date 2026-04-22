const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

let buildUserPreferencesRow;
let createDefaultAccountPreferences;
let GUEST_THEME_ROLLOUT_STORAGE_KEY;
let GUEST_THEME_ROLLOUT_VERSION;
let getThemeOptionLabel;
let readGuestAccountPreferences;
let readGuestAccountPreferencesWithThemeRollout;
let mergeAccountPreferences;
let sanitizeAccountPreferences;
let THEME_OPTIONS;
let writeGuestAccountPreferences;
let DEFAULT_THEME_KEY;

function createStorageMock(seed = {}) {
  const store = new Map(Object.entries(seed));

  return {
    getItem(key) {
      return store.has(key) ? store.get(key) : null;
    },
    setItem(key, value) {
      store.set(key, value);
    }
  };
}

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
    GUEST_THEME_ROLLOUT_STORAGE_KEY,
    GUEST_THEME_ROLLOUT_VERSION,
    readGuestAccountPreferences,
    readGuestAccountPreferencesWithThemeRollout,
    mergeAccountPreferences,
    sanitizeAccountPreferences,
    writeGuestAccountPreferences
  } = accountPreferences);
  ({ DEFAULT_THEME_KEY, getThemeOptionLabel, THEME_OPTIONS } = themes);
});

test('sanitizeAccountPreferences falls back to defaults when the row is missing', () => {
  const preferences = sanitizeAccountPreferences();

  assert.deepEqual(preferences, createDefaultAccountPreferences());
  assert.equal(preferences.themeKey, 'carbon-paper');
});

test('theme catalog exposes carbon-paper as the first option with the default label', () => {
  assert.equal(THEME_OPTIONS[0].key, 'carbon-paper');
  assert.equal(getThemeOptionLabel(THEME_OPTIONS[0]), 'Carbon Paper (Default)');
});

test('sanitizeAccountPreferences clamps invalid trainer data and falls back to the default theme', () => {
  const preferences = sanitizeAccountPreferences({
    theme_key: 'not-a-real-theme',
    trainer_practice_mode: 'DECIMAL',
    trainer_operation: 'DIVISION',
    trainer_left_digits: 2,
    trainer_right_digits: 8,
    trainer_left_decimal_digits: 0,
    trainer_right_decimal_digits: 99,
    trainer_round_size: 99999
  });

  assert.equal(preferences.themeKey, DEFAULT_THEME_KEY);
  assert.deepEqual(preferences.trainerSettings, {
    practiceMode: 'DECIMAL',
    operation: 'DIVISION',
    leftDigits: 2,
    rightDigits: 2,
    leftDecimalDigits: 1,
    rightDecimalDigits: 8,
    maxBase: 10,
    roundSize: 10000
  });
});

test('mergeAccountPreferences preserves unrelated fields across partial updates', () => {
  const current = sanitizeAccountPreferences({
    theme_key: 'studio-vermouth',
    trainer_practice_mode: 'POSITIVE',
    trainer_operation: 'ADDITION',
    trainer_left_digits: 3,
    trainer_right_digits: 2,
    trainer_left_decimal_digits: 2,
    trainer_right_decimal_digits: 2,
    trainer_round_size: 40
  });

  const themeUpdate = mergeAccountPreferences(current, {
    themeKey: 'paper-lantern'
  });
  assert.equal(themeUpdate.themeKey, 'paper-lantern');
  assert.deepEqual(themeUpdate.trainerSettings, current.trainerSettings);

  const trainerUpdate = mergeAccountPreferences(current, {
    trainerSettings: {
      practiceMode: 'DECIMAL',
      operation: 'DIVISION',
      rightDigits: 8,
      leftDecimalDigits: 4,
      rightDecimalDigits: 5,
      roundSize: 10000
    }
  });
  assert.equal(trainerUpdate.themeKey, current.themeKey);
  assert.deepEqual(trainerUpdate.trainerSettings, {
    practiceMode: 'DECIMAL',
    operation: 'DIVISION',
    leftDigits: 3,
    rightDigits: 3,
    leftDecimalDigits: 4,
    rightDecimalDigits: 5,
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
        practiceMode: 'DECIMAL',
        operation: 'SUBTRACTION',
        leftDigits: 4,
        rightDigits: 2,
        leftDecimalDigits: 3,
        rightDecimalDigits: 1,
        roundSize: 250
      }
    },
    '2026-03-30T00:00:00.000Z'
  );

  assert.deepEqual(row, {
    user_id: 'user-123',
    theme_key: 'paper-lantern',
    trainer_practice_mode: 'DECIMAL',
    trainer_operation: 'SUBTRACTION',
    trainer_left_digits: 4,
    trainer_right_digits: 2,
    trainer_left_decimal_digits: 3,
    trainer_right_decimal_digits: 1,
    trainer_max_base: 10,
    trainer_round_size: 250,
    updated_at: '2026-03-30T00:00:00.000Z'
  });
});

test('guest account preferences persist through local storage helpers', () => {
  const storage = createStorageMock();

  const wrote = writeGuestAccountPreferences(
    {
      themeKey: 'paper-lantern',
      trainerSettings: {
        practiceMode: 'DECIMAL',
        operation: 'DIVISION',
        leftDigits: 3,
        rightDigits: 8,
        leftDecimalDigits: 0,
        rightDecimalDigits: 99,
        maxBase: 10,
        roundSize: 99999
      }
    },
    storage
  );

  assert.equal(wrote, true);
  assert.deepEqual(readGuestAccountPreferences(storage), {
    themeKey: 'paper-lantern',
    trainerSettings: {
      practiceMode: 'DECIMAL',
      operation: 'DIVISION',
      leftDigits: 3,
      rightDigits: 3,
      leftDecimalDigits: 1,
      rightDecimalDigits: 8,
      maxBase: 10,
      roundSize: 10000
    }
  });
});

test('first-time guests land on the carbon-paper default theme and store the rollout marker', () => {
  const storage = createStorageMock();

  const preferences = readGuestAccountPreferencesWithThemeRollout(storage);

  assert.equal(preferences.themeKey, DEFAULT_THEME_KEY);
  assert.equal(storage.getItem(GUEST_THEME_ROLLOUT_STORAGE_KEY), JSON.stringify(GUEST_THEME_ROLLOUT_VERSION));
});

test('guest theme rollout resets an old saved theme once, then preserves manual changes', () => {
  const storage = createStorageMock();

  writeGuestAccountPreferences(
    {
      themeKey: 'paper-lantern',
      trainerSettings: {
        practiceMode: 'POSITIVE',
        operation: 'ADDITION',
        leftDigits: 2,
        rightDigits: 2,
        leftDecimalDigits: 2,
        rightDecimalDigits: 2,
        maxBase: 10,
        roundSize: 10
      }
    },
    storage
  );

  const rolledOutPreferences = readGuestAccountPreferencesWithThemeRollout(storage);
  assert.equal(rolledOutPreferences.themeKey, DEFAULT_THEME_KEY);

  writeGuestAccountPreferences(
    {
      ...rolledOutPreferences,
      themeKey: 'paper-lantern'
    },
    storage
  );

  const preservedPreferences = readGuestAccountPreferencesWithThemeRollout(storage);
  assert.equal(preservedPreferences.themeKey, 'paper-lantern');
});
