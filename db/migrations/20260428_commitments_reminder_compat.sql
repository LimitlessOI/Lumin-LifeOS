-- Bridge Word Keeper + LifeOS core shapes on `commitments` (same table name, different evolutions).
-- Reminder cron and some integrity queries reference both naming styles.

BEGIN;

-- Word Keeper–style columns (may be missing on LifeOS-first DBs)
ALTER TABLE commitments ADD COLUMN IF NOT EXISTS to_person TEXT;
ALTER TABLE commitments ADD COLUMN IF NOT EXISTS normalized_text TEXT;
ALTER TABLE commitments ADD COLUMN IF NOT EXISTS raw_text TEXT;
ALTER TABLE commitments ADD COLUMN IF NOT EXISTS deadline TIMESTAMPTZ;
ALTER TABLE commitments ADD COLUMN IF NOT EXISTS remind_audible BOOLEAN DEFAULT FALSE;

-- LifeOS-style columns (may be missing on Word Keeper–first DBs)
ALTER TABLE commitments ADD COLUMN IF NOT EXISTS committed_to TEXT;
ALTER TABLE commitments ADD COLUMN IF NOT EXISTS title TEXT;
ALTER TABLE commitments ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE commitments ADD COLUMN IF NOT EXISTS due_at TIMESTAMPTZ;

-- Backfill: keep both sides loosely in sync where one side is empty.
UPDATE commitments
SET to_person = committed_to
WHERE to_person IS NULL AND committed_to IS NOT NULL;

UPDATE commitments
SET committed_to = to_person
WHERE committed_to IS NULL AND to_person IS NOT NULL;

UPDATE commitments
SET normalized_text = COALESCE(NULLIF(trim(description), ''), title)
WHERE normalized_text IS NULL AND (title IS NOT NULL OR description IS NOT NULL);

UPDATE commitments
SET title = LEFT(COALESCE(raw_text, normalized_text), 2000)
WHERE title IS NULL AND (raw_text IS NOT NULL OR normalized_text IS NOT NULL);

UPDATE commitments
SET raw_text = COALESCE(title, normalized_text)
WHERE raw_text IS NULL AND (title IS NOT NULL OR normalized_text IS NOT NULL);

UPDATE commitments
SET deadline = due_at
WHERE deadline IS NULL AND due_at IS NOT NULL;

UPDATE commitments
SET due_at = deadline
WHERE due_at IS NULL AND deadline IS NOT NULL;

COMMIT;
