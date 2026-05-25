-- goal_events: one row per goal scored, optionally linking the assister.
-- This is the source of truth for chemistry, milestones, and facts.
-- The existing `stats` table is kept as a denormalized cache of counts per
-- (session, player). The session form dual-writes both.

CREATE TABLE IF NOT EXISTS goal_events (
  id          BIGSERIAL PRIMARY KEY,
  session_id  UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  scorer_id   UUID REFERENCES players(id),
  assister_id UUID REFERENCES players(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT goal_events_has_actor CHECK (scorer_id IS NOT NULL OR assister_id IS NOT NULL),
  CONSTRAINT goal_events_distinct_actors CHECK (scorer_id IS NULL OR assister_id IS NULL OR scorer_id <> assister_id)
);

CREATE INDEX IF NOT EXISTS idx_goal_events_session  ON goal_events(session_id);
CREATE INDEX IF NOT EXISTS idx_goal_events_scorer   ON goal_events(scorer_id);
CREATE INDEX IF NOT EXISTS idx_goal_events_assister ON goal_events(assister_id);

-- Backfill from existing stats: produce one event per historical goal
-- (with no assister), and one event per historical assist (with no scorer).
-- Lossy — past sessions won't show chemistry — but going forward the
-- redesigned session form captures the scorer↔assister pairing.
--
-- Idempotent: skips sessions that already have any goal_events.
INSERT INTO goal_events (session_id, scorer_id, assister_id)
SELECT s.session_id, s.player_id, NULL
FROM stats s
CROSS JOIN LATERAL generate_series(1, s.goals) AS g
WHERE s.goals > 0
  AND NOT EXISTS (SELECT 1 FROM goal_events e WHERE e.session_id = s.session_id);

INSERT INTO goal_events (session_id, scorer_id, assister_id)
SELECT s.session_id, NULL, s.player_id
FROM stats s
CROSS JOIN LATERAL generate_series(1, s.assists) AS g
WHERE s.assists > 0
  AND NOT EXISTS (
    SELECT 1 FROM goal_events e
    WHERE e.session_id = s.session_id AND e.assister_id IS NOT NULL
  );
