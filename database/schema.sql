```sql
-- User Financial Profiles Table
CREATE TABLE user_financial_profiles (
    user_id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    risk_tolerance INT,
    investment_goals TEXT,
    account_balance DECIMAL(15, 2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Market Data Snapshots Table
CREATE TABLE market_data_snapshots (
    snapshot_id SERIAL PRIMARY KEY,
    data JSONB NOT NULL,
    captured_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Investment Recommendations Table
CREATE TABLE investment_recommendations (
    recommendation_id SERIAL PRIMARY KEY,
    user_id INT REFERENCES user_financial_profiles(user_id),
    recommendations JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- User Feedback Table
CREATE TABLE user_feedback (
    feedback_id SERIAL PRIMARY KEY,
    user_id INT REFERENCES user_financial_profiles(user_id),
    feedback TEXT,
    submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ML Model Versions Table
CREATE TABLE ml_model_versions (
    model_id SERIAL PRIMARY KEY,
    model_name VARCHAR(50),
    version VARCHAR(10),
    parameters JSONB,
    trained_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```