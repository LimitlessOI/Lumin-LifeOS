-- SYNOPSIS: Database migration — create_user_trials_table.sql.
CREATE TABLE IF NOT EXISTS user_trials (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    trial_date DATE NOT NULL,
    trial_result VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);