const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

let DEFAULT_DISPLAY_MODE;
let DISPLAY_MODES;
let resolveDisplayMode;
let sanitizeDisplayMode;

test.before(async () => {
  const displayMode = await import(
    pathToFileURL(path.resolve(__dirname, '../utils/displayMode.js')).href
  );

  ({
    DEFAULT_DISPLAY_MODE,
    DISPLAY_MODES,
    resolveDisplayMode,
    sanitizeDisplayMode
  } = displayMode);
});

test('display mode sanitizer accepts supported values and normalizes input', () => {
  assert.equal(sanitizeDisplayMode('light'), DISPLAY_MODES.LIGHT);
  assert.equal(sanitizeDisplayMode(' DARK '), DISPLAY_MODES.DARK);
  assert.equal(sanitizeDisplayMode('Adaptive'), DISPLAY_MODES.ADAPTIVE);
});

test('display mode sanitizer falls back to Adaptive for unsafe stored values', () => {
  assert.equal(DEFAULT_DISPLAY_MODE, DISPLAY_MODES.ADAPTIVE);
  assert.equal(sanitizeDisplayMode(), DISPLAY_MODES.ADAPTIVE);
  assert.equal(sanitizeDisplayMode(null), DISPLAY_MODES.ADAPTIVE);
  assert.equal(sanitizeDisplayMode('sepia'), DISPLAY_MODES.ADAPTIVE);
});

test('display mode resolver follows the system only in Adaptive mode', () => {
  assert.equal(resolveDisplayMode('adaptive', false), DISPLAY_MODES.LIGHT);
  assert.equal(resolveDisplayMode('adaptive', true), DISPLAY_MODES.DARK);
  assert.equal(resolveDisplayMode('light', true), DISPLAY_MODES.LIGHT);
  assert.equal(resolveDisplayMode('dark', false), DISPLAY_MODES.DARK);
  assert.equal(resolveDisplayMode('invalid', false), DISPLAY_MODES.LIGHT);
  assert.equal(resolveDisplayMode('invalid', true), DISPLAY_MODES.DARK);
});
