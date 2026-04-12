const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

let DEFAULT_MIXED_SETTINGS;
let buildMixedPreferencesRow;
let readGuestMixedPreferences;
let sanitizeMixedPreferences;
let writeGuestMixedPreferences;

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
  const mixedPreferences = await import(
    pathToFileURL(path.resolve(__dirname, '../utils/mixedTrainerPreferences.js')).href
  );
  const mixedDifficulty = await import(
    pathToFileURL(path.resolve(__dirname, '../utils/mixedDifficulty.js')).href
  );

  ({
    buildMixedPreferencesRow,
    readGuestMixedPreferences,
    sanitizeMixedPreferences,
    writeGuestMixedPreferences
  } = mixedPreferences);
  ({ DEFAULT_MIXED_SETTINGS } = mixedDifficulty);
});

test('sanitizeMixedPreferences falls back to defaults when the row is missing', () => {
  assert.deepEqual(sanitizeMixedPreferences(), DEFAULT_MIXED_SETTINGS);
});

test('buildMixedPreferencesRow produces the expected database payload', () => {
  const row = buildMixedPreferencesRow(
    'user-123',
    {
      exponentiationDifficulty: 'off',
      multiplicationDifficulty: 'hard',
      additionDifficulty: 'easy',
      subtractionDifficulty: 'medium',
      divisionDifficulty: 'warmup',
      roundSize: 55,
      rtlInput: true,
      hideTimer: true
    },
    '2026-03-30T00:00:00.000Z'
  );

  assert.deepEqual(row, {
    user_id: 'user-123',
    exponentiation_difficulty: 'off',
    multiplication_difficulty: 'hard',
    addition_difficulty: 'easy',
    subtraction_difficulty: 'medium',
    division_difficulty: 'warmup',
    round_size: 55,
    rtl_input: true,
    hide_timer: true,
    updated_at: '2026-03-30T00:00:00.000Z'
  });
});

test('guest mixed trainer preferences persist through local storage helpers', () => {
  const storage = createStorageMock();

  const wrote = writeGuestMixedPreferences(
    {
      exponentiationDifficulty: 'invalid',
      multiplicationDifficulty: 'expert',
      additionDifficulty: 'easy',
      subtractionDifficulty: 'off',
      divisionDifficulty: 'medium',
      roundSize: 777,
      rtlInput: true,
      hideTimer: true
    },
    storage
  );

  assert.equal(wrote, true);
  assert.deepEqual(readGuestMixedPreferences(storage), {
    ...DEFAULT_MIXED_SETTINGS,
    multiplicationDifficulty: 'expert',
    additionDifficulty: 'easy',
    subtractionDifficulty: 'off',
    divisionDifficulty: 'medium',
    roundSize: 7,
    rtlInput: true,
    hideTimer: true
  });
});
