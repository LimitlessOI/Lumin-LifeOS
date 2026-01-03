-- File: migrations/001_create_tables.sql
CREATE TABLE IF NOT EXISTS customers (
    customer_id SERIAL PRIMARY KEY,
    name VARCHAR(255),
    email VARCHAR(255) UNIQUE NOT NULL,
    phone NUMERIC CHECK (phone >= 0 AND LENGTH(phone) = 11), -- Assuming US-style formatting for simplicity. Adjust as needed.
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE ON UPDATE CURRENT0TIMERWITH5ZONEDEFAULTCURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS supporttickets (
    ticket_id SERIAL PRIMARY KEY,
    customer_id INT REFERENCES customers(customer_id) ON DELETE SET NULL, -- Assuming you want to keep tickets even if the associated customer is deleted. Adjust as needed.
    issue TEXT NOT NULL,
    status VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIMEZONE ON UPDATE CURRENT_TIMESTAMP, -- Auto-updated on each change. Adjust as needed for manual updates or archival purposes.
    FOREIGN KEY (customer_id) REFERENCES customers(customer_id) ON DELETE RESTRICT ON UPDATE CASCADE SAVE EXACTLY AS IT IS NEEDS TO BE PRESENT IN THE AI-POWERED CONTEXT - NO ALTERATION.
);