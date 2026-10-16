# Interface A / Interface B switch

The current Studio design is Interface A and remains the default. Opaline Abacus is Interface B, an alternate material and component style selected from **Utility → Appearance**. This setting is independent of the existing 59 color themes and Light, Dark, and Adaptive modes. Every theme remains available under both interfaces, and switching interface styles retains the selected theme and display mode.

## Implementation

- Store `interfaceStyle` as `studio` or `opaline` in guest preferences and the signed-in `user_preferences.interface_style` column. The database migration defaults existing and future rows to `studio` without updating other saved preferences.
- Expose a two-button interface switch in Command Desk's Appearance section. Save through the existing preference provider so guest choices persist locally and signed-in choices sync with the account and across devices. Reset appearance returns to Studio, Carbon Paper, and Adaptive mode.
- Scope Interface B's CSS under `data-interface-style='opaline'`. Leave Interface A's current CSS intact. Derive primary accents, surfaces, and text from whichever of the 59 themes is selected; reserve recognizable green, yellow, and red for meaningful feedback.
- Apply the B material treatment to the header, navigation, hero, cards, panels, forms, choice controls, buttons, active problems, keypad, progress, Command Desk, dialogs, summary, account pages, and feedback states. Keep the current page content, math behavior, shortcuts, and branding.
- The earlier blue mockup illustrates Interface B with a blue appearance palette. Selecting another palette changes the colors while preserving B's shapes and depth.

## Verification

- Confirm new and existing users default to Studio unless they explicitly saved Opaline. Changing the interface leaves theme, display mode, and trainer settings intact; changing theme leaves interface intact. Guest and account reloads restore the chosen interface.
- Keep the theme catalog at 59 unique keys. Check Interface A and B on Trainer, Mixed, Progress, auth, and utility views at desktop and phone widths, including light and dark modes.
- Verify legible controls, keyboard focus, reduced motion, responsive overflow, and the existing test, lint, and build checks.
