-- Conflict interruption user preferences (per-user)
-- Enables gentle intervention checks in Lumin chat and conflict routes.

ALTER TABLE lifeos_users
  ADD COLUMN IF NOT EXISTS conflict_interrupt_enabled BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS conflict_interrupt_sensitivity TEXT DEFAULT 'medium'
    CHECK (conflict_interrupt_sensitivity IN ('low', 'medium', 'high'));
