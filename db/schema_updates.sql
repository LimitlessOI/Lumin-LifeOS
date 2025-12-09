-- Add table for energy devices
CREATE TABLE energy_devices (
    id SERIAL PRIMARY KEY,
    device_id VARCHAR(50) NOT NULL,
    type VARCHAR(50),
    owner_id INT REFERENCES users(id)
);

-- Add table for energy trades
CREATE TABLE energy_trades (
    id SERIAL PRIMARY KEY,
    trade_id VARCHAR(50) NOT NULL,
    buyer_id INT REFERENCES users(id),
    seller_id INT REFERENCES users(id),
    amount DECIMAL(10, 2),
    settled BOOLEAN DEFAULT FALSE
);

-- Add table for pricing predictions
CREATE TABLE pricing_predictions (
    id SERIAL PRIMARY KEY,
    device_id INT REFERENCES energy_devices(id),
    predicted_price DECIMAL(10, 2),
    prediction_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add table for compliance templates
CREATE TABLE compliance_templates (
    id SERIAL PRIMARY KEY,
    template_name VARCHAR(100) NOT NULL,
    content TEXT
);

-- Add table for energy incentives
CREATE TABLE energy_incentives (
    id SERIAL PRIMARY KEY,
    incentive_name VARCHAR(100) NOT NULL,
    description TEXT,
    amount DECIMAL(10, 2)
);