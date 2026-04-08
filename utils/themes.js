const RAW_THEMES = [
  {
    key: 'velvet-circuit',
    name: 'Velvet Circuit',
    vibe: 'Sensual futurism with premium nighttime precision.',
    colors: ['#5B2E6D', '#B96A4B', '#D7F1E3', '#17131E']
  },
  {
    key: 'paper-lantern',
    name: 'Paper Lantern',
    vibe: 'Editorial warmth with crafted literary calm.',
    colors: ['#E86A33', '#F4E9D8', '#24212C', '#8A2E4F']
  },
  {
    key: 'acid-lemon-lobby',
    name: 'Acid Lemon Lobby',
    vibe: 'Offbeat trend energy with irreverent confidence.',
    colors: ['#D7F21E', '#B8A7D9', '#C8BFB6', '#4B3A33']
  },
  {
    key: 'apothecary-glass',
    name: 'Apothecary Glass',
    vibe: 'Laboratory elegance that feels calm and intelligent.',
    colors: ['#7FAE9B', '#A86B39', '#EFE7DA', '#34373C']
  },
  {
    key: 'vinyl-after-rain',
    name: 'Vinyl After Rain',
    vibe: 'Moody urban nostalgia with cinematic tone.',
    colors: ['#1F4958', '#6F5B7A', '#A6A9AE', '#FF6B6B']
  },
  {
    key: 'chrome-blossom',
    name: 'Chrome Blossom',
    vibe: 'Polished glamor and cosmetic futurism.',
    colors: ['#BFC7D5', '#D96AC8', '#4A274F', '#F7F5FA']
  },
  {
    key: 'taxi-noir',
    name: 'Taxi Noir',
    vibe: 'Urban urgency that stays direct and bold.',
    colors: ['#F2C230', '#1C1B20', '#F9F7F2', '#D94841']
  },
  {
    key: 'porcelain-rebel',
    name: 'Porcelain Rebel',
    vibe: 'Heritage luxury with a sharp edge.',
    colors: ['#F3EEE8', '#A61E3B', '#7E9D8A', '#2B2628']
  },
  {
    key: 'signal-peach',
    name: 'Signal Peach',
    vibe: 'Optimistic warmth with a clear digital pulse.',
    colors: ['#FFAF87', '#355CDE', '#F2EFEA', '#A5553A']
  },
  {
    key: 'cobalt-typewriter',
    name: 'Cobalt Typewriter',
    vibe: 'Archival authority with strong readability.',
    colors: ['#2E4C9B', '#E8DCC7', '#7B3F67', '#7E8791']
  },
  {
    key: 'rosewater-asphalt',
    name: 'Rosewater Asphalt',
    vibe: 'Soft emotion layered over urban structure.',
    colors: ['#F2D3DA', '#31343A', '#C6D645', '#C69179']
  },
  {
    key: 'carbon-taffy',
    name: 'Carbon Taffy',
    vibe: 'Playful product energy with technical trust.',
    colors: ['#2A2D34', '#F48FB1', '#A6D9F7', '#FFF4E8']
  },
  {
    key: 'cherry-receipt',
    name: 'Cherry Receipt',
    vibe: 'Transactional pop optimized for conversion.',
    colors: ['#C7334F', '#FFF8EF', '#485260', '#92D5C2']
  },
  {
    key: 'lilac-concrete',
    name: 'Lilac Concrete',
    vibe: 'Soft brutalism with architectural discipline.',
    colors: ['#B7B2B8', '#B59BE8', '#C9D7AF', '#2F3136']
  },
  {
    key: 'mercury-carnival',
    name: 'Mercury Carnival',
    vibe: 'Event-centric spectacle with polished motion.',
    colors: ['#C5C9D3', '#00A7A0', '#D95D39', '#202540']
  },
  {
    key: 'ink-and-apricot',
    name: 'Ink and Apricot',
    vibe: 'Warm studio calm with editorial clarity.',
    colors: ['#1E2533', '#F4B183', '#E7D5C5', '#6B4D45']
  },
  {
    key: 'studio-vermouth',
    name: 'Studio Vermouth',
    vibe: 'Gallery-lounge sophistication and social polish.',
    colors: ['#6E7C4B', '#F0C9C2', '#222124', '#F6F5F2']
  },
  {
    key: 'pixel-bazaar',
    name: 'Pixel Bazaar',
    vibe: 'Creator economy energy with commercial density.',
    colors: ['#D936A7', '#B89147', '#D9D2CC', '#2F5FBF']
  },
  {
    key: 'marble-disco',
    name: 'Marble Disco',
    vibe: 'Festive luxury and theatrical contrast.',
    colors: ['#F5F1EC', '#1FB6A6', '#7D284F', '#8E929A']
  },
  {
    key: 'saffron-static',
    name: 'Saffron Static',
    vibe: 'Campaign urgency with persuasive contrast.',
    colors: ['#F0A11E', '#5C3DD1', '#FBF7F0', '#252329']
  },
  {
    key: 'cotton-candy-dawn',
    name: 'Cotton Candy Dawn',
    vibe: 'Romantic dawn blush with dreamy editorial softness.',
    colors: ['#D894BE', '#EABBD9', '#F8E2F1', '#2B1A2A']
  },
  {
    key: 'honey-milk',
    name: 'Honey Milk',
    vibe: 'Warm cafe calm with patient workshop focus.',
    colors: ['#D8B389', '#EAD2B3', '#F8F0DE', '#241B12']
  },
  {
    key: 'sage-whisk',
    name: 'Sage Whisk',
    vibe: 'Fresh garden clarity with herbal, unhurried poise.',
    colors: ['#84C370', '#BFE1B2', '#E4F4DE', '#1C271B']
  },
  {
    key: 'lavender-mist',
    name: 'Lavender Mist',
    vibe: 'Twilight study hush with introspective lavender glow.',
    colors: ['#8E89CD', '#C2B9E9', '#E7E0F7', '#1C1A2E']
  },
  {
    key: 'aqua-whisper',
    name: 'Aqua Whisper',
    vibe: 'Spa-fresh serenity with clean, breathable flow.',
    colors: ['#89CDC6', '#B9E9E4', '#DEF7F3', '#112625']
  }
];

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

