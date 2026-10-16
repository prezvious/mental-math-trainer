const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const NEW_STYLES = [
  'calculator',
  'riso',
  'orbital',
  'crossword',
  'track',
  'bauhaus',
  'fieldnotes',
  'arcade'
];
let styles;
let preferences;
let themes;
test.before(async () => {
  styles = await import(
    pathToFileURL(path.resolve(__dirname, '../utils/interfaceStyle.js')).href
  );
  preferences = await import(
    pathToFileURL(path.resolve(__dirname, '../utils/accountPreferences.js'))
      .href
  );
  themes = await import(
    pathToFileURL(path.resolve(__dirname, '../utils/themes.js')).href
  );
});
test('all eight interfaces preserve existing options and validate safely', () => {
  assert.deepEqual(
    styles.INTERFACE_STYLE_OPTIONS.map((option) => option.value),
    ['studio', 'opaline', 'korner', 'kira', ...NEW_STYLES]
  );
  assert.equal(styles.sanitizeInterfaceStyle('invalid'), 'studio');
  for (const value of NEW_STYLES)
    assert.equal(styles.sanitizeInterfaceStyle(value), value);
});
test('interface options show names only, without descriptions', () => {
  for (const option of styles.INTERFACE_STYLE_OPTIONS) {
    assert.equal(Object.hasOwn(option, 'description'), false);
  }
  const commandDesk = fs.readFileSync(
    path.resolve(__dirname, '../components/CommandDesk.js'), 'utf8'
  );
  assert.doesNotMatch(commandDesk, /option.description|interface-option-description/);
});
test('interfaces round-trip independently of palette and mode', () => {
  for (const interfaceStyle of NEW_STYLES) {
    for (const displayMode of ['light', 'dark', 'adaptive']) {
      for (const { key: themeKey } of themes.THEME_OPTIONS) {
        const input = { interfaceStyle, themeKey, displayMode };
        const row = preferences.buildUserPreferencesRow('test-user', input);
        const restored = preferences.sanitizeAccountPreferences(row);
        assert.equal(restored.interfaceStyle, interfaceStyle);
        assert.equal(restored.themeKey, input.themeKey);
        assert.equal(restored.displayMode, displayMode);
      }
    }
  }
});
test('every new style has scoped adaptive artwork and responsive CSS', () => {
  const css = fs.readFileSync(
    path.resolve(__dirname, '../styles/collections.css'),
    'utf8'
  );
  const artwork = fs.readFileSync(
    path.resolve(__dirname, '../components/InterfaceArtwork.js'),
    'utf8'
  );
  assert.doesNotMatch(css, /#[0-9a-f]{3,8}\b|rgba?\(/i);
  assert.doesNotMatch(artwork, /#[0-9a-f]{3,8}\b|rgba?\(/i);
  for (const value of NEW_STYLES) {
    assert.ok(css.includes(`[data-interface-style='${value}']`), value);
    assert.ok(artwork.includes(`${value}:`), value);
  }
  assert.match(css, /prefers-reduced-motion/);
  assert.match(css, /max-width: 640px/);
});
test('database accepts every registered interface', () => {
  const migration = fs.readFileSync(
    path.resolve(
      __dirname,
      '../supabase/migrations/20261015000000_add_interface_collections.sql'
    ),
    'utf8'
  );
  for (const { value } of styles.INTERFACE_STYLE_OPTIONS)
    assert.ok(migration.includes(`'${value}'`), value);
});
