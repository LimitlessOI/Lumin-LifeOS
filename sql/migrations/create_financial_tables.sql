```sql
CREATE TABLE financial_profiles (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    profile_name VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE transactions (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    date TIMESTAMP NOT NULL,
    category VARCHAR(255),
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE financial_goals (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    goal_name VARCHAR(255),
    target_amount DECIMAL(10, 2) NOT NULL,
    current_amount DECIMAL(10, 2) DEFAULT 0,
    deadline DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE budgets (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    budget_name VARCHAR(255),
    total_amount DECIMAL(10, 2) NOT NULL,
    spent_amount DECIMAL(10, 2) DEFAULT 0,
    period VARCHAR(50), -- e.g., monthly, yearly
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE education_modules (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    module_name VARCHAR(255),
    completed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE advisor_interactions (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    interaction_text TEXT,
    response_text TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```