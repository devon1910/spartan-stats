-- Reserved players let us attach goal events to bookkeeping concepts without
-- treating them as real squad members or showing them in public rankings.
ALTER TABLE players ADD COLUMN IF NOT EXISTS is_system BOOLEAN NOT NULL DEFAULT FALSE;

-- An own goal is stored as a normal goal event: Own Goal is the scorer and the
-- real player who forced it is the assister. This keeps assist totals accurate.
INSERT INTO players (name, is_system)
VALUES ('Own Goal', TRUE)
ON CONFLICT (name) DO UPDATE
SET is_system = TRUE,
    is_goalkeeper = FALSE;
