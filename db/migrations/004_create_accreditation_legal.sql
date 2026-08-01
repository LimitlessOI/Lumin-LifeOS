-- SYNOPSIS: Database migration — 004_create_accreditation_legal.sql.
CREATE TABLE IF NOT EXISTS accreditation_legal_structures (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id UUID NOT NULL,
    legal_name TEXT NOT NULL,
    entity_type TEXT NOT NULL, -- e.g., "Corporation", "LLC", "Non-Profit", "Partnership"
    registration_country TEXT NOT NULL,
    registration_state_province TEXT,
    registration_number TEXT,
    date_formed DATE,
    tax_id_number TEXT,
    website_url TEXT,
    contact_email TEXT,
    contact_phone TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_accreditation_legal_structures_institution_id ON accreditation_legal_structures (institution_id);