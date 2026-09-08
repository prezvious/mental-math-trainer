# Theme Catalog and Display Mode Design

**Date:** 2026-09-08  
**Status:** Implemented and verified

## Summary

Expand the mental math trainer from 19 existing themes to 59 themes by adding 20 light-inspired and 20 dark-inspired aesthetic palettes. Add Light, Dark, and Adaptive display modes as a separate preference. Every theme must work in every display mode, and all foreground colors must be derived from semantic surface relationships that meet accessible contrast targets.

This design deliberately keeps theme identity and display brightness independent:

- A **theme** supplies the recognizable palette and mood.
- A **display mode** determines whether the rendered surfaces are light or dark.
- **Adaptive** resolves to the operating system preference and responds when that preference changes.

## Goals

- Add exactly 40 new selectable themes: 20 in a Light collection and 20 in a Dark collection.
- Preserve all 19 existing themes and their stored keys.
- Preserve the current appearance of existing themes when Light mode is active.
- Make every existing and new theme usable in Light, Dark, and Adaptive modes.
- Keep normal text at a minimum 4.5:1 contrast ratio against its rendered background.
- Keep large text, focus indicators, and meaningful interface boundaries at a minimum 3:1 contrast ratio.
- Persist both theme and display-mode preferences for guests and signed-in users.
- Make the controls accessible by keyboard and understandable to assistive technology.

## Non-goals

- Adding custom user-authored palettes.
- Changing the product typography, page layouts, or component architecture beyond what mode support requires.
- Removing or renaming existing themes.
- Filtering theme choices based on the selected display mode.
- Adding a dedicated theme gallery or theme search interface.
- Adding a separate keyboard shortcut for display mode.

## Existing System

The application currently defines 19 four-color themes in `utils/themes.js`. It generates one token set per theme and applies the tokens as CSS custom properties from `components/SiteLayout.js`. The utility drawer contains one native theme selector, a four-swatch preview, and the selected theme's description. Guest and signed-in preferences store `themeKey`; signed-in preferences use the Supabase `user_preferences` table.

The current token generator assumes light page surfaces, while portions of `styles/redesign.css` use literal white or near-white text and translucent white surfaces. Mode support therefore requires a targeted semantic-color refactor rather than only inverting the page background.

## Terminology and State

### Theme

A selectable aesthetic identity with these fields:

- `key`: stable kebab-case storage key.
- `name`: user-visible name.
- `collection`: `classic`, `light`, or `dark`.
- `vibe`: one-sentence user-visible description.
- `colors`: four canonical colors in this order: primary, secondary, surface, anchor.
- `layout`: the existing shared layout object.
- `tokensByMode`: generated `light` and `dark` semantic token sets.

The collection describes the palette's authored inspiration and controls selector grouping. It does not restrict which mode can render the theme.

### Display mode

The stored `displayMode` preference is one of:

- `light`: always render light surfaces.
- `dark`: always render dark surfaces.
- `adaptive`: follow `prefers-color-scheme`.

The runtime `resolvedMode` is always `light` or `dark`. When `displayMode` is `adaptive`, `resolvedMode` changes immediately when the operating system preference changes. When `matchMedia` is unavailable, Adaptive resolves to Light.

The default display mode for existing accounts, new accounts, and guests is Adaptive.

## New Theme Catalog

Colors are listed as primary, secondary, surface, and anchor. These four colors establish identity; rendered text and control foregrounds are generated separately and contrast-checked.

### Light collection

