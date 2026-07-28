-- SYNOPSIS: Database migration — 20241030_add_interactive_element_labels.sql.
CREATE TABLE IF NOT EXISTS interactive_element_labels (
    id SERIAL PRIMARY KEY,
    element_id INTEGER NOT NULL,
    label TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- fk_element intentionally skipped when interactive_elements doesn't exist:
-- confirmed live (2026-07-28) that no migration anywhere creates an
-- interactive_elements table, so this FK could never be satisfied as
-- written. Guarding on to_regclass rather than guessing a schema for a
-- table that was never actually built.
DO $$
BEGIN
  IF to_regclass('interactive_elements') IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_element'
  ) THEN
    ALTER TABLE interactive_element_labels
    ADD CONSTRAINT fk_element
    FOREIGN KEY (element_id)
    REFERENCES interactive_elements(id)
    ON DELETE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_interactive_element_labels_element_id ON interactive_element_labels(element_id);