# Mental Math Studio

Mental Math Studio is a focused arithmetic trainer with two drill formats:

- Standard rounds for one operation at a time
- Mixed rounds that rotate across enabled operations and difficulty levels

Signed-in users can persist progress to Supabase and review it on the stats dashboard.

## Routes

- `/` standard trainer
- `/mixed` mixed trainer
- `/stats` progress dashboard
- `/login` sign-in
- `/signup` account creation

## Running Locally

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

Set these public Supabase variables in `.env.local`:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

These `NEXT_PUBLIC_*` values are build-time inputs. After changing them, restart `npm run dev`. On Vercel, changing them requires a fresh redeploy.

Start the app:

```bash
npm run dev
```

Open `http://localhost:3000`.

## Progress Sync

If Supabase is not configured, the trainers still run locally, but sign-in and saved progress stay unavailable. Once the public Supabase variables are present and the app is rebuilt, account sync becomes available again.
