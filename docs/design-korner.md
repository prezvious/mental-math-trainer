---
name: Körner Club
description: Optional café packaging inspired interface for Mental Math Studio.
colors:
  primary: "var(--accent-main)"
  primary-text: "var(--button-strong-text)"
  paper: "var(--paper)"
  ink: "var(--text-main)"
  muted-ink: "var(--text-subtle)"
  lettering-ink: "var(--text-accent)"
  outline: "var(--control-border)"
  panel: "var(--surface-raised-strong)"
  inset-panel: "var(--surface-raised)"
  input: "var(--surface-input)"
  selected: "var(--surface-selected)"
  positive: "var(--surface-positive)"
  danger: "var(--accent-alert)"
  danger-text: "var(--button-danger-text)"
  error-ink: "var(--text-danger)"
  error-surface: "var(--surface-danger)"
  focus: "var(--focus-ring)"
typography:
  display:
    fontFamily: "Syne, sans-serif"
    fontSize: "clamp(2.4rem, 5.5vw, 4.8rem)"
    fontWeight: 800
    lineHeight: 1.04
    letterSpacing: "-0.025em"
  title:
    fontFamily: "Syne, sans-serif"
    fontSize: "clamp(1.3rem, 2vw, 1.55rem)"
    fontWeight: 800
    letterSpacing: "-0.025em"
  body:
    fontFamily: "Newsreader, serif"
    lineHeight: 1.55
  lettering:
    fontFamily: "Newsreader, serif"
    fontSize: "clamp(1.6rem, 3vw, 2.65rem)"
    fontWeight: 700
    lineHeight: 1.05
    letterSpacing: "-0.025em"
  label:
    fontFamily: "Syne, sans-serif"
    fontSize: "0.8rem"
    fontWeight: 700
    letterSpacing: "0.015em"
  button:
    fontFamily: "Syne, sans-serif"
    fontSize: "0.94rem"
    fontWeight: 700
    lineHeight: 1
  badge:
    fontFamily: "IBM Plex Mono, monospace"
    fontSize: "0.67rem"
    letterSpacing: "0.08em"
rounded:
  surface-lg: "1rem"
  surface-md: "0.75rem"
  surface-sm: "0.5rem"
  control: "0.65rem"
  field: "0.6rem"
  badge: "0.45rem"
spacing:
  content-gutter: "var(--content-gutter)"
  page-gap: "var(--layout-main-gap)"
  button: "0.72rem 1rem"
  field: "0.8rem 0.95rem"
  panel: "clamp(1.15rem, 1vw + 0.95rem, 1.55rem)"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.primary-text}"
    typography: "{typography.button}"
    rounded: "{rounded.control}"
    padding: "{spacing.button}"
  button-quiet:
    backgroundColor: "{colors.input}"
    textColor: "{colors.ink}"
    typography: "{typography.button}"
    rounded: "{rounded.control}"
    padding: "{spacing.button}"
  button-danger:
    backgroundColor: "{colors.danger}"
    textColor: "{colors.danger-text}"
    typography: "{typography.button}"
    rounded: "{rounded.control}"
    padding: "{spacing.button}"
  field:
    backgroundColor: "{colors.input}"
    textColor: "{colors.ink}"
    rounded: "{rounded.field}"
    padding: "{spacing.field}"
  panel:
    backgroundColor: "{colors.panel}"
    textColor: "{colors.ink}"
    rounded: "{rounded.surface-lg}"
    padding: "{spacing.panel}"
  nav-active:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.primary-text}"
    rounded: "{rounded.control}"
    padding: "{spacing.button}"
  status-badge:
    backgroundColor: "{colors.inset-panel}"
    textColor: "{colors.ink}"
    typography: "{typography.badge}"
    rounded: "{rounded.badge}"
    padding: "0.55rem 0.75rem"
---

# Design System: Körner Club

## Overview

Körner Club is a selectable interface variant inspired by KÖRNER food packaging: bold ink, generous paper space, softly curved lettering, and an original café illustration. Its scope is `.app-shell[data-interface-style='korner']`; Studio remains the default and Opaline Abacus remains a separate option.

This document records the implemented variant rather than a global product identity. The arithmetic interface stays task focused: idle trainer introductions carry the illustration, while active and finish states retain the existing focused trainer presentation.

