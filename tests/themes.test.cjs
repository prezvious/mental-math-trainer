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
  'lavender-mist'
];

const NEW_THEME_COLORS = Object.freeze({
  'powder-blue-notebook': ['#B4D7EB', '#F2CDBF', '#E3F1F8', '#2B394D'],
  'sea-glass-ledger': ['#A7DAD8', '#F4CDB5', '#E8F3E9', '#263C3C'],
  'honeydew-harbor': ['#DDF1BC', '#B8E3DE', '#F3DDA9', '#294247'],
  'pistachio-tile': ['#D0E7B4', '#B7E1DC', '#F2C8B7', '#344036'],
  'matcha-sunrise': ['#C9E3A2', '#F5D3A3', '#F3EABF', '#33402E'],
  'rainwashed-clay': ['#BED2DC', '#D2DEC4', '#ECC2AF', '#323B45'],
  'blush-blueprint': ['#F3C4D0', '#C3DDEC', '#EAE3C2', '#343D49'],
  'peach-graphite': ['#F6C2B5', '#F4D7A8', '#D9EAD8', '#3A3632'],
  'cloudberry-mint': ['#F4C0B4', '#C7EBD7', '#F6E6BC', '#2E3D38'],
  'citrus-draft': ['#F4E6A6', '#C4E2C5', '#F4C0AE', '#3B3A30']
});

const HEX_PATTERN = /^#[0-9A-F]{6}$/;
const RGBA_PATTERN = /^rgba\((\d+), (\d+), (\d+), (0(?:\.\d+)?|1(?:\.0+)?)\)$/;

let DEFAULT_THEME_KEY;
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
    Math.round(Math.max(0, Math.min(255, channel))).toString(16).padStart(2, '0').toUpperCase();

  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function mixHex(hexA, hexB, ratio) {
  const rgbA = hexToRgb(hexA);
  const rgbB = hexToRgb(hexB);

  return rgbToHex({
    r: rgbA.r + (rgbB.r - rgbA.r) * ratio,
    g: rgbA.g + (rgbB.g - rgbA.g) * ratio,
    b: rgbA.b + (rgbB.b - rgbA.b) * ratio
  });
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

function estimateHeroSurface(tokens) {
  const panelSurface = mixHex(tokens.paperStrong, '#FFFFFF', 0.14);
  const panelHighlight = mixHex(panelSurface, '#FFFFFF', 0.5);

  return mixHex(panelHighlight, '#FFFFFF', 0.34);
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

  ({ DEFAULT_THEME_KEY, THEME_OPTIONS, resolveThemeKey } = themes);
});

test('theme catalog keeps carbon-paper as default and follows the approved mood order', () => {
  assert.equal(DEFAULT_THEME_KEY, 'carbon-paper');
  assert.deepEqual(
    THEME_OPTIONS.map((theme) => theme.key),
    APPROVED_THEME_ORDER
  );
});

test('theme catalog includes exactly 10 new palette-only theme packs', () => {
  assert.equal(THEME_OPTIONS.length, 19);

  const keys = THEME_OPTIONS.map((theme) => theme.key);
  assert.equal(new Set(keys).size, keys.length);

  for (const [key, expectedColors] of Object.entries(NEW_THEME_COLORS)) {
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
    assert.equal(theme.colors.length, 4, `${theme.key} should expose four swatches`);

    for (const color of theme.colors) {
      assert.match(color, HEX_PATTERN, `${theme.key} color ${color} should be normalized`);
    }
  }
});

test('new generated theme tokens meet minimum text contrast', () => {
  for (const key of Object.keys(NEW_THEME_COLORS)) {
    const theme = THEME_OPTIONS.find((option) => option.key === key);
    const { accentMain, buttonQuietText, buttonStrongText, paper, paperStrong, textMain } =
      theme.tokens;

    assert.ok(
      contrastRatio(paper, textMain) >= 4.5,
      `${key} textMain should contrast with paper`
    );
    assert.ok(
      contrastRatio(accentMain, buttonStrongText) >= 4.5,
      `${key} buttonStrongText should contrast with accentMain`
    );
    assert.ok(
      contrastRatio(paperStrong, buttonQuietText) >= 4.5,
      `${key} buttonQuietText should contrast with paperStrong`
    );
  }
});

test('all themes expose a visible but subtle hero decoration stroke', () => {
  for (const theme of THEME_OPTIONS) {
    const { heroDecorFill, heroDecorStroke } = theme.tokens;
    const heroSurface = estimateHeroSurface(theme.tokens);
    const compositedStroke = compositeRgbaOverHex(heroDecorStroke, heroSurface);
    const strokeContrast = contrastRatio(compositedStroke, heroSurface);
    const fill = parseRgba(heroDecorFill);

    assert.ok(heroDecorStroke, `${theme.key} should expose heroDecorStroke`);
    assert.ok(heroDecorFill, `${theme.key} should expose heroDecorFill`);
    assert.ok(strokeContrast >= 3, `${theme.key} hero decoration stroke should be visible`);
    assert.ok(strokeContrast <= 3.5, `${theme.key} hero decoration stroke should stay subtle`);
    assert.ok(fill.alpha <= 0.12, `${theme.key} hero decoration fill should stay soft`);
  }
});
