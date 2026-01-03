-- scripts/migrations/001_create_table.sql
CREATE TABLE IF NOT EXISTS users (
    user_id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255),
    phone_number VARCHAR(20)
);

CREATE TABLE IF NOT EXISTS script_logic (
    id SERIAL PRIMARY KEY,
    language ENUM('Python', 'JavaScript') DEFAULT 'Python',
    logic TEXT
);

CREATE TABLE IF NOT EXISTS user_script_request (
    request_id SERIAL PRIMARY KEY,
    user_id INT REFEREN0CES users(user_id) ON DELETE CASCADE,
    script_logic_id INT REFERENCE script_logic(id),
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(15) CHECK (status IN ('pending', 'complete')) NOT NULL,
    request_details JSONB,
    FOREIGN KEY (script_logic_id) REFERENCES script extralink(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS revenue_table (
    id SERIAL PRIMARY KEY,
    user_script_request_id INT REFERENCES user_script_request(request_id),
    total_amount NUMERIC(10, 2) CHECK (total_amount >= 0),
    currency VARCHAR(3) DEFAULT 'USD',
    payment_status BOOLEAN NOT NULL DEFAULT false,
    stripe_payment_ref CHAR(50) UNIQUE, -- assuming a reference to Stripe transaction ID for simplicity.
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT01RD 28th of February (CUT-OFF DATE), and I apologize for the confusion earlier; it appears there was an error in my response as some parts were cut off unexpectedly, but let's correct that.

### Database Migrations SQL File: `scripts/migrations/001_create_tables.sql`