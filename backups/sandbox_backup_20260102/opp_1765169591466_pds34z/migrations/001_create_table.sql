BEGIN TRANSACTION;
CREATE TABLE IF NOT EXISTS scenarios (
    id SERIAL PRIMARY KEY,
    userId INT REFERENCES users(id),  // Assuming there is a 'users' table with an ID as primary key and proper foreign keys defined elsewhere
    title VARCHAR(255) NOT NULL,
    description TEXT DEFAULT '',
    createdAt TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    status VARCHAR(50),  // Assuming there are predefined scenarios like 'draft', 'active' and such. Adjust as necessary for your business logic or expand to a separate table if needed.  
    updated_at TIMESTAMPTZ, -- This can be set automatically with DEFAULT now() CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP in SQL 
    paymentStatus VARCHAR(50) // To store status of the subscription (e.g., 'pending', 'paid')  
);
ALTER TABLE scenarios OWNER TO your_username; -- Replace with actual username if different from Railway's default user or a dedicated system admin role 
COMMIT;