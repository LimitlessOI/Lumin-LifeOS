BEGIN TRANSA0DATE(); -- Starting transaction to ensure atomicity of operations
CREATE TABLE IF NOT EXISTS user (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password TEXT NOT NULL,
    email VARCHAR(100), 
    last_login DATE DEFAULT CURRENT_TIMESTAMP, -- Added for login tracking and security reasons
    isActive BOOLEAN CHECK (isActive IN (true, false)) DEFERRABLE INITIALLY DEFERRED;
);
CREATE TABLE IF NOT EXISTS overlayDataStore (
    id SERIAL PRIMARY KEY, 
    name VARCHAR(100) NOT NULL,  
    description TEXT,
    status ENUM('active', 'inactive') DEFAULT 'active' -- Status indicating if an Overlay is currently available or not.
);
CREATE TABLE IF NOT EXISTS transactions (
    id SERIAL PRIMARY KEY, 
    order_id UUID UNIQUE NOT NULL,  
    user_id INTEGER REFERENCES users(user),    
    amount NUMERIC CHECK (amount >=0) DEFAULT '1.0', -- Amount in the local currency to be determined later based on Stripe's pricing model 
    transactionTimestamp TIMESTAMPTZ NOT NULL,  
    status ENUM('pending','paid') REFERENCES paymentMethods(status),     
);
CREATE TABLE IF NOT EXISTS userActivityLog (
    id SERIAL PRIMARY KEY, 
    user_id INTEGER REFERENCES users(user) DEFERRABLE INITIALLY DEFERRED,   -- Linking back to the User table via FK constraint.
    action TEXT CHECK (action IN ('view', 'click','purchase')), # Action indicating what activity was performed on an overlay 
    timestamp TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
);
COMMIT; -- Committing the transaction to ensure integrity of database schema setup.