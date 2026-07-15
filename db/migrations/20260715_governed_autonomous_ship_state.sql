-- SYNOPSIS: Persist governed autonomous shipping loop runtime state in Postgres
-- so GET /api/v1/lifeos/never-stop/status and the Chair chat report accurate
-- totalRuns/lastRunAt even after Railway redeploys the container.

CREATE TABLE IF NOT EXISTS governed_autonomous_ship_state (
  id text PRIMARY KEY,
  state jsonb NOT NULL DEFAULT '{}',
  updated_at timestamptz DEFAULT now()
);

INSERT INTO governed_autonomous_ship_state (id, state, updated_at)
VALUES ('singleton', '{}', now())
ON CONFLICT (id) DO NOTHING;
