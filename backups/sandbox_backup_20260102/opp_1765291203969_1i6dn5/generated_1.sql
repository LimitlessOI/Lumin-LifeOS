-- File: migrations/001_create_tables.sql
CREATE TABLE IF NOT EXISTS ScenarioTemplates (
    id SERIAL PRIMARY KEY,
    template TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS Sales (
    id SERIAL PRIMARY KEY,
    customer_id INTEGER REFERENCES Customers(id) ON DELETE CASCADE,
    revenue NUMERIC CHECK (revenue >= 0),
    transaction_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    -- Include any other necessary fields here.
);