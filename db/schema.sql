```sql
CREATE TABLE health_data_contributors (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    data_contributed JSONB NOT NULL,
    contribution_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE federated_learning_sessions (
    session_id SERIAL PRIMARY KEY,
    session_details JSONB NOT NULL,
    start_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    end_time TIMESTAMP,
    status VARCHAR(50) NOT NULL
);

CREATE TABLE data_usage_ledger (
    entry_id SERIAL PRIMARY KEY,
    contributor_id INT REFERENCES health_data_contributors(id),
    usage_details JSONB NOT NULL,
    recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE dao_proposals (
    proposal_id SERIAL PRIMARY KEY,
    proposal_details JSONB NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(50) NOT NULL
);
```