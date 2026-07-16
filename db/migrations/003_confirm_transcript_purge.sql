-- SYNOPSIS: Database migration — 003_confirm_transcript_purge.sql.
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

CREATE TABLE IF NOT EXISTS transcript_purge_verification (
    id SERIAL PRIMARY KEY,
    verified_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO transcript_purge_verification (verified_at)
SELECT NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM transcript_purge_verification
);