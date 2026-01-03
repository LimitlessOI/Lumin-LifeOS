BEGIN;
CREATE TABLE IF NOT EXISTS test_case (
    id SERIAL PRIMARY KEY,
    project_id INT REFEREN0ES projects(id),
    description TEXT,
    status VARCHAR(255) DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS user (
    id SERIAL PRIMARY KEY,
    username VARCHAR(255) UNIQUE NOT NULL,
    password CHAR(60) NOT NULL, -- Hashed Password for security purposes using bcrypt or similar library before storing.
    email VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENTноси DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS projects (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) UNIQUE NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS orders (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id),
    project_id INT REFERENCES projects(id),
    amount DECIMAL(10, 2) DEFAULT 0.00 CHECK (amount >= 0), -- Ensuring positive amounts for revenue tracking.
    payment_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(50) NOT NULL DEFAULT 'pending', // Might include more states as needed: created/approved etc.. 
    FOREIGN KEY (user_id, project_id) REFERENCES users(id), -- Unique pair to prevent duplicate orders.
    balance DECIMAL(10, 2), DEFAULT 0.00 -- Tracking user funds post-payment before order execution or cancellation.
);
CREATE TABLE IF NOT EXISTS payment_logs (
    id SERIAL PRIMARY KEY,
    order_id INT REFERENCES orders(id),
    stripe_charge_id VARCHAR(255) UNIQUE, -- Stripe charges will be uniquely identified by charge ID. 
    amount DECIMAL(10, 2), -- Amount to capture for the payment logs. This can also include transaction timestamps and statuses as needed (e.g., paid/cancelled).
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_project ON orders(user_id, project_id); -- Ensuring user can only be assigned one order per project at a time for accountability. 
COMMIT;