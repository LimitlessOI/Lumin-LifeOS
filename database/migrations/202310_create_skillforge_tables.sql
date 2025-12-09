```sql
-- Migration script to create SkillForge related tables

CREATE TABLE skills (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE simulations (
    id SERIAL PRIMARY KEY,
    skill_id INT REFERENCES skills(id),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE skill_credentials (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    skill_id INT REFERENCES skills(id),
    issued_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    credential_data JSONB
);

CREATE TABLE resource_procurement (
    id SERIAL PRIMARY KEY,
    resource_name VARCHAR(255) NOT NULL,
    user_id INT NOT NULL,
    status VARCHAR(50) CHECK (status IN ('pending', 'completed', 'failed')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE micro_income_opportunities (
    id SERIAL PRIMARY KEY,
    opportunity_name VARCHAR(255) NOT NULL,
    description TEXT,
    reward DECIMAL(10, 2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```