```sql
CREATE TABLE mental_health_assessments (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    assessment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    results JSONB
);

CREATE TABLE support_plans (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    plan_details JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE conversation_logs (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    message TEXT,
    response TEXT,
    sentiment_score REAL,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE mood_tracking (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    mood_level INT CHECK (mood_level BETWEEN 1 AND 10),
    notes TEXT,
    recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```