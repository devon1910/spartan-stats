-- Goalkeepers: Kusi and David are our two fixed keepers.
-- Their stat line is different from outfield players — instead of goals &
-- assists we track goals CONCEDED per match day. The month total is just the
-- sum of a keeper's conceded across that month's sessions, and a clean sheet
-- is any session they conceded 0.
--
-- We reuse the existing per-(session, player) `stats` table rather than adding
-- a parallel table: a keeper simply gets a stats row with goals = assists = 0
-- and goals_conceded > 0. This keeps attendance, the session form, and every
-- existing join working unchanged.

-- 1. Flag a player as a keeper.
ALTER TABLE players ADD COLUMN IF NOT EXISTS is_goalkeeper BOOLEAN NOT NULL DEFAULT FALSE;

-- 2. Goals conceded, on the existing per-session stat row. Meaningless (0) for
--    outfield players; the source of truth for keeper stats.
ALTER TABLE stats ADD COLUMN IF NOT EXISTS goals_conceded INT NOT NULL DEFAULT 0;

-- 3. Register the two fixed keepers (idempotent — also re-flags them if the
--    name already existed as an outfield player).
INSERT INTO players (name, is_goalkeeper)
VALUES ('Kusi', TRUE), ('David', TRUE)
ON CONFLICT (name) DO UPDATE SET is_goalkeeper = TRUE;

-- 4. Seed May 2026: each keeper conceded 8 goals across the month. We only know
--    the monthly total, not the per-match split, so spread the 8 as evenly as
--    possible over whatever May sessions exist (earliest sessions absorb the
--    remainder). The month total comes out to exactly 8 either way, and future
--    match days will be logged precisely through the session form.
--
--    Idempotent: ON CONFLICT overwrites goals_conceded, so re-running yields the
--    same distribution. (No-op once the migration is marked applied.)
WITH may_sessions AS (
  SELECT
    id,
    ROW_NUMBER() OVER (ORDER BY session_date) - 1 AS idx,
    COUNT(*) OVER ()                              AS n
  FROM sessions
  WHERE session_date >= DATE '2026-05-01'
    AND session_date <  DATE '2026-06-01'
),
keepers AS (
  SELECT id FROM players WHERE name IN ('Kusi', 'David')
)
INSERT INTO stats (session_id, player_id, goals, assists, goals_conceded)
SELECT
  s.id,
  k.id,
  0,
  0,
  (8 / s.n) + CASE WHEN s.idx < (8 % s.n) THEN 1 ELSE 0 END
FROM may_sessions s
CROSS JOIN keepers k
ON CONFLICT (session_id, player_id)
  DO UPDATE SET goals_conceded = EXCLUDED.goals_conceded;
