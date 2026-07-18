-- SYNOPSIS: Database migration — addStruggleDetectionFormFill.sql.
CREATE TABLE IF NOT EXISTS struggle_detection_form_fill (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    form_name VARCHAR(255) NOT NULL,
    field_name VARCHAR(255) NOT NULL,
    struggle_detected BOOLEAN DEFAULT FALSE,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_user
        FOREIGN KEY(user_id) 
        REFERENCES users(id)
        ON DELETE CASCADE
);