CREATE TABLE IF NOT EXISTS Customers (
    customer_id SERIAL PRIMARY KEY,
    name VARCHAR(256) NOT NULL UNIQUE,
    email VARCHAR(100) NOT NULL UNIQUE CHECK (email LIKE '%@%.%' AND LENGTH(REGEXP_REPLACE(email, '@', '', 'g')) > 4), // Simplified regex for validating emails. Not fully compliant with RFC standards but serves as a basic checker
    createdAt TIMESTAMP NOT NULL DEFAULT NOW()
);