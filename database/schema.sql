```sql
CREATE TABLE ethical_decisions (
    id SERIAL PRIMARY KEY,
    decision_context TEXT NOT NULL,
    decision_outcome TEXT NOT NULL,
    decision_score FLOAT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE skill_gap_analytics (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    competency_area TEXT NOT NULL,
    skill_score FLOAT NOT NULL,
    gap_identified BOOLEAN NOT NULL,
    analysis_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE value_frameworks (
    id SERIAL PRIMARY KEY,
    framework_name TEXT NOT NULL,
    framework_description TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```