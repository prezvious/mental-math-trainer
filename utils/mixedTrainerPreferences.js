import { DEFAULT_MIXED_SETTINGS, sanitizeMixedSettings } from './mixedDifficulty.js';

export const MIXED_PREFERENCES_TABLE = 'mixed_trainer_preferences';

export const MIXED_PREFERENCES_COLUMNS = [
  'user_id',
  'exponentiation_difficulty',
  'multiplication_difficulty',
  'addition_difficulty',
  'subtraction_difficulty',
  'division_difficulty',
  'round_size',
  'rtl_input',
  'hide_timer',
  'updated_at'
].join(', ');

const DB_TO_JS = {
  exponentiation_difficulty: 'exponentiationDifficulty',
  multiplication_difficulty: 'multiplicationDifficulty',
  addition_difficulty: 'additionDifficulty',
  subtraction_difficulty: 'subtractionDifficulty',
  division_difficulty: 'divisionDifficulty',
  round_size: 'roundSize',
  rtl_input: 'rtlInput',
  hide_timer: 'hideTimer'
};

export function sanitizeMixedPreferences(dbRow = {}) {
  const raw = {};

  for (const [dbKey, jsKey] of Object.entries(DB_TO_JS)) {
    if (dbRow[dbKey] !== undefined) {
      raw[jsKey] = dbRow[dbKey];
    } else if (dbRow[jsKey] !== undefined) {
      raw[jsKey] = dbRow[jsKey];
    }
  }

  return sanitizeMixedSettings({ ...DEFAULT_MIXED_SETTINGS, ...raw });
}

export function buildMixedPreferencesRow(
  userId,
  settings,
  updatedAt = new Date().toISOString()
) {
  const sanitized = sanitizeMixedSettings(settings);

  return {
    user_id: userId,
    exponentiation_difficulty: sanitized.exponentiationDifficulty,
    multiplication_difficulty: sanitized.multiplicationDifficulty,
    addition_difficulty: sanitized.additionDifficulty,
    subtraction_difficulty: sanitized.subtractionDifficulty,
    division_difficulty: sanitized.divisionDifficulty,
    round_size: sanitized.roundSize,
    rtl_input: sanitized.rtlInput,
    hide_timer: sanitized.hideTimer,
    updated_at: updatedAt
  };
}
