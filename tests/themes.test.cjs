const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const APPROVED_THEME_ORDER = [
  'carbon-paper',
  'powder-blue-notebook',
  'sea-glass-ledger',
  'honeydew-harbor',
  'apothecary-glass',
  'sage-whisk',
  'pistachio-tile',
  'matcha-sunrise',
  'rainwashed-clay',
  'blush-blueprint',
  'peach-graphite',
  'cloudberry-mint',
  'citrus-draft',
  'ink-and-apricot',
  'paper-lantern',
  'signal-peach',
  'taxi-noir',
  'velvet-circuit',
  'lavender-mist',
  'abacus-bloom',
  'soroban-peach',
  'graph-mint',
  'violet-ruler',
  'citrus-margin',
  'algebra-rose',
  'blueprint-air',
  'decimal-sage',
  'coral-ledger',
  'lilac-formula',
  'teal-compass',
  'amber-index',
  'berry-notebook',
  'pistachio-grid',
  'cerulean-quiz',
  'papaya-proof',
  'lavender-metric',
  'aqua-flashcard',
  'marigold-memo',
  'prism-paper',
  'midnight-abacus',
  'neon-long-division',
  'observatory-ink',
  'carbon-equation',
  'cobalt-afterhours',
  'ember-blackboard',
  'deep-sea-calculator',
  'plum-algorithm',
  'forest-binary',
  'ruby-function',
  'indigo-grid',
  'bronze-theorem',
  'aurora-matrix',
  'lunar-graphite',
  'magenta-operator',
  'arctic-variable',
  'moss-terminal',
  'saffron-night',
  'eclipse-violet',
  'crimson-vector'
];

const ADDED_THEME_COLORS = Object.freeze({
  'abacus-bloom': ['#D85D72', '#58A88B', '#FFF7F5', '#38272D'],
  'soroban-peach': ['#E96F51', '#F0B95A', '#FFF7ED', '#3C2A32'],
  'graph-mint': ['#2E9C76', '#9BD6C6', '#F3FBF7', '#18352E'],
  'violet-ruler': ['#7C5CE7', '#C7B8F5', '#F8F6FF', '#28213D'],
  'citrus-margin': ['#D99000', '#F2CF5B', '#FFFBEA', '#3D341B'],
  'algebra-rose': ['#C94F7C', '#EEA6BD', '#FFF5F8', '#422434'],
  'blueprint-air': ['#2674C8', '#8EC5F2', '#F3F9FE', '#17324D'],
  'decimal-sage': ['#568B62', '#ABC7A3', '#F5FAF2', '#26362A'],
  'coral-ledger': ['#DD6248', '#F3A58F', '#FFF6F2', '#472C27'],
  'lilac-formula': ['#8A5EC8', '#D3BDEF', '#FAF7FF', '#332743'],
  'teal-compass': ['#168A8D', '#7CCFD0', '#F1FBFB', '#17383A'],
  'amber-index': ['#C77910', '#F0C574', '#FFF9EC', '#3D2D19'],
  'berry-notebook': ['#B14872', '#E7A8C0', '#FFF5F9', '#3F2330'],
  'pistachio-grid': ['#69A447', '#B8D89B', '#F7FBEF', '#2C3A24'],
  'cerulean-quiz': ['#217DA8', '#85CBE0', '#F2FBFE', '#183743'],
  'papaya-proof': ['#E2673F', '#F1B36B', '#FFF7F0', '#482B21'],
  'lavender-metric': ['#6F68C9', '#BCB7EE', '#F7F6FF', '#292842'],
  'aqua-flashcard': ['#168E7B', '#8AD9C6', '#F0FCF8', '#173A34'],
  'marigold-memo': ['#B8860B', '#E8C766', '#FFFBEE', '#3B3217'],
  'prism-paper': ['#5D6FE5', '#E87591', '#F8F8FF', '#272B48'],
  'midnight-abacus': ['#66D9C1', '#7AA7FF', '#0C1519', '#EAF8F5'],
  'neon-long-division': ['#B9E85C', '#54C7EC', '#11160D', '#F3FFE4'],
  'observatory-ink': ['#9B8CFF', '#F0A66A', '#111224', '#F3F1FF'],
  'carbon-equation': ['#E1E4EA', '#7D8796', '#0E1014', '#F7F8FA'],
  'cobalt-afterhours': ['#5C9DFF', '#E182B4', '#0B1425', '#EDF4FF'],
  'ember-blackboard': ['#F28C52', '#E5C07B', '#1A100D', '#FFF2E8'],
  'deep-sea-calculator': ['#45C4C8', '#7CA6D8', '#07191D', '#EAFBFC'],
  'plum-algorithm': ['#CA8BE8', '#EBA4C9', '#1A0E20', '#FBEFFC'],
  'forest-binary': ['#72C98A', '#C5D66D', '#0B1A12', '#F0F9F2'],
  'ruby-function': ['#EE6A78', '#F0A38F', '#210D13', '#FFF0F2'],
  'indigo-grid': ['#899CFF', '#66C0D0', '#0D1026', '#F1F3FF'],
  'bronze-theorem': ['#D6A15D', '#8AC6A8', '#1A130B', '#FFF5E6'],
  'aurora-matrix': ['#6FE1B8', '#B48CFF', '#0B171B', '#EEFFF9'],
  'lunar-graphite': ['#A9B4C4', '#6D88A9', '#12161D', '#F4F7FB'],
  'magenta-operator': ['#E77BC3', '#8FA7FF', '#1C0D1A', '#FFF0FB'],
  'arctic-variable': ['#81D4FA', '#A8B5FF', '#09151F', '#EFFAFF'],
  'moss-terminal': ['#9BCB7A', '#D1A96B', '#11190D', '#F4FBEF'],
  'saffron-night': ['#F3BE5B', '#E57B6F', '#1C1509', '#FFF8E8'],
  'eclipse-violet': ['#AF8CFF', '#6ED4C3', '#120D1E', '#F7F1FF'],
  'crimson-vector': ['#FF7A82', '#C494FF', '#210D12', '#FFF1F2']
});

