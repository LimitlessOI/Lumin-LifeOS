-- BPB-0001 Mission Runtime v1 — Phase 1 DB migration
-- PRESCRIBED: do not deviate from column names, types, or constraints
-- Authority: docs/projects/BPB-0001-MISSION-RUNTIME-V1.md §Section 1
-- MISSION-0001: Adam + Sherry Household Reliability and Income Engine

-- 1. missions — parent object for all system actions
CREATE TABLE IF NOT EXISTS missions (
    id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    slug             TEXT        UNIQUE NOT NULL,
    title            TEXT        NOT NULL,
    purpose          TEXT,
    state            TEXT        NOT NULL DEFAULT 'Proposed',
    authority_class  TEXT        NOT NULL DEFAULT 'Supervised',
    owner            TEXT        NOT NULL DEFAULT 'adam',
    blueprint_ref    TEXT,
    metadata_json    JSONB       NOT NULL DEFAULT '{}',
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. mission_participants — who is involved and in what role
CREATE TABLE IF NOT EXISTS mission_participants (
    id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    mission_id    UUID        NOT NULL REFERENCES missions(id) ON DELETE CASCADE,
    participant   TEXT        NOT NULL,
    role          TEXT        NOT NULL DEFAULT 'contributor',
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(mission_id, participant)
);

-- 3. mission_state_transitions — the mission ledger
-- Current state is denormalized onto missions.state for fast reads.
-- Full history is here.
CREATE TABLE IF NOT EXISTS mission_state_transitions (
    id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    mission_id       UUID        NOT NULL REFERENCES missions(id) ON DELETE CASCADE,
    from_state       TEXT        NOT NULL,
    to_state         TEXT        NOT NULL,
    transitioned_by  TEXT        NOT NULL,
    note             TEXT,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. commitments — "I'll do it" captures with capacity/opportunity-cost fields
CREATE TABLE IF NOT EXISTS commitments (
    id                    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    mission_id            UUID        REFERENCES missions(id) ON DELETE SET NULL,
    owner                 TEXT        NOT NULL,
    text                  TEXT        NOT NULL,
    due_date              DATE,
    reminder_at           TIMESTAMPTZ,
    risk_if_missed        TEXT,
    status                TEXT        NOT NULL DEFAULT 'open',
    time_estimate_hours   NUMERIC(5,2),
    urgency               SMALLINT    CHECK (urgency BETWEEN 1 AND 5),
    importance            SMALLINT    CHECK (importance BETWEEN 1 AND 5),
    energy_cost           SMALLINT    CHECK (energy_cost BETWEEN 1 AND 5),
    money_impact          SMALLINT    CHECK (money_impact BETWEEN 1 AND 5),
    relationship_impact   SMALLINT    CHECK (relationship_impact BETWEEN 1 AND 5),
    opportunity_cost_note TEXT,
    better_owner          TEXT,
    approval_required     BOOLEAN     NOT NULL DEFAULT FALSE,
    approved_by           TEXT,
    approved_at           TIMESTAMPTZ,
    created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Attach mission_id to C2 jobs so every build action traces to a mission
ALTER TABLE builderos_command_control_jobs
    ADD COLUMN IF NOT EXISTS mission_id UUID REFERENCES missions(id) ON DELETE SET NULL;

-- 6. Attach mission_id to historian_lessons if that table exists
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'historian_lessons'
    ) THEN
        ALTER TABLE historian_lessons
            ADD COLUMN IF NOT EXISTS mission_id UUID REFERENCES missions(id) ON DELETE SET NULL;
    END IF;
END$$;

-- 7. Seed MISSION-0001
INSERT INTO missions (slug, title, purpose, state, authority_class, owner, blueprint_ref)
VALUES (
    'MISSION-0001',
    'Adam + Sherry Household Reliability and Income Engine',
    'Build the first usable LifeOS mission that helps Adam and Sherry manage shared life, commitments, capacity, conflict, money opportunities, and task delegation.',
    'Approved',
    'Founder Required',
    'adam',
    'docs/projects/BPB-0001-MISSION-RUNTIME-V1.md'
) ON CONFLICT (slug) DO NOTHING;

INSERT INTO mission_participants (mission_id, participant, role)
SELECT id, 'adam', 'owner' FROM missions WHERE slug = 'MISSION-0001'
ON CONFLICT (mission_id, participant) DO NOTHING;

INSERT INTO mission_participants (mission_id, participant, role)
SELECT id, 'sherry', 'contributor' FROM missions WHERE slug = 'MISSION-0001'
ON CONFLICT (mission_id, participant) DO NOTHING;
