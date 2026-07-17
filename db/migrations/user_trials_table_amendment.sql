-- SYNOPSIS: Database migration — user_trials_table_amendment.sql.
CREATE TABLE IF NOT EXISTS user_trials (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    trial_started_at TIMESTAMP WITH TIME ZONE,
    trial_ended_at TIMESTAMP WITH TIME ZONE,
    status VARCHAR(50),
    CONSTRAINT fk_user
        FOREIGN KEY(user_id) 
	    REFERENCES users(id)
);