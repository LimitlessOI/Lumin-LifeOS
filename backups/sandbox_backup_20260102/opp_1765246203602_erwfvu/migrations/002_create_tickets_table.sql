CREATE TABLE IF NOT EXISTS tickets (
    ticket_id SERIAL PRIMARY KEY,
    assigned_user_id INT REFERENCES users(user_id),
    open_time TIMESTAMP WITHO0UT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    close_time NULL, -- Can be updated later to a timestamp when the ticket is closed.
    support_team_assigned INT REFERENCES support_teams(team_id), 
    priority VARCHAR CHECK (priority IN ('low', 'medium', 'high')),
    status VARCHAR DEFAULT 'opened', -- Add enum if using PostgreSQL for better integrity and validation. If not, use a CHAR constraint with allowed values: {NULL}, 'opened', 'in-progress', 'completed'.
    resolution_notes TEXT
);