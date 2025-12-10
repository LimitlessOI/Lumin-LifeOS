```sql
-- Create table for smart bins
CREATE TABLE smart_bins (
    id SERIAL PRIMARY KEY,
    location VARCHAR(255) NOT NULL,
    bin_type VARCHAR(50) NOT NULL,
    status VARCHAR(50),
    last_emptied TIMESTAMP
);

-- Create table for waste readings
CREATE TABLE waste_readings (
    id SERIAL PRIMARY KEY,
    bin_id INT REFERENCES smart_bins(id),
    reading_time TIMESTAMP NOT NULL,
    waste_level INT NOT NULL,
    FOREIGN KEY (bin_id) REFERENCES smart_bins(id)
);

-- Create table for recycling transactions
CREATE TABLE recycling_transactions (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    bin_id INT REFERENCES smart_bins(id),
    transaction_time TIMESTAMP NOT NULL,
    material_type VARCHAR(50) NOT NULL,
    weight DECIMAL(10, 2) NOT NULL
);

-- Create table for collection routes
CREATE TABLE collection_routes (
    id SERIAL PRIMARY KEY,
    route_name VARCHAR(255) NOT NULL,
    start_location VARCHAR(255) NOT NULL,
    end_location VARCHAR(255) NOT NULL,
    route_details JSONB
);

-- Create table for policy recommendations
CREATE TABLE policy_recommendations (
    id SERIAL PRIMARY KEY,
    recommendation_text TEXT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(50) NOT NULL
);