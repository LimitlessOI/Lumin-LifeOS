-- SYNOPSIS: Ensure migration_verification table exists and record 003_confirm_transcript_purge as applied.

CREATE TABLE IF NOT EXISTS migration_verification (
    id SERIAL PRIMARY KEY,
    migration_id TEXT UNIQUE NOT NULL,
    verified_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO migration_verification (migration_id, verified_at)
SELECT '003_confirm_transcript_purge', NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM migration_verification WHERE migration_id = '003_confirm_transcript_purge'
);
