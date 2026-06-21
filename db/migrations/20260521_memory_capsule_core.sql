-- SYNOPSIS: Database migration — 20260521_memory_capsule_core.sql.
-- db/migrations/20260521_memory_capsule_core.sql

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- epistemic_facts (ALTER only — add missing columns)
ALTER TABLE epistemic_facts
ADD COLUMN IF NOT EXISTS decay_rate VARCHAR(10) DEFAULT 'normal';
ALTER TABLE epistemic_facts
ADD COLUMN IF NOT EXISTS review_by TIMESTAMPTZ;

-- memory_capsules (CREATE IF NOT EXISTS)
CREATE TABLE IF NOT EXISTS memory_capsules (
    capsule_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    fact_id UUID REFERENCES epistemic_facts(id),
    title TEXT NOT NULL,
    capsule_type TEXT NOT NULL,
    truth_class TEXT NOT NULL CHECK (truth_class IN ('objective','inferential','probabilistic','procedural','symbolic','emotional','relationship','preference','institutional','document_truth')),
    trust_level TEXT NOT NULL DEFAULT 'PROPOSED' CHECK (trust_level IN ('UNTRUSTED','PROPOSED','SCOPED','RECEIPT_BACKED','TRUSTED_FOR_CONTEXT','CANONICAL','QUARANTINED','DEPRECATED')),
    evidence_level TEXT NOT NULL DEFAULT 'CLAIM' CHECK (evidence_level IN ('CLAIM','HYPOTHESIS','TESTED','RECEIPT','VERIFIED','FACT','INVARIANT')),
    sensitivity TEXT NOT NULL DEFAULT 'STANDARD' CHECK (sensitivity IN ('STANDARD','HIGH','SENSITIVE')),
    source_type TEXT NOT NULL CHECK (source_type IN ('founder_input','user_input','system_observation','legacy_import','council_output','external_signal','working_memory_entry','institutional_record')),
    source_ref TEXT,
    retrieval_permission TEXT NOT NULL DEFAULT 'context_only' CHECK (retrieval_permission IN ('context_only','decision_support','action_authority','blocked')),
    task_scope TEXT,
    retrieval_lane_ceiling TEXT CHECK (retrieval_lane_ceiling IN ('context_lane','decision_support_lane','action_authority_lane','review_lane','relationship_sensitive_lane')),
    canonical_statement_id UUID,
    fact_family_id UUID,
    review_by TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '30 days'),
    status TEXT NOT NULL DEFAULT 'PROPOSED',
    legacy_import_method TEXT,
    review_required BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- working_memory_entries (CREATE IF NOT EXISTS)
CREATE TABLE IF NOT EXISTS working_memory_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL,
    capsule_id UUID REFERENCES memory_capsules(capsule_id),
    task_scope TEXT,
    retrieval_lane TEXT,
    entry_content TEXT,
    injected_at TIMESTAMPTZ DEFAULT NOW(),
    used_in_decision BOOLEAN DEFAULT FALSE,
    decision_ref TEXT,
    promoted_to_candidate BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
