# Mental Math Studio

A focused mental arithmetic trainer with user accounts, progress tracking, and multiple visual themes.

## Stack
- **Next.js 14** — pages router, API routes
- **Prisma** — database ORM
- **NextAuth** — authentication
- **Tailwind CSS** — utility styling
- **Chart.js** — progress visualisation

## Features
- Timed training rounds across arithmetic operations
- Per-round results with accuracy and speed breakdown
- Progress dashboard with historical charts
- User accounts — login and signup with password strength validation
- Multiple visual themes (Velvet Circuit, Paper Lantern, Acid Lemon Lobby, Apothecary Glass, Vinyl After Rain, and more)
- Theme switcher persisted to localStorage

## Setup
1. Install dependencies:
   ```bash
   npm install
   ```
2. Copy `.env.example` to `.env.local` and fill in the required values.
3. Run database migrations:
   ```bash
   npx prisma migrate deploy
   ```
4. Start the development server:
   ```bash
   npm run dev
   ```

## Routes
| Path | Description |
|------|-------------|
| `/` | Trainer — configure and run arithmetic rounds |
| `/stats` | Progress dashboard — charts and history |
| `/login` | Email/password login |
| `/signup` | Account creation with password strength meter |
