# Mental Math Studio

Mental Math Studio is a clean, focused arithmetic trainer for fast rounds and honest progress tracking. The current build narrows the experience to one crisp loop: set your round, answer quickly, then review what actually happened.

## What Changed

This version is tighter and more direct than the old site.

- One main trainer flow replaces the older split modes.
- Rounds advance the moment the correct answer lands, so the rhythm stays quick.
- Digit controls clamp to sensible limits for operations that need ordered numbers.
- The round blueprint and theme choice persist with your account.
- The progress dashboard now centers on recent sessions, recent attempts, and operation-level consistency.

## How It Works

1. Sign in to unlock the trainer.
2. Pick an operation, digit lengths, and round size.
3. Start the round and answer as fast as you can.
4. Get an instant summary with accuracy, average speed, and total time.
5. Jump to the progress dashboard to see trends and breakdowns.

## Progress Dashboard Highlights

- Overall accuracy, fastest answer, and average response speed
- Operation-by-operation stats with accuracy and pace
- Recent sessions with digit settings and scores
- A quick list of recent attempts for honest review
- One-click reset when you want a clean slate

## Themes

A floating theme drawer lets you swap visual styles without changing the training flow. Your choice sticks to your account so you can keep the vibe consistent across sessions.

## Running It Locally

Install dependencies:

```bash
npm install
```

Create a local environment file:

```bash
cp .env.example .env.local
```

If you are on PowerShell:

```powershell
Copy-Item .env.example .env.local
```

Fill in the account and data service values in `.env.local`, then start the dev server:

```bash
npm run dev
```

Open `http://localhost:3000` once the server is running.

## Using It Offline

Install dependencies while you are online, then you can run the site locally with no network connection. The landing page, layout, and theme system still work. Account sign-in and saved progress need a live connection, so those parts stay unavailable while offline.

## Routes

- `/` trainer and round setup
- `/stats` progress dashboard
- `/login` sign-in
- `/signup` account creation
