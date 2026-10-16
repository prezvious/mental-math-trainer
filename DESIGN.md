---
name: Mental Math Trainer
description: Selectable interfaces over independent semantic color themes.
colors:
  primary: "var(--accent-main)"
  primary-text: "var(--button-strong-text)"
  paper: "var(--paper)"
  ink: "var(--text-main)"
  muted-ink: "var(--text-subtle)"
  outline: "var(--control-border)"
  input: "var(--surface-input)"
  focus: "var(--focus-ring)"
---

## Overview

Interface styles and color themes are independent. Studio remains the default; Opaline Abacus, Körner Club, and Kira Kira are selectable alternatives. Scope each variant to its `data-interface-style` value. The semantic variables above are supplied by the selected theme and light/dark mode.

The implemented Kira Kira system is documented in [docs/design-kira.md](docs/design-kira.md). Its original math character set translates the energy of the user's packaging references into the trainer's subject. The existing Körner system remains documented in [docs/design-korner.md](docs/design-korner.md); its sidecar is preserved in `.impeccable/design.json`.

## Colors

The eight additional interfaces and their adaptive SVG artwork are documented in
[docs/design-collections.md](docs/design-collections.md). Their scoped styles live
in `styles/collections.css`; all artwork inherits the chosen semantic palette.

Functional text, surfaces, feedback, controls, and focus use theme variables. Decorative artwork may have fixed colors inside a scoped variant. A theme selection must not change the selected interface or trainer settings.

## Layout

Shared navigation, trainer setup, focused solving, progress, and account flows retain their existing responsive structure. Route introductions disappear during active rounds. Variant artwork must fit the available width without obscuring content or controls.

## Components

`SiteLayout` owns the shell, navigation, and variant product mark. `PageIntro` selects route introduction artwork. `CommandDesk` exposes all registered interface options through the existing preference mechanism.

## Do's and Don'ts

- Do use `styles/kira.css` and its scoped documentation for Kira Kira changes.
- Do preserve keyboard controls, real mathematical DOM text, and reduced motion behavior.
- Don't turn the Kira Kira palette or artwork into global rules for the other interfaces.
- Don't recreate the reference food characters; Kira Kira's characters belong to mental math.
