# Mental Math Studio

Mental Math Studio is a focused arithmetic trainer built for short, fast rounds and clean progress tracking. The current version trims away the old split flows and keeps everything centered on one practice loop: set the round up, answer quickly, and review how you actually performed.

## What Changed

This build is more direct than the older version of the site.

- There is one main trainer flow now instead of multiple overlapping practice modes.
- Correct answers can move the round forward immediately, which keeps the rhythm tighter.
- Digit controls are clearer and stay within sensible limits for subtraction and division.
- Round preferences and visual theme choices can stick to your account.
- The progress page is built around recent attempts, recent sessions, and operation-by-operation summaries.

## What The Site Does

Once you are signed in, you can:

- choose addition, subtraction, multiplication, or division
- set left and right digit sizes
- choose how many questions belong in a round
- run a timed session and see accuracy, total time, and average response speed
- revisit saved attempts on the progress page
- switch themes without changing how the trainer works

The app currently includes these main routes:

- `/` for the trainer and round setup
- `/stats` for session history and breakdowns
- `/login` for sign-in
- `/signup` for account creation

## Running It Locally

Install dependencies first:

```bash
npm install
```

Then create a local environment file from the example:

```bash
cp .env.example .env.local
```

If you are on PowerShell, the same step is:

```powershell
Copy-Item .env.example .env.local
```

Start the site with:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) after the server starts.

## Using It Offline

If you just want to open the project on your own machine, check the layout, and click through the pages, running it locally is enough.

If you want the full experience with sign-in, saved rounds, and progress history, you also need valid values in `.env.local` for your local setup. Without that, the site still opens, but account-based parts of the experience will stay unavailable.

## Quick Notes

- The trainer is designed for fast repetition, so the current UI avoids extra confirmation steps between questions.
- The stats page is meant to show what actually happened in your recent work, not just a single end-of-round snapshot.
- The included icon set now points at the new SVG favicon provided for this version of the site.
