-- SYNOPSIS: Database migration — 008_define_token_budget.sql.
-- Backfills a default token_budget row if the table exists and the default row is missing.
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'token_budget') THEN
        -- Add context_name column if the legacy table is missing it.
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_schema = 'public' AND table_name = 'token_budget' AND column_name = 'context_name'
        ) THEN
            ALTER TABLE token_budget ADD COLUMN context_name VARCHAR(64) NOT NULL DEFAULT 'default';
        END IF;

        -- Ensure the default context row exists.
        IF NOT EXISTS (SELECT 1 FROM token_budget WHERE context_name = 'default') THEN
            INSERT INTO token_budget (context_name, max_tokens, truncation_strategy)
            VALUES ('default', 1000, 'end');
        END IF;
    END IF;
END $$;
