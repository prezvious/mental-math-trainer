const RAW_THEMES = [
  {
    key: 'carbon-paper',
    name: 'Carbon Paper',
    vibe: 'Monochrome discipline with editorial calm and stark focus.',
    colors: ['#111111', '#5F5F5F', '#D8D8D8', '#F7F7F7']
  },
  {
    key: 'powder-blue-notebook',
    name: 'Powder Blue Notebook',
    vibe: 'Soft study calm with tidy sky-blue clarity.',
    colors: ['#B4D7EB', '#F2CDBF', '#E3F1F8', '#2B394D']
  },
  {
    key: 'sea-glass-ledger',
    name: 'Sea Glass Ledger',
    vibe: 'Coastal arithmetic calm with polished glass softness.',
    colors: ['#A7DAD8', '#F4CDB5', '#E8F3E9', '#263C3C']
  },
  {
    key: 'honeydew-harbor',
    name: 'Honeydew Harbor',
    vibe: 'Fresh harbor light with mellow green precision.',
    colors: ['#DDF1BC', '#B8E3DE', '#F3DDA9', '#294247']
  },
  {
    key: 'apothecary-glass',
    name: 'Apothecary Glass',
    vibe: 'Laboratory elegance that feels calm and intelligent.',
    colors: ['#7FAE9B', '#A86B39', '#EFE7DA', '#34373C']
  },
  {
    key: 'sage-whisk',
    name: 'Sage Whisk',
    vibe: 'Fresh garden clarity with herbal poise.',
    colors: ['#84C370', '#BFE1B2', '#E4F4DE', '#1C271B']
  },
  {
    key: 'pistachio-tile',
    name: 'Pistachio Tile',
    vibe: 'Glazed green calm with soft geometric order.',
    colors: ['#D0E7B4', '#B7E1DC', '#F2C8B7', '#344036']
  },
  {
    key: 'matcha-sunrise',
    name: 'Matcha Sunrise',
    vibe: 'Gentle morning focus with creamy matcha warmth.',
    colors: ['#C9E3A2', '#F5D3A3', '#F3EABF', '#33402E']
  },
  {
    key: 'rainwashed-clay',
    name: 'Rainwashed Clay',
    vibe: 'Quiet after-rain balance with softened earthen color.',
    colors: ['#BED2DC', '#D2DEC4', '#ECC2AF', '#323B45']
  },
  {
    key: 'blush-blueprint',
    name: 'Blush Blueprint',
    vibe: 'Drafting-table poise with gentle blush contrast.',
    colors: ['#F3C4D0', '#C3DDEC', '#EAE3C2', '#343D49']
  },
  {
    key: 'peach-graphite',
    name: 'Peach Graphite',
    vibe: 'Warm pastel focus grounded by graphite structure.',
    colors: ['#F6C2B5', '#F4D7A8', '#D9EAD8', '#3A3632']
  },
  {
    key: 'cloudberry-mint',
    name: 'Cloudberry Mint',
    vibe: 'Bright orchard softness with cool mint balance.',
    colors: ['#F4C0B4', '#C7EBD7', '#F6E6BC', '#2E3D38']
  },
  {
    key: 'citrus-draft',
    name: 'Citrus Draft',
    vibe: 'Light citrus energy with measured studio restraint.',
    colors: ['#F4E6A6', '#C4E2C5', '#F4C0AE', '#3B3A30']
  },
  {
    key: 'ink-and-apricot',
    name: 'Ink and Apricot',
    vibe: 'Warm studio calm with editorial clarity.',
    colors: ['#1E2533', '#F4B183', '#E7D5C5', '#6B4D45']
  },
  {
    key: 'paper-lantern',
    name: 'Paper Lantern',
    vibe: 'Editorial warmth with crafted literary calm.',
    colors: ['#E86A33', '#F4E9D8', '#24212C', '#8A2E4F']
  },
  {
    key: 'signal-peach',
    name: 'Signal Peach',
    vibe: 'Optimistic warmth with a precise digital pulse.',
    colors: ['#FFAF87', '#355CDE', '#F2EFEA', '#A5553A']
  },
  {
    key: 'taxi-noir',
    name: 'Taxi Noir',
    vibe: 'Urban urgency with direct, high-contrast discipline.',
    colors: ['#F2C230', '#1C1B20', '#F9F7F2', '#D94841']
  },
  {
    key: 'velvet-circuit',
    name: 'Velvet Circuit',
    vibe: 'Nocturnal command-center contrast with premium focus.',
    colors: ['#5B2E6D', '#B96A4B', '#D7F1E3', '#17131E']
  },
  {
    key: 'lavender-mist',
    name: 'Lavender Mist',
    vibe: 'Twilight study hush with soft lavender glow.',
    colors: ['#8E89CD', '#C2B9E9', '#E7E0F7', '#1C1A2E']
  }
];

