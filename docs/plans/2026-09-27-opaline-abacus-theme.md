# Opaline Abacus theme and tactile interface plan

> **Superseded 2026-09-29:** Opaline Abacus is Interface B, not a 60th color theme or the default interface. The current Studio design remains Interface A and the default. The 59 existing appearance themes work in both interfaces. See [the corrected interface switch plan](2026-09-29-interface-style-switch.md).

**Status:** Plan approved for execution on 2026-09-27. The visual mockup is ready for review; application code has not changed yet.
**Baseline:** The current working tree, including its uncommitted Trainer, Mixed, Progress, auth, layout, and CSS changes.

## Confirmed direction

- Add **Opaline Abacus** as the selectable default theme. This name is the proposed creative choice requested by the user. Keep all 59 existing theme keys and their four canonical swatches; the catalog will contain 60 themes.
- Give **every theme** the new restrained tactile treatment: rounded capsules, fine edges, shallow raised surfaces, selected circular markers, and a few glossy primary controls. Preserve each existing theme's palette identity.
- Cover every route and material state: Trainer, Mixed, setup, active rounds, feedback, summaries, Progress, Command Desk, account and recovery screens, dialogs, 404, loading, empty, disabled, success, warning, and error states.
- Preserve page layouts, the Newsreader/Syne/IBM Plex Mono font system, branding assets, math behavior, shortcuts, settings, persistence, and navigation behavior.
- Support Light, Dark, and Adaptive display modes. Opaline Abacus uses a cool porcelain light surface and a deep blue-gray dark surface with luminous pastel accents.
- Give sky blue the primary-action role. Use recognizable pastel red for danger/incorrect, yellow for caution or pending, and green for correct/saved. Meaning is always reinforced by text or an icon. These semantic hue families remain recognizable across themes while contrast and luminance adjust per display mode.
- Use short press and hover responses only. Respect reduced-motion preferences. Avoid heavy blur, elaborate animation, or delayed answer feedback.
- Preserve every valid saved theme choice for existing guests and accounts. Only people without a saved theme get the new default.

## Visual specification

The new theme's proposed four catalog swatches are sky blue `#78C7EB`, warm peach `#F2CDBB`, porcelain `#F7FBFD`, and ink blue-gray `#293D4C`. These are canonical identity swatches. The rendered button, text, border, and focus colors may be contrast-adjusted by the existing token generator. In particular, a glossy blue action may need a deeper blue center or a dark icon to remain readable; pastel lightness must not weaken the action label.

The light Opaline header is a soft raised surface. Other themes retain their own header color identity and receive the new rounded, fine-edged material treatment. The dark Opaline header joins the deep blue-gray surface family. The background uses a very quiet tonal shift; the equation and answer input remain the highest-contrast objects in an active round.

Translate the four references as follows:

1. **Image 1:** pill silhouette, fine double edge, soft inset highlight, and compact icon/text composition for prominent controls and selected settings. No calendar icon is introduced.
2. **Image 2:** one luminous sky-blue primary action treatment for Start and Submit, with an obvious focus state and press response. Other themes use their own primary accent in the same material treatment.
3. **Image 3:** circular selected indicators for existing mode, operation, and difficulty choices. Keep the current control types and keyboard behavior; no wheel picker is added.
4. **Image 4:** small circular feedback or action accents with red, yellow, and green reserved for their stated meanings. Keep labeled actions such as End round; color never carries the meaning alone.

Depth follows a hierarchy: primary controls receive the strongest highlight, selected controls a smaller lift, panels a shallow edge, and the active problem/answer region minimal ornament. Disabled, focus, hover, pressed, loading, success, warning, and danger states must remain visually distinct in both modes.

## Approval artifact before application code

Create mockups from the actual current layout and realistic Trainer content. Show setup and active round at desktop and mobile sizes in both Light and Dark: eight states, presented as four paired boards. Include the Command Desk's appearance control, a feedback example, and the Mixed keypad as insets. Verify the primary equation, answer field, and controls at mobile size rather than judging enlarged desktop crops. The user reviews and approves the mockups before the application is restyled.

## Implementation sequence

