-- SYNOPSIS: Database migration — 202604261.sql.
CREATE TABLE IF NOT EXISTS epistemic_facts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    fact_key TEXT NOT NULL UNIQUE,
    fact_value JSONB NOT NULL,
    source_receipt_id UUID,
    source_env_registry_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_epistemic_facts_fact_key ON epistemic_facts (fact_key);
CREATE INDEX IF NOT EXISTS idx_epistemic_facts_source_receipt_id ON epistemic_facts (source_receipt_id);
CREATE INDEX IF NOT EXISTS idx_epistemic_facts_source_env_registry_id ON epistemic_facts (source_env_registry_id);

-- Add a trigger to update the updated_at column on each change
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_epistemic_facts_updated_at') THEN
        CREATE TRIGGER set_epistemic_facts_updated_at
        BEFORE UPDATE ON epistemic_facts
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;