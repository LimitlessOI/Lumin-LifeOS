```sql
-- Create bci_sessions table
CREATE TABLE bci_sessions (
    session_id SERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    start_time TIMESTAMP NOT NULL,
    end_time TIMESTAMP,
    status VARCHAR(50),
    FOREIGN KEY (user_id) REFERENCES users(user_id)
);

-- Create bci_metrics table
CREATE TABLE bci_metrics (
    metric_id SERIAL PRIMARY KEY,
    session_id INT NOT NULL,
    metric_type VARCHAR(50) NOT NULL,
    value DECIMAL NOT NULL,
    timestamp TIMESTAMP NOT NULL,
    FOREIGN KEY (session_id) REFERENCES bci_sessions(session_id)
);

-- Create adaptive_profiles table
CREATE TABLE adaptive_profiles (
    profile_id SERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    profile_data JSONB NOT NULL,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id)
);

-- Create intervention_logs table
CREATE TABLE intervention_logs (
    log_id SERIAL PRIMARY KEY,
    session_id INT NOT NULL,
    intervention_type VARCHAR(50),
    result JSONB,
    timestamp TIMESTAMP NOT NULL,
    FOREIGN KEY (session_id) REFERENCES bci_sessions(session_id)
);
```