export const LEGACY_THEME_ALIASES = Object.freeze({
  'acid-lemon-lobby': 'taxi-noir',
  'vinyl-after-rain': 'velvet-circuit',
  'chrome-blossom': 'signal-peach',
  'porcelain-rebel': 'paper-lantern',
  'cobalt-typewriter': 'ink-and-apricot',
  'rosewater-asphalt': 'paper-lantern',
  'carbon-taffy': 'signal-peach',
  'cherry-receipt': 'signal-peach',
  'lilac-concrete': 'lavender-mist',
  'mercury-carnival': 'signal-peach',
  'studio-vermouth': 'ink-and-apricot',
  'pixel-bazaar': 'taxi-noir',
  'marble-disco': 'velvet-circuit',
  'saffron-static': 'taxi-noir',
  'cotton-candy-dawn': 'paper-lantern',
  'honey-milk': 'ink-and-apricot',
  'aqua-whisper': 'sage-whisk'
});

const SHARED_LAYOUT = Object.freeze({
  headerColumns: 'auto minmax(0, 1fr) auto',
  brandOrder: 1,
  navOrder: 2,
  actionsOrder: 3,
  brandAlign: 'start',
  navAlign: 'center',
  actionsAlign: 'end',
  mainMax: '1200px',
  mainGap: '1.2rem',
  mainTop: '1rem',
  mainBottom: '2.8rem',
  trainerColumns: 'minmax(21rem, 25rem) minmax(0, 1fr)',
  guestColumns: 'minmax(0, 1fr) minmax(0, 1fr) minmax(0, 1fr)',
  summaryColumns: 'repeat(4, minmax(0, 1fr))',
  operationColumns: 'repeat(4, minmax(0, 1fr))',
  panelRadius: '24px',
  panelBorderWidth: '1px',
  cardTilt: '0deg',
  cardLift: '6px',
  heroSize: '0px',
  heroRotate: '0deg',
  heroOffsetX: '0px',
  heroOffsetY: '0px',
  heroAccentWidth: '0px',
  heroAccentHeight: '0px',
  heroAccentRotate: '0deg',
  heroAccentX: '0px',
  heroAccentY: '0px',
  bgAngle: '160deg',
  bgStop: '74%',
  animationDuration: '0.42s'
});

const HEX_PATTERN = /^#?[0-9a-f]{6}$/i;

function normalizeHex(hex) {
  if (typeof hex !== 'string') {
    throw new Error(`Expected a hex string, received ${typeof hex}.`);
  }

  const trimmed = hex.trim();
  if (!HEX_PATTERN.test(trimmed)) {
    throw new Error(`Invalid hex color: ${hex}`);
  }

  return trimmed.startsWith('#') ? trimmed.toUpperCase() : `#${trimmed.toUpperCase()}`;
}

function clampChannel(value) {
  return Math.min(255, Math.max(0, Math.round(value)));
}

function hexToRgb(hex) {
  const normalized = normalizeHex(hex);
  const body = normalized.slice(1);
  return {
    r: Number.parseInt(body.slice(0, 2), 16),
    g: Number.parseInt(body.slice(2, 4), 16),
    b: Number.parseInt(body.slice(4, 6), 16)
  };
}

function rgbToHex(red, green, blue) {
  const toHex = (value) => clampChannel(value).toString(16).padStart(2, '0').toUpperCase();
  return `#${toHex(red)}${toHex(green)}${toHex(blue)}`;
}

function mix(hexA, hexB, ratio = 0.5) {
  const weight = Math.min(1, Math.max(0, ratio));
  const rgbA = hexToRgb(hexA);
  const rgbB = hexToRgb(hexB);

  return rgbToHex(
    rgbA.r + (rgbB.r - rgbA.r) * weight,
    rgbA.g + (rgbB.g - rgbA.g) * weight,
    rgbA.b + (rgbB.b - rgbA.b) * weight
  );
}

function darken(hex, ratio = 0.2) {
  return mix(hex, '#000000', ratio);
}

function lighten(hex, ratio = 0.2) {
  return mix(hex, '#FFFFFF', ratio);
}

