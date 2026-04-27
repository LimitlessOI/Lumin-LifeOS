-- Migration: Conflict Interrupts Table
-- Created: 2026-04-27
-- Purpose: Track conflict interruption events and their resolution status

CREATE TABLE IF NOT EXISTS conflict_interrupts (
    id BIGSERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    partner_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    triggered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    trigger_source TEXT NOT NULL CHECK (trigger_source IN ('manual', 'keyword_detection', 'tone_detection', 'escalation')),
    conflict_context TEXT,
    interrupt_type TEXT NOT NULL CHECK (interrupt_type IN ('pause', 'reframe', 'exit', 'notify_partner')),
    resolution_status TEXT NOT NULL DEFAULT 'pending' CHECK (resolution_status IN ('pending', 'resolved', 'escalated', 'abandoned')),
    resolved_at TIMESTAMPTZ,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for efficient user-based queries sorted by most recent
CREATE INDEX idx_conflict_interrupts_user_triggered 
    ON conflict_interrupts(user_id, triggered_at DESC);

-- Index for partner-based queries (when partner_id is not null)
CREATE INDEX idx_conflict_interrupts_partner 
    ON conflict_interrupts(partner_id, triggered_at DESC) 
    WHERE partner_id IS NOT NULL;

-- Index for resolution status queries
CREATE INDEX idx_conflict_interrupts_resolution 
    ON conflict_interrupts(resolution_status, triggered_at DESC);

-- Add comment for documentation
COMMENT ON TABLE conflict_interrupts IS 'Tracks conflict interruption events triggered by the Conflict Intelligence system';
COMMENT ON COLUMN conflict_interrupts.trigger_source IS 'How the interrupt was triggered: manual (user-initiated), keyword_detection (Four Horsemen keywords), tone_detection (LLM tone analysis), escalation (combined signals)';
COMMENT ON COLUMN conflict_interrupts.interrupt_type IS 'Type of intervention: pause (suggest break), reframe (offer rewrite), exit (suggest ending conversation), notify_partner (alert partner)';
COMMENT ON COLUMN conflict_interrupts.resolution_status IS 'Current status: pending (active), resolved (conflict resolved), escalated (moved to mediation), abandoned (user dismissed)';
---METADATA---
```json
{
  "target_file": "db/migrations/20260427_lifeos_conflict_interrupts.sql",
  "insert_after_line": null,
  "confidence": 0.95
}
```