const HEX_PATTERN = /^#[0-9A-F]{6}$/;
const RGBA_PATTERN = /^rgba\((\d+), (\d+), (\d+), (0(?:\.\d+)?|1(?:\.0+)?)\)$/;
const HEX_TOKEN_KEYS = [
  'ink900',
  'ink700',
  'ink500',
  'paper',
  'paperStrong',
  'sand',
  'accentMain',
  'accentWarm',
  'accentSoft',
  'accentAlert',
  'textMain',
  'textSubtle',
  'textAccent',
  'textDanger',
  'line',
  'controlBorder',
  'focusRing',
  'buttonStrongText',
  'buttonQuietText',
  'buttonDangerText',
  'surfaceRaised',
  'surfaceRaisedStrong',
  'surfaceInput',
  'surfaceSelected',
  'surfacePositive',
  'surfaceWarning',
  'surfaceDanger',
  'surfaceHighlight',
  'surfaceShadow',
  'headerSurface',
  'headerSurfaceAlt',
  'headerText',
  'headerTextAccent',
  'headerTextSubtle',
  'headerControlSurface',
  'headerControlBorder',
  'toggleThumb'
];
const RGBA_TOKEN_KEYS = [
  'surfaceScrim',
  'headerBorder',
  'heroDecorStroke',
  'heroDecorFill',
  'glowMain',
  'glowWarm',
  'glowSoft',
  'glowLine'
];

let DEFAULT_THEME_KEY;
let getThemeTokens;
let LEGACY_THEME_ALIASES;
let THEME_COLLECTIONS;
let THEME_OPTIONS;
let resolveThemeKey;

function srgbChannelToLinear(channel) {
  const srgb = channel / 255;
  return srgb <= 0.04045 ? srgb / 12.92 : ((srgb + 0.055) / 1.055) ** 2.4;
}

function hexToRgb(hex) {
  return {
    r: Number.parseInt(hex.slice(1, 3), 16),
    g: Number.parseInt(hex.slice(3, 5), 16),
    b: Number.parseInt(hex.slice(5, 7), 16)
  };
}

