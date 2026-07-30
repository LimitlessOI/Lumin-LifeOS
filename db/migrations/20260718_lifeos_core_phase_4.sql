-- SYNOPSIS: Database migration — 20260718_lifeos_core_phase_4.sql.
CREATE TABLE IF NOT EXISTS phase_4_table (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_phase_4_table_name ON phase_4_table (name);

-- Add any other necessary tables or modifications for Phase 4 here.
-- Example:
-- CREATE TABLE IF NOT EXISTS phase_4_sub_feature (
--     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
--     phase_4_id UUID NOT NULL REFERENCES phase_4_table(id) ON DELETE CASCADE,
--     detail TEXT,
--     created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
-- );