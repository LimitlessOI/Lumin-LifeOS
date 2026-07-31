-- SYNOPSIS: Database migration — add_doctrine_profiles.sql.
CREATE TABLE IF NOT EXISTS DoctrineProfiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_data JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_doctrineprofiles_created_at ON DoctrineProfiles(created_at);
CREATE INDEX IF NOT EXISTS idx_doctrineprofiles_updated_at ON DoctrineProfiles(updated_at);