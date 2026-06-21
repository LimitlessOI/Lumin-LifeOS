-- SYNOPSIS: Database migration — 20260609_deliberation_governance_v27.sql.
-- Deliberation governance v2.7 — CnclRoster, consensus, scorecard, Hist case, CFO receipts, evidence vault
-- @ssot docs/projects/AMENDMENT_48_BUILDEROS_VOCABULARY.md v2.7

CREATE TABLE IF NOT EXISTS cncl_rosters (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id          TEXT UNIQUE NOT NULL,
    objective_id        TEXT,
    project_slug        TEXT,
    decision_type       TEXT,
    authorities           JSONB NOT NULL DEFAULT '[]'::jsonb,
    reps                  JSONB NOT NULL DEFAULT '[]'::jsonb,
    models                JSONB NOT NULL DEFAULT '[]'::jsonb,
    partial               BOOLEAN NOT NULL DEFAULT true,
    roster_used           JSONB,
    audit_expanded_roster JSONB,
    expand_reason         TEXT,
    founder_priority_mode BOOLEAN NOT NULL DEFAULT false,
    metadata_json         JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cncl_rosters_objective
    ON cncl_rosters (objective_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_cncl_rosters_project
    ON cncl_rosters (project_slug, created_at DESC);

CREATE TABLE IF NOT EXISTS consensus_sessions (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    roster_id               UUID REFERENCES cncl_rosters(id) ON DELETE SET NULL,
    session_id              TEXT NOT NULL,
    original_positions      JSONB NOT NULL DEFAULT '[]'::jsonb,
    brainstorm_ids          JSONB NOT NULL DEFAULT '[]'::jsonb,
    final_synthesis         TEXT,
    position_e_or_k_found   BOOLEAN NOT NULL DEFAULT false,
    participants            JSONB NOT NULL DEFAULT '[]'::jsonb,
    vote_counts             JSONB,
    confidence_avg          NUMERIC(4, 3),
    grade                   CHAR(1),
    predicted_outcome       TEXT,
    protocol_version        TEXT NOT NULL DEFAULT 'v2.7',
    future_back_horizons    JSONB NOT NULL DEFAULT '{}'::jsonb,
    competitive_scan        JSONB NOT NULL DEFAULT '[]'::jsonb,
    metadata_json           JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_consensus_sessions_session
    ON consensus_sessions (session_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_consensus_sessions_roster
    ON consensus_sessions (roster_id);

CREATE TABLE IF NOT EXISTS composition_scorecard_entries (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    roster_id           UUID REFERENCES cncl_rosters(id) ON DELETE SET NULL,
    session_id          TEXT,
    decision_type       TEXT NOT NULL,
    authorities         JSONB NOT NULL DEFAULT '[]'::jsonb,
    reps                JSONB NOT NULL DEFAULT '[]'::jsonb,
    model_count         INT NOT NULL DEFAULT 0,
    partial             BOOLEAN NOT NULL DEFAULT true,
    outcome_grade       CHAR(1),
    cost_usd            NUMERIC(12, 6),
    token_count         BIGINT,
    latency_ms          INT,
    audit_expanded      BOOLEAN NOT NULL DEFAULT false,
    expand_reason       TEXT,
    notes               TEXT,
    metadata_json       JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_composition_scorecard_decision
    ON composition_scorecard_entries (decision_type, created_at DESC);

CREATE TABLE IF NOT EXISTS hist_dept_cases (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id          TEXT NOT NULL,
    roster_id           UUID REFERENCES cncl_rosters(id) ON DELETE SET NULL,
    problem             TEXT,
    case_text           TEXT NOT NULL,
    ideas               JSONB NOT NULL DEFAULT '[]'::jsonb,
    opportunity         TEXT,
    evidence_links      JSONB NOT NULL DEFAULT '[]'::jsonb,
    uncertainty         TEXT NOT NULL DEFAULT 'THINK',
    metadata_json       JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_hist_dept_cases_session
    ON hist_dept_cases (session_id, created_at DESC);

CREATE TABLE IF NOT EXISTS cfo_deliberation_receipts (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id              TEXT NOT NULL,
    roster_id               UUID REFERENCES cncl_rosters(id) ON DELETE SET NULL,
    dept                    TEXT,
    role                    TEXT,
    model                   TEXT,
    tokens                  INT,
    cost_usd                NUMERIC(12, 6),
    routing_change          JSONB,
    cheaper_path_available  BOOLEAN,
    founder_priority_mode   BOOLEAN NOT NULL DEFAULT false,
    metadata_json           JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cfo_deliberation_receipts_session
    ON cfo_deliberation_receipts (session_id, created_at DESC);

CREATE TABLE IF NOT EXISTS evidence_vault_entries (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_type     TEXT NOT NULL,
    source_ref      TEXT,
    content_hash    TEXT,
    storage_path    TEXT,
    metadata_json   JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_evidence_vault_source
    ON evidence_vault_entries (source_type, created_at DESC);

CREATE TABLE IF NOT EXISTS deliberation_gate_records (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id              TEXT UNIQUE NOT NULL,
    mission_id              TEXT,
    objective_id            TEXT,
    roster_id               UUID REFERENCES cncl_rosters(id) ON DELETE SET NULL,
    hist_case_id            UUID REFERENCES hist_dept_cases(id) ON DELETE SET NULL,
    consensus_session_id    UUID REFERENCES consensus_sessions(id) ON DELETE SET NULL,
    cfo_receipt_count       INT NOT NULL DEFAULT 0,
    gate_status             TEXT NOT NULL DEFAULT 'PENDING',
    violations              JSONB NOT NULL DEFAULT '[]'::jsonb,
    metadata_json           JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    passed_at               TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_deliberation_gate_mission
    ON deliberation_gate_records (mission_id, created_at DESC);
