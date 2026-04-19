-- Migration: 20260418_lifeos_weekly_review
-- LifeOS Weekly Review — AI-generated weekly narrative + interactive conversation session
--
-- The system generates a weekly letter for each user (Sunday evening).
-- The user can then open a conversation with the system about that week:
-- asking questions, challenging observations, making commitments, changing priorities.
-- Any actions agreed to in the conversation are extracted and written back into LifeOS.
--
-- @ssot docs/projects/AMENDMENT_21_LIFEOS_CORE.md

BEGIN;

-- ── Weekly review documents ───────────────────────────────────────────────────
-- One per user per week. Generated automatically, readable any time.
CREATE TABLE IF NOT EXISTS weekly_reviews (
  id             BIGSERIAL PRIMARY KEY,
  user_id        BIGINT NOT NULL REFERENCES lifeos_users(id) ON DELETE CASCADE,
  week_start     DATE NOT NULL,                    -- Monday of the reviewed week
  week_end       DATE NOT NULL,                    -- Sunday of the reviewed week
  narrative_text TEXT NOT NULL,                    -- the AI-written weekly letter
  data_snapshot  JSONB,                            -- raw scores/stats used to generate it
  status         TEXT NOT NULL DEFAULT 'delivered' -- draft | delivered | reviewed
                 CHECK (status IN ('draft', 'delivered', 'reviewed')),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, week_start)
);

CREATE INDEX IF NOT EXISTS idx_weekly_reviews_user ON weekly_reviews(user_id, week_start DESC);

-- ── Conversation sessions ─────────────────────────────────────────────────────
-- A user may open one conversation per review. The session persists — they can
-- close it and come back. The conversation is grounded in that week's data.
CREATE TABLE IF NOT EXISTS weekly_review_sessions (
  id          BIGSERIAL PRIMARY KEY,
  review_id   BIGINT NOT NULL REFERENCES weekly_reviews(id) ON DELETE CASCADE,
  user_id     BIGINT NOT NULL REFERENCES lifeos_users(id) ON DELETE CASCADE,
  status      TEXT NOT NULL DEFAULT 'active'   -- active | closed
              CHECK (status IN ('active', 'closed')),
  started_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_active TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(review_id)   -- one session per review
);

CREATE INDEX IF NOT EXISTS idx_wrs_user ON weekly_review_sessions(user_id);

-- ── Conversation messages ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS weekly_review_messages (
  id         BIGSERIAL PRIMARY KEY,
  session_id BIGINT NOT NULL REFERENCES weekly_review_sessions(id) ON DELETE CASCADE,
  role       TEXT NOT NULL CHECK (role IN ('assistant', 'user')),
  content    TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_wrm_session ON weekly_review_messages(session_id, created_at ASC);

-- ── Actions extracted from conversation ───────────────────────────────────────
-- As the conversation progresses, the AI extracts commitments, goal updates,
-- and priority changes agreed to by the user. These are staged here before
-- being applied back into LifeOS tables.
CREATE TABLE IF NOT EXISTS weekly_review_actions (
  id           BIGSERIAL PRIMARY KEY,
  session_id   BIGINT NOT NULL REFERENCES weekly_review_sessions(id) ON DELETE CASCADE,
  action_type  TEXT NOT NULL
               CHECK (action_type IN (
                 'create_commitment',
                 'update_goal',
                 'add_note',
                 'set_priority',
                 'log_moment',
                 'schedule_event'
               )),
  payload      JSONB NOT NULL,    -- action-specific data (title, date, etc.)
  applied      BOOLEAN NOT NULL DEFAULT FALSE,
  applied_at   TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_wra_session ON weekly_review_actions(session_id);

COMMIT;
