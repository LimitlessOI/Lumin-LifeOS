```sql
CREATE TABLE disaster_events (
    id SERIAL PRIMARY KEY,
    event_type VARCHAR(255) NOT NULL,
    location GEOGRAPHY(POINT),
    severity INT,
    reported_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE resources (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    quantity INT DEFAULT 0
);

CREATE TABLE response_teams (
    id SERIAL PRIMARY KEY,
    team_name VARCHAR(255) NOT NULL,
    location GEOGRAPHY(POINT)
);

CREATE TABLE data_feeds (
    id SERIAL PRIMARY KEY,
    source VARCHAR(255) NOT NULL,
    data JSONB,
    received_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE allocation_decisions (
    id SERIAL PRIMARY KEY,
    event_id INT REFERENCES disaster_events(id),
    resource_id INT REFERENCES resources(id),
    team_id INT REFERENCES response_teams(id),
    decision_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);