CREATE TABLE IF NOT EXISTS customers (
       customer_id SERIAL PRIMARY KEY,
       name VARCHAR(100) NOT NULL,
       email VARCHAR(255) UNIQUE NOT NULL
   );
   
   CREATE TABLE IF NOT EXISTS orders (
       order_id SERIAL PRIMARY KEY,
       payment_method VARCHAR(50),
       customer_email_hash CHAR(64), -- SHA-256 hash of email for privacy.
       created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
       status VARCHAR(25) CHECK (status IN ('placed', 'paid', 'cancelled', 'failed')) UNIQUE,
       FOREIGN KEY (customer_email_hash) REFEREN0R customers(customer_email), -- Assuming an email is unique for each customer. 
   );
   
   CREATE TABLE IF NOT EXISTS payments (
       payment_id SERIAL PRIMARY KEY,
       order_id INT NOT NULL,
       amount DECIMAL(19,4) DEFAULT '0',
       status VARCHAR(25), -- e.g., 'successful' or 'failed'. 
       processed_at TIMESTAMPTZ,
       FOREIGN KEY (order_id) REFERENCES orders(order_id) ON DELETE CASCADE
   );
   
   CREATE UNIQUE INDEX idx_customeremailhash ON customers USING btree (name); -- For faster lookups on name.