-- Migration: 20260406b_lifeos_conflict_clarity.sql
-- Extends coaching_sessions with emotional state tracking and pre-conversation prep.
-- Adds: emotional_state, delivery_style, pre_conversation_prep columns.

BEGIN;

ALTER TABLE coaching_sessions ADD COLUMN IF NOT EXISTS emotional_state        TEXT;
ALTER TABLE coaching_sessions ADD COLUMN IF NOT EXISTS delivery_style         TEXT;
ALTER TABLE coaching_sessions ADD COLUMN IF NOT EXISTS pre_conversation_prep  JSONB;

-- Extend the session_type CHECK constraint to include 'individual_clarity'.
-- Drop and recreate because PostgreSQL does not support ALTER CONSTRAINT ... ADD VALUE
-- on CHECK constraints.
ALTER TABLE coaching_sessions DROP CONSTRAINT IF EXISTS coaching_sessions_type_check;
ALTER TABLE coaching_sessions ADD CONSTRAINT coaching_sessions_type_check CHECK (
  session_type IN ('post_conflict', 'live_interrupt', 'pattern_review', 'proactive', 'individual_clarity')
);

COMMIT;