| Key               | Name            |   Primary | Secondary |   Surface |    Anchor | Vibe                                                       |
| ----------------- | --------------- | --------: | --------: | --------: | --------: | ---------------------------------------------------------- |
| `abacus-bloom`    | Abacus Bloom    | `#D85D72` | `#58A88B` | `#FFF7F5` | `#38272D` | Rose-and-jade freshness with tactile classroom warmth.     |
| `soroban-peach`   | Soroban Peach   | `#E96F51` | `#F0B95A` | `#FFF7ED` | `#3C2A32` | Apricot energy balanced by golden, methodical focus.       |
| `graph-mint`      | Graph Mint      | `#2E9C76` | `#9BD6C6` | `#F3FBF7` | `#18352E` | Crisp mint geometry for calm, steady calculation.          |
| `violet-ruler`    | Violet Ruler    | `#7C5CE7` | `#C7B8F5` | `#F8F6FF` | `#28213D` | Measured violet clarity with drafting-desk precision.      |
| `citrus-margin`   | Citrus Margin   | `#D99000` | `#F2CF5B` | `#FFFBEA` | `#3D341B` | Sunny annotation color with disciplined paper contrast.    |
| `algebra-rose`    | Algebra Rose    | `#C94F7C` | `#EEA6BD` | `#FFF5F8` | `#422434` | Soft rose confidence with polished academic calm.          |
| `blueprint-air`   | Blueprint Air   | `#2674C8` | `#8EC5F2` | `#F3F9FE` | `#17324D` | Open blue structure with airy technical precision.         |
| `decimal-sage`    | Decimal Sage    | `#568B62` | `#ABC7A3` | `#F5FAF2` | `#26362A` | Quiet green concentration with natural notebook restraint. |
| `coral-ledger`    | Coral Ledger    | `#DD6248` | `#F3A58F` | `#FFF6F2` | `#472C27` | Warm coral momentum grounded by ledger-like order.         |
| `lilac-formula`   | Lilac Formula   | `#8A5EC8` | `#D3BDEF` | `#FAF7FF` | `#332743` | Gentle lilac focus with elegant symbolic clarity.          |
| `teal-compass`    | Teal Compass    | `#168A8D` | `#7CCFD0` | `#F1FBFB` | `#17383A` | Cool directional confidence with clean geometric balance.  |
| `amber-index`     | Amber Index     | `#C77910` | `#F0C574` | `#FFF9EC` | `#3D2D19` | Library-card warmth with crisp reference-book structure.   |
| `berry-notebook`  | Berry Notebook  | `#B14872` | `#E7A8C0` | `#FFF5F9` | `#3F2330` | Rich berry accents softened for comfortable practice.      |
| `pistachio-grid`  | Pistachio Grid  | `#69A447` | `#B8D89B` | `#F7FBEF` | `#2C3A24` | Fresh green organization with subtle graph-paper rhythm.   |
| `cerulean-quiz`   | Cerulean Quiz   | `#217DA8` | `#85CBE0` | `#F2FBFE` | `#183743` | Clear sky-blue energy for quick, confident recall.         |
| `papaya-proof`    | Papaya Proof    | `#E2673F` | `#F1B36B` | `#FFF7F0` | `#482B21` | Warm proof-mark color with inviting problem-solving focus. |
| `lavender-metric` | Lavender Metric | `#6F68C9` | `#BCB7EE` | `#F7F6FF` | `#292842` | Balanced lavender calm with precise measured contrast.     |
| `aqua-flashcard`  | Aqua Flashcard  | `#168E7B` | `#8AD9C6` | `#F0FCF8` | `#173A34` | Fast, refreshing teal built for focused repetition.        |
| `marigold-memo`   | Marigold Memo   | `#B8860B` | `#E8C766` | `#FFFBEE` | `#3B3217` | Golden memory cues with grounded study-room warmth.        |
| `prism-paper`     | Prism Paper     | `#5D6FE5` | `#E87591` | `#F8F8FF` | `#272B48` | Blue-and-rose contrast with playful analytical polish.     |

### Dark collection

