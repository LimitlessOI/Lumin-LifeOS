-- SYNOPSIS: Database migration — 20231012_coppa_compliance.sql.
CREATE TABLE IF NOT EXISTS coppa_compliance (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    parental_consent BOOLEAN NOT NULL DEFAULT FALSE,
    date_of_consent TIMESTAMP,
    reviewer_id INTEGER,
    review_date TIMESTAMP,
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    CONSTRAINT fk_user
        FOREIGN KEY(user_id) 
        REFERENCES users(id),
    CONSTRAINT fk_reviewer
        FOREIGN KEY(reviewer_id)
        REFERENCES reviewers(id)
);

CREATE INDEX IF NOT EXISTS idx_coppa_user_id ON coppa_compliance(user_id);
CREATE INDEX IF NOT EXISTS idx_coppa_status ON coppa_compliance(status);