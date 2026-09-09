const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

let filterThemeOptionGroups;

const GROUPS = [
  {
    key: 'classic',
    label: 'Classic',
    themes: [
      {
        key: 'carbon-paper',
        name: 'Carbon Paper',
        vibe: 'Editorial calm.'
      },
      {
        key: 'sea-glass-ledger',
        name: 'Sea Glass Ledger',
        vibe: 'Coastal arithmetic calm.'
      }
    ]
  },
  {
    key: 'dark',
    label: 'Dark collection',
    themes: [
      {
        key: 'midnight-abacus',
        name: 'Midnight Abacus',
        vibe: 'Deep study focus.'
      }
    ]
  }
];

test.before(async () => {
  ({ filterThemeOptionGroups } = await import(
    pathToFileURL(path.resolve(__dirname, '../utils/commandDesk.js')).href
  ));
});

test('theme search preserves catalog order and all entries for a blank query', () => {
  const results = filterThemeOptionGroups(GROUPS, '   ');

  assert.deepEqual(
    results.map((group) => group.key),
    ['classic', 'dark']
  );
  assert.deepEqual(
    results.flatMap((group) => group.themes.map((theme) => theme.name)),
    ['Carbon Paper', 'Sea Glass Ledger', 'Midnight Abacus']
  );
});

test('theme search matches names, descriptions, and collection labels', () => {
  assert.deepEqual(
    filterThemeOptionGroups(GROUPS, '  GLASS ').flatMap((group) =>
      group.themes.map((theme) => theme.name)
    ),
    ['Sea Glass Ledger']
  );
  assert.deepEqual(
    filterThemeOptionGroups(GROUPS, 'coastal').flatMap((group) =>
      group.themes.map((theme) => theme.name)
    ),
    ['Sea Glass Ledger']
  );
  assert.deepEqual(
    filterThemeOptionGroups(GROUPS, 'dark').flatMap((group) =>
      group.themes.map((theme) => theme.name)
    ),
    ['Midnight Abacus']
  );
});

test('theme search omits empty groups and returns an empty result safely', () => {
  assert.deepEqual(
    filterThemeOptionGroups(GROUPS, 'midnight').map((group) => group.key),
    ['dark']
  );
  assert.deepEqual(filterThemeOptionGroups(GROUPS, 'no-match'), []);
  assert.deepEqual(filterThemeOptionGroups(null, 'anything'), []);
});

test('Command Desk source keeps compact controls and removes duplicated content', () => {
  const commandDeskPath = path.resolve(
    __dirname,
    '../components/CommandDesk.js'
  );
  const source = fs.readFileSync(commandDeskPath, 'utf8');

  assert.match(source, /Keyboard shortcuts/);
  assert.match(source, /aria-expanded=\{isShortcutsExpanded\}/);
  assert.match(source, /Search \$\{THEME_OPTIONS\.length\} themes…/);
  assert.match(source, /Reset appearance/);
  assert.match(source, /theme-summary-swatches/);
  assert.doesNotMatch(source, /<select/);
  assert.doesNotMatch(source, /theme-vibe/);
  assert.doesNotMatch(source, /utility-section-nav/);
  assert.doesNotMatch(source, /utility-section-account/);
  assert.doesNotMatch(source, /item\.description|item\.note/);
});
