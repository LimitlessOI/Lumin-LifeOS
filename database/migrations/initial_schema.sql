```sql
CREATE TABLE energy_profiles (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    profile_data JSONB NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE energy_transactions (
    id SERIAL PRIMARY KEY,
    sender_id INT NOT NULL,
    receiver_id INT NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    transaction_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE community_challenges (
    id SERIAL PRIMARY KEY,
    challenge_name VARCHAR(255) NOT NULL,
    description TEXT,
    start_date TIMESTAMP,
    end_date TIMESTAMP
);

CREATE TABLE energy_forecasts (
    id SERIAL PRIMARY KEY,
    profile_id INT NOT NULL,
    forecast_data JSONB NOT NULL,
    forecast_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE regulatory_compliance (
    id SERIAL PRIMARY KEY,
    regulation_name VARCHAR(255) NOT NULL,
    compliance_status BOOLEAN DEFAULT FALSE,
    checked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```