-- SYNOPSIS: Database migration — 20231012_coppa_compliance.sql.
CREATE TABLE IF NOT EXISTS coppa_compliance_reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    parent_email VARCHAR(255) NOT NULL,
    consent_obtained BOOLEAN DEFAULT FALSE,
    consent_date TIMESTAMPTZ,
    reviewer_id UUID,
    review_date TIMESTAMPTZ,
    status VARCHAR(50) DEFAULT 'pending',
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_coppa_compliance_reviews_user_id ON coppa_compliance_reviews(user_id);
CREATE INDEX IF NOT EXISTS idx_coppa_compliance_reviews_status ON coppa_compliance_reviews(status);

ALTER TABLE coppa_compliance_reviews ADD CONSTRAINT fk_user_id FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE coppa_compliance_reviews ADD CONSTRAINT fk_reviewer_id FOREIGN KEY (reviewer_id) REFERENCES users(id) ON DELETE SET NULL;

-- Add a column to the 'users' table to mark if a user is under COPPA age
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'is_coppa_age') THEN
        ALTER TABLE users ADD COLUMN is_coppa_age BOOLEAN DEFAULT FALSE;
    END IF;
END
$$;

-- Add a column to the 'users' table to track COPPA consent status
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'coppa_consent_status') THEN
        ALTER TABLE users ADD COLUMN coppa_consent_status VARCHAR(50) DEFAULT 'unknown'; -- 'unknown', 'pending', 'granted', 'denied'
    END IF;
END
$$;

-- Add a column to the 'users' table for parent email, if not already present
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'parent_email') THEN
        ALTER TABLE users ADD COLUMN parent_email VARCHAR(255);
    END IF;
END
$$;

-- Function to update 'updated_at' column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update 'updated_at' on coppa_compliance_reviews
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_coppa_compliance_reviews_updated_at') THEN
        CREATE TRIGGER set_coppa_compliance_reviews_updated_at
        BEFORE UPDATE ON coppa_compliance_reviews
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
    END IF;
END
$$;