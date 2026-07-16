-- SYNOPSIS: Database migration — 20231012_coppa_compliance.sql.
CREATE TABLE IF NOT EXISTS coppa_compliance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    parental_consent BOOLEAN NOT NULL DEFAULT FALSE,
    date_of_consent TIMESTAMP,
    reviewer_id UUID,
    review_date TIMESTAMP,
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    CONSTRAINT fk_coppa_user
        FOREIGN KEY(user_id)
        REFERENCES users(id),
    CONSTRAINT fk_coppa_reviewer
        FOREIGN KEY(reviewer_id)
        REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_coppa_user_id ON coppa_compliance(user_id);
CREATE INDEX IF NOT EXISTS idx_coppa_status ON coppa_compliance(status);