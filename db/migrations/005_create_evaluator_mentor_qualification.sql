-- SYNOPSIS: Database migration — 005_create_evaluator_mentor_qualification.sql.
CREATE TABLE IF NOT EXISTS mentor_qualifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    qualification_name VARCHAR(255) NOT NULL,
    qualification_description TEXT,
    issued_by VARCHAR(255),
    issued_date DATE,
    expires_date DATE,
    status VARCHAR(50) DEFAULT 'active',
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_mentor_qualifications_user_id ON mentor_qualifications (user_id);
CREATE INDEX IF NOT EXISTS idx_mentor_qualifications_status ON mentor_qualifications (status);