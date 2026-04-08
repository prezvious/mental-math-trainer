# Mental Math Trainer

A fast, no-nonsense arithmetic trainer for building real mental math speed. Two drill formats, five operations, 25 themes, and zero friction — just open it and go.

Works completely offline. No account required.

---

## What it does

You get a problem. You type the answer. The moment your digits are correct it jumps to the next one — no submit button, no delay, just continuous reps. Every response time is tracked behind the scenes so your end-of-session stats are always accurate, even if you hide the clock.

---

## Two training modes

**Standard trainer** (`/`) — one operation per session. Good for isolating a weak spot or warming up on something specific.

**Mixed trainer** (`/mixed`) — rotates across multiple operations in a single session. Keeps you on your toes when you don't know what's coming next.

---

## Operations and difficulty

Each operation has its own difficulty setting, and you can toggle any of them off entirely. Mix and match however you like.

| Operation | Levels available |
|-----------|-----------------|
| Squares n² | Off · Warmup · Easy · Medium · Hard |
| Addition + | Off · Warmup · Easy · Medium · Hard · Expert |
| Subtraction − | Off · Warmup · Easy · Medium · Hard · Expert |
| Multiplication × | Off · Warmup · Easy · Medium · Hard · Expert |
| Division ÷ | Off · Warmup · Easy · Medium · Hard |

---

## Session options

- **Run length** — choose 3, 7, 21, 55, or 111 questions per session
- **Timer display** — hide the clock if it stresses you out (timing still runs in the background, so stats stay honest)
- **Right-to-left input** — flips the digit entry direction, useful if you naturally think in columns

---

## How input works

Problems are displayed in vertical stacked form, the way you'd write them by hand. Squares are shown as `n²`. You enter digits on the on-screen keypad or your keyboard — no Enter key needed. The answer locks in automatically once the right number of correct digits are typed.

---

## Stats after each session

When a round ends you get a full breakdown:

- Total session time and average response time per question
- Overall accuracy for the session
- Fastest single response
- Per-operation accuracy and speed (so you can see exactly which operations are slowing you down)

The stats page (`/stats`) shows your history over time with charts if you're signed in.

---

## Themes

Hit the button in the bottom-right corner to open the theme switcher. There are 25 named themes, each with its own color palette and layout character — some are dark and moody, some bright and airy, some somewhere in between.

Current themes: Velvet Circuit · Paper Lantern · Acid Lemon Lobby · Apothecary Glass · Vinyl After Rain · Chrome Blossom · Taxi Noir · Porcelain Rebel · Signal Peach · Cobalt Typewriter · Rosewater Asphalt · Carbon Taffy · Cherry Receipt · Lilac Concrete · Mercury Carnival · Ink and Apricot · Studio Vermouth · Pixel Bazaar · Marble Disco · Saffron Static · Cotton Candy Dawn · Honey Milk · Sage Whisk · Lavender Mist · Aqua Whisper

---

## Running it offline

No internet, no account, no problem. Guest mode is the default. Your settings (difficulty per operation, run length, theme, timer visibility, input direction) are saved in your browser automatically and restored the next time you visit.

### Run locally

```bash
# Clone the repo
git clone https://github.com/prezvious/mental-math-trainer.git
cd mental-math-trainer

# Install dependencies
npm install

# Start the dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). That's it — no extra configuration needed to start training.

```bash
npm run build   # production build
npm run start   # serve the production build
npm run test    # run the test suite
npm run lint    # lint check
```

---

## Optional: account sync

If you want settings and progress to carry across devices, copy `.env.example` to `.env.local` and fill in the values. Without that, everything stays local and guest mode works fully.

---

## Tech

Next.js 14 · React 18 · Tailwind CSS · Chart.js

---

## License

MIT
