---
name: Kira Kira
description: Original math characters in an exuberant packaging inspired interface.
colors:
  violet: "#6525dc"
  pink: "#ffb1e9"
  cyan: "#6ff2ef"
  lemon: "#ffe640"
  lime: "#c5f76d"
  primary: "var(--accent-main)"
  primary-text: "var(--button-strong-text)"
  ink: "var(--text-main)"
  outline: "var(--control-border)"
  input: "var(--surface-input)"
typography:
  display:
    fontFamily: "Kira Display, sans-serif"
    fontSize: "clamp(3.5rem, 7.5vw, 6rem)"
    fontWeight: 800
    lineHeight: 0.95
  title:
    fontFamily: "Kira Display, sans-serif"
    fontSize: "1.8rem"
    fontWeight: 800
    lineHeight: 1.1
  body:
    fontFamily: "Kira Sans, sans-serif"
    fontSize: "0.95rem"
    lineHeight: 1.55
rounded:
  panel: "1rem"
  control: "0.55rem"
  badge: "0.4rem"
spacing:
  intro: "2rem 2.5rem"
  mobile-intro: "1.3rem 1.2rem"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.primary-text}"
    rounded: "{rounded.control}"
  input:
    backgroundColor: "{colors.input}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
---

## Overview

Kira Kira is an optional interface, scoped to `.app-shell[data-interface-style='kira']`. Harajuku packaging supplies the color energy, flat illustration grammar, repeating rhythm, and segmented lettering. Its subjects are original mental math characters: flashcards for repetition, a pencil for thinking, and a stopwatch for speed.

The user explicitly rejected reproducing the food characters. Each new character has its own object silhouette, facial features, and gestures. Source artwork: `public/images/kira-math-pattern.svg`.

## Colors

The fixed artwork colors above provide violet outlines and candy fills. Functional colors inherit the selected theme. The pink intro mixes pink with paper at 62% in light mode and 22% in dark mode. The arena mixes cyan with the strong raised surface at 18% and 7% respectively. Keep text on semantic solid surfaces for contrast.

## Typography

Self hosted Barlow Condensed 800 supplies `Kira Display`; its SIL license is in `public/fonts/barlow-condensed-OFL.txt`. Existing Inter files supply `Kira Sans`. Route display lettering uses a white face, violet outline, and segmented cyan extrusion. The decorative duplicate is hidden from assistive technology; the route name remains a single accessible heading.

## Layout

The intro uses two columns and a minimum height of 16rem. The title and description sit left; flashcards, pencil, and stopwatch sit right. At 639px and below it becomes a single column with a 6.5rem tall character ensemble. Account introductions remain compact and omit the ensemble. Active rounds omit the intro entirely.

## Elevation & Depth

Panels and controls are flat with 2px outlines. The utility overlay retains a soft offset shadow. Artwork is crisp vector geometry without photographic shading or faux physical textures.

## Shapes

Main panels have 1rem corners; controls use 0.55rem corners. Character geometry is deliberately distinct: offset rectangular flashcards, an eraser capped pencil with a graphite tip, and a stopwatch with crown, ticks, and hands.

## Components

The flashcards replace the old food mark in the product header. The pattern alternates characters with arithmetic marks, number tiles, tally bundles, rulers, and starbursts. The same motifs appear at different scales; the low contrast background repeat stays behind the route title and large character ensemble.

Only flashcards lift gently on intro hover. Reduced motion disables the lift and transitions. Buttons retain semantic fills, disabled behavior, and 3px keyboard focus outlines.

## Do's and Don'ts

- Do invent subject relevant math or study objects when expanding the family.
- Do give each character distinct geometry and expression.
- Do mix wide, narrow, round, and small motifs in an orderly repeat.
- Don't reuse burgers, drinks, doughnuts, fries, or the reference diamond as Kira Kira artwork.
- Don't rasterize functional labels or arithmetic.
- Don't change theme selection, saved preferences, or round behavior for decorative changes.