const LAYOUT_PROFILES = [
  // 0: Velvet Circuit — "Command Center"
  {
    headerColumns: '1fr auto auto', brandOrder: 1, navOrder: 2, actionsOrder: 3,
    brandAlign: 'start', navAlign: 'center', actionsAlign: 'end',
    mainMax: '1180px', mainGap: '1.05rem', mainTop: '1.15rem', mainBottom: '2.8rem',
    trainerColumns: 'minmax(270px, 340px) minmax(0, 1fr)',
    guestColumns: 'minmax(0, 1fr) minmax(0, 1fr) minmax(0, 1fr)',
    summaryColumns: 'minmax(0, 1fr) minmax(0, 1fr) minmax(0, 1fr) minmax(0, 1fr)',
    operationColumns: 'minmax(0, 1fr) minmax(0, 1fr) minmax(0, 1fr) minmax(0, 1fr)',
    panelRadius: '14px', panelBorderWidth: '2px', cardTilt: '-0.6deg', cardLift: '10px',
    heroSize: '200px', heroRotate: '18deg', heroOffsetX: '-50px', heroOffsetY: '-46px',
    heroAccentWidth: '140px', heroAccentHeight: '14px', heroAccentRotate: '-5deg',
    heroAccentX: '18px', heroAccentY: '16px',
    bgAngle: '158deg', bgStop: '72%', animationDuration: '0.48s'
  },
  // 1: Paper Lantern — "Vertical Scroll"
  {
    headerColumns: 'auto 1fr auto', brandOrder: 2, navOrder: 1, actionsOrder: 3,
    brandAlign: 'center', navAlign: 'start', actionsAlign: 'end',
    mainMax: '880px', mainGap: '1.3rem', mainTop: '1.5rem', mainBottom: '3.2rem',
    trainerColumns: '1fr',
    guestColumns: '1fr',
    summaryColumns: 'minmax(0, 1fr) minmax(0, 1fr)',
    operationColumns: 'minmax(0, 1fr) minmax(0, 1fr)',
    panelRadius: '22px', panelBorderWidth: '2px', cardTilt: '0deg', cardLift: '8px',
    heroSize: '150px', heroRotate: '-32deg', heroOffsetX: '-38px', heroOffsetY: '-36px',
    heroAccentWidth: '110px', heroAccentHeight: '10px', heroAccentRotate: '6deg',
    heroAccentX: '14px', heroAccentY: '22px',
    bgAngle: '176deg', bgStop: '68%', animationDuration: '0.56s'
  },
  // 2: Acid Lemon Lobby — "Magazine Spread"
  {
    headerColumns: '1fr auto 1fr', brandOrder: 1, navOrder: 2, actionsOrder: 3,
    brandAlign: 'start', navAlign: 'center', actionsAlign: 'end',
    mainMax: '1320px', mainGap: '1.15rem', mainTop: '1.1rem', mainBottom: '2.5rem',
    trainerColumns: 'minmax(0, 1.4fr) minmax(240px, 300px)',
    guestColumns: 'minmax(0, 1.2fr) minmax(0, 0.8fr)',
    summaryColumns: 'minmax(0, 1fr) minmax(0, 1fr) minmax(0, 1fr)',
    operationColumns: 'minmax(0, 1fr) minmax(0, 1fr) minmax(0, 1fr) minmax(0, 1fr)',
    panelRadius: '6px', panelBorderWidth: '3px', cardTilt: '1.8deg', cardLift: '20px',
    heroSize: '280px', heroRotate: '34deg', heroOffsetX: '-70px', heroOffsetY: '-60px',
    heroAccentWidth: '200px', heroAccentHeight: '18px', heroAccentRotate: '-12deg',
    heroAccentX: '22px', heroAccentY: '12px',
    bgAngle: '142deg', bgStop: '64%', animationDuration: '0.4s'
  },
  // 3: Apothecary Glass — "Lab Notebook"
  {
    headerColumns: '1fr auto 1fr', brandOrder: 1, navOrder: 3, actionsOrder: 2,
    brandAlign: 'start', navAlign: 'end', actionsAlign: 'center',
    mainMax: '960px', mainGap: '0.9rem', mainTop: '1rem', mainBottom: '2.4rem',
    trainerColumns: 'minmax(0, 1fr) minmax(0, 1fr)',
    guestColumns: 'minmax(0, 0.9fr) minmax(0, 1.2fr) minmax(0, 0.9fr)',
    summaryColumns: 'minmax(0, 1fr) minmax(0, 1fr)',
    operationColumns: 'minmax(0, 1fr) minmax(0, 1fr)',
    panelRadius: '10px', panelBorderWidth: '2px', cardTilt: '0deg', cardLift: '0px',
    heroSize: '130px', heroRotate: '-8deg', heroOffsetX: '-30px', heroOffsetY: '-28px',
    heroAccentWidth: '96px', heroAccentHeight: '8px', heroAccentRotate: '2deg',
    heroAccentX: '12px', heroAccentY: '18px',
    bgAngle: '180deg', bgStop: '78%', animationDuration: '0.42s'
  },
  // 4: Vinyl After Rain — "Cinema Widescreen"
  {
    headerColumns: 'minmax(210px, 1fr) auto minmax(250px, 1fr)', brandOrder: 2, navOrder: 3, actionsOrder: 1,
    brandAlign: 'center', navAlign: 'end', actionsAlign: 'start',
    mainMax: '1400px', mainGap: '1.25rem', mainTop: '0.9rem', mainBottom: '3.4rem',
    trainerColumns: 'minmax(0, 1.6fr) minmax(220px, 260px)',
    guestColumns: 'minmax(0, 1.3fr) minmax(0, 0.85fr) minmax(0, 0.85fr)',
    summaryColumns: 'minmax(0, 1.2fr) minmax(0, 0.8fr) minmax(0, 1.2fr) minmax(0, 0.8fr)',
    operationColumns: 'minmax(0, 1fr) minmax(0, 1fr) minmax(0, 1fr) minmax(0, 1fr)',
    panelRadius: '12px', panelBorderWidth: '3px', cardTilt: '-2deg', cardLift: '22px',
    heroSize: '260px', heroRotate: '38deg', heroOffsetX: '-68px', heroOffsetY: '-58px',
    heroAccentWidth: '180px', heroAccentHeight: '12px', heroAccentRotate: '14deg',
    heroAccentX: '28px', heroAccentY: '20px',
    bgAngle: '148deg', bgStop: '62%', animationDuration: '0.52s'
  },
  // 5: Chrome Blossom — "Compact Dashboard"
  {
    headerColumns: 'auto auto 1fr', brandOrder: 3, navOrder: 1, actionsOrder: 2,
    brandAlign: 'end', navAlign: 'start', actionsAlign: 'center',
    mainMax: '1020px', mainGap: '0.85rem', mainTop: '0.95rem', mainBottom: '2.2rem',
    trainerColumns: 'minmax(0, 1fr) minmax(230px, 280px)',
    guestColumns: 'minmax(0, 1fr) minmax(0, 1fr)',
    summaryColumns: 'minmax(0, 1fr) minmax(0, 1fr) minmax(0, 1fr) minmax(0, 1fr)',
    operationColumns: 'minmax(0, 1fr) minmax(0, 1fr) minmax(0, 1fr) minmax(0, 1fr)',
    panelRadius: '8px', panelBorderWidth: '2px', cardTilt: '0.3deg', cardLift: '6px',
    heroSize: '120px', heroRotate: '-14deg', heroOffsetX: '-26px', heroOffsetY: '-24px',
    heroAccentWidth: '88px', heroAccentHeight: '8px', heroAccentRotate: '-3deg',
    heroAccentX: '10px', heroAccentY: '10px',
    bgAngle: '165deg', bgStop: '76%', animationDuration: '0.36s'
  },
  // 6: Taxi Noir — "Bold Broadsheet"
  {
    headerColumns: 'auto 1fr auto', brandOrder: 2, navOrder: 1, actionsOrder: 3,
    brandAlign: 'center', navAlign: 'start', actionsAlign: 'end',
    mainMax: '1240px', mainGap: '1.1rem', mainTop: '1.2rem', mainBottom: '2.9rem',
    trainerColumns: 'minmax(260px, 330px) minmax(0, 1fr)',
    guestColumns: 'minmax(0, 1.15fr) minmax(0, 0.85fr) minmax(0, 1.15fr)',
    summaryColumns: 'minmax(0, 1fr) minmax(0, 1fr) minmax(0, 1fr) minmax(0, 1fr)',
    operationColumns: 'minmax(0, 1fr) minmax(0, 1fr) minmax(0, 1fr) minmax(0, 1fr)',
    panelRadius: '0px', panelBorderWidth: '4px', cardTilt: '0deg', cardLift: '14px',
    heroSize: '195px', heroRotate: '0deg', heroOffsetX: '-44px', heroOffsetY: '-42px',
    heroAccentWidth: '160px', heroAccentHeight: '20px', heroAccentRotate: '0deg',
    heroAccentX: '16px', heroAccentY: '14px',
    bgAngle: '180deg', bgStop: '70%', animationDuration: '0.38s'
  },
  // 7: Porcelain Rebel — "Split Screen"
  {
    headerColumns: 'auto auto 1fr', brandOrder: 3, navOrder: 1, actionsOrder: 2,
    brandAlign: 'end', navAlign: 'start', actionsAlign: 'center',
    mainMax: '1100px', mainGap: '1rem', mainTop: '1.08rem', mainBottom: '2.6rem',
    trainerColumns: 'minmax(0, 1fr) minmax(0, 1fr)',
    guestColumns: 'minmax(0, 1.1fr) minmax(0, 0.8fr) minmax(0, 1.1fr)',
    summaryColumns: 'minmax(0, 1.1fr) minmax(0, 0.9fr) minmax(0, 0.9fr) minmax(0, 1.1fr)',
    operationColumns: 'minmax(0, 1fr) minmax(0, 1fr) minmax(0, 1fr)',
    panelRadius: '18px', panelBorderWidth: '2px', cardTilt: '0.5deg', cardLift: '12px',
    heroSize: '175px', heroRotate: '-20deg', heroOffsetX: '-40px', heroOffsetY: '-38px',
    heroAccentWidth: '128px', heroAccentHeight: '12px', heroAccentRotate: '8deg',
    heroAccentX: '20px', heroAccentY: '24px',
    bgAngle: '155deg', bgStop: '74%', animationDuration: '0.46s'
  },
  // 8: Signal Peach — "Broadcast Dashboard"
  {
    headerColumns: '1fr auto auto', brandOrder: 1, navOrder: 3, actionsOrder: 2,
    brandAlign: 'start', navAlign: 'end', actionsAlign: 'center',
    mainMax: '1200px', mainGap: '1.08rem', mainTop: '1.08rem', mainBottom: '2.76rem',
    trainerColumns: 'minmax(0, 1.3fr) minmax(260px, 320px)',
    guestColumns: 'minmax(0, 1fr) minmax(0, 1fr) minmax(0, 1fr)',
    summaryColumns: 'minmax(0, 1fr) minmax(0, 1fr) minmax(0, 1fr) minmax(0, 1fr)',
    operationColumns: 'minmax(0, 1fr) minmax(0, 1fr) minmax(0, 1fr) minmax(0, 1fr)',
    panelRadius: '16px', panelBorderWidth: '2px', cardTilt: '0deg', cardLift: '12px',
    heroSize: '190px', heroRotate: '-12deg', heroOffsetX: '-42px', heroOffsetY: '-40px',
    heroAccentWidth: '164px', heroAccentHeight: '16px', heroAccentRotate: '-4deg',
    heroAccentX: '20px', heroAccentY: '16px',
    bgAngle: '146deg', bgStop: '70%', animationDuration: '0.44s'
  },
  // 9: Cobalt Typewriter — "Monograph Column"
  {
    headerColumns: 'auto 1fr auto', brandOrder: 1, navOrder: 2, actionsOrder: 3,
    brandAlign: 'start', navAlign: 'center', actionsAlign: 'end',
    mainMax: '820px', mainGap: '1.4rem', mainTop: '1.6rem', mainBottom: '3.5rem',
    trainerColumns: '1fr',
    guestColumns: '1fr',
    summaryColumns: '1fr',
    operationColumns: '1fr',
    panelRadius: '12px', panelBorderWidth: '3px', cardTilt: '0deg', cardLift: '0px',
    heroSize: '110px', heroRotate: '12deg', heroOffsetX: '-22px', heroOffsetY: '-20px',
    heroAccentWidth: '80px', heroAccentHeight: '6px', heroAccentRotate: '-2deg',
    heroAccentX: '16px', heroAccentY: '28px',
    bgAngle: '190deg', bgStop: '82%', animationDuration: '0.54s'
  },
  // 10: Rosewater Asphalt — "Urban Grid"
  {
    headerColumns: '1fr auto 1fr', brandOrder: 1, navOrder: 2, actionsOrder: 3,
    brandAlign: 'start', navAlign: 'center', actionsAlign: 'end',
    mainMax: '1140px', mainGap: '0.95rem', mainTop: '1.05rem', mainBottom: '2.5rem',
    trainerColumns: 'minmax(250px, 310px) minmax(0, 1fr)',
    guestColumns: 'minmax(0, 0.85fr) minmax(0, 1.3fr) minmax(0, 0.85fr)',
    summaryColumns: 'minmax(0, 1fr) minmax(0, 1fr) minmax(0, 1fr)',
    operationColumns: 'minmax(0, 1fr) minmax(0, 1fr) minmax(0, 1fr) minmax(0, 1fr)',
    panelRadius: '4px', panelBorderWidth: '2px', cardTilt: '-0.4deg', cardLift: '8px',
    heroSize: '170px', heroRotate: '26deg', heroOffsetX: '-46px', heroOffsetY: '-44px',
    heroAccentWidth: '135px', heroAccentHeight: '14px', heroAccentRotate: '-6deg',
    heroAccentX: '14px', heroAccentY: '14px',
    bgAngle: '162deg', bgStop: '70%', animationDuration: '0.42s'
  },
  // 11: Carbon Taffy — "Playful Offset"
  {
    headerColumns: 'auto 1fr auto', brandOrder: 2, navOrder: 3, actionsOrder: 1,
    brandAlign: 'center', navAlign: 'end', actionsAlign: 'start',
    mainMax: '1080px', mainGap: '1.2rem', mainTop: '1.3rem', mainBottom: '3rem',
    trainerColumns: 'minmax(0, 1fr) minmax(260px, 320px)',
    guestColumns: 'minmax(0, 1fr) minmax(0, 1fr) minmax(0, 1fr)',
    summaryColumns: 'minmax(0, 1fr) minmax(0, 1fr)',
    operationColumns: 'minmax(0, 1fr) minmax(0, 1fr)',
    panelRadius: '26px', panelBorderWidth: '3px', cardTilt: '2.2deg', cardLift: '24px',
    heroSize: '220px', heroRotate: '-28deg', heroOffsetX: '-56px', heroOffsetY: '-52px',
    heroAccentWidth: '155px', heroAccentHeight: '16px', heroAccentRotate: '10deg',
    heroAccentX: '24px', heroAccentY: '18px',
    bgAngle: '140deg', bgStop: '66%', animationDuration: '0.6s'
  },
  // 12: Cherry Receipt — "Receipt Tape"
  {
    headerColumns: 'auto 1fr auto', brandOrder: 2, navOrder: 1, actionsOrder: 3,
    brandAlign: 'center', navAlign: 'start', actionsAlign: 'end',
    mainMax: '760px', mainGap: '0.8rem', mainTop: '0.85rem', mainBottom: '2rem',
    trainerColumns: '1fr',
    guestColumns: '1fr',
    summaryColumns: 'minmax(0, 1fr) minmax(0, 1fr)',
    operationColumns: 'minmax(0, 1fr) minmax(0, 1fr)',
    panelRadius: '2px', panelBorderWidth: '2px', cardTilt: '0deg', cardLift: '4px',
    heroSize: '100px', heroRotate: '6deg', heroOffsetX: '-18px', heroOffsetY: '-16px',
    heroAccentWidth: '70px', heroAccentHeight: '6px', heroAccentRotate: '0deg',
    heroAccentX: '10px', heroAccentY: '12px',
    bgAngle: '180deg', bgStop: '86%', animationDuration: '0.34s'
  },
  // 13: Lilac Concrete — "Brutalist Block"
  {
    headerColumns: 'auto auto 1fr', brandOrder: 1, navOrder: 2, actionsOrder: 3,
    brandAlign: 'start', navAlign: 'start', actionsAlign: 'end',
    mainMax: '1300px', mainGap: '1.35rem', mainTop: '1.4rem', mainBottom: '3.2rem',
    trainerColumns: 'minmax(280px, 360px) minmax(0, 1fr)',
    guestColumns: 'minmax(0, 1fr) minmax(0, 1fr) minmax(0, 1fr)',
    summaryColumns: 'minmax(0, 1fr) minmax(0, 1fr) minmax(0, 1fr) minmax(0, 1fr)',
    operationColumns: 'minmax(0, 1fr) minmax(0, 1fr)',
    panelRadius: '0px', panelBorderWidth: '4px', cardTilt: '-1deg', cardLift: '16px',
    heroSize: '240px', heroRotate: '45deg', heroOffsetX: '-62px', heroOffsetY: '-56px',
    heroAccentWidth: '190px', heroAccentHeight: '22px', heroAccentRotate: '-15deg',
    heroAccentX: '20px', heroAccentY: '10px',
    bgAngle: '195deg', bgStop: '60%', animationDuration: '0.5s'
  },
  // 14: Mercury Carnival — "Circus Tent"
  {
    headerColumns: 'minmax(210px, 1fr) auto minmax(250px, 1fr)', brandOrder: 1, navOrder: 2, actionsOrder: 3,
    brandAlign: 'start', navAlign: 'center', actionsAlign: 'end',
    mainMax: '1260px', mainGap: '1.4rem', mainTop: '1.5rem', mainBottom: '3.6rem',
    trainerColumns: 'minmax(0, 1fr) minmax(270px, 340px)',
    guestColumns: 'minmax(0, 1.1fr) minmax(0, 0.8fr) minmax(0, 1.1fr)',
    summaryColumns: 'minmax(0, 1.15fr) minmax(0, 0.85fr) minmax(0, 0.85fr) minmax(0, 1.15fr)',
    operationColumns: 'minmax(0, 1fr) minmax(0, 1fr) minmax(0, 1fr) minmax(0, 1fr)',
    panelRadius: '28px', panelBorderWidth: '3px', cardTilt: '1.5deg', cardLift: '18px',
    heroSize: '270px', heroRotate: '-36deg', heroOffsetX: '-66px', heroOffsetY: '-62px',
    heroAccentWidth: '195px', heroAccentHeight: '14px', heroAccentRotate: '12deg',
    heroAccentX: '30px', heroAccentY: '26px',
    bgAngle: '138deg', bgStop: '62%', animationDuration: '0.64s'
  },
  // 15: Ink and Apricot — "Studio Desk"
  {
    headerColumns: '1fr auto auto', brandOrder: 1, navOrder: 2, actionsOrder: 3,
    brandAlign: 'start', navAlign: 'center', actionsAlign: 'end',
    mainMax: '1050px', mainGap: '1rem', mainTop: '1.12rem', mainBottom: '2.7rem',
    trainerColumns: 'minmax(0, 1fr) minmax(240px, 300px)',
    guestColumns: 'minmax(0, 1fr) minmax(0, 1fr) minmax(0, 1fr)',
    summaryColumns: 'minmax(0, 1fr) minmax(0, 1fr) minmax(0, 1fr) minmax(0, 1fr)',
    operationColumns: 'minmax(0, 1fr) minmax(0, 1fr) minmax(0, 1fr) minmax(0, 1fr)',
    panelRadius: '16px', panelBorderWidth: '2px', cardTilt: '-0.8deg', cardLift: '10px',
    heroSize: '160px', heroRotate: '15deg', heroOffsetX: '-36px', heroOffsetY: '-34px',
    heroAccentWidth: '120px', heroAccentHeight: '12px', heroAccentRotate: '-7deg',
    heroAccentX: '16px', heroAccentY: '20px',
    bgAngle: '170deg', bgStop: '75%', animationDuration: '0.45s'
  },
  // 16: Studio Vermouth — "Gallery Salon"
  {
    headerColumns: 'minmax(220px, 1fr) auto minmax(280px, 1fr)', brandOrder: 2, navOrder: 1, actionsOrder: 3,
    brandAlign: 'center', navAlign: 'start', actionsAlign: 'end',
    mainMax: '1360px', mainGap: '1.2rem', mainTop: '1.32rem', mainBottom: '3rem',
    trainerColumns: 'minmax(0, 1.18fr) minmax(300px, 370px)',
    guestColumns: 'minmax(0, 1.35fr) minmax(0, 0.85fr) minmax(0, 1fr)',
    summaryColumns: 'minmax(0, 1.35fr) minmax(0, 0.9fr) minmax(0, 1fr) minmax(0, 0.95fr)',
    operationColumns: 'minmax(0, 1.2fr) minmax(0, 1fr) minmax(0, 0.95fr) minmax(0, 1.15fr)',
    panelRadius: '22px', panelBorderWidth: '2px', cardTilt: '-1.4deg', cardLift: '18px',
    heroSize: '240px', heroRotate: '-18deg', heroOffsetX: '-52px', heroOffsetY: '-48px',
    heroAccentWidth: '188px', heroAccentHeight: '14px', heroAccentRotate: '-8deg',
    heroAccentX: '18px', heroAccentY: '20px',
    bgAngle: '168deg', bgStop: '66%', animationDuration: '0.58s'
  },
  // 17: Pixel Bazaar — "Marketplace Grid"
  {
    headerColumns: 'auto 1fr auto', brandOrder: 1, navOrder: 2, actionsOrder: 3,
    brandAlign: 'start', navAlign: 'center', actionsAlign: 'end',
    mainMax: '1350px', mainGap: '0.75rem', mainTop: '0.8rem', mainBottom: '2rem',
    trainerColumns: 'minmax(245px, 310px) minmax(0, 1fr)',
    guestColumns: 'minmax(0, 1fr) minmax(0, 1fr) minmax(0, 1fr)',
    summaryColumns: 'minmax(0, 1fr) minmax(0, 1fr) minmax(0, 1fr) minmax(0, 1fr)',
    operationColumns: 'minmax(0, 1fr) minmax(0, 1fr) minmax(0, 1fr) minmax(0, 1fr)',
    panelRadius: '6px', panelBorderWidth: '2px', cardTilt: '-0.3deg', cardLift: '8px',
    heroSize: '145px', heroRotate: '22deg', heroOffsetX: '-32px', heroOffsetY: '-30px',
    heroAccentWidth: '105px', heroAccentHeight: '10px', heroAccentRotate: '-4deg',
    heroAccentX: '12px', heroAccentY: '10px',
    bgAngle: '152deg', bgStop: '68%', animationDuration: '0.36s'
  },
  // 18: Marble Disco — "Theater Stage"
  {
    headerColumns: 'auto minmax(0, 1fr) auto', brandOrder: 2, navOrder: 3, actionsOrder: 1,
    brandAlign: 'center', navAlign: 'end', actionsAlign: 'start',
    mainMax: '1280px', mainGap: '1.22rem', mainTop: '1.18rem', mainBottom: '3.08rem',
    trainerColumns: 'minmax(255px, 330px) minmax(0, 1.35fr)',
    guestColumns: 'minmax(0, 0.9fr) minmax(0, 1.25fr) minmax(0, 0.85fr)',
    summaryColumns: 'minmax(0, 0.85fr) minmax(0, 1.3fr) minmax(0, 0.85fr) minmax(0, 1.3fr)',
    operationColumns: 'minmax(0, 1.05fr) minmax(0, 0.95fr) minmax(0, 1.2fr) minmax(0, 0.9fr)',
    panelRadius: '30px', panelBorderWidth: '3px', cardTilt: '0.9deg', cardLift: '16px',
    heroSize: '268px', heroRotate: '22deg', heroOffsetX: '-58px', heroOffsetY: '-64px',
    heroAccentWidth: '202px', heroAccentHeight: '12px', heroAccentRotate: '11deg',
    heroAccentX: '26px', heroAccentY: '24px',
    bgAngle: '152deg', bgStop: '64%', animationDuration: '0.62s'
  },
  // 19: Saffron Static — "Campaign Banner"
  {
    headerColumns: '1fr auto 1fr', brandOrder: 2, navOrder: 1, actionsOrder: 3,
    brandAlign: 'center', navAlign: 'start', actionsAlign: 'end',
    mainMax: '1220px', mainGap: '1.15rem', mainTop: '1.2rem', mainBottom: '2.85rem',
    trainerColumns: 'minmax(0, 1.5fr) minmax(250px, 310px)',
    guestColumns: 'minmax(0, 1fr) minmax(0, 1fr)',
    summaryColumns: 'minmax(0, 1fr) minmax(0, 1fr) minmax(0, 1fr) minmax(0, 1fr)',
    operationColumns: 'minmax(0, 1fr) minmax(0, 1fr) minmax(0, 1fr) minmax(0, 1fr)',
    panelRadius: '10px', panelBorderWidth: '3px', cardTilt: '-1.2deg', cardLift: '14px',
    heroSize: '230px', heroRotate: '-30deg', heroOffsetX: '-54px', heroOffsetY: '-50px',
    heroAccentWidth: '175px', heroAccentHeight: '18px', heroAccentRotate: '9deg',
    heroAccentX: '22px', heroAccentY: '14px',
    bgAngle: '145deg', bgStop: '65%', animationDuration: '0.4s'
  },
  // 20: Cotton Candy Dawn — borrows Paper Lantern "Vertical Scroll"
  {
    headerColumns: 'auto 1fr auto', brandOrder: 2, navOrder: 1, actionsOrder: 3,
    brandAlign: 'center', navAlign: 'start', actionsAlign: 'end',
    mainMax: '880px', mainGap: '1.3rem', mainTop: '1.5rem', mainBottom: '3.2rem',
    trainerColumns: '1fr',
    guestColumns: '1fr',
    summaryColumns: 'minmax(0, 1fr) minmax(0, 1fr)',
    operationColumns: 'minmax(0, 1fr) minmax(0, 1fr)',
    panelRadius: '22px', panelBorderWidth: '2px', cardTilt: '0deg', cardLift: '8px',
    heroSize: '150px', heroRotate: '-32deg', heroOffsetX: '-38px', heroOffsetY: '-36px',
    heroAccentWidth: '110px', heroAccentHeight: '10px', heroAccentRotate: '6deg',
    heroAccentX: '14px', heroAccentY: '22px',
    bgAngle: '176deg', bgStop: '68%', animationDuration: '0.56s'
  },
  // 21: Honey Milk — borrows Ink and Apricot "Studio Desk"
  {
    headerColumns: '1fr auto auto', brandOrder: 1, navOrder: 2, actionsOrder: 3,
    brandAlign: 'start', navAlign: 'center', actionsAlign: 'end',
    mainMax: '1050px', mainGap: '1rem', mainTop: '1.12rem', mainBottom: '2.7rem',
    trainerColumns: 'minmax(0, 1fr) minmax(240px, 300px)',
    guestColumns: 'minmax(0, 1fr) minmax(0, 1fr) minmax(0, 1fr)',
    summaryColumns: 'minmax(0, 1fr) minmax(0, 1fr) minmax(0, 1fr) minmax(0, 1fr)',
    operationColumns: 'minmax(0, 1fr) minmax(0, 1fr) minmax(0, 1fr) minmax(0, 1fr)',
    panelRadius: '16px', panelBorderWidth: '2px', cardTilt: '-0.8deg', cardLift: '10px',
    heroSize: '160px', heroRotate: '15deg', heroOffsetX: '-36px', heroOffsetY: '-34px',
    heroAccentWidth: '120px', heroAccentHeight: '12px', heroAccentRotate: '-7deg',
    heroAccentX: '16px', heroAccentY: '20px',
    bgAngle: '170deg', bgStop: '75%', animationDuration: '0.45s'
  },
  // 22: Sage Whisk — borrows Apothecary Glass "Lab Notebook"
  {
    headerColumns: '1fr auto 1fr', brandOrder: 1, navOrder: 3, actionsOrder: 2,
    brandAlign: 'start', navAlign: 'end', actionsAlign: 'center',
    mainMax: '960px', mainGap: '0.9rem', mainTop: '1rem', mainBottom: '2.4rem',
    trainerColumns: 'minmax(0, 1fr) minmax(0, 1fr)',
    guestColumns: 'minmax(0, 0.9fr) minmax(0, 1.2fr) minmax(0, 0.9fr)',
    summaryColumns: 'minmax(0, 1fr) minmax(0, 1fr)',
    operationColumns: 'minmax(0, 1fr) minmax(0, 1fr)',
    panelRadius: '10px', panelBorderWidth: '2px', cardTilt: '0deg', cardLift: '0px',
    heroSize: '130px', heroRotate: '-8deg', heroOffsetX: '-30px', heroOffsetY: '-28px',
    heroAccentWidth: '96px', heroAccentHeight: '8px', heroAccentRotate: '2deg',
    heroAccentX: '12px', heroAccentY: '18px',
    bgAngle: '180deg', bgStop: '78%', animationDuration: '0.42s'
  },
  // 23: Lavender Mist — borrows Velvet Circuit "Command Center"
  {
    headerColumns: '1fr auto auto', brandOrder: 1, navOrder: 2, actionsOrder: 3,
    brandAlign: 'start', navAlign: 'center', actionsAlign: 'end',
    mainMax: '1180px', mainGap: '1.05rem', mainTop: '1.15rem', mainBottom: '2.8rem',
    trainerColumns: 'minmax(270px, 340px) minmax(0, 1fr)',
    guestColumns: 'minmax(0, 1fr) minmax(0, 1fr) minmax(0, 1fr)',
    summaryColumns: 'minmax(0, 1fr) minmax(0, 1fr) minmax(0, 1fr) minmax(0, 1fr)',
    operationColumns: 'minmax(0, 1fr) minmax(0, 1fr) minmax(0, 1fr) minmax(0, 1fr)',
    panelRadius: '14px', panelBorderWidth: '2px', cardTilt: '-0.6deg', cardLift: '10px',
    heroSize: '200px', heroRotate: '18deg', heroOffsetX: '-50px', heroOffsetY: '-46px',
    heroAccentWidth: '140px', heroAccentHeight: '14px', heroAccentRotate: '-5deg',
    heroAccentX: '18px', heroAccentY: '16px',
    bgAngle: '158deg', bgStop: '72%', animationDuration: '0.48s'
  },
  // 24: Aqua Whisper — borrows Porcelain Rebel "Split Screen"
  {
    headerColumns: 'auto auto 1fr', brandOrder: 3, navOrder: 1, actionsOrder: 2,
    brandAlign: 'end', navAlign: 'start', actionsAlign: 'center',
    mainMax: '1100px', mainGap: '1rem', mainTop: '1.08rem', mainBottom: '2.6rem',
    trainerColumns: 'minmax(0, 1fr) minmax(0, 1fr)',
    guestColumns: 'minmax(0, 1.1fr) minmax(0, 0.8fr) minmax(0, 1.1fr)',
    summaryColumns: 'minmax(0, 1.1fr) minmax(0, 0.9fr) minmax(0, 0.9fr) minmax(0, 1.1fr)',
    operationColumns: 'minmax(0, 1fr) minmax(0, 1fr) minmax(0, 1fr)',
    panelRadius: '18px', panelBorderWidth: '2px', cardTilt: '0.5deg', cardLift: '12px',
    heroSize: '175px', heroRotate: '-20deg', heroOffsetX: '-40px', heroOffsetY: '-38px',
    heroAccentWidth: '128px', heroAccentHeight: '12px', heroAccentRotate: '8deg',
    heroAccentX: '20px', heroAccentY: '24px',
    bgAngle: '155deg', bgStop: '74%', animationDuration: '0.46s'
  }
];

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
    glowMain: toRgba(accentMain, 0.2),
    glowWarm: toRgba(accentWarm, 0.19),
    glowSoft: toRgba(accentSoft, 0.2),
    glowLine: toRgba(line, 0.28)
  };
}

export const THEME_OPTIONS = RAW_THEMES.map((theme, index) => {
  const normalizedColors = theme.colors.map(normalizeHex);
  return {
    ...theme,
    colors: normalizedColors,
    tokens: buildTokenSet(normalizedColors),
    layout: LAYOUT_PROFILES[index]
  };
});

export const DEFAULT_THEME_KEY = THEME_OPTIONS[0].key;

export function getThemeByKey(themeKey) {
  return THEME_OPTIONS.find((theme) => theme.key === themeKey) || THEME_OPTIONS[0];
}
