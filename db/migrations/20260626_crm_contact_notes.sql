-- SYNOPSIS: CRM contact notes for ambient capture and internal CRM write-back.
-- @ssot docs/projects/AMENDMENT_21_LIFEOS_CORE.md

CREATE TABLE IF NOT EXISTS crm_contact_notes (
  id SERIAL PRIMARY KEY,
  contact_id INTEGER REFERENCES crm_contacts(id) ON DELETE CASCADE,
  user_id TEXT,
  note TEXT NOT NULL,
  source TEXT DEFAULT 'lifeos-ambient',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_crm_contact_notes_contact ON crm_contact_notes(contact_id);
CREATE INDEX IF NOT EXISTS idx_crm_contact_notes_user ON crm_contact_notes(user_id);
