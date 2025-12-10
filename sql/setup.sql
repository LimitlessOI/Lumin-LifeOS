```sql
CREATE TABLE health_profiles (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    age INT,
    gender VARCHAR(10),
    height FLOAT,
    weight FLOAT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE wearable_readings (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    timestamp TIMESTAMP NOT NULL,
    heart_rate INT,
    steps INT,
    calories_burned INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE predictive_insights (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    insight TEXT,
    confidence FLOAT,
    generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE ehr_integrations (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    ehr_system VARCHAR(255),
    integration_status VARCHAR(50),
    last_sync TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);