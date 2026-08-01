-- SYNOPSIS: Database migration — create_user_trials_table.sql.
-- @ssot docs/products/business-tools/PRODUCT_HOME.md
CREATE TABLE IF NOT EXISTS user_trials (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    trial_start TIMESTAMP NOT NULL,
    trial_end TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_user_trials_user_id ON user_trials(user_id);