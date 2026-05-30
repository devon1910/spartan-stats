# ⚽ SpartanStats

Mobile-first stats tracker for the weekly Tuesday football kickabout. Log goals and assists during the game, watch the leaderboard, dig into player profiles, and one-tap a polished summary into the group chat.

**Live:** [spartan-stats.vercel.app](https://spartan-stats.vercel.app/)

## Features

- **Goal-by-goal logging** — capture each goal with optional assister; per-player totals derive automatically
- **Leaderboard** — monthly / all-time toggle, podium for the top 3, last-5 form-guide chips
- **Monthly MVP card** — auto-generated with sub-awards: Top Scorer, Playmaker, Iron Man, Most Improved
- **Player profiles** — career totals, attendance %, best month, longest scoring streak, top chemistry partner
- **Goalkeepers** — fixed keepers get their own stat line: goals conceded per match day & month, clean sheets, goals-against average, longest clean-sheet run, plus a "Between the Sticks" leaderboard card crowning the monthly **Golden Glove**
- **Match Day Facts** — rule-based insights like "X has scored in 3 consecutive sessions" or "Y → Z is the top duo"
- **WhatsApp-ready sharing** — copy a formatted leaderboard, MVP card, or single fact straight to the clipboard

## Stack

- [Next.js 16](https://nextjs.org) (App Router) + React 19
- TypeScript
- [Tailwind CSS 4](https://tailwindcss.com)
- [Supabase](https://supabase.com) — Postgres + `@supabase/supabase-js`
- [lucide-react](https://lucide.dev) for icons

## Getting started

### 1. Clone and install

```bash
git clone https://github.com/devon1910/spartan-stats.git
cd spartan-stats
npm install
```

### 2. Environment

Create `.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>
```

### 3. Database

Foundational tables — run once in the Supabase SQL editor:

```sql
CREATE TABLE players (
  id   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL
);

CREATE TABLE sessions (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_date DATE UNIQUE NOT NULL
);

CREATE TABLE stats (
  session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
  player_id  UUID REFERENCES players(id),
  goals      INT NOT NULL DEFAULT 0,
  assists    INT NOT NULL DEFAULT 0,
  PRIMARY KEY (session_id, player_id)
);
```

Then apply the versioned `goal_events` migration — either via the Supabase CLI:

```bash
supabase db push --db-url "<session-pooler-uri>"
```

…or just push to `master` and let the included GitHub Action handle it (see [`.github/workflows/supabase-migrations.yml`](.github/workflows/supabase-migrations.yml) for the one required secret: `SUPABASE_DB_URL`).

### 4. Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Deployment

- **App** — any Next.js host (Vercel works out of the box). Set both `NEXT_PUBLIC_*` env vars in the dashboard.
- **Database** — migrations auto-apply via GitHub Actions on every push to `master` that touches `supabase/migrations/`. The workflow uses the Session pooler endpoint (port 5432); direct connection no longer offers IPv4 and the Transaction pooler rejects the advisory lock the CLI takes.

## Project layout

```
app/
  log/                  session entry page (calendar + roster + form)
  leaderboard/          leaderboard tab
  players/[id]/         player profile (dynamic route)
components/
  SessionForm           goal-by-goal logging UI
  Leaderboard           monthly / all-time table, podium, form chips
  MonthlyMVPCard        hero card with monthly sub-awards
  MatchDayFacts         auto-derived insights panel
  FormGuide             last-5 chips, reused on leaderboard + profile
  TuesdayCalendar       month picker showing logged + upcoming sessions
  PlayerInput           WhatsApp-paste parser for player rosters
lib/
  supabase.ts           lazy client (survives strict-privacy / iframe contexts)
supabase/migrations/    versioned schema additions
```