| Key                   | Name                |   Primary | Secondary |   Surface |    Anchor | Vibe                                                        |
| --------------------- | ------------------- | --------: | --------: | --------: | --------: | ----------------------------------------------------------- |
| `midnight-abacus`     | Midnight Abacus     | `#66D9C1` | `#7AA7FF` | `#0C1519` | `#EAF8F5` | Deep teal quiet with luminous blue-green counting cues.     |
| `neon-long-division`  | Neon Long Division  | `#B9E85C` | `#54C7EC` | `#11160D` | `#F3FFE4` | Charged lime-and-cyan focus on a muted night field.         |
| `observatory-ink`     | Observatory Ink     | `#9B8CFF` | `#F0A66A` | `#111224` | `#F3F1FF` | Celestial violet and amber for late-night problem solving.  |
| `carbon-equation`     | Carbon Equation     | `#E1E4EA` | `#7D8796` | `#0E1014` | `#F7F8FA` | Near-monochrome restraint with cool metallic definition.    |
| `cobalt-afterhours`   | Cobalt Afterhours   | `#5C9DFF` | `#E182B4` | `#0B1425` | `#EDF4FF` | Electric blue focus with a restrained rose counterpoint.    |
| `ember-blackboard`    | Ember Blackboard    | `#F28C52` | `#E5C07B` | `#1A100D` | `#FFF2E8` | Warm chalk-and-ember contrast on a roasted blackboard.      |
| `deep-sea-calculator` | Deep Sea Calculator | `#45C4C8` | `#7CA6D8` | `#07191D` | `#EAFBFC` | Submerged cyan clarity with calm oceanic depth.             |
| `plum-algorithm`      | Plum Algorithm      | `#CA8BE8` | `#EBA4C9` | `#1A0E20` | `#FBEFFC` | Plum-toned concentration with soft rose highlights.         |
| `forest-binary`       | Forest Binary       | `#72C98A` | `#C5D66D` | `#0B1A12` | `#F0F9F2` | Organic green signals across a deep woodland terminal.      |
| `ruby-function`       | Ruby Function       | `#EE6A78` | `#F0A38F` | `#210D13` | `#FFF0F2` | Precise ruby emphasis with warm functional contrast.        |
| `indigo-grid`         | Indigo Grid         | `#899CFF` | `#66C0D0` | `#0D1026` | `#F1F3FF` | Structured indigo depth with cool coordinate-line clarity.  |
| `bronze-theorem`      | Bronze Theorem      | `#D6A15D` | `#8AC6A8` | `#1A130B` | `#FFF5E6` | Antique bronze reasoning with a quiet green patina.         |
| `aurora-matrix`       | Aurora Matrix       | `#6FE1B8` | `#B48CFF` | `#0B171B` | `#EEFFF9` | Polar green and violet signals over a deep night field.     |
| `lunar-graphite`      | Lunar Graphite      | `#A9B4C4` | `#6D88A9` | `#12161D` | `#F4F7FB` | Low-glare graphite with cool moonlit definition.            |
| `magenta-operator`    | Magenta Operator    | `#E77BC3` | `#8FA7FF` | `#1C0D1A` | `#FFF0FB` | Expressive magenta commands balanced by soft periwinkle.    |
| `arctic-variable`     | Arctic Variable     | `#81D4FA` | `#A8B5FF` | `#09151F` | `#EFFAFF` | Icy cyan clarity across a dense blue-black workspace.       |
| `moss-terminal`       | Moss Terminal       | `#9BCB7A` | `#D1A96B` | `#11190D` | `#F4FBEF` | Moss-green focus with muted brass instrument warmth.        |
| `saffron-night`       | Saffron Night       | `#F3BE5B` | `#E57B6F` | `#1C1509` | `#FFF8E8` | Golden saffron markers over a deep, warm night surface.     |
| `eclipse-violet`      | Eclipse Violet      | `#AF8CFF` | `#6ED4C3` | `#120D1E` | `#F7F1FF` | Violet shadow with mint-lit mathematical highlights.        |
| `crimson-vector`      | Crimson Vector      | `#FF7A82` | `#C494FF` | `#210D12` | `#FFF1F2` | Crimson direction and violet depth in a focused dark field. |

## Token Architecture

### Canonical colors and generated tokens

Canonical theme colors must never be used directly for arbitrary text. `buildTokenSet(colors, resolvedMode)` generates all rendered colors from the palette and the resolved display mode.

Each generated set must include semantic values for:

