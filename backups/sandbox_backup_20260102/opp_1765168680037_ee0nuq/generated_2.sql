===FILE:migrations/create_tables.sql===
CREATE TABLE IF NOT EXISTS customer_profiles (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255),
    contact_information TEXT,
    preferences JSONB,  -- Assume 'preferences' is a nested structure of service types and related data
    consent BOOLEAN DEFAULT false,  // Consent to GDPR compliance or privacy regulations flag.
    last_interaction TIMESTAMP WITH TIME ZONE
);
CREATE TABLE IF NOT EXISTS workflows (
    id SERIAL PRIMARY KEY,
    customer_id INTEGER REFERENCES customer_profiles(id),  -- Assuming foreign key to the customers table above.
    preferences JSONB,
    started_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    completed_by VARCHAR(255),
    status VARCHAR(10) CHECK (status IN ('pending', 'in progress', 'completed'))  -- Status of the workflow.
);
CREATE TABLE IF NOT EXISTS financial_transactions (
    id SERIAL PRIMARY KEY,
    payment_information JSONB,   -- Assuming this includes reference identifier and transaction ID from Stripe API endpoint integration.
    amount NUMERIC(10,2),  // Assumed currency is USD for simplicity; adjust based on actual requirements.
    reference VARCHAR UNIQUE NOT NULL,
    status VARCHAR CHECK (status IN ('success', 'failed')),   -- Transaction states like pending or failed payments etc.
    transaction_id TEXT REFERENCES stripe(id) ON DELETE CASCADE  // Assuming Stripe ID as reference; adjust according to actual schema design with API integration details in place for real-time syncing and security practices, including proper handling of access tokens and secure storage.
);