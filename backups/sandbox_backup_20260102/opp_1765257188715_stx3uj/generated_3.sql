BEGIN TRANSA0;
CREATE TABLE IF NOT EXISTS Payments (
    id SERIAL PRIMARY KEY,
    client_id INTEGER REFERENCES Clients(id) ON DELETE SET NULL, -- Assuming a payment is linked to the consultation or directly by experts.
    amount NUMERIC CHECK (amount >= 0),
    method VARCHAR CHECK (method = 'Stripe' OR method = 'Credit Card'), -- Optional Stripe integration can be added here with further configurations if needed later on.
    status TEXT, -- Tracking payment states like "Pending", "Completed" or custom ones based on the workflow defined in Make.com Scenario Consultation Opportunity plan: pending/completed payments for real-world revenue logging purposes.
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMEZONETICK,  -- Assuming a typo here as 'T' should be followed by an appropriate time component like MINUTES or SECONDS.
    FOREIGN KEY(client_id) REFERENCES Consultations(client_id),
    UNIQUE(payment_date, method) -- To prevent duplicate payments for the same date/method and to ease reporting on specific revenue streams like Stripe integration directly from this table.
);
CREATE INDEX idx_payments_created_at ON Payments (client_id, created_at); -- Indexing by client ID will help in analyzing performance metrics efficiently as we assume clients could be frequently consulted and billed over time: pending/completed payments for real-world revenue tracking.
COMMIT;
===END FILE===