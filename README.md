# Mental Math Studio

Mental Math Studio is a focused arithmetic practice app for fast reps, clean pacing, and visible progress. The current version keeps the experience simple: one trainer engine, one progress dashboard, and a rotating set of visual themes if you want the app to feel different without changing how it works.

## What It Does

You build a round by choosing an operation, digit lengths, and the number of questions. The trainer then generates arithmetic prompts and times every response.

The current trainer supports:

- Addition, subtraction, multiplication, and division
- Left and right digit lengths from 1 to 8
- Safe subtraction and division rules so the right side never exceeds the left side
- Hybrid answer flow
- Type the exact correct answer and the app moves to the next question immediately
- Press Enter or use the submit button to record the current answer and move on, even if it is wrong
- End-of-round summaries for accuracy, average response time, and total time
- A progress page with recent attempts, recent sessions, and operation breakdowns
- Login and sign-up screens with password guidance
- Theme switching stored in local storage

## What Changed

This repo no longer includes the old set-based trainer. The website now runs on one streamlined trainer flow:

- Correct input auto-advances right away
- Feedback banners between questions are gone, so timing stays tighter
- Digit selection is explicit and consistent from 1 to 8
- The active app uses one trainer path instead of split old and new flows

If you used an older version of this project before, the biggest difference is that the round now feels more continuous. You can keep typing, get instant advancement on correct answers, and finish a full session without the old stop-and-confirm rhythm.

## Running It Locally

If you want to run the website on your own computer:

```bash
npm install
```

Copy `.env.example` to `.env.local`, then fill in the values your local setup expects.

Start the app with:

```bash
npm run dev
```

Then open [http://localhost:3000](http://localhost:3000).

## Using It Offline

If by "offline" you mean "run it locally on your own machine without deploying it," that works fine.

- For a full local setup, add your environment values in `.env.local` and start the app with `npm run dev`.
- For a quick offline UI check, you can still boot the site locally and inspect the layout, themes, and page flow.
- Account-based features and saved history depend on your local environment being configured correctly.

## Quick Checks

Before pushing changes, these are the two checks worth running:

```bash
npm run lint
node --test --no-warnings .\tests\mathEngine.test.cjs .\tests\trainerRound.test.cjs
```

## Main Routes

| Path | Purpose |
|------|---------|
| `/` | Trainer setup and live rounds |
| `/stats` | Progress dashboard and recent history |
| `/login` | Account login |
| `/signup` | Account creation |
