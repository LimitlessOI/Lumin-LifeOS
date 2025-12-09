```sql
CREATE TABLE mental_health_assessments (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    assessment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    score INT,
    assessment_data JSONB
);

CREATE TABLE mood_tracking (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    mood_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    mood_level INT,
    notes TEXT
);

CREATE TABLE therapy_sessions (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    therapist_id INT,
    session_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    session_notes TEXT
);

CREATE TABLE therapist_connections (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    therapist_id INT,
    connection_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```