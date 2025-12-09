```sql
CREATE TABLE ethical_decisions (
    id SERIAL PRIMARY KEY,
    decision_text TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE skill_gaps (
    id SERIAL PRIMARY KEY,
    skill_name VARCHAR(255) NOT NULL,
    gap_level INTEGER NOT NULL,
    user_id INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE ethical_frameworks (
    id SERIAL PRIMARY KEY,
    framework_name VARCHAR(255) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE outcome_metrics (
    id SERIAL PRIMARY KEY,
    metric_name VARCHAR(255) NOT NULL,
    value FLOAT NOT NULL,
    decision_id INTEGER REFERENCES ethical_decisions(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE life_domain_integrations (
    id SERIAL PRIMARY KEY,
    domain_name VARCHAR(255) NOT NULL,
    integration_status VARCHAR(50),
    user_id INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```