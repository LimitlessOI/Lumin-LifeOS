CREATE TABLE IF NOT EXISTS users (
    user_id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255),
    account_status TEXT CHECK (account_status IN ('active', 'inactive', 'suspended')) DEFAULT 'active',
    contact_info JSONB, -- Anonymized personal data could be structured as a jsonb object within this field. 
    FOREIGN KEY (payment_method) REFERENCES payment_records(record_id),
    CONSTRAINT email_unique UNIQUE (email)
);