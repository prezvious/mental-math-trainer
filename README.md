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
- Configurable round length, timer visibility, digit direction, and theme.
- Round summaries with time, accuracy, fastest response, and per-operation stats.
- Optional stats dashboard (`/stats`) for signed-in users.

## Training Options

The standard trainer lets you choose a practice mode, operation, digit counts,
and question count. Exponentiation uses a maximum base instead of left/right
digit settings.

The mixed trainer uses difficulty levels per operation:

| Operation | Levels |
| --- | --- |
| Exponentiation | Off, Warmup, Easy, Medium, Hard |
| Addition | Off, Warmup, Easy, Medium, Hard, Expert |
| Subtraction | Off, Warmup, Easy, Medium, Hard, Expert |
| Multiplication | Off, Warmup, Easy, Medium, Hard, Expert |
| Division | Off, Warmup, Easy, Medium, Hard |

## Offline Use

The app works without an account. Guest settings are stored in the browser, so
practice mode, operation choices, round length, theme, timer visibility, and
digit direction carry across sessions on the same device.

## Local Development

```bash
git clone https://github.com/prezvious/mental-math-trainer.git
cd mental-math-trainer
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Useful commands:

```bash
npm run build
npm run start
npm run test
npm run lint
```

## Optional Account Sync

Account sync requires Supabase. Copy `.env.example` to `.env.local` and fill in
these public client values:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

Without those values, the app still works in guest mode.

## Tech Stack

- Next.js 14
- React 18
- Tailwind CSS
- Chart.js
- Supabase

## License

MIT
