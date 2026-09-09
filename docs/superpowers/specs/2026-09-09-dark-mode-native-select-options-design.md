# Dark-mode native select options

## Problem

Settings selects use theme-aware foreground and control-surface tokens, but their native popup options do not have matching option styles. In dark mode on Windows Chromium, the popup can therefore render a light background behind the inherited light text, making unselected options unreadable.

## Design

Keep the existing native `select` elements and their current keyboard, screen-reader, and platform behavior. Add a shared rule scoped to selects inside `.settings-form` so `option` and `optgroup` rows use the existing `--text-main` foreground and `--surface-input` background tokens. This applies consistently to Operation and every other trainer settings dropdown without changing the utility drawer's separately scoped theme selector.

The resolved display mode already sets `color-scheme` on the document root. The new rule supplements that browser hint with explicit semantic colors for popup implementations that do not render the option surface correctly from `color-scheme` alone.

No component or data-flow changes are required. Selecting an option continues to emit the same native change event and update the same settings state.

## Alternatives considered

- Style only the Operation dropdown. This fixes the screenshot but leaves the same defect in digit and round-size dropdowns.
- Replace native selects with a custom dropdown. This would allow complete popup styling, but adds focus management, keyboard interaction, and accessibility complexity that is unnecessary for this bug.

## Error handling and compatibility

Browsers that fully control native popup appearance may ignore part of the option styling; the existing resolved `color-scheme` remains the platform-level fallback. Browsers that honor option colors will receive a matching foreground/background pair from the active theme.

## Verification

- Add a style regression test requiring the shared settings option rule to use semantic foreground and surface tokens.
- Run the theme style test and the full test suite.
- Visually verify an open settings dropdown in both light and dark display modes, with particular attention to unselected option contrast.

## Scope

Only trainer settings dropdown popup colors and their regression coverage are included. Layout, typography, option labels, selected values, and the utility-drawer theme selector remain unchanged.
