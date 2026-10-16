# Interface collections

Eight additional interfaces are available in Utility → Appearance → Interface.
They use the existing palette and light/dark/adaptive preference system, not
separate color presets. Studio remains the default and previous choices stay valid.

| Interface         | Design language                                          | Original SVG composition                               |
| ----------------- | -------------------------------------------------------- | ------------------------------------------------------ |
| Pocket Calculator | Molded edges, inset inputs, tactile keys                 | Handheld calculator and arithmetic marks               |
| Riso Math Club    | Two-ink geometry, condensed poster lettering             | Layered workshop poster and circular seal              |
| Orbital Academy   | Instrument rules, reference grids, clipped-radius panels | Orbital diagram with calibration ticks                 |
| Sunday Crossword  | Newspaper typography, double rules, square cells         | Authored puzzle page and pencil                        |
| Track & Field     | Italic athletic lettering, lane rules, timing details    | Running lanes, race bib, stopwatch                     |
| Bauhaus Blocks    | Primary geometric forms, asymmetric corners              | Modular circle, triangle, stripe and cross composition |
| Field Notes       | Journal typography, dotted ground, dashed rules          | Contour map, notebook and compass                      |
| Arcade Micro      | Handheld casing, squared keys, measured numerals         | Original pixel creature on a handheld display          |

## Implementation

- Register styles in `utils/interfaceStyle.js`.
- Artwork lives in `components/InterfaceArtwork.js`. Inline SVG inherits semantic
  CSS variables so colors update immediately with the palette. No fixed artwork
  colors, raster downloads, external image services, canvas, or SVG ID collisions.
- `styles/collections.css` scopes every visual system to its interface. Shared
  collection rules use `data-interface-collection`; existing styles are untouched.
- `PageIntro` owns artwork on trainer, mixed, progress and account introductions.
  Existing active-round rendering removes the introduction; decorative backgrounds
  also disappear during active sessions. Equations remain accessible DOM text.
- Artwork is vector and resolution-independent, including at 4K. It is not an HDR
  raster image. Barlow Condensed and Inter are self-hosted existing assets;
  editorial and measurement faces reuse the site's existing font definitions.
- Inputs, feedback and text retain the contrast-aware semantic color roles.
  Decorative tones can mix palette colors; functional text must not use them.
- Mobile introductions stack artwork below the copy. Account introductions hide
  it on narrow screens. Reduced motion disables transitions and animation.

## Persistence and rollout

Guest selection uses the existing local preferences. Apply
`supabase/migrations/20261015000000_add_interface_collections.sql` before using
the new styles with signed-in accounts. This only expands the allowed values;
it does not update preferences, rewrite history or change defaults.

## Verification

Run `npm test`, `npm run lint` and `npm run build`. Interface tests cover
registration, invalid-value fallback, preference round trips, scoped adaptive
artwork, responsive/reduced-motion rules and the expanded database constraint.
Visually inspect all interfaces at desktop and narrow mobile sizes, plus a live
round, account form and progress view with both light and dark palettes.
