-- SYNOPSIS: Database migration — addStruggleDetectionFormFill.sql.
-- user_id is UUID, not INTEGER: confirmed live (2026-07-28) that this
-- migration had never once succeeded ("foreign key constraint 'fk_user'
-- cannot be implemented ... integer and uuid") because users.id is uuid
-- (gen_random_uuid() default) in the real, current schema — a later
-- migration superseded 001_create_tables.sql's original SERIAL design and
-- this file was never updated to match.
CREATE TABLE IF NOT EXISTS struggle_detection_form_fill (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL,
    form_name VARCHAR(255) NOT NULL,
    field_name VARCHAR(255) NOT NULL,
    struggle_detected BOOLEAN DEFAULT FALSE,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_user
        FOREIGN KEY(user_id)
        REFERENCES users(id)
        ON DELETE CASCADE
);