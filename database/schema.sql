```sql
CREATE TABLE skill_pathways (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE learning_sessions (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    skill_pathway_id INT REFERENCES skill_pathways(id),
    status VARCHAR(50) NOT NULL,
    started_at TIMESTAMP,
    completed_at TIMESTAMP
);

CREATE TABLE credentials (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    issued_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    credential_data JSONB
);

CREATE TABLE employer_verifications (
    id SERIAL PRIMARY KEY,
    employer_id INT NOT NULL,
    user_id INT NOT NULL,
    status VARCHAR(50) NOT NULL,
    verified_at TIMESTAMP
);
```