- Page background and elevated page background.
- Card, panel, input, and overlay surfaces.
- Primary text, secondary text, inverse text, and disabled text.
- Header background, header text, and subdued header text.
- Primary and quiet button backgrounds and their text colors.
- Borders, stronger control boundaries, and focus rings.
- Primary, secondary, warm, alert, and decorative accents.
- Existing glow and hero-decoration values.
- Browser chrome color and native `color-scheme`.

Existing CSS variable names may remain where they already communicate the correct role. Literal text colors and mode-specific assumptions in component CSS must be replaced with semantic variables. Decorative translucent whites may remain only when they are not carrying text, meaning, focus, or a control boundary.

### Surface generation

- Light mode creates high-luminance page and component surfaces tinted by the canonical palette.
- Dark mode creates low-luminance page and component surfaces tinted by the canonical palette; it must not use pure black as the primary page background.
- Existing themes retain their current generated token values in Light mode.
- A theme's canonical surface influences hue and mood but does not force the resolved mode.
- Accent adjustments may mix toward a darker or lighter endpoint until their required foreground contrast is satisfied. This adjustment changes rendered tokens, not the four canonical swatches shown in the selector.

### Contrast enforcement

Use WCAG relative luminance and contrast-ratio calculations already present in `utils/themes.js`.

- Primary and secondary text: at least 4.5:1 against every surface on which each token is used.
- Button and control text: at least 4.5:1 against the corresponding control background.
- Large display text: at least 3:1, though the generator should prefer 4.5:1 when possible.
- Focus indicators and meaningful component boundaries: at least 3:1 against adjacent colors.
- Secondary text is derived by moving from primary text toward its background only until the 4.5:1 threshold is reached.
- Text selection chooses among the palette anchor, a dark neutral candidate, and a light neutral candidate; the highest-contrast valid candidate wins.
- If a preferred accent cannot support compliant label text, adjust the rendered accent toward the nearest compliant shade and retain the canonical swatch for palette identity.

## Preference and Runtime Flow

1. Account preferences expose `themeKey`, `displayMode`, trainer settings, loading state, and the existing update function.
2. Preference sanitization accepts only `light`, `dark`, and `adaptive`; every other value becomes `adaptive`.
3. A pure resolver maps `displayMode` and the current system preference to `resolvedMode`.
4. A small client hook subscribes to `(prefers-color-scheme: dark)` only while Adaptive is selected.
5. `SiteLayout` resolves the active theme and reads `tokensByMode[resolvedMode]`.
6. The resolved semantic tokens are applied to the app shell as CSS custom properties.
7. The app shell exposes `data-display-mode` and `data-resolved-mode` for CSS, diagnostics, and tests.
8. The document's `color-scheme`, `<meta name="theme-color">`, and Microsoft tile color use the resolved tokens.

System-preference changes must not overwrite the stored `displayMode`; they only update `resolvedMode` while Adaptive is active.

## Persistence

### Guests

Add `displayMode` to the existing guest preference JSON. Missing or invalid values resolve to Adaptive. Do not increment the guest theme rollout or reset a guest's manually selected theme.

### Signed-in users

Add a Supabase migration that creates a `display_mode` text column with:

- `NOT NULL`.
- Default value `adaptive`.
- A check constraint limiting values to `light`, `dark`, and `adaptive`.

Update selected preference columns, row serialization, sanitization, merging, and context exposure. Existing rows receive Adaptive through the column default and migration backfill behavior. The existing optimistic update and error-reporting behavior remains unchanged.

## Appearance Interface

The existing utility drawer's Appearance section becomes:

```text
Appearance
Mode
[ Light ] [ Dark ] [ Adaptive ]

Theme
[ grouped native theme selector ]

● ● ● ●
Selected theme description
```

### Mode control

- Use a three-option segmented radio group with visible text labels.
- Each option has a minimum 44 by 44 CSS-pixel hit target.
- Arrow keys move between options; Tab moves into and out of the group.
- The selected option exposes checked state to assistive technology.
- The control is disabled while account preferences are loading.
- Changing an option updates the interface immediately and then uses the existing preference persistence path.

