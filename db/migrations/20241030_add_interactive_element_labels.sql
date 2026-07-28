-- SYNOPSIS: Database migration — 20241030_add_interactive_element_labels.sql.
CREATE TABLE IF NOT EXISTS interactive_element_labels (
    id SERIAL PRIMARY KEY,
    element_id INTEGER NOT NULL,
    label TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

DO $$
BEGIN
  IF NOT EXISTS (
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