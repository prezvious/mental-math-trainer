# Mental Math Trainer

Mental Math Trainer is a focused arithmetic trainer for fast, repeated practice.
It runs in the browser, works in guest mode by default, and can sync progress
through Supabase when account features are configured.

## Features

- Standard trainer (`/`) for one operation and practice mode at a time.
- Mixed trainer (`/mixed`) for rotating across selected operations in one round.
- Positive-number drills for addition, subtraction, multiplication, division, and
  exponentiation.
- Decimal drills for addition, subtraction, multiplication, and division.
- Automatic answer checking, keyboard input, and an on-screen keypad.
- Configurable round length, timer visibility, and digit direction.
- Twelve interface styles and 59 color themes, with independent Light, Dark, and
  system-adaptive display modes.
- Round summaries with time, accuracy, fastest response, and per-operation stats.
- Device history and a 90-day Progress view for guests; account progress and
  optional guest-history import after signing in.
- End-round confirmation that keeps submitted answers and pauses the timer while
  you decide whether to continue.
- Optional accounts with synced preferences, progress, and password recovery.

## Training Options

The standard trainer lets you choose a practice mode, operation, digit counts,
and question count. Exponentiation uses a maximum base instead of left/right
digit settings.

The mixed trainer uses difficulty levels per operation:

| Operation      | Levels                                  |
| -------------- | --------------------------------------- |
| Exponentiation | Off, Warmup, Easy, Medium, Hard         |
| Addition       | Off, Warmup, Easy, Medium, Hard, Expert |
| Subtraction    | Off, Warmup, Easy, Medium, Hard, Expert |
| Multiplication | Off, Warmup, Easy, Medium, Hard, Expert |
| Division       | Off, Warmup, Easy, Medium, Hard         |

## Appearance

Open **Utility → Appearance** to choose an interface, color theme, and display
mode. Each setting is independent, so your selected palette works across all
twelve interfaces:

- Studio (default), Opaline Abacus, Körner Club, and Kira Kira.
- Pocket Calculator, Riso Math Club, Orbital Academy, and Sunday Crossword.
- Track & Field, Bauhaus Blocks, Field Notes, and Arcade Micro.

The eight interface collections include original, palette-adaptive SVG artwork.
See [Interface collections](docs/design-collections.md) for their visual styles
and implementation details.

## Guest Mode and Progress

The app works without an account. Guest settings are stored in the browser, so
practice mode, operation choices, round length, appearance, timer visibility, and
digit direction carry across sessions on the same device.

Submitted guest answers are stored separately in IndexedDB. The **Progress** page
(`/stats`) shows accuracy, response speed, operation breakdowns, recent sessions,
and recent attempts. Device history covers the most recent 90 days, with retention
limits of 100 inactive sessions and 10,000 attempts. Clearing browser data removes
this history.

After signing in, choose **Import history** on the Progress page to copy guest
history into your account. Import happens only when you choose it.

## Local Development

Use Node.js 22 or newer and npm.

```bash
git clone https://github.com/prezvious/mental-math-trainer.git
cd mental-math-trainer
npm ci
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

| Command         | Purpose                       |
| --------------- | ----------------------------- |
| `npm run dev`   | Start the development server. |
| `npm run build` | Create a production build.    |
| `npm run start` | Serve the production build.   |
| `npm run test`  | Run the Node.js test suite.   |
| `npm run lint`  | Check the app with ESLint.    |

Run `npm run build` before `npm run start`.

## Optional Account Sync

Account sync requires Supabase. Copy `.env.example` to `.env.local` and fill in
these public client values:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

Without those values, the app still works in guest mode.

Apply all SQL migrations in [`supabase/migrations`](supabase/migrations) in
chronological order. They create the progress and preference tables, dashboard
functions, retention rules, and account preference sync. Existing installations
also need the interface-style migrations:

- `20260929000000_add_interface_style.sql`
- `20261014000000_add_korner_interface_style.sql`
- `20261014010000_add_kira_interface_style.sql`
- `20261015000000_add_interface_collections.sql`

The final migration enables account sync for all twelve interface styles.

For password recovery, add each environment's `/reset-password` URL to the
Supabase Auth redirect URL allowlist, including
`http://localhost:3000/reset-password` for local development. Configure email
delivery and verify the reset-link flow. Users request a link at
`/forgot-password` and choose a new password at `/reset-password`.

## Tech Stack

- Next.js 14
- React 18
- Tailwind CSS 3
- mathjs for high-precision calculations
- Supabase Auth, Postgres, and Realtime
- Browser local storage and IndexedDB for guest preferences and history

## License

[MIT](LICENSE)