### Theme selector

Keep the native selector and group options in this order:

1. Classic — the 19 existing themes.
2. Light collection — the 20 new light-inspired themes in catalog order.
3. Dark collection — the 20 new dark-inspired themes in catalog order.

The selected option, four canonical swatches, and vibe description remain visible. Themes are never hidden or filtered by display mode. The existing theme-cycle shortcut continues cycling through all 59 themes in catalog order.

## CSS and Component Integration

- `utils/themes.js` owns catalog data, color math, token generation, grouping metadata, and theme lookup.
- A focused display-mode utility or hook owns mode validation, system-preference resolution, and the media-query subscription.
- `utils/accountPreferences.js` owns storage sanitization and serialization.
- `utils/accountPreferencesContext.js` exposes and persists the preference.
- `components/SiteLayout.js` renders the controls and applies resolved semantic variables.
- `styles/redesign.css` replaces literal foreground colors and light-only control surfaces with semantic variables.
- The Supabase migration owns the signed-in storage schema change.

Utility-drawer hotkey keycaps are location-aware: their foreground, surface,
border, and inset highlight derive from the drawer's semantic header tokens.
Content-area keycaps keep the content semantic tokens. This prevents a selected
page palette from leaking a low-contrast foreground into the drawer while still
allowing Light, Dark, and Adaptive modes to resolve normally.

Do not create a broad design-system rewrite. The refactor is limited to making existing visual roles explicit and mode-safe.

## Error and Fallback Behavior

- Invalid or missing theme keys continue resolving to the current default theme.
- Invalid or missing display modes resolve to Adaptive.
- Environments without `matchMedia` resolve Adaptive to Light.
- A failed remote preference write leaves the optimistic selection visible and follows the application's existing console error behavior.
- Corrupted guest preference data continues falling back through existing storage sanitization.
- A theme-generation error during development must fail tests rather than silently publishing an unreadable token pair.

## Verification Strategy

### Automated tests

- Confirm the catalog contains 59 total themes, including exactly 20 Light and 20 Dark collection entries.
- Confirm all theme keys are unique, all palettes contain four normalized six-digit hex colors, and every theme contains its required metadata.
- Confirm legacy aliases and all 19 existing keys still resolve.
- Confirm existing themes' Light token snapshots or invariant values remain unchanged where required.
- Evaluate all 59 themes in both resolved modes, for 118 token combinations.
- Assert every declared text/surface pair reaches 4.5:1.
- Assert focus rings and meaningful boundaries reach 3:1 against adjacent surfaces.
- Assert generated colors remain valid normalized hex or valid RGBA values, as appropriate.
- Test mode sanitization, Adaptive resolution, and the no-`matchMedia` fallback.
- Test guest preference reads, writes, merges, and legacy data without `displayMode`.
- Test signed-in row serialization and selected column mapping for `display_mode`.
- Preserve existing theme-cycle behavior and verify it wraps across the expanded catalog.

### Static and build verification

- Run the project's test suite.
- Run linting.
- Run a production build.
- Search rendered UI styles for literal foreground colors that bypass semantic text tokens.

### Visual verification

Smoke-test the home page, trainer settings, active training state, results, progress, authentication screens, 404 page, utility drawer, native selects, buttons, disabled controls, and keyboard focus in representative light and dark palettes. Also confirm Adaptive responds to a live operating-system preference change without resetting the selected theme.

## Acceptance Criteria

- Users can select all 40 new themes, and the 19 existing themes remain available.
- Users can select Light, Dark, or Adaptive independently of theme.
- Adaptive follows and reacts to the operating-system color preference.
- Theme and mode persist for guests and signed-in users.
- Existing stored preferences continue loading safely.
- No normal text, secondary text, control label, or focus indicator falls below its specified contrast threshold in any of the 118 theme-mode combinations.
- Native form controls and browser chrome reflect the resolved mode.
- The Appearance controls are keyboard accessible and fit the existing utility drawer at mobile and desktop widths.
- Automated tests, linting, and the production build pass.