**Key Characteristics:**

- Heavy uppercase Syne introductions paired with italic Newsreader lettering.
- Flat surfaces, visible outlines, and moderately rounded controls.
- Theme supplied semantic colors in both light and dark display modes.
- Decorative raster artwork paired with crisp native math SVG.

Source authority: [variant styles](../styles/korner.css), [intro component](../components/PageIntro.js), [interface registry](../utils/interfaceStyle.js), [theme binding](../components/SiteLayout.js), and the inherited [base](../styles/globals.css), [layout](../styles/redesign.css), and [interface selector](../styles/interfaceStyles.css) styles. The matching sidecar is [.impeccable/design.json](../.impeccable/design.json). The project has no root `PRODUCT.md` or `DESIGN.md`; this scoped extraction does not introduce either.

## Colors

The frontmatter binds to the existing semantic custom properties rather than freezing one palette. `SiteLayout` supplies the selected theme's `tokensByMode[resolvedDisplayMode]`; Körner Club does not add or modify the 59 color themes.

### Primary

- **Primary ink:** strong buttons, active navigation, active interface selection, brand chip, footer, and progress fills.
- **Primary text:** the matching foreground for those filled surfaces and text selection.
- **Lettering ink:** the rotated phrase, inline math ornaments, input caret, and correct answer outline.

### Neutral

- **Paper:** shell and header background; the header uses the main text roles instead of a contrasting theme header palette.
- **Ink / muted ink:** primary copy and supporting descriptions.
- **Outline:** visible borders and dividers, including the header, introductory section, panels, controls, and footer.
- **Panel / inset panel / input:** distinguish primary containers, smaller configuration surfaces, and answer or form surfaces without decorative gradients.

Selected, positive, danger, and error roles remain semantic. Practice selections use the selected surface; successful verification and correct answer flashes use the positive surface. Danger buttons use the danger accent with its paired text token. Incorrect answer flashes use error ink and the error surface. Keyboard focus inherits the existing focus ring, with main ink used for header and drawer focus outlines.

**The Theme Binding Rule.** Keep color assignments attached to the existing semantic variables so theme and display mode changes remain independent of interface style.

## Typography

Syne supplies the heavy display and interface type; Newsreader supplies body copy and the italic “Make it count.” phrase. Existing IBM Plex Mono badges, hints, and numerical readouts remain in use. These fonts are loaded by `styles/globals.css`; Körner Club adds no font dependency.

The frontmatter records the desktop intro hierarchy. The intro title is uppercase with tight spacing; auth and verification titles use a smaller responsive size (`clamp(2rem, 4vw, 3rem)`). Form labels use normal casing. The lettering phrase is italic and rotated slightly (`-5deg`), with its text hidden from assistive technology as decoration. Body descriptions stay short (`45ch` maximum on larger screens).

Problem lines, stacked problems, summary values, and question timers use tabular numerals. Mathematical content stays real DOM text; decorative math marks are SVG paths.

## Layout

The shared shell still owns container width, content gutters, page gap, trainer grids, and account form widths. Körner Club adjusts the main top padding (`1.6rem`) and gives the intro two columns (`minmax(0, 1fr) minmax(0, 0.8fr)`) with a generous gap (`1.5rem`), minimum height (`15rem`), and a bottom divider. Its artwork is contained within a maximum width (`26rem`) and image height (`14rem`). Auth and verification intros use one column with automatic minimum height, remove horizontal padding, and narrow the gap (`1rem`). Those compact forms hide the illustration and retain a paragraph maximum of `45ch`, without reserving artwork space, at every viewport size.

At the variant's mobile breakpoint (`max-width: 639px`), main top padding becomes `0.75rem`. The standard intro becomes one column, with minimum height `10rem`, padding `0.75rem 0 1.25rem`, and gap `0.75rem`. Its title uses `clamp(2rem, 8vw, 3rem)`. The illustration sits at the lower right in a `7rem` square; paragraph width reserves `7.5rem` for it and paragraph text becomes `0.9rem`. Math ornaments shrink to `1.25rem`, and lettering to `1.6rem`. The auth and verification exceptions above retain their smaller title sizing and hidden art on mobile.

