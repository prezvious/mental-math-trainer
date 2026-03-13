# Mental Math Studio

A full redesign of the original trainer with a new layout, Supabase auth, and Supabase-backed progress logging.

## Stack
- Next.js
- Supabase Auth + Postgres
- Plain semantic HTML in React pages
- Custom CSS design system

## Setup
1. Install dependencies:
   ```bash
   npm install
   ```
2. Add environment values (see `.env.example`):
   ```bash
   NEXT_PUBLIC_SUPABASE_URL=...
   NEXT_PUBLIC_SUPABASE_ANON_KEY=...
   ```
3. In Supabase SQL editor, run:
   - `supabase/migrations/20260313_create_progress_logs.sql`
4. Start the app:
   ```bash
   npm run dev
   ```

## Routes
- `/` Trainer and round runner
- `/stats` Progress dashboard from Supabase logs
- `/login` Supabase email/password login
- `/signup` Supabase email/password signup
