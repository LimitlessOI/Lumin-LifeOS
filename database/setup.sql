```sql
CREATE TABLE user_financial_profiles (
    user_id SERIAL PRIMARY KEY,
    name VARCHAR(100),
    age INT,
    risk_tolerance VARCHAR(20),
    income DECIMAL
);

CREATE TABLE investment_strategies (
    strategy_id SERIAL PRIMARY KEY,
    user_id INT REFERENCES user_financial_profiles(user_id),
    strategy_name VARCHAR(100),
    details TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE market_data_cache (
    symbol VARCHAR(10) PRIMARY KEY,
    last_price DECIMAL,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE user_feedback (
    feedback_id SERIAL PRIMARY KEY,
    user_id INT REFERENCES user_financial_profiles(user_id),
    feedback TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```