function rgbToHex({ r, g, b }) {
  const toHex = (channel) =>
    Math.round(Math.max(0, Math.min(255, channel)))
      .toString(16)
      .padStart(2, '0')
      .toUpperCase();

  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function parseRgba(rgba) {
  const match = RGBA_PATTERN.exec(rgba);
  assert.ok(match, `${rgba} should be an rgba color`);

  return {
    r: Number.parseInt(match[1], 10),
    g: Number.parseInt(match[2], 10),
    b: Number.parseInt(match[3], 10),
    alpha: Number.parseFloat(match[4])
  };
}

function compositeRgbaOverHex(rgba, backgroundHex) {
  const foreground = parseRgba(rgba);
  const background = hexToRgb(backgroundHex);

  return rgbToHex({
    r: background.r + (foreground.r - background.r) * foreground.alpha,
    g: background.g + (foreground.g - background.g) * foreground.alpha,
    b: background.b + (foreground.b - background.b) * foreground.alpha
  });
}

function relativeLuminance(hex) {
  const { r, g, b } = hexToRgb(hex);
  return (
    0.2126 * srgbChannelToLinear(r) +
    0.7152 * srgbChannelToLinear(g) +
    0.0722 * srgbChannelToLinear(b)
  );
}

function contrastRatio(hexA, hexB) {
  const lumA = relativeLuminance(hexA);
  const lumB = relativeLuminance(hexB);
  const lighter = Math.max(lumA, lumB);
  const darker = Math.min(lumA, lumB);

  return (lighter + 0.05) / (darker + 0.05);
}

test.before(async () => {
  const themes = await import(
    pathToFileURL(path.resolve(__dirname, '../utils/themes.js')).href
  );

  ({
    DEFAULT_THEME_KEY,
    getThemeTokens,
    LEGACY_THEME_ALIASES,
    THEME_COLLECTIONS,
    THEME_OPTIONS,
    resolveThemeKey
  } = themes);
});

test('theme catalog keeps carbon-paper as default and follows the approved mood order', () => {
  assert.equal(DEFAULT_THEME_KEY, 'carbon-paper');
  assert.deepEqual(
    THEME_OPTIONS.map((theme) => theme.key),
    APPROVED_THEME_ORDER
  );
});

test('theme catalog includes exactly 20 light and 20 dark palette-only additions', () => {
  assert.equal(THEME_OPTIONS.length, 59);

  const keys = THEME_OPTIONS.map((theme) => theme.key);
  assert.equal(new Set(keys).size, keys.length);
  assert.equal(
    THEME_OPTIONS.filter(
      (theme) => theme.collection === THEME_COLLECTIONS.CLASSIC
    ).length,
    19
  );
  assert.equal(
    THEME_OPTIONS.filter(
      (theme) => theme.collection === THEME_COLLECTIONS.LIGHT
    ).length,
    20
  );
  assert.equal(
    THEME_OPTIONS.filter((theme) => theme.collection === THEME_COLLECTIONS.DARK)
      .length,
    20
  );

  for (const [key, expectedColors] of Object.entries(ADDED_THEME_COLORS)) {
    const theme = THEME_OPTIONS.find((option) => option.key === key);

    assert.ok(theme, `${key} should be available`);
    assert.deepEqual(theme.colors, expectedColors);
    assert.equal(resolveThemeKey(key), key);
    assert.equal('font' in theme, false);
    assert.equal('fonts' in theme, false);
    assert.equal('fontFamily' in theme, false);
  }
});

test('all theme colors stay normalized and every theme exposes four swatches', () => {
  for (const theme of THEME_OPTIONS) {
    assert.match(theme.key, /^[a-z0-9]+(?:-[a-z0-9]+)*$/);
    assert.ok(theme.name.trim(), `${theme.key} should have a display name`);
    assert.ok(theme.vibe.trim(), `${theme.key} should have a description`);
    assert.ok(
      Object.values(THEME_COLLECTIONS).includes(theme.collection),
      `${theme.key} should belong to a known collection`
    );
    assert.equal(
      theme.colors.length,
      4,
      `${theme.key} should expose four swatches`
    );

    for (const color of theme.colors) {
      assert.match(
        color,
        HEX_PATTERN,
        `${theme.key} color ${color} should be normalized`
      );
    }

    assert.equal(theme.tokens, theme.tokensByMode.light);
    assert.equal(theme.tokensByMode.light.colorScheme, 'light');
    assert.equal(theme.tokensByMode.dark.colorScheme, 'dark');
  }
});

test('legacy aliases and every catalog key resolve without breaking stored preferences', () => {
  for (const theme of THEME_OPTIONS) {
    assert.equal(resolveThemeKey(theme.key), theme.key);
  }

  for (const [legacyKey, currentKey] of Object.entries(LEGACY_THEME_ALIASES)) {
    assert.equal(resolveThemeKey(legacyKey), currentKey);
  }
});

test('every generated color token is normalized and mode-complete', () => {
  for (const theme of THEME_OPTIONS) {
    for (const mode of ['light', 'dark']) {
      const tokens = getThemeTokens(theme.key, mode);
      assert.equal(tokens.colorScheme, mode);

      for (const key of HEX_TOKEN_KEYS) {
        assert.match(
          tokens[key],
          HEX_PATTERN,
          `${theme.key}/${mode} ${key} should be a normalized hex color`
        );
      }

      for (const key of RGBA_TOKEN_KEYS) {
        const rgba = parseRgba(tokens[key]);
        assert.ok(
          [rgba.r, rgba.g, rgba.b].every(
            (channel) => channel >= 0 && channel <= 255
          ),
          `${theme.key}/${mode} ${key} should have valid RGB channels`
        );
        assert.ok(
          rgba.alpha >= 0 && rgba.alpha <= 1,
          `${theme.key}/${mode} ${key} should have a valid alpha`
        );
      }
    }
  }
});

test('all 118 generated theme-mode token sets meet contrast requirements', () => {
  const contentSurfaceKeys = [
    'paper',
    'paperStrong',
    'surfaceRaised',
    'surfaceRaisedStrong',
    'surfaceInput',
    'surfaceSelected',
    'surfacePositive',
    'surfaceWarning',
    'surfaceDanger',
    'surfaceHighlight'
  ];

  for (const theme of THEME_OPTIONS) {
    for (const mode of ['light', 'dark']) {
      const tokens = getThemeTokens(theme.key, mode);
      const contentSurfaces = contentSurfaceKeys.map((key) => tokens[key]);

      for (const surface of contentSurfaces) {
        assert.ok(
          contrastRatio(surface, tokens.textMain) >= 4.5,
          `${theme.key}/${mode} textMain should contrast with ${surface}`
        );
        assert.ok(
          contrastRatio(surface, tokens.textSubtle) >= 4.5,
          `${theme.key}/${mode} textSubtle should contrast with ${surface}`
        );
        assert.ok(
          contrastRatio(surface, tokens.textAccent) >= 4.5,
          `${theme.key}/${mode} textAccent should contrast with ${surface}`
        );
        assert.ok(
          contrastRatio(surface, tokens.textDanger) >= 4.5,
          `${theme.key}/${mode} textDanger should contrast with ${surface}`
        );
      }

      assert.ok(
        contrastRatio(tokens.accentMain, tokens.buttonStrongText) >= 4.5,
        `${theme.key}/${mode} strong button text should be readable`
      );
      assert.ok(
        contrastRatio(tokens.accentAlert, tokens.buttonDangerText) >= 4.5,
        `${theme.key}/${mode} danger button text should be readable`
      );
      for (const surface of [tokens.paperStrong, tokens.surfaceRaisedStrong]) {
        assert.ok(
          contrastRatio(surface, tokens.buttonQuietText) >= 4.5,
          `${theme.key}/${mode} quiet button text should be readable`
        );
      }
      for (const surface of [
        tokens.headerSurface,
        tokens.headerSurfaceAlt,
        tokens.headerControlSurface
      ]) {
        assert.ok(
          contrastRatio(surface, tokens.headerText) >= 4.5,
          `${theme.key}/${mode} header text should be readable`
        );
        assert.ok(
          contrastRatio(surface, tokens.headerTextSubtle) >= 4.5,
          `${theme.key}/${mode} subtle header text should be readable`
        );
        assert.ok(
          contrastRatio(surface, tokens.headerTextAccent) >= 4.5,
          `${theme.key}/${mode} accent header text should be readable`
        );
      }
      for (const surface of contentSurfaces) {
        assert.ok(
          contrastRatio(surface, tokens.line) >= 3,
          `${theme.key}/${mode} content line should be visible on ${surface}`
        );
        assert.ok(
          contrastRatio(surface, tokens.controlBorder) >= 3,
          `${theme.key}/${mode} control border should be visible`
        );
        assert.ok(
          contrastRatio(surface, tokens.focusRing) >= 3,
          `${theme.key}/${mode} focus ring should be visible`
        );
      }
      for (const surface of [
        tokens.headerSurface,
        tokens.headerSurfaceAlt,
        tokens.headerControlSurface
      ]) {
        assert.ok(
          contrastRatio(surface, tokens.headerControlBorder) >= 3,
          `${theme.key}/${mode} header control border should be visible on ${surface}`
        );
      }

      const compositedStroke = compositeRgbaOverHex(
        tokens.heroDecorStroke,
        tokens.surfaceRaised
      );
      const strokeContrast = contrastRatio(
        compositedStroke,
        tokens.surfaceRaised
      );
      const fill = parseRgba(tokens.heroDecorFill);

      assert.ok(
        strokeContrast >= 3,
        `${theme.key}/${mode} hero stroke should be visible`
      );
      assert.ok(
        strokeContrast <= 3.5,
        `${theme.key}/${mode} hero stroke should be subtle`
      );
      assert.ok(
        fill.alpha <= 0.12,
        `${theme.key}/${mode} hero fill should stay soft`
      );
    }
  }
});