1. **Record the baseline and protect ongoing work.** Review the current uncommitted diffs in affected files before edits. Change only theme-related code and CSS; do not reset, overwrite, or stage unrelated changes. Capture baseline screenshots of representative current screens so the visual change can be compared.
2. **Extend the theme model.** Add Opaline Abacus to `utils/themes.js` as the first Classic option, set `DEFAULT_THEME_KEY` explicitly to its stable key, and generate both display-mode token sets. Introduce semantic success, warning, and danger tokens separate from decorative palette accents. Add a light-header token override for Opaline only. Align first-paint fallback colors and browser chrome with the new default so startup does not briefly show the old palette. Preserve all existing theme keys, aliases, swatches, and mode behavior.
3. **Change defaults without migrating saved choices.** In `utils/accountPreferences.js`, make missing guest preferences resolve to the new default while preserving any valid stored `themeKey`, including records without the old rollout marker. Add a Supabase migration that changes the `theme_key` default for future rows only; it must contain no bulk update of existing users. Keep sign-in and guest-to-account preference transfer behavior intact. Update the Command Desk's Reset appearance message and any default label/count.
4. **Build one shared material vocabulary.** Add semantic CSS variables for corner sizes, hairline borders, shallow outer/inset shadows, control highlights, and state surfaces. Apply them in `styles/globals.css` and `styles/redesign.css` through existing theme tokens rather than adding one-off colors to each component. Make background, panels, header, navigation, cards, fields, toggles, segmented choices, buttons, keypad, progress, charts, and dialogs read as one system. Use the `data-theme-key` hook only for Opaline-specific color placement, especially its light header.
5. **Apply the system across routes and states.** Update `components/SiteLayout.js`, `components/CommandDesk.js`, the shared controls and panels, `pages/index.js`, `pages/mixed.js`, `pages/stats.js`, auth/recovery/verification pages, and `pages/404.js` only where markup or class hooks are needed. Keep existing labels, tab order, shortcuts, validation, timers, answer submission, and save feedback. Check guest and signed-in variants.
6. **Refine for response and performance.** Use CSS gradients and shadows sparingly. Press and hover states must not shift layout or obscure focus. Remove or soften costly effects on repeated elements, honor `prefers-reduced-motion`, and keep answer feedback immediate.
7. **Verify and review.** Run focused theme/default/persistence tests, then the full test suite, lint, and production build. Review visual states at desktop, mobile portrait and short landscape, 200% zoom, Light/Dark/Adaptive, and representative palettes from Classic, Light, and Dark collections. Fix defects found in one bounded review pass, then confirm.

## Acceptance criteria

- New guests and new accounts without a prior guest choice land on Opaline Abacus; existing valid guest and account choices stay exactly as stored. Reset appearance selects Opaline Abacus and Adaptive mode. Database migration changes future defaults without rewriting rows.
- The theme browser lists 60 unique keys; all 59 existing themes retain their swatches and work in both modes. The new material styling is present across them without forcing blue onto their primary controls.
- Every route and material state follows the material vocabulary. The new default has the light raised header and deep blue-gray dark variant without an obvious wrong-palette flash on initial load. Setup and active-round layouts stay structurally familiar.
- Normal text has at least 4.5:1 contrast; meaningful boundaries and focus indicators have at least 3:1. Important controls have at least 44 by 44 CSS-pixel targets where applicable. State meanings are available without color.
- The equation, entered answer, progress, and next action are immediately legible. No horizontal overflow or hidden essential controls at 320px width, common 375–390px phones, short landscape, or 200% zoom.
- The restyle changes no math result, submission timing, shortcut, saved preference, session termination, or progress data. Reduced motion removes decorative motion, and the interface remains responsive during fast repeated input.

## Main risks and controls

- **Global restyle across 60 palettes:** Use semantic material tokens and inspect representative palette extremes. Automated contrast checks cover every theme/mode token set.
- **Pastel controls can lose contrast:** Keep the pastel surround while darkening rendered action fill or icon/text as needed; verify actual rendered pairs.
- **Preference regression:** Test absent, valid, invalid, and legacy guest records plus signed-in rows. Do not repeat the prior migration that overwrote saved themes.
- **Ongoing uncommitted work:** Target the current working tree and review overlapping diffs before each edit. Do not make broad formatting changes.

## Decision gate

The user has answered the scope, palette, behavior, and delivery questions and asked to implement this plan. The eight-state mockup is in `docs/mockups/opaline-abacus.html`. Application implementation begins after the mockup direction is approved.
