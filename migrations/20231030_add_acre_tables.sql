```sql
-- Add necessary tables for ACRE module

CREATE TABLE IF NOT EXISTS cognitive_assessments (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    score FLOAT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS stress_data (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    wearable_id INT NOT NULL,
    stress_level INT NOT NULL,
    reported_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS resilience_scores (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    score FLOAT NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```