function toRgba(hex, alpha) {
  const rgb = hexToRgb(hex);
  const clampedAlpha = Math.min(1, Math.max(0, alpha));
  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${clampedAlpha.toFixed(3)})`;
}

function findAlphaForContrast(foregroundHex, backgroundHex, targetContrast) {
  for (let alpha = 0.24; alpha <= 0.86; alpha += 0.01) {
    const compositeHex = mix(backgroundHex, foregroundHex, alpha);

    if (contrastRatio(compositeHex, backgroundHex) >= targetContrast) {
      return alpha;
    }
  }

  return 0.86;
}

function srgbChannelToLinear(channel) {
  const srgb = channel / 255;
  if (srgb <= 0.04045) {
    return srgb / 12.92;
  }

  return ((srgb + 0.055) / 1.055) ** 2.4;
}

function relativeLuminance(hex) {
  const { r, g, b } = hexToRgb(hex);
  const red = srgbChannelToLinear(r);
  const green = srgbChannelToLinear(g);
  const blue = srgbChannelToLinear(b);

  return (0.2126 * red) + (0.7152 * green) + (0.0722 * blue);
}

function contrastRatio(hexA, hexB) {
  const lumA = relativeLuminance(hexA);
  const lumB = relativeLuminance(hexB);
  const lighter = Math.max(lumA, lumB);
  const darker = Math.min(lumA, lumB);

  return (lighter + 0.05) / (darker + 0.05);
}

function pickTextColor(backgroundHex, preferredDark, preferredLight = '#F8FAFC') {
  const dark = normalizeHex(preferredDark);
  const light = normalizeHex(preferredLight);
  const darkContrast = contrastRatio(backgroundHex, dark);
  const lightContrast = contrastRatio(backgroundHex, light);

  return darkContrast >= lightContrast ? dark : light;
}

function sortByLuminance(hexColors) {
  return [...hexColors].sort(
    (colorA, colorB) => relativeLuminance(colorA) - relativeLuminance(colorB)
  );
}

function estimateHeroDecorSurface(paperStrong) {
  const panelSurface = mix(paperStrong, '#FFFFFF', 0.14);
  const panelHighlight = mix(panelSurface, '#FFFFFF', 0.5);
  return mix(panelHighlight, '#FFFFFF', 0.34);
}

function buildTokenSet(hexColors) {
  const [accentMain, accentWarm, accentSoft] = hexColors;
  const [darkest, secondDark, secondLight, lightest] = sortByLuminance(hexColors);
  const ink900 = darken(darkest, 0.08);
  const ink700 = mix(darkest, secondDark, 0.56);
  const ink500 = mix(secondDark, lightest, 0.38);
  const paper = lighten(lightest, 0.05);
  const paperStrong = mix(lightest, secondLight, 0.35);
  const sand = mix(secondLight, secondDark, 0.22);
  const line = mix(ink900, accentMain, 0.55);
  const accentAlert = darken(accentWarm, 0.18);
  const textMain = pickTextColor(paper, darken(darkest, 0.12));
  const textSubtle = mix(textMain, paper, 0.45);
  const buttonStrongText = pickTextColor(accentMain, darken(darkest, 0.2), '#F8FAFC');
  const buttonQuietText = pickTextColor(paperStrong, darken(darkest, 0.18), '#F8FAFC');
  const heroDecorBase = mix(line, ink900, 0.58);
  const heroDecorSurface = estimateHeroDecorSurface(paperStrong);
  const heroDecorStrokeAlpha = findAlphaForContrast(heroDecorBase, heroDecorSurface, 3.1);

  return {
    ink900,
    ink700,
    ink500,
    paper,
    paperStrong,
    sand,
    accentMain,
    accentWarm,
    accentSoft,
    accentAlert,
    textMain,
    textSubtle,
    line,
    buttonStrongText,
    buttonQuietText,
    heroDecorStroke: toRgba(heroDecorBase, heroDecorStrokeAlpha),
    heroDecorFill: toRgba(accentMain, 0.1),
    glowMain: toRgba(accentMain, 0.18),
    glowWarm: toRgba(accentWarm, 0.18),
    glowSoft: toRgba(accentSoft, 0.18),
    glowLine: toRgba(line, 0.2)
  };
}

export const THEME_OPTIONS = RAW_THEMES.map((theme) => {
  const normalizedColors = theme.colors.map(normalizeHex);

  return {
    ...theme,
    colors: normalizedColors,
    tokens: buildTokenSet(normalizedColors),
    layout: SHARED_LAYOUT
  };
});

const THEME_OPTIONS_BY_KEY = new Map(THEME_OPTIONS.map((theme) => [theme.key, theme]));
export const DEFAULT_THEME_KEY = THEME_OPTIONS[0].key;

export function getThemeOptionLabel(theme) {
  if (!theme || typeof theme !== 'object') {
    return '';
  }

  const resolvedTheme = THEME_OPTIONS_BY_KEY.get(theme.key) || theme;
  return resolvedTheme.key === DEFAULT_THEME_KEY
    ? `${resolvedTheme.name} (Default)`
    : resolvedTheme.name;
}

export function resolveThemeKey(themeKey) {
  if (typeof themeKey !== 'string') {
    return DEFAULT_THEME_KEY;
  }

  const normalizedKey = themeKey.trim();
  if (!normalizedKey) {
    return DEFAULT_THEME_KEY;
  }

  const aliasedKey = LEGACY_THEME_ALIASES[normalizedKey] || normalizedKey;
  return THEME_OPTIONS_BY_KEY.has(aliasedKey) ? aliasedKey : DEFAULT_THEME_KEY;
}

export function getThemeByKey(themeKey) {
  return THEME_OPTIONS_BY_KEY.get(resolveThemeKey(themeKey)) || THEME_OPTIONS[0];
}
