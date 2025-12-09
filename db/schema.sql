```sql
CREATE TABLE candidates (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL
);

CREATE TABLE assessments (
    id SERIAL PRIMARY KEY,
    candidate_id INT REFERENCES candidates(id),
    score DECIMAL(5,2),
    completed_at TIMESTAMP
);

CREATE TABLE bias_patterns (
    id SERIAL PRIMARY KEY,
    pattern_name VARCHAR(100),
    description TEXT
);

CREATE TABLE hiring_outcomes (
    id SERIAL PRIMARY KEY,
    candidate_id INT REFERENCES candidates(id),
    outcome VARCHAR(50),
    decision_date TIMESTAMP
);

CREATE TABLE role_simulations (
    id SERIAL PRIMARY KEY,
    role_name VARCHAR(100),
    simulation_data JSONB
);
```