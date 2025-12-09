```sql
-- Create table for food nodes
CREATE TABLE food_nodes (
    node_id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    location VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create table for crop cycles
CREATE TABLE crop_cycles (
    cycle_id SERIAL PRIMARY KEY,
    node_id INT REFERENCES food_nodes(node_id),
    crop_name VARCHAR(255) NOT NULL,
    start_date DATE,
    end_date DATE,
    status VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create table for demand forecasts
CREATE TABLE demand_forecasts (
    forecast_id SERIAL PRIMARY KEY,
    node_id INT REFERENCES food_nodes(node_id),
    crop_name VARCHAR(255) NOT NULL,
    forecast_date DATE,
    predicted_demand INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create table for resource loops
CREATE TABLE resource_loops (
    loop_id SERIAL PRIMARY KEY,
    node_id INT REFERENCES food_nodes(node_id),
    resource_type VARCHAR(255),
    input_amount DECIMAL,
    output_amount DECIMAL,
    conversion_rate DECIMAL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create table for revenue streams
CREATE TABLE revenue_streams (
    stream_id SERIAL PRIMARY KEY,
    node_id INT REFERENCES food_nodes(node_id),
    revenue_type VARCHAR(255),
    amount DECIMAL,
    recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```