Idle arena articles become a continuous stack separated by top rules, rather than separate raised cards. Existing shared shell and trainer responsive rules continue to apply outside these variant overrides.

## Elevation & Depth

Primary panels, controls, nested containers, problem surfaces, navigation, and the header use flat fills and outlines. The shell's backdrop decoration and panel ornaments are suppressed. The local soft, heavy, and inset surface shadow variables resolve to `none`.

The utility drawer is the explicit depth exception: its border and flat panel fill are paired with a subdued theme colored shadow (`0 14px 35px color-mix(in srgb, var(--surface-shadow) 18%, transparent)`). Shared hover, focus, and state rules still apply where the variant does not override them.

## Shapes

The frontmatter captures the actual radius vocabulary. The large, medium, and small surface values map to `--surface-radius-lg`, `--surface-radius-md`, and `--surface-radius-sm` inside the Körner shell. Main panels, the end round dialog, and the drawer have large rounded corners; configuration rows use the medium radius. Controls, fields, and small labels have their own modest corner treatments.

Primary panels, interactive controls, and fields use strong outlines (`2px`). Configuration surfaces, badges, problem surfaces, and progress tracks use fine outlines (`1px`). The brand chip alone has an asymmetric rounded silhouette (`0.45rem 0.85rem 0.45rem 0.15rem`) and slight rotation (`-5deg`). Intro and footer dividers share the stronger stroke.

## Components

### Buttons and fields

Buttons have flat input fills, ink text, a strong outline, and bold Syne labels. Strong actions and keypad submit actions use the primary fill; danger actions use the danger roles. Buttons inherit their existing minimum hit height (`2.75rem`) and padding from shared styles. Hover lifts applicable buttons by `2px`, and pressing a button or keypad key moves it down `1px`; these transitions last `160ms` with `ease` timing. Disabled behavior and visible focus outlines stay inherited.

Settings, answer, authentication, mixed answer, and theme search fields use the field radius, flat input fill, and strong outline. Shared field text sizing, padding, and focus behavior remain in force. Variant controls disable transition and translation for the selectors covered by the reduced motion media query; entry and stagger animations are disabled throughout Körner Club.

### Navigation, panels, and feedback

Navigation has a transparent wrapper and rounded rectangular links, with the primary fill marking the current route. Panels use the strong raised surface and strong outline; the existing panel kicker is hidden. Smaller configuration surfaces use the raised surface and fine outline. Status badges, mode labels, and hotkey hints use the raised surface and ink text, while progress fill uses primary ink. Verification and answer feedback retain their success, pending, and error semantics.

The interface selector exposes the exact registry value `korner` as “Körner Club”. Its selected button uses primary ink and primary text; selection and persistence use the existing account preference mechanism.

### Intro illustration and math ornaments

`PageIntro` renders [korner-study.png](../public/images/korner-study.png) through Next Image with intrinsic dimensions (`1448 × 1086`) and responsive sizes (`112px` on mobile, `416px` otherwise). It is an original transparent raster illustration of a student practicing at a café table. Its fixed green, orange, and pale yellow artwork is decorative and does not define a new UI palette; transparency lets the current paper color remain visible. [Asset provenance](../public/images/korner-study.png.json) records generation details.

The plus and equals marks are separate inline SVG paths using `currentColor`, round strokes, and the lettering ink role. The artwork wrapper is `aria-hidden`, the image has empty alt text, and the SVGs are not focusable. The page title and description remain readable DOM text.

On trainer pages, existing `shouldShowHeroPanel` presentation logic controls the intro. `utils/trainerPresentation.js` governs Trainer; `pages/mixed.js` shows the Mixed intro only when neither an active round nor a last round is present. Hidden intros are replaced by a visually hidden round heading. Progress and account pages use the same intro component when present.

## Do's and Don'ts

- **Do** scope new Körner treatments to the `korner` interface and reuse the selected theme's semantic color variables.
- **Do** preserve the readable mathematical DOM and the existing focused trainer presentation.
- **Do** keep the original raster scene decorative and native math ornaments responsive to theme ink.
- **Don't** assign a fixed palette to this interface or change Studio's default through this specification.
- **Don't** show the decorative trainer intro during active or finish states where the current presentation hides it.
- **Don't** convert functional arithmetic, control labels, or status feedback into raster artwork.
