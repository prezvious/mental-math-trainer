import { PRACTICE_MODES, sanitizeSettings } from './mathEngine.js';
import { DEFAULT_THEME_KEY, resolveThemeKey } from './themes.js';
import { readStorageJson, writeStorageJson } from './browserStorage.js';

export const USER_PREFERENCES_TABLE = 'user_preferences';
export const GUEST_ACCOUNT_PREFERENCES_STORAGE_KEY =
  'mathtrainer:guest-account-preferences';
export const USER_PREFERENCES_COLUMNS = [
  'user_id',
  'theme_key',
  'trainer_practice_mode',
  'trainer_operation',
  'trainer_left_digits',
  'trainer_right_digits',
  'trainer_left_decimal_digits',
  'trainer_right_decimal_digits',
  'trainer_max_base',
  'trainer_round_size',
  'updated_at'
].join(', ');

export const DEFAULT_TRAINER_SETTINGS = Object.freeze({
  practiceMode: PRACTICE_MODES.POSITIVE,
  operation: 'MULTIPLICATION',
  leftDigits: 2,
  rightDigits: 2,
  leftDecimalDigits: 2,
  rightDecimalDigits: 2,
  maxBase: 10,
  roundSize: 10
});

export function createDefaultTrainerSettings() {
  return { ...DEFAULT_TRAINER_SETTINGS };
}

export function createDefaultAccountPreferences() {
  return {
    themeKey: DEFAULT_THEME_KEY,
    trainerSettings: createDefaultTrainerSettings()
  };
}

export function sanitizeThemeKey(themeKey) {
  return resolveThemeKey(themeKey) || DEFAULT_THEME_KEY;
}

export function sanitizeTrainerSettings(settings = {}) {
  return sanitizeSettings({
    practiceMode:
      settings.practiceMode ??
      settings.trainer_practice_mode ??
      DEFAULT_TRAINER_SETTINGS.practiceMode,
    operation:
      settings.operation ??
      settings.trainer_operation ??
      DEFAULT_TRAINER_SETTINGS.operation,
    leftDigits:
      settings.leftDigits ??
      settings.trainer_left_digits ??
      DEFAULT_TRAINER_SETTINGS.leftDigits,
    rightDigits:
      settings.rightDigits ??
      settings.trainer_right_digits ??
      DEFAULT_TRAINER_SETTINGS.rightDigits,
    leftDecimalDigits:
      settings.leftDecimalDigits ??
      settings.trainer_left_decimal_digits ??
      DEFAULT_TRAINER_SETTINGS.leftDecimalDigits,
    rightDecimalDigits:
      settings.rightDecimalDigits ??
      settings.trainer_right_decimal_digits ??
      DEFAULT_TRAINER_SETTINGS.rightDecimalDigits,
    maxBase:
      settings.maxBase ??
      settings.trainer_max_base ??
      DEFAULT_TRAINER_SETTINGS.maxBase,
    roundSize:
      settings.roundSize ??
      settings.trainer_round_size ??
      DEFAULT_TRAINER_SETTINGS.roundSize
  });
}

export function sanitizeAccountPreferences(input = {}) {
  return {
    themeKey: sanitizeThemeKey(input.themeKey ?? input.theme_key),
    trainerSettings: sanitizeTrainerSettings(input.trainerSettings ?? input)
  };
}

export function mergeAccountPreferences(currentPreferences, patch = {}) {
  const current = sanitizeAccountPreferences(currentPreferences);
  const nextTrainerSettings = patch.trainerSettings
    ? {
        ...current.trainerSettings,
        ...patch.trainerSettings
      }
    : current.trainerSettings;

  return sanitizeAccountPreferences({
    themeKey: patch.themeKey ?? current.themeKey,
    trainerSettings: nextTrainerSettings
  });
}

export function buildUserPreferencesRow(
  userId,
  preferences,
  updatedAt = new Date().toISOString()
) {
  const sanitized = sanitizeAccountPreferences(preferences);

  return {
    user_id: userId,
    theme_key: sanitized.themeKey,
    trainer_practice_mode: sanitized.trainerSettings.practiceMode,
    trainer_operation: sanitized.trainerSettings.operation,
    trainer_left_digits: sanitized.trainerSettings.leftDigits,
    trainer_right_digits: sanitized.trainerSettings.rightDigits,
    trainer_left_decimal_digits: sanitized.trainerSettings.leftDecimalDigits,
    trainer_right_decimal_digits: sanitized.trainerSettings.rightDecimalDigits,
    trainer_max_base: sanitized.trainerSettings.maxBase,
    trainer_round_size: sanitized.trainerSettings.roundSize,
    updated_at: updatedAt
  };
}

export function readGuestAccountPreferences(storage = null) {
  return sanitizeAccountPreferences(
    readStorageJson(GUEST_ACCOUNT_PREFERENCES_STORAGE_KEY, storage) || {}
  );
}

export function writeGuestAccountPreferences(preferences, storage = null) {
  return writeStorageJson(
    GUEST_ACCOUNT_PREFERENCES_STORAGE_KEY,
    sanitizeAccountPreferences(preferences),
    storage
  );
}
