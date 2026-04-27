-- @ssot docs/projects/AMENDMENT_39_MEMORY_INTELLIGENCE.md
-- Memory Intelligence System — Phase 1 Foundation
-- Evidence Ladder: CLAIM(0) → HYPOTHESIS(1) → TESTED(2) → RECEIPT(3) → VERIFIED(4) → FACT(5) → INVARIANT(6)
-- Separate from Governance Ladder (constitutional; lives in NSSOT). These never merge.
-- Design principle: not "what do we know?" but "what has earned the right to influence action, at what weight, in this context?"

-- ─── Core fact store ──────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS epistemic_facts (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  text            TEXT        NOT NULL,

  -- Domain classification (what kind of truth is this?)
  domain          VARCHAR(30) NOT NULL DEFAULT 'operational',
  -- constitutional | operational | empirical | strategic | user_belief

  -- Evidence ladder level (0–6; NEVER auto-labeled LAW — that is the governance ladder)
  level           SMALLINT    NOT NULL DEFAULT 0 CHECK (level BETWEEN 0 AND 6),
  -- 0=CLAIM, 1=HYPOTHESIS, 2=TESTED, 3=RECEIPT, 4=VERIFIED, 5=FACT, 6=INVARIANT

  -- Scope: most facts are conditionally true, not universally true
  context_required TEXT,        -- "Railway production", "Neon prod DB", "local shell with exports"
  false_when       TEXT,        -- conditions under which this fact does not hold

  -- How to attack this fact (systematic adversarial challenge)
  disproof_recipe  TEXT,        -- "fastest known way to try to break this fact"

  -- Evidence counters (updated on every fact_evidence insert via trigger or service)
  trial_count         INTEGER NOT NULL DEFAULT 0,
  adversarial_count   INTEGER NOT NULL DEFAULT 0,
  exception_count     INTEGER NOT NULL DEFAULT 0,
  source_count        INTEGER NOT NULL DEFAULT 1,  -- independent confirmations

  -- Freshness and decay
  last_tested_at  TIMESTAMPTZ,
  decay_rate      VARCHAR(10)  NOT NULL DEFAULT 'normal', -- slow | normal | fast
  review_by       TIMESTAMPTZ,   -- for HYPOTHESIS rows; auto-flag as STALE if expired

  -- Access control
  visibility_class VARCHAR(20) NOT NULL DEFAULT 'internal',
  -- internal | operator | tenant | public_pattern

  -- Canonical fact dedup: if this is an alias/restatement, point to the canonical
  canonical_id    UUID        REFERENCES epistemic_facts(id),

  -- Minority view that survived consensus — not discarded, not acted on, but preserved
  residue_risk    JSONB,
  -- { argument TEXT, confidence FLOAT, conditions_that_would_reopen TEXT }

  created_by      VARCHAR(100),   -- agent_id or "adam"
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_epistemic_facts_level   ON epistemic_facts(level);
CREATE INDEX IF NOT EXISTS idx_epistemic_facts_domain  ON epistemic_facts(domain);
CREATE INDEX IF NOT EXISTS idx_epistemic_facts_canonical ON epistemic_facts(canonical_id) WHERE canonical_id IS NOT NULL;

-- ─── Evidence log (every trial, confirmation, or exception) ──────────────────

CREATE TABLE IF NOT EXISTS fact_evidence (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  fact_id         UUID        NOT NULL REFERENCES epistemic_facts(id) ON DELETE CASCADE,

  event_type      VARCHAR(20) NOT NULL,
  -- confirmation | exception | adversarial | operator_override | ci_pass | ci_fail | replay

  result          VARCHAR(15) NOT NULL,
  -- confirmed | failed | held | overridden | inconclusive

  evidence_text   TEXT        NOT NULL,
  source          VARCHAR(100),   -- agent_id, "adam", "ci/smoke", "council/run-id"
  source_is_independent BOOLEAN  NOT NULL DEFAULT FALSE,

  -- For adversarial events: did the attack surface a real issue?
  adversarial_quality SMALLINT CHECK (adversarial_quality BETWEEN 0 AND 5),
  -- NULL = not adversarial, 0 = trivial/theater, 5 = found a real gap

  -- For operator_override events: reason code
  override_reason VARCHAR(50),  -- corrected | demoted_stale | promoted_verified | scope_change

  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fact_evidence_fact_id ON fact_evidence(fact_id);
CREATE INDEX IF NOT EXISTS idx_fact_evidence_event_type ON fact_evidence(event_type);

-- ─── Level history (append-only; facts never silently change level) ───────────

CREATE TABLE IF NOT EXISTS fact_level_history (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  fact_id         UUID        NOT NULL REFERENCES epistemic_facts(id) ON DELETE CASCADE,
  from_level      SMALLINT,
  to_level        SMALLINT    NOT NULL,
  reason          TEXT        NOT NULL,
  evidence_id     UUID        REFERENCES fact_evidence(id),
  changed_by      VARCHAR(100),
  changed_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fact_level_history_fact_id ON fact_level_history(fact_id);

-- ─── Retrieval events (cost vs value tracking) ────────────────────────────────

CREATE TABLE IF NOT EXISTS retrieval_events (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  fact_id         UUID        NOT NULL REFERENCES epistemic_facts(id) ON DELETE CASCADE,
  retrieved_by    VARCHAR(100),
  context         TEXT,         -- what task/lane triggered this retrieval
  acted_on        BOOLEAN,      -- did agent actually use this fact in a decision?
  retrieved_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_retrieval_events_fact_id ON retrieval_events(fact_id);

-- ─── Debate records (process that produced facts; separate from facts themselves) ──

CREATE TABLE IF NOT EXISTS debate_records (
  id                    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  subject               TEXT        NOT NULL,
  related_fact_id       UUID        REFERENCES epistemic_facts(id),

  -- Full debate structure
  initial_positions     JSONB       NOT NULL DEFAULT '[]',
  -- [{ agent, position, confidence, evidence_citations }]

  arguments             JSONB       NOT NULL DEFAULT '[]',
  -- [{ agent, argument, type: "for|against|challenge", timestamp }]

  what_moved_minds      TEXT,       -- specific evidence or reasoning that caused position changes
  consensus             TEXT,
  consensus_method      VARCHAR(30),  -- unanimous | majority | operator_override | timed_out
  consensus_reached_by  VARCHAR(100),

  -- What the process taught us about this class of problem
  lessons_learned       TEXT,
  problem_class         TEXT,       -- "routing decision" | "constitutional question" | "scope conflict" etc.

  -- Minority view that survived: preserved, not erased
  residue_risk          JSONB,
  -- { argument, confidence, conditions_that_would_reopen }

  council_run_id        TEXT,       -- if a real gate-change /run-council was used
  duration_minutes      SMALLINT,

  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at           TIMESTAMPTZ
);

-- ─── Lessons learned ──────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS lessons_learned (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  domain          TEXT        NOT NULL,
  impact_class    VARCHAR(10) NOT NULL DEFAULT 'medium', -- small | medium | large | unknown
  problem         TEXT        NOT NULL,
  solution        TEXT        NOT NULL,
  how_novel       TEXT,       -- "first known solution" | "rare" | "known but hard" | "standard"
  surfaced_by     VARCHAR(100),

  -- Passive ROI tracking
  retrieval_count   INTEGER   NOT NULL DEFAULT 0,
  last_retrieved_at TIMESTAMPTZ,
  write_cost_tokens INTEGER,  -- estimated tokens to record this lesson (bogging-down metric)

  tags            TEXT[]      NOT NULL DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lessons_domain ON lessons_learned(domain);
CREATE INDEX IF NOT EXISTS idx_lessons_impact ON lessons_learned(impact_class);
CREATE INDEX IF NOT EXISTS idx_lessons_tags ON lessons_learned USING GIN(tags);

-- ─── Agent performance (includes operator "adam") ─────────────────────────────

CREATE TABLE IF NOT EXISTS agent_performance (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id        VARCHAR(100) NOT NULL,  -- "claude_code" | "cursor" | "gemini" | "adam" | etc.
  task_type       VARCHAR(50)  NOT NULL,  -- "architecture" | "rapid_iteration" | "test_gen" | "spec_writing"
  prediction      TEXT,
  outcome         VARCHAR(20)  NOT NULL,  -- correct | incorrect | partial | overridden
  confidence_at_time SMALLINT,            -- agent's stated confidence 0–100
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_agent_performance_agent ON agent_performance(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_performance_task  ON agent_performance(task_type);

-- ─── Intent drift log (§2.11b asked-vs-shipped as memory event) ──────────────

CREATE TABLE IF NOT EXISTS intent_drift_events (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  session_date    DATE        NOT NULL DEFAULT CURRENT_DATE,
  asked           TEXT        NOT NULL,   -- what operator explicitly requested
  delivered       TEXT        NOT NULL,   -- what was actually shipped
  drift_reason    TEXT,                   -- why they diverged
  agent_id        VARCHAR(100),
  related_fact_id UUID        REFERENCES epistemic_facts(id),
  resolved        BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Helper view: retrieval ROI (bogging-down metric) ────────────────────────

CREATE OR REPLACE VIEW lesson_retrieval_roi AS
SELECT
  id,
  domain,
  impact_class,
  LEFT(problem, 80)       AS problem_short,
  retrieval_count,
  write_cost_tokens,
  CASE
    WHEN write_cost_tokens IS NULL OR write_cost_tokens = 0 THEN NULL
    WHEN retrieval_count = 0 THEN -write_cost_tokens
    ELSE ROUND((retrieval_count * 100.0 / NULLIF(write_cost_tokens, 0)), 1)
  END                     AS roi_score,  -- positive = worth it; negative = cost exceeded value
  created_at
FROM lessons_learned
ORDER BY roi_score ASC NULLS LAST;

-- ─── Helper view: stale hypotheses ───────────────────────────────────────────

CREATE OR REPLACE VIEW stale_hypotheses AS
SELECT id, text, domain, review_by, created_by, created_at
FROM epistemic_facts
WHERE level = 1  -- HYPOTHESIS
  AND review_by IS NOT NULL
  AND review_by < NOW()
ORDER BY review_by ASC;
