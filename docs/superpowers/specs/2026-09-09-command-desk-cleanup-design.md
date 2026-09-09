# Command Desk cleanup

## Summary

Refocus the Command Desk as a compact settings drawer. Its main view will contain appearance controls and a collapsed keyboard-shortcuts reference. Theme browsing moves into a searchable subview inside the same drawer. Duplicate navigation and account controls, verbose explanatory copy, and always-visible shortcut details are removed.

## Goals

- Make the default drawer short, scannable, and clearly focused on settings.
- Preserve Light, Dark, and Adaptive mode selection.
- Preserve automatic guest and signed-in preference persistence.
- Keep the selected theme and its four-color palette preview visible on the main view.
- Make all 59 themes searchable without favorites or recent-theme state.
- Keep the complete keyboard-shortcut reference available but collapsed by default.
- Preserve the existing focus trap, focus restoration, Escape behavior, and keyboard accessibility.
- Make displayed shortcut information derive from the same definitions as the active bindings.

## Non-goals

- Adding navigation or account actions to the drawer.
- Adding favorites, recent themes, custom themes, or user-authored palettes.
- Adding training defaults, sound controls, or new accessibility preferences.
- Changing the existing routes, authentication behavior, theme catalog, or preference storage model.
- Changing the existing shortcut keys or their availability rules.

## Existing interface

The drawer currently combines four jobs: duplicate site navigation, duplicate account actions, appearance settings, and a fully expanded shortcut manual. The appearance section uses a native select containing 59 themes and separately displays a theme description and swatches. A theme-cycle shortcut hint is repeated beside the section heading.

`SiteLayout` already owns drawer focus trapping, outside-click dismissal, scroll locking, and return-focus behavior. Theme and display-mode changes already persist through `upsertPreferences`. Shortcut keys live in `utils/hotkeys.js`, but binding metadata and reference content are maintained in separate structures.

## Information architecture

### Main view

```text
COMMAND DESK                                      [×]

APPEARANCE
Mode                    [ Light | Dark | Adaptive ]
Theme                   [ ● ● ● ●  Carbon Paper  › ]
                                      Reset appearance

KEYBOARD SHORTCUTS                         8  [⌄]
```

The drawer header uses `Command Desk` as its accessible heading and removes the existing descriptive title and introductory sentence.

The Appearance section contains:

- The existing three-option display-mode control.
- A theme summary button showing the selected theme name, four palette swatches, and a forward indicator.
- A quiet `Reset appearance` action that restores the default Carbon Paper theme and Adaptive mode in one preference update.
- A visually hidden polite status message for reset completion; no persistent success copy is added to the compact layout.

The Keyboard Shortcuts section is a disclosure collapsed every time the drawer opens. Its summary shows the section name and total shortcut count. When expanded, it retains the existing Navigation, Appearance, Account, and Round Control groups, but each row contains only the action label and key. Existing descriptions and notes are not rendered.

### Searchable theme subview

Activating the Theme summary replaces the main content inside the drawer without opening another modal or overlay:

```text
[←]  APPEARANCE THEMES

[ Search 59 themes… ]

CLASSIC
[ ● ● ● ●  Carbon Paper                         ✓ ]
[ ● ● ● ●  Powder Blue Notebook                   ]

LIGHT COLLECTION
[ ● ● ● ●  Abacus Bloom                           ]

DARK COLLECTION
[ ● ● ● ●  Midnight Abacus                        ]
```

Search behavior:

- Filtering is immediate, case-insensitive, and ignores surrounding whitespace.
- Theme name, theme description, and collection label are searchable.
- The original catalog and collection ordering never changes.
- Empty collection groups are omitted.
- A blank query shows all themes.
- No matches shows `No themes match “{query}”.` with a `Clear search` action.
- Selecting a result applies and persists the theme immediately and keeps the subview open so users can compare themes. The selected result updates its check indicator.
- Leaving the subview clears the query so the next visit begins with the full catalog.

No favorites or recently used themes are stored or displayed.

## Interaction and focus behavior

