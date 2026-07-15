-- SYNOPSIS: Database migration — 20231015_create_likeness_consent.sql.
CREATE TABLE IF NOT EXISTS likeness_consent (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL,
    consent_given BOOLEAN NOT NULL,
    consent_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_user FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);