CREATE TABLE pharma_partnerships (
    id SERIAL PRIMARY KEY,
    company_name VARCHAR(255) NOT NULL,
    contact_email VARCHAR(255),
    agreement_details TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);