- Opening the drawer continues moving focus into it and trapping Tab navigation inside it.
- Closing the drawer continues returning focus to the Utility trigger.
- Opening the theme subview focuses the search field.
- Arrow Down and Arrow Up move focus through visible theme results; Home and End move to the first and last result. Enter or Space activates the focused theme button.
- Escape from the theme subview returns to the main Command Desk and restores focus to the Theme summary button.
- Escape from the main view closes the drawer as it does today.
- The Back button returns to the main view and restores focus to the Theme summary button.
- The Keyboard Shortcuts disclosure uses `aria-expanded` and `aria-controls`; its content is absent from the focus order while collapsed.
- Closing the drawer resets it to the main view with shortcuts collapsed and search cleared.
- Loading preferences disables display-mode, theme-selection, and reset controls without disabling shortcut disclosure.

## Shortcut definition system

Create one canonical shortcut-definition collection in `utils/hotkeys.js`. Each entry supplies the key, action identifier, group, visible action label, and any runtime availability metadata needed by the existing global handler. Derive the action lookup, formatted shortcut labels, and grouped Command Desk reference from this collection.

The Round Control Enter shortcut remains reference-only because its behavior is page-owned. The resulting reference still contains all eight existing shortcuts. No new shortcut key is introduced in this cleanup.

## Component boundaries

- `SiteLayout` retains theme token application, routing, authentication controls, and the global shortcut handler.
- A focused Command Desk component owns main-versus-theme view state, search text, shortcut disclosure state, reset behavior, and drawer content rendering.
- A pure theme-filtering helper performs normalization, matching, and group omission so search behavior can be tested without browser rendering.
- Existing theme catalog and preference APIs remain the source of truth; the Command Desk does not duplicate theme or persistence data.

## Removed elements

- The drawer Navigation section.
- The drawer Account section.
- The drawer introductory sentence and descriptive title.
- The always-visible theme description.
- The native 59-item theme select on the main view.
- The always-visible shortcut reference.
- Shortcut descriptions and notes inside the expanded reference.
- The theme-cycle shortcut hint beside the Appearance heading.

The site header keeps its existing navigation, account controls, sync state, and Utility trigger.

## Styling

Use the existing semantic theme tokens for all text, surfaces, boundaries, focus indicators, selected states, and swatches. The main view should fit without scrolling at common desktop heights. The theme subview may scroll its results while keeping its header and search control reachable. Touch targets remain at least 44 pixels, and no hover-only interaction is introduced.

The existing responsive drawer width and mobile edge insets remain. Motion is limited to the current drawer entrance and existing color transitions, with the current reduced-motion behavior preserved.

## Error and fallback behavior

- Missing or invalid theme keys continue resolving through the existing theme fallback.
- Failed remote preference writes retain the application's existing optimistic local behavior and error handling.
- Reset uses the same persistence path as ordinary theme and mode changes.
- A missing theme description does not prevent name or collection matching.
- An empty result set never leaves a blank panel; it presents the no-results message and clear action.

## Verification

### Automated

- Test theme search across names, descriptions, collections, case differences, whitespace, group omission, ordering, and no-results behavior.
- Test that shortcut lookup and grouped reference output derive from the canonical definitions and still expose all eight current shortcuts.
- Test that the Command Desk source no longer renders navigation, account actions, a native theme select, theme descriptions, or shortcut descriptions.
- Test disclosure labels and accessibility relationships where practical with the existing test stack.
- Run the complete test suite, lint, and production build.

### Visual and interaction

- Verify the compact main view in representative light and dark themes on desktop and mobile widths.
- Verify shortcut disclosure is collapsed on open, expands correctly, and contains all groups without descriptions.
- Verify theme search filtering, no-results recovery, selection, palette preview updates, and scroll behavior.
- Verify Tab trapping, visible focus, arrow-key result navigation, Back/Escape behavior, outside-click close, and trigger focus restoration.
- Verify guest and signed-in theme/mode changes continue persisting.

## Acceptance criteria

- The default Command Desk shows only Appearance and collapsed Keyboard Shortcuts content.
- Navigation, account actions, explanatory copy, native theme select, theme description, and repeated shortcut hint are absent from the drawer.
- Theme search covers all 59 catalog entries without favorites or recents.
- The selected theme and four palette swatches remain visible on the main view.
- All eight existing shortcuts are available in the collapsed reference and documented from their active definitions.
- Theme, mode, and reset changes persist through the existing guest/account preference system.
- Existing modal keyboard and focus behavior remains correct, with the specified subview behavior added.
- Tests, lint, build, and visual checks pass.
