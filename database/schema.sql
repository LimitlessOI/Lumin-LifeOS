```sql
-- Create table for energy profiles
CREATE TABLE energy_profiles (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    profile_data JSONB NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create table for energy transactions
CREATE TABLE energy_transactions (
    id SERIAL PRIMARY KEY,
    sender_id INT NOT NULL,
    receiver_id INT NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    transaction_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create table for community challenges
CREATE TABLE community_challenges (
    id SERIAL PRIMARY KEY,
    challenge_name VARCHAR(255) NOT NULL,
    description TEXT,
    start_date TIMESTAMP,
    end_date TIMESTAMP,
    reward DECIMAL(10, 2)
);

-- Create table for energy predictions
CREATE TABLE energy_predictions (
    id SERIAL PRIMARY KEY,
    profile_id INT REFERENCES energy_profiles(id),
    prediction_data JSONB NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create table for regulatory compliance
CREATE TABLE regulatory_compliance (
    id SERIAL PRIMARY KEY,
    rule_name VARCHAR(255) NOT NULL,
    compliance_status BOOLEAN NOT NULL,
    checked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```