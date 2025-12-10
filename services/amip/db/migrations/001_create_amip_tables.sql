```sql
-- Create table for users
CREATE TABLE amip_users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create table for simulations
CREATE TABLE amip_simulations (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES amip_users(id),
    scenario_name VARCHAR(100) NOT NULL,
    status VARCHAR(50) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create table for training sessions
CREATE TABLE amip_training_sessions (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES amip_users(id),
    simulation_id INT REFERENCES amip_simulations(id),
    score INT,
    duration INT,
    completed_at TIMESTAMP
);

-- Create table for predictive alerts
CREATE TABLE amip_predictive_alerts (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES amip_users(id),
    alert_type VARCHAR(100) NOT NULL,
    message TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```