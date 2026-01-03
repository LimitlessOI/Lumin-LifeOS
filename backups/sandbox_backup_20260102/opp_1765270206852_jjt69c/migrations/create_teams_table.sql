CREATE TABLE IF NOT EXISTS teams (
    team_name VARCHAR(100) PRIMARY KEY,
    team_leader_id INTEGER REFERENCES users(id),
    members_ids TEXT[] -- Using an array for simplicity; consider a separate junction table in production.
);